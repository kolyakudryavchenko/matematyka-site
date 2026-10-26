/* Візуалізація 5. Динамічні геометричні побудови.
   Для тем планіметрії та стереометрії передбачено вбудовування аплетів GeoGebra
   засобами Apps API. Оскільки аплет завантажується із зовнішнього сервера, сторінка
   спершу показує власну динамічну побудову, а аплет GeoGebra підключається на вимогу
   користувача — це зберігає працездатність теми за відсутності з'єднання. */

import { Plot } from './plot.js';
import { el, fmt } from '../core.js';

const GGB_ID = { inscribed: 'ngqhhbpu' };   // «Вписаний кут» у матеріалах GeoGebra

export function mount(host, opts = {}) {
  const stage = el('canvas', { class: 'vis-stage', 'data-h': '400', role: 'img',
    'aria-label': 'Коло з вписаним і центральним кутами' });
  const readout = el('div', { class: 'readout' });
  const controls = el('div', { class: 'vis-controls' });
  const ggbBox = el('div', { style: 'padding:14px;background:#fff', hidden: true });
  const wrap = el('div', { class: 'vis' }, stage, readout, controls, ggbBox);
  host.append(wrap);

  const plot = new Plot(stage, { xmin: -1.7, xmax: 1.7, ymin: -1.5, ymax: 1.5 });
  let aA = 150, aC = 30, aB = 240;   // положення точок на колі, у градусах

  const P = (deg) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];

  function draw() {
    const [ax, ay] = P(aA), [cx, cy] = P(aC), [bx, by] = P(aB);
    plot.clear(); plot.grid(0.5); plot.axes(0.5);
    plot.circle(0, 0, 1, { color: '#8b9ab1', width: 1.8 });

    /* дуга AC, на яку спирається вписаний кут */
    const c = plot.ctx;
    c.save();
    c.strokeStyle = '#e2a33c'; c.lineWidth = 5;
    c.beginPath();
    const rx = Math.abs(plot.px(1) - plot.px(0)), ry = Math.abs(plot.py(1) - plot.py(0));
    c.ellipse(plot.px(0), plot.py(0), rx, ry, 0, -(aC * Math.PI) / 180, -(aA * Math.PI) / 180, true);
    c.stroke();
    c.restore();

    plot.segment(bx, by, ax, ay, { color: '#1f5fa9', width: 2.2 });
    plot.segment(bx, by, cx, cy, { color: '#1f5fa9', width: 2.2 });
    plot.segment(0, 0, ax, ay, { color: '#b32d1f', width: 1.8, dash: [5, 5] });
    plot.segment(0, 0, cx, cy, { color: '#b32d1f', width: 1.8, dash: [5, 5] });

    plot.point(ax, ay, { color: '#8a5a00', label: 'A' });
    plot.point(cx, cy, { color: '#8a5a00', label: 'C' });
    plot.point(bx, by, { color: '#1f5fa9', label: 'B' });
    plot.point(0, 0, { color: '#b32d1f', r: 4, label: 'O' });

    let arc = ((aA - aC) % 360 + 360) % 360;
    const inscribed = arc / 2;
    readout.innerHTML = `
      <div>Дуга $\\smile AC$: <b>$${fmt(arc, 1)}^\\circ$</b></div>
      <div><span style="color:#1f5fa9">●</span> Вписаний кут $\\angle ABC$: <b>$${fmt(inscribed, 1)}^\\circ$</b></div>
      <div><span style="color:#b32d1f">●</span> Центральний кут $\\angle AOC$: <b>$${fmt(arc, 1)}^\\circ$</b></div>
      <div>Відношення: <b>$${fmt(arc / (inscribed || 1), 2)}$</b></div>`;
    if (window.renderMathInElement) window.renderMathInElement(readout, { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false });
  }
  plot.redraw = draw;

  const mk = (id, label, get, set) => {
    const row = el('div', { class: 'ctrl' },
      el('label', { for: id }, label),
      el('input', { type: 'range', id, min: '0', max: '359', step: '1', value: String(get()),
        oninput: (e) => { set(Number(e.target.value)); row.querySelector('output').textContent = e.target.value + '°'; draw(); } }),
      el('output', {}, get() + '°'));
    controls.append(row);
  };
  mk('g-a', 'A', () => aA, (v) => { aA = v; });
  mk('g-c', 'C', () => aC, (v) => { aC = v; });
  mk('g-b', 'B', () => aB, (v) => { aB = v; });

  controls.append(el('p', { style: 'margin:6px 0 10px;color:#566781;font-size:.92rem' },
    'Переміщуйте вершину B по колу: доки точки A і C нерухомі, величина вписаного кута не змінюється.'));

  /* підключення аплета GeoGebra на вимогу */
  const btn = el('button', { class: 'btn', type: 'button' }, 'Відкрити динамічну побудову GeoGebra');
  const note = el('span', { style: 'color:#566781;font-size:.9rem' }, '');
  controls.append(el('div', { class: 'btn-row' }, btn, note));

  btn.addEventListener('click', () => {
    btn.disabled = true;
    note.textContent = 'Завантаження аплета…';
    const holder = el('div', { id: 'ggb-holder' });
    ggbBox.replaceChildren(holder);
    ggbBox.hidden = false;
    const s = document.createElement('script');
    s.src = 'https://www.geogebra.org/apps/deployggb.js';
    s.onload = () => {
      try {
        const app = new window.GGBApplet({
          appName: 'geometry', material_id: GGB_ID[opts.material] || GGB_ID.inscribed,
          width: Math.min(820, host.clientWidth - 28), height: 460,
          showToolBar: false, showAlgebraInput: false, showMenuBar: false, language: 'uk',
        }, true);
        app.inject('ggb-holder');
        note.textContent = '';
      } catch (e) {
        fail();
      }
    };
    s.onerror = fail;
    document.head.append(s);

    function fail() {
      ggbBox.hidden = true;
      btn.disabled = false;
      note.textContent = 'Аплет GeoGebra недоступний без інтернет-з’єднання — скористайтеся побудовою вище.';
    }
    setTimeout(() => { if (!window.GGBApplet) fail(); }, 8000);
  });

  draw();
  return { destroy: () => wrap.remove() };
}
