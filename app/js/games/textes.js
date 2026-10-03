// Petits textes à lire (CP, CE1) : un court texte, puis une question de compréhension.
// Le bouton « Écouter le texte » aide l'enfant qui bloque ; la question est toujours lue.

import { pick, shuffle } from '../random.js';

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
];

export const petitsTextes = {
  id: 'petits-textes',
  domain: 'francais',
  section: 'Lire',
  title: 'Petits textes',
  icon: '📚',
  skill: 'Lire un petit texte et le comprendre',
  levels: ['Textes très courts', 'Petits textes', 'Textes de 4 phrases'],
  generate(level, rng) {
    const story = pick(rng, TEXTS.filter((t) => t.level === level));
    const [question, answer, ...others] = pick(rng, story.questions);
    return {
      key: `petits-textes:${story.title}`,
      text: question,
      instruction: ['Lis le petit texte, puis réponds à la question.', question],
      short: { key: 'petits-textes', text: question },
      replay: [question],
      stage: { type: 'text', title: story.title, text: story.text },
      choices: shuffle(rng, [answer, ...others]).map((value) => ({ value, label: value })),
      choiceStyle: 'answers',
      answer,
      success: { speak: `${answer[0].toUpperCase()}${answer.slice(1)} !` },
    };
  },
};

export const TEXT_DATA = TEXTS;
