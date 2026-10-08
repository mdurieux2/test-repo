// Textes déchiffrables (CP) : les sons déjà vus en classe, cochés par les parents, et un analyseur
// qui découpe un mot en graphèmes (ch, ou, an, eau, ill…) pour savoir si l'enfant peut le lire seul.
//
// - SONS : les graphèmes d'une méthode de lecture, dans l'ordre habituel d'une année de CP.
// - decouper(mot) : les graphèmes du mot, chacun avec les sons qu'il demande ; les lettres muettes
//   de la fin (chat, souris, grand, lune) ne demandent rien, sauf le h muet (son « h »).
// - estDechiffrable(mot, sons), texteDechiffrable(texte, sons) : avec le réglage de l'enfant
//   ({ vus: [...], outils: [...] }), le mot se lit avec les sons vus, ou c'est un mot-outil appris
//   par cœur (le, la, est…). Sans réglage (ou rien de coché), tout est permis.
// - garderDechiffrables(liste, sons, textes, { min }) : le filtre des jeux de lecture ; s'il reste
//   moins de `min` éléments, la liste entière (comportement habituel, jamais d'écran vide).
// Tout est pur (pas de DOM) : les jeux reçoivent le réglage par leur contexte (ctx.sons).

import { muettesMot } from './syllabes.js';

/**
 * Les sons de la méthode de lecture, dans l'ordre de progression : [id, libellé, exemple, groupe].
 * Groupes : voyelles, consonnes, sons (plusieurs lettres pour un son), lettres qui changent de son.
 */
const LISTE = [
  ['a', 'a', 'papa', 'voyelles'], ['i', 'i, y', 'lit', 'voyelles'], ['o', 'o', 'moto', 'voyelles'],
  ['u', 'u', 'lune', 'voyelles'], ['é', 'é', 'bébé', 'voyelles'], ['e', 'e', 'le, cheval', 'voyelles'],
  ['l', 'l', 'lit', 'consonnes'], ['m', 'm', 'mur', 'consonnes'], ['r', 'r', 'rat', 'consonnes'],
  ['s', 's', 'sac', 'consonnes'], ['f', 'f', 'fil', 'consonnes'], ['v', 'v', 'vélo', 'consonnes'],
  ['p', 'p', 'papa', 'consonnes'], ['t', 't', 'tapis', 'consonnes'], ['n', 'n', 'nid', 'consonnes'],
  ['d', 'd', 'dé', 'consonnes'], ['ch', 'ch', 'chat', 'sons'], ['ou', 'ou', 'loup', 'sons'],
  ['b', 'b', 'bébé', 'consonnes'], ['j', 'j', 'judo', 'consonnes'], ['c', 'c, k', 'car, kiwi', 'consonnes'],
  ['on', 'on, om', 'bonbon', 'sons'], ['an', 'an, en, am, em', 'maman, dent', 'sons'],
  ['g', 'g', 'gare', 'consonnes'], ['in', 'in, im, un', 'lapin', 'sons'], ['oi', 'oi', 'roi', 'sons'],
  ['z', 'z', 'zéro', 'consonnes'], ['qu', 'qu', 'quatre', 'consonnes'], ['eu', 'eu, œu', 'feu, cœur', 'sons'],
  ['è', 'è, ê, e (elle)', 'mère, tête', 'sons'], ['ai', 'ai, ei', 'lait, neige', 'sons'],
  ['au', 'au, eau', 'auto, bateau', 'sons'], ['h', 'h (muet)', 'hibou', 'changent'],
  ['se', 's = z', 'rose', 'changent'], ['ce', 'c = s (ce, ci, ç)', 'cerise, leçon', 'changent'],
  ['ge', 'g = j (ge, gi)', 'girafe', 'changent'], ['gu', 'gu (gue, gui)', 'guitare', 'changent'],
  ['er', 'er, ez = é', 'manger, nez', 'changent'], ['gn', 'gn', 'montagne', 'sons'],
  ['ill', 'ill, ail, eil', 'fille, soleil', 'sons'], ['ph', 'ph', 'photo', 'sons'],
  ['ain', 'ain, ein', 'main, peinture', 'sons'], ['oin', 'oin', 'coin', 'sons'], ['ien', 'ien', 'chien', 'sons'],
  ['x', 'x', 'taxi', 'consonnes'], ['y', 'y (crayon)', 'crayon', 'changent'], ['tion', 'tion', 'addition', 'sons'],
  ['w', 'w', 'wagon', 'consonnes'],
];

export const SONS = LISTE.map(([id, label, exemple, groupe]) => ({ id, label, exemple, groupe }));
export const SON_IDS = SONS.map((s) => s.id);
export const GROUPES_SONS = [
  ['voyelles', 'Les voyelles'], ['consonnes', 'Les consonnes'], ['sons', 'Les sons de plusieurs lettres'],
  ['changent', 'Les lettres qui changent de son'],
];

/** Mots-outils appris par cœur, proposés par défaut (les parents peuvent changer la liste). */
export const MOTS_OUTILS = ['le', 'la', 'les', 'un', 'une', 'et', 'est', 'il', 'elle', 'je', 'de', 'des', 'du', 'au', 'dans', 'avec', 'pour', 'qui'];
export const OUTILS_MAX = 60;

// ---------------------------------------------------------------- Le réglage de l'enfant

/** Liste de mots-outils nettoyée : minuscules, lettres seulement, sans doublon. */
export function cleanOutils(list) {
  const words = (Array.isArray(list) ? list : String(list ?? '').split(/[\s,;]+/))
    .map((w) => normaliser(w).replace(/[^\p{L}'-]/gu, ''))
    .filter((w) => w && w.length <= 20);
  return [...new Set(words)].slice(0, OUTILS_MAX);
}

/** Réglage enregistré avec l'enfant : { vus: [ids dans l'ordre du programme], outils: [...] ou null (liste conseillée) }. */
export function cleanSons(value) {
  const v = value && typeof value === 'object' ? value : {};
  const vus = Array.isArray(v.vus) ? SON_IDS.filter((id) => v.vus.includes(id)) : [];
  return { vus, outils: Array.isArray(v.outils) ? cleanOutils(v.outils) : null };
}

/** Ce que reçoivent les jeux (ctx.sons) : rien si aucun son n'est coché (« tout est permis »). */
export function contexteSons(child) {
  const { vus, outils } = cleanSons(child?.sons);
  return vus.length ? { vus, outils: outils ?? MOTS_OUTILS } : undefined;
}

/** Les sons cochés, pour le Suivi : « a, i, o… (7 sur 48) », ou null si le réglage n'est pas utilisé. */
export function resumeSons(child) {
  const { vus } = cleanSons(child?.sons);
  if (!vus.length) return null;
  const labels = vus.map((id) => SONS.find((s) => s.id === id).label.replace(/ \(.*\)$/, ''));
  return `${labels.join(' · ')} (${vus.length} sur ${SONS.length})`;
}

// ---------------------------------------------------------------- Découpage en graphèmes

const VOYELLES = 'aeiouyàâäéèêëîïôöùûüœ';
const isV = (c) => Boolean(c) && VOYELLES.includes(c);
const DOUX = 'eiyéèêëîï'; // c et g devant e, i, y : c = s, g = j
const OBSTRUANTES = 'bcdfgkptv'; // + r ou l : un groupe qui se lit d'un trait (secret, regret)
// ll prononcé « l » (ville, mille…) : ce n'est pas le son de fille
const LL_L = /^(mill|vill|lill|gill)|tranquill|oscill|distill|ville?s?$/;
const SIMPLE = {
  a: 'a', à: 'a', â: 'a', ä: 'a', i: 'i', î: 'i', ï: 'i', y: 'i', o: 'o', ô: 'o', ö: 'o', u: 'u', û: 'u', ù: 'u', ü: 'u',
  é: 'é', è: 'è', ê: 'è', ë: 'è', œ: 'eu', k: 'c', q: 'qu', ç: 'ce', w: 'w', x: 'x', h: 'h',
};
// mots dont la lecture ne suit pas les règles : [graphème, sons séparés par des virgules ('' : muet)]
const EXCEPTIONS = {
  femme: [['f', 'f'], ['e', 'a'], ['mm', 'm'], ['e', '']],
  oignon: [['oi', 'o'], ['gn', 'gn'], ['on', 'on']],
  second: [['s', 's'], ['e', 'e'], ['c', 'g'], ['on', 'on'], ['d', '']],
  monsieur: [['m', 'm'], ['on', 'e'], ['s', 's'], ['i', 'i'], ['eu', 'eu'], ['r', '']],
};

/** Minuscules, accents composés, apostrophe droite. */
export function normaliser(mot) {
  return String(mot ?? '').normalize('NFC').toLowerCase().replace(/[’ʼ]/g, "'").trim();
}

/**
 * Découpe un mot en graphèmes : [{ g: 'ch', sons: ['ch'], muet: false }, …].
 * `syllabe: true` : une syllabe isolée (« as », « ran »), sans lettre muette.
 */
export function decouper(mot, { syllabe = false } = {}) {
  const w = normaliser(mot);
  if (EXCEPTIONS[w]) return EXCEPTIONS[w].map(([g, s]) => ({ g, sons: s ? s.split(',') : [], muet: !s }));
  const L = w.length;
  const muettes = syllabe ? new Set() : muettesMot(w);
  const llL = LL_L.test(w);
  const out = [];
  let voyelle = false; // une voyelle déjà prononcée (le e final est alors muet : lune, pomme)
  let i = 0;
  const at = (k) => w[i + k];
  const s = (n) => w.slice(i, i + n);
  // après la position k, plus que des lettres muettes (ou rien)
  const finDes = (k) => { for (let j = k; j < L; j++) if (!muettes.has(j)) return false; return true; };
  const fin = (n) => finDes(i + n);
  const push = (n, sons, muet = false) => {
    out.push({ g: w.slice(i, i + n), sons, muet });
    if (!muet && n && isV(w[i]) && sons.length) voyelle = true;
    i += n;
  };
  // son nasal (an, on, in…) : pas devant une voyelle, ni devant n ou m (bonne, pomme, année)
  const nasale = (n) => !isV(at(n)) && !'nm'.includes(at(n) ?? '·');
  // am, em, om, im, um : seulement devant b, p, ou à la fin (jambe, pompe, nom, parfum)
  const nasaleM = (n) => nasale(n) && (!at(n) || 'bp'.includes(at(n)) || fin(n));

  while (i < L) {
    const c = w[i];
    // ---- lettres muettes
    if (muettes.has(i)) {
      if (c === 'h') { push(1, ['h'], true); continue; }
      let j = i;
      while (j < L && muettes.has(j) && w[j] !== 'h') j++;
      push(j - i, [], true);
      continue;
    }
    if (c === "'" || c === '-') { push(1, []); continue; }

    if (isV(c)) {
      // ---- les sons « ill » derrière une voyelle (œil, feuille, grenouille, travail, soleil)
      if (s(3) === 'œil' || s(4) === 'oeil') { push(c === 'œ' ? 3 : 4, ['eu', 'ill']); continue; }
      if (s(5) === 'euill' || (s(4) === 'euil' && fin(4))) { push(s(5) === 'euill' ? 5 : 4, ['eu', 'ill']); continue; }
      if ('cg'.includes(w[i - 1] ?? '·') && (s(5) === 'ueill' || (s(4) === 'ueil' && fin(4)))) { push(s(5) === 'ueill' ? 5 : 4, ['eu', 'ill']); continue; }
      if (s(5) === 'ouill' || (s(4) === 'ouil' && fin(4))) { push(s(5) === 'ouill' ? 5 : 4, ['ou', 'ill']); continue; }
      if (s(4) === 'aill' || (s(3) === 'ail' && fin(3))) { push(s(4) === 'aill' ? 4 : 3, ['a', 'ill']); continue; }
      if (s(4) === 'eill' || (s(3) === 'eil' && fin(3))) { push(s(4) === 'eill' ? 4 : 3, ['ill']); continue; }
      if (s(3) === 'ill' && i > 0 && !llL) { push(3, ['ill']); continue; }
      // ---- sons de trois lettres
      if (s(3) === 'ien' && i > 0 && nasale(3)) { push(3, ['ien']); continue; }
      if (s(3) === 'oin' && nasale(3)) { push(3, ['oi', 'in']); continue; }
      if ((s(3) === 'ain' || s(3) === 'ein') && nasale(3)) { push(3, ['ain']); continue; }
      if ((s(3) === 'aim' || s(3) === 'eim') && nasaleM(3)) { push(3, ['ain']); continue; }
      if (s(3) === 'eau') { push(3, ['au']); continue; }
      if (s(2) === 'œu' || s(3) === 'oeu') { push(c === 'œ' ? 2 : 3, ['eu']); continue; }
      // ---- y entre deux voyelles : crayon (ai + i), noyau (oi + i), tuyau ; au début : yeux
      if ('aou'.includes(c) && at(1) === 'y' && isV(at(2))) { push(2, [{ a: 'ai', o: 'oi', u: 'u' }[c], 'y']); continue; }
      if (c === 'y' && i === 0 && isV(at(1))) { push(1, ['y']); continue; }
      if (c === 'e' && at(1) === 'y') { push(2, ['è']); continue; } // poney
      // ---- sons de deux lettres
      const deux = s(2);
      if (deux === 'ou' || deux === 'où' || deux === 'oû') { push(2, ['ou']); continue; }
      if (deux === 'oi' || deux === 'oî') { push(2, ['oi']); continue; }
      if (deux === 'eu' || deux === 'eû') { push(2, ['eu']); continue; }
      if (deux === 'ai' || deux === 'aî' || deux === 'ei' || deux === 'eî') { push(2, ['ai']); continue; }
      if (deux === 'au') { push(2, ['au']); continue; }
      if ((deux === 'an' || deux === 'en') && nasale(2)) { push(2, ['an']); continue; }
      if ((deux === 'am' || deux === 'em') && nasaleM(2)) { push(2, ['an']); continue; }
      if (deux === 'on' && nasale(2)) { push(2, ['on']); continue; }
      if (deux === 'om' && nasaleM(2)) { push(2, ['on']); continue; }
      if ((deux === 'in' || deux === 'yn' || deux === 'un') && nasale(2)) { push(2, ['in']); continue; }
      if ((deux === 'im' || deux === 'ym' || deux === 'um') && nasaleM(2)) { push(2, ['in']); continue; }
      // ---- la lettre e
      if (c === 'e') {
        if (fin(1)) {
          // e suivi seulement de lettres muettes : lune, pommes (muet) ; le, je ; les, des ; et, est ; manger, nez, pied
          const queue = w.slice(i + 1);
          if (queue === '' || queue === 's') {
            if (voyelle && !syllabe) push(1, [], true);
            else push(1, [queue ? 'é' : 'e']);
          } else if (queue[0] === 't' || queue === 'st') push(1, ['è']);
          else if ('rzd'.includes(queue[0])) push(1, ['er']);
          else push(1, ['e']);
          continue;
        }
        const [n1, n2] = [at(1), at(2)];
        if (n1 === 'x') { push(1, ['è']); continue; }
        if (n1 && !isV(n1)) {
          const doubleC = n2 === n1;
          const groupe = ['ch', 'ph', 'th', 'gn'].includes(n1 + n2) || (OBSTRUANTES.includes(n1) && 'rl'.includes(n2 ?? '·'));
          // deux consonnes (elle, merci, escargot) ou une consonne finale prononcée (sel, mer, bec) : è
          if (doubleC || (n2 && !isV(n2) && !groupe) || (!n2 || finDes(i + 2))) { push(1, ['è']); continue; }
        }
        push(1, ['e']); // cheval, petit, melon
        continue;
      }
      push(1, [SIMPLE[c]]);
      continue;
    }

    // ---- consonnes
    const deux = s(2);
    if (s(4) === 'tion' && i > 0 && w[i - 1] !== 's' && nasale(4)) { push(4, ['tion']); continue; } // pas question
    if (deux === 'ch') { push(2, 'rl'.includes(at(2) ?? '·') ? ['c'] : ['ch']); continue; } // chr, chl : ch = k (chrome)
    if (deux === 'sh') { push(2, ['ch']); continue; }
    if (deux === 'ph') { push(2, ['ph']); continue; }
    if (deux === 'th') { push(2, ['t', 'h']); continue; }
    if (deux === 'gn') { push(2, ['gn']); continue; }
    if (deux === 'ck') { push(2, ['c']); continue; }
    if (deux === 'qu') { push(2, ['qu']); continue; }
    if (deux === 'gu' && DOUX.includes(at(2) ?? '·')) { push(2, ['gu']); continue; }
    if (deux === 'ge' && 'aoâôu'.includes(at(2) ?? '·')) { push(2, ['ge']); continue; } // pigeon
    if (deux === 'cc') { push(2, DOUX.includes(at(2) ?? '·') ? ['c', 'ce'] : ['c']); continue; }
    if (deux === 'gg') { push(2, ['g']); continue; }
    if (deux === 'ss') { push(2, ['s']); continue; }
    if (c === 'c') { push(1, [DOUX.includes(at(1) ?? '·') ? 'ce' : 'c']); continue; }
    if (c === 'g') { push(1, [DOUX.includes(at(1) ?? '·') ? 'ge' : 'g']); continue; }
    if (c === 's') { push(1, [isV(w[i - 1]) && isV(at(1)) ? 'se' : 's']); continue; }
    if (SIMPLE[c]) { push(1, [SIMPLE[c]]); continue; }
    if (/[bdfjlmnprtvz]/.test(c)) { push(at(1) === c ? 2 : 1, [c]); continue; }
    push(1, ['?']); // chiffre, signe inconnu : jamais déchiffrable
  }
  return out;
}

/** Les sons qu'il faut connaître pour lire le mot (ensemble d'identifiants de SONS). */
export function sonsDuMot(mot, options) {
  return new Set(decouper(mot, options).flatMap((g) => g.sons));
}

// ---------------------------------------------------------------- Mots et textes déchiffrables

// mots élidés (l', d', j'…) : déchiffrables si leur forme entière est un mot-outil, ou si l'on connaît la consonne
const ELISIONS = { l: ['le', 'la'], d: ['de'], j: ['je'], n: ['ne'], s: ['se', 'si'], c: ['ce'], qu: ['que'], m: ['me'], t: ['te'] };

const actif = (sons) => Boolean(sons && Array.isArray(sons.vus) && sons.vus.length);
const lecteurs = new Map();

/** Un lecteur pour un réglage : mots et textes déchiffrables, avec mémoire des mots déjà vus. */
function lecteur(sons) {
  const cle = `${sons.vus.join(',')}|${(sons.outils ?? MOTS_OUTILS).join(',')}`;
  if (lecteurs.has(cle)) return lecteurs.get(cle);
  const vus = new Set(sons.vus);
  const outils = new Set(cleanOutils(sons.outils ?? MOTS_OUTILS));
  const memo = new Map();
  const connu = (w, options) => [...sonsDuMot(w, options)].every((id) => vus.has(id));
  const mot = (brut) => {
    const w = normaliser(brut);
    if (!w || outils.has(w)) return true;
    if (memo.has(w)) return memo.get(w);
    let ok;
    const apo = w.indexOf("'");
    if (apo > 0) {
      const debut = w.slice(0, apo);
      const okDebut = (ELISIONS[debut] || []).some((x) => outils.has(x)) || connu(debut === 'c' ? 'ce' : debut, { syllabe: true });
      ok = okDebut && mot(w.slice(apo + 1));
    } else ok = connu(w);
    memo.set(w, ok);
    return ok;
  };
  const self = {
    mot,
    syllabe: (syl) => connu(syl, { syllabe: true }),
    texte: (texte) => motsDuTexte(texte).every(mot),
  };
  if (lecteurs.size > 20) lecteurs.clear();
  lecteurs.set(cle, self);
  return self;
}

/** Les mots d'un texte (les nombres écrits en chiffres et les emoji ne comptent pas). */
export function motsDuTexte(texte) {
  return String(texte ?? '').match(/[\p{L}][\p{L}'’]*/gu) || [];
}

/** Le mot se lit-il avec les sons vus (ou est-ce un mot-outil) ? Sans réglage : oui. */
export function estDechiffrable(mot, sons) {
  return !actif(sons) || lecteur(sons).mot(mot);
}

/** Une syllabe isolée (« al », « tra ») se lit-elle avec les sons vus ? */
export function syllabeDechiffrable(syllabe, sons) {
  return !actif(sons) || lecteur(sons).syllabe(syllabe);
}

/** Tous les mots du texte se lisent-ils avec les sons vus ? */
export function texteDechiffrable(texte, sons) {
  return !actif(sons) || lecteur(sons).texte(texte);
}

/**
 * Le filtre des jeux de lecture : les éléments dont tous les textes (`textes(élément)` : un texte
 * ou une liste) sont déchiffrables. S'il en reste moins de `min`, la liste entière, inchangée.
 * `syllabe: true` : les textes sont des syllabes isolées (sans lettre muette).
 */
export function garderDechiffrables(items, sons, textes = (x) => x, { min = 1, syllabe = false } = {}) {
  if (!actif(sons)) return items;
  const lire = lecteur(sons);
  const ok = syllabe ? lire.syllabe : lire.texte;
  const gardes = items.filter((item) => [].concat(textes(item)).every((t) => ok(t)));
  return gardes.length >= min ? gardes : items;
}

/** Le réglage est-il utilisé (au moins un son coché) ? */
export const sonsActifs = actif;
