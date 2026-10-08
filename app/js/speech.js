// Voix. Indispensable au CP : l'enfant entend chaque consigne sans avoir à la lire.
//
// 1. Voix naturelle : les phrases sont enregistrées à l'avance (Pocket TTS de Kyutai, voix
//    « Estelle » ; voir scripts/voix/) et jouées depuis app/voix/. Un énoncé est dit phrase par
//    phrase, chaque phrase d'un seul son ; une phrase absente est dite par propositions, morceaux
//    (nombres, prénoms) ou mots (voix-cles.js, planLecture). Tous les sons d'une même consigne
//    sont mis bout à bout dans un seul fichier, joué d'un trait : pas de trou, pas de changement
//    de voix.
// 2. Sinon, synthèse vocale du système (sur iPhone et iPad, les voix françaises d'Apple) : on
//    choisit automatiquement la meilleure voix installée (« Premium », puis « améliorée », puis la
//    voix compacte). Les voix gadget (Grand-mère, Rocko…) sont écartées. Le parent peut la choisir.

import { PAUSES, planLecture } from './voix-cles.js';

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
// MP3 mono à débit constant (32 kbit/s) : la durée d'un son se déduit de sa taille
const BYTES_PER_SECOND = 4000;
const natural = { wanted: true, clips: null, files: [], packs: [], names: [], unlocked: false, silence: null };
const pauseFiles = {}; // pause → blob (gardés en mémoire)
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
    natural.packs = data.paquets || [];
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

/** Paquets de sons ({ nom, sons: [[fichier, taille]] }), les plus entendus d'abord. */
export function naturalVoicePacks() {
  return natural.packs;
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

/**
 * Les sons d'un morceau d'énoncé ({ text, lang, rate }) : [{ file, text, pause, kind }] dans l'ordre,
 * [] s'il n'y a rien à dire, null s'il manque un son (la voix de l'appareil le dira).
 */
export function clipsFor(part, clips = natural.clips, names = natural.names) {
  if (!clips || !part?.text) return null;
  const plan = planLecture(part.text, (key) => Object.hasOwn(clips, key), { lang: part.lang, rate: part.rate, names });
  return plan && plan.map((step) => ({ ...step, file: clips[step.key] }));
}

/** Pause entre deux morceaux d'une même consigne (« Touche le mot : » + « chat »). */
export function pauseBetween(before, after = '') {
  if (/[.!?…][»")\s]*$/.test(before) || /^\s*[«"]?\p{Lu}/u.test(after)) return 'phrase';
  return 'virgule';
}

function stopClip() {
  cancelClip?.();
  cancelClip = null;
}

async function fetchBlob(file) {
  const response = await fetch(VOICE_BASE + file);
  if (!response.ok) throw new Error(`son absent : ${file}`);
  return response.blob();
}

function pauseBlob(pause) {
  pauseFiles[pause] ||= fetchBlob(`pause-${pause}.mp3`).catch((error) => {
    delete pauseFiles[pause];
    throw error;
  });
  return pauseFiles[pause];
}

/** Début de chaque mot, pour suivre la lecture en karaoké (comme les « boundary » de la synthèse). */
function wordStarts(text) {
  return [...text.matchAll(/\S+/g)].map((m) => m.index);
}

/**
 * Joue d'un trait les sons de plusieurs morceaux d'une consigne : tous sont chargés, mis bout à
 * bout avec leurs pauses dans un seul fichier, puis joués. Chaque morceau reçoit onStart et
 * onWord au bon moment (karaoké).
 */
async function playPlans(parts, plans, id) {
  const steps = [];
  plans.forEach((plan, p) => {
    plan.forEach((clip, c) => {
      steps.push({ file: clip.file, part: p, weight: clip.text.length || 1 });
      const pause = c < plan.length - 1 ? clip.pause : p < plans.length - 1 ? pauseBetween(parts[p].text, parts[p + 1].text) : null;
      if (PAUSES[pause]) steps.push({ pause, part: p, weight: 0 });
    });
  });
  if (!steps.length) return;
  const blobs = await Promise.all(steps.map((step) => (step.file ? fetchBlob(step.file) : pauseBlob(step.pause))));
  if (id !== queueId) return;
  // où commence chaque son dans le fichier, et quelle part du texte de son morceau il couvre
  let time = 0;
  const done = new Array(parts.length).fill(0);
  const totals = parts.map((_, p) => steps.filter((s) => s.part === p).reduce((sum, s) => sum + s.weight, 0) || 1);
  steps.forEach((step, k) => {
    step.start = time;
    step.duration = blobs[k].size / BYTES_PER_SECOND;
    step.from = done[step.part] / totals[step.part];
    done[step.part] += step.weight;
    step.to = done[step.part] / totals[step.part];
    time += step.duration;
  });
  const url = URL.createObjectURL(new Blob(blobs, { type: 'audio/mpeg' }));
  const starts = parts.map((part) => wordStarts(part.text));
  const started = new Set();
  const lastWord = parts.map(() => -1);
  try {
    await new Promise((resolve, reject) => {
      const audio = audioPlayer();
      let finished = false;
      let frame = 0;
      const finish = (error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        globalThis.cancelAnimationFrame?.(frame);
        audio.onended = audio.onerror = audio.ontimeupdate = null;
        if (error) {
          // le lecteur lâche ce son (il va être libéré) : il ne tentera pas de le recharger
          audio.removeAttribute('src');
          audio.load();
          reject(error);
        } else resolve();
      };
      const timer = setTimeout(() => finish(), (time + 5) * 1000); // filet de sécurité
      cancelClip = () => {
        audio.pause();
        finish();
      };
      // suit la lecture : début de chaque morceau, et mot en cours pour le karaoké
      const follow = () => {
        const now = audio.currentTime;
        for (const step of steps) {
          if (now < step.start) break;
          const part = parts[step.part];
          if (!started.has(step.part)) {
            started.add(step.part);
            part.onStart?.();
          }
          if (!part.onWord || !step.file) continue;
          const within = Math.min(1, (now - step.start) / (step.duration || 1));
          const at = (step.from + (step.to - step.from) * within) * part.text.length;
          const word = starts[step.part].filter((s) => s <= at).length - 1;
          if (word >= 0 && word !== lastWord[step.part]) {
            lastWord[step.part] = word;
            part.onWord(starts[step.part][word]);
          }
        }
      };
      const tick = () => {
        follow();
        if (!finished) frame = globalThis.requestAnimationFrame?.(tick) ?? 0;
      };
      audio.onended = () => finish();
      audio.onerror = () => finish(new Error('son illisible'));
      audio.ontimeupdate = follow;
      audio.src = url;
      const playing = audio.play();
      // le premier morceau commence tout de suite (le karaoké s'allume sans attendre)
      follow();
      if (parts.some((part) => part.onWord)) tick();
      playing?.catch((error) => finish(error));
    });
  } finally {
    URL.revokeObjectURL(url);
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

// ---- Sous-titres : ce que dit Estelle est aussi écrit (réglage « sous-titres », voir main.js)

const captionListeners = new Set();
let captionId = 0;

/**
 * `listener({ type: 'start', id, parts: [{ text, lang }], spoken })` quand Estelle commence à
 * parler (spoken : faux si la voix est coupée, le texte s'affiche quand même), puis
 * `{ type: 'part', id, index }` au début de chaque morceau, et `{ type: 'end', id, spoken }`.
 * Renvoie de quoi se désabonner.
 */
export function onCaption(listener) {
  captionListeners.add(listener);
  return () => captionListeners.delete(listener);
}

function caption(event) {
  for (const listener of captionListeners) {
    try {
      listener(event);
    } catch {
      // un sous-titre qui échoue ne doit jamais empêcher la voix
    }
  }
}

/**
 * Dit une phrase ou une suite de morceaux (chaîne ou {text, rate, lang}).
 * `style` ({voice: 'female'|'male', pitch}) donne la voix d'un personnage.
 * Les morceaux qui se suivent et que la voix naturelle sait dire sont joués d'un trait ; les
 * autres passent par la synthèse du système. Interrompt ce qui était en cours. Ne bloque jamais
 * l'interface.
 */
export async function speak(parts, style = {}) {
  if (!parts) return;
  const audible = enabled && Boolean(synth || natural.clips);
  if (!audible && !captionListeners.size) return;
  if (audible) stopSpeaking();
  const id = queueId;
  const shown = ++captionId;
  const said = (Array.isArray(parts) ? parts : [parts])
    .map((part) => ({ ...style, ...(typeof part === 'string' ? { text: part } : part) }))
    .filter((part) => part.text);
  if (captionListeners.size && said.length) {
    caption({ type: 'start', id: shown, parts: said.map(({ text, lang }) => ({ text, lang })), spoken: audible });
  }
  if (!audible) {
    if (said.length) caption({ type: 'end', id: shown, spoken: false });
    return;
  }
  // chaque morceau annonce son début (sous-titres d'une longue lecture, morceau par morceau)
  const list = captionListeners.size
    ? said.map((part, index) => ({ ...part, onStart: () => { caption({ type: 'part', id: shown, index }); part.onStart?.(); } }))
    : said;
  try {
    await speakList(list, id);
  } finally {
    if (captionListeners.size && said.length) caption({ type: 'end', id: shown, spoken: id === queueId });
  }
}

async function speakList(list, id) {
  let i = 0;
  while (i < list.length && id === queueId) {
    const plans = [];
    while (natural.wanted && i + plans.length < list.length) {
      const plan = clipsFor(list[i + plans.length]);
      if (!plan) break;
      plans.push(plan);
    }
    if (!plans.length) {
      await saySynth(list[i], id);
      i++;
      continue;
    }
    const group = list.slice(i, i + plans.length);
    i += plans.length;
    try {
      await playPlans(group, plans, id);
    } catch {
      // son introuvable ou illisible (hors connexion, pas encore téléchargé…) : la synthèse prend le relais
      for (const part of group) if (id === queueId) await saySynth(part, id);
    }
  }
}
