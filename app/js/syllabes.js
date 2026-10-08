// Syllabes colorées (réglage d'accessibilité « syllables ») : découpage du français écrit en
// syllabes, à la manière des classes de CP et de LireCouleur. Les syllabes alternent deux
// couleurs (et un petit arc dessous), les lettres muettes sûres sont en gris.
//
// Conventions (syllabes écrites, celles qu'on montre aux lecteurs débutants) :
//  - les sons écrits à plusieurs lettres restent ensemble : ou, on, an, en, in, ain, ein, oin,
//    oi, eau, au, ai, ei, eu, œu, ui, ch, ph, th, gn, qu, gu (devant e, i), ge (devant a, o, u), ill… ;
//  - une consonne entre deux voyelles commence la syllabe suivante : ma-man, é-co-le ;
//  - deux consonnes se séparent (pom-me, par-tir), sauf consonne + r ou l (ta-ble, li-vre) ;
//  - « i » devant une voyelle se lie à elle (pa-pier, ca-mion, chien), sauf après consonne + r ou l
//    (cri-er, ou-bli-er) ; « ill » et « y » entre deux voyelles commencent la syllabe (fi-lle, cra-yon) ;
//  - le « e » final après consonne forme une syllabe écrite (pom-me, ta-ble) mais pas une syllabe
//    orale (voir syllabesOrales) ; après une voyelle il est muet et reste avec elle (a-mie, crai(e)).
// Lettres muettes marquées (seulement les cas sûrs) : h seul (homme), e final après voyelle (amie),
// consonnes finales muettes (chat, pied, loup, nez, temps, grand, long), -er des infinitifs et des
// noms en -ier (manger, papier), -ent des verbes après une voyelle (jouent) ou après ils/elles
// (ils mangent). Un mot qu'on ne sait pas lire à coup sûr (plus, tous, fils, six…) n'a pas de gris.

const VOYELLES = 'aeiouyàâäéèêëîïôöùûüÿœæáíóú';
const LETTRE = /[\p{L}]/u;
const APOSTROPHES = '\'’ʼ';

const isV = (c) => Boolean(c) && VOYELLES.includes(c);
const isLettre = (c) => c !== undefined && LETTRE.test(c);
const isApo = (c) => c !== undefined && APOSTROPHES.includes(c);

// ---------------------------------------------------------------- Lettres muettes

const liste = (s) => new Set(s.trim().split(/\s+/));

// s ou x final prononcé (ou incertain : plus, tous, fils, six, dix…)
const S_PRONONCE = liste(`
  bus autobus abribus airbus os ours mars as hélas tennis maïs jadis iris oasis atlas cactus virus bonus lotus campus
  terminus sens fils plus tous vis lis express cassis myosotis hibiscus albatros rhinocéros ananas métis gratis papyrus
  humérus eucalyptus octopus sinus prospectus lapsus focus rébus crocus tournevis mœurs moeurs lys pancréas bis vénus
  cosmos aloès inès agnès lucas marcus jonas elias ilyas anaïs mathis atlas kermès six dix index lynx box fax max relax
  silex thorax larynx sphinx phénix coccyx félix alex obélix astérix
`);
const T_PRONONCE = liste(`
  sept huit net cet but août aout chut zut dot mat brut scout short foot basket internet kit transit granit déficit
  yaourt rut ut flirt smart start skate accessit coït
`);
const D_PRONONCE = liste('sud david alfred madrid bled raid plaid bagdad lad caïd tchad end stand');
const P_PRONONCE = liste('cap stop top hop slip cep handicap ketchup gap clap flip flop pop rap jeep ship hip');
const Z_PRONONCE = liste('gaz quiz fez oz rodez suez berlioz booz');
const G_PRONONCE = liste('gong pong ping bang gang boomerang slang tong ding dong kong yang');
const C_MUET = liste('blanc banc franc flanc tabac estomac porc caoutchouc croc escroc tronc jonc accroc ajonc marc clerc');
const L_MUET = liste('gentil outil fusil sourcil nombril persil coutil');
const F_MUET = liste('clef cerf nerf');
// mots en -er dont le r se prononce (mer, hiver, super…)
const R_PRONONCE = liste(`
  mer fer ver cher fier hier amer hiver super enfer laser cancer poster hamster revolver jupiter scooter master starter
  reporter joker bunker hamburger leader freezer mixer gangster cocker corner dealer shaker cluster esther peter eider
  polder tender blazer poker rocker hacker éther ether geyser niger boxer docker spider cutter tier over
  enver traver univer diver rever perver
`);
// noms et adjectifs en -ient (le « ent » se prononce) : les verbes (ils crient, ils oublient) ont « ent » muet
const IENT_PRONONCE = liste('client patient ingrédient orient récipient quotient inconvénient expédient efficient coefficient');
// mots particuliers : les lettres muettes entre parenthèses
const MUETTES_PARTICULIERES = {
  est: 'e(st)', doigt: 'doi(gt)', doigts: 'doi(gts)', vingt: 'vin(g)t', vingts: 'vin(gts)', sept: 'se(p)t', septième: 'se(p)tième',
  baptême: 'ba(p)tême', œufs: 'œu(fs)', oeufs: 'oeu(fs)', bœufs: 'bœu(fs)', boeufs: 'boeu(fs)', pouls: 'pou(ls)',
  aspect: 'aspe(ct)', respect: 'respe(ct)', instinct: 'instin(ct)', oignon: 'o(i)gnon', oignons: 'o(i)gnon(s)',
  monsieur: 'monsieu(r)', messieurs: 'messieu(rs)',
};

/** Indices des lettres muettes dans un mot en minuscules (sans apostrophe ni trait d'union). */
function muettesMot(w, opts = {}) {
  const muettes = new Set();
  const L = w.length;
  if (L < 2) return muettes;
  const special = MUETTES_PARTICULIERES[w];
  if (special) {
    let k = 0;
    let dedans = false;
    for (const c of special) {
      if (c === '(') dedans = true;
      else if (c === ')') dedans = false;
      else {
        if (dedans) muettes.add(k);
        k++;
      }
    }
    return muettes;
  }
  // h seul (pas dans ch, ph, sh, th, rh, gh, kh) : jamais prononcé
  for (let i = 0; i < L; i++) {
    if (w[i] === 'h' && (!'cpstrgk'.includes(w[i - 1] ?? '·') || desH(w, i))) muettes.add(i);
  }
  // p muet de compter, comptine, dompter, sculpter
  for (const racine of ['compt', 'dompt', 'sculpt']) {
    const at = w.indexOf(racine);
    if (at >= 0) muettes.add(at + racine.length - 2);
  }
  // u de « gu », « qu » : une consonne, pas une voyelle
  const voyelleEn = (i) => isV(w[i]) && !(w[i] === 'u' && (w[i - 1] === 'g' || w[i - 1] === 'q'));

  // -ent des verbes : après une voyelle (jouent, étaient, crient), ou après ils / elles (ils mangent)
  if (L > 3 && w.endsWith('ent')) {
    const avant = L - 4;
    const ient = w.endsWith('ient');
    const verbe = opts.pluriel3
      || (voyelleEn(avant) && !(ient && (IENT_PRONONCE.has(w) || w.endsWith('vient') || w.endsWith('tient'))));
    if (verbe) {
      muettes.add(L - 3).add(L - 2).add(L - 1);
      return muettes;
    }
  }
  let pos = L - 1;
  const base = w.endsWith('s') || w.endsWith('x') ? w.slice(0, -1) : w;
  // s ou x final (le pluriel, mais aussi pas, souris, deux, prix…)
  if ((w[pos] === 's' || w[pos] === 'x') && !S_PRONONCE.has(w) && !S_PRONONCE.has(base)) {
    muettes.add(pos);
    pos--;
  } else if (S_PRONONCE.has(w)) return muettes;
  // e final après une voyelle : amie, joue, année, amies (pas « langue », « banque » : gu, qu)
  if (w[pos] === 'e' && pos > 0 && voyelleEn(pos - 1)) {
    muettes.add(pos);
    return muettes;
  }
  // une consonne finale muette, derrière une voyelle (ou r, n, m : vert, grand, champ)
  const c = w[pos];
  const avant = w[pos - 1];
  const apresVoyelleOuRNM = isV(avant) || 'rnm'.includes(avant ?? '·') || muettes.has(pos - 1);
  let muette = false;
  if (c === 't') muette = apresVoyelleOuRNM && !T_PRONONCE.has(base);
  else if (c === 'd') muette = apresVoyelleOuRNM && !D_PRONONCE.has(base);
  else if (c === 'p') muette = apresVoyelleOuRNM && !P_PRONONCE.has(base);
  else if (c === 'z') muette = isV(avant) && !Z_PRONONCE.has(base);
  else if (c === 'g') muette = avant === 'n' && (!base.endsWith('ing') || base.endsWith('oing')) && !G_PRONONCE.has(base);
  else if (c === 'c') muette = C_MUET.has(base);
  else if (c === 'l') muette = L_MUET.has(base);
  else if (c === 'f') muette = F_MUET.has(base);
  else if (c === 'r') muette = avant === 'e' && base.length >= 4 && !R_PRONONCE.has(base);
  if (muette) {
    muettes.add(pos);
    // temps, corps : le p avant le s ; il reste prononcé dans « champ » (rien d'autre)
  }
  return muettes;
}

// ---------------------------------------------------------------- Graphèmes

// ll prononcé « l » (ville, mille, tranquille…) : ce n'est pas le son [j] de fille
const LL_L = /^(mill|vill|lill|gill)|tranquill|oscill|distill|ville?s?$/;
const VOYELLES_COMPOSEES = ['eau', 'œu', 'oeu', 'ai', 'aî', 'ei', 'eî', 'au', 'eu', 'eû', 'ou', 'oû', 'où', 'oi', 'oî', 'ui', 'oo'];
const NASALES_3 = ['ain', 'aim', 'ein', 'eim', 'oin'];
const NASALES_2 = ['an', 'am', 'en', 'em', 'in', 'im', 'on', 'om', 'un', 'um', 'yn', 'ym'];
const CONSONNES_COMPOSEES = ['ch', 'ph', 'th', 'sh', 'rh', 'gn', 'ck', 'qu'];
// « dés » + h : déshabiller (le h est muet, ce n'est pas le « sh » de short)
const desH = (w, i) => i === 3 && /^d[eé]s/.test(w);
const OBSTRUANTES = new Set(['b', 'c', 'd', 'f', 'g', 'k', 'p', 't', 'v', 'ch', 'ph', 'th', 'gu']);

/**
 * Découpe un mot (minuscules, lettres et apostrophes) en graphèmes :
 * { s, e, k } avec k = 'V' (voyelle), 'C' (consonne), 'Y' (i, y, ill qui se lient à la voyelle
 * suivante) ou 'A' (apostrophe).
 */
function graphemes(w) {
  const out = [];
  const L = w.length;
  const llL = LL_L.test(w);
  // une voyelle, mais pas le u de « gu », « qu » (ai-gui-lle, in-quiet)
  const vraieVoyelle = (i) => isV(w[i]) && !(w[i] === 'u' && 'gq'.includes(w[i - 1] ?? '·'));
  // « ill » ou « il » final à la position i : le son [j] (fille, travail)
  const yodApres = (i) => w[i] === 'i' && !llL && (w.startsWith('ll', i + 1) || (w[i + 1] === 'l' && i + 2 === L));
  let i = 0;
  const push = (len, k) => {
    out.push({ s: i, e: i + len, k });
    i += len;
  };
  while (i < L) {
    const c = w[i];
    if (isApo(c)) { push(1, 'A'); continue; }
    if (!isV(c)) {
      const two = w.slice(i, i + 2);
      // ll après i (pas au début du mot : illustre) : le son [j], au début de la syllabe (fi-lle, pai-lle)
      if (two === 'll' && w[i - 1] === 'i' && i >= 2 && out.at(-1)?.k === 'V' && !llL) { push(2, 'Y'); continue; }
      if (two === 'gu' && isV(w[i + 2]) && 'eiyéèêëîï'.includes(w[i + 2])) { push(2, 'C'); continue; }
      if (two === 'ge' && 'aoâôu'.includes(w[i + 2] ?? '·')) { push(2, 'C'); continue; } // pi-geon
      if (CONSONNES_COMPOSEES.includes(two) && !(two === 'sh' && desH(w, i + 1))) { push(2, 'C'); continue; }
      push(1, 'C');
      continue;
    }
    // voyelle + « ill » : le i reste avec la voyelle (gre-noui-lle, feui-lle) ; « il » final : so-leil, fau-teuil
    if (c === 'i' && i > 0 && vraieVoyelle(i - 1) && yodApres(i) && out.at(-1)?.k === 'V') {
      if (w[i + 1] === 'l' && w[i + 2] === 'l') {
        out.at(-1).e++;
        i++;
      } else push(2, 'Y');
      continue;
    }
    // y entre deux voyelles (cra-yon, tu-yau) ou au début devant une voyelle (yeux) : il commence la syllabe
    if (c === 'y' && isV(w[i + 1]) && (i === 0 || isV(w[i - 1]))) { push(1, 'Y'); continue; }
    // ac-cueil, cueillir : « ue » se lit « eu » après c et g
    if (c === 'u' && w[i + 1] === 'e' && w[i - 1] === 'c' && w[i + 2] === 'i' && w[i + 3] === 'l') { push(2, 'V'); continue; }
    // i (ï) devant une voyelle se lie à elle, sauf après consonne + r ou l (cri-er, ou-bli-er)
    if ((c === 'i' || c === 'ï') && isV(w[i + 1]) && w[i + 1] !== 'y' && !yodApres(i)) {
      const groupe = i >= 2 && OBSTRUANTES.has(w[i - 2]) && 'rl'.includes(w[i - 1]);
      if (!groupe && (i === 0 || !vraieVoyelle(i - 1) || c === 'ï')) { push(1, 'Y'); continue; }
    }
    // voyelle + y en fin de syllabe : poney, cow-boy
    if (w[i + 1] === 'y' && !isV(w[i + 2]) && c !== 'y') { push(2, 'V'); continue; }
    // les sons à plusieurs lettres
    const trois = w.slice(i, i + 3);
    const nasale = (len) => !isV(w[i + len]) && !'nm'.includes(w[i + len] ?? '·');
    if (NASALES_3.includes(trois) && nasale(3)) { push(3, 'V'); continue; }
    if (trois === 'eau' || trois === 'œu' || trois === 'oeu') { push(3, 'V'); continue; }
    const deux = w.slice(i, i + 2);
    if (VOYELLES_COMPOSEES.includes(deux)) { push(2, 'V'); continue; }
    if (NASALES_2.includes(deux) && nasale(2)) { push(2, 'V'); continue; }
    push(1, 'V');
  }
  return out;
}

/** Deux consonnes qui commencent ensemble une syllabe : ta-ble, li-vre, ca-mion, ac-tion. */
function attaque(w, a, b) {
  const ta = w.slice(a.s, a.e);
  const tb = w.slice(b.s, b.e);
  if (b.k === 'Y') return a.k === 'C';
  if (tb === 'l' && (ta === 't' || ta === 'd')) return false; // at-lan-tique
  return (tb === 'r' || tb === 'l') && OBSTRUANTES.has(ta);
}

// ---------------------------------------------------------------- Syllabes d'un mot

/** Mots dont le découpage est fixé à la main (le « y » de pays se lit « i-i »). */
const DECOUPAGES = { pays: ['pa', 'ys'], oui: ['oui'], ouest: ['ouest'], août: ['août'], aout: ['aout'], asseoir: ['as', 'seoir'] };

/**
 * Les syllabes écrites d'un mot fait de lettres (et d'apostrophes) : liste de syllabes, chacune
 * une liste de morceaux { text, muet } (le texte d'origine, majuscules comprises).
 * `opts.pluriel3` : le mot suit « ils » ou « elles » (le -ent final est muet).
 */
export function decouperMot(mot, opts = {}) {
  const w = mot.toLowerCase();
  if (w.length !== mot.length || !isLettre(w[w.length - 1] ?? '')) return [[{ text: mot, muet: false }]];
  // les lettres muettes : on regarde le mot après l'apostrophe (l'école, c'est, aujourd'hui)
  const apo = Math.max(...[...APOSTROPHES].map((a) => w.lastIndexOf(a)));
  const queue = w.slice(apo + 1);
  const muettes = new Set([...muettesMot(queue, opts)].map((k) => k + apo + 1));
  // la partie avant l'apostrophe : seulement le h muet (presqu'île, jusqu'à : rien)
  for (let k = 0; k < apo; k++) if (w[k] === 'h' && !'cpstrgk'.includes(w[k - 1] ?? '·')) muettes.add(k);

  // fin muette laissée hors du découpage : consonnes finales muettes, e muet après une voyelle
  let fin = w.length;
  while (fin > 0 && muettes.has(fin - 1) && (!isV(w[fin - 1]) || (w[fin - 1] === 'e' && isV(w[fin - 2])))) fin--;
  if (fin === 0) fin = w.length;

  const coeur = w.slice(0, fin);
  let bornes; // débuts des syllabes (indices dans le mot)
  if (DECOUPAGES[queue]) {
    bornes = [];
    let k = apo + 1;
    for (const syl of DECOUPAGES[queue]) {
      bornes.push(k);
      k += syl.length;
    }
    bornes[0] = 0; // l'ouest : « l' » avec la première syllabe
  } else {
    const g = graphemes(coeur);
    const noyaux = g.map((u, i) => (u.k === 'V' ? i : -1)).filter((i) => i >= 0);
    bornes = [0];
    for (let n = 0; n + 1 < noyaux.length; n++) {
      const entre = g.slice(noyaux[n] + 1, noyaux[n + 1]);
      const apoAt = entre.findIndex((u) => u.k === 'A');
      let debut; // indice dans `entre` du premier graphème de la syllabe suivante
      if (apoAt >= 0) debut = Math.max(0, apoAt - 1); // jus-qu'à, au-jour-d'hui
      else if (entre.length <= 1) debut = 0;
      else debut = attaque(coeur, entre.at(-2), entre.at(-1)) ? entre.length - 2 : entre.length - 1;
      const u = entre[debut];
      bornes.push(u ? u.s : g[noyaux[n]].e);
    }
  }
  bornes.push(w.length);
  return bornes.slice(0, -1).map((start, n) => {
    const end = bornes[n + 1];
    const morceaux = [];
    for (let k = start; k < end; k++) {
      const muet = muettes.has(k);
      if (morceaux.length && morceaux.at(-1).muet === muet) morceaux.at(-1).text += mot[k];
      else morceaux.push({ text: mot[k], muet });
    }
    return morceaux;
  });
}

/** Les syllabes écrites d'un mot, en texte : « pommes » → ['pom', 'mes']. */
export function syllabes(mot, opts = {}) {
  return decouperTexte(mot, opts)
    .flatMap((part) => (part.syllabes ? part.syllabes.map((s) => s.map((m) => m.text).join('')) : []));
}

/** Les syllabes orales : le « e » final après consonne ne compte pas (pom-me → pomme, ta-ble → table). */
export function syllabesOrales(mot) {
  const ecrites = syllabes(mot);
  if (ecrites.length < 2) return ecrites;
  const derniere = decouperTexte(mot).filter((p) => p.syllabes).at(-1).syllabes.at(-1);
  // la dernière syllabe écrite : des consonnes et un « e » final, suivi au plus de s ou de -nt muets
  // (me, ble, gue, mes, gent), mais pas « et », « er », « ez » (jui-llet, dan-ser)
  const texte = derniere.map((m) => m.text).join('').toLowerCase().replace(/[gq]u(?=e)/g, 'g');
  const muet = derniere.filter((m) => m.muet).map((m) => m.text).join('').toLowerCase();
  const fin = texte.match(/^[^aeiouyàâäéèêëîïôöùûüÿœæáíóú]*(e?)(s|nt)?$/);
  if (fin && (fin[1] || muet.startsWith('e')) && (!fin[2] || muet.endsWith(fin[2]))) return [...ecrites.slice(0, -2), ecrites.at(-2) + ecrites.at(-1)];
  return ecrites;
}

// ---------------------------------------------------------------- Textes

const PRONOMS_PLURIEL = /^(ils|elles|qu['’]ils|qu['’]elles)$/i;
const ENTRE_PRONOM_VERBE = /^(ne|n['’]|se|s['’]|les|leur|lui|me|te|nous|vous|y|en|la|le|l['’])$/i;

/**
 * Découpe un morceau de texte sans espace (« l'école, » ; « arc-en-ciel ») en parties :
 * { text } (ponctuation, chiffres, émojis, traits d'union) ou { text, syllabes } (un mot).
 */
export function decouperTexte(texte, opts = {}) {
  const parts = [];
  // un mot : des lettres, avec des apostrophes à l'intérieur (pas au bout)
  const re = /\p{L}+(?:['’ʼ]\p{L}+)*/gu;
  let pos = 0;
  for (const m of texte.matchAll(re)) {
    if (m.index > pos) parts.push({ text: texte.slice(pos, m.index) });
    parts.push({ text: m[0], syllabes: decouperMot(m[0], opts) });
    pos = m.index + m[0].length;
  }
  if (pos < texte.length) parts.push({ text: texte.slice(pos) });
  return parts;
}

/**
 * Découpe une phrase : un élément par mot séparé par une espace (comme wordSpans), chacun
 * avec ses parties. Le -ent d'un verbe après « ils » ou « elles » est muet.
 */
export function decouperPhrase(texte) {
  const mots = texte.split(' ');
  const lettres = (m) => m.replace(/[^\p{L}'’]/gu, '');
  return mots.map((mot, i) => {
    let pluriel3 = false;
    for (let k = i - 1; k >= 0 && k >= i - 3; k--) {
      const avant = lettres(mots[k]);
      if (PRONOMS_PLURIEL.test(avant)) { pluriel3 = true; break; }
      if (!ENTRE_PRONOM_VERBE.test(avant)) break;
    }
    return decouperTexte(mot, { pluriel3 });
  });
}

// ---------------------------------------------------------------- Où colorer

// Jeux qui travaillent les sons, les lettres, les syllabes ou l'orthographe : les syllabes
// colorées donneraient la réponse (ou fausseraient l'exercice). Les jeux d'anglais non plus :
// le découpage est celui du français.
export const JEUX_SANS_SYLLABES = new Set([
  'syllabes-rythme', 'rimes', 'lettres', 'premier-son', 'syllabes', 'dictee', 'ecrire', 'chemin-lettres',
  'homophones', 'genre', 'conjugaison', 'accords',
]);

/** Les syllabes colorées sont-elles permises dans ce jeu ? */
export function syllabesPermises(gameId, domain) {
  return domain !== 'anglais' && !JEUX_SANS_SYLLABES.has(gameId);
}
