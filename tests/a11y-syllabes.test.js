// Syllabes colorées (réglage d'accessibilité « syllables ») : le découpage du français écrit,
// et son affichage dans les textes à lire sans changer le texte ni le karaoké.
import './aides-dom.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { text, withClass } from './aides-dom.js';
import {
  decouperMot, decouperPhrase, JEUX_SANS_SYLLABES, syllabes, syllabesOrales, syllabesPermises,
} from '../app/js/syllabes.js';
import { readable, renderChoiceContent, renderStage, setAides, wordSpans } from '../app/js/render.js';
import { GAMES } from '../app/js/games/index.js';
import { PICTURES, READING_WORDS, FIRST_SOUNDS } from '../app/js/data/lecture-data.js';
import { TEXT_DATA } from '../app/js/games/textes.js';
import { STORY_DATA } from '../app/js/games/histoires.js';

/** « pom-me », « cha(t) » : les syllabes séparées par des tirets, les lettres muettes entre parenthèses. */
const notation = (mot, opts) => decouperMot(mot, opts).map((s) => s.map((m) => (m.muet ? `(${m.text})` : m.text)).join('')).join('-');

// Découpages attendus, écrits à la main (syllabes écrites de CP, lettres muettes sûres).
const ATTENDUS = {
  pomme: 'pom-me', maison: 'mai-son', table: 'ta-ble', papillon: 'pa-pi-llon', fille: 'fi-lle', ville: 'vil-le',
  abeille: 'a-bei-lle', grenouille: 'gre-noui-lle', travail: 'tra-vail', soleil: 'so-leil', bouteille: 'bou-tei-lle',
  famille: 'fa-mi-lle', juillet: 'jui-lle(t)', aiguille: 'ai-gui-lle', illumine: 'il-lu-mi-ne',
  chat: 'cha(t)', chats: 'cha(ts)', pied: 'pie(d)', loup: 'lou(p)', nez: 'ne(z)', temps: 'tem(ps)', grand: 'gran(d)',
  long: 'lon(g)', corps: 'cor(ps)', blanc: 'blan(c)', gentil: 'gen-ti(l)', doigt: 'doi(gt)', escargot: 'es-car-go(t)',
  manger: 'man-ge(r)', papier: 'pa-pie(r)', escalier: 'es-ca-lie(r)', jouer: 'jou-e(r)', ouvrier: 'ou-vri-e(r)',
  hiver: '(h)i-ver', super: 'su-per',
  jouent: 'jou(ent)', crient: 'cri(ent)', étaient: 'é-tai(ent)', client: 'cli-en(t)', enfant: 'en-fan(t)',
  amie: 'a-mi(e)', année: 'an-né(e)', pluie: 'plui(e)', tortue: 'tor-tu(e)', bleue: 'bleu(e)', araignée: 'a-rai-gné(e)',
  parapluie: 'pa-ra-plui(e)',
  école: 'é-co-le', "l'école": "l'é-co-le", "aujourd'hui": "au-jour-d'(h)ui", "jusqu'à": "jus-qu'à", "c'est": "c'e(st)",
  et: 'e(t)', les: 'le(s)',
  crayon: 'cra-yon', noyau: 'no-yau', yeux: 'yeu(x)', pays: 'pa-y(s)', camion: 'ca-mion', chien: 'chien',
  maman: 'ma-man', chanson: 'chan-son', bonne: 'bon-ne', langue: 'lan-gue', cuisine: 'cui-si-ne', nuage: 'nu-a-ge',
  action: 'ac-tion', question: 'ques-tion', instrument: 'ins-tru-men(t)', arbre: 'ar-bre', atlantique: 'at-lan-ti-que',
  bibliothèque: 'bi-bli-o-thè-que', cahier: 'ca-(h)ie(r)', homme: '(h)om-me', hibou: '(h)i-bou', hérisson: '(h)é-ris-son',
  déshabiller: 'dés-(h)a-bi-lle(r)', huit: '(h)uit',
  oiseau: 'oi-seau', château: 'châ-teau', œil: 'œil', compter: 'com(p)-te(r)', pigeon: 'pi-geon', montagne: 'mon-ta-gne',
  champignon: 'cham-pi-gnon', éléphant: 'é-lé-phan(t)', kangourou: 'kan-gou-rou', dinosaure: 'di-no-sau-re',
  fourmi: 'four-mi', crocodile: 'cro-co-di-le', zèbre: 'zè-bre', girafe: 'gi-ra-fe', voiture: 'voi-tu-re',
  six: 'six', plus: 'plus', bus: 'bus', ouest: 'ouest', août: 'août',
};

test('syllabes : au moins 60 mots variés découpés comme à la main', () => {
  assert.ok(Object.keys(ATTENDUS).length >= 60, `${Object.keys(ATTENDUS).length} mots seulement`);
  const faux = Object.entries(ATTENDUS).filter(([mot, attendu]) => notation(mot) !== attendu).map(([mot, attendu]) => `${mot} : ${notation(mot)} (attendu ${attendu})`);
  assert.deepEqual(faux, []);
});

test('syllabes : les majuscules et les apostrophes typographiques sont gardées', () => {
  assert.equal(notation('Léo'), 'Lé-o');
  assert.equal(notation('L’école'), 'L’é-co-le');
  assert.deepEqual(syllabes('Arc-en-ciel'), ['Arc', 'en', 'ciel']);
  assert.deepEqual(syllabes('« Bonjour ! »'), ['Bon', 'jour']);
});

test('syllabes : -ent est muet après « ils » ou « elles » (même avec ne, se, les entre les deux)', () => {
  const vu = (phrase) => decouperPhrase(phrase).map((parts) => parts.filter((p) => p.syllabes)
    .map((p) => p.syllabes.map((s) => s.map((m) => (m.muet ? `(${m.text})` : m.text)).join('')).join('-')).join('')).join(' ');
  assert.equal(vu('Ils mangent.'), 'Il(s) man-g(ent)');
  assert.equal(vu('Elles ne dansent pas'), 'El-le(s) ne dan-s(ent) pa(s)');
  assert.equal(vu('qu’ils se lavent'), 'qu’il(s) se la-v(ent)');
  // sans « ils » : on ne sait pas (une dent, souvent) : seul le t est muet
  assert.equal(vu('Le vent souffle souvent'), 'Le ven(t) souf-fle sou-ven(t)');
});

test('syllabes orales : le e final après consonne ne compte pas', () => {
  const orales = { pomme: 1, table: 1, école: 2, chocolat: 3, papillon: 3, maison: 2, juillet: 2, danser: 2, girafe: 2, amie: 2, langue: 1 };
  for (const [mot, n] of Object.entries(orales)) assert.equal(syllabesOrales(mot).length, n, `${mot} : ${syllabesOrales(mot).join('-')}`);
  assert.deepEqual(syllabesOrales('pommes'), ['pommes']);
});

// Le vocabulaire de l'app : mots à lire, images, petits textes et histoires.
function vocabulaire() {
  const mots = new Set();
  const ajoute = (t) => {
    for (const m of String(t).matchAll(/\p{L}+(?:['’]\p{L}+)*/gu)) mots.add(m[0].toLowerCase());
  };
  Object.keys(PICTURES).forEach(ajoute);
  Object.values(READING_WORDS).flat().forEach(ajoute);
  FIRST_SOUNDS.flatMap((s) => s.words).forEach(ajoute);
  for (const t of TEXT_DATA) {
    ajoute(t.title);
    ajoute(t.text);
    t.questions.flat().forEach(ajoute);
  }
  for (const s of STORY_DATA) {
    ajoute(s.title);
    s.sentences.forEach(ajoute);
    ajoute(s.question);
  }
  return [...mots];
}

test('syllabes : plus de 300 mots de l’app, chacun découpé sans perdre ni couper un son', () => {
  const mots = vocabulaire();
  assert.ok(mots.length >= 300, `${mots.length} mots seulement`);
  const VOYELLE = /[aeiouyàâäéèêëîïôöùûüÿœæ]/;
  const SONS = ['ch', 'ph', 'th', 'gn', 'qu', 'gu', 'ou', 'au', 'eu', 'oi', 'ai', 'ei'];
  const erreurs = [];
  for (const mot of mots) {
    const parts = syllabes(mot);
    if (parts.join('') !== mot) erreurs.push(`${mot} : ${parts.join('-')} ne redonne pas le mot`);
    // (une lettre seule n'est pas une syllabe : le « t » de « va-t-il »)
    if (mot.length > 1 && parts.some((s) => !VOYELLE.test(s))) erreurs.push(`${mot} : une syllabe sans voyelle (${parts.join('-')})`);
    let k = 0;
    for (const s of parts.slice(0, -1)) {
      k += s.length;
      const paire = mot.slice(k - 1, k + 1);
      if (SONS.includes(paire)) erreurs.push(`${mot} : « ${paire} » coupé (${parts.join('-')})`);
      // consonne + r ou l : jamais coupées (ta-ble), sauf t-l et d-l (at-lan-tique)
      if (/^[bcdfgkpv][rl]$|^t[r]$/.test(paire)) erreurs.push(`${mot} : « ${paire} » coupé (${parts.join('-')})`);
    }
    // deux consonnes pareilles entre deux voyelles : la coupure passe entre elles (pom-me), sauf le « ll » de fille
    const sons = [];
    let pos = 0;
    for (const s of parts) sons.push((pos += s.length));
    for (let i = 1; i + 1 < mot.length; i++) {
      const double = mot[i] === mot[i + 1] && !VOYELLE.test(mot[i]) && VOYELLE.test(mot[i - 1]) && VOYELLE.test(mot[i + 2] ?? '');
      if (double && !(mot[i] === 'l' && mot[i - 1] === 'i') && !sons.includes(i + 1)) erreurs.push(`${mot} : « ${mot[i]}${mot[i]} » non coupé (${parts.join('-')})`);
    }
  }
  assert.deepEqual(erreurs, []);
});

test('syllabes : les jeux de sons, de syllabes et d’orthographe n’en ont pas (ni l’anglais)', () => {
  for (const id of ['syllabes-rythme', 'syllabes', 'premier-son', 'dictee', 'rimes', 'lettres', 'ecrire']) {
    assert.ok(JEUX_SANS_SYLLABES.has(id), id);
  }
  for (const id of JEUX_SANS_SYLLABES) assert.ok(GAMES.some((g) => g.id === id), `jeu inconnu : ${id}`);
  for (const g of GAMES) {
    const permis = syllabesPermises(g.id, g.domain);
    if (g.domain === 'anglais' || JEUX_SANS_SYLLABES.has(g.id)) assert.equal(permis, false, g.id);
  }
  for (const id of ['petits-textes', 'histoires', 'problemes', 'phrase', 'vocabulaire']) {
    const g = GAMES.find((x) => x.id === id);
    assert.equal(syllabesPermises(g.id, g.domain), true, id);
  }
});

test('syllabes colorées : le texte et le karaoké ne changent pas, chaque mot garde son étiquette', () => {
  const phrase = 'Le chat de Léo dort sur le lit. Il est roux, n’est-ce pas ?';
  setAides({ syllables: false });
  const sans = wordSpans(phrase);
  setAides({ syllables: true });
  const avec = wordSpans(phrase);
  assert.equal(text(avec), text(sans));
  assert.equal(text(avec), phrase);
  const motsSans = sans.filter((n) => typeof n !== 'string');
  const motsAvec = avec.filter((n) => typeof n !== 'string');
  assert.equal(motsAvec.length, motsSans.length);
  motsAvec.forEach((w, i) => {
    assert.ok(w.classList.contains('w'));
    assert.equal(w.getAttribute('data-start'), motsSans[i].getAttribute('data-start'));
    assert.equal(w.getAttribute('data-end'), motsSans[i].getAttribute('data-end'));
    assert.equal(text(w), text(motsSans[i]));
  });
  assert.ok(withClass(avec, 'syl').length > 12);
  assert.ok(withClass(avec, 'syl-b').length > 0, 'les deux couleurs alternent');
  assert.ok(withClass(avec, 'muet').some((m) => text(m) === 't'), 'le t muet de « chat » est en gris');
  // l'histoire en karaoké : chaque phrase garde ses mots, dans l'ordre
  const story = STORY_DATA[0];
  const stage = renderStage({ type: 'karaoke', title: story.title, emoji: story.emoji, sentences: story.sentences }, {});
  assert.equal(withClass(stage, 'k-sentence').length, story.sentences.length);
  assert.equal(withClass(stage, 'w').length, story.sentences.join(' ').split(' ').length);
  assert.equal(text(withClass(stage, 'karaoke-text')[0]), story.sentences.join(' '));
  assert.ok(withClass(stage, 'syl').length > 0);
  setAides({});
});

test('syllabes colorées : consignes, petits textes et phrases à lire ; jamais l’anglais ni sans le réglage', () => {
  setAides({});
  assert.equal(readable('Lis le texte.'), 'Lis le texte.');
  assert.equal(withClass(wordSpans('Tom a un chat.'), 'syl').length, 0);
  setAides({ syllables: true });
  const consigne = readable('Touche la bonne réponse !');
  assert.equal(text(consigne), 'Touche la bonne réponse !');
  assert.ok(withClass(consigne, 'syl').length >= 5);
  assert.equal(readable('12'), '12');
  const texte = renderStage({ type: 'text', title: 'Le chat', text: 'Léo a un chat.' }, {});
  assert.ok(withClass(texte, 'syl').length > 0);
  // une phrase anglaise n'est pas découpée à la française
  const anglais = renderStage({ type: 'sentence', text: 'The cat is on the mat.', lang: 'en' }, {});
  assert.equal(withClass(anglais, 'syl').length, 0);
  assert.equal(withClass(renderChoiceContent({ value: 'cat', label: 'cat', lang: 'en' }), 'syl').length, 0);
  const choix = renderChoiceContent({ value: 1, label: 'Le chat dort.' });
  assert.equal(text(choix), 'Le chat dort.');
  setAides({});
});

/** Luminance relative et contraste (WCAG 2.1). */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

test('syllabes colorées : chaque couleur a un contraste d’au moins 4,5:1 sur les fonds des textes', () => {
  const css = readFileSync(new URL('../app/css/aides.css', import.meta.url), 'utf8');
  const colorOf = (selector) => css.match(new RegExp(`${selector.replace(/\./g, '\\.')} \\{ color: (#[0-9a-f]{6})`))?.[1];
  const colors = { 'syllabe 1': colorOf('.syl-a'), 'syllabe 2': colorOf('.syl-b'), 'lettre muette': colorOf('.syl .muet') };
  // fonds : carte blanche, crème de l'app, surlignage jaune du karaoké, mauvaise réponse
  for (const [name, color] of Object.entries(colors)) {
    assert.ok(color, `couleur introuvable : ${name}`);
    for (const bg of ['#ffffff', '#fff7e8', '#ffe066', '#ffe3e3']) {
      assert.ok(contrast(color, bg) >= 4.5, `${name} ${color} sur ${bg} : ${contrast(color, bg).toFixed(2)}`);
    }
  }
  // et un arc sous chaque syllabe : la coupure ne tient pas à la couleur seule
  assert.match(css, /\.syl \{[^}]*border-bottom: 2px solid currentColor/);
});
