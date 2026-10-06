# Essai (temporaire) : Estelle peut-elle parler anglais ? Quelle voix anglaise lui ressemble ?
# Combien varie la hauteur d'un essai à l'autre ? Quelle reconnaissance vocale pour vérifier la diction ?
# Les sons d'essai et le rapport sont déposés sous l'étiquette voix-essai/<branche> (publier.sh).
import json
import subprocess
import sys
import time
import urllib.request
import wave
from pathlib import Path

import numpy as np
from pocket_tts import TTSModel

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else 'voix-essai')
OUT.mkdir(parents=True, exist_ok=True)
report = {}


def log(*a):
    print(*a, flush=True)


def f0_median(audio, rate):
    x = np.asarray(audio, dtype=np.float32).reshape(-1)
    win, hop = int(0.04 * rate), int(0.01 * rate)
    lo, hi = rate // 400, rate // 70
    vals = []
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
            vals.append(rate / lag)
    return round(float(np.median(vals)), 0) if len(vals) > 5 else None


def save(name, audio, rate):
    wav = OUT / f'{name}.wav'
    data = np.clip(np.asarray(audio, dtype=np.float32).reshape(-1), -1, 1)
    with wave.open(str(wav), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(rate)
        f.writeframes((data * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav), '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame',
                    '-b:a', '48k', str(OUT / f'{name}.mp3')], check=True)
    wav.unlink()
    return {'f0': f0_median(audio, rate), 'duree': round(len(data) / rate, 2)}


# 1. les voix prêtes à l'emploi, par langue
for lang in ['english', 'french']:
    url = f'https://huggingface.co/api/models/kyutai/pocket-tts-without-voice-cloning/tree/main/languages/{lang}/embeddings'
    try:
        names = [Path(e['path']).stem for e in json.load(urllib.request.urlopen(url, timeout=30))]
    except Exception as error:
        names = [f'erreur : {error}']
    report[f'voix_{lang}'] = names
    log(lang, names)

EN = ['Hello! How many dogs?', 'Show me three!', 'The cat is on the table.', 'apple', 'Where is the rabbit?']
FR = ['Regarde le joli lion !', 'Bravo ! Tu as trouvé la bonne réponse.', 'Combien font sept plus cinq ?']

models = {lang: TTSModel.load_model(language=lang) for lang in ['english', 'french']}
rate = models['english'].sample_rate

# 2. Estelle avec le modèle anglais, puis avec le modèle français (accent français), puis Alba
for model_lang, voice in [('english', 'estelle'), ('french', 'estelle'), ('english', 'alba')]:
    key = f'{voice}-modele-{model_lang}'
    try:
        state = models[model_lang].get_state_for_audio_prompt(voice)
        report[key] = {t: save(f'{key}-{i}', models[model_lang].generate_audio(state, t).numpy(), rate) for i, t in enumerate(EN)}
    except Exception as error:
        report[key] = f'erreur : {error}'
    log(key, report[key])

# 3. voix anglaises féminines : hauteur moyenne (Estelle en français : ~250 Hz)
for voice in ['eve', 'jane', 'mary', 'anna', 'vera', 'fantine', 'eponine', 'azelma', 'cosette', 'caro_davy']:
    try:
        state = models['english'].get_state_for_audio_prompt(voice)
        report[f'en-{voice}'] = save(f'en-{voice}', models['english'].generate_audio(state, EN[0] + ' ' + EN[2]).numpy(), rate)
    except Exception as error:
        report[f'en-{voice}'] = f'erreur : {error}'
    log(voice, report[f'en-{voice}'])

# 4. variabilité d'un essai à l'autre (Estelle, français), avec et sans point d'exclamation
state = models['french'].get_state_for_audio_prompt('estelle')
for i, text in enumerate(FR + ['Regarde le joli lion.', 'Des pommes !', 'Des pommes.']):
    runs = []
    for n in range(5):
        runs.append(save(f'fr-variation-{i}-{n}', models['french'].generate_audio(state, text).numpy(), rate))
    report[f'variation {text}'] = runs
    log(text, runs)

# 5. reconnaissance vocale : temps et justesse sur des sons existants
from faster_whisper import WhisperModel  # noqa: E402

items = json.loads((ROOT / 'scripts/voix/a-generer.json').read_text(encoding='utf-8'))
sample = [e for e in items if e['type'] == 'texte' and e['lang'] == 'fr' and len(e['text']) > 12][:60:2]
sample += [e for e in items if e['lang'] == 'en'][:20:2]
sample += [e for e in items if e['type'] == 'texte' and len(e['text']) <= 4][:10]
for size in ['small', 'large-v3-turbo']:
    model = WhisperModel(size, device='cpu', compute_type='int8')
    start, audio_s, rows = time.time(), 0.0, []
    for e in sample:
        path = ROOT / 'app/voix' / e['file']
        if not path.exists():
            continue
        segments, info = model.transcribe(str(path), language=e['lang'], beam_size=1, vad_filter=False)
        text = ' '.join(s.text.strip() for s in segments)
        audio_s += info.duration
        rows.append({'attendu': e['text'], 'entendu': text})
    spent = time.time() - start
    report[f'whisper-{size}'] = {'secondes': round(spent, 1), 'audio': round(audio_s, 1), 'lignes': rows}
    log(size, f'{spent:.0f} s pour {audio_s:.0f} s de voix')

(OUT / 'rapport.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
log('fini')
