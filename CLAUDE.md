# Lire & Compter

Web app iPhone et iPad (PWA) de jeux éducatifs, conçue pour Eva-Rose (CP/CE1) et Matteo (MS/GS) et partageable :
chaque famille crée ses profils au premier lancement (prénom, personnage, classe, photo), stockés sur l'appareil.
Aucun prénom en dur dans les jeux : utiliser le prénom du profil (`me().name`, 4e argument de `generate`).
Interface et commentaires en français.

- Pas de build : `app/` est servi tel quel (modules ES). Pas de dépendance à l'exécution.
- Un jeu = un objet `{ id, domain, section, title, icon, skill, levels, generate(level, rng, index) }`.
  `generate` renvoie des données pures (pas de DOM) ; `interaction` vaut `undefined` (choix multiple),
  `keypad`, `match`, `fill` ou `build`. Le rendu est dans `render.js` et `main.js`.
- Programme par classe dans `programs.js` : `[idDuJeu, niveauMin, niveauMax]`.
- Tout nouveau fichier dans `app/` doit être ajouté à `PRECACHE` dans `app/sw.js` (un test le vérifie)
  et `VERSION` doit être incrémentée à chaque mise en production.
- Nouvelle version : mettre à jour `version` dans `package.json` et `APP.version` dans `app/js/config.js`,
  et ajouter une entrée en tête de `CHANGELOG` dans ce même fichier (les tests vérifient la cohérence).
- Vérifier avant de pousser : `npm test` puis `npm run test:e2e` (mise en page sur 14 iPhone (dont 3 en paysage), 12 iPad et 8 Android,
  portrait et paysage).
- Couleurs : texte blanc seulement sur des fonds à contraste ≥ 3:1 (gros textes) ; jamais d'information
  portée par la couleur seule.
- Voix naturelle : les phrases dites par l'app sont enregistrées à l'avance (Pocket TTS de Kyutai, voix
  « Estelle ») dans `app/voix/` (`manifest.json`, `fr/*.mp3`, `en/*.mp3`) et jouées par `speech.js` ; une phrase
  absente est jouée en morceaux (texte, nombres, prénoms : `voix-cles.js`), sinon par la voix de l'appareil.
  Les sons ne sont pas dans `PRECACHE` (cache des voix séparé, téléchargé en arrière-plan).
  Après avoir ajouté ou changé des phrases : `node scripts/voix/phrases.mjs`, pousser (le workflow « Voix
  naturelle » fabrique les sons sur GitHub), puis `bash scripts/voix/recuperer.sh` et committer `app/voix/`.
  Pour mettre à jour ce que dit l'app hors des jeux : `SPEECH_LOG=scripts/voix/parole-e2e.json PARTS=scenario npm run test:e2e`.

## Affiche foot (dossier `affiche/`)

Deuxième application, indépendante : affiche de foot parent(s) et enfant(s) vus de dos, prénoms et numéros
paramétrables, export JPG/PDF A4 ou A3 à 300 dpi. Publiée dans `/affiche/` du même site (voir `pages.yml`).

- Pas de build ni de dépendance à l'exécution (le PDF est écrit à la main dans `pdf.js`).
- Dessin sur canvas dans un repère de 1000 × 1414 unités (`poster.js`, `figures.js`) : le même code sert à
  l'aperçu et aux fichiers haute résolution (le PDF est dessiné par bandes, limite des canvas sur iPhone).
- Tout nouveau fichier dans `affiche/` doit être ajouté à `PRECACHE` dans `affiche/sw.js` (un test le vérifie)
  et `VERSION` doit être incrémentée à chaque mise en production.
- Aucun logo ni nom de club : seulement des couleurs et un titre libre.
- Vérifier avant de pousser : `npm test` puis `npm run test:e2e:affiche`.
