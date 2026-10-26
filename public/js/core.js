/* Спільні функції ресурсу: навігація, зберігання прогресу, допоміжні утиліти.
   Прогрес зберігається виключно у localStorage браузера користувача. */

export const KEY = 'matematyka.progress.v1';

/* ---------- утиліти ---------- */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const qs = (name) => new URLSearchParams(location.search).get(name);

export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null) continue;
    n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return n;
}

/* Генератор псевдовипадкових чисел із можливістю повторити серію (seed). */
export function rng(seed = Date.now()) {
  let s = seed >>> 0 || 1;
  const next = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  return {
    next,
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    /* ціле з діапазону, але не нуль — щоб умови лишалися змістовними */
    nz: (a, b) => { let v = 0; while (v === 0) v = a + Math.floor(next() * (b - a + 1)); return v; },
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  };
}

export const fmt = (x, d = 2) => {
  const v = Math.abs(x) < 1e-10 ? 0 : x;
  const s = Number(v.toFixed(d)).toString();
  return s.replace('.', ',');
};

/* ---------- зберігання прогресу ---------- */
const blank = () => ({ topics: {}, totalTasks: 0, totalRight: 0, points: 0, bestStreak: 0, log: [] });

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    return Object.assign(blank(), JSON.parse(raw));
  } catch (e) {
    return blank();
  }
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* приватний режим */ }
}

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ігноруємо */ }
}

/* Записати результат однієї спроби. attempts — кількість спроб до правильної відповіді. */
export function record(topicId, level, right, attempts = 1) {
  const s = load();
  const t = s.topics[topicId] || (s.topics[topicId] = { done: 0, right: 0, levels: {}, mastered: false, testBest: null });
  t.done += 1;
  if (right) t.right += 1;
  const lv = t.levels[level] || (t.levels[level] = { done: 0, right: 0 });
  lv.done += 1;
  if (right) lv.right += 1;

  s.totalTasks += 1;
  if (right) {
    s.totalRight += 1;
    s.points += attempts === 1 ? 10 : (attempts === 2 ? 6 : 3);
  }
  s.log.push({ d: Date.now(), t: topicId, r: right ? 1 : 0 });
  if (s.log.length > 400) s.log = s.log.slice(-400);
  save(s);
  return s;
}

export function recordTest(topicId, percent) {
  const s = load();
  const t = s.topics[topicId] || (s.topics[topicId] = { done: 0, right: 0, levels: {}, mastered: false, testBest: null });
  t.testBest = Math.max(t.testBest ?? 0, percent);
  if (t.testBest >= 75) t.mastered = true;
  save(s);
  return s;
}

export const pct = (right, done) => (done ? Math.round((right / done) * 100) : 0);

/* Рівень вважається пройденим, якщо виконано не менше 5 завдань із 70 % правильних:
   саме за цієї умови відкривається наступний рівень у режимі послідовного проходження. */
export function levelPassed(topicId, level) {
  const lv = load().topics[topicId]?.levels?.[level];
  return !!lv && lv.done >= 5 && pct(lv.right, lv.done) >= 70;
}

/* ---------- оформлення сторінки ---------- */
export function markNav() {
  const here = location.pathname.split('/').pop() || 'index.html';
  $$('.nav a').forEach((a) => {
    if (a.getAttribute('href').split('?')[0] === here) a.setAttribute('aria-current', 'page');
  });
}

export function renderMath(root = document.body) {
  if (window.renderMathInElement) {
    window.renderMathInElement(root, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false,
    });
  }
}

export function ready(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else fn();
}
