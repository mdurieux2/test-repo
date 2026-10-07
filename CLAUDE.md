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
- Voix naturelle : une seule voix, « Estelle » (Pocket TTS de Kyutai), en français et en anglais, enregistrée à
  l'avance dans `app/voix/` (`manifest.json`, `fr/*.mp3`, `en/*.mp3`) et jouée par `speech.js`. Chaque énoncé est
  dit phrase par phrase, chaque phrase d'un seul son ; une phrase absente est dite par propositions, autour du
  prénom, des nombres, puis mot à mot (`voix-cles.js`, `planLecture`), jamais par une autre voix. Les sons d'une
  consigne sont mis bout à bout (MP3 sans en-tête, 32 kbit/s, débit constant) et joués d'un trait.
  Écrire les consignes en phrases entières : pas `['Écris la lettre', lettre, '!']` mais `` `Écris la lettre ${nom}.` ``
  (un mot à écouter seul reste à part : `['Touche le mot :', mot]`).
  Les sons ne sont pas dans `PRECACHE` (cache des voix séparé, téléchargé en arrière-plan).
  Après avoir ajouté ou changé des phrases : `node scripts/voix/phrases.mjs`, pousser (le workflow « Voix
  naturelle » fabrique et contrôle les sons sur GitHub : hauteur, débit, diction vérifiée par Whisper), puis
  `bash scripts/voix/recuperer.sh` et committer `app/voix/`. Vérifier écran par écran : `node scripts/voix/rapport.mjs`.
  Pour mettre à jour ce que dit l'app hors des jeux : `SPEECH_LOG=scripts/voix/parole-e2e.json PARTS=scenario npm run test:e2e`.

## Affiche foot (dossier `affiche/`)

Deuxième application, indépendante : affiche de foot parent(s) et enfant(s) vus de dos, prénoms et numéros
paramétrables, export JPG/PDF de l'A4 au 40 × 60 cm, de 150 à 600 dpi. Publiée dans `/affiche/` du même site
(voir `pages.yml`).

- Pas de build ni de dépendance à l'exécution (JPEG écrit par `jpeg.js`, PDF par `pdf.js`).
- Dessin sur canvas dans un repère de 1000 unités de large (1414 de haut en A4/A3 ; la hauteur suit le format)
  dans `poster.js` et `figures.js` : le même code sert à l'aperçu et aux fichiers. Les fichiers sont dessinés
  et compressés par bandes de 4 millions de pixels (limite des canvas sur iPhone : 16,7 millions).
- Logos : seulement l'image importée par l'utilisateur (gardée sur l'appareil), jamais de logo de club intégré.
- Tout nouveau fichier dans `affiche/` doit être ajouté à `PRECACHE` dans `affiche/sw.js` (un test le vérifie)
  et `VERSION` doit être incrémentée à chaque mise en production.
- Aucun nom de club en dur : seulement des couleurs et un titre libre.
- Vérifier avant de pousser : `npm test` puis `npm run test:e2e:affiche`.
