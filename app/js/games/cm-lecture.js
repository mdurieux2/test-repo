// « Lire et comprendre », pour le cours moyen (programme de 2025) : des textes d'une dizaine de
// lignes, de genres différents (récit, conte, documentaire, poème, scène de théâtre, lettre), et des
// questions sur ce qui est écrit, sur ce qu'il faut deviner (l'implicite), sur le genre du texte, le
// sens d'un mot, qui parle, l'ordre des événements, le titre, ce que ressentent les personnages, et
// « vrai, faux ou on ne sait pas ». Textes écrits pour l'app, sans prénom.
// Chaque question : [genre de question, question, bonne réponse, mauvaises réponses].

import { pick, shuffle } from '../random.js';
import { textChoices } from './helpers.js';

const GENRES = { recit: 'un récit', poeme: 'un poème', theatre: 'une pièce de théâtre', documentaire: 'un texte documentaire', lettre: 'une lettre' };

export const TEXTES_CM = [
  {
    titre: 'Le gardien du phare', genre: 'recit',
    texte: 'Chaque soir, le vieux gardien montait les cent marches du phare pour allumer la grande lampe qui guidait les bateaux. '
      + 'Une nuit de tempête, la lampe s’éteignit d’un coup. Le gardien saisit sa lanterne, ouvrit la fenêtre malgré le vent et l’agita '
      + 'de toutes ses forces. Au loin, un petit bateau de pêche changea de cap juste avant les rochers. Le lendemain matin, un pêcheur '
      + 'trempé frappa à la porte du phare avec un panier de poissons.',
    questions: [
      ['explicite', 'Combien de marches le gardien montait-il chaque soir ?', 'cent', ['dix', 'mille']],
      ['implicite', 'Pourquoi le pêcheur apporte-t-il des poissons ?', 'pour remercier le gardien', ['pour les vendre au gardien', 'parce qu’il a trop pêché']],
      ['mot', 'Dans le texte, que veut dire « changea de cap » ?', 'changea de direction', ['s’arrêta', 'coula']],
      ['ordre', 'Que se passe-t-il juste après la panne de la lampe ?', 'Le gardien agite sa lanterne.', ['Le pêcheur frappe à la porte.', 'Le gardien monte les marches.']],
      ['sentiment', 'Que ressent sans doute le pêcheur pour le gardien ?', 'de la reconnaissance', ['de la colère', 'de l’ennui']],
      ['titre', 'Quel autre titre irait bien à ce texte ?', 'Une nuit de tempête', ['Le marché aux poissons', 'Des vacances au phare']],
      ['vf', 'Le gardien a un chien.', 'on ne sait pas', []], ['vf', 'La lampe s’est éteinte pendant une tempête.', 'vrai', []],
      ['vf', 'Le bateau de pêche a heurté les rochers.', 'faux', []],
    ],
  },
  {
    titre: 'Le manchot empereur', genre: 'documentaire',
    texte: 'Le manchot empereur vit en Antarctique, l’endroit le plus froid de la planète. C’est le plus grand des manchots : il mesure '
      + 'plus d’un mètre. Il ne vole pas, mais il nage très bien et peut plonger à plus de cinq cents mètres de profondeur. En hiver, la '
      + 'femelle pond un seul œuf. Pendant deux mois, le mâle le garde au chaud sur ses pattes, sans manger, pendant que la femelle part '
      + 'chercher de la nourriture en mer.',
    questions: [
      ['explicite', 'Où vit le manchot empereur ?', 'en Antarctique', ['au pôle Nord', 'en Afrique']],
      ['explicite', 'Combien d’œufs la femelle pond-elle ?', 'un seul', ['deux', 'cinq']],
      ['implicite', 'Pourquoi le mâle maigrit-il pendant l’hiver ?', 'parce qu’il ne mange pas pendant deux mois', ['parce qu’il nage trop', 'parce qu’il a trop froid']],
      ['mot', 'Dans le texte, que veut dire « profondeur » ?', 'la distance sous la surface de l’eau', ['la longueur du manchot', 'la vitesse du manchot']],
      ['genre', '', 'documentaire', []],
      ['vf', 'Le manchot empereur sait voler.', 'faux', []], ['vf', 'Le mâle garde l’œuf sur ses pattes.', 'vrai', []],
      ['vf', 'Les manchots aiment jouer dans la neige.', 'on ne sait pas', []],
      ['titre', 'Quel autre titre irait bien à ce texte ?', 'Un oiseau du grand froid', ['Les poissons de l’Antarctique', 'Les oiseaux qui volent']],
    ],
  },
  {
    titre: 'Le vent d’automne', genre: 'poeme',
    lignes: [
      'Le vent d’automne fait la ronde,', 'Il emporte les feuilles blondes ;', 'Les arbres tendent leurs bras nus', 'Vers les oiseaux qu’on ne voit plus.',
      'Dans le jardin, la pluie fredonne', 'Une chanson pour les personnes', 'Qui restent au chaud près du feu', 'En attendant le ciel bleu.',
    ],
    questions: [
      ['genre', '', 'poeme', []],
      ['explicite', 'Qui fait la ronde ?', 'le vent d’automne', ['les oiseaux', 'la pluie']],
      ['mot', 'Dans le poème, que veut dire « fredonne » ?', 'chante doucement', ['crie très fort', 'tombe sans bruit']],
      ['implicite', 'Pourquoi les arbres ont-ils « les bras nus » ?', 'parce qu’ils ont perdu leurs feuilles', ['parce qu’il fait chaud', 'parce qu’on les a coupés']],
      ['implicite', 'Pourquoi ne voit-on plus les oiseaux ?', 'parce qu’ils sont partis vers des pays chauds', ['parce qu’ils dorment', 'parce qu’il fait nuit']],
      ['sentiment', 'Quelle impression donne ce poème ?', 'une impression calme et un peu triste', ['une impression de colère', 'une impression de peur']],
    ],
  },
  {
    titre: 'Le renard et la poule', genre: 'theatre',
    lignes: [
      'LE RENARD. — Bonjour, Madame la Poule ! Quelle belle journée !', 'LA POULE. — Bonjour, Monsieur le Renard. Que faites-vous si près de mon poulailler ?',
      'LE RENARD. — Je me promène, voyons ! Je cueille des fleurs pour vous.', 'LA POULE, derrière le grillage. — Des fleurs ? Avec ces grandes dents ?',
      'LE RENARD, souriant. — Ce sont des dents… pour mieux sentir les fleurs !', 'LA POULE. — Hum ! Je préfère rester derrière mon grillage.',
    ],
    questions: [
      ['genre', '', 'theatre', []],
      ['qui', 'Qui dit : « Je me promène, voyons ! » ?', 'le renard', ['la poule', 'le fermier']],
      ['qui', 'Qui dit : « Avec ces grandes dents ? » ?', 'la poule', ['le renard', 'le fermier']],
      ['implicite', 'Que veut vraiment le renard ?', 'manger la poule', ['offrir des fleurs', 'se promener']],
      ['sentiment', 'Que ressent la poule ?', 'de la méfiance', ['de la joie', 'de la tristesse']],
      ['explicite', 'Où reste la poule ?', 'derrière le grillage', ['dans les fleurs', 'chez le renard']],
      ['vf', 'Le renard apporte vraiment des fleurs.', 'on ne sait pas', []], ['vf', 'La poule sort du poulailler.', 'faux', []],
    ],
  },
  {
    titre: 'Le retour du seigneur', genre: 'recit',
    texte: 'Le guetteur aperçut un nuage de poussière sur la route. « Des cavaliers ! » cria-t-il. Aussitôt, les paysans quittèrent leurs '
      + 'champs et se réfugièrent derrière les remparts. On releva le pont-levis. Dans la cour, les forgerons distribuèrent des lances. '
      + 'Mais quand les cavaliers approchèrent, on reconnut les couleurs du seigneur, qui revenait de la croisade. Ce soir-là, un grand '
      + 'festin fut servi dans la salle du château.',
    questions: [
      ['explicite', 'Que fait-on pour protéger le château ?', 'on relève le pont-levis', ['on ouvre les portes', 'on allume un feu']],
      ['implicite', 'Pourquoi les paysans se réfugient-ils derrière les remparts ?', 'parce qu’ils ont peur d’une attaque', ['parce qu’il pleut', 'pour voir le seigneur']],
      ['ordre', 'Que se passe-t-il en dernier ?', 'Un festin est servi.', ['On relève le pont-levis.', 'Le guetteur crie.']],
      ['mot', 'Dans le texte, que veut dire « se réfugièrent » ?', 'allèrent se mettre à l’abri', ['allèrent se battre', 'allèrent se reposer']],
      ['qui', 'Qui crie : « Des cavaliers ! » ?', 'le guetteur', ['le seigneur', 'un paysan']],
      ['sentiment', 'Que ressentent sans doute les habitants à la fin ?', 'du soulagement', ['de la peur', 'de la colère']],
      ['vf', 'Les cavaliers étaient des ennemis.', 'faux', []], ['vf', 'Le seigneur revenait de la croisade.', 'vrai', []],
      ['vf', 'Le festin avait lieu dans la cour.', 'faux', []], ['vf', 'Le château avait trois tours.', 'on ne sait pas', []],
    ],
  },
  {
    titre: 'Une lettre de colonie', genre: 'lettre',
    lignes: [
      'Chers parents,', 'Je vous écris du chalet de la colonie. Hier, nous avons marché jusqu’au lac. L’eau était si froide que personne n’a osé se baigner, sauf le moniteur !',
      'Le soir, nous avons fait griller des châtaignes. Mon voisin de lit ronfle un peu, mais il est très drôle. Je dors bien quand même.',
      'Demain, nous visitons une fromagerie. Vous me manquez, mais je m’amuse beaucoup.', 'Je vous embrasse très fort.',
    ],
    questions: [
      ['genre', '', 'lettre', []],
      ['explicite', 'Qui s’est baigné dans le lac ?', 'le moniteur', ['personne', 'tous les enfants']],
      ['implicite', 'Où la colonie se trouve-t-elle sans doute ?', 'à la montagne', ['au bord de la mer', 'dans une grande ville']],
      ['sentiment', 'Comment se sent l’enfant qui écrit ?', 'heureux, même si ses parents lui manquent', ['très triste', 'en colère']],
      ['ordre', 'Qu’ont fait les enfants le soir ?', 'Ils ont grillé des châtaignes.', ['Ils ont visité une fromagerie.', 'Ils se sont baignés.']],
      ['vf', 'L’enfant n’arrive pas à dormir.', 'faux', []], ['vf', 'Demain, les enfants visitent une fromagerie.', 'vrai', []],
      ['vf', 'Le moniteur a eu froid.', 'on ne sait pas', []],
    ],
  },
  {
    titre: 'Les volcans', genre: 'documentaire',
    texte: 'Un volcan est une montagne d’où sort parfois de la lave. Sous nos pieds, à plusieurs dizaines de kilomètres, les roches sont '
      + 'si chaudes qu’elles fondent : c’est le magma. Quand il remonte jusqu’à la surface, il s’appelle la lave. Certains volcans crachent '
      + 'des cendres et des blocs de lave : ce sont des volcans explosifs. D’autres laissent couler des rivières de lave. En France, les '
      + 'volcans d’Auvergne sont endormis depuis des milliers d’années.',
    questions: [
      ['explicite', 'Comment s’appelle la roche fondue sous la terre ?', 'le magma', ['la cendre', 'le sable']],
      ['genre', '', 'documentaire', []],
      ['implicite', 'Pourquoi les volcans d’Auvergne ne sont-ils pas dangereux aujourd’hui ?', 'parce qu’ils sont endormis depuis longtemps', ['parce qu’ils sont trop petits', 'parce qu’ils sont sous la mer']],
      ['mot', 'Dans le texte, que veut dire « crachent » ?', 'projettent avec force', ['avalent', 'cachent']],
      ['titre', 'Quel autre titre irait bien à ce texte ?', 'Des montagnes de feu', ['Les montagnes enneigées', 'Le voyage de l’eau']],
      ['vf', 'Les volcans d’Auvergne sont en éruption.', 'faux', []], ['vf', 'Le magma devient de la lave à la surface.', 'vrai', []],
      ['vf', 'Il y a des volcans sous la mer.', 'on ne sait pas', []],
    ],
  },
  {
    titre: 'La soupe au caillou', genre: 'recit',
    texte: 'Un soldat affamé arriva dans un village. Personne ne voulait partager son repas. Alors le soldat sortit un caillou de sa poche : '
      + '« Je vais vous préparer une soupe au caillou ! » Curieux, les villageois apportèrent une marmite d’eau. « Elle serait meilleure avec '
      + 'une carotte », dit le soldat. Une femme apporta des carottes. Un vieillard ajouta des poireaux, un enfant des pommes de terre. '
      + 'Bientôt, tout le village partagea la meilleure soupe de son histoire.',
    questions: [
      ['implicite', 'Pourquoi le soldat parle-t-il d’une soupe au caillou ?', 'pour que chacun apporte un peu de nourriture', ['parce que les cailloux sont bons', 'pour faire peur aux villageois']],
      ['implicite', 'Que nous apprend cette histoire ?', 'qu’en partageant, on a plus', ['qu’il faut garder sa nourriture', 'que les cailloux se mangent']],
      ['explicite', 'Qu’apporte la femme ?', 'des carottes', ['des poireaux', 'des pommes de terre']],
      ['ordre', 'Que se passe-t-il en premier ?', 'Le soldat arrive dans un village.', ['Une femme apporte des carottes.', 'Le village partage la soupe.']],
      ['sentiment', 'Que ressentent les villageois au début de l’histoire ?', 'de la méfiance', ['de la joie', 'de la peur du soldat']],
      ['qui', 'Qui dit : « Elle serait meilleure avec une carotte » ?', 'le soldat', ['la femme', 'un vieillard']],
      ['vf', 'Le soldat avait très faim.', 'vrai', []], ['vf', 'Le vieillard apporta des carottes.', 'faux', []],
      ['vf', 'Le soldat repartit le lendemain.', 'on ne sait pas', []],
    ],
  },
  {
    titre: 'Le voyage de l’eau', genre: 'documentaire',
    texte: 'L’eau ne disparaît jamais vraiment : elle voyage. Chauffée par le Soleil, l’eau des océans s’évapore et monte dans le ciel '
      + 'sous forme de vapeur. En altitude, l’air est froid : la vapeur se transforme en minuscules gouttelettes qui forment les nuages. '
      + 'Quand les gouttes deviennent trop lourdes, elles tombent : c’est la pluie, ou la neige s’il fait très froid. L’eau ruisselle '
      + 'ensuite jusqu’aux rivières, qui la ramènent à la mer. Et le voyage recommence !',
    questions: [
      ['explicite', 'Qu’est-ce qui chauffe l’eau des océans ?', 'le Soleil', ['le vent', 'les nuages']],
      ['mot', 'Dans le texte, que veut dire « ruisselle » ?', 'coule sur le sol', ['s’évapore', 'gèle']],
      ['ordre', 'Que se passe-t-il juste après l’évaporation ?', 'La vapeur monte dans le ciel.', ['La pluie tombe.', 'Les rivières ramènent l’eau à la mer.']],
      ['titre', 'Quel autre titre irait bien à ce texte ?', 'Le cycle de l’eau', ['La pêche en mer', 'Les vacances à la plage']],
      ['genre', '', 'documentaire', []],
      ['vf', 'La pluie tombe quand les gouttes sont trop lourdes.', 'vrai', []], ['vf', 'Les nuages sont faits de fumée.', 'faux', []],
      ['vf', 'Il pleut plus en hiver qu’en été.', 'on ne sait pas', []],
    ],
  },
  {
    titre: 'La mer', genre: 'poeme',
    lignes: [
      'La mer est un grand drap bleu', 'Que le vent froisse un peu ;', 'Les mouettes y font des taches blanches,', 'Les bateaux y dorment le dimanche.',
      'Quand vient le soir, elle s’endort,', 'Et la lune y pose un bateau d’or.',
    ],
    questions: [
      ['genre', '', 'poeme', []],
      ['mot', 'Dans le poème, que veut dire « froisse » ?', 'fait des plis', ['repasse', 'colore']],
      ['implicite', 'Que peut être le « bateau d’or » posé par la lune ?', 'le reflet de la lune sur l’eau', ['un vrai bateau en or', 'un bateau de pêche']],
      ['explicite', 'Que font les mouettes ?', 'des taches blanches', ['des vagues', 'des nuages']],
      ['implicite', 'À quoi le poète compare-t-il la mer ?', 'à un grand drap', ['à un bateau', 'à une mouette']],
      ['vf', 'Dans le poème, les bateaux dorment le dimanche.', 'vrai', []], ['vf', 'Le poème parle d’une tempête.', 'faux', []],
    ],
  },
  {
    titre: 'Le chat du tableau', genre: 'theatre',
    lignes: [
      'LE MAÎTRE. — Qui a dessiné ce chat sur le tableau ?', 'LA CLASSE, tous ensemble. — Ce n’est pas nous !',
      'LE MAÎTRE, sévère. — Alors, ce chat s’est dessiné tout seul ?', 'UNE ÉLÈVE, timidement. — Peut-être qu’il est magique…',
      'LE MAÎTRE, souriant malgré lui. — Magique ? Alors il pourra aussi s’effacer tout seul… pendant la récréation !', 'TOUS. — Oh non !',
    ],
    questions: [
      ['genre', '', 'theatre', []],
      ['qui', 'Qui dit : « Peut-être qu’il est magique… » ?', 'une élève', ['le maître', 'toute la classe']],
      ['qui', 'Qui dit : « Ce n’est pas nous ! » ?', 'toute la classe', ['le maître', 'une élève']],
      ['implicite', 'Que devront sans doute faire les élèves pendant la récréation ?', 'effacer le dessin', ['dessiner un chien', 'chercher un chat']],
      ['sentiment', 'Comment est le maître à la fin de la scène ?', 'amusé', ['furieux', 'effrayé']],
      ['vf', 'Le maître sait qui a dessiné le chat.', 'faux', []], ['vf', 'Le chat est vraiment magique.', 'on ne sait pas', []],
    ],
  },
  {
    titre: 'Le nouveau', genre: 'recit',
    texte: 'Le jour de la rentrée, le nouveau resta seul près du portail. Il serrait les bretelles de son cartable et regardait ses '
      + 'chaussures. Personne ne le connaissait. Soudain, un ballon roula jusqu’à ses pieds. Une fille de la classe lui fit un signe : '
      + '« Tu viens jouer avec nous ? » Le garçon hésita, puis il donna un grand coup de pied dans le ballon. À la fin de la récréation, '
      + 'il avait déjà trois amis.',
    questions: [
      ['sentiment', 'Comment se sent le garçon au début ?', 'intimidé', ['joyeux', 'en colère']],
      ['sentiment', 'Comment se sent-il sans doute à la fin ?', 'content', ['inquiet', 'fâché']],
      ['implicite', 'Pourquoi regarde-t-il ses chaussures ?', 'parce qu’il est timide', ['parce qu’elles sont sales', 'parce qu’il a perdu un lacet']],
      ['explicite', 'Qu’est-ce qui roule jusqu’à ses pieds ?', 'un ballon', ['un cartable', 'une bille']],
      ['qui', 'Qui dit : « Tu viens jouer avec nous ? » ?', 'une fille de la classe', ['le maître', 'le nouveau']],
      ['titre', 'Quel autre titre irait bien à ce texte ?', 'Trois amis en une récréation', ['Le ballon perdu', 'Les chaussures neuves']],
      ['vf', 'Le garçon connaissait tout le monde.', 'faux', []], ['vf', 'À la fin, il a trois amis.', 'vrai', []],
      ['vf', 'Le garçon adore le football.', 'on ne sait pas', []],
    ],
  },
  {
    titre: 'Le système solaire', genre: 'documentaire',
    texte: 'Le Soleil est une étoile. Huit planètes tournent autour de lui. Les quatre plus proches, Mercure, Vénus, la Terre et Mars, '
      + 'sont faites de roches. Les quatre plus lointaines, Jupiter, Saturne, Uranus et Neptune, sont des géantes faites surtout de gaz. '
      + 'La Terre met un an pour faire le tour du Soleil, et un jour pour tourner sur elle-même. C’est pour cela que nous avons le jour et la nuit.',
    questions: [
      ['explicite', 'Combien de planètes tournent autour du Soleil ?', 'huit', ['neuf', 'quatre']],
      ['explicite', 'Combien de temps la Terre met-elle pour faire le tour du Soleil ?', 'un an', ['un jour', 'un mois']],
      ['implicite', 'Pourquoi fait-il nuit chez nous chaque soir ?', 'parce que la Terre tourne sur elle-même', ['parce que le Soleil s’éteint', 'parce que la Lune cache le Soleil']],
      ['genre', '', 'documentaire', []],
      ['vf', 'Le Soleil est une planète.', 'faux', []], ['vf', 'Jupiter est faite surtout de gaz.', 'vrai', []], ['vf', 'Il y a de la vie sur Mars.', 'on ne sait pas', []],
    ],
  },
];

const TOUTES = ['explicite', 'implicite', 'genre', 'mot', 'qui', 'ordre', 'titre', 'sentiment', 'vf'];
// niveaux 1 à 9 : une sorte de question chacun ; niveau 10 : toutes
const NIVEAUX = [null, ...TOUTES.map((g) => [g]), TOUTES];
const VF = ['vrai', 'faux', 'on ne sait pas'];

function questionLecture(level, rng) {
  const genres = NIVEAUX[level];
  const candidats = TEXTES_CM.flatMap((t) => t.questions.filter(([g]) => genres.includes(g)).map((q) => [t, q]));
  const [t, [genre, question, reponse, autres]] = pick(rng, candidats);
  const stage = { type: 'text', title: genre === 'titre' ? null : t.titre, ...(t.lignes ? { lines: t.lignes } : { text: t.texte }) };
  const base = { key: `lecture-cm:${level}:${t.titre}:${genre}:${question}`, stage, short: { key: `lecture-cm:${genre}`, text: 'Lis le texte, puis réponds.' } };
  if (genre === 'genre') {
    const options = Object.keys(GENRES).filter((g) => g !== 'lettre' || t.genre === 'lettre');
    const consigne = 'Quel genre de texte est-ce ?';
    return {
      ...base,
      text: consigne,
      instruction: ['Lis le texte.', consigne],
      choices: options.map((g) => ({ value: g, label: GENRES[g] })),
      choiceStyle: 'sentences',
      answer: reponse,
      success: { speak: `Oui, c’est ${GENRES[reponse]}.` },
    };
  }
  if (genre === 'vf') {
    const consigne = 'Vrai, faux, ou on ne sait pas ?';
    return {
      ...base,
      text: `${question} ${consigne}`,
      instruction: ['Lis le texte, puis la phrase.', question, consigne],
      replay: [question, consigne],
      choices: textChoices(VF),
      choiceStyle: 'sentences',
      answer: reponse,
      success: { speak: reponse === 'vrai' ? 'Oui, c’est vrai : c’est écrit dans le texte.' : reponse === 'faux' ? 'Oui, c’est faux : le texte dit autre chose.' : 'Oui, on ne sait pas : le texte n’en parle pas.' },
    };
  }
  const options = shuffle(rng, [reponse, ...autres]);
  return {
    ...base,
    text: question,
    instruction: ['Lis le texte, puis réponds à la question.', question],
    replay: [question],
    choices: textChoices(options),
    choiceStyle: 'sentences',
    answer: reponse,
    success: { speak: `Oui : ${reponse}${/[.!?]$/.test(reponse) ? '' : '.'}` },
  };
}

export const lectureCm = {
  id: 'lecture-cm',
  domain: 'histoires',
  section: 'Lire',
  title: 'Lire et comprendre',
  icon: '📗',
  skill: 'Comprendre un texte : ce qui est écrit, ce qu’il faut deviner, le genre, le sens des mots, les personnages',
  levels: [
    'Ce que dit le texte', 'Lire entre les lignes', 'Quel genre de texte ?', 'Le sens d’un mot', 'Qui parle ?',
    'L’ordre des événements', 'Le titre du texte', 'Ce que ressent le personnage', 'Vrai, faux, on ne sait pas', 'Grand mélange',
  ],
  generate(level, rng) {
    return questionLecture(level, rng);
  },
};
