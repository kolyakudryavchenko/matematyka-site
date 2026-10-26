/* Візуалізація 6. Імовірнісний симулятор.
   Моделювання випадкових експериментів (монета, гральні кубики, урна з кулями)
   із заданою кількістю випробувань. Результати подано таблицею частот і гістограмою,
   побудованою засобами Chart.js. Учень порівнює відносну частоту з теоретичною
   ймовірністю за різної кількості випробувань. */

import { el, fmt } from '../core.js';

const EXP = {
  coin: {
    name: 'Підкидання монети',
    outcomes: ['герб', 'число'],
    theory: () => [0.5, 0.5],
    run: () => (Math.random() < 0.5 ? 0 : 1),
  },
  die: {
    name: 'Один гральний кубик',
    outcomes: ['1', '2', '3', '4', '5', '6'],
    theory: () => Array(6).fill(1 / 6),
    run: () => Math.floor(Math.random() * 6),
  },
  dice2: {
    name: 'Сума очок двох кубиків',
    outcomes: [...Array(11)].map((_, i) => String(i + 2)),
    theory: () => [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1].map((w) => w / 36),
    run: () => Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6),
  },
  urn: {
    name: 'Урна: 3 білі, 5 чорних, 2 червоні кулі',
    outcomes: ['біла', 'чорна', 'червона'],
    theory: () => [0.3, 0.5, 0.2],
    run: () => { const v = Math.random(); return v < 0.3 ? 0 : v < 0.8 ? 1 : 2; },
  },
};

export function mount(host) {
  const controls = el('div', { class: 'vis-controls' });
  const canvas = el('canvas', { 'aria-label': 'Гістограма відносних частот', style: 'max-height:300px' });
  const chartBox = el('div', { style: 'padding:14px;background:#fff' }, canvas);
  const tableBox = el('div', { class: 'readout', style: 'display:block' });
  const wrap = el('div', { class: 'vis' }, controls, chartBox, tableBox);
  host.append(wrap);

  let key = 'dice2';
  let counts = [];
  let total = 0;
  let chart = null;

  const sel = el('select', { id: 'pr-exp', 'aria-label': 'Випробування', onchange: (e) => { key = e.target.value; reset(); } },
    ...Object.entries(EXP).map(([id, v]) => el('option', { value: id, selected: id === key }, v.name)));
  const nInput = el('input', { type: 'number', id: 'pr-n', value: '100', min: '1', max: '100000', step: '1',
    style: 'width:130px' });

  function reset() {
    counts = Array(EXP[key].outcomes.length).fill(0);
    total = 0;
    render();
  }

  function trials(n) {
    const e = EXP[key];
    for (let i = 0; i < n; i++) counts[e.run()] += 1;
    total += n;
    render();
  }

  function render() {
    const e = EXP[key];
    const th = e.theory();
    const freq = counts.map((c) => (total ? c / total : 0));

    if (!chart) {
      chart = new window.Chart(canvas, {
        type: 'bar',
        data: {
          labels: e.outcomes,
          datasets: [
            { label: 'Відносна частота', data: freq, backgroundColor: '#1f5fa9' },
            { label: 'Теоретична ймовірність', data: th, backgroundColor: '#e2a33c' },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: false,
          scales: { y: { beginAtZero: true, title: { display: true, text: 'частка' } } },
          plugins: { legend: { position: 'bottom' } },
        },
      });
    } else {
      chart.data.labels = e.outcomes;
      chart.data.datasets[0].data = freq;
      chart.data.datasets[1].data = th;
      chart.update();
    }

    const maxDev = total ? Math.max(...freq.map((f, i) => Math.abs(f - th[i]))) : 0;
    tableBox.innerHTML = `
      <table class="data">
        <tr><th>Результат</th>${e.outcomes.map((o) => `<th>${o}</th>`).join('')}</tr>
        <tr><td>Частота $M$</td>${counts.map((c) => `<td class="num">${c}</td>`).join('')}</tr>
        <tr><td>Відносна частота $M/N$</td>${freq.map((f) => `<td class="num">${fmt(f, 3)}</td>`).join('')}</tr>
        <tr><td>Імовірність $P$</td>${th.map((p) => `<td class="num">${fmt(p, 3)}</td>`).join('')}</tr>
      </table>
      <p style="margin:10px 0 0">Випробувань: <b>${total}</b>. Найбільше відхилення частоти від імовірності:
      <b>${fmt(maxDev, 3)}</b>. Збільште кількість випробувань — відхилення зменшуватиметься.</p>`;
    if (window.renderMathInElement) window.renderMathInElement(tableBox, { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false });
  }

  controls.append(
    el('div', { class: 'ctrl' }, el('label', { for: 'pr-exp' }, 'Дослід'), sel, el('output', {}, '')),
    el('div', { class: 'btn-row' },
      el('label', { for: 'pr-n' }, 'Кількість випробувань:'), nInput,
      el('button', { class: 'btn primary', type: 'button', onclick: () => trials(Math.max(1, Math.min(100000, Number(nInput.value) || 1))) }, 'Провести'),
      el('button', { class: 'btn', type: 'button', onclick: () => trials(1) }, '+1'),
      el('button', { class: 'btn', type: 'button', onclick: () => trials(1000) }, '+1000'),
      el('button', { class: 'btn ghost', type: 'button', onclick: reset }, 'Очистити')));

  reset();
  return { destroy: () => { chart && chart.destroy(); wrap.remove(); } };
}
