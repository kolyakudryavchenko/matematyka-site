/* Візуалізація 1. Дослідження квадратичної функції.
   Учень змінює повзунками коефіцієнти a, b, c і спостерігає перебудову параболи;
   поряд обчислюються вершина, дискримінант і корені. Передбачено режим завдання:
   система задає графік, а учень добирає коефіцієнти, щоб його відтворити. */

import { Plot, slider } from './plot.js';
import { fmt, el } from '../core.js';

export function mount(host, opts = {}) {
  const stage = el('canvas', { class: 'vis-stage', 'data-h': '380', role: 'img',
    'aria-label': 'Графік квадратичної функції, що перебудовується під час зміни коефіцієнтів' });
  const readout = el('div', { class: 'readout' });
  const controls = el('div', { class: 'vis-controls' });
  const wrap = el('div', { class: 'vis' }, stage, readout, controls);
  host.append(wrap);

  const plot = new Plot(stage, { xmin: -10, xmax: 10, ymin: -10, ymax: 10 });
  let a = 1, b = -2, c = -3;
  let target = null;           // режим завдання
  const msg = el('div', { class: 'verdict hint', hidden: true });

  function draw() {
    plot.clear(); plot.grid(1); plot.axes(1);
    if (target) {
      plot.curve((x) => target.a * x * x + target.b * x + target.c,
        { color: '#b0bccd', width: 3, dash: [7, 6] });
    }
    plot.curve((x) => a * x * x + b * x + c);

    const x0 = -b / (2 * a);
    const y0 = a * x0 * x0 + b * x0 + c;
    plot.segment(x0, plot.range.ymin, x0, plot.range.ymax, { color: '#c8d3e2', width: 1.4, dash: [4, 5] });
    plot.point(x0, y0, { color: '#1f5fa9', label: 'вершина' });

    const d = b * b - 4 * a * c;
    if (d >= 0) {
      const r1 = (-b - Math.sqrt(d)) / (2 * a);
      const r2 = (-b + Math.sqrt(d)) / (2 * a);
      plot.point(r1, 0, { color: '#b32d1f' });
      if (Math.abs(r1 - r2) > 1e-9) plot.point(r2, 0, { color: '#b32d1f' });
    }

    const roots = d > 0
      ? `$x_1 = ${fmt((-b - Math.sqrt(d)) / (2 * a))}$, $x_2 = ${fmt((-b + Math.sqrt(d)) / (2 * a))}$`
      : d === 0 ? `$x = ${fmt(-b / (2 * a))}$` : 'дійсних коренів немає';

    readout.innerHTML = `
      <div>Функція: <b>$y = ${a}x^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)}x ${c < 0 ? '-' : '+'} ${Math.abs(c)}$</b></div>
      <div>Вершина: <b>$(${fmt(x0)};\\ ${fmt(y0)})$</b></div>
      <div>Дискримінант: <b>$D = ${fmt(d)}$</b></div>
      <div>Корені: <b>${roots}</b></div>
      <div>Вітки: <b>${a > 0 ? 'угору' : 'униз'}</b></div>`;
    if (window.renderMathInElement) window.renderMathInElement(readout, { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false });

    if (target) {
      const hit = a === target.a && b === target.b && c === target.c;
      msg.hidden = false;
      msg.className = 'verdict ' + (hit ? 'ok' : 'hint');
      msg.textContent = hit
        ? 'Є збіг! Ви відтворили заданий графік.'
        : 'Доберіть коефіцієнти так, щоб суцільна парабола накрила штрихову.';
    } else {
      msg.hidden = true;
    }
  }
  plot.redraw = draw;

  slider(controls, { id: 'q-a', label: 'a', min: -3, max: 3, step: .5, value: a,
    onInput: (v) => { a = v || .5; draw(); } });
  slider(controls, { id: 'q-b', label: 'b', min: -8, max: 8, step: 1, value: b,
    onInput: (v) => { b = v; draw(); } });
  slider(controls, { id: 'q-c', label: 'c', min: -8, max: 8, step: 1, value: c,
    onInput: (v) => { c = v; draw(); } });

  if (opts.mode !== 'roots') {
    const btn = el('button', { class: 'btn', type: 'button', onclick: () => {
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
      target = { a: pick([-2, -1, 1, 1, 2]), b: pick([-6, -4, -2, 0, 2, 4, 6]), c: pick([-6, -3, 0, 3, 6]) };
      draw();
    } }, 'Режим завдання: відтворити графік');
    const off = el('button', { class: 'btn ghost', type: 'button', onclick: () => { target = null; draw(); } }, 'Вимкнути');
    controls.append(el('div', { class: 'btn-row' }, btn, off), msg);
  }

  draw();
  return { destroy: () => wrap.remove() };
}
