// Petits sons générés à la volée (Web Audio) : aucun fichier audio à télécharger.

let ctx = null;
let enabled = true;

export function setSoundsEnabled(value) {
  enabled = value;
}

/** À appeler lors d'un premier toucher : iOS n'autorise le son qu'après un geste. */
export function unlockAudio() {
  const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioCtx) return;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(freq, start, duration, { type = 'sine', volume = 0.18 } = {}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

const MELODIES = {
  success: [[660, 0, 0.15], [880, 0.1, 0.25]],
  error: [[260, 0, 0.18, { type: 'triangle', volume: 0.12 }], [220, 0.12, 0.25, { type: 'triangle', volume: 0.12 }]],
  levelUp: [[523, 0, 0.15], [659, 0.12, 0.15], [784, 0.24, 0.15], [1047, 0.36, 0.35]],
  fanfare: [[523, 0, 0.2], [523, 0.18, 0.12], [659, 0.3, 0.2], [784, 0.5, 0.45]],
  // nouveau record (défi chrono) : une fanfare plus longue
  record: [[523, 0, 0.15], [659, 0.14, 0.15], [784, 0.28, 0.15], [1047, 0.42, 0.3], [784, 0.74, 0.14], [1047, 0.88, 0.6]],
  tap: [[440, 0, 0.06, { volume: 0.06 }]],
};

export function playSound(name) {
  if (!enabled || !ctx || !MELODIES[name]) return;
  try {
    for (const [freq, start, duration, opts] of MELODIES[name]) tone(freq, start, duration, opts);
  } catch {
    // le son est un bonus : on ignore toute erreur audio
  }
}

// Musique douce (désactivée par défaut) : une petite mélodie en boucle, très bas.
const MELODY = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 880, 784, 659, 587];
let musicTimer = null;

export function startMusic() {
  if (musicTimer || !ctx) return;
  let step = 0;
  musicTimer = setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    try {
      const note = MELODY[step % MELODY.length];
      tone(note / 2, 0, 0.5, { volume: 0.03 });
      if (step % 4 === 0) tone(note / 4, 0, 1.4, { type: 'triangle', volume: 0.025 });
    } catch {
      // la musique est un bonus
    }
    step++;
  }, 520);
}

export function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
}
