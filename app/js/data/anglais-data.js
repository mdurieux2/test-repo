// Vocabulaire anglais par thème (programme de langues vivantes, cycles 1 et 2).
// Chaque mot a une image : emoji, pastille de couleur ou chiffre.

export const ENGLISH_THEMES = [
  {
    title: 'Les couleurs', icon: '🎨',
    words: [
      { en: 'red', fr: 'rouge', swatch: '#ff4d4d' }, { en: 'blue', fr: 'bleu', swatch: '#3d7dff' },
      { en: 'green', fr: 'vert', swatch: '#2fbf5b' }, { en: 'yellow', fr: 'jaune', swatch: '#ffd23f' },
      { en: 'orange', fr: 'orange', swatch: '#ff8a3d' }, { en: 'pink', fr: 'rose', swatch: '#ff8fc7' },
      { en: 'purple', fr: 'violet', swatch: '#9b5cff' }, { en: 'black', fr: 'noir', swatch: '#222' },
      { en: 'white', fr: 'blanc', swatch: '#fff' }, { en: 'brown', fr: 'marron', swatch: '#8b5a2b' },
    ],
  },
  {
    title: 'Les nombres', icon: '🔢',
    words: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
      .map((en, i) => ({ en, fr: String(i + 1), label: String(i + 1) })),
  },
  {
    title: 'Les animaux', icon: '🐶',
    words: [
      { en: 'cat', fr: 'le chat', emoji: '🐱' }, { en: 'dog', fr: 'le chien', emoji: '🐶' },
      { en: 'bird', fr: "l'oiseau", emoji: '🐦' }, { en: 'fish', fr: 'le poisson', emoji: '🐟' },
      { en: 'horse', fr: 'le cheval', emoji: '🐴' }, { en: 'cow', fr: 'la vache', emoji: '🐄' },
      { en: 'pig', fr: 'le cochon', emoji: '🐷' }, { en: 'duck', fr: 'le canard', emoji: '🦆' },
      { en: 'rabbit', fr: 'le lapin', emoji: '🐰' }, { en: 'lion', fr: 'le lion', emoji: '🦁' },
      { en: 'mouse', fr: 'la souris', emoji: '🐭' }, { en: 'frog', fr: 'la grenouille', emoji: '🐸' },
      { en: 'bear', fr: "l'ours", emoji: '🐻' }, { en: 'elephant', fr: "l'éléphant", emoji: '🐘' },
    ],
  },
  {
    title: 'À manger', icon: '🍎',
    words: [
      { en: 'apple', fr: 'la pomme', emoji: '🍎' }, { en: 'banana', fr: 'la banane', emoji: '🍌' },
      { en: 'cake', fr: 'le gâteau', emoji: '🎂' }, { en: 'bread', fr: 'le pain', emoji: '🍞' },
      { en: 'milk', fr: 'le lait', emoji: '🥛' }, { en: 'cheese', fr: 'le fromage', emoji: '🧀' },
      { en: 'egg', fr: "l'œuf", emoji: '🥚' }, { en: 'pizza', fr: 'la pizza', emoji: '🍕' },
      { en: 'carrot', fr: 'la carotte', emoji: '🥕' }, { en: 'strawberry', fr: 'la fraise', emoji: '🍓' },
      { en: 'ice cream', fr: 'la glace', emoji: '🍦' },
    ],
  },
  {
    title: 'Le corps', icon: '✋',
    words: [
      { en: 'eye', fr: "l'œil", emoji: '👁️' }, { en: 'ear', fr: "l'oreille", emoji: '👂' },
      { en: 'nose', fr: 'le nez', emoji: '👃' }, { en: 'mouth', fr: 'la bouche', emoji: '👄' },
      { en: 'hand', fr: 'la main', emoji: '✋' }, { en: 'foot', fr: 'le pied', emoji: '🦶' },
      { en: 'leg', fr: 'la jambe', emoji: '🦵' }, { en: 'tooth', fr: 'la dent', emoji: '🦷' },
    ],
  },
  {
    title: 'Les vêtements', icon: '👕',
    words: [
      { en: 'cap', fr: 'la casquette', emoji: '🧢' }, { en: 'T-shirt', fr: 'le tee-shirt', emoji: '👕' },
      { en: 'dress', fr: 'la robe', emoji: '👗' }, { en: 'shoes', fr: 'les chaussures', emoji: '👟' },
      { en: 'socks', fr: 'les chaussettes', emoji: '🧦' }, { en: 'coat', fr: 'le manteau', emoji: '🧥' },
      { en: 'trousers', fr: 'le pantalon', emoji: '👖' }, { en: 'scarf', fr: "l'écharpe", emoji: '🧣' },
      { en: 'gloves', fr: 'les gants', emoji: '🧤' },
    ],
  },
  {
    title: "L'école", icon: '🎒',
    words: [
      { en: 'book', fr: 'le livre', emoji: '📖' }, { en: 'pencil', fr: 'le crayon', emoji: '✏️' },
      { en: 'bag', fr: 'le cartable', emoji: '🎒' }, { en: 'scissors', fr: 'les ciseaux', emoji: '✂️' },
      { en: 'ruler', fr: 'la règle', emoji: '📏' }, { en: 'school', fr: "l'école", emoji: '🏫' },
      { en: 'crayons', fr: 'les craies grasses', emoji: '🖍️' },
    ],
  },
  {
    title: 'La météo', icon: '☀️',
    words: [
      { en: 'sun', fr: 'le soleil', emoji: '☀️' }, { en: 'rain', fr: 'la pluie', emoji: '🌧️' },
      { en: 'snow', fr: 'la neige', emoji: '❄️' }, { en: 'cloud', fr: 'le nuage', emoji: '☁️' },
      { en: 'wind', fr: 'le vent', emoji: '💨' }, { en: 'rainbow', fr: "l'arc-en-ciel", emoji: '🌈' },
    ],
  },
];
