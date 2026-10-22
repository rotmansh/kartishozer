'use strict';
// חמישיית ההצלה — a side-scrolling platformer with a hero per kid.
// Everything here (art, music, levels) is original and drawn in code,
// so the whole game ships as plain HTML + JS and wraps into an APK.
(function () {
  const W = 384, H = 216, T = 16, ROWS = 14;
  const GRAV = 0.24, MAX_FALL = 5.2;
  const ENERGY_MAX = 100;

  // ---------------------------------------------------------------- heroes
  // One slot per kid. Only the first is designed so far; the rest are
  // placeholders until we decide together what each one loves.
  const CHARACTERS = [
    { id: 'eliav', name: 'אליאב', age: 4, preset: 'tiny', world: 'עולם ההצלה', unlocked: true,
      pal: { H: '#a8783a', h: '#d8ad62', d: '#76501e' } },
    { id: 'kid2', unlocked: false },
    { id: 'kid3', unlocked: false },
    { id: 'kid4', unlocked: false },
    { id: 'kid5', unlocked: false },
  ];

  // Difficulty by age. "tiny" is built for a 4-year-old: the hero walks
  // by himself, one tap anywhere jumps, the hose sprays on its own, and
  // nothing ends the game; falling or running out of hearts just puts
  // him back a little way.
  const PRESETS = {
    tiny: {
      label: 'קל מאוד', age: 'גיל 4', levels: 'tiny', autoRun: true, autoFire: true, tapJump: true,
      speed: 1.0, accel: 0.1, gravity: 0.17, jump: -4.6, jumpCut: false,
      hearts: 3, drain: 0, pitRescue: true, endless: true, enemySpeed: 0.5,
    },
    easy: {
      label: 'קל', age: 'גיל 6', levels: 'std', autoRun: false, autoFire: true, tapJump: false,
      speed: 1.35, accel: 0.1, gravity: 0.2, jump: -5.0, jumpCut: true,
      hearts: 3, drain: 1 / 90, pitRescue: true, endless: false, enemySpeed: 0.7,
    },
    normal: {
      label: 'רגיל', age: 'גיל 9', levels: 'std', autoRun: false, autoFire: false, tapJump: false,
      speed: 1.8, accel: 0.14, gravity: 0.24, jump: -5.4, jumpCut: true,
      hearts: 1, drain: 1 / 40, pitRescue: false, endless: false, enemySpeed: 1,
    },
    hard: {
      label: 'קשה', age: 'גיל 12', levels: 'std', autoRun: false, autoFire: false, tapJump: false,
      speed: 2.0, accel: 0.16, gravity: 0.26, jump: -5.7, jumpCut: true,
      hearts: 1, drain: 1 / 28, pitRescue: false, endless: false, enemySpeed: 1.3,
    },
  };
  const PRESET_ORDER = ['tiny', 'easy', 'normal', 'hard'];
  let cfg = PRESETS.tiny;

  // ---------------------------------------------------------------- utils
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  function makeCanvas(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (draw) draw(g);
    return c;
  }
  function withFlip(c) {
    const f = makeCanvas(c.width, c.height, g => { g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); });
    return { r: c, l: f, w: c.width, h: c.height };
  }
  function pixels(rows, pal) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    return makeCanvas(w, h, g => {
      for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
        const col = pal[rows[y][x]];
        if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
      }
    });
  }
  const sprite = (rows, pal) => withFlip(pixels(rows, pal));
  function disc(g, cx, cy, r, col) {
    g.fillStyle = col;
    for (let y = -r; y <= r; y++) {
      const w = Math.round(Math.sqrt(r * r - y * y));
      g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  }

  const PAL = {
    H: '#a8783a', h: '#d8ad62', d: '#76501e', S: '#f4c7a1', s: '#dda07a', E: '#1d1b2e', W: '#ffffff',
    M: '#b8524a', R: '#d8352c', r: '#a5241d', Y: '#f6c81c', B: '#2f60b5', b: '#1f3f80', K: '#2b2b33',
    k: '#efefef', g: '#8a8f98', G: '#5d626b', o: '#f08a1c', O: '#c4610e', c: '#58c8f4', C: '#2a8fd0',
    y: '#ffe14d', p: '#ff9ec9', n: '#8b5a2b', q: '#5fbf3a', Q: '#3a8a26', w: '#cfd3da',
  };

  // ---------------------------------------------------------------- hero art (16x24, facing right)
  const HEAD = [[
    '......hhh.h.....',
    '...hhHHHHHhh....',
    '..hHHHHHHHHHh...',
    '.hHHHHhHHHHHHH..',
    'hHHHHHHHHHHHHHd.',
    'HHHdHHHHHHhHHH..',
    'HHHHHHSSHHSSSH..',
    'dHHHHSSSSSSESs..',
    'HHdHHSSSSSSESS..',
    'dHHHsSSSSSSSSSs.',
    '.dHHHsSSSSSMSs..',
    '..dHd..sSSSs....',
  ], [
    '.....h.hhh......',
    '...hhHHHHHhh....',
    '..hHHHHHHHHHh...',
    'hhHHHHhHHHHHHH..',
    '.HHHHHHHHHHHHHd.',
    'HHHdHHHHHHhHHH..',
    'HHHHHHSSHHSSSH..',
    'HHHHHSSSSSSESs..',
    'dHdHHSSSSSSESS..',
    'HHHHsSSSSSSSSSs.',
    'dHHHHsSSSSSMSs..',
    '.dHHd..sSSSs....',
  ]];
  const TORSO = {
    n: ['....rRRRYRR.....', '...RRRRRYRRR....', '...RRRRRYRRS....', '...SRRRRYRRS....', '....RRRRYRR.....'],
    a: ['....rRRRYRR.....', '...RRRRRYRRR....', '...RRRRRYRRRSS..', '....RRRRYRR.....', '....RRRRYRR.....'],
    b: ['....rRRRYRR.....', '...RRRRRYRRR....', '..SRRRRRYRR.....', '.SSRRRRRYRR.....', '....RRRRYRR.....'],
    t: ['....rRRRYRR.....', '...RRRRRYRRRRSSS', '...RRRRRYRR.....', '...RRRRRYRR.....', '....RRRRYRR.....'],
    j: ['..SrRRRRYRR.S...', '..SRRRRRYRRRS...', '...RRRRRYRR.....', '...RRRRRYRR.....', '....RRRRYRR.....'],
  };
  const LEGS = {
    s: ['....BBBBBBB.....', '....BBBbBBB.....', '....BBb.bBB.....', '.....SS..SS.....', '.....SS..SS.....', '....KKK..KKKK...', '....kkk..kkkk...'],
    r1: ['....BBBBBBB.....', '...BBBbbBBBB....', '..BBb....BBB....', '.SS.......SS....', 'KSS.......SS....', 'KK.......KKKK...', 'k........kkkk...'],
    r2: ['....BBBBBBB.....', '....BBBbBBB.....', '.....BBBBB......', '......SSS.......', '.....SSKKK......', '.....SKKKK......', '.....kkkkk......'],
    r3: ['....BBBBBBB.....', '....BBBbBBBB....', '...BBB...BBBS...', '...SS.....SSS...', '..KSS......SKK..', '.KKK.......KKKK.', '.kkk........kkk.'],
    j: ['....BBBBBBB.....', '...BBBBbBBBB....', '...BBb..SSBB....', '...SS...SSKK....', '..KSS....KKK....', '..KKK...........', '..kkk...........'],
  };
  const HELMET = [
    '....rRRRRRr.....',
    '...RRRYYRRRR....',
    '..RRRRYYRRRRR...',
    '.RRRRRRRRRRRRR..',
    'rrrrrrrrrrrrrrrr',
  ];
  const CAP = [
    '................',
    '...bBBBBBBb.....',
    '..BBBBYBBBBB....',
    '..BBBBBBBBBBB...',
    '..KKKKKKKKKKKKK.',
  ];

  let heroPal = PAL;
  const heroCache = new Map();
  function heroSprite(head, torso, legs) {
    const key = head + torso + legs;
    let s = heroCache.get(key);
    if (!s) {
      s = sprite([...HEAD[head], ...TORSO[torso], ...LEGS[legs]], heroPal);
      heroCache.set(key, s);
    }
    return s;
  }
  function setHero(ch) {
    heroPal = Object.assign({}, PAL, ch.pal || {});
    heroCache.clear();
  }

  // ---------------------------------------------------------------- other art
  let ART = {};
  function buildArt() {
    const A = {};
    A.helmet = sprite(HELMET, PAL);
    A.cap = sprite(CAP, PAL);
    A.raccoon = [[
      '..KK......KK....',
      '.KgK......KgK...',
      '.KggggggggggK...',
      'KgWWKKKKKKWWgK..',
      'KgWEKKKKKKEWgK..',
      '.KgggggggggK....',
      '..KggWWWWggK....',
      '...KBBBBBBK.KgK.',
      '..KBBWBBWBKKgKg.',
      '..KBBBBBBBBBKgK.',
      '..KBBWBBWBBK....',
      '...KKgKKgKK.....',
      '...Kg...Kg......',
      '...KK...KK......',
    ], [
      '..KK......KK....',
      '.KgK......KgK...',
      '.KggggggggggK...',
      'KgWWKKKKKKWWgK..',
      'KgWEKKKKKKEWgK..',
      '.KgggggggggK....',
      '..KggWWWWggK.KgK',
      '...KBBBBBBKKgKg.',
      '..KBBWBBWBBKKgK.',
      '..KBBBBBBBBK....',
      '..KBBWBBWBBK....',
      '...KKgKKgKK.....',
      '..Kg.....Kg.....',
      '..KK.....KK.....',
    ]].map(r => sprite(r, PAL));
    const flame = [
      '.....r......', '....rr......', '....ror.....', '...roor..r..', '..rooor.rr..', '..roYoorror.',
      '.rooYYoooor.', '.roYYYYooor.', 'rooYWWYYoorr', 'roYYWWWYYoor', 'roYWWWWWYYor', 'roYYWWWWYYor',
      '.roYYYYYYor.', '.rrooooooor.', '..rrrrrrrr..', '...KKKKKK...',
    ];
    const fpal = Object.assign({}, PAL, { r: '#d8352c', o: '#f39020', Y: '#ffd23f', W: '#fff6c9' });
    const fs = sprite(flame, fpal);
    A.flame = [{ r: fs.r, l: fs.r, w: fs.w, h: fs.h }, { r: fs.l, l: fs.l, w: fs.w, h: fs.h }];
    const bpal = Object.assign({}, PAL, { K: '#3a2230', o: '#ff7a1a', Y: '#ffe14d' });
    A.bat = [[
      'K..............K', 'KK....K..K....KK', 'KoK...KKKK...KoK', '.KoK.KoooK..KoK.',
      '..KKKKYooYKKKK..', '....KooooooK....', '.....KKooKK.....', '......KKKK......',
    ], [
      '......K..K......', '......KKKK......', '.....KoooK......', '....KYooYKK.....',
      '..KKKoooooKKK...', '.KoKKKooKKKoK...', 'KoK..KKKK..KoK..', 'KK..........KK..',
    ]].map(r => sprite(r, bpal));
    A.cone = [[
      '......oo......', '.....oooo.....', '.....oWWo.....', '....oooooo....', '....oEooEo....',
      '...oooooooo...', '...WWWWWWWW...', '..oooooooooo..', '..ooooMMoooo..', '.oooooooooooo.',
      '.WWWWWWWWWWWW.', 'oooooooooooooo', 'KKKKKKKKKKKKKK',
    ], [
      '..............', '..............', '......oo......', '....oooooo....', '...ooEooEoo...',
      '..oooooooooo..', '..WWWWWWWWWW..', '.oooooooooooo.', '.oooooMMooooo.', 'oooooooooooooo',
      'WWWWWWWWWWWWWW', 'oooooooooooooo', 'KKKKKKKKKKKKKK',
    ]].map(r => sprite(r, PAL));
    A.tire = [0, 1, 2, 3].map(f => withFlip(makeCanvas(14, 14, g => {
      disc(g, 7, 7, 6, '#26262c');
      disc(g, 7, 7, 3, '#9aa0aa');
      disc(g, 7, 7, 1, '#3c3f46');
      g.fillStyle = '#4a4a55';
      const a = f * Math.PI / 8;
      for (let i = 0; i < 4; i++) {
        const t = a + i * Math.PI / 2;
        g.fillRect(Math.round(7 + Math.cos(t) * 5), Math.round(7 + Math.sin(t) * 5), 1, 1);
      }
    })));
    A.barrier = withFlip(makeCanvas(18, 14, g => {
      g.fillStyle = '#2b2b33'; g.fillRect(2, 6, 2, 8); g.fillRect(14, 6, 2, 8);
      for (let x = 0; x < 18; x++) { g.fillStyle = ((x >> 2) & 1) ? '#ffffff' : '#e0312b'; g.fillRect(x, 1, 1, 6); }
      g.fillStyle = '#2b2b33'; g.fillRect(0, 0, 18, 1); g.fillRect(0, 7, 18, 1);
      g.fillStyle = '#ffb21a'; g.fillRect(8, 0, 2, 1);
    }));
    A.barrierDown = withFlip(makeCanvas(18, 6, g => {
      for (let x = 0; x < 18; x++) { g.fillStyle = ((x >> 2) & 1) ? '#ffffff' : '#e0312b'; g.fillRect(x, 1, 1, 4); }
      g.fillStyle = '#2b2b33'; g.fillRect(0, 5, 18, 1);
    }));
    A.box = withFlip(makeCanvas(16, 15, g => {
      g.fillStyle = '#7a3a0c'; g.fillRect(0, 2, 16, 13);
      g.fillStyle = '#f08a1c'; g.fillRect(1, 3, 14, 11);
      g.fillStyle = '#ffb34d'; g.fillRect(1, 3, 14, 2);
      g.fillStyle = '#7a3a0c'; g.fillRect(5, 0, 6, 3);
      g.fillStyle = '#1e5bbf';
      g.fillRect(7, 6, 2, 7); g.fillRect(4, 8, 8, 3);
      g.fillRect(5, 7, 1, 1); g.fillRect(10, 7, 1, 1); g.fillRect(5, 11, 1, 1); g.fillRect(10, 11, 1, 1);
      g.fillStyle = '#ffffff'; g.fillRect(7, 9, 2, 1);
    }));
    A.food = {
      apple: sprite(['....K.....', '....Kqq...', '..rrKrr...', '.rWrrrrr..', '.rWrrrrrr.', '.rrrrrrrr.', '.rrrrrrrr.', '..rrrrrr..', '...r..r...'],
        Object.assign({}, PAL, { r: '#e3342f' })),
      banana: sprite(['........K.', '........y.', '.......yy.', '......yyy.', 'y....yyyY.', 'yy..yyyYY.', '.yyyyyYY..', '..YYYYY...'], PAL),
      pizza: sprite(['nnnnnnnnnn', 'nYYYYYYYYn', '.YrYYYYrY.', '.YYYYYYYY.', '..YYrYYY..', '..YYYYYY..', '...YYrY...', '...YYYY...', '....YY....'], PAL),
      icecream: sprite(['...pppp...', '..pppWpp..', '.ppppppWp.', '.pppppppp.', '..yYyYyY..', '..YyYyYy..', '...yYyY...', '...YyYy...', '....Yy....', '....yY....'],
        Object.assign({}, PAL, { y: '#e8b56a', Y: '#c98a3e' })),
      carrot: sprite(['......q.q.', '.......qq.', '......qqq.', '.....oo...', '....ooo...', '...ooOo...', '..oOoo....', '.ooo......', 'oo........'], PAL),
    };
    A.hose = sprite(['rr..........', 'rrr.........', '.rrr.YYYY...', '..rrYYYYYYc.', '...rYYYYYYcc', '....YYYY....'],
      Object.assign({}, PAL, { r: '#d8352c', Y: '#e5b53a' }));
    A.drop = sprite(['..c...', '.ccc..', 'cWccc.', 'cWccc.', '.ccc..'], PAL);
    A.star = sprite(['....bbb....', 'bb..bbb..bb', 'bbbbbbbbbbb', '.bbbbWbbbb.', '..bbbWbbb..', '.bbbbWbbbb.', 'bbbbbbbbbbb', 'bb..bbb..bb', '....bbb....'],
      Object.assign({}, PAL, { b: '#1e6be0' }));
    A.badge = sprite(['....Y....', '...YYY...', 'YYYYYYYYY', '.YYyYyYY.', '..YYYYY..', '.YYY.YYY.', '.YY...YY.'],
      Object.assign({}, PAL, { Y: '#f2c22b', y: '#a37812' }));
    A.scooter = sprite([
      '..............KK....', '..............K.....', '.............K......', '.BBBBBBBBBBBBK......',
      'BBWWBBBBBBBBBBB.....', '.KK.........KK......', 'KwwK.......KwwK.....', '.KK.........KK......',
    ], PAL);
    A.smoke = [0, 1].map(f => withFlip(makeCanvas(18, 14, g => {
      disc(g, 6, 8, 5, '#6d6f78'); disc(g, 11, 6, 6, '#7b7e88'); disc(g, 13, 9, 4, '#6d6f78');
      disc(g, 9, 5 + f, 3, '#8d909a');
      g.fillStyle = '#1d1b2e'; g.fillRect(7, 7, 2, 2); g.fillRect(12, 7, 2, 2);
      g.fillRect(7, 6, 2, 1); g.fillRect(13, 6, 1, 1);
    })));
    A.kitten = sprite(['o.....o..', 'oo...oo..', 'ooooooo..', 'oEoooEo.o', 'ooopooo.o', '.ooooooo.', '.o.o.o.o.'],
      Object.assign({}, PAL, { o: '#f39a3a', p: '#ff7aa8' }));
    A.lift = makeCanvas(48, 10, g => {
      g.fillStyle = '#7a1b16'; g.fillRect(0, 2, 48, 8);
      g.fillStyle = '#d8352c'; g.fillRect(1, 3, 46, 6);
      g.fillStyle = '#ffd23f'; for (let x = 3; x < 46; x += 6) g.fillRect(x, 5, 3, 2);
      g.fillStyle = '#c9ccd3'; g.fillRect(0, 0, 48, 2);
    });
    A.tramp = makeCanvas(32, 12, g => {
      g.fillStyle = '#2b2b33'; g.fillRect(3, 6, 2, 6); g.fillRect(27, 6, 2, 6); g.fillRect(15, 6, 2, 6);
      for (let x = 0; x < 32; x++) { g.fillStyle = ((x >> 2) & 1) ? '#ffffff' : '#e0312b'; g.fillRect(x, 2, 1, 4); }
      g.fillStyle = '#ffd23f'; g.fillRect(2, 1, 28, 1);
    });
    A.firetruck = makeCanvas(64, 30, g => {
      g.fillStyle = '#b3221b'; g.fillRect(2, 10, 60, 14);
      g.fillStyle = '#e0352c'; g.fillRect(2, 10, 44, 11); g.fillRect(46, 4, 16, 17);
      g.fillStyle = '#bfe6ff'; g.fillRect(50, 6, 10, 7);
      g.fillStyle = '#d9dde3'; g.fillRect(4, 5, 40, 2); g.fillRect(4, 9, 40, 1);
      for (let x = 4; x <= 44; x += 5) g.fillRect(x, 5, 1, 5);
      g.fillStyle = '#ffd23f'; g.fillRect(2, 17, 60, 2);
      g.fillStyle = '#8f1a14'; g.fillRect(8, 12, 10, 4); g.fillRect(22, 12, 10, 4); g.fillRect(48, 14, 1, 6);
      g.fillStyle = '#e8e8ea'; g.fillRect(60, 19, 3, 3);
      for (const wx of [12, 50]) { disc(g, wx, 25, 4, '#26262c'); disc(g, wx, 25, 2, '#9aa0aa'); }
    });
    A.police = makeCanvas(40, 20, g => {
      g.fillStyle = '#f4f6fa'; g.fillRect(1, 8, 38, 8); g.fillRect(10, 3, 20, 6);
      g.fillStyle = '#9fd3f5'; g.fillRect(12, 4, 7, 4); g.fillRect(21, 4, 7, 4);
      g.fillStyle = '#1f4fb5'; g.fillRect(1, 11, 38, 2);
      g.fillStyle = '#2b2b33'; g.fillRect(1, 15, 38, 1); g.fillRect(19, 9, 1, 5);
      g.fillStyle = '#ffe14d'; g.fillRect(37, 9, 2, 2);
      for (const wx of [9, 31]) { disc(g, wx, 16, 3, '#26262c'); disc(g, wx, 16, 1, '#9aa0aa'); }
    });
    A.ambulance = makeCanvas(46, 28, g => {
      g.fillStyle = '#f4f6fa'; g.fillRect(2, 4, 32, 19); g.fillRect(34, 10, 11, 13);
      g.fillStyle = '#9fd3f5'; g.fillRect(37, 12, 6, 5);
      g.fillStyle = '#d8352c'; g.fillRect(2, 17, 43, 2);
      g.fillStyle = '#c9ccd3'; g.fillRect(2, 22, 43, 1);
      g.drawImage(A.star.r, 13, 6);
      for (const wx of [10, 37]) { disc(g, wx, 23, 4, '#26262c'); disc(g, wx, 23, 2, '#9aa0aa'); }
    });
    A.minicar = withFlip(makeCanvas(28, 13, g => {
      g.fillStyle = '#f4f6fa'; g.fillRect(0, 3, 28, 6); g.fillRect(18, 1, 9, 3);
      g.fillStyle = '#1f4fb5'; g.fillRect(0, 5, 28, 2);
      g.fillStyle = '#ffe14d'; g.fillRect(26, 4, 2, 1);
      g.fillStyle = '#2b2b33'; g.fillRect(0, 8, 28, 1);
      for (const wx of [5, 22]) { disc(g, wx, 10, 2, '#26262c'); }
    }));
    ART = A;
  }

  // ---------------------------------------------------------------- tiles
  const ZONE_COLORS = {
    city: { top: ['#e2ded6', '#c7c1b6', '#6b6862'], fill: '#7a5c41', dot: '#5f4630' },
    park: { top: ['#6cc744', '#52ad33', '#3a8a26'], fill: '#8a5a34', dot: '#6b4326' },
    site: { top: ['#d8a35f', '#c4894a', '#8f5b2c'], fill: '#9a6234', dot: '#7a4a24' },
  };
  const TILE_ART = {};
  function buildTiles() {
    seed = 11;
    for (const z in ZONE_COLORS) {
      const c = ZONE_COLORS[z];
      const fill = g => {
        g.fillStyle = c.fill; g.fillRect(0, 0, 16, 16);
        g.fillStyle = c.dot;
        for (let i = 0; i < 6; i++) g.fillRect((rnd() * 15) | 0, (rnd() * 15) | 0, 2, 1);
      };
      TILE_ART[z + 'fill'] = makeCanvas(16, 16, fill);
      TILE_ART[z + 'top'] = makeCanvas(16, 16, g => {
        fill(g);
        if (z === 'city') {
          g.fillStyle = c.top[0]; g.fillRect(0, 0, 16, 2);
          g.fillStyle = c.top[1]; g.fillRect(0, 2, 16, 3);
          g.fillStyle = c.top[2]; g.fillRect(0, 5, 16, 2); g.fillRect(7, 0, 1, 5);
        } else if (z === 'park') {
          g.fillStyle = c.top[1]; g.fillRect(0, 0, 16, 5);
          g.fillStyle = c.top[0]; g.fillRect(0, 0, 16, 2);
          g.fillStyle = c.top[2]; g.fillRect(0, 5, 16, 1);
          for (let x = 0; x < 16; x += 3) g.fillRect(x, 5, 1, 2);
          g.fillStyle = '#ffffff'; g.fillRect(4, 1, 1, 1);
          g.fillStyle = '#ffd23f'; g.fillRect(12, 1, 1, 1);
        } else {
          g.fillStyle = c.top[0]; g.fillRect(0, 0, 16, 4);
          g.fillStyle = c.top[2];
          for (let i = 0; i < 5; i++) g.fillRect((rnd() * 15) | 0, (rnd() * 4) | 0, 1, 1);
          g.fillStyle = c.top[1]; g.fillRect(0, 4, 16, 1);
        }
      });
    }
    TILE_ART.brick = makeCanvas(16, 16, g => {
      g.fillStyle = '#ead7bf'; g.fillRect(0, 0, 16, 16);
      g.fillStyle = '#c4533b';
      for (let y = 0; y < 16; y += 4) {
        const off = (y / 4) % 2 ? 4 : 0;
        for (let x = -off; x < 16; x += 8) g.fillRect(x + 1, y + 1, 7, 3);
      }
      g.fillStyle = '#9e3a28'; g.fillRect(0, 15, 16, 1);
    });
    TILE_ART.girder = makeCanvas(16, 7, g => {
      g.fillStyle = '#8f4310'; g.fillRect(0, 0, 16, 7);
      g.fillStyle = '#e8801f'; g.fillRect(0, 1, 16, 5);
      g.fillStyle = '#ffb04a'; g.fillRect(0, 1, 16, 1);
      g.fillStyle = '#8f4310'; g.fillRect(3, 3, 2, 2); g.fillRect(11, 3, 2, 2);
    });
  }

  // ---------------------------------------------------------------- backgrounds
  const BG = {};
  function buildBackgrounds() {
    seed = 3;
    BG.sky = makeCanvas(1, H, g => {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#5ab4f0'); gr.addColorStop(0.7, '#a9dcf7'); gr.addColorStop(1, '#d9f0fb');
      g.fillStyle = gr; g.fillRect(0, 0, 1, H);
    });
    BG.clouds = makeCanvas(512, 90, g => {
      for (let i = 0; i < 6; i++) {
        const x = 30 + i * 85 + rnd() * 30, y = 20 + rnd() * 45;
        disc(g, x, y, 9, '#ffffff'); disc(g, x + 12, y - 4, 11, '#ffffff'); disc(g, x + 25, y, 8, '#ffffff');
        g.fillStyle = '#ffffff'; g.fillRect(x - 6, y + 2, 40, 6);
      }
    });
    BG.far = makeCanvas(512, 120, g => {
      let x = 0;
      while (x < 512) {
        const w = 24 + ((rnd() * 4) | 0) * 8, h = 40 + rnd() * 70;
        g.fillStyle = '#93b7d6'; g.fillRect(x, 120 - h, w, h);
        g.fillStyle = '#b8d3ea';
        for (let wy = 120 - h + 6; wy < 112; wy += 8) for (let wx = x + 4; wx < x + w - 4; wx += 6) if (rnd() > 0.35) g.fillRect(wx, wy, 3, 4);
        x += w + 2 + ((rnd() * 3) | 0) * 4;
      }
    });
    BG.near = makeCanvas(512, 90, g => {
      let x = 0, i = 0;
      while (x < 512) {
        if (i++ % 3 === 2) {
          g.fillStyle = '#6b4a2c'; g.fillRect(x + 10, 60, 5, 30);
          disc(g, x + 12, 50, 14, '#4fa83a'); disc(g, x + 5, 58, 9, '#5cbb44'); disc(g, x + 20, 57, 9, '#45992f');
          x += 34;
        } else {
          const w = 40 + ((rnd() * 3) | 0) * 8, h = 34 + rnd() * 30;
          const cols = ['#f2b880', '#e88f7a', '#f5d07a', '#c9a0dc'];
          g.fillStyle = cols[(rnd() * cols.length) | 0]; g.fillRect(x, 90 - h, w, h);
          g.fillStyle = '#8c4a3b'; g.fillRect(x - 2, 90 - h - 4, w + 4, 5);
          g.fillStyle = '#fff6dc';
          for (let wy = 90 - h + 6; wy < 80; wy += 12) for (let wx = x + 5; wx < x + w - 6; wx += 11) g.fillRect(wx, wy, 6, 7);
          g.fillStyle = '#7a4b2a'; g.fillRect(x + w / 2 - 4, 76, 8, 14);
          x += w + 6;
        }
      }
    });
  }

  // ---------------------------------------------------------------- levels
  // Cells are (tile x, tile row). An entity sits with its bottom on the
  // bottom of its cell, so something standing on ground whose top is row
  // 12 goes in row 11.
  //
  // "tiny" levels are for the youngest: one long street with no real
  // pits to die in, slow enemies, lots of food, and hint stops ('hint')
  // that pause the game and show where to tap.
  const TINY_LEVELS = [{
    id: '1', name: 'העיר', width: 130,
    zones: [[0, 'city']],
    build(L) {
      L.ground(0, 41); L.ground(43, 83); L.bricks(55, 6, 6);
      L.ground(84, 95, 11); L.ground(96, 129);
    },
    ents: [
      ['deco', 0, 11, 'firetruck'],
      ['apple', 5, 10], ['box', 7, 11, 'hose'], ['banana', 10, 10],
      ['hint', 15, 11, 'jump'], ['barrier', 15, 11], ['apple', 15, 8],
      ['carrot', 19, 10], ['flame', 24, 11], ['pizza', 28, 10],
      ['raccoon', 35, 11], ['apple', 38, 10],
      ['hint', 42, 11, 'jump'], ['banana', 42, 8], ['apple', 47, 10],
      ['tramp', 52, 11], ['icecream', 57, 5], ['badge', 59, 5], ['apple', 55, 3],
      ['carrot', 63, 10], ['box', 66, 11, 'scooter'],
      ['cp', 71, 11], ['deco', 72, 11, 'ambulance'],
      ['banana', 76, 10], ['cone', 79, 11],
      ['hint', 84, 11, 'jump'], ['apple', 86, 9], ['flame', 90, 10], ['pizza', 93, 7],
      ['carrot', 99, 10], ['raccoon', 103, 11], ['box', 106, 11, 'star'],
      ['raccoon', 111, 11], ['raccoon', 114, 11], ['apple', 117, 10], ['icecream', 119, 9],
      ['goal', 122, 11], ['deco', 113, 11, 'police'],
    ],
  }, {
    id: '2', name: 'הפארק', width: 138,
    zones: [[0, 'park'], [70, 'site'], [100, 'park']],
    build(L) {
      L.ground(0, 32); L.ground(34, 71); L.bricks(45, 6, 6);
      L.ground(72, 80, 11); L.ground(81, 90, 10); L.ground(91, 137);
    },
    ents: [
      ['deco', 0, 11, 'police'],
      ['box', 5, 11, 'hose'], ['apple', 8, 10], ['flame', 14, 11], ['banana', 16, 9], ['flame', 19, 11],
      ['carrot', 23, 10], ['raccoon', 27, 11],
      ['hint', 33, 11, 'jump'], ['apple', 33, 8], ['pizza', 38, 10],
      ['tramp', 42, 11], ['icecream', 47, 5], ['badge', 49, 5],
      ['banana', 54, 10], ['cone', 58, 11], ['apple', 61, 10],
      ['cp', 64, 11], ['deco', 65, 11, 'ambulance'],
      ['hint', 72, 11, 'jump'], ['box', 75, 10, 'scooter'], ['hint', 81, 11, 'jump'], ['bat', 80, 4], ['carrot', 84, 8], ['flame', 87, 9],
      ['apple', 94, 10], ['box', 97, 11, 'star'], ['raccoon', 101, 11], ['raccoon', 105, 11], ['raccoon', 109, 11],
      ['tire', 116, 11], ['banana', 113, 10], ['pizza', 121, 10], ['apple', 125, 10],
      ['goal', 130, 11], ['deco', 121, 11, 'firetruck'],
    ],
  }];

  const STD_LEVELS = [{
    id: '1-1', name: 'העיר', width: 222,
    zones: [[0, 'city'], [92, 'park'], [140, 'site'], [196, 'city']],
    build(L) {
      L.ground(0, 24); L.ground(27, 51); L.bricks(46, 9, 4); L.ground(55, 70);
      L.ground(78, 85, 11); L.ground(86, 93, 10); L.ground(94, 110); L.bricks(103, 5, 5);
      L.ground(114, 137);
      L.girder(140, 9, 3); L.girder(144, 7, 3); L.girder(148, 9, 3);
      L.ground(152, 170); L.ground(173, 190); L.ground(198, 221);
    },
    ents: [
      ['apple', 8, 10], ['box', 12, 11, 'hose'], ['banana', 15, 9], ['raccoon', 21, 11],
      ['apple', 26, 8], ['barrier', 31, 11], ['apple', 34, 8], ['flame', 37, 11], ['cone', 43, 11],
      ['banana', 47, 7], ['bat', 50, 7], ['carrot', 56, 9],
      ['cp', 60, 11], ['box', 62, 11, 'scooter'], ['raccoon', 64, 11], ['pizza', 66, 8], ['raccoon', 69, 11],
      ['lift', 71, 10, 76], ['apple', 74, 7],
      ['banana', 80, 8], ['flame', 83, 10], ['carrot', 88, 7], ['tire', 92, 9],
      ['apple', 96, 9], ['tramp', 99, 11], ['icecream', 105, 4], ['badge', 106, 4], ['bat', 108, 6],
      ['box', 116, 11, 'star'], ['cone', 118, 11], ['apple', 120, 9], ['raccoon', 122, 11], ['carrot', 125, 9],
      ['flame', 127, 11], ['flame', 129, 11], ['box', 132, 11, 'smoke'], ['banana', 134, 9],
      ['cp', 136, 11],
      ['apple', 141, 7], ['banana', 145, 5], ['bat', 146, 4], ['apple', 149, 7],
      ['barrier', 155, 11], ['pizza', 158, 8], ['barrier', 161, 11], ['cone', 164, 11], ['tire', 168, 11],
      ['apple', 171, 8], ['flame', 178, 11], ['raccoon', 182, 11], ['bat', 186, 7], ['icecream', 188, 9],
      ['lift', 191, 10, 196],
      ['box', 200, 11, 'hose'], ['banana', 202, 9], ['cone', 205, 11], ['tire', 209, 11], ['apple', 211, 9],
      ['goal', 216, 11],
    ],
  }];
  const LEVEL_SETS = { tiny: TINY_LEVELS, std: STD_LEVELS };
  const levelList = () => LEVEL_SETS[cfg.levels];

  function buildLevel(def) {
    const w = def.width;
    const tiles = new Uint8Array(w * ROWS);
    const set = (x, y, v) => { if (x >= 0 && x < w && y >= 0 && y < ROWS) tiles[y * w + x] = v; };
    def.build({
      ground(x0, x1, top = 12) { for (let x = x0; x <= x1; x++) for (let y = top; y < ROWS; y++) set(x, y, 1); },
      bricks(x0, y, len) { for (let x = x0; x < x0 + len; x++) set(x, y, 2); },
      girder(x0, y, len) { for (let x = x0; x < x0 + len; x++) set(x, y, 3); },
    });
    const zoneOf = new Array(w);
    for (let x = 0; x < w; x++) {
      let z = def.zones[0][1];
      for (const [zx, name] of def.zones) if (x >= zx) z = name;
      zoneOf[x] = z;
    }
    return { def, w, tiles, zoneOf };
  }

  // ---------------------------------------------------------------- audio
  let AC = null, master = null, musicBus = null, sfxBus = null, pulse = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('rescue5.muted') === '1'; } catch (e) { /* storage blocked */ }

  function initAudio() {
    if (AC) { if (AC.state === 'suspended' && !paused) AC.resume(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    AC = new Ctx();
    master = AC.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(AC.destination);
    musicBus = AC.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
    sfxBus = AC.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(master);
    // 25% pulse, the classic 8-bit lead colour.
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 1; i < n; i++) re[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * 0.25);
    pulse = AC.createPeriodicWave(re, im);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function setMuted(m) {
    muted = m;
    try { localStorage.setItem('rescue5.muted', m ? '1' : '0'); } catch (e) { /* storage blocked */ }
    if (master) master.gain.value = m ? 0 : 0.8;
  }

  function freq(name) {
    const m = /^([A-G])(#?)(\d)$/.exec(name);
    const semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
    const midi = 12 * (+m[3] + 1) + semis;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  function tone(bus, type, f, t, dur, vol, slideTo) {
    const o = AC.createOscillator(), g = AC.createGain();
    if (type === 'pulse') o.setPeriodicWave(pulse); else o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.setValueAtTime(vol, t + Math.max(0.01, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(bus, t, dur, vol, filterFreq, type) {
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noiseBuf; f.type = type || 'bandpass'; f.frequency.value = filterFreq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t); s.stop(t + dur + 0.02);
  }

  // Songs are written as "NOTE:sixteenths" tokens; R is a rest.
  function parseLine(str) {
    const out = [];
    let pos = 0;
    for (const tok of str.trim().split(/\s+/)) {
      const [n, l] = tok.split(':');
      const len = +l;
      if (n !== 'R') out.push({ pos, f: freq(n), len });
      pos += len;
    }
    return { notes: out, len: pos };
  }
  const CHORD_TONES = {
    C: ['C', 'E', 'G'], Am: ['A', 'C', 'E'], F: ['F', 'A', 'C'], G: ['G', 'B', 'D'], Dm: ['D', 'F', 'A'],
  };
  function makeSong(bpm, leadStr, chords) {
    const lead = parseLine(leadStr);
    const len = chords.length * 16;
    const steps = Array.from({ length: len }, () => []);
    for (const n of lead.notes) steps[n.pos % len].push({ ch: 'lead', f: n.f, len: n.len });
    chords.forEach((c, bar) => {
      const tones = CHORD_TONES[c];
      const root = freq(tones[0] + '3'), fifth = root * Math.pow(2, 7 / 12);
      const bass = [root, root * 2, root, root * 2, fifth, root * 2, fifth, root * 2];
      for (let i = 0; i < 8; i++) steps[bar * 16 + i * 2].push({ ch: 'bass', f: bass[i], len: 2 });
      const arp = [0, 1, 2, 1];
      for (let i = 0; i < 16; i++) steps[bar * 16 + i].push({ ch: 'arp', f: freq(tones[arp[i % 4]] + '4') * 2, len: 1 });
      for (let i = 0; i < 16; i += 2) steps[bar * 16 + i].push({ ch: i % 8 === 0 ? 'kick' : i % 8 === 4 ? 'snare' : 'hat', len: 1 });
    });
    return { bpm, steps, len };
  }
  const SONGS = {
    city: makeSong(150, `
      E5:2 G5:2 C6:4 G5:2 E5:2 D5:4  C5:2 D5:2 E5:2 G5:2 A5:4 G5:4
      F5:2 A5:2 C6:4 A5:2 F5:2 E5:4  D5:2 E5:2 F5:2 A5:2 G5:8
      E5:2 G5:2 C6:4 G5:2 E5:2 D5:4  C5:2 D5:2 E5:2 G5:2 A5:2 C6:2 D6:4
      E6:4 D6:2 C6:2 A5:2 G5:2 E5:4  D5:2 E5:2 D5:2 B4:2 C5:8
      A5:6 G5:2 F5:4 E5:4            F5:2 G5:2 A5:2 F5:2 G5:8
      G5:6 F5:2 E5:4 D5:4            E5:2 F5:2 G5:2 E5:2 D5:8
      A5:6 B5:2 C6:4 A5:4            B5:2 C6:2 D6:2 B5:2 G5:8
      C6:2 B5:2 A5:2 G5:2 F5:2 E5:2 D5:2 F5:2   G5:4 R:4 G4:2 A4:2 B4:2 D5:2`,
      ['C', 'Am', 'F', 'G', 'C', 'F', 'Am', 'G', 'F', 'Dm', 'C', 'G', 'F', 'G', 'F', 'G']),
  };
  const JINGLES = {
    start: [180, 'C5:2 E5:2 G5:2 C6:2 R:2 G5:2 C6:8'],
    clear: [170, 'G5:2 C6:2 E6:2 G6:4 E6:2 G6:4 A6:2 G6:2 E6:2 C6:8'],
    die: [150, 'C6:2 B5:2 A#5:2 A5:2 G#5:2 G5:8'],
    over: [110, 'E5:4 D5:4 C5:4 G4:4 C5:8'],
  };

  const Music = {
    song: null, step: 0, next: 0, rate: 1, on: false,
    play(song) {
      if (!AC) return;
      this.song = song; this.step = 0; this.next = AC.currentTime + 0.08; this.on = true; this.rate = 1;
    },
    stop() { this.on = false; },
    tick() {
      if (!this.on || !AC || AC.state !== 'running') return;
      const spb = 60 / this.song.bpm / 4 / this.rate;
      if (this.next < AC.currentTime - 0.1) this.next = AC.currentTime + 0.05;
      while (this.next < AC.currentTime + 0.15) {
        for (const e of this.song.steps[this.step]) voice(e, this.next, e.len * spb);
        this.next += spb;
        this.step = (this.step + 1) % this.song.len;
      }
    },
  };
  function voice(e, t, dur) {
    switch (e.ch) {
      case 'lead': tone(musicBus, 'pulse', e.f, t, dur * 0.92, 0.13); break;
      case 'bass': tone(musicBus, 'triangle', e.f, t, dur * 0.8, 0.32); break;
      case 'arp': tone(musicBus, 'square', e.f, t, dur * 0.7, 0.022); break;
      case 'kick': tone(musicBus, 'sine', 150, t, 0.12, 0.5, 45); break;
      case 'snare': noise(musicBus, t, 0.12, 0.22, 1800); break;
      case 'hat': noise(musicBus, t, 0.04, 0.08, 8000, 'highpass'); break;
    }
  }
  function jingle(name) {
    if (!AC) return;
    const [bpm, str] = JINGLES[name];
    const spb = 60 / bpm / 4, t0 = AC.currentTime + 0.05;
    for (const n of parseLine(str).notes) {
      tone(sfxBus, 'pulse', n.f, t0 + n.pos * spb, n.len * spb * 0.95, 0.14);
      tone(sfxBus, 'triangle', n.f / 2, t0 + n.pos * spb, n.len * spb * 0.9, 0.25);
    }
  }
  function sfx(name) {
    if (!AC || AC.state !== 'running') return;
    const t = AC.currentTime;
    switch (name) {
      case 'jump': tone(sfxBus, 'pulse', 300, t, 0.16, 0.12, 720); break;
      case 'shoot': noise(sfxBus, t, 0.12, 0.25, 2600); tone(sfxBus, 'sine', 900, t, 0.08, 0.08, 500); break;
      case 'food': tone(sfxBus, 'pulse', 880, t, 0.06, 0.1); tone(sfxBus, 'pulse', 1320, t + 0.06, 0.1, 0.1); break;
      case 'box': noise(sfxBus, t, 0.15, 0.3, 700); tone(sfxBus, 'square', 220, t, 0.12, 0.08, 110); break;
      case 'item': [523, 659, 784, 1047].forEach((f, i) => tone(sfxBus, 'pulse', f, t + i * 0.06, 0.08, 0.11)); break;
      case 'stomp': tone(sfxBus, 'square', 600, t, 0.12, 0.09, 150); break;
      case 'hiss': noise(sfxBus, t, 0.35, 0.25, 5000, 'highpass'); break;
      case 'trip': tone(sfxBus, 'triangle', 200, t, 0.2, 0.3, 80); noise(sfxBus, t, 0.1, 0.2, 400); break;
      case 'boing': tone(sfxBus, 'triangle', 180, t, 0.3, 0.35, 700); break;
      case 'cp': tone(sfxBus, 'pulse', 660, t, 0.08, 0.1); tone(sfxBus, 'pulse', 990, t + 0.09, 0.15, 0.1); break;
      case 'siren':
        for (let i = 0; i < 4; i++) tone(sfxBus, 'square', i % 2 ? 660 : 880, t + i * 0.22, 0.2, 0.06);
        break;
      case 'smoke': tone(sfxBus, 'sawtooth', 220, t, 0.4, 0.06, 90); break;
      case 'hurt': tone(sfxBus, 'square', 400, t, 0.25, 0.1, 120); break;
      case 'tick': tone(sfxBus, 'pulse', 1200, t, 0.03, 0.05); break;
      case 'meow': tone(sfxBus, 'triangle', 700, t, 0.12, 0.2, 1100); tone(sfxBus, 'triangle', 1100, t + 0.12, 0.2, 0.2, 650); break;
      case 'low': tone(sfxBus, 'pulse', 440, t, 0.07, 0.08); break;
    }
  }

  // ---------------------------------------------------------------- input
  const input = { left: false, right: false, jump: false, fire: false };
  const prev = { jump: false, fire: false };
  const keys = new Set();
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyZ: 'jump', KeyK: 'jump',
    KeyX: 'fire', KeyJ: 'fire', ControlLeft: 'fire', ShiftLeft: 'fire',
  };
  const touch = { left: false, right: false, jump: false, fire: false };
  function readInput() {
    const k = a => [...keys].some(c => KEYMAP[c] === a);
    input.left = k('left') || touch.left;
    input.right = k('right') || touch.right;
    input.jump = k('jump') || touch.jump;
    input.fire = k('fire') || touch.fire;
  }

  // ---------------------------------------------------------------- state
  let canvas, ctx, scale = 1;
  let state = 'title', stateT = 0, paused = false;
  let level, ents, parts, shots, popups, cam, player;
  let clearTotal = 0;
  let lives = 3, score = 0, hiscore = 0, checkpoint = 0, frame = 0, clearBonus = 0;
  let charIdx = 0, levelIdx = 0, hintSeen = new Set();
  let presetChoice = {};
  try { hiscore = +localStorage.getItem('rescue5.hi') || 0; } catch (e) { /* storage blocked */ }
  try { presetChoice = JSON.parse(localStorage.getItem('rescue5.presets') || '{}') || {}; } catch (e) { /* storage blocked */ }
  const presetFor = i => presetChoice[CHARACTERS[i].id] || CHARACTERS[i].preset || 'normal';
  function choosePreset(i, key) {
    presetChoice[CHARACTERS[i].id] = key;
    try { localStorage.setItem('rescue5.presets', JSON.stringify(presetChoice)); } catch (e) { /* storage blocked */ }
  }

  function newPlayer(x) {
    return {
      x, y: 0, w: 10, h: 22, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, jumpBuf: 0, ride: null,
      energy: ENERGY_MAX, hearts: cfg.hearts, safeX: x, hose: false, scooter: false, star: 0, smoke: 0, inv: 0, trip: 0, throwT: 0,
      shotCd: 0, anim: 0, dead: false,
    };
  }

  function startGame(idx) {
    charIdx = idx; setHero(CHARACTERS[idx]);
    cfg = PRESETS[presetFor(idx)];
    syncTouchLayout();
    lives = 3; score = 0; levelIdx = 0; checkpoint = 0;
    startLevel(true);
  }
  function startLevel(fresh) {
    const def = levelList()[levelIdx];
    level = buildLevel(def);
    ents = def.ents.map(([type, tx, ty, arg]) => ({ type, tx, ty, arg, spawned: false }));
    parts = []; shots = []; popups = [];
    const startX = checkpoint ? checkpoint * T : 3 * T;
    cam = { x: Math.max(0, startX - 64) };
    player = newPlayer(startX);
    player.y = groundTopAt(startX) - player.h;
    for (const e of ents) if (e.tx * T < cam.x - 32) e.spawned = true;
    setState('intro');
    jingle('start');
  }
  function groundTopAt(px) {
    const tx = Math.floor(px / T);
    for (let y = 0; y < ROWS; y++) if (tileAt(tx, y) === 1) return y * T;
    return 12 * T;
  }
  function setState(s) { state = s; stateT = 0; }

  // ---------------------------------------------------------------- tile physics
  function tileAt(tx, ty) {
    if (tx < 0 || tx >= level.w || ty < 0 || ty >= ROWS) return 0;
    return level.tiles[ty * level.w + tx];
  }
  function solidPx(px, py) {
    const t = tileAt(Math.floor(px / T), Math.floor(py / T));
    return t === 1 || t === 2;
  }
  function moveBody(b) {
    b.hitWall = false;
    b.x += b.vx;
    const ys = [b.y + 1, b.y + b.h / 2, b.y + b.h - 1];
    if (b.vx > 0) {
      const r = b.x + b.w - 0.01;
      if (ys.some(y => solidPx(r, y))) { b.x = Math.floor(r / T) * T - b.w; b.vx = 0; b.hitWall = true; }
    } else if (b.vx < 0) {
      if (ys.some(y => solidPx(b.x, y))) { b.x = (Math.floor(b.x / T) + 1) * T; b.vx = 0; b.hitWall = true; }
    }
    const prevBottom = b.y + b.h;
    b.y += b.vy;
    b.onGround = false;
    const xs = [b.x + 1, b.x + b.w - 1];
    if (b.vy >= 0) {
      const bottom = b.y + b.h;
      const ty = Math.floor(bottom / T);
      for (const x of xs) {
        const t = tileAt(Math.floor(x / T), ty);
        const top = ty * T;
        if (t === 1 || t === 2 || (t === 3 && prevBottom <= top + 0.5)) {
          b.y = top - b.h; b.vy = 0; b.onGround = true; break;
        }
      }
    } else {
      for (const x of xs) {
        if (solidPx(x, b.y)) { b.y = (Math.floor(b.y / T) + 1) * T; b.vy = 0; break; }
      }
    }
  }

  // ---------------------------------------------------------------- entities
  const FOOD = { apple: 8, banana: 10, carrot: 8, pizza: 18, icecream: 25 };
  const ENEMY = { raccoon: 1, flame: 1, bat: 1, cone: 1, tire: 1 };

  function spawn(e) {
    e.spawned = true;
    const bx = e.tx * T, by = (e.ty + 1) * T;
    const o = { type: e.type, arg: e.arg, t: 0, dead: false, vx: 0, vy: 0 };
    const size = {
      raccoon: [14, 13], flame: [10, 14], bat: [12, 8], cone: [12, 12], tire: [13, 13], barrier: [14, 12],
      box: [14, 14], tramp: [30, 10], hint: [4, 16], firetruck: [64, 30], police: [40, 20], ambulance: [46, 28], lift: [48, 10], cp: [6, 26], goal: [40, 80], badge: [9, 7],
      apple: [10, 9], banana: [10, 8], carrot: [10, 9], pizza: [10, 9], icecream: [10, 10],
    }[e.type === 'deco' ? e.arg : e.type] || [10, 10];
    o.w = size[0]; o.h = size[1];
    o.x = bx + (T - o.w) / 2; o.y = by - o.h;
    if (e.type === 'lift') { o.x = bx; o.y = e.ty * T; o.x0 = bx; o.x1 = e.arg * T; o.dir = 1; o.dx = 0; o.dy = 0; }
    if (e.type === 'tramp' || e.type === 'deco') o.x = bx;
    if (e.type === 'hint') o.x = bx;
    if (e.type === 'goal') { o.x = bx; o.y = by - o.h; }
    if (e.type === 'bat') o.y0 = o.y;
    if (e.type === 'raccoon') o.vx = -0.35 * cfg.enemySpeed;
    if (e.type === 'cp') o.cpTx = e.tx;
    if (FOOD[e.type] || e.type === 'badge') o.bob = Math.random() * 6;
    ents.push(o);
    return o;
  }

  function hurtPlayer(from) {
    const p = player;
    if (p.dead || p.inv > 0 || state !== 'play') return;
    if (p.star > 0) { killEnemy(from, 200); return; }
    // Landing on an enemy from above knocks it out (not a fire, though).
    if (from.type !== 'flame' && p.vy > 0.5 && p.y + p.h - p.vy <= from.y + 6) {
      killEnemy(from, 100); p.vy = cfg.jump * 0.7;
      return;
    }
    if (p.scooter) {
      p.scooter = false; p.inv = 90; sfx('hurt');
      burst(p.x + 5, p.y + p.h, '#2f60b5', 8);
      return;
    }
    p.hearts--;
    if (p.hearts > 0) {
      p.inv = 110; p.trip = 22; sfx('hurt');
      p.vx = (p.x < from.x ? -1 : 1) * 1.4; p.vy = -2.4;
      return;
    }
    die();
  }
  function die() {
    const p = player;
    if (p.dead) return;
    p.dead = true; p.vy = -4.5; p.vx = 0;
    Music.stop(); jingle('die');
    setState('dying');
  }
  function killEnemy(o, pts) {
    if (o.dead) return;
    o.dead = true; o.vy = -3; o.vx = (o.x > player.x ? 1 : -1) * 1.2;
    sfx('stomp'); addScore(pts, o.x + o.w / 2, o.y);
  }
  function addScore(n, x, y) {
    score += n;
    if (x !== undefined) popups.push({ x, y, text: '+' + n, t: 0 });
  }
  function burst(x, y, col, n) {
    for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3, t: 0, life: 30 + Math.random() * 20, col });
  }

  function openBox(o) {
    if (o.dead) return;
    o.dead = true; o.gone = true;
    sfx('box');
    burst(o.x + 7, o.y + 7, '#f08a1c', 10);
    if (o.arg === 'smoke') {
      ents.push({ type: 'item', arg: o.arg, x: o.x + 1, y: o.y, w: 12, h: 10, vx: 0, vy: -3.5, t: 0 });
      return;
    }
    // Good items go straight to the hero so small players never miss them.
    collectItem({ arg: o.arg, x: o.x, y: o.y - 8 });
    parts.push({ icon: o.arg, x: o.x + 1, y: o.y - 4, vx: 0, vy: -0.6, t: 0, life: 50, big: 1 });
  }
  function collectItem(o) {
    const p = player;
    o.gone = true;
    switch (o.arg) {
      case 'hose': p.hose = true; sfx('item'); popups.push({ x: o.x, y: o.y, text: 'זרנוק מים!', t: 0 }); break;
      case 'scooter': p.scooter = true; sfx('siren'); popups.push({ x: o.x, y: o.y, text: 'ניידת משטרה!', t: 0 }); break;
      case 'star': p.star = 600; Music.rate = 1.3; sfx('siren'); popups.push({ x: o.x, y: o.y, text: 'כוכב החובש!', t: 0 }); break;
      case 'smoke': p.smoke = 420; sfx('smoke'); popups.push({ x: o.x, y: o.y, text: 'אוי, עשן!', t: 0 }); break;
      default: addScore(2000, o.x, o.y); sfx('item');
    }
  }

  function updateEnts() {
    const p = player;
    for (const e of ents) {
      if (e.spawned !== undefined) {
        if (!e.spawned && e.tx * T < cam.x + W + 24) spawn(e);
        continue;
      }
    }
    for (const o of ents) {
      if (o.spawned !== undefined || o.gone) continue;
      o.t++;
      if (o.dead && ENEMY[o.type]) {
        o.vy += GRAV; o.x += o.vx; o.y += o.vy;
        if (o.y > H + 40) o.gone = true;
        continue;
      }
      const near = overlap(p, o) && !p.dead;
      switch (o.type) {
        case 'raccoon': {
          o.vy = Math.min(o.vy + GRAV, MAX_FALL);
          moveBody(o);
          const rs = 0.35 * cfg.enemySpeed;
          if (o.vx === 0) o.vx = o.face === 1 ? -rs : rs;
          o.face = o.vx > 0 ? 1 : -1;
          if (o.hitWall) o.vx = -o.face * rs;
          else if (o.onGround) {
            const ahead = o.vx > 0 ? o.x + o.w + 1 : o.x - 1;
            if (!solidPx(ahead, o.y + o.h + 2) && tileAt(Math.floor(ahead / T), Math.floor((o.y + o.h + 2) / T)) !== 3) o.vx = -o.vx;
          }
          if (near) hurtPlayer(o);
          break;
        }
        case 'tire': {
          o.vx = -1.4 * cfg.enemySpeed;
          const wasAir = !o.onGround, fall = o.vy;
          o.vy = Math.min(o.vy + GRAV, MAX_FALL);
          moveBody(o);
          if (o.onGround && wasAir && fall > 2) o.vy = -fall * 0.45;
          if (o.hitWall) o.vy = -3;
          if (near) hurtPlayer(o);
          break;
        }
        case 'cone': {
          o.vy = Math.min(o.vy + GRAV, MAX_FALL);
          if (o.onGround) o.vx = 0;
          if (o.onGround && o.t % Math.round(70 / cfg.enemySpeed) === 0 && Math.abs(p.x - o.x) < 170) {
            o.vy = -3.6; o.vx = (p.x < o.x ? -0.9 : 0.9) * cfg.enemySpeed;
          }
          moveBody(o);
          if (near) hurtPlayer(o);
          break;
        }
        case 'bat':
          o.x -= 0.6 * cfg.enemySpeed;
          o.y = o.y0 + Math.sin(o.t * 0.06) * 14;
          if (near) hurtPlayer(o);
          break;
        case 'flame':
          if (near) hurtPlayer(o);
          break;
        case 'barrier':
          if (!o.down && near && cfg.autoRun) { o.down = true; sfx('trip'); p.trip = 10; p.vx *= 0.5; }
          else if (!o.down && near && p.star <= 0) {
            o.down = true; sfx('trip');
            p.trip = 24; p.vx *= 0.3; p.energy -= 10;
            if (p.scooter) { p.scooter = false; p.inv = 60; }
          } else if (!o.down && near) { o.down = true; addScore(100, o.x, o.y); }
          break;
        case 'box':
          if (near) openBox(o);
          break;
        case 'item': {
          o.vy = Math.min(o.vy + 0.18, 3);
          if (o.arg === 'smoke' && o.t > 30) {
            // The smoke cloud drifts after the hero; outrun it to escape.
            o.vx = clamp((p.x - o.x) * 0.02, -0.9, 0.9);
            o.vy = clamp((p.y - o.y) * 0.02, -0.6, 0.6);
            o.x += o.vx; o.y += o.vy;
            if (o.t > 240) { o.gone = true; burst(o.x + 6, o.y + 5, '#8d909a', 8); }
          } else moveBody(o);
          if (near && o.t > 12) collectItem(o);
          break;
        }
        case 'tramp':
          if (!p.dead && p.vy >= 0 && overlap(p, o) && (cfg.autoRun || p.y + p.h - p.vy <= o.y + 4)) {
            p.vy = -Math.sqrt(2 * cfg.gravity * 145); p.y = o.y - p.h; o.squash = 10; sfx('boing');
          }
          if (o.squash) o.squash--;
          break;
        case 'lift': {
          const ox = o.x;
          o.x += o.dir * 0.6;
          if (o.x > o.x1) { o.x = o.x1; o.dir = -1; }
          if (o.x < o.x0) { o.x = o.x0; o.dir = 1; }
          o.dx = o.x - ox;
          break;
        }
        case 'hint':
          if (!o.done && cfg.tapJump && p.x + p.w >= o.x - 6 && state === 'play') { o.done = true; showHint(); }
          break;
        case 'cp':
          if (!o.on && p.x > o.x) { o.on = true; checkpoint = o.cpTx; sfx('cp'); }
          break;
        case 'goal':
          if (p.x + p.w > o.x + 6 && state === 'play') levelClear(o);
          break;
        case 'badge':
          if (near) { o.gone = true; addScore(1000, o.x, o.y); sfx('item'); }
          break;
        default:
          if (FOOD[o.type] && near) {
            o.gone = true;
            p.energy = Math.min(ENERGY_MAX, p.energy + FOOD[o.type]);
            if (p.hearts < cfg.hearts && (cfg.endless || FOOD[o.type] >= 18)) { p.hearts++; popups.push({ x: o.x, y: o.y - 8, text: '❤', t: 0 }); }
            addScore(FOOD[o.type] * 10, o.x + 5, o.y); sfx('food');
          }
      }
      if (ENEMY[o.type] && (o.x < cam.x - 64 || o.y > H + 32)) o.gone = true;
      if (FOOD[o.type] && o.x < cam.x - 64) o.gone = true;
    }
    ents = ents.filter(o => !o.gone);
  }

  // Freeze and show where to tap; the next tap jumps.
  function showHint() {
    setState('hint');
    player.vx = 0;
    touch.jump = false;
  }
  function rescueFromPit() {
    const p = player;
    burst(p.x + 5, ROWS * T - 8, '#58c8f4', 10);
    p.x = Math.max(cam.x, p.safeX - 8);
    p.y = groundTopAt(p.x + p.w / 2) - p.h - 30;
    p.vx = 0; p.vy = 0; p.inv = 70; p.ride = null;
    if (cfg.drain) p.energy -= 8;
    sfx('boing');
    if (cfg.tapJump) showHint();
  }

  function levelClear(goal) {
    setState('clear');
    Music.stop(); jingle('clear');
    player.vx = 0;
    goal.saved = true;
    clearBonus = cfg.drain ? Math.round(player.energy) * 10 : player.hearts * 300;
    clearTotal = clearBonus;
    setTimeout(() => sfx('meow'), 500);
  }

  // ---------------------------------------------------------------- player
  function updatePlayer() {
    const p = player;
    if (p.dead) {
      p.vy += GRAV; p.y += p.vy;
      return;
    }
    // Ride lifts before anything else moves us.
    if (p.ride) {
      p.x += p.ride.dx;
      p.y = p.ride.y - p.h;
    }
    const jumpPressed = input.jump && !prev.jump;
    const firePressed = input.fire && !prev.fire;
    let dir = 0;
    if (p.trip > 0) p.trip--;
    else if (cfg.autoRun) dir = 1;
    else dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) p.face = dir;
    const maxV = p.scooter ? cfg.speed * 1.45 : cfg.speed;
    const grounded = p.onGround || p.ride;
    const acc = grounded ? (p.scooter ? cfg.accel * 0.7 : cfg.accel) : cfg.accel * 0.7;
    if (dir) p.vx = clamp(p.vx + dir * acc, -maxV, maxV);
    else {
      const fr = grounded ? (p.scooter ? 0.05 : 0.16) : 0.04;
      p.vx = Math.abs(p.vx) <= fr ? 0 : p.vx - Math.sign(p.vx) * fr;
    }
    if (p.trip > 0) p.vx *= 0.9;

    if (grounded) p.coyote = 6; else if (p.coyote > 0) p.coyote--;
    if (jumpPressed) p.jumpBuf = 7; else if (p.jumpBuf > 0) p.jumpBuf--;
    if (p.jumpBuf > 0 && p.coyote > 0 && p.trip <= 0) {
      p.vy = cfg.jump * (p.scooter ? 1.05 : 1);
      p.jumpBuf = 0; p.coyote = 0; p.ride = null;
      sfx('jump');
    }
    if (cfg.jumpCut && !input.jump && p.vy < -2.2) p.vy = -2.2;
    p.vy = Math.min(p.vy + cfg.gravity, MAX_FALL);

    const prevBottom = p.y + p.h;
    p.ride = null;
    moveBody(p);
    // Land on lifts (one-way from above).
    if (p.vy >= 0) {
      for (const o of ents) {
        if (o.type !== 'lift' || o.spawned !== undefined) continue;
        if (p.x + p.w > o.x + 2 && p.x < o.x + o.w - 2 && prevBottom <= o.y + 1.5 && p.y + p.h >= o.y) {
          p.y = o.y - p.h; p.vy = 0; p.onGround = true; p.ride = o;
        }
      }
    }
    if (p.x < cam.x) { p.x = cam.x; if (p.vx < 0) p.vx = 0; }
    if (p.x + p.w > level.w * T) p.x = level.w * T - p.w;

    // Water shots.
    if (p.shotCd > 0) p.shotCd--;
    if (p.throwT > 0) p.throwT--;
    const autoShot = cfg.autoFire && p.hose && p.trip <= 0 && ents.some(o => o.spawned === undefined && !o.dead &&
      (o.type === 'flame' || ENEMY[o.type]) && (o.x - p.x) * p.face > 0 && Math.abs(o.x - p.x) < 95 && Math.abs(o.y + o.h / 2 - (p.y + 11)) < 26);
    if ((firePressed || autoShot) && p.hose && p.shotCd === 0 && shots.length < 2) {
      shots.push({ x: p.x + (p.face > 0 ? p.w : -6), y: p.y + 9, w: 6, h: 5, vx: p.face * 3.4 + p.vx * 0.5, vy: -1.4, t: 0 });
      p.shotCd = autoShot ? 26 : 12; p.throwT = 10; sfx('shoot');
    }

    // Energy drains as you go, faster in smoke.
    p.energy -= cfg.drain;
    if (p.smoke > 0) { p.smoke--; p.energy -= 1 / 8; }
    if (p.star > 0) { p.star--; if (p.star === 0) Music.rate = 1; }
    if (p.inv > 0) p.inv--;
    if (cfg.drain && p.energy < 20 && frame % 50 === 0) sfx('low');
    if (p.energy <= 0) { p.energy = 0; die(); }
    if (p.onGround && !p.ride && solidPx(p.x + 1, p.y + p.h + 1) && solidPx(p.x + p.w - 1, p.y + p.h + 1)) p.safeX = p.x;
    if (p.y > ROWS * T + 8) {
      if (cfg.pitRescue) rescueFromPit(); else die();
    }

    const moving = Math.abs(p.vx) > 0.2;
    p.anim = moving ? p.anim + Math.abs(p.vx) * 0.11 : 0;
  }

  function updateShots() {
    for (const s of shots) {
      s.t++;
      s.vy += 0.12; s.x += s.vx; s.y += s.vy;
      if (solidPx(s.x + 3, s.y + 3) || s.t > 70) { s.gone = true; burst(s.x + 3, s.y + 3, '#58c8f4', 5); continue; }
      for (const o of ents) {
        if (o.spawned !== undefined || o.dead || o.gone) continue;
        if (!overlap(s, o)) continue;
        if (o.type === 'flame') {
          o.gone = true; s.gone = true; sfx('hiss');
          for (let i = 0; i < 8; i++) parts.push({ x: o.x + 5, y: o.y + 8, vx: (Math.random() - 0.5) * 0.8, vy: -0.5 - Math.random(), t: 0, life: 40, col: '#e6edf3', big: 1 });
          addScore(200, o.x + 5, o.y);
          break;
        }
        if (ENEMY[o.type]) { killEnemy(o, 100); s.gone = true; burst(s.x, s.y, '#58c8f4', 4); break; }
        if (o.type === 'box') { openBox(o); s.gone = true; break; }
      }
    }
    shots = shots.filter(s => !s.gone);
  }

  // ---------------------------------------------------------------- main update
  function update() {
    frame++; stateT++;
    readInput();
    if (state === 'hint') {
      for (const o of ents) if (o.spawned === undefined) o.t++;
    }
    if (state === 'play' || state === 'dying' || state === 'clear') {
      if (state === 'play' || state === 'clear') {
        if (state === 'clear') { input.left = input.right = input.jump = input.fire = false; }
        updateEnts();
        updatePlayer();
        updateShots();
        cam.x = clamp(Math.max(cam.x, player.x - W * 0.42), 0, level.w * T - W);
      } else {
        updatePlayer();
      }
      for (const q of parts) { q.t++; q.x += q.vx; q.y += q.vy; if (!q.big) q.vy += 0.15; }
      parts = parts.filter(q => q.t < q.life);
      for (const q of popups) { q.t++; q.y -= 0.5; }
      popups = popups.filter(q => q.t < 50);
    }
    if (state === 'hint' && input.jump && !prev.jump && stateT > 10) {
      setState('play');
      player.jumpBuf = 7;
    }
    if (state === 'intro' && stateT > (cfg.tapJump ? 170 : 110)) { setState('play'); Music.play(SONGS.city); }
    if (state === 'dying' && stateT > 140) {
      if (!cfg.endless) lives--;
      if (lives < 0) { setState('over'); jingle('over'); saveHi(); }
      else startLevel(false);
    }
    if (state === 'clear' && stateT > 90 && clearBonus > 0) {
      const step = Math.min(clearBonus, 50);
      clearBonus -= step; score += step;
      if (stateT % 3 === 0) sfx('tick');
      if (clearBonus === 0) saveHi();
    }
    prev.jump = input.jump; prev.fire = input.fire;
  }
  function saveHi() {
    if (score > hiscore) {
      hiscore = score;
      try { localStorage.setItem('rescue5.hi', String(hiscore)); } catch (e) { /* storage blocked */ }
    }
  }

  // ---------------------------------------------------------------- drawing
  const FONT = '"Rubik", "Heebo", "Arial Hebrew", Arial, sans-serif';
  function text(str, x, y, size, col, align, outline) {
    ctx.font = `800 ${size}px ${FONT}`;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = /[\u0590-\u05FF]/.test(str) ? 'rtl' : 'ltr';
    if (outline !== false) {
      ctx.lineWidth = Math.max(2, size / 4); ctx.strokeStyle = typeof outline === 'string' ? outline : '#16213a';
      ctx.lineJoin = 'round'; ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = col; ctx.fillText(str, x, y);
  }
  function drawS(s, x, y, left) { ctx.drawImage(left ? s.l : s.r, Math.round(x - cam.x), Math.round(y)); }

  function drawBackground(camX) {
    ctx.drawImage(BG.sky, 0, 0, W, H);
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.arc(320, 34, 14, 0, Math.PI * 2); ctx.fill();
    const layer = (img, f, y, drift) => {
      const off = ((camX * f + drift) % img.width + img.width) % img.width;
      for (let x = -off; x < W; x += img.width) ctx.drawImage(img, Math.round(x), y);
    };
    layer(BG.clouds, 0.1, 6, frame * 0.08);
    layer(BG.far, 0.25, 72, 0);
    layer(BG.near, 0.5, 112, 0);
  }

  function drawTiles() {
    const x0 = Math.floor(cam.x / T), x1 = Math.min(level.w - 1, x0 + Math.ceil(W / T) + 1);
    for (let tx = x0; tx <= x1; tx++) {
      const z = level.zoneOf[tx];
      for (let ty = 0; ty < ROWS; ty++) {
        const t = level.tiles[ty * level.w + tx];
        if (!t) continue;
        const sx = Math.round(tx * T - cam.x), sy = ty * T;
        if (t === 1) ctx.drawImage(tileAt(tx, ty - 1) === 1 ? TILE_ART[z + 'fill'] : TILE_ART[z + 'top'], sx, sy);
        else if (t === 2) ctx.drawImage(TILE_ART.brick, sx, sy);
        else if (t === 3) ctx.drawImage(TILE_ART.girder, sx, sy);
      }
    }
  }

  function drawEnt(o) {
    const blink = (o.t >> 3) & 1;
    switch (o.type) {
      case 'raccoon': drawFlipY(ART.raccoon[(o.t >> 4) & 1], o.x - 1, o.y - 1, o.vx > 0, o.dead); break;
      case 'tire': drawFlipY(ART.tire[(o.t >> 2) & 3], o.x, o.y, false, o.dead); break;
      case 'cone': drawFlipY(ART.cone[o.onGround ? 0 : 1], o.x - 1, o.y - 1, false, o.dead); break;
      case 'bat': drawFlipY(ART.bat[(o.t >> 3) & 1], o.x - 2, o.y - 1, false, o.dead); break;
      case 'flame': drawS(ART.flame[(o.t >> 3) & 1], o.x - 1, o.y - 2); break;
      case 'barrier': o.down ? drawS(ART.barrierDown, o.x - 2, o.y + 6) : drawS(ART.barrier, o.x - 2, o.y - 2); break;
      case 'box': drawS(ART.box, o.x - 1, o.y - 1 + (blink && o.t % 120 < 16 ? -1 : 0)); break;
      case 'tramp': ctx.drawImage(ART.tramp, Math.round(o.x - cam.x), Math.round(o.y + (o.squash ? 2 : 0))); break;
      case 'lift': {
        const lx = Math.round(o.x - cam.x);
        ctx.fillStyle = '#9aa0aa'; ctx.fillRect(lx + 22, 0, 4, Math.round(o.y));
        ctx.drawImage(ART.lift, lx, Math.round(o.y));
        break;
      }
      case 'cp': {
        const cx = Math.round(o.x - cam.x);
        ctx.fillStyle = '#5d626b'; ctx.fillRect(cx + 2, o.y + 6, 2, 20);
        ctx.fillStyle = o.on ? (blink ? '#ff3b30' : '#2f7bff') : '#7c8088';
        ctx.fillRect(cx, o.y, 6, 6);
        if (o.on) { ctx.globalAlpha = 0.35; ctx.fillRect(cx - 3, o.y - 3, 12, 12); ctx.globalAlpha = 1; }
        break;
      }
      case 'goal': drawGoal(o); break;
      case 'deco': drawVehicle(o.arg, o.x, o.y + o.h, o.t); break;
      case 'hint': break;
      case 'item': {
        const s = { hose: ART.hose, scooter: ART.minicar, star: ART.star, smoke: ART.smoke[(o.t >> 4) & 1] }[o.arg] || ART.badge;
        drawS(s, o.x + (o.w - s.w) / 2, o.y + o.h - s.h);
        break;
      }
      case 'badge': drawS(ART.badge, o.x, o.y + Math.sin((o.t + o.bob * 10) * 0.08) * 1.5); break;
      default:
        if (FOOD[o.type]) drawS(ART.food[o.type], o.x, o.y + Math.sin((o.t + o.bob * 10) * 0.08) * 1.5);
    }
  }
  function drawVehicle(kind, x, bottom, t) {
    const img = ART[kind], vx = Math.round(x - cam.x), vy = Math.round(bottom - img.height);
    ctx.drawImage(img, vx, vy);
    const on = (t >> 3) & 1;
    const lights = {
      firetruck: [[50, 1, '#ff3b30', '#ffffff'], [56, 1, '#ffffff', '#ff3b30']],
      police: [[14, 1, '#ff3b30', '#2f7bff'], [22, 1, '#2f7bff', '#ff3b30']],
      ambulance: [[4, 1, '#2f7bff', '#ffffff'], [28, 1, '#ffffff', '#2f7bff']],
    }[kind];
    for (const [lx, ly, a, b] of lights) { ctx.fillStyle = on ? a : b; ctx.fillRect(vx + lx, vy + ly, 4, 3); }
  }
  function drawFlipY(s, x, y, left, flipped) {
    if (!flipped) return drawS(s, x, y, left);
    ctx.save();
    ctx.translate(Math.round(x - cam.x), Math.round(y + s.h));
    ctx.scale(1, -1);
    ctx.drawImage(left ? s.l : s.r, 0, 0);
    ctx.restore();
  }
  function drawGoal(o) {
    const gx = Math.round(o.x - cam.x), base = o.y + o.h;
    ctx.fillStyle = '#6b4a2c'; ctx.fillRect(gx + 16, base - 50, 8, 50);
    ctx.fillRect(gx + 22, base - 40, 12, 4);
    disc(ctx, gx + 20, base - 62, 20, '#3f9a2f');
    disc(ctx, gx + 8, base - 54, 12, '#4fb03a');
    disc(ctx, gx + 32, base - 52, 12, '#49a634');
    disc(ctx, gx + 22, base - 72, 10, '#5cc044');
    if (!o.saved) drawS(ART.kitten, o.x + 26, base - 47 + ((o.t >> 5) & 1 ? -1 : 0));
    // A little sign that says where we are going.
    ctx.fillStyle = '#5d4630'; ctx.fillRect(gx - 14, base - 22, 2, 22);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(gx - 30, base - 31, 32, 11);
    ctx.fillStyle = '#d8352c'; ctx.fillRect(gx - 30, base - 31, 32, 2);
    ctx.font = `800 7px ${FONT}`; ctx.fillStyle = '#16213a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    ctx.fillText('הצילו!', gx - 14, base - 25);
  }

  function drawPlayer() {
    const p = player;
    if (p.inv > 0 && (p.inv >> 2) % 2 === 0 && !p.dead) return;
    let torso = 'n', legs = 's';
    const step = Math.floor(p.anim) % 4;
    const grounded = p.onGround || p.ride;
    if (p.dead) { torso = 'j'; legs = 'j'; }
    else if (!grounded) { torso = 'j'; legs = 'j'; }
    else if (p.scooter) { legs = 's'; }
    else if (Math.abs(p.vx) > 0.2) { legs = ['r1', 'r2', 'r3', 'r2'][step]; torso = ['a', 'n', 'b', 'n'][step]; }
    if (p.throwT > 0) torso = 't';
    const head = p.dead ? 1 : ((frame >> 4) + (Math.abs(p.vx) > 0.2 ? step : 0)) & 1;
    const s = heroSprite(head, torso, legs);
    const lift = p.scooter ? 3 : 0;
    const dx = p.x - 3, dy = p.y - 2 - lift;
    const left = p.face < 0;

    if (p.dead) {
      ctx.save();
      ctx.translate(Math.round(dx - cam.x), Math.round(dy + 24));
      ctx.scale(1, -1);
      ctx.drawImage(s.r, 0, 0);
      ctx.restore();
      return;
    }
    drawS(s, dx, dy, left);
    if (p.hose) drawS(ART.helmet, dx, dy - 1, left);
    else if (p.scooter) drawS(ART.cap, dx, dy, left);
    if (p.scooter) {
      drawS(ART.minicar, p.x - 9, p.y + p.h - 11, left);
      const lx = Math.round((left ? p.x - 9 + 1 : p.x - 9 + 19) - cam.x), ly = Math.round(p.y + p.h - 13);
      ctx.fillStyle = (frame >> 3) & 1 ? '#ff3b30' : '#2f7bff'; ctx.fillRect(lx, ly, 4, 2);
    }
    if (p.star > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(frame * 0.5);
      drawS(s, dx, dy, left);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (frame % 4 === 0) parts.push({ x: p.x + Math.random() * 12 - 1, y: p.y + Math.random() * 22, vx: 0, vy: -0.4, t: 0, life: 18, col: frame % 8 ? '#ffffff' : '#7fc4ff', big: 1 });
    }
    if (p.smoke > 0) drawS(ART.smoke[(frame >> 4) & 1], p.x - 4, p.y - 16 + Math.sin(frame * 0.1) * 2);
  }

  function drawHUD() {
    const p = player;
    ctx.fillStyle = 'rgba(22,33,58,0.55)';
    ctx.fillRect(0, 0, W, 20);
    // Energy bar in the middle, only when energy runs down in this mode.
    if (cfg.drain) {
      const segs = 20, segW = 5, bx = W / 2 - (segs * (segW + 1)) / 2;
      const filled = Math.ceil((p.energy / ENERGY_MAX) * segs);
      for (let i = 0; i < segs; i++) {
        const lowCol = p.energy < 20 && (frame >> 3) & 1 ? '#ff5a4f' : '#ffd23f';
        ctx.fillStyle = i < filled ? (i < 4 ? lowCol : '#7ee36b') : 'rgba(255,255,255,0.18)';
        ctx.fillRect(Math.round(bx + i * (segW + 1)), 5, segW, 8);
      }
      text('אנרגיה', W / 2, 16.5, 5, '#ffffff', 'center', false);
    }
    if (cfg.hearts > 1) {
      const hx = cfg.drain ? W / 2 + 74 : W / 2 - ((cfg.hearts - 1) * 18) / 2;
      for (let i = 0; i < cfg.hearts; i++) drawHeart(hx + i * 18, 10, i < p.hearts);
    }
    // Score on the right (Hebrew reads from the right).
    text(String(score).padStart(6, '0'), W - 8, 10, 9, '#ffffff', 'right');
    // Pause and sound buttons, then lives, on the left.
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(7, 5, 3, 10); ctx.fillRect(12, 5, 3, 10);
    ctx.fillRect(24, 8, 3, 5); ctx.beginPath(); ctx.moveTo(27, 8); ctx.lineTo(32, 4); ctx.lineTo(32, 17); ctx.lineTo(27, 13); ctx.fill();
    if (muted) { ctx.fillStyle = '#ff5a4f'; ctx.fillRect(22, 10, 14, 2); }
    else { ctx.fillRect(34, 8, 1, 5); }
    const head = heroSprite(0, 'n', 's');
    ctx.drawImage(head.r, 0, 0, 16, 12, 44, 4, 16, 12);
    if (!cfg.endless) text('×' + Math.max(0, lives), 68, 10.5, 9, '#ffffff', 'center');
    // Power-ups.
    let ix = 82;
    if (p.hose) { ctx.drawImage(ART.hose.r, ix, 6); ix += 15; }
    if (p.scooter) { ctx.drawImage(ART.minicar.r, 0, 0, 28, 13, ix, 5, 17, 8); ix += 20; }
    if (p.star > 0) { ctx.drawImage(ART.star.r, ix, 5); ix += 13; }
    text('שלב ' + level.def.id, W - 74, 10, 7, '#bfe6ff', 'center', false);
  }
  function drawHeart(cx, cy, full) {
    ctx.fillStyle = full ? '#ff4d6d' : 'rgba(255,255,255,0.25)';
    const rows = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === 'X') ctx.fillRect(cx - 7 + x * 2, cy - 6 + y * 2, 2, 2); });
  }

  function drawTitle() {
    drawBackground(frame * 0.6);
    ctx.fillStyle = '#7a5c41'; ctx.fillRect(0, 196, W, 20);
    ctx.fillStyle = '#c7c1b6'; ctx.fillRect(0, 196, W, 4);
    text('חמישיית ההצלה', W / 2, 28, 26, '#ffd23f', 'center', '#a5241d');
    text('בחרו גיבור', W / 2, 50, 10, '#ffffff');
    if (hiscore) text('שיא: ' + hiscore, W - 30, 10, 7, '#ffffff', 'center');
    const cw = 62, gap = 8, total = 5 * cw + 4 * gap, x0 = (W - total) / 2;
    titleCards = [];
    for (let i = 0; i < 5; i++) {
      const ch = CHARACTERS[i];
      // First slot on the right, the way Hebrew reads.
      const x = x0 + (4 - i) * (cw + gap), y = 62;
      titleCards.push({ x, y, w: cw, h: 92, i });
      ctx.fillStyle = ch.unlocked ? '#d8352c' : 'rgba(22,33,58,0.55)';
      ctx.fillRect(x, y, cw, 92);
      ctx.fillStyle = ch.unlocked ? '#ffe9a8' : 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + 3, y + 3, cw - 6, 60);
      if (ch.unlocked) {
        setHeroPreview(ch);
        const s = previewSprite;
        const bob = (frame >> 4) & 1;
        ctx.drawImage(s.r, x + cw / 2 - 16, y + 8 - bob, 32, 48);
        ctx.drawImage(ART.helmet.r, x + cw / 2 - 16, y + 6 - bob, 32, 10);
        text(ch.name, x + cw / 2, y + 72, 10, '#ffffff');
        text('שחקו ▶', x + cw / 2, y + 85, 7, '#ffd23f', 'center', false);
      } else {
        text('?', x + cw / 2, y + 33, 26, 'rgba(255,255,255,0.5)', 'center', false);
        text('בקרוב', x + cw / 2, y + 76, 8, 'rgba(255,255,255,0.75)', 'center', false);
      }
    }
    // Difficulty for the first hero, picked by age; a parent can change it.
    titleChips = [];
    const cur = presetFor(0), chW = 58, chGap = 6, cx0 = (W - (4 * chW + 3 * chGap)) / 2;
    text('רמת קושי:', W / 2, 165, 7, '#ffffff');
    PRESET_ORDER.forEach((key, i) => {
      const pr = PRESETS[key], x = cx0 + (3 - i) * (chW + chGap), y = 172, on = key === cur;
      titleChips.push({ x, y, w: chW, h: 16, key });
      ctx.fillStyle = on ? '#ffd23f' : 'rgba(22,33,58,0.6)';
      ctx.fillRect(x, y, chW, 16);
      text(pr.label + ' · ' + pr.age, x + chW / 2, y + 8.5, 7, on ? '#16213a' : '#ffffff', 'center', false);
    });
    if ((frame >> 5) & 1) text('לחצו על ' + CHARACTERS[0].name + ' כדי להתחיל', W / 2, 205, 8, '#ffffff', 'center', '#3a2a1c');
  }
  let titleCards = [], titleChips = [];
  let previewSprite = null, previewFor = null;
  function setHeroPreview(ch) {
    if (previewFor === ch) return;
    previewFor = ch;
    setHero(ch);
    previewSprite = heroSprite(0, 'n', 's');
  }

  function drawWorld() {
    drawBackground(cam.x);
    drawTiles();
    for (const o of ents) if (o.spawned === undefined && o.type !== 'item') drawEnt(o);
    for (const o of ents) if (o.type === 'item') drawEnt(o);
    for (const s of shots) drawS(ART.drop, s.x, s.y);
    if (state === 'clear' && stateT > 20) {
      // The kitten jumps down into the hero's arms.
      const k = Math.min(1, (stateT - 20) / 40), goal = ents.find(o => o.type === 'goal');
      if (goal) {
        const sx = goal.x + 26, sy = goal.y + goal.h - 47;
        const ex = player.x + 2, ey = player.y + 6;
        drawS(ART.kitten, sx + (ex - sx) * k, sy + (ey - sy) * k - Math.sin(k * Math.PI) * 20, true);
      }
    }
    drawPlayer();
    for (const q of parts) {
      if (q.icon) {
        const s = { hose: ART.hose, scooter: ART.minicar, star: ART.star }[q.icon] || ART.badge;
        drawS(s, q.x, q.y);
        continue;
      }
      ctx.fillStyle = q.col;
      const sz = q.big ? 3 : 2;
      ctx.fillRect(Math.round(q.x - cam.x), Math.round(q.y), sz, sz);
    }
    for (const q of popups) text(q.text, Math.round(q.x - cam.x), Math.round(q.y), 7, '#ffffff');
    drawHUD();
  }

  function draw() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (state === 'title') { drawTitle(); return; }
    drawWorld();
    if (state === 'intro') {
      ctx.fillStyle = 'rgba(22,33,58,0.75)'; ctx.fillRect(0, 70, W, 70);
      text('שלב ' + level.def.id + ' · ' + level.def.name, W / 2, 94, 16, '#ffd23f');
      text(CHARACTERS[charIdx].name + ' יוצא להציל את החתלתול!', W / 2, 118, 9, '#ffffff', 'center', false);
      if (cfg.tapJump) {
        ctx.fillStyle = 'rgba(22,33,58,0.75)'; ctx.fillRect(0, 140, W, 30);
        text('👆 לוחצים על המסך = קופצים', W / 2 + 70, 155, 8, '#ffd23f', 'center', false);
        text('🍎 אוספים אוכל', W / 2 - 70, 155, 8, '#ffffff', 'center', false);
      }
    }
    if (state === 'hint') {
      const bob = Math.sin(stateT * 0.15) * 4;
      ctx.fillStyle = 'rgba(22,33,58,0.6)'; ctx.fillRect(0, 50, W, 50);
      text('לחצו על המסך כדי לקפוץ!', W / 2, 75, 15, '#ffd23f');
      ctx.font = `28px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('👆', Math.round(player.x - cam.x + 5), Math.round(player.y - 22 + bob));
    }
    if (state === 'dying' && cfg.endless && stateT > 30) {
      ctx.fillStyle = 'rgba(22,33,58,0.6)'; ctx.fillRect(0, 80, W, 44);
      text('אופס! עוד פעם…', W / 2, 102, 16, '#ffd23f');
    }
    if (state === 'clear' && stateT > 60) {
      ctx.fillStyle = 'rgba(22,33,58,0.75)'; ctx.fillRect(0, 62, W, 92);
      text('כל הכבוד! החתלתול ניצל!', W / 2, 84, 16, '#ffd23f');
      text((cfg.drain ? 'בונוס אנרגיה: ' : 'בונוס לבבות: ') + clearTotal, W / 2, 106, 9, '#ffffff', 'center', false);
      if (clearBonus === 0) {
        const more = levelIdx + 1 < levelList().length;
        text(more ? 'השלב הבא: ' + levelList()[levelIdx + 1].name : 'סיימת את כל השלבים! עוד שלבים בקרוב', W / 2, 124, 8, '#bfe6ff', 'center', false);
        if ((frame >> 5) & 1) text(more ? 'לחצו כדי להמשיך' : 'לחצו כדי לחזור לתפריט', W / 2, 140, 8, '#ffffff', 'center', false);
      }
    }
    if (state === 'over') {
      ctx.fillStyle = 'rgba(22,33,58,0.8)'; ctx.fillRect(0, 0, W, H);
      text('המשחק נגמר', W / 2, 88, 22, '#ff6b5e');
      text('ניקוד: ' + score + '   ·   שיא: ' + hiscore, W / 2, 116, 9, '#ffffff', 'center', false);
      if ((frame >> 5) & 1) text('לחצו כדי לנסות שוב', W / 2, 140, 8, '#ffd23f', 'center', false);
    }
    if (paused) {
      ctx.fillStyle = 'rgba(22,33,58,0.7)'; ctx.fillRect(0, 0, W, H);
      text('הפסקה', W / 2, 96, 22, '#ffffff');
      text('לחצו כדי להמשיך', W / 2, 124, 9, '#ffd23f', 'center', false);
    }
  }

  // ---------------------------------------------------------------- shell
  function resize() {
    const stage = document.getElementById('stage');
    const sw = stage.clientWidth, sh = stage.clientHeight;
    const fit = Math.min(sw / W, sh / H);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = Math.floor(W * fit) + 'px';
    canvas.style.height = Math.floor(H * fit) + 'px';
    canvas.width = Math.round(W * fit * dpr);
    canvas.height = Math.round(H * fit * dpr);
    scale = canvas.width / W;
  }

  function onTap(ev) {
    initAudio();
    const r = canvas.getBoundingClientRect();
    const gx = (ev.clientX - r.left) / r.width * W, gy = (ev.clientY - r.top) / r.height * H;
    if (gy < 22 && gx < 40 && state !== 'title') {
      if (gx < 20) setPaused(!paused); else setMuted(!muted);
      return;
    }
    if (paused) { setPaused(false); return; }
    if (cfg.tapJump && (state === 'play' || state === 'hint') && ev.pointerId !== undefined) {
      screenJump.add(ev.pointerId); touch.jump = true;
      return;
    }
    if (state === 'title') {
      const chip = titleChips.find(c => gx >= c.x && gx <= c.x + c.w && gy >= c.y - 3 && gy <= c.y + c.h + 3);
      if (chip) { choosePreset(0, chip.key); sfx('cp'); return; }
      const c = titleCards.find(c => gx >= c.x && gx <= c.x + c.w && gy >= c.y && gy <= c.y + c.h);
      if (c && CHARACTERS[c.i].unlocked) startGame(c.i);
      else if (!c) startGame(0);
    } else if (state === 'over' && stateT > 40) setState('title');
    else if (state === 'clear' && clearBonus === 0 && stateT > 120) afterClear();
  }
  let touchOn = false, touchBox = null;
  function syncTouchVisible() {
    const want = touchOn && ['intro', 'play', 'hint', 'dying'].includes(state);
    if (touchBox && touchBox.hidden === want) touchBox.hidden = !want;
  }
  const screenJump = new Set();
  function releaseScreenJump(ev) {
    if (screenJump.delete(ev.pointerId) && !screenJump.size) touch.jump = false;
  }
  // The youngest get one big jump button and no pad or water button.
  function syncTouchLayout() {
    document.getElementById('dpad').hidden = cfg.autoRun;
    document.getElementById('btnB').hidden = cfg.autoFire;
    document.getElementById('btnA').classList.toggle('big', cfg.tapJump);
  }
  function afterClear() {
    if (levelIdx + 1 < levelList().length) { levelIdx++; checkpoint = 0; startLevel(true); }
    else setState('title');
  }
  function setPaused(v) {
    if (!['play', 'intro'].includes(state)) v = false;
    paused = v;
    if (AC) v ? AC.suspend() : AC.resume();
  }

  function bindTouch() {
    const box = document.getElementById('touch');
    const dpad = document.getElementById('dpad');
    const padPointers = new Map();
    const updatePad = () => {
      touch.left = touch.right = false;
      const r = dpad.getBoundingClientRect();
      for (const x of padPointers.values()) {
        if (x < r.left + r.width / 2) touch.left = true; else touch.right = true;
      }
      dpad.dataset.dir = touch.left ? 'l' : touch.right ? 'r' : '';
    };
    dpad.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); dpad.setPointerCapture(e.pointerId); padPointers.set(e.pointerId, e.clientX); updatePad(); });
    dpad.addEventListener('pointermove', e => { if (padPointers.has(e.pointerId)) { padPointers.set(e.pointerId, e.clientX); updatePad(); } });
    const padUp = e => { padPointers.delete(e.pointerId); updatePad(); };
    dpad.addEventListener('pointerup', padUp);
    dpad.addEventListener('pointercancel', padUp);
    for (const [id, key] of [['btnA', 'jump'], ['btnB', 'fire']]) {
      const el = document.getElementById(id);
      const held = new Set();
      el.addEventListener('pointerdown', e => {
        e.preventDefault(); initAudio(); el.setPointerCapture(e.pointerId); held.add(e.pointerId); touch[key] = true; el.classList.add('on');
        if (!['play', 'intro', 'dying', 'hint', 'title'].includes(state)) onTap({ clientX: -1e4, clientY: -1e4 });
      });
      const up = e => { held.delete(e.pointerId); if (!held.size) { touch[key] = false; el.classList.remove('on'); } };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    }
    const showTouch = () => { touchOn = true; };
    if (window.matchMedia && matchMedia('(pointer: coarse)').matches) showTouch();
    window.addEventListener('touchstart', showTouch, { once: true, passive: true });
    touchBox = box;
    box.addEventListener('contextmenu', e => e.preventDefault());
  }

  function boot() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    buildArt(); buildTiles(); buildBackgrounds();
    setHero(CHARACTERS[0]);
    cfg = PRESETS[presetFor(0)];
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', onTap);
    canvas.addEventListener('pointerup', releaseScreenJump);
    canvas.addEventListener('pointercancel', releaseScreenJump);
    window.addEventListener('keydown', e => {
      initAudio();
      if (KEYMAP[e.code]) { keys.add(e.code); e.preventDefault(); }
      if (e.code === 'Enter' || e.code === 'Space') {
        if (state === 'title') startGame(0);
        else if (state === 'over' && stateT > 40) setState('title');
        else if (state === 'clear' && clearBonus === 0 && stateT > 120) afterClear();
      }
      if (e.code === 'KeyP' || e.code === 'Escape') setPaused(!paused);
      if (e.code === 'KeyM') setMuted(!muted);
    });
    window.addEventListener('keyup', e => keys.delete(e.code));
    window.addEventListener('blur', () => { keys.clear(); if (state === 'play') setPaused(true); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') setPaused(true); });
    bindTouch();
    syncTouchLayout();

    let last = performance.now(), acc = 0;
    const STEP = 1000 / 60;
    function loop(now) {
      acc += Math.min(100, now - last); last = now;
      while (acc >= STEP) { if (!paused) update(); acc -= STEP; }
      Music.tick();
      syncTouchVisible();
      draw();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // Exposed for automated checks; harmless in play.
  window.__rescue5 = {
    get state() { return state; }, get player() { return player; }, get score() { return score; },
    get cam() { return cam; }, get level() { return level; }, get ents() { return ents; }, startGame, input: touch, setPaused,
  };

  const go = () => (document.fonts && document.fonts.load ? document.fonts.load(`800 10px ${FONT}`).catch(() => {}) : Promise.resolve()).then(boot);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
