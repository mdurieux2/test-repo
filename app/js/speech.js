// Voix (synthèse vocale du système : sur iPhone et iPad, les voix françaises d'Apple).
// Indispensable au CP : l'enfant entend chaque consigne sans avoir à la lire.
//
// Pour une voix plus naturelle, on choisit automatiquement la meilleure voix installée :
// « Premium », puis « améliorée », puis la voix compacte. Les voix gadget (Grand-mère,
// Rocko…) sont écartées. Le parent peut aussi choisir une voix dans les Réglages.

const synth = globalThis.speechSynthesis;
let enabled = true;
let voices = { female: null, male: null, any: null, en: null };
let preferences = {}; // { female: voiceURI, male: voiceURI } choisis dans les Réglages
let queueId = 0;

const FEMALE = ['Audrey', 'Aurélie', 'Amélie', 'Marie', 'Virginie', 'Julie', 'Céline', 'Chantal', 'Google français'];
const MALE = ['Thomas', 'Nicolas', 'Paul', 'Mathieu', 'Henri'];
const NOVELTY = ['Grand', 'Eddy', 'Flo', 'Reed', 'Rocko', 'Sandy', 'Shelley', 'Jacques', 'Albert', 'Bad', 'Bells', 'Boing',
  'Bubbles', 'Cellos', 'Wobble', 'Good News', 'Jester', 'Organ', 'Superstar', 'Trinoids', 'Whisper', 'Zarvox'];

/** Note de qualité d'une voix : plus c'est haut, plus elle est naturelle. */
export function voiceScore(voice, wantedLang = 'fr-FR') {
  const id = `${voice.name} ${voice.voiceURI || ''}`.toLowerCase();
  let score = 0;
  if (NOVELTY.some((n) => voice.name.startsWith(n))) score -= 10;
  if (id.includes('premium')) score += 6;
  else if (id.includes('enhanced') || id.includes('amélior')) score += 4;
  if (id.includes('siri')) score += 5;
  if (voice.lang === wantedLang) score += 2;
  if (voice.localService === false) score -= 1; // voix en ligne : indisponible hors connexion
  return score;
}

function best(list, wantedLang) {
  return [...list].sort((a, b) => voiceScore(b, wantedLang) - voiceScore(a, wantedLang))[0] || null;
}

function frenchVoices() {
  return synth ? synth.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('fr')) : [];
}

function chooseVoices() {
  if (!synth) return;
  const fr = frenchVoices();
  const byUri = (uri) => fr.find((v) => v.voiceURI === uri) || null;
  const named = (names) => fr.filter((v) => names.some((n) => v.name.includes(n)));
  const english = synth.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
  const anyFr = best(fr, 'fr-FR');
  voices = {
    female: byUri(preferences.female) || best(named(FEMALE), 'fr-FR') || anyFr,
    male: byUri(preferences.male) || best(named(MALE), 'fr-FR') || anyFr,
    any: anyFr,
    en: best(english, 'en-GB'),
  };
}

if (synth) {
  chooseVoices();
  synth.addEventListener?.('voiceschanged', chooseVoices);
}

/** Voix françaises installées, de la plus naturelle à la moins naturelle (pour les Réglages). */
export function listFrenchVoices() {
  return frenchVoices()
    .filter((v) => voiceScore(v) > -5)
    .sort((a, b) => voiceScore(b) - voiceScore(a))
    .map((v) => ({ id: v.voiceURI, name: v.name, lang: v.lang }));
}

export function setVoicePreferences(prefs = {}) {
  preferences = { ...prefs };
  chooseVoices();
}

export function isSpeechSupported() {
  return Boolean(synth);
}

export function setSpeechEnabled(value) {
  enabled = value;
  if (!value) stopSpeaking();
}

export function stopSpeaking() {
  queueId++;
  // Safari ignore parfois la phrase suivante si l'on annule une file déjà vide.
  if (synth && (synth.speaking || synth.pending)) synth.cancel();
}

function sayOne(part, id) {
  return new Promise((resolve) => {
    if (id !== queueId) return resolve();
    const { text, rate = 0.95, pitch = 1, voice, lang = 'fr-FR' } = part;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    const chosen = lang.startsWith('en') ? voices.en : voices[voice] || voices.any;
    if (chosen) {
      utterance.voice = chosen;
      utterance.lang = chosen.lang;
    }
    utterance.rate = rate;
    utterance.pitch = pitch;
    // Filet de sécurité : certains navigateurs n'émettent jamais « end ».
    const timer = setTimeout(resolve, 1500 + text.length * 120);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    utterance.onend = done;
    utterance.onerror = done;
    synth.speak(utterance);
  });
}

/**
 * Dit une phrase ou une suite de morceaux (chaîne ou {text, rate}).
 * `style` ({voice: 'female'|'male', pitch}) donne la voix d'un personnage.
 * Interrompt ce qui était en cours. Ne bloque jamais l'interface.
 */
export async function speak(parts, style = {}) {
  if (!synth || !enabled || !parts) return;
  stopSpeaking();
  const id = queueId;
  const list = Array.isArray(parts) ? parts : [parts];
  for (const part of list) {
    if (id !== queueId) return;
    await sayOne({ ...style, ...(typeof part === 'string' ? { text: part } : part) }, id);
  }
}
