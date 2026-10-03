// Les drapeaux du monde, dessinés en SVG (les emoji de drapeaux ne s'affichent pas sur
// tous les ordinateurs). Chaque drapeau tient dans un rectangle de 30 × 20.

import { pick, sample, shuffle } from '../random.js';

/** Bandes verticales ou horizontales de même largeur (ou selon `weights`). */
function stripes(dir, colors, weights = colors.map(() => 1)) {
  const total = weights.reduce((a, b) => a + b, 0);
  let at = 0;
  return colors.map((c, i) => {
    const size = (weights[i] / total) * (dir === 'v' ? 30 : 20);
    const r = dir === 'v'
      ? `<rect x="${at}" y="0" width="${size + 0.05}" height="20" fill="${c}"/>`
      : `<rect x="0" y="${at}" width="30" height="${size + 0.05}" fill="${c}"/>`;
    at += size;
    return r;
  }).join('');
}

/** Étoile à 5 branches centrée en (cx, cy). */
export function starPoints(cx, cy, r, turn = 0) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + turn + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.4 : r;
    return `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}
const star = (cx, cy, r, fill, turn) => `<polygon points="${starPoints(cx, cy, r, turn)}" fill="${fill}"/>`;

/** Croix scandinave : décalée vers la hampe. */
function nordic(bg, cross, inner) {
  return `<rect width="30" height="20" fill="${bg}"/><rect x="8" y="0" width="5" height="20" fill="${cross}"/>`
    + `<rect x="0" y="7.5" width="30" height="5" fill="${cross}"/>`
    + (inner ? `<rect x="9.4" y="0" width="2.2" height="20" fill="${inner}"/><rect x="0" y="8.9" width="30" height="2.2" fill="${inner}"/>` : '');
}

const MAPLE = '15,3 16.3,5.6 17.6,5 17.1,8.2 19.2,6.6 19.8,7.9 21.5,7.6 20.8,9.7 21.6,10.2 18.7,12.6 19.1,13.8 15.5,13.2 15.5,16.5 '
  + '14.5,16.5 14.5,13.2 10.9,13.8 11.3,12.6 8.4,10.2 9.2,9.7 8.5,7.6 10.2,7.9 10.8,6.6 12.9,8.2 12.4,5 13.7,5.6';

// name : avec l'article (pour les phrases) ; label : le nom seul (pour les boutons).
// stripes : les couleurs des bandes, pour le niveau « Complète le drapeau ».
export const FLAGS = {
  fr: { label: 'France', name: 'la France', continent: 'Europe', svg: stripes('v', ['#002395', '#fff', '#ed2939']), bands: { dir: 'v', colors: ['bleu', 'blanc', 'rouge'] } },
  it: { label: 'Italie', name: 'l’Italie', continent: 'Europe', svg: stripes('v', ['#009246', '#fff', '#ce2b37']), bands: { dir: 'v', colors: ['vert', 'blanc', 'rouge'] } },
  be: { label: 'Belgique', name: 'la Belgique', continent: 'Europe', svg: stripes('v', ['#1a1a1a', '#fae042', '#ed2939']), bands: { dir: 'v', colors: ['noir', 'jaune', 'rouge'] } },
  ie: { label: 'Irlande', name: 'l’Irlande', continent: 'Europe', svg: stripes('v', ['#169b62', '#fff', '#ff883e']), bands: { dir: 'v', colors: ['vert', 'blanc', 'orange'] } },
  ro: { label: 'Roumanie', name: 'la Roumanie', continent: 'Europe', svg: stripes('v', ['#002b7f', '#fcd116', '#ce1126']), bands: { dir: 'v', colors: ['bleu', 'jaune', 'rouge'] } },
  de: { label: 'Allemagne', name: 'l’Allemagne', continent: 'Europe', svg: stripes('h', ['#1a1a1a', '#dd0000', '#ffce00']), bands: { dir: 'h', colors: ['noir', 'rouge', 'jaune'] } },
  nl: { label: 'Pays-Bas', name: 'les Pays-Bas', continent: 'Europe', svg: stripes('h', ['#ae1c28', '#fff', '#21468b']), bands: { dir: 'h', colors: ['rouge', 'blanc', 'bleu'] } },
  ru: { label: 'Russie', name: 'la Russie', continent: 'Europe', svg: stripes('h', ['#fff', '#0039a6', '#d52b1e']), bands: { dir: 'h', colors: ['blanc', 'bleu', 'rouge'] } },
  at: { label: 'Autriche', name: 'l’Autriche', continent: 'Europe', svg: stripes('h', ['#ed2939', '#fff', '#ed2939']), bands: { dir: 'h', colors: ['rouge', 'blanc', 'rouge'] } },
  hu: { label: 'Hongrie', name: 'la Hongrie', continent: 'Europe', svg: stripes('h', ['#ce2939', '#fff', '#477050']), bands: { dir: 'h', colors: ['rouge', 'blanc', 'vert'] } },
  lu: { label: 'Luxembourg', name: 'le Luxembourg', continent: 'Europe', svg: stripes('h', ['#ed2939', '#fff', '#00a1de']), bands: { dir: 'h', colors: ['rouge', 'blanc', 'bleu'] } },
  pl: { label: 'Pologne', name: 'la Pologne', continent: 'Europe', svg: stripes('h', ['#fff', '#dc143c']), bands: { dir: 'h', colors: ['blanc', 'rouge'] } },
  ua: { label: 'Ukraine', name: 'l’Ukraine', continent: 'Europe', svg: stripes('h', ['#0057b7', '#ffd700']), bands: { dir: 'h', colors: ['bleu', 'jaune'] } },
  es: { label: 'Espagne', name: 'l’Espagne', continent: 'Europe', svg: stripes('h', ['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1]) },
  pt: { label: 'Portugal', name: 'le Portugal', continent: 'Europe', svg: `${stripes('v', ['#006600', '#ff0000'], [2, 3])}<circle cx="12" cy="10" r="3.6" fill="#ffcc00"/><circle cx="12" cy="10" r="2.2" fill="#ff0000" stroke="#fff" stroke-width="0.6"/>` },
  ch: { label: 'Suisse', name: 'la Suisse', continent: 'Europe', svg: '<rect width="30" height="20" fill="#da291c"/><rect x="12.75" y="4" width="4.5" height="12" fill="#fff"/><rect x="9" y="7.75" width="12" height="4.5" fill="#fff"/>' },
  se: { label: 'Suède', name: 'la Suède', continent: 'Europe', svg: nordic('#006aa7', '#fecc00') },
  no: { label: 'Norvège', name: 'la Norvège', continent: 'Europe', svg: nordic('#ba0c2f', '#fff', '#00205b') },
  dk: { label: 'Danemark', name: 'le Danemark', continent: 'Europe', svg: nordic('#c8102e', '#fff') },
  fi: { label: 'Finlande', name: 'la Finlande', continent: 'Europe', svg: nordic('#fff', '#002f6c') },
  is: { label: 'Islande', name: 'l’Islande', continent: 'Europe', svg: nordic('#02529c', '#fff', '#dc1e35') },
  gr: {
    label: 'Grèce', name: 'la Grèce', continent: 'Europe',
    svg: `${stripes('h', Array.from({ length: 9 }, (_, i) => (i % 2 ? '#fff' : '#0d5eaf')))}<rect width="11.1" height="11.1" fill="#0d5eaf"/><rect x="4.45" y="0" width="2.2" height="11.1" fill="#fff"/><rect x="0" y="4.45" width="11.1" height="2.2" fill="#fff"/>`,
  },
  gb: {
    label: 'Royaume-Uni', name: 'le Royaume-Uni', continent: 'Europe',
    svg: '<rect width="30" height="20" fill="#012169"/><path d="M0 0 L30 20 M30 0 L0 20" stroke="#fff" stroke-width="4"/>'
      + '<path d="M0 0 L30 20 M30 0 L0 20" stroke="#c8102e" stroke-width="1.4"/>'
      + '<rect x="12.5" y="0" width="5" height="20" fill="#fff"/><rect x="0" y="7.5" width="30" height="5" fill="#fff"/>'
      + '<rect x="13.5" y="0" width="3" height="20" fill="#c8102e"/><rect x="0" y="8.5" width="30" height="3" fill="#c8102e"/>',
  },
  us: {
    label: 'États-Unis', name: 'les États-Unis', continent: 'Amérique',
    svg: `${stripes('h', Array.from({ length: 13 }, (_, i) => (i % 2 ? '#fff' : '#b22234')))}<rect width="12" height="10.77" fill="#3c3b6e"/>`
      + Array.from({ length: 20 }, (_, i) => `<circle cx="${1.4 + (i % 5) * 2.3}" cy="${1.4 + Math.floor(i / 5) * 2.6}" r="0.55" fill="#fff"/>`).join(''),
  },
  ca: {
    label: 'Canada', name: 'le Canada', continent: 'Amérique',
    svg: `<rect width="30" height="20" fill="#fff"/><rect width="7.5" height="20" fill="#d80621"/><rect x="22.5" width="7.5" height="20" fill="#d80621"/><polygon points="${MAPLE}" fill="#d80621"/>`,
  },
  br: {
    label: 'Brésil', name: 'le Brésil', continent: 'Amérique',
    svg: '<rect width="30" height="20" fill="#009c3b"/><polygon points="15,2 28,10 15,18 2,10" fill="#ffdf00"/><circle cx="15" cy="10" r="4.6" fill="#002776"/><path d="M10.6 9 Q15 8 19.4 11" stroke="#fff" stroke-width="0.7" fill="none"/>',
  },
  mx: { label: 'Mexique', name: 'le Mexique', continent: 'Amérique', svg: `${stripes('v', ['#006847', '#fff', '#ce1126'])}<circle cx="15" cy="10" r="2.4" fill="#8c5a2b"/><path d="M12.8 11.6 Q15 13.6 17.2 11.6" stroke="#2e7d32" stroke-width="0.8" fill="none"/>` },
  ar: { label: 'Argentine', name: 'l’Argentine', continent: 'Amérique', svg: `${stripes('h', ['#74acdf', '#fff', '#74acdf'])}<circle cx="15" cy="10" r="2" fill="#f6b40e"/>` },
  co: { label: 'Colombie', name: 'la Colombie', continent: 'Amérique', svg: stripes('h', ['#fcd116', '#003893', '#ce1126'], [2, 1, 1]) },
  cl: { label: 'Chili', name: 'le Chili', continent: 'Amérique', svg: `<rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#d52b1e"/><rect width="10" height="10" fill="#0039a6"/>${star(5, 5, 3, '#fff')}` },
  jp: { label: 'Japon', name: 'le Japon', continent: 'Asie', svg: '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/>' },
  cn: {
    label: 'Chine', name: 'la Chine', continent: 'Asie',
    svg: `<rect width="30" height="20" fill="#de2910"/>${star(5, 5, 3, '#ffde00')}${star(10, 2, 1, '#ffde00', 0.4)}${star(12, 4, 1, '#ffde00', 0.8)}${star(12, 7, 1, '#ffde00', 0)}${star(10, 9, 1, '#ffde00', 0.4)}`,
  },
  vn: { label: 'Viêt Nam', name: 'le Viêt Nam', continent: 'Asie', svg: `<rect width="30" height="20" fill="#da251d"/>${star(15, 10.5, 6, '#ffff00')}` },
  in: { label: 'Inde', name: 'l’Inde', continent: 'Asie', svg: `${stripes('h', ['#ff9933', '#fff', '#138808'])}<circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" stroke-width="0.6"/><circle cx="15" cy="10" r="0.6" fill="#000080"/>` },
  bd: { label: 'Bangladesh', name: 'le Bangladesh', continent: 'Asie', svg: '<rect width="30" height="20" fill="#006a4e"/><circle cx="13.5" cy="10" r="6" fill="#f42a41"/>' },
  tr: {
    label: 'Turquie', name: 'la Turquie', continent: 'Asie',
    svg: `<rect width="30" height="20" fill="#e30a17"/><circle cx="11" cy="10" r="5" fill="#fff"/><circle cx="12.3" cy="10" r="4" fill="#e30a17"/>${star(17, 10, 2.3, '#fff', -0.32)}`,
  },
  kr: {
    label: 'Corée du Sud', name: 'la Corée du Sud', continent: 'Asie',
    svg: '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="5" fill="#0047a0"/><path d="M10 10 A5 5 0 0 1 20 10 A2.5 2.5 0 0 1 15 10 A2.5 2.5 0 0 0 10 10 Z" fill="#cd2e3a"/>'
      + '<g stroke="#000" stroke-width="0.9"><path d="M4 4 l3 -2 M4.8 5.2 l3 -2 M5.6 6.4 l3 -2"/><path d="M22.4 13.6 l3 2 M23.2 12.4 l3 2 M24 11.2 l3 2"/>'
      + '<path d="M22.4 6.4 l3 -2 M21.6 5.2 l3 -2 M20.8 4 l3 -2"/><path d="M4 16 l3 2 M4.8 14.8 l3 2 M5.6 13.6 l3 2"/></g>',
  },
  ma: { label: 'Maroc', name: 'le Maroc', continent: 'Afrique', svg: '' }, // dessiné plus bas
  sn: { label: 'Sénégal', name: 'le Sénégal', continent: 'Afrique', svg: `${stripes('v', ['#00853f', '#fdef42', '#e31b23'])}${star(15, 10.3, 2.8, '#00853f')}`, bands: { dir: 'v', colors: ['vert', 'jaune', 'rouge'] } },
  ml: { label: 'Mali', name: 'le Mali', continent: 'Afrique', svg: stripes('v', ['#14b53a', '#fcd116', '#ce1126']), bands: { dir: 'v', colors: ['vert', 'jaune', 'rouge'] } },
  ci: { label: 'Côte d’Ivoire', name: 'la Côte d’Ivoire', continent: 'Afrique', svg: stripes('v', ['#f77f00', '#fff', '#009e60']), bands: { dir: 'v', colors: ['orange', 'blanc', 'vert'] } },
  ng: { label: 'Nigeria', name: 'le Nigeria', continent: 'Afrique', svg: stripes('v', ['#008751', '#fff', '#008751']), bands: { dir: 'v', colors: ['vert', 'blanc', 'vert'] } },
  cm: { label: 'Cameroun', name: 'le Cameroun', continent: 'Afrique', svg: `${stripes('v', ['#007a5e', '#ce1126', '#fcd116'])}${star(15, 10.3, 2.8, '#fcd116')}` },
  eg: { label: 'Égypte', name: 'l’Égypte', continent: 'Afrique', svg: `${stripes('h', ['#ce1126', '#fff', '#1a1a1a'])}<circle cx="15" cy="10" r="1.7" fill="#c09300"/>` },
  au: {
    label: 'Australie', name: 'l’Australie', continent: 'Océanie',
    svg: '<rect width="30" height="20" fill="#012169"/><g transform="scale(0.5)"><path d="M0 0 L30 20 M30 0 L0 20" stroke="#fff" stroke-width="4"/>'
      + '<path d="M0 0 L30 20 M30 0 L0 20" stroke="#c8102e" stroke-width="1.4"/><rect x="12.5" y="0" width="5" height="20" fill="#fff"/>'
      + '<rect x="0" y="7.5" width="30" height="5" fill="#fff"/><rect x="13.5" y="0" width="3" height="20" fill="#c8102e"/><rect x="0" y="8.5" width="30" height="3" fill="#c8102e"/></g>'
      + `${star(7.5, 15, 2.2, '#fff')}${star(22.5, 4, 1, '#fff')}${star(19, 9, 1, '#fff')}${star(26, 8, 1, '#fff')}${star(22.5, 16, 1, '#fff')}`,
  },
  nz: {
    label: 'Nouvelle-Zélande', name: 'la Nouvelle-Zélande', continent: 'Océanie',
    svg: '<rect width="30" height="20" fill="#012169"/><g transform="scale(0.5)"><path d="M0 0 L30 20 M30 0 L0 20" stroke="#fff" stroke-width="4"/>'
      + '<path d="M0 0 L30 20 M30 0 L0 20" stroke="#c8102e" stroke-width="1.4"/><rect x="12.5" y="0" width="5" height="20" fill="#fff"/>'
      + '<rect x="0" y="7.5" width="30" height="5" fill="#fff"/><rect x="13.5" y="0" width="3" height="20" fill="#c8102e"/><rect x="0" y="8.5" width="30" height="3" fill="#c8102e"/></g>'
      + `${star(22.5, 4, 1.3, '#cc142b')}${star(19, 9, 1.3, '#cc142b')}${star(26, 8, 1.3, '#cc142b')}${star(22.5, 16, 1.3, '#cc142b')}`,
  },
};

// le Maroc : une étoile dessinée d'un seul trait (pentagramme)
FLAGS.ma.svg = (() => {
  const pts = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return [15 + 4.6 * Math.cos(a), 10.4 + 4.6 * Math.sin(a)];
  });
  const path = [0, 2, 4, 1, 3].map((k) => pts[k].map((v) => v.toFixed(2)).join(',')).join(' ');
  return `<rect width="30" height="20" fill="#c1272d"/><polygon points="${path}" fill="none" stroke="#006233" stroke-width="0.8" stroke-linejoin="round"/>`;
})();

export function flagMarkup(code) {
  return `<svg viewBox="0 0 30 20" preserveAspectRatio="none">${FLAGS[code].svg}<rect width="30" height="20" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="0.4"/></svg>`;
}

// Les drapeaux connus des petits (Europe proche), puis le monde entier.
const EASY = ['fr', 'it', 'de', 'es', 'be', 'gb', 'ch', 'pt', 'jp', 'us'];
const WORLD = Object.keys(FLAGS);
// Drapeaux qui se ressemblent : on les met ensemble pour bien observer.
const LOOKALIKES = [
  ['fr', 'nl', 'ru', 'lu'], ['it', 'ie', 'mx', 'ci'], ['se', 'no', 'dk', 'fi', 'is'], ['de', 'be', 'ro'],
  ['ml', 'sn', 'cm', 'ro'], ['at', 'pl', 'hu'], ['gb', 'au', 'nz'], ['jp', 'bd', 'kr'],
  ['co', 'ua', 'ro'], ['es', 'pt', 'ar'],
];
const CONTINENTS = ['Europe', 'Afrique', 'Asie', 'Amérique', 'Océanie'];
const COLOR_HEX = {
  bleu: '#1f4fbf', blanc: '#ffffff', rouge: '#e0242f', vert: '#169b62', jaune: '#fcd116', noir: '#1a1a1a', orange: '#ff883e',
};

const LEVELS = [
  'Drapeaux connus', 'Drapeaux du monde', 'Trouve le drapeau', 'Ils se ressemblent', 'Sur quel continent ?', 'Complète le drapeau',
];

export const drapeaux = {
  id: 'drapeaux',
  domain: 'monde',
  title: 'Les drapeaux',
  icon: '🚩',
  skill: 'Reconnaître les drapeaux des pays, observer leurs couleurs et leurs formes',
  levels: LEVELS,
  generate(level, rng) {
    if (level <= 2) {
      const pool = level === 1 ? EASY : WORLD;
      const [code, ...others] = sample(rng, pool, level === 1 ? 3 : 4);
      const options = shuffle(rng, [code, ...others]);
      return {
        key: `drapeaux:${level}:${code}`,
        text: 'À quel pays est ce drapeau ?',
        instruction: [`À quel pays est ce drapeau ?`, `${options.map((c) => FLAGS[c].label).join(', ')} ?`],
        short: { key: `drapeaux:${level}`, text: 'Quel pays ?' },
        stage: { type: 'flag', code },
        choices: options.map((c) => ({ value: c, label: FLAGS[c].label })),
        choiceStyle: 'answers',
        answer: code,
        success: { speak: `C’est le drapeau de ${FLAGS[code].name} !` },
      };
    }
    if (level === 3 || level === 4) {
      let code;
      let options;
      if (level === 3) {
        [code, ...options] = sample(rng, WORLD, 3);
        options = shuffle(rng, [code, ...options]);
      } else {
        const group = pick(rng, LOOKALIKES);
        options = sample(rng, group, Math.min(3, group.length));
        code = pick(rng, options);
      }
      return {
        key: `drapeaux:${level}:${code}:${options.join('')}`,
        text: `Touche le drapeau : ${FLAGS[code].label}.`,
        instruction: level === 4
          ? `Ces drapeaux se ressemblent ! Touche le drapeau de ${FLAGS[code].name}.`
          : `Touche le drapeau de ${FLAGS[code].name}.`,
        short: { key: `drapeaux:${level}`, text: `${FLAGS[code].label} ?`, speak: `${FLAGS[code].name} ?` },
        stage: { type: 'none' },
        choices: options.map((c) => ({ value: c, flag: c, name: FLAGS[c].label })),
        choiceStyle: 'flags',
        answer: code,
        success: { speak: `Oui, c’est le drapeau de ${FLAGS[code].name} !` },
      };
    }
    if (level === 5) {
      const code = pick(rng, WORLD);
      const { continent } = FLAGS[code];
      const options = shuffle(rng, [continent, ...sample(rng, CONTINENTS.filter((c) => c !== continent), 2)]);
      return {
        key: `drapeaux:5:${code}`,
        text: `${FLAGS[code].label} : sur quel continent ?`,
        instruction: `Voici le drapeau de ${FLAGS[code].name}. Sur quel continent est ce pays ?`,
        short: { key: 'drapeaux:5', text: 'Quel continent ?', speak: `${FLAGS[code].name} ?` },
        stage: { type: 'flag', code, caption: FLAGS[code].label },
        choices: options.map((c) => ({ value: c, label: c })),
        choiceStyle: 'answers',
        answer: continent,
        success: { speak: `Oui, ce pays est en ${continent} !` },
      };
    }
    // Complète le drapeau : une bande est effacée, quelle couleur manque ?
    const code = pick(rng, WORLD.filter((c) => FLAGS[c].bands));
    const { bands } = FLAGS[code];
    const hole = Math.floor(rng() * bands.colors.length);
    const missing = bands.colors[hole];
    const others = sample(rng, Object.keys(COLOR_HEX).filter((c) => c !== missing), 2);
    const options = shuffle(rng, [missing, ...others]);
    return {
      key: `drapeaux:6:${code}:${hole}`,
      text: `Quelle couleur manque au drapeau ?`,
      instruction: `Voici le drapeau de ${FLAGS[code].name}, mais une bande est effacée. Quelle couleur manque ?`,
      short: { key: 'drapeaux:6', text: 'Quelle couleur manque ?' },
      stage: { type: 'flag', code, hole: { dir: bands.dir, index: hole, count: bands.colors.length }, caption: FLAGS[code].label },
      choices: options.map((c) => ({ value: c, swatch: COLOR_HEX[c], name: c })),
      choiceStyle: 'pictures',
      answer: missing,
      success: { speak: `Oui, il manquait le ${missing} !` },
    };
  },
};
