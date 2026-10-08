// Un tout petit DOM pour les tests des aides (syllabes colorées, couleurs nommées) : juste ce
// qu'utilisent h() et les dessins de render.js, sans dépendance. À importer avant render.js.

class FakeNode {}

class FakeText extends FakeNode {
  constructor(text) {
    super();
    this.data = String(text);
  }

  get textContent() {
    return this.data;
  }
}

class FakeElement extends FakeNode {
  constructor(tag) {
    super();
    this.tagName = tag.toUpperCase();
    this.childNodes = [];
    this.attributes = {};
    this.className = '';
    this.listeners = {};
    this.html = '';
    this.style = { setProperty(key, value) { this[key] = value; } };
  }

  setAttribute(key, value) { this.attributes[key] = String(value); }

  getAttribute(key) { return this.attributes[key] ?? null; }

  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }

  append(...nodes) {
    for (const n of nodes) this.childNodes.push(n instanceof FakeNode ? n : new FakeText(n));
  }

  insertAdjacentHTML(_where, html) { this.html += html; }

  set innerHTML(html) {
    this.html = html;
    this.childNodes = [];
  }

  get innerHTML() { return this.html; }

  get children() { return this.childNodes.filter((n) => n instanceof FakeElement); }

  get textContent() {
    return this.html ? this.html.replace(/<[^>]*>/g, '') : this.childNodes.map((n) => n.textContent).join('');
  }

  get dataset() {
    return Object.fromEntries(Object.entries(this.attributes).filter(([k]) => k.startsWith('data-'))
      .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]));
  }

  get classList() {
    const classes = () => this.className.split(/\s+/).filter(Boolean);
    return {
      contains: (c) => classes().includes(c),
      add: (...cs) => { this.className = [...new Set([...classes(), ...cs])].join(' '); },
      remove: (...cs) => { this.className = classes().filter((x) => !cs.includes(x)).join(' '); },
      toggle: (c, on = !classes().includes(c)) => {
        if (on) this.classList.add(c); else this.classList.remove(c);
        return on;
      },
    };
  }

  /** Sélecteurs simples seulement : « .classe » ou un nom de balise. */
  querySelectorAll(selector) {
    const match = selector.startsWith('.')
      ? (el) => el.classList.contains(selector.slice(1))
      : (el) => el.tagName === selector.toUpperCase();
    const out = [];
    const walk = (el) => {
      for (const child of el.children) {
        if (match(child)) out.push(child);
        walk(child);
      }
    };
    walk(this);
    // un dessin écrit en texte (innerHTML) : on rend un élément qui accepte qu'on lui ajoute du texte
    if (!out.length && this.html.includes(`<${selector}`)) out.push(new FakeElement(selector));
    return out;
  }

  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}

globalThis.Node = FakeNode;
globalThis.document = {
  createElement: (tag) => new FakeElement(tag),
  createElementNS: (_ns, tag) => new FakeElement(tag),
  createTextNode: (text) => new FakeText(text),
};

/** Les éléments (et l'élément lui-même) qui portent une classe. */
export function withClass(root, cls) {
  const nodes = Array.isArray(root) ? root : [root];
  return nodes.flatMap((n) => (n instanceof FakeElement ? [...(n.classList.contains(cls) ? [n] : []), ...n.querySelectorAll(`.${cls}`)] : []));
}

/** Le texte d'un nœud, d'une liste de nœuds ou d'une chaîne. */
export function text(root) {
  if (root === null || root === undefined) return '';
  if (Array.isArray(root)) return root.map(text).join('');
  return typeof root === 'string' || typeof root === 'number' ? String(root) : root.textContent;
}
