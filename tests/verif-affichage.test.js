import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appareilEnClair, ecransAVerifier, rapportTexte } from '../app/js/verif-affichage.js';
import { levelRange, PROGRAMS } from '../app/js/programs.js';
import { findGame } from '../app/js/games/index.js';
import { GRADES } from '../app/js/storage.js';

test('vérifier l’affichage : chaque niveau des jeux de la classe, une seule fois', () => {
  const cp = ecransAVerifier(['CP']);
  const attendus = Object.values(PROGRAMS.CP).flat().reduce((n, [id]) => n + levelRange('CP', id).levels.length, 0);
  assert.equal(cp.length, attendus);
  for (const e of cp) {
    assert.ok(findGame(e.jeu), e.jeu);
    assert.ok(levelRange('CP', e.jeu).levels.includes(e.niveau), `${e.jeu} ${e.niveau}`);
    assert.equal(e.classe, 'CP');
    assert.ok(e.questions >= 2);
  }
  // deux classes : un niveau commun n'est vérifié qu'une fois (dans la première classe)
  const deux = ecransAVerifier(['CP', 'CE1']);
  const cles = deux.map((e) => `${e.jeu}:${e.niveau}`);
  assert.equal(new Set(cles).size, cles.length);
  assert.ok(deux.length > cp.length && deux.length < cp.length + ecransAVerifier(['CE1']).length);
  // toutes les classes : chaque niveau de chaque jeu (programs.test.js : tous sont au programme d'une classe)
  const toutes = ecransAVerifier(Object.keys(GRADES));
  assert.ok(toutes.some((e) => e.jeu === 'lecture-cm') && toutes.some((e) => e.jeu === 'calcul'));
  assert.ok(toutes.length > 1000);
});

test('vérifier l’affichage : l’appareil en clair, d’après le navigateur', () => {
  assert.equal(appareilEnClair('Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'), 'iPhone, iOS 18.5');
  assert.equal(appareilEnClair('Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'), 'iPad, iOS 17.4');
  // l'iPad se présente comme un Mac, mais il est tactile
  assert.equal(appareilEnClair('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15', 5), 'iPad');
  assert.equal(appareilEnClair('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15', 0), 'Mac');
  assert.equal(appareilEnClair('Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36'), 'téléphone Android 14');
  assert.equal(appareilEnClair('Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'), 'tablette Android 13');
  assert.equal(appareilEnClair('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36'), 'PC Windows');
  assert.equal(appareilEnClair(''), 'appareil inconnu');
});

test('vérifier l’affichage : le rapport dit l’appareil et chaque problème, sans prénom', () => {
  const appareil = { appareil: 'iPhone, iOS 18.5', navigateur: 'Safari', ecran: '375 × 667 points (×2)', sens: 'portrait', installee: true, ua: 'Mozilla/5.0 (iPhone…)' };
  const texte = rapportTexte({
    version: '1.16.0', appareil, classes: ['CP', 'MS'], ecrans: 1108, secondes: 41, interrompu: false, aides: ['texte grand'],
    problemes: [{ jeu: 'nombres-cm', titre: 'Les très grands nombres', niveau: 7, classe: 'CM2', problemes: ['réponses sous le bas de l’écran (21 points de trop)'] }],
  });
  assert.match(texte, /1\.16\.0/);
  assert.match(texte, /iPhone, iOS 18\.5, Safari \(app installée\)/);
  assert.match(texte, /375 × 667 points \(×2\), portrait ; réglages : texte grand/);
  assert.match(texte, /CP, Moyenne section ; 1108 écrans vérifiés en 41 s/);
  assert.match(texte, /- Les très grands nombres, niveau 7 \(CM2\) : réponses sous le bas/);
  const ok = rapportTexte({ version: '1.16.0', appareil: { ...appareil, installee: false }, classes: ['CP'], ecrans: 10, secondes: 1, interrompu: true, problemes: [] });
  assert.match(ok, /Aucun problème/);
  assert.match(ok, /dans le navigateur/);
  assert.match(ok, /arrêtée avant la fin/);
});
