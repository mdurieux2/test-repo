// « Le corps humain » et « Les animaux et leur milieu » (rubrique Sciences, section « Le vivant ») :
// on va plus loin que « Le vivant » (parties du corps, sens, cycles, hygiène) et que « Les animaux »
// (où ils vivent, bébés, cris, maisons) : le squelette et les articulations, les organes, la
// respiration, la digestion, les dents ; vertébrés et invertébrés, familles, chaînes alimentaires,
// régimes, milieux, déplacements, traces, hibernation et migration.
// Le corps se touche sur un dessin en SVG (bodySvg, interaction « body » dans main.js) : un os, une
// articulation, un organe, ou plusieurs dans l'ordre (le trajet des aliments). Chaque donnée a été
// vérifiée ; les distracteurs ne sont jamais vrais eux aussi (l'aigle marche aussi : « marche »
// n'est jamais proposé contre « vole » pour lui ; le renard, omnivore, n'est pas classé).

import { pick, sample, shuffle } from '../random.js';

const capitalize = (text) => `${text[0].toUpperCase()}${text.slice(1)}`;
/** « vole, nage ou rampe » : les réponses lues à voix haute. */
const spokenList = (labels) => (labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} ou ${labels.at(-1)}`);
const textChoices = (values) => values.map((v) => ({ value: v, label: v }));
/** Des images à toucher : l'emoji, et son nom pour les lecteurs d'écran. */
const pictureChoices = (items) => items.map((it) => ({ value: it.name, label: it.emoji, name: it.name }));
const pictureStage = (emoji) => (emoji ? { type: 'picture', emoji } : { type: 'none' });
/** Garde, dans l'ordre de la liste de référence, les valeurs choisies (la phrase lue reste la même). */
const inOrder = (reference, chosen) => reference.filter((v) => chosen.includes(v));

/** Deux réponses toujours dans le même ordre (« vrai ou faux », « plus vite ou moins vite »). */
function twoWay({ key, text, instruction = text, emoji, options, answer, success, style = 'words' }) {
  return {
    key,
    text,
    instruction,
    stage: pictureStage(emoji),
    choices: textChoices(options),
    choiceStyle: style,
    answer,
    success: { speak: success },
  };
}

/** Une réponse écrite parmi trois, lues à voix haute après la question. */
function textQuestion({ key, text, emoji, options, answer, success, style = 'words' }) {
  return {
    key,
    text,
    instruction: [text, `${capitalize(spokenList(options))} ?`],
    stage: pictureStage(emoji),
    choices: textChoices(options),
    choiceStyle: style,
    answer,
    success: { speak: success },
  };
}

/** Une image à trouver parmi trois. */
function pictureQuestion({ key, text, instruction = text, emoji, answer, others, success, rng }) {
  return {
    key,
    text,
    instruction,
    stage: pictureStage(emoji),
    choices: pictureChoices(shuffle(rng, [answer, ...others])),
    choiceStyle: 'pictures',
    answer: answer.name,
    success: { speak: success },
  };
}

/** Vrai ou faux : la phrase, puis ce qu'il faut retenir. */
function trueOrFalse(item, topic) {
  return twoWay({
    key: `${topic}:${item.text}`,
    text: `${item.text} Vrai ou faux ?`,
    instruction: [item.text, 'Vrai ou faux ?'],
    emoji: item.emoji,
    options: ['vrai', 'faux'],
    answer: item.answer,
    success: [item.answer === 'vrai' ? 'C’est vrai !' : 'C’est faux !', item.why],
  });
}

// ================================================================= Le dessin du corps (SVG)

const INK = '#2b2d42';
const SKIN = '#fde7d6';
const SKIN_LINE = '#c98d6b';
const BONE = '#fffaf0';

/** La silhouette d'un enfant de face (dans un cadre de 120 × 250), tracée deux fois pour le contour. */
function silhouette() {
  const limbs = [
    ['38,55 30,106 26,150', 12], ['82,55 90,106 94,150', 12],
    ['50,146 48,197 47,234', 16], ['70,146 72,197 73,234', 16],
  ];
  const torso = 'M37 49 Q60 43 83 49 L81 96 Q77 118 81 150 L39 150 Q43 118 39 96 Z';
  const layer = (color, extra) => `<g fill="${color}" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">`
    + limbs.map(([points, w]) => `<polyline points="${points}" fill="none" stroke-width="${w + extra}"/>`).join('')
    + `<path d="${torso}" stroke-width="${extra}"/>`
    + `<line x1="60" y1="38" x2="60" y2="52" stroke-width="${12 + extra}"/>`
    + `<circle cx="60" cy="24" r="${20 + extra / 2}" stroke-width="0"/>`
    + `<circle cx="25" cy="157" r="${6 + extra / 2}" stroke-width="0"/><circle cx="95" cy="157" r="${6 + extra / 2}" stroke-width="0"/>`
    + `<ellipse cx="43" cy="240" rx="${9 + extra / 2}" ry="${5 + extra / 2}" stroke-width="0"/>`
    + `<ellipse cx="77" cy="240" rx="${9 + extra / 2}" ry="${5 + extra / 2}" stroke-width="0"/>`
    + '</g>';
  return `<g aria-hidden="true">${layer(SKIN_LINE, 3)}${layer(SKIN, 0)}</g>`;
}

const eyes = `<g fill="${INK}" aria-hidden="true"><circle cx="53" cy="27" r="2"/><circle cx="67" cy="27" r="2"/></g>`;
const smile = `<path d="M54 34 Q60 38 66 34" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"/>`;

/** Un os dessiné d'un trait (contour foncé, os clair). */
const boneStroke = (d, w, cls = '') => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 2.4}" stroke-linecap="round"/>`
  + `<path d="${d}" fill="none" class="${cls}" stroke="${BONE}" stroke-width="${w}" stroke-linecap="round"/>`;
/** Une forme pleine (os ou organe). */
const shape = (d, fill, cls = 'bz') => `<path d="${d}" class="${cls}" fill="${fill}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>`;
/** La surface invisible, plus large, que le doigt touche. */
const hit = (markup) => markup.replace(/^<(\w+)/, '<$1 class="body-hit" fill="transparent" stroke="transparent"');

/** Une partie à toucher (data-zone), avec son nom pour les lecteurs d'écran. */
const zone = (id, name, visible, hitArea = '') => `<g class="body-zone" data-zone="${id}" role="button" tabindex="0" aria-label="${name}">${visible}${hitArea ? hit(hitArea) : ''}</g>`;

/** Le squelette : le crâne, les côtes, la colonne vertébrale, le bassin, le fémur (les autres os sont dessinés seulement). */
function skeletonParts() {
  const side = (f) => [f(1), f(-1)].join(''); // côté gauche, puis son reflet
  const mx = (x, s) => (s > 0 ? x : 120 - x);
  const decor = side((s) => boneStroke(`M${mx(58, s)} 49 Q${mx(48, s)} 46 ${mx(39, s)} 52`, 3)
    + boneStroke(`M${mx(38, s)} 56 L${mx(31, s)} 102`, 4.5) + boneStroke(`M${mx(30, s)} 109 L${mx(26, s)} 147`, 4)
    + `<circle cx="${mx(26, s)}" cy="154" r="3.4" fill="${BONE}" stroke="${INK}" stroke-width="1.2"/>`
    + `<circle cx="${mx(48, s)}" cy="197" r="3.2" fill="${BONE}" stroke="${INK}" stroke-width="1.2"/>`
    + boneStroke(`M${mx(48, s)} 202 L${mx(47, s)} 233`, 4.5) + boneStroke(`M${mx(47, s)} 238 L${mx(40, s)} 241`, 3.5));
  const ribs = Array.from({ length: 6 }, (_, i) => {
    const y = 57 + i * 7;
    return boneStroke(`M57 ${y} C46 ${y - 3} 38 ${y + 2} 41 ${y + 9}`, 2.6, 'bz-line') + boneStroke(`M63 ${y} C74 ${y - 3} 82 ${y + 2} 79 ${y + 9}`, 2.6, 'bz-line');
  }).join('');
  const spine = Array.from({ length: 15 }, (_, i) => `<rect x="57" y="${41 + i * 6}" width="6" height="4.6" rx="1.5" class="bz" fill="${BONE}" stroke="${INK}" stroke-width="1"/>`).join('');
  const femur = side((s) => zone('femur', 'le fémur',
    boneStroke(`M${mx(50, s)} 152 L${mx(48, s)} 191`, 5.5, 'bz-line'),
    `<path d="M${mx(50, s)} 150 L${mx(48, s)} 193" stroke-width="14"/>`));
  const skull = shape('M60 6 C73 6 77 15 76 23 C75 30 71 32 70 38 L50 38 C49 32 45 30 44 23 C43 15 47 6 60 6 Z', BONE)
    + `<g fill="#d9cfc0" aria-hidden="true"><ellipse cx="53.5" cy="22" rx="3.6" ry="4.2"/><ellipse cx="66.5" cy="22" rx="3.6" ry="4.2"/><path d="M60 26 L58 31 L62 31 Z"/></g>`
    + `<path d="M52 34 H68" stroke="#b9ad9b" stroke-width="1.2" aria-hidden="true"/>`;
  return `<g aria-hidden="true">${decor}</g>`
    + zone('cotes', 'les côtes', ribs, '<ellipse cx="60" cy="79" rx="23" ry="25"/>')
    + zone('colonne', 'la colonne vertébrale', spine, '<rect x="53" y="40" width="14" height="88"/>')
    + zone('bassin', 'le bassin', shape('M45 127 Q60 121 75 127 Q81 138 71 148 Q65 141 60 143 Q55 141 49 148 Q39 138 45 127 Z', BONE), '<ellipse cx="60" cy="136" rx="20" ry="13"/>')
    + femur
    + zone('crane', 'le crâne', skull, '<circle cx="60" cy="23" r="18"/>');
}

/** Les articulations : un rond en pointillés sur chacune, des deux côtés du corps. */
export const JOINT_SPOTS = {
  epaule: [[38, 53], [82, 53]], coude: [[30, 106], [90, 106]], poignet: [[26, 150], [94, 150]],
  genou: [[48, 197], [72, 197]], cheville: [[47, 234], [73, 234]],
};

function jointParts() {
  return Object.entries(JOINT_SPOTS).map(([id, spots]) => spots.map(([x, y]) => zone(id, JOINTS[id].name,
    `<circle cx="${x}" cy="${y}" r="5.5" class="bz" fill="#fff" stroke="${INK}" stroke-width="1.6" stroke-dasharray="2.6 1.8"/>`,
    `<circle cx="${x}" cy="${y}" r="10"/>`)).join('')).join('');
}

const STOMACH = zone('estomac', 'l’estomac', shape('M70 101 C78 101 81 108 78 113 C75 119 66 119 61 115 C58 112 61 108 65 110 C68 111 70 109 69 106 Z', '#f5c25b'), '<ellipse cx="70" cy="109" rx="11" ry="9"/>');
const BOWELS = zone('intestins', 'les intestins',
  shape('M45 122 C45 117 75 117 75 122 L75 140 C75 145 45 145 45 140 Z', '#eaa77d')
  + '<path d="M49 125 H71 Q74 128 71 131 H49 Q46 134 49 137 H71" fill="none" stroke="#a8653f" stroke-width="1.3"/>',
  '<rect x="43" y="117" width="34" height="29"/>');

/** Les organes : le cerveau, les poumons, le cœur, l'estomac, les intestins. */
function organParts() {
  const brain = shape('M47 17 C46 10 53 5 60 6 C67 5 74 10 73 17 C74 23 68 26 60 25 C52 26 46 23 47 17 Z', '#f6b8c8')
    + '<path d="M53 10 Q56 14 53 19 M60 8 Q63 13 60 17 Q57 21 60 24 M67 10 Q64 14 67 19" fill="none" stroke="#a35470" stroke-width="1"/>';
  const lungs = shape('M55 60 C46 57 40 68 40 80 C40 92 44 97 50 96 C54 95 56 90 56 84 Z', '#f4a7a3')
    + shape('M65 60 C74 57 80 68 80 80 C80 92 76 97 70 96 C67 95 65 92 65 90 Z', '#f4a7a3');
  const heart = shape('M63 98 C53 91 51 83 56 78 C59 76 62 77 63 80 C64 77 67 76 70 78 C75 83 73 91 63 98 Z', '#e04a5a');
  return `<path d="M60 40 V58 M60 58 Q57 60 55 63 M60 58 Q63 60 65 63" fill="none" stroke="${SKIN_LINE}" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"/>`
    + zone('cerveau', 'le cerveau', brain, '<ellipse cx="60" cy="16" rx="15" ry="12"/>')
    + zone('poumons', 'les poumons', lungs)
    + zone('coeur', 'le cœur', heart, '<circle cx="63" cy="86" r="11"/>')
    + STOMACH + BOWELS;
}

/** Le trajet des aliments : la bouche, l'œsophage, l'estomac, les intestins. */
function digestionParts() {
  const tube = 'M60 38 C60 60 62 80 66 101';
  return zone('oesophage', 'l’œsophage',
    `<path d="${tube}" fill="none" stroke="${INK}" stroke-width="5.6" stroke-linecap="round"/><path d="${tube}" fill="none" class="bz-line" stroke="#f0a35e" stroke-width="3.4" stroke-linecap="round"/>`,
    `<path d="${tube}" stroke-width="13"/>`)
    + STOMACH + BOWELS
    + zone('bouche', 'la bouche', `<ellipse cx="60" cy="34" rx="6" ry="3.2" class="bz" fill="#d9546a" stroke="${INK}" stroke-width="1"/>`, '<circle cx="60" cy="34" r="8"/>');
}

/** Où s'affiche la coche (ou le numéro) d'une partie trouvée. */
const BADGES = {
  crane: [60, 20], cotes: [45, 70], colonne: [60, 116], bassin: [60, 134], femur: [49, 172],
  epaule: [38, 53], coude: [30, 106], poignet: [26, 150], genou: [48, 197], cheville: [47, 234],
  cerveau: [60, 16], poumons: [47, 80], coeur: [63, 87], estomac: [70, 109], intestins: [60, 131],
  bouche: [60, 34], oesophage: [61, 66],
};

const VIEWS = {
  squelette: { label: 'Le squelette d’un enfant', parts: () => skeletonParts() },
  articulations: { label: 'Un enfant de face', parts: () => eyes + smile + jointParts() },
  organes: { label: 'Les organes dans le corps', parts: () => eyes + smile + organParts() },
  digestion: { label: 'Le trajet des aliments dans le corps', parts: () => eyes + digestionParts() },
};
export const BODY_VIEWS = Object.keys(VIEWS);

/** « Ça, c’est le crâne. », « Ça, ce sont les côtes. » : ce que dit Estelle d'une partie touchée par erreur. */
export function voiciPartie(name) {
  return `${/^les /.test(name) ? 'Ça, ce sont' : 'Ça, c’est'} ${name}.`;
}

/** Le dessin du corps (appelé par main.js) : chaque partie à toucher porte data-zone. */
export function bodySvg(view) {
  const v = VIEWS[view] || VIEWS.squelette;
  const ids = [...new Set([...v.parts().matchAll(/data-zone="([^"]+)"/g)].map((m) => m[1]))];
  const badges = ids.map((id) => `<g class="body-badge" data-badge="${id}" transform="translate(${BADGES[id].join(' ')})"><circle r="6.5"/><text y="3.2"></text></g>`).join('');
  return `<svg viewBox="0 0 120 250" class="body-svg">${silhouette()}${v.parts()}<g aria-hidden="true">${badges}</g></svg>`;
}

// ================================================================= Le corps humain

// Les parties à toucher sur chaque dessin, et ce qu'on en dit quand on les a trouvées.
export const BONES = {
  crane: { name: 'le crâne', says: 'Oui, c’est le crâne : il protège le cerveau.' },
  cotes: { name: 'les côtes', says: 'Oui, ce sont les côtes : elles protègent le cœur et les poumons.' },
  colonne: { name: 'la colonne vertébrale', says: 'Oui, c’est la colonne vertébrale : elle soutient le dos.' },
  bassin: { name: 'le bassin', says: 'Oui, c’est le bassin : les jambes y sont attachées.' },
  femur: { name: 'le fémur', says: 'Oui, c’est le fémur : l’os de la cuisse, le plus long du corps.' },
};
export const JOINTS = {
  epaule: { name: 'l’épaule', limb: 'bras', says: 'Oui, c’est l’épaule : elle fait tourner le bras.' },
  coude: { name: 'le coude', limb: 'bras', says: 'Oui, c’est le coude : le bras plie au coude.' },
  poignet: { name: 'le poignet', limb: 'bras', says: 'Oui, c’est le poignet : la main plie au poignet.' },
  genou: { name: 'le genou', limb: 'jambe', says: 'Oui, c’est le genou : la jambe plie au genou.' },
  cheville: { name: 'la cheville', limb: 'jambe', says: 'Oui, c’est la cheville : le pied bouge à la cheville.' },
};
export const ORGANS = {
  cerveau: { name: 'le cerveau', says: 'Oui, c’est le cerveau : il commande tout le corps.' },
  poumons: { name: 'les poumons', says: 'Oui, ce sont les poumons : ils se remplissent d’air.' },
  coeur: { name: 'le cœur', says: 'Oui, c’est le cœur : il envoie le sang dans tout le corps.' },
  estomac: { name: 'l’estomac', says: 'Oui, c’est l’estomac : il écrase et mélange les aliments.' },
  intestins: { name: 'les intestins', says: 'Oui, ce sont les intestins : ce qui est bon dans les aliments passe dans le sang.' },
};
export const DIGESTION = ['bouche', 'oesophage', 'estomac', 'intestins'];
const DIGESTION_NAMES = { bouche: 'la bouche', oesophage: 'l’œsophage', estomac: 'l’estomac', intestins: 'les intestins' };
const ZONE_SETS = { squelette: BONES, articulations: JOINTS, organes: ORGANS };

/** « Touche le crâne. » sur le dessin. */
function touchPart(view, id) {
  const parts = ZONE_SETS[view];
  return {
    key: `corps:toucher:${view}:${id}`,
    interaction: 'body',
    text: `Touche ${parts[id].name}.`,
    instruction: `Touche ${parts[id].name}.`,
    stage: { type: 'body', view, label: VIEWS[view].label },
    choices: Object.entries(parts).map(([value, p]) => ({ value, label: p.name, name: p.name })),
    answer: id,
    success: { speak: parts[id].says },
  };
}

/** Le trajet des aliments : toucher, dans l'ordre, les parties où ils passent. */
function digestionPath() {
  const text = 'Touche, dans l’ordre, les endroits où passent les aliments.';
  return {
    key: 'corps:trajet',
    interaction: 'body',
    text,
    instruction: text,
    stage: { type: 'body', view: 'digestion', label: VIEWS.digestion.label },
    choices: DIGESTION.map((value) => ({ value, label: DIGESTION_NAMES[value], name: DIGESTION_NAMES[value] })),
    sequence: DIGESTION,
    answer: DIGESTION.map((id) => DIGESTION_NAMES[id]).join(', '),
    success: { speak: 'La bouche, l’œsophage, l’estomac, puis les intestins.' },
  };
}

// ---------------------------------------------------------------- 1. Le squelette

function skeleton(rng) {
  return touchPart('squelette', pick(rng, Object.keys(BONES)));
}

// ---------------------------------------------------------------- 2. Les articulations

// Ce qui bouge pour… : la bonne articulation ; les autres réponses viennent de l'autre membre
// (pour lever le bras, on ne propose jamais le coude).
export const JOINT_USES = [
  { emoji: '🙋', text: 'Pour lever le bras, qu’est-ce qui bouge ?', answer: 'epaule' },
  { emoji: '💪', text: 'Pour plier le bras, qu’est-ce qui bouge ?', answer: 'coude' },
  { emoji: '✋', text: 'Pour plier la main, qu’est-ce qui bouge ?', answer: 'poignet' },
  { emoji: '🦵', text: 'Pour plier la jambe, qu’est-ce qui bouge ?', answer: 'genou' },
  { emoji: '🦶', text: 'Pour lever la pointe du pied, qu’est-ce qui bouge ?', answer: 'cheville' },
];
const JOINT_ORDER = Object.keys(JOINTS);

function joints(rng) {
  if (rng() < 0.65) return touchPart('articulations', pick(rng, JOINT_ORDER));
  const use = pick(rng, JOINT_USES);
  const limb = JOINTS[use.answer].limb;
  const others = sample(rng, JOINT_ORDER.filter((j) => JOINTS[j].limb !== limb), 2);
  const options = inOrder(JOINT_ORDER, [use.answer, ...others]).map((j) => JOINTS[j].name);
  return textQuestion({
    key: `corps:articulation:${use.answer}:${options.join(',')}`,
    text: use.text,
    emoji: use.emoji,
    options,
    answer: JOINTS[use.answer].name,
    success: JOINTS[use.answer].says,
  });
}

// ---------------------------------------------------------------- 3. Les besoins du corps

export const NEEDS = {
  eau: { emoji: '💧', name: 'boire de l’eau', says: 'Oui : ton corps a besoin d’eau, surtout quand il fait chaud ou quand tu bouges.' },
  dormir: { emoji: '😴', name: 'dormir', says: 'Oui : en dormant, ton corps se repose et grandit.' },
  manger: { emoji: '🍽️', name: 'manger', says: 'Oui : les aliments donnent de l’énergie à ton corps.' },
  bouger: { emoji: '🏃', name: 'bouger', says: 'Oui : bouger rend les muscles et le cœur plus forts.' },
};
export const NEED_CASES = [
  { emoji: '🥵', text: 'Tu as couru et tu as très soif.', need: 'eau' },
  { emoji: '☀️', text: 'Il fait très chaud et tu transpires beaucoup.', need: 'eau' },
  { emoji: '🥱', text: 'Tu bâilles et tes yeux se ferment tout seuls.', need: 'dormir' },
  { emoji: '🌙', text: 'Il est tard et la journée a été longue.', need: 'dormir' },
  { emoji: '🕛', text: 'Depuis ce matin, tu n’as rien mangé et ton ventre gargouille.', need: 'manger' },
  { emoji: '🍽️', text: 'C’est midi et ton ventre crie famine.', need: 'manger' },
  { emoji: '📺', text: 'Tu regardes un écran depuis très longtemps, sans bouger.', need: 'bouger' },
  { emoji: '🛋️', text: 'Ton corps ne bouge pas depuis des heures.', need: 'bouger' },
];
const NEED_ASK = 'De quoi ton corps a-t-il besoin ?';

function needs(rng) {
  const item = pick(rng, NEED_CASES);
  const options = shuffle(rng, [item.need, ...sample(rng, Object.keys(NEEDS).filter((n) => n !== item.need), 2)]);
  return {
    key: `corps:besoin:${item.text}`,
    text: `${item.text} ${NEED_ASK}`,
    instruction: [item.text, NEED_ASK],
    stage: pictureStage(item.emoji),
    choices: options.map((n) => ({ value: n, label: `${NEEDS[n].emoji} ${NEEDS[n].name}` })),
    choiceStyle: 'sentences',
    answer: item.need,
    success: { speak: NEEDS[item.need].says },
  };
}

// ---------------------------------------------------------------- 4. Grandir

export const AGES = [
  { emoji: '👶', name: 'le bébé', scale: 0.55 }, { emoji: '🧒', name: 'l’enfant', scale: 0.7 },
  { emoji: '🧑', name: 'l’adolescent', scale: 0.85 }, { emoji: '🧑‍💼', name: 'l’adulte', scale: 1 },
  { emoji: '🧓', name: 'la personne âgée', scale: 1 },
];
const AGES_SAID = 'Le bébé, l’enfant, l’adolescent, l’adulte, puis la personne âgée.';

function growingUp(rng) {
  if (rng() < 0.6) {
    let order = shuffle(rng, AGES.map((_, i) => i));
    if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]]; // jamais déjà rangé
    const text = 'Range du plus jeune au plus âgé.';
    return {
      key: `corps:grandir:${order.join('')}`,
      interaction: 'order',
      text,
      instruction: text,
      stage: { type: 'none' },
      items: order.map((i) => ({ value: i, emoji: AGES[i].emoji, label: AGES[i].name, caption: AGES[i].name, scale: AGES[i].scale })),
      order: 'asc',
      choices: [],
      answer: null,
      success: { speak: AGES_SAID },
    };
  }
  // juste avant ou juste après : une seule bonne réponse
  const after = rng() < 0.5;
  const i = after ? 1 + Math.floor(rng() * (AGES.length - 1)) : Math.floor(rng() * (AGES.length - 1));
  const from = AGES[after ? i - 1 : i + 1];
  const answer = AGES[i];
  const text = after ? `Qui vient juste après ${from.name} ?` : `Qui vient juste avant ${from.name} ?`;
  const options = shuffle(rng, [answer, ...sample(rng, AGES.filter((a) => a !== answer && a !== from), 2)]);
  return {
    key: `corps:age:${text}`,
    text,
    instruction: text,
    stage: { type: 'none' },
    choices: options.map((a) => ({ value: a.name, label: a.name, emoji: a.emoji, caption: a.name, scale: a.scale, name: a.name })),
    choiceStyle: 'steps',
    answer: answer.name,
    success: { speak: AGES_SAID },
  };
}

// ---------------------------------------------------------------- 5. La respiration

// Deux réponses (toujours dans le même ordre), ou trois (mélangées, lues à voix haute).
export const BREATHING = [
  { emoji: '🧒', text: 'Par où l’air entre-t-il dans ton corps ?', answer: 'par le nez', wrong: ['par les oreilles', 'par les yeux'], says: 'L’air entre par le nez et par la bouche.' },
  { emoji: '🧒', text: 'Par où l’air entre-t-il dans ton corps ?', answer: 'par la bouche', wrong: ['par les oreilles', 'par les yeux'], says: 'L’air entre par le nez et par la bouche.' },
  { emoji: '🌬️', text: 'Où va l’air que tu respires ?', answer: 'dans les poumons', wrong: ['dans les pieds', 'dans les os'], says: 'L’air va dans les poumons.' },
  { emoji: '🏃', text: 'Quand tu cours, tu respires…', options: ['plus vite', 'moins vite'], answer: 'plus vite', says: 'Quand on court, on respire plus vite : les muscles ont besoin de plus d’air.' },
  { emoji: '😴', text: 'Quand tu dors, tu respires…', options: ['plus vite', 'moins vite'], answer: 'moins vite', says: 'Quand on dort, on respire plus lentement, sans y penser.' },
  { emoji: '🎈', text: 'Quand tu inspires, ta poitrine…', options: ['se gonfle', 'se dégonfle'], answer: 'se gonfle', says: 'Quand on inspire, l’air entre et la poitrine se gonfle.' },
  { emoji: '🎂', text: 'Quand tu souffles, l’air…', options: ['entre', 'sort'], answer: 'sort', says: 'Quand on souffle, l’air sort des poumons.' },
  { emoji: '🏊', text: 'Sous l’eau, peux-tu respirer comme un poisson ?', options: ['oui', 'non'], answer: 'non', says: 'Non : nos poumons ont besoin d’air. Sous l’eau, on retient sa respiration.' },
];

/** Une question de la liste : deux réponses fixes, ou trois réponses mélangées. */
function listQuestion(rng, item, topic) {
  if (item.options) {
    return twoWay({
      key: `${topic}:${item.text}:${item.answer}`,
      text: item.text,
      instruction: [item.text, `${capitalize(spokenList(item.options))} ?`],
      emoji: item.emoji,
      options: item.options,
      answer: item.answer,
      success: item.says,
    });
  }
  return textQuestion({
    key: `${topic}:${item.text}:${item.answer}`,
    text: item.text,
    emoji: item.emoji,
    options: shuffle(rng, [item.answer, ...item.wrong]),
    answer: item.answer,
    success: item.says,
    style: 'sentences',
  });
}

function breathing(rng) {
  if (rng() < 0.25) return touchPart('organes', 'poumons');
  return listQuestion(rng, pick(rng, BREATHING), 'corps:respiration');
}

// ---------------------------------------------------------------- 6. Le cœur et le sang

export const HEART = [
  { emoji: '🏃', text: 'Quand tu cours, ton cœur bat…', options: ['plus vite', 'moins vite'], answer: 'plus vite', says: 'Quand on court, le cœur bat plus vite : il envoie plus de sang aux muscles.' },
  { emoji: '😴', text: 'Quand tu dors, ton cœur bat…', options: ['plus vite', 'moins vite'], answer: 'moins vite', says: 'Quand on dort, le cœur bat plus lentement : le corps se repose.' },
];
export const HEART_FACTS = [
  { emoji: '🫀', text: 'Le cœur est un muscle.', answer: 'vrai', why: 'Il bat jour et nuit, même quand on dort.' },
  { emoji: '🫀', text: 'Le sang circule dans tout le corps.', answer: 'vrai', why: 'Il passe dans de petits tuyaux : les vaisseaux sanguins.' },
  { emoji: '🫀', text: 'Le cœur est dans le ventre.', answer: 'faux', why: 'Le cœur est dans la poitrine, entre les deux poumons.' },
  { emoji: '✋', text: 'En posant la main sur ta poitrine, tu peux sentir ton cœur battre.', answer: 'vrai', why: 'On peut aussi le sentir au poignet.' },
];
// Quel organe… : la bonne image et deux autres organes.
export const ORGAN_PICTURES = [
  { emoji: '🫀', name: 'le cœur' }, { emoji: '🧠', name: 'le cerveau' }, { emoji: '🫁', name: 'les poumons' },
];
export const ORGAN_ASKS = [
  { text: 'Quel organe envoie le sang dans tout le corps ?', answer: 'le cœur', says: 'Le cœur envoie le sang dans tout le corps.' },
  { text: 'Quel organe commande tout le corps ?', answer: 'le cerveau', says: 'Le cerveau commande tout le corps : il pense, il voit, il entend.' },
  { text: 'Quel organe se remplit d’air ?', answer: 'les poumons', says: 'Les poumons se remplissent d’air quand on inspire.' },
];

function heart(rng) {
  const r = rng();
  if (r < 0.25) return touchPart('organes', 'coeur');
  if (r < 0.45) return listQuestion(rng, pick(rng, HEART), 'corps:coeur');
  if (r < 0.7) {
    const ask = pick(rng, ORGAN_ASKS);
    const answer = ORGAN_PICTURES.find((o) => o.name === ask.answer);
    return pictureQuestion({
      key: `corps:organe:${ask.text}`,
      text: ask.text,
      answer,
      others: ORGAN_PICTURES.filter((o) => o !== answer),
      success: ask.says,
      rng,
    });
  }
  return trueOrFalse(pick(rng, HEART_FACTS), 'corps:coeur');
}

// ---------------------------------------------------------------- 7. Les os et les muscles

export const BONES_MUSCLES = [
  { emoji: '🦴', text: 'Les os sont durs et solides.', answer: 'vrai', why: 'Ensemble, ils forment le squelette, qui tient le corps.' },
  { emoji: '🦴', text: 'Le squelette est mou comme de la pâte.', answer: 'faux', why: 'Les os sont durs : le squelette tient le corps.' },
  { emoji: '💪', text: 'Les muscles font bouger les os.', answer: 'vrai', why: 'Les muscles tirent sur les os.' },
  { emoji: '🏃', text: 'Sans muscles, on pourrait quand même courir.', answer: 'faux', why: 'Pour bouger, on a besoin des muscles.' },
  { emoji: '⚽', text: 'Quand on fait du sport, les muscles deviennent plus forts.', answer: 'vrai', why: 'Bouger chaque jour rend les muscles plus forts.' },
  { emoji: '😄', text: 'Pour sourire, on utilise des muscles du visage.', answer: 'vrai', why: 'Le visage a beaucoup de petits muscles.' },
  { emoji: '📏', text: 'Quand on grandit, les os grandissent aussi.', answer: 'vrai', why: 'C’est pour cela qu’on devient plus grand.' },
  { emoji: '💪', text: 'Quand tu plies le bras, le muscle du bras se gonfle.', answer: 'vrai', why: 'Ce muscle s’appelle le biceps.' },
];
export const SKELETON_ASKS = [
  { emoji: '💪', text: 'Qu’est-ce qui fait bouger les os ?', answer: 'les muscles', wrong: ['les cheveux', 'les ongles'], says: 'Les muscles tirent sur les os pour les faire bouger.' },
  { emoji: '🧠', text: 'Quel os protège le cerveau ?', answer: 'le crâne', wrong: ['le fémur', 'le bassin'], says: 'Le crâne protège le cerveau.' },
  { emoji: '🫁', text: 'Quels os protègent le cœur et les poumons ?', answer: 'les côtes', wrong: ['le crâne', 'le fémur'], says: 'Les côtes protègent le cœur et les poumons.' },
  { emoji: '📏', text: 'Quel est l’os le plus long du corps ?', answer: 'le fémur', wrong: ['le crâne', 'le bassin'], says: 'Le fémur, l’os de la cuisse, est le plus long du corps.' },
];

function bonesMuscles(rng) {
  if (rng() < 0.4) return listQuestion(rng, pick(rng, SKELETON_ASKS), 'corps:os');
  return trueOrFalse(pick(rng, BONES_MUSCLES), 'corps:muscles');
}

// ---------------------------------------------------------------- 8. Les dents

export const TEETH = [
  { name: 'les incisives', use: 'à couper', ask: 'Quelles dents, devant, coupent les aliments ?', says: 'Les incisives, devant, coupent les aliments.' },
  { name: 'les canines', use: 'à déchirer', ask: 'Quelles dents pointues déchirent les aliments ?', says: 'Les canines, pointues, déchirent les aliments.' },
  { name: 'les molaires', use: 'à écraser', ask: 'Quelles dents, au fond de la bouche, écrasent les aliments ?', says: 'Les molaires, au fond de la bouche, écrasent les aliments.' },
];
export const BITES = [
  { emoji: '🍎', text: 'Pour croquer un morceau de pomme, tu utilises…', answer: 'les incisives' },
  { emoji: '🍖', text: 'Pour déchirer un morceau de viande, tu utilises…', answer: 'les canines' },
  { emoji: '🥕', text: 'Pour bien mâcher la carotte, tu utilises…', answer: 'les molaires' },
];
export const MILK_TEETH = [
  { emoji: '👶', text: 'Les premières dents d’un bébé sont des dents…', answer: 'de lait', says: 'Les premières dents sont les dents de lait.' },
  { emoji: '🦷', text: 'Les dents qui tombent vers six ans sont des dents…', answer: 'de lait', says: 'Les dents de lait tombent, et d’autres poussent à leur place.' },
  { emoji: '🧑', text: 'Les dents qui doivent durer toute la vie sont des dents…', answer: 'définitives', says: 'Les dents définitives ne repoussent pas : on en prend bien soin.' },
  { emoji: '🪥', text: 'Les dents qui poussent à la place des dents de lait sont des dents…', answer: 'définitives', says: 'Ce sont les dents définitives : elles doivent durer toute la vie.' },
];
const TEETH_NAMES = TEETH.map((t) => t.name);

function teeth(rng) {
  const r = rng();
  if (r < 0.3) {
    const item = pick(rng, MILK_TEETH);
    return listQuestion(rng, { ...item, options: ['de lait', 'définitives'] }, 'corps:dents');
  }
  if (r < 0.55) {
    const tooth = pick(rng, TEETH);
    return textQuestion({ key: `corps:dents:${tooth.ask}`, text: tooth.ask, emoji: '🦷', options: TEETH_NAMES, answer: tooth.name, success: tooth.says });
  }
  if (r < 0.8) {
    const tooth = pick(rng, TEETH);
    return textQuestion({
      key: `corps:dents:${tooth.name}`, text: `À quoi servent ${tooth.name} ?`, emoji: '🦷', options: TEETH.map((t) => t.use), answer: tooth.use, success: tooth.says,
    });
  }
  const bite = pick(rng, BITES);
  const tooth = TEETH.find((t) => t.name === bite.answer);
  return textQuestion({ key: `corps:dents:${bite.text}`, text: bite.text, emoji: bite.emoji, options: TEETH_NAMES, answer: tooth.name, success: tooth.says });
}

// ---------------------------------------------------------------- 9. Le trajet des aliments

export const FOOD_PATH = [
  { text: 'Les dents mâchent les aliments dans…', answer: 'bouche', says: 'Les dents mâchent les aliments dans la bouche.' },
  { text: 'Après la bouche, les aliments descendent dans…', answer: 'oesophage', says: 'L’œsophage est le tuyau qui descend jusqu’à l’estomac.' },
  { text: 'Après l’œsophage, les aliments arrivent dans…', answer: 'estomac', says: 'L’estomac écrase et mélange les aliments.' },
  { text: 'Après l’estomac, les aliments passent dans…', answer: 'intestins', says: 'Dans les intestins, ce qui est bon dans les aliments passe dans le sang.' },
  { text: 'Le tuyau qui va de la bouche à l’estomac s’appelle…', answer: 'oesophage', says: 'L’œsophage est le tuyau qui descend jusqu’à l’estomac.' },
];

function foodPath(rng) {
  const r = rng();
  if (r < 0.45) return digestionPath();
  if (r < 0.6) return touchPart('organes', pick(rng, ['estomac', 'intestins']));
  const item = pick(rng, FOOD_PATH);
  const chosen = [item.answer, ...sample(rng, DIGESTION.filter((d) => d !== item.answer), 2)];
  return textQuestion({
    key: `corps:digestion:${item.text}:${chosen.join(',')}`,
    text: item.text,
    emoji: '🍽️',
    options: inOrder(DIGESTION, chosen).map((d) => DIGESTION_NAMES[d]),
    answer: DIGESTION_NAMES[item.answer],
    success: item.says,
  });
}

// ---------------------------------------------------------------- Le jeu

const CORPS_LEVELS = [skeleton, joints, needs, growingUp, breathing, heart, bonesMuscles, teeth, foodPath];

export const corps = {
  id: 'corps',
  domain: 'sciences',
  title: 'Le corps humain',
  icon: '🦴',
  skill: 'Connaître son corps : le squelette, les articulations, les organes, les dents, grandir',
  levels: [
    'Le squelette', 'Les articulations', 'Les besoins du corps', 'Grandir', 'La respiration',
    'Le cœur et le sang', 'Les os et les muscles', 'Les dents', 'Le trajet des aliments', 'Tout le corps',
  ],
  generate(level, rng) {
    // niveau 10 : un peu de tout, avec parfois le cerveau à toucher
    if (level >= 10) {
      if (rng() < 0.1) return touchPart('organes', pick(rng, Object.keys(ORGANS)));
      return pick(rng, CORPS_LEVELS)(rng);
    }
    return CORPS_LEVELS[level - 1](rng);
  },
};

// ================================================================= Les animaux et leur milieu

// ---------------------------------------------------------------- 1. Comment se déplace-t-il ?

export const MOVES = ['vole', 'nage', 'rampe', 'marche', 'saute'];
// `no` : ce que l'animal ne fait jamais (seuls ces mots sont proposés à côté de la bonne réponse).
export const MOVERS = [
  { emoji: '🦅', name: 'l’aigle', move: 'vole', no: ['nage', 'rampe'] },
  { emoji: '🐝', name: 'l’abeille', move: 'vole', no: ['nage', 'rampe', 'saute'] },
  { emoji: '🦋', name: 'le papillon', move: 'vole', no: ['nage', 'rampe', 'saute'] },
  { emoji: '🦈', name: 'le requin', move: 'nage', no: ['vole', 'rampe', 'marche', 'saute'] },
  { emoji: '🐡', name: 'le poisson-globe', move: 'nage', no: ['vole', 'rampe', 'marche'] },
  { emoji: '🐬', name: 'le dauphin', move: 'nage', no: ['vole', 'rampe', 'marche'] },
  { emoji: '🐍', name: 'le serpent', move: 'rampe', no: ['vole', 'marche', 'saute'] },
  { emoji: '🐛', name: 'la chenille', move: 'rampe', no: ['vole', 'nage', 'saute'] },
  { emoji: '🪱', name: 'le ver de terre', move: 'rampe', no: ['vole', 'marche', 'saute'] },
  { emoji: '🐌', name: 'l’escargot', move: 'rampe', no: ['vole', 'marche', 'saute'] },
  { emoji: '🐘', name: 'l’éléphant', move: 'marche', no: ['vole', 'rampe', 'saute'] },
  { emoji: '🦒', name: 'la girafe', move: 'marche', no: ['vole', 'rampe'] },
  { emoji: '🐄', name: 'la vache', move: 'marche', no: ['vole', 'rampe'] },
  { emoji: '🦘', name: 'le kangourou', move: 'saute', no: ['vole', 'rampe'] },
  { emoji: '🐸', name: 'la grenouille', move: 'saute', no: ['vole', 'rampe'] },
  { emoji: '🦗', name: 'le criquet', move: 'saute', no: ['nage', 'rampe'] },
];

function moving(rng) {
  if (rng() < 0.35) {
    // « Touche un animal qui rampe. » : les deux autres ne rampent jamais
    const move = pick(rng, MOVES);
    const answer = pick(rng, MOVERS.filter((m) => m.move === move));
    return pictureQuestion({
      key: `milieux:deplace:${move}:${answer.name}`,
      text: `Touche un animal qui ${move}.`,
      answer,
      others: sample(rng, MOVERS.filter((m) => m.no.includes(move)), 2),
      success: `Oui, ${answer.name} ${move}.`,
      rng,
    });
  }
  const animal = pick(rng, MOVERS);
  const options = inOrder(MOVES, [animal.move, ...sample(rng, animal.no, 2)]);
  return textQuestion({
    key: `milieux:deplace:${animal.name}:${options.join(',')}`,
    text: `Pour se déplacer, ${animal.name}…`,
    emoji: animal.emoji,
    options,
    answer: animal.move,
    success: `Oui, ${animal.name} ${animal.move}.`,
  });
}

// ---------------------------------------------------------------- 2. Mare, forêt, mer, désert

// D'autres animaux que ceux du jeu « Les animaux » (ferme, mer, forêt, savane, banquise).
// La mare et la forêt sont voisines (une grenouille vit aussi au bord d'un bois) : jamais l'une
// proposée contre l'autre.
export const PLACES = {
  mare: { emoji: '💧', label: 'dans la mare', near: 'foret' },
  foret: { emoji: '🌲', label: 'dans la forêt', near: 'mare' },
  mer: { emoji: '🌊', label: 'dans la mer' },
  desert: { emoji: '🏜️', label: 'dans le désert' },
};
export const DWELLERS = [
  { emoji: '🐸', name: 'la grenouille', place: 'mare', fact: 'Elle pond ses œufs dans l’eau de la mare.' },
  { emoji: '🦆', name: 'le canard colvert', place: 'mare', fact: 'Ses pattes palmées l’aident à nager.' },
  { emoji: '🐗', name: 'le sanglier', place: 'foret', fact: 'Il fouille la terre avec son groin.' },
  { emoji: '🦔', name: 'le hérisson', place: 'foret', fact: 'Il mange des vers, des insectes et des limaces.' },
  { emoji: '🦡', name: 'le blaireau', place: 'foret', fact: 'Il creuse son terrier sous les arbres.' },
  { emoji: '🐺', name: 'le loup', place: 'foret', fact: 'Il vit en meute avec d’autres loups.' },
  { emoji: '🦈', name: 'le requin', place: 'mer', fact: 'Il respire sous l’eau avec ses branchies.' },
  { emoji: '🐡', name: 'le poisson-globe', place: 'mer', fact: 'Il se gonfle comme un ballon quand il a peur.' },
  { emoji: '🦞', name: 'le homard', place: 'mer', fact: 'Il a deux grosses pinces.' },
  { emoji: '🦐', name: 'la crevette', place: 'mer', fact: 'Elle a dix pattes.' },
  { emoji: '🐪', name: 'le dromadaire', place: 'desert', fact: 'Il peut rester longtemps sans boire.' },
  { emoji: '🐫', name: 'le chameau', place: 'desert', fact: 'Il a deux bosses sur le dos.' },
  { emoji: '🦂', name: 'le scorpion', place: 'desert', fact: 'Il se cache sous les pierres pendant la journée.' },
];
const PLACE_ORDER = Object.keys(PLACES);
/** Les milieux qu'on peut proposer à côté de `place` (ni lui, ni son voisin). */
const farFrom = (place) => PLACE_ORDER.filter((p) => p !== place && p !== PLACES[place].near);

function habitats(rng) {
  if (rng() < 0.5) {
    const place = pick(rng, PLACE_ORDER);
    const answer = pick(rng, DWELLERS.filter((d) => d.place === place));
    return pictureQuestion({
      key: `milieux:qui:${place}:${answer.name}`,
      text: `Quel animal vit ${PLACES[place].label} ?`,
      answer,
      others: sample(rng, DWELLERS.filter((d) => farFrom(place).includes(d.place)), 2),
      success: [`Oui, ${answer.name} vit ${PLACES[place].label}.`, answer.fact],
      rng,
    });
  }
  const animal = pick(rng, DWELLERS);
  const options = inOrder(PLACE_ORDER, [animal.place, ...sample(rng, farFrom(animal.place), 2)]);
  const labels = options.map((p) => PLACES[p].label);
  return {
    key: `milieux:ou:${animal.name}:${options.join(',')}`,
    text: `Où vit ${animal.name} ?`,
    instruction: [`Où vit ${animal.name} ?`, `${capitalize(spokenList(labels))} ?`],
    stage: pictureStage(animal.emoji),
    choices: options.map((p) => ({ value: p, label: `${PLACES[p].emoji} ${PLACES[p].label}` })),
    choiceStyle: 'sentences',
    answer: animal.place,
    success: { speak: [`Oui, ${animal.name} vit ${PLACES[animal.place].label}.`, animal.fact] },
  };
}

// ---------------------------------------------------------------- 3. Traces et indices

// L'indice, la question, l'animal, et des animaux qui ne peuvent pas avoir laissé cet indice.
export const CLUES = [
  {
    emoji: '🪶', text: 'Tu trouves une plume par terre.', ask: 'Qui l’a perdue ?', answer: { emoji: '🐦', name: 'un oiseau' },
    others: [{ emoji: '🐱', name: 'un chat' }, { emoji: '🐟', name: 'un poisson' }, { emoji: '🐌', name: 'un escargot' }],
    says: 'Seuls les oiseaux ont des plumes.',
  },
  {
    emoji: '🕸️', text: 'Il y a une toile dans le coin du mur.', ask: 'Qui l’a tissée ?', answer: { emoji: '🕷️', name: 'une araignée' },
    others: [{ emoji: '🐞', name: 'une coccinelle' }, { emoji: '🐌', name: 'un escargot' }, { emoji: '🐟', name: 'un poisson' }],
    says: 'L’araignée tisse sa toile pour attraper des insectes.',
  },
  {
    emoji: '🐾', text: 'Dans la neige, tu vois des empreintes de pattes.', ask: 'Quel animal est passé par là ?', answer: { emoji: '🐶', name: 'un chien' },
    others: [{ emoji: '🐍', name: 'un serpent' }, { emoji: '🐟', name: 'un poisson' }, { emoji: '🐌', name: 'un escargot' }],
    says: 'Le chien a des pattes : il laisse des empreintes.',
  },
  {
    emoji: '🍃', text: 'Sur la feuille, il y a une trace de bave qui brille.', ask: 'Quel animal est passé par là ?', answer: { emoji: '🐌', name: 'un escargot' },
    others: [{ emoji: '🐦', name: 'un oiseau' }, { emoji: '🐞', name: 'une coccinelle' }, { emoji: '🦋', name: 'un papillon' }],
    says: 'L’escargot laisse une trace de bave en avançant.',
  },
  {
    emoji: '🌰', text: 'Sous le noisetier, il y a des noisettes rongées.', ask: 'Qui les a mangées ?', answer: { emoji: '🐿️', name: 'un écureuil' },
    others: [{ emoji: '🐟', name: 'un poisson' }, { emoji: '🐍', name: 'un serpent' }, { emoji: '🦋', name: 'un papillon' }],
    says: 'L’écureuil ronge les noisettes avec ses dents.',
  },
  {
    emoji: '🥚', text: 'Sous l’arbre, il y a une coquille d’œuf cassée.', ask: 'Qui est sorti de cet œuf ?', answer: { emoji: '🐣', name: 'un petit oiseau' },
    others: [{ emoji: '🐱', name: 'un chaton' }, { emoji: '🐶', name: 'un chiot' }, { emoji: '🐰', name: 'un lapereau' }],
    says: 'Le petit oiseau a cassé sa coquille pour sortir de l’œuf.',
  },
  {
    emoji: '🍯', text: 'Dans le tronc d’un vieil arbre, il y a du miel.', ask: 'Qui l’a fabriqué ?', answer: { emoji: '🐝', name: 'des abeilles' },
    others: [{ emoji: '🐜', name: 'des fourmis' }, { emoji: '🐞', name: 'des coccinelles' }, { emoji: '🦋', name: 'des papillons' }],
    says: 'Les abeilles fabriquent le miel avec le nectar des fleurs.',
  },
];

function clues(rng) {
  const clue = pick(rng, CLUES);
  return pictureQuestion({
    key: `milieux:indice:${clue.text}`,
    text: `${clue.text} ${clue.ask}`,
    instruction: [clue.text, clue.ask],
    emoji: clue.emoji,
    answer: clue.answer,
    others: sample(rng, clue.others, 2),
    success: clue.says,
    rng,
  });
}

// ---------------------------------------------------------------- 4. Insecte ou pas ?

export const INSECTS = [
  { emoji: '🐜', name: 'la fourmi' }, { emoji: '🐝', name: 'l’abeille' }, { emoji: '🦋', name: 'le papillon' },
  { emoji: '🐞', name: 'la coccinelle' }, { emoji: '🦗', name: 'le criquet' }, { emoji: '🪲', name: 'le scarabée' },
  { emoji: '🪰', name: 'la mouche' }, { emoji: '🦟', name: 'le moustique' },
];
// La chenille (une larve d'insecte) n'est jamais proposée : ni l'un ni l'autre pour un enfant.
export const NOT_INSECTS = [
  { emoji: '🕷️', name: 'l’araignée', legs: 8, why: 'Non : l’araignée a huit pattes. Ce n’est pas un insecte.' },
  { emoji: '🦂', name: 'le scorpion', legs: 8, why: 'Non : le scorpion a huit pattes. Ce n’est pas un insecte.' },
  { emoji: '🐌', name: 'l’escargot', legs: 0, why: 'Non : l’escargot n’a pas de pattes. Ce n’est pas un insecte.' },
  { emoji: '🪱', name: 'le ver de terre', legs: 0, why: 'Non : le ver de terre n’a pas de pattes. Ce n’est pas un insecte.' },
  { emoji: '🦀', name: 'le crabe', legs: 10, why: 'Non : le crabe a dix pattes. Ce n’est pas un insecte.' },
  { emoji: '🦐', name: 'la crevette', legs: 10, why: 'Non : la crevette a dix pattes. Ce n’est pas un insecte.' },
];
export const LEG_COUNTS = [
  { emoji: '🐜', name: 'un insecte', legs: 6 }, { emoji: '🕷️', name: 'une araignée', legs: 8 },
  { emoji: '🐞', name: 'une coccinelle', legs: 6 }, { emoji: '🦂', name: 'un scorpion', legs: 8 },
  { emoji: '🐝', name: 'une abeille', legs: 6 },
];
const LEGS = ['4', '6', '8'];
const LEG_WORDS = { 6: 'six', 8: 'huit' };
const IS_INSECT = 'Oui, c’est un insecte : il a six pattes.';

function insects(rng) {
  const r = rng();
  if (r < 0.4) {
    const yes = rng() < 0.5;
    const item = pick(rng, yes ? INSECTS : NOT_INSECTS);
    return twoWay({
      key: `milieux:insecte:${item.name}`,
      text: `${capitalize(item.name)}, c’est un insecte ?`,
      emoji: item.emoji,
      options: ['oui', 'non'],
      answer: yes ? 'oui' : 'non',
      success: yes ? IS_INSECT : item.why,
    });
  }
  if (r < 0.7) {
    const item = pick(rng, LEG_COUNTS);
    const text = `Combien de pattes a ${item.name} ?`;
    return {
      key: `milieux:pattes:${item.name}`,
      text,
      instruction: [text, 'Quatre, six ou huit ?'],
      stage: pictureStage(item.emoji),
      choices: LEGS.map((n) => ({ value: n, label: `${n} pattes` })),
      choiceStyle: 'words',
      answer: String(item.legs),
      success: { speak: item.legs === 6 ? `Oui, ${item.name} a six pattes.` : [`Oui, ${item.name} a ${LEG_WORDS[item.legs]} pattes.`, 'Ce n’est pas un insecte.'] },
    };
  }
  // une image parmi trois : l'insecte, ou celui qui n'en est pas un
  const findInsect = rng() < 0.5;
  const answer = pick(rng, findInsect ? INSECTS : NOT_INSECTS);
  return pictureQuestion({
    key: `milieux:insecte-image:${findInsect}:${answer.name}`,
    text: findInsect ? 'Touche l’insecte.' : 'Touche l’animal qui n’est pas un insecte.',
    answer,
    others: sample(rng, findInsect ? NOT_INSECTS : INSECTS, 2),
    success: findInsect ? IS_INSECT : answer.why,
    rng,
  });
}

// ---------------------------------------------------------------- 5. Vertébré ou invertébré ?

// Ni pieuvre (un invertébré au crâne de cartilage) ni méduse : des exemples sans hésitation.
export const VERTEBRATES = [
  { emoji: '🐱', name: 'le chat' }, { emoji: '🐟', name: 'le poisson' }, { emoji: '🐦', name: 'l’oiseau' },
  { emoji: '🐸', name: 'la grenouille' }, { emoji: '🐍', name: 'le serpent' }, { emoji: '🐢', name: 'la tortue' },
  { emoji: '🐴', name: 'le cheval' }, { emoji: '🦈', name: 'le requin' }, { emoji: '🦎', name: 'le lézard' },
  { emoji: '🐭', name: 'la souris' },
];
export const INVERTEBRATES = [
  { emoji: '🐌', name: 'l’escargot' }, { emoji: '🐜', name: 'la fourmi' }, { emoji: '🪱', name: 'le ver de terre' },
  { emoji: '🕷️', name: 'l’araignée' }, { emoji: '🦋', name: 'le papillon' }, { emoji: '🦀', name: 'le crabe' },
  { emoji: '🐝', name: 'l’abeille' }, { emoji: '🦞', name: 'le homard' }, { emoji: '🐞', name: 'la coccinelle' },
];
const VERTEBRATE_SAYS = 'Oui, c’est un vertébré : il a un squelette à l’intérieur, avec une colonne vertébrale.';
const INVERTEBRATE_SAYS = 'Oui, c’est un invertébré : il n’a pas d’os à l’intérieur du corps.';

function vertebrates(rng) {
  const backbone = rng() < 0.5;
  if (rng() < 0.6) {
    const item = pick(rng, backbone ? VERTEBRATES : INVERTEBRATES);
    const text = `${capitalize(item.name)}, c’est un vertébré ou un invertébré ?`;
    return twoWay({
      key: `milieux:vertebre:${item.name}`,
      text,
      emoji: item.emoji,
      options: ['vertébré', 'invertébré'],
      answer: backbone ? 'vertébré' : 'invertébré',
      success: backbone ? VERTEBRATE_SAYS : INVERTEBRATE_SAYS,
    });
  }
  const answer = pick(rng, backbone ? VERTEBRATES : INVERTEBRATES);
  return pictureQuestion({
    key: `milieux:squelette:${backbone}:${answer.name}`,
    text: backbone ? 'Touche l’animal qui a un squelette à l’intérieur du corps.' : 'Touche l’animal qui n’a pas d’os.',
    answer,
    others: sample(rng, backbone ? INVERTEBRATES : VERTEBRATES, 2),
    success: backbone ? VERTEBRATE_SAYS : INVERTEBRATE_SAYS,
    rng,
  });
}

// ---------------------------------------------------------------- 6. Les familles d'animaux

export const CLASSES = {
  mammifere: { label: 'un mammifère', fact: 'Les mammifères allaitent leurs petits.' },
  oiseau: { label: 'un oiseau', fact: 'Les oiseaux ont des plumes et un bec.' },
  poisson: { label: 'un poisson', fact: 'Les poissons respirent sous l’eau avec des branchies.' },
  reptile: { label: 'un reptile', fact: 'Les reptiles ont la peau couverte d’écailles.' },
  amphibien: { label: 'un amphibien', fact: 'Les amphibiens commencent leur vie dans l’eau, comme le têtard.' },
  insecte: { label: 'un insecte', fact: 'Les insectes ont six pattes.' },
};
const CLASS_ORDER = Object.keys(CLASSES);
// `trap` : la famille avec laquelle on le confond souvent, toujours proposée.
export const MEMBERS = [
  { emoji: '🐬', name: 'le dauphin', kind: 'mammifere', trap: 'poisson' },
  { emoji: '🐳', name: 'la baleine', kind: 'mammifere', trap: 'poisson' },
  { emoji: '🦇', name: 'la chauve-souris', kind: 'mammifere', trap: 'oiseau' },
  { emoji: '🐭', name: 'la souris', kind: 'mammifere' },
  { emoji: '🦔', name: 'le hérisson', kind: 'mammifere' },
  { emoji: '🐒', name: 'le singe', kind: 'mammifere' },
  { emoji: '🐧', name: 'le manchot', kind: 'oiseau', trap: 'mammifere' },
  { emoji: '🦉', name: 'la chouette', kind: 'oiseau' },
  { emoji: '🦅', name: 'l’aigle', kind: 'oiseau' },
  { emoji: '🦜', name: 'le perroquet', kind: 'oiseau' },
  { emoji: '🦈', name: 'le requin', kind: 'poisson', trap: 'mammifere' },
  { emoji: '🐡', name: 'le poisson-globe', kind: 'poisson' },
  { emoji: '🐢', name: 'la tortue', kind: 'reptile', trap: 'amphibien' },
  { emoji: '🐊', name: 'le crocodile', kind: 'reptile', trap: 'amphibien' },
  { emoji: '🐍', name: 'le serpent', kind: 'reptile' },
  { emoji: '🦎', name: 'le lézard', kind: 'reptile', trap: 'amphibien' },
  { emoji: '🐸', name: 'la grenouille', kind: 'amphibien', trap: 'reptile' },
  { emoji: '🐜', name: 'la fourmi', kind: 'insecte' },
  { emoji: '🐞', name: 'la coccinelle', kind: 'insecte' },
  { emoji: '🦋', name: 'le papillon', kind: 'insecte', trap: 'oiseau' },
];

function families(rng) {
  const animal = pick(rng, MEMBERS);
  const chosen = [animal.kind, ...(animal.trap ? [animal.trap] : [])];
  chosen.push(...sample(rng, CLASS_ORDER.filter((c) => !chosen.includes(c)), 3 - chosen.length));
  const options = inOrder(CLASS_ORDER, chosen);
  const labels = options.map((c) => CLASSES[c].label);
  const text = `${capitalize(animal.name)} est…`;
  return {
    key: `milieux:famille:${animal.name}:${options.join(',')}`,
    text,
    instruction: [text, `${capitalize(spokenList(labels))} ?`],
    stage: pictureStage(animal.emoji),
    choices: options.map((c) => ({ value: c, label: CLASSES[c].label })),
    choiceStyle: 'words',
    answer: animal.kind,
    success: { speak: [`Oui, c’est ${CLASSES[animal.kind].label}.`, CLASSES[animal.kind].fact] },
  };
}

// ---------------------------------------------------------------- 7. Le régime alimentaire

export const DIETS = {
  herbivore: { eats: 'des plantes', says: 'Oui, c’est un herbivore : il mange seulement des plantes.', rule: 'Oui : un herbivore mange seulement des plantes.' },
  carnivore: { eats: 'des animaux', says: 'Oui, c’est un carnivore : il mange d’autres animaux.', rule: 'Oui : un carnivore mange d’autres animaux.' },
  omnivore: { eats: 'les deux', says: 'Oui, c’est un omnivore : il mange des plantes et des animaux.', rule: 'Oui : un omnivore mange des plantes et des animaux.' },
};
const DIET_ORDER = Object.keys(DIETS);
// Ni renard ni chien (ils mangent aussi des fruits), ni panda (classé carnivore, il mange du bambou).
export const EATERS = [
  { emoji: '🐰', name: 'le lapin', diet: 'herbivore' }, { emoji: '🐐', name: 'la chèvre', diet: 'herbivore' },
  { emoji: '🦒', name: 'la girafe', diet: 'herbivore' }, { emoji: '🐘', name: 'l’éléphant', diet: 'herbivore' },
  { emoji: '🐨', name: 'le koala', diet: 'herbivore' }, { emoji: '🦓', name: 'le zèbre', diet: 'herbivore' },
  { emoji: '🦁', name: 'le lion', diet: 'carnivore' }, { emoji: '🐺', name: 'le loup', diet: 'carnivore' },
  { emoji: '🦈', name: 'le requin', diet: 'carnivore' }, { emoji: '🦅', name: 'l’aigle', diet: 'carnivore' },
  { emoji: '🐊', name: 'le crocodile', diet: 'carnivore' }, { emoji: '🐯', name: 'le tigre', diet: 'carnivore' },
  { emoji: '🐷', name: 'le cochon', diet: 'omnivore' }, { emoji: '🐻', name: 'l’ours brun', diet: 'omnivore' },
  { emoji: '🐗', name: 'le sanglier', diet: 'omnivore' }, { emoji: '🐔', name: 'la poule', diet: 'omnivore' },
  { emoji: '🦝', name: 'le raton laveur', diet: 'omnivore' }, { emoji: '🧑', name: 'l’être humain', diet: 'omnivore' },
];
const DIET_SPOKEN = 'Herbivore, carnivore ou omnivore ?';

function diets(rng) {
  if (rng() < 0.3) {
    const diet = pick(rng, DIET_ORDER);
    const text = `Un ${diet} mange…`;
    return textQuestion({
      key: `milieux:regime:${diet}`,
      text,
      options: DIET_ORDER.map((d) => DIETS[d].eats),
      answer: DIETS[diet].eats,
      success: DIETS[diet].rule,
    });
  }
  const animal = pick(rng, EATERS);
  const text = `${capitalize(animal.name)} est…`;
  return {
    key: `milieux:regime:${animal.name}`,
    text,
    instruction: [text, DIET_SPOKEN],
    stage: pictureStage(animal.emoji),
    choices: textChoices(DIET_ORDER),
    choiceStyle: 'words',
    answer: animal.diet,
    success: { speak: DIETS[animal.diet].says },
  };
}

// ---------------------------------------------------------------- 8. Qui mange qui ?

// Une plante, celui qui la mange, et celui qui le mange (chaque maillon vérifié).
export const CHAINS = [
  { steps: [['🌿', 'l’herbe'], ['🐰', 'le lapin'], ['🦊', 'le renard']], says: 'Le lapin mange l’herbe, et le renard mange le lapin.' },
  { steps: [['🥬', 'la salade'], ['🐌', 'l’escargot'], ['🦔', 'le hérisson']], says: 'L’escargot mange la salade, et le hérisson mange l’escargot.' },
  { steps: [['🌾', 'les graines'], ['🐭', 'la souris'], ['🦉', 'la chouette']], says: 'La souris mange les graines, et la chouette mange la souris.' },
  { steps: [['🍃', 'les feuilles'], ['🐛', 'la chenille'], ['🐦', 'l’oiseau']], says: 'La chenille mange les feuilles, et l’oiseau mange la chenille.' },
  { steps: [['🌿', 'l’herbe'], ['🦗', 'le criquet'], ['🐸', 'la grenouille']], says: 'Le criquet mange l’herbe, et la grenouille mange le criquet.' },
  { steps: [['🌿', 'l’herbe'], ['🦓', 'le zèbre'], ['🦁', 'le lion']], says: 'Le zèbre mange l’herbe, et le lion mange le zèbre.' },
];
// Ceux qui ne mangent jamais d'animaux : les seuls proposés à « Qui mange… ? » à côté du mangeur
// (la souris, qui mange aussi des insectes, n'en fait pas partie).
const PLANT_EATERS = ['le lapin', 'l’escargot', 'la chenille', 'le criquet', 'le zèbre'];
const CHAIN_TEXT = 'Qui mange qui ? Commence par la plante.';

function foodChains(rng) {
  const chain = pick(rng, CHAINS);
  if (rng() < 0.6) {
    let order = shuffle(rng, [0, 1, 2]);
    if (order.every((v, i) => v === i)) order = [order[1], order[2], order[0]];
    return {
      key: `milieux:chaine:${chain.steps[1][1]}:${order.join('')}`,
      interaction: 'order',
      text: CHAIN_TEXT,
      instruction: ['Qui mange qui ?', 'Commence par la plante.'],
      stage: { type: 'none' },
      items: order.map((i) => ({ value: i, emoji: chain.steps[i][0], label: chain.steps[i][1] })),
      order: 'asc',
      choices: [],
      answer: null,
      success: { speak: chain.says },
    };
  }
  const [, [preyEmoji, prey], [emoji, name]] = chain.steps;
  // les autres images : des plantes et des mangeurs de plantes des autres chaînes
  const taken = new Set(chain.steps.map(([e]) => e));
  const harmless = CHAINS.flatMap((c) => [c.steps[0], ...(PLANT_EATERS.includes(c.steps[1][1]) ? [c.steps[1]] : [])]);
  const pool = [...new Map(harmless.filter(([e]) => !taken.has(e)).map(([e, n]) => [n, { emoji: e, name: n }])).values()];
  return pictureQuestion({
    key: `milieux:mangeur:${prey}`,
    text: `Qui mange ${prey} ?`,
    emoji: preyEmoji,
    answer: { emoji, name },
    others: sample(rng, pool, 2),
    success: chain.says,
    rng,
  });
}

// ---------------------------------------------------------------- 9. Hiberner ou migrer

// Ceux qui dorment tout l'hiver et ceux qui partent (sans image quand aucun emoji ne leur
// ressemble sans doute possible : l'hirondelle n'est pas « un oiseau » quelconque).
export const WINTER = [
  { emoji: '🦔', name: 'le hérisson', does: 'hiberne', says: 'Le hérisson dort tout l’hiver dans un nid de feuilles.' },
  { emoji: '🦇', name: 'la chauve-souris', does: 'hiberne', says: 'La chauve-souris dort tout l’hiver, accrochée dans une grotte.' },
  { name: 'la marmotte', does: 'hiberne', says: 'La marmotte dort tout l’hiver dans son terrier.' },
  { name: 'le loir', does: 'hiberne', says: 'Le loir dort tout l’hiver, bien caché.' },
  { name: 'l’hirondelle', does: 'migre', says: 'L’hirondelle part en Afrique à l’automne et revient au printemps.' },
  { name: 'la cigogne', does: 'migre', says: 'La cigogne part vers le sud à l’automne et revient au printemps.' },
  { emoji: '🐋', name: 'la baleine à bosse', does: 'migre', says: 'La baleine à bosse nage jusqu’aux mers chaudes pour avoir son petit.' },
  { name: 'l’oie sauvage', does: 'migre', says: 'Les oies sauvages volent vers le sud en formant un V.' },
];
// Ils restent actifs tout l'hiver (l'écureuil ne dort pas tout l'hiver : il mange ses provisions).
export const AWAKE = [
  { emoji: '🐿️', name: 'l’écureuil' }, { emoji: '🦊', name: 'le renard' }, { emoji: '🐗', name: 'le sanglier' },
  { emoji: '🦌', name: 'le cerf' }, { emoji: '🐰', name: 'le lapin' }, { emoji: '🦉', name: 'la chouette' },
];
export const WORDS = [
  { text: 'Hiberner, c’est…', answer: 'dormir l’hiver', says: 'Hiberner, c’est dormir tout l’hiver, à l’abri du froid.' },
  { text: 'Migrer, c’est…', answer: 'partir au chaud', says: 'Migrer, c’est partir loin, là où il fait plus chaud, puis revenir.' },
];
const WORD_OPTIONS = ['dormir l’hiver', 'partir au chaud', 'changer de poils'];

function winter(rng) {
  const r = rng();
  if (r < 0.5) {
    const item = pick(rng, WINTER);
    const text = `En hiver, ${item.name} hiberne ou migre ?`;
    return twoWay({
      key: `milieux:hiver:${item.name}`,
      text,
      emoji: item.emoji,
      options: ['hiberne', 'migre'],
      answer: item.does,
      success: item.says,
    });
  }
  if (r < 0.75) {
    const answer = pick(rng, WINTER.filter((w) => w.does === 'hiberne' && w.emoji));
    return pictureQuestion({
      key: `milieux:dort:${answer.name}`,
      text: 'Quel animal dort tout l’hiver ?',
      answer,
      others: sample(rng, AWAKE, 2),
      success: answer.says,
      rng,
    });
  }
  const word = pick(rng, WORDS);
  return textQuestion({ key: `milieux:mot:${word.text}`, text: word.text, options: WORD_OPTIONS, answer: word.answer, success: word.says, style: 'sentences' });
}

// ---------------------------------------------------------------- Le jeu

const MILIEUX_LEVELS = [moving, habitats, clues, insects, vertebrates, families, diets, foodChains, winter];

export const milieux = {
  id: 'milieux',
  domain: 'sciences',
  title: 'Les animaux et leur milieu',
  icon: '🐸',
  skill: 'Classer les animaux, leurs milieux, qui mange qui, l’hiver des animaux',
  levels: [
    'Comment se déplace-t-il ?', 'Mare, forêt, mer, désert', 'Traces et indices', 'Insecte ou pas ?',
    'Vertébré ou invertébré ?', 'Les familles d’animaux', 'Le régime alimentaire', 'Qui mange qui ?',
    'Hiberner ou migrer', 'Tous les animaux',
  ],
  generate(level, rng) {
    const make = level >= 10 ? pick(rng, MILIEUX_LEVELS) : MILIEUX_LEVELS[level - 1];
    return make(rng);
  },
};

export const CORPS_GAMES = [corps, milieux];
