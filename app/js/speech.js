// Voix (synthèse vocale du système : sur iPhone et iPad, les voix françaises d'Apple).
// Indispensable au CP : l'enfant entend chaque consigne sans avoir à la lire.
//
// Pour une voix plus naturelle, on choisit automatiquement la meilleure voix installée :
// « Premium », puis « améliorée », puis la voix compacte. Les voix gadget (Grand-mère,
// Rocko…) sont écartées. Une seule voix pour toute l'app ; le parent peut la choisir dans les Réglages.

const synth = globalThis.speechSynthesis;
let enabled = true;
let voices = { main: null, en: null };
let preferences = {}; // { main: voiceURI } choisie dans les Réglages
let queueId = 0;

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
  if (id.includes('natural') || id.includes('neural')) score += 5; // voix « Natural » de Microsoft (Edge, Windows)
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
  const english = synth.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
  voices = {
    // une seule voix pour toute l'app (l'ancien réglage « voix des filles » est repris)
    main: byUri(preferences.main) || byUri(preferences.female) || best(fr, 'fr-FR'),
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
    const chosen = lang.startsWith('en') ? voices.en : voices.main;
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
    // lecture en karaoké : on suit les mots lus (si le navigateur le permet)
    if (part.onStart) utterance.onstart = () => part.onStart();
    if (part.onWord) utterance.onboundary = (e) => { if (!e.name || e.name === 'word') part.onWord(e.charIndex); };
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
