# Accessibilité de « Lire, compter et s’amuser ! »

## Déclaration d’accessibilité

L’application « Lire, compter et s’amuser ! » (<https://fun.ermdx.app>) s’engage à être utilisable
par tous les enfants, y compris ceux qui ont un handicap ou un trouble des apprentissages.
Cette déclaration suit le modèle du **RGAA 4.1** (Référentiel général d’amélioration de
l’accessibilité, qui reprend les WCAG 2.1 niveau AA).

### État de conformité

**Partiellement conforme** au RGAA 4.1.

Il s’agit d’une auto-évaluation, faite par des contrôles automatiques à chaque modification
(voir plus bas) et par des vérifications à la main. Aucun audit n’a été fait par un organisme
extérieur. Le pourcentage exact de critères respectés n’a pas été mesuré : il demande une
vérification à la main de chaque critère sur chaque écran.

### Contenus non accessibles

- **Jeux de dessin et de tracé** (« Écris au doigt », points à relier, labyrinthes, labyrinthe
  rond, « Entoure », symétrie, coloriage magique, puzzle, carte du monde, horloge à régler) :
  ils demandent de voir l’écran et de bouger le doigt. Ils restent difficiles, voire impossibles,
  avec un lecteur d’écran (VoiceOver, TalkBack). Des boutons existent pour certains d’entre eux
  (horloge : « +1 h », « +5 min » ; labyrinthes : flèches), mais l’enfant doit quand même voir le
  dessin.
- **Jeux sur les couleurs** (coloriage magique, « Mélange les couleurs », paires de couleurs à
  relier) : reconnaître une couleur fait partie de l’exercice. Le réglage « Couleurs nommées »
  ajoute le nom ou un motif, mais le jeu reste pensé pour un enfant qui voit les couleurs.
- **Jeux d’écoute** (« Écoute et touche », dictée, premier son, histoires lues) : sans le son,
  la question n’a pas de sens. Le réglage « Niveaux d’écoute facultatifs » les écarte pour un
  enfant sourd ou malentendant.
- **Textes dans les dessins** (prénom sur le tee-shirt du personnage, nombres de la droite
  numérique, noms des continents, numéros des points à relier) : leur contraste n’est pas mesuré
  automatiquement (couleur de dessin sur dessin). Ils sont vérifiés à l’œil.
- **Annonce des écrans** : quand l’écran change, le titre de la page change, mais le focus n’est
  pas déplacé. Avec un lecteur d’écran, il faut revenir en haut de l’écran pour lire le nouveau
  titre.
- **Voix d’Estelle et lecteur d’écran** : les messages courts (« Essaie encore ! », « Bravo ! »)
  sont annoncés poliment au lecteur d’écran ; ils peuvent donc être entendus deux fois (voix
  d’Estelle, puis lecteur d’écran). Il vaut mieux couper la voix d’Estelle (bouton 🗣️) quand
  l’enfant utilise VoiceOver ou TalkBack.

### Technologies utilisées

HTML, CSS, JavaScript (modules ES), SVG. Aucune bibliothèque n’est chargée par l’application.

### Environnement de test

- Contrôles automatiques : Chromium (Playwright) sur un écran d’iPhone 390 × 844, plus 375 × 667,
  667 × 375 (paysage) et 320 × 568 (équivalent d’un zoom à 400 % sur ordinateur).
- À vérifier à la main : Safari et VoiceOver (iPhone, iPad), Chrome et TalkBack (Android),
  Chrome, Edge, Firefox et Safari au clavier sur ordinateur (voir la liste plus bas).

### Retour d’information et contact

Un problème d’accessibilité ? Écrire à l’adresse de contact affichée en bas de l’écran
« Qui joue ? ». Une réponse est donnée dans les meilleurs délais.

---

## Ce qui est vérifié automatiquement

Deux familles de tests tournent à chaque modification (intégration continue GitHub, tâche
« e2e (accessibilité) »).

### Tests unitaires : `tests/a11y-contrastes.test.js` (`npm test`)

| Vérification | Critère RGAA (WCAG) |
|---|---|
| Le calcul du rapport de contraste (formule des WCAG 2.1, couleurs transparentes posées sur leur fond, seuils du « gros texte ») | 3.2, 3.3 (1.4.3, 1.4.11) |
| Couleurs principales lues dans `app/css/style.css` : texte (`--ink`) et texte secondaire (`--muted`) sur le fond, les cartes et les fonds pastel ≥ 4,5:1 | 3.2 (1.4.3) |
| Blanc sur les couleurs de la charte (`--lecture`, `--maths`, `--anglais`, `--album`, `--good`) ≥ 4,5:1 | 3.2 (1.4.3) |
| Blanc sur chaque tuile de rubrique (8 rubriques, album, défi du jour, je révise) ≥ 4,5:1 | 3.2 (1.4.3) |
| Pour chaque thème de rubrique dans les jeux : blanc sur `--accent`, `--accent-dark` sur `--accent-soft` ≥ 4,5:1 | 3.2 (1.4.3) |
| Bord des champs et des interrupteurs (`--field-line`) ≥ 3:1 sur le fond et sur les cartes | 3.3 (1.4.11) |
| Zoom non bloqué (`<meta name="viewport">` sans `maximum-scale` ni `user-scalable=no`), page en français | 10.4, 8.3 (1.4.4, 3.1.1) |

### Test de bout en bout : `PARTS=a11y npm run test:e2e`

Le parcours ouvre **60 écrans** : bienvenue et création d’un profil (avec le message d’erreur),
« Qui joue ? », jouer à deux, l’accueil d’un enfant (aussi sur petit iPhone et en paysage), les
8 rubriques, le choix du niveau, la carte des paliers, **un écran de jeu par forme d’exercice**
(choix, pavé numérique, relier, compléter, panier, entourer, tracer, ranger, droite numérique,
fractions, partage, addition posée, puzzle, memory, coloriage, points à relier, sudoku, dessin
caché, symétrie, labyrinthes, chemins, horloge, monnaie, carte du monde, plus une histoire, un jeu
d’anglais et un jeu de sciences), une mauvaise puis une bonne réponse, la fin de partie, l’album,
le personnage, et l’espace parents (multiplication, suivi, enfants, fiche d’un enfant, réglages,
voix des histoires). Sur chaque écran :

1. **Contrastes** (`scripts/a11y-audit.mjs`) : pour chaque texte visible, la couleur du texte est
   comparée à la couleur réelle du fond, trouvée en remontant les éléments parents (fonds
   transparents superposés, opacité, chaque couleur d’un dégradé). Seuils : 4,5:1, ou 3:1 pour
   le gros texte (24 px, ou 18,66 px en gras). Les bords des champs, des listes et des
   interrupteurs doivent atteindre 3:1. Les textes posés sur une photo ou dans un dessin SVG sont
   listés à part (`A11Y_DETAILS=1`) et vérifiés à la main. Critères 3.2 et 3.3.
2. **axe-core** (règles WCAG 2.0 et 2.1, niveaux A et AA) : étiquettes des champs, noms des
   boutons, rôles et attributs ARIA, langue, images sans alternative, contrastes (seconde
   mesure)… Aucune violation n’est tolérée. Critères des thématiques 1, 3, 5, 7, 8, 11.
3. **Titre de la page** : il nomme l’écran (« Les rimes – Lire, compter et s’amuser ! ») et deux
   écrans différents n’ont pas le même titre. Critère 8.6.
4. **Clavier** : la touche Tab parcourt tout l’écran ; chaque élément atteint montre un contour de
   focus d’au moins 2 px, contrasté à 3:1 ; Tab finit par sortir de l’écran (pas de piège au
   clavier) ; aucun `tabindex` positif ne force l’ordre. Critères 10.7, 12.8, 12.9.
5. **Aller au contenu** : c’est le premier arrêt de Tab, il mène au contenu et saute la barre du
   haut. Critère 12.7.
6. **Zoom et petits écrans** : à 320 points de large (zoom 400 % d’un ordinateur), l’accueil, une
   rubrique, un jeu et les réglages ne débordent pas en largeur. Critère 10.11.

Le test de mise en page (`PARTS=layout`) vérifie en plus chaque niveau de chaque jeu sur 33 tailles
d’écran (iPhone, iPad, Android, portrait et paysage) : rien ne déborde, les réponses restent
visibles sans faire défiler.

---

## Ce qui a été corrigé

### Contrastes (pour tous les enfants)

| Élément | Avant | Après |
|---|---|---|
| Couleur « Lire et écrire » (`--lecture`) : onglets, boutons « on », boutons principaux | #7b61ff, blanc 4,2:1 | #7257ff, 4,6:1 |
| Couleur « Nombres et calcul » (`--maths`) : tuile, boutons | #e8650c, blanc 3,3:1 | #c1540a, 4,6:1 |
| Badges de niveau en maths (`--maths-dark` sur `--maths-soft`) | 4,4:1 | #b04804, 4,8:1 |
| Couleur « Anglais » (`--anglais`) | #1b84e8, blanc 3,8:1 | #1576d2, 4,6:1 |
| Vert de l’album et des bonnes réponses (`--album`, `--good`) | #0f9d6b, blanc 3,5:1 | #0d865b, 4,6:1 |
| Rubrique « Jeux et logique » | #0d9488, blanc 3,7:1 | #0c8479, 4,6:1 |
| Pastille « 0/30 » de l’album | fond blanc translucide, 2,5:1 | fond foncé translucide |
| Texte secondaire (`--muted`, étoiles des portraits, aides) | #6b6f80, 4,3:1 sur les fonds pastel | #606476, ≥ 4,9:1 |
| Cases à placer des calculs à trous (vert) | #22b07d, 2,8:1 | #1d9e70, 3,4:1 (gros chiffres) |
| Bord des champs (prénom, multiplication, listes de niveaux) | #eadfca, 1,3:1 | `--field-line` #8f8676, 3,6:1 |
| Interrupteurs éteints | #cfc8b8, 1,7:1 | `--field-line`, 3,6:1 |
| Focus du champ « Prénom » | halo pastel presque invisible | anneau de la couleur `--lecture` |

Les teintes ne changent pas : les couleurs sont seulement un peu assombries, au plus près de la
charte, pour que le texte blanc reste lisible même quand il rapetisse (tuiles sur un petit iPhone
ou en paysage : 16 à 17,6 px, ce qui n’est plus du « gros texte »).

### Noms accessibles et structure

- **Titre de la page** : il change avec l’écran (nom de l’écran, du jeu, ou de l’onglet de
  l’espace parents, puis le nom de l’app).
- **Titre de niveau 1 dans chaque jeu** : le nom du jeu, caché à l’écran, lu par les lecteurs
  d’écran (les écrans de jeu n’en avaient pas).
- **Bouton « Aller au contenu »** : invisible au doigt, il apparaît au clavier et saute la barre
  du haut.
- **Barre de progression des questions** : rôle d’image avec « Question 2 sur 5 » (l’attribut
  `aria-label` n’était pas permis sur un simple bloc).
- **Points de niveau** des cartes de jeu : rôle d’image avec « Niveau 2 sur 5 ».
- **Le nom lu contient le texte affiché** (critère « étiquette dans le nom », WCAG 2.5.3) : bouton
  du joueur (« Eva-Rose : changer de joueur »), « Niveaux » des cartes de jeu (avec le nom du
  jeu), boutons de l’horloge (« +1 h : avancer d’une heure »), boutons « +1 » du panier,
  boutons « Affiché » / « Conseillé » de la fiche d’un enfant.

### Déjà en place (vérifié)

- Langue de la page en français, et passages en anglais marqués `lang="en"` (mots, phrases et
  réponses des jeux d’anglais).
- Messages « Essaie encore ! », « Bravo ! », erreurs des formulaires et confirmations annoncés
  aux lecteurs d’écran par des zones `aria-live="polite"` (ou `role="status"`), avec un texte
  court.
- Interrupteurs des réglages : `role="switch"` ; choix exclusifs (classe, durée…) : boutons radio.
- Zoom du navigateur permis ; mise en page sans défilement horizontal jusqu’à 320 points.
- Contour de focus épais (4 px, couleur du texte) sur tous les boutons.
- Aucune information portée par la couleur seule (règle du projet) : les sons coupés sont barrés,
  les interrupteurs bougent, les réponses justes ou fausses ont un message.

---

## Les réglages d’accessibilité de l’app

Ils se règlent pour chaque enfant dans **Espace parents → Enfants → (prénom)**. Ils restent
enregistrés avec le profil, même si on efface sa progression. Un enfant sans réglage voit l’app
comme avant.

| Réglage | Ce qu’il fait | Pour qui |
|---|---|---|
| **Taille du texte** (normale, grande, très grande) | Agrandit tous les textes de l’app | Malvoyance, fatigue visuelle, dyslexie |
| **Texte plus espacé** | Espace les lettres, les mots et les lignes | Dyslexie, malvoyance |
| **Lecture facilitée** | Texte des consignes et des histoires espacé, un mot sur deux en bleu | Dyslexie, lecteurs débutants |
| **Syllabes colorées** | Les syllabes des textes à lire alternent de couleur | Dyslexie, apprentissage de la lecture |
| **Fort contraste** | Couleurs plus marquées, bords plus nets | Malvoyance, daltonisme |
| **Couleurs nommées** | Chaque couleur porte son nom ou un motif | Daltonisme (dyschromatopsie) |
| **Grandes cibles** | Boutons et cases plus grands | Dyspraxie, troubles moteurs, malvoyance |
| **Toucher plutôt que glisser** | Chaque geste glissé ou tracé a une version en touchers | Dyspraxie, troubles moteurs |
| **Sous-titres** | Tout ce que dit Estelle est aussi écrit | Surdité, malentendance |
| **Niveaux d’écoute facultatifs** | Les questions qui ne se jouent qu’à l’oreille sont écartées | Surdité, malentendance |
| **Mode calme** | Sans décor de saison ni musique, animations réduites | Troubles de l’attention, autisme, épilepsie photosensible |
| **Sans chrono** | Les défis chronométrés se jouent sans le temps | Troubles de l’attention, anxiété, dyspraxie |

Sur chaque écran, les boutons 🎵 (musique et sons) et 🗣️ (voix d’Estelle) coupent le son d’un
geste. La durée d’une partie et un temps de jeu par jour se règlent aussi dans l’espace parents.

---

## Vérifications à faire à la main (par les parents)

Les tests automatiques ne remplacent pas un essai avec les outils que l’enfant utilise vraiment.
Voici comment vérifier, en 10 minutes par outil.

### VoiceOver sur iPhone ou iPad

1. Réglages → Accessibilité → VoiceOver → activer. (Raccourci : Réglages → Accessibilité →
   Raccourci d’accessibilité → VoiceOver, puis triple clic sur le bouton latéral.)
2. Couper la voix d’Estelle dans l’app (bouton 🗣️), pour ne pas entendre deux voix.
3. Ouvrir l’app. Glisser un doigt vers la droite pour passer d’un élément au suivant, toucher
   deux fois pour activer.
4. Vérifier : « Qui joue ? » annonce chaque enfant ; l’accueil annonce « Bonjour … » et chaque
   rubrique ; un jeu annonce son nom (titre), « Question 1 sur 5 », la consigne et chaque réponse ;
   une mauvaise réponse fait dire « Essaie encore ! ».
5. Dans les jeux d’anglais, les mots anglais doivent être lus avec l’accent anglais.
6. Dans l’espace parents, chaque interrupteur annonce son nom et « activé » ou « désactivé ».

### TalkBack sur Android

1. Paramètres → Accessibilité → TalkBack → activer (ou maintenir les deux boutons de volume
   3 secondes si le raccourci est activé).
2. Couper la voix d’Estelle dans l’app (bouton 🗣️).
3. Glisser vers la droite pour avancer, toucher deux fois pour activer.
4. Faire les mêmes vérifications que pour VoiceOver.

### Zoom à 200 %

1. Sur iPhone : Réglages → Accessibilité → Affichage et taille du texte → Texte plus grand ; et
   Réglages → Accessibilité → Zoom (zoom de tout l’écran, à trois doigts).
2. Sur Android : Paramètres → Accessibilité → Taille de police et Taille d’affichage au maximum.
3. Sur ordinateur : Ctrl + (ou Cmd + sur Mac) jusqu’à 200 %.
4. Vérifier : tous les textes restent entiers, rien n’est coupé ni superposé, on peut atteindre
   chaque bouton (au besoin en faisant défiler vers le bas, jamais de côté).
5. Essayer aussi le réglage de l’app « Taille du texte : très grande » sur le plus petit
   téléphone de la maison.

### Clavier sur ordinateur

1. Ouvrir l’app dans Chrome, Edge, Firefox ou Safari (sur Mac avec Safari : Réglages → Avancés →
   « Appuyer sur Tab pour sélectionner chaque élément »).
2. Appuyer sur **Tab** : le premier arrêt est « Aller au contenu » (il apparaît en haut à gauche),
   **Entrée** saute la barre du haut.
3. Continuer avec Tab (Maj + Tab pour revenir) : chaque bouton atteint est entouré d’un contour
   épais bien visible ; l’ordre suit la lecture (de haut en bas, de gauche à droite).
4. **Entrée** ou **Espace** active le bouton ; dans les réglages, Espace bascule un interrupteur.
5. Vérifier qu’on n’est jamais coincé : Tab finit toujours par revenir au début de l’écran.
6. Jouer une partie entière d’un jeu à choix (par exemple « Les rimes ») au clavier seul.

### Autres points à regarder

- **Daltonisme** : avec le réglage « Couleurs nommées », jouer au coloriage magique et à
  « Relie » ; aucune réponse ne doit dépendre de la seule couleur.
- **Mode calme** : plus de musique ni de décor animé.
- **Sous-titres** : chaque phrase dite par Estelle apparaît écrite.
- **Textes dans les dessins** : le prénom sur le tee-shirt et les nombres des dessins doivent être
  lisibles (ils ne sont pas mesurés automatiquement).

---

## Pour les développeurs

- Lancer le contrôle : `PARTS=a11y npm run test:e2e` (environ 1 minute). `A11Y_DETAILS=1` liste
  les textes non mesurables. `CHROMIUM_PATH=…` pour un Chromium déjà installé.
- Le calcul des contrastes est dans `scripts/a11y-audit.mjs` (sans dépendance, injecté tel quel
  dans la page). axe-core est une dépendance de test seulement (`devDependencies`) : rien n’est
  ajouté à l’app.
- Règle à suivre pour les couleurs : texte courant ≥ 4,5:1 ; gros texte (24 px, ou 18,66 px en
  gras) ≥ 3:1 ; bords des champs, interrupteurs et contour de focus ≥ 3:1. Un texte blanc sur une
  couleur de rubrique doit atteindre 4,5:1, car les tuiles rapetissent sur les petits écrans.
