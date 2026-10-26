/* Функціональна перевірка ресурсу: обхід сторінок, помилки консолі,
   робота генератора завдань і системи перевірки відповідей. */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('./public/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

const PORT = 8099;
await new Promise((r) => server.listen(PORT, r));
const BASE = `http://localhost:${PORT}`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${page.url()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[${page.url()}] ${e.message}`));

const PAGES = [
  '/index.html', '/class.html?c=9', '/visuals.html', '/trainer.html', '/progress.html', '/teacher.html',
  '/topic.html?t=linear7', '/topic.html?t=quad8', '/topic.html?t=quadfunc9', '/topic.html?t=transform9',
  '/topic.html?t=circle9', '/topic.html?t=trig10', '/topic.html?t=deriv10', '/topic.html?t=prob11',
  '/visuals.html?v=quadratic', '/visuals.html?v=transform', '/visuals.html?v=unitcircle',
  '/visuals.html?v=derivative', '/visuals.html?v=geogebra', '/visuals.html?v=probability',
];

console.log('— обхід сторінок —');
for (const u of PAGES) {
  await page.goto(BASE + u, { waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
  const h1 = await page.locator('h1').first().textContent().catch(() => '(нема h1)');
  const hasTask = await page.locator('.task').count();
  console.log(`  ${u.padEnd(34)} h1="${(h1 || '').trim().slice(0, 42)}" задач:${hasTask}`);
}

/* ---- перевірка генераторів: кожен має будуватися й мати валідну відповідь ---- */
console.log('\n— перевірка генераторів (по 60 варіантів кожного) —');
await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
const genReport = await page.evaluate(async () => {
  const { GEN, build } = await import('./js/tasks.js');
  const { rng } = await import('./js/core.js');
  const { sameExpr, sameNumber, sameSet, sameOrder } = await import('./js/check.js');
  const out = [];
  for (const id of Object.keys(GEN)) {
    let bad = 0, n = 0;
    for (let i = 0; i < 60; i++) {
      const r = rng(1000 + i * 37);
      const lvl = (i % 3) + 1;
      try {
        const t = build(id, r, lvl);
        n++;
        if (!t.prompt || !t.hint || !t.solution) { bad++; continue; }
        /* еталонна відповідь має проходити власну перевірку */
        let ok = false;
        if (t.type === 'single') ok = Number.isInteger(t.correct) && t.correct >= 0 && t.correct < t.options.length;
        else if (t.type === 'multi') ok = t.correct.length > 0 && t.correct.every((x) => x >= 0) && sameSet(t.correct, t.correct);
        else if (t.type === 'numeric') ok = Number.isFinite(t.answer) && sameNumber(String(t.answer).replace('.', ','), t.answer, t.tol ?? 1e-9);
        else if (t.type === 'expr') ok = sameExpr(t.answer, t.answer);
        else if (t.type === 'match') ok = t.left.length === t.right.length && sameOrder(t.correct, t.correct);
        else if (t.type === 'order') ok = t.items.length >= 3 && sameOrder(t.items.map((_, k) => k), t.items.map((_, k) => k));
        if (!ok) bad++;
      } catch (e) { bad++; out.push(id + ': ' + e.message); }
    }
    out.push(`${bad ? 'ПОМИЛКА' : 'ok     '} ${id.padEnd(14)} варіантів: ${n}, проблемних: ${bad}`);
  }
  return out;
});
genReport.forEach((l) => console.log('  ' + l));

/* ---- перевірка нормалізації еквівалентних виразів ---- */
console.log('\n— перевірка еквівалентності виразів —');
const eq = await page.evaluate(async () => {
  const { sameExpr, sameNumber } = await import('./js/check.js');
  const cases = [
    ['2x-3', '2*x-3', true], ['2x-3', '-3+2x', true], ['2x-3', '2x+3', false],
    ['(x-2)^2+1', 'x^2-4x+5', true], ['3(x+1)', '3x+3', true],
    ['x^2', 'x*x', true], ['0,5x', '0.5*x', true], ['2x', '3x', false],
  ];
  const num = [['3,5', 3.5, true], ['3.5', 3.5, true], ['abc', 3.5, false], ['0,33', 1 / 3, true]];
  return [
    ...cases.map(([a, b, exp]) => `${sameExpr(a, b) === exp ? 'ok     ' : 'ПОМИЛКА'} "${a}" ≡ "${b}" → ${exp}`),
    ...num.map(([a, b, exp]) => `${sameNumber(a, b, 0.006) === exp ? 'ok     ' : 'ПОМИЛКА'} число "${a}" ≈ ${b} → ${exp}`),
  ];
});
eq.forEach((l) => console.log('  ' + l));

/* ---- наскрізний сценарій: відповісти на завдання й побачити прогрес ---- */
console.log('\n— наскрізний сценарій —');
await page.goto(BASE + '/topic.html?t=quad8', { waitUntil: 'networkidle' });
await page.waitForSelector('.task input[type="text"], .task .opt');
const before = await page.evaluate(() => localStorage.getItem('matematyka.progress.v1'));
/* тричі навмисно хибна відповідь — має з'явитися підказка, далі розв'язання */
for (let i = 0; i < 3; i++) {
  const txt = page.locator('.task input[type="text"]').first();
  if (await txt.count()) { await txt.fill('999999'); } else { await page.locator('.task .opt').first().click(); }
  await page.locator('.task button:has-text("Перевірити")').click();
  await page.waitForTimeout(150);
}
const hintSeen = await page.locator('.verdict.hint').count();
const solSeen = await page.locator('.solution').count();
console.log(`  підказка показана: ${hintSeen > 0}, покрокове розв'язання показане: ${solSeen > 0}`);
const after = await page.evaluate(() => localStorage.getItem('matematyka.progress.v1'));
console.log(`  прогрес записано у localStorage: ${before !== after && !!after}`);

/* ---- адаптивність: 320 px без горизонтального прокручування ---- */
console.log('\n— адаптивність —');
for (const w of [320, 390, 768, 1280]) {
  const p2 = await ctx.newPage();
  await p2.setViewportSize({ width: w, height: 800 });
  await p2.goto(BASE + '/topic.html?t=trig10', { waitUntil: 'networkidle' });
  await p2.waitForTimeout(400);
  const over = await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`  ${String(w).padStart(4)} px — горизонтальне переповнення: ${over} px ${over <= 1 ? 'ok' : 'ПОМИЛКА'}`);
  await p2.close();
}

console.log('\n— помилки консолі —');
const real = errors.filter((e) => !/geogebra|deployggb|ERR_(NAME|INTERNET|CONNECTION)/i.test(e));
console.log(real.length ? real.join('\n') : '  немає');

await browser.close();
server.close();
