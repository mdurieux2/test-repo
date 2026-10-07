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
    pad = np.zeros(4800, np.float32)
    inputs = features(np.concatenate([pad, x, pad]), sampling_rate=16000, return_tensors='pt')
    with torch.no_grad():
        ids = model(inputs.input_values).logits.argmax(-1)[0]
    return _plain(tokenizer.decode(ids))


def _broad(p):
    """Phonèmes rapprochés des confusions habituelles du modèle (ʁ roulé ou non, voyelles voisines) :
    seuls les vrais écarts comptent."""
    p = re.sub(r'\((en|fʁ|fr)\)|[0-9.,\']', '', p)
    for a, b in [('ɑ̃', 'Õ'), ('ɔ̃', 'Õ'), ('õ', 'Õ'), ('ã', 'Õ'), ('ɛ̃', 'Ẽ'), ('œ̃', 'Ẽ'), ('tʃ', 'ʃ'), ('dʒ', 'ʒ')]:
        p = p.replace(a, b)
    p = re.sub('[aɑɔoʊuʌ](ŋ[gk]?|ng)', 'Õ', p)  # « on », « an » entendus « oŋ », « ong »
    return p.translate(str.maketrans({'ɾ': 'ʁ', 'x': 'ʁ', 'χ': 'ʁ', 'ʀ': 'ʁ', 'ɹ': 'ʁ', 'ɡ': 'g', 'ɪ': 'i', 'ʊ': 'u',
                                      'ɐ': 'a', 'ɑ': 'a', 'ɔ': 'o', 'ɛ': 'e', 'œ': 'ø', 'ə': 'ø', 'ɜ': 'ø', 'ð': 'd',
                                      'ʌ': 'a', 'ɚ': 'ø', 'æ': 'e', 'ɨ': 'i'}))


VOWELS = set('aeiouyøɛɔəɑœɪʊʌ') | {'̃'}
# lettre finale muette (« souris », « chat », « doux ») → consonnes qu'on entendrait si elle était dite
SILENT = {'s': 'sz', 't': 't', 'x': 'ksz', 'd': 'dt', 'z': 'zs', 'p': 'p'}


def faults(text, lang, exp, got):
    """Fautes nettes de prononciation : une lettre finale muette dite, un « in » dit à l'anglaise (« sing »)."""
    out = []
    if lang != 'fr' or not got:
        return out
    word = re.sub(r"[^\w'-]", '', (text.split() or [''])[-1].lower())
    last = word[-1:]
    if last in SILENT and exp and exp[-1] in VOWELS and got[-1] in SILENT[last]:
        out.append(f'« {last} » final prononcé')
    if 'ɛ̃' in exp and re.search('[iɪ]ŋ', got):
        out.append('« in » dit à l’anglaise')
    return out


def judge(text, lang, audio16k):
    """Écart de prononciation (0 = parfait ; une faute nette compte 1) et détails."""
    exp, got = expected(text, lang), heard(audio16k)
    found = faults(text, lang, exp, got)
    return distance(_broad(exp), _broad(got)) + len(found), {'phonemes_attendus': exp, 'phonemes_entendus': got, 'fautes': found}


def distance(a, b):
    """Part des phonèmes attendus mal dits (distance d'édition rapportée à leur nombre)."""
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1] / max(1, len(a))
