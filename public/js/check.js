/* Перевірка відповідей.
   Для завдань із уведенням математичного виразу застосовано двоступеневу схему:
   1) нормалізація рядка та порівняння з еталоном у канонічному вигляді;
   2) якщо збігу немає — числова перевірка підстановкою контрольних значень змінної. */

/* Нормалізація: прибираємо пробіли, уніфікуємо розділовий знак дробу,
   множення, мінус і степінь, зводимо до нижнього регістру. */
export function normalize(src) {
  return String(src)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/[–—−]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/\*\*/g, '^')
    .replace(/\{|\}/g, '')
    .replace(/^\+/, '');
}

/* Перетворення запису учня на вираз, придатний до обчислення:
   неявне множення (2x, 3(x+1), x(x-2)) і степінь ^. */
function toJs(src) {
  let s = normalize(src)
    .replace(/(\d)(x)/g, '$1*$2')
    .replace(/(\d)\(/g, '$1*(')
    .replace(/\)(\d)/g, ')*$1')
    .replace(/\)\(/g, ')*(')
    .replace(/(x)\(/g, '$1*(')
    .replace(/\)(x)/g, ')*$1')
    .replace(/\^/g, '**');
  return s;
}

const SAFE = /^[0-9x+\-*/().^ ]*$/;

export function evalAt(src, x) {
  const js = toJs(src);
  if (!SAFE.test(js.replace(/\*\*/g, '^'))) return NaN;
  try {
    // eslint-disable-next-line no-new-func
    const f = new Function('x', `"use strict"; return (${js});`);
    const v = f(x);
    return typeof v === 'number' && isFinite(v) ? v : NaN;
  } catch (e) {
    return NaN;
  }
}

/* Числова еквівалентність двох виразів на наборі контрольних значень. */
export function sameExpr(a, b) {
  if (normalize(a) === normalize(b)) return true;
  const probes = [-3.7, -2, -0.5, 0.25, 1, 2.3, 4.1];
  let checked = 0;
  for (const p of probes) {
    const va = evalAt(a, p);
    const vb = evalAt(b, p);
    if (Number.isNaN(va) || Number.isNaN(vb)) continue;
    if (Math.abs(va - vb) > 1e-6 * Math.max(1, Math.abs(vb))) return false;
    checked += 1;
  }
  return checked >= 4;
}

export function sameNumber(input, answer, tol = 1e-6) {
  const v = Number(normalize(input));
  if (Number.isNaN(v)) return false;
  return Math.abs(v - answer) <= tol;
}

export const sameSet = (a, b) =>
  a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

export const sameOrder = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
