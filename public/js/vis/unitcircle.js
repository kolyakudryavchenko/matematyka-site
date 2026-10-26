/* Візуалізація 3. Тригонометричне коло.
   Учень переміщує точку по одиничному колу й одночасно бачить величину кута
   в градусах і радіанах, синус і косинус як координати точки та відповідне
   положення на графіку тригонометричної функції. */

import { Plot, slider } from './plot.js';
import { fmt, el } from '../core.js';

export function mount(host) {
  const left = el('canvas', { class: 'vis-stage', 'data-h': '330', role: 'img',
    'aria-label': 'Одиничне коло з рухомою точкою' });
  const right = el('canvas', { class: 'vis-stage', 'data-h': '330', role: 'img',
    'aria-label': 'Графіки синуса й косинуса з поточною точкою' });
  const grid = el('div', { style: 'display:grid;grid-template-columns:1fr;gap:0' }, left, right);
  if (window.matchMedia('(min-width: 860px)').matches) grid.style.gridTemplateColumns = '1fr 1fr';
  const readout = el('div', { class: 'readout' });
  const controls = el('div', { class: 'vis-controls' });
  const wrap = el('div', { class: 'vis' }, grid, readout, controls);
  host.append(wrap);

  const pc = new Plot(left, { xmin: -1.6, xmax: 1.6, ymin: -1.6, ymax: 1.6 });
  const pg = new Plot(right, { xmin: 0, xmax: 2 * Math.PI, ymin: -1.4, ymax: 1.4 });
  let deg = 30;
  let showFn = 'sin';

  function draw() {
    const rad = (deg * Math.PI) / 180;
    const cs = Math.cos(rad), sn = Math.sin(rad);

    pc.clear(); pc.grid(0.5); pc.axes(0.5);
    pc.circle(0, 0, 1, { color: '#8b9ab1', width: 1.8 });
    pc.segment(0, 0, cs, sn, { color: '#1f5fa9', width: 2.4 });
    pc.segment(cs, 0, cs, sn, { color: '#b32d1f', width: 1.8, dash: [4, 4] });
    pc.segment(0, sn, cs, sn, { color: '#19703f', width: 1.8, dash: [4, 4] });
    pc.point(cs, sn, { color: '#1f5fa9', label: 'P' });
    pc.point(cs, 0, { color: '#b32d1f', r: 4 });
    pc.point(0, sn, { color: '#19703f', r: 4 });

    pg.clear(); pg.grid(0.5); pg.axes(0.5);
    pg.curve(Math.sin, { color: showFn === 'sin' ? '#19703f' : '#cdd7e4', width: showFn === 'sin' ? 2.6 : 1.8 });
    pg.curve(Math.cos, { color: showFn === 'cos' ? '#b32d1f' : '#cdd7e4', width: showFn === 'cos' ? 2.6 : 1.8 });
    const t = ((rad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const val = showFn === 'sin' ? Math.sin(t) : Math.cos(t);
    pg.segment(t, pg.range.ymin, t, pg.range.ymax, { color: '#c8d3e2', width: 1.4, dash: [4, 5] });
    pg.point(t, val, { color: showFn === 'sin' ? '#19703f' : '#b32d1f' });

    const quarter = deg % 360 === 0 ? '—' : ['I', 'II', 'III', 'IV'][Math.floor((((deg % 360) + 360) % 360) / 90)];
    readout.innerHTML = `
      <div>Кут: <b>$${deg}^\\circ = ${fmt(rad, 3)}$ рад</b></div>
      <div>Чверть: <b>${quarter}</b></div>
      <div><span style="color:#b32d1f">●</span> $\\cos\\alpha$ (абсциса): <b>$${fmt(cs, 3)}$</b></div>
      <div><span style="color:#19703f">●</span> $\\sin\\alpha$ (ордината): <b>$${fmt(sn, 3)}$</b></div>
      <div>$\\sin^2\\alpha + \\cos^2\\alpha = $ <b>$${fmt(sn * sn + cs * cs, 3)}$</b></div>`;
    if (window.renderMathInElement) window.renderMathInElement(readout, { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false });
  }
  pc.redraw = draw; pg.redraw = draw;

  slider(controls, { id: 'uc-a', label: 'α°', min: 0, max: 360, step: 1, value: deg, onInput: (v) => { deg = v; draw(); } });

  const row = el('div', { class: 'btn-row' },
    el('span', { style: 'color:#566781;font-size:.93rem' }, 'Графік праворуч:'),
    ...['sin', 'cos'].map((f) => el('button', { class: 'btn', type: 'button',
      onclick: () => { showFn = f; draw(); } }, f === 'sin' ? 'синус' : 'косинус')),
    ...[0, 30, 45, 60, 90, 180, 270].map((d) => el('button', { class: 'btn ghost', type: 'button',
      onclick: () => { deg = d; document.getElementById('uc-a').value = d;
        document.getElementById('uc-a').dispatchEvent(new Event('input')); } }, d + '°')));
  controls.append(row);

  /* переміщення точки мишею або пальцем безпосередньо по колу */
  const setFromEvent = (ev) => {
    const r = left.getBoundingClientRect();
    const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
    const x = pc.ux(cx - r.left), y = pc.uy(cy - r.top);
    let a = Math.round((Math.atan2(y, x) * 180) / Math.PI);
    if (a < 0) a += 360;
    deg = a;
    const inp = document.getElementById('uc-a');
    if (inp) { inp.value = a; inp.dispatchEvent(new Event('input')); } else draw();
  };
  let dragging = false;
  left.addEventListener('pointerdown', (e) => { dragging = true; setFromEvent(e); });
  left.addEventListener('pointermove', (e) => { if (dragging) setFromEvent(e); });
  window.addEventListener('pointerup', () => { dragging = false; });

  draw();
  return { destroy: () => wrap.remove() };
}
