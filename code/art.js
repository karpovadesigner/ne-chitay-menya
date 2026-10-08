'use strict';
// Рисунки-заглушки в стиле чернильной книжной графики. Потом заменим картинками Оксаны.
window.ART = (function () {
  const INK = '#2b2233', RED = '#c8453b', PLUM = '#5b3f8f', GOLD = '#d4a53c', PAPER = '#f3e7cf', SHADE = '#e2d1ad';
  const s = (vb, body) => '<svg viewBox="' + vb + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + body + '</svg>';

  // Лицо книги: глаза следят за пальцем, брови показывают настроение
  const face = (mood = 'grumpy') => {
    const brows = {
      grumpy: '<path d="M62 92 L96 104" /><path d="M158 92 L124 104" />',
      angry: '<path d="M60 86 L98 108" /><path d="M160 86 L122 108" />',
      happy: '<path d="M62 98 Q80 86 96 96" /><path d="M124 96 Q140 86 158 98" />',
      scared: '<path d="M62 100 L96 90" /><path d="M158 100 L124 90" />',
      sly: '<path d="M62 96 L96 100" /><path d="M124 92 Q140 84 158 92" />',
    }[mood] || '';
    const mouth = {
      grumpy: '<path d="M88 160 Q110 148 132 160" />',
      angry: '<path d="M84 162 Q110 140 136 162 Z" fill="' + RED + '" />',
      happy: '<path d="M84 150 Q110 178 136 150 Z" fill="' + RED + '" />',
      scared: '<ellipse cx="110" cy="158" rx="12" ry="15" fill="' + INK + '" />',
      sly: '<path d="M86 156 Q118 168 136 148" />',
    }[mood] || '';
    return '<g class="face" stroke="' + INK + '" stroke-width="5" stroke-linecap="round" fill="none">' + brows +
      '<g class="eye"><ellipse cx="80" cy="124" rx="17" ry="19" fill="#fffaf0"/><circle class="pupil" cx="80" cy="126" r="8" fill="' + INK + '" stroke="none"/></g>' +
      '<g class="eye"><ellipse cx="140" cy="124" rx="17" ry="19" fill="#fffaf0"/><circle class="pupil" cx="140" cy="126" r="8" fill="' + INK + '" stroke="none"/></g>' +
      mouth + '</g>';
  };

  const A = {};
  // Закрытая книга на столе
  A.cover = (mood) => s('0 0 220 290',
    '<rect x="14" y="16" width="196" height="262" rx="14" fill="#3b2550"/>' +
    '<rect x="8" y="10" width="196" height="262" rx="14" fill="' + PLUM + '" stroke="' + INK + '" stroke-width="5"/>' +
    '<rect x="8" y="10" width="30" height="262" rx="10" fill="#4a3170" stroke="' + INK + '" stroke-width="5"/>' +
    '<path d="M40 30 H190 M40 252 H190" stroke="' + GOLD + '" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>' +
    '<text x="122" y="56" text-anchor="middle" font-family="Underdog, Neucha, cursive" font-size="17" fill="' + GOLD + '">Маленькая</text>' +
    '<text x="122" y="78" text-anchor="middle" font-family="Underdog, Neucha, cursive" font-size="22" fill="' + GOLD + '">ЗЛАЯ книга</text>' +
    '<g transform="translate(12 40)">' + face(mood) + '</g>' +
    '<path d="M196 200 l12 -4 l-6 14 z" fill="' + RED + '" stroke="' + INK + '" stroke-width="3"/>');

  // Аватарки говорящих
  A.av = {
    book: (m) => s('0 0 220 230', '<rect x="20" y="20" width="180" height="200" rx="18" fill="' + PLUM + '" stroke="' + INK + '" stroke-width="6"/><g transform="translate(0 -20)">' + face(m || 'grumpy') + '</g>'),
    // Клякса — нарисованная картинка: hello, letter, scared, giggle, think, joy
    klyaksa: (e) => '<img class="av-img" src="img/klyaksa-' + (e || 'hello') + '.png" alt="Клякса" draggable="false">',
    opechatka: () => s('0 0 200 220',
      '<path d="M60 40 L100 14 L140 40 L132 170 Q100 196 68 170 Z" fill="' + RED + '" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>' +
      '<text x="100" y="78" text-anchor="middle" font-family="Underdog, cursive" font-size="34" fill="' + PAPER + '">Ъ</text>' +
      '<ellipse cx="84" cy="112" rx="13" ry="15" fill="#fffaf0" stroke="' + INK + '" stroke-width="4"/><ellipse cx="118" cy="104" rx="10" ry="12" fill="#fffaf0" stroke="' + INK + '" stroke-width="4"/>' +
      '<circle class="pupil" cx="86" cy="116" r="6" fill="' + INK + '"/><circle class="pupil" cx="116" cy="106" r="5" fill="' + INK + '"/>' +
      '<path d="M78 144 Q100 160 124 140" stroke="' + INK + '" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M60 120 L28 96 M140 120 L176 92 M80 180 L74 208 M120 180 L128 208" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/>'),
    bukvoed: () => s('0 0 220 200',
      '<path d="M20 160 Q40 120 70 150 Q100 180 120 140 Q140 100 168 120" stroke="' + INK + '" stroke-width="44" fill="none" stroke-linecap="round"/>' +
      '<path d="M20 160 Q40 120 70 150 Q100 180 120 140 Q140 100 168 120" stroke="#9cc56f" stroke-width="34" fill="none" stroke-linecap="round"/>' +
      '<circle cx="176" cy="96" r="34" fill="#9cc56f" stroke="' + INK + '" stroke-width="6"/>' +
      '<circle cx="164" cy="90" r="9" fill="' + INK + '"/><circle cx="190" cy="90" r="13" fill="none" stroke="' + GOLD + '" stroke-width="4"/><circle cx="190" cy="90" r="6" fill="' + INK + '"/>' +
      '<path d="M190 103 L196 140" stroke="' + GOLD + '" stroke-width="2"/>' +
      '<path d="M160 112 Q176 122 192 112" stroke="' + INK + '" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M156 64 L150 46 L168 58 M176 62 L178 42 L190 60" fill="' + RED + '" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>'),
    owl: () => s('0 0 200 220',
      '<path d="M40 70 Q40 30 100 30 Q160 30 160 70 L164 170 Q100 210 36 170 Z" fill="#a07850" stroke="' + INK + '" stroke-width="6"/>' +
      '<path d="M40 64 L30 30 L66 46 M160 64 L170 30 L134 46" fill="#a07850" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>' +
      '<circle cx="74" cy="88" r="26" fill="#fffaf0" stroke="' + INK + '" stroke-width="5"/><circle cx="126" cy="88" r="26" fill="#fffaf0" stroke="' + INK + '" stroke-width="5"/>' +
      '<circle class="pupil" cx="74" cy="90" r="11" fill="' + INK + '"/><circle class="pupil" cx="126" cy="90" r="11" fill="' + INK + '"/>' +
      '<path d="M92 112 L100 130 L108 112 Z" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M66 144 q10 8 20 0 q10 8 20 0 q10 8 20 0 M70 166 q10 8 20 0 q10 8 20 0" stroke="' + INK + '" stroke-width="4" fill="none"/>' +
      '<rect x="56" y="54" width="88" height="10" rx="5" fill="' + GOLD + '" opacity=".0"/>'),
  };

  // Иллюстрации к страницам (левая страница разворота)
  const spider = (x, y, k = 1) => '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><path d="M0 0 q6 10 -2 20" stroke="' + INK + '" stroke-width="3" fill="none"/><circle cx="0" cy="0" r="8" fill="' + INK + '"/>' +
    [-1, 1].map((d) => '<path d="M0 0 l' + 14 * d + ' -8 M0 2 l' + 15 * d + ' 2 M0 4 l' + 13 * d + ' 10 M0 -2 l' + 11 * d + ' -14" stroke="' + INK + '" stroke-width="2.5"/>').join('') +
    '<circle cx="-3" cy="-2" r="2" fill="#fffaf0"/><circle cx="3" cy="-2" r="2" fill="#fffaf0"/></g>';
  A.scene = {
    desk: () => '',
    dive: () => s('0 0 400 400', Array.from({ length: 40 }, (_, i) => {
      const a = i * 0.55, r = 8 + i * 4.6;
      return '<text x="' + (200 + Math.cos(a) * r).toFixed(0) + '" y="' + (200 + Math.sin(a) * r).toFixed(0) + '" font-family="Underdog, cursive" font-size="' + (10 + i * 0.6).toFixed(0) + '" fill="' + (i % 3 ? INK : RED) + '" opacity="' + (0.3 + i / 60).toFixed(2) + '">' + 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ'[i % 28] + '</text>';
    }).join('')),
    door: () => s('0 0 400 400',
      '<rect x="0" y="330" width="400" height="70" fill="' + SHADE + '"/>' +
      '<path d="M110 340 V120 Q110 50 200 50 Q290 50 290 120 V340 Z" fill="#8a5a3c" stroke="' + INK + '" stroke-width="6"/>' +
      '<path d="M140 330 V130 Q140 82 200 82 Q260 82 260 130 V330" fill="none" stroke="' + INK + '" stroke-width="3" opacity=".5"/>' +
      '<circle cx="200" cy="215" r="20" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="5"/><path d="M194 215 h12 l-4 28 h-4 z" fill="' + INK + '"/>' +
      '<rect x="128" y="250" width="144" height="40" rx="8" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="4"/>' +
      '<text x="200" y="278" text-anchor="middle" font-family="Underdog, monospace" font-size="17" fill="' + INK + '">12·13·33·12·19·1</text>' +
      '<g transform="translate(316 120) rotate(8)"><rect width="66" height="84" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="4"/><text x="33" y="34" text-anchor="middle" font-family="Neucha" font-size="15" fill="' + INK + '">А = 1</text><text x="33" y="56" text-anchor="middle" font-family="Neucha" font-size="15" fill="' + INK + '">Б = 2</text><text x="33" y="76" text-anchor="middle" font-family="Neucha" font-size="15" fill="' + INK + '">…</text></g>'),
    klyaksa: () => A.av.klyaksa('hello'),
    corridor: () => s('0 0 400 400',
      '<path d="M0 0 L120 110 L280 110 L400 0 M0 400 L120 290 L280 290 L400 400 M120 110 V290 M280 110 V290" stroke="' + INK + '" stroke-width="4" fill="none"/>' +
      '<rect x="120" y="110" width="160" height="180" fill="' + SHADE + '"/>' +
      [[40, 60], [80, 330], [170, 150], [230, 210], [330, 80], [350, 300], [200, 340], [150, 250], [300, 200]].map(([x, y], i) => spider(x, y, 0.9 + (i % 3) * 0.2)).join('') +
      '<path d="M0 0 Q30 40 0 80 M0 0 Q40 30 80 0 M10 10 L60 60" stroke="' + INK + '" stroke-width="1.5" opacity=".5" fill="none"/>'),
    web: () => s('0 0 400 400', '<g stroke="' + INK + '" stroke-width="2" fill="none" opacity=".75">' + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => '<path d="M200 200 L' + (200 + Math.cos(i * 0.785) * 190).toFixed(0) + ' ' + (200 + Math.sin(i * 0.785) * 190).toFixed(0) + '"/>').join('') + [40, 80, 120, 160].map((r) => '<circle cx="200" cy="200" r="' + r + '"/>').join('') + '</g><text x="200" y="222" text-anchor="middle" font-family="Underdog, cursive" font-size="64" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="2">О</text>' + spider(120, 120) + spider(290, 280, 1.2)),
    opechatka: () => s('0 0 400 400', '<rect x="0" y="330" width="400" height="70" fill="' + SHADE + '"/><g transform="translate(110 80) rotate(-6 90 110)">' + A.avOld.opechatka().replace(/<\/?svg[^>]*>/g, '') + '</g>' + ['Ё', 'Й', 'Щ', 'Ы', '?', '!'].map((l, i) => '<text x="' + (40 + i * 62) + '" y="' + (60 + (i % 2) * 280) + '" font-family="Underdog, cursive" font-size="34" fill="' + (i % 2 ? RED : INK) + '" transform="rotate(' + (i * 17 - 30) + ' ' + (40 + i * 62) + ' ' + (60 + (i % 2) * 280) + ')">' + l + '</text>').join('')),
    mirror: () => s('0 0 400 400', '<ellipse cx="200" cy="190" rx="140" ry="170" fill="#cfd9df" stroke="' + GOLD + '" stroke-width="14"/><ellipse cx="200" cy="190" rx="122" ry="152" fill="#e8f0f2"/><path d="M120 110 L170 70 M110 160 L200 80" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".7"/><rect x="170" y="352" width="60" height="30" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="4"/>'),
    library: () => s('0 0 400 400', [0, 1, 2, 3].map((r) => '<rect x="10" y="' + (20 + r * 95) + '" width="380" height="10" fill="#6b4630"/>' + Array.from({ length: 16 }, (_, i) => '<rect x="' + (16 + i * 23) + '" y="' + (32 + r * 95) + '" width="18" height="' + (60 + ((i * 7 + r) % 4) * 5) + '" fill="' + ['#b5523f', '#3f6f8f', '#d4a53c', '#4f7d4a', '#7b4f8f'][(i + r) % 5] + '" stroke="' + INK + '" stroke-width="2"/>').join('')).join('') + '<path d="M300 300 q20 -30 40 0 q20 30 40 0" stroke="#9cc56f" stroke-width="14" fill="none" stroke-linecap="round"/>'),
    bukvoed: () => s('0 0 400 400', '<rect x="0" y="330" width="400" height="70" fill="' + SHADE + '"/><g transform="translate(80 110)">' + A.avOld.bukvoed().replace(/<\/?svg[^>]*>/g, '') + '</g>' + [[60, 70], [320, 60], [340, 300], [40, 300]].map(([x, y]) => '<path d="M' + x + ' ' + y + ' h30 v40 h-30 z" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="3"/><path d="M' + (x + 22) + ' ' + y + ' a8 8 0 0 0 8 8" fill="' + SHADE + '" stroke="' + INK + '" stroke-width="3"/>').join('')),
    dark: () => s('0 0 400 400', '<rect width="400" height="400" fill="#1d1830"/>' + Array.from({ length: 30 }, (_, i) => '<circle cx="' + ((i * 97) % 400) + '" cy="' + ((i * 61) % 400) + '" r="1.5" fill="#fffaf0" opacity=".4"/>').join('')),
    owl: () => s('0 0 400 400', '<path d="M40 330 Q200 300 360 330" stroke="#6b4630" stroke-width="18" stroke-linecap="round" fill="none"/><g transform="translate(100 90)">' + A.avOld.owl().replace(/<\/?svg[^>]*>/g, '') + '</g><rect x="260" y="250" width="90" height="70" rx="8" fill="#8a5a3c" stroke="' + INK + '" stroke-width="5"/><rect x="296" y="276" width="18" height="18" rx="3" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="3"/>'),
    lastpage: () => s('0 0 400 400', '<g transform="rotate(-6 200 200)"><rect x="90" y="40" width="220" height="300" fill="#fffaf0" stroke="' + INK + '" stroke-width="5"/>' + [0, 1, 2, 3, 4, 5, 6].map((i) => '<path d="M115 ' + (90 + i * 26) + ' h' + (170 - (i % 3) * 30) + '" stroke="' + INK + '" stroke-width="3" opacity=".35"/>').join('') + '<text x="200" y="306" text-anchor="middle" font-family="Underdog, cursive" font-size="36" fill="' + RED + '">КОНЕЦ</text></g>' + Array.from({ length: 16 }, (_, i) => '<path d="M' + (30 + i * 23) + ' ' + (20 + (i % 4) * 9) + ' l4 10 l10 2 l-8 6 l2 10 l-8 -6 l-8 6 l2 -10 l-8 -6 l10 -2 z" fill="' + GOLD + '"/>').join('')),
    sulk: () => s('0 0 400 400', '<g transform="translate(90 50)">' + A.cover('angry').replace(/<\/?svg[^>]*>/g, '') + '</g><path d="M330 120 q10 20 0 34 M350 100 q14 30 0 54" stroke="' + INK + '" stroke-width="4" fill="none"/>'),
    joke: () => s('0 0 400 400', '<g opacity=".7">' + spider(90, 100) + spider(300, 260, 1.3) + '</g><text x="200" y="215" text-anchor="middle" font-family="Underdog, cursive" font-size="54" fill="' + INK + '" opacity=".25">???</text>'),
  };
  A.COLORS = { INK, RED, PLUM, GOLD, PAPER };
  // портреты героев в репликах — нарисованные картинки (старые рисунки остаются для страниц-шуток)
  const pic = (who, list) => (e) => '<img class="av-img" src="img/' + who + '-' + (list.includes(e) ? e : list[0]) + '.png" alt="" draggable="false">';
  A.avOld = Object.assign({}, A.av);
  A.av.opechatka = pic('opechatka', ['sly', 'laugh', 'bored', 'give']);
  A.av.bukvoed = pic('bukvoed', ['smug', 'chew', 'sly', 'give']);
  A.av.owl = pic('owl', ['calm', 'talk', 'give']);
  return A;
})();
