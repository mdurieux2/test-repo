// Voix. Indispensable au CP : l'enfant entend chaque consigne sans avoir à la lire.
//
// 1. Voix naturelle : les phrases sont enregistrées à l'avance (Pocket TTS de Kyutai, voix
//    « Estelle » ; voir scripts/voix/) et jouées depuis app/voix/. Une phrase absente est jouée
//    en morceaux (texte, nombres, prénoms : voix-cles.js) si tous les morceaux existent.
// 2. Sinon, synthèse vocale du système (sur iPhone et iPad, les voix françaises d'Apple) : on
//    choisit automatiquement la meilleure voix installée (« Premium », puis « améliorée », puis la
//    voix compacte). Les voix gadget (Grand-mère, Rocko…) sont écartées. Le parent peut la choisir.

import { cle, langue, morceaux } from './voix-cles.js';

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

/**
 * Hors connexion, les voix en ligne (« Google français », voix « Online » de Microsoft) restent
 * muettes : on prend alors la meilleure voix installée sur l'appareil.
 */
export function offlineSafe(voice, list, wantedLang, online = globalThis.navigator?.onLine !== false) {
  if (!voice || online || voice.localService !== false) return voice;
  return best(list.filter((v) => v.localService !== false), wantedLang) || voice;
}

function englishVoices() {
  return synth ? synth.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('en')) : [];
}

function frenchVoices() {
  return synth ? synth.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('fr')) : [];
}

function chooseVoices() {
  if (!synth) return;
  const fr = frenchVoices();
  const byUri = (uri) => fr.find((v) => v.voiceURI === uri) || null;
  const english = englishVoices();
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
  return Boolean(synth) || Boolean(natural.clips);
}

// ---- Voix naturelle : sons enregistrés à l'avance

const VOICE_BASE = 'voix/';
const natural = { wanted: true, clips: null, files: [], names: [], unlocked: false, silence: null };
let player = null;
let cancelClip = null;

function audioPlayer() {
  if (!player) {
    player = new Audio();
    player.preload = 'auto';
    player.dataset.voix = 'naturelle'; // repéré par le test de bout en bout
  }
  return player;
}

/** Lit la liste des sons (voix/manifest.json). Sans elle, la synthèse du système est utilisée. */
export async function loadNaturalVoice(url = `${VOICE_BASE}manifest.json`) {
  try {
    const response = await fetch(url);
    if (!response.ok) return false;
    const data = await response.json();
    natural.clips = data.clips || null;
    natural.files = [...new Set(Object.values(data.clips || {}))];
    // un court silence, prêt à jouer au premier toucher (voir unlockNaturalVoice)
    fetch(`${VOICE_BASE}silence.mp3`).then((r) => (r.ok ? r.blob() : null)).then((blob) => {
      if (blob) natural.silence = URL.createObjectURL(blob);
    }).catch(() => {});
    return Boolean(natural.clips);
  } catch {
    return false;
  }
}

/** Fichiers des sons (pour les télécharger tous à l'avance, et jouer hors connexion). */
export function naturalVoiceFiles() {
  return natural.files;
}

export function setNaturalVoice(on) {
  natural.wanted = on !== false;
  if (!natural.wanted) stopClip();
}

export function isNaturalVoiceOn() {
  return Boolean(natural.wanted && natural.clips);
}

/** Prénoms des enfants : découpés dans les phrases pour être dits avec leur propre son. */
export function setSpeechNames(names) {
  natural.names = [...new Set(names.filter(Boolean))];
}

/** Sur iPhone et iPad, l'élément audio ne joue seul qu'après avoir joué une fois pendant un toucher. */
export function unlockNaturalVoice() {
  if (natural.unlocked || !isNaturalVoiceOn() || !natural.silence) return;
  natural.unlocked = true;
  const audio = audioPlayer();
  audio.src = natural.silence;
  audio.play()?.catch(() => { natural.unlocked = false; });
}

/** Les sons d'une phrase : la phrase entière, ou tous ses morceaux ; null s'il en manque un. */
export function clipsFor(part, clips = natural.clips, names = natural.names) {
  if (!clips || !part?.text) return null;
  const options = { lang: part.lang, rate: part.rate };
  const whole = clips[cle(part.text, options)];
  if (whole) return [{ file: whole, weight: 1 }];
  const pieces = morceaux(part.text, names, langue(part.lang));
  if (!pieces.length) return null;
  const files = [];
  for (const piece of pieces) {
    // nombres et prénoms : à la vitesse demandée s'il existe, sinon à la vitesse normale
    const file = clips[cle(piece.text, options)] || (piece.type !== 'texte' ? clips[cle(piece.text, { lang: part.lang })] : null);
    if (!file) return null;
    files.push({ file, weight: piece.text.length });
  }
  return files;
}

function stopClip() {
  cancelClip?.();
  cancelClip = null;
}

/** Début de chaque mot, pour suivre la lecture en karaoké (comme les « boundary » de la synthèse). */
function wordStarts(text) {
  return [...text.matchAll(/\S+/g)].map((m) => m.index);
}

async function playClips(list, part, id) {
  // tous les sons sont chargés avant de commencer : pas de trou, et pas de mélange de voix
  const blobs = await Promise.all(list.map(async ({ file }) => {
    const response = await fetch(VOICE_BASE + file);
    if (!response.ok) throw new Error(`son absent : ${file}`);
    return response.blob();
  }));
  if (id !== queueId) return;
  const total = list.reduce((sum, c) => sum + c.weight, 0);
  const starts = wordStarts(part.text);
  let before = 0;
  let lastWord = -1;
  part.onStart?.();
  for (let i = 0; i < list.length; i++) {
    if (id !== queueId) return;
    const url = URL.createObjectURL(blobs[i]);
    const weight = list[i].weight;
    try {
      await new Promise((resolve, reject) => {
        const audio = audioPlayer();
        let finished = false;
        const finish = (error) => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          audio.onended = audio.onerror = audio.ontimeupdate = null;
          if (error) {
            // le lecteur lâche ce son (il va être libéré) : il ne tentera pas de le recharger
            audio.removeAttribute('src');
            audio.load();
            reject(error);
          } else resolve();
        };
        const timer = setTimeout(() => finish(), 20000); // filet de sécurité
        cancelClip = () => {
          audio.pause();
          finish();
        };
        audio.onended = () => finish();
        audio.onerror = () => finish(new Error('son illisible'));
        audio.ontimeupdate = () => {
          if (!part.onWord || !audio.duration) return;
          const at = ((before + (audio.currentTime / audio.duration) * weight) / total) * part.text.length;
          const word = starts.filter((s) => s <= at).length - 1;
          if (word >= 0 && word !== lastWord) {
            lastWord = word;
            part.onWord(starts[word]);
          }
        };
        audio.src = url;
        audio.play()?.catch((error) => finish(error));
      });
    } finally {
      URL.revokeObjectURL(url);
    }
    before += weight;
  }
}

export function setSpeechEnabled(value) {
  enabled = value;
  if (!value) stopSpeaking();
}

export function stopSpeaking() {
  queueId++;
  stopClip();
  // Safari ignore parfois la phrase suivante si l'on annule une file déjà vide.
  if (synth && (synth.speaking || synth.pending)) synth.cancel();
}

function sayOne(part, id) {
  if (id !== queueId) return Promise.resolve();
  const clips = natural.wanted ? clipsFor(part) : null;
  // son introuvable ou illisible (hors connexion, pas encore téléchargé…) : la synthèse prend le relais
  if (clips) return playClips(clips, part, id).catch(() => (id === queueId ? saySynth(part, id) : undefined));
  return saySynth(part, id);
}

function saySynth(part, id) {
  return new Promise((resolve) => {
    if (id !== queueId || !synth) return resolve();
    const { text, rate = 0.95, pitch = 1, voice, lang = 'fr-FR' } = part;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    const chosen = lang.startsWith('en')
      ? offlineSafe(voices.en, englishVoices(), 'en-GB')
      : offlineSafe(voices.main, frenchVoices(), 'fr-FR');
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
  if (!enabled || !parts || (!synth && !natural.clips)) return;
  stopSpeaking();
  const id = queueId;
  const list = Array.isArray(parts) ? parts : [parts];
  for (const part of list) {
    if (id !== queueId) return;
    await sayOne({ ...style, ...(typeof part === 'string' ? { text: part } : part) }, id);
  }
}
