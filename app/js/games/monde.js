// « Le monde » (questionner le monde, cycles 1 et 2) : les animaux, le temps qui passe,
// les pays et les continents. Pour les plus jeunes, la voix lit aussi les réponses.

import { pick, sample, shuffle } from '../random.js';

/** « à la ferme, dans la mer ou dans la forêt » : les réponses lues à voix haute. */
function spokenList(labels) {
  return labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} ou ${labels.at(-1)}`;
}

function capitalize(text) {
  return `${text[0].toUpperCase()}${text.slice(1)}`;
}

/** « le mouton » → « du mouton », « la vache » → « de la vache », « l’éléphant » → « de l’éléphant » */
function deName(name) {
  return name.startsWith('le ') ? `du ${name.slice(3)}` : `de ${name}`;
}

// ---------------------------------------------------------------- Les animaux

const HABITATS = {
  ferme: { emoji: '🚜', label: 'à la ferme' },
  mer: { emoji: '🌊', label: 'dans la mer' },
  foret: { emoji: '🌲', label: 'dans la forêt' },
  savane: { emoji: '🌍', label: 'dans la savane' },
  banquise: { emoji: '🧊', label: 'sur la banquise' },
};

const ANIMALS = [
  { emoji: '🐄', name: 'la vache', home: 'ferme', baby: 'le veau', food: 'herbe', eggs: false, cry: 'meugle', house: 'l’étable', cover: 'poils' },
  { emoji: '🐑', name: 'le mouton', home: 'ferme', baby: 'l’agneau', food: 'herbe', eggs: false, cry: 'bêle', house: 'la bergerie', cover: 'poils' },
  { emoji: '🐴', name: 'le cheval', home: 'ferme', baby: 'le poulain', food: 'herbe', eggs: false, cry: 'hennit', house: 'l’écurie', cover: 'poils' },
  { emoji: '🐔', name: 'la poule', home: 'ferme', baby: 'le poussin', food: 'graines', eggs: true, cry: 'caquette', house: 'le poulailler', cover: 'plumes' },
  { emoji: '🐷', name: 'le cochon', home: 'ferme', baby: 'le porcelet', food: 'tout', eggs: false, cry: 'grogne', house: 'la porcherie', cover: 'poils' },
  { emoji: '🦆', name: 'le canard', home: 'ferme', baby: 'le caneton', food: 'graines', eggs: true, cry: 'cancane', cover: 'plumes' },
  { emoji: '🐬', name: 'le dauphin', home: 'mer', food: 'poissons', eggs: false },
  { emoji: '🐙', name: 'la pieuvre', home: 'mer', food: 'poissons', eggs: true },
  { emoji: '🦀', name: 'le crabe', home: 'mer', food: 'tout', eggs: true },
  { emoji: '🐳', name: 'la baleine', home: 'mer', food: 'poissons', eggs: false },
  { emoji: '🦊', name: 'le renard', home: 'foret', baby: 'le renardeau', food: 'viande', eggs: false, house: 'le terrier', cover: 'poils' },
  { emoji: '🦌', name: 'le cerf', home: 'foret', baby: 'le faon', food: 'herbe', eggs: false, cry: 'brame', cover: 'poils' },
  { emoji: '🐿️', name: 'l’écureuil', home: 'foret', food: 'graines', eggs: false, cover: 'poils' },
  { emoji: '🦉', name: 'la chouette', home: 'foret', food: 'viande', eggs: true, cry: 'hulule', cover: 'plumes' },
  { emoji: '🦁', name: 'le lion', home: 'savane', baby: 'le lionceau', food: 'viande', eggs: false, cry: 'rugit', cover: 'poils' },
  { emoji: '🦒', name: 'la girafe', home: 'savane', baby: 'le girafon', food: 'herbe', eggs: false, cover: 'poils' },
  { emoji: '🐘', name: 'l’éléphant', home: 'savane', baby: 'l’éléphanteau', food: 'herbe', eggs: false, cry: 'barrit' },
  { emoji: '🦓', name: 'le zèbre', home: 'savane', food: 'herbe', eggs: false, cover: 'poils' },
  { emoji: '🐧', name: 'le manchot', home: 'banquise', food: 'poissons', eggs: true, cover: 'plumes' },
  { emoji: '🐻‍❄️', name: 'l’ours blanc', home: 'banquise', baby: 'l’ourson', food: 'poissons', eggs: false, house: 'la tanière', cover: 'poils' },
  { emoji: '🦭', name: 'le phoque', home: 'banquise', food: 'poissons', eggs: false, cover: 'poils' },
  { emoji: '🐱', name: 'le chat', baby: 'le chaton', food: 'viande', eggs: false, cry: 'miaule', cover: 'poils' },
  { emoji: '🐶', name: 'le chien', baby: 'le chiot', food: 'viande', eggs: false, cry: 'aboie', house: 'la niche', cover: 'poils' },
  { emoji: '🐰', name: 'le lapin', baby: 'le lapereau', food: 'herbe', eggs: false, house: 'le terrier', cover: 'poils' },
  { emoji: '🐢', name: 'la tortue', food: 'herbe', eggs: true, cover: 'écailles' },
  { emoji: '🐊', name: 'le crocodile', food: 'viande', eggs: true, cover: 'écailles' },
  { emoji: '🐍', name: 'le serpent', food: 'viande', eggs: true, cry: 'siffle', cover: 'écailles' },
];

// Ce qui couvre le corps : un indice pour reconnaître les mammifères, les oiseaux et les reptiles.
const COVERS = {
  poils: { label: 'des poils', kind: 'un mammifère' },
  plumes: { label: 'des plumes', kind: 'un oiseau' },
  écailles: { label: 'des écailles', kind: 'un reptile' },
};

const FOODS = {
  herbe: { emoji: '🌿', label: 'de l’herbe' },
  viande: { emoji: '🍖', label: 'de la viande' },
  graines: { emoji: '🌾', label: 'des graines' },
  poissons: { emoji: '🐟', label: 'des poissons' },
};

export const animauxMonde = {
  id: 'animaux-monde',
  domain: 'monde',
  title: 'Les animaux',
  icon: '🦁',
  skill: 'Connaître les animaux : où ils vivent, leurs petits, ce qu’ils mangent',
  levels: ['Où vit-il ?', 'Les bébés des animaux', 'Que mange-t-il ?', 'Qui pond des œufs ?', 'Le cri des animaux', 'La maison des animaux', 'Poils, plumes, écailles'],
  generate(level, rng) {
    if (level === 5) {
      const animal = pick(rng, ANIMALS.filter((a) => a.cry));
      const options = shuffle(rng, [animal, ...sample(rng, ANIMALS.filter((a) => a.cry && a !== animal), 2)]);
      return {
        key: `animaux:cri:${animal.name}`,
        text: `Qui ${animal.cry} ?`,
        instruction: `Quel animal ${animal.cry} ?`,
        short: { key: 'animaux:cri', text: `Qui ${animal.cry} ?`, speak: `Quel animal ${animal.cry} ?` },
        stage: { type: 'none' },
        choices: options.map((a) => ({ value: a.name, label: a.emoji, name: a.name })),
        choiceStyle: 'pictures',
        answer: animal.name,
        success: { speak: `Oui, ${animal.name} ${animal.cry} !` },
      };
    }
    if (level === 6) {
      const animal = pick(rng, ANIMALS.filter((a) => a.house));
      const houses = [...new Set(ANIMALS.filter((a) => a.house && a.house !== animal.house).map((a) => a.house))];
      const options = shuffle(rng, [animal.house, ...sample(rng, houses, 2)]);
      return {
        key: `animaux:maison:${animal.name}`,
        text: `Comment s’appelle la maison ${deName(animal.name)} ?`,
        instruction: [`Comment s’appelle la maison ${deName(animal.name)} ?`, `${capitalize(spokenList(options))} ?`],
        short: { key: 'animaux:maison', text: `La maison ${deName(animal.name)} ?`, speak: [`La maison ${deName(animal.name)} ?`, spokenList(options)] },
        stage: { type: 'picture', emoji: animal.emoji },
        choices: options.map((h) => ({ value: h, label: h })),
        choiceStyle: 'answers',
        answer: animal.house,
        success: { speak: `${capitalize(animal.name)} dort dans ${animal.house}.` },
      };
    }
    if (level === 7) {
      const animal = pick(rng, ANIMALS.filter((a) => COVERS[a.cover]));
      const options = shuffle(rng, Object.keys(COVERS));
      const labels = options.map((c) => COVERS[c].label);
      return {
        key: `animaux:corps:${animal.name}`,
        text: `Sur son corps, ${animal.name} a…`,
        instruction: [`Sur son corps, ${animal.name} a…`, `${capitalize(spokenList(labels))} ?`],
        short: { key: 'animaux:corps', text: `Sur son corps, ${animal.name} a…`, speak: [`${capitalize(animal.name)} ?`, spokenList(labels)] },
        stage: { type: 'picture', emoji: animal.emoji },
        choices: options.map((c) => ({ value: c, label: COVERS[c].label })),
        choiceStyle: 'answers',
        answer: animal.cover,
        success: { speak: `${capitalize(animal.name)} a ${COVERS[animal.cover].label} : c’est ${COVERS[animal.cover].kind}.` },
      };
    }
    if (level === 1) {
      const animal = pick(rng, ANIMALS.filter((a) => a.home));
      const others = sample(rng, Object.keys(HABITATS).filter((h) => h !== animal.home), 2);
      const options = shuffle(rng, [animal.home, ...others]);
      const labels = options.map((h) => HABITATS[h].label);
      return {
        key: `animaux:habitat:${animal.name}`,
        text: `Où vit ${animal.name} ?`,
        instruction: [`Où vit ${animal.name} ?`, `${capitalize(spokenList(labels))} ?`],
        short: { key: 'animaux:habitat', text: `Où vit ${animal.name} ?`, speak: [`${capitalize(animal.name)} ?`, spokenList(labels)] },
        stage: { type: 'picture', emoji: animal.emoji },
        choices: options.map((h) => ({ value: h, label: `${HABITATS[h].emoji} ${HABITATS[h].label}` })),
        choiceStyle: 'answers',
        answer: animal.home,
        success: { speak: `${capitalize(animal.name)} vit ${HABITATS[animal.home].label}.` },
      };
    }
    if (level === 2) {
      const withBaby = ANIMALS.filter((a) => a.baby);
      const animal = pick(rng, withBaby);
      const options = shuffle(rng, [animal.baby, ...sample(rng, withBaby.filter((a) => a !== animal), 2).map((a) => a.baby)]);
      return {
        key: `animaux:bebe:${animal.name}`,
        text: `Comment s’appelle le bébé ${deName(animal.name)} ?`,
        instruction: [`Comment s’appelle le bébé ${deName(animal.name)} ?`, `${capitalize(spokenList(options))} ?`],
        short: { key: 'animaux:bebe', text: `Le bébé ${deName(animal.name)} ?`, speak: [`Le bébé ${deName(animal.name)} ?`, spokenList(options)] },
        stage: { type: 'picture', emoji: animal.emoji },
        choices: options.map((b) => ({ value: b, label: b })),
        choiceStyle: 'answers',
        answer: animal.baby,
        success: { speak: `Le bébé ${deName(animal.name)}, c’est ${animal.baby}.` },
      };
    }
    if (level === 3) {
      const animal = pick(rng, ANIMALS.filter((a) => FOODS[a.food]));
      const options = shuffle(rng, [animal.food, ...sample(rng, Object.keys(FOODS).filter((f) => f !== animal.food), 2)]);
      const labels = options.map((f) => FOODS[f].label);
      return {
        key: `animaux:mange:${animal.name}`,
        text: `Que mange ${animal.name} ?`,
        instruction: [`Que mange ${animal.name} ?`, `${capitalize(spokenList(labels))} ?`],
        short: { key: 'animaux:mange', text: `Que mange ${animal.name} ?` },
        stage: { type: 'picture', emoji: animal.emoji },
        choices: options.map((f) => ({ value: f, label: `${FOODS[f].emoji} ${FOODS[f].label}` })),
        choiceStyle: 'answers',
        answer: animal.food,
        success: { speak: `${capitalize(animal.name)} mange ${FOODS[animal.food].label}.` },
      };
    }
    const layer = pick(rng, ANIMALS.filter((a) => a.eggs));
    const others = sample(rng, ANIMALS.filter((a) => !a.eggs), 2);
    const options = shuffle(rng, [layer, ...others]);
    return {
      key: `animaux:oeufs:${layer.name}`,
      text: 'Lequel pond des œufs ?',
      instruction: 'Un seul de ces animaux pond des œufs. Lequel ?',
      short: { key: 'animaux:oeufs', text: 'Lequel pond des œufs ?' },
      stage: { type: 'none' },
      choices: options.map((a) => ({ value: a.name, label: a.emoji })),
      choiceStyle: 'pictures',
      answer: layer.name,
      success: { speak: `Oui, ${layer.name} pond des œufs !` },
    };
  },
};

// ---------------------------------------------------------------- Le temps qui passe

const SEASONS = [
  { name: 'l’hiver', emoji: '❄️', clues: ['⛄', '🧤', '🎿', '🎄'] },
  { name: 'le printemps', emoji: '🌷', clues: ['🌸', '🐣', '🌷', '🐝'] },
  { name: 'l’été', emoji: '☀️', clues: ['🏖️', '🍦', '🏊', '🍉'] },
  { name: 'l’automne', emoji: '🍂', clues: ['🍁', '🍄', '🌰', '🎃'] },
];
const MOMENTS = [
  { name: 'le matin', emoji: '🌅', clues: ['On prend le petit-déjeuner', 'Le soleil se lève', 'On part à l’école'] },
  { name: 'le midi', emoji: '🍽️', clues: ['On déjeune à la cantine', 'Le soleil est tout en haut'] },
  { name: 'le soir', emoji: '🌇', clues: ['On prend le bain', 'On dîne en famille', 'Le soleil se couche'] },
  { name: 'la nuit', emoji: '🌙', clues: ['On dort dans son lit', 'On voit les étoiles'] },
];
export const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// « en hiver », « au printemps »… (même ordre que SEASONS)
const IN_SEASON = ['en hiver', 'au printemps', 'en été', 'en automne'];
// Des mois et des fêtes qui tombent toujours dans la même saison (on évite les mois
// où la saison change : mars, juin, septembre, décembre).
const SEASON_CLUES = [
  { month: 'janvier', season: 0 }, { month: 'février', season: 0 }, { month: 'avril', season: 1 }, { month: 'mai', season: 1 },
  { month: 'juillet', season: 2 }, { month: 'août', season: 2 }, { month: 'octobre', season: 3 }, { month: 'novembre', season: 3 },
  { what: 'Noël', emoji: '🎄', season: 0 }, { what: 'La galette des rois', emoji: '👑', season: 0 },
  { what: 'Pâques', emoji: '🐣', season: 1 }, { what: 'La fête des mères', emoji: '💐', season: 1 },
  { what: 'Le 14 juillet', emoji: '🎆', season: 2 }, { what: 'Halloween', emoji: '🎃', season: 3 },
];
// Des durées, de la plus courte à la plus longue.
const DURATIONS = [
  ['une seconde', 'une minute', 'une heure', 'un jour', 'une semaine', 'un mois', 'une année'],
  ['se brosser les dents', 'la récréation', 'un film au cinéma', 'une nuit de sommeil', 'les grandes vacances'],
];
const DURATION_FACTS = {
  'une minute': 'Une minute, c’est 60 secondes.', 'une heure': 'Une heure, c’est 60 minutes.',
  'un jour': 'Un jour, c’est 24 heures.', 'une semaine': 'Une semaine, c’est 7 jours.',
  'un mois': 'Un mois, c’est à peu près 30 jours.', 'une année': 'Une année, c’est 12 mois.',
};

/** Niveaux 5 à 7 du temps qui passe : le cycle des saisons, mois et saisons, comparer des durées. */
function saisonsPlus(level, rng) {
  if (level === 5) {
    const i = Math.floor(rng() * SEASONS.length);
    const after = rng() < 0.6;
    const answer = SEASONS[(i + (after ? 1 : SEASONS.length - 1)) % SEASONS.length];
    const options = shuffle(rng, SEASONS.filter((s) => s !== SEASONS[i]));
    const text = `Quelle saison vient ${after ? 'après' : 'avant'} ${SEASONS[i].name} ?`;
    const label = (s) => `${s.emoji} ${s.name}`;
    return {
      key: `saisons:ordre:${i}:${after}`,
      text,
      instruction: [text, `${capitalize(spokenList(options.map((s) => s.name)))} ?`],
      short: { key: 'saisons:ordre', text, speak: [text, spokenList(options.map((s) => s.name))] },
      stage: { type: 'sequence', items: after ? [label(SEASONS[i]), null] : [null, label(SEASONS[i])] },
      choices: options.map((s) => ({ value: s.name, label: label(s) })),
      choiceStyle: 'answers',
      answer: answer.name,
      success: { speak: `${capitalize(after ? 'après' : 'avant')} ${SEASONS[i].name}, c’est ${answer.name}.` },
    };
  }
  if (level === 6) {
    const clue = pick(rng, SEASON_CLUES);
    const question = clue.month ? `En ${clue.month}, c’est quelle saison ?` : `${clue.what}, c’est en quelle saison ?`;
    const order = shuffle(rng, [0, 1, 2, 3]);
    return {
      key: `saisons:mois:${clue.month || clue.what}`,
      text: question,
      instruction: [question, `${capitalize(spokenList(order.map((s) => IN_SEASON[s])))} ?`],
      short: { key: 'saisons:mois', text: question },
      stage: clue.emoji ? { type: 'picture', emoji: clue.emoji } : { type: 'none' },
      choices: order.map((s) => ({ value: SEASONS[s].name, label: `${SEASONS[s].emoji} ${IN_SEASON[s]}` })),
      choiceStyle: 'answers',
      answer: SEASONS[clue.season].name,
      success: { speak: clue.month ? `En ${clue.month}, on est ${IN_SEASON[clue.season]}.` : `${clue.what}, c’est ${IN_SEASON[clue.season]}.` },
    };
  }
  // comparer des durées : des unités (une minute, une semaine…) ou des moments de la vie
  const list = pick(rng, DURATIONS);
  const options = sample(rng, list, 3);
  const longest = rng() < 0.6;
  const ranks = options.map((o) => list.indexOf(o));
  const answer = list[longest ? Math.max(...ranks) : Math.min(...ranks)];
  const text = `Qu’est-ce qui dure le ${longest ? 'plus' : 'moins'} longtemps ?`;
  return {
    key: `durees:${options.join(',')}:${longest}`,
    text,
    instruction: [text, `${capitalize(spokenList(options))} ?`],
    short: { key: `durees:${longest}`, text, speak: [text, spokenList(options)] },
    stage: { type: 'none' },
    choices: options.map((o) => ({ value: o, label: o })),
    choiceStyle: 'answers',
    answer,
    success: {
      speak: [`${capitalize(answer)} ${answer.startsWith('les ') ? 'durent' : 'dure'} le ${longest ? 'plus' : 'moins'} longtemps.`, DURATION_FACTS[answer]].filter(Boolean),
    },
  };
}

export const saisons = {
  id: 'saisons',
  domain: 'monde',
  title: 'Le temps qui passe',
  icon: '🍂',
  skill: 'Se repérer dans le temps : saisons, moments de la journée, jours, mois',
  levels: [
    'Les saisons', 'Les moments de la journée', 'Les jours de la semaine', 'Les mois de l’année',
    'L’ordre des saisons', 'Mois et saisons', 'Plus long, plus court',
  ],
  generate(level, rng) {
    if (level >= 5) return saisonsPlus(level, rng);
    if (level === 1) {
      const season = pick(rng, SEASONS);
      const clue = pick(rng, season.clues);
      const options = shuffle(rng, [season, ...sample(rng, SEASONS.filter((s) => s !== season), 2)]);
      return {
        key: `saisons:${clue}`,
        text: 'C’est quelle saison ?',
        instruction: ['C’est quelle saison ?', `${capitalize(spokenList(options.map((s) => s.name)))} ?`],
        short: { key: 'saisons', text: 'Quelle saison ?', speak: ['Quelle saison ?', spokenList(options.map((s) => s.name))] },
        stage: { type: 'picture', emoji: clue },
        choices: options.map((s) => ({ value: s.name, label: `${s.emoji} ${s.name}` })),
        choiceStyle: 'answers',
        answer: season.name,
        success: { speak: `Oui, c’est ${season.name} !` },
      };
    }
    if (level === 2) {
      const moment = pick(rng, MOMENTS);
      const clue = pick(rng, moment.clues);
      const options = shuffle(rng, [moment, ...sample(rng, MOMENTS.filter((m) => m !== moment), 2)]);
      return {
        key: `moments:${clue}`,
        text: `${clue}… Quand ?`,
        instruction: [`${clue}. C’est quand ?`, `${capitalize(spokenList(options.map((m) => m.name)))} ?`],
        short: { key: 'moments', text: `${clue}… Quand ?`, speak: [`${clue}.`, spokenList(options.map((m) => m.name))] },
        stage: { type: 'none' },
        choices: options.map((m) => ({ value: m.name, label: `${m.emoji} ${m.name}` })),
        choiceStyle: 'answers',
        answer: moment.name,
        success: { speak: `${clue}, ${moment.name}.` },
      };
    }
    const list = level === 3 ? DAYS : MONTHS;
    const i = Math.floor(rng() * list.length);
    const after = rng() < 0.6;
    const answer = list[(i + (after ? 1 : list.length - 1)) % list.length];
    const options = shuffle(rng, [answer, ...sample(rng, list.filter((d) => d !== answer && d !== list[i]), 3)]);
    const what = level === 3 ? 'jour' : 'mois';
    const text = `Quel ${what} vient ${after ? 'après' : 'avant'} ${list[i]} ?`;
    return {
      key: `${what}:${list[i]}:${after}`,
      text,
      instruction: text,
      stage: { type: 'sequence', items: after ? [list[i], null] : [null, list[i]] },
      choices: options.map((d) => ({ value: d, label: d })),
      choiceStyle: 'answers',
      answer,
      success: { speak: after ? `Après ${list[i]}, c’est ${answer}.` : `Avant ${list[i]}, c’est ${answer}.` },
    };
  },
};

// ---------------------------------------------------------------- Les pays et les continents

const PLACES = [
  { level: 1, clue: '🗼', what: 'La tour Eiffel', says: 'La tour Eiffel est en France.', country: 'France', continent: 'Europe' },
  { level: 1, clue: '🥖', what: 'La baguette', says: 'La baguette vient de France.', country: 'France', continent: 'Europe' },
  { level: 1, clue: '🍕', what: 'La pizza', says: 'La pizza vient d’Italie.', country: 'Italie', continent: 'Europe' },
  { level: 1, clue: '🏟️', what: 'Le Colisée de Rome', says: 'Le Colisée est en Italie.', country: 'Italie', continent: 'Europe' },
  { level: 1, clue: '💂', what: 'Les gardes de Londres', says: 'Les gardes sont au Royaume-Uni.', country: 'Royaume-Uni', continent: 'Europe' },
  { level: 1, clue: '🥘', what: 'La paella', says: 'La paella vient d’Espagne.', country: 'Espagne', continent: 'Europe' },
  { level: 1, clue: '🥨', what: 'Le bretzel', says: 'Le bretzel vient d’Allemagne.', country: 'Allemagne', continent: 'Europe' },
  { level: 2, clue: '🗽', what: 'La statue de la Liberté', says: 'La statue de la Liberté est aux États-Unis.', country: 'États-Unis', continent: 'Amérique' },
  { level: 2, clue: '🗻', what: 'Le mont Fuji', says: 'Le mont Fuji est au Japon.', country: 'Japon', continent: 'Asie' },
  { level: 2, clue: '🐼', what: 'Le panda géant', says: 'Le panda géant vit en Chine.', country: 'Chine', continent: 'Asie' },
  { level: 2, clue: '🦘', what: 'Le kangourou', says: 'Le kangourou vit en Australie.', country: 'Australie', continent: 'Océanie' },
  { level: 2, clue: '🐪', what: 'Les pyramides', says: 'Les pyramides sont en Égypte.', country: 'Égypte', continent: 'Afrique' },
  { level: 2, clue: '🍁', what: 'La feuille d’érable', says: 'La feuille d’érable est le symbole du Canada.', country: 'Canada', continent: 'Amérique' },
  { level: 2, clue: '🕌', what: 'Le Taj Mahal', says: 'Le Taj Mahal est en Inde.', country: 'Inde', continent: 'Asie' },
  { level: 3, clue: '🦁', what: 'Le lion', says: 'Le lion vit en Afrique.', continent: 'Afrique' },
  { level: 3, clue: '🐧', what: 'Le manchot empereur', says: 'Le manchot empereur vit en Antarctique.', continent: 'Antarctique' },
];

// Les pays des niveaux 1 et 2 : « de la France », leurs habitants et leur capitale.
const COUNTRIES = {
  France: { de: 'de la France', people: 'les Français', capital: 'Paris' },
  Italie: { de: 'de l’Italie', people: 'les Italiens', capital: 'Rome' },
  Espagne: { de: 'de l’Espagne', people: 'les Espagnols', capital: 'Madrid' },
  Allemagne: { de: 'de l’Allemagne', people: 'les Allemands', capital: 'Berlin' },
  'Royaume-Uni': { de: 'du Royaume-Uni', capital: 'Londres' }, // « les Britanniques » : trop long pour un bouton
  'États-Unis': { de: 'des États-Unis', people: 'les Américains', capital: 'Washington' },
  Japon: { de: 'du Japon', people: 'les Japonais', capital: 'Tokyo' },
  Chine: { de: 'de la Chine', people: 'les Chinois', capital: 'Pékin' },
  Australie: { de: 'de l’Australie', people: 'les Australiens', capital: 'Canberra' },
  Égypte: { de: 'de l’Égypte', people: 'les Égyptiens', capital: 'Le Caire' },
  Canada: { de: 'du Canada', people: 'les Canadiens', capital: 'Ottawa' },
  Inde: { de: 'de l’Inde', people: 'les Indiens', capital: 'New Delhi' },
};
// « Bonjour » dans d'autres langues. La voix française lit `say` (écrit pour être bien prononcé).
const HELLOS = [
  { word: 'Hello !', say: { text: 'Hello!', lang: 'en-GB', rate: 0.85 }, lang: 'en', language: 'anglais', where: 'au Royaume-Uni et aux États-Unis' },
  { word: 'Hola !', say: 'Ola !', lang: 'es', language: 'espagnol', where: 'en Espagne' },
  { word: 'Ciao !', say: 'Tchao !', lang: 'it', language: 'italien', where: 'en Italie' },
  { word: 'Guten Tag !', say: 'Goutenne tag !', lang: 'de', language: 'allemand', where: 'en Allemagne' },
  { word: 'Konnichiwa !', say: 'Konichiwa !', language: 'japonais', where: 'au Japon' },
  { word: 'Ni hao !', say: 'Ni hao !', language: 'chinois', where: 'en Chine' },
  { word: 'Salam !', say: 'Salam !', language: 'arabe', where: 'en Égypte' },
];

/** L'image d'un pays : celle de son premier lieu célèbre. */
const countryClue = (country) => PLACES.find((p) => p.country === country).clue;

/** Niveaux 4 à 6 des pays : les habitants, « bonjour » dans plusieurs langues, les capitales. */
function paysPlus(level, rng) {
  if (level === 5) {
    const hello = pick(rng, HELLOS);
    const options = shuffle(rng, [hello, ...sample(rng, HELLOS.filter((h) => h !== hello), 2)]).map((h) => h.language);
    const ask = 'Ça veut dire « bonjour ». C’est quelle langue ?';
    return {
      key: `pays:bonjour:${hello.language}`,
      text: `« ${hello.word} » veut dire « bonjour ». C’est quelle langue ?`,
      instruction: ['Écoute :', hello.say, ask, `${capitalize(spokenList(options))} ?`],
      short: { key: 'pays:bonjour', text: 'C’est quelle langue ?', speak: [hello.say, 'C’est quelle langue ?'] },
      replay: [hello.say],
      stage: { type: 'sentence', text: hello.word, lang: hello.lang },
      choices: options.map((l) => ({ value: l, label: l })),
      choiceStyle: 'answers',
      answer: hello.language,
      success: { speak: [hello.say, `C’est bonjour en ${hello.language}. On parle ${hello.language} ${hello.where}.`] },
    };
  }
  const field = level === 4 ? 'people' : 'capital';
  const names = Object.keys(COUNTRIES).filter((c) => COUNTRIES[c][field]);
  const country = pick(rng, names);
  const info = COUNTRIES[country];
  const continent = (c) => PLACES.find((p) => p.country === c).continent;
  // des distracteurs du même continent d'abord (Rome, Madrid, Berlin pour l'Italie)
  const others = shuffle(rng, names.filter((c) => c !== country))
    .sort((a, b) => Number(continent(b) === continent(country)) - Number(continent(a) === continent(country)));
  const options = shuffle(rng, [country, ...others.slice(0, 2)]).map((c) => COUNTRIES[c][field]);
  const question = level === 4 ? `Les habitants ${info.de} s’appellent…` : `Quelle est la capitale ${info.de} ?`;
  return {
    key: `pays:${field}:${country}`,
    text: question,
    instruction: [question, `${capitalize(spokenList(options))} ?`],
    short: { key: `pays:${field}`, text: question },
    stage: { type: 'picture', emoji: countryClue(country) },
    choices: options.map((o) => ({ value: o, label: o })),
    choiceStyle: 'answers',
    answer: info[field],
    success: { speak: level === 4 ? `Les habitants ${info.de} s’appellent ${info.people}.` : `La capitale ${info.de}, c’est ${info.capital}.` },
  };
}

export const pays = {
  id: 'pays',
  domain: 'monde',
  title: 'Les pays du monde',
  icon: '🗺️',
  skill: 'Situer quelques pays et les continents',
  levels: ['Les pays d’Europe', 'Les pays du monde', 'Les continents', 'Les habitants des pays', 'Bonjour dans le monde', 'Les capitales'],
  generate(level, rng) {
    if (level >= 4) return paysPlus(level, rng);
    const field = level === 3 ? 'continent' : 'country';
    const place = pick(rng, PLACES.filter((p) => (level === 3 ? true : p.level === level)));
    const answer = place[field];
    const all = [...new Set(PLACES.filter((p) => p[field] && (level === 3 || p.level <= level)).map((p) => p[field]))];
    const options = shuffle(rng, [answer, ...sample(rng, all.filter((c) => c !== answer), 2)]);
    const question = `${place.what}… ${level === 3 ? 'sur quel continent' : 'dans quel pays'} ?`;
    return {
      key: `pays:${level}:${place.clue}`,
      text: question,
      instruction: question,
      short: { key: `pays:${field}`, text: question },
      stage: { type: 'picture', emoji: place.clue },
      choices: options.map((c) => ({ value: c, label: c })),
      choiceStyle: 'answers',
      answer,
      success: { speak: place.says },
    };
  },
};

export const MONDE_GAMES = [animauxMonde, saisons, pays];
