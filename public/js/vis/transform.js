/* Візуалізація 2. Перетворення графіків функцій.
   Вихідний і перетворений графіки показано одночасно, тому зсув, розтяг
   і відображення сприймаються як неперервний процес, а не як два окремі малюнки. */

import { Plot, slider } from './plot.js';
import { el } from '../core.js';

const BASES = {
  parabola: { f: (x) => x * x, tex: 'x^2' },
  linear: { f: (x) => x, tex: 'x' },
  abs: { f: (x) => Math.abs(x), tex: '|x|' },
  sqrt: { f: (x) => (x >= 0 ? Math.sqrt(x) : NaN), tex: '\\sqrt{x}' },
  sin: { f: (x) => Math.sin(x), tex: '\\sin x' },
};

export function mount(host, opts = {}) {
  const stage = el('canvas', { class: 'vis-stage', 'data-h': '380', role: 'img',
    'aria-label': 'Вихідний і перетворений графіки функції' });
  const readout = el('div', { class: 'readout' });
  const controls = el('div', { class: 'vis-controls' });
  const wrap = el('div', { class: 'vis' }, stage, readout, controls);
  host.append(wrap);

  const plot = new Plot(stage, { xmin: -9, xmax: 9, ymin: -7, ymax: 9 });
  let key = opts.base && BASES[opts.base] ? opts.base : 'parabola';
  let m = 0, n = 0, k = 1;

  const sel = el('select', { 'aria-label': 'Базова функція', onchange: (e) => { key = e.target.value; draw(); } },
    ...Object.entries(BASES).map(([id, v]) => el('option', { value: id, selected: id === key }, 'y = ' + v.tex.replace(/\\\\?(sqrt|sin)/, '$1').replace('{x}', 'x'))));

  function draw() {
    const base = BASES[key];
    plot.clear(); plot.grid(1); plot.axes(1);
    plot.curve(base.f, { color: '#b0bccd', width: 2, dash: [7, 6] });
    plot.curve((x) => k * base.f(x - m) + n, { color: '#1f5fa9', width: 2.6 });

    const sg = (v) => (v < 0 ? ` - ${Math.abs(v)}` : ` + ${v}`);
    const inner = m === 0 ? 'x' : `x${sg(-m)}`;
    const body = base.tex.replace(/x/g, m === 0 ? 'x' : `(${inner})`);
    const scaled = k === 1 ? body : (k === -1 ? `-${body}` : `${k}${body}`);
    const full = n === 0 ? scaled : `${scaled}${sg(n)}`;

    const parts = [];
    if (m) parts.push(`зсув уздовж $Ox$ на ${Math.abs(m)} ${m > 0 ? 'праворуч' : 'ліворуч'}`);
    if (k < 0) parts.push('симетрія відносно осі $Ox$');
    if (Math.abs(k) !== 1) parts.push(`${Math.abs(k) > 1 ? 'розтяг' : 'стиск'} у ${Math.abs(k) > 1 ? Math.abs(k) : 1 / Math.abs(k)} раз${Math.abs(k) > 1 ? 'и' : 'и'} від осі $Ox$`);
    if (n) parts.push(`зсув уздовж $Oy$ на ${Math.abs(n)} ${n > 0 ? 'вгору' : 'вниз'}`);

    readout.innerHTML = `
      <div>Вихідна: <b>$y = ${base.tex}$</b></div>
      <div>Перетворена: <b>$y = ${full}$</b></div>
      <div>Що виконано: <b>${parts.length ? parts.join(', ') : 'перетворень немає'}</b></div>`;
    if (window.renderMathInElement) window.renderMathInElement(readout, { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false });
  }
  plot.redraw = draw;

  controls.append(el('div', { class: 'ctrl' },
    el('label', { for: 'tr-base' }, 'f(x)'), sel, el('output', {}, '')));
  sel.id = 'tr-base';

  slider(controls, { id: 'tr-m', label: 'm', min: -5, max: 5, step: .5, value: m, onInput: (v) => { m = v; draw(); } });
  slider(controls, { id: 'tr-k', label: 'k', min: -3, max: 3, step: .5, value: k, onInput: (v) => { k = v || .5; draw(); } });
  slider(controls, { id: 'tr-n', label: 'n', min: -5, max: 5, step: .5, value: n, onInput: (v) => { n = v; draw(); } });
  controls.append(el('p', { class: 'muted', style: 'margin:6px 0 0;color:#566781;font-size:.92rem' },
    'Перетворена функція: y = k·f(x − m) + n'));

  draw();
  return { destroy: () => wrap.remove() };
}
