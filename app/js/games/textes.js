// Petits textes à lire (CP, CE1) : un court texte, puis une question de compréhension.
// Le bouton « Écouter le texte » aide l'enfant qui bloque ; la question est toujours lue.

import { pick, shuffle } from '../random.js';
import { pickSeasonal } from './helpers.js';

// [question, bonne réponse, autre réponse, autre réponse]
const TEXTS = [
  // ---- Niveau 1 : 3 phrases courtes, sons simples
  { level: 1, title: 'Le chat de Léo', text: 'Léo a un chat. Le chat est roux. Il dort sur le lit.', questions: [
    ['Qui a un chat ?', 'Léo', 'Lili', 'Papa'],
    ['Où dort le chat ?', 'sur le lit', 'sous la table', 'dans le jardin'],
    ['De quelle couleur est le chat ?', 'roux', 'noir', 'blanc']] },
  { level: 1, title: 'À la mare', text: 'Lili va à la mare. Elle voit une tortue. La tortue nage.', questions: [
    ['Où va Lili ?', 'à la mare', 'à l’école', 'au parc'],
    ['Que voit Lili ?', 'une tortue', 'un lapin', 'un chat'],
    ['Que fait la tortue ?', 'elle nage', 'elle dort', 'elle mange']] },
  { level: 1, title: 'La tarte', text: 'Papa fait une tarte. Il met des pommes. La tarte est bonne !', questions: [
    ['Qui fait la tarte ?', 'Papa', 'Maman', 'Lili'],
    ['Que met papa dans la tarte ?', 'des pommes', 'des fraises', 'des poires']] },
  { level: 1, title: 'Le ballon', text: 'Tom a un ballon rouge. Il joue avec Sami. Le ballon va sur le toit !', questions: [
    ['De quelle couleur est le ballon ?', 'rouge', 'bleu', 'vert'],
    ['Avec qui joue Tom ?', 'Sami', 'Léo', 'Mila'],
    ['Où va le ballon ?', 'sur le toit', 'dans l’eau', 'dans la rue']] },
  { level: 1, title: 'La fête', text: 'Mila a une robe. La robe est jolie. Mila va à la fête.', questions: [
    ['Qu’a Mila ?', 'une robe', 'un vélo', 'un chat'],
    ['Où va Mila ?', 'à la fête', 'à la mer', 'au lit']] },
  { level: 1, title: 'Le lapin', text: 'Le petit lapin a faim. Il mange une carotte. Puis il fait dodo.', questions: [
    ['Que mange le lapin ?', 'une carotte', 'une pomme', 'du pain'],
    ['Que fait le lapin après ?', 'il fait dodo', 'il court', 'il nage']] },
  { level: 1, title: 'La moto', text: 'Papi a une moto. La moto va vite. Papi a un casque bleu.', questions: [
    ['Qui a une moto ?', 'Papi', 'Mamie', 'Tom'],
    ['De quelle couleur est le casque ?', 'bleu', 'rouge', 'jaune']] },

  // ---- Niveau 2 : 3 phrases plus longues (ch, ou, on, an, oi…)
  { level: 2, title: 'Sur le chemin', text: 'Ce matin, Chloé part à l’école. Elle prend son cartable et son goûter. Sur le chemin, elle voit un chien qui court.', questions: [
    ['Où va Chloé ?', 'à l’école', 'au marché', 'chez mamie'],
    ['Que prend Chloé ?', 'son goûter', 'son vélo', 'sa poupée'],
    ['Que voit-elle sur le chemin ?', 'un chien', 'un oiseau', 'un chat']] },
  { level: 2, title: 'Chez mamie', text: 'Le dimanche, Hugo va chez sa mamie. Ils font un gâteau au chocolat. Hugo lèche la cuillère !', questions: [
    ['Chez qui va Hugo ?', 'chez sa mamie', 'chez son ami', 'chez le docteur'],
    ['Quel gâteau font-ils ?', 'au chocolat', 'aux fraises', 'au citron'],
    ['Quel jour va-t-il chez sa mamie ?', 'le dimanche', 'le lundi', 'le mercredi']] },
  { level: 2, title: 'La neige', text: 'Il neige ! Inès met son bonnet et ses gants. Avec son frère, elle fait un bonhomme de neige.', questions: [
    ['Quel temps fait-il ?', 'il neige', 'il pleut', 'il fait chaud'],
    ['Que met Inès ?', 'son bonnet', 'son maillot', 'sa robe'],
    ['Que fait-elle avec son frère ?', 'un bonhomme de neige', 'un château de sable', 'une cabane']] },
  { level: 2, title: 'Au zoo', text: 'Au zoo, Noé regarde les singes. Un singe mange une banane. Noé rit très fort.', questions: [
    ['Où est Noé ?', 'au zoo', 'à la ferme', 'à la plage'],
    ['Que mange le singe ?', 'une banane', 'une pomme', 'du pain'],
    ['Que fait Noé ?', 'il rit', 'il pleure', 'il dort']] },
  { level: 2, title: 'L’histoire du soir', text: 'Ce soir, papa lit une histoire à Jade. C’est l’histoire d’un dragon gentil. Jade s’endort avant la fin.', questions: [
    ['Qui lit l’histoire ?', 'papa', 'maman', 'Jade'],
    ['L’histoire parle…', 'd’un dragon', 'd’un loup', 'd’une fée'],
    ['Que fait Jade avant la fin ?', 'elle s’endort', 'elle chante', 'elle mange']] },
  { level: 2, title: 'Bulle', text: 'Le poisson rouge de Louis s’appelle Bulle. Il tourne dans son bocal. Louis lui donne à manger tous les matins.', questions: [
    ['Comment s’appelle le poisson ?', 'Bulle', 'Plouf', 'Nemo'],
    ['Quand Louis lui donne-t-il à manger ?', 'le matin', 'le soir', 'à midi']] },

  // ---- Niveau 3 : textes de 4 phrases (CE1)
  { level: 3, title: 'Le château de sable', text: 'Pendant les vacances, Emma part à la mer. Chaque matin, elle construit un château de sable. Un jour, une grosse vague le détruit. Emma n’est pas triste : elle en construit un plus grand !', questions: [
    ['Où part Emma ?', 'à la mer', 'à la montagne', 'à la campagne'],
    ['Qu’est-ce qui détruit le château ?', 'une vague', 'son frère', 'le vent'],
    ['Que fait Emma ensuite ?', 'un château plus grand', 'elle pleure', 'elle rentre']] },
  { level: 3, title: 'Où est Pacha ?', text: 'Le chat de Malik a disparu. Malik le cherche dans le jardin, puis dans le garage. Il appelle : « Pacha ! » Finalement, il le trouve endormi dans le panier à linge !', questions: [
    ['Comment s’appelle le chat ?', 'Pacha', 'Malik', 'Minou'],
    ['Où Malik cherche-t-il d’abord ?', 'dans le jardin', 'dans le garage', 'dans sa chambre'],
    ['Où est le chat ?', 'dans le panier à linge', 'sous le lit', 'sur le toit']] },
  { level: 3, title: 'À la ferme', text: 'Aujourd’hui, la classe de Lucie visite une ferme. Les enfants donnent du foin aux chèvres. Le fermier leur montre les petits cochons. Au retour, tout le monde chante dans le bus.', questions: [
    ['Que visite la classe ?', 'une ferme', 'un musée', 'un zoo'],
    ['Que mangent les chèvres ?', 'du foin', 'du pain', 'des pommes'],
    ['Comment rentrent les enfants ?', 'en bus', 'à pied', 'en train']] },
  { level: 3, title: 'La petite souris', text: 'Nathan a perdu une dent ce matin. Le soir, il la met sous son oreiller. Le lendemain, à la place de la dent, il trouve une pièce. Qui est passé pendant la nuit ?', questions: [
    ['Qu’a perdu Nathan ?', 'une dent', 'un jouet', 'une chaussure'],
    ['Où met-il sa dent ?', 'sous son oreiller', 'dans une boîte', 'dans sa poche'],
    ['Que trouve-t-il le lendemain ?', 'une pièce', 'un bonbon', 'une lettre']] },
  { level: 3, title: 'La graine', text: 'Sarah a planté une graine dans un pot. Elle l’arrose tous les jours. Elle met le pot près de la fenêtre. Au bout d’une semaine, une petite tige verte sort de la terre.', questions: [
    ['Qu’a planté Sarah ?', 'une graine', 'un arbre', 'une fleur'],
    ['Où met-elle le pot ?', 'près de la fenêtre', 'dans le noir', 'dans le jardin'],
    ['Quand la tige sort-elle ?', 'au bout d’une semaine', 'le lendemain', 'au bout d’un mois']] },
  { level: 3, title: 'Le judo', text: 'Le mercredi, Adam va au judo. Il met son kimono blanc et sa ceinture jaune. Aujourd’hui, le professeur lui apprend une nouvelle prise. Adam est fier de lui.', questions: [
    ['Quel sport fait Adam ?', 'du judo', 'du foot', 'de la danse'],
    ['De quelle couleur est sa ceinture ?', 'jaune', 'blanche', 'noire'],
    ['Quel jour va-t-il au judo ?', 'le mercredi', 'le samedi', 'le lundi']] },

  // ---- Niveau 4 : lire entre les lignes (la réponse n'est pas écrite, il faut la deviner)
  { level: 4, title: 'Le grand jour', text: 'Ce matin, Lina a un cartable tout neuf. Elle serre fort la main de papa. Devant la grille, il y a plein d’enfants qu’elle ne connaît pas. Son cœur bat très vite. Papa lui dit : « À ce soir ! »', questions: [
    ['Où va Lina ?', 'à l’école', 'au parc', 'chez mamie'],
    ['Comment se sent Lina ?', 'un peu inquiète', 'en colère', 'fatiguée'],
    ['C’est quel jour pour Lina ?', 'la rentrée', 'Noël', 'les vacances']] },
  { level: 4, title: 'Les flaques', text: 'Sami met ses bottes et son ciré jaune. Dehors, le ciel est gris et il saute dans toutes les flaques. Plouf ! Quand il rentre, maman lui dit en riant : « Va vite te changer ! »', questions: [
    ['Quel temps fait-il ?', 'il pleut', 'il neige', 'il fait chaud'],
    ['Pourquoi Sami doit-il se changer ?', 'il est mouillé', 'il va au lit', 'il a chaud']] },
  { level: 4, title: 'Les biscuits', text: 'Max ouvre le placard : la boîte de biscuits est vide ! Sur le tapis, il y a plein de miettes. Dans son panier, son chien Filou se lèche les babines et remue la queue.', questions: [
    ['Qui a mangé les biscuits ?', 'le chien', 'Max', 'papa'],
    ['Que cherchait Max dans le placard ?', 'des biscuits', 'son chien', 'un tapis']] },
  { level: 4, title: 'La surprise', text: 'Papa cache un paquet derrière son dos. Sur la table, il y a un gâteau avec sept bougies. Tout le monde chante pour Jules. Jules ferme les yeux et souffle très fort.', questions: [
    ['Quel âge a Jules aujourd’hui ?', 'sept ans', 'six ans', 'huit ans'],
    ['Que cache papa ?', 'un cadeau', 'une bougie', 'un ballon']] },
  { level: 4, title: 'Dans la nuit', text: 'Il fait noir et tout le monde dort. Soudain, Hugo entend « hou hou » dans le jardin. Il allume sa lampe et voit deux grands yeux ronds sur une branche. Il sourit : ce n’est pas un monstre !', questions: [
    ['Quel animal voit Hugo ?', 'un hibou', 'un chat', 'un loup'],
    ['Quand se passe l’histoire ?', 'la nuit', 'le matin', 'à midi']] },
  { level: 4, title: 'À la caisse', text: 'Maman pose les pommes, le lait et le pain sur le tapis qui avance. La dame dit : « Bonjour ! Ça fait douze euros. » Maman paie, puis range tout dans son grand sac.', questions: [
    ['Où sont-ils ?', 'au magasin', 'à l’école', 'à la plage'],
    ['Que fait maman ?', 'des courses', 'la cuisine', 'du sport']] },
  { level: 4, title: 'Le bonhomme', text: 'Ce matin, tout le jardin est blanc. Zoé et son frère roulent deux grosses boules. Ils ajoutent une carotte pour le nez et une écharpe. À midi, le soleil brille fort et le nez tombe…', questions: [
    ['Que fabriquent les enfants ?', 'un bonhomme de neige', 'un château de sable', 'une cabane'],
    ['Pourquoi le nez tombe-t-il ?', 'la neige fond', 'le vent souffle', 'un chien le prend']] },

  // ---- Niveau 5 : qui parle ? qui est « il », « elle », « lui » ?
  { level: 5, title: 'Coco', text: 'Lucas a un perroquet vert. Il s’appelle Coco. Chaque matin, Coco crie : « Bonjour Lucas ! » Alors Lucas lui donne des graines, et l’oiseau les mange une à une.', questions: [
    ['Qui dit « Bonjour Lucas ! » ?', 'le perroquet', 'Lucas', 'maman'],
    ['Dans « Lucas lui donne », « lui », c’est…', 'Coco', 'Lucas', 'maman']] },
  { level: 5, title: 'À la boulangerie', text: '« Bonjour, je voudrais deux croissants », dit Inès. La boulangère les met dans un sac. « Ça fait deux euros », répond-elle. Inès lui donne une pièce.', questions: [
    ['Qui dit « Ça fait deux euros » ?', 'la boulangère', 'Inès', 'sa maman'],
    ['Dans « les met dans un sac », « les », c’est…', 'les croissants', 'les euros', 'les pièces']] },
  { level: 5, title: 'Le chaton', text: 'Nora trouve un chaton sous la pluie. Elle le prend dans ses bras. Le petit animal tremble. Nora l’enveloppe dans une serviette bien chaude.', questions: [
    ['Qui est « le petit animal » ?', 'le chaton', 'Nora', 'un oiseau'],
    ['Dans « Elle le prend », « elle », c’est…', 'Nora', 'la pluie', 'la serviette']] },
  { level: 5, title: 'Le match', text: 'Léo et Adam jouent au foot. Léo tire très fort, mais le ballon passe au-dessus du but. « Raté ! » crie Adam en riant. Léo, lui, est un peu vexé.', questions: [
    ['Qui crie « Raté ! » ?', 'Adam', 'Léo', 'l’arbitre'],
    ['Qui est vexé ?', 'Léo', 'Adam', 'le ballon']] },
  { level: 5, title: 'Allô ?', text: 'Le téléphone sonne. « Allô, c’est mamie ! » Jade est très contente. Elle lui raconte sa journée. Mamie promet de venir dimanche.', questions: [
    ['Qui téléphone ?', 'mamie', 'Jade', 'papa'],
    ['Dans « Elle lui raconte », « lui », c’est…', 'mamie', 'Jade', 'le téléphone']] },
  { level: 5, title: 'Le petit frère', text: 'Paul a un petit frère qui s’appelle Théo. Théo ne sait pas encore marcher. Paul lui montre comment empiler des cubes. Le bébé tape dans ses mains et rit très fort.', questions: [
    ['Qui est « le bébé » ?', 'Théo', 'Paul', 'papa'],
    ['Qui montre les cubes ?', 'Paul', 'Théo', 'maman']] },

  // ---- Niveau 6 : le bon titre (le texte est montré sans son titre) et l'ordre des faits
  { level: 6, title: 'Le chat perché', text: 'Le chat de Lou grimpe dans un grand arbre. Il miaule : il n’ose plus descendre. Papa prend l’échelle et monte doucement. Il redescend avec le chat dans les bras.', questions: [
    ['Quel est le meilleur titre ?', 'Le chat perché', 'Le chien perdu', 'Une belle fleur'],
    ['Que se passe-t-il en premier ?', 'le chat grimpe', 'papa monte', 'le chat miaule']] },
  { level: 6, title: 'La tarte aux pommes', text: 'Ce matin, Noé veut faire une tarte. D’abord, il épluche les pommes avec maman. Ensuite, il étale la pâte. Enfin, il met la tarte au four. Ça sent bon !', questions: [
    ['Quel est le meilleur titre ?', 'La tarte aux pommes', 'Le jardin', 'La piscine'],
    ['Que fait Noé en premier ?', 'il épluche les pommes', 'il étale la pâte', 'il allume le four']] },
  { level: 6, title: 'Une amie gentille', text: 'Pendant la récréation, Mia tombe et se fait mal au genou. Elle pleure. Son amie Rose l’aide à se relever. La maîtresse met un pansement, et Mia sourit à nouveau.', questions: [
    ['Quel est le meilleur titre ?', 'Une amie gentille', 'Le gâteau raté', 'Vive la neige'],
    ['Comment finit l’histoire ?', 'Mia sourit', 'Mia pleure', 'Mia tombe']] },
  { level: 6, title: 'La tempête', text: 'Le vent souffle très fort. Les arbres se penchent et la pluie tape aux fenêtres. Toute la famille reste à l’abri. Le lendemain, des branches sont tombées dans le jardin.', questions: [
    ['Quel est le meilleur titre ?', 'La tempête', 'Le beau temps', 'La neige'],
    ['Que voit-on le lendemain ?', 'des branches', 'de la neige', 'des fleurs']] },
  { level: 6, title: 'Le tournesol', text: 'Lucie plante une graine de tournesol. Chaque jour, elle l’arrose. Une tige verte sort de la terre. Elle grandit, grandit… À la fin de l’été, une grande fleur jaune regarde le soleil.', questions: [
    ['Quel est le meilleur titre ?', 'Le tournesol', 'La mer', 'Le chat'],
    ['Que se passe-t-il à la fin ?', 'la fleur pousse', 'Lucie plante', 'la tige casse']] },
  { level: 6, title: 'La fête du village', text: 'Ce soir, c’est la fête au village. Il y a des lampions et de la musique. Ethan danse avec sa sœur. À dix heures, un feu d’artifice illumine le ciel.', questions: [
    ['Quel est le meilleur titre ?', 'La fête du village', 'Un jour d’école', 'Le loup'],
    ['Que se passe-t-il à dix heures ?', 'un feu d’artifice', 'un orage', 'un concert']] },

  // ---- Textes de saison (identifiants de themes.js) : pendant leur saison, un texte sur deux
  // en est un ; hors saison, ils ne sont jamais proposés. Ajoutés à la fin pour ne rien
  // changer au tirage des autres textes.
  { season: 'noel', level: 1, title: 'Le sac du père Noël', text: 'Le père Noël a un sac. Le sac est lourd. Il est plein de cadeaux !', questions: [
    ['Qu’a le père Noël ?', 'un sac', 'un vélo', 'un chat'],
    ['Comment est le sac ?', 'lourd', 'petit', 'vide'],
    ['Le sac est plein de…', 'cadeaux', 'pommes', 'livres']] },
  { season: 'noel', level: 3, title: 'Le marché de Noël', text: 'Samedi, Léo va au marché de Noël avec sa mamie. Il y a des chalets en bois et des guirlandes partout. Mamie achète du pain d’épices. Léo boit un chocolat chaud qui fume.', questions: [
    ['Avec qui Léo va-t-il au marché ?', 'sa mamie', 'son papa', 'sa sœur'],
    ['Qu’achète mamie ?', 'du pain d’épices', 'des bonbons', 'un sapin'],
    ['Que boit Léo ?', 'un chocolat chaud', 'un jus d’orange', 'un verre de lait']] },
  { season: 'halloween', level: 2, title: 'La petite sorcière', text: 'À Halloween, Lina se déguise en sorcière. Elle met un chapeau noir. Avec son panier, elle va chercher des bonbons.', questions: [
    ['En quoi se déguise Lina ?', 'en sorcière', 'en princesse', 'en pirate'],
    ['De quelle couleur est son chapeau ?', 'noir', 'rouge', 'vert'],
    ['Que va-t-elle chercher ?', 'des bonbons', 'des fleurs', 'des jouets']] },
  { season: 'halloween', level: 4, title: 'Le petit fantôme', text: 'On sonne à la porte. Papa ouvre : un petit fantôme blanc est là ! Sous le drap, on voit deux baskets roses. « Des bonbons ou un sort ! » dit une voix que papa connaît bien.', questions: [
    ['Quelle fête est-ce ?', 'Halloween', 'Noël', 'Pâques'],
    ['Qui est sous le drap ?', 'un enfant', 'un vrai fantôme', 'un chat']] },
  { season: 'hiver', level: 2, title: 'La Chandeleur', text: 'C’est la Chandeleur. Papa fait des crêpes. Il fait sauter une crêpe très haut… et elle reste collée au plafond !', questions: [
    ['Que fait papa ?', 'des crêpes', 'un gâteau', 'une soupe'],
    ['Où reste la crêpe ?', 'au plafond', 'dans la poêle', 'par terre'],
    ['Quelle fête est-ce ?', 'la Chandeleur', 'Noël', 'Pâques']] },
  { season: 'hiver', level: 5, title: 'Les moufles', text: 'Il neige. Maman tend des moufles à Nathan : « Mets-les, il fait froid ! » Nathan les enfile vite. Puis il rejoint Léa, qui l’attend dehors avec la luge.', questions: [
    ['Qui dit « Mets-les, il fait froid ! » ?', 'maman', 'Nathan', 'Léa'],
    ['Dans « Nathan les enfile », « les », c’est…', 'les moufles', 'les luges', 'les bottes'],
    ['Qui attend dehors avec la luge ?', 'Léa', 'maman', 'Nathan']] },
  { season: 'printemps', level: 1, title: 'La fleur rose', text: 'Lola a une fleur. La fleur est rose. Une abeille se pose dessus.', questions: [
    ['Qu’a Lola ?', 'une fleur', 'un ballon', 'un chat'],
    ['De quelle couleur est la fleur ?', 'rose', 'bleue', 'jaune'],
    ['Qui se pose sur la fleur ?', 'une abeille', 'un oiseau', 'un papillon']] },
  { season: 'printemps', level: 6, title: 'Le printemps est là', text: 'Ce matin, Jade ouvre la fenêtre : il fait doux. Dans le jardin, les tulipes sont ouvertes. Une hirondelle passe dans le ciel. Jade range son bonnet et sort en tee-shirt.', questions: [
    ['Quel est le meilleur titre ?', 'Le printemps est là', 'Une nuit d’hiver', 'La fête de Noël'],
    ['Que fait Jade en premier ?', 'elle ouvre la fenêtre', 'elle sort', 'elle range son bonnet']] },
  { season: 'ete', level: 2, title: 'À la plage', text: 'Cet été, Sacha va à la plage. Il fait un grand château de sable. Puis il mange une glace à la vanille.', questions: [
    ['Où va Sacha ?', 'à la plage', 'à la piscine', 'au zoo'],
    ['Que fait Sacha ?', 'un château de sable', 'un bonhomme de neige', 'un gâteau'],
    ['Quelle glace mange-t-il ?', 'à la vanille', 'à la fraise', 'au chocolat']] },
  { season: 'ete', level: 4, title: 'Le coup de soleil', text: 'Tout l’après-midi, Tom joue sur la plage sans chapeau. Il ne veut pas mettre de crème. Le soir, son nez et ses épaules sont tout rouges, et ça pique !', questions: [
    ['Pourquoi le nez de Tom est-il rouge ?', 'un coup de soleil', 'il a froid', 'il est tombé'],
    ['Quel temps fait-il sur la plage ?', 'il fait beau', 'il pleut', 'il neige']] },
  { season: 'automne', level: 1, title: 'Au bois', text: 'Rémi va au bois. Il ramasse des feuilles. Les feuilles sont rousses.', questions: [
    ['Où va Rémi ?', 'au bois', 'à la mer', 'au zoo'],
    ['Que ramasse Rémi ?', 'des feuilles', 'des fleurs', 'des cailloux'],
    ['De quelle couleur sont les feuilles ?', 'rousses', 'bleues', 'roses']] },
  { season: 'automne', level: 3, title: 'Le verger', text: 'En automne, Lison et son papa cueillent des pommes dans le verger. Ils remplissent deux grands paniers. À la maison, ils préparent une compote. Toute la cuisine sent bon !', questions: [
    ['Que cueillent-ils ?', 'des pommes', 'des poires', 'des prunes'],
    ['Combien de paniers remplissent-ils ?', 'deux', 'trois', 'un'],
    ['Que préparent-ils ?', 'une compote', 'une tarte', 'un jus']] },
];

export const petitsTextes = {
  id: 'petits-textes',
  domain: 'francais',
  section: 'Lire',
  title: 'Petits textes',
  icon: '📚',
  skill: 'Lire un petit texte et le comprendre (y compris ce qui n’est pas écrit)',
  levels: ['Textes très courts', 'Petits textes', 'Textes de 4 phrases', 'Lire entre les lignes', 'Dialogues et pronoms', 'Titre et ordre des faits'],
  // context.season : la saison du moment (seasonOf), pour les textes de saison
  generate(level, rng, _index, context = {}) {
    const story = pickSeasonal(rng, TEXTS.filter((t) => t.level === level), context.season);
    const [question, answer, ...others] = pick(rng, story.questions);
    return {
      key: `petits-textes:${story.title}`,
      text: question,
      instruction: ['Lis le petit texte, puis réponds à la question.', question],
      short: { key: 'petits-textes', text: question },
      replay: [question],
      // niveau 6 : le titre est une des réponses, il n'est donc pas montré
      stage: { type: 'text', title: level === 6 ? null : story.title, text: story.text },
      choices: shuffle(rng, [answer, ...others]).map((value) => ({ value, label: value })),
      choiceStyle: 'answers',
      answer,
      success: { speak: `${answer[0].toUpperCase()}${answer.slice(1)} !` },
    };
  },
};

export const TEXT_DATA = TEXTS;
