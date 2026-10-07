# Prononciation : les phonèmes attendus (espeak-ng) et ceux qu'on entend vraiment (wav2vec2, un modèle
# de reconnaissance de phonèmes). La reconnaissance vocale de mots (Whisper) devine le mot même mal
# prononcé (« sing » est compris « singe ») ; ici, c'est le son lui-même qui est comparé.
import re
import subprocess
import unicodedata

import numpy as np

MODEL = 'facebook/wav2vec2-xlsr-53-espeak-cv-ft'
ESPEAK = {'fr': 'fr-fr', 'en': 'en-gb'}
_model = None


def _plain(ipa):
    """Phonèmes comparables : sans accents toniques, longueurs, liaisons ni séparateurs."""
    ipa = unicodedata.normalize('NFC', ipa)
    ipa = re.sub('[ˈˌːˑ‍͡_\\-\\s]', '', ipa)
    # notations voisines d'un outil à l'autre
    return ipa.replace('ɡ', 'g').replace('r', 'ʁ').replace('ɜ', 'ə').replace('ɐ', 'a')


def expected(text, lang):
    """Les phonèmes du texte, d'après espeak-ng."""
    out = subprocess.run(['espeak-ng', '-q', '--ipa', '-v', ESPEAK[lang], text], capture_output=True, text=True, check=True).stdout
    return _plain(out)


def heard(audio16k):
    """Les phonèmes entendus dans le son (16 kHz, mono)."""
    global _model
    import torch
    from transformers import AutoModelForCTC, Wav2Vec2FeatureExtractor, Wav2Vec2PhonemeCTCTokenizer
    if _model is None:
        _model = (Wav2Vec2FeatureExtractor.from_pretrained(MODEL), Wav2Vec2PhonemeCTCTokenizer.from_pretrained(MODEL, do_phonemize=False),
                  AutoModelForCTC.from_pretrained(MODEL).eval())
    features, tokenizer, model = _model
    x = np.asarray(audio16k, dtype=np.float32)
    inputs = features(np.concatenate([np.zeros(1600, np.float32), x, np.zeros(1600, np.float32)]), sampling_rate=16000, return_tensors='pt')
    with torch.no_grad():
        ids = model(inputs.input_values).logits.argmax(-1)[0]
    return _plain(tokenizer.decode(ids))


def distance(a, b):
    """Part des phonèmes attendus mal dits (distance d'édition rapportée à leur nombre)."""
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1] / max(1, len(a))
