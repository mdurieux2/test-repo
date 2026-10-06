# Fabrique les sons de la voix naturelle (Pocket TTS de Kyutai, modèle normal) listés dans
# scripts/voix/a-generer.json : un MP3 par phrase, nombre ou prénom.
# Les sons déjà présents dans app/voix/ sont sautés (seules les nouvelles phrases sont fabriquées).
#
# Usage : python scripts/voix/generer.py --shard 3/8 --sortie voix-sortie
import argparse
import json
import re
import subprocess
import tempfile
import time
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
args = parser.parse_args()
k, n = map(int, args.shard.split('/'))
OUT = Path(args.sortie)
EXISTING = ROOT / 'app/voix'
LANGUAGES = {'fr': 'french', 'en': 'english'}

items = json.loads(Path(args.liste).read_text(encoding='utf-8'))
todo = [e for i, e in enumerate(items) if i % n == k - 1 and not (EXISTING / e['file']).exists()]
print(f'morceau {k}/{n} : {len(todo)} sons à fabriquer', flush=True)


def tts_text(e):
    if e['type'] == 'nombre':
        return say_number(e['text'], e['lang'])
    # guillemets et tirets décoratifs : ils ne se prononcent pas
    return re.sub(r'[«»“”"]', '', e['text']).strip()


def longest_gap(audio, rate, threshold_db=-55):
    """Plus long silence (en secondes) au milieu du son, par fenêtres de 10 ms."""
    x = np.abs(np.asarray(audio, dtype=np.float32).reshape(-1))
    win = max(1, int(rate * 0.01))
    n = len(x) // win
    if n == 0:
        return 0.0
    env = x[: n * win].reshape(n, win).max(axis=1)
    loud = np.where(env > 10 ** (threshold_db / 20))[0]
    if len(loud) == 0:
        return float('inf')  # rien n'a été dit
    longest = run = 0
    for quiet in env[loud[0]: loud[-1] + 1] <= 10 ** (threshold_db / 20):
        run = run + 1 if quiet else 0
        longest = max(longest, run)
    return longest * 0.01


# Sur un texte très court (une syllabe, une lettre, un prénom), la voix dit parfois un bout de son,
# se tait une à deux secondes, puis reprend : un long silence au milieu signale un son raté. On
# réessaie avec une ponctuation différente, puis on abandonne (la voix de l'appareil dira ce morceau).
# Dans une vraie phrase, les silences sont des pauses : elles sont seulement raccourcies (encode).
MAX_GAP_SHORT = 0.5


def is_short(text):
    """Un ou deux mots, sans ponctuation au milieu (« ma », « Lila », « Très bien ! », « À toi, »)."""
    return len(re.findall(r"[\w'-]+", text)) <= 2 and not re.search(r'[.,;:!?]', text.strip(' .!?,;:'))


def variants(text):
    yield text
    if not text.endswith(('.', '!', '?')):
        yield f'{text}.'
        yield f'{text} !'
    yield f'« {text} »'


def write_wav(path, audio, rate):
    data = np.clip(np.asarray(audio, dtype=np.float32).reshape(-1), -1, 1)
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(rate)
        f.writeframes((data * 32767).astype(np.int16).tobytes())
    return len(data) / rate


def encode(wav, mp3, rate):
    """Pauses raccourcies (0,35 s au plus), silences du début et de la fin retirés, vitesse ajustée,
    MP3 mono 32 kbit/s."""
    pauses = 'silenceremove=stop_periods=-1:stop_duration=0.45:stop_threshold=-50dB:stop_silence=0.35'
    trim = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse,'
            'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse')
    filters = f'{pauses},{trim}' + (f',atempo={rate}' if abs(rate - 1) > 0.001 else '')
    mp3.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav), '-af', filters,
                    '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '32k', str(mp3)], check=True)


models, states = {}, {}
failures = []
start = time.time()
spoken = 0.0
with tempfile.TemporaryDirectory() as tmp:
    wav = Path(tmp) / 'son.wav'
    for i, e in enumerate(todo, 1):
        lang, voice = e['lang'], e['voice']
        if lang not in models:
            models[lang] = TTSModel.load_model(language=LANGUAGES[lang])
        if (lang, voice) not in states:
            states[(lang, voice)] = models[lang].get_state_for_audio_prompt(voice)
        text = tts_text(e)
        try:
            problem = None
            for attempt in variants(text):
                audio = models[lang].generate_audio(states[(lang, voice)], attempt).numpy()
                rate = models[lang].sample_rate
                seconds = len(audio.reshape(-1)) / rate
                gap = longest_gap(audio, rate)
                # garde-fous : un son beaucoup trop long pour son texte, ou coupé par un long silence, est raté
                if seconds > 2.5 + len(text) * 0.2:
                    problem = f'son trop long ({seconds:.1f} s)'
                elif is_short(text) and gap > MAX_GAP_SHORT:
                    problem = f'silence de {gap:.1f} s au milieu'
                else:
                    problem = None
                    break
            if problem:
                raise ValueError(problem)
            write_wav(wav, audio, rate)
            encode(wav, OUT / e['file'], e['rate'])
            spoken += seconds
        except Exception as error:  # le son manquant sera dit par la voix de l'appareil
            failures.append({'key': e['key'], 'text': text, 'erreur': str(error)})
        if i % 200 == 0 or i == len(todo):
            spent = time.time() - start
            print(f'  {i}/{len(todo)} sons, {spoken:.0f} s de voix en {spent:.0f} s', flush=True)

OUT.mkdir(parents=True, exist_ok=True)
(OUT / f'echecs-{k}.json').write_text(json.dumps(failures, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'morceau {k}/{n} : {len(todo) - len(failures)} sons fabriqués, {len(failures)} échecs', flush=True)
