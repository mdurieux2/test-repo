// Vérifier l'affichage sur cet appareil (espace parents → Réglages) : l'app fait défiler chaque
// niveau de chaque jeu des classes choisies, sur le vrai écran (téléphone, tablette, ordinateur,
// dans le sens où on le tient), et note ce qui dépasse : page plus large que l'écran, texte plus
// large que son bouton, réponses ou dessin sous le bas de l'écran. Rien n'est dit ni enregistré
// pendant la vérification (main.js, verifierAffichage). Le rapport ne contient aucun prénom :
// l'appareil, le navigateur, les classes, les jeux et les niveaux.

import { findGame } from './games/index.js';
import { levelRange, PROGRAMS } from './programs.js';
import { GRADES } from './storage.js';
import { navigateur } from './installation.js';

/**
 * Les écrans à vérifier : chaque niveau de chaque jeu au programme de ces classes, une seule fois
 * (dans la première classe qui l'a), avec 2 questions par niveau (plus si le jeu alterne des formes
 * de questions, game.formats), dans l'ordre des rubriques.
 */
export function ecransAVerifier(classes) {
  const vus = new Set();
  const liste = [];
  for (const classe of classes) {
    for (const entrees of Object.values(PROGRAMS[classe] || {})) {
      for (const [id] of entrees) {
        const jeu = findGame(id);
        if (!jeu) continue;
        for (const niveau of levelRange(classe, id).levels) {
          if (vus.has(`${id}:${niveau}`)) continue;
          vus.add(`${id}:${niveau}`);
          liste.push({ jeu: id, niveau, classe, questions: Math.max(2, jeu.formats || 1) });
        }
      }
    }
  }
  return liste;
}

// ce qui ne doit jamais être plus large que sa case
const CASES = '.choice, .key, .match-item, .tile, .fill-row, .stage > *, .order-item, .order-slot, .story-text, .text-body, '
  + '.sudoku-cell, .sudoku-symbol, .sym-cell, .path-cell, .maze-arrow';

/** Ce qui dépasse sur l'écran affiché (comme le test de bout en bout). Renvoie des phrases. */
export function mesurerEcran(win = globalThis) {
  const doc = win.document;
  const problemes = [];
  const largeur = doc.documentElement.scrollWidth;
  if (largeur > win.innerWidth + 1) problemes.push(`la page est plus large que l'écran (${largeur} > ${win.innerWidth} points)`);
  for (const el of doc.querySelectorAll(CASES)) {
    if (el.clientWidth <= 1) continue; // caché à l'écran, gardé pour le clavier
    if (el.closest('.choices-seek')) continue; // une image tournée exprès dans son rond (vérifiée ci-dessous)
    if (el.scrollWidth > el.clientWidth + 1) {
      problemes.push(`« ${el.textContent.trim().slice(0, 30)} » dépasse de sa case`);
      break;
    }
  }
  // « Cherche et trouve » : chaque image de la carte reste dans l'écran (Safari ferait glisser la page)
  for (const el of doc.querySelectorAll('.choices-seek .choice')) {
    const r = el.getBoundingClientRect();
    if (r.left < -1 || r.right > win.innerWidth + 1) {
      problemes.push(`« ${el.textContent.trim()} » sort de l'écran sur le côté`);
      break;
    }
  }
  // les sous-titres, en bas de l'écran, ne doivent rien cacher
  const bandeau = doc.querySelector('.caption-band:not([hidden])')?.getBoundingClientRect();
  const bas = bandeau && bandeau.width >= win.innerWidth - 1 ? bandeau.top : win.innerHeight;
  const zone = doc.querySelector('.choices');
  if (zone && zone.getBoundingClientRect().bottom > bas + 1) {
    problemes.push(`réponses sous le bas de l'écran (${Math.round(zone.getBoundingClientRect().bottom - bas)} points de trop)`);
  }
  const dessin = doc.querySelector('.stage');
  if (dessin && dessin.getBoundingClientRect().bottom > bas + 1) {
    problemes.push(`dessin sous le bas de l'écran (${Math.round(dessin.getBoundingClientRect().bottom - bas)} points de trop)`);
  }
  return problemes;
}

const NAVIGATEURS = {
  safari: 'Safari', chrome: 'Chrome', edge: 'Edge', firefox: 'Firefox', brave: 'Brave', samsung: 'Samsung Internet',
  opera: 'Opera', voiture: 'navigateur de la voiture', integre: 'navigateur intégré à une app', autre: 'autre navigateur',
};

/** « iPhone, iOS 18.5 », « tablette Android 14 », « iPad »… d'après l'agent utilisateur. */
export function appareilEnClair(ua = '', touch = 0) {
  const ios = /\b(iPhone|iPad|iPod)\b[^)]*? OS (\d+)[_.](\d+)/.exec(ua);
  if (ios) {
    // depuis iOS 26, Safari annonce toujours « OS 18_7 » ; sa propre version (« Version/26.2 ») suit iOS
    const safari = /Version\/(\d+)\.(\d+)/.exec(ua);
    const [majeur, mineur] = safari && Number(safari[1]) > Number(ios[2]) ? [safari[1], safari[2]] : [ios[2], ios[3]];
    return `${ios[1]}, iOS ${majeur}.${mineur}`;
  }
  if (/Macintosh/.test(ua) && touch > 1) return 'iPad';
  const android = /Android (\d+(?:\.\d+)?)/.exec(ua);
  if (android) return `${/Mobile/.test(ua) ? 'téléphone' : 'tablette'} Android ${android[1]}`;
  if (/CrOS/.test(ua)) return 'Chromebook';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'PC Windows';
  if (/Linux/.test(ua)) return 'ordinateur Linux';
  return 'appareil inconnu';
}

/** L'appareil tel qu'il est pendant la vérification (taille, sens, app installée ou non). */
export function cetAppareil(win = globalThis) {
  const nav = win.navigator || {};
  const ua = nav.userAgent || '';
  const touch = nav.maxTouchPoints || 0;
  const installee = nav.standalone === true || Boolean(win.matchMedia?.('(display-mode: standalone)').matches);
  return {
    appareil: appareilEnClair(ua, touch),
    navigateur: NAVIGATEURS[navigateur({ ua, touch, brave: Boolean(nav.brave) }).nom] || 'autre navigateur',
    ecran: `${win.innerWidth} × ${win.innerHeight} points${win.devicePixelRatio > 1 ? ` (×${Math.round(win.devicePixelRatio * 100) / 100})` : ''}`,
    sens: win.innerWidth > win.innerHeight ? 'paysage' : 'portrait',
    installee,
    ua,
  };
}

/** Le rapport à partager, en texte : l'appareil, ce qui a été vérifié, et chaque problème. */
export function rapportTexte({ version, appareil, classes, ecrans, secondes, interrompu, problemes, aides = [] }) {
  const lignes = [
    `Lire, compter et s'amuser ! ${version} : vérification de l'affichage`,
    `Appareil : ${appareil.appareil}, ${appareil.navigateur}${appareil.installee ? ' (app installée)' : ' (dans le navigateur)'}`,
    `Écran : ${appareil.ecran}, ${appareil.sens}${aides.length ? ` ; réglages : ${aides.join(', ')}` : ''}`,
    `Classes : ${classes.map((c) => GRADES[c] || c).join(', ')} ; ${ecrans} écrans vérifiés en ${secondes} s${interrompu ? ' (arrêtée avant la fin)' : ''}`,
    problemes.length ? `Problèmes (${problemes.length}) :` : 'Aucun problème : tout tient dans l\'écran.',
    ...problemes.map((p) => `- ${p.titre}, niveau ${p.niveau} (${GRADES[p.classe] || p.classe}) : ${p.problemes.join(' ; ')}`),
    `Navigateur : ${appareil.ua}`,
  ];
  return lignes.join('\n');
}
