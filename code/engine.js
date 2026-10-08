'use strict';
// Движок книги: стол, открытие, страницы, текст по буквам, загадки, листание, блокнот, сохранение.
(function () {
  const el = PUZ.el;
  const $ = (s) => document.querySelector(s);
  const BOOK = window.BOOK1;
  const KEY = 'zk-book1';
  const NAMES = { book: 'Книга', klyaksa: 'Клякса', opechatka: 'Опечатка', bukvoed: 'Граф Буквоед', owl: 'Сова-Оглавление' };

  const fresh = () => ({ name: '', g: 'm', page: BOOK.start, prev: null, letters: [], notes: [], helper: null, unlocked: [], visited: {}, solved: {}, hint: {}, players: 1, done: false, woke: false });
  let S = fresh();
  const load = () => {
    try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && v.page) S = Object.assign(fresh(), v); } catch (e) { /* без сохранения */ }
    // паучье гнездо переехало со стр. 29 на 49 — старые сохранения поправляем
    if (S.page === 29) S.page = 49;
    S.unlocked = S.unlocked.map((u) => (u === 29 ? 49 : u));
    if (S.visited[29]) S.visited[49] = true;
    if (!BOOK.pages[S.page]) S.page = BOOK.start;
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ничего */ } };
  const hasSave = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return !!(v && v.name); } catch (e) { return false; } };

  // {name} и окончания {мальчик|девочка}
  const fill = (t) => t.replace(/\{name\}/g, S.name || 'читатель').replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (m, a, b) => (S.g === 'f' ? b : a));

  // ---------- Стол ----------
  // Первый экран — чердак. Новый читатель смахивает пыль, вернувшийся видит меню.
  function showDesk() {
    playGen++;
    SND.hush();
    if (cleanup) { try { cleanup(); } catch (e) { /* ничего */ } cleanup = null; }
    $('#reader').hidden = true;
    $('#desk').hidden = true;
    SCENE.hide();
    ATTIC.show();
    const dlg = ATTIC.dlg;
    if (!S.woke) {
      dlg.hidden = true;
      ATTIC.startDust(() => { S.woke = true; save(); go(S.name ? S.page : BOOK.start); });
      return;
    }
    ATTIC.clearDust();
    ATTIC.setEmo(S.done ? 'happy' : 'awake');
    ATTIC.bubble(S.done ? 'Мой лучший читатель!' : 'Опять ты? Ну ладно, читай…', 3000);
    SND.say('book', S.done ? 'Мой лучший читатель!' : 'Опять ты? Ну ладно, читай…', S.done ? 'happy' : 'awake', S.done ? 'menu-2' : 'menu-1');
    dlg.hidden = false;
    dlg.innerHTML = '';
    dlg.append(...[
      el('header', { class: 'menu-head' }, [el('h1', { text: 'Маленькая злая книга' }), el('p', { text: 'Книга первая. ' + BOOK.title })]),
      el('div', { class: 'menu-row' }, [
        el('button', { class: 'btn primary big', text: 'Продолжить чтение', onclick: () => { SND.play('page'); go(S.page); } }),
        el('button', { class: 'btn', text: 'Начать сначала', onclick: () => confirmBox('Начать книгу сначала? Найденные буквы и страницы забудутся, а книга снова уснёт под пылью.', () => { const p = S.players; S = fresh(); S.players = p; save(); showDesk(); }) }),
      ]),
      el('div', { class: 'menu-row' }, [soundBar()]),
    ]);
  }
  function soundBar() {
    return el('div', { class: 'sound-bar' }, [
      el('button', { class: 'chip' + (SND.state.on ? ' on' : ''), text: SND.state.on ? 'Звук: вкл' : 'Звук: выкл', onclick: (e) => { const v = SND.toggle('on'); e.target.textContent = v ? 'Звук: вкл' : 'Звук: выкл'; e.target.classList.toggle('on', v); } }),
      el('button', { class: 'chip' + (SND.state.voice ? ' on' : ''), text: SND.state.voice ? 'Голоса: вкл' : 'Голоса: выкл', onclick: (e) => { const v = SND.toggle('voice'); e.target.textContent = v ? 'Голоса: вкл' : 'Голоса: выкл'; e.target.classList.toggle('on', v); } }),
    ]);
  }
  // глаза следят за курсором
  function followEyes(root) {
    const move = (e) => {
      root.querySelectorAll('.pupil').forEach((p) => {
        const svg = p.ownerSVGElement;
        if (!svg) return;
        const r = svg.getBoundingClientRect();
        if (!p.dataset.cx) { p.dataset.cx = p.getAttribute('cx'); p.dataset.cy = p.getAttribute('cy'); }
        const cx = +p.dataset.cx, cy = +p.dataset.cy;
        const vb = svg.viewBox.baseVal;
        const sx = r.left + (cx / vb.width) * r.width, sy = r.top + (cy / vb.height) * r.height;
        const dx = e.clientX - sx, dy = e.clientY - sy, d = Math.hypot(dx, dy) || 1;
        const k = Math.min(6, d / 30);
        p.setAttribute('cx', cx + (dx / d) * k);
        p.setAttribute('cy', cy + (dy / d) * k);
      });
    };
    document.onpointermove = move;
  }

  function openBook() { go(S.page, true); }

  // ---------- Читалка ----------
  let R = {};
  function buildReader() {
    const r = $('#reader');
    r.innerHTML = '';
    R.left = el('section', { class: 'page left' });
    R.right = el('section', { class: 'page right' });
    R.spread = el('div', { class: 'spread' }, [R.left, R.right]);
    r.append(makeBar(), R.spread);
  }
  // верхняя панель: на стол, листать, блокнот, золотые буквы, подсказка
  function makeBar() {
    R.letters = el('div', { class: 'letters', 'aria-label': 'Золотые буквы' });
    R.helper = el('button', { class: 'helper-btn', title: 'Подсказка', 'aria-label': 'Подсказка', onclick: hint });
    const bar = el('nav', { class: 'topbar' }, [
      el('button', { class: 'tb', text: 'На стол', onclick: () => { SND.hush(); showDesk(); } }),
      el('button', { class: 'tb accent', text: 'Листать', onclick: openDial }),
      el('button', { class: 'tb', text: 'Блокнот', onclick: openNotes }),
      R.letters,
      R.helper,
    ]);
    renderLetters();
    renderHelper();
    return bar;
  }

  // ---------- Живая сцена внутри книги ----------
  const ABC = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
  function renderScene() {
    const p = current.p;
    const sp = p.spots || {};
    const spots = [];
    if (sp.plaque) spots.push(Object.assign({ id: 'plaque', cls: 'plaque', html: '<span>' + sp.plaque.text + '</span>' }, sp.plaque));
    if (sp.note) spots.push(Object.assign({ id: 'note', cls: 'note' + (S.noteSeen ? '' : ' pulse'), title: 'Записка', html: '<span>А = 1<br>Б = 2<br>В = 3<br>…</span>', onclick: openAbc }, sp.note));
    if (sp.keyhole) spots.push(Object.assign({ id: 'keyhole', cls: 'keyhole' }, sp.keyhole));
    if (sp.rebus) spots.push(Object.assign({ id: 'rebus', cls: 'rebus' + (S.rebusSeen ? '' : ' pulse'), title: 'Ребус', html: '<img src="' + sp.rebus.img + '" alt=""><b>,</b>', onclick: () => openRebus(sp.rebus) }, sp.rebus));
    // остальные места на картинке — как описаны (например, надпись в зеркале)
    Object.keys(sp).filter((k) => !['plaque', 'note', 'keyhole'].includes(k)).forEach((k) => spots.push(Object.assign({ id: k }, sp[k])));
    SCENE.show({ img: p.img, letters: p.letters || 0, spots });
    if (p.spiders) SCENE.spiders(p.spiders);
    if (p.props) SCENE.props(p.props);
    SCENE.hideChar();
    if (p.char) SCENE.showChar(p.char, p.char.from || (sp.keyhole ? { x: sp.keyhole.x + sp.keyhole.w / 2, y: sp.keyhole.y + sp.keyhole.h / 2 } : null));
    if (p.shots) SCENE.startShots(p.shots);
    SCENE.dlg.classList.toggle('left', p.panel === 'left');
    SCENE.dlg.classList.remove('quiet');
    const bar = SCENE.bar;
    bar.innerHTML = '';
    bar.append(makeBar());
    const dlg = SCENE.dlg;
    dlg.innerHTML = '';
    const text = el('div', { class: 'text' });
    const tail = el('div', { class: 'tail' });
    dlg.append(el('div', { class: 's-loc', text: p.loc || '' }), text, tail);
    // реплики — облачками над героями; в панели остаются только ответы и кнопки
    $('#scene').classList.add('bubbles');
    SCENE.title(p.loc || '');
    if (current.back && p.retry) playLines(text, p.retry, () => afterLines(text, tail), 'p' + current.n + '-r');
    else if (current.back) afterLines(text, tail);
    else playLines(text, p.lines, () => afterLines(text, tail), current.joke ? jokePrefix(current.n, current.joke) : 'p' + current.n + '-');
  }
  // записка-ребус: картинка и запятая (запятая убирает последнюю букву)
  function openRebus(r) {
    SND.play('page');
    if (!S.rebusSeen) { S.rebusSeen = true; save(); const n = SCENE.spot('rebus'); if (n) n.classList.remove('pulse'); }
    modal([
      el('h2', { text: 'Ребус' }),
      el('div', { class: 'rebus-big' }, [el('img', { src: r.img, alt: '' }), el('b', { text: ',' })]),
      el('p', { class: 'muted', text: 'Отгадай слово по картинке. Запятая в конце убирает последнюю букву. Получится число!' }),
    ]);
  }
  // записка на стене: вся таблица «буква — число»
  function openAbc() {
    SND.play('page');
    if (!S.noteSeen) { S.noteSeen = true; save(); const n = SCENE.spot('note'); if (n) n.classList.remove('pulse'); }
    modal([
      el('h2', { text: 'Записка' }),
      el('p', { class: 'muted', text: 'Каждая буква — своё число. Буквы тут обожают прятаться.' }),
      el('div', { class: 'abc-grid big' }, ABC.split('').map((ch, i) => el('span', {}, [el('b', { text: ch }), el('i', { text: String(i + 1) })]))),
    ]);
  }
  function renderLetters() {
    if (!R.letters) return;
    R.letters.innerHTML = '';
    // буквы стоят в порядке находки, а не по слову — чтобы отгадка не была видна заранее
    BOOK.letters.forEach((_, i) => R.letters.append(el('span', { class: 'gl' + (S.letters[i] ? ' got' : ''), text: S.letters[i] || '?' })));
  }
  function renderHelper() {
    if (!R.helper) return;
    R.helper.innerHTML = S.helper === 'klyaksa' ? ART.av.klyaksa() : '<span class="q">?</span>';
    R.helper.title = S.helper === 'klyaksa' ? 'Спросить Кляксу' : 'Подсказка';
  }

  let typing = null, current = null, cleanup = null;

  // back — вернулись со страницы-ошибки: текст заново не читаем, а коротко предлагаем попробовать ещё раз
  function go(n, instant, joke, back) {
    if (cleanup) { try { cleanup(); } catch (e) { /* ничего */ } cleanup = null; }
    playGen++;
    SND.hush();
    // страница-ошибка с картинкой — тоже живая сцена
    const p = joke ? (joke.img ? Object.assign({ scene: 'joke', loc: 'Не та страница!', letters: 4 }, joke) : null) : BOOK.pages[n];
    if (!joke && !p) return;
    if (!joke) {
      if (S.page !== n) S.prev = S.page;
      S.page = n;
      S.visited[n] = true;
      save();
    }
    current = { n, p, joke, back: !!back };
    // страницы пролога идут на чердаке
    if (p && p.scene === 'attic') {
      $('#reader').hidden = true;
      SCENE.hide();
      ATTIC.show();
      return renderAttic();
    }
    ATTIC.hide();
    if (p && p.scene) {
      $('#reader').hidden = true;
      if (!instant) SND.play('page');
      return renderScene();
    }
    SCENE.hide();
    if (!R.spread || !R.spread.isConnected || $('#reader').hidden) { $('#reader').hidden = false; buildReader(); instant = true; }
    if (!instant) {
      SND.play('page');
      R.spread.classList.remove('flip');
      void R.spread.offsetWidth;
      R.spread.classList.add('flip');
    }
    setTimeout(() => render(), instant ? 0 : 260);
  }

  // Пролог на чердаке: книга меняет мордашку, реплики — в панели внизу
  function renderAttic() {
    const p = current.p;
    const dlg = ATTIC.dlg;
    dlg.hidden = false;
    dlg.innerHTML = '';
    const text = el('div', { class: 'text' });
    const tail = el('div', { class: 'tail' });
    dlg.append(text, tail);
    if (p.emo) ATTIC.setEmo(p.emo);
    playLines(text, p.lines, () => afterLines(text, tail), 'p' + current.n + '-');
  }

  function render() {
    const { n, p, joke } = current;
    // левая страница — картинка
    R.left.innerHTML = '';
    const artKey = joke ? 'joke' : p.art;
    const artHtml = artKey === 'cover' ? ART.cover(p.mood || 'grumpy') : ART.scene[artKey] ? ART.scene[artKey]() : '';
    R.left.append(
      el('div', { class: 'loc', text: joke ? 'Не та страница' : p.loc || '' }),
      el('div', { class: 'art' + (artKey === 'cover' ? ' art-cover' : ''), html: artHtml }),
      el('div', { class: 'pnum left-num', text: String(n % 2 ? n - 1 : n) })
    );
    followEyes(R.left);
    // правая — текст
    R.right.innerHTML = '';
    const text = el('div', { class: 'text' });
    const tail = el('div', { class: 'tail' });
    R.right.append(text, tail, el('div', { class: 'pnum right-num', text: String(n % 2 ? n : n + 1) }));
    const lines = joke ? joke.lines || joke : p.lines;
    playLines(text, lines, () => afterLines(text, tail), joke ? jokePrefix(n, joke) : 'p' + n + '-');
  }
  const jokePrefix = (n, joke) => (BOOK.jokes[n] ? 'j' + n + '-' : 'jl' + (BOOK.jokeList.indexOf(joke) + 1) + '-');

  // реплики по очереди, буква за буквой. Следующая начинается, когда книга договорила.
  // Клик по реплике: первый — дописать текст, второй — не дослушивать голос.
  let playGen = 0;
  function playLines(box, lines, done, prefix) {
    const gen = ++playGen;
    let i = 0;
    const next = () => {
      if (gen !== playGen) return;
      if (i >= lines.length) { done(); return; }
      const id = prefix ? prefix + (i + 1) : null;
      const [who, raw, emo, charEmo] = lines[i++];
      const t = fill(raw);
      // в живой сцене реплика — облачко над головой героя; на чердаке и в читалке — строчка в панели
      const bub = bubbleMode();
      if (who === 'book' && emo && current.p && current.p.scene === 'attic') ATTIC.setEmo(emo);
      // мордашка персонажа в сцене меняется вместе с репликой
      // Кто заговорил — тот на сцене. Клякса-гость выскакивает при первой своей реплике.
      // Четвёртый элемент строки — мордашка хозяина страницы, пока говорит кто-то другой.
      const pc = current.p && current.p.char;
      const g = current.p && current.p.guest;
      if (g && who === g.who) SCENE.showGuest(Object.assign({}, g, { emo: emo || g.emo }));
      if (who !== 'book' && emo && SCENE.isShown(who)) SCENE.charEmo(emo, who);
      if (charEmo && pc) SCENE.charEmo(charEmo, pc.who);
      // облачко создаём после того, как гость вышел на сцену, — чтобы оно встало над его головой
      const line = bub ? SCENE.bubble(who, who === 'book' ? null : NAMES[who], t) : lineEl(who, who === 'book' ? null : emo);
      if (!bub) box.append(line.root);
      let spoke = false, typed = false, moved = false;
      // договорил — облачко тает, потом следующая реплика
      const advance = () => {
        if (moved || !spoke || !typed) return;
        moved = true;
        if (bub) setTimeout(() => { if (gen !== playGen) return; line.close(); setTimeout(next, 380); }, 650);
        else setTimeout(next, 350);
      };
      // озвучка: voice/<id>.mp3 — у книги и у Кляксы; кого ещё не озвучили, тот молчит
      SND.say(who, t, emo, id).then(() => { spoke = true; advance(); });
      let k = window.ZK_FAST ? t.length - 1 : 0;
      const speed = 45;
      const tick = () => {
        if (gen !== playGen) return;
        k = Math.min(t.length, k + 1);
        line.text.textContent = t.slice(0, k);
        if (!bub) follow(box); else line.text.scrollTop = line.text.scrollHeight;
        if (k < t.length) typing = setTimeout(tick, 1000 / speed);
        else { typing = null; typed = true; advance(); }
      };
      // облачко: касание только допечатывает текст, голос всегда договаривает
      // (ребёнок много нажимает на картинку — случайное касание не должно глушить героя)
      line.root.onclick = () => {
        if (!typed) { clearTimeout(typing); typing = null; line.text.textContent = t; typed = true; advance(); }
        else if (!spoke && !bub) SND.hush();
      };
      tick();
      if (!bub) follow(box);
    };
    next();
  }
  const bubbleMode = () => !!(current && current.p && current.p.scene && current.p.scene !== 'attic' && !$('#scene').hidden);
  // текст сам уезжает вверх, пока персонаж говорит: прокручиваем всё, что умеет прокручиваться
  function follow(box) {
    for (let n = box; n && n !== document.body; n = n.parentElement) {
      if (n.scrollHeight > n.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(n).overflowY)) n.scrollTop = n.scrollHeight;
    }
  }
  function lineEl(who, emo) {
    const text = el('span', { class: 't' });
    if (who === 'book') return { root: el('p', { class: 'line book' }, [text]), text };
    const root = el('div', { class: 'line char ' + who }, [el('div', { class: 'ava', html: ART.av[who] ? ART.av[who](emo) : '' }), el('div', { class: 'say' }, [el('b', { text: NAMES[who] || '' }), text])]);
    return { root, text };
  }

  // после реплик: загадка, выбор, листание
  function afterLines(text, tail) {
    const { n, p, joke } = current;
    tail.innerHTML = '';
    if (joke) {
      tail.append(el('button', { class: 'btn primary', text: 'Вернуться на страницу ' + S.page, onclick: () => go(S.page, false, null, true) }));
      return;
    }
    const finish = () => {
      if (p.gain && !S.letters.includes(p.gain)) gainLetter(p.gain);
      if (p.helper && S.helper !== p.helper) { S.helper = p.helper; renderHelper(); SND.play('magic'); }
      if (p.note && !S.notes.includes(p.note)) S.notes.push(p.note);
      if (p.unlock) p.unlock.forEach((u) => !S.unlocked.includes(u) && S.unlocked.push(u));
      S.solved[n] = true;
      save();
      const ends = () => {
        if (p.ending) return showEnding(tail);
        if (p.next) nextButtons(tail, p.next);
        if (p.choices) p.choices.forEach((b) => tail.append(el('button', { class: 'btn primary', text: b.t, onclick: () => go(b.go) })));
        if (p.unlock && !p.next) tail.append(el('button', { class: 'btn primary', text: 'Листать', onclick: openDial }));
      };
      if (p.after && !p._afterShown) playLines(text, p.after, ends, 'p' + n + '-a');
      else ends();
    };
    if (p.dial) {
      p.dial.forEach((u) => !S.unlocked.includes(u) && S.unlocked.push(u));
      save();
      if (p.puzzle) runPuzzle(tail, p, () => {});
      if (p.note && !S.notes.includes(p.note)) { S.notes.push(p.note); save(); }
      tail.append(el('button', { class: 'btn primary', text: 'Листать', onclick: openDial }));
      return;
    }
    if (p.puzzle && !S.solved[n]) runPuzzle(tail, p, () => { tail.innerHTML = ''; finish(); });
    else if (p.puzzle && S.solved[n]) {
      // уже решено раньше
      if (p.after) playLines(text, p.after, () => { tail.innerHTML = ''; ends2(); }, 'p' + n + '-a');
      else ends2();
    } else finish();
    function ends2() {
      if (p.ending) return showEnding(tail);
      nextButtons(tail, p.next || p.choices || []);
      if (p.unlock && !p.next) tail.append(el('button', { class: 'btn primary', text: 'Листать', onclick: openDial }));
    }
  }

  function runPuzzle(tail, p, onSolve) {
    const box = el('div', { class: 'puzzle' });
    tail.append(box);
    const api = {
      solve: () => {
        quiet(false);
        SND.play('right');
        box.classList.add('solved');
        // в живой сцене скважина вспыхивает, и буквы слетаются к ней
        const k = p.scene && p.spots && p.spots.keyhole;
        if (k) { SND.play('magic'); SCENE.flash(k.x + k.w / 2, k.y + k.h / 2); const kh = SCENE.spot('keyhole'); if (kh) kh.classList.add('stir'); }
        setTimeout(onSolve, k ? 1100 : 500);
      },
      wrong: (msg) => { SND.play('wrong'); if (p.scene && p.scene !== 'attic') SCENE.shake(); toast(msg || 'Не то! Попробуй ещё.'); },
      say: (who, t) => { toast(t, who); SND.say(who, t); },
    };
    const cfg = Object.assign({}, p.puzzle);
    if (cfg.type === 'name') return namePuzzle(box, api);
    // ---- игры на живой сцене ----
    if (p.scene && p.scene !== 'attic') {
      if (cfg.type === 'hidden') {
        // полоска внизу: кружочки-вырезки с картинки, найденные становятся цветными
        const strip = el('div', { class: 'find-strip' });
        cfg.items.forEach((it) => {
          const cw = 0.075, ch = cw * 16 / 9;
          strip.append(el('div', { class: 'find-it', title: it.name, style: 'background-image:url("' + p.img + '");background-size:' + (100 / cw) + '% auto;background-position:' + ((it.x - cw / 2) / (1 - cw)) * 100 + '% ' + ((it.y - ch / 2) / (1 - ch)) * 100 + '%' }, [el('span', { text: it.name })]));
        });
        // пока ищем — панель с текстом прячется, лента с вещами встаёт поверх картинки, ничего не закрывая
        const bar = el('div', { class: 'find-bar' }, [el('div', { class: 'find-title', text: cfg.prompt }), strip]);
        const sceneRoot = $('#scene');
        sceneRoot.querySelector('.s-stage').after(bar);
        sceneRoot.classList.add('searching');
        box.append(el('p', { class: 'puz-hint', text: cfg.prompt }));
        const off = () => { bar.remove(); sceneRoot.classList.remove('searching'); };
        const h = SCENE.hidden(cfg.items, (i) => { strip.children[i].classList.add('got'); }, () => { setTimeout(off, 600); api.solve(); });
        current.peek = h.peek;
        cleanup = () => { h.stop(); off(); };
        return;
      }
      if (cfg.type === 'diff') {
        box.append(el('p', { class: 'puz-hint', text: cfg.prompt }));
        const d = SCENE.differences({ img: p.img, img2: cfg.img2, list: cfg.list, say: cfg.say }, () => {}, api.solve);
        current.peek = d.peek;
        cleanup = d.stop;
        return;
      }
      if (cfg.type === 'jigsaw') {
        box.append(el('p', { class: 'puz-hint', text: cfg.prompt }));
        const j = SCENE.jigsaw(cfg, api.solve);
        current.peek = j.peek;
        cleanup = j.stop;
        return;
      }
      if (cfg.type === 'flashlight') {
        // на тёмной странице только поле для цифр — текст не мешает светить
        quiet(true);
        const stop = SCENE.flashlight(cfg.items);
        const sub = el('div');
        box.append(sub);
        // верный код — темнота уходит, сундук открывается, из него бьёт свет
        PUZ.code(sub, { answer: cfg.answer, digits: true, wrong: cfg.wrong, button: 'Открыть' }, Object.assign({}, api, { solve: () => { stop(); if (cfg.chest) SCENE.chestOpen(cfg.chest.x, cfg.chest.y); api.solve(); } }));
        cleanup = stop;
        return;
      }
      if (cfg.type === 'taps' && cfg.gold) {
        box.append(el('p', { class: 'puz-hint', text: cfg.prompt }));
        cleanup = SCENE.goldTap(cfg.gold, api.solve);
        return;
      }
      if (cfg.type === 'mirror') {
        // на телефоне надпись мелкая: нажатие на зеркало показывает её крупно (всё так же задом наперёд)
        const look = () => modal([el('div', { class: 'mirror-text big', text: cfg.text })]);
        const spotEl = document.querySelector('.s-spot.mirror');
        if (spotEl) { spotEl.style.cursor = 'zoom-in'; spotEl.onclick = look; }
        box.append(el('p', { class: 'puz-hint', text: 'Прочитай надпись в зеркале и нажми «Листать». Нажми на зеркало, чтобы рассмотреть.' }),
          el('button', { class: 'btn', text: 'Рассмотреть зеркало', onclick: look }));
        return;
      }
    }
    if (cfg.type === 'mirror') {
      box.append(el('div', { class: 'mirror-text', text: cfg.text }), el('p', { class: 'puz-hint', text: 'Прочитай и нажми «Листать»' }));
      return;
    }
    if (cfg.type === 'taps' && current.p && current.p.scene === 'attic') {
      box.append(el('p', { class: 'puz-hint', text: cfg.prompt }));
      cleanup = ATTIC.taps(cfg.count, cfg.reacts, api.solve, 'p' + current.n + '-r');
      return;
    }
    if (cfg.type === 'assemble') { cfg.type = 'anagram'; cfg.gold = true; cfg.letters = shuffleArr(S.letters.slice()).join(''); }
    // лабиринт на телефоне лежит поверх картинки — панель с текстом на это время убираем
    if (cfg.type === 'maze' && p.scene) quiet(true);
    cleanup = PUZ[cfg.type](box, cfg, api) || null;
  }
  // «тихая» панель: реплики спрятаны, видно только задание (на телефоне в горизонтальном положении)
  function quiet(on) { if (current && current.p && current.p.scene && current.p.scene !== 'attic') SCENE.dlg.classList.toggle('quiet', on); }
  const shuffleArr = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function namePuzzle(box, api) {
    const input = el('input', { class: 'code-input name', type: 'text', maxlength: '16', placeholder: 'Имя', 'aria-label': 'Твоё имя', value: S.name || '' });
    let g = S.g || 'm';
    const seg = el('div', { class: 'seg' }, [
      el('button', { class: g === 'm' ? 'on' : '', text: 'Я читатель', onclick: (e) => { g = 'm'; seg.querySelectorAll('button').forEach((b) => b.classList.remove('on')); e.target.classList.add('on'); } }),
      el('button', { class: g === 'f' ? 'on' : '', text: 'Я читательница', onclick: (e) => { g = 'f'; seg.querySelectorAll('button').forEach((b) => b.classList.remove('on')); e.target.classList.add('on'); } }),
    ]);
    const ok = el('button', { class: 'btn primary', text: 'Вот я', onclick: () => {
      const v = input.value.trim();
      if (!v) { api.wrong('Книга ждёт имя. Без имени она не разговаривает.'); return; }
      S.name = v.slice(0, 16);
      S.g = g;
      save();
      api.solve();
    } });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok.click(); });
    box.append(input, seg, ok);
    if (matchMedia('(pointer: coarse)').matches) PUZ.keypad(input, { name: true });
    else setTimeout(() => input.focus({ preventScroll: true }), 50);
  }

  function gainLetter(l) {
    S.letters.push(l);
    save();
    SND.play('letter');
    const fly = el('div', { class: 'fly-letter', text: l });
    document.body.append(fly);
    setTimeout(() => fly.classList.add('go'), 30);
    setTimeout(() => { fly.remove(); renderLetters(); }, 1200);
    toast('Золотая буква «' + l + '»! Собрано ' + S.letters.length + ' из ' + BOOK.letters.length + '.');
  }

  // Кнопки перехода. На чердаке «нырнуть» — значит самому открыть обложку, потом вихрь.
  function nextButtons(tail, list) {
    list.forEach((b) => {
      if (b.dive && current.p && current.p.scene === 'attic') {
        const n = current.n;
        tail.append(el('p', { class: 'puz-hint', text: 'Открой книгу: возьмись за край обложки и потяни пальцем или мышкой' }));
        const fallback = el('button', { class: 'btn', text: b.t, hidden: true, onclick: () => ATTIC.finishCover() });
        tail.append(fallback);
        const t = setTimeout(() => { fallback.hidden = false; }, 8000);
        cleanup = ATTIC.openCover(() => { if (current.n === n) vortexDive(b.go); });
        const c0 = cleanup;
        cleanup = () => { clearTimeout(t); c0(); ATTIC.resetCover(); };
        return;
      }
      if (b.peek && current.p && current.p.spots && current.p.spots[b.peek]) {
        // заглядываем в скважину: место на картинке светится, нажимаешь — и мы ныряем в него
        const s = current.p.spots[b.peek];
        const n = current.n;
        let done = false;
        const peek = () => {
          if (done || current.n !== n) return;
          done = true;
          SND.play('swish');
          SCENE.zoomInto(s.x + s.w / 2, s.y + s.h / 2, () => go(b.go, true), BOOK.pages[b.go] && BOOK.pages[b.go].img);
        };
        tail.append(el('p', { class: 'puz-hint', text: 'Загляни в скважину — нажми на неё' }));
        const fallback = el('button', { class: 'btn', text: b.t, hidden: true, onclick: peek });
        tail.append(fallback);
        const t = setTimeout(() => { fallback.hidden = false; }, 8000);
        SCENE.makeTap(b.peek, peek, 'Заглянуть в скважину');
        cleanup = () => clearTimeout(t);
        return;
      }
      if (b.fx) { tail.append(el('button', { class: 'btn primary', text: b.t, onclick: (e) => { e.target.disabled = true; magicJump(b.go, b.fx, b.from); } })); return; }
      tail.append(el('button', { class: 'btn primary', text: b.t, onclick: () => (b.dive ? dive(b.go) : go(b.go)) }));
    });
  }

  // Сказочный переход: из точки кадра разливается золотой свет с искрами и уносит на другую страницу.
  // light — свет из сундука; grand — торжественно: лучи, страница летит домой, звёзды.
  function magicJump(to, kind, from) {
    const grand = kind === 'grand';
    const pt = SCENE.point(from ? from.x : 0.5, from ? from.y : 0.5);
    SND.play('magic');
    if (grand) setTimeout(() => SND.play('letter'), 900);
    const o = el('div', { class: 'magic' + (grand ? ' grand' : ''), style: '--x:' + pt.x + 'px;--y:' + pt.y + 'px' });
    o.append(el('div', { class: 'magic-light' }));
    if (grand) {
      o.append(el('div', { class: 'magic-rays' }));
      o.append(el('div', { class: 'magic-page', html: '<i></i><i></i><i></i><b>Конец</b>' }));
    }
    const N = grand ? 70 : 40;
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * Math.max(innerWidth, innerHeight) * 0.7;
      o.append(el('i', { class: 'spark' + (i % 3 ? '' : ' star'), style: '--dx:' + Math.cos(a) * d + 'px;--dy:' + Math.sin(a) * d + 'px;animation-delay:' + Math.random() * (grand ? 1.4 : 0.8) + 's;--s:' + (0.5 + Math.random()) }));
    }
    document.body.append(o);
    const T = grand ? 3000 : 1900;
    setTimeout(() => go(to, true), T);
    setTimeout(() => o.classList.add('out'), T + 150);
    setTimeout(() => o.remove(), T + 1600);
  }

  // Вихрь: буквы и листочки закручиваются в книгу, и мы проваливаемся внутрь
  function vortexDive(to) {
    SND.play('whoosh');
    const cv = el('canvas', { class: 'vortex' });
    document.body.append(cv);
    const W = (cv.width = innerWidth * Math.min(2, devicePixelRatio || 1)), H = (cv.height = innerHeight * Math.min(2, devicePixelRatio || 1));
    const c = cv.getContext('2d');
    const ctr = ATTIC.bookCenter();
    const ox = ctr.x * (W / innerWidth), oy = ctr.y * (H / innerHeight);
    const R = Math.hypot(W, H) * 0.7;
    const ABC = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ';
    const colors = ['#f2c86a', '#fffaf0', '#c9a3e8', '#d4a53c', '#ffffff'];
    const parts = [];
    for (let i = 0; i < 260; i++) {
      const kind = i % 4 === 0 ? 'leaf' : i % 4 === 1 ? 'dot' : 'char';
      parts.push({ a: Math.random() * Math.PI * 2, r: R * (0.25 + Math.random() * 0.9), sp: 0.02 + Math.random() * 0.03, kind, ch: ABC[i % ABC.length], col: colors[i % colors.length], s: 0.6 + Math.random() * 1.2, rot: Math.random() * 6 });
    }
    const t0 = performance.now(), DUR = 2600;
    let switched = false;
    const frame = (now) => {
      const k = Math.min(1, (now - t0) / DUR);
      // фон темнеет и закручивается фиолетово-золотыми кольцами
      c.fillStyle = 'rgba(26,14,40,' + (0.2 + k * 0.3) + ')';
      c.fillRect(0, 0, W, H);
      c.save();
      c.translate(ox, oy);
      for (let ring = 0; ring < 7; ring++) {
        c.rotate(k * 9 + ring * 0.9);
        c.strokeStyle = ring % 2 ? 'rgba(242,200,106,' + 0.35 * k + ')' : 'rgba(150,100,210,' + 0.4 * k + ')';
        c.lineWidth = (8 + ring * 3) * (W / 1200);
        c.beginPath();
        for (let a = 0; a < 5.5; a += 0.08) { const rr = (a / 5.5) * R * (1.05 - k * 0.5) * (0.4 + ring * 0.1); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        c.stroke();
      }
      c.restore();
      const pull = 0.985 - k * 0.04;
      for (const p of parts) {
        p.a += p.sp * (1 + k * 5);
        p.r *= pull;
        if (p.r < 8) p.r = R * (0.8 + Math.random() * 0.3) * (1 - k);
        const x = ox + Math.cos(p.a) * p.r, y = oy + Math.sin(p.a) * p.r * 0.85;
        const sz = p.s * (W / 1200) * (5 + (p.r / R) * 16);
        c.save();
        c.translate(x, y);
        c.rotate(p.a + p.rot);
        c.globalAlpha = Math.min(1, p.r / 60);
        c.fillStyle = p.col;
        if (p.kind === 'char') { c.font = '700 ' + sz * 1.6 + 'px Neucha, serif'; c.fillText(p.ch, 0, 0); }
        else if (p.kind === 'leaf') { c.fillStyle = '#fffaf0'; c.fillRect(-sz, -sz * 0.7, sz * 2, sz * 1.4); c.fillStyle = 'rgba(80,60,90,.35)'; c.fillRect(-sz * 0.7, -sz * 0.3, sz * 1.4, sz * 0.12); c.fillRect(-sz * 0.7, sz * 0.05, sz * 1.1, sz * 0.12); }
        else { c.beginPath(); c.arc(0, 0, sz * 0.25, 0, 7); c.fill(); }
        c.restore();
      }
      // в конце центр раскрывается светом страницы
      if (k > 0.7) {
        const q = (k - 0.7) / 0.3;
        const g = c.createRadialGradient(ox, oy, 0, ox, oy, R * q * 1.2 + 1);
        g.addColorStop(0, 'rgba(255,248,230,' + q + ')'); g.addColorStop(0.7, 'rgba(250,236,200,' + q * 0.9 + ')'); g.addColorStop(1, 'rgba(250,236,200,0)');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
      }
      if (k < 1) return requestAnimationFrame(frame);
      if (!switched) {
        switched = true;
        ATTIC.resetCover();
        go(to, true);
        cv.classList.add('out');
        setTimeout(() => cv.remove(), 900);
      }
    };
    requestAnimationFrame(frame);
  }

  // ---------- Ныряние внутрь книги ----------
  function dive(to) {
    SND.play('dive');
    const o = el('div', { class: 'dive', html: ART.scene.dive() });
    document.body.append(o);
    setTimeout(() => o.classList.add('go'), 30);
    setTimeout(() => go(to, true), 1300);
    setTimeout(() => o.classList.add('out'), 1500);
    setTimeout(() => o.remove(), 2300);
  }

  // ---------- Листание ----------
  function openDial() {
    let val = '';
    const disp = el('div', { class: 'dial-disp', text: '—' });
    const set = (v) => { val = v.slice(0, 3); disp.textContent = val || '—'; };
    const keys = el('div', { class: 'keypad' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].map((k) => el('button', { class: 'key' + (k === 'OK' ? ' ok' : ''), text: k, onclick: () => {
      SND.play('tap');
      if (k === '⌫') set(val.slice(0, -1));
      else if (k === 'OK') submit();
      else set(val + k);
    } })));
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) set(val + e.key);
      else if (e.key === 'Backspace') set(val.slice(0, -1));
      else if (e.key === 'Enter') submit();
    };
    window.addEventListener('keydown', onKey);
    const close = modal([el('h2', { text: 'На какую страницу?' }), disp, keys], () => window.removeEventListener('keydown', onKey));
    function submit() {
      const n = parseInt(val, 10);
      if (!n) return;
      close();
      flipTo(n);
    }
  }
  function flipTo(n) {
    const p = BOOK.pages[n];
    const ok = p && (p.open || S.visited[n] || S.unlocked.includes(n));
    if (ok) return go(n);
    const j = BOOK.jokes[n] || BOOK.jokeList[n % BOOK.jokeList.length];
    go(n, false, j);
  }

  // ---------- Подсказка ----------
  function hint() {
    const p = current && current.p;
    if (!p) return;
    let list = p.hints || [];
    if (p.afterHints && S.solved[current.n]) list = p.afterHints;
    const who = S.helper || 'book';
    if (!list.length) { toast(who === 'klyaksa' ? 'Тут и так всё понятно! Читай дальше.' : 'Подсказок нет. Читай внимательно!', who); return; }
    const key = current.n + (p.afterHints && S.solved[current.n] ? 'a' : '');
    const i = Math.min(S.hint[key] || 0, list.length - 1);
    S.hint[key] = i + 1;
    save();
    toast(list[i], who, 7000);
    SND.say(who, list[i]);
    SND.play('pop');
    // на последней подсказке в поиске — подсвечиваем, где искать
    if (i === list.length - 1 && current.peek) current.peek();
  }

  // ---------- Блокнот ----------
  function openNotes() {
    const list = el('ul', { class: 'notes' }, S.notes.length ? S.notes.map((n) => el('li', { text: n })) : [el('li', { class: 'muted', text: 'Пока пусто. Важное книга запишет сюда сама.' })]);
    const letters = el('div', { class: 'letters big' }, BOOK.letters.map((_, i) => el('span', { class: 'gl' + (S.letters[i] ? ' got' : ''), text: S.letters[i] || '?' })));
    modal([el('h2', { text: 'Блокнот ' + (S.name ? '· ' + S.name : '') }), letters, list, el('p', { class: 'muted small', text: 'Страница сейчас: ' + S.page })]);
  }

  // ---------- Финал ----------
  function showEnding(tail) {
    S.done = true;
    save();
    SND.play('win');
    confetti();
    tail.append(el('div', { class: 'certificate' }, [
      el('div', { class: 'cert-title', text: 'Грамота' }),
      el('p', { text: fill('{name} — перв{ый|ая} читат{ель|ельница} Маленькой злой книги. Последняя страница найдена!') }),
      el('div', { class: 'cert-sign', text: 'Подпись: Злая книга (очень довольная)' }),
    ]), el('div', { class: 'row' }, [
      el('button', { class: 'btn primary', text: 'На стол', onclick: () => showDesk() }),
      el('button', { class: 'btn', text: 'Прочитать заново', onclick: () => { const pl = S.players; S = fresh(); S.players = pl; save(); go(BOOK.start); renderLetters(); renderHelper(); } }),
    ]), el('p', { class: 'muted small', text: 'Книга вторая скоро…' }));
  }
  function confetti() {
    const box = el('div', { class: 'confetti' });
    for (let i = 0; i < 70; i++) box.append(el('i', { style: 'left:' + Math.random() * 100 + '%;animation-delay:' + Math.random() * 1.5 + 's;background:' + ['#d4a53c', '#c8453b', '#5b3f8f', '#4f7d4a', '#3f6f8f'][i % 5] + ';transform:rotate(' + Math.random() * 360 + 'deg)' }));
    document.body.append(box);
    setTimeout(() => box.remove(), 5000);
  }

  // ---------- Мелочи ----------
  function toast(text, who, ms = 3500) {
    const t = el('div', { class: 'toast' + (who ? ' with-ava' : '') }, [who && ART.av[who] ? el('div', { class: 'ava', html: ART.av[who]('think') }) : null, el('span', { text: fill(text) })]);
    $('#toasts').append(t);
    setTimeout(() => t.classList.add('out'), ms);
    setTimeout(() => t.remove(), ms + 500);
  }
  function modal(kids, onClose) {
    const m = $('#modal');
    m.innerHTML = '';
    m.hidden = false;
    const close = () => { m.hidden = true; m.innerHTML = ''; onClose && onClose(); };
    const card = el('div', { class: 'card' }, [el('button', { class: 'x', 'aria-label': 'Закрыть', text: '✕', onclick: close }), ...kids]);
    m.append(card);
    m.onclick = (e) => { if (e.target === m) close(); };
    return close;
  }
  function confirmBox(text, yes) {
    const close = modal([el('p', { text }), el('div', { class: 'row' }, [el('button', { class: 'btn', text: 'Нет', onclick: () => close() }), el('button', { class: 'btn primary', text: 'Да', onclick: () => { close(); yes(); } })])]);
  }

  // для проверок
  window.ZK = { go, flipTo, get S() { return S; }, reset: () => { S = fresh(); save(); } };

  // кто говорит — тот и шевелится: книга шевелит ртом, Клякса подпрыгивает в такт
  SND.onTalk((who, on) => {
    if (who === 'book') ATTIC.talk(on);
    if (SCENE.charWho === who) SCENE.charTalk(on);
  });

  load();
  if (location.hash.startsWith('#page-')) { S.page = +location.hash.slice(6); S.name = S.name || 'Тестер'; openBook(); }
  else showDesk();
})();
