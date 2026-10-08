// Petits textes à lire (CP, CE1) : un court texte, puis une question de compréhension.
// Le bouton « Écouter le texte » aide l'enfant qui bloque ; la question est toujours lue.
// Niveaux 7 et 8 (CE1) : textes documentaires, puis consignes et recettes à suivre.
// Niveaux 9 et 10 (CE1) : pourquoi ? (cause, intention), puis ce que pense ou ressent le personnage.

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

  // ---- Niveau 7 : textes documentaires (on y apprend quelque chose sur le monde)
  { level: 7, title: 'Le hérisson', text: 'Le hérisson est un petit animal couvert de piquants. Il dort le jour et se promène la nuit. Il mange des vers, des limaces et des insectes. En hiver, il hiberne : il dort jusqu’au printemps.', questions: [
    ['Quand le hérisson se promène-t-il ?', 'la nuit', 'le matin', 'à midi'],
    ['Que mange le hérisson ?', 'des insectes', 'des carottes', 'du pain'],
    ['Que fait le hérisson en hiver ?', 'il dort', 'il nage', 'il chante']] },
  { level: 7, title: 'Les abeilles', text: 'Les abeilles vivent ensemble dans une ruche. Elles volent de fleur en fleur pour récolter le nectar. Avec ce nectar, elles fabriquent le miel. Une seule ruche peut abriter des milliers d’abeilles.', questions: [
    ['Où vivent les abeilles ?', 'dans une ruche', 'dans un nid', 'sous la terre'],
    ['Avec quoi fabriquent-elles le miel ?', 'le nectar', 'les feuilles', 'l’eau'],
    ['Combien d’abeilles vivent dans une ruche ?', 'des milliers', 'une seule', 'deux ou trois']] },
  { level: 7, title: 'La grenouille', text: 'La grenouille pond ses œufs dans l’eau de la mare. Des œufs sortent des têtards : ils ont une queue, mais pas de pattes. Peu à peu, les pattes poussent et la queue disparaît.', questions: [
    ['Où la grenouille pond-elle ses œufs ?', 'dans l’eau', 'dans un arbre', 'dans le sable'],
    ['Qu’est-ce qui sort des œufs ?', 'des têtards', 'des poussins', 'des poissons'],
    ['Que perd le têtard en grandissant ?', 'sa queue', 'ses pattes', 'ses yeux']] },
  { level: 7, title: 'Le manchot', text: 'Le manchot est un oiseau, mais il ne vole pas. Il vit sur la glace, là où il fait très froid. Il nage très bien et attrape des poissons dans la mer. Ses plumes serrées le protègent du froid.', questions: [
    ['Le manchot sait-il voler ?', 'non', 'oui', 'un peu'],
    ['Que mange le manchot ?', 'des poissons', 'de l’herbe', 'des fruits'],
    ['Qu’est-ce qui le protège du froid ?', 'ses plumes', 'sa maison', 'la glace']] },
  { level: 7, title: 'Les dents', text: 'Les enfants ont d’abord des dents de lait. Vers six ans, elles commencent à tomber. De nouvelles dents poussent à leur place : elles doivent durer toute la vie. On les brosse matin et soir.', questions: [
    ['Vers quel âge les dents de lait tombent-elles ?', 'vers six ans', 'vers deux ans', 'vers dix ans'],
    ['Quand faut-il se brosser les dents ?', 'matin et soir', 'le dimanche', 'à midi'],
    ['Combien de temps durent les nouvelles dents ?', 'toute la vie', 'un an', 'un mois']] },
  { level: 7, title: 'La Lune', text: 'La Lune tourne autour de la Terre. Elle ne fait pas de lumière : c’est le Soleil qui l’éclaire. Selon les jours, on la voit ronde ou en croissant. En 1969, des astronautes ont marché sur la Lune.', questions: [
    ['Autour de quoi tourne la Lune ?', 'la Terre', 'le Soleil', 'une étoile'],
    ['Qui éclaire la Lune ?', 'le Soleil', 'la Terre', 'les nuages'],
    ['Qui a marché sur la Lune ?', 'des astronautes', 'des pilotes', 'des enfants']] },

  // ---- Niveau 8 : consignes et recettes (dans quel ordre ? avec quoi ?)
  { level: 8, title: 'La salade de fruits', text: 'D’abord, lave une pomme et une poire. Ensuite, épluche une banane. Coupe tous les fruits en petits morceaux. Mets-les dans un saladier avec un peu de jus d’orange. Pour finir, mélange doucement.', questions: [
    ['Que faut-il faire en premier ?', 'laver les fruits', 'couper les fruits', 'mélanger'],
    ['Où met-on les morceaux ?', 'dans un saladier', 'dans un verre', 'dans le four'],
    ['Quel fruit faut-il éplucher ?', 'la banane', 'la pomme', 'la poire']] },
  { level: 8, title: 'Faire pousser un haricot', text: 'Prends un pot de yaourt et remplis-le de terre. Fais un petit trou avec ton doigt. Pose un haricot dedans et recouvre-le de terre. Arrose un peu. Place le pot près d’une fenêtre.', questions: [
    ['Que met-on dans le pot de yaourt ?', 'de la terre', 'du sable', 'de l’eau'],
    ['Avec quoi fait-on le trou ?', 'avec le doigt', 'avec une pelle', 'avec un crayon'],
    ['Où faut-il placer le pot ?', 'près d’une fenêtre', 'dans le noir', 'dans le frigo']] },
  { level: 8, title: 'Le jeu du loup', text: 'Un enfant est le loup. Les autres courent pour lui échapper. Quand le loup touche un enfant, cet enfant devient le loup à son tour. Attention : il est interdit de sortir de la cour !', questions: [
    ['Que font les autres enfants ?', 'ils courent', 'ils se cachent', 'ils chantent'],
    ['Qui devient le loup ?', 'l’enfant touché', 'le plus grand', 'la maîtresse'],
    ['Qu’est-ce qui est interdit ?', 'sortir de la cour', 'courir vite', 'toucher un enfant']] },
  { level: 8, title: 'Le masque de chat', text: 'Découpe un rond dans du carton. Fais deux trous pour les yeux. Colle deux triangles en haut pour les oreilles. Dessine des moustaches. Attache un élastique de chaque côté.', questions: [
    ['Quelle forme faut-il découper ?', 'un rond', 'un carré', 'une étoile'],
    ['À quoi servent les deux trous ?', 'à voir', 'à respirer', 'à manger'],
    ['Que colle-t-on en haut du masque ?', 'deux triangles', 'deux ronds', 'un élastique']] },
  { level: 8, title: 'Traverser la rue', text: 'Arrête-toi au bord du trottoir, sur le passage piéton. Regarde à gauche, puis à droite, puis encore à gauche. Si le petit bonhomme est vert et qu’aucune voiture n’arrive, traverse sans courir.', questions: [
    ['Où faut-il traverser ?', 'au passage piéton', 'entre les voitures', 'au milieu de la rue'],
    ['De quel côté regarde-t-on d’abord ?', 'à gauche', 'à droite', 'en haut'],
    ['De quelle couleur doit être le bonhomme ?', 'vert', 'rouge', 'orange']] },
  { level: 8, title: 'Le chocolat chaud', text: 'Verse du lait dans une casserole. Demande à un adulte de le faire chauffer. Ajoute deux cuillères de chocolat en poudre et mélange bien. Attends un peu avant de boire : c’est chaud !', questions: [
    ['Qui fait chauffer le lait ?', 'un adulte', 'l’enfant', 'le chat'],
    ['Combien de cuillères de chocolat faut-il ?', 'deux', 'une', 'cinq'],
    ['Pourquoi faut-il attendre avant de boire ?', 'c’est chaud', 'c’est froid', 'c’est sucré']] },

  // ---- Niveau 9 : pourquoi ? (la cause, ce que veut faire le personnage : c'est écrit dans le texte)
  { level: 9, title: 'Le goûter partagé', text: 'À la récré, Anna voit que Malo n’a pas de goûter : il a oublié son sac à la maison. Anna coupe sa brioche en deux et lui en donne la moitié. Malo la remercie avec un grand sourire.', questions: [
    ['Pourquoi Malo n’a-t-il pas de goûter ?', 'il a oublié son sac', 'il n’a pas faim', 'il est malade'],
    ['Pourquoi Anna coupe-t-elle sa brioche ?', 'pour la partager', 'pour la cacher', 'pour la jeter'],
    ['Pourquoi Malo sourit-il ?', 'Anna l’aide', 'il a gagné', 'il rentre chez lui']] },
  { level: 9, title: 'Le gros pull', text: 'Ce matin, Hugo sort en short et en tee-shirt. Dehors, le vent est glacé. Au bout de cinq minutes, Hugo tremble de froid. Il remonte vite dans sa chambre pour mettre un gros pull.', questions: [
    ['Pourquoi Hugo tremble-t-il ?', 'il a froid', 'il a peur', 'il a couru'],
    ['Pourquoi Hugo a-t-il froid ?', 'il est en short', 'il est mouillé', 'il est malade'],
    ['Pourquoi remonte-t-il dans sa chambre ?', 'pour mettre un pull', 'pour dormir', 'pour jouer']] },
  { level: 9, title: 'Le vase', text: 'Lou joue au ballon dans le salon. Paf ! Le ballon renverse le vase, qui se casse. Lou ramasse les morceaux et va voir maman : « Pardon, je n’aurais pas dû jouer ici. » Maman l’embrasse, car Lou a dit la vérité.', questions: [
    ['Pourquoi le vase est-il cassé ?', 'le ballon l’a renversé', 'le chat l’a poussé', 'maman l’a lâché'],
    ['Pourquoi Lou dit-elle pardon ?', 'elle a cassé le vase', 'elle est en retard', 'elle a crié'],
    ['Pourquoi maman embrasse-t-elle Lou ?', 'Lou a dit la vérité', 'Lou a gagné', 'c’est sa fête']] },
  { level: 9, title: 'Le chien des voisins', text: 'Toute la nuit, le chien des voisins aboie. Personne ne peut dormir. Au matin, on comprend tout : un chaton est coincé en haut de l’arbre ! Le chien voulait prévenir ses maîtres.', questions: [
    ['Pourquoi personne ne peut-il dormir ?', 'le chien aboie', 'il y a un orage', 'il fait trop chaud'],
    ['Pourquoi le chien aboie-t-il ?', 'pour prévenir', 'il a faim', 'il veut jouer']] },
  { level: 9, title: 'Les radis', text: 'Margot sème des graines de radis. Mais elle oublie de les arroser pendant toute une semaine. La terre devient sèche et rien ne pousse. Alors Margot dessine un arrosoir sur son calendrier pour ne plus oublier.', questions: [
    ['Pourquoi rien ne pousse-t-il ?', 'la terre est sèche', 'il fait trop froid', 'un oiseau a tout mangé'],
    ['Pourquoi la terre est-elle sèche ?', 'Margot n’a pas arrosé', 'il pleut trop', 'le soleil est caché'],
    ['Pourquoi Margot dessine-t-elle un arrosoir ?', 'pour ne plus oublier', 'pour faire joli', 'pour son frère']] },
  { level: 9, title: 'La course de l’école', text: 'Tous les soirs, Théo court avec son papa pour s’entraîner. Le jour de la course de l’école, il part doucement pour garder des forces. Dans le dernier tour, il double tout le monde et il gagne !', questions: [
    ['Pourquoi Théo court-il tous les soirs ?', 'pour s’entraîner', 'pour aller à l’école', 'pour promener le chien'],
    ['Pourquoi Théo part-il doucement ?', 'pour garder des forces', 'il a mal au pied', 'il est tombé'],
    ['Pourquoi Théo peut-il doubler tout le monde ?', 'il a gardé des forces', 'les autres dorment', 'il triche']] },
  { level: 9, title: 'La tirelire', text: 'Depuis des semaines, Mila garde ses pièces dans sa tirelire. Samedi, elle l’ouvre et court au magasin. Elle achète un livre sur les chevaux, car c’est l’animal préféré de son frère. Demain, c’est son anniversaire !', questions: [
    ['Pourquoi Mila ouvre-t-elle sa tirelire ?', 'pour acheter un cadeau', 'pour compter', 'pour la ranger'],
    ['Pourquoi choisit-elle un livre sur les chevaux ?', 'son frère les adore', 'il est gratuit', 'elle a un cheval']] },

  // ---- Niveau 10 : ce que pense ou ressent le personnage (on le devine à ce qu'il fait ou dit)
  { level: 10, title: 'Le dessin', text: 'Jules montre son dessin à la maîtresse. Elle dit : « Bravo, il est magnifique ! » et elle l’accroche au mur de la classe. Jules rougit et ne peut pas s’empêcher de sourire.', questions: [
    ['Comment se sent Jules ?', 'fier', 'triste', 'en colère'],
    ['Que pense la maîtresse du dessin ?', 'il est très beau', 'il est raté', 'il est trop petit'],
    ['Pourquoi Jules sourit-il ?', 'on l’a félicité', 'il a gagné', 'il a faim']] },
  { level: 10, title: 'Le doudou', text: 'Le soir, Nina cherche partout son doudou. Elle a les larmes aux yeux. Enfin, papa le trouve sous le canapé. Nina le serre très fort contre elle et lui fait un gros bisou.', questions: [
    ['Comment se sent Nina quand elle cherche ?', 'triste', 'joyeuse', 'fière'],
    ['Comment se sent Nina à la fin ?', 'heureuse', 'triste', 'fâchée'],
    ['Pourquoi Nina a-t-elle les larmes aux yeux ?', 'son doudou est perdu', 'elle a mal', 'elle a sommeil']] },
  { level: 10, title: 'L’orage', text: 'Dehors, le tonnerre gronde très fort. Sacha se cache sous sa couette et ferme les yeux. Sa grande sœur vient s’asseoir près de lui et lui tient la main. Peu à peu, Sacha se calme.', questions: [
    ['Comment se sent Sacha pendant l’orage ?', 'il a peur', 'il s’amuse', 'il est fâché'],
    ['Pourquoi sa sœur lui tient-elle la main ?', 'pour le rassurer', 'pour jouer', 'pour partir'],
    ['Comment se sent Sacha à la fin ?', 'plus calme', 'plus en colère', 'plus triste']] },
  { level: 10, title: 'La tour de cubes', text: 'Léna construit une tour de cubes très haute. Son petit frère arrive en courant et la fait tomber. Léna croise les bras et fronce les sourcils. « Ce n’est pas juste ! » crie-t-elle.', questions: [
    ['Comment se sent Léna ?', 'en colère', 'joyeuse', 'fatiguée'],
    ['Pourquoi Léna crie-t-elle ?', 'sa tour est tombée', 'elle a gagné', 'elle a mal']] },
  { level: 10, title: 'Le nouveau', text: 'Omar arrive dans une nouvelle école. Il ne connaît personne. À la récré, il reste seul près du mur. Zoé s’approche : « Tu veux jouer avec nous ? » Omar sourit enfin.', questions: [
    ['Comment se sent Omar près du mur ?', 'un peu triste', 'très joyeux', 'en colère'],
    ['Pourquoi Zoé s’approche-t-elle ?', 'pour l’inviter', 'pour le gronder', 'pour son goûter'],
    ['Pourquoi Omar sourit-il enfin ?', 'Zoé l’invite', 'il rentre', 'il a gagné']] },
  { level: 10, title: 'La fête de mamie', text: 'Mamie ouvre la porte. Toute la famille est là, avec des ballons et un gros gâteau ! Mamie met les mains sur sa bouche. Elle ne savait pas du tout qu’on lui préparait une fête.', questions: [
    ['Comment se sent mamie ?', 'surprise', 'fâchée', 'fatiguée'],
    ['Pourquoi la famille est-elle là ?', 'pour fêter mamie', 'pour dormir', 'pour travailler'],
    ['Mamie savait-elle qu’il y aurait une fête ?', 'non', 'oui', 'un peu']] },
];

export const petitsTextes = {
  id: 'petits-textes',
  domain: 'francais',
  section: 'Lire',
  title: 'Petits textes',
  icon: '📚',
  skill: 'Lire un petit texte et le comprendre (y compris ce qui n’est pas écrit, pourquoi, ce que ressent un personnage)',
  levels: [
    'Textes très courts', 'Petits textes', 'Textes de 4 phrases', 'Lire entre les lignes', 'Dialogues et pronoms',
    'Titre et ordre des faits', 'Textes documentaires', 'Consignes et recettes', 'Pourquoi ?',
    'Ce que pense le personnage',
  ],
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
