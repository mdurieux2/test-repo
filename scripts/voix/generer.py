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


def write_wav(path, audio, rate):
    data = np.clip(np.asarray(audio, dtype=np.float32).reshape(-1), -1, 1)
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(rate)
        f.writeframes((data * 32767).astype(np.int16).tobytes())
    return len(data) / rate


def encode(wav, mp3, rate):
    """Silences du début et de la fin retirés, vitesse ajustée, MP3 mono 32 kbit/s."""
    trim = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse,'
            'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse')
    filters = trim + (f',atempo={rate}' if abs(rate - 1) > 0.001 else '')
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
            audio = models[lang].generate_audio(states[(lang, voice)], text)
            seconds = write_wav(wav, audio.numpy(), models[lang].sample_rate)
            # garde-fou : un son beaucoup trop long pour son texte est raté (la voix s'emballe)
            if seconds > 2.5 + len(text) * 0.2:
                raise ValueError(f'son trop long ({seconds:.1f} s)')
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
