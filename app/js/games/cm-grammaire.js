// Grammaire et orthographe du cours moyen (programme de 2025) :
//  - « La phrase et ses fonctions » : le verbe conjugué, le sujet, les types et formes de phrases, la
//    nature des mots, compléments d'objet et circonstanciels, COD et COI (CM1) ; compléments
//    circonstanciels de temps, de lieu et de cause, attribut du sujet, épithète et complément du nom,
//    phrase simple ou complexe (CM2) ;
//  - « Accords et homophones » : les accords dans le groupe nominal, le verbe et son sujet, le participe
//    passé avec être, les homophones grammaticaux (CM1) ; le sujet inversé, l'attribut, le participe
//    passé avec avoir (CM2). Les homophones ne sont pas listés par le programme : on les travaille
//    au CM, comme les manuels.
// Le mot ou le groupe dont on parle est souligné (stage.mark). Phrases fixes, sans prénom.

import { pick, sample, shuffle } from '../random.js';
import { textChoices } from './helpers.js';

const nbsp = (text) => text.replace(/ ([?!:;])/g, ' $1');
const styleFor = (labels) => (labels.some((l) => l.length > 12) ? 'sentences' : 'words');
const capitalize = (text) => `${text[0].toUpperCase()}${text.slice(1)}`;
/** « nom, verbe, adjectif ou pronom » : les réponses lues à voix haute. */
const enListe = (labels) => (labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} ou ${labels.at(-1)}`);

// ================================================================ La phrase et ses fonctions

// Niveau 1 : [phrase, verbe conjugué, autres mots de la phrase]
const VERBES = [
  ['Chaque matin, le boulanger prépare des croissants.', 'prépare', ['matin', 'boulanger', 'croissants']],
  ['Pour traverser la rivière, les randonneurs cherchent un pont.', 'cherchent', ['traverser', 'rivière', 'randonneurs']],
  ['Le petit chat dort sur le canapé.', 'dort', ['petit', 'chat', 'canapé']],
  ['Demain, nous visiterons le château fort.', 'visiterons', ['Demain', 'château', 'fort']],
  ['Les hirondelles construisent leur nid sous le toit.', 'construisent', ['hirondelles', 'nid', 'toit']],
  ['Autrefois, les enfants allaient à l’école à pied.', 'allaient', ['Autrefois', 'enfants', 'école']],
  ['Le chanteur a enregistré un nouvel album.', 'a enregistré', ['chanteur', 'nouvel', 'album']],
  ['Sous la neige, les marmottes hibernent jusqu’au printemps.', 'hibernent', ['neige', 'marmottes', 'printemps']],
  ['Les élèves écoutent attentivement la conteuse.', 'écoutent', ['élèves', 'attentivement', 'conteuse']],
  ['Pendant la tempête, le vent soufflait très fort.', 'soufflait', ['tempête', 'vent', 'fort']],
  ['Mon grand-père répare une vieille horloge.', 'répare', ['grand-père', 'vieille', 'horloge']],
  ['Le soir, la chouette chasse les souris.', 'chasse', ['soir', 'chouette', 'souris']],
  ['Les bateaux rentrent au port avant l’orage.', 'rentrent', ['bateaux', 'port', 'orage']],
  ['Au marché, ma tante choisit des tomates bien mûres.', 'choisit', ['marché', 'tomates', 'mûres']],
  ['Le dragon garde un trésor caché dans sa grotte.', 'garde', ['dragon', 'trésor', 'caché']],
  ['Les touristes photographient la cathédrale.', 'photographient', ['touristes', 'cathédrale', 'la']],
  ['Ce livre raconte la vie d’un explorateur.', 'raconte', ['livre', 'vie', 'explorateur']],
  ['Le train partira dans dix minutes.', 'partira', ['train', 'dix', 'minutes']],
  ['Pour réussir, il faut beaucoup travailler.', 'faut', ['réussir', 'beaucoup', 'travailler']],
  ['Les pompiers ont éteint le feu de forêt.', 'ont éteint', ['pompiers', 'feu', 'forêt']],
];
// Niveau 2 : [phrase, sujet, autres groupes de la phrase]
const SUJETS = [
  ['Chaque matin, le facteur distribue le courrier.', 'le facteur', ['Chaque matin', 'le courrier']],
  ['Dans la cour, les élèves de CM1 jouent au ballon.', 'les élèves de CM1', ['Dans la cour', 'au ballon']],
  ['Elle prépare un exposé sur les volcans.', 'Elle', ['un exposé', 'sur les volcans']],
  ['Ce soir, mon frère et ma sœur regardent un film.', 'mon frère et ma sœur', ['Ce soir', 'un film']],
  ['Le chien de nos voisins aboie toute la nuit.', 'Le chien de nos voisins', ['nos voisins', 'toute la nuit']],
  ['Depuis ce matin, la neige tombe sur la ville.', 'la neige', ['Depuis ce matin', 'sur la ville']],
  ['Les abeilles fabriquent le miel dans la ruche.', 'Les abeilles', ['le miel', 'dans la ruche']],
  ['Nous partirons en vacances la semaine prochaine.', 'Nous', ['en vacances', 'la semaine prochaine']],
  ['Hier, les joueurs de l’équipe ont gagné la finale.', 'les joueurs de l’équipe', ['Hier', 'la finale']],
  ['Depuis longtemps, cette vieille maison appartient à mes grands-parents.', 'cette vieille maison', ['Depuis longtemps', 'à mes grands-parents']],
  ['Ils ont planté des tomates dans le potager.', 'Ils', ['des tomates', 'dans le potager']],
  ['Sur la branche, un petit oiseau chante sa chanson.', 'un petit oiseau', ['Sur la branche', 'sa chanson']],
  ['Tous les dimanches, mes cousins viennent déjeuner.', 'mes cousins', ['Tous les dimanches', 'déjeuner']],
  ['Ce soir, le vent du nord souffle sur la plage.', 'le vent du nord', ['Ce soir', 'sur la plage']],
  ['Vous lirez ce roman pendant les vacances.', 'Vous', ['ce roman', 'pendant les vacances']],
  ['La maîtresse et le directeur organisent une sortie.', 'La maîtresse et le directeur', ['une sortie', 'le directeur']],
  ['À midi, les élèves de la classe mangent à la cantine.', 'les élèves de la classe', ['À midi', 'à la cantine']],
  ['Le soir, ce jeu de société amuse toute la famille.', 'ce jeu de société', ['Le soir', 'toute la famille']],
];
// Niveau 3 : [phrase, type] ou [phrase, forme]
const TYPES = [
  ['Range ta chambre avant le dîner.', 'impérative'], ['Ne cours pas dans le couloir.', 'impérative'],
  ['Ferme la porte, s’il te plaît.', 'impérative'], ['Prenez votre cahier rouge.', 'impérative'], ['Écoutez bien la consigne.', 'impérative'],
  ['Mange-t-il des légumes ?', 'interrogative'], ['Est-ce que tu viens au parc ?', 'interrogative'], ['Où habitent tes cousins ?', 'interrogative'],
  ['Pourquoi le ciel est-il bleu ?', 'interrogative'], ['Quand partirons-nous ?', 'interrogative'],
  ['Le train arrive à huit heures.', 'déclarative'], ['Les tortues vivent très longtemps.', 'déclarative'],
  ['Je n’aime pas les épinards.', 'déclarative'], ['Il pleut depuis ce matin.', 'déclarative'], ['Nous irons à la mer cet été.', 'déclarative'],
];
const FORMES = [
  ['Je ne mange jamais de viande.', 'négative'], ['Il n’y a plus de pain.', 'négative'], ['Personne n’est venu.', 'négative'],
  ['Nous ne sommes pas en retard.', 'négative'], ['Tu ne cours pas assez vite.', 'négative'], ['Le gâteau n’est pas encore cuit.', 'négative'],
  ['Le gâteau est délicieux.', 'affirmative'], ['Elle aime beaucoup lire.', 'affirmative'], ['Ils jouent souvent au football.', 'affirmative'],
  ['Nous avons encore du temps.', 'affirmative'], ['Le magasin ouvre à neuf heures.', 'affirmative'], ['Tu as toujours raison.', 'affirmative'],
];
// Niveau 4 : [phrase, mot, nature]
const NATURES = ['nom', 'verbe', 'adjectif', 'déterminant', 'pronom', 'adverbe', 'conjonction de coordination'];
const MOTS = [
  ['Le chat noir dort sur le canapé.', 'noir', 'adjectif'], ['Le chat noir dort sur le canapé.', 'dort', 'verbe'],
  ['Le chat noir dort sur le canapé.', 'Le', 'déterminant'], ['Les enfants marchent lentement.', 'lentement', 'adverbe'],
  ['Elle lit un roman policier.', 'Elle', 'pronom'], ['Il fait froid mais il fait beau.', 'mais', 'conjonction de coordination'],
  ['Mon oncle répare la voiture.', 'Mon', 'déterminant'], ['Mon oncle répare la voiture.', 'oncle', 'nom'],
  ['Ces fleurs sont magnifiques.', 'Ces', 'déterminant'], ['Ces fleurs sont magnifiques.', 'magnifiques', 'adjectif'],
  ['Nous partons demain.', 'demain', 'adverbe'], ['Nous partons demain.', 'Nous', 'pronom'],
  ['Tu veux du thé ou du chocolat ?', 'ou', 'conjonction de coordination'], ['Le renard rusé observe les poules.', 'rusé', 'adjectif'],
  ['Le renard rusé observe les poules.', 'observe', 'verbe'], ['Le renard rusé observe les poules.', 'poules', 'nom'],
  ['Le bébé dort, donc nous parlons doucement.', 'donc', 'conjonction de coordination'],
  ['Le bébé dort, donc nous parlons doucement.', 'doucement', 'adverbe'], ['Ils mangent toujours à midi.', 'toujours', 'adverbe'],
  ['Je les vois souvent.', 'les', 'pronom'], ['Je regarde les étoiles.', 'les', 'déterminant'], ['Leur maison est grande.', 'Leur', 'déterminant'],
  ['Notre chien adore courir.', 'courir', 'verbe'], ['La neige tombe et le vent souffle.', 'et', 'conjonction de coordination'],
  ['La neige tombe et le vent souffle.', 'neige', 'nom'], ['Mes amis me prêtent leurs livres.', 'me', 'pronom'],
];
// Niveau 5 : [phrase, groupe, 'objet' | 'circonstanciel']
const OBJET_CIRC = [
  ['Le jardinier arrose les fleurs le soir.', 'les fleurs', 'objet'], ['Le jardinier arrose les fleurs le soir.', 'le soir', 'circonstanciel'],
  ['Dans la forêt, nous avons vu un cerf.', 'Dans la forêt', 'circonstanciel'], ['Dans la forêt, nous avons vu un cerf.', 'un cerf', 'objet'],
  ['Ma sœur téléphone à sa meilleure amie.', 'à sa meilleure amie', 'objet'], ['Les élèves écrivent une lettre au maire.', 'une lettre', 'objet'],
  ['Les élèves écrivent une lettre au maire.', 'au maire', 'objet'], ['Pendant les vacances, je lis beaucoup de livres.', 'Pendant les vacances', 'circonstanciel'],
  ['Pendant les vacances, je lis beaucoup de livres.', 'beaucoup de livres', 'objet'], ['Le chat dort sur le canapé.', 'sur le canapé', 'circonstanciel'],
  ['Nous parlons de notre voyage.', 'de notre voyage', 'objet'], ['À cause de la pluie, le match est annulé.', 'À cause de la pluie', 'circonstanciel'],
  ['Le chef prépare un gâteau pour la fête.', 'un gâteau', 'objet'], ['Le chef prépare un gâteau pour la fête.', 'pour la fête', 'circonstanciel'],
  ['Chaque été, mes parents louent une maison.', 'Chaque été', 'circonstanciel'], ['Chaque été, mes parents louent une maison.', 'une maison', 'objet'],
  ['Le chien obéit à son maître.', 'à son maître', 'objet'], ['Nous mangeons des crêpes le dimanche.', 'le dimanche', 'circonstanciel'],
];
// Niveau 6 : [phrase, groupe, 'COD' | 'COI']
const COD_COI = [
  ['Le facteur apporte une lettre.', 'une lettre', 'COD'], ['Le facteur parle au voisin.', 'au voisin', 'COI'],
  ['Je pense à mes vacances.', 'à mes vacances', 'COI'], ['Nous regardons les étoiles.', 'les étoiles', 'COD'],
  ['Les enfants obéissent à leurs parents.', 'à leurs parents', 'COI'], ['Il se souvient de son enfance.', 'de son enfance', 'COI'],
  ['Elle mange une pomme.', 'une pomme', 'COD'], ['Le chien ronge un os.', 'un os', 'COD'], ['Tu ressembles à ton père.', 'à ton père', 'COI'],
  ['Je doute de son histoire.', 'de son histoire', 'COI'], ['Les élèves écoutent la maîtresse.', 'la maîtresse', 'COD'],
  ['Mon frère joue du piano.', 'du piano', 'COI'], ['Les enfants construisent une cabane.', 'une cabane', 'COD'],
  ['Nous parlons de nos projets.', 'de nos projets', 'COI'], ['Le pêcheur attrape un poisson.', 'un poisson', 'COD'],
  ['Ils téléphonent à leur grand-mère.', 'à leur grand-mère', 'COI'], ['Je cherche mes lunettes.', 'mes lunettes', 'COD'],
  ['Elle rêve d’un voyage en Islande.', 'd’un voyage en Islande', 'COI'],
];
// Niveau 7 : [phrase, groupe, 'temps' | 'lieu' | 'cause']
const CIRC = [
  ['Le soir, les hiboux chassent.', 'Le soir', 'temps'], ['Les hiboux chassent dans la forêt.', 'dans la forêt', 'lieu'],
  ['À cause du brouillard, l’avion est en retard.', 'À cause du brouillard', 'cause'], ['Nous partirons à l’aube.', 'à l’aube', 'temps'],
  ['Sous le pont, un pêcheur attend.', 'Sous le pont', 'lieu'], ['Grâce à ton aide, j’ai réussi.', 'Grâce à ton aide', 'cause'],
  ['Elle tremble de froid.', 'de froid', 'cause'], ['Pendant la nuit, il a neigé.', 'Pendant la nuit', 'temps'],
  ['Les enfants jouent derrière la maison.', 'derrière la maison', 'lieu'],
  ['Le magasin est fermé parce que c’est dimanche.', 'parce que c’est dimanche', 'cause'],
  ['Au Moyen Âge, les seigneurs vivaient dans des châteaux.', 'Au Moyen Âge', 'temps'],
  ['Au Moyen Âge, les seigneurs vivaient dans des châteaux.', 'dans des châteaux', 'lieu'], ['En hiver, les marmottes dorment.', 'En hiver', 'temps'],
  ['Par peur du loup, les moutons restent groupés.', 'Par peur du loup', 'cause'], ['Le bateau navigue au large des côtes.', 'au large des côtes', 'lieu'],
  ['Depuis deux heures, la pluie tombe.', 'Depuis deux heures', 'temps'], ['Le match est annulé à cause de l’orage.', 'à cause de l’orage', 'cause'],
  ['Les touristes se promènent sur les remparts.', 'sur les remparts', 'lieu'],
];
// Niveau 8 : [phrase, groupe, 'attribut' | 'COD']
const ATTRIBUT_COD = [
  ['Le ciel devient gris.', 'gris', 'attribut'], ['Ma sœur est infirmière.', 'infirmière', 'attribut'], ['Ma sœur soigne les malades.', 'les malades', 'COD'],
  ['Ces enfants semblent fatigués.', 'fatigués', 'attribut'], ['Ces enfants regardent un dessin animé.', 'un dessin animé', 'COD'],
  ['Le chanteur paraît nerveux.', 'nerveux', 'attribut'], ['Le chanteur salue le public.', 'le public', 'COD'],
  ['Cette histoire reste un mystère.', 'un mystère', 'attribut'], ['Le détective résout le mystère.', 'le mystère', 'COD'],
  ['Les feuilles deviennent jaunes.', 'jaunes', 'attribut'], ['Le vent emporte les feuilles.', 'les feuilles', 'COD'],
  ['Mon oncle est pilote.', 'pilote', 'attribut'], ['Mon oncle pilote un avion.', 'un avion', 'COD'],
  ['La soupe semble chaude.', 'chaude', 'attribut'], ['Le cuisinier goûte la soupe.', 'la soupe', 'COD'],
  ['Ce chien a l’air gentil.', 'gentil', 'attribut'], ['Ce chien garde la maison.', 'la maison', 'COD'],
];
// Niveau 9 : [phrase, groupe, 'épithète' | 'attribut' | 'complément du nom']
const EXPANSIONS = [
  ['Un petit garçon joue dans le parc.', 'petit', 'épithète'], ['Ce garçon est petit.', 'petit', 'attribut'],
  ['La voiture de mes parents est rouge.', 'de mes parents', 'complément du nom'], ['La voiture de mes parents est rouge.', 'rouge', 'attribut'],
  ['J’ai acheté un pull en laine.', 'en laine', 'complément du nom'], ['Elle porte une robe bleue.', 'bleue', 'épithète'],
  ['Le chat de la voisine est noir.', 'de la voisine', 'complément du nom'], ['Le chat de la voisine est noir.', 'noir', 'attribut'],
  ['Les grands arbres perdent leurs feuilles.', 'grands', 'épithète'], ['Ces arbres sont très grands.', 'grands', 'attribut'],
  ['Nous avons visité un château fort.', 'fort', 'épithète'], ['Le château du roi est immense.', 'du roi', 'complément du nom'],
  ['Le château du roi est immense.', 'immense', 'attribut'], ['Une tasse de chocolat me réchauffe.', 'de chocolat', 'complément du nom'],
  ['Mon frère semble content.', 'content', 'attribut'], ['Un enfant content sourit.', 'content', 'épithète'],
  ['Le livre de contes est sur la table.', 'de contes', 'complément du nom'], ['La mer paraît calme.', 'calme', 'attribut'],
  ['Une mer calme brille au soleil.', 'calme', 'épithète'],
];
// Niveau 10 : [phrase, 'simple' | 'complexe'] (le nombre de verbes conjugués)
const SIMPLE_COMPLEXE = [
  ['Le chat dort sur le canapé.', 'simple'], ['Le chat dort et le chien joue.', 'complexe'],
  ['Quand il pleut, nous restons à la maison.', 'complexe'], ['Les élèves de la classe préparent un spectacle.', 'simple'],
  ['Je pense que tu as raison.', 'complexe'], ['Pendant les vacances d’été, nous irons à la mer.', 'simple'],
  ['Le garçon qui porte un chapeau est mon cousin.', 'complexe'], ['Elle a ouvert la porte, puis elle est sortie.', 'complexe'],
  ['Ce matin, les enfants ont joué dans la neige.', 'simple'], ['Il fait beau mais il fait froid.', 'complexe'],
  ['Pour réussir, il faut travailler.', 'simple'], ['Nous aimons regarder les étoiles.', 'simple'],
  ['Le maître explique la leçon et les élèves écoutent.', 'complexe'], ['Avant de partir, ferme la fenêtre.', 'simple'],
  ['Dès que la cloche sonne, les élèves sortent.', 'complexe'], ['Les oiseaux migrateurs partent vers le sud.', 'simple'],
];

const FONCTIONS_LIBELLES = {
  objet: 'complément d’objet', circonstanciel: 'complément circonstanciel', COD: 'complément d’objet direct',
  COI: 'complément d’objet indirect', temps: 'de temps', lieu: 'de lieu', cause: 'de cause', attribut: 'attribut du sujet',
};

/** Une question sur un mot ou un groupe souligné, à réponses écrites (lues à voix haute). */
function soulignee({ key, phrase, mark, question, reponse, autres, rng, success }) {
  const options = shuffle(rng, [reponse, ...autres]);
  return {
    key,
    text: question,
    instruction: [question, `${capitalize(enListe(options))} ?`],
    short: { key: `grammaire-cm:${question}`, text: question },
    stage: { type: 'sentence', text: nbsp(phrase), mark },
    choices: textChoices(options),
    choiceStyle: styleFor(options),
    answer: reponse,
    success: { speak: success },
  };
}

function questionGrammaire(level, rng) {
  if (level === 1) {
    const [phrase, verbe, autres] = pick(rng, VERBES);
    const options = shuffle(rng, [verbe, ...sample(rng, autres, 3)]);
    return {
      key: `grammaire-cm:verbe:${phrase}`,
      text: 'Touche le verbe conjugué.',
      instruction: 'Lis la phrase. Touche le verbe conjugué.',
      short: { key: 'grammaire-cm:verbe', text: 'Le verbe conjugué ?' },
      stage: { type: 'sentence', text: nbsp(phrase) },
      choices: textChoices(options),
      choiceStyle: styleFor(options),
      answer: verbe,
      success: { speak: `Oui, le verbe conjugué est « ${verbe} ».` },
    };
  }
  if (level === 2) {
    const [phrase, sujet, autres] = pick(rng, SUJETS);
    const options = shuffle(rng, [sujet, ...autres]);
    return {
      key: `grammaire-cm:sujet:${phrase}`,
      text: 'Quel est le sujet du verbe ?',
      instruction: 'Lis la phrase. Quel est le sujet du verbe ?',
      short: { key: 'grammaire-cm:sujet', text: 'Le sujet ?' },
      stage: { type: 'sentence', text: nbsp(phrase) },
      choices: textChoices(options),
      choiceStyle: styleFor(options),
      answer: sujet,
      success: { speak: `Oui, le sujet est « ${sujet} ».` },
    };
  }
  if (level === 3) {
    if (rng() < 0.5) {
      const [phrase, type] = pick(rng, TYPES);
      const options = ['déclarative', 'interrogative', 'impérative'];
      return {
        key: `grammaire-cm:type:${phrase}`,
        text: 'De quel type est cette phrase ?',
        instruction: ['De quel type est cette phrase ?', 'Déclarative, interrogative, ou impérative ?'],
        short: { key: 'grammaire-cm:type', text: 'Quel type ?' },
        stage: { type: 'sentence', text: nbsp(phrase) },
        choices: textChoices(options),
        choiceStyle: 'sentences',
        answer: type,
        success: { speak: `Oui, c’est une phrase ${type}.` },
      };
    }
    const [phrase, forme] = pick(rng, FORMES);
    return {
      key: `grammaire-cm:forme:${phrase}`,
      text: 'Cette phrase est-elle à la forme affirmative ou négative ?',
      instruction: 'Cette phrase est-elle à la forme affirmative, ou à la forme négative ?',
      short: { key: 'grammaire-cm:forme', text: 'Affirmative ou négative ?' },
      stage: { type: 'sentence', text: nbsp(phrase) },
      choices: textChoices(['affirmative', 'négative']),
      choiceStyle: 'words',
      answer: forme,
      success: { speak: `Oui, la phrase est à la forme ${forme}.` },
    };
  }
  if (level === 4) {
    const [phrase, mot, nature] = pick(rng, MOTS);
    const autres = sample(rng, NATURES.filter((n) => n !== nature), 3);
    return soulignee({
      key: `grammaire-cm:nature:${phrase}:${mot}`, phrase, mark: mot, question: 'Quelle est la nature du mot souligné ?',
      reponse: nature, autres, rng, success: `Oui, « ${mot} » est ${nature.startsWith('conjonction') ? 'une' : 'un'} ${nature}.`,
    });
  }
  const tables = {
    5: [OBJET_CIRC, ['objet', 'circonstanciel'], 'Le groupe souligné est-il un complément d’objet, ou un complément circonstanciel ?'],
    6: [COD_COI, ['COD', 'COI'], 'Le groupe souligné est-il un complément d’objet direct, ou indirect ?'],
    7: [CIRC, ['temps', 'lieu', 'cause'], 'Le complément circonstanciel souligné est-il de temps, de lieu, ou de cause ?'],
    8: [ATTRIBUT_COD, ['attribut', 'COD'], 'Le groupe souligné est-il un attribut du sujet, ou un complément d’objet direct ?'],
  };
  if (tables[level]) {
    const [table, valeurs, question] = tables[level];
    const [phrase, groupe, fonction] = pick(rng, table);
    const libelle = (v) => FONCTIONS_LIBELLES[v];
    const options = valeurs.map(libelle);
    return {
      key: `grammaire-cm:${level}:${phrase}:${groupe}`,
      text: question,
      instruction: question,
      short: { key: `grammaire-cm:${level}`, text: question },
      stage: { type: 'sentence', text: nbsp(phrase), mark: groupe },
      choices: textChoices(options),
      choiceStyle: 'sentences',
      answer: libelle(fonction),
      success: { speak: level === 7 ? `Oui, c’est un complément circonstanciel ${libelle(fonction)}.` : `Oui, c’est un ${libelle(fonction)}.` },
    };
  }
  if (level === 9) {
    const [phrase, groupe, fonction] = pick(rng, EXPANSIONS);
    const options = ['épithète', 'attribut du sujet', 'complément du nom'];
    const reponse = fonction === 'attribut' ? 'attribut du sujet' : fonction;
    const question = 'Le mot ou le groupe souligné est-il épithète, attribut du sujet, ou complément du nom ?';
    return {
      key: `grammaire-cm:9:${phrase}:${groupe}`,
      text: question,
      instruction: question,
      short: { key: 'grammaire-cm:9', text: 'Épithète, attribut ou complément du nom ?' },
      stage: { type: 'sentence', text: nbsp(phrase), mark: groupe },
      choices: textChoices(options),
      choiceStyle: 'sentences',
      answer: reponse,
      success: { speak: `Oui, « ${groupe} » est ${reponse === 'épithète' ? 'épithète' : reponse === 'attribut du sujet' ? 'attribut du sujet' : 'complément du nom'}.` },
    };
  }
  const [phrase, sorte] = pick(rng, SIMPLE_COMPLEXE);
  return {
    key: `grammaire-cm:10:${phrase}`,
    text: 'Cette phrase est-elle simple ou complexe ?',
    instruction: ['Compte les verbes conjugués.', 'Cette phrase est-elle simple, ou complexe ?'],
    short: { key: 'grammaire-cm:10', text: 'Simple ou complexe ?' },
    stage: { type: 'sentence', text: nbsp(phrase) },
    choices: textChoices(['simple', 'complexe']),
    choiceStyle: 'words',
    answer: sorte,
    success: { speak: sorte === 'simple' ? 'Oui, c’est une phrase simple : un seul verbe conjugué.' : 'Oui, c’est une phrase complexe : plusieurs verbes conjugués.' },
  };
}

export const grammaireCm = {
  id: 'grammaire-cm',
  domain: 'francais',
  section: 'Grammaire',
  title: 'La phrase et ses fonctions',
  icon: '🔎',
  skill: 'Analyser la phrase : verbe, sujet, types de phrases, nature des mots, compléments, attribut, épithète, complément du nom',
  levels: [
    'Le verbe conjugué', 'Le sujet du verbe', 'Types et formes de phrases', 'La nature des mots', 'Objet ou circonstanciel ?',
    'COD ou COI ?', 'Temps, lieu ou cause ?', 'Attribut ou COD ?', 'Épithète, attribut…', 'Phrase simple ou complexe ?',
  ],
  generate(level, rng) {
    return questionGrammaire(level, rng);
  },
};

// ================================================================ Accords et homophones

// [phrase avec « … », bonne réponse, autres formes]
const ACCORDS_GN = [
  ['Les … chevaux galopent dans le pré.', 'beaux', ['beau', 'belle', 'belles']],
  ['Ma grand-mère porte des lunettes … .', 'rondes', ['ronde', 'rond', 'ronds']],
  ['Elle a acheté des chaussures … .', 'neuves', ['neuf', 'neufs', 'neuve']],
  ['Les … nouvelles sont arrivées.', 'bonnes', ['bon', 'bons', 'bonne']],
  ['Ce sont de … amies.', 'vieilles', ['vieux', 'vieil', 'vieille']],
  ['Nous avons visité de … villages.', 'jolis', ['joli', 'jolie', 'jolies']],
  ['Mon frère a les cheveux … .', 'bruns', ['brun', 'brune', 'brunes']],
  ['La … route traverse la forêt.', 'longue', ['long', 'longs', 'longues']],
  ['Les fleurs … embaument le jardin.', 'blanches', ['blanc', 'blancs', 'blanche']],
  ['Il a reçu des cadeaux … .', 'merveilleux', ['merveilleuse', 'merveilleuses', 'merveilleuxs']],
  ['Les … journées d’été sont agréables.', 'chaudes', ['chaud', 'chauds', 'chaude']],
  ['J’ai vu deux … chiens.', 'gros', ['grosse', 'grosses', 'groses']],
  ['La maîtresse lit des contes … .', 'africains', ['africain', 'africaine', 'africaines']],
  ['Mes … voisines sont parties.', 'nouvelles', ['nouveau', 'nouveaux', 'nouvelle']],
];
const SUJET_VERBE = [
  ['Les enfants de ma voisine … dans le jardin.', 'jouent', ['joue', 'joues']],
  ['Le bruit des vagues … le bébé.', 'endort', ['endorment', 'endors']],
  ['Chaque soir, mon père et ma mère … une histoire.', 'lisent', ['lit', 'lis']],
  ['La boîte de crayons … sur le bureau.', 'est', ['sont', 'es']],
  ['Les feuilles de l’arbre … en automne.', 'tombent', ['tombe', 'tombes']],
  ['Toi et moi … les meilleurs amis.', 'sommes', ['sont', 'êtes']],
  ['Le chien de mes cousins … très fort.', 'aboie', ['aboient', 'aboies']],
  ['Les joueurs de l’équipe … le match.', 'gagnent', ['gagne', 'gagnes']],
  ['Ma sœur et toi … au cinéma.', 'allez', ['vont', 'va']],
  ['La tante de mes amis … des gâteaux.', 'fait', ['font', 'fais']],
  ['Les élèves de la classe … le spectacle.', 'préparent', ['prépare', 'prépares']],
  ['Le troupeau de moutons … dans la montagne.', 'monte', ['montent', 'montes']],
];
const PARTICIPE_ETRE = [
  ['Les filles sont … en retard.', 'arrivées', ['arrivé', 'arrivés', 'arrivée']],
  ['Ma tante est … hier soir.', 'partie', ['parti', 'partis', 'parties']],
  ['Les feuilles sont … des arbres.', 'tombées', ['tombé', 'tombés', 'tombée']],
  ['Mes cousins sont … à la fête.', 'venus', ['venu', 'venue', 'venues']],
  ['La neige est … toute la nuit.', 'tombée', ['tombé', 'tombés', 'tombées']],
  ['Les voyageurs sont … dans le train.', 'montés', ['monté', 'montée', 'montées']],
  ['Elle est … à la maison.', 'restée', ['resté', 'restés', 'restées']],
  ['Nos amies sont … au musée.', 'allées', ['allé', 'allés', 'allée']],
  ['Le colis est … ce matin.', 'arrivé', ['arrivée', 'arrivés', 'arrivées']],
  ['Les hirondelles sont … au printemps.', 'revenues', ['revenu', 'revenus', 'revenue']],
  ['Les tartes sont … .', 'cuites', ['cuit', 'cuits', 'cuite']],
];
const CES_SES = [
  ['Le chat lèche … pattes.', 'ses', ['ces']], ['Regarde … nuages gris !', 'ces', ['ses']], ['Mon frère range … livres.', 'ses', ['ces']],
  ['Qui a apporté … fleurs ?', 'ces', ['ses']], ['… matin, il fait froid.', 'Ce', ['Se']], ['Le chien … cache sous la table.', 'se', ['ce']],
  ['Elle … promène au bord de l’eau.', 'se', ['ce']], ['… gâteau est délicieux.', 'Ce', ['Se']], ['Il … lave les mains.', 'se', ['ce']],
  ['Tu as vu … oiseaux ?', 'ces', ['ses']], ['La fillette serre … jouets contre elle.', 'ses', ['ces']], ['Les enfants … réveillent tôt.', 'se', ['ce']],
];
const CEST_OU = [
  ['… mon meilleur ami.', 'C’est', ['S’est']], ['Il … blessé en tombant.', 's’est', ['c’est']], ['Elle … endormie tôt.', 's’est', ['c’est']],
  ['… l’heure de partir.', 'C’est', ['S’est']], ['Le chat … caché sous le lit.', 's’est', ['c’est']], ['Il … trompé de chemin.', 's’est', ['c’est']],
  ['Tu préfères le chocolat … la vanille ?', 'ou', ['où']], ['… habites-tu ?', 'Où', ['Ou']], ['La maison … je suis né est en Bretagne.', 'où', ['ou']],
  ['Veux-tu un livre … un jeu ?', 'ou', ['où']], ['Je ne sais pas … est mon stylo.', 'où', ['ou']], ['… est-ce que tu vas ?', 'Où', ['Ou']],
];
const LEUR = [
  ['Les enfants rangent … jouets.', 'leurs', ['leur']], ['Je … ai donné un conseil.', 'leur', ['leurs']],
  ['Les oiseaux nourrissent … petits.', 'leurs', ['leur']], ['Mes voisins promènent … chien.', 'leur', ['leurs']],
  ['Dis-… bonjour de ma part.', 'leur', ['leurs']], ['Les élèves ont oublié … cahiers.', 'leurs', ['leur']],
  ['Mes cousins m’ont montré … maison.', 'leur', ['leurs']], ['Nous … avons raconté une histoire.', 'leur', ['leurs']],
];
const SUJET_INVERSE = [
  ['Dans la forêt … deux ours bruns.', 'vivaient', ['vivait']], ['Au loin … les cloches du village.', 'sonnent', ['sonne']],
  ['Sur la colline … un vieux moulin.', 'se dresse', ['se dressent']], ['Que … les enfants ?', 'veulent', ['veut']],
  ['Où … tes parents ?', 'habitent', ['habite']], ['Bientôt … les vacances.', 'arriveront', ['arrivera']],
  ['Dans le ciel … des milliers d’étoiles.', 'brillent', ['brille']], ['Sous le pont … la rivière.', 'coule', ['coulent']],
  ['À qui … ces chaussures ?', 'appartiennent', ['appartient']], ['Au bord du lac … un pêcheur.', 'attend', ['attendent']],
  ['Quand … les invités ?', 'arrivent', ['arrive']], ['Dans le pré … les moutons.', 'broutent', ['broute']],
];
const ATTRIBUT_ACCORD = [
  ['Ces histoires sont … .', 'passionnantes', ['passionnant', 'passionnants', 'passionnante']],
  ['Les fenêtres restent … .', 'ouvertes', ['ouvert', 'ouverts', 'ouverte']],
  ['Ma grand-mère semble … .', 'heureuse', ['heureux', 'heureuses']],
  ['Les chemins deviennent … .', 'glissants', ['glissant', 'glissante', 'glissantes']],
  ['La mer paraît … aujourd’hui.', 'agitée', ['agité', 'agités', 'agitées']],
  ['Mes sœurs sont … .', 'grandes', ['grand', 'grands', 'grande']], ['Ces pommes sont … .', 'mûres', ['mûr', 'mûrs', 'mûre']],
  ['Les rues sont … le dimanche.', 'désertes', ['désert', 'déserts', 'déserte']],
  ['Mes chaussures sont … .', 'neuves', ['neuf', 'neufs', 'neuve']], ['Ces garçons semblent … .', 'inquiets', ['inquiet', 'inquiète', 'inquiètes']],
];
const PARTICIPE_AVOIR = [
  ['Les élèves ont … leurs exercices.', 'terminé', ['terminés', 'terminer', 'terminées']],
  ['Ma mère a … une tarte.', 'préparé', ['préparée', 'préparer', 'préparés']],
  ['Nous avons … le train.', 'pris', ['prit', 'prise', 'pri']], ['Elles ont … une chanson.', 'chanté', ['chantées', 'chanter', 'chantés']],
  ['Les enfants ont … des coquillages.', 'ramassé', ['ramassés', 'ramasser', 'ramassées']],
  ['La lettre que j’ai … est arrivée.', 'écrite', ['écrit', 'écrits', 'écrites']],
  ['Les fleurs que tu as … sont belles.', 'cueillies', ['cueilli', 'cueillis', 'cueillie']],
  ['Les gâteaux que nous avons … étaient délicieux.', 'mangés', ['mangé', 'mangées', 'manger']],
  ['Ils ont … la vérité.', 'dit', ['dits', 'dite', 'dis']], ['Vous avez … le film ?', 'vu', ['vus', 'vue', 'vut']],
];

const ORTHO_NIVEAUX = [
  null,
  { table: ACCORDS_GN, question: 'Accorde l’adjectif.' },
  { table: SUJET_VERBE, question: 'Accorde le verbe avec son sujet.' },
  { table: PARTICIPE_ETRE, question: 'Accorde le participe passé.' },
  { table: CES_SES, question: 'Choisis le bon mot.' },
  { table: CEST_OU, question: 'Choisis le bon mot.' },
  { table: [...LEUR, ...CES_SES, ...CEST_OU], question: 'Choisis le bon mot.' },
  { table: SUJET_INVERSE, question: 'Accorde le verbe avec son sujet. Attention, il est après le verbe !' },
  { table: ATTRIBUT_ACCORD, question: 'Accorde l’attribut avec le sujet.' },
  { table: PARTICIPE_AVOIR, question: 'Écris le participe passé.' },
];

/** Remplace « … » par le mot (et « … . » par « mot. »). */
const remplir = (phrase, mot) => phrase.replace(' … .', ` ${mot}.`).replace('…', mot);

function questionOrthographe(level, rng) {
  const def = level === 10
    ? pick(rng, ORTHO_NIVEAUX.slice(1, 10))
    : ORTHO_NIVEAUX[level];
  const [phrase, reponse, autres] = pick(rng, def.table);
  const options = shuffle(rng, [reponse, ...autres.slice(0, 3)]);
  return {
    key: `orthographe-cm:${level}:${phrase}`,
    text: def.question,
    instruction: [def.question, 'Choisis la bonne orthographe.'],
    short: { key: `orthographe-cm:${def.question}`, text: def.question },
    stage: { type: 'sentence', text: nbsp(phrase) },
    choices: textChoices(options),
    choiceStyle: styleFor(options),
    answer: reponse,
    success: { speak: nbsp(remplir(phrase, reponse)) },
  };
}

export const orthographeCmGame = {
  id: 'orthographe-cm',
  domain: 'francais',
  section: 'Grammaire',
  title: 'Accords et homophones',
  icon: '🖊️',
  skill: 'Accorder dans le groupe nominal, le verbe avec son sujet, le participe passé et l’attribut ; distinguer les homophones',
  levels: [
    'Les accords du groupe nominal', 'Le verbe et son sujet', 'Participe passé avec être', 'ces ou ses, ce ou se',
    'c’est ou s’est, ou ou où', 'leur ou leurs, et tout mélangé', 'Le sujet après le verbe', 'L’attribut s’accorde',
    'Participe passé avec avoir', 'Grand mélange',
  ],
  generate(level, rng) {
    return questionOrthographe(level, rng);
  },
};

export const CM_GRAMMAIRE_GAMES = [grammaireCm, orthographeCmGame];
