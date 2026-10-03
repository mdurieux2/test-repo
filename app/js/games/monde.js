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
  { emoji: '🐄', name: 'la vache', home: 'ferme', baby: 'le veau', food: 'herbe', eggs: false },
  { emoji: '🐑', name: 'le mouton', home: 'ferme', baby: 'l’agneau', food: 'herbe', eggs: false },
  { emoji: '🐴', name: 'le cheval', home: 'ferme', baby: 'le poulain', food: 'herbe', eggs: false },
  { emoji: '🐔', name: 'la poule', home: 'ferme', baby: 'le poussin', food: 'graines', eggs: true },
  { emoji: '🐷', name: 'le cochon', home: 'ferme', baby: 'le porcelet', food: 'tout', eggs: false },
  { emoji: '🦆', name: 'le canard', home: 'ferme', baby: 'le caneton', food: 'graines', eggs: true },
  { emoji: '🐬', name: 'le dauphin', home: 'mer', food: 'poissons', eggs: false },
  { emoji: '🐙', name: 'la pieuvre', home: 'mer', food: 'poissons', eggs: true },
  { emoji: '🦀', name: 'le crabe', home: 'mer', food: 'tout', eggs: true },
  { emoji: '🐳', name: 'la baleine', home: 'mer', food: 'poissons', eggs: false },
  { emoji: '🦊', name: 'le renard', home: 'foret', baby: 'le renardeau', food: 'viande', eggs: false },
  { emoji: '🦌', name: 'le cerf', home: 'foret', baby: 'le faon', food: 'herbe', eggs: false },
  { emoji: '🐿️', name: 'l’écureuil', home: 'foret', food: 'graines', eggs: false },
  { emoji: '🦉', name: 'la chouette', home: 'foret', food: 'viande', eggs: true },
  { emoji: '🦁', name: 'le lion', home: 'savane', baby: 'le lionceau', food: 'viande', eggs: false },
  { emoji: '🦒', name: 'la girafe', home: 'savane', baby: 'le girafon', food: 'herbe', eggs: false },
  { emoji: '🐘', name: 'l’éléphant', home: 'savane', baby: 'l’éléphanteau', food: 'herbe', eggs: false },
  { emoji: '🦓', name: 'le zèbre', home: 'savane', food: 'herbe', eggs: false },
  { emoji: '🐧', name: 'le manchot', home: 'banquise', food: 'poissons', eggs: true },
  { emoji: '🐻‍❄️', name: 'l’ours blanc', home: 'banquise', baby: 'l’ourson', food: 'poissons', eggs: false },
  { emoji: '🦭', name: 'le phoque', home: 'banquise', food: 'poissons', eggs: false },
  { emoji: '🐱', name: 'le chat', baby: 'le chaton', food: 'viande', eggs: false },
  { emoji: '🐶', name: 'le chien', baby: 'le chiot', food: 'viande', eggs: false },
  { emoji: '🐰', name: 'le lapin', baby: 'le lapereau', food: 'herbe', eggs: false },
  { emoji: '🐢', name: 'la tortue', food: 'herbe', eggs: true },
  { emoji: '🐊', name: 'le crocodile', food: 'viande', eggs: true },
  { emoji: '🐍', name: 'le serpent', food: 'viande', eggs: true },
];

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
  levels: ['Où vit-il ?', 'Les bébés des animaux', 'Que mange-t-il ?', 'Qui pond des œufs ?'],
  generate(level, rng) {
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

export const saisons = {
  id: 'saisons',
  domain: 'monde',
  title: 'Le temps qui passe',
  icon: '🍂',
  skill: 'Se repérer dans le temps : saisons, moments de la journée, jours, mois',
  levels: ['Les saisons', 'Les moments de la journée', 'Les jours de la semaine', 'Les mois de l’année'],
  generate(level, rng) {
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

export const pays = {
  id: 'pays',
  domain: 'monde',
  title: 'Les pays du monde',
  icon: '🗺️',
  skill: 'Situer quelques pays et les continents',
  levels: ['Les pays d’Europe', 'Les pays du monde', 'Les continents'],
  generate(level, rng) {
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
