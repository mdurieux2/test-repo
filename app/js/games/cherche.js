// « Jeux et logique » : cherche et trouve. Des images éparpillées sur une grande carte ; la voix dit
// laquelle trouver, et on la touche. Plus on avance, plus il y a d'images, plus elles sont petites,
// tournées, et plus elles se ressemblent (le chat au milieu des tigres et des lions). Un niveau
// cherche un visage (les émotions), un autre l'image qui n'est pas comme les autres.
// `generate` ne renvoie que des données : chaque image a sa place sur la carte, en pourcentage
// (place.x, place.y), son angle (place.r) et sa taille (place.s) ; main.js et style.css la posent.

import { pick, sample, shuffle } from '../random.js';

/** Les images à trouver, et leur nom (« Trouve le chat. »). */
export const THINGS = [
  { emoji: '🐱', name: 'le chat' }, { emoji: '🐶', name: 'le chien' }, { emoji: '🐰', name: 'le lapin' },
  { emoji: '🐭', name: 'la souris' }, { emoji: '🐸', name: 'la grenouille' }, { emoji: '🐷', name: 'le cochon' },
  { emoji: '🐮', name: 'la vache' }, { emoji: '🦊', name: 'le renard' }, { emoji: '🐻', name: 'l’ours' },
  { emoji: '🐼', name: 'le panda' }, { emoji: '🦁', name: 'le lion' }, { emoji: '🐵', name: 'le singe' },
  { emoji: '🐔', name: 'la poule' }, { emoji: '🐢', name: 'la tortue' }, { emoji: '🐟', name: 'le poisson' },
  { emoji: '🦋', name: 'le papillon' }, { emoji: '🐌', name: 'l’escargot' }, { emoji: '🐞', name: 'la coccinelle' },
  { emoji: '🍎', name: 'la pomme' }, { emoji: '🍌', name: 'la banane' }, { emoji: '🍓', name: 'la fraise' },
  { emoji: '🥕', name: 'la carotte' }, { emoji: '🍦', name: 'la glace' }, { emoji: '🧀', name: 'le fromage' },
  { emoji: '⚽', name: 'le ballon' }, { emoji: '🚗', name: 'la voiture' }, { emoji: '🚲', name: 'le vélo' },
  { emoji: '✈️', name: 'l’avion' }, { emoji: '🚀', name: 'la fusée' }, { emoji: '⛵', name: 'le bateau' },
  { emoji: '🎁', name: 'le cadeau' }, { emoji: '🔑', name: 'la clé' }, { emoji: '☂️', name: 'le parapluie' },
  { emoji: '🎩', name: 'le chapeau' }, { emoji: '🧦', name: 'la chaussette' }, { emoji: '⭐', name: 'l’étoile' },
  { emoji: '🌙', name: 'la lune' }, { emoji: '🍄', name: 'le champignon' }, { emoji: '🌵', name: 'le cactus' },
];

/** Des familles d'images qui se ressemblent : on cherche l'une au milieu des autres. */
export const LOOKALIKES = [
  [{ emoji: '🐱', name: 'le chat' }, { emoji: '🐯', name: 'le tigre' }, { emoji: '🦁', name: 'le lion' }],
  [{ emoji: '🐶', name: 'le chien' }, { emoji: '🐺', name: 'le loup' }, { emoji: '🦊', name: 'le renard' }],
  [{ emoji: '🐭', name: 'la souris' }, { emoji: '🐹', name: 'le hamster' }, { emoji: '🐰', name: 'le lapin' }],
  [{ emoji: '🐻', name: 'l’ours' }, { emoji: '🐼', name: 'le panda' }, { emoji: '🐨', name: 'le koala' }],
  [{ emoji: '🐔', name: 'la poule' }, { emoji: '🐤', name: 'le poussin' }, { emoji: '🦆', name: 'le canard' }],
  [{ emoji: '🐢', name: 'la tortue' }, { emoji: '🐊', name: 'le crocodile' }, { emoji: '🦎', name: 'le lézard' }],
  [{ emoji: '🍎', name: 'la pomme' }, { emoji: '🍅', name: 'la tomate' }, { emoji: '🍒', name: 'les cerises' }],
  [{ emoji: '🚗', name: 'la voiture' }, { emoji: '🚕', name: 'le taxi' }, { emoji: '🚌', name: 'le bus' }],
  [{ emoji: '🌻', name: 'le tournesol' }, { emoji: '🌷', name: 'la tulipe' }, { emoji: '🌹', name: 'la rose' }],
  [{ emoji: '🐟', name: 'le poisson' }, { emoji: '🐬', name: 'le dauphin' }, { emoji: '🐳', name: 'la baleine' }],
];

/** Les visages (niveau des émotions) : « Trouve le visage triste. » */
const FACES = [
  { emoji: '😄', name: 'le visage content' }, { emoji: '😢', name: 'le visage triste' },
  { emoji: '😠', name: 'le visage en colère' }, { emoji: '😨', name: 'le visage qui a peur' },
  { emoji: '😲', name: 'le visage surpris' }, { emoji: '😴', name: 'le visage qui dort' },
];

/** Les paires presque pareilles (niveau « Un seul est différent ») : beaucoup de l'une, une de l'autre. */
const ODD_PAIRS = [
  ['🐱', '🐯'], ['🐶', '🐺'], ['🐭', '🐹'], ['🐻', '🐨'], ['🐤', '🐥'], ['🍎', '🍅'], ['🚗', '🚕'],
  ['🌷', '🌹'], ['🐟', '🐠'], ['😄', '😃'], ['⭐', '🌟'], ['🍋', '🍊'],
];
const ODD_ASK = 'Une seule image n’est pas comme les autres. Trouve-la !';

// Par niveau : la grille (colonnes × lignes), le nombre d'images, l'angle maximal, l'écart de
// taille, et ce que l'on cherche (« all » : des images toutes différentes ; « alike » : avec des
// images qui se ressemblent ; « faces » : des visages ; « odd » : celle qui n'est pas pareille).
const LEVELS = [
  { cols: 3, rows: 2, count: 6, turn: 0, size: 0, kind: 'all' },
  { cols: 3, rows: 3, count: 9, turn: 0, size: 0, kind: 'all' },
  { cols: 4, rows: 3, count: 12, turn: 10, size: 0, kind: 'all' },
  { cols: 4, rows: 4, count: 15, turn: 20, size: 0.1, kind: 'all' },
  { cols: 4, rows: 4, count: 15, turn: 20, size: 0.1, kind: 'alike' },
  { cols: 5, rows: 4, count: 18, turn: 30, size: 0.15, kind: 'all' },
  { cols: 4, rows: 4, count: 15, turn: 15, size: 0.1, kind: 'faces' },
  { cols: 5, rows: 5, count: 22, turn: 35, size: 0.2, kind: 'alike' },
  { cols: 5, rows: 4, count: 20, turn: 25, size: 0.1, kind: 'odd' },
  { cols: 6, rows: 5, count: 27, turn: 45, size: 0.2, kind: 'alike' },
];

/** Les places : une case de la grille par image (au hasard, quelques cases vides), un peu décalée. */
function places(rng, { cols, rows, count, turn, size }) {
  const cells = shuffle(rng, Array.from({ length: cols * rows }, (_, i) => i)).slice(0, count);
  return cells.map((cell) => {
    const col = cell % cols;
    const row = Math.floor(cell / cols);
    const jitter = () => (rng() - 0.5) * 0.2;
    return {
      x: Math.round(((col + 0.5 + jitter()) / cols) * 1000) / 10,
      y: Math.round(((row + 0.5 + jitter()) / rows) * 1000) / 10,
      r: Math.round((rng() * 2 - 1) * turn),
      s: Math.round((1 - rng() * size) * 100) / 100,
    };
  });
}

/** Les images posées sur la carte : la cible (valeur « cible ») et les autres (« autre-1 »…). */
function scene(rng, spec, target, others) {
  const spots = places(rng, spec);
  const items = [target, ...others].slice(0, spec.count);
  return items.map((item, i) => ({
    value: i === 0 ? 'cible' : `autre-${i}`,
    label: item.emoji,
    name: item.name,
    place: spots[i],
  }));
}

/** `n` images prises dans `pool`, en évitant `avoid` ; si le choix est court, on en remet. */
function fill(rng, pool, n, avoid) {
  const free = pool.filter((p) => !avoid.includes(p.emoji));
  const out = [];
  while (out.length < n) out.push(...shuffle(rng, free));
  return out.slice(0, n);
}

export const chercheTrouve = {
  id: 'cherche-trouve',
  domain: 'jeux',
  title: 'Cherche et trouve',
  icon: '🔍',
  skill: 'Observer avec attention : retrouver une image parmi beaucoup d’autres, même si elles se ressemblent',
  levels: [
    'Six images', 'Neuf images', 'Douze images', 'Des images tournées', 'Elles se ressemblent',
    'Encore plus d’images', 'Les visages', 'Très ressemblantes', 'Une seule est différente', 'Le grand défi',
  ],
  generate(level, rng) {
    const spec = LEVELS[level - 1];
    let target;
    let others;
    let ask;
    if (spec.kind === 'odd') {
      const [same, odd] = shuffle(rng, pick(rng, ODD_PAIRS));
      target = { emoji: odd, name: 'l’image différente' };
      others = Array.from({ length: spec.count - 1 }, () => ({ emoji: same, name: 'une image pareille aux autres' }));
      ask = ODD_ASK;
    } else if (spec.kind === 'faces') {
      target = pick(rng, FACES);
      others = fill(rng, FACES, spec.count - 1, [target.emoji]);
      ask = `Trouve ${target.name}.`;
    } else if (spec.kind === 'alike') {
      const family = pick(rng, LOOKALIKES);
      target = pick(rng, family);
      const cousins = family.filter((f) => f !== target);
      // la moitié des autres images sont ses cousines, le reste est varié
      const near = Math.floor((spec.count - 1) / 2);
      others = [
        ...fill(rng, cousins, near, [target.emoji]),
        ...fill(rng, THINGS, spec.count - 1 - near, family.map((f) => f.emoji)),
      ];
      ask = `Trouve ${target.name}.`;
    } else {
      target = pick(rng, THINGS);
      others = sample(rng, THINGS.filter((t) => t !== target), spec.count - 1);
      ask = `Trouve ${target.name}.`;
    }
    const choices = scene(rng, spec, target, shuffle(rng, others));
    return {
      key: `cherche:${level}:${target.emoji}`,
      text: ask,
      instruction: ask,
      stage: { type: 'none' },
      choices,
      choiceStyle: 'seek',
      seek: { cols: spec.cols, rows: spec.rows },
      answer: 'cible',
      success: { speak: spec.kind === 'odd' ? 'Bravo, tu l’as trouvée !' : `Bravo, tu as trouvé ${target.name} !` },
    };
  },
};
