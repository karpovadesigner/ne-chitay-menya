'use strict';
// Живые сцены внутри книги: большая картинка, летающие золотые буквы,
// места на картинке, которые можно нажать (записка, табличка, скважина), панель реплик.
window.SCENE = (function () {
  const W = 1200, H = 675;
  const ABC = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ';
  let root, stage, img, cv, cx, spotsEl, dlg, bar, glowEl;
  let letters = [], running = false;

  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  function build() {
    if (root) return root;
    root = document.getElementById('scene');
    root.innerHTML = '';
    stage = el('div', 'a-stage s-stage');
    img = el('img', 's-img');
    img.alt = '';
    img.draggable = false;
    cv = el('canvas', 's-fx');
    cv.width = W; cv.height = H;
    cx = cv.getContext('2d');
    spotsEl = el('div', 's-spots');
    glowEl = el('div', 's-glow');
    stage.append(img, cv, spotsEl, glowEl);
    bar = el('div', 's-bar');
    dlg = el('section', 'a-dlg s-dlg');
    root.append(stage, dlg, bar);
    return root;
  }

  // ---------- летающие буквы ----------
  function newLetter(anywhere) {
    return {
      x: Math.random() * W, y: anywhere ? Math.random() * H : H + 20,
      vx: (Math.random() - 0.5) * 0.25, vy: -(0.15 + Math.random() * 0.35),
      ch: ABC[Math.floor(Math.random() * ABC.length)],
      s: 12 + Math.random() * 16, ph: Math.random() * 6.3, rot: (Math.random() - 0.5) * 0.6,
    };
  }
  function frame(t) {
    if (!running) return;
    cx.clearRect(0, 0, W, H);
    for (const l of letters) {
      l.x += l.vx + Math.sin(t / 1400 + l.ph) * 0.2;
      l.y += l.vy;
      if (l.y < -30 || l.x < -30 || l.x > W + 30) Object.assign(l, newLetter(false));
      const a = 0.35 + 0.45 * Math.max(0, Math.sin(t / 700 + l.ph));
      cx.save();
      cx.translate(l.x, l.y);
      cx.rotate(l.rot + Math.sin(t / 1100 + l.ph) * 0.15);
      cx.font = l.s + 'px Neucha, serif';
      cx.textAlign = 'center';
      cx.shadowColor = 'rgba(255,200,90,' + a + ')';
      cx.shadowBlur = 12;
      cx.fillStyle = 'rgba(255,214,120,' + a + ')';
      cx.fillText(l.ch, 0, 0);
      cx.restore();
    }
    requestAnimationFrame(frame);
  }

  // cfg: { img, letters: число букв, spots: [{ id, x, y, w, h, cls, html, title, onclick }] }
  function show(cfg) {
    build();
    root.hidden = false;
    if (img.getAttribute('src') !== cfg.img) {
      img.src = cfg.img;
      // новая картинка проявляется из темноты
      img.classList.remove('again'); void img.offsetWidth; img.classList.add('again');
    }
    spotsEl.innerHTML = '';
    // убираем игры с прошлой страницы
    root.querySelectorAll('.s-layer, .s-gold, .s-diff, .s-beam, .s-bubble').forEach((e) => e.remove());
    (cfg.spots || []).forEach((s) => {
      const b = el(s.onclick ? 'button' : 'div', 's-spot ' + (s.cls || ''), s.html || '');
      b.style.left = s.x * 100 + '%'; b.style.top = s.y * 100 + '%';
      b.style.width = s.w * 100 + '%'; b.style.height = s.h * 100 + '%';
      if (s.title) { b.title = s.title; b.setAttribute('aria-label', s.title); }
      if (s.onclick) b.onclick = s.onclick;
      b.dataset.id = s.id || '';
      spotsEl.append(b);
    });
    letters = [];
    for (let i = 0; i < (cfg.letters || 0); i++) letters.push(newLetter(true));
    if (!running) { running = true; requestAnimationFrame(frame); }
    dlg.hidden = false;
  }
  function hide() { if (root) root.hidden = true; running = false; hideChar(); }
  const spot = (id) => spotsEl && spotsEl.querySelector('[data-id="' + id + '"]');

  // вспышка света в точке (доли кадра)
  function flash(x, y) {
    glowEl.style.left = x * 100 + '%';
    glowEl.style.top = y * 100 + '%';
    glowEl.classList.remove('on'); void glowEl.offsetWidth; glowEl.classList.add('on');
    // буквы слетаются к свету
    letters.forEach((l) => { l.vx = (x * W - l.x) / 90; l.vy = (y * H - l.y) / 90; });
    setTimeout(() => letters.forEach((l) => Object.assign(l, newLetter(true))), 1500);
  }
  // Персонаж в сцене: картинка с прозрачным фоном. from — откуда выползает (доли кадра).
  // Слои персонажа: .s-char — место и выход на сцену, .s-act — движения по смыслу реплики
  // (машет, прыгает…), .s-talk — подпрыгивает, пока говорит, img — дышит.
  // На сцене может быть несколько героев: хозяин страницы и Клякса, которая выскакивает, когда заговорит.
  // У каждого свой слот: .s-char — место и выход на сцену, img — дышит; под ногами мягкая тень.
  const charSrc = (who, emo) => 'img/' + who + '-' + emo + '.png';
  const slots = {};
  let mainWho = '';
  function slot(who) {
    if (slots[who]) return slots[who];
    const box = el('div', 's-char');
    const img = el('img', 's-cimg'); img.alt = ''; img.draggable = false;
    box.append(el('div', 's-shadow'), img);
    box.addEventListener('animationend', (e) => { if (e.target === box) box.classList.remove('enter'); });
    return (slots[who] = { box, img, emo: '' });
  }
  function place(s, c, from) {
    stage.insertBefore(s.box, spotsEl);
    s.c = c;
    s.emo = c.emo || 'hello';
    s.img.src = charSrc(c.who, s.emo);
    s.box.style.left = c.x * 100 + '%';
    s.box.style.bottom = (1 - c.bottom) * 100 + '%';
    s.box.style.height = c.h * 100 + '%';
    s.box.hidden = false;
    // above — поверх темноты (Клякса с фонариком на тёмной странице)
    s.box.classList.toggle('above', !!c.above);
    if (from) {
      // крошечная капля в точке from, потом — плюх! — на своё место
      const r = stage.getBoundingClientRect();
      s.box.style.setProperty('--fx', (from.x - c.x) * r.width + 'px');
      s.box.style.setProperty('--fy', (from.y - (c.bottom - c.h / 2)) * r.height + 'px');
      s.box.classList.remove('enter'); void s.box.offsetWidth; s.box.classList.add('enter');
    }
  }
  // главный герой страницы
  function showChar(c, from) { Object.values(slots).forEach((s) => { s.box.hidden = true; }); mainWho = c.who; place(slot(c.who), c, from); }
  // гость (Клякса): появляется, когда впервые заговорит
  function showGuest(c) { const s = slot(c.who); if (!s.box.hidden && s.box.isConnected) return; place(s, c, c.from); SND.play('pop'); }
  const isShown = (who) => slots[who] && !slots[who].box.hidden && slots[who].box.isConnected;
  // Смена мордашки — мягкое перетекание, без прыжков
  function charEmo(emo, who) {
    const s = slots[who || mainWho];
    if (!s || s.box.hidden || !emo || emo === s.emo) return;
    s.emo = emo;
    const src = charSrc(who || mainWho, emo);
    const pre = new Image();
    pre.onload = () => { s.img.classList.add('fade'); setTimeout(() => { s.img.src = src; s.img.classList.remove('fade'); }, 160); };
    pre.src = src;
  }
  function charAct() {}
  function charTalk() {}
  function hideChar() { Object.values(slots).forEach((s) => { s.box.hidden = true; }); mainWho = ''; stopShots(); }

  // Опечатка стреляет из рогатки: золотая буква летит дугой и рассыпается искрами
  let shotT = null;
  const SHOT_ABC = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ';
  function shoot(from, to) {
    const b = el('div', 's-shot', SHOT_ABC[Math.floor(Math.random() * SHOT_ABC.length)]);
    b.style.left = from.x * 100 + '%'; b.style.top = from.y * 100 + '%';
    const r = stage.getBoundingClientRect();
    b.style.setProperty('--dx', (to.x - from.x) * r.width + 'px');
    b.style.setProperty('--dy', (to.y - from.y) * r.height + 'px');
    b.style.setProperty('--arc', -r.height * 0.18 + 'px');
    stage.append(b);
    SND.play('swish');
    setTimeout(() => {
      const p = el('div', 's-poof');
      p.style.left = to.x * 100 + '%'; p.style.top = to.y * 100 + '%';
      stage.append(p);
      SND.play('pop');
      setTimeout(() => p.remove(), 700);
    }, 850);
    setTimeout(() => b.remove(), 900);
  }
  function startShots(cfg) {
    stopShots();
    const loop = () => { shotT = setTimeout(() => { if (root.hidden) return; const t = cfg.targets[Math.floor(Math.random() * cfg.targets.length)]; shoot(cfg.from, t); loop(); }, cfg.every * (0.7 + Math.random() * 0.6)); };
    shotT = setTimeout(() => { shoot(cfg.from, cfg.targets[0]); loop(); }, 2200);
  }
  function stopShots() { clearTimeout(shotT); shotT = null; }

  // место на картинке становится кнопкой и мягко светится
  function makeTap(id, fn, title) {
    const s = spot(id);
    if (!s) return;
    s.classList.add('tap');
    s.setAttribute('role', 'button');
    s.setAttribute('tabindex', '0');
    s.setAttribute('aria-label', title || '');
    s.onclick = fn;
    s.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') fn(); };
  }
  // нырнуть в точку кадра: картинка разгоняется к ней, края темнеют, всё гаснет.
  // Следующую картинку грузим заранее, чтобы после нырка не было паузы.
  function zoomInto(x, y, done, nextImg) {
    if (nextImg) { const pre = new Image(); pre.src = nextImg; }
    stage.style.transformOrigin = x * 100 + '% ' + y * 100 + '%';
    stage.classList.add('zooming');
    const iris = el('div', 's-iris');
    iris.style.setProperty('--x', x * 100 + '%');
    iris.style.setProperty('--y', y * 100 + '%');
    stage.append(iris);
    setTimeout(() => {
      done();
      stage.classList.remove('zooming');
      stage.style.transformOrigin = '';
      iris.remove();
    }, 1000);
  }
  // Реплика облачком над головой героя. Кого нет на сцене (книга-рассказчица) — облачко-свиток вверху по центру.
  // Возвращает { root, text, close } — текст печатается в text, close() плавно убирает облачко.
  function bubble(who, name, full) {
    build();
    const s = slots[who];
    const shown = s && !s.box.hidden && s.box.isConnected && s.c;
    const b = el('div', 's-bubble ' + (shown ? 'char ' + who : 'narrator'));
    if (name && shown) b.append(el('b', 's-bname', name));
    const t = el('span', 's-btext');
    b.append(t);
    if (shown) {
      const c = s.c, head = c.bottom - c.h;
      // облачко не вылезает за края кадра; хвостик смотрит на героя
      const x = Math.min(0.8, Math.max(0.2, c.x));
      b.style.left = x * 100 + '%';
      b.style.bottom = Math.min(0.9, 1 - head + 0.015) * 100 + '%';
      b.style.setProperty('--tail', c.x < x ? '18%' : c.x > x ? '82%' : '50%');
    }
    stage.append(b);
    const R = stage.getBoundingClientRect();
    // ширину облачка меряем по всей реплике заранее, чтобы оно не росло, пока печатается текст
    if (full) { t.textContent = full; b.style.width = (b.offsetWidth + 1) + 'px'; t.textContent = ''; }
    // и сдвигаем, чтобы целиком помещалось в кадре; хвостик всё равно смотрит на героя
    if (shown) {
      const w = b.offsetWidth / R.width, cx0 = s.c.x;
      const x = Math.min(1 - w / 2 - 0.01, Math.max(w / 2 + 0.01, cx0));
      b.style.left = x * 100 + '%';
      const tail = Math.min(0.88, Math.max(0.12, 0.5 + (cx0 - x) / w));
      b.style.setProperty('--tail', tail * 100 + '%');
    }
    // длинная реплика не вылезает за верх кадра — текст в облачке прокручивается сам
    const room = shown ? (s.c.bottom - s.c.h - 0.04) : 0.5;
    t.style.maxHeight = Math.max(54, R.height * room - 36) + 'px';
    requestAnimationFrame(() => b.classList.add('on'));
    let gone = false;
    const close = () => { if (gone) return; gone = true; b.classList.remove('on'); b.classList.add('off'); setTimeout(() => b.remove(), 350); };
    return { root: b, text: t, close };
  }
  function clearBubbles() { if (stage) stage.querySelectorAll('.s-bubble').forEach((b) => b.remove()); }
  // название главы: появляется вверху и тает
  function title(text) {
    build();
    stage.querySelectorAll('.s-title').forEach((e) => e.remove());
    if (!text) return;
    const t = el('div', 's-title', '');
    t.textContent = text;
    stage.append(t);
    setTimeout(() => t.remove(), 4200);
  }
  // точка кадра (доли) → точка на экране
  function point(x, y) { build(); const r = stage.getBoundingClientRect(); return { x: r.left + r.width * x, y: r.top + r.height * y }; }
  // сундук открылся: вспышка и столб тёплого света, буквы слетаются к нему
  function chestOpen(x, y) {
    flash(x, y);
    const b = el('div', 's-beam');
    b.style.left = x * 100 + '%'; b.style.top = y * 100 + '%';
    stage.insertBefore(b, spotsEl);
    SND.play('magic');
  }

  // ---------- игры прямо на картинке ----------
  const pos = (e, s) => { s.style.left = e.x * 100 + '%'; s.style.top = e.y * 100 + '%'; };
  const stageXY = (ev, box) => { const r = (box || stage).getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height, r }; };
  // попадание с учётом того, что кадр шире, чем выше
  // на маленьком экране пальцем труднее попасть — круг попадания больше
  const near = (p, it, rad) => Math.hypot(p.x - it.x, (p.y - it.y) * (H / W)) < (it.r || rad) * (p.r && p.r.width < 600 ? 1.6 : 1);
  const ring = (layer, it, cls) => { const c = el('div', 's-ring ' + (cls || '')); pos(it, c); layer.append(c); return c; };

  // Пауки-запятые: ползают по стенам, каждый по своей тропинке
  const SPIDER = '<svg viewBox="0 0 60 60"><g stroke="#140d18" stroke-width="2.6" stroke-linecap="round" fill="none">' +
    '<path class="lg a" d="M22 26 L8 16 L3 20"/><path class="lg b" d="M21 31 L6 30 L2 36"/><path class="lg a" d="M22 36 L9 44 L6 52"/><path class="lg b" d="M25 39 L18 52 L18 58"/>' +
    '<path class="lg b" d="M38 26 L52 16 L57 20"/><path class="lg a" d="M39 31 L54 30 L58 36"/><path class="lg b" d="M38 36 L51 44 L54 52"/><path class="lg a" d="M35 39 L42 52 L42 58"/></g>' +
    '<path d="M30 18 C41 18 42 34 33 40 C31 46 27 50 22 52 C25 47 26 44 25 41 C18 37 19 18 30 18 Z" fill="#1d1222" stroke="#000" stroke-width="1"/>' +
    '<circle cx="26" cy="27" r="4" fill="#fff"/><circle cx="34" cy="27" r="4" fill="#fff"/><circle cx="27" cy="28" r="2" fill="#000"/><circle cx="35" cy="28" r="2" fill="#000"/></svg>';
  // обманки: клякса и запятая без ножек — похожи на паука, но это не паук
  const BLOT = '<svg viewBox="0 0 60 60"><path d="M30 14 C40 12 44 20 47 24 C54 26 52 36 46 38 C48 46 40 50 34 46 C30 52 20 50 20 43 C12 44 9 36 14 31 C8 26 14 16 22 19 C24 15 27 14 30 14 Z" fill="#1d1222"/><circle cx="51" cy="18" r="3" fill="#1d1222"/><circle cx="12" cy="46" r="2.5" fill="#1d1222"/></svg>';
  const COMMA = '<svg viewBox="0 0 60 60"><path d="M30 14 C41 14 42 30 33 37 C31 44 27 49 21 52 C25 46 26 42 25 38 C18 34 19 14 30 14 Z" fill="#1d1222"/><circle cx="26" cy="25" r="3.5" fill="#fff"/><circle cx="34" cy="25" r="3.5" fill="#fff"/><circle cx="27" cy="26" r="1.8" fill="#000"/><circle cx="35" cy="26" r="1.8" fill="#000"/></svg>';
  function spiders(list) {
    const layer = el('div', 's-layer');
    stage.insertBefore(layer, spotsEl);
    list.forEach((s, i) => {
      const b = el('div', 's-spider' + (s.fake ? ' fake' : ''), s.fake === 'blot' ? BLOT : s.fake === 'comma' ? COMMA : SPIDER);
      pos(s, b);
      b.style.setProperty('--dx', (s.dx || 0) * 100 + '%');
      b.style.setProperty('--dy', (s.dy || 0) * 100 + '%');
      b.style.setProperty('--rot', (s.rot || 0) + 'deg');
      b.style.animationDuration = (7 + (i % 4) * 2.3) + 's';
      b.style.animationDelay = -(i * 1.7) + 's';
      layer.append(b);
    });
    return () => layer.remove();
  }

  // Украшения сцены: картинка с прозрачным фоном на своём месте (например, паук висит на нитке и покачивается)
  function props(list) {
    const layer = el('div', 's-layer');
    stage.insertBefore(layer, spotsEl);
    list.forEach((p) => {
      const b = el('div', 's-prop ' + (p.cls || ''));
      b.style.left = p.x * 100 + '%'; b.style.top = p.y * 100 + '%'; b.style.height = p.h * 100 + '%';
      if (p.thread) b.append(el('div', 's-thread'));
      const i = el('img'); i.src = p.img; i.alt = ''; i.draggable = false;
      b.append(i);
      layer.append(b);
    });
  }

  // Найди предметы: нажимаешь на картинку, найденное обводится золотом
  function hidden(items, onFind, onDone) {
    const layer = el('div', 's-layer s-hit');
    stage.insertBefore(layer, spotsEl);
    const left = new Set(items.map((_, i) => i));
    layer.onclick = (ev) => {
      const p = stageXY(ev);
      const i = [...left].find((k) => near(p, items[k], 0.034));
      if (i == null) { const m = ring(layer, p, 'miss'); setTimeout(() => m.remove(), 500); SND.play('tap'); return; }
      left.delete(i);
      ring(layer, items[i], 'found');
      SND.play('right');
      onFind(i);
      if (!left.size) { layer.onclick = null; setTimeout(onDone, 700); }
    };
    return { stop: () => layer.remove(), peek: () => { const k = [...left][0]; if (k == null) return; const r = ring(layer, items[k], 'peek'); setTimeout(() => r.remove(), 2500); } };
  }

  // Найди отличия: две картинки рядом, кружки ставятся на обе
  function differences(cfg, onFind, onDone) {
    const wrap = el('div', 's-diff');
    const mk = (src) => { const f = el('div', 's-dpic'); const i = el('img'); i.src = src; i.alt = ''; i.draggable = false; f.append(i, el('div', 's-dmarks')); return f; };
    const a = mk(cfg.img), b = mk(cfg.img2);
    const count = el('div', 's-dcount');
    const say = el('div', 's-dsay');
    wrap.append(el('div', 's-dpics', ''), count, say);
    wrap.firstChild.append(a, b);
    root.append(wrap);
    const left = new Set(cfg.list.map((_, i) => i));
    const upd = () => { count.textContent = 'Найдено ' + (cfg.list.length - left.size) + ' из ' + cfg.list.length; };
    upd();
    const tap = (pic) => (ev) => {
      const p = stageXY(ev, pic);
      const i = [...left].find((k) => near(p, cfg.list[k], 0.04));
      if (i == null) { const m = ring(pic.lastChild, p, 'miss'); setTimeout(() => m.remove(), 500); SND.play('tap'); return; }
      left.delete(i);
      [a, b].forEach((f) => ring(f.lastChild, cfg.list[i], 'found'));
      SND.play('right');
      upd();
      // Граф комментирует, что надкусил
      if (cfg.say && cfg.say[i]) { say.textContent = '«' + cfg.say[i] + '»'; say.classList.add('on'); clearTimeout(say._t); say._t = setTimeout(() => say.classList.remove('on'), 2500); }
      onFind(i);
      if (!left.size) setTimeout(() => { wrap.classList.add('out'); setTimeout(() => { wrap.remove(); onDone(); }, 600); }, 800);
    };
    a.onclick = tap(a); b.onclick = tap(b);
    return { stop: () => wrap.remove(), peek: () => { const k = [...left][0]; if (k == null) return; [a, b].forEach((f) => { const r = ring(f.lastChild, cfg.list[k], 'peek'); setTimeout(() => r.remove(), 2500); }); } };
  }

  // Пазл: картинка порвана на кусочки. Нажимаешь на два кусочка — они меняются местами.
  // cfg: { img, cols, rows, text, tx, ty, light } — text рисуется на картинке золотом (номер страницы)
  function jigsaw(cfg, onDone) {
    const wrap = el('div', 's-diff s-jig');
    const board = el('div', 's-jboard');
    const count = el('div', 's-dcount', 'Собери картинку: нажми на два кусочка, чтобы поменять их местами');
    wrap.append(board, count);
    root.append(wrap);
    {
      // каждый кусочек — окошко в общую картинку (светлее, она с тёмной страницы) с золотым номером поверх
      const C = cfg.cols, R = cfg.rows, N = C * R;
      const inner = (k) => {
        const d = el('div', 's-tin');
        d.style.width = C * 100 + '%'; d.style.height = R * 100 + '%';
        d.style.left = -(k % C) * 100 + '%'; d.style.top = -Math.floor(k / C) * 100 + '%';
        const i = el('img'); i.src = cfg.img; i.alt = ''; i.draggable = false; i.style.filter = 'brightness(' + (cfg.light || 1) + ')';
        const n = el('span', 's-tnum', cfg.text || '');
        n.style.left = cfg.tx * 100 + '%'; n.style.top = cfg.ty * 100 + '%';
        d.append(i, n);
        return d;
      };
      board.style.gridTemplateColumns = 'repeat(' + C + ', 1fr)';
      // перемешиваем, чтобы ни один кусочек не стоял на месте
      let order;
      do { order = [...Array(N).keys()].sort(() => Math.random() - 0.5); } while (order.some((v, i) => v === i));
      let pick = null, done = false;
      const tiles = order.map(() => el('button', 's-tile'));
      const paint = () => tiles.forEach((t, i) => {
        const k = order[i];
        if (t.dataset.k !== String(k)) { t.innerHTML = ''; t.append(inner(k)); t.dataset.k = k; }
        t.classList.toggle('ok', k === i);
      });
      tiles.forEach((t, i) => {
        t.onclick = () => {
          if (done) return;
          if (pick == null) { pick = i; t.classList.add('sel'); SND.play('tap'); return; }
          tiles[pick].classList.remove('sel');
          if (pick !== i) { [order[pick], order[i]] = [order[i], order[pick]]; SND.play('swish'); }
          pick = null;
          paint();
          if (order.every((v, k) => v === k)) {
            done = true;
            SND.play('right');
            board.classList.add('solved');
            count.textContent = 'Готово!';
            setTimeout(() => { wrap.classList.add('out'); setTimeout(() => { wrap.remove(); onDone(); }, 600); }, 2200);
          }
        };
        board.append(t);
      });
      paint();
    }
    return { stop: () => wrap.remove(), peek: () => { /* подсказка: подсвечиваем кусочки не на своём месте */ board.querySelectorAll('.s-tile:not(.ok)').forEach((t) => { t.classList.add('hint'); setTimeout(() => t.classList.remove('hint'), 2500); }); } };
  }

  // Фонарик: сцена в темноте, луч ходит за пальцем, в луче видны цифры
  function flashlight(items) {
    const layer = el('div', 's-layer s-dark');
    items.forEach((it) => { const s = el('span', 's-hid', it.t); s.style.left = it.x + '%'; s.style.top = it.y + '%'; s.style.fontSize = 'calc(var(--sw) * ' + (it.s || 2.2) * 0.022 + ')'; s.style.transform = 'translate(-50%,-50%) rotate(' + (it.r || 0) + 'deg)'; layer.append(s); });
    const mask = el('div', 's-mask');
    layer.append(mask);
    stage.insertBefore(layer, spotsEl);
    const mv = (ev) => { const p = stageXY(ev); mask.style.setProperty('--x', p.x * 100 + '%'); mask.style.setProperty('--y', p.y * 100 + '%'); };
    // на телефоне палец водит луч, а не листает страницу
    stage.style.touchAction = 'none';
    stage.addEventListener('pointermove', mv);
    stage.addEventListener('pointerdown', mv);
    return () => { stage.style.touchAction = ''; stage.removeEventListener('pointermove', mv); stage.removeEventListener('pointerdown', mv); layer.remove(); };
  }

  // Золотая буква на картинке: светится, нажимаешь — достаёшь
  function goldTap(g, done) {
    const b = el('button', 's-gold', g.ch);
    pos(g, b);
    b.setAttribute('aria-label', 'Достать букву');
    b.onclick = () => { b.onclick = null; b.classList.add('take'); setTimeout(() => b.remove(), 900); done(); };
    stage.insertBefore(b, spotsEl.nextSibling);
    return () => b.remove();
  }

  function shake() { stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); }

  return {
    show, hide, spot, flash, shake, point, chestOpen, bubble, clearBubbles, title, showChar, showGuest, isShown, charEmo, charAct, charTalk, hideChar, makeTap, zoomInto,
    spiders, props, hidden, differences, jigsaw, flashlight, goldTap, startShots, stopShots, shoot,
    get charWho() { return mainWho || null; },
    get dlg() { build(); return dlg; },
    get bar() { build(); return bar; },
  };
})();
