'use strict';
// Звуки из кода и голоса персонажей (синтез речи браузера).
window.SND = (function () {
  let ctx = null, master = null;
  const st = { on: true, voice: true };
  try { Object.assign(st, JSON.parse(localStorage.getItem('zk-sound') || '{}')); } catch (e) { /* без сохранения */ }
  const save = () => { try { localStorage.setItem('zk-sound', JSON.stringify(st)); } catch (e) { /* ничего */ } };
  const init = () => {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  };
  document.addEventListener('pointerdown', init, { passive: true });

  const tone = (f, d, type = 'sine', v = 0.15, when = 0, slide = 1) => {
    if (!ctx || !st.on) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide !== 1) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + d + 0.05);
  };
  const noise = (d, v = 0.12, from = 800, to = 3000, when = 0) => {
    if (!ctx || !st.on) return;
    const t = ctx.currentTime + when;
    const len = Math.floor(ctx.sampleRate * d);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.8;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + d);
    const g = ctx.createGain();
    g.gain.value = v;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  };
  const FX = {
    page: () => noise(0.32, 0.22, 600, 4200),
    tap: () => tone(700, 0.06, 'triangle', 0.08),
    grumble: () => { tone(110, 0.35, 'sawtooth', 0.06, 0, 0.8); tone(90, 0.4, 'sawtooth', 0.05, 0.12, 0.7); },
    giggle: () => [0, 1, 2, 3].forEach((i) => tone(620 + i * 40, 0.08, 'triangle', 0.07, i * 0.09, 1.3)),
    right: () => { tone(660, 0.12, 'sine', 0.13); tone(990, 0.22, 'sine', 0.12, 0.1); },
    wrong: () => { tone(200, 0.14, 'square', 0.06); tone(170, 0.2, 'square', 0.06, 0.12); },
    letter: () => [0, 1, 2, 3, 4].forEach((i) => tone(784 * Math.pow(1.122, i), 0.25, 'sine', 0.07, i * 0.06)),
    magic: () => [0, 1, 2, 3, 4, 5, 6].forEach((i) => tone(523 * Math.pow(1.15, i), 0.3, 'triangle', 0.05, i * 0.05)),
    dive: () => { noise(1.4, 0.18, 200, 5000); tone(220, 1.2, 'sine', 0.08, 0, 3); },
    pop: () => tone(400, 0.12, 'sine', 0.12, 0, 2.2),
    win: () => [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.3, 'triangle', 0.08, i * 0.13)),
    swish: () => noise(0.25, 0.12, 900, 2600),
    creak: () => { tone(150, 0.5, 'sawtooth', 0.04, 0, 1.6); tone(190, 0.4, 'sawtooth', 0.03, 0.15, 0.8); },
    whoosh: () => { noise(2.2, 0.22, 150, 4000); tone(110, 2, 'sine', 0.09, 0, 6); [0, 1, 2, 3, 4, 5].forEach((i) => tone(880 * Math.pow(1.12, i), 0.4, 'triangle', 0.04, 0.3 + i * 0.18)); },
    sneeze: () => { tone(500, 0.12, 'sine', 0.15, 0, 1.6); noise(0.4, 0.3, 3000, 600, 0.18); tone(220, 0.3, 'sawtooth', 0.06, 0.2, 0.7); },
  };
  // интонации книги по настроению
  const EMO_VOICE = { angry: { pitch: 0.6, rate: 1.15 }, sly: { pitch: 0.85, rate: 0.85 }, happy: { pitch: 1.2, rate: 1.15 }, scared: { pitch: 1.35, rate: 1.3 }, sulk: { pitch: 0.7, rate: 0.8 }, beg: { pitch: 1.4, rate: 0.85 }, sneeze: { pitch: 1.1, rate: 1.2 } };

  // Голоса: книга басит и ворчит, Клякса пищит, Сова говорит медленно
  const VOICES = { book: { pitch: 0.75, rate: 1.0 }, klyaksa: { pitch: 1.75, rate: 1.2 }, opechatka: { pitch: 1.5, rate: 1.35 }, bukvoed: { pitch: 0.5, rate: 0.9 }, owl: { pitch: 0.9, rate: 0.82 } };
  let ruVoice = null;
  const pick = () => {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    ruVoice = vs.find((v) => /^ru/i.test(v.lang) && /Google|Svetlana|Dariya|Pavel|Irina/i.test(v.name)) || vs.find((v) => /^ru/i.test(v.lang)) || null;
  };
  if ('speechSynthesis' in window) { pick(); speechSynthesis.onvoiceschanged = pick; }
  // записанная озвучка из папки «озвучка»; обещание выполняется, когда реплика договорена
  // Одна общая дорожка на все реплики: телефоны дают звук только той дорожке,
  // которую «разбудили» касанием. Будим её первым касанием тихим звуком.
  const a = new Audio();
  a.preload = 'auto';
  const SILENT = (() => {
    const n = 400, b = new Uint8Array(44 + n), dv = new DataView(b.buffer), w = (o, s) => [...s].forEach((c, i) => { b[o + i] = c.charCodeAt(0); });
    w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true); b.fill(128, 44);
    return 'data:audio/wav;base64,' + btoa(String.fromCharCode(...b));
  })();
  let woke = false, pending = false;
  document.addEventListener('pointerdown', () => {
    // браузер не дал начать реплику без касания — договариваем её сейчас
    if (pending) { pending = false; woke = true; a.play().catch(() => { pending = true; }); return; }
    if (woke || clip) return;
    woke = true;
    a.src = SILENT;
    a.play().catch(() => { woke = false; });
  }, { passive: true });

  let clip = null, clipDone = null, turn = 0;
  const missing = new Set();
  const stopClip = () => {
    if (clip) { a.pause(); clip = null; }
    pending = false;
    if (clipDone) { const f = clipDone; clipDone = null; f(); }
  };
  // кто сейчас говорит — чтобы этот герой шевелился в такт (engine подписывается через onTalk)
  let talkCb = null;
  const say = (who, text, emo, id) => new Promise((res) => {
    // реплика без записи не обрывает ту, что звучит сейчас
    if (!st.on || !st.voice || !id || missing.has(id)) return res();
    stopClip();
    const my = ++turn;
    clip = id;
    a.src = 'voice/' + id + '.mp3';
    a.volume = 0.95;
    let talking = false, done = false;
    a.onplaying = () => { if (turn !== my) return; talking = true; if (talkCb) talkCb(who, true); };
    const fin = () => {
      if (done) return;
      done = true;
      if (talking) { talking = false; if (talkCb) talkCb(who, false); }
      if (turn === my) { clip = null; clipDone = null; pending = false; }
      res();
    };
    clipDone = fin;
    a.onended = () => { if (turn === my) fin(); };
    // в конце многих записей до 2 секунд тишины: как только голос кончился — реплика договорена
    const vm = window.VOICEMAP, map = vm && vm.m[id];
    const lastVoice = map ? map.lastIndexOf('1') : -1;
    a.ontimeupdate = lastVoice < 0 ? null : () => { if (turn === my && a.currentTime > (lastVoice + 4) * vm.fd) { a.ontimeupdate = null; a.pause(); fin(); } };
    a.onerror = () => { if (turn !== my) return; missing.add(id); fin(); };
    // запрет без касания: реплика ждёт касания, а игра идёт дальше через 30 секунд, как раньше
    a.play().catch((e) => { if (turn !== my) return; if (e && e.name === 'NotAllowedError') pending = true; else fin(); });
    setTimeout(() => { if (!talking || turn !== my) fin(); }, 30000);
    // голос браузера звучит механически — книга говорит только записанным голосом
  });
  const tts = (who, text, emo) => {
    if (!('speechSynthesis' in window)) return;
    try {
      if (!ruVoice) pick();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[«»*_]/g, ''));
      if (ruVoice) u.voice = ruVoice;
      u.lang = 'ru-RU';
      const v = (who === 'book' && EMO_VOICE[emo]) || VOICES[who] || VOICES.book;
      u.pitch = v.pitch;
      u.rate = v.rate;
      u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { /* без голоса */ }
  };
  const hush = () => { stopClip(); try { speechSynthesis.cancel(); } catch (e) { /* ничего */ } };

  return {
    init, say, hush, state: st,
    onTalk: (fn) => { talkCb = fn; },
    // звучит ли голос прямо сейчас — по карте записи (паузы и тишина в начале/конце = нет)
    voiceNow: () => {
      if (!clip || a.paused) return false;
      const vm = window.VOICEMAP, s = vm && vm.m[clip];
      if (!s) return true;
      return s[Math.floor(a.currentTime / vm.fd)] === '1';
    },
    play: (n) => { init(); if (FX[n]) try { FX[n](); } catch (e) { /* без звука */ } },
    toggle: (k) => { st[k] = !st[k]; save(); if (!st.voice || !st.on) hush(); return st[k]; },
  };
})();
