/* Візуалізація 4. Геометричний зміст похідної.
   Учень переміщує другу точку вздовж кривої й спостерігає, як січна поступово
   переходить у дотичну, а її кутовий коефіцієнт наближається до значення похідної. */

import { Plot, slider } from './plot.js';
import { fmt, el } from '../core.js';

const FNS = {
  sq: { f: (x) => x * x, d: (x) => 2 * x, tex: 'x^2' },
  cube: { f: (x) => x * x * x / 3, d: (x) => x * x, tex: '\\frac{x^3}{3}' },
  sin: { f: (x) => 2 * Math.sin(x), d: (x) => 2 * Math.cos(x), tex: '2\\sin x' },
};

export function mount(host) {
  const stage = el('canvas', { class: 'vis-stage', 'data-h': '390', role: 'img',
    'aria-label': 'Крива, січна та дотична в точці' });
  const readout = el('div', { class: 'readout' });
  const controls = el('div', { class: 'vis-controls' });
  const wrap = el('div', { class: 'vis' }, stage, readout, controls);
  host.append(wrap);

  const plot = new Plot(stage, { xmin: -6, xmax: 6, ymin: -5, ymax: 9 });
  let key = 'sq', x0 = 1.5, dx = 2.5;

  function draw() {
    const { f, d, tex } = FNS[key];
    plot.clear(); plot.grid(1); plot.axes(1);
    plot.curve(f, { color: '#1f5fa9', width: 2.6 });

    const y0 = f(x0);
    const k = d(x0);
    plot.curve((x) => y0 + k * (x - x0), { color: '#19703f', width: 2.2 });

    const x1 = x0 + dx;
    const y1 = f(x1);
    const ks = Math.abs(dx) > 1e-9 ? (y1 - y0) / dx : k;
    plot.curve((x) => y0 + ks * (x - x0), { color: '#b32d1f', width: 2, dash: [8, 6] });

    plot.point(x0, y0, { color: '#1f5fa9', label: 'A' });
    if (Math.abs(dx) > 1e-9) plot.point(x1, y1, { color: '#b32d1f', label: 'B' });

    readout.innerHTML = `
      <div>Функція: <b>$f(x) = ${tex}$</b></div>
      <div>Точка дотику: <b>$A(${fmt(x0)};\\ ${fmt(y0)})$</b></div>
      <div><span style="color:#b32d1f">▬</span> Кутовий коефіцієнт січної: <b>$${fmt(ks, 3)}$</b></div>
      <div><span style="color:#19703f">▬</span> Похідна $f'(${fmt(x0)})$: <b>$${fmt(k, 3)}$</b></div>
      <div>Різниця: <b>$${fmt(Math.abs(ks - k), 3)}$</b></div>
      <div>Рівняння дотичної: <b>$y = ${fmt(k)}x ${y0 - k * x0 < 0 ? '-' : '+'} ${fmt(Math.abs(y0 - k * x0))}$</b></div>`;
    if (window.renderMathInElement) window.renderMathInElement(readout, { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false });
  }
  plot.redraw = draw;

  const sel = el('select', { id: 'dv-f', 'aria-label': 'Функція', onchange: (e) => { key = e.target.value; draw(); } },
    el('option', { value: 'sq' }, 'y = x²'),
    el('option', { value: 'cube' }, 'y = x³/3'),
    el('option', { value: 'sin' }, 'y = 2·sin x'));
  controls.append(el('div', { class: 'ctrl' }, el('label', { for: 'dv-f' }, 'f(x)'), sel, el('output', {}, '')));

  slider(controls, { id: 'dv-x0', label: 'x₀', min: -4, max: 4, step: .1, value: x0, onInput: (v) => { x0 = v; draw(); } });
  slider(controls, { id: 'dv-dx', label: 'Δx', min: -3, max: 3, step: .05, value: dx, onInput: (v) => { dx = v; draw(); } });
  controls.append(el('p', { style: 'margin:6px 0 0;color:#566781;font-size:.92rem' },
    'Зменшуйте Δx до нуля: штрихова січна накладається на суцільну дотичну, а її кутовий коефіцієнт прямує до значення похідної.'));

  draw();
  return { destroy: () => wrap.remove() };
}
