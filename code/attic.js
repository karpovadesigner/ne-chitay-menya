'use strict';
// Сцена на чердаке: книга в пыли, кисточка вместо курсора, эмоции книги, панель реплик.
window.ATTIC = (function () {
  const EMO = ['sleep', 'awake', 'sneeze', 'angry', 'sly', 'happy', 'scared', 'sulk', 'beg'];
  const IMG = (e) => 'img/book-' + e + '.jpg';
  // где книга на кадре (в долях кадра 16:9)
  const BOOK = { x: 0.34, y: 0.1, w: 0.32, h: 0.74 };
  const W = 1200, H = 675;
  let root, stage, dust, fx, dc, fc, brush, bubbleEl, dlg, tapZone, hintEl;
  let parts = [], wiping = false, onWake = null, last = null, swish = 0, checkT = 0, cur = 'sleep';
  let ac = null;

  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // Кисточка для пыли: деревянная ручка, латунное кольцо, мягкий ворс
  const BRUSH_SVG = '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(-38 60 60)">' +
    '<rect x="53" y="2" width="14" height="52" rx="7" fill="#8a5a3c" stroke="#2b2233" stroke-width="3"/>' +
    '<rect x="56" y="8" width="4" height="40" rx="2" fill="#b07d52"/>' +
    '<circle cx="60" cy="10" r="3" fill="#2b2233"/>' +
    '<rect x="49" y="52" width="22" height="12" rx="3" fill="#d4a53c" stroke="#2b2233" stroke-width="3"/>' +
    '<path d="M50 64 Q38 92 34 112 Q60 120 86 112 Q82 92 70 64 Z" fill="#f1e2c4" stroke="#2b2233" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M54 68 L46 108 M60 68 L60 112 M66 68 L74 108" stroke="#cdb48a" stroke-width="2.5" stroke-linecap="round"/>' +
    '</g></svg>';

  function build() {
    if (root) return root;
    root = document.getElementById('attic');
    root.innerHTML = '';
    stage = el('div', 'a-stage');
    EMO.forEach((e) => { const i = el('img', 'a-img' + (e === 'sleep' ? ' base' : '')); i.src = IMG(e); i.alt = ''; i.dataset.e = e; i.draggable = false; stage.append(i); });
    dust = el('canvas', 'a-dust');
    fx = el('canvas', 'a-fx');
    dust.width = fx.width = W; dust.height = fx.height = H;
    dc = dust.getContext('2d');
    fc = fx.getContext('2d');
    bubbleEl = el('div', 'a-bubble');
    tapZone = el('button', 'a-tap');
    tapZone.setAttribute('aria-label', 'Почесать книгу');
    tapZone.style.left = BOOK.x * 100 + '%'; tapZone.style.top = BOOK.y * 100 + '%';
    tapZone.style.width = BOOK.w * 100 + '%'; tapZone.style.height = BOOK.h * 100 + '%';
    tapZone.hidden = true;
    hintEl = el('div', 'a-hint');
    stage.append(dust, fx, tapZone, bubbleEl, hintEl);
    brush = el('div', 'a-brush', BRUSH_SVG);
    dlg = el('section', 'a-dlg');
    dlg.hidden = true;
    root.append(stage, dlg, brush);
    bind();
    requestAnimationFrame(frame);
    return root;
  }

  // ---------- эмоции и пузырь ----------
  // новая эмоция проявляется поверх старой — без «просвета» спящей книги
  let zTop = 1;
  function setEmo(e) {
    if (!EMO.includes(e) || e === cur) return;
    cur = e;
    // накладки рта и глаз от прошлой мордашки сразу убираем — иначе мелькнёт чужое лицо
    if (talkEl) { talkEl.classList.remove('on'); if (talkOk[e]) talkEl.src = TALK_IMG(e); }
    if (blinkEl) blinkEl.classList.remove('on');
    const imgs = [...stage.querySelectorAll('.a-img')];
    const next = imgs.find((i) => i.dataset.e === e);
    if (e === 'sleep') { imgs.forEach((i) => i.classList.remove('on')); return; }
    next.style.zIndex = ++zTop;
    next.classList.add('on');
    clearTimeout(setEmo._t);
    setEmo._t = setTimeout(() => imgs.forEach((i) => { if (i !== next) i.classList.remove('on'); }), 380);
  }
  function bubble(t, ms) {
    bubbleEl.classList.remove('on');
    clearTimeout(bubble._t);
    if (!t) return;
    setTimeout(() => { bubbleEl.textContent = t; bubbleEl.classList.add('on'); }, 80);
    if (ms) bubble._t = setTimeout(() => bubbleEl.classList.remove('on'), ms);
  }
  function hint(html) { hintEl.innerHTML = html || ''; hintEl.classList.toggle('on', !!html); }

  // ---------- пыль ----------
  const bx = BOOK.x * W, by = BOOK.y * H, bw = BOOK.w * W, bh = BOOK.h * H, cx = bx + bw / 2, cy = by + bh / 2;
  function paintDust() {
    dc.globalCompositeOperation = 'source-over';
    dc.clearRect(0, 0, W, H);
    dc.fillStyle = 'rgba(170,158,140,0.16)';
    dc.fillRect(0, 0, W, H);
    const g = dc.createRadialGradient(cx, cy, bw * 0.3, cx, cy, bh * 0.78);
    g.addColorStop(0, 'rgba(198,186,170,0.9)'); g.addColorStop(0.6, 'rgba(190,178,160,0.74)'); g.addColorStop(1, 'rgba(180,168,150,0)');
    dc.fillStyle = g; dc.fillRect(0, 0, W, H);
    const gs = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    for (let i = 0; i < 30000; i++) {
      const x = cx + gs() * bw * 0.75, y = cy + gs() * bh * 0.65, l = 150 + Math.random() * 80;
      dc.fillStyle = 'rgba(' + l + ',' + (l - 8) + ',' + (l - 18) + ',' + Math.random() * 0.35 + ')';
      dc.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    for (let i = 0; i < 140; i++) {
      const x = bx + Math.random() * bw, y = by + Math.random() * bh, r = 6 + Math.random() * 22;
      const gg = dc.createRadialGradient(x, y, 0, x, y, r);
      gg.addColorStop(0, 'rgba(228,218,204,0.55)'); gg.addColorStop(1, 'rgba(228,218,204,0)');
      dc.fillStyle = gg; dc.beginPath(); dc.arc(x, y, r, 0, 7); dc.fill();
    }
    dc.strokeStyle = 'rgba(245,240,230,0.55)'; dc.lineWidth = 1.2;
    const ox = bx + bw * 0.86, oy = by + bh * 0.08;
    for (let k = 0; k < 6; k++) { dc.beginPath(); dc.moveTo(ox, oy); dc.lineTo(ox - Math.cos(k * 0.3) * 120, oy + Math.sin(k * 0.3) * 120); dc.stroke(); }
    for (let r = 30; r < 120; r += 28) { dc.beginPath(); dc.arc(ox, oy, r, Math.PI / 2, Math.PI); dc.stroke(); }
    dust.style.transition = 'none';
    dust.style.opacity = 1;
  }
  const toC = (e) => { const r = dust.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
  function puff(x, y, n, spd, big) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (big ? 2 : 1) + Math.random() * spd;
      parts.push({ x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 40, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.6, r: (big ? 10 : 6) + Math.random() * (big ? 26 : 18), life: big ? 1.3 : 1 });
    }
  }
  function wipe(p) {
    dc.globalCompositeOperation = 'destination-out';
    const from = last || p, steps = Math.max(1, Math.hypot(p.x - from.x, p.y - from.y) / 8);
    for (let i = 0; i <= steps; i++) {
      const x = from.x + ((p.x - from.x) * i) / steps, y = from.y + ((p.y - from.y) * i) / steps;
      const g = dc.createRadialGradient(x, y, 0, x, y, 80);
      g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(0.6, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      dc.fillStyle = g; dc.beginPath(); dc.arc(x, y, 80, 0, 7); dc.fill();
    }
    puff(p.x, p.y, 6, 4);
    parts.slice(-6).forEach((q) => { q.vx += (p.x - from.x) * 0.15; q.vy += (p.y - from.y) * 0.15; });
    if (performance.now() - swish > 160) { SND.play('swish'); swish = performance.now(); }
    last = p;
  }
  function cleared() {
    const s = 40, t = document.createElement('canvas');
    t.width = t.height = s;
    const c = t.getContext('2d');
    c.drawImage(dust, bx, by, bw, bh, 0, 0, s, s);
    const d = c.getImageData(0, 0, s, s).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 70) n++;
    return n / (s * s);
  }
  function startDust(cb) {
    build();
    setEmo('sleep');
    paintDust();
    wiping = true;
    onWake = cb;
    bubble('');
    hint('Её ещё никто не читал… <b>Смахни пыль</b> кисточкой');
    parkBrush();
  }
  // на телефоне мышки нет: кисточка лежит рядом с книгой и всегда видна, палец её подхватывает
  const touchy = () => matchMedia('(hover: none), (pointer: coarse)').matches;
  const brushNeeded = () => wiping || (tapZone && !tapZone.hidden);
  function parkBrush() {
    if (!touchy()) return;
    requestAnimationFrame(() => {
      const c = bookCenter(), r = stage.getBoundingClientRect();
      const x = Math.min(innerWidth - 70, c.x + r.width * 0.13), y = Math.min(innerHeight - 40, c.y + r.height * 0.12);
      brush.style.transform = 'translate(' + (x - 18) + 'px,' + (y - 92) + 'px) rotate(-12deg)';
      brush.classList.add('on');
    });
  }
  function clearDust() { wiping = false; dust.style.transition = 'opacity .8s'; dust.style.opacity = 0; hint(''); if (touchy()) brush.classList.remove('on'); }
  function wake() {
    if (!wiping) return;
    wiping = false;
    clearDust();
    puff(cx, cy, 80, 7, true);
    setTimeout(() => {
      setEmo('sneeze');
      stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
      SND.play('sneeze');
      bubble('Апчхи!');
      // чихнула — и улыбнулась; дальше — только когда чих прозвучал целиком
      const t0 = performance.now();
      setTimeout(() => { setEmo('happy'); bubble(''); }, 1300);
      SND.say('book', 'Апчхи!', 'sneeze', 'wake-1').then(() => {
        setTimeout(() => { onWake && onWake(); }, Math.max(300, 2300 - (performance.now() - t0)));
      });
    }, 450);
  }

  // ---------- ввод: кисточка ----------
  function bind() {
    const moveBrush = (e) => {
      brush.style.transform = 'translate(' + (e.clientX - 18) + 'px,' + (e.clientY - 92) + 'px) rotate(' + Math.max(-20, Math.min(20, (e.movementX || 0) * 1.5)) + 'deg)';
    };
    stage.addEventListener('pointerenter', () => brush.classList.add('on'));
    stage.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' || !brushNeeded()) brush.classList.remove('on'); last = null; });
    stage.addEventListener('pointerdown', (e) => {
      SND.init && SND.init();
      brush.classList.add('on', 'press');
      moveBrush(e);
      last = null;
      if (wiping) wipe(toC(e));
    });
    stage.addEventListener('pointermove', (e) => {
      moveBrush(e);
      if (!wiping) return;
      if (e.pointerType === 'mouse' || e.buttons) wipe(toC(e)); else last = null;
      if (performance.now() - checkT > 300) { checkT = performance.now(); if (cleared() > 0.55) wake(); }
    });
    window.addEventListener('pointerup', (e) => {
      brush.classList.remove('press');
      // палец отпустили — кисточка остаётся там, где была, пока она нужна
      if (e.pointerType !== 'mouse' && !brushNeeded()) brush.classList.remove('on');
      last = null;
      if (wiping && cleared() > 0.5) wake();
    });
  }

  function frame() {
    fc.clearRect(0, 0, W, H);
    parts = parts.filter((p) => (p.life -= 0.018) > 0);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy = p.vy * 0.97 + 0.03; p.r += 0.4;
      const g = fc.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, 'rgba(226,216,200,' + 0.5 * Math.min(1, p.life) + ')'); g.addColorStop(1, 'rgba(226,216,200,0)');
      fc.fillStyle = g; fc.beginPath(); fc.arc(p.x, p.y, p.r, 0, 7); fc.fill();
    }
    requestAnimationFrame(frame);
  }

  // Почесать книгу кисточкой N раз (загадка на чердаке)
  function taps(count, reacts, done, prefix) {
    let n = 0;
    tapZone.hidden = false;
    parkBrush();
    tapZone.onclick = () => {
      n++;
      SND.play('tap');
      puff(cx, cy, 10, 3);
      stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
      const r = reacts && reacts[n - 1];
      const spoken = r ? (setEmo(r[1] || 'happy'), bubble(r[0], 1400), SND.say('book', r[0], r[1], prefix ? prefix + n : null)) : Promise.resolve();
      // последнюю реакцию дослушиваем до конца
      if (n >= count) { tapZone.hidden = true; tapZone.onclick = null; if (touchy()) brush.classList.remove('on'); spoken.then(() => setTimeout(done, 300)); }
    };
    return () => { tapZone.hidden = true; tapZone.onclick = null; };
  }

  // ---------- книга говорит: шевелит ртом ----------
  // Для мордашек есть накладка «рот в другом положении» (book-<эмоция>-talk.png) — только область рта,
  // и накладка «глаза закрыты» (book-<эмоция>-blink.png) — только глаза. Они не мешают друг другу.
  // Пока звучит голос, рот открывается и закрывается, как в мультике.
  const TALK_IMG = (e) => 'img/book-' + e + '-talk.png';
  const TALK_BOX = { x: 0.40, y: 0.47, w: 0.28, h: 0.27 }, BLINK_BOX = { x: 0.40, y: 0.19, w: 0.28, h: 0.31 };
  // картинки 1376×768 чуть шире кадра 16:9 и обрезаются по бокам (object-fit: cover) — накладку сдвигаем так же
  const KX = (1376 / 768) / (16 / 9);
  const overlay = (cls, b) => { const i = el('img', 'a-ov ' + cls); i.alt = ''; i.draggable = false; i.style.left = (b.x * KX - (KX - 1) / 2) * 100 + '%'; i.style.top = b.y * 100 + '%'; i.style.width = b.w * KX * 100 + '%'; i.style.height = b.h * 100 + '%'; stage.insertBefore(i, dust); return i; };
  const talkOk = {};
  // кадры есть не у всех мордашек — грузим только существующие, чтобы не было ошибок «файл не найден»
  ['happy', 'awake', 'angry', 'sly', 'scared', 'sulk'].forEach((e) => { const i = new Image(); i.onload = () => { talkOk[e] = true; }; i.src = TALK_IMG(e); });
  let talkEl = null, talkT = null, talking = false;
  function flap() {
    if (!talking) return;
    const can = talkOk[cur];
    if (can && talkEl.getAttribute('src') !== TALK_IMG(cur)) talkEl.src = TALK_IMG(cur);
    // рот двигается только когда в записи звучит голос; на паузах — закрыт
    if (!SND.voiceNow()) { talkEl.classList.remove('on'); talkT = setTimeout(flap, 40); return; }
    talkEl.classList.toggle('on', can && !talkEl.classList.contains('on'));
    // слоги разной длины: иногда рот задерживается открытым или закрытым
    talkT = setTimeout(flap, 85 + Math.random() * 110 + (Math.random() < 0.12 ? 160 : 0));
  }
  function talk(on) {
    build();
    if (!talkEl) talkEl = overlay('a-talk', TALK_BOX);
    talking = !!on;
    clearTimeout(talkT);
    if (talking) flap(); else talkEl.classList.remove('on');
  }

  // ---------- книга моргает сама по себе ----------
  const BLINK_IMG = (e) => 'img/book-' + e + '-blink.png';
  const blinkOk = {};
  ['awake', 'angry', 'sly', 'scared', 'beg'].forEach((e) => { const i = new Image(); i.onload = () => { blinkOk[e] = true; }; i.src = BLINK_IMG(e); });
  let blinkEl = null;
  function blink() {
    setTimeout(blink, 2200 + Math.random() * 3800);
    if (!root || root.hidden || !blinkOk[cur] || wiping) return;
    if (!blinkEl) blinkEl = overlay('a-blink', BLINK_BOX);
    blinkEl.src = BLINK_IMG(cur);
    const shut = () => { blinkEl.classList.add('on'); setTimeout(() => blinkEl.classList.remove('on'), 130); };
    blinkEl.decode ? blinkEl.decode().then(shut, () => {}) : shut();
    // иногда моргает дважды
    if (Math.random() < 0.2) setTimeout(shut, 320);
  }
  setTimeout(blink, 3000);

  // ---------- открыть обложку ----------
  // Обложка (на картинке — передняя крышка с мордашкой) — копия этого кусочка кадра.
  // Её тянут пальцем или мышкой, она поворачивается на корешке, под ней светятся страницы.
  const COVER = { x: 0.396, y: 0.17, w: 0.246, h: 0.63 };
  let coverEl = null, insideEl = null, grabEl = null, coverFinish = null;
  function buildCover() {
    if (coverEl) return;
    const place = (e) => { e.style.left = COVER.x * 100 + '%'; e.style.top = COVER.y * 100 + '%'; e.style.width = COVER.w * 100 + '%'; e.style.height = COVER.h * 100 + '%'; };
    insideEl = el('div', 'a-inside', '<i></i>');
    coverEl = el('div', 'a-cover', '<div class="front"></div><div class="back"></div>');
    grabEl = el('div', 'a-grab', '<span>⟵</span>');
    [insideEl, coverEl, grabEl].forEach((e) => { place(e); e.hidden = true; stage.append(e); });
    const f = coverEl.querySelector('.front');
    f.style.backgroundSize = 100 / COVER.w + '% ' + 100 / COVER.h + '%';
    f.style.backgroundPosition = (COVER.x / (1 - COVER.w)) * 100 + '% ' + (COVER.y / (1 - COVER.h)) * 100 + '%';
    stage.style.transformOrigin = (COVER.x + COVER.w / 2) * 100 + '% ' + (COVER.y + COVER.h / 2) * 100 + '%';
  }
  function setCover(v, ms) {
    coverEl.style.transition = ms ? 'transform ' + ms + 'ms cubic-bezier(.3,.7,.3,1)' : 'none';
    coverEl.style.transform = 'perspective(1600px) rotateY(' + -v * 172 + 'deg)';
    insideEl.style.setProperty('--p', v);
  }
  function openCover(done) {
    build();
    buildCover();
    coverEl.querySelector('.front').style.backgroundImage = 'url("' + IMG(cur === 'sleep' ? 'happy' : cur) + '")';
    [insideEl, coverEl, grabEl].forEach((e) => { e.hidden = false; });
    setCover(0);
    hint('<b>Потяни</b> за край обложки');
    let prog = 0, base = 0, sx = 0, dragging = false, finished = false, creak = 0;
    const width = () => stage.getBoundingClientRect().width * COVER.w;
    const set = (v, ms) => { prog = Math.max(0, Math.min(1, v)); setCover(prog, ms); };
    const onCover = (e) => {
      const p = toC(e);
      return p.x > (COVER.x - 0.03) * W && p.x < (COVER.x + COVER.w + 0.08) * W && p.y > COVER.y * H && p.y < (COVER.y + COVER.h) * H;
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      dragging = false;
      grabEl.hidden = true;
      hint('');
      set(1, 800);
      SND.play('magic');
      setTimeout(() => { stage.classList.add('diving'); done(); }, 650);
    };
    coverFinish = finish;
    const down = (e) => {
      if (finished || !onCover(e)) return;
      dragging = true;
      sx = e.clientX;
      base = prog;
      grabEl.hidden = true;
      SND.play('creak');
      creak = performance.now();
    };
    const move = (e) => {
      if (!dragging) return;
      set(base + (Math.abs(e.clientX - sx) / width()) * 1.1);
      if (performance.now() - creak > 450 && prog > 0.05) { SND.play('creak'); creak = performance.now(); }
      if (prog > 0.92) finish();
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      if (prog > 0.4) return finish();
      // не дотянули — обложка шлёпается обратно, а если просто ткнули — чуть приоткрывается
      if (prog < 0.03) { set(0.12, 250); setTimeout(() => !finished && set(0, 400), 260); }
      else set(0, 450);
      bubble(prog < 0.03 ? 'Не тыкай — тяни!' : 'Сильнее! Я тяжёлая!', 1600);
      setTimeout(() => { if (!finished) grabEl.hidden = false; }, 500);
    };
    stage.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      stage.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      coverFinish = null;
      grabEl.hidden = true;
      hint('');
    };
  }
  function resetCover() {
    if (!coverEl) return;
    stage.classList.remove('diving');
    [insideEl, coverEl, grabEl].forEach((e) => { e.hidden = true; });
    setCover(0);
  }
  function bookCenter() {
    const r = stage.getBoundingClientRect();
    return { x: r.left + r.width * (COVER.x + COVER.w / 2), y: r.top + r.height * (COVER.y + COVER.h / 2) };
  }

  return {
    build, setEmo, bubble, hint, startDust, clearDust, taps, openCover, resetCover, bookCenter, talk,
    finishCover: () => coverFinish && coverFinish(),
    get dlg() { build(); return dlg; },
    show() { build(); root.hidden = false; },
    hide() { if (root) root.hidden = true; brush && brush.classList.remove('on'); },
    get emo() { return cur; },
  };
})();
