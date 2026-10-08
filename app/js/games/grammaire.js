// Grammaire du CP et du CE1 : la conjugaison (être, avoir, aller, faire et les verbes en -er,
// au présent, au futur et au passé composé) et les accords (singulier et pluriel, masculin et
// féminin, le nom, l'adjectif et le verbe).
// Les formes des verbes sont calculées (conjugate) : les phrases ne donnent que le verbe à
// l'infinitif et le sujet ; les tests vérifient les formes irrégulières à la main.

import { pick, randInt, sample, shuffle } from '../random.js';
import { textChoices } from './helpers.js';

// ---------------------------------------------------------------- Conjugaison : les formes

// personnes : 0 je, 1 tu, 2 il / elle / on, 3 nous, 4 vous, 5 ils / elles
const IRREGULAR = {
  present: {
    être: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'],
    avoir: ['ai', 'as', 'a', 'avons', 'avez', 'ont'],
    aller: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'],
    faire: ['fais', 'fais', 'fait', 'faisons', 'faites', 'font'],
  },
  futur: {
    être: ['serai', 'seras', 'sera', 'serons', 'serez', 'seront'],
    avoir: ['aurai', 'auras', 'aura', 'aurons', 'aurez', 'auront'],
  },
};
const ENDINGS = {
  present: ['e', 'es', 'e', 'ons', 'ez', 'ent'],
  futur: ['ai', 'as', 'a', 'ons', 'ez', 'ont'],
};

/** La forme du verbe à cette personne : temps 'present', 'futur' ou 'passe' (passé composé avec avoir). */
export function conjugate(verb, tense, person) {
  const irregular = IRREGULAR[tense]?.[verb];
  if (irregular) return irregular[person];
  if (!verb.endsWith('er')) throw new Error(`verbe non prévu : ${verb} (${tense})`);
  const stem = verb.slice(0, -2);
  if (tense === 'passe') return `${IRREGULAR.present.avoir[person]} ${stem}é`;
  if (tense === 'futur') return verb + ENDINGS.futur[person];
  // nous mangeons, nous lançons : le g et le c gardent leur son devant -ons
  if (person === 3 && stem.endsWith('g')) return `${stem}eons`;
  if (person === 3 && stem.endsWith('c')) return `${stem.slice(0, -1)}çons`;
  return stem + ENDINGS.present[person];
}

const PRONOUNS = { je: 0, tu: 1, il: 2, elle: 2, on: 2, nous: 3, vous: 4, ils: 5, elles: 5 };

/** Le sujet de la phrase (« Hier, nous _ au parc. » → « nous »). */
export function subjectOf(template) {
  const before = template.slice(0, template.indexOf(' _'));
  return before.includes(', ') ? before.slice(before.lastIndexOf(', ') + 2) : before;
}

/** La personne du sujet : un pronom, ou un groupe nominal au singulier ou au pluriel. */
export function personOf(subject) {
  const s = subject.toLowerCase();
  if (s in PRONOUNS) return PRONOUNS[s];
  return /^(les|des|mes|tes|ses|nos|vos|leurs|ces) /.test(s) || / et /.test(s) ? 5 : 2;
}

const startsWithVowel = (w) => /^[aeéèêiouyh]/.test(w);

/** Met `shown` à la place du trou ; « je » devient « j’ » devant une voyelle (j’aime, j’ai chanté). */
function place(template, form, shown = form) {
  return template
    .replace(/\b([Jj])e _/, (m, j) => (startsWithVowel(form) ? `${j}’${shown}` : `${j}e ${shown}`))
    .replace('_', shown);
}

// Les autres personnes proposées, de la plus trompeuse à la moins trompeuse : celles qui
// se prononcent pareil d'abord (je chante, tu chantes, ils chantent ; nous chantons, vous chantez).
const PREF = [[1, 2, 5, 3, 4], [0, 2, 5, 4, 3], [1, 5, 0, 3, 4], [4, 5, 2, 0, 1], [3, 5, 2, 0, 1], [2, 3, 4, 0, 1]];

/** La bonne forme, et deux formes du même verbe au même temps, à d'autres personnes. */
function personForms(verb, tense, person) {
  const out = [conjugate(verb, tense, person)];
  for (const p of PREF[person]) {
    const form = conjugate(verb, tense, p);
    if (!out.includes(form)) out.push(form);
    if (out.length === 3) break;
  }
  return out;
}

// ---------------------------------------------------------------- Conjugaison : les phrases

// « _ » marque le verbe ; le sujet est juste avant (après « Hier, », « Demain, »…).
const ETRE = [
  'Je _ dans le jardin.', 'Je _ à l’école.', 'Je _ très sage.', 'Je _ malade.', 'Je _ en vacances.',
  'Tu _ dans ta chambre.', 'Tu _ très drôle.', 'Tu _ en retard.', 'Tu _ mon ami.',
  'Il _ grand.', 'Elle _ petite.', 'Le chat _ noir.', 'La soupe _ chaude.', 'Papa _ dans la cuisine.',
  'Le ciel _ bleu.', 'On _ au parc.',
  'Nous _ à la plage.', 'Nous _ en classe.', 'Nous _ amis.',
  'Vous _ en retard.', 'Vous _ dans le bus.', 'Vous _ très gentils.',
  'Ils _ dans la cour.', 'Elles _ jolies.', 'Les fleurs _ rouges.', 'Les enfants _ sages.', 'Mes chaussures _ sales.',
];
const AVOIR = [
  'Je _ un vélo.', 'Je _ six ans.', 'Je _ mal au ventre.', 'Je _ une idée.',
  'Tu _ faim.', 'Tu _ un joli sac.', 'Tu _ de la chance.', 'Tu _ les mains sales.',
  'Il _ un chien.', 'Elle _ les yeux bleus.', 'Le lapin _ de grandes oreilles.', 'Mamie _ un chat.',
  'Papa _ une moustache.', 'On _ un nouveau jeu.',
  'Nous _ un jardin.', 'Nous _ une maison.', 'Nous _ froid.',
  'Vous _ soif.', 'Vous _ un beau dessin.', 'Vous _ deux chats.',
  'Ils _ froid.', 'Elles _ des cheveux longs.', 'Les girafes _ un long cou.', 'Les poules _ des plumes.',
  'Mes amis _ un ballon.',
];
// Niveau 3 : le verbe n'est pas donné, il faut choisir entre être et avoir (pas de « je » :
// « j’ » montrerait que c'est avoir).
const ETRE_OU_AVOIR = [
  ['avoir', 'Tu _ un joli vélo.'], ['être', 'Tu _ très drôle.'], ['avoir', 'Tu _ peur du noir.'], ['être', 'Tu _ à la maison.'],
  ['être', 'Nous _ à la piscine.'], ['avoir', 'Nous _ un petit chien.'], ['être', 'Nous _ amis.'],
  ['être', 'Vous _ en retard.'], ['avoir', 'Vous _ deux chats.'], ['avoir', 'Vous _ soif.'],
  ['avoir', 'Ils _ faim.'], ['être', 'Ils _ dans le jardin.'],
  ['avoir', 'Elle _ une robe rouge.'], ['être', 'Elle _ dans sa chambre.'],
  ['être', 'Les enfants _ sages.'], ['avoir', 'Les enfants _ des ballons.'],
  ['avoir', 'Papa _ une moustache.'], ['être', 'Papa _ dans la cuisine.'],
  ['être', 'Le lion _ fort.'], ['avoir', 'Le lion _ une crinière.'],
  ['avoir', 'Les poules _ des plumes.'], ['être', 'Les poules _ dans le pré.'],
  ['être', 'Mamie _ très gentille.'], ['avoir', 'Mamie _ un grand jardin.'],
  ['être', 'Le ciel _ gris.'], ['avoir', 'La girafe _ un long cou.'], ['être', 'Les fleurs _ belles.'],
  ['être', 'On _ en vacances.'], ['avoir', 'On _ un nouveau jeu.'], ['avoir', 'Elles _ des cheveux longs.'],
];
// Niveau 4 : verbes en -er avec je, tu, il, elle.
const ER_SINGULIER = [
  ['chanter', 'Je _ une chanson.'], ['danser', 'Tu _ très bien.'], ['jouer', 'Il _ au ballon.'],
  ['manger', 'Elle _ une pomme.'], ['regarder', 'Je _ un dessin animé.'], ['écouter', 'Je _ la maîtresse.'],
  ['aimer', 'Je _ les fraises.'], ['parler', 'Tu _ fort.'], ['nager', 'Le poisson _ dans l’eau.'],
  ['sauter', 'La grenouille _ dans la mare.'], ['dessiner', 'Tu _ une maison.'], ['marcher', 'Papa _ vite.'],
  ['ranger', 'Je _ ma chambre.'], ['colorier', 'Elle _ un papillon.'], ['habiter', 'Je _ dans une maison.'],
  ['porter', 'Tu _ un chapeau.'], ['laver', 'Maman _ la voiture.'], ['crier', 'Le bébé _ fort.'],
  ['voler', 'L’oiseau _ dans le ciel.'], ['fermer', 'Tu _ la porte.'], ['chercher', 'Le chien _ son os.'],
  ['donner', 'Je _ du pain aux canards.'], ['préparer', 'Mamie _ un gâteau.'], ['arriver', 'Le train _ à la gare.'],
  ['tomber', 'La neige _ doucement.'], ['gagner', 'Tu _ la course.'], ['pleurer', 'Le bébé _ dans son lit.'],
  ['trouver', 'Je _ un trésor.'], ['travailler', 'Papa _ au bureau.'], ['rouler', 'La voiture _ vite.'],
];
// Niveau 5 : verbes en -er avec nous, vous, ils, elles.
const ER_PLURIEL = [
  ['chanter', 'Nous _ une chanson.'], ['danser', 'Vous _ très bien.'], ['jouer', 'Ils _ au ballon.'],
  ['manger', 'Nous _ des pâtes.'], ['nager', 'Nous _ à la piscine.'], ['ranger', 'Nous _ nos jouets.'],
  ['regarder', 'Vous _ les étoiles.'], ['écouter', 'Elles _ une histoire.'], ['aimer', 'Nous _ le chocolat.'],
  ['parler', 'Vous _ trop fort.'], ['sauter', 'Les grenouilles _ dans la mare.'], ['dessiner', 'Nous _ un bateau.'],
  ['marcher', 'Les enfants _ dans la forêt.'], ['colorier', 'Vous _ un dessin.'], ['habiter', 'Nous _ près de l’école.'],
  ['porter', 'Ils _ des bottes.'], ['laver', 'Vous _ vos mains.'], ['crier', 'Les enfants _ dans la cour.'],
  ['voler', 'Les oiseaux _ dans le ciel.'], ['fermer', 'Nous _ les volets.'], ['chercher', 'Vous _ vos chaussures.'],
  ['donner', 'Ils _ des graines aux poules.'], ['préparer', 'Nous _ une salade.'], ['arriver', 'Les invités _ ce soir.'],
  ['gagner', 'Vous _ le match.'], ['rouler', 'Les voitures _ sur la route.'], ['trouver', 'Elles _ des coquillages.'],
  ['travailler', 'Nous _ en classe.'], ['monter', 'Nous _ l’escalier.'], ['tomber', 'Les feuilles _ des arbres.'],
];
// Niveau 6 : aller et faire, à toutes les personnes.
const ALLER_FAIRE = [
  ['aller', 'Je _ à l’école.'], ['aller', 'Tu _ au parc.'], ['aller', 'Il _ à la piscine.'],
  ['aller', 'Nous _ à la plage.'], ['aller', 'Vous _ chez Mamie.'], ['aller', 'Ils _ au cinéma.'],
  ['aller', 'Papa _ au travail.'], ['aller', 'Les enfants _ en classe.'], ['aller', 'Elle _ à la boulangerie.'],
  ['aller', 'Nous _ au marché.'], ['aller', 'Vous _ à la montagne.'], ['aller', 'Je _ dans le jardin.'],
  ['aller', 'Tu _ au lit.'], ['aller', 'Les oiseaux _ vers le sud.'],
  ['faire', 'Je _ un gâteau.'], ['faire', 'Tu _ un dessin.'], ['faire', 'Il _ du vélo.'],
  ['faire', 'Nous _ une cabane.'], ['faire', 'Vous _ du bruit.'], ['faire', 'Ils _ un château de sable.'],
  ['faire', 'Maman _ des crêpes.'], ['faire', 'Les élèves _ du sport.'], ['faire', 'Je _ mes devoirs.'],
  ['faire', 'Tu _ un puzzle.'], ['faire', 'Nous _ la vaisselle.'], ['faire', 'Vous _ un bonhomme de neige.'],
  ['faire', 'Elle _ de la musique.'], ['faire', 'Ils _ la fête.'],
];
// Niveau 7 : le futur des verbes en -er.
const FUTUR_ER = [
  ['jouer', 'Demain, je _ au parc.'], ['chanter', 'Demain, tu _ une chanson.'], ['manger', 'Ce soir, il _ des pâtes.'],
  ['nager', 'Demain, nous _ à la piscine.'], ['nager', 'Cet été, vous _ dans la mer.'], ['jouer', 'Plus tard, ils _ dans la cour.'],
  ['préparer', 'Demain, Mamie _ un gâteau.'], ['écouter', 'Ce soir, je _ une histoire.'], ['ranger', 'Demain, tu _ ta chambre.'],
  ['dîner', 'La semaine prochaine, nous _ chez Papi.'], ['regarder', 'Demain, les enfants _ un spectacle.'],
  ['laver', 'Ce soir, vous _ la vaisselle.'], ['marcher', 'Bientôt, le bébé _ tout seul.'], ['dessiner', 'Demain, je _ un château.'],
  ['colorier', 'Plus tard, tu _ ton dessin.'], ['travailler', 'Demain, il _ toute la journée.'], ['regarder', 'Ce soir, nous _ la lune.'],
  ['sauter', 'Demain, elles _ à la corde.'], ['voler', 'Bientôt, l’oiseau _ tout seul.'], ['gagner', 'Demain, vous _ le match.'],
  ['fermer', 'Ce soir, je _ la porte.'], ['planter', 'Demain, ils _ des fleurs.'], ['aimer', 'Plus tard, tu _ ce livre.'],
  ['marcher', 'Demain, nous _ dans la forêt.'], ['chanter', 'Ce soir, Papa _ une chanson.'],
  ['habiter', 'Bientôt, vous _ dans une nouvelle maison.'], ['arriver', 'Demain, je _ à l’heure.'],
  ['danser', 'Samedi, nous _ à la fête.'], ['téléphoner', 'Demain, tu _ à Mamie.'],
];
// Niveau 8 : le futur d'être et d'avoir.
const FUTUR_ETRE_AVOIR = [
  ['être', 'Demain, je _ en vacances.'], ['être', 'Demain, tu _ à l’école.'], ['être', 'Ce soir, il _ chez Mamie.'],
  ['être', 'Demain, nous _ à la mer.'], ['être', 'Ce soir, vous _ fatigués.'], ['être', 'Demain, ils _ au zoo.'],
  ['être', 'L’été prochain, nous _ à la montagne.'], ['être', 'Bientôt, les fleurs _ belles.'],
  ['être', 'Demain, le gâteau _ prêt.'], ['être', 'Plus tard, je _ pompier.'], ['être', 'Plus tard, tu _ pilote.'],
  ['être', 'Samedi, elles _ au cirque.'], ['être', 'Plus tard, je _ docteur.'],
  ['avoir', 'Demain, je _ sept ans.'], ['avoir', 'Bientôt, tu _ un vélo.'], ['avoir', 'Ce soir, il _ un cadeau.'],
  ['avoir', 'Demain, nous _ un chiot.'], ['avoir', 'Bientôt, vous _ une petite sœur.'], ['avoir', 'Plus tard, ils _ une grande maison.'],
  ['avoir', 'Ce soir, nous _ faim.'], ['avoir', 'Bientôt, le bébé _ des dents.'], ['avoir', 'Ce soir, vous _ un bon dîner.'],
  ['avoir', 'Cet hiver, les enfants _ froid.'], ['avoir', 'Demain, tu _ une bonne note.'],
  ['avoir', 'Bientôt, les poules _ des poussins.'], ['avoir', 'Dimanche, Papi _ une surprise.'], ['avoir', 'Samedi, nous _ une fête.'],
];
// Niveau 9 : le passé composé (avec avoir) des verbes en -er.
const PASSE_COMPOSE = [
  ['chanter', 'Hier, je _ une chanson.'], ['jouer', 'Hier, tu _ au ballon.'], ['manger', 'Ce matin, il _ une pomme.'],
  ['nager', 'Hier, nous _ à la piscine.'], ['regarder', 'Hier soir, vous _ la télé.'], ['danser', 'Hier, ils _ dans la cour.'],
  ['ranger', 'Ce matin, je _ ma chambre.'], ['dessiner', 'Hier, elle _ un papillon.'], ['préparer', 'Hier, nous _ un gâteau.'],
  ['fermer', 'Hier, tu _ la porte.'], ['laver', 'Hier, Papa _ la voiture.'], ['crier', 'Hier, les enfants _ fort.'],
  ['gagner', 'Hier, vous _ le match.'], ['chercher', 'Ce matin, le chien _ son os.'], ['trouver', 'Hier, je _ un trésor.'],
  ['travailler', 'Hier, Maman _ toute la journée.'], ['écouter', 'Hier, elles _ une histoire.'], ['colorier', 'Hier, tu _ ton dessin.'],
  ['parler', 'Ce matin, nous _ à la maîtresse.'], ['planter', 'Hier, ils _ des fleurs.'], ['pleurer', 'Hier, le bébé _ toute la nuit.'],
  ['marcher', 'Hier, vous _ dans la forêt.'], ['donner', 'Hier, je _ du pain aux canards.'], ['sauter', 'Ce matin, il _ à la corde.'],
  ['porter', 'Hier, nous _ des bottes.'], ['téléphoner', 'Hier soir, tu _ à Mamie.'],
];
// Niveau 10 : le temps est donné par le début de la phrase (passé, présent ou futur).
// « je » seulement devant une voyelle : « j’ » est le même aux trois temps (j’ai écouté, j’écoute, j’écouterai).
const TEMPS = [
  ['jouer', 'passe', 'Hier, nous _ au parc.'], ['jouer', 'present', 'En ce moment, nous _ au parc.'], ['jouer', 'futur', 'Demain, nous _ au parc.'],
  ['chanter', 'passe', 'Hier, tu _ une chanson.'], ['chanter', 'present', 'En ce moment, tu _ une chanson.'], ['chanter', 'futur', 'Demain, tu _ une chanson.'],
  ['manger', 'passe', 'Hier soir, ils _ des crêpes.'], ['manger', 'present', 'En ce moment, ils _ des crêpes.'], ['manger', 'futur', 'Demain soir, ils _ des crêpes.'],
  ['écouter', 'passe', 'Hier, je _ une histoire.'], ['écouter', 'present', 'En ce moment, je _ la maîtresse.'], ['écouter', 'futur', 'Demain, je _ la radio.'],
  ['habiter', 'futur', 'Bientôt, je _ à la campagne.'], ['aimer', 'present', 'Tous les jours, je _ jouer dehors.'],
  ['danser', 'passe', 'Hier, elle _ avec Papa.'], ['danser', 'present', 'En ce moment, elle _ avec Papa.'], ['danser', 'futur', 'Samedi prochain, elle _ avec Papa.'],
  ['nager', 'passe', 'Hier, vous _ dans la mer.'], ['nager', 'present', 'Tous les jours, vous _ dans la mer.'], ['nager', 'futur', 'Demain, vous _ dans la mer.'],
  ['regarder', 'passe', 'Hier soir, les enfants _ un film.'], ['regarder', 'present', 'En ce moment, les enfants _ un film.'],
  ['regarder', 'futur', 'Demain soir, les enfants _ un film.'],
  ['ranger', 'passe', 'Hier, tu _ tes jouets.'], ['ranger', 'present', 'Tous les soirs, tu _ tes jouets.'], ['ranger', 'futur', 'Demain, tu _ tes jouets.'],
  ['travailler', 'passe', 'Hier, Papa _ au jardin.'], ['travailler', 'present', 'En ce moment, Papa _ au jardin.'],
  ['travailler', 'futur', 'Demain, Papa _ au jardin.'],
  ['préparer', 'passe', 'Hier, nous _ un gâteau.'], ['préparer', 'futur', 'La semaine prochaine, nous _ une fête.'],
  ['dessiner', 'futur', 'Plus tard, vous _ un dragon.'], ['dessiner', 'present', 'En ce moment, vous _ un dragon.'],
];

const CONJ_LEVELS = [
  null,
  { tense: 'present', items: ETRE.map((t) => ['être', t]) },
  { tense: 'present', items: AVOIR.map((t) => ['avoir', t]) },
  { tense: 'present', items: ETRE_OU_AVOIR, both: true },
  { tense: 'present', items: ER_SINGULIER },
  { tense: 'present', items: ER_PLURIEL },
  { tense: 'present', items: ALLER_FAIRE },
  { tense: 'futur', items: FUTUR_ER },
  { tense: 'futur', items: FUTUR_ETRE_AVOIR },
  { tense: 'passe', items: PASSE_COMPOSE },
  { items: TEMPS.map(([verb, tense, template]) => [verb, template, tense]), tenses: true },
];

const nbsp = (text) => text.replace(/ ([?!:;])/g, ' $1');

/** Les lettres de la terminaison, à souligner dans la forme révélée (chant|ons, chanter|ons, chant|é). */
function endingRange(verb, tense, person, form) {
  if (IRREGULAR[tense]?.[verb]) return null;
  const ending = tense === 'passe' ? 'é' : ENDINGS[tense][person];
  return [[form.length - ending.length, form.length]];
}

/** Deux réponses par ligne seulement si chaque mot est court (téléphone de 360 px), sinon une par ligne. */
const styleFor = (labels) => (labels.some((l) => l.split(' ').some((w) => w.length > 9)) ? 'sentences' : 'words');

function conjugation(level, rng) {
  const def = CONJ_LEVELS[level];
  const [verb, template, itemTense] = pick(rng, def.items);
  const tense = itemTense || def.tense;
  const person = personOf(subjectOf(template));
  const answer = conjugate(verb, tense, person);
  let forms;
  if (def.both) {
    // être ou avoir : la même personne avec l'autre verbe, et le bon verbe à une autre personne
    const other = verb === 'être' ? 'avoir' : 'être';
    forms = [answer, conjugate(other, tense, person), personForms(verb, tense, person)[1]];
  } else if (def.tenses) {
    forms = ['passe', 'present', 'futur'].map((t) => conjugate(verb, t, person));
  } else if (tense === 'passe') {
    // une erreur de personne (avez chanté), une erreur de terminaison (avons chanter)
    const [aux] = answer.split(' ');
    forms = [answer, conjugate(verb, tense, PREF[person][0]), `${aux} ${verb}`];
  } else {
    forms = personForms(verb, tense, person);
  }
  const full = place(template, answer);
  const gap = def.both ? '…' : `… (${verb})`;
  const labels = shuffle(rng, forms);
  const highlight = endingRange(verb, tense, person, answer);
  const instruction = ['Choisis la bonne forme du verbe.'];
  if (def.both) instruction.push('Être, ou avoir ?');
  if (def.tenses) instruction.push('Regarde bien le début de la phrase.');
  return {
    key: `conjugaison:${level}:${template}`,
    text: def.both ? 'Être ou avoir ? Choisis la bonne forme.'
      : def.tenses ? 'Hier, en ce moment ou demain ? Choisis la bonne forme.' : 'Choisis la bonne forme du verbe.',
    instruction,
    short: { key: 'conjugaison', text: 'Quelle forme ?', speak: 'Choisis la bonne forme du verbe.' },
    stage: { type: 'sentence', text: nbsp(place(template, answer, gap)) },
    choices: textChoices(labels),
    choiceStyle: styleFor(labels),
    answer,
    success: highlight ? { speak: full, reveal: answer, highlight } : { speak: full },
  };
}

export const conjugaison = {
  id: 'conjugaison',
  domain: 'francais',
  section: 'Grammaire',
  title: 'Conjugaison',
  icon: '⏳',
  skill: 'Conjuguer être, avoir, aller, faire et les verbes en -er au présent, au futur et au passé composé',
  levels: [
    'Être au présent', 'Avoir au présent', 'Être ou avoir ?', 'Verbes en -er, singulier', 'Verbes en -er, pluriel',
    'Aller et faire', 'Le futur (verbes en -er)', 'Le futur d’être et avoir', 'Le passé composé',
    'Passé, présent ou futur ?',
  ],
  generate(level, rng) {
    return conjugation(level, rng);
  },
};

// ---------------------------------------------------------------- Les accords : les données

// Noms qui prennent un s au pluriel : [nom, genre, image]
const NOMS = [
  ['chat', 'm', '🐱'], ['chien', 'm', '🐶'], ['lapin', 'm', '🐰'], ['ballon', 'm', '🎈'], ['livre', 'm', '📕'],
  ['arbre', 'm', '🌳'], ['avion', 'm', '✈️'], ['lion', 'm', '🦁'], ['éléphant', 'm', '🐘'], ['crayon', 'm', '✏️'],
  ['camion', 'm', '🚚'], ['poisson', 'm', '🐟'], ['canard', 'm', '🦆'], ['cochon', 'm', '🐷'], ['papillon', 'm', '🦋'],
  ['escargot', 'm', '🐌'], ['serpent', 'm', '🐍'], ['citron', 'm', '🍋'], ['train', 'm', '🚂'], ['bonbon', 'm', '🍬'],
  ['nuage', 'm', '☁️'], ['sapin', 'm', '🌲'], ['panier', 'm', '🧺'], ['œuf', 'm', '🥚'], ['parapluie', 'm', '☂️'],
  ['pomme', 'f', '🍎'], ['fleur', 'f', '🌸'], ['voiture', 'f', '🚗'], ['étoile', 'f', '⭐'], ['maison', 'f', '🏠'],
  ['poule', 'f', '🐔'], ['vache', 'f', '🐮'], ['fraise', 'f', '🍓'], ['fusée', 'f', '🚀'], ['abeille', 'f', '🐝'],
  ['banane', 'f', '🍌'], ['cerise', 'f', '🍒'], ['tortue', 'f', '🐢'], ['clé', 'f', '🔑'], ['robe', 'f', '👗'],
  ['chaussure', 'f', '👟'], ['grenouille', 'f', '🐸'], ['girafe', 'f', '🦒'], ['tomate', 'f', '🍅'], ['carotte', 'f', '🥕'],
  ['cloche', 'f', '🔔'], ['orange', 'f', '🍊'], ['horloge', 'f', '🕰️'], ['araignée', 'f', '🕷️'], ['baleine', 'f', '🐳'],
  ['pieuvre', 'f', '🐙'], ['couronne', 'f', '👑'], ['pizza', 'f', '🍕'], ['glace', 'f', '🍦'],
];
const article = (g) => (g === 'm' ? 'un' : 'une');

// Niveau 3 : pluriels en x (-eau, -eu, et sept noms en -ou), et des noms en -ou qui prennent un s.
// [nom, pluriel, image ou null]
const NOMS_X = [
  ['oiseau', 'oiseaux', '🐦'], ['bateau', 'bateaux', '⛵'], ['gâteau', 'gâteaux', '🎂'], ['château', 'châteaux', '🏰'],
  ['chapeau', 'chapeaux', '🎩'], ['cadeau', 'cadeaux', '🎁'], ['seau', 'seaux', '🪣'], ['drapeau', 'drapeaux', '🚩'],
  ['couteau', 'couteaux', '🔪'], ['manteau', 'manteaux', '🧥'], ['marteau', 'marteaux', '🔨'], ['pinceau', 'pinceaux', '🖌️'],
  ['agneau', 'agneaux', '🐑'], ['chameau', 'chameaux', '🐫'], ['rideau', 'rideaux', null], ['râteau', 'râteaux', null],
  ['jeu', 'jeux', '🎲'], ['feu', 'feux', '🔥'], ['cheveu', 'cheveux', null],
  ['bijou', 'bijoux', '💍'], ['caillou', 'cailloux', '🪨'], ['chou', 'choux', '🥬'], ['genou', 'genoux', null],
  ['hibou', 'hiboux', '🦉'], ['joujou', 'joujoux', '🧸'], ['pou', 'poux', null],
  ['trou', 'trous', '🕳️'], ['clou', 'clous', null], ['kangourou', 'kangourous', '🦘'], ['bisou', 'bisous', '😘'],
];
// Niveau 10 : les noms en -al font leur pluriel en -aux.
const NOMS_AUX = [
  ['cheval', 'chevaux', '🐴'], ['animal', 'animaux', '🐾'], ['journal', 'journaux', '📰'], ['bocal', 'bocaux', null],
  ['canal', 'canaux', null], ['hôpital', 'hôpitaux', '🏥'], ['signal', 'signaux', null],
];

// Féminin : [masculin, féminin, avant (le mot de départ), après (« ~ » : le mot à écrire), image ou null]
// Niveau 5 : on ajoute un e.
const FEMININS_E = [
  ['ami', 'amie', 'un ami', 'une ~', '👧'], ['cousin', 'cousine', 'un cousin', 'une ~', '👧'],
  ['voisin', 'voisine', 'un voisin', 'une ~', '👩'], ['marchand', 'marchande', 'un marchand', 'une ~', '👩'],
  ['client', 'cliente', 'un client', 'une ~', '🛒'], ['invité', 'invitée', 'un invité', 'une ~', '🎉'],
  ['gagnant', 'gagnante', 'un gagnant', 'une ~', '🏅'], ['avocat', 'avocate', 'un avocat', 'une ~', '👩'],
  ['lapin', 'lapine', 'un lapin', 'une ~', '🐰'], ['ours', 'ourse', 'un ours', 'une ~', '🐻'],
  ['renard', 'renarde', 'un renard', 'une ~', '🦊'], ['éléphant', 'éléphante', 'un éléphant', 'une ~', '🐘'],
  ['grand', 'grande', 'un grand arbre', 'une ~ maison', '🏠'], ['petit', 'petite', 'un petit chat', 'une ~ souris', '🐭'],
  ['joli', 'jolie', 'un joli bateau', 'une ~ fleur', '🌸'], ['vert', 'verte', 'un ballon vert', 'une pomme ~', '🍏'],
  ['gris', 'grise', 'un chat gris', 'une souris ~', '🐭'], ['noir', 'noire', 'un chien noir', 'une poule ~', '🐔'],
  ['bleu', 'bleue', 'un ciel bleu', 'une robe ~', '👗'], ['content', 'contente', 'un garçon content', 'une fille ~', '👧'],
  ['lourd', 'lourde', 'un sac lourd', 'une valise ~', '🧳'], ['chaud', 'chaude', 'un bain chaud', 'une soupe ~', '🍲'],
  ['rond', 'ronde', 'un ballon rond', 'une table ~', null], ['méchant', 'méchante', 'un loup méchant', 'une sorcière ~', '🧙'],
  ['gourmand', 'gourmande', 'un ours gourmand', 'une abeille ~', '🐝'], ['blond', 'blonde', 'un garçon blond', 'une fille ~', '👧'],
  ['mauvais', 'mauvaise', 'un mauvais rêve', 'une ~ idée', null], ['froid', 'froide', 'un vent froid', 'une eau ~', '💧'],
  ['court', 'courte', 'un nom court', 'une histoire ~', '📖'], ['plein', 'pleine', 'un verre plein', 'une tasse ~', '☕'],
  ['grand', 'grande', 'un grand frère', 'une ~ sœur', '👧'], ['fort', 'forte', 'un vent fort', 'une pluie ~', '🌧️'],
];
// Niveau 8 : féminins particuliers, avec deux erreurs plausibles chacun.
// [masculin, féminin, [erreurs], avant, après, image ou null]
const FEMININS_PARTICULIERS = [
  ['lion', 'lionne', ['lione', 'lionnesse'], 'un lion', 'une ~', '🦁'],
  ['chien', 'chienne', ['chiene', 'chiennesse'], 'un chien', 'une ~', '🐶'],
  ['champion', 'championne', ['champione', 'championnesse'], 'un champion', 'une ~', '🏆'],
  ['musicien', 'musicienne', ['musiciene', 'musiciennesse'], 'un musicien', 'une ~', '🎻'],
  ['magicien', 'magicienne', ['magiciene', 'magiciennesse'], 'un magicien', 'une ~', '🎩'],
  ['acteur', 'actrice', ['acteure', 'acteuse'], 'un acteur', 'une ~', '🎭'],
  ['directeur', 'directrice', ['directeure', 'directeuse'], 'un directeur', 'une ~', null],
  ['conducteur', 'conductrice', ['conducteure', 'conducteuse'], 'un conducteur', 'une ~', '🚌'],
  ['chanteur', 'chanteuse', ['chanteure', 'chantrice'], 'un chanteur', 'une ~', '🎤'],
  ['danseur', 'danseuse', ['danseure', 'danseuze'], 'un danseur', 'une ~', '💃'],
  ['nageur', 'nageuse', ['nageure', 'nageuze'], 'un nageur', 'une ~', '🏊'],
  ['coiffeur', 'coiffeuse', ['coiffeure', 'coiffeuze'], 'un coiffeur', 'une ~', '💇'],
  ['vendeur', 'vendeuse', ['vendeure', 'vendeuze'], 'un vendeur', 'une ~', null],
  ['boulanger', 'boulangère', ['boulangere', 'boulangeuse'], 'un boulanger', 'une ~', '🥖'],
  ['fermier', 'fermière', ['fermiere', 'fermieuse'], 'un fermier', 'une ~', '🚜'],
  ['cuisinier', 'cuisinière', ['cuisiniere', 'cuisinieuse'], 'un cuisinier', 'une ~', '🍳'],
  ['infirmier', 'infirmière', ['infirmiere', 'infirmieuse'], 'un infirmier', 'une ~', '🩺'],
  ['pâtissier', 'pâtissière', ['pâtissiere', 'pâtissieuse'], 'un pâtissier', 'une ~', '🎂'],
  ['écolier', 'écolière', ['écoliere', 'écolieuse'], 'un écolier', 'une ~', '🎒'],
  ['tigre', 'tigresse', ['tigrette', 'tigreuse'], 'un tigre', 'une ~', '🐯'],
  ['prince', 'princesse', ['princette', 'princeuse'], 'un prince', 'une ~', '👸'],
  ['ogre', 'ogresse', ['ogrette', 'ogreuse'], 'un ogre', 'une ~', '👹'],
  ['maître', 'maîtresse', ['maîtrette', 'maîtreuse'], 'un maître', 'une ~', '🏫'],
  ['roi', 'reine', ['roie', 'roine'], 'un roi', 'une ~', '👑'],
  ['âne', 'ânesse', ['ânette', 'âneuse'], 'un âne', 'une ~', null],
  ['sportif', 'sportive', ['sportife', 'sportiffe'], 'un sportif', 'une ~', '⚽'],
  ['gentil', 'gentille', ['gentile', 'gentil'], 'un chien gentil', 'une vache ~', '🐮'],
  ['beau', 'belle', ['beaue', 'beau'], 'un beau jardin', 'une ~ maison', '🏡'],
  ['nouveau', 'nouvelle', ['nouveaue', 'nouveau'], 'un nouveau livre', 'une ~ robe', '👗'],
  ['blanc', 'blanche', ['blance', 'blanc'], 'un mouton blanc', 'une poule ~', '🐔'],
  ['bon', 'bonne', ['bone', 'bon'], 'un bon gâteau', 'une ~ tarte', '🥧'],
  ['gros', 'grosse', ['grose', 'gros'], 'un gros chien', 'une ~ vache', '🐮'],
  ['long', 'longue', ['longe', 'long'], 'un long train', 'une ~ route', null],
  ['heureux', 'heureuse', ['heureuxe', 'heureux'], 'un garçon heureux', 'une fille ~', '👧'],
  ['doux', 'douce', ['douxe', 'doux'], 'un pull doux', 'une écharpe ~', '🧣'],
  ['vieux', 'vieille', ['vieuxe', 'vieux'], 'un vieux château', 'une ~ maison', '🏚️'],
  ['neuf', 'neuve', ['neufe', 'neuf'], 'un vélo neuf', 'une voiture ~', '🚗'],
  ['peureux', 'peureuse', ['peureuxe', 'peureux'], 'un chat peureux', 'une souris ~', '🐭'],
];
// Niveau 6 : le groupe nominal au pluriel. [déterminant, [nom, noms], [adjectif, adjectifs], adjectif devant ?, image]
const GROUPES = [
  ['le', ['chat', 'chats'], ['noir', 'noirs'], false, '🐱'], ['le', ['ballon', 'ballons'], ['rouge', 'rouges'], false, '🎈'],
  ['la', ['fleur', 'fleurs'], ['jaune', 'jaunes'], false, '🌼'], ['le', ['lapin', 'lapins'], ['petit', 'petits'], true, '🐰'],
  ['la', ['maison', 'maisons'], ['grande', 'grandes'], true, '🏠'], ['la', ['pomme', 'pommes'], ['verte', 'vertes'], false, '🍏'],
  ['le', ['papillon', 'papillons'], ['joli', 'jolis'], true, '🦋'], ['la', ['voiture', 'voitures'], ['bleue', 'bleues'], false, '🚙'],
  ['le', ['crayon', 'crayons'], ['vert', 'verts'], false, '✏️'], ['la', ['robe', 'robes'], ['rose', 'roses'], false, '👗'],
  ['le', ['ballon', 'ballons'], ['rond', 'ronds'], false, '⚽'], ['la', ['poule', 'poules'], ['blanche', 'blanches'], false, '🐔'],
  ['le', ['chien', 'chiens'], ['gentil', 'gentils'], false, '🐶'], ['la', ['fille', 'filles'], ['petite', 'petites'], true, '👧'],
  ['le', ['arbre', 'arbres'], ['grand', 'grands'], true, '🌳'], ['l’', ['étoile', 'étoiles'], ['jaune', 'jaunes'], false, '⭐'],
  ['le', ['livre', 'livres'], ['rouge', 'rouges'], false, '📕'], ['la', ['fraise', 'fraises'], ['sucrée', 'sucrées'], false, '🍓'],
  ['le', ['poisson', 'poissons'], ['petit', 'petits'], true, '🐟'], ['la', ['fleur', 'fleurs'], ['jolie', 'jolies'], true, '🌸'],
  ['le', ['chapeau', 'chapeaux'], ['noir', 'noirs'], false, '🎩'], ['le', ['bateau', 'bateaux'], ['blanc', 'blancs'], false, '⛵'],
  ['la', ['tasse', 'tasses'], ['bleue', 'bleues'], false, '☕'], ['le', ['camion', 'camions'], ['grand', 'grands'], true, '🚚'],
  ['la', ['chaise', 'chaises'], ['verte', 'vertes'], false, '🪑'], ['l’', ['oiseau', 'oiseaux'], ['bleu', 'bleus'], false, '🐦'],
  ['le', ['cadeau', 'cadeaux'], ['beau', 'beaux'], true, '🎁'], ['la', ['voiture', 'voitures'], ['petite', 'petites'], true, '🚗'],
  ['le', ['gâteau', 'gâteaux'], ['bon', 'bons'], true, '🎂'], ['la', ['vache', 'vaches'], ['noire', 'noires'], false, '🐮'],
];
// Niveau 7 : le verbe en -er s'accorde avec le sujet. [sujet singulier, sujet pluriel, verbe, image ou null]
const SUJETS_VERBES = [
  ['Il', 'Ils', 'chanter', null], ['Elle', 'Elles', 'danser', null], ['Le chien', 'Les chiens', 'jouer', '🐶'],
  ['Le bébé', 'Les bébés', 'pleurer', '👶'], ['L’oiseau', 'Les oiseaux', 'chanter', '🐦'], ['Le lapin', 'Les lapins', 'sauter', '🐰'],
  ['La poule', 'Les poules', 'picorer', '🐔'], ['Le poisson', 'Les poissons', 'nager', '🐟'], ['La fille', 'Les filles', 'dessiner', '👧'],
  ['Le garçon', 'Les garçons', 'crier', '👦'], ['La vache', 'Les vaches', 'manger', '🐮'], ['Le chat', 'Les chats', 'ronronner', '🐱'],
  ['L’abeille', 'Les abeilles', 'voler', '🐝'], ['Le cheval', 'Les chevaux', 'galoper', '🐴'], ['Le train', 'Les trains', 'arriver', '🚂'],
  ['La feuille', 'Les feuilles', 'tomber', '🍂'], ['Le clown', 'Les clowns', 'jongler', '🤡'], ['La grenouille', 'Les grenouilles', 'sauter', '🐸'],
  ['Le loup', 'Les loups', 'hurler', '🐺'], ['L’élève', 'Les élèves', 'écouter', null], ['Le bateau', 'Les bateaux', 'flotter', '⛵'],
  ['Le pompier', 'Les pompiers', 'arriver', '🚒'], ['L’enfant', 'Les enfants', 'jouer', null], ['Le serpent', 'Les serpents', 'siffler', '🐍'],
  ['La cloche', 'Les cloches', 'sonner', '🔔'], ['Le canard', 'Les canards', 'nager', '🦆'], ['La fusée', 'Les fusées', 'décoller', '🚀'],
  ['Le papillon', 'Les papillons', 'voler', '🦋'], ['La voiture', 'Les voitures', 'rouler', '🚗'], ['Le singe', 'Les singes', 'grimper', '🐒'],
];
// Niveau 9 : toute la phrase s'accorde. Mots séparés par des espaces ; « a/b » : singulier/pluriel.
// Le premier mot est le déterminant (jamais oublié dans les erreurs proposées).
const PHRASES_ACCORD = [
  'Le/Les petit/petits chat/chats joue/jouent', 'La/Les petite/petites fille/filles danse/dansent',
  'Le/Les chien/chiens noir/noirs saute/sautent', 'La/Les poule/poules blanche/blanches picore/picorent',
  'Le/Les bébé/bébés pleure/pleurent fort', 'Le/Les bateau/bateaux bleu/bleus flotte/flottent',
  'Le/Les cheval/chevaux blanc/blancs galope/galopent', 'La/Les vache/vaches mange/mangent de l’herbe',
  'Le/Les petit/petits oiseau/oiseaux chante/chantent', 'La/Les grande/grandes sœur/sœurs joue/jouent',
  'Le/Les lapin/lapins blanc/blancs saute/sautent', 'La/Les jolie/jolies fleur/fleurs pousse/poussent',
  'Le/Les garçon/garçons écoute/écoutent', 'La/Les petite/petites souris mange/mangent',
  'Le/Les poisson/poissons rouge/rouges nage/nagent', 'La/Les voiture/voitures rouge/rouges roule/roulent',
  'Le/Les singe/singes grimpe/grimpent', 'Le/Les clown/clowns jongle/jonglent',
  'La/Les grenouille/grenouilles verte/vertes saute/sautent', 'Le/Les gâteau/gâteaux est/sont bon/bons',
  'La/Les fraise/fraises est/sont rouge/rouges', 'Le/Les chat/chats est/sont content/contents',
  'La/Les maison/maisons est/sont grande/grandes', 'Le/Les ballon/ballons est/sont rond/ronds',
  'Le/Les chapeau/chapeaux est/sont noir/noirs', 'La/Les tortue/tortues marche/marchent lentement',
  'Le/Les loup/loups hurle/hurlent', 'La/Les cloche/cloches sonne/sonnent',
  'Le/Les canard/canards jaune/jaunes nage/nagent', 'La/Les fusée/fusées décolle/décollent',
];

// ---------------------------------------------------------------- Les accords : les questions

/** Les lettres qui changent d'un mot à l'autre (chat → chats : « s » ; cheval → chevaux : « aux »). */
export function changedRange(from, to, offset = 0) {
  let i = 0;
  while (i < from.length && i < to.length && from[i] === to[i]) i++;
  // la terminaison entière : chev|aux plutôt que cheva|ux, chant|euse plutôt que chanteu|se
  if (from.endsWith('al') && to.endsWith('aux')) i = to.length - 3;
  if (from.endsWith('eur') && to.endsWith('euse')) i = to.length - 4;
  return i < to.length ? [offset + i, offset + to.length] : null;
}

/** Le groupe de mots révélé après une bonne réponse, les lettres ajoutées soulignées. */
function revealPairs(pairs) {
  let pos = 0;
  const ranges = [];
  const words = pairs.map(([from, to]) => {
    const range = from === null ? null : changedRange(from, to, pos);
    if (range) ranges.push(range);
    pos += to.length + 1;
    return to;
  });
  return { reveal: words.join(' '), highlight: ranges };
}

/** Niveau 1 : un seul, ou plusieurs ? */
function unOuDes(rng) {
  const [w, g, emoji] = pick(rng, NOMS);
  const one = `${article(g)} ${w}`;
  const many = `des ${w}s`;
  const plural = rng() < 0.5;
  const answer = plural ? many : one;
  return {
    key: `accords:1:${w}`,
    text: 'Regarde l’image : un seul, ou plusieurs ?',
    instruction: ['Regarde bien l’image.', `${one}, ou ${many} ?`],
    short: { key: 'accords:un-des', text: 'Un ou des ?', speak: `${one}, ou ${many} ?` },
    stage: { type: 'objects', emoji, count: plural ? randInt(rng, 2, 5) : 1, perRow: 5 },
    choices: textChoices([one, many]),
    choiceStyle: styleFor([one, many]),
    answer,
    success: { speak: answer, ...(plural ? revealPairs([[null, 'des'], [w, `${w}s`]]) : { reveal: one }) },
  };
}

/** Niveaux 2, 3 et 10 : le nom au pluriel (s, x, -aux). */
function nounPlural(rng, level, item) {
  const [w, pl, emoji, g = 'm'] = item;
  const forms = level === 2 ? [w, `${w}s`] : [w, `${w}s`, w.endsWith('al') ? `${w.slice(0, -2)}aux` : `${w}x`];
  const labels = shuffle(rng, forms);
  return {
    key: `accords:pluriel:${pl}`,
    text: 'Comment s’écrit ce mot au pluriel ?',
    instruction: [`Comment écrit-on : des ${pl} ?`, level === 2 ? 'Avec un s, ou sans rien ?' : 'Avec un s, avec un x, ou sans rien ?'],
    short: { key: 'accords:pluriel', text: 'Au pluriel ?', speak: `des ${pl} ?` },
    stage: { type: 'accord', emoji, count: 3, from: `${article(g)} ${w}`, to: 'des …' },
    choices: textChoices(labels),
    choiceStyle: styleFor(labels),
    answer: pl,
    success: { speak: `des ${pl}`, ...revealPairs([[null, 'des'], [w, pl]]) },
  };
}

/** Niveau 4 : un ou une ? */
function unOuUne(rng) {
  const [w, g, emoji] = pick(rng, NOMS);
  const answer = article(g);
  return {
    key: `accords:4:${w}`,
    text: `Quel petit mot va devant « ${w} » ?`,
    instruction: `Quel petit mot va devant : ${w} ?`,
    short: { key: 'accords:un-une', text: `Devant « ${w} » ?`, speak: `${w} ?` },
    stage: { type: 'accord', emoji, count: 1, to: `… ${w}` },
    choices: textChoices(['un', 'une']),
    choiceStyle: 'words',
    answer,
    success: { speak: `${answer} ${w}`, reveal: `${answer} ${w}` },
  };
}

/** Niveaux 5 et 8 : le mot au féminin (ami → amie, lion → lionne, beau → belle). */
function feminine(rng, level) {
  const special = level === 8;
  const item = pick(rng, special ? FEMININS_PARTICULIERS : FEMININS_E);
  const [m, f] = item;
  const [wrong, from, to, emoji] = special ? item.slice(2) : [[m, m.endsWith('s') ? `${f}s` : `${m}s`], ...item.slice(2)];
  const labels = shuffle(rng, [f, ...wrong]);
  const full = to.replace('~', f);
  const range = changedRange(m, f, to.indexOf('~'));
  return {
    key: `accords:${level}:${from}`,
    text: 'Quel mot faut-il écrire au féminin ?',
    instruction: [from, 'Quel mot faut-il écrire au féminin ?'],
    short: { key: 'accords:feminin', text: 'Au féminin ?', speak: [from, 'Au féminin ?'] },
    stage: { type: 'accord', emoji, count: 1, from, to: to.replace('~', '…') },
    choices: textChoices(labels),
    choiceStyle: styleFor(labels),
    answer: f,
    success: { speak: full, reveal: full, highlight: range ? [range] : [] },
  };
}

/** Niveau 6 : le nom et l'adjectif au pluriel (le chat noir → les chats noirs). */
function groupPlural(rng) {
  const [det, [n, ns], [a, as], before, emoji] = pick(rng, GROUPES);
  const order = (adj, noun) => (before ? `${adj} ${noun}` : `${noun} ${adj}`);
  const answer = order(as, ns);
  const labels = shuffle(rng, [answer, order(as, n), order(a, ns)]);
  const singular = det === 'l’' ? `l’${order(a, n)}` : `${det} ${order(a, n)}`;
  const full = `les ${answer}`;
  const { highlight } = revealPairs([[null, 'les'], ...(before ? [[a, as], [n, ns]] : [[n, ns], [a, as]])]);
  return {
    key: `accords:6:${singular}`,
    text: 'Quel groupe de mots est bien accordé ?',
    instruction: [full, 'Lis bien chaque mot : un seul groupe de mots est bien accordé. Lequel ?'],
    short: { key: 'accords:groupe', text: 'Bien accordé ?', speak: [full] },
    replay: [full],
    stage: { type: 'accord', emoji, count: 3, from: singular, to: 'les …' },
    choices: textChoices(labels),
    choiceStyle: 'sentences',
    answer,
    success: { speak: full, reveal: full, highlight },
  };
}

/** Niveau 7 : le verbe s'accorde avec le sujet (le chien joue → les chiens jouent), dans les deux sens. */
function verbAgreement(rng) {
  const [one, many, verb, emoji] = pick(rng, SUJETS_VERBES);
  const toPlural = rng() < 0.7;
  const [sg, pl, tu] = [2, 5, 1].map((p) => conjugate(verb, 'present', p));
  const answer = toPlural ? pl : sg;
  const from = `${toPlural ? one : many} ${toPlural ? sg : pl}.`;
  const full = `${toPlural ? many : one} ${answer}.`;
  const labels = shuffle(rng, [sg, pl, tu]);
  return {
    key: `accords:7:${from}`,
    text: 'Comment s’écrit le verbe ?',
    instruction: [full, 'Comment faut-il écrire le verbe ?'],
    short: { key: 'accords:verbe', text: 'Le verbe ?', speak: [full] },
    replay: [full],
    stage: { type: 'accord', emoji, count: toPlural ? 3 : 1, from, to: `${toPlural ? many : one} …` },
    choices: textChoices(labels),
    choiceStyle: styleFor(labels),
    answer,
    success: toPlural ? { speak: full, reveal: pl, highlight: [[pl.length - 2, pl.length]] } : { speak: full, reveal: sg },
  };
}

/** Une phrase de PHRASES_ACCORD : au singulier, au pluriel, et les erreurs possibles (un mot resté au singulier). */
export function sentenceForms(line) {
  const words = line.split(' ').map((w) => (w.includes('/') ? w.split('/') : [w, w]));
  const join = (ws) => `${ws.join(' ')}.`;
  const singular = join(words.map((w) => w[0]));
  const plural = join(words.map((w) => w[1]));
  const wrongs = words
    .map((w, i) => (i > 0 && w[0] !== w[1] ? join(words.map((v, j) => (j === i ? v[0] : v[1]))) : null))
    .filter(Boolean);
  return { singular, plural, wrongs, det: words[0][1] };
}

/** Niveau 9 : toute la phrase s'accorde. */
function sentenceAgreement(rng) {
  const { singular, plural, wrongs, det } = sentenceForms(pick(rng, PHRASES_ACCORD));
  return {
    key: `accords:9:${singular}`,
    text: 'Quelle phrase est bien accordée ?',
    instruction: [plural, 'Lis bien chaque mot. Quelle phrase est bien accordée ?'],
    short: { key: 'accords:phrase', text: 'Bien accordée ?', speak: [plural] },
    replay: [plural],
    stage: { type: 'accord', from: singular, to: `${det} …` },
    choices: textChoices(shuffle(rng, [plural, ...sample(rng, wrongs, 2)])),
    choiceStyle: 'sentences',
    answer: plural,
    success: { speak: plural },
  };
}

const masculine = (rows) => rows.map(([w, pl, emoji]) => [w, pl, emoji, 'm']);

function accordQuestion(level, rng) {
  switch (level) {
    case 1: return unOuDes(rng);
    case 2: {
      const [w, g, emoji] = pick(rng, NOMS);
      return nounPlural(rng, 2, [w, `${w}s`, emoji, g]);
    }
    case 3: return nounPlural(rng, 3, pick(rng, masculine(NOMS_X)));
    case 4: return unOuUne(rng);
    case 5: return feminine(rng, 5);
    case 6: return groupPlural(rng);
    case 7: return verbAgreement(rng);
    case 8: return feminine(rng, 8);
    case 9: return sentenceAgreement(rng);
    default: {
      // tout mélangé, et les noms en -al (cheval → chevaux)
      const kind = pick(rng, ['aux', 'aux', 3, 5, 6, 7, 8, 9]);
      if (kind === 'aux') return nounPlural(rng, 10, pick(rng, masculine(NOMS_AUX)));
      return accordQuestion(kind, rng);
    }
  }
}

export const accords = {
  id: 'accords',
  domain: 'francais',
  section: 'Grammaire',
  title: 'Les accords',
  icon: '🤝',
  skill: 'Accorder en genre et en nombre : le pluriel des noms (s, x), le féminin, l’adjectif et le verbe',
  levels: [
    'Un ou des ?', 'Le pluriel en -s', 'Le pluriel en -x', 'Un ou une ?', 'Le féminin en -e',
    'Le nom et l’adjectif', 'Le verbe s’accorde', 'Féminins particuliers', 'Toute la phrase s’accorde',
    'Mélange, et -al → -aux',
  ],
  generate(level, rng) {
    return accordQuestion(level, rng);
  },
};

export const GRAMMAIRE_GAMES = [conjugaison, accords];

/** Données (pour les tests). */
export const GRAMMAIRE_DATA = {
  IRREGULAR, CONJ_LEVELS, NOMS, NOMS_X, NOMS_AUX, FEMININS_E, FEMININS_PARTICULIERS, GROUPES, SUJETS_VERBES, PHRASES_ACCORD,
};
