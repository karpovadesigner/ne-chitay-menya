'use strict';
// Загадки-виджеты. Каждая получает контейнер, настройки и api: solve(), wrong(), say().
window.PUZ = (function () {
  const el = (tag, attrs = {}, kids = []) => {
    const e = document.createElement(tag);
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    [].concat(kids).forEach((c) => c != null && e.append(c));
    return e;
  };
  const ABC = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
  const norm = (s) => String(s).toUpperCase().replace(/\s+/g, '').replace(/Ё/g, 'Е');
  const shuffle = (s) => {
    const a = s.split('');
    for (let k = 0; k < 20; k++) {
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      if (a.join('') !== s) break;
    }
    return a;
  };
  const P = {};
  P.el = el;

  // Своя клавиатура на телефоне: системная закрывает пол-экрана и поле ввода.
  // Наша — низкая, а то, что набрано, видно крупно прямо в её верхней строке.
  P.keypad = (input, cfg = {}) => {
    if (!matchMedia('(pointer: coarse)').matches) return;
    input.readOnly = true;
    input.setAttribute('inputmode', 'none');
    const shown = el('div', { class: 'kbd-shown' });
    const rows = cfg.digits ? ['1234567890'] : ['ЙЦУКЕНГШЩЗХЪ', 'ФЫВАПРОЛДЖЭ', 'ЯЧСМИТЬБЮЁ'];
    const max = Number(input.getAttribute('maxlength')) || 16;
    const fix = (s) => cfg.name ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
    const sync = () => { shown.textContent = input.value || input.placeholder || ''; shown.classList.toggle('empty', !input.value); };
    const put = (v) => { input.value = fix(v.slice(0, max)); sync(); };
    const key = (t, cls, fn) => el('button', { class: 'kbd-key ' + (cls || ''), text: t, onpointerdown: (e) => { e.preventDefault(); SND.play && SND.play('tap'); fn(); } });
    const pad = el('div', { class: 'kbd' + (cfg.digits ? ' digits' : '') }, [
      el('div', { class: 'kbd-row top' }, [shown, key('⌫', 'wide', () => put(input.value.slice(0, -1))), key(cfg.okText || 'Готово', 'ok', () => (cfg.onEnter ? cfg.onEnter() : hide()))]),
      ...rows.map((r) => el('div', { class: 'kbd-row' }, r.split('').map((ch) => key(ch, '', () => put(input.value + (cfg.name ? ch.toLowerCase() : ch)))))),
    ]);
    if (cfg.name && !cfg.digits) pad.lastChild.append(key('—', 'wide', () => put(input.value + '-')));
    function show() { sync(); if (!pad.isConnected) document.body.append(pad); document.body.classList.add('kbd-on'); }
    function hide() { pad.remove(); document.body.classList.remove('kbd-on'); }
    input.addEventListener('click', show);
    const watch = setInterval(() => { if (!input.isConnected || input.disabled) { clearInterval(watch); hide(); } }, 300);
    input.kbdHide = hide;
    show();
  };

  // Погладить / постучать N раз
  P.taps = (box, cfg, api) => {
    let n = 0;
    const counter = el('div', { class: 'tap-count', text: '' });
    const target = el('button', { class: 'tap-target', 'aria-label': cfg.label || 'Нажать', html: cfg.html || ART.cover('grumpy'), onclick: () => {
      n++;
      SND.play('tap');
      target.classList.remove('wiggle');
      void target.offsetWidth;
      target.classList.add('wiggle');
      counter.textContent = '●'.repeat(n) + '○'.repeat(Math.max(0, cfg.count - n));
      if (cfg.reacts && cfg.reacts[n - 1]) api.say(cfg.who || 'book', cfg.reacts[n - 1]);
      if (n >= cfg.count) { target.disabled = true; setTimeout(api.solve, 600); }
    } });
    counter.textContent = '○'.repeat(cfg.count);
    box.append(el('p', { class: 'puz-hint', text: cfg.prompt }), target, counter);
  };

  // Ввести слово или число
  P.code = (box, cfg, api) => {
    const len = cfg.answer.length;
    const input = el('input', { class: 'code-input', type: 'text', inputmode: cfg.digits ? 'numeric' : 'text', maxlength: String(len), autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': 'Ответ', placeholder: '_'.repeat(len) });
    input.style.width = Math.max(4, len + 1.5) + 'ch';
    const go = el('button', { class: 'btn primary', text: cfg.button || 'Проверить', onclick: check });
    function check() {
      const v = norm(input.value);
      if (!v) return;
      if (v === norm(cfg.answer) || (cfg.alt || []).some((a) => norm(a) === v)) { input.disabled = true; go.disabled = true; api.solve(); }
      else { api.wrong(cfg.wrong); input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake'); input.select(); }
    }
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    box.append(el('p', { class: 'puz-hint', text: cfg.prompt }), el('div', { class: 'row' }, [input, go]));
    if (cfg.table) {
      const t = el('div', { class: 'abc note-paper' }, [el('div', { class: 'note-title', text: 'Записка: каждая буква — своё число' }), el('div', { class: 'abc-grid' }, ABC.split('').map((ch, i) => el('span', {}, [el('b', { text: ch }), el('i', { text: String(i + 1) })])))]);
      box.append(t);
    }
    if (matchMedia('(pointer: coarse)').matches) P.keypad(input, { digits: cfg.digits, okText: 'Проверить', onEnter: check });
    else setTimeout(() => input.focus({ preventScroll: true }), 50);
  };

  // Собрать слово из перепутанных букв
  P.anagram = (box, cfg, api) => {
    const letters = cfg.letters ? cfg.letters.split('') : shuffle(cfg.answer);
    const picked = [];
    const slots = el('div', { class: 'slots' });
    const pool = el('div', { class: 'pool' });
    const render = () => {
      slots.innerHTML = '';
      for (let i = 0; i < cfg.answer.length; i++) {
        const p = picked[i];
        slots.append(el('button', { class: 'tile slot' + (p != null ? ' full' : '') + (cfg.gold ? ' gold' : ''), text: p != null ? letters[p] : '', 'aria-label': 'Ячейка ' + (i + 1), onclick: () => { if (p != null) { picked.splice(i, 1); SND.play('tap'); render(); } } }));
      }
      pool.innerHTML = '';
      letters.forEach((ch, i) => {
        pool.append(el('button', { class: 'tile' + (cfg.gold ? ' gold' : ''), text: ch, disabled: picked.includes(i) ? '' : null, onclick: () => {
          if (picked.includes(i) || picked.length >= cfg.answer.length) return;
          picked.push(i);
          SND.play('tap');
          render();
          if (picked.length === cfg.answer.length) {
            const word = picked.map((k) => letters[k]).join('');
            if (norm(word) === norm(cfg.answer)) { slots.classList.add('done'); api.solve(); }
            else { api.wrong(cfg.wrong); slots.classList.remove('shake'); void slots.offsetWidth; slots.classList.add('shake'); setTimeout(() => { picked.length = 0; render(); }, 700); }
          }
        } }));
      });
    };
    box.append(el('p', { class: 'puz-hint', text: cfg.prompt }), slots, pool);
    render();
  };

  // Лабиринт: стрелки, клавиши, свайпы
  P.maze = (box, cfg, api) => {
    const g = cfg.grid;
    const H = g.length, W = g[0].length;
    let px = 0, py = 0, done = false;
    g.forEach((row, y) => row.split('').forEach((c, x) => { if (c === 'S') { px = x; py = y; } }));
    const field = el('div', { class: 'maze', style: '' });
    field.style.gridTemplateColumns = 'repeat(' + W + ', 1fr)';
    const cells = [];
    g.forEach((row, y) => row.split('').forEach((c, x) => {
      const d = el('div', { class: 'mc ' + (c === '#' ? 'wall' : c === 'E' ? 'exit' : c === 'b' ? 'book' : 'floor') });
      if (c === 'E') d.textContent = '★';
      field.append(d);
      cells.push(d);
    }));
    const hero = el('div', { class: 'maze-hero', html: ART.av.klyaksa() });
    field.append(hero);
    const place = () => {
      hero.style.left = (px / W) * 100 + '%';
      hero.style.top = (py / H) * 100 + '%';
      hero.style.width = 100 / W + '%';
      hero.style.height = 100 / H + '%';
    };
    const move = (dx, dy) => {
      if (done) return;
      const nx = px + dx, ny = py + dy;
      if (ny < 0 || ny >= H || nx < 0 || nx >= W || g[ny][nx] === '#') { SND.play('tap'); return; }
      px = nx; py = ny;
      place();
      if (g[ny][nx] === 'b' && cfg.onBook) cfg.onBook();
      if (g[ny][nx] === 'E') { done = true; api.solve(); }
    };
    const key = (e) => {
      const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] }[e.code];
      if (m && box.isConnected) { e.preventDefault(); move(m[0], m[1]); }
    };
    window.addEventListener('keydown', key);
    let sx = 0, sy = 0;
    field.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
    field.addEventListener('pointerup', (e) => {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      if (Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx), 0); else move(0, Math.sign(dy));
    });
    const arrows = el('div', { class: 'arrows' }, [
      el('button', { class: 'arr up', 'aria-label': 'Вверх', text: '▲', onclick: () => move(0, -1) }),
      el('button', { class: 'arr left', 'aria-label': 'Влево', text: '◀', onclick: () => move(-1, 0) }),
      el('button', { class: 'arr right', 'aria-label': 'Вправо', text: '▶', onclick: () => move(1, 0) }),
      el('button', { class: 'arr down', 'aria-label': 'Вниз', text: '▼', onclick: () => move(0, 1) }),
    ]);
    const wrap = el('div', { class: 'maze-wrap' }, [field, arrows]);
    box.append(el('p', { class: 'puz-hint', text: cfg.prompt }), wrap);
    // на телефоне лабиринт со стрелками сам въезжает в экран целиком
    if (matchMedia('(max-width: 760px)').matches) setTimeout(() => wrap.scrollIntoView({ behavior: 'smooth', block: 'end' }), 300);
    place();
    return () => window.removeEventListener('keydown', key);
  };

  // Загадки по очереди с вариантами ответа
  P.riddles = (box, cfg, api) => {
    let i = 0, score = 0;
    const q = el('p', { class: 'riddle' });
    const opts = el('div', { class: 'opts' });
    const meter = el('div', { class: 'tap-count' });
    const show = () => {
      const r = cfg.list[i];
      q.textContent = r.q;
      meter.textContent = '★'.repeat(score) + '☆'.repeat(cfg.list.length - score);
      opts.innerHTML = '';
      r.options.forEach((o, k) => opts.append(el('button', { class: 'btn opt', text: o, onclick: (e) => {
        if (k === r.a) {
          SND.play('right');
          score++;
          i++;
          if (cfg.after && cfg.after[i - 1]) api.say(cfg.who || 'bukvoed', cfg.after[i - 1]);
          if (i >= cfg.list.length) { meter.textContent = '★'.repeat(score); opts.innerHTML = ''; q.textContent = ''; api.solve(); }
          else setTimeout(show, 300);
        } else {
          e.target.disabled = true;
          api.wrong(cfg.wrong);
        }
      } })));
    };
    box.append(el('p', { class: 'puz-hint', text: cfg.prompt }), meter, q, opts);
    show();
  };

  // Тёмная страница: фонарик под пальцем, спрятанные цифры
  P.flashlight = (box, cfg, api) => {
    const dark = el('div', { class: 'dark-page' });
    cfg.items.forEach((it) => dark.append(el('span', { class: 'hidden-item', text: it.t, style: 'left:' + it.x + '%;top:' + it.y + '%;font-size:' + (it.s || 2.2) + 'em;transform:rotate(' + (it.r || 0) + 'deg)' })));
    const mask = el('div', { class: 'dark-mask' });
    dark.append(mask);
    const moveLight = (e) => {
      const r = dark.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
      mask.style.setProperty('--x', x + '%');
      mask.style.setProperty('--y', y + '%');
    };
    dark.addEventListener('pointermove', moveLight);
    dark.addEventListener('pointerdown', moveLight);
    box.append(el('p', { class: 'puz-hint', text: cfg.prompt }), dark);
    const sub = el('div');
    box.append(sub);
    P.code(sub, { answer: cfg.answer, digits: true, prompt: cfg.codePrompt, wrong: cfg.wrong, button: 'Открыть' }, api);
  };

  return P;
})();
