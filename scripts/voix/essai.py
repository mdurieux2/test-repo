# Essai (temporaire), 2e partie : l'anglais d'Estelle est-il compris comme de l'anglais ?
# Quelle reconnaissance vocale (Whisper) pour vérifier la diction, en combien de temps ?
# Les sons d'essai et le rapport sont déposés sous l'étiquette voix-essai/<branche> (publier.sh).
import difflib
import json
import re
import subprocess
import sys
import time
import unicodedata
import wave
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel
from pocket_tts import TTSModel

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else 'voix-essai')
OUT.mkdir(parents=True, exist_ok=True)
report = {}


def log(*a):
    print(*a, flush=True)


def decode(path):
    """Son → tableau 16 kHz (sans passer par PyAV)."""
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(path), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def plain(text):
    text = unicodedata.normalize('NFD', text.lower())
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    return ' '.join(re.sub(r"[^a-z0-9']+", ' ', text.replace('-', ' ')).split())


def save(name, audio, rate):
    wav = OUT / f'{name}.wav'
    data = np.clip(np.asarray(audio, dtype=np.float32).reshape(-1), -1, 1)
    with wave.open(str(wav), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(rate)
        f.writeframes((data * 32767).astype(np.int16).tobytes())
    mp3 = OUT / f'{name}.mp3'
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav), '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame',
                    '-b:a', '48k', str(mp3)], check=True)
    wav.unlink()
    return mp3


EN = ['Hello! How many dogs?', 'Show me three!', 'The cat is on the table.', 'apple', 'Where is the rabbit?',
      'Yes! The cloud is not for school.', 'seven minus three?', 'The rabbit is under the table.', 'Well done!',
      'My name is', 'What colour is it?', 'banana', 'Good morning!', 'twenty-four', 'How old are you?']
model = TTSModel.load_model(language='english')
rate = model.sample_rate
voices = {voice: model.get_state_for_audio_prompt(voice) for voice in ['estelle', 'alba']}
samples = []  # (fichier, texte attendu, langue)
for voice, state in voices.items():
    for i, text in enumerate(EN):
        samples.append((save(f'en2-{voice}-{i}', model.generate_audio(state, text).numpy(), rate), text, 'en', voice))

items = json.loads((ROOT / 'scripts/voix/a-generer.json').read_text(encoding='utf-8'))
existing = [e for e in items if (ROOT / 'app/voix' / e['file']).exists()]
for e in [x for x in existing if x['lang'] == 'fr' and x['type'] == 'texte' and len(x['text']) > 12][:40]:
    samples.append((ROOT / 'app/voix' / e['file'], e['text'], 'fr', 'estelle-1.8.1'))

for size in ['small', 'large-v3-turbo']:
    asr = WhisperModel(size, device='cpu', compute_type='int8')
    start, audio_s, rows = time.time(), 0.0, []
    for path, text, lang, voice in samples:
        audio = decode(path)
        segments, _ = asr.transcribe(audio, language=lang, beam_size=1, vad_filter=False, condition_on_previous_text=False)
        said = ' '.join(s.text.strip() for s in segments)
        audio_s += len(audio) / 16000
        rows.append({'voix': voice, 'attendu': text, 'entendu': said,
                     'ressemblance': round(difflib.SequenceMatcher(None, plain(text), plain(said)).ratio(), 2)})
    spent = time.time() - start
    by_voice = {}
    for r in rows:
        by_voice.setdefault(r['voix'], []).append(r['ressemblance'])
    summary = {v: round(float(np.mean(s)), 3) for v, s in by_voice.items()}
    report[f'whisper-{size}'] = {'secondes': round(spent, 1), 'audio': round(audio_s, 1), 'moyennes': summary, 'lignes': rows}
    log(size, f'{spent:.0f} s pour {audio_s:.0f} s de voix', summary)
    for r in rows:
        if r['ressemblance'] < 0.9:
            log('   ', r)

(OUT / 'rapport.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
log('fini')
