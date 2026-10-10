// Histoire, géographie, enseignement moral et civique et sciences du cours moyen : quatre jeux de
// questions à choix (une bonne réponse et deux autres, toujours fausses), écrites à la main.
//
// Programmes suivis :
//  - CM1 (niveaux 1 à 5 de l'histoire, 1 à 5 de la géographie, 1 à 5 de l'EMC, 1 à 7 des sciences) :
//    nouveaux programmes de 2026 (histoire : BO n° 22 du 28 mai 2026 ; géographie : se nourrir, se
//    déplacer, communiquer, les grandes aires du monde ; EMC de 2024, « Faire société » ; sciences :
//    BO n° 24 du 11 juin 2026) ;
//  - CM2 (les autres niveaux) : en 2026-2027, programme d'histoire-géographie de 2020 (la République,
//    l'âge industriel, les guerres mondiales et l'Union européenne ; se déplacer, mieux habiter, les
//    paysages de France), EMC de 2024, « Vivre en République », sciences et technologie de 2023.
//  Le niveau 10 de l'histoire (« La frise du temps ») mêle les époques : périodes, siècles, et
//  « quel événement est le plus ancien ? » tiré parmi des dates vérifiées.
//
// Chaque réponse a été vérifiée (dates, noms, nombres), et chaque mauvaise réponse est fausse sans
// discussion possible. Quelques choix délibérés :
//  - Moyen Âge de 476 à 1492, Temps modernes de 1492 à 1789, époque contemporaine depuis 1789
//    (découpage de l'école) ; aucune question sur une date frontière (« la prise de la Bastille,
//    Temps modernes ou époque contemporaine ? ») ; un siècle se demande pour une année qui ne finit
//    pas par 00 ;
//  - la Lune fait le tour de la Terre en un peu moins d'un mois (27 jours un tiers) ; 29 jours et
//    demi, c'est la lunaison, d'une nouvelle lune à la suivante : les deux ne sont jamais confondus ;
//  - les numéros d'urgence : quand la réponse est le 15, le 17 ou le 18, le 112 n'est jamais proposé
//    à côté (il serait juste aussi) ; le 119 est « Allô enfance en danger », le 3018 aide contre le
//    harcèlement en ligne ;
//  - les chiffres qui changent d'une année à l'autre (faim, eau potable, Internet, pays de la zone
//    euro) sont donnés en ordre de grandeur (« plus de deux milliards ») ou pas du tout ;
//  - le tri suit les consignes de app/js/games/planete.js (depuis 2023, tous les emballages vont
//    dans le bac de tri, le verre au conteneur à verre, les épluchures au compost).
//
// La voix (Estelle) dit `instruction` et `success.speak`, phrase par phrase : jamais de chiffres
// romains dits tels quels (dire() les écrit en lettres : « Louis XIV » → « Louis quatorze », « au
// XVIe siècle » → « au seizième siècle »), jamais de trait d'union entre deux dates (« 1914-1918 »
// serait lu « 1914 moins 1918 » : on écrit « de 1914 à 1918 »), ni de sigle comme TGV ou ONU dans
// une phrase dite. Les réponses écrites ne sont pas lues.

import { pick, shuffle } from '../random.js';

/** Au-delà de cette longueur, les réponses s'affichent une par ligne. */
const LONG = 22;

// ---------------------------------------------------------------- Les chiffres romains, dits en lettres

const CARDINAUX = [
  '', 'premier', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize',
  'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt', 'vingt et un',
];
const ORDINAUX = [
  '', 'premier', 'deuxième', 'troisième', 'quatrième', 'cinquième', 'sixième', 'septième', 'huitième', 'neuvième',
  'dixième', 'onzième', 'douzième', 'treizième', 'quatorzième', 'quinzième', 'seizième', 'dix-septième',
  'dix-huitième', 'dix-neuvième', 'vingtième', 'vingt et unième',
];

/** « XIV » → 14 (chiffres I, V et X seulement : assez jusqu'au XXIe siècle). */
function romain(chiffres) {
  const valeur = { I: 1, V: 5, X: 10 };
  let total = 0;
  for (let i = 0; i < chiffres.length; i++) {
    const v = valeur[chiffres[i]];
    total += v < (valeur[chiffres[i + 1]] || 0) ? -v : v;
  }
  return total;
}

/** Ce que dit la voix : « Louis XIV » → « Louis quatorze », « le XVIe siècle » → « le seizième siècle ». */
export function dire(texte) {
  return texte
    .replace(/\b([IVX]+)(?:er|e) siècle/g, (tout, r) => (ORDINAUX[romain(r)] ? `${ORDINAUX[romain(r)]} siècle` : tout))
    .replace(/\b(François|Henri|Louis|Napoléon) (Ier|[IVX]+)\b/g, (tout, nom, r) => {
      const n = r === 'Ier' ? 1 : romain(r);
      return CARDINAUX[n] ? `${nom} ${CARDINAUX[n]}` : tout;
    });
}

// ---------------------------------------------------------------- Une question à choix

/**
 * `item` : { ask (une phrase, ou un tableau de phrases), answer, others (deux réponses fausses),
 * says (la phrase dite après la bonne réponse), e (emoji facultatif ; '' : aucune image) }.
 */
function qcm(prefixe, item, emoji, rng) {
  const phrases = Array.isArray(item.ask) ? item.ask : [item.ask];
  const text = phrases.join(' ');
  const options = shuffle(rng, [item.answer, ...item.others]);
  return {
    key: `${prefixe}:${text}`,
    text,
    instruction: phrases.map(dire),
    stage: emoji ? { type: 'picture', emoji } : { type: 'none' },
    choices: options.map((value) => ({ value, label: value })),
    choiceStyle: options.some((o) => [...o].length > LONG) ? 'sentences' : 'answers',
    answer: item.answer,
    success: { speak: dire(item.says) },
  };
}

/** Une question du niveau : l'image de la question, sinon celle du niveau. */
function jouer(prefixe, niveaux, level, rng) {
  const n = Math.min(Math.max(Math.round(level) || 1, 1), niveaux.length);
  const { emoji, questions } = niveaux[n - 1];
  const item = pick(rng, questions);
  return qcm(`${prefixe}:${n}`, item, item.e ?? emoji, rng);
}

// ================================================================= L'histoire de France

const HISTOIRE = [
  {
    nom: 'Le château et le seigneur',
    emoji: '🏰',
    questions: [
      { e: '⏳', ask: ['Le Moyen Âge commence en 476.', 'En quelle année se termine-t-il ?'], answer: '1492', others: ['1789', '1914'], says: 'Oui : le Moyen Âge va de 476 à 1492, l’année du premier voyage de Christophe Colomb.' },
      { ask: 'Qui vit dans le château fort ?', answer: 'le seigneur', others: ['les paysans du village', 'les moines'], says: 'Oui : le seigneur vit au château avec sa famille, ses serviteurs et ses soldats.' },
      { ask: 'À quoi sert d’abord un château fort ?', answer: 'à se protéger', others: ['à faire du commerce', 'à prier'], says: 'Oui : avec ses murailles et ses tours, le château fort protège des attaques.' },
      { ask: 'Comment appelle-t-on le fossé rempli d’eau autour du château ?', answer: 'les douves', others: ['le donjon', 'le pont-levis'], says: 'Oui : les douves rendent le château plus difficile à attaquer.' },
      { ask: 'Comment appelle-t-on la tour la plus haute et la plus solide du château ?', answer: 'le donjon', others: ['le chemin de ronde', 'la herse'], says: 'Oui : le donjon est le dernier refuge du seigneur en cas d’attaque.' },
      { ask: 'Que relève-t-on pour fermer l’entrée du château ?', answer: 'le pont-levis', others: ['le donjon', 'les créneaux'], says: 'Oui : on relève le pont-levis pour que personne ne puisse entrer.' },
      { ask: 'Comment s’appellent les fentes étroites dans les murs, d’où l’on tire des flèches à l’abri ?', answer: 'les meurtrières', others: ['les douves', 'le pont-levis'], says: 'Oui : par les meurtrières, les archers tirent sans se montrer.' },
      { ask: 'Comment appelle-t-on les terres et les villages qui dépendent d’un seigneur ?', answer: 'la seigneurie', others: ['la paroisse', 'la foire'], says: 'Oui : le seigneur commande sa seigneurie, et les paysans travaillent ses terres.' },
      { e: '🐎', ask: 'Qui sont les chevaliers ?', answer: 'des guerriers à cheval', others: ['des paysans', 'des marchands'], says: 'Oui : les chevaliers sont des guerriers à cheval, au service d’un seigneur.' },
      { e: '🐎', ask: 'Comment appelle-t-on la cérémonie où un jeune noble devient chevalier ?', answer: 'l’adoubement', others: ['le baptême', 'le sacre'], says: 'Oui : pendant l’adoubement, le jeune homme reçoit ses armes de chevalier.' },
      { e: '🌾', ask: 'Que fait le seigneur pour les paysans de sa seigneurie ?', answer: 'il les protège', others: ['il leur donne de l’argent', 'il travaille dans leurs champs'], says: 'Oui : en échange de sa protection, les paysans lui doivent du travail et des taxes.' },
      { ask: 'En cas d’attaque, où les paysans vont-ils se réfugier ?', answer: 'dans le château', others: ['dans les champs', 'au marché'], says: 'Oui : en cas de danger, les paysans se mettent à l’abri derrière les murailles.' },
      { ask: 'Pourquoi construit-on souvent le château fort sur une hauteur ?', answer: 'pour voir venir l’ennemi', others: ['pour avoir moins froid', 'pour être près de la mer'], says: 'Oui : en hauteur, on voit arriver l’ennemi de loin, et le château domine le pays.' },
      { e: '🧱', ask: ['Les premiers châteaux forts étaient en bois.', 'En quoi les construit-on ensuite ?'], answer: 'en pierre', others: ['en paille', 'en verre'], says: 'Oui : la pierre est plus solide que le bois, et elle ne brûle pas.' },
      { ask: 'Comment appelle-t-on une longue attaque où l’ennemi encercle le château ?', answer: 'un siège', others: ['un tournoi', 'une foire'], says: 'Oui : pendant un siège, l’ennemi encercle le château pour affamer ses défenseurs.' },
      { e: '🐎', ask: 'Comment les chevaliers s’entraînent-ils au combat en temps de paix ?', answer: 'dans des tournois', others: ['dans des foires', 'dans des abbayes'], says: 'Oui : dans les tournois, les chevaliers s’affrontent pour s’entraîner et se faire connaître.' },
      { e: '🐎', ask: 'Que porte le chevalier pour se protéger au combat ?', answer: 'une armure', others: ['une toge', 'un tablier'], says: 'Oui : le chevalier porte une cotte de mailles ou une armure, un casque et un bouclier.' },
      { ask: ['Un chevalier jure fidélité à un seigneur plus puissant.', 'Que devient-il ?'], answer: 'son vassal', others: ['son suzerain', 'son serf'], says: 'Oui : le vassal jure fidélité à son seigneur, qui lui confie une terre, le fief.' },
    ],
  },
  {
    nom: 'Paysans, villes et Église',
    emoji: '🌾',
    questions: [
      { ask: 'Au Moyen Âge, que font la plupart des habitants ?', answer: 'ils cultivent la terre', others: ['ils combattent à cheval', 'ils prient dans une abbaye'], says: 'Oui : presque tous les habitants sont des paysans qui cultivent la terre.' },
      { ask: 'Comment appelle-t-on le travail gratuit que les paysans doivent au seigneur ?', answer: 'la corvée', others: ['la dîme', 'la foire'], says: 'Oui : pendant la corvée, les paysans travaillent gratuitement sur les terres du seigneur.' },
      { e: '⛪', ask: 'Quel impôt les paysans versent-ils à l’Église ?', answer: 'la dîme', others: ['la corvée', 'le péage'], says: 'Oui : la dîme, c’est une part des récoltes donnée à l’Église.' },
      { e: '⛪', ask: 'Comment appelle-t-on le territoire qui dépend d’une église et de son curé ?', answer: 'la paroisse', others: ['la seigneurie', 'la foire'], says: 'Oui : dans la paroisse, le curé baptise, marie et enterre les habitants.' },
      { e: '⛪', ask: 'Qui célèbre la messe dans l’église du village ?', answer: 'le curé', others: ['le seigneur', 'le chevalier'], says: 'Oui : le curé est le prêtre de la paroisse.' },
      { e: '⛪', ask: 'Où vivent les moines ?', answer: 'dans une abbaye', others: ['dans un château fort', 'dans une auberge'], says: 'Oui : les moines vivent, prient et travaillent dans une abbaye.' },
      { e: '⛪', ask: 'Quelle grande abbaye est fondée en Bourgogne, au début du Xe siècle ?', answer: 'l’abbaye de Cluny', others: ['Notre-Dame de Paris', 'le château de Versailles'], says: 'Oui : l’abbaye de Cluny est devenue l’une des plus puissantes d’Europe.' },
      { e: '📖', ask: 'Dans les abbayes, que font les moines copistes ?', answer: 'ils recopient des livres', others: ['ils construisent des châteaux', 'ils vendent des épices'], says: 'Oui : avant l’imprimerie, les livres étaient recopiés à la main.' },
      { e: '⛪', ask: 'Au Moyen Âge, qui accueille les pauvres et soigne les malades ?', answer: 'l’Église', others: ['les chevaliers', 'les marchands'], says: 'Oui : l’Église aide les pauvres, soigne les malades et enseigne.' },
      { e: '🔨', ask: 'Au Moyen Âge, où les artisans et les marchands sont-ils de plus en plus nombreux ?', answer: 'dans les villes', others: ['dans les châteaux', 'dans les abbayes'], says: 'Oui : les villes grandissent, avec leurs ateliers, leurs marchés et leurs foires.' },
      { e: '🧺', ask: 'Comment appelle-t-on le grand marché où viennent des marchands de pays lointains ?', answer: 'une foire', others: ['une corvée', 'une paroisse'], says: 'Oui : les foires de Champagne étaient célèbres dans toute l’Europe.' },
      { e: '🔨', ask: 'Qui fabrique des objets dans son atelier, en ville ?', answer: 'l’artisan', others: ['le seigneur', 'le moine'], says: 'Oui : le forgeron, le cordonnier ou le tisserand sont des artisans.' },
      { e: '⛪', ask: 'De quel style est la cathédrale Notre-Dame de Paris ?', answer: 'gothique', others: ['roman', 'moderne'], says: 'Oui : Notre-Dame de Paris est une cathédrale gothique, commencée en 1163.' },
      { e: '⛪', ask: 'Quel art construit des églises aux murs épais, avec de petites fenêtres ?', answer: 'l’art roman', others: ['l’art gothique', 'l’art de la préhistoire'], says: 'Oui : l’art roman vient d’abord, vers l’an mil ; ses églises sont plutôt sombres.' },
      { e: '⛪', ask: 'Quel art élève des cathédrales très hautes, éclairées par de grands vitraux ?', answer: 'l’art gothique', others: ['l’art roman', 'l’art de la préhistoire'], says: 'Oui : l’art gothique apparaît au XIIe siècle et remplit les églises de lumière.' },
      { e: '⛪', ask: 'Lequel de ces arts est le plus ancien ?', answer: 'l’art roman', others: ['l’art gothique', 'l’art de la Renaissance'], says: 'Oui : l’art roman vient d’abord, puis l’art gothique, et enfin la Renaissance.' },
      { ask: 'Comment appelle-t-on la récolte du blé ?', answer: 'la moisson', others: ['la vendange', 'la corvée'], says: 'Oui : l’été, les paysans moissonnent le blé avec une faucille.' },
      { e: '🐄', ask: 'Au Moyen Âge, avec quoi les paysans labourent-ils la terre ?', answer: 'une charrue tirée par des bœufs', others: ['un tracteur', 'une machine à vapeur'], says: 'Oui : des bœufs ou des chevaux tirent la charrue pour retourner la terre.' },
    ],
  },
  {
    nom: 'Le temps des rois',
    emoji: '👑',
    questions: [
      { ask: 'En quelle année François Ier remporte-t-il la bataille de Marignan ?', answer: '1515', others: ['1492', '1789'], says: 'Oui : en 1515, François Ier remporte la bataille de Marignan, en Italie.' },
      { e: '🎨', ask: 'Quel grand artiste italien François Ier invite-t-il en France ?', answer: 'Léonard de Vinci', others: ['Victor Hugo', 'Jules Ferry'], says: 'Oui : Léonard de Vinci vit à Amboise jusqu’à sa mort, en 1519.' },
      { e: '🎨', ask: 'Comment appelle-t-on le renouveau des arts et des sciences au XVIe siècle ?', answer: 'la Renaissance', others: ['la Révolution', 'le Moyen Âge'], says: 'Oui : à la Renaissance, artistes et savants s’inspirent de l’Antiquité.' },
      { e: '🏰', ask: 'Quel château de la Loire François Ier fait-il construire à partir de 1519 ?', answer: 'Chambord', others: ['Versailles', 'Carcassonne'], says: 'Oui : le château de Chambord est un chef-d’œuvre de la Renaissance.' },
      { e: '🖼️', ask: 'Quel tableau de Léonard de Vinci est exposé au musée du Louvre ?', answer: 'La Joconde', others: ['Les Tournesols', 'Les Nymphéas'], says: 'Oui : la Joconde, peinte par Léonard de Vinci, est au musée du Louvre.' },
      { e: '📚', ask: 'Quelle invention permet de fabriquer des livres plus vite, à la Renaissance ?', answer: 'l’imprimerie', others: ['la machine à vapeur', 'le téléphone'], says: 'Oui : grâce à l’imprimerie, les livres coûtent moins cher et circulent davantage.' },
      { ask: 'Au XVIe siècle, quels groupes s’affrontent pendant les guerres de religion ?', answer: 'catholiques et protestants', others: ['Français et Romains', 'Gaulois et Vikings'], says: 'Oui : catholiques et protestants se font la guerre pendant plus de trente ans.' },
      { ask: 'Quel roi signe l’édit de Nantes, en 1598 ?', answer: 'Henri IV', others: ['Louis XIV', 'François Ier'], says: 'Oui : en 1598, Henri IV signe l’édit de Nantes, qui ramène la paix religieuse.' },
      { ask: 'Que permet l’édit de Nantes ?', answer: 'Les protestants peuvent pratiquer leur religion.', others: ['Tous les Français doivent devenir protestants.', 'Les catholiques doivent quitter la France.'], says: 'Oui : les protestants peuvent pratiquer leur culte, dans certains lieux.' },
      { ask: 'À quel âge Louis XIV devient-il roi, en 1643 ?', answer: '4 ans', others: ['14 ans', '40 ans'], says: 'Oui : Louis XIV devient roi à 4 ans ; sa mère gouverne pour lui.' },
      { ask: 'Combien de temps dure le règne de Louis XIV ?', answer: '72 ans', others: ['12 ans', '30 ans'], says: 'Oui : de 1643 à 1715, Louis XIV règne 72 ans, un record en France.' },
      { e: '🏰', ask: 'Quel château Louis XIV fait-il agrandir pour y installer sa cour ?', answer: 'Versailles', others: ['Chambord', 'Carcassonne'], says: 'Oui : Louis XIV s’installe à Versailles en 1682, avec toute sa cour.' },
      { ask: 'Comment appelle-t-on un roi qui décide de tout, sans partager son pouvoir ?', answer: 'un monarque absolu', others: ['un président élu', 'un maire'], says: 'Oui : Louis XIV fait les lois, rend la justice et commande l’armée : c’est la monarchie absolue.' },
      { ask: 'Quel est le surnom de Louis XIV ?', answer: 'le Roi-Soleil', others: ['le Roi-Chevalier', 'le Bien-Aimé'], says: 'Oui : Louis XIV a choisi le Soleil comme emblème.' },
      { ask: 'Sous l’Ancien Régime, à quel ordre appartiennent les prêtres et les moines ?', answer: 'le clergé', others: ['la noblesse', 'le tiers état'], says: 'Oui : le clergé rassemble les hommes et les femmes d’Église.' },
      { ask: 'À quel ordre appartiennent les paysans, les artisans et les bourgeois ?', answer: 'le tiers état', others: ['le clergé', 'la noblesse'], says: 'Oui : le tiers état rassemble presque toute la population du royaume.' },
      { ask: 'À quel ordre appartiennent les seigneurs et leurs familles ?', answer: 'la noblesse', others: ['le clergé', 'le tiers état'], says: 'Oui : comme le clergé, la noblesse a des privilèges.' },
      { ask: 'Sous l’Ancien Régime, quel ordre paie l’essentiel des impôts ?', answer: 'le tiers état', others: ['le clergé', 'la noblesse'], says: 'Oui : le clergé et la noblesse ont des privilèges ; le tiers état paie l’essentiel des impôts.' },
    ],
  },
  {
    nom: 'Explorations et conquêtes',
    emoji: '⛵',
    questions: [
      { ask: 'En quelle année Christophe Colomb arrive-t-il en Amérique ?', answer: '1492', others: ['1515', '1789'], says: 'Oui : en 1492, Christophe Colomb atteint des îles d’Amérique, en croyant arriver en Asie.' },
      { ask: 'Où Christophe Colomb voulait-il aller en traversant l’océan Atlantique ?', answer: 'en Asie', others: ['en Afrique', 'en Australie'], says: 'Oui : il voulait rejoindre l’Asie par l’ouest, mais un continent se trouvait sur sa route.' },
      { ask: 'Pour quel royaume Christophe Colomb a-t-il navigué ?', answer: 'l’Espagne', others: ['la France', 'l’Angleterre'], says: 'Oui : Christophe Colomb, né à Gênes, a navigué pour les souverains espagnols.' },
      { ask: 'Quel navigateur lance, en 1519, la première expédition autour du monde ?', answer: 'Magellan', others: ['Christophe Colomb', 'Jacques Cartier'], says: 'Oui : Magellan meurt en route, mais un de ses navires termine le tour du monde en 1522.' },
      { ask: 'Quel instrument indique le nord aux marins ?', answer: 'la boussole', others: ['le sablier', 'la longue-vue'], says: 'Oui : l’aiguille aimantée de la boussole indique le nord.' },
      { ask: 'Comment s’appelle le navire léger et rapide des grands explorateurs ?', answer: 'la caravelle', others: ['le paquebot', 'le sous-marin'], says: 'Oui : légère et maniable, la caravelle peut affronter la haute mer.' },
      { e: '🗺️', ask: 'Grâce aux voyages des explorateurs, que deviennent les cartes du monde ?', answer: 'plus précises', others: ['plus petites', 'inutiles'], says: 'Oui : les explorateurs rapportent des informations pour dessiner de meilleures cartes.' },
      { ask: 'Lequel de ces aliments les Européens découvrent-ils en Amérique ?', answer: 'la tomate', others: ['le blé', 'le raisin'], says: 'Oui : la tomate vient d’Amérique, comme le maïs, le haricot et la pomme de terre.' },
      { e: '🍫', ask: 'D’où vient le cacao, qui sert à fabriquer le chocolat ?', answer: 'd’Amérique', others: ['d’Europe', 'd’Australie'], says: 'Oui : les Aztèques buvaient déjà du cacao avant l’arrivée des Européens.' },
      { ask: 'Laquelle de ces plantes vient d’Amérique ?', answer: 'la pomme de terre', others: ['le chou', 'le navet'], says: 'Oui : la pomme de terre vient des Andes, en Amérique du Sud.' },
      { ask: 'Quelle céréale cultivée en Amérique les Européens découvrent-ils ?', answer: 'le maïs', others: ['le blé', 'l’orge'], says: 'Oui : le maïs était cultivé en Amérique bien avant l’arrivée des Européens.' },
      { e: '', ask: 'Comment appelle-t-on le commerce d’Africains réduits en esclavage et emmenés en Amérique ?', answer: 'la traite', others: ['la dîme', 'la corvée'], says: 'Oui : des millions d’Africains ont été déportés en Amérique pour y être réduits en esclavage.' },
      { e: '🗺️', ask: 'Le commerce triangulaire relie l’Europe, l’Afrique et quel autre continent ?', answer: 'l’Amérique', others: ['l’Asie', 'l’Océanie'], says: 'Oui : les navires vont d’Europe en Afrique, puis en Amérique, avant de revenir en Europe.' },
      { e: '', ask: 'Dans les colonies d’Amérique, que cultivent surtout les esclaves ?', answer: 'la canne à sucre', others: ['le blé', 'la vigne'], says: 'Oui : dans les plantations, les esclaves cultivent la canne à sucre, le café ou le coton.' },
      { e: '', ask: 'En 1685, quel texte fixe les règles de l’esclavage dans les colonies françaises ?', answer: 'le Code noir', others: ['l’édit de Nantes', 'la Déclaration des droits de l’homme'], says: 'Oui : le Code noir traite les esclaves comme des biens, et non comme des personnes.' },
      { e: '', ask: 'En quelle année l’esclavage est-il aboli pour de bon en France et dans ses colonies ?', answer: '1848', others: ['1685', '1492'], says: 'Oui : en 1848, l’esclavage est aboli en France et dans ses colonies.' },
      { e: '🗺️', ask: 'Comment appelle-t-on les territoires conquis et dirigés par un pays européen ?', answer: 'des colonies', others: ['des seigneuries', 'des paroisses'], says: 'Oui : l’Espagne, le Portugal, l’Angleterre et la France fondent des empires coloniaux.' },
      { ask: 'Quel empire d’Amérique les Espagnols de Cortés conquièrent-ils ?', answer: 'l’Empire aztèque', others: ['l’Empire romain', 'l’Empire chinois'], says: 'Oui : de 1519 à 1521, Hernán Cortés conquiert l’Empire aztèque, au Mexique.' },
      { ask: 'Quel explorateur français remonte le fleuve Saint-Laurent, au Canada, en 1535 ?', answer: 'Jacques Cartier', others: ['Magellan', 'Christophe Colomb'], says: 'Oui : Jacques Cartier explore le Canada pour le roi François Ier.' },
    ],
  },
  {
    nom: '1789, la Révolution',
    emoji: '⚖️',
    questions: [
      { e: '📚', ask: 'Voltaire, Rousseau et Montesquieu sont des philosophes de quel mouvement ?', answer: 'les Lumières', others: ['la Renaissance', 'la Résistance'], says: 'Oui : au XVIIIe siècle, les philosophes des Lumières défendent la raison et la liberté.' },
      { e: '📚', ask: 'Quel philosophe veut séparer trois pouvoirs : faire les lois, les appliquer et juger ?', answer: 'Montesquieu', others: ['Voltaire', 'Rousseau'], says: 'Oui : pour Montesquieu, séparer les pouvoirs empêche un seul homme de tout décider.' },
      { e: '📚', ask: 'Qui dirige l’Encyclopédie, qui rassemble les connaissances de son temps ?', answer: 'Diderot', others: ['Voltaire', 'Louis XVI'], says: 'Oui : Diderot et d’Alembert publient l’Encyclopédie à partir de 1751.' },
      { e: '📚', ask: 'Quel philosophe des Lumières lutte contre l’intolérance religieuse ?', answer: 'Voltaire', others: ['Louis XIV', 'Jules Ferry'], says: 'Oui : Voltaire défend la tolérance et dénonce les injustices.' },
      { ask: 'En 1791, qui écrit la Déclaration des droits de la femme et de la citoyenne ?', answer: 'Olympe de Gouges', others: ['Marie-Antoinette', 'Jeanne d’Arc'], says: 'Oui : Olympe de Gouges réclame les mêmes droits pour les femmes que pour les hommes.' },
      { e: '🖊️', ask: 'Au printemps 1789, où les Français écrivent-ils leurs plaintes et leurs souhaits ?', answer: 'dans les cahiers de doléances', others: ['dans l’Encyclopédie', 'dans le Code noir'], says: 'Oui : dans tout le royaume, on rédige des cahiers de doléances pour le roi.' },
      { e: '👑', ask: 'Pourquoi Louis XVI réunit-il les États généraux en 1789 ?', answer: 'le royaume manque d’argent', others: ['il veut déclarer la guerre', 'il veut partir en voyage'], says: 'Oui : les caisses du royaume sont vides, et le roi a besoin de nouveaux impôts.' },
      { ask: 'Le 5 mai 1789, quelle assemblée s’ouvre à Versailles ?', answer: 'les États généraux', others: ['le Parlement européen', 'le conseil municipal'], says: 'Oui : les députés du clergé, de la noblesse et du tiers état se réunissent à Versailles.' },
      { ask: 'Le 17 juin 1789, quel nom prennent les députés du tiers état ?', answer: 'l’Assemblée nationale', others: ['le conseil municipal', 'le Parlement européen'], says: 'Oui : ils affirment représenter la nation tout entière.' },
      { ask: 'Le 20 juin 1789, que jurent les députés dans la salle du Jeu de paume ?', answer: 'de donner une Constitution à la France', others: ['de partir en croisade', 'de rendre le pouvoir au roi'], says: 'Oui : ils jurent de ne pas se séparer avant d’avoir écrit une Constitution.' },
      { ask: 'Que se passe-t-il à Paris le 14 juillet 1789 ?', answer: 'la prise de la Bastille', others: ['le sacre du roi', 'la fin d’une guerre'], says: 'Oui : le 14 juillet 1789, les Parisiens prennent la Bastille.' },
      { ask: 'Qu’était la Bastille ?', answer: 'une forteresse servant de prison', others: ['une église', 'un marché'], says: 'Oui : cette prison était un symbole du pouvoir absolu du roi.' },
      { ask: 'Que décident les députés pendant la nuit du 4 août 1789 ?', answer: 'l’abolition des privilèges', others: ['la guerre contre l’Angleterre', 'le retour de la monarchie absolue'], says: 'Oui : dans la nuit du 4 août 1789, les privilèges sont abolis.' },
      { ask: 'Quel texte est adopté le 26 août 1789 ?', answer: 'la Déclaration des droits de l’homme et du citoyen', others: ['l’édit de Nantes', 'le Code noir'], says: 'Oui : elle proclame la liberté et l’égalité en droits de tous les hommes.' },
      { ask: 'Selon la Déclaration de 1789, comment les hommes naissent-ils et demeurent-ils ?', answer: 'libres et égaux en droits', others: ['riches ou pauvres', 'nobles ou paysans'], says: 'Oui : l’article premier dit que les hommes naissent et demeurent libres et égaux en droits.' },
      { e: '🥖', ask: 'Les 5 et 6 octobre 1789, qui marche de Paris jusqu’à Versailles ?', answer: 'des femmes de Paris', others: ['les chevaliers du roi', 'les moines de Cluny'], says: 'Oui : les Parisiennes, qui manquent de pain, ramènent le roi et sa famille à Paris.' },
      { e: '👑', ask: 'Qui est roi de France en 1789 ?', answer: 'Louis XVI', others: ['Louis XIV', 'Henri IV'], says: 'Oui : Louis XVI est roi de France depuis 1774.' },
      { e: '👑', ask: 'Comment s’appelle l’épouse de Louis XVI ?', answer: 'Marie-Antoinette', others: ['Olympe de Gouges', 'Jeanne d’Arc'], says: 'Oui : Marie-Antoinette, née en Autriche, est reine de France.' },
    ],
  },
  {
    nom: 'Le temps de la République',
    emoji: '🇫🇷',
    questions: [
      { ask: 'En quelle année la Première République est-elle proclamée ?', answer: '1792', others: ['1789', '1848'], says: 'Oui : en septembre 1792, la royauté est abolie et la République proclamée.' },
      { e: '', ask: 'En 1793, que devient Louis XVI ?', answer: 'Il est jugé, puis exécuté.', others: ['Il devient président.', 'Il part vivre en Amérique.'], says: 'Oui : accusé de trahison, Louis XVI est exécuté le 21 janvier 1793.' },
      { ask: 'En 1848, quel droit obtiennent tous les hommes de 21 ans et plus ?', answer: 'le droit de vote', others: ['le droit de chasse', 'le droit d’être noble'], says: 'Oui : en 1848, le suffrage universel masculin est instauré, et l’esclavage est aboli.' },
      { ask: 'En quelle année la République est-elle proclamée à nouveau, cette fois pour longtemps ?', answer: '1870', others: ['1792', '1958'], says: 'Oui : le 4 septembre 1870, la République est proclamée ; cette fois, elle va durer.' },
      { ask: 'Que permettent les lois votées en 1875 ?', answer: 'La République s’installe durablement.', others: ['Le roi revient au pouvoir.', 'La France devient un empire.'], says: 'Oui : les lois de 1875 organisent la Troisième République, qui dure jusqu’en 1940.' },
      { e: '🎆', ask: 'En 1892, que fête la République ?', answer: 'ses cent ans', others: ['la fin de la Grande Guerre', 'l’arrivée de l’euro'], says: 'Oui : en 1892, on fête les cent ans de la Première République, proclamée en 1792.' },
      { e: '🏫', ask: 'Quel ministre rend l’école gratuite, laïque et obligatoire ?', answer: 'Jules Ferry', others: ['Victor Hugo', 'Louis XIV'], says: 'Oui : les lois Jules Ferry de 1881 et 1882 transforment l’école.' },
      { e: '🏫', ask: 'En quelle année l’école primaire publique devient-elle gratuite ?', answer: '1881', others: ['1789', '1945'], says: 'Oui : depuis 1881, l’école primaire publique est gratuite.' },
      { e: '🏫', ask: 'Avec la loi de 1882, l’instruction devient obligatoire pour les enfants de quel âge ?', answer: 'de 6 à 13 ans', others: ['de 3 à 5 ans', 'de 14 à 18 ans'], says: 'Oui : en 1882, l’instruction devient obligatoire de 6 à 13 ans.' },
      { e: '🏫', ask: 'Que veut dire « école laïque » ?', answer: 'Elle ne dépend d’aucune religion.', others: ['On y apprend une seule religion.', 'Elle est réservée aux garçons.'], says: 'Oui : l’école publique laïque accueille tous les élèves, quelle que soit leur religion.' },
      { e: '🗳️', ask: 'En quelle année les Françaises obtiennent-elles le droit de vote ?', answer: '1944', others: ['1789', '1881'], says: 'Oui : les femmes obtiennent le droit de vote en 1944, et votent pour la première fois en 1945.' },
      { e: '🗳️', ask: 'En quelle année les Françaises votent-elles pour la première fois ?', answer: '1945', others: ['1792', '1914'], says: 'Oui : le 29 avril 1945, les Françaises votent pour la première fois, aux élections municipales.' },
      { ask: 'Comment s’appelle la figure de femme qui représente la République ?', answer: 'Marianne', others: ['Jeanne d’Arc', 'Marie-Antoinette'], says: 'Oui : on voit Marianne sur les timbres, sur certaines pièces et dans les mairies.' },
      { ask: 'Quelle est la devise de la République française ?', answer: 'Liberté, Égalité, Fraternité', others: ['Paix, Travail, Bonheur', 'Force, Honneur, Courage'], says: 'Oui : la devise de la République est inscrite sur les mairies et les écoles.' },
      { ask: 'En 1958, quelle République commence ?', answer: 'la Cinquième République', others: ['la Première République', 'la Troisième République'], says: 'Oui : depuis 1958, la France vit sous la Cinquième République.' },
    ],
  },
  {
    nom: 'L’âge industriel',
    emoji: '🏭',
    questions: [
      { ask: 'Quelle machine fait fonctionner les premières usines et les locomotives ?', answer: 'la machine à vapeur', others: ['le moulin à vent', 'le moteur électrique'], says: 'Oui : la machine à vapeur brûle du charbon pour faire tourner les machines et avancer les trains.' },
      { e: '⛏️', ask: 'Au XIXe siècle, quel combustible extrait des mines fait marcher les machines à vapeur ?', answer: 'le charbon', others: ['le pétrole', 'l’uranium'], says: 'Oui : le charbon est l’énergie de l’âge industriel.' },
      { e: '⛏️', ask: 'Où travaillent les mineurs ?', answer: 'au fond des mines', others: ['dans les champs', 'dans les grands magasins'], says: 'Oui : les mineurs extraient le charbon au fond des mines, dans des conditions très dures.' },
      { ask: 'Comment appelle-t-on les personnes qui travaillent dans les usines ?', answer: 'les ouvriers', others: ['les seigneurs', 'les chevaliers'], says: 'Oui : les ouvriers et les ouvrières travaillent dur, pour un petit salaire.' },
      { ask: 'Au XIXe siècle, combien d’heures les ouvriers travaillent-ils souvent par jour ?', answer: '12 heures ou plus', others: ['4 heures', '6 heures'], says: 'Oui : les journées de travail sont très longues, souvent douze heures ou plus.' },
      { e: '🚂', ask: 'Au XIXe siècle, quel moyen de transport se développe dans toute la France ?', answer: 'le chemin de fer', others: ['l’avion', 'la fusée'], says: 'Oui : les trains transportent voyageurs et marchandises beaucoup plus vite.' },
      { ask: 'Qu’est-ce qu’une locomotive ?', answer: 'la machine qui tire le train', others: ['un bateau à voiles', 'une mine de charbon'], says: 'Oui : la locomotive à vapeur tire les wagons sur les rails.' },
      { ask: 'En 1841, une loi interdit de faire travailler à l’usine les enfants de moins de quel âge ?', answer: '8 ans', others: ['16 ans', '18 ans'], says: 'Oui : avant cette loi, de très jeunes enfants travaillaient dans les usines et les mines.' },
      { ask: 'Comment appelle-t-on le départ des habitants des campagnes vers les villes ?', answer: 'l’exode rural', others: ['la traite', 'la corvée'], says: 'Oui : beaucoup de paysans partent travailler en ville, dans les usines.' },
      { ask: 'Comment appelle-t-on les associations d’ouvriers qui défendent leurs droits ?', answer: 'les syndicats', others: ['les seigneuries', 'les paroisses'], says: 'Oui : depuis 1884, les syndicats sont autorisés en France.' },
      { ask: 'Quand des ouvriers arrêtent le travail pour réclamer de meilleures conditions, comment appelle-t-on cela ?', answer: 'une grève', others: ['une foire', 'une fête'], says: 'Oui : depuis 1864, les ouvriers ont le droit de faire grève.' },
      { e: '🛒', ask: 'Au XIXe siècle, où peut-on acheter de tout sous un même toit, en ville ?', answer: 'dans les grands magasins', others: ['dans les abbayes', 'dans les châteaux forts'], says: 'Oui : à Paris, le Bon Marché est l’un des premiers grands magasins.' },
      { ask: 'À la fin du XIXe siècle, quelle nouvelle énergie commence à éclairer les rues et les maisons ?', answer: 'l’électricité', others: ['le vent', 'le nucléaire'], says: 'Oui : l’électricité arrive peu à peu dans les villes, puis dans les campagnes.' },
      { e: '🏙️', ask: 'Pourquoi les villes grandissent-elles au XIXe siècle ?', answer: 'Les usines attirent des travailleurs.', others: ['Les châteaux forts protègent les habitants.', 'Les paysans deviennent chevaliers.'], says: 'Oui : les villes accueillent de nombreux ouvriers venus des campagnes.' },
      { e: '🗼', ask: 'Pour quelle Exposition universelle la tour Eiffel est-elle construite, à Paris ?', answer: 'celle de 1889', others: ['celle de 1789', 'celle de 1989'], says: 'Oui : la tour Eiffel est inaugurée en 1889, cent ans après la Révolution.' },
      { e: '🗼', ask: 'En quel matériau la tour Eiffel est-elle construite ?', answer: 'en fer', others: ['en pierre', 'en bois'], says: 'Oui : la tour Eiffel est en fer, un matériau de l’âge industriel.' },
    ],
  },
  {
    nom: 'Première Guerre mondiale',
    emoji: '',
    questions: [
      { ask: 'En quelle année commence la Première Guerre mondiale ?', answer: '1914', others: ['1870', '1939'], says: 'Oui : la Première Guerre mondiale commence à l’été 1914.' },
      { ask: 'En quelle année se termine la Première Guerre mondiale ?', answer: '1918', others: ['1916', '1945'], says: 'Oui : elle se termine avec l’armistice du 11 novembre 1918.' },
      { ask: 'Comment surnomme-t-on les soldats français de cette guerre ?', answer: 'les poilus', others: ['les chevaliers', 'les résistants'], says: 'Oui : on surnomme poilus les soldats français de la Grande Guerre.' },
      { ask: 'Sur le front, où vivent les soldats ?', answer: 'dans les tranchées', others: ['dans des châteaux forts', 'dans des hôtels'], says: 'Oui : les tranchées sont des fossés creusés dans la terre, où les soldats vivent dans la boue.' },
      { ask: 'Quelle grande bataille a lieu en 1916, dans l’est de la France ?', answer: 'Verdun', others: ['Marignan', 'Waterloo'], says: 'Oui : la bataille de Verdun dure presque toute l’année 1916.' },
      { ask: 'Que signe-t-on le 11 novembre 1918 ?', answer: 'l’armistice', others: ['l’édit de Nantes', 'le traité de Rome'], says: 'Oui : l’armistice arrête les combats le 11 novembre 1918, à 11 heures.' },
      { ask: 'Contre quel pays la France se bat-elle surtout pendant cette guerre ?', answer: 'l’Allemagne', others: ['le Royaume-Uni', 'les États-Unis'], says: 'Oui : la France, le Royaume-Uni et la Russie affrontent l’Allemagne et l’Autriche-Hongrie.' },
      { e: '💐', ask: 'Pourquoi trouve-t-on un monument aux morts dans presque chaque commune ?', answer: 'pour honorer les soldats morts', others: ['pour fêter la bataille de Marignan', 'pour décorer la place du marché'], says: 'Oui : on y a gravé le nom des soldats de la commune morts pendant la guerre.' },
      { ask: 'Combien de soldats français sont morts pendant la Première Guerre mondiale ?', answer: 'environ 1,4 million', others: ['environ mille', 'environ dix mille'], says: 'Oui : c’est l’une des guerres les plus meurtrières de l’histoire de France.' },
      { e: '💐', ask: 'Que commémore-t-on chaque année le 11 novembre ?', answer: 'l’armistice de 1918', others: ['la prise de la Bastille', 'la fin du Moyen Âge'], says: 'Oui : le 11 novembre, on rend hommage aux soldats morts pour la France.' },
      { ask: 'Comment appelle-t-on aussi la Première Guerre mondiale ?', answer: 'la Grande Guerre', others: ['la guerre de Cent Ans', 'la guerre des Gaules'], says: 'Oui : on l’appelle aussi la Grande Guerre.' },
      { ask: 'Pendant la guerre, qui remplace dans les usines et les champs les hommes partis au front ?', answer: 'les femmes', others: ['les chevaliers', 'les seigneurs'], says: 'Oui : les femmes font tourner les usines, les fermes et les transports.' },
      { ask: 'Quelle nouvelle arme est utilisée dans les tranchées à partir de 1915 ?', answer: 'les gaz toxiques', others: ['l’arc', 'la catapulte'], says: 'Oui : pour se protéger des gaz, les soldats portent des masques.' },
      { ask: 'Quel nouveau véhicule blindé apparaît sur les champs de bataille en 1916 ?', answer: 'le char d’assaut', others: ['l’hélicoptère', 'la fusée'], says: 'Oui : les premiers chars d’assaut sont utilisés en 1916.' },
      { ask: 'Comment les soldats donnent-ils des nouvelles à leur famille ?', answer: 'par des lettres', others: ['par téléphone portable', 'par Internet'], says: 'Oui : les poilus écrivent beaucoup de lettres à leurs proches.' },
      { ask: 'Quel pays entre en guerre aux côtés de la France en 1917 ?', answer: 'les États-Unis', others: ['l’Allemagne', 'l’Autriche-Hongrie'], says: 'Oui : l’arrivée des soldats américains aide les Alliés à gagner la guerre.' },
    ],
  },
  {
    nom: '1939-1945 et l’Europe',
    emoji: '',
    questions: [
      { ask: 'En quelle année commence la Seconde Guerre mondiale ?', answer: '1939', others: ['1914', '1945'], says: 'Oui : la guerre commence en septembre 1939, quand l’Allemagne envahit la Pologne.' },
      { ask: 'Qui dirige l’Allemagne nazie pendant la Seconde Guerre mondiale ?', answer: 'Adolf Hitler', others: ['Napoléon', 'Louis XIV'], says: 'Oui : Hitler est un dictateur qui veut dominer l’Europe.' },
      { e: '📻', ask: 'Qui lance un appel à la radio de Londres, le 18 juin 1940 ?', answer: 'le général de Gaulle', others: ['Jules Ferry', 'Louis XVI'], says: 'Oui : depuis Londres, le général de Gaulle appelle les Français à continuer le combat.' },
      { ask: 'Après la défaite de 1940, que devient une grande partie de la France ?', answer: 'Elle est occupée par l’armée allemande.', others: ['Elle devient un royaume.', 'Elle gagne la guerre.'], says: 'Oui : de 1940 à 1944, l’armée allemande occupe la France.' },
      { ask: 'Comment appelle-t-on les hommes et les femmes qui luttent en secret contre l’occupant ?', answer: 'les résistants', others: ['les poilus', 'les chevaliers'], says: 'Oui : les résistants informent les Alliés, cachent des personnes pourchassées et sabotent l’ennemi.' },
      { ask: 'Comment appelle-t-on le génocide des Juifs d’Europe par les nazis ?', answer: 'la Shoah', others: ['l’armistice', 'la Libération'], says: 'Oui : environ six millions de Juifs ont été assassinés ; on ne doit jamais l’oublier.' },
      { ask: 'Comment appelle-t-on les personnes qui ont caché des Juifs pour les sauver ?', answer: 'les Justes', others: ['les poilus', 'les chevaliers'], says: 'Oui : les Justes parmi les nations ont sauvé des Juifs, au péril de leur vie.' },
      { ask: 'Le 6 juin 1944, où les Alliés débarquent-ils ?', answer: 'en Normandie', others: ['en Bretagne', 'en Alsace'], says: 'Oui : le 6 juin 1944, les Alliés débarquent sur les plages de Normandie.' },
      { ask: 'En quelle année Paris est-il libéré ?', answer: '1944', others: ['1918', '1940'], says: 'Oui : Paris est libéré le 25 août 1944.' },
      { ask: 'Quel jour la Seconde Guerre mondiale se termine-t-elle en Europe ?', answer: 'le 8 mai 1945', others: ['le 11 novembre 1918', 'le 14 juillet 1789'], says: 'Oui : le 8 mai 1945, l’Allemagne nazie capitule.' },
      { e: '🇪🇺', ask: 'Après la guerre, pourquoi des pays d’Europe décident-ils de s’unir ?', answer: 'pour garder la paix', others: ['pour faire la guerre', 'pour choisir un roi'], says: 'Oui : unir les pays d’Europe, c’est éviter une nouvelle guerre entre eux.' },
      { e: '🇪🇺', ask: 'Quel traité, signé en 1957, crée la Communauté économique européenne ?', answer: 'le traité de Rome', others: ['le traité de Versailles', 'l’édit de Nantes'], says: 'Oui : en 1957, six pays, dont la France, l’Italie et la Belgique, signent le traité de Rome.' },
      { e: '🇪🇺', ask: 'Combien de pays signent le traité de Rome, en 1957 ?', answer: '6', others: ['12', '27'], says: 'Oui : la Belgique, la France, l’Italie, le Luxembourg, les Pays-Bas et l’Allemagne de l’Ouest.' },
      { e: '🇪🇺', ask: 'Quel traité, signé en 1992, crée l’Union européenne ?', answer: 'le traité de Maastricht', others: ['le traité de Rome', 'le traité de Versailles'], says: 'Oui : le traité de Maastricht crée l’Union européenne et prépare la monnaie unique.' },
      { e: '💶', ask: 'Quand les pièces et les billets en euros arrivent-ils dans les porte-monnaie ?', answer: 'le 1er janvier 2002', others: ['le 1er janvier 1957', 'le 1er janvier 1992'], says: 'Oui : depuis le 1er janvier 2002, on paie en euros en France.' },
      { e: '💶', ask: 'Quelle monnaie utilisait-on en France avant l’euro ?', answer: 'le franc', others: ['le dollar', 'le yen'], says: 'Oui : le franc a été remplacé par l’euro en 2002.' },
    ],
  },
  {
    nom: 'La frise du temps',
    emoji: '⏳',
    questions: [
      { ask: 'Quelle période va de 476 à 1492 ?', answer: 'le Moyen Âge', others: ['les Temps modernes', 'l’Antiquité'], says: 'Oui : le Moyen Âge dure environ mille ans, de 476 à 1492.' },
      { ask: 'Quelle période va de 1492 à 1789 ?', answer: 'les Temps modernes', others: ['le Moyen Âge', 'l’époque contemporaine'], says: 'Oui : les Temps modernes vont du voyage de Colomb à la Révolution française.' },
      { ask: 'Quelle période commence en 1789 ?', answer: 'l’époque contemporaine', others: ['le Moyen Âge', 'les Temps modernes'], says: 'Oui : l’époque contemporaine commence avec la Révolution française, et nous y vivons.' },
      { ask: 'Quelle période vient juste avant le Moyen Âge ?', answer: 'l’Antiquité', others: ['les Temps modernes', 'l’époque contemporaine'], says: 'Oui : l’Antiquité se termine en 476, avec la fin de l’Empire romain d’Occident.' },
      { e: '🏰', ask: 'Pendant quelle période construit-on les châteaux forts ?', answer: 'le Moyen Âge', others: ['les Temps modernes', 'l’époque contemporaine'], says: 'Oui : les châteaux forts sont construits au Moyen Âge.' },
      { e: '👑', ask: 'Pendant quelle période Louis XIV règne-t-il ?', answer: 'les Temps modernes', others: ['le Moyen Âge', 'l’époque contemporaine'], says: 'Oui : Louis XIV règne de 1643 à 1715, pendant les Temps modernes.' },
      { ask: 'Pendant quelle période a lieu la Première Guerre mondiale ?', answer: 'l’époque contemporaine', others: ['le Moyen Âge', 'les Temps modernes'], says: 'Oui : de 1914 à 1918, c’est l’époque contemporaine.' },
      { ask: 'Pendant quelle période l’abbaye de Cluny est-elle fondée ?', answer: 'le Moyen Âge', others: ['l’Antiquité', 'les Temps modernes'], says: 'Oui : l’abbaye de Cluny est fondée vers 910, au Moyen Âge.' },
      { ask: 'Pendant quelle période a lieu la bataille de Marignan ?', answer: 'les Temps modernes', others: ['le Moyen Âge', 'l’Antiquité'], says: 'Oui : 1515, c’est au début des Temps modernes.' },
      { ask: 'En 1163, en quel siècle était-on ?', answer: 'au XIIe siècle', others: ['au XIe siècle', 'au XIIIe siècle'], says: 'Oui : 1163, c’est le XIIe siècle.' },
      { ask: 'En 1492, en quel siècle était-on ?', answer: 'au XVe siècle', others: ['au XIVe siècle', 'au XVIe siècle'], says: 'Oui : 1492, c’est le XVe siècle.' },
      { ask: 'En 1515, en quel siècle était-on ?', answer: 'au XVIe siècle', others: ['au XVe siècle', 'au XVIIe siècle'], says: 'Oui : 1515, c’est le XVIe siècle.' },
      { ask: 'En 1682, en quel siècle était-on ?', answer: 'au XVIIe siècle', others: ['au XVIe siècle', 'au XVIIIe siècle'], says: 'Oui : 1682, c’est le XVIIe siècle.' },
      { ask: 'En 1789, en quel siècle était-on ?', answer: 'au XVIIIe siècle', others: ['au XVIIe siècle', 'au XIXe siècle'], says: 'Oui : 1789, c’est le XVIIIe siècle.' },
      { ask: 'En 1848, en quel siècle était-on ?', answer: 'au XIXe siècle', others: ['au XVIIIe siècle', 'au XXe siècle'], says: 'Oui : 1848, c’est le XIXe siècle.' },
      { ask: 'En 1918, en quel siècle était-on ?', answer: 'au XXe siècle', others: ['au XIXe siècle', 'au XXIe siècle'], says: 'Oui : 1918, c’est le XXe siècle.' },
      { ask: 'En quel siècle vivons-nous aujourd’hui ?', answer: 'au XXIe siècle', others: ['au XXe siècle', 'au XIXe siècle'], says: 'Oui : depuis 2001, nous sommes au XXIe siècle.' },
      { ask: 'Combien d’années dure un siècle ?', answer: '100 ans', others: ['10 ans', 'mille ans'], says: 'Oui : un siècle dure cent ans.' },
      { e: '🗼', ask: ['La tour Eiffel est inaugurée cent ans après la prise de la Bastille.', 'En quelle année ?'], answer: '1889', others: ['1798', '1989'], says: 'Oui : 1789 plus cent ans, cela fait 1889.' },
      { ask: 'Combien d’années environ dure la Première Guerre mondiale ?', answer: '4 ans', others: ['14 ans', '40 ans'], says: 'Oui : de l’été 1914 à novembre 1918, la guerre dure un peu plus de quatre ans.' },
    ],
  },
];

// La frise : des événements datés (année vérifiée), pour « lequel est le plus ancien ? ».
const EVENEMENTS = [
  { quoi: 'la fin de l’Empire romain d’Occident', annee: 476, dit: 'L’Empire romain d’Occident disparaît en 476.' },
  { quoi: 'la fondation de l’abbaye de Cluny', annee: 910, dit: 'L’abbaye de Cluny est fondée vers 910.' },
  { quoi: 'le début de la construction de Notre-Dame de Paris', annee: 1163, dit: 'La construction de Notre-Dame de Paris commence en 1163.' },
  { quoi: 'le premier voyage de Christophe Colomb', annee: 1492, dit: 'Christophe Colomb atteint l’Amérique en 1492.' },
  { quoi: 'la bataille de Marignan', annee: 1515, dit: 'La bataille de Marignan a lieu en 1515.' },
  { quoi: 'l’édit de Nantes', annee: 1598, dit: 'Henri IV signe l’édit de Nantes en 1598.' },
  { quoi: 'l’installation de Louis XIV à Versailles', annee: 1682, dit: 'Louis XIV s’installe à Versailles en 1682.' },
  { quoi: 'la prise de la Bastille', annee: 1789, dit: 'La Bastille est prise le 14 juillet 1789.' },
  { quoi: 'l’abolition définitive de l’esclavage', annee: 1848, dit: 'L’esclavage est aboli pour de bon en 1848.' },
  { quoi: 'la loi sur l’école gratuite', annee: 1881, dit: 'L’école primaire publique devient gratuite en 1881.' },
  { quoi: 'l’inauguration de la tour Eiffel', annee: 1889, dit: 'La tour Eiffel est inaugurée en 1889.' },
  { quoi: 'la loi de séparation des Églises et de l’État', annee: 1905, dit: 'La loi de séparation des Églises et de l’État est votée en 1905.' },
  { quoi: 'l’armistice de la Grande Guerre', annee: 1918, dit: 'L’armistice de la Grande Guerre est signé le 11 novembre 1918.' },
  { quoi: 'l’appel du 18 juin du général de Gaulle', annee: 1940, dit: 'Le général de Gaulle lance son appel le 18 juin 1940.' },
  { quoi: 'le premier vote des Françaises', annee: 1945, dit: 'Les Françaises votent pour la première fois en 1945.' },
  { quoi: 'la signature du traité de Rome', annee: 1957, dit: 'Le traité de Rome est signé en 1957.' },
  { quoi: 'l’arrivée des pièces et des billets en euros', annee: 2002, dit: 'Les pièces et les billets en euros arrivent en 2002.' },
];
/** Écart minimal entre deux événements proposés ensemble : on range des époques, pas des années voisines. */
const ECART = 30;

/** « Lequel de ces événements est le plus ancien (ou le plus récent) ? » : trois événements bien séparés. */
function plusAncien(rng) {
  const choisis = [];
  for (const ev of shuffle(rng, EVENEMENTS)) {
    if (choisis.every((c) => Math.abs(c.annee - ev.annee) >= ECART)) choisis.push(ev);
    if (choisis.length === 3) break;
  }
  const ancien = rng() < 0.5;
  const ranges = [...choisis].sort((a, b) => a.annee - b.annee);
  const bon = ancien ? ranges[0] : ranges[2];
  const text = `Lequel de ces événements est le plus ${ancien ? 'ancien' : 'récent'} ?`;
  return {
    key: `histoire:10:${ancien ? 'ancien' : 'recent'}:${ranges.map((c) => c.quoi).join(',')}`,
    text,
    instruction: [text],
    stage: { type: 'picture', emoji: '⏳' },
    choices: choisis.map((c) => ({ value: c.quoi, label: c.quoi })),
    choiceStyle: 'sentences',
    answer: bon.quoi,
    success: { speak: dire(bon.dit) },
  };
}

export const histoire = {
  id: 'histoire',
  domain: 'monde',
  section: 'Histoire et géographie',
  title: 'L’histoire de France',
  icon: '🏰',
  skill: 'Le Moyen Âge, les rois, les explorations, la Révolution ; la République, l’âge industriel, les guerres mondiales et l’Europe',
  levels: HISTOIRE.map((n) => n.nom),
  generate(level, rng) {
    // niveau 10 : la frise mêle périodes, siècles et événements à remettre dans l'ordre
    if (level === 10 && rng() < 0.45) return plusAncien(rng);
    return jouer('histoire', HISTOIRE, level, rng);
  },
};

// ================================================================= La géographie

const GEOGRAPHIE = [
  {
    nom: 'L’origine des aliments',
    emoji: '🚜',
    questions: [
      { ask: 'Lequel de ces aliments est un produit agricole, vendu sans être transformé ?', answer: 'une pomme', others: ['un yaourt', 'des chips'], says: 'Oui : la pomme est cueillie, puis vendue telle quelle.' },
      { ask: 'Lequel de ces aliments est un produit transformé ?', answer: 'le pain', others: ['une carotte', 'un œuf'], says: 'Oui : le pain est fabriqué avec de la farine, qui vient du blé.' },
      { ask: 'Avec quel produit agricole fabrique-t-on le yaourt ?', answer: 'le lait', others: ['le blé', 'le cacao'], says: 'Oui : le yaourt est fabriqué avec du lait et des ferments.' },
      { ask: 'Avec quelle céréale fabrique-t-on la farine du pain ?', answer: 'le blé', others: ['le cacao', 'la betterave'], says: 'Oui : le meunier moud le blé en farine, puis le boulanger fait le pain.' },
      { e: '🍫', ask: 'Avec quelles graines fabrique-t-on le chocolat ?', answer: 'les fèves de cacao', others: ['les grains de blé', 'les grains de café'], says: 'Oui : le chocolat est fait avec les fèves du cacaoyer, un arbre des pays chauds.' },
      { e: '🍫', ask: 'Quel pays produit le plus de cacao au monde ?', answer: 'la Côte d’Ivoire', others: ['la France', 'le Canada'], says: 'Oui : la Côte d’Ivoire, en Afrique de l’Ouest, est le premier producteur de cacao.' },
      { ask: 'Qui produit le lait, les céréales et les fruits ?', answer: 'l’agriculteur', others: ['le banquier', 'le caissier'], says: 'Oui : l’agriculteur cultive les plantes et élève les animaux.' },
      { e: '🥛', ask: 'Où le lait est-il transformé en yaourts, en grande quantité ?', answer: 'dans une usine', others: ['dans un champ', 'dans une banque'], says: 'Oui : à l’usine, on transforme le lait en yaourts, en fromages ou en beurre.' },
      { ask: 'Dans quel ordre le yaourt arrive-t-il jusqu’à nous ?', answer: 'ferme, usine, magasin', others: ['magasin, ferme, usine', 'usine, magasin, ferme'], says: 'Oui : de la ferme à l’usine, puis au magasin : c’est une chaîne de production.' },
      { ask: 'Qu’est-ce qui relie chaque étape de la chaîne de production ?', answer: 'le transport', others: ['la publicité', 'la météo'], says: 'Oui : camions, trains et bateaux transportent les produits d’une étape à l’autre.' },
      { ask: 'Avec quelle plante fabrique-t-on surtout le sucre en France ?', answer: 'la betterave sucrière', others: ['la pomme de terre', 'le blé'], says: 'Oui : la France produit beaucoup de sucre de betterave.' },
      { e: '🍊', ask: 'Le jus d’orange est-il un produit agricole ou un produit transformé ?', answer: 'un produit transformé', others: ['un produit agricole', 'un produit de la mer'], says: 'Oui : on presse les oranges pour fabriquer le jus.' },
      { ask: 'Lequel de ces aliments vient de l’élevage ?', answer: 'les œufs', others: ['les pommes de terre', 'le riz'], says: 'Oui : les œufs viennent des poules élevées dans les fermes.' },
      { ask: 'Avec quoi fabrique-t-on les frites ?', answer: 'la pomme de terre', others: ['la carotte', 'la betterave'], says: 'Oui : les frites sont faites avec des pommes de terre.' },
      { ask: 'Qu’est-ce qu’un circuit court ?', answer: 'acheter presque directement au producteur', others: ['acheter un produit venu de très loin', 'acheter seulement au supermarché'], says: 'Oui : dans un circuit court, il y a au plus un intermédiaire entre le producteur et nous.' },
      { e: '🍎', ask: 'Pourquoi acheter des fruits de saison, produits près de chez soi ?', answer: 'ils voyagent moins', others: ['ils sont toujours plus gros', 'ils n’ont pas besoin d’eau'], says: 'Oui : moins de transport, c’est moins de pollution.' },
      { ask: 'Que fabrique-t-on avec la crème du lait ?', answer: 'le beurre', others: ['le pain', 'le chocolat noir'], says: 'Oui : en battant la crème, on obtient du beurre.' },
    ],
  },
  {
    nom: 'Se nourrir dans le monde',
    emoji: '🍽️',
    questions: [
      { e: '🌏', ask: 'Dans une grande partie de l’Asie, quel est l’aliment de base ?', answer: 'le riz', others: ['le manioc', 'le maïs'], says: 'Oui : en Asie, le riz est servi à presque tous les repas.' },
      { e: '🌍', ask: 'En Afrique centrale, quelle racine est un aliment de base ?', answer: 'le manioc', others: ['la betterave', 'le navet'], says: 'Oui : on cuit le manioc, ou on le transforme en farine.' },
      { ask: 'Au Mexique, quelle céréale est l’aliment de base ?', answer: 'le maïs', others: ['le riz', 'le blé'], says: 'Oui : au Mexique, on fait des galettes de maïs, les tortillas.' },
      { ask: 'En Europe et au Maghreb, quelle céréale sert à faire le pain et la semoule ?', answer: 'le blé', others: ['le riz', 'le manioc'], says: 'Oui : le blé sert à faire le pain, les pâtes et la semoule.' },
      { ask: 'Au Maghreb, quel plat prépare-t-on souvent avec de la semoule de blé ?', answer: 'le couscous', others: ['les sushis', 'les tortillas'], says: 'Oui : le couscous, fait de semoule de blé, est un plat du Maghreb.' },
      { e: '🌏', ask: 'Au Japon, quel aliment est servi à presque tous les repas ?', answer: 'le riz', others: ['le manioc', 'la semoule'], says: 'Oui : au Japon, le riz accompagne presque tous les repas.' },
      { ask: 'Combien de personnes souffrent de la faim dans le monde ?', answer: 'des centaines de millions', others: ['quelques centaines', 'personne'], says: 'Oui : des centaines de millions de personnes ne mangent pas à leur faim.' },
      { e: '🌍', ask: 'Sur quel continent la part de personnes qui ont faim est-elle la plus grande ?', answer: 'l’Afrique', others: ['l’Europe', 'l’Océanie'], says: 'Oui : en Afrique, environ une personne sur cinq souffre de la faim.' },
      { ask: 'Pourquoi des personnes ont-elles faim, alors que la Terre produit assez de nourriture ?', answer: 'à cause de la pauvreté et des guerres', others: ['parce qu’elles n’aiment pas manger', 'parce que la nourriture est interdite'], says: 'Oui : la nourriture est mal répartie, et les plus pauvres ne peuvent pas l’acheter.' },
      { e: '🚰', ask: 'Qu’est-ce que l’eau potable ?', answer: 'une eau qu’on peut boire sans danger', others: ['l’eau de mer', 'l’eau d’une flaque'], says: 'Oui : l’eau potable est propre : on peut la boire sans tomber malade.' },
      { e: '🚰', ask: 'Combien de personnes n’ont pas d’eau potable sûre chez elles ?', answer: 'plus de 2 milliards', others: ['environ mille', 'aucune'], says: 'Oui : plus de deux milliards de personnes n’ont pas d’eau potable sûre à la maison.' },
      { e: '💧', ask: 'Sans eau à la maison, qui va le plus souvent chercher l’eau ?', answer: 'les femmes et les filles', others: ['les hommes âgés', 'les touristes'], says: 'Oui : dans beaucoup de pays, ce sont surtout les femmes et les filles qui portent l’eau.' },
      { ask: 'Comment appelle-t-on un pays où beaucoup d’habitants manquent d’argent, d’eau et de soins ?', answer: 'un pays en développement', others: ['un pays riche', 'une seigneurie'], says: 'Oui : dans les pays en développement, beaucoup d’habitants vivent dans la pauvreté.' },
      { ask: 'Quel problème touche surtout les pays riches ?', answer: 'le gaspillage alimentaire', others: ['la famine', 'le manque d’eau potable'], says: 'Oui : dans les pays riches, on jette beaucoup de nourriture encore bonne.' },
      { ask: 'Qu’est-ce que le commerce équitable ?', answer: 'payer un prix juste aux producteurs', others: ['acheter le moins cher possible', 'vendre sans jamais payer'], says: 'Oui : le commerce équitable aide les producteurs des pays pauvres à vivre de leur travail.' },
    ],
  },
  {
    nom: 'Les régions du monde',
    emoji: '🗺️',
    questions: [
      { ask: 'Dans quelle région du monde se trouve le Maroc ?', answer: 'le Maghreb', others: ['l’Asie de l’Est', 'l’Amérique du Sud'], says: 'Oui : le Maroc, l’Algérie et la Tunisie forment le Maghreb.' },
      { ask: 'Dans quelle région du monde se trouve l’Algérie ?', answer: 'le Maghreb', others: ['l’Afrique subsaharienne', 'l’Asie du Sud-Est'], says: 'Oui : l’Algérie est au Maghreb, au nord de l’Afrique.' },
      { ask: 'Dans quelle région du monde se trouve le Sénégal ?', answer: 'l’Afrique subsaharienne', others: ['le Maghreb', 'l’Asie du Sud-Est'], says: 'Oui : le Sénégal est en Afrique, au sud du Sahara.' },
      { ask: 'Dans quelle région du monde se trouve la Côte d’Ivoire ?', answer: 'l’Afrique subsaharienne', others: ['le Maghreb', 'l’Amérique du Sud'], says: 'Oui : la Côte d’Ivoire est en Afrique de l’Ouest, au sud du Sahara.' },
      { ask: 'Dans quelle région du monde se trouve le Japon ?', answer: 'l’Asie de l’Est', others: ['l’Asie du Sud-Est', 'l’Océanie'], says: 'Oui : le Japon, la Chine et la Corée sont en Asie de l’Est.' },
      { ask: 'Dans quelle région du monde se trouve la Chine ?', answer: 'l’Asie de l’Est', others: ['l’Asie du Sud-Est', 'l’Europe'], says: 'Oui : la Chine est en Asie de l’Est.' },
      { ask: 'Dans quelle région du monde se trouve le Viêt Nam ?', answer: 'l’Asie du Sud-Est', others: ['l’Asie de l’Est', 'l’Amérique du Sud'], says: 'Oui : le Viêt Nam, la Thaïlande et l’Indonésie sont en Asie du Sud-Est.' },
      { ask: 'Dans quelle région du monde se trouve l’Indonésie ?', answer: 'l’Asie du Sud-Est', others: ['l’Asie de l’Est', 'l’Afrique subsaharienne'], says: 'Oui : l’Indonésie est un pays formé de milliers d’îles, en Asie du Sud-Est.' },
      { ask: 'Dans quelle région du monde se trouve le Brésil ?', answer: 'l’Amérique du Sud', others: ['l’Amérique du Nord', 'l’Afrique subsaharienne'], says: 'Oui : le Brésil est le plus grand pays d’Amérique du Sud.' },
      { ask: 'Dans quelle région du monde se trouve l’Argentine ?', answer: 'l’Amérique du Sud', others: ['l’Amérique du Nord', 'l’Europe'], says: 'Oui : l’Argentine est en Amérique du Sud.' },
      { ask: 'Dans quelle région du monde se trouve le Canada ?', answer: 'l’Amérique du Nord', others: ['l’Amérique du Sud', 'l’Europe'], says: 'Oui : le Canada et les États-Unis sont en Amérique du Nord.' },
      { ask: 'Dans quelle région du monde se trouvent les États-Unis ?', answer: 'l’Amérique du Nord', others: ['l’Amérique du Sud', 'l’Océanie'], says: 'Oui : les États-Unis sont en Amérique du Nord, entre le Canada et le Mexique.' },
      { ask: 'Dans quelle région du monde se trouve l’Australie ?', answer: 'l’Océanie', others: ['l’Asie du Sud-Est', 'l’Amérique du Sud'], says: 'Oui : l’Australie est le plus grand pays d’Océanie.' },
      { ask: 'Dans quelle région du monde se trouve la Nouvelle-Zélande ?', answer: 'l’Océanie', others: ['l’Asie de l’Est', 'l’Europe'], says: 'Oui : la Nouvelle-Zélande est en Océanie, dans l’océan Pacifique.' },
      { e: '🏜️', ask: 'Quel grand désert sépare le Maghreb de l’Afrique subsaharienne ?', answer: 'le Sahara', others: ['le désert de Gobi', 'le désert d’Atacama'], says: 'Oui : le Sahara est le plus grand désert chaud du monde.' },
      { e: '🌊', ask: 'Quel est le plus grand océan du monde ?', answer: 'l’océan Pacifique', others: ['l’océan Atlantique', 'l’océan Indien'], says: 'Oui : l’océan Pacifique est le plus grand et le plus profond des océans.' },
      { e: '🌊', ask: 'Quel océan sépare l’Europe de l’Amérique ?', answer: 'l’océan Atlantique', others: ['l’océan Pacifique', 'l’océan Indien'], says: 'Entre l’Europe et l’Amérique, il y a l’océan Atlantique.' },
      { e: '🌏', ask: 'Quel est le plus grand continent ?', answer: 'l’Asie', others: ['l’Afrique', 'l’Europe'], says: 'Oui : l’Asie est le plus grand continent, et le plus peuplé.' },
    ],
  },
  {
    nom: 'Se déplacer',
    emoji: '🧳',
    questions: [
      { e: '✈️', ask: 'Où prend-on l’avion ?', answer: 'à l’aéroport', others: ['à la gare', 'au port'], says: 'Oui : les avions décollent et atterrissent à l’aéroport.' },
      { e: '⚓', ask: 'Où les bateaux chargent-ils et déchargent-ils leurs marchandises ?', answer: 'au port', others: ['à la gare', 'à l’aéroport'], says: 'Oui : au port, des grues chargent et déchargent les conteneurs.' },
      { e: '🚄', ask: 'Où monte-t-on dans le train ?', answer: 'à la gare', others: ['au port', 'à l’aéroport'], says: 'Oui : on prend le train à la gare.' },
      { e: '🚲', ask: 'Où roulent les vélos, à l’écart des voitures ?', answer: 'sur une piste cyclable', others: ['sur une voie ferrée', 'sur une autoroute'], says: 'Oui : les pistes cyclables permettent de rouler à vélo en sécurité.' },
      { ask: 'Où attend-on le métro ?', answer: 'à la station', others: ['au port', 'à l’aéroport'], says: 'Oui : on attend le métro sur le quai de la station.' },
      { ask: 'Quel moyen de transport est le plus rapide pour traverser l’océan ?', answer: 'l’avion', others: ['le bateau', 'le vélo'], says: 'Oui : l’avion traverse l’océan Atlantique en quelques heures.' },
      { ask: 'Quel moyen de transport ne rejette aucune fumée ?', answer: 'le vélo', others: ['la voiture à essence', 'l’avion'], says: 'Oui : le vélo avance grâce à la force des jambes, sans polluer.' },
      { ask: 'Pour transporter beaucoup de marchandises très loin, à bas prix, que prend-on surtout ?', answer: 'le bateau', others: ['le vélo', 'la moto'], says: 'Oui : la plupart des marchandises du monde voyagent par bateau, dans des conteneurs.' },
      { ask: 'Avec quelle unité mesure-t-on la distance entre deux villes ?', answer: 'le kilomètre', others: ['le kilogramme', 'le litre'], says: 'Oui : on mesure la distance en kilomètres, ou en temps de trajet.' },
      { ask: 'À pied, quelle distance un adulte parcourt-il environ en une heure ?', answer: 'environ 5 kilomètres', others: ['environ 50 kilomètres', 'environ 500 kilomètres'], says: 'Oui : à pied, on parcourt environ cinq kilomètres en une heure.' },
      { ask: 'Quel transport en commun circule souvent sous terre, dans les grandes villes ?', answer: 'le métro', others: ['le tramway', 'le téléphérique'], says: 'Oui : le métro circule dans des tunnels, sous les rues.' },
      { ask: 'Quel transport en commun électrique roule sur des rails, dans les rues ?', answer: 'le tramway', others: ['le bus', 'le taxi'], says: 'Oui : le tramway roule sur des rails, au milieu de la ville.' },
      { e: '🚌', ask: 'Pourquoi prendre le bus plutôt que la voiture ?', answer: 'il pollue moins par voyageur', others: ['il va toujours plus vite', 'il ne s’arrête jamais'], says: 'Oui : un bus transporte beaucoup de personnes à la fois.' },
      { e: '🚗', ask: 'Comment appelle-t-on une grande route à plusieurs voies, sans croisement ?', answer: 'une autoroute', others: ['un chemin', 'une piste cyclable'], says: 'Oui : sur l’autoroute, les véhicules roulent vite et sans croisement.' },
      { ask: ['On dit qu’une ville est à deux heures de train.', 'Qu’exprime-t-on ainsi ?'], answer: 'une distance en temps', others: ['la vitesse du vent', 'la température'], says: 'Oui : on peut exprimer une distance en kilomètres ou en temps de trajet.' },
      { ask: 'Pour un même trajet, quel moyen de transport rejette le plus de gaz à effet de serre ?', answer: 'l’avion', others: ['le train', 'le vélo'], says: 'Oui : pour un même trajet, l’avion pollue beaucoup plus que le train.' },
      { e: '⚓', ask: 'Que prend-on pour traverser la mer avec sa voiture ?', answer: 'le ferry', others: ['le métro', 'le tramway'], says: 'Oui : le ferry transporte les voyageurs et leurs voitures, par exemple jusqu’en Corse.' },
    ],
  },
  {
    nom: 'Internet dans le monde',
    emoji: '💻',
    questions: [
      { ask: 'Entre les continents, par où passent presque toutes les données d’Internet ?', answer: 'par des câbles sous-marins', others: ['par des avions', 'par la poste'], says: 'Oui : des câbles posés au fond des océans relient les continents.' },
      { ask: 'Dans les câbles d’Internet, sous quelle forme voyagent les informations ?', answer: 'sous forme de lumière', others: ['sous forme d’eau', 'sous forme de gaz'], says: 'Oui : dans la fibre optique, les informations voyagent sous forme de lumière.' },
      { ask: 'Qu’est-ce qu’un centre de données ?', answer: 'un bâtiment rempli d’ordinateurs', others: ['un musée', 'une bibliothèque'], says: 'Oui : les centres de données stockent les sites, les vidéos et les messages.' },
      { e: '⚡', ask: 'Pourquoi les centres de données consomment-ils beaucoup d’électricité ?', answer: 'leurs ordinateurs tournent jour et nuit', others: ['ils éclairent les rues', 'ils font avancer les trains'], says: 'Oui : il faut faire tourner les ordinateurs et les refroidir, jour et nuit.' },
      { e: '🏔️', ask: 'Comment avoir Internet dans un endroit très isolé, loin de tout câble ?', answer: 'par satellite', others: ['par un tuyau d’eau', 'par une ligne de bus'], says: 'Oui : des satellites qui tournent autour de la Terre relaient les données.' },
      { e: '📱', ask: 'Comment appelle-t-on un endroit où Internet et le téléphone portable ne passent pas ?', answer: 'une zone blanche', others: ['une zone piétonne', 'une zone industrielle'], says: 'Oui : dans une zone blanche, le réseau ne passe pas, ou très mal.' },
      { e: '🌍', ask: 'Dans le monde, combien de personnes n’utilisent pas Internet ?', answer: 'plus de 2 milliards', others: ['environ mille', 'aucune'], says: 'Oui : plus de deux milliards de personnes n’utilisent pas Internet, surtout dans les pays pauvres.' },
      { e: '🌍', ask: 'Où l’accès à Internet est-il souvent le plus difficile ?', answer: 'dans les campagnes des pays pauvres', others: ['dans les grandes villes des pays riches', 'dans les écoles de Paris'], says: 'Oui : l’accès à Internet est très inégal selon les pays et les régions.' },
      { ask: 'Que faut-il toujours garder secret sur Internet ?', answer: 'son mot de passe', others: ['le titre de son livre préféré', 'la couleur du ciel'], says: 'Oui : on ne donne jamais son mot de passe, même à un ami.' },
      { ask: ['Un inconnu te demande ton adresse sur Internet.', 'Que fais-tu ?'], answer: 'Je ne réponds pas et j’en parle à un adulte.', others: ['Je lui donne mon adresse.', 'Je lui envoie une photo de ma maison.'], says: 'Oui : on ne donne jamais d’informations personnelles à un inconnu.' },
      { ask: ['Une information étonnante circule sur Internet.', 'Que faire avant de la partager ?'], answer: 'vérifier d’où elle vient', others: ['la partager tout de suite', 'l’envoyer à tous ses contacts'], says: 'Oui : on vérifie la source, et on compare avec d’autres sites sérieux.' },
      { e: '📱', ask: 'Qui peut voir une photo publiée sur Internet ?', answer: 'beaucoup de monde, même des inconnus', others: ['seulement moi', 'personne'], says: 'Oui : une photo publiée peut être copiée et partagée, et elle est difficile à effacer.' },
      { ask: 'Que consomme chaque vidéo regardée sur Internet ?', answer: 'de l’électricité', others: ['du papier', 'du sable'], says: 'Oui : les vidéos font travailler des ordinateurs et des réseaux qui consomment de l’électricité.' },
      { e: '🚀', ask: 'Autour de quoi tournent les satellites qui relaient Internet ?', answer: 'autour de la Terre', others: ['autour de la Lune', 'autour de Mars'], says: 'Oui : ces satellites tournent autour de la Terre.' },
      { ask: 'Comment appelle-t-on le grand réseau qui relie les ordinateurs du monde entier ?', answer: 'Internet', others: ['la télévision', 'la radio'], says: 'Oui : Internet relie des milliards d’appareils dans le monde.' },
    ],
  },
  {
    nom: 'Se déplacer en Europe',
    emoji: '🚄',
    questions: [
      { ask: 'Comment s’appelle le train à grande vitesse français ?', answer: 'le TGV', others: ['le TER', 'le RER'], says: 'Oui : le train à grande vitesse relie les grandes villes de France et d’Europe.' },
      { ask: 'En train à grande vitesse, combien de temps faut-il pour aller de Paris à Marseille ?', answer: 'environ 3 heures', others: ['environ 30 minutes', 'environ 12 heures'], says: 'Oui : le train à grande vitesse relie Paris à Marseille en environ trois heures.' },
      { e: '✈️', ask: 'Quel est le plus grand aéroport de France ?', answer: 'Paris-Charles-de-Gaulle', others: ['Nice-Côte d’Azur', 'Lyon-Saint-Exupéry'], says: 'Oui : l’aéroport Paris-Charles-de-Gaulle accueille des dizaines de millions de voyageurs par an.' },
      { ask: 'Quel tunnel relie la France et l’Angleterre ?', answer: 'le tunnel sous la Manche', others: ['le tunnel du Mont-Blanc', 'le tunnel du Fréjus'], says: 'Oui : le tunnel sous la Manche est ouvert depuis 1994.' },
      { e: '🗺️', ask: 'Quel train passe sous la Manche pour aller de Paris à Londres ?', answer: 'l’Eurostar', others: ['le métro', 'le tramway'], says: 'Oui : l’Eurostar relie Paris à Londres en un peu plus de deux heures.' },
      { e: '⚓', ask: 'Quel grand port français se trouve au bord de la mer Méditerranée ?', answer: 'Marseille', others: ['Le Havre', 'Brest'], says: 'Oui : Marseille est un très grand port, ouvert sur la Méditerranée.' },
      { e: '⚓', ask: 'Quel grand port français se trouve à l’embouchure de la Seine ?', answer: 'Le Havre', others: ['Marseille', 'Bordeaux'], says: 'Oui : Le Havre est le premier port de France pour les conteneurs.' },
      { e: '🛏️', ask: 'Comment appelle-t-on un train où l’on dort pendant le voyage ?', answer: 'un train de nuit', others: ['un train de marchandises', 'un tramway'], says: 'Oui : dans un train de nuit, on dort dans une couchette.' },
      { e: '🗺️', ask: 'Que permet l’espace Schengen ?', answer: 'circuler librement entre les pays membres', others: ['payer moins d’impôts', 'voter dans tous les pays'], says: 'Oui : dans l’espace Schengen, on peut en principe passer les frontières sans contrôle.' },
      { e: '🗺️', ask: 'Lequel de ces pays ne fait pas partie de l’espace Schengen ?', answer: 'le Royaume-Uni', others: ['l’Espagne', 'l’Allemagne'], says: 'Oui : le Royaume-Uni n’a jamais fait partie de l’espace Schengen.' },
      { e: '🗺️', ask: 'Lequel de ces pays a une frontière avec la France ?', answer: 'l’Espagne', others: ['le Portugal', 'l’Autriche'], says: 'Oui : la France et l’Espagne sont séparées par les Pyrénées.' },
      { e: '🏔️', ask: 'Quelles montagnes traverse-t-on pour aller de France en Italie ?', answer: 'les Alpes', others: ['les Pyrénées', 'les Vosges'], says: 'Oui : des routes et des tunnels traversent les Alpes pour relier la France et l’Italie.' },
      { e: '🚗', ask: 'Quelles routes rapides relient les grandes villes de France ?', answer: 'les autoroutes', others: ['les pistes cyclables', 'les chemins de randonnée'], says: 'Oui : les autoroutes forment un grand réseau qui relie les villes.' },
      { ask: 'Depuis Lille, vers quelles grandes villes partent les trains rapides ?', answer: 'Londres et Bruxelles', others: ['Madrid et Lisbonne', 'Rome et Athènes'], says: 'Oui : Lille est un carrefour ferroviaire entre Paris, Londres et Bruxelles.' },
      { ask: 'Pour voyager en Europe en polluant le moins, quel transport choisir ?', answer: 'le train', others: ['l’avion', 'seul en voiture'], says: 'Oui : le train pollue beaucoup moins que l’avion ou la voiture.' },
    ],
  },
  {
    nom: 'Mieux habiter',
    emoji: '🏡',
    questions: [
      { e: '🌻', ask: 'Qu’est-ce qu’un jardin partagé ?', answer: 'un jardin cultivé par des voisins, ensemble', others: ['un jardin interdit au public', 'un parking pour les vélos'], says: 'Oui : dans un jardin partagé, les voisins cultivent ensemble fleurs et légumes.' },
      { ask: 'Pourquoi installe-t-on des plantes sur certains toits ?', answer: 'pour rafraîchir et isoler le bâtiment', others: ['pour cacher les cheminées', 'pour nourrir les vaches'], says: 'Oui : un toit végétalisé garde la fraîcheur, retient l’eau de pluie et accueille les insectes.' },
      { e: '🌳', ask: 'Qu’est-ce qu’un écoquartier ?', answer: 'un quartier pensé pour respecter l’environnement', others: ['un quartier sans habitants', 'un quartier réservé aux voitures'], says: 'Oui : un écoquartier économise l’énergie et l’eau, et laisse de la place à la nature.' },
      { e: '🌳', ask: 'Pourquoi plante-t-on des arbres en ville ?', answer: 'pour rafraîchir l’air en été', others: ['pour faire plus de bruit', 'pour réchauffer les rues'], says: 'Oui : les arbres font de l’ombre et rafraîchissent la ville quand il fait chaud.' },
      { ask: 'Quand il fait très chaud, où fait-il le plus frais en ville ?', answer: 'dans un parc avec des arbres', others: ['sur un parking goudronné', 'sur une place sans arbres'], says: 'Oui : le goudron garde la chaleur, alors que les arbres et l’herbe rafraîchissent l’air.' },
      { e: '💧', ask: 'Quel geste économise l’eau à la maison ?', answer: 'prendre une douche courte', others: ['laisser couler le robinet', 'prendre un bain chaque jour'], says: 'Oui : une douche courte utilise beaucoup moins d’eau qu’un bain.' },
      { ask: 'Quel geste économise l’énergie à la maison ?', answer: 'éteindre les lumières inutiles', others: ['laisser la télévision en veille', 'chauffer avec la fenêtre ouverte'], says: 'Oui : on éteint la lumière en quittant une pièce.' },
      { ask: 'Pourquoi isoler les murs et le toit d’une maison ?', answer: 'pour garder la chaleur en hiver', others: ['pour faire entrer le froid', 'pour attirer les insectes'], says: 'Oui : une maison bien isolée a besoin de moins de chauffage.' },
      { ask: 'Que récupère-t-on avec une cuve branchée sur la gouttière ?', answer: 'l’eau de pluie', others: ['l’eau de mer', 'le gaz'], says: 'Oui : l’eau de pluie sert à arroser le jardin ou à nettoyer.' },
      { e: '☀️', ask: 'Que produisent les panneaux photovoltaïques posés sur un toit ?', answer: 'de l’électricité', others: ['de l’essence', 'du charbon'], says: 'Oui : ces panneaux transforment la lumière du soleil en électricité.' },
      { ask: 'Dans un écoquartier, comment se déplace-t-on surtout ?', answer: 'à pied, à vélo ou en bus', others: ['seulement en voiture', 'en hélicoptère'], says: 'Oui : on y circule surtout à pied, à vélo et en transports en commun.' },
      { e: '🌳', ask: 'À quoi sert un parc en ville ?', answer: 'à se détendre, près de la nature', others: ['à garer les camions', 'à stocker les déchets'], says: 'Oui : les parcs offrent de la nature et de la fraîcheur aux habitants.' },
      { ask: 'Quel est l’avantage d’habiter près de son école ?', answer: 'on peut y aller à pied ou à vélo', others: ['on prend plus souvent l’avion', 'on utilise plus d’essence'], says: 'Oui : les trajets courts se font à pied ou à vélo, sans polluer.' },
      { e: '🐝', ask: 'Que peut-on installer dans un jardin pour aider les insectes ?', answer: 'un hôtel à insectes', others: ['un parking', 'un grand projecteur'], says: 'Oui : un hôtel à insectes abrite les abeilles sauvages et les coccinelles.' },
      { e: '💡', ask: 'Quelle ampoule consomme le moins d’électricité ?', answer: 'une ampoule à LED', others: ['une ampoule à incandescence', 'une lampe halogène'], says: 'Oui : ces ampoules consomment beaucoup moins que les anciennes.' },
    ],
  },
  {
    nom: 'Recycler et consommer',
    emoji: '♻️',
    questions: [
      { e: '🍾', ask: 'Où dépose-t-on une bouteille en verre vide ?', answer: 'dans le conteneur à verre', others: ['dans le compost', 'dans les ordures ménagères'], says: 'Oui : le verre se recycle sans fin pour faire de nouvelles bouteilles.' },
      { e: '🥕', ask: 'Où mettre les épluchures de légumes ?', answer: 'dans le compost', others: ['dans le conteneur à verre', 'dans le bac des emballages'], says: 'Oui : au compost, les épluchures deviennent un engrais naturel.' },
      { e: '📰', ask: 'Que devient le papier recyclé ?', answer: 'du papier ou du carton neuf', others: ['du verre', 'du métal'], says: 'Oui : à l’usine, les vieux papiers deviennent du papier ou du carton.' },
      { ask: 'Où apporte-t-on un vieux matelas ou des pots de peinture ?', answer: 'à la déchetterie', others: ['dans le bac de tri', 'dans le compost'], says: 'Oui : la déchetterie accepte les objets encombrants et les produits dangereux.' },
      { e: '🧴', ask: 'Que peut-on fabriquer avec des bouteilles en plastique recyclées ?', answer: 'des pulls en laine polaire', others: ['des bouteilles en verre', 'du papier'], says: 'Oui : le plastique recyclé peut devenir du tissu polaire ou de nouvelles bouteilles.' },
      { ask: 'Quel geste réduit le plus les déchets ?', answer: 'éviter les emballages inutiles', others: ['jeter plus souvent', 'acheter des produits suremballés'], says: 'Oui : le meilleur déchet est celui qu’on ne produit pas.' },
      { ask: 'Quel sac peut servir de très nombreuses fois ?', answer: 'un sac en tissu', others: ['un sac plastique jetable', 'un sachet de bonbons'], says: 'Oui : un sac en tissu remplace beaucoup de sacs jetables.' },
      { ask: 'Que veut dire « recycler » ?', answer: 'transformer un déchet en nouvelle matière', others: ['jeter un déchet dans la nature', 'brûler tous les déchets'], says: 'Oui : recycler, c’est utiliser la matière d’un déchet pour fabriquer un nouvel objet.' },
      { e: '🔋', ask: 'Où rapporte-t-on les piles usagées ?', answer: 'dans une borne, au magasin', others: ['dans le compost', 'dans le conteneur à verre'], says: 'Oui : les piles contiennent des produits dangereux ; on les rapporte au magasin.' },
      { e: '🍽️', ask: 'Qu’est-ce que le gaspillage alimentaire ?', answer: 'jeter de la nourriture encore bonne', others: ['manger ses légumes', 'cuisiner les restes'], says: 'Oui : on se sert juste ce qu’il faut, et on cuisine les restes.' },
      { ask: 'Que faire d’un jouet cassé qui peut encore servir ?', answer: 'le réparer', others: ['le jeter dans la nature', 'le brûler'], says: 'Oui : réparer un objet, c’est éviter un déchet.' },
      { ask: 'Où mettre une boîte de conserve vide ?', answer: 'dans le bac des emballages', others: ['dans le compost', 'dans le conteneur à verre'], says: 'Oui : le métal des boîtes de conserve se recycle très bien.' },
      { ask: 'Où va un pot de yaourt vide en plastique ?', answer: 'dans le bac des emballages', others: ['dans le compost', 'dans le conteneur à verre'], says: 'Oui : depuis 2023, tous les emballages vont dans le bac de tri.' },
      { e: '🪱', ask: 'Qu’est-ce que le compost ?', answer: 'un engrais fait de déchets naturels', others: ['un plastique recyclé', 'un produit pour laver'], says: 'Oui : les vers et les petites bêtes transforment les restes en terreau.' },
      { e: '👕', ask: 'Que faire de vêtements trop petits, mais en bon état ?', answer: 'les donner', others: ['les brûler', 'les jeter dans la rivière'], says: 'Oui : on peut les donner, les échanger ou les déposer dans une borne textile.' },
      { ask: 'Lequel de ces déchets ne va pas au compost ?', answer: 'une canette en métal', others: ['une peau de banane', 'du marc de café'], says: 'Oui : la canette va dans le bac des emballages, pour être recyclée.' },
      { ask: 'Pourquoi trie-t-on ses déchets ?', answer: 'pour qu’ils soient recyclés', others: ['pour remplir les poubelles plus vite', 'pour faire rouler les camions'], says: 'Oui : bien trier permet de recycler la matière et de moins polluer.' },
    ],
  },
  {
    nom: 'Les paysages de France',
    emoji: '🏞️',
    questions: [
      { ask: 'Quel est le plus long fleuve de France ?', answer: 'la Loire', others: ['la Seine', 'la Garonne'], says: 'Oui : la Loire mesure plus de mille kilomètres.' },
      { ask: 'Quel fleuve traverse Paris ?', answer: 'la Seine', others: ['la Loire', 'le Rhône'], says: 'Oui : la Seine traverse Paris, puis se jette dans la Manche.' },
      { ask: 'Quel fleuve traverse Lyon et se jette dans la mer Méditerranée ?', answer: 'le Rhône', others: ['la Seine', 'la Loire'], says: 'Oui : le Rhône prend sa source en Suisse et se jette dans la Méditerranée.' },
      { ask: 'Quel fleuve traverse Toulouse et Bordeaux ?', answer: 'la Garonne', others: ['la Loire', 'la Seine'], says: 'Oui : la Garonne descend des Pyrénées jusqu’à l’océan Atlantique.' },
      { ask: 'Quel fleuve marque une partie de la frontière entre la France et l’Allemagne ?', answer: 'le Rhin', others: ['la Seine', 'la Garonne'], says: 'Oui : le Rhin sépare l’Alsace de l’Allemagne.' },
      { e: '🏔️', ask: 'Quel est le plus haut sommet de France ?', answer: 'le mont Blanc', others: ['le puy de Dôme', 'le pic du Midi'], says: 'Oui : le mont Blanc, dans les Alpes, est le plus haut sommet de France.' },
      { e: '🏔️', ask: 'Dans quel massif se trouve le mont Blanc ?', answer: 'les Alpes', others: ['les Pyrénées', 'les Vosges'], says: 'Oui : les Alpes sont les plus hautes montagnes de France.' },
      { e: '⛰️', ask: 'Quelles montagnes séparent la France de l’Espagne ?', answer: 'les Pyrénées', others: ['les Alpes', 'le Jura'], says: 'Oui : les Pyrénées forment la frontière entre la France et l’Espagne.' },
      { e: '🌋', ask: 'Quel massif, au centre de la France, compte d’anciens volcans ?', answer: 'le Massif central', others: ['le Jura', 'les Vosges'], says: 'Oui : en Auvergne, la chaîne des Puys compte des dizaines de volcans endormis.' },
      { e: '⛰️', ask: 'Quel massif borde la frontière avec la Suisse, au nord des Alpes ?', answer: 'le Jura', others: ['le Massif central', 'les Pyrénées'], says: 'Oui : le Jura est un massif de moyenne montagne, à la frontière suisse.' },
      { e: '⛰️', ask: 'Quel massif se trouve dans l’est de la France, près de l’Alsace ?', answer: 'les Vosges', others: ['les Pyrénées', 'le Massif central'], says: 'Oui : les Vosges sont de vieilles montagnes aux sommets arrondis.' },
      { e: '🌊', ask: 'Quelle mer sépare la France de l’Angleterre ?', answer: 'la Manche', others: ['la mer Méditerranée', 'la mer Noire'], says: 'Oui : la Manche sépare la France de l’Angleterre.' },
      { e: '🌊', ask: 'Quel océan borde l’ouest de la France ?', answer: 'l’océan Atlantique', others: ['l’océan Pacifique', 'l’océan Indien'], says: 'Oui : l’océan Atlantique borde la côte ouest de la France.' },
      { e: '🌊', ask: 'Quelle mer borde le sud de la France ?', answer: 'la mer Méditerranée', others: ['la Manche', 'la mer du Nord'], says: 'Oui : la mer Méditerranée borde le sud de la France et la Corse.' },
      { e: '🏖️', ask: 'Quelle grande île française se trouve en mer Méditerranée ?', answer: 'la Corse', others: ['la Martinique', 'La Réunion'], says: 'Oui : la Corse est une île montagneuse de la Méditerranée.' },
      { e: '🌴', ask: 'Dans quel océan se trouve l’île de La Réunion ?', answer: 'l’océan Indien', others: ['l’océan Atlantique', 'l’océan Pacifique'], says: 'Oui : La Réunion est une île volcanique de l’océan Indien.' },
      { e: '🌴', ask: 'Sur quel continent se trouve la Guyane ?', answer: 'l’Amérique du Sud', others: ['l’Afrique', 'l’Asie'], says: 'Oui : la Guyane est en Amérique du Sud, couverte en grande partie par la forêt amazonienne.' },
      { e: '🌴', ask: 'Où se trouvent la Guadeloupe et la Martinique ?', answer: 'aux Antilles', others: ['dans l’océan Indien', 'en Méditerranée'], says: 'Oui : la Guadeloupe et la Martinique sont des îles des Antilles, en Amérique.' },
      { e: '🌴', ask: 'Dans quel océan se trouve Mayotte ?', answer: 'l’océan Indien', others: ['l’océan Atlantique', 'l’océan Arctique'], says: 'Oui : Mayotte est une île de l’océan Indien, entre l’Afrique et Madagascar.' },
      { e: '🌴', ask: 'Combien y a-t-il de départements et régions d’outre-mer ?', answer: '5', others: ['2', '13'], says: 'Oui : la Guadeloupe, la Martinique, la Guyane, La Réunion et Mayotte.' },
    ],
  },
  {
    nom: 'Villes et pays d’Europe',
    emoji: '🏙️',
    questions: [
      { ask: 'Après Paris, quelle est la plus grande ville de France ?', answer: 'Marseille', others: ['Lille', 'Bordeaux'], says: 'Oui : Marseille est la deuxième ville de France.' },
      { ask: 'Quelle grande ville se trouve au confluent du Rhône et de la Saône ?', answer: 'Lyon', others: ['Toulouse', 'Nantes'], says: 'Oui : à Lyon, la Saône se jette dans le Rhône.' },
      { ask: 'Quelle grande ville est surnommée la Ville rose ?', answer: 'Toulouse', others: ['Lyon', 'Lille'], says: 'Oui : Toulouse doit son surnom à la couleur de ses briques.' },
      { ask: 'Quelle grande ville se trouve en Alsace, au bord du Rhin ?', answer: 'Strasbourg', others: ['Marseille', 'Bordeaux'], says: 'Oui : Strasbourg accueille aussi le Parlement européen.' },
      { ask: 'Quelle est la capitale de l’Allemagne ?', answer: 'Berlin', others: ['Munich', 'Vienne'], says: 'Oui : Berlin est la capitale de l’Allemagne.' },
      { ask: 'Quelle est la capitale de l’Espagne ?', answer: 'Madrid', others: ['Barcelone', 'Lisbonne'], says: 'Oui : Madrid est la capitale de l’Espagne.' },
      { ask: 'Quelle est la capitale de l’Italie ?', answer: 'Rome', others: ['Milan', 'Athènes'], says: 'Oui : Rome est la capitale de l’Italie.' },
      { ask: 'Quelle est la capitale de la Belgique ?', answer: 'Bruxelles', others: ['Anvers', 'Amsterdam'], says: 'Oui : Bruxelles est la capitale de la Belgique.' },
      { ask: 'Quelle est la capitale du Portugal ?', answer: 'Lisbonne', others: ['Porto', 'Madrid'], says: 'Oui : Lisbonne est la capitale du Portugal.' },
      { ask: 'Quelle est la capitale du Royaume-Uni ?', answer: 'Londres', others: ['Dublin', 'Manchester'], says: 'Oui : Londres est la capitale du Royaume-Uni.' },
      { ask: 'Quelle est la capitale de la Suisse ?', answer: 'Berne', others: ['Genève', 'Zurich'], says: 'Oui : la capitale de la Suisse est Berne.' },
      { ask: 'Quelle est la capitale de la Grèce ?', answer: 'Athènes', others: ['Rome', 'Sofia'], says: 'Oui : Athènes est la capitale de la Grèce.' },
      { ask: 'Quelle est la capitale de la Pologne ?', answer: 'Varsovie', others: ['Prague', 'Cracovie'], says: 'Oui : Varsovie est la capitale de la Pologne.' },
      { ask: 'Quelle est la capitale de l’Autriche ?', answer: 'Vienne', others: ['Berlin', 'Budapest'], says: 'Oui : Vienne est la capitale de l’Autriche.' },
      { e: '🗺️', ask: 'Lequel de ces pays est un voisin de la France ?', answer: 'l’Italie', others: ['la Grèce', 'la Pologne'], says: 'Oui : l’Italie a une frontière avec la France, dans les Alpes.' },
      { e: '🗺️', ask: 'Lequel de ces pays a une frontière avec la France ?', answer: 'la Belgique', others: ['le Danemark', 'l’Autriche'], says: 'Oui : la Belgique est au nord de la France.' },
      { e: '🗺️', ask: 'Quel petit pays voisin de la France a une capitale qui porte le même nom que lui ?', answer: 'le Luxembourg', others: ['la Belgique', 'la Suisse'], says: 'Oui : la capitale du Luxembourg s’appelle Luxembourg.' },
      { e: '🗺️', ask: 'Combien de régions compte la France métropolitaine ?', answer: '13', others: ['5', '101'], says: 'Oui : la France métropolitaine compte 13 régions, et il y en a 5 en outre-mer.' },
      { e: '🗺️', ask: 'Dans quelle région se trouve Marseille ?', answer: 'Provence-Alpes-Côte d’Azur', others: ['Bretagne', 'Grand Est'], says: 'Oui : Marseille est la capitale de la région Provence-Alpes-Côte d’Azur.' },
      { e: '🗺️', ask: 'Quelle ville est la capitale de la région Bretagne ?', answer: 'Rennes', others: ['Brest', 'Lille'], says: 'Oui : Rennes est la capitale de la Bretagne.' },
    ],
  },
];

export const geographie = {
  id: 'geographie',
  domain: 'monde',
  section: 'Histoire et géographie',
  title: 'La géographie',
  icon: '🗺️',
  skill: 'Se nourrir, se déplacer et communiquer dans le monde ; mieux habiter, recycler ; les paysages, les villes et les pays de France et d’Europe',
  levels: GEOGRAPHIE.map((n) => n.nom),
  generate(level, rng) {
    return jouer('geographie', GEOGRAPHIE, level, rng);
  },
};

// ================================================================= Vivre en République (EMC)

const REPUBLIQUE = [
  {
    nom: 'Le civisme',
    emoji: '🤝',
    questions: [
      { ask: 'Qu’est-ce que le civisme ?', answer: 'agir pour le bien de tous', others: ['faire seulement ce qui me plaît', 'ne jamais parler aux autres'], says: 'Oui : le civisme, c’est respecter les autres, les règles et ce qui appartient à tous.' },
      { ask: 'Lequel de ces gestes est une incivilité ?', answer: 'jeter un papier par terre', others: ['tenir la porte à quelqu’un', 'dire merci au chauffeur du bus'], says: 'Oui : jeter ses déchets par terre est une incivilité qui gêne tout le monde.' },
      { ask: 'Lequel de ces gestes est un geste civique ?', answer: 'laisser sa place à une personne âgée', others: ['abîmer un mur de l’école', 'crier dans la bibliothèque'], says: 'Oui : laisser sa place, c’est penser aux autres.' },
      { e: '🏫', ask: 'Pourquoi faut-il prendre soin du matériel de l’école ?', answer: 'il sert à tous les élèves', others: ['il n’appartient à personne', 'on peut le jeter sans problème'], says: 'Oui : d’autres élèves s’en serviront après toi.' },
      { e: '🏫', ask: 'Pourquoi respecte-t-on les règles de la classe ?', answer: 'pour bien vivre et travailler ensemble', others: ['pour être puni', 'pour faire plaisir à un seul élève'], says: 'Oui : les règles permettent à chacun d’apprendre dans le calme.' },
      { e: '📱', ask: 'Qu’est-ce que la sobriété numérique ?', answer: 'utiliser les écrans sans excès', others: ['regarder des vidéos toute la journée', 'changer de téléphone chaque année'], says: 'Oui : utiliser moins et mieux les écrans économise l’énergie et protège la santé.' },
      { e: '📱', ask: 'Quel geste est sobre en numérique ?', answer: 'éteindre les écrans inutiles', others: ['laisser une vidéo tourner sans la regarder', 'garder la télévision allumée la nuit'], says: 'Oui : un écran éteint ne consomme plus d’énergie.' },
      { e: '🚌', ask: 'Dans le bus, quel comportement gêne les autres ?', answer: 'écouter de la musique très fort', others: ['parler doucement', 's’asseoir calmement'], says: 'Oui : dans les lieux publics, on pense au calme des autres.' },
      { ask: 'Pourquoi ne faut-il pas abîmer un banc public ?', answer: 'il appartient à tous', others: ['il ne coûte rien', 'personne ne s’en sert'], says: 'Oui : les biens publics sont payés par tous, avec les impôts.' },
      { e: '🌳', ask: 'En forêt, quel geste respecte la nature ?', answer: 'rapporter ses déchets', others: ['faire un feu n’importe où', 'cueillir toutes les fleurs'], says: 'Oui : on laisse la forêt aussi propre qu’on l’a trouvée.' },
      { ask: ['Une personne en fauteuil roulant veut passer.', 'Que fais-tu ?'], answer: 'je lui laisse le passage', others: ['je reste au milieu', 'je fais semblant de ne pas la voir'], says: 'Oui : laisser passer, c’est un geste de politesse et de respect.' },
      { e: '🍽️', ask: 'Pourquoi fait-on la queue à la cantine ?', answer: 'chacun son tour, c’est juste', others: ['les plus grands passent devant', 'le plus rapide gagne'], says: 'Oui : attendre son tour, c’est respecter les autres.' },
      { e: '♻️', ask: 'Pourquoi le tri des déchets est-il un geste civique ?', answer: 'il protège l’environnement de tous', others: ['il fait plus de déchets', 'il salit la ville'], says: 'Oui : trier, c’est agir pour la planète que nous partageons.' },
      { e: '🏫', ask: 'Comment appelle-t-on un tag sur un mur de l’école ?', answer: 'une dégradation', others: ['une décoration autorisée', 'un cadeau pour tous'], says: 'Oui : abîmer un bâtiment public est interdit, et le réparer coûte cher à tous.' },
      { ask: ['Quelqu’un tombe devant toi dans la rue.', 'Que fais-tu ?'], answer: 'je l’aide ou je préviens un adulte', others: ['je passe mon chemin', 'je me moque'], says: 'Oui : porter secours à une personne en danger est un devoir.' },
    ],
  },
  {
    nom: 'Alerter et se protéger',
    emoji: '📞',
    questions: [
      { e: '🚒', ask: 'Quel numéro appelle-t-on pour joindre les pompiers ?', answer: '18', others: ['15', '17'], says: 'Oui : le 18, ce sont les pompiers.' },
      { e: '🚑', ask: 'Quel numéro appelle-t-on pour joindre le SAMU ?', answer: '15', others: ['17', '18'], says: 'Oui : le 15, c’est le SAMU, pour les urgences médicales.' },
      { e: '🚓', ask: 'Quel numéro appelle-t-on pour joindre la police ou la gendarmerie ?', answer: '17', others: ['15', '18'], says: 'Oui : le 17, c’est la police ou la gendarmerie.' },
      { ask: 'Quel numéro d’urgence fonctionne dans tous les pays de l’Union européenne ?', answer: '112', others: ['15', '17'], says: 'Oui : le 112 est le numéro d’urgence européen.' },
      { ask: ['Une personne sourde a besoin des secours.', 'Quel numéro d’urgence peut-elle joindre par écrit ?'], answer: '114', others: ['17', '18'], says: 'Oui : le 114 reçoit les appels d’urgence des personnes sourdes ou malentendantes.' },
      { ask: 'Quel numéro appeler si un enfant est maltraité ou en danger dans sa famille ?', answer: '119', others: ['3018', '18'], says: 'Oui : le 119, Allô enfance en danger, est gratuit et répond jour et nuit.' },
      { e: '📱', ask: 'Quel numéro appeler si l’on est harcelé sur Internet ou sur les réseaux sociaux ?', answer: '3018', others: ['18', '15'], says: 'Oui : le 3018 aide gratuitement les jeunes victimes de harcèlement en ligne.' },
      { ask: 'Quand on appelle les secours, que faut-il absolument leur dire ?', answer: 'où l’on est et ce qui se passe', others: ['la météo de demain', 'sa couleur préférée'], says: 'Oui : on dit où l’on est et ce qui s’est passé, puis on répond aux questions.' },
      { ask: 'Pendant un appel aux secours, qui raccroche en premier ?', answer: 'la personne des secours', others: ['moi, dès que j’ai dit bonjour', 'moi, si j’ai peur'], says: 'Oui : on ne raccroche jamais le premier ; on attend que les secours le disent.' },
      { ask: 'Après un accident, que faut-il faire avant d’alerter les secours ?', answer: 'se mettre en sécurité', others: ['prendre une photo', 'partir sans rien dire'], says: 'Oui : on se protège d’abord, puis on alerte les secours.' },
      { ask: 'Pourquoi ne faut-il jamais appeler les secours pour rire ?', answer: 'on bloque la ligne pour une vraie urgence', others: ['ça ne dérange personne', 'c’est un jeu autorisé'], says: 'Oui : un faux appel peut empêcher de sauver quelqu’un, et il est puni par la loi.' },
      { e: '🏫', ask: ['L’alarme incendie sonne à l’école.', 'Que fais-tu ?'], answer: 'je sors dans le calme avec ma classe', others: ['je retourne chercher mon cartable', 'je me cache sous ma table'], says: 'Oui : on sort sans courir et on rejoint le point de rassemblement.' },
      { e: '🔥', ask: ['Le feu prend dans une poêle, à la cuisine.', 'Que fais-tu d’abord ?'], answer: 'je m’éloigne et je préviens un adulte', others: ['je jette de l’eau sur la poêle', 'je reste à côté pour regarder'], says: 'Oui : on ne jette jamais d’eau sur de l’huile en feu ; on s’éloigne et on alerte.' },
      { ask: 'Comment s’appelle aussi le 119 ?', answer: 'Allô enfance en danger', others: ['Allô météo', 'Allô cantine'], says: 'Oui : au 119, des adultes écoutent les enfants qui ont besoin d’aide.' },
      { ask: 'Faut-il payer pour appeler le 119 ou le 3018 ?', answer: 'non, ils sont gratuits', others: ['oui, c’est très cher', 'oui, seulement le soir'], says: 'C’est ça : ces numéros sont gratuits.' },
    ],
  },
  {
    nom: 'La démocratie',
    emoji: '🇫🇷',
    questions: [
      { ask: 'Que veut dire le mot « démocratie » ?', answer: 'le pouvoir du peuple', others: ['le pouvoir d’un roi', 'le pouvoir des plus riches'], says: 'Oui : en grec ancien, démocratie veut dire le pouvoir du peuple.' },
      { ask: 'En France, comment le peuple exerce-t-il son pouvoir ?', answer: 'en votant', others: ['en obéissant à un roi', 'en jouant à pile ou face'], says: 'Oui : les citoyens votent pour choisir leurs représentants, ou lors d’un référendum.' },
      { ask: 'Que veut dire « suffrage universel » ?', answer: 'tous les citoyens peuvent voter', others: ['seuls les riches votent', 'seuls les hommes votent'], says: 'Oui : au suffrage universel, tous les citoyens majeurs peuvent voter.' },
      { ask: 'Comment le président de la République est-il élu ?', answer: 'au suffrage universel direct', others: ['par le roi', 'par tirage au sort'], says: 'Oui : depuis 1965, ce sont les citoyens qui élisent directement le président.' },
      { ask: 'Pour combien de temps le président de la République est-il élu ?', answer: '5 ans', others: ['7 ans', '2 ans'], says: 'Oui : depuis 2002, le président est élu pour cinq ans.' },
      { ask: 'Pour combien de temps le conseil municipal est-il élu ?', answer: '6 ans', others: ['1 an', '20 ans'], says: 'Oui : les élections municipales ont lieu tous les six ans.' },
      { e: '🏫', ask: 'Quel est le rôle des délégués de classe ?', answer: 'représenter les élèves de la classe', others: ['punir les autres élèves', 'faire les devoirs des autres'], says: 'Oui : les délégués portent la parole de leurs camarades.' },
      { e: '🏫', ask: 'Comment choisit-on les délégués de classe ?', answer: 'par une élection', others: ['par la force', 'par l’âge'], says: 'Oui : les élèves votent, à bulletin secret, pour élire leurs délégués.' },
      { ask: 'Pourquoi le vote est-il secret ?', answer: 'pour voter librement, sans pression', others: ['pour cacher les résultats', 'pour aller plus vite'], says: 'Oui : dans l’isoloir, chacun choisit librement, sans que personne ne le voie.' },
      { ask: 'Comment s’appelle la cabine où l’on vote en secret ?', answer: 'l’isoloir', others: ['l’urne', 'la mairie'], says: 'Oui : on passe dans l’isoloir, puis on dépose son bulletin dans l’urne.' },
      { ask: 'Dans quoi dépose-t-on son bulletin de vote ?', answer: 'dans l’urne', others: ['dans l’isoloir', 'dans une boîte aux lettres'], says: 'Oui : l’urne est transparente, pour que chacun voie qu’elle est vide au départ.' },
      { ask: 'D’après l’article 3 de la Déclaration de 1789, à qui appartient la souveraineté ?', answer: 'à la nation', others: ['au roi', 'à l’Église'], says: 'Oui : le pouvoir vient de la nation, c’est-à-dire de l’ensemble des citoyens.' },
      { ask: 'D’après l’article 6 de la Déclaration de 1789, comment est la loi ?', answer: 'la même pour tous', others: ['différente pour les nobles', 'décidée par le roi seul'], says: 'Oui : la loi exprime la volonté générale, et elle est la même pour tous.' },
      { ask: 'D’après l’article 16 de la Déclaration de 1789, que faut-il séparer ?', answer: 'les pouvoirs', others: ['les familles', 'les régions'], says: 'Oui : faire les lois, les appliquer et juger : ces trois pouvoirs doivent être séparés.' },
      { ask: 'Qui vote les lois en France ?', answer: 'le Parlement', others: ['le président seul', 'les juges'], says: 'Oui : le Parlement, formé de l’Assemblée nationale et du Sénat, vote les lois.' },
      { e: '🏫', ask: 'À quoi sert un conseil d’élèves ?', answer: 'débattre et proposer des idées', others: ['punir les enseignants', 'choisir les dates des vacances'], says: 'Oui : au conseil d’élèves, on discute des règles et des projets de l’école.' },
    ],
  },
  {
    nom: 'L’égalité et le respect',
    emoji: '⚖️',
    questions: [
      { ask: 'Que veut dire « égaux en droits » ?', answer: 'tout le monde a les mêmes droits', others: ['tout le monde est pareil', 'les plus forts ont plus de droits'], says: 'Oui : nous sommes tous différents, mais nous avons les mêmes droits.' },
      { ask: 'Qu’est-ce qu’une discrimination ?', answer: 'traiter quelqu’un plus mal à cause de ce qu’il est', others: ['aider quelqu’un qui en a besoin', 'partager son goûter'], says: 'Oui : rejeter quelqu’un pour son origine, son sexe ou un handicap est interdit par la loi.' },
      { ask: ['Un club refuse un enfant parce qu’il est en fauteuil roulant.', 'Comment appelle-t-on cela ?'], answer: 'une discrimination', others: ['une règle normale', 'une politesse'], says: 'Oui : refuser quelqu’un à cause de son handicap est une discrimination.' },
      { ask: 'Les filles et les garçons peuvent-ils faire les mêmes métiers ?', answer: 'oui, tous les métiers', others: ['non, jamais', 'seulement quelques métiers'], says: 'Oui : filles et garçons ont les mêmes droits et peuvent choisir tous les métiers.' },
      { ask: 'Qu’est-ce que la tolérance ?', answer: 'accepter les différences des autres', others: ['se moquer des autres', 'imposer ses idées'], says: 'Oui : être tolérant, c’est respecter ceux qui pensent ou vivent autrement.' },
      { ask: ['Un élève est moqué et bousculé chaque jour par un groupe.', 'Comment appelle-t-on cela ?'], answer: 'du harcèlement', others: ['un jeu', 'une petite dispute'], says: 'Oui : quand les moqueries ou les violences se répètent, c’est du harcèlement.' },
      { ask: ['Tu es victime de harcèlement, ou tu en es témoin.', 'Que fais-tu ?'], answer: 'j’en parle à un adulte', others: ['je garde le secret', 'je me venge'], says: 'Oui : en parler à un adulte de confiance, c’est le premier pas pour que ça s’arrête.' },
      { e: '📱', ask: 'Qu’est-ce que le cyberharcèlement ?', answer: 'du harcèlement sur Internet ou par téléphone', others: ['un jeu vidéo', 'un réseau de câbles'], says: 'Oui : le cyberharcèlement est puni par la loi ; on peut appeler le 3018.' },
      { ask: 'Qu’est-ce que la dignité ?', answer: 'le respect dû à chaque personne', others: ['le droit de commander', 'une récompense à l’école'], says: 'Oui : chaque être humain mérite d’être respecté.' },
      { ask: 'A-t-on le droit de refuser un logement à quelqu’un à cause de son origine ?', answer: 'non, c’est interdit par la loi', others: ['oui, c’est permis', 'oui, si le logement est petit'], says: 'C’est ça : cette discrimination est punie par la loi.' },
      { ask: ['Un camarade a un accent différent du tien.', 'Que fais-tu ?'], answer: 'je le respecte', others: ['je me moque de lui', 'je l’exclus du jeu'], says: 'Oui : nos différences ne changent rien à nos droits.' },
      { e: '📱', ask: 'Partager une photo d’un camarade pour se moquer de lui, qu’est-ce que c’est ?', answer: 'de la cyberviolence', others: ['une blague sans importance', 'un geste gentil'], says: 'Oui : se moquer de quelqu’un en ligne peut faire très mal, et c’est puni par la loi.' },
      { ask: 'Pour un même travail, les femmes et les hommes doivent-ils recevoir le même salaire ?', answer: 'oui, la loi l’impose', others: ['non, les hommes doivent gagner plus', 'non, c’est au hasard'], says: 'Oui : à travail égal, salaire égal ; c’est la loi.' },
      { ask: 'Que peut faire un témoin de harcèlement ?', answer: 'ne pas rire et prévenir un adulte', others: ['filmer la scène pour la partager', 'encourager le harceleur'], says: 'Oui : un témoin qui réagit aide la victime.' },
      { ask: 'Qu’est-ce qu’un stéréotype ?', answer: 'une idée toute faite sur un groupe', others: ['une vérité scientifique', 'un instrument de musique'], says: 'Oui : dire que les filles ne savent pas jouer au foot, c’est un stéréotype.' },
    ],
  },
  {
    nom: 'La fraternité',
    emoji: '🤝',
    questions: [
      { ask: 'Quel mot de la devise républicaine parle de solidarité entre tous ?', answer: 'Fraternité', others: ['Liberté', 'Égalité'], says: 'Oui : la fraternité, c’est le lien qui unit tous les citoyens.' },
      { ask: 'Que veut dire « fraternité » dans la devise de la République ?', answer: 'se sentir proches et s’entraider', others: ['avoir les mêmes parents', 'être toujours d’accord'], says: 'Oui : la fraternité unit les citoyens, comme des frères et sœurs.' },
      { ask: 'Qu’est-ce que l’empathie ?', answer: 'comprendre ce que ressent l’autre', others: ['ne penser qu’à soi', 'gagner à tout prix'], says: 'Oui : avoir de l’empathie, c’est se mettre à la place de l’autre.' },
      { ask: 'Quel est le contraire de l’égoïsme ?', answer: 'l’altruisme', others: ['la paresse', 'la colère'], says: 'Oui : l’altruiste pense aux autres ; l’égoïste pense d’abord à lui.' },
      { ask: ['Un camarade n’a pas compris la consigne.', 'Quel geste est fraternel ?'], answer: 'la lui expliquer', others: ['se moquer de lui', 'faire comme si de rien n’était'], says: 'Oui : s’entraider, c’est vivre la fraternité.' },
      { e: '💬', ask: 'Pendant un débat, que fait-on pour prendre la parole ?', answer: 'on lève la main', others: ['on crie plus fort', 'on coupe la parole'], says: 'Oui : on lève la main et on attend son tour.' },
      { e: '💬', ask: 'Pendant un débat, que fait-on quand un camarade parle ?', answer: 'on l’écoute jusqu’au bout', others: ['on parle en même temps', 'on se moque de son idée'], says: 'Oui : écouter les autres, c’est les respecter.' },
      { e: '💬', ask: 'Dans un débat, comment défend-on son avis ?', answer: 'avec des arguments', others: ['avec des insultes', 'en criant'], says: 'Oui : un argument est une raison qui explique ce qu’on pense.' },
      { e: '💬', ask: 'Pendant un débat, peut-on changer d’avis ?', answer: 'oui, si les arguments convainquent', others: ['non, jamais', 'seulement si on a perdu'], says: 'Oui : écouter les autres, c’est aussi accepter de changer d’avis.' },
      { ask: 'Être en désaccord avec quelqu’un, est-ce grave ?', answer: 'non, si on reste respectueux', others: ['oui, il faut se fâcher', 'oui, il faut se taire'], says: 'C’est ça : on peut ne pas être d’accord, et se respecter.' },
      { ask: ['Après une tempête, des habitants aident leurs voisins à réparer leur maison.', 'De quoi est-ce un exemple ?'], answer: 'de solidarité', others: ['d’égoïsme', 'de discrimination'], says: 'Oui : s’entraider dans les moments difficiles, c’est la solidarité.' },
      { ask: 'Comment appelle-t-on une personne qui aide les autres, sans être payée, dans une association ?', answer: 'un bénévole', others: ['un salarié', 'un client'], says: 'Oui : les bénévoles donnent de leur temps pour aider les autres.' },
      { ask: ['Un nouvel élève arrive et ne connaît personne.', 'Que fais-tu ?'], answer: 'je l’invite à jouer', others: ['je l’ignore', 'je me moque de lui'], says: 'Oui : accueillir les autres, c’est un geste fraternel.' },
      { ask: 'Que font les Restos du cœur ?', answer: 'ils distribuent des repas', others: ['ils vendent des voitures', 'ils construisent des routes'], says: 'Oui : les Restos du cœur aident les personnes qui ont du mal à se nourrir.' },
      { ask: 'Que veut dire « coopérer » ?', answer: 'travailler ensemble vers un même but', others: ['travailler seul contre les autres', 'refuser de partager'], says: 'Oui : en coopérant, on réussit ensemble.' },
    ],
  },
  {
    nom: 'Symboles de la République',
    emoji: '🇫🇷',
    questions: [
      { e: '', ask: 'Quelles sont les couleurs du drapeau français ?', answer: 'bleu, blanc, rouge', others: ['vert, blanc, rouge', 'noir, jaune, rouge'], says: 'Oui : le drapeau tricolore est bleu, blanc, rouge.' },
      { e: '🎵', ask: 'Comment s’appelle l’hymne national de la France ?', answer: 'La Marseillaise', others: ['L’Ode à la joie', 'Le Chant des partisans'], says: 'Oui : La Marseillaise est l’hymne national.' },
      { e: '🎵', ask: 'Qui a écrit La Marseillaise, en 1792 ?', answer: 'Rouget de Lisle', others: ['Victor Hugo', 'Jules Ferry'], says: 'Oui : Rouget de Lisle l’a composée à Strasbourg, en 1792.' },
      { e: '🎵', ask: 'Pourquoi ce chant de 1792 s’appelle-t-il La Marseillaise ?', answer: 'des volontaires de Marseille le chantaient', others: ['il a été écrit à Marseille', 'il parle de la mer'], says: 'Oui : des volontaires venus de Marseille le chantaient en arrivant à Paris.' },
      { ask: 'Quelle est la devise de la République française ?', answer: 'Liberté, Égalité, Fraternité', others: ['Paix, Travail, Bonheur', 'Force, Honneur, Courage'], says: 'Oui : la devise est inscrite sur les mairies et les écoles.' },
      { ask: 'Qui est Marianne ?', answer: 'le symbole de la République', others: ['une reine de France', 'la première présidente'], says: 'Oui : Marianne représente la République ; son buste est dans les mairies.' },
      { e: '🎆', ask: 'Quelle est la date de la fête nationale française ?', answer: 'le 14 juillet', others: ['le 11 novembre', 'le 8 mai'], says: 'Oui : le 14 juillet est la fête nationale depuis 1880.' },
      { e: '🎆', ask: 'Le 14 juillet rappelle la prise de la Bastille et quelle fête de 1790 ?', answer: 'la fête de la Fédération', others: ['la fête de la musique', 'la fête du travail'], says: 'Oui : le 14 juillet 1790, la fête de la Fédération célèbre l’unité de la nation.' },
      { e: '💐', ask: 'Que commémore-t-on le 11 novembre ?', answer: 'l’armistice de 1918', others: ['la prise de la Bastille', 'la naissance de l’euro'], says: 'Oui : le 11 novembre, on rend hommage à tous les morts pour la France.' },
      { e: '💐', ask: 'Que commémore-t-on le 8 mai ?', answer: 'la victoire de 1945', others: ['la prise de la Bastille', 'l’armistice de 1918'], says: 'Oui : le 8 mai 1945 marque la fin de la Seconde Guerre mondiale en Europe.' },
      { ask: 'Quel animal est un symbole de la France ?', answer: 'le coq', others: ['le kangourou', 'le panda'], says: 'Oui : le coq gaulois est un symbole de la France.' },
      { ask: 'Où peut-on lire la devise « Liberté, Égalité, Fraternité » ?', answer: 'sur les mairies et les écoles', others: ['sur les panneaux de signalisation', 'sur les châteaux forts'], says: 'Oui : la devise est inscrite sur les bâtiments publics.' },
      { e: '🎵', ask: 'Que fait-on quand on joue La Marseillaise lors d’une cérémonie ?', answer: 'on se tient debout, en silence', others: ['on danse', 'on s’en va'], says: 'Oui : on se lève et on écoute, par respect.' },
      { e: '🎆', ask: 'Quel grand défilé a lieu chaque 14 juillet à Paris ?', answer: 'un défilé militaire', others: ['un défilé de carnaval', 'une course cycliste'], says: 'Oui : chaque 14 juillet, un grand défilé militaire a lieu à Paris.' },
      { e: '💐', ask: 'Sous l’Arc de triomphe, à Paris, qui repose depuis 1921 ?', answer: 'le Soldat inconnu', others: ['Napoléon', 'Louis XIV'], says: 'Oui : le Soldat inconnu représente tous les soldats morts pendant la Grande Guerre.' },
    ],
  },
  {
    nom: 'Droits et devoirs',
    emoji: '⚖️',
    questions: [
      { e: '🗳️', ask: 'À partir de quel âge peut-on voter en France ?', answer: '18 ans', others: ['16 ans', '21 ans'], says: 'Oui : depuis 1974, on vote à partir de 18 ans.' },
      { e: '🗳️', ask: ['Voter est un droit.', 'Qu’est-ce que c’est aussi, pour un citoyen ?'], answer: 'un devoir civique', others: ['une punition', 'un jeu'], says: 'Oui : voter n’est pas obligatoire, mais c’est un devoir civique.' },
      { ask: 'Lequel de ces exemples est un devoir du citoyen ?', answer: 'respecter les lois', others: ['ne jamais aider personne', 'désobéir aux règles'], says: 'Oui : respecter les lois et payer ses impôts sont des devoirs du citoyen.' },
      { e: '🪙', ask: 'À quoi servent les impôts ?', answer: 'à payer les écoles, les hôpitaux, les routes', others: ['à enrichir le maire', 'à acheter des cadeaux au président'], says: 'Oui : les impôts financent les services publics, utiles à tous.' },
      { ask: 'Qui dirige la commune ?', answer: 'le maire', others: ['le président de la République', 'le directeur de l’école'], says: 'Oui : le maire dirige la commune avec le conseil municipal.' },
      { ask: 'Qui élit le maire ?', answer: 'le conseil municipal', others: ['le président de la République', 'les enfants de l’école'], says: 'Oui : les habitants élisent le conseil municipal, qui élit ensuite le maire.' },
      { ask: 'Qu’est-ce qu’un conseil municipal des jeunes ?', answer: 'des jeunes élus qui proposent des projets pour leur commune', others: ['un club de football', 'une colonie de vacances'], says: 'Oui : les jeunes élus proposent et réalisent des projets pour leur commune.' },
      { e: '🏫', ask: 'Que font les classes qui participent au Parlement des enfants ?', answer: 'elles écrivent une proposition de loi', others: ['elles élisent le président', 'elles votent le budget de l’État'], says: 'Oui : les élèves imaginent une proposition de loi, comme de vrais députés.' },
      { e: '🧒', ask: 'En quelle année la Convention internationale des droits de l’enfant est-elle adoptée ?', answer: '1989', others: ['1789', '1945'], says: 'Oui : le 20 novembre 1989, l’Organisation des Nations unies adopte cette convention.' },
      { e: '🧒', ask: 'Lequel de ces droits est un droit de l’enfant ?', answer: 'le droit d’aller à l’école', others: ['le droit de conduire une voiture', 'le droit de voter'], says: 'Oui : chaque enfant a le droit d’être éduqué, soigné et protégé.' },
      { e: '🧒', ask: 'Quel jour célèbre-t-on les droits de l’enfant ?', answer: 'le 20 novembre', others: ['le 14 juillet', 'le 25 décembre'], says: 'Oui : le 20 novembre est la journée internationale des droits de l’enfant.' },
      { ask: 'Comment s’appelle la démarche d’un étranger qui demande à devenir français ?', answer: 'la naturalisation', others: ['la décentralisation', 'la vaccination'], says: 'Oui : un étranger qui vit en France peut demander à être naturalisé.' },
      { e: '🗳️', ask: 'Quel document montre qu’on est inscrit pour voter ?', answer: 'la carte électorale', others: ['la carte de cantine', 'le carnet de santé'], says: 'Oui : la carte électorale montre qu’on est inscrit sur les listes électorales.' },
      { ask: 'Lequel de ces droits est un droit politique ?', answer: 'voter aux élections', others: ['se marier', 'porter un nom'], says: 'Oui : voter et se présenter aux élections sont des droits politiques.' },
      { ask: 'Lequel de ces droits est un droit civil ?', answer: 'se marier', others: ['voter aux élections', 'être élu député'], says: 'Oui : se marier ou posséder des biens sont des droits civils.' },
      { ask: 'Combien de députés siègent à l’Assemblée nationale ?', answer: '577', others: ['27', '100'], says: 'Oui : 577 députés, élus par les citoyens, siègent à l’Assemblée nationale.' },
    ],
  },
  {
    nom: 'Les libertés',
    emoji: '📰',
    questions: [
      { e: '💬', ask: 'Que permet la liberté d’expression ?', answer: 'dire et écrire ce que l’on pense', others: ['insulter qui on veut', 'mentir sur les autres'], says: 'Oui : on peut exprimer ses idées, dans le respect de la loi et des autres.' },
      { e: '💬', ask: 'La liberté d’expression a-t-elle des limites ?', answer: 'oui, celles fixées par la loi', others: ['non, on peut tout dire', 'oui, on ne peut rien dire'], says: 'Oui : les insultes, la diffamation et les appels à la haine sont punis par la loi.' },
      { ask: 'Qu’est-ce que la diffamation ?', answer: 'accuser quelqu’un à tort, en public', others: ['faire un compliment', 'donner son avis sur un livre'], says: 'Oui : la diffamation porte atteinte à l’honneur d’une personne ; elle est punie par la loi.' },
      { ask: 'En quelle année une grande loi garantit-elle la liberté de la presse ?', answer: '1881', others: ['1515', '1945'], says: 'Oui : la loi du 29 juillet 1881 garantit la liberté de la presse.' },
      { ask: 'Qu’est-ce que la liberté d’opinion ?', answer: 'avoir ses propres idées', others: ['obliger les autres à penser comme soi', 'n’avoir jamais d’avis'], says: 'Oui : chacun peut avoir ses idées, même différentes de celles des autres.' },
      { e: '🤝', ask: 'Que permet la liberté d’association ?', answer: 'créer un club ou une association', others: ['ne jamais aller à l’école', 'interdire les clubs des autres'], says: 'Oui : depuis la loi de 1901, chacun peut créer une association.' },
      { e: '💻', ask: 'Sur Internet, qu’est-ce qu’un pseudonyme ?', answer: 'un nom inventé', others: ['un mot de passe', 'une photo de profil'], says: 'Oui : un pseudonyme cache ton vrai nom.' },
      { e: '💻', ask: 'Avec un pseudonyme, peut-on insulter les autres sans risque ?', answer: 'non, la loi s’applique aussi en ligne', others: ['oui, personne ne le saura', 'oui, c’est autorisé'], says: 'C’est ça : en ligne aussi, les insultes et le harcèlement sont punis par la loi.' },
      { ask: 'Qu’est-ce qu’une fausse information ?', answer: 'une information inventée ou trompeuse', others: ['une information vérifiée', 'une information ancienne'], says: 'Oui : on appelle aussi les fausses informations des infox.' },
      { e: '🔍', ask: 'Comment vérifier une information trouvée sur Internet ?', answer: 'comparer plusieurs sources sérieuses', others: ['croire le premier site venu', 'compter les « j’aime »'], says: 'Oui : on regarde qui a écrit l’information, et on compare avec des sources fiables.' },
      { ask: 'Pourquoi la presse doit-elle être libre ?', answer: 'pour informer les citoyens', others: ['pour obéir au gouvernement', 'pour vendre des jouets'], says: 'Oui : une presse libre permet aux citoyens de se faire leur propre avis.' },
      { e: '🔍', ask: ['Une photo très étonnante circule.', 'Que faut-il se demander d’abord ?'], answer: 'qui l’a publiée, et quand', others: ['combien de fois elle a été partagée', 'si elle est jolie'], says: 'Oui : une image peut être truquée, ou sortie de son contexte.' },
      { e: '📱', ask: 'Peut-on publier la photo d’un camarade sans son accord ?', answer: 'non, il faut son accord', others: ['oui, toujours', 'oui, si elle est drôle'], says: 'C’est ça : chacun a droit au respect de son image.' },
      { ask: 'Selon la Déclaration de 1789, qu’est-ce que la libre communication des pensées et des opinions ?', answer: 'un des droits les plus précieux', others: ['un privilège du roi', 'un danger à interdire'], says: 'Oui : c’est l’article 11 de la Déclaration des droits de l’homme et du citoyen.' },
      { ask: 'Quel est le métier d’un journaliste ?', answer: 'rechercher et vérifier les informations', others: ['inventer des histoires', 'vendre des journaux'], says: 'Oui : le journaliste enquête, vérifie et informe le public.' },
    ],
  },
  {
    nom: 'La laïcité',
    emoji: '🏫',
    questions: [
      { ask: 'Que garantit la laïcité ?', answer: 'la liberté de croire ou de ne pas croire', others: ['l’obligation d’avoir une religion', 'l’interdiction de toutes les religions'], says: 'Oui : chacun est libre d’avoir une religion, ou de ne pas en avoir.' },
      { ask: 'En quelle année la loi de séparation des Églises et de l’État est-elle votée ?', answer: '1905', others: ['1789', '1958'], says: 'Oui : la loi du 9 décembre 1905 sépare les Églises et l’État.' },
      { ask: 'Quel jour est la journée de la laïcité ?', answer: 'le 9 décembre', others: ['le 14 juillet', 'le 1er mai'], says: 'Oui : le 9 décembre rappelle la loi de 1905.' },
      { ask: 'Que veut dire « l’école publique est laïque » ?', answer: 'elle ne favorise aucune religion', others: ['elle enseigne une seule religion', 'elle refuse les élèves croyants'], says: 'Oui : l’école laïque accueille tous les élèves, quelles que soient leurs croyances.' },
      { ask: 'Quel texte, affiché dans les écoles, explique la laïcité ?', answer: 'la Charte de la laïcité', others: ['le Code noir', 'le règlement du football'], says: 'Oui : depuis 2013, la Charte de la laïcité est affichée dans les écoles publiques.' },
      { ask: 'Quel ministre a rendu l’école publique laïque, en 1882 ?', answer: 'Jules Ferry', others: ['Louis XIV', 'Victor Hugo'], says: 'Oui : depuis les lois Jules Ferry, l’école publique est gratuite, laïque et obligatoire.' },
      { ask: 'Dans un pays laïque, que fait l’État face aux religions ?', answer: 'il n’en favorise aucune', others: ['il choisit la religion des citoyens', 'il interdit de croire'], says: 'Oui : l’État est neutre ; il respecte toutes les croyances.' },
      { ask: ['Deux élèves n’ont pas la même religion.', 'Que dit la laïcité ?'], answer: 'ils ont les mêmes droits et se respectent', others: ['l’un doit changer de religion', 'ils ne peuvent pas jouer ensemble'], says: 'Oui : la laïcité permet de vivre ensemble, quelles que soient nos croyances.' },
      { ask: 'La laïcité protège-t-elle aussi les personnes qui ne croient en aucun dieu ?', answer: 'oui, elle protège tout le monde', others: ['non, seulement les croyants', 'non, personne'], says: 'Oui : la laïcité protège la liberté de conscience de tous.' },
      { ask: 'Un enseignant de l’école publique doit-il montrer sa religion en classe ?', answer: 'non, il doit rester neutre', others: ['oui, il doit la montrer', 'oui, il doit l’enseigner'], says: 'C’est ça : les enseignants sont neutres, ils ne montrent pas leurs convictions.' },
      { ask: 'À l’école publique, que dit la loi de 2004 sur les signes religieux très visibles ?', answer: 'les élèves ne doivent pas en porter', others: ['ils sont obligatoires', 'chacun doit en porter un'], says: 'Oui : à l’école publique, les élèves ne portent pas de signes religieux ostensibles.' },
      { ask: 'Que veut dire « liberté de conscience » ?', answer: 'être libre de ses croyances', others: ['être obligé de croire', 'devoir tout dire à tout le monde'], says: 'Oui : chacun choisit librement ce qu’il croit, ou ne croit pas.' },
      { ask: 'Que garantit aussi la loi de 1905 ?', answer: 'le libre exercice des cultes', others: ['l’interdiction des églises', 'une religion obligatoire'], says: 'Oui : chacun peut pratiquer sa religion, dans le respect de l’ordre public.' },
      { ask: 'Quel mot désigne la séparation entre l’État et les religions ?', answer: 'la laïcité', others: ['la fraternité', 'la monarchie'], says: 'Oui : la laïcité est un principe de la République.' },
      { e: '🍽️', ask: 'À la cantine de l’école publique, tous les élèves peuvent-ils manger ensemble ?', answer: 'oui, quelle que soit leur religion', others: ['non, chacun à part', 'non, seulement les croyants'], says: 'Oui : l’école laïque rassemble tous les élèves.' },
    ],
  },
  {
    nom: 'L’Union européenne',
    emoji: '🇪🇺',
    questions: [
      { e: '🗺️', ask: 'Combien de pays font partie de l’Union européenne ?', answer: '27', others: ['12', '50'], says: 'Oui : depuis 2020, l’Union européenne compte 27 pays.' },
      { e: '', ask: 'Combien d’étoiles y a-t-il sur le drapeau européen ?', answer: '12', others: ['27', '6'], says: 'Oui : douze étoiles en cercle, quel que soit le nombre de pays : un symbole d’unité.' },
      { e: '', ask: 'Comment est le drapeau européen ?', answer: 'bleu, avec des étoiles jaunes', others: ['rouge, avec des étoiles blanches', 'vert, avec des étoiles bleues'], says: 'Oui : douze étoiles jaunes en cercle, sur un fond bleu.' },
      { e: '🎵', ask: 'Quel est l’hymne européen ?', answer: 'l’Ode à la joie', others: ['La Marseillaise', 'Le Chant des partisans'], says: 'Oui : l’hymne européen est l’Ode à la joie, de Beethoven.' },
      { e: '🎵', ask: 'Qui a composé la musique de l’hymne européen ?', answer: 'Beethoven', others: ['Mozart', 'Rouget de Lisle'], says: 'Oui : c’est un extrait de la Neuvième Symphonie de Beethoven.' },
      { ask: 'Quelle monnaie utilisent la France et de nombreux pays européens ?', answer: 'l’euro', others: ['le dollar', 'le franc'], says: 'Oui : l’euro est la monnaie de la France et de nombreux pays européens.' },
      { ask: 'Dans quelle ville française siège le Parlement européen ?', answer: 'Strasbourg', others: ['Paris', 'Marseille'], says: 'Oui : le Parlement européen se réunit à Strasbourg, et aussi à Bruxelles.' },
      { e: '🗳️', ask: 'Qui élit les députés européens ?', answer: 'les citoyens européens', others: ['le président de la République', 'les maires'], says: 'Oui : tous les cinq ans, les citoyens européens élisent leurs députés.' },
      { ask: 'Quel jour fête-t-on l’Europe ?', answer: 'le 9 mai', others: ['le 14 juillet', 'le 11 novembre'], says: 'Oui : le 9 mai 1950, Robert Schuman propose d’unir les pays européens.' },
      { ask: 'Quel traité de 1957 crée la Communauté économique européenne ?', answer: 'le traité de Rome', others: ['le traité de Versailles', 'l’édit de Nantes'], says: 'Oui : le traité de Rome est signé en 1957 par six pays.' },
      { ask: 'En quelle année le traité de Maastricht crée-t-il l’Union européenne ?', answer: '1992', others: ['1957', '2002'], says: 'Oui : le traité de Maastricht est signé en 1992.' },
      { ask: 'Quel pays a quitté l’Union européenne en 2020 ?', answer: 'le Royaume-Uni', others: ['la France', 'l’Allemagne'], says: 'Oui : le Royaume-Uni est sorti de l’Union européenne le 31 janvier 2020.' },
      { ask: 'Lequel de ces pays fait partie de l’Union européenne ?', answer: 'l’Espagne', others: ['la Suisse', 'la Norvège'], says: 'Oui : l’Espagne est membre de l’Union européenne depuis 1986.' },
      { ask: 'Lequel de ces pays ne fait pas partie de l’Union européenne ?', answer: 'la Suisse', others: ['la Belgique', 'l’Italie'], says: 'Oui : la Suisse est en Europe, mais elle n’est pas membre de l’Union européenne.' },
      { ask: 'Que peuvent faire les citoyens européens dans les pays de l’Union ?', answer: 'y vivre, y étudier et y travailler', others: ['y voter pour un roi', 'seulement y passer une journée'], says: 'Oui : un citoyen européen peut circuler, vivre, étudier et travailler dans toute l’Union.' },
      { ask: 'Dans quelle ville se trouve la Commission européenne ?', answer: 'Bruxelles', others: ['Berlin', 'Madrid'], says: 'Oui : Bruxelles accueille la Commission européenne.' },
      { ask: 'Quelle est la devise de l’Union européenne ?', answer: 'Unie dans la diversité', others: ['Liberté, Égalité, Fraternité', 'Un pour tous, tous pour un'], says: 'Oui : la devise de l’Union européenne est « Unie dans la diversité ».' },
    ],
  },
];

export const republique = {
  id: 'republique',
  domain: 'monde',
  section: 'Enseignement moral et civique',
  title: 'Vivre en République',
  icon: '🇫🇷',
  skill: 'Le civisme, alerter, la démocratie, l’égalité, la fraternité ; les symboles, droits et devoirs, les libertés, la laïcité, l’Union européenne',
  levels: REPUBLIQUE.map((n) => n.nom),
  generate(level, rng) {
    return jouer('republique', REPUBLIQUE, level, rng);
  },
};

// ================================================================= Les sciences du CM

const SCIENCES = [
  {
    nom: 'Mélanges et solutions',
    emoji: '🧪',
    questions: [
      { ask: 'Comment appelle-t-on un mélange où l’on ne distingue plus ses constituants à l’œil nu ?', answer: 'un mélange homogène', others: ['un mélange hétérogène', 'un mélange de cailloux'], says: 'Oui : dans un mélange homogène, comme l’eau salée, on ne distingue plus ce qu’on a mélangé.' },
      { ask: 'De l’eau et du sable mélangés forment quel type de mélange ?', answer: 'un mélange hétérogène', others: ['un mélange homogène', 'une solution'], says: 'Oui : on voit encore les grains de sable : le mélange est hétérogène.' },
      { ask: 'De l’eau sucrée bien mélangée forme quel type de mélange ?', answer: 'un mélange homogène', others: ['un mélange hétérogène', 'un solide'], says: 'Oui : le sucre dissous ne se voit plus ; le mélange est homogène.' },
      { e: '🥄', ask: 'Quand le sucre disparaît dans l’eau, que fait-il ?', answer: 'il se dissout', others: ['il fond', 'il s’évapore'], says: 'Oui : le sucre se dissout ; il ne fond pas, car on ne le chauffe pas.' },
      { ask: 'Comment appelle-t-on un liquide dans lequel un solide est dissous ?', answer: 'une solution', others: ['une décantation', 'une filtration'], says: 'Oui : l’eau salée est une solution : le sel y est dissous.' },
      { e: '🧂', ask: 'Comment appelle-t-on une solution dans laquelle le sel ne peut plus se dissoudre ?', answer: 'une solution saturée', others: ['une solution évaporée', 'une solution filtrée'], says: 'Oui : quand la solution est saturée, le sel en trop reste au fond.' },
      { ask: 'Quelle méthode permet de séparer du sable et de petits cailloux ?', answer: 'le tamisage', others: ['l’évaporation', 'la dissolution'], says: 'Oui : le sable passe à travers le tamis, les cailloux restent dessus.' },
      { ask: ['On laisse reposer de l’eau boueuse, et la terre tombe au fond.', 'Comment appelle-t-on cette méthode ?'], answer: 'la décantation', others: ['la filtration', 'l’évaporation'], says: 'Oui : pendant la décantation, les particules lourdes tombent au fond.' },
      { ask: 'Quelle méthode sépare l’eau et le sable avec un papier filtre ?', answer: 'la filtration', others: ['la décantation', 'la dissolution'], says: 'Oui : le filtre retient le sable et laisse passer l’eau.' },
      { e: '🧂', ask: 'Comment récupère-t-on le sel dissous dans de l’eau salée ?', answer: 'par évaporation', others: ['par filtration', 'par tamisage'], says: 'Oui : le filtre laisse passer le sel dissous ; il faut faire évaporer l’eau.' },
      { e: '🫒', ask: 'L’huile et l’eau forment-elles un mélange homogène ?', answer: 'non, l’huile reste au-dessus', others: ['oui, toujours', 'oui, si on attend longtemps'], says: 'C’est ça : l’huile ne se mélange pas à l’eau, elle remonte au-dessus.' },
      { e: '🥄', ask: 'Qu’est-ce qui aide le sucre à se dissoudre plus vite ?', answer: 'remuer, dans de l’eau chaude', others: ['mettre l’eau au congélateur', 'ne pas remuer du tout'], says: 'Oui : le sucre se dissout plus vite dans l’eau chaude, quand on remue.' },
      { e: '💧', ask: 'Après filtration, une eau boueuse devenue claire est-elle forcément potable ?', answer: 'non, elle peut contenir des microbes', others: ['oui, toujours', 'oui, si elle est froide'], says: 'C’est ça : une eau claire peut encore contenir des microbes ou des produits dissous.' },
      { e: '🍊', ask: 'Un jus d’orange avec de la pulpe forme quel type de mélange ?', answer: 'un mélange hétérogène', others: ['un mélange homogène', 'un corps pur'], says: 'Oui : on voit les morceaux de pulpe : le mélange est hétérogène.' },
      { e: '🧂', ask: ['On dissout 10 grammes de sel dans 100 grammes d’eau.', 'Combien pèse l’eau salée ?'], answer: '110 grammes', others: ['100 grammes', '90 grammes'], says: 'Oui : le sel est toujours là, même invisible : la masse se conserve.' },
      { e: '🧂', ask: 'Peut-on dissoudre autant de sel qu’on veut dans un verre d’eau ?', answer: 'non, il y a une limite', others: ['oui, sans aucune limite', 'non, le sel ne se dissout jamais'], says: 'C’est ça : au-delà d’une certaine quantité, la solution est saturée.' },
    ],
  },
  {
    nom: 'La lumière et les ombres',
    emoji: '🔦',
    questions: [
      { ask: 'Comment appelle-t-on un matériau à travers lequel on voit nettement ?', answer: 'transparent', others: ['translucide', 'opaque'], says: 'Oui : un matériau transparent laisse passer la lumière, et on voit à travers.' },
      { ask: 'Comment appelle-t-on un matériau qui laisse passer la lumière, mais à travers lequel on ne voit pas nettement ?', answer: 'translucide', others: ['transparent', 'opaque'], says: 'Oui : le papier calque ou le verre dépoli sont translucides.' },
      { ask: 'Comment appelle-t-on un matériau qui ne laisse pas passer la lumière ?', answer: 'opaque', others: ['transparent', 'translucide'], says: 'Oui : le bois, le carton ou le métal sont opaques.' },
      { ask: 'Le papier calque est-il transparent, translucide ou opaque ?', answer: 'translucide', others: ['transparent', 'opaque'], says: 'Oui : la lumière passe, mais on ne voit pas nettement à travers.' },
      { e: '🪵', ask: 'Une planche de bois est-elle transparente, translucide ou opaque ?', answer: 'opaque', others: ['transparente', 'translucide'], says: 'Oui : le bois arrête la lumière : il est opaque.' },
      { ask: 'Une vitre propre est-elle transparente, translucide ou opaque ?', answer: 'transparente', others: ['translucide', 'opaque'], says: 'Oui : à travers une vitre propre, on voit nettement.' },
      { ask: 'Le verre dépoli d’une salle de bains est-il transparent, translucide ou opaque ?', answer: 'translucide', others: ['transparent', 'opaque'], says: 'Oui : il laisse passer la lumière, mais on ne voit pas nettement à travers.' },
      { ask: 'Comment appelle-t-on l’ombre qu’un objet projette sur le sol ou sur un mur ?', answer: 'l’ombre portée', others: ['l’ombre propre', 'le reflet'], says: 'Oui : l’ombre portée se dessine sur une surface, derrière l’objet éclairé.' },
      { ask: 'Comment appelle-t-on la partie d’un objet qui n’est pas éclairée ?', answer: 'l’ombre propre', others: ['l’ombre portée', 'le reflet'], says: 'Oui : l’ombre propre est sur l’objet lui-même, du côté opposé à la lumière.' },
      { e: '🌳', ask: ['Le Soleil est à l’est.', 'De quel côté se trouve l’ombre d’un arbre ?'], answer: 'à l’ouest', others: ['à l’est', 'au nord'], says: 'Oui : l’ombre est toujours du côté opposé à la source de lumière.' },
      { ask: ['On approche la lampe de l’objet.', 'Que devient son ombre sur le mur ?'], answer: 'elle grandit', others: ['elle rapetisse', 'elle disparaît'], says: 'Oui : plus la lampe est proche de l’objet, plus l’ombre est grande.' },
      { ask: ['On éloigne la lampe de l’objet.', 'Que devient son ombre sur le mur ?'], answer: 'elle rapetisse', others: ['elle grandit', 'elle disparaît'], says: 'Oui : plus la lampe est loin de l’objet, plus l’ombre est petite.' },
      { e: '☀️', ask: 'À quel moment de la journée l’ombre d’un bâton est-elle la plus courte ?', answer: 'à midi, heure solaire', others: ['tôt le matin', 'le soir'], says: 'Oui : à midi solaire, le Soleil est au plus haut : l’ombre est la plus courte.' },
      { e: '☀️', ask: 'En France, à midi solaire, vers où pointe l’ombre d’un bâton ?', answer: 'vers le nord', others: ['vers le sud', 'vers l’est'], says: 'Oui : à midi solaire, le Soleil est au sud, alors l’ombre pointe vers le nord.' },
      { e: '☀️', ask: 'Pourquoi notre corps fait-il une ombre au soleil ?', answer: 'il arrête la lumière', others: ['il fabrique du noir', 'le sol est mouillé'], says: 'Oui : notre corps est opaque, il bloque la lumière du Soleil.' },
      { e: '☀️', ask: 'Le matin, quand le Soleil est bas, comment sont les ombres ?', answer: 'longues', others: ['très courtes', 'invisibles'], says: 'Oui : plus le Soleil est bas, plus les ombres sont longues.' },
    ],
  },
  {
    nom: 'La Lune',
    emoji: '🔭',
    questions: [
      { ask: 'Autour de quel astre la Lune tourne-t-elle ?', answer: 'la Terre', others: ['Mars', 'Jupiter'], says: 'Oui : la Lune est le satellite naturel de la Terre.' },
      { ask: 'La Lune produit-elle sa propre lumière ?', answer: 'non, elle renvoie celle du Soleil', others: ['oui, comme une étoile', 'oui, seulement la nuit'], says: 'C’est ça : la Lune est éclairée par le Soleil.' },
      { ask: 'Combien de temps sépare deux pleines lunes ?', answer: 'environ 29 jours et demi', others: ['environ 7 jours', 'environ 365 jours'], says: 'Oui : environ 29 jours et demi : c’est une lunaison.' },
      { ask: 'Comment appelle-t-on la période qui sépare deux nouvelles lunes ?', answer: 'une lunaison', others: ['une saison', 'une année'], says: 'Oui : une lunaison dure environ 29 jours et demi.' },
      { ask: 'Comment appelle-t-on la phase où l’on ne voit presque pas la Lune ?', answer: 'la nouvelle lune', others: ['la pleine lune', 'le premier quartier'], says: 'Oui : à la nouvelle lune, la face éclairée de la Lune n’est pas tournée vers nous.' },
      { ask: 'Comment appelle-t-on la phase où l’on voit tout le disque de la Lune éclairé ?', answer: 'la pleine lune', others: ['la nouvelle lune', 'le dernier quartier'], says: 'Oui : à la pleine lune, on voit toute sa face éclairée.' },
      { ask: 'Après la nouvelle lune, comment appelle-t-on la phase où l’on voit la moitié de la Lune ?', answer: 'le premier quartier', others: ['le dernier quartier', 'la pleine lune'], says: 'Oui : après la nouvelle lune vient le premier quartier, puis la pleine lune.' },
      { ask: 'Après la pleine lune, comment appelle-t-on la phase où l’on voit la moitié de la Lune ?', answer: 'le dernier quartier', others: ['le premier quartier', 'la nouvelle lune'], says: 'Oui : après la pleine lune vient le dernier quartier, puis la nouvelle lune.' },
      { ask: 'Dans quel ordre la Lune passe-t-elle par ces phases ?', answer: 'nouvelle lune, premier quartier, pleine lune', others: ['pleine lune, premier quartier, nouvelle lune', 'premier quartier, nouvelle lune, pleine lune'], says: 'Oui : nouvelle lune, premier quartier, pleine lune, dernier quartier, et on recommence.' },
      { ask: 'Après la pleine lune, que fait la partie éclairée que l’on voit ?', answer: 'elle diminue', others: ['elle augmente', 'elle ne change pas'], says: 'Oui : après la pleine lune, la partie éclairée diminue jusqu’à la nouvelle lune.' },
      { ask: 'Pourquoi la forme de la Lune semble-t-elle changer ?', answer: 'on voit plus ou moins sa partie éclairée', others: ['la Terre lui fait de l’ombre chaque nuit', 'la Lune grossit puis maigrit'], says: 'Oui : la Lune est toujours ronde ; selon sa position, on voit plus ou moins sa face éclairée.' },
      { ask: 'Combien de temps la Lune met-elle, environ, pour faire le tour de la Terre ?', answer: 'environ un mois', others: ['environ un jour', 'environ un an'], says: 'Oui : la Lune fait le tour de la Terre en un peu moins d’un mois.' },
      { ask: 'Voit-on toujours la même face de la Lune depuis la Terre ?', answer: 'oui, toujours la même', others: ['non, elle change chaque nuit', 'non, elle change chaque année'], says: 'Oui : la Lune tourne sur elle-même au même rythme qu’autour de la Terre.' },
      { ask: 'Quand peut-on voir la Lune dans le ciel ?', answer: 'la nuit, et parfois le jour', others: ['jamais pendant le jour', 'seulement en hiver'], says: 'Oui : on voit souvent la Lune le matin ou l’après-midi.' },
      { e: '🚀', ask: 'En quelle année des astronautes marchent-ils sur la Lune pour la première fois ?', answer: '1969', others: ['1789', '2002'], says: 'Oui : en juillet 1969, Neil Armstrong est le premier homme à marcher sur la Lune.' },
      { ask: 'Qu’est-ce qui a creusé les cratères de la Lune ?', answer: 'des chutes de météorites', others: ['les pas des astronautes', 'des rivières'], says: 'Oui : les cratères sont les traces de météorites tombées sur la Lune.' },
      { ask: 'Comparée à la Terre, comment est la Lune ?', answer: 'près de quatre fois plus petite', others: ['plus grosse que la Terre', 'de la même taille'], says: 'Oui : le diamètre de la Lune est près de quatre fois plus petit que celui de la Terre.' },
    ],
  },
  {
    nom: 'Classer le vivant',
    emoji: '🔍',
    questions: [
      { ask: 'Pour classer les êtres vivants, que regardent les scientifiques ?', answer: 'ce qu’ils ont en commun', others: ['l’endroit où ils vivent', 'leur taille'], says: 'Oui : on classe selon ce que les êtres vivants possèdent, pas selon leur milieu de vie.' },
      { e: '🐳', ask: 'La baleine est-elle un poisson, un mammifère ou un oiseau ?', answer: 'un mammifère', others: ['un poisson', 'un oiseau'], says: 'Oui : la baleine respire avec des poumons et allaite son petit.' },
      { e: '🦇', ask: 'La chauve-souris est-elle un oiseau, un insecte ou un mammifère ?', answer: 'un mammifère', others: ['un oiseau', 'un insecte'], says: 'Oui : la chauve-souris a des poils et allaite ses petits : c’est un mammifère qui vole.' },
      { e: '🐜', ask: 'Combien de pattes a un insecte ?', answer: '6', others: ['8', '4'], says: 'Oui : tous les insectes ont six pattes.' },
      { e: '🕷️', ask: 'Combien de pattes a une araignée ?', answer: '8', others: ['6', '10'], says: 'Oui : l’araignée a huit pattes : ce n’est pas un insecte.' },
      { ask: 'Qu’ont en commun tous les vertébrés ?', answer: 'un squelette interne', others: ['des plumes', 'six pattes'], says: 'Oui : les vertébrés ont un squelette à l’intérieur du corps, avec une colonne vertébrale.' },
      { ask: 'Lequel de ces animaux est un vertébré ?', answer: 'la grenouille', others: ['l’escargot', 'le papillon'], says: 'Oui : la grenouille a un squelette interne, avec une colonne vertébrale.' },
      { ask: 'Quel attribut seuls les oiseaux possèdent-ils ?', answer: 'des plumes', others: ['des ailes', 'un squelette'], says: 'Oui : seuls les oiseaux ont des plumes ; les chauves-souris et les insectes ont aussi des ailes.' },
      { e: '🌊', ask: ['Le dauphin vit dans la mer, comme le requin.', 'Est-ce un poisson ?'], answer: 'non, c’est un mammifère', others: ['oui, car il nage', 'oui, car il vit dans la mer'], says: 'C’est ça : le dauphin respire de l’air et allaite ses petits.' },
      { ask: 'Comment appelle-t-on un groupe d’êtres vivants qui peuvent se reproduire entre eux ?', answer: 'une espèce', others: ['un milieu', 'un écosystème'], says: 'Oui : les individus d’une même espèce peuvent avoir ensemble des petits féconds.' },
      { e: '🐍', ask: 'Qu’a le serpent sur sa peau ?', answer: 'des écailles', others: ['des plumes', 'des poils'], says: 'Oui : le serpent, comme le lézard, a la peau couverte d’écailles.' },
      { ask: 'Lequel de ces animaux a des poils ?', answer: 'le lapin', others: ['le lézard', 'le saumon'], says: 'Oui : le lapin a des poils : c’est un mammifère.' },
      { ask: ['Le manchot et l’autruche ne volent pas.', 'Sont-ils des oiseaux ?'], answer: 'oui, car ils ont des plumes', others: ['non, car ils ne volent pas', 'non, ce sont des mammifères'], says: 'Oui : tous les animaux à plumes sont des oiseaux, même s’ils ne volent pas.' },
      { ask: 'Lequel de ces animaux est un insecte ?', answer: 'la fourmi', others: ['l’araignée', 'le mille-pattes'], says: 'Oui : la fourmi a six pattes : c’est un insecte.' },
      { e: '🦎', ask: 'Qu’ont en commun le crocodile, le lézard et la tortue ?', answer: 'des écailles', others: ['des plumes', 'des poils'], says: 'Oui : ils ont la peau couverte d’écailles.' },
      { ask: 'Quels animaux font partie du groupe des vertébrés ?', answer: 'les mammifères et les oiseaux', others: ['les insectes et les araignées', 'les escargots et les vers'], says: 'Oui : poissons, amphibiens, reptiles, oiseaux et mammifères sont des vertébrés.' },
    ],
  },
  {
    nom: 'Naître et grandir',
    emoji: '🐣',
    questions: [
      { ask: 'Comment appelle-t-on un animal qui pond des œufs ?', answer: 'ovipare', others: ['vivipare', 'herbivore'], says: 'Oui : les oiseaux, la plupart des poissons et des reptiles sont ovipares.' },
      { ask: 'Comment appelle-t-on un animal dont le petit se développe dans le ventre de sa mère ?', answer: 'vivipare', others: ['ovipare', 'carnivore'], says: 'Oui : presque tous les mammifères sont vivipares.' },
      { ask: 'Lequel de ces animaux est ovipare ?', answer: 'la poule', others: ['la vache', 'le chat'], says: 'Oui : la poule pond des œufs : elle est ovipare.' },
      { ask: 'Lequel de ces animaux est vivipare ?', answer: 'le chat', others: ['la tortue', 'le crocodile'], says: 'Oui : les chatons se développent dans le ventre de leur mère.' },
      { ask: 'Que boivent les bébés mammifères ?', answer: 'le lait de leur mère', others: ['de l’eau de mer', 'du jus de fruits'], says: 'Oui : les mammifères allaitent leurs petits.' },
      { e: '🐸', ask: 'Dans quel ordre la grenouille se développe-t-elle ?', answer: 'œuf, têtard, grenouille', others: ['têtard, œuf, grenouille', 'grenouille, têtard, œuf'], says: 'Oui : l’œuf donne un têtard, qui se transforme en grenouille.' },
      { e: '🦋', ask: 'Dans quel ordre le papillon se développe-t-il ?', answer: 'œuf, chenille, chrysalide, papillon', others: ['chenille, œuf, papillon, chrysalide', 'œuf, chrysalide, chenille, papillon'], says: 'Oui : la chenille se transforme dans la chrysalide, puis le papillon en sort.' },
      { e: '🐸', ask: 'Comment s’appelle la larve de la grenouille ?', answer: 'le têtard', others: ['la chenille', 'l’asticot'], says: 'Oui : le têtard vit dans l’eau, puis il devient une grenouille.' },
      { e: '🦋', ask: 'Que devient la chenille avant de devenir un papillon ?', answer: 'une chrysalide', others: ['un têtard', 'un œuf'], says: 'Oui : dans la chrysalide, la chenille se transforme en papillon.' },
      { e: '🐸', ask: 'Chez la grenouille, où a lieu la fécondation ?', answer: 'dans l’eau, hors du corps', others: ['dans le ventre de la femelle', 'dans un nid'], says: 'Oui : chez la grenouille, la fécondation est externe.' },
      { ask: 'Chez les mammifères, la fécondation est-elle interne ou externe ?', answer: 'interne', others: ['externe', 'il n’y en a pas'], says: 'Oui : chez les mammifères, la fécondation a lieu dans le corps de la femelle.' },
      { e: '🐟', ask: 'Chez la plupart des poissons, la fécondation est-elle interne ou externe ?', answer: 'externe', others: ['interne', 'il n’y en a pas'], says: 'Oui : la femelle pond ses œufs dans l’eau, et le mâle les féconde.' },
      { e: '🐦', ask: ['L’oiseau pond des œufs.', 'Sa fécondation est-elle interne ou externe ?'], answer: 'interne', others: ['externe', 'il n’y en a pas'], says: 'Oui : chez les oiseaux, la fécondation est interne, puis la femelle pond.' },
      { e: '🐸', ask: 'Avec quoi le têtard respire-t-il ?', answer: 'avec des branchies', others: ['avec des poumons', 'avec des narines'], says: 'Oui : le têtard a des branchies ; la grenouille adulte respire avec des poumons et sa peau.' },
      { ask: 'Comment appelle-t-on les grands changements de forme pendant la vie d’un animal ?', answer: 'les métamorphoses', others: ['les migrations', 'les saisons'], says: 'Oui : la grenouille et le papillon subissent des métamorphoses.' },
      { ask: ['L’ornithorynque est un mammifère étonnant.', 'Que fait-il ?'], answer: 'il pond des œufs', others: ['il a des plumes', 'il respire avec des branchies'], says: 'Oui : l’ornithorynque pond des œufs, mais il nourrit ses petits avec du lait.' },
    ],
  },
  {
    nom: 'Les chaînes alimentaires',
    emoji: '🦊',
    questions: [
      { ask: 'Dans une chaîne alimentaire, qui sont les producteurs ?', answer: 'les végétaux', others: ['les carnivores', 'les champignons'], says: 'Oui : les végétaux fabriquent leur propre matière grâce à la lumière.' },
      { ask: 'Dans une chaîne alimentaire, dans quel sens va la flèche ?', answer: 'du mangé vers le mangeur', others: ['du mangeur vers le mangé', 'du plus grand au plus petit'], says: 'Oui : la flèche veut dire « est mangé par ».' },
      { ask: ['L’herbe est mangée par le lapin, qui est mangé par le renard.', 'Qui est le producteur ?'], answer: 'l’herbe', others: ['le lapin', 'le renard'], says: 'Oui : l’herbe fabrique sa matière grâce à la lumière : c’est le producteur.' },
      { ask: ['L’herbe est mangée par le lapin, qui est mangé par le renard.', 'Quel animal est un prédateur ?'], answer: 'le renard', others: ['le lapin', 'aucun des deux'], says: 'Oui : le renard chasse le lapin pour le manger.' },
      { e: '🌱', ask: 'De quoi une plante verte a-t-elle besoin pour fabriquer sa matière ?', answer: 'de lumière, d’eau, de sels minéraux et d’air', others: ['de viande, de sucre et de lait', 'seulement de terre'], says: 'Oui : avec la lumière, l’eau, les sels minéraux et le gaz carbonique de l’air, la plante fabrique sa matière.' },
      { e: '🌳', ask: 'Qu’est-ce qu’un écosystème ?', answer: 'un milieu, ses êtres vivants et leurs relations', others: ['un seul animal et sa nourriture', 'une collection de cailloux'], says: 'Oui : une mare, une forêt ou une prairie sont des écosystèmes.' },
      { ask: ['Le renard chasse le lapin.', 'De quelle relation s’agit-il ?'], answer: 'la prédation', others: ['la coopération', 'la pollinisation'], says: 'Oui : le prédateur chasse sa proie pour se nourrir.' },
      { e: '🐝', ask: ['L’abeille butine la fleur et transporte son pollen.', 'De quelle relation s’agit-il ?'], answer: 'une coopération', others: ['une prédation', 'une compétition'], says: 'Oui : l’abeille se nourrit, et elle aide la fleur à se reproduire.' },
      { ask: 'Qu’est-ce qu’une espèce invasive ?', answer: 'une espèce venue d’ailleurs qui envahit un milieu', others: ['une espèce qui a disparu', 'une espèce qui dort tout l’hiver'], says: 'Oui : par exemple, le frelon asiatique menace les abeilles en France.' },
      { e: '🐟', ask: 'Que se passe-t-il quand on pêche trop de poissons ?', answer: 'ils n’ont plus le temps de se reproduire', others: ['la mer devient plus salée', 'les poissons deviennent plus gros'], says: 'Oui : la surpêche fait diminuer les poissons et déséquilibre l’écosystème.' },
      { ask: 'Comment appelle-t-on un animal qui se nourrit de végétaux ?', answer: 'un herbivore', others: ['un carnivore', 'un producteur'], says: 'Oui : le lapin, la vache ou la chenille sont des herbivores.' },
      { ask: 'Si tous les lapins disparaissaient, que se passerait-il pour les renards ?', answer: 'ils auraient moins de nourriture', others: ['ils seraient plus nombreux', 'rien du tout'], says: 'Oui : dans un écosystème, les êtres vivants dépendent les uns des autres.' },
      { e: '🍂', ask: 'Qui transforme les feuilles mortes et les restes d’animaux en sels minéraux ?', answer: 'les décomposeurs', others: ['les prédateurs', 'les producteurs'], says: 'Oui : vers de terre, champignons et bactéries décomposent les restes.' },
      { e: '🌳', ask: 'Lequel de ces êtres vivants est un producteur ?', answer: 'le chêne', others: ['la chouette', 'le champignon'], says: 'Oui : le chêne, comme tous les végétaux verts, est un producteur.' },
      { e: '🌊', ask: 'Dans la mer, qu’est-ce qui se trouve souvent au début des chaînes alimentaires ?', answer: 'le plancton végétal', others: ['le requin', 'la baleine'], says: 'Oui : de minuscules algues, le plancton végétal, sont à la base de nombreuses chaînes alimentaires.' },
      { ask: ['La coccinelle mange les pucerons.', 'Pourquoi les jardiniers l’aiment-ils ?'], answer: 'elle protège les plantes', others: ['elle mange les fleurs', 'elle pollue le jardin'], says: 'Oui : en mangeant les pucerons, la coccinelle protège les plantes.' },
    ],
  },
  {
    nom: 'Le cerveau et les sens',
    emoji: '',
    questions: [
      { e: '👀', ask: 'Quel organe reçoit les informations de nos sens ?', answer: 'le cerveau', others: ['le cœur', 'l’estomac'], says: 'Oui : le cerveau reçoit et interprète ce que captent nos sens.' },
      { e: '🧠', ask: 'Par où circulent les messages entre le cerveau et le reste du corps ?', answer: 'par les nerfs', others: ['par les os', 'par les cheveux'], says: 'Oui : les nerfs transmettent les messages, très vite.' },
      { e: '🏃', ask: ['Tu décides de courir.', 'Qui commande tes muscles ?'], answer: 'le cerveau', others: ['les poumons', 'le cœur'], says: 'Oui : le cerveau envoie des messages aux muscles par les nerfs.' },
      { e: '😴', ask: 'Pourquoi le sommeil est-il important pour apprendre ?', answer: 'il aide à mémoriser', others: ['il efface ce qu’on a appris', 'il ne sert à rien'], says: 'Oui : pendant le sommeil, le cerveau range ce que tu as appris dans la journée.' },
      { e: '🧠', ask: 'Peut-on bien faire attention à deux choses en même temps ?', answer: 'non, l’attention se fixe sur une chose', others: ['oui, sans aucun problème', 'oui, plus on en fait, mieux c’est'], says: 'C’est ça : notre attention se concentre sur une seule tâche à la fois.' },
      { e: '👁️', ask: 'Qu’est-ce qu’une illusion d’optique ?', answer: 'une image qui trompe le cerveau', others: ['une maladie des yeux', 'une paire de lunettes'], says: 'Oui : le cerveau interprète ce que voient les yeux, et il peut se tromper.' },
      { e: '😴', ask: 'Où se forment nos rêves ?', answer: 'dans le cerveau', others: ['dans le cœur', 'dans l’oreiller'], says: 'Oui : en dormant, le cerveau continue de travailler : il crée les rêves.' },
      { e: '👁️', ask: 'Que transmet le nerf optique au cerveau ?', answer: 'ce que voient les yeux', others: ['les sons', 'les odeurs'], says: 'Oui : le nerf optique relie l’œil au cerveau.' },
      { e: '📚', ask: 'Qu’est-ce qui aide le plus à retenir une leçon ?', answer: 'la revoir plusieurs fois, et bien dormir', others: ['la lire une seule fois, très vite', 'l’apprendre devant la télévision'], says: 'Oui : répéter et dormir aident le cerveau à mémoriser.' },
      { ask: 'Qu’est-ce qui protège le cerveau ?', answer: 'le crâne', others: ['les côtes', 'les muscles des bras'], says: 'Oui : le crâne est une boîte d’os qui protège le cerveau.' },
      { e: '🚲', ask: 'Pourquoi porter un casque à vélo ?', answer: 'pour protéger sa tête et son cerveau', others: ['pour mieux entendre', 'pour avoir chaud'], says: 'Oui : en cas de chute, le casque protège la tête.' },
      { ask: ['Un objet arrive vite vers ton visage.', 'Quel réflexe protège tes yeux ?'], answer: 'cligner des yeux', others: ['éternuer', 'bâiller'], says: 'Oui : on cligne des yeux sans même y penser : c’est un réflexe.' },
      { e: '🔥', ask: ['Tu touches un objet brûlant et tu retires ta main très vite.', 'Comment appelle-t-on cela ?'], answer: 'un réflexe', others: ['une habitude', 'un rêve'], says: 'Oui : un réflexe est une réaction très rapide, qu’on ne décide pas.' },
      { e: '😨', ask: 'Qu’est-ce qui gère nos émotions, comme la peur ou la joie ?', answer: 'le cerveau', others: ['le cœur', 'les muscles'], says: 'Oui : les émotions naissent dans le cerveau, même si le cœur bat plus vite.' },
      { e: '📱', ask: 'Que peuvent faire les écrans regardés tard le soir ?', answer: 'retarder l’endormissement', others: ['faire dormir plus vite', 'améliorer la mémoire'], says: 'Oui : la lumière des écrans trompe le cerveau, qui croit qu’il fait encore jour.' },
      { e: '💬', ask: 'Comment appelle-t-on la capacité de parler et de comprendre les mots ?', answer: 'le langage', others: ['la digestion', 'la respiration'], says: 'Oui : le langage est une des grandes capacités du cerveau humain.' },
      { e: '✏️', ask: 'Pendant un contrôle, qu’est-ce qui aide à se concentrer ?', answer: 'éviter les distractions', others: ['écouter de la musique très fort', 'regarder par la fenêtre'], says: 'Oui : sans distraction, toute l’attention va vers le travail.' },
    ],
  },
  {
    nom: 'La Terre et les saisons',
    emoji: '🌍',
    questions: [
      { ask: 'En combien de temps la Terre fait-elle un tour sur elle-même ?', answer: 'environ 24 heures', others: ['environ 365 jours', 'environ une heure'], says: 'Oui : la Terre fait un tour sur elle-même en environ 24 heures.' },
      { ask: 'Qu’est-ce qui fait alterner le jour et la nuit ?', answer: 'la Terre qui tourne sur elle-même', others: ['le Soleil qui tourne autour de la Terre', 'les nuages qui cachent le Soleil'], says: 'Oui : la moitié de la Terre tournée vers le Soleil est dans le jour, l’autre dans la nuit.' },
      { e: '☀️', ask: 'En combien de temps la Terre fait-elle le tour du Soleil ?', answer: 'environ 365 jours et un quart', others: ['environ 24 heures', 'environ 29 jours'], says: 'Oui : c’est pourquoi on ajoute un jour, le 29 février, tous les quatre ans.' },
      { ask: 'Pourquoi y a-t-il des saisons ?', answer: 'l’axe de la Terre est penché', others: ['la Terre s’approche du Soleil en été', 'le Soleil brille plus fort en été'], says: 'Oui : comme son axe est penché, chaque moitié de la Terre reçoit plus ou moins de lumière selon la saison.' },
      { ask: 'En été, en France, la Terre est-elle plus près du Soleil ?', answer: 'non, elle en est même un peu plus loin', others: ['oui, beaucoup plus près', 'oui, elle le touche presque'], says: 'C’est ça : début juillet, la Terre est au plus loin du Soleil ; ce n’est pas la distance qui fait les saisons.' },
      { e: '🪐', ask: 'Combien de planètes tournent autour du Soleil ?', answer: '8', others: ['9', '12'], says: 'Oui : huit planètes ; Pluton est une planète naine depuis 2006.' },
      { e: '🪐', ask: 'Quelle est la planète la plus proche du Soleil ?', answer: 'Mercure', others: ['Vénus', 'Mars'], says: 'Oui : Mercure est la planète la plus proche du Soleil.' },
      { e: '🪐', ask: 'Quelle est la plus grosse planète du système solaire ?', answer: 'Jupiter', others: ['Saturne', 'la Terre'], says: 'Oui : Jupiter est une planète géante, la plus grosse du système solaire.' },
      { e: '☀️', ask: 'Qu’est-ce que le Soleil ?', answer: 'une étoile', others: ['une planète', 'un satellite'], says: 'Oui : le Soleil est une étoile, l’étoile la plus proche de nous.' },
      { ask: 'Quand c’est l’été en France, quelle saison est-ce en Australie ?', answer: 'l’hiver', others: ['l’été', 'le printemps'], says: 'Oui : les saisons sont inversées entre les deux moitiés de la Terre.' },
      { e: '🪐', ask: 'Quelle planète est la troisième à partir du Soleil ?', answer: 'la Terre', others: ['Mars', 'Vénus'], says: 'Oui : Mercure, Vénus, puis la Terre.' },
      { e: '🪐', ask: 'Quelle planète surnomme-t-on la planète rouge ?', answer: 'Mars', others: ['Vénus', 'Neptune'], says: 'Oui : le sol de Mars contient beaucoup d’oxyde de fer, comme la rouille.' },
      { e: '☀️', ask: 'En France, quand la journée est-elle la plus longue de l’année ?', answer: 'vers le 21 juin', others: ['vers le 21 décembre', 'vers le 1er janvier'], says: 'Oui : au solstice d’été, vers le 21 juin, la journée est la plus longue.' },
      { e: '☀️', ask: 'En hiver, en France, comment le Soleil monte-t-il dans le ciel ?', answer: 'moins haut qu’en été', others: ['plus haut qu’en été', 'tout droit au-dessus de nous'], says: 'Oui : en hiver, le Soleil reste bas et les journées sont courtes.' },
      { e: '☀️', ask: 'Pourquoi fait-il plus chaud en été ?', answer: 'le Soleil est plus haut et les jours plus longs', others: ['la Terre est plus près du Soleil', 'le Soleil est plus gros'], says: 'Oui : le Soleil chauffe plus longtemps et plus fort quand il est haut.' },
      { ask: 'Quelle planète a de grands anneaux bien visibles ?', answer: 'Saturne', others: ['Mercure', 'Mars'], says: 'Oui : les anneaux de Saturne sont faits de glace et de poussières.' },
      { e: '☀️', ask: 'Combien de temps la lumière du Soleil met-elle pour arriver jusqu’à la Terre ?', answer: 'environ 8 minutes', others: ['une seconde', 'une année'], says: 'Oui : la lumière du Soleil met environ huit minutes pour nous parvenir.' },
    ],
  },
  {
    nom: 'L’énergie',
    emoji: '⚡',
    questions: [
      { ask: 'Laquelle de ces sources d’énergie est renouvelable ?', answer: 'le vent', others: ['le pétrole', 'le charbon'], says: 'Oui : le vent ne s’épuise pas : c’est une énergie renouvelable.' },
      { ask: 'Laquelle de ces sources d’énergie n’est pas renouvelable ?', answer: 'le pétrole', others: ['le soleil', 'le vent'], says: 'Oui : le pétrole met des millions d’années à se former ; ses réserves s’épuisent.' },
      { ask: 'Pourquoi le charbon n’est-il pas une énergie renouvelable ?', answer: 'il met des millions d’années à se former', others: ['il pousse trop vite', 'il tombe du ciel'], says: 'Oui : on l’utilise bien plus vite qu’il ne se forme.' },
      { ask: 'Que transforme une éolienne en électricité ?', answer: 'la force du vent', others: ['l’énergie du pétrole', 'la chaleur du sol'], says: 'Oui : le vent fait tourner les pales de l’éolienne, qui produit de l’électricité.' },
      { ask: 'Que transforme un panneau photovoltaïque en électricité ?', answer: 'la lumière du soleil', others: ['la force du vent', 'le gaz'], says: 'Oui : les panneaux photovoltaïques produisent de l’électricité avec la lumière.' },
      { ask: 'Quel combustible utilise une centrale nucléaire ?', answer: 'l’uranium', others: ['le bois', 'le vent'], says: 'Oui : l’uranium est extrait de mines ; ce n’est pas une énergie renouvelable.' },
      { ask: 'En France, d’où vient la plus grande partie de l’électricité ?', answer: 'des centrales nucléaires', others: ['des centrales à charbon', 'des éoliennes'], says: 'Oui : en France, la plus grande partie de l’électricité vient des centrales nucléaires.' },
      { ask: 'Qu’utilise une centrale hydroélectrique ?', answer: 'la force de l’eau', others: ['la chaleur du charbon', 'la lumière de la Lune'], says: 'Oui : l’eau d’un barrage fait tourner des turbines qui produisent de l’électricité.' },
      { ask: 'Qu’est-ce que la géothermie ?', answer: 'utiliser la chaleur du sous-sol', others: ['utiliser la force du vent', 'brûler du charbon'], says: 'Oui : la chaleur de la Terre peut chauffer des maisons ou produire de l’électricité.' },
      { e: '🪵', ask: 'Le bois est-il une énergie renouvelable ?', answer: 'oui, si l’on replante des arbres', others: ['non, jamais', 'oui, car il ne brûle pas'], says: 'Oui : le bois est renouvelable si les forêts sont replantées et bien gérées.' },
      { e: '🏭', ask: 'Que rejette-t-on en brûlant du pétrole, du charbon ou du gaz ?', answer: 'du dioxyde de carbone', others: ['de l’oxygène pur', 'de l’eau potable'], says: 'Oui : ce gaz à effet de serre contribue au réchauffement climatique.' },
      { ask: 'Quel geste économise l’énergie en hiver ?', answer: 'baisser un peu le chauffage', others: ['ouvrir la fenêtre avec le chauffage allumé', 'laisser les appareils en veille'], says: 'Oui : un degré de moins, c’est déjà de l’énergie économisée.' },
      { e: '🚗', ask: 'De quoi une voiture électrique a-t-elle besoin pour rouler ?', answer: 'd’être rechargée', others: ['d’essence', 'de charbon'], says: 'Oui : on recharge sa batterie sur une borne ou une prise.' },
      { ask: 'À partir de quoi le pétrole s’est-il formé ?', answer: 'de restes de minuscules êtres vivants', others: ['d’eau de mer', 'de lave de volcan'], says: 'Oui : le pétrole s’est formé pendant des millions d’années, à partir de plancton enfoui.' },
      { e: '⛵', ask: 'Quelle énergie fait avancer un voilier ?', answer: 'le vent', others: ['le pétrole', 'l’électricité'], says: 'Oui : le vent pousse les voiles.' },
      { e: '🏃', ask: 'Où notre corps trouve-t-il l’énergie pour bouger ?', answer: 'dans les aliments', others: ['dans le pétrole', 'dans les piles'], says: 'Oui : les aliments apportent à notre corps l’énergie dont il a besoin.' },
      { ask: 'Le gaz naturel est-il une énergie renouvelable ?', answer: 'non, c’est une énergie fossile', others: ['oui, il se renouvelle chaque jour', 'oui, comme le vent'], says: 'C’est ça : comme le pétrole et le charbon, le gaz naturel est une énergie fossile.' },
    ],
  },
  {
    nom: 'Volcans, séismes et climat',
    emoji: '🌋',
    questions: [
      { ask: 'Comment appelle-t-on la roche fondue qui se trouve sous la surface de la Terre ?', answer: 'le magma', others: ['la lave', 'le cratère'], says: 'Oui : le magma est de la roche fondue, sous la surface.' },
      { ask: 'Comment appelle-t-on le magma qui sort du volcan ?', answer: 'la lave', others: ['le cratère', 'la cheminée'], says: 'Oui : en sortant du volcan, le magma devient la lave.' },
      { ask: 'Comment appelle-t-on l’ouverture au sommet du volcan ?', answer: 'le cratère', others: ['la cheminée', 'le magma'], says: 'Oui : la lave et les gaz sortent par le cratère.' },
      { ask: 'Comment appelle-t-on le moment où un volcan rejette de la lave, des gaz et des cendres ?', answer: 'une éruption', others: ['un séisme', 'une marée'], says: 'Oui : pendant une éruption, le volcan rejette de la lave, des gaz ou des cendres.' },
      { e: '🏚️', ask: 'Qu’est-ce qu’un séisme ?', answer: 'un tremblement de terre', others: ['une éruption de volcan', 'une tempête'], says: 'Oui : un séisme est un tremblement de terre.' },
      { e: '🏚️', ask: 'Comment mesure-t-on la force d’un séisme ?', answer: 'avec sa magnitude', others: ['avec un thermomètre', 'avec l’échelle de Beaufort'], says: 'Oui : plus la magnitude est élevée, plus le séisme est fort.' },
      { e: '🏚️', ask: 'Pendant un tremblement de terre, à l’intérieur, que faut-il faire ?', answer: 's’abriter sous une table solide', others: ['prendre l’ascenseur', 'courir dans l’escalier'], says: 'Oui : on s’abrite sous un meuble solide, loin des fenêtres.' },
      { e: '🏚️', ask: 'Après un séisme, pourquoi ne faut-il pas prendre l’ascenseur ?', answer: 'il peut être abîmé ou tomber en panne', others: ['il va trop vite', 'il est réservé aux pompiers'], says: 'Oui : on sort par l’escalier, dans le calme, quand les secousses sont finies.' },
      { e: '🌡️', ask: 'Quel mot désigne le temps qu’il fait sur une région pendant de longues années ?', answer: 'le climat', others: ['la météo', 'la saison'], says: 'Oui : la météo décrit le temps de quelques jours ; le climat, celui d’au moins trente ans.' },
      { e: '🌧️', ask: ['La radio annonce de la pluie pour demain.', 'Parle-t-elle du climat ?'], answer: 'non, de la météo', others: ['oui, du climat', 'non, d’un séisme'], says: 'C’est ça : la météo prévoit le temps des prochains jours.' },
      { e: '🌡️', ask: 'Qu’est-ce que le réchauffement climatique ?', answer: 'la hausse de la température moyenne de la Terre', others: ['un hiver un peu doux, une seule année', 'la chaleur d’un volcan'], says: 'Oui : depuis plus d’un siècle, la température moyenne de la Terre augmente.' },
      { e: '🏭', ask: 'Quels gaz renforcent l’effet de serre ?', answer: 'le dioxyde de carbone et le méthane', others: ['l’oxygène et l’azote', 'l’hélium et le néon'], says: 'Oui : ces gaz retiennent la chaleur autour de la Terre.' },
      { e: '🏭', ask: 'Quelle activité rejette beaucoup de gaz à effet de serre ?', answer: 'brûler du pétrole et du charbon', others: ['planter des arbres', 'marcher à pied'], says: 'Oui : brûler des énergies fossiles rejette du dioxyde de carbone.' },
      { e: '🌡️', ask: 'Quelle conséquence du réchauffement climatique observe-t-on ?', answer: 'les glaciers fondent', others: ['les glaciers grandissent partout', 'le niveau de la mer baisse'], says: 'Oui : les glaciers fondent et le niveau des océans monte.' },
      { ask: 'Où trouve-t-on un volcan actif en France ?', answer: 'sur l’île de La Réunion', others: ['en Bretagne', 'à Paris'], says: 'Oui : le piton de la Fournaise, à La Réunion, entre souvent en éruption.' },
      { ask: 'Les volcans de la chaîne des Puys, en Auvergne, sont-ils en activité ?', answer: 'non, ils sont endormis', others: ['oui, chaque année', 'oui, chaque semaine'], says: 'C’est ça : leur dernière éruption date de plusieurs milliers d’années.' },
      { e: '🌍', ask: 'Que peut-on faire pour limiter le réchauffement climatique ?', answer: 'consommer moins d’énergies fossiles', others: ['brûler plus de charbon', 'couper les forêts'], says: 'Oui : économiser l’énergie et utiliser des énergies renouvelables aide le climat.' },
      { e: '🌊', ask: 'Comment appelle-t-on une énorme vague provoquée par un séisme sous la mer ?', answer: 'un tsunami', others: ['une marée', 'un cyclone'], says: 'Oui : un tsunami peut traverser tout un océan.' },
    ],
  },
];

export const sciencesCm = {
  id: 'sciences-cm',
  domain: 'sciences',
  section: 'Sciences et technologie',
  title: 'Les sciences du CM',
  icon: '🧪',
  skill: 'Mélanges, lumière et ombres, la Lune, classer le vivant, naître et grandir ; écosystèmes, cerveau, Terre et saisons, énergie, volcans et climat',
  levels: SCIENCES.map((n) => n.nom),
  generate(level, rng) {
    return jouer('sciences-cm', SCIENCES, level, rng);
  },
};

export const CM_MONDE_GAMES = [histoire, geographie, republique, sciencesCm];
