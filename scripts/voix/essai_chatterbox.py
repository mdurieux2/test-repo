# Essai de voix avec Chatterbox Multilingual (Resemble AI) : les phrases françaises de
# phrases-essai.json en WAV, avec la voix d'un court extrait (pour comparer à timbre égal).
# Usage : python scripts/voix/essai_chatterbox.py sortie/ [extrait.wav]
import json
import sys
import time
from pathlib import Path

import torchaudio
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else 'voix-essai') / 'chatterbox-fr'
PROMPT = sys.argv[2] if len(sys.argv) > 2 else None
PHRASES = json.loads((Path(__file__).parent / 'phrases-essai.json').read_text(encoding='utf-8'))

OUT.mkdir(parents=True, exist_ok=True)
start = time.time()
model = ChatterboxMultilingualTTS.from_pretrained(device='cpu')
print(f'chatterbox-fr : modèle chargé en {time.time() - start:.0f} s', flush=True)
total_audio = total_time = 0
for i, text in enumerate(PHRASES['fr'], 1):
    t = time.time()
    wav = model.generate(text, language_id='fr', audio_prompt_path=PROMPT) if PROMPT else model.generate(text, language_id='fr')
    torchaudio.save(str(OUT / f'{i:02d}.wav'), wav, model.sr)
    seconds = wav.shape[-1] / model.sr
    spent = time.time() - t
    total_audio += seconds
    total_time += spent
    print(f'  {i:02d} : {seconds:.1f} s de voix en {spent:.1f} s', flush=True)
print(f'chatterbox-fr : {total_audio:.0f} s de voix en {total_time:.0f} s (x{total_audio / total_time:.2f} temps réel)', flush=True)
