# Essai de voix avec Pocket TTS (Kyutai) : chaque phrase de phrases-essai.json en WAV,
# avec le modèle français normal et le grand modèle (24 couches), et l'anglais.
# Usage : python scripts/voix/essai_pocket.py sortie/
import json
import sys
import time
import wave
from pathlib import Path

import numpy as np
from pocket_tts import TTSModel

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else 'voix-essai')
PHRASES = json.loads((Path(__file__).parent / 'phrases-essai.json').read_text(encoding='utf-8'))


def write_wav(path, audio, rate):
    data = np.clip(np.asarray(audio, dtype=np.float32).reshape(-1), -1, 1)
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(rate)
        f.writeframes((data * 32767).astype(np.int16).tobytes())
    return len(data) / rate


def run(name, language, voice, phrases):
    folder = OUT / name
    folder.mkdir(parents=True, exist_ok=True)
    start = time.time()
    model = TTSModel.load_model(language=language)
    state = model.get_state_for_audio_prompt(voice)
    print(f'{name} : modèle chargé en {time.time() - start:.0f} s', flush=True)
    total_audio = total_time = 0
    for i, text in enumerate(phrases, 1):
        t = time.time()
        audio = model.generate_audio(state, text)
        seconds = write_wav(folder / f'{i:02d}.wav', audio.numpy(), model.sample_rate)
        spent = time.time() - t
        total_audio += seconds
        total_time += spent
        print(f'  {i:02d} : {seconds:.1f} s de voix en {spent:.1f} s', flush=True)
    print(f'{name} : {total_audio:.0f} s de voix en {total_time:.0f} s (x{total_audio / total_time:.1f} temps réel)', flush=True)


run('pocket-fr', 'french', 'estelle', PHRASES['fr'])
run('pocket-fr-24l', 'french_24l', 'estelle', PHRASES['fr'])
run('pocket-en', 'english', 'alba', PHRASES['en'])
