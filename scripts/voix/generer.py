# Fabrique les sons de la voix naturelle (Pocket TTS de Kyutai, modèle normal) listés dans
# scripts/voix/a-generer.json : un MP3 par phrase, proposition, morceau, mot, nombre ou prénom.
# Les sons déjà fabriqués (dans les paquets de app/voix/) sont sautés : seules les nouvelles phrases le sont.
#
# Pour une voix égale d'un son à l'autre, chaque son est contrôlé, et refait s'il le faut :
#  - hauteur de la voix proche de sa hauteur habituelle (une exclamation ne doit pas devenir aiguë) ;
#  - débit plausible (ni son coupé, ni long silence au milieu d'un mot) ;
#  - diction : la reconnaissance vocale (Whisper) doit retrouver le texte ;
#  - volume égalisé, pauses raccourcies, silences du début et de la fin retirés.
# Le meilleur essai est gardé ; chaque son est décrit dans rapport-k.json (hauteur, volume, débit,
# texte reconnu), les sons ratés dans echecs-k.json.
#
# Usage : python scripts/voix/generer.py --shard 3/8 --sortie voix-sortie [--essais 4] [--whisper small]
import argparse
import difflib
import json
import re
import subprocess
import tempfile
import time
import unicodedata
import wave
from pathlib import Path

import numpy as np
from pocket_tts import TTSModel

from nombres import say_number

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--shard', default='1/1')
parser.add_argument('--sortie', default='voix-sortie')
parser.add_argument('--liste', default=str(ROOT / 'scripts/voix/a-generer.json'))
parser.add_argument('--essais', type=int, default=4)
parser.add_argument('--whisper', default='small', help="modèle de reconnaissance vocale, ou 'aucun'")
parser.add_argument('--refaire', help='liste JSON de clés à refaire même si leur son existe (le meilleur, ancien ou nouveau, est gardé)')
args = parser.parse_args()
k, n = map(int, args.shard.split('/'))
OUT = Path(args.sortie)
EXISTING = ROOT / 'app/voix'
LANGUAGES = {'fr': 'french', 'en': 'english'}
# hauteur habituelle de la voix (Hz, médiane mesurée sur les sons de la version 1.8.1)
PITCH = {'estelle': 254.0}
PITCH_TOLERANCE = 0.15  # ± 15 % : au-delà, la voix paraît changer
TARGET_DB = -20.0  # volume moyen des passages parlés (dBFS)
MP3 = ['-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '32k', '-write_xing', '0', '-id3v2_version', '0']

items = json.loads(Path(args.liste).read_text(encoding='utf-8'))
# sons déjà fabriqués : rangés dans les paquets (manifest.json), ou posés dans app/voix/fr|en
manifest = EXISTING / 'manifest.json'
packed = {f for p in json.loads(manifest.read_text(encoding='utf-8')).get('paquets', []) for f, _ in p['sons']} if manifest.exists() else set()
redo = set(json.loads(Path(args.refaire).read_text(encoding='utf-8'))) if args.refaire else set()
todo = [e for i, e in enumerate(items) if i % n == k - 1
        and (e['key'] in redo or (e['file'] not in packed and not (EXISTING / e['file']).exists()))]
print(f'morceau {k}/{n} : {len(todo)} sons à fabriquer', flush=True)


def tts_text(e):
    if e['type'] == 'nombre':
        return say_number(e['text'], e['lang'])
    # guillemets et tirets décoratifs : ils ne se prononcent pas
    text = re.sub(r'[«»“”"]', '', e['text']).strip()
    # nombres en lettres : la voix les dit mieux (« 44 » se coupait parfois en plein milieu)
    return re.sub(r'\d+(?:[.,]\d+)?(?:er|re|ème|e)?(?![\w])', lambda m: say_number(m.group(0).replace('ème', 'e'), e['lang']), text)


def existing_clip(e):
    """Les octets du son déjà fabriqué (dans son paquet), ou None."""
    if not manifest.exists():
        return None
    for pack in json.loads(manifest.read_text(encoding='utf-8')).get('paquets', []):
        start = 0
        for file, size in pack['sons']:
            if file == e['file']:
                with open(EXISTING / pack['nom'], 'rb') as f:
                    f.seek(start)
                    return f.read(size)
            start += size
    return None


def frames(audio, rate, ms=20):
    x = np.asarray(audio, dtype=np.float32).reshape(-1)
    win = max(1, int(rate * ms / 1000))
    count = len(x) // win
    return x[: count * win].reshape(count, win)


def longest_gap(audio, rate, threshold_db=-55):
    """Plus long silence (en secondes) au milieu du son, par fenêtres de 10 ms."""
    env = np.abs(frames(audio, rate, 10)).max(axis=1) if len(audio) else np.array([])
    loud = np.where(env > 10 ** (threshold_db / 20))[0]
    if len(loud) == 0:
        return float('inf')  # rien n'a été dit
    longest = run = 0
    for quiet in env[loud[0]: loud[-1] + 1] <= 10 ** (threshold_db / 20):
        run = run + 1 if quiet else 0
        longest = max(longest, run)
    return longest * 0.01


def speech_level(audio, rate):
    """Volume moyen des passages parlés (dBFS)."""
    rms = np.sqrt((frames(audio, rate) ** 2).mean(axis=1))
    active = rms[rms > 0.01]
    return 20 * np.log10(np.sqrt((active ** 2).mean())) if len(active) else -99.0


def pitch(audio, rate):
    """Hauteur médiane de la voix (Hz), par autocorrélation sur les passages voisés ; None si trop court."""
    x = np.asarray(audio, dtype=np.float32).reshape(-1)
    win, hop = int(0.04 * rate), int(0.01 * rate)
    lo, hi = rate // 450, rate // 110
    values = []
    for i in range(0, len(x) - win, hop):
        f = x[i:i + win]
        if np.sqrt(np.mean(f * f)) < 0.02:
            continue
        f = f - f.mean()
        ac = np.correlate(f, f, 'full')[win - 1:]
        if ac[0] <= 0:
            continue
        ac = ac / ac[0]
        lag = lo + int(np.argmax(ac[lo:hi]))
        if ac[lag] > 0.5:
            values.append(rate / lag)
    return float(np.median(values)) if len(values) >= 8 else None


def is_short(text):
    """Un ou deux mots, sans ponctuation au milieu (« ma », « Lila », « Très bien ! », « À toi, »)."""
    return len(re.findall(r"[\w'-]+", text)) <= 2 and not re.search(r'[.,;:!?]', text.strip(' .!?,;:'))


def attempts(text, count):
    """Le texte tel quel (deux fois : chaque essai est différent), puis avec une autre ponctuation ;
    un mot seul a deux essais de plus (la voix rate parfois les syllabes isolées)."""
    out = [text, text]
    if not text.endswith(('.', '!', '?', ',', ':')):
        out += [f'{text}.', f'« {text} »']
        if is_short(text):
            out += [f'{text[0].upper()}{text[1:]} !', f'{text}…']
            count += 2
    elif text.endswith('!'):
        out += [f'{text[:-1].rstrip()}.']  # une exclamation trop aiguë est redite plus posément
    else:
        out += [text]
    return out[:count]


def plain(text, lang):
    """Texte comparable : minuscules, sans accents ni ponctuation, nombres en lettres."""
    symbols = {'+': 'plus', '=': 'égale' if lang == 'fr' else 'equals', '×': 'fois' if lang == 'fr' else 'times'}
    text = re.sub(r'[+=×]', lambda m: f' {symbols[m.group(0)]} ', text.lower())
    text = re.sub(r'\d+', lambda m: ' ' + say_number(m.group(0), lang) + ' ', text)
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    return ' '.join(re.sub(r"[^a-z0-9']+", ' ', text.replace('-', ' ')).split())


asr = None
if args.whisper != 'aucun':
    from faster_whisper import WhisperModel
    asr = WhisperModel(args.whisper, device='cpu', compute_type='int8')


def heard(path, lang):
    """Ce que la reconnaissance vocale entend (le son est décodé par ffmpeg, en 16 kHz)."""
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(path), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    segments, _ = asr.transcribe(np.frombuffer(raw, dtype=np.float32), language=lang, beam_size=1, vad_filter=False,
                                 condition_on_previous_text=False)
    return ' '.join(s.text.strip() for s in segments)


def checked_by_asr(text):
    """La reconnaissance vocale n'est fiable qu'à partir de quelques lettres (« bo » ou « ré » seuls, non)."""
    return asr is not None and len(re.sub(r'[^\w]', '', text)) >= 5


def write_wav(path, audio, rate):
    data = np.clip(np.asarray(audio, dtype=np.float32).reshape(-1), -1, 1)
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(rate)
        f.writeframes((data * 32767).astype(np.int16).tobytes())


def level_up(audio, rate):
    """Volume égalisé (passages parlés à TARGET_DB), sans dépasser -1 dBFS en crête."""
    x = np.asarray(audio, dtype=np.float32).reshape(-1)
    gain = float(np.clip(TARGET_DB - speech_level(x, rate), -12, 12))
    y = x * 10 ** (gain / 20)
    peak = float(np.abs(y).max()) if len(y) else 0
    return y * (0.89 / peak) if peak > 0.89 else y


def encode(wav, mp3, speed):
    """Pauses raccourcies (0,35 s au plus), silences du début et de la fin retirés, vitesse ajustée,
    MP3 mono 32 kbit/s sans en-tête (les sons se mettent bout à bout dans l'application)."""
    pauses = 'silenceremove=stop_periods=-1:stop_duration=0.45:stop_threshold=-50dB:stop_silence=0.35'
    trim = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,'
            'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse')
    filters = f'{pauses},{trim}' + (f',atempo={speed}' if abs(speed - 1) > 0.001 else '')
    mp3.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav), '-af', filters, *MP3, str(mp3)], check=True)


models, states = {}, {}
failures, report = [], []
start = time.time()
spoken = 0.0
with tempfile.TemporaryDirectory() as tmp:
    wav = Path(tmp) / 'son.wav'
    trial = Path(tmp) / 'essai.mp3'
    for i, e in enumerate(todo, 1):
        lang, voice = e['lang'], e['voice']
        if lang not in models:
            models[lang] = TTSModel.load_model(language=LANGUAGES[lang])
        if (lang, voice) not in states:
            states[(lang, voice)] = models[lang].get_state_for_audio_prompt(voice)
        model, rate = models[lang], models[lang].sample_rate
        text = tts_text(e)
        best = None  # (note, audio, mesures) ; audio vaut None pour l'ancien son, gardé tel quel
        problems = []
        old = existing_clip(e) if e['key'] in redo else None
        if old:
            # l'ancien son concourt aussi : il n'est remplacé que par un meilleur
            trial.write_bytes(old)
            raw = np.frombuffer(subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(trial), '-ac', '1', '-ar', str(rate), '-f', 'f32le', '-'],
                                               capture_output=True, check=True).stdout, dtype=np.float32)
            f0 = pitch(raw, rate)
            note = (abs(np.log(f0 / PITCH.get(voice, f0))) if f0 else 0.0) / PITCH_TOLERANCE
            measures = {'hauteur': round(f0) if f0 else None, 'duree': round(len(raw) / rate, 2), 'essai': 'ancien son'}
            if checked_by_asr(text):
                said = heard(trial, lang)
                similarity = difflib.SequenceMatcher(None, plain(text, lang), plain(said, lang)).ratio()
                measures.update(entendu=said, ressemblance=round(similarity, 2))
                penalty = max(0.0, 0.9 - similarity) * 10
                note += min(penalty, 3.0) if is_short(text) else penalty
            best = (note, None, measures)
        for attempt in ([] if best and best[0] <= 1 else attempts(text, args.essais)):
            audio = model.generate_audio(states[(lang, voice)], attempt).numpy().reshape(-1)
            seconds = len(audio) / rate
            gap = longest_gap(audio, rate)
            # garde-fous : un son beaucoup trop long pour son texte, ou coupé par un long silence, est raté
            if seconds > 2.5 + len(text) * 0.2:
                problems.append(f'son trop long ({seconds:.1f} s)')
                continue
            if is_short(text) and gap > 0.8:
                problems.append(f'silence de {gap:.1f} s au milieu')
                continue
            if len(text) > 15 and len(text) / max(seconds, 0.1) > 30:
                problems.append(f'son coupé ({seconds:.1f} s)')
                continue
            f0 = pitch(audio, rate)
            off = abs(np.log(f0 / PITCH.get(voice, f0))) if f0 else 0.0
            audio = level_up(audio, rate)
            measures = {'hauteur': round(f0) if f0 else None, 'duree': round(seconds, 2), 'essai': attempt}
            note = off / PITCH_TOLERANCE  # 1 = à la limite de la tolérance
            if checked_by_asr(text):
                write_wav(wav, audio, rate)
                encode(wav, trial, 1)
                said = heard(trial, lang)
                similarity = difflib.SequenceMatcher(None, plain(text, lang), plain(said, lang)).ratio()
                measures.update(entendu=said, ressemblance=round(similarity, 2))
                penalty = max(0.0, 0.9 - similarity) * 10  # une diction douteuse compte plus qu'une voix un peu haute
                # sur un ou deux mots, la reconnaissance vocale se trompe souvent : elle départage, sans exclure
                note += min(penalty, 3.0) if is_short(text) else penalty
            if best is None or note < best[0]:
                best = (note, audio, measures)
            if note <= 1:
                break
        if best is None or best[0] > 4:
            failures.append({'key': e['key'], 'text': text, 'erreur': '; '.join(problems) or f'meilleur essai : {best[2] if best else None}'})
        elif best[1] is None:
            report.append({'key': e['key'], 'note': round(best[0], 2), 'garde': True, **best[2]})
        else:
            write_wav(wav, best[1], rate)
            encode(wav, OUT / e['file'], e['rate'])
            if (OUT / e['file']).stat().st_size < 480:  # moins d'un dixième de seconde : tout a été retiré comme silence
                (OUT / e['file']).unlink()
                failures.append({'key': e['key'], 'text': text, 'erreur': 'son vide après retrait des silences'})
            else:
                spoken += best[2]['duree']
                report.append({'key': e['key'], 'note': round(best[0], 2), **best[2]})
        if i % 200 == 0 or i == len(todo):
            spent = time.time() - start
            print(f'  {i}/{len(todo)} sons, {spoken:.0f} s de voix en {spent:.0f} s', flush=True)

OUT.mkdir(parents=True, exist_ok=True)
(OUT / f'echecs-{k}.json').write_text(json.dumps(failures, ensure_ascii=False, indent=1), encoding='utf-8')
(OUT / f'rapport-{k}.json').write_text(json.dumps(report, ensure_ascii=False), encoding='utf-8')
print(f'morceau {k}/{n} : {len(todo) - len(failures)} sons fabriqués, {len(failures)} échecs', flush=True)
