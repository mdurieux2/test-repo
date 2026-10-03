// Voix française (synthèse vocale du système : sur iPhone, les voix Siri françaises).
// Indispensable au CP : l'enfant entend chaque consigne sans avoir à la lire.

const synth = globalThis.speechSynthesis;
let enabled = true;
let voices = { female: null, male: null, any: null, en: null };
let queueId = 0;

// Voix françaises connues (iPhone, Mac, Chrome), pour donner une voix à chaque personnage.
const FEMALE = ['Audrey', 'Aurélie', 'Marie', 'Amélie', 'Virginie', 'Julie', 'Céline', 'Google français'];
const MALE = ['Thomas', 'Jacques', 'Nicolas', 'Daniel', 'Paul'];

function chooseVoices() {
  if (!synth) return;
  const fr = synth.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('fr'));
  // Voix de France d'abord, puis les autres voix françaises (Canada, Belgique…).
  const sorted = [...fr.filter((v) => v.lang === 'fr-FR'), ...fr.filter((v) => v.lang !== 'fr-FR')];
  const find = (names) => sorted.find((v) => names.some((n) => v.name.includes(n))) || null;
  // Anglais : accent britannique de préférence (programme de langues vivantes).
  const english = synth.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
  const en = english.find((v) => v.lang === 'en-GB') || english[0] || null;
  voices = { female: find(FEMALE), male: find(MALE), any: sorted[0] || null, en };
}

if (synth) {
  chooseVoices();
  synth.addEventListener?.('voiceschanged', chooseVoices);
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
    const { text, rate = 0.9, pitch = 1.05, voice, lang = 'fr-FR' } = part;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    const chosen = lang.startsWith('en') ? voices.en : voices[voice] || voices.any;
    if (chosen) utterance.voice = chosen;
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
