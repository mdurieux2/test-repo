// Conjugaison du cours moyen (programme de 2025, et CE2 pour les verbes irréguliers) : le présent,
// le futur, l'imparfait et le passé composé d'être, d'avoir, des verbes en -er (et de ceux dont le
// radical change : nous mangeons, j'appelle, il achète), des verbes en -ir comme finir et des huit
// verbes irréguliers du programme (faire, aller, dire, venir, pouvoir, voir, vouloir, prendre) ;
// au CM2, le passé simple (à toutes les personnes) et le plus-que-parfait.
// Les formes sont calculées (conjuguer) ; les phrases sont des listes fixes, pour qu'Estelle les dise
// d'un seul son. Les verbes conjugués avec être ne sont qu'avec un sujet dont on connaît le genre.

import { pick, shuffle } from '../random.js';
import { textChoices } from './helpers.js';

// personnes : 0 je, 1 tu, 2 il / elle / on, 3 nous, 4 vous, 5 ils / elles
const IRREGULIERS = {
  present: {
    être: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'],
    avoir: ['ai', 'as', 'a', 'avons', 'avez', 'ont'],
    faire: ['fais', 'fais', 'fait', 'faisons', 'faites', 'font'],
    aller: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'],
    dire: ['dis', 'dis', 'dit', 'disons', 'dites', 'disent'],
    venir: ['viens', 'viens', 'vient', 'venons', 'venez', 'viennent'],
    pouvoir: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'],
    voir: ['vois', 'vois', 'voit', 'voyons', 'voyez', 'voient'],
    vouloir: ['veux', 'veux', 'veut', 'voulons', 'voulez', 'veulent'],
    prendre: ['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent'],
  },
  simple: {
    être: ['fus', 'fus', 'fut', 'fûmes', 'fûtes', 'furent'],
    avoir: ['eus', 'eus', 'eut', 'eûmes', 'eûtes', 'eurent'],
    faire: ['fis', 'fis', 'fit', 'fîmes', 'fîtes', 'firent'],
    aller: ['allai', 'allas', 'alla', 'allâmes', 'allâtes', 'allèrent'],
    dire: ['dis', 'dis', 'dit', 'dîmes', 'dîtes', 'dirent'],
    venir: ['vins', 'vins', 'vint', 'vînmes', 'vîntes', 'vinrent'],
    pouvoir: ['pus', 'pus', 'put', 'pûmes', 'pûtes', 'purent'],
    voir: ['vis', 'vis', 'vit', 'vîmes', 'vîtes', 'virent'],
    vouloir: ['voulus', 'voulus', 'voulut', 'voulûmes', 'voulûtes', 'voulurent'],
    prendre: ['pris', 'pris', 'prit', 'prîmes', 'prîtes', 'prirent'],
  },
};
// radical du futur des verbes irréguliers
const FUTUR_IRREGULIER = {
  être: 'ser', avoir: 'aur', faire: 'fer', aller: 'ir', dire: 'dir', venir: 'viendr', pouvoir: 'pourr', voir: 'verr',
  vouloir: 'voudr', prendre: 'prendr',
};
const PARTICIPES = {
  être: 'été', avoir: 'eu', faire: 'fait', aller: 'allé', dire: 'dit', venir: 'venu', pouvoir: 'pu', voir: 'vu', vouloir: 'voulu',
  prendre: 'pris', partir: 'parti',
};
// verbes conjugués avec être aux temps composés (le participe s'accorde avec le sujet)
export const AVEC_ETRE = new Set(['aller', 'venir', 'arriver', 'tomber', 'entrer', 'rentrer', 'monter', 'rester', 'partir']);
// verbes en -ir comme finir (2e groupe : nous finissons)
export const DEUXIEME_GROUPE = new Set([
  'finir', 'choisir', 'grandir', 'réussir', 'remplir', 'obéir', 'réfléchir', 'bâtir', 'nourrir', 'rougir', 'applaudir',
  'ralentir', 'atterrir', 'salir',
]);
// verbes en -er dont le radical change : è devant une syllabe muette, consonne doublée, y → i
const E_GRAVE = new Set(['acheter', 'lever', 'peser', 'enlever', 'promener', 'geler']);
const DOUBLE = new Set(['appeler', 'jeter', 'épeler', 'feuilleter', 'rappeler']);
const Y_I = new Set(['nettoyer', 'essuyer', 'employer', 'appuyer', 'tutoyer']);
// é → è devant une syllabe muette au présent seulement (le futur garde é : je préférerai)
const E_AIGU = new Set(['préférer', 'répéter', 'compléter', 'sécher', 'espérer']);

const TERMINAISONS = {
  present: ['e', 'es', 'e', 'ons', 'ez', 'ent'],
  presentIr: ['is', 'is', 'it', 'issons', 'issez', 'issent'],
  futur: ['ai', 'as', 'a', 'ons', 'ez', 'ont'],
  imparfait: ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'],
  simpleEr: ['ai', 'as', 'a', 'âmes', 'âtes', 'èrent'],
  simpleIr: ['is', 'is', 'it', 'îmes', 'îtes', 'irent'],
};
const MUETTES = new Set([0, 1, 2, 5]); // je, tu, il, ils : la terminaison ne se prononce pas (au présent)

/** Le radical d'un verbe en -er devant une terminaison (muette ou non) : j'achète, j'appelle, il nettoie. */
function radicalEr(verbe, muet) {
  const base = verbe.slice(0, -2);
  if (!muet) return base;
  if (E_GRAVE.has(verbe)) return base.replace(/e([^e]+)$/, 'è$1');
  if (DOUBLE.has(verbe)) return base + base.at(-1);
  if (Y_I.has(verbe)) return `${base.slice(0, -1)}i`;
  return base;
}

/** « mang » → « mange » devant a et o, « commenc » → « commenç » : le son reste le même. */
function douceur(radical, terminaison) {
  if (!/^[aâo]/.test(terminaison)) return radical;
  if (radical.endsWith('g')) return `${radical}e`;
  if (radical.endsWith('c')) return `${radical.slice(0, -1)}ç`;
  return radical;
}

/**
 * Le radical de l'imparfait : celui de « nous » au présent (nous finissons → finiss-, nous faisons →
 * fais-) ; pour les verbes en -er, le radical de l'infinitif (le e de « mangeais » revient seul).
 */
function radicalImparfait(verbe) {
  if (verbe === 'être') return 'ét';
  if (verbe.endsWith('er')) return verbe.slice(0, -2);
  return conjuguer(verbe, 'present', 3).replace(/ons$/, '');
}

/** Le participe passé (masculin singulier). */
export function participe(verbe) {
  if (PARTICIPES[verbe]) return PARTICIPES[verbe];
  if (verbe.endsWith('er')) return `${verbe.slice(0, -2)}é`;
  if (DEUXIEME_GROUPE.has(verbe)) return verbe.slice(0, -1);
  throw new Error(`participe inconnu : ${verbe}`);
}

/** Le participe accordé avec le sujet (verbes conjugués avec être) : arrivées, venus. */
export function participeAccorde(verbe, { genre = 'm', pluriel = false } = {}) {
  const p = participe(verbe);
  if (!AVEC_ETRE.has(verbe)) return p;
  return `${p}${genre === 'f' ? 'e' : ''}${pluriel ? 's' : ''}`;
}

/**
 * La forme du verbe : temps 'present', 'futur', 'imparfait', 'simple' (passé simple), 'compose'
 * (passé composé) ou 'pqp' (plus-que-parfait) ; `accord` : { genre, pluriel } du sujet.
 */
export function conjuguer(verbe, temps, personne, accord = {}) {
  if (temps === 'compose' || temps === 'pqp') {
    const aux = AVEC_ETRE.has(verbe) ? 'être' : 'avoir';
    return `${conjuguer(aux, temps === 'compose' ? 'present' : 'imparfait', personne)} ${participeAccorde(verbe, accord)}`;
  }
  const irr = IRREGULIERS[temps]?.[verbe];
  if (irr) return irr[personne];
  if (temps === 'futur') {
    if (FUTUR_IRREGULIER[verbe]) return FUTUR_IRREGULIER[verbe] + TERMINAISONS.futur[personne];
    // e muet du radical : j'achèterai, j'appellerai, je nettoierai (toutes les personnes)
    const radical = verbe.endsWith('er') && !E_AIGU.has(verbe) ? `${radicalEr(verbe, true)}er` : verbe;
    return (DEUXIEME_GROUPE.has(verbe) ? verbe : radical) + TERMINAISONS.futur[personne];
  }
  if (temps === 'imparfait') {
    const t = TERMINAISONS.imparfait[personne];
    return douceur(radicalImparfait(verbe), t) + t;
  }
  if (DEUXIEME_GROUPE.has(verbe)) {
    const base = verbe.slice(0, -2);
    return base + (temps === 'present' ? TERMINAISONS.presentIr : TERMINAISONS.simpleIr)[personne];
  }
  if (!verbe.endsWith('er')) throw new Error(`verbe non prévu : ${verbe} (${temps})`);
  if (temps === 'present') {
    const t = TERMINAISONS.present[personne];
    const muet = MUETTES.has(personne);
    const radical = E_AIGU.has(verbe) && muet ? verbe.slice(0, -2).replace(/é([^é]+)$/, 'è$1') : radicalEr(verbe, muet);
    return douceur(radical, t) + t;
  }
  if (temps === 'simple') {
    const t = TERMINAISONS.simpleEr[personne];
    return douceur(verbe.slice(0, -2), t) + t;
  }
  throw new Error(`temps inconnu : ${temps}`);
}

// ---------------------------------------------------------------- Les phrases

const PRONOMS = { je: 0, tu: 1, il: 2, elle: 2, on: 2, nous: 3, vous: 4, ils: 5, elles: 5 };
const FEMININS = ['elle', 'elles', 'la ', 'ma ', 'les filles', 'mes tantes', 'les voyageuses', 'les princesses', 'mes sœurs', 'sa sœur', 'ta sœur', 'les sorcières'];

/** Le sujet de la phrase : juste avant « _ » (après « Demain, »…), sans « ne » (« nous n'avons pas »). */
export function sujetDe(modele) {
  const avant = modele.slice(0, modele.indexOf(' _')).replace(/ n[e’]$/, '');
  return avant.includes(', ') ? avant.slice(avant.lastIndexOf(', ') + 2) : avant;
}

/** La personne, le genre et le nombre du sujet. */
export function accordDe(sujet) {
  const s = sujet.toLowerCase();
  const personne = s in PRONOMS ? PRONOMS[s]
    : /^(les|des|mes|tes|ses|nos|vos|leurs|ces) /.test(s) || / et /.test(s) ? 5 : 2;
  const genre = FEMININS.some((f) => s === f.trim() || s.startsWith(f)) ? 'f' : 'm';
  return { personne, genre, pluriel: personne >= 3 };
}

const voyelle = (mot) => /^[aeéèêiouyh]/i.test(mot);

/** Place la forme dans la phrase : « je » devient « j’ », « ne » devient « n’ » devant une voyelle. */
export function placer(modele, forme, montre = forme) {
  return modele
    .replace(/\b([Jj])e _/, (m, j) => (voyelle(forme) ? `${j}’${montre}` : `${j}e ${montre}`))
    .replace(/\bne _/, () => (voyelle(forme) ? `n’${montre}` : `ne ${montre}`))
    .replace('_', montre);
}

const IRREGULIERS_CE2 = ['faire', 'aller', 'dire', 'venir', 'pouvoir', 'voir', 'vouloir', 'prendre'];

// Niveau 1 : présent de faire, aller, dire, venir ; niveau 2 : pouvoir, voir, vouloir, prendre.
const PRESENT_1 = [
  ['faire', 'Tous les mercredis, je _ du judo.'], ['faire', 'En ce moment, tu _ un exposé sur les volcans.'],
  ['faire', 'Chaque été, mon oncle _ le tour de la Corse.'], ['faire', 'Aujourd’hui, nous _ une expérience en sciences.'],
  ['faire', 'Ce soir, vous _ la vaisselle.'], ['faire', 'Les maçons _ un mur de pierres.'],
  ['aller', 'Chaque samedi, je _ à la bibliothèque.'], ['aller', 'Cet après-midi, tu _ à la patinoire.'],
  ['aller', 'Le facteur _ de maison en maison.'], ['aller', 'Nous _ au musée avec la classe.'],
  ['aller', 'Vous _ trop vite !'], ['aller', 'Les cigognes _ en Afrique pour l’hiver.'],
  ['dire', 'Je _ toujours la vérité.'], ['dire', 'Tu _ bonjour au voisin.'], ['dire', 'Le maître _ que la sortie est annulée.'],
  ['dire', 'Nous _ merci au conducteur.'], ['dire', 'Vous _ des bêtises !'], ['dire', 'Mes parents _ que je grandis vite.'],
  ['venir', 'Je _ de Marseille.'], ['venir', 'Tu _ avec nous au cinéma ?'], ['venir', 'Ma cousine _ dîner ce soir.'],
  ['venir', 'Nous _ chercher le colis.'], ['venir', 'Vous _ de loin.'], ['venir', 'Les hirondelles _ au printemps.'],
];
const PRESENT_2 = [
  ['pouvoir', 'Je _ porter ce carton tout seul.'], ['pouvoir', 'Tu _ sortir en récréation.'], ['pouvoir', 'Le dauphin _ sauter très haut.'],
  ['pouvoir', 'Nous _ commencer l’exercice.'], ['pouvoir', 'Vous _ entrer.'], ['pouvoir', 'Les chats _ voir dans le noir.'],
  ['voir', 'Je _ la mer depuis ma fenêtre.'], ['voir', 'Tu _ bien le tableau ?'], ['voir', 'Le pilote _ la piste d’atterrissage.'],
  ['voir', 'Nous _ un arc-en-ciel.'], ['voir', 'Vous _ les étoiles filantes.'], ['voir', 'Les hiboux _ la nuit.'],
  ['vouloir', 'Je _ un chocolat chaud.'], ['vouloir', 'Tu _ jouer aux échecs ?'], ['vouloir', 'Mon frère _ devenir pompier.'],
  ['vouloir', 'Nous _ visiter le château.'], ['vouloir', 'Vous _ du pain ?'], ['vouloir', 'Les élèves _ une revanche.'],
  ['prendre', 'Je _ le bus pour aller à l’école.'], ['prendre', 'Tu _ ton parapluie.'], ['prendre', 'La cheffe _ une décision.'],
  ['prendre', 'Nous _ des notes.'], ['prendre', 'Vous _ le train de huit heures.'], ['prendre', 'Les touristes _ des photos.'],
];
// Niveau 3 : futur et passé composé des verbes irréguliers ([verbe, temps, phrase]).
const IRREGULIERS_FUTUR_COMPOSE = [
  ['faire', 'futur', 'Demain, je _ un gâteau.'], ['aller', 'futur', 'L’été prochain, nous _ en Bretagne.'],
  ['dire', 'futur', 'Demain, tu _ ta poésie.'], ['venir', 'futur', 'Samedi, mes cousins _ à la maison.'],
  ['pouvoir', 'futur', 'Bientôt, vous _ nager sans bouée.'], ['voir', 'futur', 'Demain, nous _ les dinosaures du musée.'],
  ['vouloir', 'futur', 'Plus tard, il _ sûrement un chien.'], ['prendre', 'futur', 'Demain, je _ le métro.'],
  ['faire', 'futur', 'Dans une semaine, elles _ un spectacle.'], ['aller', 'futur', 'Demain, tu _ chez le dentiste.'],
  ['venir', 'futur', 'Bientôt, le printemps _.'], ['prendre', 'futur', 'Ce soir, vous _ le dernier train.'],
  ['faire', 'compose', 'Hier, nous _ une randonnée.'], ['dire', 'compose', 'Ce matin, le directeur _ bonjour à tout le monde.'],
  ['voir', 'compose', 'Hier soir, je _ la Grande Ourse.'], ['prendre', 'compose', 'Hier, tu _ le bus.'],
  ['pouvoir', 'compose', 'La semaine dernière, nous _ visiter la caserne des pompiers.'], ['vouloir', 'compose', 'Hier, vous _ rester au chaud.'],
  ['aller', 'compose', 'Hier, la classe _ au zoo.'], ['venir', 'compose', 'Ce matin, ma tante _ à vélo.'],
  ['aller', 'compose', 'La semaine dernière, mes parents _ au marché.'], ['venir', 'compose', 'Hier, les filles _ à la fête.'],
  ['faire', 'compose', 'Ce matin, ils _ du bruit.'], ['voir', 'compose', 'Hier, elles _ un écureuil.'],
];
// Niveau 4 : verbes en -er et en -ir (comme finir), au présent, au futur, à l'imparfait et au passé composé.
const ER_IR = [
  ['finir', 'present', 'Je _ toujours mes repas.'], ['choisir', 'present', 'Tu _ un livre à la bibliothèque.'],
  ['grandir', 'present', 'Le bébé _ très vite.'], ['réussir', 'present', 'Nous _ le tour de magie.'],
  ['remplir', 'present', 'Vous _ la bouteille d’eau.'], ['obéir', 'present', 'Les chiens _ à leur maître.'],
  ['réfléchir', 'present', 'Je _ avant de répondre.'], ['applaudir', 'present', 'Les spectateurs _ les acrobates.'],
  ['finir', 'futur', 'Demain, nous _ le puzzle.'], ['choisir', 'futur', 'Bientôt, tu _ ton instrument de musique.'],
  ['bâtir', 'futur', 'L’an prochain, ils _ une nouvelle école.'], ['ralentir', 'futur', 'Au virage, la voiture _.'],
  ['finir', 'imparfait', 'Autrefois, les enfants _ l’école à quatre heures.'], ['nourrir', 'imparfait', 'Autrefois, nous _ les poules tous les matins.'],
  ['bâtir', 'imparfait', 'Autrefois, on _ les maisons en pierre.'], ['grandir', 'imparfait', 'À cette époque, tu _ à la campagne.'],
  ['réussir', 'compose', 'Hier, je _ mon exercice de géométrie.'], ['remplir', 'compose', 'Ce matin, vous _ le seau d’eau.'],
  ['choisir', 'compose', 'Hier, nous _ un film.'], ['atterrir', 'compose', 'Ce matin, l’avion _ à l’heure.'],
  ['chanter', 'futur', 'Demain, la chorale _ à l’église.'], ['travailler', 'imparfait', 'Autrefois, mon grand-père _ à la mine.'],
  ['écouter', 'compose', 'Hier, nous _ un conte africain.'], ['regarder', 'imparfait', 'À cette époque, ils _ la télévision en noir et blanc.'],
];
// Niveau 5 : les verbes en -er dont le radical change (nous mangeons, j'appelle, il achète, je nettoie).
const RADICAL = [
  ['manger', 'present', 'Nous _ à la cantine.'], ['nager', 'present', 'Nous _ dans la piscine.'], ['voyager', 'present', 'Nous _ en train.'],
  ['commencer', 'present', 'Nous _ la leçon.'], ['lancer', 'present', 'Nous _ le ballon.'], ['avancer', 'present', 'Nous _ lentement.'],
  ['manger', 'imparfait', 'Autrefois, je _ du pain trempé dans du lait.'], ['commencer', 'imparfait', 'À cette époque, l’école _ à huit heures.'],
  ['ranger', 'imparfait', 'Autrefois, tu _ tes jouets dans un coffre.'], ['lancer', 'imparfait', 'Autrefois, les chevaliers _ des défis.'],
  ['appeler', 'present', 'Je _ mon chien.'], ['jeter', 'present', 'Tu _ les papiers dans la poubelle.'],
  ['appeler', 'present', 'Les enfants _ leur mère.'], ['épeler', 'present', 'La maîtresse _ le mot difficile.'],
  ['acheter', 'present', 'Je _ du pain.'], ['lever', 'present', 'Tu _ le doigt.'], ['peser', 'present', 'Le marchand _ les pommes.'],
  ['acheter', 'present', 'Mes parents _ une voiture.'], ['nettoyer', 'present', 'Je _ mon vélo.'], ['essuyer', 'present', 'Tu _ la table.'],
  ['employer', 'present', 'Ils _ des mots savants.'], ['préférer', 'present', 'Je _ le chocolat.'], ['répéter', 'present', 'Elle _ sa poésie.'],
  ['appeler', 'futur', 'Demain, je _ ma grand-mère.'], ['acheter', 'futur', 'Demain, nous _ des cahiers.'],
  ['jeter', 'futur', 'Tout à l’heure, tu _ le vieux carton.'], ['nettoyer', 'futur', 'Demain, vous _ la cage du lapin.'],
  ['lever', 'futur', 'Bientôt, le soleil se _.'], ['essuyer', 'futur', 'Ce soir, ils _ la vaisselle.'],
];
// Niveau 6 : le futur et l'imparfait de tous les verbes.
const FUTUR_IMPARFAIT = [
  ['être', 'futur', 'Demain, nous _ en vacances.'], ['avoir', 'futur', 'L’an prochain, tu _ dix ans.'],
  ['faire', 'futur', 'Demain, il _ beau.'], ['aller', 'futur', 'Bientôt, je _ au collège.'],
  ['venir', 'futur', 'Demain, vous _ avec nous.'], ['voir', 'futur', 'Demain, ils _ la tour Eiffel.'],
  ['pouvoir', 'futur', 'Demain, je _ jouer dehors.'], ['finir', 'futur', 'Ce soir, tu _ ton livre.'],
  ['prendre', 'futur', 'Demain, nous _ l’avion.'], ['vouloir', 'futur', 'Plus tard, elles _ voyager.'],
  ['dire', 'futur', 'Demain, je te _ mon secret.'], ['grandir', 'futur', 'Cet été, les tournesols _.'],
  ['être', 'imparfait', 'Autrefois, la ville _ entourée de remparts.'], ['avoir', 'imparfait', 'À cette époque, nous _ un poney.'],
  ['faire', 'imparfait', 'Autrefois, on _ la lessive à la rivière.'], ['aller', 'imparfait', 'Autrefois, tu _ à l’école à pied.'],
  ['dire', 'imparfait', 'Autrefois, les gens _ « bonjour » à tout le monde.'], ['venir', 'imparfait', 'Chaque été, autrefois, mes cousins _ à la ferme.'],
  ['pouvoir', 'imparfait', 'Autrefois, on ne _ pas téléphoner de partout.'], ['voir', 'imparfait', 'À cette époque, je _ mes grands-parents chaque dimanche.'],
  ['vouloir', 'imparfait', 'Autrefois, vous _ toujours jouer au loup.'], ['prendre', 'imparfait', 'Autrefois, les voyageurs _ la diligence.'],
  ['finir', 'imparfait', 'À cette époque, nous _ l’école à seize heures.'], ['être', 'imparfait', 'Autrefois, les chevaliers _ très courageux.'],
];
// Niveau 7 : le passé composé (avec avoir ou avec être), à la forme affirmative ou négative.
const COMPOSE = [
  ['finir', 'Hier, nous _ nos exercices.'], ['prendre', 'Ce matin, je _ le bus.'], ['faire', 'Hier, tu _ une erreur.'],
  ['voir', 'La semaine dernière, nous _ une éclipse.'], ['dire', 'Hier, vous _ la vérité.'], ['choisir', 'Hier, elles _ une chanson.'],
  ['aller', 'Hier, ma sœur _ à la piscine.'], ['venir', 'Ce matin, les pompiers _ à l’école.'], ['arriver', 'Hier soir, mes tantes _ en retard.'],
  ['tomber', 'Ce matin, la neige _ sur la ville.'], ['rester', 'Hier, les filles _ à la maison.'], ['partir', 'Hier, le train _ à l’heure.'],
  ['monter', 'Hier, les voyageuses _ dans le car.'], ['entrer', 'Ce matin, le chat _ par la fenêtre.'],
  ['finir', 'Hier, nous ne _ pas nos exercices.'], ['prendre', 'Ce matin, je ne _ pas le bus.'], ['faire', 'Hier, tu ne _ pas d’erreur.'],
  ['voir', 'Hier, ils ne _ pas le match.'], ['aller', 'Hier, mon frère ne _ pas à la piscine.'], ['venir', 'Hier, mes cousines ne _ pas à la fête.'],
  ['pouvoir', 'Hier, je ne _ pas sortir.'], ['vouloir', 'Hier, vous ne _ pas jouer.'], ['réussir', 'Hier, il ne _ pas son tour de magie.'],
];
// Niveaux 8 et 9 : le passé simple (récits) ; 8 : il, elle, ils, elles ; 9 : toutes les personnes.
// Jamais une forme qui est aussi celle du présent (il finit, je dis) : la question ne vérifierait rien.
const SIMPLE_3 = [
  ['chanter', 'Ce soir-là, la reine _ pour ses invités.'], ['marcher', 'Le chevalier _ jusqu’au château.'],
  ['regarder', 'Soudain, le renard _ vers la forêt.'], ['commencer', 'Le lendemain, la pluie _ à tomber.'],
  ['manger', 'Le loup _ toute la galette.'], ['arriver', 'Un matin, un étrange voyageur _ au village.'],
  ['finir', 'Les géants _ leur repas en une bouchée.'], ['choisir', 'Les princesses _ les plus petits chevaux.'],
  ['être', 'Le roi _ très surpris.'], ['avoir', 'Le marin _ peur de la tempête.'], ['faire', 'La fée _ un vœu.'],
  ['aller', 'Le prince _ au bal.'], ['dire', 'Les magiciens _ une formule.'], ['venir', 'Un oiseau _ se poser sur sa main.'],
  ['pouvoir', 'Le chat _ enfin attraper la souris.'], ['voir', 'Le capitaine _ une île au loin.'], ['vouloir', 'La sorcière _ s’enfuir.'],
  ['prendre', 'Le chevalier _ son épée.'], ['chanter', 'Les oiseaux _ toute la nuit.'], ['marcher', 'Les soldats _ pendant des heures.'],
  ['finir', 'Les enfants _ par trouver la sortie.'], ['être', 'Les villageois _ très heureux.'], ['avoir', 'Les marins _ de la chance.'],
  ['faire', 'Les lutins _ la fête.'], ['dire', 'Ils _ adieu à leurs amis.'], ['venir', 'Les loups _ jusqu’au village.'],
  ['voir', 'Les explorateurs _ un volcan.'], ['prendre', 'Les pirates _ le trésor.'], ['vouloir', 'Elles _ partir à l’aventure.'],
  ['aller', 'Les trois frères _ chercher fortune.'], ['pouvoir', 'Les enfants _ rentrer chez eux.'], ['manger', 'Les ogres _ tout le festin.'],
];
const SIMPLE_TOUS = [
  ['marcher', 'Ce jour-là, je _ jusqu’à la rivière.'], ['chanter', 'Ce soir-là, tu _ pour la première fois.'],
  ['arriver', 'Nous _ au port à l’aube.'], ['regarder', 'Vous _ le spectacle en silence.'], ['terminer', 'Je _ mon travail avant la nuit.'],
  ['choisir', 'Nous _ le chemin le plus court.'], ['réussir', 'Vous _ à ouvrir le coffre.'], ['être', 'Je _ le premier à voir la terre.'],
  ['avoir', 'Nous _ très froid cette nuit-là.'], ['faire', 'Tu _ un rêve étrange.'], ['aller', 'Nous _ jusqu’au sommet.'],
  ['dire', 'Nous _ la vérité au roi.'], ['venir', 'Vous _ nous rendre visite.'], ['pouvoir', 'Nous _ enfin dormir.'],
  ['voir', 'Je _ une ombre passer.'], ['vouloir', 'Tu _ tout savoir.'], ['prendre', 'Nous _ la route du nord.'],
  ['manger', 'Nous _ au bord du lac.'], ['commencer', 'Vous _ le voyage sous la pluie.'], ['être', 'Vous _ les héros de la fête.'],
  ['avoir', 'Tu _ une drôle d’idée.'], ['faire', 'Nous _ un grand feu.'], ['voir', 'Vous _ la mer pour la première fois.'],
  ['prendre', 'Je _ la clé dans ma poche.'],
];
// Niveau 10 : le plus-que-parfait (une action passée avant une autre).
const PQP = [
  ['finir', 'Quand la cloche a sonné, nous _ nos exercices.'], ['partir', 'Quand nous sommes arrivés, le train _.'],
  ['manger', 'Quand je suis rentré, mon frère _ tous les gâteaux.'], ['prendre', 'La veille, tu _ ton billet.'],
  ['faire', 'Une heure plus tôt, vous _ vos valises.'], ['voir', 'Elles _ ce film la semaine d’avant.'],
  ['dire', 'Le maître _ que la sortie était annulée.'], ['être', 'La veille, il _ malade.'], ['avoir', 'Ce jour-là, nous _ de la chance.'],
  ['arriver', 'Quand le spectacle a commencé, mes tantes _.'], ['venir', 'La veille, les pompiers _ à l’école.'],
  ['aller', 'L’été d’avant, ma cousine _ en Italie.'], ['tomber', 'Pendant la nuit, la neige _.'],
  ['choisir', 'Avant la fête, je _ mon costume.'], ['réussir', 'La veille, tu _ ton examen.'], ['pouvoir', 'Avant l’orage, nous _ rentrer.'],
  ['vouloir', 'Ce jour-là, ils _ partir plus tôt.'], ['chanter', 'Avant le dîner, les enfants _ une chanson.'],
  ['regarder', 'Avant de dormir, je _ les étoiles.'], ['rester', 'La veille, les filles _ à la maison.'],
];

const NIVEAUX = [
  null,
  { temps: 'present', items: PRESENT_1 },
  { temps: 'present', items: PRESENT_2 },
  { items: IRREGULIERS_FUTUR_COMPOSE, avecTemps: true },
  { items: ER_IR, avecTemps: true },
  { items: RADICAL, avecTemps: true },
  { items: FUTUR_IMPARFAIT, avecTemps: true },
  { temps: 'compose', items: COMPOSE },
  { temps: 'simple', items: SIMPLE_3 },
  { temps: 'simple', items: SIMPLE_TOUS },
  { temps: 'pqp', items: PQP },
];

const NOMS_TEMPS = {
  present: 'au présent', futur: 'au futur', imparfait: 'à l’imparfait', compose: 'au passé composé', simple: 'au passé simple',
  pqp: 'au plus-que-parfait',
};
const nbsp = (text) => text.replace(/ ([?!:;])/g, ' $1');
const styleFor = (labels) => (labels.some((l) => l.length > 12) ? 'sentences' : 'words');

/**
 * Les mauvaises réponses, des plus trompeuses aux moins trompeuses : la même personne à un temps
 * voisin (au CM2, l'imparfait contre le passé simple : il chantait, il chanta), une autre personne
 * qui se prononce pareil (je finis, il finit), un participe mal accordé ou un mauvais auxiliaire.
 */
function pieges(verbe, temps, personne, accord) {
  const out = [];
  const add = (f) => { if (f && !out.includes(f)) out.push(f); };
  const voisins = {
    present: ['imparfait', 'futur'], futur: ['present', 'imparfait'], imparfait: ['simple', 'present', 'futur'],
    simple: ['imparfait', 'present'], compose: ['pqp'], pqp: ['compose'],
  }[temps];
  const autre = { 0: [1, 2], 1: [0, 2], 2: [0, 5], 3: [4, 5], 4: [3, 5], 5: [2, 3] }[personne];
  if (temps === 'compose' || temps === 'pqp') {
    const aux = AVEC_ETRE.has(verbe) ? 'être' : 'avoir';
    const autreAux = aux === 'être' ? 'avoir' : 'être';
    const tAux = temps === 'compose' ? 'present' : 'imparfait';
    const p = participe(verbe);
    // l'accord oublié (ou mis à tort), l'autre auxiliaire, l'autre temps, un participe en -er
    if (AVEC_ETRE.has(verbe)) {
      add(`${conjuguer(aux, tAux, personne)} ${p}`);
      add(`${conjuguer(aux, tAux, personne)} ${participeAccorde(verbe, { genre: accord.genre === 'f' ? 'm' : 'f', pluriel: accord.pluriel })}`);
    } else if (/[éi]$/.test(p)) add(`${conjuguer(aux, tAux, personne)} ${p.endsWith('é') ? `${p.slice(0, -1)}er` : `${p}t`}`);
    add(`${conjuguer(autreAux, tAux, personne)} ${p}`);
    for (const t of voisins) add(conjuguer(verbe, t, personne, accord));
    return out;
  }
  for (const t of voisins) add(conjuguer(verbe, t, personne, accord));
  for (const p of autre) add(conjuguer(verbe, temps, p, accord));
  return out;
}

/** « ne » devant l'auxiliaire : « n’avons », « ne sommes ». */
const ne = (mot) => (voyelle(mot) ? `n’${mot}` : `ne ${mot}`);

function questionConjugaison(level, rng) {
  const def = NIVEAUX[level];
  const [verbe, tempsItem, modeleItem] = pick(rng, def.items);
  const temps = def.avecTemps ? tempsItem : def.temps;
  const modele = def.avecTemps ? modeleItem : tempsItem;
  const accord = accordDe(sujetDe(modele));
  const juste = conjuguer(verbe, temps, accord.personne, accord);
  // la forme négative : la négation entoure l'auxiliaire (« nous n’avons pas fini ») ; les pièges la
  // placent mal (« n’avons fini pas », « ne pas avons fini »)
  const negatif = /\bne _ pas\b/.test(modele);
  const phraseModele = negatif ? modele.replace(' ne _ pas', ' _') : modele;
  let formes;
  if (negatif) {
    const [aux, part] = juste.split(' ');
    formes = [`${ne(aux)} pas ${part}`, `${ne(aux)} ${part} pas`, `ne pas ${aux} ${part}`];
  } else {
    const combien = level <= 3 ? 3 : 4;
    formes = [juste, ...pieges(verbe, temps, accord.personne, accord).filter((f) => f !== juste)].slice(0, combien);
  }
  const reponse = formes[0];
  const phrase = placer(phraseModele, reponse);
  const labels = shuffle(rng, formes);
  const consigne = negatif ? `Conjugue le verbe ${NOMS_TEMPS[temps]}, à la forme négative.` : `Conjugue le verbe ${NOMS_TEMPS[temps]}.`;
  return {
    key: `conjugaison-cm:${level}:${modele}`,
    text: consigne,
    instruction: [consigne, 'Choisis la bonne forme.'],
    short: { key: `conjugaison-cm:${temps}:${negatif}`, text: 'Quelle forme ?', speak: consigne },
    stage: { type: 'sentence', text: nbsp(placer(phraseModele, reponse, `… (${verbe})`)) },
    choices: textChoices(labels),
    choiceStyle: styleFor(labels),
    answer: reponse,
    success: { speak: nbsp(phrase) },
  };
}

export const conjugaisonCm = {
  id: 'conjugaison-cm',
  domain: 'francais',
  section: 'Grammaire',
  title: 'Conjugaison du CM',
  icon: '📜',
  skill: 'Conjuguer les verbes du programme au présent, au futur, à l’imparfait, au passé composé, au passé simple et au plus-que-parfait',
  levels: [
    'Présent : faire, aller, dire, venir', 'Présent : pouvoir, voir, vouloir…', 'Futur et passé composé (faire…)',
    'Verbes en -er et en -ir', 'Verbes en -er qui changent', 'Futur et imparfait', 'Passé composé et négation',
    'Passé simple : il, ils', 'Passé simple : je, tu, nous…', 'Le plus-que-parfait',
  ],
  generate(level, rng) {
    return questionConjugaison(level, rng);
  },
};

export const IRREGULIERS_PROGRAMME = IRREGULIERS_CE2;
