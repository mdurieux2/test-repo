# Essai (temporaire) : la prononciation des sons d'Estelle mesurée phonème par phonème.
#  1. Des sons déjà publiés (« singe », « souris », des mots et des phrases au hasard) : phonèmes
#     attendus, phonèmes entendus, part mal dite.
#  2. Pour les mots les plus mal dits : de nouveaux essais, tels quels ou dits après « Écoute bien. »
#     (puis coupés à la pause), pour voir lequel prononce le mieux.
# Usage : python scripts/voix/essai-phonemes.py <dossier de sortie>
import json
import random
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from nombres import say_number  # noqa: E402
from phonemes import distance, expected, heard  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
VOIX = ROOT / 'app/voix'
OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
manifest = json.loads((VOIX / 'manifest.json').read_text(encoding='utf-8'))
where = {}
for pack in manifest['paquets']:
    start = 0
    for file, size in pack['sons']:
        where[file] = (pack['nom'], start, size)
        start += size


def clip(key):
    nom, start, size = where[manifest['clips'][key]]
    with open(VOIX / nom, 'rb') as f:
        f.seek(start)
        return f.read(size)


def decode16(data):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                         input=data, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def text_of(key):
    lang, _, text = key.split('|', 2)
    text = re.sub(r'[«»“”"]', '', text).strip()
    return lang, re.sub(r'\d+', lambda m: say_number(m.group(0), lang), text)


def score(key, audio16k):
    lang, text = text_of(key)
    exp, got = expected(text, lang), heard(audio16k)
    return distance(exp, got), exp, got


# 1. sons publiés
keys = list(manifest['clips'])
rng = random.Random(7)
words = [k for k in keys if k.startswith('fr|1|') and re.fullmatch(r"[\w'-]+", k[5:])]
sentences = [k for k in keys if k.startswith('fr|1|') and k.count(' ') >= 3]
english = [k for k in keys if k.startswith('en|1|') and re.fullmatch(r"[\w'-]+", k[5:])]
chosen = ['fr|1|singe', 'fr|1|souris', 'fr|1|chat', 'fr|1|oiseau'] + rng.sample(words, 80) + rng.sample(sentences, 25) + rng.sample(english, 15)
results = []
for key in dict.fromkeys(k for k in chosen if k in manifest['clips']):
    per, exp, got = score(key, decode16(clip(key)))
    results.append({'key': key, 'attendu': exp, 'entendu': got, 'ecart': round(per, 2)})
results.sort(key=lambda r: -r['ecart'])
print('== sons publiés (du plus mal dit au mieux dit) ==')
for r in results:
    print(f"{r['ecart']:.2f}  {r['key']:<45} attendu {r['attendu']:<28} entendu {r['entendu']}")
values = np.array([r['ecart'] for r in results])
print(f'médiane {np.median(values):.2f} ; 90e centile {np.percentile(values, 90):.2f} ; au-delà de 0,3 : {(values > 0.3).sum()} sur {len(values)}')

# 2. nouveaux essais pour les mots les plus mal dits
from pocket_tts import TTSModel  # noqa: E402

model = TTSModel.load_model(language='french')
state = model.get_state_for_audio_prompt('estelle')
rate = model.sample_rate


def after_pause(audio):
    """Ce qui suit la plus longue pause (la fin de « Écoute bien. »), ou None s'il n'y en a pas."""
    win = int(rate * 0.01)
    env = np.abs(audio[: len(audio) // win * win].reshape(-1, win)).max(axis=1)
    quiet = env <= 10 ** (-45 / 20)
    loud = np.where(~quiet)[0]
    if len(loud) == 0:
        return None
    best, run = (0, 0), None
    for i in range(loud[0], loud[-1] + 1):
        if quiet[i] and run is None:
            run = i
        elif not quiet[i] and run is not None:
            best = max(best, (i - run, run))
            run = None
    if best[0] < 12:
        return None
    return audio[max(0, (best[1] + best[0]) * win - int(rate * 0.03)):]


def write_mp3(audio, path):
    wav = OUT / 'tmp.wav'
    with wave.open(str(wav), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(rate)
        f.writeframes((np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav), '-af',
                    'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse',
                    '-ac', '1', '-ar', '24000', '-b:a', '32k', str(path)], check=True)
    return decode16(path.read_bytes())


print('\n== nouveaux essais ==')
worst = ['fr|1|singe', 'fr|1|souris'] + [r['key'] for r in results if r['key'].startswith('fr|1|') and ' ' not in r['key']][:6]
for key in dict.fromkeys(worst):
    _, text = text_of(key)
    name = re.sub(r'\W+', '-', text)
    lines = []
    for i, (how, prompt) in enumerate([('tel quel', text), ('tel quel', text), ('avec un point', f'{text}.'),
                                       ('après « Écoute bien. »', f'Écoute bien. {text[0].upper()}{text[1:]}.'),
                                       ('après « Écoute bien. »', f'Écoute bien. {text[0].upper()}{text[1:]}.'),
                                       ('après « Voici le mot. »', f'Voici le mot. {text[0].upper()}{text[1:]}.')]):
        audio = model.generate_audio(state, prompt).numpy().reshape(-1)
        if how.startswith('après'):
            audio = after_pause(audio)
            if audio is None:
                lines.append(f'   {how:<26} pas de pause trouvée')
                continue
        per, exp, got = score(key, write_mp3(audio, OUT / f'{name}-{i}.mp3'))
        lines.append(f'   {how:<26} {per:.2f}  entendu {got:<20} → {name}-{i}.mp3')
    print(f'{key} (attendu {expected(text, "fr")}) :')
    print('\n'.join(lines))
(OUT / 'tmp.wav').unlink(missing_ok=True)
(OUT / 'essai-phonemes.json').write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding='utf-8')
