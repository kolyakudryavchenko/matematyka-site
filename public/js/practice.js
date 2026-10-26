/* Модуль тренувальних завдань і підсумкового тесту.
   Зворотний зв'язок реалізовано за триступеневою схемою: повідомлення про помилку →
   підказка з ключовою ідеєю → повне покрокове розв'язання. */

import { el, $$, rng, record, recordTest, load, levelPassed, pct, renderMath } from './core.js';
import { build } from './tasks.js';
import { sameExpr, sameNumber, sameSet, sameOrder, normalize } from './check.js';

const LEVELS = { 1: 'базовий', 2: 'середній', 3: 'підвищений' };

/* ---------- відображення відповіді за типом ---------- */
function answerUI(task, box) {
  const t = task.type;
  if (t === 'single' || t === 'multi') {
    const opts = el('div', { class: 'opts', role: t === 'single' ? 'radiogroup' : 'group' });
    task.options.forEach((o, i) => {
      const inp = el('input', { type: t === 'single' ? 'radio' : 'checkbox', name: 'opt', value: String(i), id: 'o' + i });
      opts.append(el('label', { class: 'opt', for: 'o' + i }, inp, el('span', { html: o.html })));
    });
    box.append(opts);
    return () => $$('input', opts).filter((i) => i.checked).map((i) => Number(i.value));
  }
  if (t === 'numeric') {
    const inp = el('input', { type: 'text', inputmode: 'decimal', 'aria-label': 'Ваша відповідь', placeholder: 'число' });
    box.append(el('div', {}, inp));
    return () => inp.value;
  }
  if (t === 'expr') {
    const inp = el('input', { type: 'text', 'aria-label': 'Ваша відповідь', placeholder: 'наприклад 2x-3', style: 'width:min(320px,100%)' });
    box.append(el('div', {}, inp));
    return () => inp.value;
  }
  if (t === 'match') {
    const sels = [];
    task.left.forEach((l, i) => {
      const s = el('select', { 'aria-label': 'Відповідність для рядка ' + (i + 1) },
        el('option', { value: '' }, '— оберіть —'),
        ...task.right.map((rr, j) => el('option', { value: String(j), html: rr.replace(/\$/g, '') })));
      sels.push(s);
      box.append(el('div', { class: 'match-row' }, el('span', { html: l }), s));
    });
    return () => sels.map((s) => (s.value === '' ? -1 : Number(s.value)));
  }
  if (t === 'order') {
    const r = rng(Date.now());
    const shuffled = r.shuffle(task.items.map((v, i) => i));
    const list = el('ol', { class: 'order-list' });
    const redraw = () => {
      list.replaceChildren(...shuffled.map((idx, pos) => el('li', {},
        el('span', { html: task.items[idx] }),
        el('button', { class: 'btn', type: 'button', 'aria-label': 'Вище', disabled: pos === 0,
          onclick: () => { [shuffled[pos - 1], shuffled[pos]] = [shuffled[pos], shuffled[pos - 1]]; redraw(); } }, '↑'),
        el('button', { class: 'btn', type: 'button', 'aria-label': 'Нижче', disabled: pos === shuffled.length - 1,
          onclick: () => { [shuffled[pos + 1], shuffled[pos]] = [shuffled[pos], shuffled[pos + 1]]; redraw(); } }, '↓'))));
      renderMath(list);
    };
    redraw();
    box.append(list);
    return () => shuffled.slice();
  }
  return () => null;
}

function isRight(task, val) {
  switch (task.type) {
    case 'single': return val.length === 1 && val[0] === task.correct;
    case 'multi': return val.length > 0 && sameSet(val, task.correct);
    case 'numeric': return normalize(val) !== '' && sameNumber(val, task.answer, task.tol ?? 1e-9);
    case 'expr': return normalize(val) !== '' && sameExpr(val, task.answer);
    case 'match': return !val.includes(-1) && sameOrder(val, task.correct);
    case 'order': return sameOrder(val, task.items.map((_, i) => i));
    default: return false;
  }
}

/* ---------- тренажер однієї теми ---------- */
export function mountPractice(host, { topicId, gens }) {
  let level = 1;
  let seed = Date.now();
  let attempts = 0;
  let task = null;
  let getVal = null;
  let streak = 0;

  const head = el('div', { class: 'task-head' });
  const body = el('div', {});
  const card = el('div', { class: 'task' }, head, body);
  const levelRow = el('div', { class: 'btn-row', style: 'margin-bottom:14px' });
  host.append(levelRow, card);

  function renderLevels() {
    levelRow.replaceChildren(el('span', { style: 'color:#566781;font-size:.93rem' }, 'Рівень складності:'),
      ...[1, 2, 3].map((l) => {
        const locked = l > 1 && !levelPassed(topicId, l - 1);
        return el('button', {
          class: 'btn' + (l === level ? ' primary' : ''), type: 'button',
          title: locked ? 'Відкриється після 5 завдань попереднього рівня з результатом від 70 %' : '',
          onclick: () => { level = l; next(); },
        }, LEVELS[l] + (locked ? ' 🔒' : ''));
      }));
  }

  function next() {
    attempts = 0;
    seed += 7919;
    const r = rng(seed);
    const genId = r.pick(gens[level] || gens[1]);
    task = build(genId, r, level);
    const st = load().topics[topicId];
    head.replaceChildren(
      el('span', { class: 'tag lvl-' + level }, LEVELS[level]),
      el('span', { class: 'score-bar', style: 'margin-left:auto' },
        el('span', {}, 'виконано: '), el('b', {}, String(st?.levels?.[level]?.done || 0)),
        el('span', {}, ' · правильно: '), el('b', {}, pct(st?.levels?.[level]?.right || 0, st?.levels?.[level]?.done || 0) + ' %'),
        el('span', {}, ' · поспіль: '), el('b', {}, String(streak))));
    body.replaceChildren();
    body.append(el('div', { class: 'task-prompt', html: task.prompt }));
    const area = el('div', {});
    body.append(area);
    getVal = answerUI(task, area);
    const verdict = el('div', {});
    const btnCheck = el('button', { class: 'btn primary', type: 'button' }, 'Перевірити');
    const btnNext = el('button', { class: 'btn', type: 'button', onclick: next }, 'Наступне завдання');
    body.append(el('div', { class: 'btn-row', style: 'margin-top:14px' }, btnCheck, btnNext), verdict);

    btnCheck.addEventListener('click', () => {
      const val = getVal();
      attempts += 1;
      if (isRight(task, val)) {
        record(topicId, level, true, attempts);
        streak += 1;
        verdict.replaceChildren(el('div', { class: 'verdict ok' },
          attempts === 1 ? 'Правильно! +10 балів' : `Правильно з ${attempts}-ї спроби. +${attempts === 2 ? 6 : 3} балів`));
        btnCheck.disabled = true;
        renderLevels();
        return;
      }
      streak = 0;
      if (attempts === 1) {
        verdict.replaceChildren(el('div', { class: 'verdict bad' }, 'Відповідь неправильна. Перевірте обчислення й спробуйте ще раз.'));
      } else if (attempts === 2) {
        verdict.replaceChildren(el('div', { class: 'verdict bad' }, 'Знову не те.'),
          el('div', { class: 'verdict hint', html: '<b>Підказка.</b> ' + task.hint }));
      } else {
        record(topicId, level, false, attempts);
        verdict.replaceChildren(el('div', { class: 'verdict bad' }, 'Розгляньмо розв’язання разом.'),
          el('div', { class: 'solution', html: '<b>Покрокове розв’язання</b>' + task.solution }));
        btnCheck.disabled = true;
        renderLevels();
      }
      renderMath(verdict);
    });

    renderMath(card);
    renderLevels();
  }

  next();
}

/* ---------- підсумковий тест теми ---------- */
export function mountTest(host, { topicId, genIds }) {
  const box = el('div', {});
  host.append(box);
  const start = el('button', { class: 'btn primary', type: 'button' }, 'Почати підсумковий тест');
  box.append(el('p', { style: 'color:#566781' },
    `Тест містить ${genIds.length} завдань без підказок. Результат від 75 % зараховується як опанування теми.`), start);

  start.addEventListener('click', () => {
    const r = rng(Date.now());
    const tasks = genIds.map((g, i) => build(g, r, (i % 3) + 1));
    let i = 0, right = 0;
    const panel = el('div', { class: 'task' });
    box.replaceChildren(panel);

    const step = () => {
      if (i >= tasks.length) {
        const p = Math.round((right / tasks.length) * 100);
        recordTest(topicId, p);
        panel.replaceChildren(
          el('h3', {}, 'Результат тесту'),
          el('p', {}, `Правильних відповідей: ${right} з ${tasks.length} — ${p} %.`),
          el('div', { class: 'verdict ' + (p >= 75 ? 'ok' : 'bad') },
            p >= 75 ? 'Тему зараховано як опановану.' : 'Тему ще не зараховано: потрібно щонайменше 75 %.'),
          el('div', { class: 'btn-row', style: 'margin-top:14px' },
            el('a', { class: 'btn', href: 'progress.html' }, 'Мій прогрес'),
            el('button', { class: 'btn primary', type: 'button', onclick: () => location.reload() }, 'Пройти ще раз')));
        return;
      }
      const t = tasks[i];
      panel.replaceChildren(
        el('div', { class: 'task-head' },
          el('span', { class: 'tag' }, `Завдання ${i + 1} з ${tasks.length}`),
          el('span', { class: 'tag lvl-' + t.level }, LEVELS[t.level])),
        el('div', { class: 'task-prompt', html: t.prompt }));
      const area = el('div', {});
      panel.append(area);
      const get = answerUI(t, area);
      const btn = el('button', { class: 'btn primary', type: 'button' }, i === tasks.length - 1 ? 'Завершити' : 'Далі');
      panel.append(el('div', { class: 'btn-row', style: 'margin-top:14px' }, btn));
      btn.addEventListener('click', () => {
        if (isRight(t, get())) right += 1;
        i += 1;
        step();
      });
      renderMath(panel);
    };
    step();
  });
}
