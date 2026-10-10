// Vocabulaire du cours moyen (programme de 2025) : synonymes et antonymes qui respectent la classe du
// mot (nom et verbe au CM1, aussi l'adjectif au CM2), préfixes et suffixes, familles de mots, mots
// composés, homonymes, mots polysémiques (CM1) ; éléments savants comme -vore et -cide (CM2).
// Phrases fixes : Estelle les dit d'un seul son.

import { pick, shuffle } from '../random.js';
import { textChoices } from './helpers.js';

const styleFor = (labels) => (labels.some((l) => l.length > 12) ? 'sentences' : 'words');
const enListe = (labels) => (labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} ou ${labels.at(-1)}`);
const capitalize = (text) => `${text[0].toUpperCase()}${text.slice(1)}`;

// [mot, synonyme, deux mots de la même classe qui ne le sont pas]
const SYNONYMES = [
  ['débuter', 'commencer', ['finir', 'continuer']], ['une demeure', 'une maison', ['une rue', 'un jardin']],
  ['dérober', 'voler', ['acheter', 'donner']], ['un périple', 'un voyage', ['un repas', 'un repos']],
  ['bâtir', 'construire', ['détruire', 'acheter']], ['dévorer', 'manger', ['boire', 'cuisiner']],
  ['un bambin', 'un enfant', ['un vieillard', 'un animal']], ['sangloter', 'pleurer', ['rire', 'chanter']],
  ['achever', 'terminer', ['commencer', 'oublier']], ['une besogne', 'un travail', ['un repos', 'un jeu']],
  ['contempler', 'regarder', ['écouter', 'toucher']], ['un festin', 'un repas', ['un jeûne', 'un gâteau']],
  ['dissimuler', 'cacher', ['montrer', 'trouver']], ['effrayé', 'apeuré', ['amusé', 'fatigué']],
  ['un vélo', 'une bicyclette', ['une voiture', 'un camion']], ['joyeux', 'gai', ['triste', 'fâché']], ['minuscule', 'tout petit', ['énorme', 'moyen']],
];
// [mot, contraire, deux mots de la même classe qui ne le sont pas]
const ANTONYMES = [
  ['monter', 'descendre', ['grimper', 'courir']], ['accepter', 'refuser', ['prendre', 'donner']],
  ['la victoire', 'la défaite', ['le match', 'la joie']], ['généreux', 'avare', ['gentil', 'riche']],
  ['allumer', 'éteindre', ['brûler', 'briller']], ['le début', 'la fin', ['le milieu', 'le départ']],
  ['rapide', 'lent', ['pressé', 'léger']], ['ouvrir', 'fermer', ['entrer', 'sortir']], ['la guerre', 'la paix', ['la bataille', 'la victoire']],
  ['courageux', 'peureux', ['fort', 'prudent']], ['gagner', 'perdre', ['jouer', 'chercher']], ['l’entrée', 'la sortie', ['la porte', 'le couloir']],
  ['ancien', 'moderne', ['vieux', 'usé']], ['rire', 'pleurer', ['sourire', 'chanter']], ['la nuit', 'le jour', ['le soir', 'la lune']],
];
// [mot, ce qu'il veut dire, deux sens faux] : les préfixes
const PREFIXES = [
  ['impossible', 'qui n’est pas possible', ['qui est très possible', 'qui était possible avant']],
  ['refaire', 'faire de nouveau', ['ne pas faire', 'faire avant']], ['préhistoire', 'avant l’histoire', ['après l’histoire', 'contre l’histoire']],
  ['malheureux', 'qui n’est pas heureux', ['très heureux', 'heureux de nouveau']],
  ['démonter', 'faire le contraire de monter', ['monter de nouveau', 'monter très haut']],
  ['incroyable', 'qu’on ne peut pas croire', ['qu’on croit facilement', 'qu’on croit de nouveau']],
  ['surpeuplé', 'trop peuplé', ['pas assez peuplé', 'peuplé avant']], ['revenir', 'venir de nouveau', ['ne pas venir', 'venir avant']],
  ['antivol', 'contre le vol', ['avant le vol', 'pendant le vol']], ['sous-marin', 'sous la mer', ['sur la mer', 'près de la mer']],
  ['désordre', 'le contraire de l’ordre', ['beaucoup d’ordre', 'un ordre ancien']], ['prévoir', 'voir avant', ['voir de nouveau', 'ne pas voir']],
];
// [définition, mot, deux mots de la même famille qui ne conviennent pas] : les suffixes
const SUFFIXES = [
  ['celui qui jardine', 'un jardinier', ['le jardinage', 'un jardinet']], ['un petit livre', 'un livret', ['un libraire', 'une librairie']],
  ['l’action de laver', 'le lavage', ['un laveur', 'lavable']], ['qu’on peut laver', 'lavable', ['le lavage', 'un lavoir']],
  ['celle qui chante', 'une chanteuse', ['une chanson', 'le chantage']], ['l’arbre qui donne des pommes', 'un pommier', ['une pommade', 'une pommette']],
  ['une petite fille', 'une fillette', ['un filleul', 'une filiale']], ['celui qui conduit', 'un conducteur', ['la conduite', 'conduire']],
  ['rendre plus grand', 'agrandir', ['la grandeur', 'grandiose']], ['la qualité de celui qui est gentil', 'la gentillesse', ['gentiment', 'un gentilhomme']],
  ['d’une manière lente', 'lentement', ['la lenteur', 'ralentir']], ['le magasin du boulanger', 'la boulangerie', ['le boulanger', 'une boulette']],
];
// [trois mots d'une famille, l'intrus qui leur ressemble]
const FAMILLES = [
  [['terre', 'terrain', 'atterrir'], 'terrible'], [['dent', 'dentiste', 'dentifrice'], 'dentelle'], [['lait', 'laitier', 'laiteux'], 'laid'],
  [['mer', 'marin', 'maritime'], 'mère'], [['chant', 'chanter', 'chanteur'], 'champ'], [['sel', 'salière', 'saler'], 'selle'],
  [['fleur', 'fleuriste', 'fleurir'], 'flûte'], [['peur', 'apeuré', 'peureux'], 'peuple'], [['main', 'manuel', 'manette'], 'matin'],
  [['jour', 'journée', 'journal'], 'jouet'], [['froid', 'froideur', 'refroidir'], 'froisser'], [['nuit', 'nuitée', 'minuit'], 'nuire'],
  [['vent', 'venteux', 'éventail'], 'vendre'],
];
// [mot composé, deux mots qui n'en sont pas]
const COMPOSES = [
  ['un chou-fleur', ['une choucroute', 'une chouette']], ['un porte-clés', ['un portail', 'une portière']],
  ['une grand-mère', ['la grandeur', 'grandir']], ['un arc-en-ciel', ['une arcade', 'un archer']],
  ['une pomme de terre', ['un pommier', 'une pommade']], ['un sous-marin', ['un marinier', 'la marine']],
  ['un coffre-fort', ['un coffret', 'une forteresse']], ['un taille-crayon', ['un tailleur', 'crayonner']],
  ['un garde-manger', ['une garderie', 'un gardien']], ['un timbre-poste', ['timbré', 'un postier']],
];
// [phrase avec « … », bon mot, deux homonymes]
const HOMONYMES = [
  ['Le … a épousé la comtesse.', 'comte', ['conte', 'compte']], ['Ma grand-mère me lit un … .', 'conte', ['comte', 'compte']],
  ['Le marchand fait le … de ses pièces.', 'compte', ['conte', 'comte']], ['J’ai bu un grand … d’eau.', 'verre', ['vert', 'ver']],
  ['Le … de terre creuse le sol.', 'ver', ['verre', 'vert']], ['Le pré est tout … .', 'vert', ['verre', 'ver']],
  ['Il a mal au … .', 'cou', ['coup', 'coût']], ['Il a reçu un … de pied.', 'coup', ['cou', 'coût']], ['Le … de ce vélo est élevé.', 'coût', ['cou', 'coup']],
  ['Le … est un arbre de la montagne.', 'pin', ['pain', 'peint']], ['J’achète du … chez le boulanger.', 'pain', ['pin', 'peint']],
  ['Le mur est … en bleu.', 'peint', ['pain', 'pin']], ['Le … de la ville inaugure le stade.', 'maire', ['mer', 'mère']],
  ['La … est calme ce matin.', 'mer', ['maire', 'mère']], ['Il a perdu du … en tombant.', 'sang', ['cent', 'sans']],
  ['Je bois mon chocolat … sucre.', 'sans', ['sang', 'cent']], ['Le train arrive sur la … numéro deux.', 'voie', ['voix', 'vois']],
  ['La chanteuse a une très belle … .', 'voix', ['voie', 'vois']],
];
// [mot, sens, phrase où il a ce sens, phrases où il en a un autre]
const POLYSEMIE = [
  ['glace', 'un miroir', 'Je me regarde dans la glace.', ['Je mange une glace à la vanille.', 'Les enfants patinent sur la glace.']],
  ['feuille', 'une page de papier', 'Écris ton nom sur la feuille.', ['La feuille tombe de l’arbre.']],
  ['règle', 'une loi à respecter', 'Respecte la règle du jeu.', ['Trace un trait avec ta règle.']],
  ['souris', 'un objet pour l’ordinateur', 'Clique avec la souris.', ['Le chat attrape une souris.']],
  ['pièce', 'une partie de la maison', 'La maison a cinq pièces.', ['J’ai une pièce de deux euros.', 'Nous allons voir une pièce de théâtre.']],
  ['vue', 'un paysage', 'De la tour, la vue est magnifique.', ['Le hibou a une très bonne vue.']],
  ['sens', 'une direction', 'Tourne dans l’autre sens.', ['Ce mot a deux sens.', 'Nous avons cinq sens.']],
  ['milieu', 'le centre', 'Pose le vase au milieu de la table.', ['La forêt est le milieu de vie du cerf.']],
  ['point', 'le signe à la fin d’une phrase', 'N’oublie pas le point final.', ['Notre équipe a marqué un point.']],
  ['carte', 'un plan pour se repérer', 'Regarde la carte de France.', ['J’ai reçu une carte d’anniversaire.', 'Nous jouons aux cartes.']],
  ['bouchon', 'un embouteillage', 'Il y a un bouchon sur l’autoroute.', ['Le bouchon de la bouteille est tombé.']],
];
// [définition, mot, deux mots qui lui ressemblent] : éléments savants
const SAVANTS = [
  ['un animal qui mange des insectes', 'un insectivore', ['un insecticide', 'un insectarium']],
  ['un produit qui tue les insectes', 'un insecticide', ['un insectivore', 'un insectarium']],
  ['un animal qui mange de la viande', 'un carnivore', ['un carnage', 'un carnaval']],
  ['un animal qui mange des plantes', 'un herbivore', ['un herbicide', 'un herbier']],
  ['un produit qui tue les mauvaises herbes', 'un herbicide', ['un herbivore', 'un herbier']],
  ['un animal qui mange de tout', 'un omnivore', ['un omnibus', 'l’omniprésence']],
  ['un appareil pour parler à distance', 'un téléphone', ['une télévision', 'un microphone']],
  ['un appareil pour voir très loin', 'un télescope', ['un microscope', 'une télévision']],
  ['un appareil pour voir les choses minuscules', 'un microscope', ['un télescope', 'un périscope']],
  ['la science qui étudie la Terre', 'la géologie', ['la biologie', 'la géographie']],
  ['la science qui étudie les êtres vivants', 'la biologie', ['la géologie', 'la zoologie']],
];

/** Une question à choix écrits, lus à voix haute. */
function question({ key, text, stage = { type: 'none' }, reponse, autres, success, rng, lire = true }) {
  const options = shuffle(rng, [reponse, ...autres]);
  return {
    key,
    text,
    instruction: lire ? [text, `${capitalize(enListe(options))} ?`] : text,
    short: { key: `vocabulaire-cm:${key.split(':')[1]}`, text },
    stage,
    choices: textChoices(options),
    choiceStyle: styleFor(options),
    answer: reponse,
    success: { speak: success },
  };
}

function questionVocabulaire(level, rng) {
  const n = level === 10 ? 1 + Math.floor(rng() * 9) : level;
  if (n === 1) {
    const [mot, syn, autres] = pick(rng, SYNONYMES);
    return question({ key: `vocabulaire-cm:synonyme:${mot}`, text: `Quel mot veut dire presque la même chose que « ${mot} » ?`, reponse: syn, autres, rng, success: `Oui, « ${mot} » et « ${syn} » sont des synonymes.` });
  }
  if (n === 2) {
    const [mot, ant, autres] = pick(rng, ANTONYMES);
    return question({ key: `vocabulaire-cm:contraire:${mot}`, text: `Quel est le contraire de « ${mot} » ?`, reponse: ant, autres, rng, success: `Oui, « ${ant} » est le contraire de « ${mot} ».` });
  }
  if (n === 3) {
    const [mot, sens, autres] = pick(rng, PREFIXES);
    return question({ key: `vocabulaire-cm:prefixe:${mot}`, text: `Que veut dire « ${mot} » ?`, stage: { type: 'word', text: mot }, reponse: sens, autres, rng, success: `Oui, « ${mot} » veut dire ${sens}.`, lire: false });
  }
  if (n === 4) {
    const [def, mot, autres] = pick(rng, SUFFIXES);
    return question({ key: `vocabulaire-cm:suffixe:${def}`, text: `Quel mot veut dire ${def} ?`, reponse: mot, autres, rng, success: `Oui, ${def}, c’est ${mot}.` });
  }
  if (n === 5) {
    const [famille, intrus] = pick(rng, FAMILLES);
    return question({ key: `vocabulaire-cm:famille:${intrus}`, text: 'Quel mot n’est pas de la même famille que les autres ?', reponse: intrus, autres: famille, rng, success: `Oui, « ${intrus} » n’est pas de la famille de « ${famille[0]} ».` });
  }
  if (n === 6) {
    const [compose, autres] = pick(rng, COMPOSES);
    return question({ key: `vocabulaire-cm:compose:${compose}`, text: 'Lequel de ces mots est un mot composé ?', reponse: compose, autres, rng, success: `Oui, ${compose} est un mot composé.` });
  }
  if (n === 7) {
    const [phrase, mot, autres] = pick(rng, HOMONYMES);
    const complete = phrase.replace(' … .', ` ${mot}.`).replace('…', mot);
    return question({
      key: `vocabulaire-cm:homonyme:${phrase}`, text: 'Quel mot convient dans cette phrase ?', stage: { type: 'sentence', text: phrase },
      reponse: mot, autres, rng, success: complete, lire: false,
    });
  }
  if (n === 8) {
    const [mot, sens, bonne, autres] = pick(rng, POLYSEMIE);
    return question({
      key: `vocabulaire-cm:sens:${mot}:${bonne}`, text: `Dans quelle phrase le mot « ${mot} » veut-il dire ${sens} ?`,
      reponse: bonne, autres, rng, success: `Oui, ici, « ${mot} » veut dire ${sens}.`, lire: false,
    });
  }
  const [def, mot, autres] = pick(rng, SAVANTS);
  return question({ key: `vocabulaire-cm:savant:${def}`, text: `Quel mot désigne ${def} ?`, reponse: mot, autres, rng, success: `Oui, ${def}, c’est ${mot}.` });
}

export const vocabulaireCm = {
  id: 'vocabulaire-cm',
  domain: 'francais',
  section: 'Vocabulaire',
  title: 'Les mots du CM',
  icon: '📘',
  skill: 'Synonymes et antonymes, préfixes et suffixes, familles de mots, mots composés, homonymes, sens d’un mot, éléments savants',
  levels: [
    'Les synonymes', 'Les contraires', 'Les préfixes', 'Les suffixes', 'Les familles de mots', 'Les mots composés',
    'Les homonymes', 'Les sens d’un mot', 'Insectivore, insecticide…', 'Grand mélange',
  ],
  generate(level, rng) {
    return questionVocabulaire(level, rng);
  },
};
