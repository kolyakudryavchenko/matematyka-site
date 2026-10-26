/* Спільне полотно для побудови графіків: сітка, осі, криві, точки.
   Реалізовано засобами Canvas 2D без сторонніх бібліотек. */

export class Plot {
  constructor(canvas, { xmin = -10, xmax = 10, ymin = -8, ymax = 8 } = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.range = { xmin, xmax, ymin, ymax };
    this.resize();
    window.addEventListener('resize', () => { this.resize(); this.redraw && this.redraw(); });
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.cv.clientWidth || 600;
    const h = Number(this.cv.dataset.h || 360);
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
    this.cv.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h;
  }

  /* перетворення координат */
  px(x) { const r = this.range; return ((x - r.xmin) / (r.xmax - r.xmin)) * this.w; }
  py(y) { const r = this.range; return this.h - ((y - r.ymin) / (r.ymax - r.ymin)) * this.h; }
  ux(px) { const r = this.range; return r.xmin + (px / this.w) * (r.xmax - r.xmin); }
  uy(py) { const r = this.range; return r.ymin + ((this.h - py) / this.h) * (r.ymax - r.ymin); }

  clear() {
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, this.w, this.h);
  }

  grid(step = 1) {
    const c = this.ctx, r = this.range;
    c.lineWidth = 1;
    c.strokeStyle = '#e8edf4';
    c.beginPath();
    for (let x = Math.ceil(r.xmin / step) * step; x <= r.xmax; x += step) {
      c.moveTo(Math.round(this.px(x)) + .5, 0); c.lineTo(Math.round(this.px(x)) + .5, this.h);
    }
    for (let y = Math.ceil(r.ymin / step) * step; y <= r.ymax; y += step) {
      c.moveTo(0, Math.round(this.py(y)) + .5); c.lineTo(this.w, Math.round(this.py(y)) + .5);
    }
    c.stroke();
  }

  axes(step = 1) {
    const c = this.ctx, r = this.range;
    c.strokeStyle = '#8b9ab1'; c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(0, Math.round(this.py(0)) + .5); c.lineTo(this.w, Math.round(this.py(0)) + .5);
    c.moveTo(Math.round(this.px(0)) + .5, 0); c.lineTo(Math.round(this.px(0)) + .5, this.h);
    c.stroke();

    c.fillStyle = '#5a6b85';
    c.font = '12px system-ui, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'top';
    const lab = Math.max(step, Math.round((r.xmax - r.xmin) / 12));
    for (let x = Math.ceil(r.xmin / lab) * lab; x <= r.xmax; x += lab) {
      if (Math.abs(x) < 1e-9) continue;
      c.fillText(String(+x.toFixed(2)).replace('.', ','), this.px(x), this.py(0) + 5);
    }
    c.textAlign = 'right'; c.textBaseline = 'middle';
    const laby = Math.max(step, Math.round((r.ymax - r.ymin) / 10));
    for (let y = Math.ceil(r.ymin / laby) * laby; y <= r.ymax; y += laby) {
      if (Math.abs(y) < 1e-9) continue;
      c.fillText(String(+y.toFixed(2)).replace('.', ','), this.px(0) - 6, this.py(y));
    }
    c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillStyle = '#15243b'; c.font = 'italic 13px system-ui, sans-serif';
    c.fillText('x', this.w - 14, this.py(0) + 5);
    c.fillText('y', this.px(0) + 6, 4);
  }

  curve(f, { color = '#1f5fa9', width = 2.4, dash = null } = {}) {
    const c = this.ctx;
    c.save();
    c.lineWidth = width; c.strokeStyle = color;
    if (dash) c.setLineDash(dash);
    c.beginPath();
    let started = false;
    for (let p = 0; p <= this.w; p += 1) {
      const x = this.ux(p);
      const y = f(x);
      if (!isFinite(y) || Math.abs(y) > 1e6) { started = false; continue; }
      const py = this.py(y);
      if (py < -2000 || py > this.h + 2000) { started = false; continue; }
      if (!started) { c.moveTo(p, py); started = true; } else c.lineTo(p, py);
    }
    c.stroke();
    c.restore();
  }

  segment(x1, y1, x2, y2, { color = '#8a5a00', width = 2, dash = null } = {}) {
    const c = this.ctx;
    c.save();
    c.lineWidth = width; c.strokeStyle = color;
    if (dash) c.setLineDash(dash);
    c.beginPath();
    c.moveTo(this.px(x1), this.py(y1));
    c.lineTo(this.px(x2), this.py(y2));
    c.stroke();
    c.restore();
  }

  point(x, y, { color = '#b32d1f', r = 5, label = null } = {}) {
    const c = this.ctx;
    c.save();
    c.fillStyle = color;
    c.beginPath(); c.arc(this.px(x), this.py(y), r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
    if (label) {
      c.fillStyle = '#15243b'; c.font = '600 13px system-ui, sans-serif';
      c.textAlign = 'left'; c.textBaseline = 'bottom';
      c.fillText(label, this.px(x) + 9, this.py(y) - 7);
    }
    c.restore();
  }

  circle(cx, cy, rad, { color = '#1f5fa9', width = 2 } = {}) {
    const c = this.ctx;
    c.save();
    c.strokeStyle = color; c.lineWidth = width;
    c.beginPath();
    c.ellipse(this.px(cx), this.py(cy), Math.abs(this.px(rad) - this.px(0)), Math.abs(this.py(rad) - this.py(0)), 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }
}

/* Повзунок із підписом і поточним значенням. */
export function slider(host, { id, label, min, max, step, value, onInput }) {
  const row = document.createElement('div');
  row.className = 'ctrl';
  row.innerHTML = `<label for="${id}">${label}</label>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"
           aria-describedby="${id}-out">
    <output id="${id}-out" for="${id}"></output>`;
  host.append(row);
  const inp = row.querySelector('input');
  const out = row.querySelector('output');
  const sync = () => { out.textContent = String(+inp.value).replace('.', ','); onInput(Number(inp.value)); };
  inp.addEventListener('input', sync);
  sync();
  return inp;
}
