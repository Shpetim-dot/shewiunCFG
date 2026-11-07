(() => {
  const root = document.getElementById('app');
// Overlays (drawer, modals) get their own container so toggling them never rebuilds the app.
const overlayRoot = (() => {
  let el = document.getElementById('overlay');
  if (!el) { el = document.createElement('div'); el.id = 'overlay'; document.body.append(el); }
  return el;
})();
  const NS = 'http://www.w3.org/2000/svg';
  const G = {
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>', lens: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    wrench: '<path d="M4 20l9-9"/><path d="M12 6l5-3 4 4-3 5-3-3z"/>', scales: '<path d="M12 4v16M6 20h12M5 8h14"/><path d="M5 8l-3 7a3 3 0 0 0 6 0zM19 8l-3 7a3 3 0 0 0 6 0z"/>',
    coins: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3 3 7 3s7-1.3 7-3v-5"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>', book: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>', spark: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    graph: '<circle cx="6" cy="7" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M8 8l8-1M7 9l4 7M17 8l-4 8"/>',
    council: '<circle cx="8" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c0-3 2.5-5 5-5s5 2 5 5M14 20c0-2 1.5-4 3.5-4s3.5 2 3.5 4"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>', doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>', up: '<path d="M12 19V6M6 11l6-6 6 6"/>', panel: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M15 4.5v15"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>', user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/>',
    teams: '<rect x="3" y="4" width="8" height="7" rx="2"/><rect x="13" y="4" width="8" height="7" rx="2"/><rect x="8" y="14" width="8" height="7" rx="2"/>', store: '<path d="M4 9l2-5h12l2 5"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>',
    pen: '<path d="M4 20l1-4 11-11 3 3L8 19z"/><path d="M14 7l3 3"/>', rocket: '<path d="M12 3c3 2 5 5 5 9l-2 3H9l-2-3c0-4 2-7 5-9z"/><path d="M9 15l-3 4 4-1M15 15l3 4-4-1"/>', chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    terminal: '<path d="M4 5h16v14H4z"/><path d="M8 10l3 2-3 2M13 15h4"/>', bug: '<path d="M9 9a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0z"/><path d="M5 10l4 1M19 10l-4 1M5 16l4-1M19 16l-4-1M12 9V4"/>', radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 12l6-5"/>',
    table: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 10h17M9 10v9"/>', check: '<path d="M5 12l4 4 10-10"/>',
  };
  const KIND = { rule: 'shield', fact: 'book', decision: 'scales', lesson: 'compass', chat: 'chat', hypothesis: 'lens', note: 'doc' };
  const KIND_COLOR = { note: '#2F5BD3', fact: '#1B7F79', decision: '#7A4E9C', rule: '#B7791F', hypothesis: '#B5543C', lesson: '#3D7A4F' };
  const SPACE_COLOR = (s) => (s === 'shared' ? '#8FB1FF' : s === 'finance' ? '#4FC3D9' : (s || '').startsWith('team:') ? '#6EE7B7' : '#F4B860');
  const S = { usage: { models: [], by_kind: {}, budget: { monthly_cap: null, spent_this_month_known_cost: 0 }, note: 'Loading…', cost_is_partial: false, fallback_models: [] }, provs: [], prices: [], cu: { status: 'unconfigured', problems: [], note: '' }, invSum: null, pnew: { id: '', base_url: '', api_key: '' }, ptest: {}, pr: { provider: '', model: '', input_per_mtok: '', output_per_mtok: '', source: '' }, fb: '', cap: '', chans: {}, chan: null, cmsgs: [], cdraft: '', cbusy: '', invEdit: null, bs: { q: '', res: null }, view: 'chat', bots: [], bot: null, msgs: [], health: {}, drawer: false, menu: false, modal: null, panel: true, tab: 'overview', draft: '', busy: false,
    notes: [], note: null, versions: [], edit: false, q: '', filter: '', space: '', graph: true, graphAgent: '', gStatus: '', gSpace: '', gzoom: 1, kindFilter: '', sortBy: '', orphans: false, afilter: {}, mfa: false, mfaCode: '', pinned: {}, unreadA: {}, ctx: null, tmodal: false, tsel: new Set(), tname: '', tmission: '', newNote: false, activity: [], seen: new Set(), pulse: {}, actSince: '',
    calls: [], room: null, topic: '', picked: null, rounds: 1, planDone: {}, approvals: [], audit: [], policies: [], test: null, demo: null, verify: '', toolCalls: [], auth: false, tokenErr: '', bill: null, onb: null, presets: [], upsell: null, models: null, keys: null, newKey: null, backups: [], ready: null, leads: [], funnel: null, lead: { name: '', email: '', company: '', message: '' }, mtest: { model: '', out: '' }, ret: 90, skipOnb: false, sum: {}, cov: null, panicArm: false, menuQ: '', screen: { bot: '', events: [], ctrl: null, seen: new Set() },
    apps: [], appQ: '', appCat: 'All', appOpen: null, mcp: { name: '', url: '', token: '' }, tcall: { bot: '', tool: '', args: '{}', out: '' }, tmpl: [], caps: [],
    ag: { template: 'finance-analyst', name: '', team: '', icon: '', color: '' }, teams: [], tnew: { name: '', icon: 'teams', color: '#2F5BD3', mission: '', members: [] }, inv: [], invQ: '', invRisk: '',
    market: [], mtab: 'curated', mname: {}, hfq: '', hf: [], hfname: {}, card: '', cardname: '', rq: '', rctx: '', rdepth: 'standard', rweb: false, rs: null, rlist: [], skip: false, err: '', info: '' };
  let token = sessionStorage.getItem('cfa_token') || '', hover = null, sim = null, actTimer = null;

  const h = (tag, a = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(a)) {
      if (k === 'class') el.className = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, ''); else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid);
    return el;
  };
  const btn = (t, f, cls = 'btn', x = {}) => h('button', { class: cls, type: 'button', onclick: f, ...x }, t);
  const icon = (n, s = 18) => { const v = document.createElementNS(NS, 'svg'); for (const [k, x] of Object.entries({ viewBox: '0 0 24 24', width: s, height: s, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) v.setAttribute(k, x); v.innerHTML = G[n] || G.spark; return v; };
  const col = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '#12294F');
  let gid = 0;
  const mix = (hex, a) => { const n = parseInt(col(hex).slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(a < 0 ? v * (1 + a) : v + (255 - v) * a)); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); };
  // ---------- voxel agents: flat isometric blocks (front, top, side) with a pixel face and a pixel symbol badge ----------
    // No gradients and no per-agent filters: three flat tones per block give the depth. The look of one agent is
    // three small settings (symbol, colour, figure) that the agent settings dialog can change and the API stores.
    const INK = '#1B2433';
    const hsl = (hex) => { const n = parseInt(col(hex).slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, bl = (n & 255) / 255, mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), l = (mx + mn) / 2; let hh = 0, sa = 0;
      if (mx !== mn) { const d = mx - mn; sa = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - bl) / d + (g < bl ? 6 : 0) : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4; hh *= 60; } return [hh, sa, l]; };
    const fromHsl = (hh, sa, l) => { const k = sa * Math.min(l, 1 - l), f = (n) => { const q = (n + hh / 30) % 12; return Math.round(255 * (l - k * Math.max(-1, Math.min(q - 3, 9 - q, 1)))); }; return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join(''); };
    const lum = (hex) => { const n = parseInt(col(hex).slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };
    // 7x7 pixel symbols for the badge. '#' = filled pixel. A name that is not in this map falls back to "spark".
    const SPRITES = {
      spark: ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...'],
      eagle: ['..#....', '.###...', '#####..', '#######', '.#####.', '..###..', '...##..'],
      shield: ['.#####.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
      lens: ['.###...', '#...#..', '#...#..', '#...#..', '.###.#.', '......#', '.......'],
      compass: ['..###..', '.#...#.', '#..#..#', '#.###.#', '#..#..#', '.#...#.', '..###..'],
      wrench: ['##...##', '###.###', '.#####.', '..###..', '..###..', '..###..', '..###..'],
      scales: ['...#...', '.#####.', '#..#..#', '#..#..#', '.#.#.#.', '...#...', '.#####.'],
      coins: ['.#####.', '#.....#', '.#####.', '#.....#', '.#####.', '#.....#', '.#####.'],
      book: ['.##.##.', '#..#..#', '#..#..#', '#..#..#', '#..#..#', '.##.##.', '.......'],
      chat: ['.#####.', '#.....#', '#.....#', '#.....#', '.#####.', '..#....', '.#.....'],
      pen: ['.....##', '....###', '...###.', '..###..', '.###...', '##.#...', '#......'],
      rocket: ['...#...', '..###..', '..###..', '..###..', '.#####.', '.#.#.#.', '...#...'],
      chart: ['.....#.', '.....#.', '...#.#.', '...#.#.', '.#.#.#.', '.#.#.#.', '#######'],
      terminal: ['#######', '#.....#', '#.#...#', '#..#..#', '#.#.###', '#.....#', '#######'],
      bug: ['.#...#.', '..###..', '.#####.', '#######', '.#####.', '#.###.#', '.#...#.'],
      flask: ['..###..', '...#...', '...#...', '..###..', '.#####.', '#######', '#######'],
      doc: ['#####..', '#...##.', '#...###', '#.....#', '#.....#', '#.....#', '#######'],
      bolt: ['....##.', '...##..', '..##...', '.#####.', '...##..', '..##...', '.##....'],
      heart: ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
      star: ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
      eye: ['.......', '..###..', '.#...#.', '#..#..#', '.#...#.', '..###..', '.......'],
      gem: ['.#####.', '###.###', '#######', '.#####.', '..###..', '...#...', '.......'],
      crown: ['#..#..#', '##.#.##', '#######', '#######', '#######', '.......', '.......'],
      bulb: ['..###..', '.#####.', '.#####.', '.#####.', '..###..', '..###..', '...#...'],
      lock: ['..###..', '.#...#.', '.#...#.', '#######', '##...##', '##.#.##', '#######'],
    };
    const SYMBOLS = Object.keys(SPRITES);
    const FIGURES = ['block', 'antenna', 'ears', 'crest'];
    const FIGURE_LABEL = { block: 'Block', antenna: 'Antenne', ears: 'Ohren', crest: 'Kamm' };
    const AV_COLORS = ['#2F5BD3', '#3B82F6', '#1B7F79', '#16A37F', '#3D7A4F', '#B7791F', '#E5484D', '#B5543C', '#7A4E9C', '#DB2777', '#5B6B88', '#0F172A'];
    const spriteCache = {};
    const spritePath = (name, u) => {
      const key = name + '|' + u; if (spriteCache[key]) return spriteCache[key];
      const rows = SPRITES[name] || SPRITES.spark, n = (v) => +v.toFixed(2); let d = '';
      rows.forEach((row, y) => { let x = 0; while (x < 7) { if (row[x] !== '#') { x++; continue; } let e = x; while (e < 7 && row[e] === '#') e++; d += `M${n(x * u)} ${n(y * u)}h${n((e - x) * u)}v${n(u)}h-${n((e - x) * u)}z`; x = e; } });
      return (spriteCache[key] = d);
    };
    // The face is drawn on a 12x12 pixel grid (one pixel = 2 units on the 48 unit canvas).
    const R = (x, y, w = 1, t = 1) => `M${x} ${y}h${w}v${t}h-${w}z`;
    const FACE_EYES = {
      dot: R(3, 4, 2, 2) + R(7, 4, 2, 2),
      wide: R(2, 3, 3, 3) + R(7, 3, 3, 3),
      tall: R(3, 3, 2, 4) + R(7, 3, 2, 4),
      happy: R(2, 5) + R(3, 4, 2, 1) + R(5, 5) + R(6, 5) + R(7, 4, 2, 1) + R(9, 5),
      calm: R(3, 5, 3, 1) + R(7, 5, 3, 1),
      wink: R(3, 4, 2, 2) + R(6, 5) + R(7, 4, 2, 1) + R(9, 5),
    };
    const EYE_SPEC = { wide: R(2, 3) + R(7, 3), tall: R(3, 3) + R(7, 3) };
    const FACE_BROWS = {
      none: '', raise: R(3, 2, 3, 1) + R(7, 1, 3, 1), soft: R(3, 2, 3, 1) + R(7, 2, 3, 1),
      slant: R(2, 2, 2, 1) + R(4, 3) + R(8, 2, 2, 1) + R(7, 3),
    };
    const FACE_MOUTHS = {
      smile: R(3, 8) + R(4, 9, 4, 1) + R(8, 8), flat: R(4, 9, 4, 1), smirk: R(4, 9, 4, 1) + R(8, 8),
      open: R(5, 8, 2, 2), dot: R(5, 9, 2, 2), grin: R(3, 8, 6, 1) + R(4, 9, 4, 1),
    };
    const CORE_FACE = {
      strategist: { ring: ['#3B6FE0', '#F2A93B'], eyes: 'dot', brow: 'none', mouth: 'smile' },
      skeptic: { ring: ['#E5484D', '#2B3A67'], eyes: 'dot', brow: 'raise', mouth: 'flat' },
      builder: { ring: ['#16A37F', '#F2A93B'], eyes: 'wide', brow: 'slant', mouth: 'smirk' },
      chair: { ring: ['#7A4E9C', '#3B6FE0'], eyes: 'dot', brow: 'none', mouth: 'dot' },
    };
    const CORE_SEED = { strategist: '#2F5BD3', skeptic: '#B7791F', builder: '#1B7F79', chair: '#5B6B88' };
    const hashOf = (str) => { let x = 7; for (const ch of String(str)) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return x; };
    const pickKey = (o, n) => { const k = Object.keys(o); return k[n % k.length]; };
    // Everything one figure needs, from the agent record: body colour, accent, face, figure shape and badge symbol.
    function lookOf(b) {
      b = b || {};
      const key = (b.id || b.name || 'x'), core = CORE_FACE[key], x = hashOf(key);
      let body = col(b.color);
      if (core && (!b.color || String(b.color).toLowerCase() === CORE_SEED[key].toLowerCase())) body = core.ring[0];
      const accent = core ? core.ring[1] : fromHsl((hsl(body)[0] + 150) % 360, 0.62, 0.55);
      const face = core || { eyes: pickKey(FACE_EYES, x >> 3), brow: pickKey(FACE_BROWS, x >> 6), mouth: pickKey(FACE_MOUTHS, x >> 9) };
      return { body, accent, eyes: face.eyes, brow: face.brow, mouth: face.mouth,
        figure: FIGURES.includes(b.figure) ? b.figure : FIGURES[x % FIGURES.length], sym: SPRITES[b.icon] ? b.icon : 'spark' };
    }
    // A tiny custom mark for "pinned": the G icon map is shared and must not grow for one sidebar state.
    const av3Pin = (s = 12) => {
      const v = document.createElementNS(NS, 'svg');
      for (const [k, x] of Object.entries({ viewBox: '0 0 24 24', width: s, height: s, fill: 'currentColor', 'aria-hidden': 'true' })) v.setAttribute(k, x);
      v.innerHTML = '<path fill-rule="evenodd" d="M12 2.5a6.5 6.5 0 0 1 6.5 6.4c0 4.6-6.5 12-6.5 12S5.5 13.5 5.5 8.9A6.5 6.5 0 0 1 12 2.5zm0 4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z"/>';
      return v;
    };
    // A pixel symbol as its own small svg (used by the symbol picker).
    const symbolSvg = (name, s = 22) => {
      const v = document.createElementNS(NS, 'svg');
      for (const [k, x] of Object.entries({ viewBox: '0 0 7 7', width: s, height: s, fill: 'currentColor', 'aria-hidden': 'true', 'shape-rendering': 'crispEdges' })) v.setAttribute(k, x);
      v.innerHTML = `<path d="${spritePath(name, 1)}"/>`;
      return v;
    };
    // state: o.thinking = the agent is working or answering (it hops and the mouth moves); o.float = a calm idle bob
    // for the one hero avatar of a screen. Every other figure is static markup, so lists of agents cost nothing.
    function tile(b, s = 40, o = {}) {
      const L=lookOf(b), c=L.body, top=mix(c,.32), side=mix(c,-.3), ink=lum(c)>.55?INK:'#F8FAFC', acc=L.accent;
      // Four HTML-inspired voxel silhouettes. Eagle is a pixel badge, not wings.
      const shapes={
        block:['############','############','############','############','############','############','############','############','############','############'],
        antenna:['.....##.....','.....##.....','.....##.....','..########..','.##########.','############','############','############','############','############'],
        ears:['##........##','###......###','############','############','############','############','############','############','############','############'],
        crest:['....##......','...####......','..######.....','############','############','############','############','############','############','############']
      };
      const rows=shapes[L.figure]||shapes.block, cell=2.8, ox=7.2, oy=12, has=(x,y)=>!!(rows[y]&&rows[y][x]==='#');
      let front='',tops='',sides='';
      for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++)if(has(x,y)){
        const X=ox+x*cell,Y=oy+y*cell;
        front+='<rect x="'+X+'" y="'+Y+'" width="'+(cell+.08)+'" height="'+(cell+.08)+'" fill="'+c+'"/>';
        if(!has(x,y-1))tops+='<path d="M'+X+' '+Y+'l2 -2h'+cell+'l-2 2z" fill="'+top+'"/>';
        if(!has(x+1,y))sides+='<path d="M'+(X+cell)+' '+Y+'l2 -2v'+cell+'l-2 2z" fill="'+side+'"/>';
      }
      const face='<g fill="'+ink+'"><rect x="15" y="25" width="4" height="5"/><rect x="29" y="25" width="4" height="5"/></g><path d="M20 34h8" stroke="'+ink+'" stroke-width="1.6"/>';
      const badge=s>=28&&!o.nobadge?'<g class="av-tag" transform="translate(34 34)"><rect width="13" height="13" rx="2" fill="'+acc+'" stroke="#fff" stroke-width=".8"/><path d="'+spritePath(L.sym,1.05)+'" transform="translate(3 3)" fill="#fff"/></g>':'';
      const v=document.createElementNS(NS,'svg'); v.setAttribute('viewBox','0 0 48 48');v.setAttribute('width',s);v.setAttribute('height',s);v.setAttribute('aria-hidden','true');v.setAttribute('shape-rendering','crispEdges');v.setAttribute('class','av'+(o.float?' bob':'')+(o.thinking?' thinking':''));
      v.innerHTML='<ellipse class="av-ground" cx="24" cy="45.5" rx="14" ry="1.5"/><g class="av-fig">'+tops+sides+front+face+'</g>'+badge;
      return h('span',{class:'avatar',style:'width:'+s+'px;height:'+s+'px'},v);
    }  // ---------- cursor gaze: one global pointer tracker moves the hovered avatar's eyes, never a listener per tile ----------
  const av3Reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const av3Fine = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
  const AV3_GAZE_MAX = 2.1;   // 48x48 viewBox units, so the shift stays subtle at every rendered size
  let av3Hover = null, av3Px = 0, av3Py = 0, av3Raf = 0;
  function av3Parts(el) { return { av: el.querySelector('.av'), look: el.querySelector('.look') }; }
  function av3ClearGaze(el) {
    const target = el || av3Hover; if (!target) return;
    const { av, look } = av3Parts(target);
    if (look) look.style.transform = '';
    if (av) av.classList.remove('av3-gaze');
    if (!el || el === av3Hover) av3Hover = null;
  }
  function av3GazeFrame() {
    av3Raf = 0;
    const el = av3Hover; if (!el) return;
    if (!el.isConnected) { av3Hover = null; return; }
    const { av, look } = av3Parts(el); if (!av || !look) return;
    const r = av.getBoundingClientRect(); if (!r.width) return;
    const reach = r.width * 0.7 + 26;
    const nx = Math.max(-1, Math.min(1, (av3Px - (r.left + r.width / 2)) / reach));
    const ny = Math.max(-1, Math.min(1, (av3Py - (r.top + r.height / 2)) / reach));
    av.classList.add('av3-gaze');
    look.style.transform = `translate(${(nx * AV3_GAZE_MAX).toFixed(2)}px, ${(ny * AV3_GAZE_MAX).toFixed(2)}px)`;
  }
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    if ((av3Reduce && av3Reduce.matches) || (av3Fine && !av3Fine.matches) || !e.target || !e.target.closest) { av3ClearGaze(); return; }
    const hit = e.target.closest('.avatar');
    if (av3Hover && av3Hover !== hit) av3ClearGaze(av3Hover);
    av3Hover = hit; av3Px = e.clientX; av3Py = e.clientY;
    if (hit && !av3Raf) av3Raf = requestAnimationFrame(av3GazeFrame);
  }, { passive: true });
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget && av3Hover) av3ClearGaze(); });
  document.addEventListener('scroll', () => { if (av3Hover && !av3Raf) av3Raf = requestAnimationFrame(av3GazeFrame); }, { passive: true, capture: true });
  window.addEventListener('blur', () => av3ClearGaze());
  // ---------- walk-to-message: the agent's little avatar hops from the sidebar edge to a live reply ----------
  function av3WalkToMessage(bot) {
    if (!bot || S.view !== 'chat' || (av3Reduce && av3Reduce.matches)) return;
    const replies = document.querySelectorAll('#scroll .msgs .msg.agent');
    const target = replies[replies.length - 1];
    if (!target) return;
    const tr = target.getBoundingClientRect();
    if (tr.width < 20 || tr.height < 10) return;
    const side = document.querySelector('.side');
    const sr = side ? side.getBoundingClientRect() : null;
    const size = 30, narrow = window.innerWidth <= 760 || !sr || sr.width < 40;
    const startX = narrow ? 12 : Math.max(6, sr.right + 2);
    const startY = Math.min(window.innerHeight - size - 8, Math.max(8, tr.top + tr.height / 2 - size / 2));
    const endX = Math.min(window.innerWidth - size - 8, Math.max(8, tr.left + 6));
    const endY = Math.min(window.innerHeight - size - 8, Math.max(8, tr.top - 4));
    const walker = h('div', { class: 'av3-walk', 'aria-hidden': 'true' }, tile(bot, size, { thinking: true }));
    walker.style.left = startX + 'px';
    walker.style.top = startY + 'px';
    walker.style.setProperty('--av3-dx', (endX - startX).toFixed(1) + 'px');
    walker.style.setProperty('--av3-dy', (endY - startY).toFixed(1) + 'px');
    const stop = () => { if (walker.parentNode) walker.remove(); };
    walker.addEventListener('animationend', stop);
    setTimeout(stop, 1200);
    document.body.append(walker);
  }
  const when = (t) => (t || '').slice(0, 16).replace('T', ' ');
  const notif = window.ShewiunNotif ? window.ShewiunNotif({ h, when, icon, btn, openNote: (...args) => openNote(...args) }) : null;
  const botBy = (id) => S.bots.find((b) => b.id === id) || { color: '#5B6B88', icon: 'spark', name: id };
  const admin = (t) => h('p', { class: 'muted', style: 'font-size:12px' }, t);
  const badge = (n) => (n ? h('span', { class: 'badge' }, String(n)) : null);
  const dl = async (path, name) => { const r = await fetch(path, { headers: token ? { Authorization: 'Bearer ' + token } : {}, credentials: 'same-origin' }); if (!r.ok) throw new Error(`Download failed (${r.status})`); h('a', { href: URL.createObjectURL(await r.blob()), download: name }).click(); };

  // Session cookie auth needs a CSRF header; bearer tokens do not. Both are supported.
  const cookie = (n) => { const m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? m[1] : ''; };
  const authHeaders = (method) => {
    const hd = { 'Content-Type': 'application/json' };
    if (token) hd.Authorization = 'Bearer ' + token;
    if (method && method !== 'GET') { const c = cookie('cfa_csrf'); if (c) hd['X-CSRF-Token'] = c; }
    return hd;
  };
  const fail = async (r) => {
    if (r.status === 401) { S.auth = true; throw new Error('Sign-in required'); }
    let d = ''; try { d = (await r.json()).detail; } catch {}
    if (d && typeof d === 'object' && d.code === 'limit_reached') { S.upsell = d; throw new Error(d.message); }
    throw new Error(typeof d === 'string' && d ? d : `Request failed (${r.status})`);
  };

  async function api(path, opt = {}) {
    const method = opt.method || 'GET';
    const r = await fetch(path, { method, headers: authHeaders(method), credentials: 'same-origin', body: opt.body ? JSON.stringify(opt.body) : undefined });
    if (!r.ok) await fail(r);
    return r.json();
  }
  async function stream(path, body, onEv) {
    const r = await fetch(path, { method: 'POST', headers: authHeaders('POST'), credentials: 'same-origin', body: JSON.stringify(body) });
    if (!r.ok) await fail(r);
    const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { done, value } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true });
      let i; while ((i = buf.indexOf('\n\n')) >= 0) { const chunk = buf.slice(0, i); buf = buf.slice(i + 2); const line = chunk.split('\n').find((l) => l.startsWith('data: ')); if (line) onEv(JSON.parse(line.slice(6))); }
    }
  }
  const run = async (f) => { S.err = ''; try { await f(); } catch (e) { S.err = e.message; if (notif && !S.upsell) notif.toast(e.message, 'bad'); if (S.upsell) { S.modal = 'upsell'; S.err = ''; } } render(); };
  const loadBots = async () => { S.bots = await api('/api/bots'); if (S.bot) S.bot = S.bots.find((b) => b.id === S.bot.id) || S.bots[0]; };
  const loadNotes = async () => { S.notes = await api('/api/brain/notes'); };
  const loadApps = async () => { S.apps = await api('/api/apps'); };
  const loadTeams = async () => { S.teams = await api('/api/teams'); };
  const seenN = (cid) => { try { return parseInt(localStorage.getItem('cfa_seen_n_' + cid) || '0', 10); } catch { return 0; } };
  const setSeenN = (cid, n) => { try { localStorage.setItem('cfa_seen_n_' + cid, String(n)); } catch {} };
  const unreadOf = (c) => Math.max(0, (c.messages || 0) - seenN(c.id));
  const loadChannelIndex = async () => { S.chanCounts = {}; await Promise.all((S.teams || []).map(async (t) => {
    const l = await api(`/api/teams/${t.id}/channels`).catch(() => []);
    S.chans[t.id] = l;
    S.chanCounts[t.id] = l.reduce((s, c) => s + unreadOf(c), 0);
  })); };

  // ---------- navigation ----------
  const stopSim = () => { if (sim && sim.raf) cancelAnimationFrame(sim.raf); sim = null; };
  const stopAct = () => { if (actTimer) clearInterval(actTimer); actTimer = null; };
  async function go(view) {
    // Settings is a dialog now, not a screen. Old links keep working and land on the same overlay.
    if (view === 'settings') { openSettings(); return; }
    stopAct(); S.view = view; S.drawer = false; S.menu = false; S.err = ''; S.info = ''; if (view !== 'council') S.room = null; render();
    await run(async () => {
      if (view === 'brain') { await loadNotes(); await loadBots(); S.graph = S.notes.length > 0; if (!S.note && S.notes[0]) await openNote(S.notes[0].id, true); S.actSince = (await api('/api/brain/activity?since=9999')).now; actTimer = setInterval(pollAct, 2500); }
      if (view === 'council') S.calls = await api('/api/calls');
      if (view === 'research') { S.rlist = await api('/api/research'); try { S.health = await api('/api/health'); S.ssearch = await api('/api/search/status'); } catch {} }
      if (view === 'org') { await loadOrg(); if (S.cstream) { S.cstream.ctrl.abort(); S.cstream = null; } }
      if (view === 'teams') { await Promise.all([loadTeams(), loadBots()]); await loadChannelIndex(); } else if (S.cstream) { S.cstream.ctrl.abort(); S.cstream = null; }
      if (view === 'plans') S.bill = await api('/api/billing');
      if (view === 'control') { try { S.leads = await api('/api/leads'); S.funnel = await api('/api/events/summary'); } catch {} }
      if (view === 'inventory') { S.inv = await api('/api/inventory'); S.invSum = await api('/api/inventory/summary'); }
      if (view === 'usage') { [S.usage, S.provs, S.prices, S.cu] = await Promise.all([api('/api/usage'), api('/api/providers'), api('/api/prices'), api('/api/computer-use/status')]); }
      if (view === 'market') S.market = (await api('/api/marketplace')).curated;
      if (view === 'control') { S.afilter = {}; S.policyDraft = {}; S.auditOpen = {}; [S.approvals, S.audit, S.policies, S.test, S.toolCalls, S.cov, S.sum] = await Promise.all([api('/api/security/approvals'), api('/api/security/audit?limit=200').then((d) => { S.audit = d.events || []; S.auditIntegrity = d.integrity || null; S.auditTotal = d.total_filtered == null ? S.audit.length : d.total_filtered; return S.audit; }), api('/api/security/policies').then((d) => { S.policyMeta = d; return d.policies; }), api('/api/selftest/latest'), api('/api/tool-calls'), api('/api/coverage'), api('/api/summary'), api('/api/inventory').then((d) => { S.ctlInv = d; return d; }), api('/api/inventory/summary').then((d) => { S.ctlInvSum = d; return d; })]); }
    });
  }
  async function pick(id) {
    stopAct(); S.bot = S.bots.find((b) => b.id === id); S.view = 'chat'; S.tab = 'screen'; S.drawer = false; S.menu = false; S.room = null; render();
    await run(async () => { S.msgs = await api(`/api/bots/${id}/messages`); if (!S.notes.length) await loadNotes(); if (!S.apps.length) await loadApps(); });
  }
  async function openNote(id, quiet) {
    if (S.view !== 'brain') { stopAct(); S.view = 'brain'; S.actSince = (await api('/api/brain/activity?since=9999')).now; actTimer = setInterval(pollAct, 2500); }
    S.drawer = false; S.newNote = false; S.edit = false;
    const f = async () => { if (!S.notes.length) await loadNotes(); S.note = await api('/api/brain/notes/' + id); S.versions = await api(`/api/brain/notes/${id}/versions`); };
    if (quiet) await f(); else await run(f);
  }
  async function pollAct() {
    if (S.view !== 'brain') return stopAct();
    try {
      const d = await api('/api/brain/activity?since=' + encodeURIComponent(S.actSince)); S.actSince = d.now; let fresh = false;
      for (const e of d.events.reverse()) { if (S.seen.has(e.id)) continue; S.seen.add(e.id); S.activity.unshift(e); S.pulse[e.note_id] = Date.now() + 6000; fresh = true; }
      S.activity = S.activity.slice(0, 30); if (fresh) { updateTicker(); kick(); }
    } catch {}
  }
  function updateTicker() { const t = document.getElementById('ticker'); if (t) t.replaceChildren(...S.activity.slice(0, 6).map((e) => h('div', {}, `${when(e.ts)} · ${e.bot || 'someone'} ${e.kind === 'read' ? 'read' : 'wrote'} "${e.title || 'a note'}"`))); }
  async function send() {
    const text = S.draft.trim(); if (!text || S.busy) return;
    const before = S.msgs.length;
    S.draft = ''; S.busy = true; S.msgs.push({ role: 'user', content: text }); render();
    await run(async () => { try { const r = await api(`/api/bots/${S.bot.id}/messages`, { method: 'POST', body: { content: text } }); S.msgs.push({ role: 'agent', content: r.reply, note: r.draft_note_id, used: r.used }); } finally { S.busy = false; } });
    // Walk the little avatar to the bubble only for a live reply (never while history is loading).
    const last = S.msgs[S.msgs.length - 1];
    if (last && last.role === 'agent' && S.msgs.length > before) av3WalkToMessage(S.bot);
  }
  async function loadDemo() { await run(async () => { const r = await api('/api/demo/workspace', { method: 'POST' }); await Promise.all([loadBots(), loadNotes(), loadApps(), loadTeams()]); S.menu = false; S.info = `Demo workspace loaded: ${r.agents} agents, ${r.notes} notes, 2 teams, 3 apps. All of it is sample data.`; }); }

  // ---------- chat ----------
  function checklist() {
    const items = [['Load the demo workspace', S.bots.length > 4, loadDemo, 'Load'], ['Run a council call', S.calls.length > 0, () => go('council'), 'Open'], ['Run the authorization self-test', !!(S.test && S.test.id), () => go('control'), 'Open'],
      ['Connect an app or MCP server', S.apps.some((a) => a.connected), openApps, 'Open'], ['Create a team', S.teams.length > 0, () => go('teams'), 'Open']];
    if (items.every((i) => i[1]) || S.skip) return null;
    return h('div', { class: 'card', style: 'margin-bottom:16px' }, h('div', { class: 'row2' }, h('b', { style: 'flex:1' }, `Getting started: ${items.filter((i) => i[1]).length} of ${items.length}`), btn('Hide', () => { S.skip = true; render(); }, 'link')),
      items.map(([t, done, f, l]) => h('div', { class: 'check' + (done ? ' done' : '') }, h('span', { class: 'tick' }, done ? icon('check', 14) : null), h('span', { style: 'flex:1' }, t), done ? null : btn(l, f, 'btn'))));
  }
  function chatView() {
    const b = S.bot; if (!b) return h('div', { class: 'body' }, h('p', { class: 'empty muted' }, 'Choose an agent.'));
    const ta = h('textarea', { rows: 1, placeholder: `Message ${b.name}`, 'aria-label': `Message ${b.name}` }); ta.value = S.draft;
    const sb = h('button', { class: 'send', type: 'button', 'aria-label': 'Send', disabled: !S.draft.trim() || S.busy, onclick: send }, icon('up', 18));
    ta.addEventListener('input', () => { S.draft = ta.value; sb.disabled = !ta.value.trim() || S.busy; ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; });
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    return h('div', { style: 'display:flex;flex-direction:column;min-height:0;flex:1' },
      h('div', { class: 'bar' }, tile(b, 34, { float: true, thinking: S.busy }), h('h1', {}, b.name), h('span', { class: 'muted' }, b.role), b.status === 'suspended' ? h('span', { class: 'chip warn' }, 'suspended') : null, h('span', { class: 'sp' }), S.bill && S.bill.enabled && S.bill.plan === 'free' ? btn('Upgrade', () => { track('upgrade_click'); go('plans'); }, 'btn primary') : null, h('span', { class: 'chip' }, b.model),
        h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Toggle agent details', 'aria-pressed': S.panel, onclick: () => { S.panel = !S.panel; render(); } }, icon('panel'))),
      h('div', { class: 'body', id: 'scroll', 'aria-live': 'polite' }, h('div', { class: 'col' }, checklist(), h('div', { class: 'msgs' },
         S.msgs.length ? S.msgs.map((m,i)=>notif?notif.chatRow(b,m,S.msgs[i-1],tile):h('div',{class:'msg '+m.role},m.content))
           : h('p', { class: 'empty muted' }, `Start a conversation with ${b.name}. Replies are scripted until a model key is set.`),
         S.busy ? (notif?notif.chatTyping(b,tile):h('div',{class:'msg agent muted'},`${b.name} is answering…`)) : null))),
       h('div', { class: 'composer' }, h('div', { class: 'col', style: 'display:flex;gap:8px;align-items:flex-end;background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:8px 8px 8px 18px' }, ta, sb)));
  }
  function passport() {
    const b = S.bot; if (!b) return null;
    const modelOk = agxHasModel(b);
    const tabActive = (t) => (t === 'activity' ? S.tab === 'activity' || S.tab === 'screen' : S.tab === t);
    if (S.tab === 'overview') agxEnsureInv(false);
    const tabs = h('div', { class: 'agx-tabs', role: 'tablist', 'aria-label': 'Agent details' },
      [['overview', 'Overview'], ['activity', 'Activity'], ['memory', 'Memory'], ['apps', 'Apps']].map(([t, label]) =>
        h('button', { type: 'button', role: 'tab', class: 'agx-tab', 'aria-selected': tabActive(t) ? 'true' : 'false', onclick: () => { S.tab = t; render(); } }, label)));
    const head = h('div', { class: 'agx-head' },
      h('div', { class: 'agx-ident' }, tile(b, 56, { float: true }),
        h('div', { class: 'agx-idtext' }, h('div', { class: 'agx-name' }, b.name), h('div', { class: 'agx-role' }, b.role))),
      h('div', { class: 'agx-chips' },
        h('span', { class: 'chip' }, b.team || 'General'),
        h('span', { class: 'chip ' + (b.status === 'suspended' ? 'warn' : 'ok') }, b.status === 'suspended' ? 'Suspended' : 'Active'),
        h('span', { class: 'chip agx-modelchip' + (modelOk ? '' : ' warn') }, agxModelLabel(b))),
      btn([agxGear(15), 'Agent settings'], () => openAgentSettings('general'), 'btn agx-gearbtn'));
    let body;
    if (S.tab === 'overview') body = agxOverviewTab(b);
    else if (S.tab === 'activity' || S.tab === 'screen') body = agxActivityTab(b);
    else if (S.tab === 'memory') body = agxMemoryTab(b);
    else body = agxAppsTab(b);
    return h('aside', { class: 'panel agx-panel', 'aria-label': 'Agent details' }, head, tabs, h('div', { class: 'agx-body' }, body));
  }

  // ---------- council (live) ----------
  const STANCE = { support: 'Support', oppose: 'Oppose', unsure: 'Unsure' };
  function onCall(ev) {
    const r = S.room;
    if (ev.type === 'start') { r.agents = ev.agents; r.mode = ev.mode; r.rounds = ev.rounds || 1; }
    else if (ev.type === 'activity') r.activity.push(ev.text);
    else if (ev.type === 'round') { r.thinking = r.agents.map((a) => a.id); r.turnStart = Date.now(); r.activity.push(ev.label); }
    else if (ev.type === 'turn') { ev.ms = Math.max(0, Date.now() - (r.turnStart || Date.now())); r.elapsed = Math.max(0, Date.now() - (r.t0 || Date.now())); r.events.push(ev); r.thinking = r.thinking.filter((id) => id !== ev.bot_id); r.activity.push(`${ev.name} spoke${ev.revised ? ' and changed position' : ''}`); }
    else if (ev.type === 'decision') { r.decision = ev.text; r.plan = ev.plan; r.map = ev.map; }
    else if (ev.type === 'done') { r.done = true; r.id = ev.id; r.draft = ev.draft_note_ids; }
    else if (ev.type === 'error') S.err = ev.detail;
  }
  function typeTurn(el, text) {
    if (S.typer) { clearInterval(S.typer); S.typer = null; }
    if (!el || !text) return;
    let i = 0;
    el.textContent = '';
    const step = Math.max(1, Math.round(text.length / 70));
    S.typer = setInterval(() => {
      i += step;
      el.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(S.typer); S.typer = null; }
    }, 26);
  }
  async function startCall() {
    const ids = [...S.picked]; if (ids.length < 2) { S.err = 'Pick at least two agents.'; return render(); }
    S.room = { live: true, agents: [], events: [], activity: ['Connecting the agents…'], thinking: [], done: false, t0: Date.now(), turnStart: Date.now(), elapsed: 0 }; S.planDone = {}; S.err = ''; render();
    try { await stream('/api/calls/stream', { topic: S.topic, bot_ids: ids, rounds: +S.rounds }, (ev) => { onCall(ev); render(); }); }
    catch (e) { S.err = e.message; if (!S.room.events.length) S.room = null; }
    try { S.calls = await api('/api/calls'); } catch {}
    render();
  }
  async function openCall(id) { await run(async () => { const c = await api('/api/calls/' + id); S.room = { live: false, done: true, mode: c.mode, agents: [...new Map(c.events.map((e) => [e.bot_id, { id: e.bot_id, name: e.name }])).values()], events: c.events, activity: [], thinking: [], decision: c.decision, plan: c.plan, map: c.map, draft: null }; }); }
  function councilView() {
    const cands = S.bots.filter((b) => b.id !== 'chair' && b.status !== 'suspended');
    if (!S.picked) S.picked = new Set(cands.slice(0, 3).map((b) => b.id));
    const r = S.room;
    if (!r) {
      const topic = h('textarea', { class: 'field', rows: 3, maxlength: 2000, placeholder: 'What should the agents decide? Include the goal, constraints and what a good answer looks like.' }); topic.value = S.topic;
      const startBtn = btn([icon('council', 18), 'Start call'], startCall, 'btn primary', { disabled: S.topic.trim().length < 5 });
      topic.addEventListener('input', () => { S.topic = topic.value; startBtn.disabled = topic.value.trim().length < 5; });
      const chips = cands.map((b) => h('button', { type: 'button', class: 'btn', 'aria-pressed': S.picked.has(b.id), style: S.picked.has(b.id) ? 'border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)' : '', onclick: () => { S.picked.has(b.id) ? S.picked.delete(b.id) : S.picked.add(b.id); render(); } }, tile(b, 24), b.name));
      return h('div', { class: 'body' }, h('div', { class: 'col' }, h('h2', {}, 'Council call'),
        h('p', { class: 'muted' }, 'Agents join a live call, answer independently first, then respond to each other and may change their position. The Chair writes the decision and a plan. Dissent stays in the record.'),
        topic, h('div', { class: 'row2', style: 'margin:12px 0' }, chips),
        h('div', { class: 'row2' }, h('select', { class: 'field', style: 'width:auto', onchange: (e) => { S.rounds = e.target.value; } }, [1, 2, 3].map((n) => h('option', { value: n, selected: +S.rounds === n }, `${n} discussion round${n > 1 ? 's' : ''}`))),
          startBtn, btn('Use a sample topic', () => { S.topic = 'Should we let an AI agent propose supplier payments under EUR 5,000?'; render(); }),
          btn([icon('terminal', 16), 'Code review session'], () => { const dev = S.bots.filter((x) => ['Code Reviewer', 'Architect', 'Test Engineer', 'Security Reviewer'].includes(x.name)); S.picked = new Set((dev.length >= 2 ? dev : cands.slice(0, 3)).map((x) => x.id)); S.topic = 'Review this change for bugs, missing tests and security issues:\n\n<paste your diff here>'; if (dev.length < 2) S.info = 'Tip: apply the Developer preset to get a coding review board.'; render(); })),
        S.calls.length ? [h('h2', {}, 'Previous calls'), S.calls.map((x) => h('div', {}, btn(x.topic, () => openCall(x.id), 'link'), h('span', { class: 'muted mono' }, ` ${when(x.created_at)} ${x.mode}`)))] : null));
    }
    const ev = r.events, cur = ev[ev.length - 1];
    const stanceChip = (s) => h('span', { class: 'chip ' + (s === 'support' ? 'ok' : s === 'unsure' ? 'warn' : ''), style: s === 'oppose' ? 'background:#B5543C;color:#fff' : '' }, STANCE[s] || s || '–');
    const lastOf = (id) => [...ev].reverse().find((e) => e.bot_id === id);
    const fmtSecs = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    const tiles = r.agents.map((a, i) => {
      const last = lastOf(a.id), thinking = r.thinking.includes(a.id) && !r.done, b = botBy(a.id);
      return h('button', { type: 'button', style: 'animation-delay:' + (i * 60) + 'ms', class: 'board-tile rise' + (thinking ? ' speaking' : '') + (cur && cur.bot_id === a.id ? ' current' : ''), 'aria-label': 'Jump to the latest statement of ' + a.name,
          onclick: () => { if (last) { const tl = document.getElementById('turn-' + last.id); if (tl) tl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } },
        h('span', { class: 'board-avatar', style: '--c:' + ((b && b.color) || '#2F5BD3') }, tile(b, 44, { thinking })),
        h('span', { class: 'board-meta' }, h('b', {}, a.name), h('span', { class: 'muted' }, thinking ? 'is speaking…' : last ? (last.round === 0 ? 'Opening statement' : 'Round ' + last.round) : 'joining')),
        thinking ? h('span', { class: 'chip warn' }, 'thinking') : last ? stanceChip(last.stance) : h('span', { class: 'chip' }, 'joining'));
    });
    const bubble = (e) => {
      const idx = ev.indexOf(e), prev = ev.slice(0, idx).reverse().find((x) => x.bot_id === e.bot_id);
      const moved = e.revised && prev && prev.stance !== e.stance;
      const used = (e.used || []).map((title) => { const n = S.notes.find((x) => x.title === title); return n ? btn(title, () => { go('brain'); run(() => openNote(n.id)); }, 'link') : h('span', {}, title); });
      return h('div', { class: 'turn' + (cur && cur.id === e.id ? ' latest' : ''), id: 'turn-' + e.id }, tile(botBy(e.bot_id), 34),
        h('div', { class: 'turn-body' },
          h('div', { class: 'row2' }, h('b', {}, e.name), stanceChip(e.stance),
            moved ? h('span', { class: 'chip stance-move' }, (STANCE[prev.stance] || '?') + ' → ' + (STANCE[e.stance] || '?')) : null,
            h('span', { class: 'muted mono', style: 'font-size:11px' }, e.round === 0 ? 'opening' : 'round ' + e.round),
            e.ms ? h('span', { class: 'muted mono', style: 'font-size:11px' }, (e.ms / 1000).toFixed(1) + ' s') : null),
          h('div', { class: 'turn-text', id: cur && cur.id === e.id ? 'cur-turn' : '' }, e.text),
          used.length ? h('div', { class: 'muted mono', style: 'font-size:11px;margin-top:6px' }, 'read: ', used.map((u) => [u, ' '])) : null));
    };
    const transcript = h('div', { class: 'transcript', role: 'log', 'aria-live': 'polite', id: 'transcript' },
      (!ev.length) ? h('div', { class: 'waiting' }, h('div', { class: 'dots' }, h('i'), h('i'), h('i')), h('span', { class: 'muted' }, 'Agents are taking their seats…')) : null,
      ev.flatMap((e, i) => (i === 0 || ev[i - 1].round !== e.round)
        ? [h('div', { class: 'round-sep' }, e.round === 0 ? 'Opening statements' : 'Round ' + e.round + ' — cross-examination'), bubble(e)]
        : [bubble(e)]));
    const stepper = h('div', { class: 'row2', style: 'flex-wrap:wrap' }, Array.from({ length: r.rounds || 1 }, (_, i) => h('span', { class: 'chip' + (cur && cur.round === i ? ' ok' : '') }, 'Round ' + (i + 1))),
      h('span', { class: 'chip' + (r.done ? ' ok' : ' warn') }, r.done ? 'concluded' : 'in session'));
    const stanceSummary = () => {
      const last = {};
      Object.entries(r.map || {}).forEach(([n, st]) => { last[n] = (st || [])[(st || []).length - 1]; });
      const names = Object.keys(last), counts = { support: 0, unsure: 0, oppose: 0 };
      Object.values(last).forEach((s) => { if (counts[s] !== undefined) counts[s] += 1; });
      const bar = (k, label, color) => h('div', { class: 'stance-row' }, h('span', { class: 'muted', style: 'min-width:96px' }, label),
        h('div', { class: 'stance-bar' }, h('i', { style: 'width:' + (names.length ? (counts[k] / names.length) * 100 : 0) + '%;background:' + color })),
        h('b', {}, String(counts[k])));
      return h('div', {}, bar('support', 'support', '#1B7F79'), bar('unsure', 'unsure', '#B7791F'), bar('oppose', 'oppose', '#B5543C'));
    };
    const minutes = () => ['# Council minutes', '', 'Topic: ' + S.topic, '', '## Agents', r.agents.map((a) => '- ' + a.name).join('\n'), '',
      '## Transcript', ...ev.map((e) => `**${e.name}** (${e.round === 0 ? 'opening' : 'round ' + e.round}, ${e.stance}): ${e.text}`),
      '', '## Decision', r.decision || '', '', '## Plan', ...(r.plan || []).map((p) => '- [ ] ' + p.step + ' — ' + p.owner)].join('\n');
    const copyMinutes = () => { if (navigator.clipboard) navigator.clipboard.writeText(minutes()).then(() => { S.info = 'Minutes copied to the clipboard.'; render(); }); };
    const downloadMinutes = () => { const b = new Blob([minutes()], { type: 'text/markdown' }); const a = h('a', { href: URL.createObjectURL(b), download: 'council-minutes.md' }); document.body.append(a); a.click(); a.remove(); };
    const board = h('aside', { class: 'council-board' }, h('h3', {}, 'The board'), h('div', { class: 'board-list' }, tiles),
      h('p', { class: 'muted', style: 'font-size:12px;margin:12px 0 0' }, r.thinking.length && !r.done
        ? 'Up next: ' + r.thinking.map((id) => (r.agents.find((a) => a.id === id) || {}).name).filter(Boolean).join(' → ')
        : (r.done ? 'Call concluded - the chair wrote the decision.' : 'Waiting for the first statement…')),
      h('h3', { style: 'margin-top:14px' }, 'Activity'),
      h('div', { class: 'feed' }, [...(r.activity || [])].reverse().slice(0, 8).map((a) => h('div', {}, a))),
      r.mode === 'demo' ? h('p', { class: 'chip warn' }, 'Demo mode: scripted statements') : null);
    const resolution = r.decision ? h('div', { class: 'card resolution' },
      h('div', { class: 'row2' }, h('span', { class: 'chip ok' }, 'Resolution'), h('span', { class: 'sp' }), btn('Copy minutes', copyMinutes, 'chip'), btn('Export .md', downloadMinutes, 'chip')),
      h('h2', {}, 'Decision'), md(r.decision || ''),
      h('h2', {}, 'Where the board stands'), stanceSummary(),
      h('h2', {}, 'Plan'), (r.plan || []).length ? h('ul', { class: 'plan', style: 'padding:0' }, r.plan.map((p, k) => h('li', {}, h('input', { type: 'checkbox', checked: !!S.planDone[k], 'aria-label': p.step, onchange: (e) => { S.planDone[k] = e.target.checked; } }), h('span', {}, p.step, ' ', h('span', { class: 'chip' }, p.owner))))) : h('p', { class: 'muted' }, 'No plan lines were returned.'),
      h('details', { style: 'margin-top:12px' }, h('summary', { class: 'muted' }, 'Disagreement map'),
        h('div', { class: 'tbl-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Agent'), ...(Object.values(r.map || {})[0] || []).map((_, k) => h('th', {}, k === 0 ? 'Opening' : 'Round ' + k)))), h('tbody', {}, Object.entries(r.map || {}).map(([n, st]) => h('tr', {}, h('td', {}, n), ...st.map((s) => h('td', {}, stanceChip(s))))))))),
      r.draft ? h('p', { class: 'muted', style: 'margin-top:10px' }, 'Memory from this call is stored as drafts. ', btn('Review in Brain', () => openNote(r.draft[0]), 'link')) : null) : null;
    requestAnimationFrame(() => {
      const tr = document.getElementById('transcript'); if (tr) tr.scrollTop = tr.scrollHeight;
      const el = document.getElementById('cur-turn');
      if (el && cur && S.typedId !== cur.id) { S.typedId = cur.id; typeTurn(el, cur.text); }
    });
    return h('div', { class: 'body' }, h('div', { class: 'wide council-room' },
      h('div', { class: 'card council-head' },
        h('div', { class: 'row2', style: 'align-items:flex-start' }, h('h2', { style: 'margin:0;flex:1' }, S.topic), stepper),
        h('div', { class: 'row2', style: 'margin-top:10px' }, btn([icon('council', 16), 'New call'], () => { S.room = null; S.typedId = ''; render(); }),
          h('span', { class: 'chip mono' }, 'Call ' + fmtSecs(r.elapsed || 0)),
          h('span', { class: 'muted' }, r.live ? 'Live — statements stream in as the agents finish them.' : 'Recorded call.'))),
      h('div', { class: 'council-stage' },
        board,
        h('div', { class: 'council-main' },
          h('div', { class: 'card transcript-card' }, h('div', { class: 'row2' }, h('b', {}, 'Live transcript'), h('span', { class: 'sp' }), h('span', { class: 'muted mono', style: 'font-size:11px' }, ev.length + ' statements')), transcript),
          resolution))));
  }

  // ---------- brain ----------
  const svg = (W, H) => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', `0 0 ${W} ${H}`); s.setAttribute('width', '100%'); return s; };
  const sadd = (s, n, at, txt) => { const e = document.createElementNS(NS, n); for (const k in at) e.setAttribute(k, at[k]); if (txt) e.textContent = txt; s.append(e); return e; };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const nodeColor = (n) => { const b = S.bots.find((x) => x.id === n.owner); return b ? b.color : SPACE_COLOR(n.space); };
  function kick() { if (sim && !sim.raf) sim.raf = requestAnimationFrame(tick); }
  function tick() {
    if (!sim) return; const { nodes, edges, W, H } = sim, a = sim.alpha; sim.raf = 0;
    for (const n of nodes) { for (const m of nodes) { if (n === m) continue; const dx = n.x - m.x, dy = n.y - m.y, f = (2400 * a) / (dx * dx + dy * dy + 0.5); n.vx += dx * f; n.vy += dy * f; } n.vx += (W / 2 - n.x) * 0.012 * a; n.vy += (H / 2 - n.y) * 0.012 * a; }
    for (const e of edges) { const A = sim.byId[e.from], B = sim.byId[e.to], dx = B.x - A.x, dy = B.y - A.y; A.vx += dx * 0.02 * a; A.vy += dy * 0.02 * a; B.vx -= dx * 0.02 * a; B.vy -= dy * 0.02 * a; }
    for (const n of nodes) { if (sim.drag === n) { n.vx = n.vy = 0; } else { n.x = clamp(n.x + n.vx * 0.6, 30, W - 30); n.y = clamp(n.y + n.vy * 0.6, 20, H - 20); n.vx *= 0.6; n.vy *= 0.6; } }
    edges.forEach((e, i) => { const A = sim.byId[e.from], B = sim.byId[e.to], l = sim.lines[i]; l.setAttribute('x1', A.x); l.setAttribute('y1', A.y); l.setAttribute('x2', B.x); l.setAttribute('y2', B.y); });
    const now = Date.now(); let pulsing = false;
    for (const n of nodes) {
      for (const el of [n.el, n.halo]) { el.setAttribute('cx', n.x); el.setAttribute('cy', n.y); } n.label.setAttribute('x', n.x + n.r + 3); n.label.setAttribute('y', n.y + 4);
      const until = S.pulse[n.id] || 0; if (until > now) { pulsing = true; n.halo.setAttribute('opacity', (((until - now) / 6000) * 0.9).toFixed(2)); n.halo.setAttribute('r', n.r + 6 + 3 * Math.sin(now / 200)); } else n.halo.setAttribute('opacity', 0);
    }
    sim.alpha *= 0.985; if (sim.alpha > 0.03 || sim.drag || pulsing) sim.raf = requestAnimationFrame(tick);
  }
  function buildGraph(nodes, edges) {
    const W = 860, H = 560, s = svg(W, H), deg = {}, byId = {};
    edges.forEach((e) => { deg[e.from] = (deg[e.from] || 0) + 1; deg[e.to] = (deg[e.to] || 0) + 1; });
    nodes.forEach((n, i) => { const a = (2 * Math.PI * i) / Math.max(nodes.length, 1); Object.assign(n, { x: W / 2 + Math.cos(a) * W / 3.2, y: H / 2 + Math.sin(a) * H / 3.2, vx: 0, vy: 0, r: 5 + Math.min(deg[n.id] || 0, 8) }); byId[n.id] = n; });
    const lines = edges.map(() => sadd(s, 'line', { stroke: '#8FB1FF', 'stroke-opacity': '.28' }));
    sim = { nodes, edges, lines, byId, W, H, alpha: 1, raf: 0, drag: null };
    nodes.forEach((n) => {
      const c = nodeColor(n); n.halo = sadd(s, 'circle', { r: n.r + 8, fill: 'none', stroke: '#7FA2FF', 'stroke-width': 2, opacity: 0 });
      n.el = sadd(s, 'circle', { r: n.r, fill: n.status === 'verified' ? c : '#0B1A33', stroke: c, 'stroke-width': 2, style: 'cursor:pointer' }); sadd(n.el, 'title', {}, `${n.title} (${n.kind}, ${n.status}, ${n.space})`);
      n.label = sadd(s, 'text', { 'font-size': 10, fill: '#CFE0FF', 'pointer-events': 'none' }, n.title.slice(0, 24));
      n.el.addEventListener('pointerdown', (ev) => { if (!sim) return; sim.drag = n; n.moved = 0; ev.preventDefault(); sim.alpha = 0.6; kick(); });
    });
    const at = (ev) => { const r = s.getBoundingClientRect(); return [((ev.clientX - r.left) * W) / (r.width || W), ((ev.clientY - r.top) * H) / (r.height || H)]; };
    s.addEventListener('pointermove', (ev) => { if (!sim || !sim.drag) return; const [x, y] = at(ev), n = sim.drag; n.moved += Math.abs(n.x - x) + Math.abs(n.y - y); n.x = x; n.y = y; sim.alpha = 0.5; kick(); });
    const up = () => { if (!sim || !sim.drag) return; const n = sim.drag; sim.drag = null; if (n.moved < 6) selectNode(n.id); };
    s.addEventListener('pointerup', up); s.addEventListener('pointerleave', up); kick(); return s;
  }
  function bigGraph() {
    const wrap = h('div', { class: 'gwrap dark' }, h('div', { style: 'padding:12px' }, h('div', { class: 'skel' })));
    (async () => {
      try {
        const g = await api('/api/brain/graph'), reads = new Set(), wrote = new Set(), bot = S.graphAgent ? botBy(S.graphAgent) : null;
        if (bot) (await api('/api/brain/activity?bot=' + S.graphAgent)).events.forEach((e) => (e.kind === 'read' ? reads : wrote).add(e.note_id));
        let nodes = g.nodes; if (bot) nodes = nodes.filter((n) => n.owner === bot.id || wrote.has(n.id) || reads.has(n.id) || (bot.spaces || []).filter((x) => x !== 'shared').includes(n.space));
        if (S.gStatus) nodes = nodes.filter((n) => n.status === S.gStatus);
        if (S.gSpace) nodes = nodes.filter((n) => n.space === S.gSpace);
        const ids = new Set(nodes.map((n) => n.id)); stopSim();
        const svgEl = buildGraph(nodes, g.edges.filter((e) => ids.has(e.from) && ids.has(e.to)));
        svgEl.style.transform = 'scale(' + (S.gzoom || 1) + ')'; svgEl.style.transformOrigin = 'top left';
        wrap.style.overflow = 'auto'; wrap.style.maxHeight = '640px'; wrap.replaceChildren(svgEl);
        const cap = document.getElementById('gcap'); if (cap) cap.textContent = bot ? `Brain of ${bot.name}: ${nodes.length} notes (${nodes.filter((n) => n.owner === bot.id).length} written, ${reads.size} read, spaces: ${bot.spaces.join(', ')})` : `${nodes.length} notes and ${sim ? sim.edges.length : 0} connections`;
      } catch (e) { wrap.textContent = e.message; }
    })();
    return wrap;
  }
  function localGraph(n) {
    const titles = new Set([...(n.links || []), ...(n.backlinks || [])]), others = S.notes.filter((x) => titles.has(x.title) && x.id !== n.id).slice(0, 12), s = svg(260, 200);
    others.forEach((o, i) => { const a = (2 * Math.PI * i) / others.length; o.px = 130 + Math.cos(a) * 85; o.py = 100 + Math.sin(a) * 70; sadd(s, 'line', { x1: 130, y1: 100, x2: o.px, y2: o.py, stroke: 'currentColor', 'stroke-opacity': '.3' }); });
    others.forEach((o) => { const c = sadd(s, 'circle', { cx: o.px, cy: o.py, r: 7, fill: o.status === 'verified' ? SPACE_COLOR(o.space) : 'none', stroke: SPACE_COLOR(o.space), 'stroke-width': 2, style: 'cursor:pointer' }); sadd(c, 'title', {}, o.title); c.addEventListener('click', () => openNote(o.id)); sadd(s, 'text', { x: o.px, y: o.py + 18, 'font-size': 9, 'text-anchor': 'middle', fill: 'currentColor' }, o.title.slice(0, 18)); });
    sadd(s, 'circle', { cx: 130, cy: 100, r: 10, fill: 'var(--accent)' }); return s;
  }
  const hideHover = () => { if (hover) hover.remove(); hover = null; };
  function showHover(e, note) { hideHover(); hover = h('div', { class: 'hover' }, h('b', {}, note.title), h('div', { class: 'muted', style: 'margin:2px 0 6px' }, `${note.kind} · ${note.status} · ${note.space}`), (note.preview || '').slice(0, 180)); document.body.append(hover); const r = e.target.getBoundingClientRect(); hover.style.left = Math.min(r.left, innerWidth - 320) + 'px'; hover.style.top = Math.min(r.bottom + 6, innerHeight - 140) + 'px'; }
  function inline(text) {
    return text.split(/(\[\[[^\[\]]+\]\])/).map((part) => {
      const m = part.match(/^\[\[(.+)\]\]$/); if (!m) return part; const n = S.notes.find((x) => x.title === m[1]);
      if (!n) return h('span', { class: 'wl dead', title: 'No such note yet' }, m[1]);
      const a = h('button', { type: 'button', class: 'wl', onclick: () => { hideHover(); openNote(n.id); } }, m[1]);
      a.addEventListener('mouseenter', (e) => showHover(e, n)); a.addEventListener('mouseleave', hideHover); a.addEventListener('focus', (e) => showHover(e, n)); a.addEventListener('blur', hideHover); return a;
    });
  }
  function md(body, cite) {
    const out = [], fmt = (t) => (cite ? cite(t) : inline(t)); let list = null;
    for (const ln of body.split('\n')) {
      if (/^\s*[-*]\s+/.test(ln)) { if (!list) { list = h('ul'); out.push(list); } list.append(h('li', {}, fmt(ln.replace(/^\s*[-*]\s+/, '')))); continue; }
      list = null; if (/^#{1,3}\s+/.test(ln)) out.push(h('h3', {}, ln.replace(/^#+\s+/, ''))); else if (ln.trim()) out.push(h('p', {}, fmt(ln.replace(/\*\*/g, ''))));
    }
    return h('div', { class: 'md' }, out);
  }
  const activityBlock = () => h('div', {}, h('h2', {}, 'Live activity'), h('div', { class: 'ticker', id: 'ticker' }, S.activity.slice(0, 6).map((e) => h('div', {}, `${when(e.ts)} · ${e.bot || 'someone'} ${e.kind === 'read' ? 'read' : 'wrote'} "${e.title || 'a note'}"`))), h('p', { class: 'muted', style: 'font-size:12px' }, 'Neurons light up when an agent reads or writes a note.'));
  function noteSide(n) {
    if (!n) return h('div', {}, h('p', { class: 'muted' }, 'Click a neuron to preview its note.'), activityBlock());
    const kv = (k, v) => h('div', { class: 'kv' }, h('span', { class: 'muted' }, k), h('span', {}, v)), out = (n.links || []).map((t) => S.notes.find((x) => x.title === t) || { title: t, missing: true });
    return h('div', {}, h('h2', {}, n.title), h('div', { class: 'row2', style: 'margin-bottom:8px' }, h('span', { class: 'chip' }, n.kind), h('span', { class: 'chip ' + (n.status === 'verified' ? 'ok' : n.status === 'rejected' ? 'warn' : '') }, n.status), h('span', { class: 'chip' }, n.space)),
      h('div', { class: 'notebody', style: 'max-height:200px;overflow:auto' }, n.body.slice(0, 700)), h('div', { class: 'row2', style: 'margin:8px 0' }, btn('Open note', () => { S.graph = false; render(); }, 'btn primary')),
      kv('Owner', n.owner), kv('Source', n.source), h('h2', {}, `Links (${out.length})`), out.length ? out.map((o) => h('div', {}, o.missing ? h('span', { class: 'muted' }, o.title) : btn(o.title, () => selectNode(o.id), 'link'))) : h('p', { class: 'muted' }, 'No outgoing links.'),
      h('h2', {}, `Linked from (${(n.backlinks || []).length})`), (n.backlinks || []).length ? n.backlinks.map((t) => { const x = S.notes.find((y) => y.title === t); return h('div', {}, x ? btn(t, () => selectNode(x.id), 'link') : t); }) : h('p', { class: 'muted' }, 'Nothing links here yet.'),
      h('h2', {}, 'Local graph'), h('div', { class: 'gwrap' }, localGraph(n)), activityBlock());
  }
  async function selectNode(id) {
    try { S.note = await api('/api/brain/notes/' + id); S.versions = await api(`/api/brain/notes/${id}/versions`); S.edit = false; const el = document.getElementById('brain-side'); if (el) el.replaceChildren(noteSide(S.note)); }
    catch (e) { S.err = e.message; render(); }
  }
  async function uploadFile(file) {
    if (!file) return;
    if (file.size > 1500000) { S.err = 'That file is too large (max 1.5 MB).'; return render(); }
    await run(async () => {
      const buf = new Uint8Array(await file.arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const r = await api('/api/brain/upload', { method: 'POST', body: { filename: file.name, content_b64: btoa(bin) } });
      await loadNotes(); S.info = `Imported ${file.name} as ${r.parts} draft part(s). Drafts are not used by agents until an admin verifies them.`; await openNote(r.parent_id, true);
    });
  }
  function pickFile() { const inp = h('input', { type: 'file', accept: '.md,.txt,.csv,.json,.pdf' }); inp.addEventListener('change', () => uploadFile(inp.files[0])); inp.click(); }
  function brainView() {
    const q = h('input', { class: 'field', placeholder: 'Search notes', value: S.q, 'aria-label': 'Search notes' });
    q.addEventListener('input', () => { S.q = q.value; const pos = q.selectionStart; render(); const el = document.querySelector('input[aria-label="Search notes"]'); if (el) { el.focus(); el.setSelectionRange(pos, pos); } });
    let list = S.notes.filter((n) => (!S.q || (n.title + n.preview).toLowerCase().includes(S.q.toLowerCase())) && (!S.filter || n.status === S.filter) && (!S.space || n.space === S.space) && (!S.kindFilter || n.kind === S.kindFilter));
    if (S.orphans) list = list.filter((n) => !(n.links || []).length && !(n.backlinks_count || 0));
    if (S.sortBy === 'title') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    else if (S.sortBy === 'links') list = [...list].sort((a, b) => ((b.links || []).length + (b.backlinks_count || 0)) - ((a.links || []).length + (a.backlinks_count || 0)));
    const kindChips = ['', 'note', 'fact', 'decision', 'rule', 'hypothesis'].map((k) => btn(k || 'All', () => { S.kindFilter = k; render(); }, 'chip' + (S.kindFilter === k ? ' ok' : ''), { 'aria-pressed': (S.kindFilter || '') === k }));
    const sortSel = h('select', { class: 'field', style: 'width:auto;font-size:12px', 'aria-label': 'Sort notes', onchange: (e) => { S.sortBy = e.target.value; render(); } },
      [['', 'Recently changed'], ['title', 'Title A-Z'], ['links', 'Most links']].map(([v, l]) => h('option', { value: v, selected: (S.sortBy || '') === v }, l)));
    const tree = h('div', { class: 'tree' }, [...new Set(list.map((n) => n.space))].sort().map((sp) => h('details', { open: true }, h('summary', {}, `${sp} (${list.filter((n) => n.space === sp).length})`),
      list.filter((n) => n.space === sp).map((n) => { const lc = (n.links || []).length + (n.backlinks_count || 0);
        return h('button', { type: 'button', class: 'it', 'aria-current': S.note && S.note.id === n.id ? 'true' : false, onclick: () => (S.graph ? selectNode(n.id) : openNote(n.id)) },
          h('span', { class: 'dot', style: 'background:' + (KIND_COLOR[n.kind] || '#7C8BA5') }),
          icon(KIND[n.kind] || 'doc', 16), h('span', { style: 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, n.title),
          lc ? h('span', { class: 'muted', style: 'font-size:10px;flex:none' }, lc + ' lnk') : null, n.status !== 'verified' ? h('span', { class: 'chip' }, n.status) : null); }))));
    const drop = h('div', { class: 'drop' }, icon('doc', 18), h('span', { style: 'flex:1' }, 'Drop a file or ', btn('upload', pickFile, 'link')), h('small', { class: 'muted' }, '.md .txt .csv .json .pdf'));
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); }); drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); uploadFile(e.dataTransfer.files[0]); });
    const left = h('div', {}, h('div', { class: 'row2', style: 'margin-bottom:8px' }, btn([icon('plus', 16), 'Note'], () => { S.newNote = true; S.graph = false; render(); }), btn([icon('graph', 16), S.graph ? 'Notes' : 'Neurons'], () => { S.graph = !S.graph; S.newNote = false; render(); })), drop,
      h('div', { style: 'height:8px' }), q, h('div', { class: 'row2', style: 'margin:8px 0' }, ['', 'draft', 'verified'].map((f) => btn(f || 'All', () => { S.filter = f; render(); }, 'chip' + (S.filter === f ? ' ok' : ''), { 'aria-pressed': S.filter === f })), S.space ? btn(`space: ${S.space} ×`, () => { S.space = ''; render(); }, 'chip ok') : null),
      h('div', { class: 'row2', style: 'margin:6px 0;flex-wrap:wrap' }, kindChips, btn(S.orphans ? 'Orphans on' : 'Orphans', () => { S.orphans = !S.orphans; render(); }, 'chip' + (S.orphans ? ' ok' : ''), { 'aria-pressed': !!S.orphans }), sortSel),
      list.length ? tree : (S.notes.length ? h('div', { class: 'empty' }, h('p', { class: 'muted' }, 'No note matches the current filters.'), btn('Reset filters', () => { S.kindFilter = ''; S.filter = ''; S.orphans = false; S.space = ''; S.q = ''; S.sortBy = ''; render(); }, 'btn')) : h('p', { class: 'muted' }, 'No notes yet.')));
    let mid; const n = S.note;
    if (!S.notes.length && !S.newNote) {
      mid = h('div', { class: 'card empty-card' }, h('h2', {}, 'Your Brain is empty'), h('p', { class: 'muted' }, 'The Brain is a network of notes that agents read from and write to. Every note an agent writes arrives as a draft you verify. Start with sample data, a file, or your own note.'),
        h('div', { class: 'row2' }, btn('Load demo workspace', loadDemo, 'btn primary'), btn('Upload a file', pickFile), btn('New note', () => { S.newNote = true; render(); })));
    } else if (S.newNote) {
      const t = h('input', { class: 'field', placeholder: 'Title' }), b = h('textarea', { class: 'field', rows: 10, placeholder: 'Markdown. Link notes with [[Other note]].' }), k = h('select', { class: 'field', style: 'width:auto' }, ['note', 'fact', 'decision', 'rule', 'hypothesis'].map((x) => h('option', {}, x)));
      mid = h('div', {}, h('h2', {}, 'New note'), t, h('div', { style: 'height:8px' }), b, h('div', { class: 'row2', style: 'margin-top:8px' }, k, btn('Save note', () => run(async () => { const r = await api('/api/brain/notes', { method: 'POST', body: { title: t.value, body: b.value, kind: k.value } }); await loadNotes(); S.newNote = false; await openNote(r.id, true); }), 'btn primary')));
    } else if (S.graph) {
      const sel = h('select', { class: 'field', style: 'width:auto', 'aria-label': 'Whose brain', onchange: (e) => { S.graphAgent = e.target.value; render(); } }, h('option', { value: '' }, 'All agents and people'), S.bots.map((b) => h('option', { value: b.id, selected: S.graphAgent === b.id }, `Brain of ${b.name}`)));
      const stSel = h('select', { class: 'field', style: 'width:auto', 'aria-label': 'Status filter', onchange: (e) => { S.gStatus = e.target.value; render(); } }, [['', 'All statuses'], ['verified', 'Verified'], ['draft', 'Drafts']].map(([v, l]) => h('option', { value: v, selected: S.gStatus === v }, l)));
      const spaces = [...new Set(S.notes.map((x) => x.space))];
      const spSel = h('select', { class: 'field', style: 'width:auto', 'aria-label': 'Space filter', onchange: (e) => { S.gSpace = e.target.value; render(); } }, [['', 'All spaces'], ...spaces.map((x) => [x, x])].map(([v, l]) => h('option', { value: v, selected: S.gSpace === v }, l)));
      const zoom = (d) => { S.gzoom = Math.max(0.5, Math.min(2, (S.gzoom || 1) + d)); render(); };
      const zbtns = h('div', { class: 'row2', style: 'width:auto' }, btn('−', () => zoom(-0.2), 'chip', { 'aria-label': 'Zoom out' }), btn('+', () => zoom(0.2), 'chip', { 'aria-label': 'Zoom in' }));
      mid = h('div', {}, h('h2', {}, 'Live brain'), h('div', { class: 'row2', style: 'margin-bottom:8px' }, sel, stSel, spSel, zbtns, h('span', { class: 'muted', id: 'gcap' }, '')),
        h('div', { class: 'legend' }, h('span', {}, 'Filled = verified, hollow = draft'), h('span', {}, 'Color = the agent that wrote it'), h('span', {}, 'Drag a neuron. A halo means an agent just read or wrote it.')), bigGraph());
    } else if (n) {
      const flagged = n.flags.includes('instruction_like') && !n.flags.includes('acknowledged'), ta = h('textarea', { class: 'field', rows: 10 }); ta.value = n.body;
      const reload = async () => { S.versions = await api(`/api/brain/notes/${n.id}/versions`); await loadNotes(); };
      mid = h('div', {}, h('h2', {}, n.title), h('div', { class: 'row2', style: 'margin-bottom:10px' }, h('span', { class: 'chip' }, n.kind), h('span', { class: 'chip ' + (n.status === 'verified' ? 'ok' : n.status === 'rejected' ? 'warn' : '') }, n.status), btn('space: ' + n.space, () => { S.space = n.space; render(); }, 'chip'), flagged ? h('span', { class: 'chip warn' }, 'instruction-like text') : null),
        S.edit ? [ta, h('div', { class: 'row2', style: 'margin-top:8px' }, btn('Save edit', () => run(async () => { S.note = await api('/api/brain/notes/' + n.id, { method: 'PUT', body: { body: ta.value } }); await reload(); S.edit = false; }), 'btn primary'), btn('Cancel', () => { S.edit = false; render(); }))] : md(n.body),
        flagged ? h('p', { class: 'muted' }, 'Instruction-like text can steer agents. This note stays out of prompts until an admin reviews and acknowledges it.') : null,
        n.status === 'draft' ? h('p', { class: 'muted' }, 'Drafts are never used in agent prompts until an admin verifies them.') : null,
        h('div', { class: 'row2', style: 'margin-top:12px' }, S.edit ? null : btn('Edit', () => { S.edit = true; render(); }),
          n.status === 'draft' || flagged ? btn(flagged ? 'Review and acknowledge' : 'Verify', () => run(async () => { S.note = await api(`/api/brain/notes/${n.id}/verify` + (flagged ? '?acknowledge=true' : ''), { method: 'POST' }); await reload(); }), 'btn primary') : null,
          n.status === 'draft' ? btn('Reject', () => run(async () => { S.note = await api(`/api/brain/notes/${n.id}/reject`, { method: 'POST' }); await reload(); })) : null),
        h('div', { class: 'row2', style: 'flex-wrap:wrap;margin-top:14px' },
          h('span', { class: 'chip', style: 'background:' + (KIND_COLOR[n.kind] || '#2F5BD3') + ';color:#fff' }, n.kind),
          (n.links || []).map((l) => { const x = S.notes.find((y) => y.title === l); return x ? btn('-> ' + l, () => openNote(x.id), 'chip') : h('span', { class: 'chip muted' }, '-> ' + l + ' (missing)'); }),
          (n.backlinks || []).map((l) => { const x = S.notes.find((y) => y.title === l); return x ? btn('<- ' + l, () => openNote(x.id), 'chip') : h('span', { class: 'chip muted' }, '<- ' + l); })),
        ...((n.backlink_details || []).length ? [h('b', {}, 'Backlinks with context')].concat(n.backlink_details.map((b) => h('div', { class: 'card', style: 'padding:10px;margin:6px 0' }, h('b', {}, b.title), h('p', { class: 'muted', style: 'margin:4px 0 0;font-size:12px' }, '...' + b.snippet + '...')))) : []),
        h('details', { style: 'margin-top:20px' }, h('summary', { class: 'muted' }, `Version history (${S.versions.length})`), S.versions.map((v) => h('div', { class: 'card', style: 'margin:8px 0' }, h('span', { class: 'mono' }, `v${v.version} · ${when(v.created_at)} · ${v.actor} · ${v.reason} · ${v.status}`), h('div', { class: 'muted' }, v.body.slice(0, 120)),
          btn('Roll back to this version', () => run(async () => { S.note = await api(`/api/brain/notes/${n.id}/rollback`, { method: 'POST', body: { version: v.version } }); await reload(); }), 'link')))));
    } else mid = S.notes.length ? h('p', { class: 'muted' }, 'Select a note.') : emptyState('graph', 'Your Brain is empty', 'Create notes or load the demo workspace to see the agents memory.', btn([icon('plus', 16), 'New note'], () => { S.newNote = true; render(); }, 'btn primary'));
    return h('div', { class: 'brain' }, left, h('div', {}, mid), h('div', { id: 'brain-side' }, noteSide(S.note)));
  }

  // ---------- research ----------
  const bars = (c) => { const max = Math.max(...c.values, 1); return h('div', {}, h('div', { class: 'muted', style: 'margin-bottom:6px' }, c.title), c.labels.map((l, i) => h('div', { class: 'bar-row' }, h('span', {}, l), h('span', {}, h('i', { style: `width:${Math.max(2, (c.values[i] / max) * 100)}%` })), h('span', { class: 'mono' }, String(c.values[i]))))); };
  async function startResearch() {
    S.rs = { activity: [], sources: [], questions: [], report: null, running: true, done: [], prog: { done: 0, total: 1 }, agent: null }; render();
    try { await stream('/api/research/stream', { question: S.rq, depth: S.rdepth, web: !!(S.rweb && (S.ssearch ? S.ssearch.configured : S.health.search_configured)), context: S.rctx }, (ev) => { const r = S.rs;
      if (ev.type === 'agent') r.agent = ev.agent; else if (ev.type === 'progress') r.prog = { done: ev.done, total: ev.total }; else if (ev.type === 'plan') { r.questions = ev.questions; r.qfound = {}; r.activity.push(`Planned ${ev.questions.length} sub-questions`); } else if (ev.type === 'activity') r.activity.push(ev.text); else if (ev.type === 'source') { r.sources.push(ev); r.cur = ev; r.activity.push(`Read source [${ev.n}] ${ev.title.slice(0, 60)}`); }
      else if (ev.type === 'search') { r.done.push(ev.index); r.qfound = r.qfound || {}; r.qfound[ev.index] = ev.found; r.qtext = r.qtext || {}; r.qtext[ev.index] = ev.question; r.activity.push(`Searched: ${ev.question.slice(0, 70)} (${ev.found} new source(s))`); } else if (ev.type === 'done') { r.report = ev.report; r.id = ev.id; r.mode = ev.mode; } else if (ev.type === 'error') S.err = ev.detail; render(); }); }
    catch (e) { S.err = e.message; }
    if (S.rs) S.rs.running = false; try { S.rlist = await api('/api/research'); } catch {} render();
  }
  const applyMode = (m, subject) => {
    const s = (subject || '').trim();
    if (!s) return m.q.replace(/<[^>]+>/g, '');
    return m.q.replace(/<[^>]+>/g, s);
  };
  const RESEARCH_MODES = [
    { id: 'company', title: 'Company research', icon: 'compass', depth: 'standard', desc: 'News, launches, hires and funding for one company',
      q: 'Research the latest news about <company>: product launches, new hires and funding deals in the last 12 months. Focus on facts with dates and sources.' },
    { id: 'market', title: 'Market & financials', icon: 'chart', depth: 'thorough', desc: 'Market position, pricing models and financial signals',
      q: 'Analyse the market for <segment>: key players, pricing models, positioning and financial signals. Compare at least three vendors and cite every number.' },
    { id: 'compliance', title: 'Compliance screening', icon: 'shield', depth: 'thorough', desc: 'Ownership, background and adverse media',
      q: 'Screen <company> for ownership structure, business background and adverse media. List open questions and mark anything that needs a human review.' },
    { id: 'sales', title: 'Sales meeting prep', icon: 'chat', depth: 'quick', desc: 'Meeting brief and talking points from current news',
      q: 'Prepare a meeting brief for <company>: latest news, likely priorities and three talking points for <our offering>. Flag what is uncertain.' },
    { id: 'supply', title: 'Supply chain risk', icon: 'table', depth: 'standard', desc: 'Supplier risks and disruption signals',
      q: 'Identify supplier risks and potential disruptions for <product or category>: dependencies, single points of failure and recent incidents.' },
    { id: 'underwriting', title: 'Underwriting research', icon: 'lens', depth: 'thorough', desc: 'Operations, industry and risk signals',
      q: 'Describe the operations, industry and risk signals of <business> for an underwriting decision. Separate evidence from assumptions.' },
  ];
  function researchView() {
    const q = h('textarea', { class: 'field', rows: 2, maxlength: 1000, 'aria-label': 'Research question', placeholder: 'What do you want to find out?' }); q.value = S.rq;
    const cx = h('textarea', { class: 'field', rows: 2, maxlength: 2000, 'aria-label': 'Context and constraints', placeholder: 'Context for the agents (optional): who it is for, what to focus on, what to ignore.' }); cx.value = S.rctx;
    cx.addEventListener('input', () => { S.rctx = cx.value; });
    const chip = (label, on, f, dis) => h('button', { type: 'button', class: 'chip' + (on ? ' ok' : ''), 'aria-pressed': on, disabled: !!dis, onclick: f }, label);
    const DEPTHS = [['quick', 'Quick', '3 sub-questions, fast scan'], ['standard', 'Standard', '6 sub-questions, balanced depth'], ['thorough', 'Thorough', '9 sub-questions, deepest coverage']];
    const depthChips = DEPTHS.map(([v, l, d]) => h('button', { type: 'button', class: 'depth-card' + (S.rdepth === v ? ' on' : ''), 'aria-pressed': S.rdepth === v, onclick: () => { S.rdepth = v; render(); } }, h('b', {}, l), h('span', { class: 'muted' }, d)));
    const webReady = !!(S.ssearch ? S.ssearch.configured : S.health.search_configured);
    if (S.rweb === undefined || S.rweb === null) S.rweb = webReady;  // default: use the web when a key is configured
    const r = S.rs, rep = r && r.report;
    const srcKinds = () => { const k = { brain: 0, web: 0, other: 0 }; (r ? r.sources : []).forEach((s) => { k[s.kind === 'brain' ? 'brain' : s.kind === 'web' ? 'web' : 'other'] += 1; }); return k; };
    const kindDonut = () => {
      const k = srcKinds(), tot = k.brain + k.web + k.other || 1, s = svg(150, 150), cx = 75, cy = 75, rr = 60;
      const parts = [['brain', '#2F5BD3'], ['web', '#1B7F79'], ['other', '#7C8BA5']];
      let ang = -Math.PI / 2;
      parts.forEach(([key, color]) => {
        const a = (k[key] / tot) * 2 * Math.PI;
        const x1 = cx + rr * Math.cos(ang), y1 = cy + rr * Math.sin(ang), x2 = cx + rr * Math.cos(ang + a), y2 = cy + rr * Math.sin(ang + a);
        if (k[key]) sadd(s, 'path', { d: `M ${cx} ${cy} L ${x1} ${y1} A ${rr} ${rr} 0 ${a > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`, fill: color });
        ang += a;
      });
      sadd(s, 'circle', { cx: cx, cy: cy, r: rr * 0.55, fill: 'var(--surface)' });
      sadd(s, 'text', { x: cx, y: cy + 4, 'text-anchor': 'middle', 'font-size': 12, fill: 'currentColor' }, String(tot));
      return s;
    };
    const perQuestionBars = () => {
      const qf = (r && r.qfound) || {}, entries = Object.keys(qf).sort((a, b) => +a - +b);
      const max = Math.max(1, ...entries.map((i) => qf[i]));
      return h('div', { style: 'display:flex;flex-direction:column;gap:6px' }, entries.length ? entries.map((i) => {
        const q = ((r.qtext || {})[i] || ('Question ' + (+i + 1)));
        return h('div', {}, h('div', { class: 'row2', style: 'align-items:baseline;gap:8px' }, h('span', { class: 'muted', style: 'font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, q), h('b', { style: 'font-size:12px' }, String(qf[i]))),
          h('div', { class: 'stance-bar' }, h('i', { style: 'width:' + Math.round((qf[i] / max) * 100) + '%;background:#2F5BD3' })));
      }) : h('p', { class: 'muted' }, 'No searches recorded yet.'));
    };
    const browserPanel = () => {
      const s = r && r.cur;
      return h('div', { class: 'card research-browser' },
        h('div', { class: 'row2' }, h('b', {}, 'Agent browser'), h('span', { class: 'chip' + (s ? ' ok' : '') }, s ? 'reading' : 'idle'), h('span', { class: 'sp' }),
          h('span', { class: 'muted mono', style: 'font-size:11px' }, s ? '[' + s.n + ']' : '')),
        h('div', { class: 'browser-bar' }, h('span', { class: 'browser-dots' }, h('i'), h('i'), h('i')),
          h('span', { class: 'browser-url mono' }, s ? String(s.ref).slice(0, 90) : 'about:blank')),
        h('div', { class: 'browser-page' }, s ? [h('b', {}, s.title), h('p', { class: 'muted', style: 'margin:6px 0 0;font-size:12px' }, String(s.snippet || '').slice(0, 260)),
          h('p', { class: 'muted', style: 'margin:6px 0 0;font-size:11px' }, 'kind: ' + s.kind + (s.kind === 'web' ? ' · live page' : ' · from your Brain'))] : h('p', { class: 'muted' }, 'The browser opens as soon as the agent reads the first source.')));
    };
    const sourceCard = (s) => h('div', { class: 'card', style: 'margin:6px 0;font-size:13px' },
      h('span', { class: 'chip' }, '[' + s.n + '] ' + s.kind), ' ',
      (s.kind === 'web' && /^https?:\/\//.test(s.ref))
        ? h('a', { class: 'link', href: s.ref, target: '_blank', rel: 'noopener noreferrer' }, s.title)
        : btn(s.title, () => openNote(s.ref), 'link'),
      h('div', { class: 'muted' }, String(s.snippet || '').slice(0, 120)),
      (s.kind === 'web' && /^https?:\/\//.test(s.ref))
        ? h('div', { style: 'margin-top:6px' }, btn('Snapshot (Internet Archive)', () => run(async () => {
            const snap = await api('/api/research/snapshot?url=' + encodeURIComponent(s.ref));
            S.info = snap.available ? 'Archive snapshot from ' + when(snap.timestamp) : snap.detail;
            if (snap.available && snap.snapshot) window.open(snap.snapshot, '_blank', 'noopener');
            render();
          }), 'link'))
        : null);
    const reportText = () => rep ? ('# ' + S.rq + '\n\n' + rep.markdown + '\n\n## Sources\n' + (rep.sources || []).map((s) => '[' + s.n + '] ' + s.title + ' - ' + s.ref).join('\n')) : '';
    const copyReport = () => { if (navigator.clipboard) navigator.clipboard.writeText(reportText()).then(() => { S.info = 'Report copied to the clipboard.'; render(); }); };
    const exportReport = () => { const b = new Blob([reportText()], { type: 'text/markdown' }); const a = h('a', { href: URL.createObjectURL(b), download: 'research-report.md' }); document.body.append(a); a.click(); a.remove(); };
    const rbtn = btn([icon('lens', 16), r && r.running ? 'Researching…' : 'Start research'], () => {
      const qv = (S.rq || '').trim();
      if (qv.length < 3) { S.err = 'Type at least 3 characters as the research question.'; render(); return; }
      S.err = '';
      startResearch();
    }, 'btn primary', { disabled: !!(r && r.running), title: 'Plans sub-questions and writes a cited report' });
    const qhint = h('div', { class: 'muted', style: 'font-size:11px;margin-top:4px' }, (S.rq || '').trim().length + ' / 1000 characters - at least 3 needed to start');
    requestAnimationFrame(() => {
      const sub = document.getElementById('rsub');
      if (sub && !sub._bound) {
        sub._bound = true;
        sub.addEventListener('input', () => {
          S.rsub = sub.value;
          const m = RESEARCH_MODES.find((x) => x.id === S.rmode);
          if (m) { S.rq = applyMode(m, sub.value); q.value = S.rq; qhint.textContent = S.rq.trim().length + ' / 1000 characters - at least 3 needed to start'; }
        });
      }
    });
    q.addEventListener('input', () => { S.rq = q.value; rbtn.disabled = !!(S.rs && S.rs.running); qhint.textContent = q.value.trim().length + ' / 1000 characters - at least 3 needed to start'; });
    const cite = (t) => t.split(/(\[\d+\])/).map((p) => { const m = p.match(/^\[(\d+)\]$/); if (!m) return p; const s = (rep ? rep.sources : r.sources).find((x) => x.n === +m[1]); return !s ? p : s.kind === 'brain' ? btn(p, () => openNote(s.ref), 'wl') : /^https?:\/\//.test(s.ref) ? h('a', { class: 'wl', href: s.ref, target: '_blank', rel: 'noopener noreferrer' }, p) : p; });
    return h('div', { class: 'body' }, h('div', { class: 'wide' }, h('h2', {}, 'Deep research'),
      h('p', { class: 'muted' }, 'Plans sub-questions, searches your Brain' + (S.health.search_configured ? ' and the web' : '') + ', and writes a report with numbered citations and a chart. Without a model the report is extractive: it quotes sources and adds no generated claims.'),
      h('div', { class: 'mode-grid' }, RESEARCH_MODES.map((m) => h('button', {
          type: 'button', class: 'mode-card' + (S.rmode === m.id ? ' on' : ''), 'aria-pressed': S.rmode === m.id,
          onclick: () => { S.rmode = m.id; S.rsub = ''; S.rq = applyMode(m, ''); S.rdepth = m.depth || S.rdepth; render(); },
        }, h('span', { class: 'row2' }, icon(m.icon, 16), h('b', {}, m.title)), h('span', { class: 'muted' }, m.desc)))),
      S.rmode ? h('div', { class: 'row2', style: 'margin:6px 0 0;flex-wrap:wrap' },
        h('input', { class: 'field', id: 'rsub', style: 'max-width:320px', placeholder: 'Subject: company, segment or product',
          value: S.rsub || '', 'aria-label': 'Template subject' }),
        btn('Clear template', () => { S.rmode = null; S.rsub = ''; S.rq = ''; render(); }, 'link')) : null,
      h('div', { class: 'rbox' }, q, qhint, cx), h('div', { class: 'row2', style: 'margin:10px 0;flex-wrap:wrap' }, depthChips,
        chip((S.rweb && webReady ? 'Web: on - ' + (S.ssearch ? S.ssearch.provider : 'search') : 'Web: off'), S.rweb && webReady, () => { if (!webReady) { openSettings('search'); return; } S.rweb = !S.rweb; render(); }, false),
        webReady ? null : h('span', { class: 'muted', style: 'font-size:12px' }, 'No search key in this running instance - set CFA_SEARCH_API_KEY and redeploy, then check Settings > Search > Test key. ',
          btn('Open settings', () => openSettings('search'), 'link')), h('span', { class: 'sp' }), rbtn),
      r ? h('div', { class: 'room' }, h('div', {},
        r.running ? h('div', { class: 'card research-run' },
          h('div', { class: 'row2' }, h('b', {}, 'Research in progress'), h('span', { class: 'chip warn' }, r.agent ? r.agent.name : 'planning'), h('span', { class: 'sp' }),
            h('span', { class: 'muted mono' }, (r.prog ? r.prog.done : 0) + ' / ' + (r.prog ? r.prog.total : 1))),
          h('div', { class: 'progress' }, h('i', { style: 'width:' + Math.round(((r.prog ? r.prog.done : 0) / Math.max(1, r.prog ? r.prog.total : 1)) * 100) + '%' })),
          h('div', { class: 'feed', style: 'margin-top:8px' }, [...(r.activity || [])].reverse().slice(0, 6).map((a) => h('div', {}, '· ' + a)))) : null,
        browserPanel(),
        (r.sources || []).length ? h('div', { class: 'cards', style: 'margin:12px 0' },
          h('div', { class: 'card', style: 'padding:12px' }, h('b', {}, 'Evidence mix'), h('div', { class: 'row2', style: 'align-items:center' }, kindDonut(),
            h('div', {}, [['brain', 'Brain notes', '#2F5BD3'], ['web', 'Web pages', '#1B7F79'], ['other', 'Other', '#7C8BA5']].map(([k, l, c]) => h('div', { class: 'muted', style: 'font-size:12px;display:flex;gap:6px;align-items:center' }, h('span', { style: 'width:8px;height:8px;border-radius:50%;background:' + c }), l + ': ' + srcKinds()[k]))))),
          h('div', { class: 'card', style: 'padding:12px' }, h('b', {}, 'Sources per sub-question'), perQuestionBars())) : null,
        r.questions.length ? [h('h2', {}, 'Plan'), h('ul', { class: 'steps', style: 'padding:0' }, r.questions.map((x, i) => h('li', {}, icon(r.done.includes(i) ? 'check' : 'search', 16), x)))] : null,
        rep ? [h('div', { class: 'card research-head' },
          h('div', { class: 'row2' }, h('span', { class: 'chip ok' }, 'Report'), h('span', { class: 'chip' }, rep.mode || r.mode || 'demo'),
            h('span', { class: 'muted' }, (rep.sources || []).length + ' sources'), h('span', { class: 'sp' }),
            r.id ? h('span', { class: 'muted mono', style: 'font-size:11px' }, 'run ' + String(r.id).slice(0, 8)) : null),
          h('p', { class: 'muted', style: 'margin:8px 0 0' }, S.rq)),
          h('h2', {}, 'Report'), h('div', { class: 'notebody' }, md(rep.markdown, cite)), h('h2', {}, 'Chart'), bars(rep.chart),
          h('div', { class: 'row2', style: 'margin-top:12px;flex-wrap:wrap' }, btn('Save to Brain as draft', () => run(async () => { const d = await api(`/api/research/${r.id}/save`, { method: 'POST' }); S.info = `Saved as draft: ${d.title}`; }), 'btn primary'),
            btn('Copy report', copyReport, 'btn'), btn('Export .md', exportReport, 'btn'))] : null),
        h('div', {}, researchMonitor(r, rep), h('h2', {}, `Sources (${(rep ? rep.sources : r.sources).length})`),
          (rep ? rep.sources : r.sources).map(sourceCard))) : null,
      S.rlist.length && !r ? [h('h2', {}, 'Previous research'), S.rlist.map((x) => h('div', {}, btn(x.question, () => run(async () => { const d = await api('/api/research/' + x.id); S.rs = { activity: [], sources: d.sources, questions: d.questions, report: d, running: false, done: d.questions.map((_, i) => i), id: d.id }; }), 'link'), h('span', { class: 'muted mono' }, ` ${when(x.created_at)} ${x.mode}`)))] : null));
  }

  // ---------- teams, inventory, marketplace ----------
  const picked = (boxes) => boxes.map((l) => l.firstChild).filter((i) => i.checked).map((i) => i.value);
  async function openChannels(t, cid) {
    if (S.cstream) { S.cstream.ctrl.abort(); S.cstream = null; }
    const list = await api(`/api/teams/${t.id}/channels`), ch = list.find((c) => c.id === cid) || list[0];
    S.chans[t.id] = list; S.chan = { team: t, ch }; S.cmsgs = await api(`/api/channels/${ch.id}/messages`);
    setSeenN(ch.id, (list.find((c) => c.id === ch.id) || {}).messages || 0);
    startChannelStream();
  }
  function startChannelStream() {
    if (!S.chan) return;
    const ch = S.chan.ch, team = S.chan.team;
    const ctrl = new AbortController();
    S.cstream = { ch: ch.id, ctrl };
    const known = new Set((S.cmsgs || []).map((m) => m.id));
    const loop = async () => {
      while (!ctrl.signal.aborted) {
        try {
          await streamGet(`/api/channels/${ch.id}/stream`, ctrl.signal, (ev) => {
            const fresh = ((ev && ev.messages) || []).filter((m) => !known.has(m.id));
            fresh.forEach((m) => known.add(m.id));
            if (!fresh.length || !S.chan || S.chan.ch.id !== ch.id) return;
            S.cmsgs = [...(S.cmsgs || []), ...fresh];
            const row = (S.chans[team.id] || []).find((c) => c.id === ch.id);
            if (row) { row.messages = (row.messages || 0) + fresh.length; row.last = fresh[fresh.length - 1].created_at; }
            setSeenN(ch.id, (S.cmsgs || []).length);
            render();
          });
        } catch {}
        if (ctrl.signal.aborted) break;
        await new Promise((r) => setTimeout(r, 1500));
      }
    };
    loop();
  }
  function channelPanel() {
    const { team, ch } = S.chan, list = S.chans[team.id] || [], inp = h('input', { class: 'field', placeholder: `Message #${ch.name}. Mention an agent with @Name`, maxlength: 2000, value: S.cdraft, 'aria-label': 'Channel message' });
    inp.addEventListener('input', () => { S.cdraft = inp.value; });
    const send = () => { const text = S.cdraft.trim(); if (!text || S.cbusy) return; S.cthink = team.members.filter((m) => text.toLowerCase().includes('@' + m.name.toLowerCase())).map((m) => m.id); S.cbusy = true; S.cdraft = ''; render();
      run(async () => { try { await api(`/api/channels/${ch.id}/messages`, { method: 'POST', body: { content: text } }); S.cmsgs = await api(`/api/channels/${ch.id}/messages`); S.chans[team.id] = await api(`/api/teams/${team.id}/channels`); } finally { S.cbusy = false; S.cthink = []; } }); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    const nn = h('input', { class: 'field', style: 'max-width:180px', placeholder: 'new-channel', maxlength: 30, 'aria-label': 'New channel name' });
    const bot = (id) => team.members.find((m) => m.id === id) || S.bots.find((b) => b.id === id);
    return h('div', { class: 'card chan' }, h('div', { class: 'row2' }, h('span', { class: 'tile', style: 'width:30px;height:30px;background:' + (team.color || '#2F5BD3') + ';color:#fff' }, icon(team.icon || 'teams', 16)), h('b', { style: 'flex:1' }, `${team.name} channels`), btn('Close', () => { if (S.cstream) { S.cstream.ctrl.abort(); S.cstream = null; } S.chan = null; render(); }, 'link')),
      h('div', { class: 'row2', style: 'flex-wrap:wrap;margin:8px 0' }, list.map((c) => { const u = c.id === ch.id ? 0 : unreadOf(c); return btn('# ' + c.name + (u ? ' · ' + u : ''), () => run(() => openChannels(team, c.id)), 'chip' + (c.id === ch.id ? ' ok' : ''), { 'aria-pressed': c.id === ch.id }); }), nn,
        btn('Add', () => run(async () => { await api(`/api/teams/${team.id}/channels`, { method: 'POST', body: { name: nn.value.trim() } }); await openChannels(team); }), 'btn')),
      h('div', { class: 'muted', style: 'font-size:12px;margin-bottom:6px' }, ch.topic || 'Agents only answer when you @mention them, and only from notes in their own spaces.'),
      h('div', { class: 'cmsgs', role: 'log', 'aria-live': 'polite' }, S.cmsgs.length ? S.cmsgs.map((m) => h('div', { class: 'cmsg ' + m.author_kind }, m.author_kind === 'agent' ? tile(bot(m.author_id) || { id: m.author_id, name: m.author_name }, 28) : h('span', { class: 'cdot' }),
        h('div', { style: 'min-width:0' }, h('div', { class: 'row2' }, h('b', {}, m.author_name), m.author_kind === 'agent' ? h('span', { class: 'chip ' + (m.mode === 'live' ? 'ok' : 'warn') }, m.mode) : null, h('span', { class: 'muted mono', style: 'font-size:11px' }, when(m.created_at))), h('div', { class: 'ctext' }, m.content)))) : h('p', { class: 'muted' }, 'No messages yet.'),
        S.cbusy ? h('div', { class: 'cmsg agent' }, (S.cthink || []).map((id) => tile(bot(id), 28, { thinking: true })), h('span', { class: 'muted' }, (S.cthink || []).length ? 'is answering…' : 'sending…')) : null),
      h('div', { class: 'row2', style: 'margin-top:8px' }, inp, btn('Send', send, 'btn primary', { disabled: !!S.cbusy })));
  }
  function teamsView() {
    const avatarStack = (t) => {
      const ms = t.members || [], extra = ms.length - 5;
      return h('div', { class: 'tm-stack', title: ms.length ? ms.map((m) => m.name).join(', ') : 'No members yet' },
        ms.slice(0, 5).map((m) => tile(m, 24)),
        extra > 0 ? h('span', { class: 'tm-more', title: `${extra} more member${extra === 1 ? '' : 's'}` }, '+' + extra) : null);
    };
    const teamCard = (t) => {
      const members = t.members || [], chanCount = S.chanCounts && S.chanCounts[t.id];
      return h('div', { class: 'card appcard tm-card' },
        h('div', { class: 'tm-card-top' },
          h('span', { class: 'tile', style: 'width:38px;height:38px;background:' + (t.color || '#2F5BD3') + ';color:#fff' }, icon(t.icon || 'teams', 20)),
          h('b', { class: 'tm-name', title: t.name }, t.name),
          h('span', { class: 'chip' }, t.space)),
        h('p', { class: 'tm-mission', title: t.mission || 'No mission set' }, t.mission || 'No mission set'),
        h('div', { class: 'tm-meta' }, avatarStack(t), h('span', {}, `${members.length} member${members.length === 1 ? '' : 's'}`), h('span', {}, '·'), h('span', {}, `${t.notes} note${t.notes === 1 ? '' : 's'}`),
          chanCount ? h('span', { class: 'badge', title: 'Unread channel messages' }, String(chanCount)) : null),
        h('div', { class: 'tm-actions' },
          btn('Channels', () => run(() => openChannels(t)), 'btn'),
          btn([icon('council', 16), 'Start council'], () => { S.picked = new Set(members.map((m) => m.id).filter((id) => id !== 'chair')); S.topic = ''; go('council'); }, 'btn primary'),
          btn('Open team brain', () => { S.space = t.space; S.note = null; go('brain'); }),
          btn([icon('pen', 16), 'Edit'], () => openTeamModal(t.id), 'btn', { 'aria-label': 'Edit team ' + t.name })));
    };
    return h('div', { class: 'body' }, h('div', { class: 'wide' },
      h('div', { class: 'tm-head' },
        h('div', { class: 'tm-headtext' }, h('h2', {}, 'Teams'), h('p', { class: 'muted' }, 'A team is a unit with its own shared memory space. Members can read it, other agents cannot. Start a council call with a whole team.')),
        btn([icon('plus', 16), 'New team'], () => openTeamModal(null), 'btn primary', { 'aria-label': 'New team' })),
      S.chan ? channelPanel() : null,
      S.teams.length ? h('div', { class: 'cards tm-cards' }, S.teams.map(teamCard)) : emptyState('teams', 'No teams yet', 'A team is a unit with its own memory. Create one or load the demo workspace.', h('div', { class: 'row2', style: 'justify-content:center' }, btn([icon('plus', 16), 'New team'], () => openTeamModal(null), 'btn primary'), btn('Load demo workspace', loadDemo, 'btn')))));
  }
  function usageView() {
    const u = S.usage, budget = u.budget || {}, cap = budget.monthly_cap;
    const num = (n) => Number(n || 0).toLocaleString();
    const money = (v, c) => (v == null ? 'unknown' : `${v.toFixed(4)}${c ? ' ' + c : ''}`);
    const fmt = (n) => (n >= 100000 ? 'unlimited' : Number(n || 0).toLocaleString());
    const inp = (o, k, ph, type = 'text') => { const i = h('input', { class: 'field', type, placeholder: ph, 'aria-label': ph, value: o[k] || '', autocomplete: 'off' }); i.addEventListener('input', () => { o[k] = i.value; }); return i; };
    const reload = async () => { [S.usage, S.provs, S.prices] = await Promise.all([api('/api/usage'), api('/api/providers'), api('/api/prices')]); };
    // Plan limits live only on this screen, so billing is fetched lazily here instead of in the shared go() loader.
    if (!S.bill && !S.useBillLoading && !S.useBillErr) {
      S.useBillLoading = true;
      run(async () => {
        try { S.bill = await api('/api/billing'); }
        catch (e) { S.useBillErr = e.message || 'Plan limits could not be loaded.'; throw e; }
        finally { S.useBillLoading = false; }
      });
    }
    const models = u.models || [], kinds = Object.entries(u.by_kind || {}), daily = u.daily || [];
    const sum = (f) => models.reduce((a, m) => a + (f(m) || 0), 0);
    const totalCalls = sum((m) => m.calls), totalErrors = sum((m) => m.errors), tokensIn = sum((m) => m.tokens_in), tokensOut = sum((m) => m.tokens_out);
    const fallbacks = sum((m) => m.fallback_calls), unpriced = sum((m) => m.calls_with_unknown_cost);
    const latCalls = models.reduce((a, m) => a + (m.avg_latency_ms ? m.calls : 0), 0);
    const avgLatency = latCalls ? Math.round(models.reduce((a, m) => a + (m.avg_latency_ms || 0) * m.calls, 0) / latCalls) : 0;
    const priced = models.filter((m) => m.cost != null), currencies = [...new Set(priced.map((m) => m.currency || ''))];
    const knownCost = priced.reduce((a, m) => a + m.cost, 0);
    const costLabel = !priced.length ? 'unknown' : currencies.length > 1 ? 'mixed currencies' : `${knownCost.toFixed(4)}${currencies[0] ? ' ' + currencies[0] : ''}`;
    // The API's daily series only lists days that had calls; every other day in the window had none.
    const windowDays = u.days || 30, nowMs = Date.now(), byDay = {};
    daily.forEach((d) => { byDay[d.day] = d; });
    const series = [];
    for (let i = windowDays - 1; i >= 0; i -= 1) { const day = new Date(nowMs - i * 86400000).toISOString().slice(0, 10); series.push({ day, calls: byDay[day] ? byDay[day].calls : 0 }); }
    const peak = series.reduce((a, d) => (d.calls > a.calls ? d : a), { day: '', calls: 0 });
    const kindTotal = kinds.reduce((a, [, n]) => a + (n || 0), 0);
    const KIND_COLOR = { chat: '#2F5BD3', research: '#B5543C', channel: '#1B7F79', call: '#7A4E9C', council: '#B7791F', computer: '#1F6F8B' };
    const kindColor = (k) => KIND_COLOR[k] || '#7C8BA5';
    const tile = (k, v, s, warn) => h('div', { class: 'use-tile' + (warn ? ' warn' : '') }, h('span', { class: 'use-tile-k' }, k), h('span', { class: 'use-tile-v' }, v), s ? h('span', { class: 'use-tile-s' }, s) : null);
    const cardHead = (title, right) => h('div', { class: 'use-card-head' }, h('b', {}, title), right ? h('span', { class: 'muted use-small' }, right) : null);
    const uBars = () => {
      const W = 720, H = 210, L = 44, R = 10, T = 16, B = 34, plotW = W - L - R, plotH = H - T - B;
      const max = Math.max(1, peak.calls), s = svg(W, H), step = plotW / Math.max(series.length, 1);
      s.setAttribute('role', 'img');
      s.setAttribute('aria-label', `Calls per day over the last ${windowDays} days. ${num(totalCalls)} calls in total${peak.calls ? `, peak ${peak.calls} on ${peak.day}` : ''}.`);
      [0, 0.5, 1].forEach((f) => {
        const y = T + plotH - plotH * f;
        sadd(s, 'line', { x1: L, y1: y, x2: W - R, y2: y, stroke: 'currentColor', 'stroke-opacity': f === 0 ? '.32' : '.1' });
        if (peak.calls || f === 0) sadd(s, 'text', { x: L - 6, y: y + 3, 'text-anchor': 'end', 'font-size': 9, fill: 'currentColor', 'fill-opacity': '.65' }, String(Math.round(peak.calls * f)));
      });
      series.forEach((d, i) => {
        if (!d.calls) return;
        const hh = (d.calls / max) * plotH, gap = Math.min(4, step * 0.36);
        sadd(s, 'rect', { x: (L + i * step + gap / 2).toFixed(2), y: (T + plotH - hh).toFixed(2), width: Math.max(2, step - gap).toFixed(2), height: hh.toFixed(2), rx: Math.min(3, step / 3).toFixed(2), fill: '#2F5BD3', opacity: '.82' });
      });
      if (!peak.calls) sadd(s, 'text', { x: L + plotW / 2, y: T + plotH / 2, 'text-anchor': 'middle', 'font-size': 12, fill: 'currentColor', 'fill-opacity': '.6' }, 'No calls in this period yet.');
      sadd(s, 'text', { x: L, y: H - 10, 'font-size': 9, fill: 'currentColor', 'fill-opacity': '.65' }, series[0] ? series[0].day : '');
      sadd(s, 'text', { x: W - R, y: H - 10, 'text-anchor': 'end', 'font-size': 9, fill: 'currentColor', 'fill-opacity': '.65' }, series.length ? series[series.length - 1].day : '');
      return s;
    };
    const uDonut = () => {
      const s = svg(168, 168), cx = 84, cy = 84, r = 68, positive = kinds.filter(([, n]) => n > 0);
      s.setAttribute('role', 'img');
      s.setAttribute('aria-label', `Distribution of ${num(kindTotal)} calls by type.`);
      if (!kindTotal) sadd(s, 'circle', { cx: cx, cy: cy, r: r - 6, fill: 'none', stroke: 'var(--line)', 'stroke-width': 12 });
      else if (positive.length === 1) sadd(s, 'circle', { cx: cx, cy: cy, r: r, fill: kindColor(positive[0][0]) });
      else {
        let ang = -Math.PI / 2;
        kinds.forEach(([k, n]) => {
          if (!n) return;
          const a = (n / kindTotal) * 2 * Math.PI, x1 = cx + r * Math.cos(ang), y1 = cy + r * Math.sin(ang), x2 = cx + r * Math.cos(ang + a), y2 = cy + r * Math.sin(ang + a);
          sadd(s, 'path', { d: `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`, fill: kindColor(k), stroke: 'var(--surface)', 'stroke-width': 1 });
          ang += a;
        });
      }
      sadd(s, 'circle', { cx: cx, cy: cy, r: r * 0.56, fill: 'var(--surface)' });
      sadd(s, 'text', { x: cx, y: cy + 2, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600, fill: 'currentColor' }, num(kindTotal));
      sadd(s, 'text', { x: cx, y: cy + 17, 'text-anchor': 'middle', 'font-size': 9, fill: 'currentColor', 'fill-opacity': '.6' }, 'calls');
      return s;
    };
    const legend = kinds.map(([k, n]) => {
      const pct = kindTotal ? (n / kindTotal) * 100 : 0;
      return h('div', { class: 'use-leg-row' }, h('i', { class: 'use-leg-dot', style: 'background:' + kindColor(k) }), h('span', { class: 'use-leg-k' }, k), h('span', { class: 'use-leg-n mono' }, num(n)), h('span', { class: 'use-leg-p' }, n && pct < 1 ? '<1%' : `${Math.round(pct)}%`));
    });
    const barsBox = h('div', { class: 'use-bars' }, uBars());
    // On narrow screens the bar chart scrolls; start at the most recent days instead of the oldest.
    requestAnimationFrame(() => { if (barsBox.scrollWidth - barsBox.clientWidth > 4) barsBox.scrollLeft = barsBox.scrollWidth; });
    const uChart = h('div', { class: 'use-charts' },
      h('div', { class: 'card use-chart-card' }, cardHead('Calls per day', `Last ${windowDays} days${series.length ? ` · ${series[0].day} → ${series[series.length - 1].day}` : ''}`),
        barsBox, h('div', { class: 'use-chart-foot muted' }, totalCalls ? `${num(totalCalls)} calls in this period.` : 'No calls recorded in this period yet.')),
      h('div', { class: 'card use-chart-card' }, cardHead('Usage by type', 'Calls by kind'),
        kinds.length ? h('div', { class: 'use-donut-wrap' }, uDonut(), h('div', { class: 'use-legend' },
          h('div', { class: 'use-leg-row use-leg-head' }, h('i', { class: 'use-leg-dot' }), h('span', {}, 'Type'), h('span', { class: 'use-leg-n' }, 'Calls'), h('span', { class: 'use-leg-p' }, 'Share')), legend)) : h('p', { class: 'muted use-empty-chart' }, 'No calls in this period yet.')));
    const tiles = h('div', { class: 'use-totals' },
      tile('Total calls', num(totalCalls)),
      tile('Errors', num(totalErrors), totalErrors ? 'failed calls' : 'no failed calls', totalErrors > 0),
      tile('Input tokens', num(tokensIn)),
      tile('Output tokens', num(tokensOut)),
      tile('Known cost', costLabel, totalCalls ? `${num(unpriced)} calls unpriced` : 'no calls yet'),
      tile('Avg latency', avgLatency ? `${num(avgLatency)} ms` : '—', avgLatency ? 'weighted by calls' : 'no timing recorded'),
      tile('Fallback calls', num(fallbacks)));
    const bill = S.bill, planEntry = bill && bill.plans ? bill.plans.find((p) => p.id === bill.plan) : null;
    const planPrice = (p) => (p == null || p.price_eur == null ? 'Custom' : p.price_eur === 0 ? '€0' : `€${p.price_eur} / month`);
    const limitOrder = ['seats', 'agents', 'messages', 'calls', 'research', 'api_calls', 'uploads', 'mcp_servers', 'storage_mb'];
    const planBody = () => {
      if (!bill) return S.useBillErr ? h('div', {}, h('p', { class: 'warn-text' }, S.useBillErr), h('div', { style: 'margin-top:8px' }, btn('Retry', () => { S.useBillErr = ''; render(); }, 'btn'))) : h('p', { class: 'muted' }, 'Loading plan limits…');
      if (!bill.enabled) return h('div', {}, h('p', { class: 'use-off' }, 'Billing is off on this deployment — no plan limits are enforced.'), h('p', { class: 'muted use-small' }, 'Self-hosted workspaces have no plan, seat or usage caps. Set CFA_BILLING=on to enforce plans.'));
      const usage = bill.usage || {}, limits = bill.limits || {}, labels = bill.labels || {};
      return h('div', {},
        h('div', { class: 'use-plan-name' }, h('b', {}, bill.plan_name || bill.plan || 'Unknown plan'), h('span', { class: 'muted' }, planPrice(planEntry))),
        planEntry && planEntry.tagline ? h('p', { class: 'muted use-small use-plan-tag' }, planEntry.tagline) : null,
        h('div', { class: 'use-limits' }, limitOrder.filter((k) => labels[k] && limits[k] != null).map((k) => {
          const used = Number(usage[k] || 0), lim = Number(limits[k] || 0), unlimited = lim >= 100000, pct = unlimited ? 2 : Math.min(100, Math.round((used / Math.max(lim, 1)) * 100)), unit = k === 'storage_mb' ? ' MB' : '';
          return h('div', { class: 'use-limit' }, h('div', { class: 'row2' }, h('span', { class: 'use-limit-k' }, labels[k]), h('span', { class: 'muted mono' }, `${num(used)} / ${fmt(lim)}${unit}`)), h('div', { class: 'progress' + (pct >= 90 ? ' hot' : '') }, h('i', { style: `width:${pct}%` })));
        })),
        h('p', { class: 'muted use-small' }, 'Monthly limits reset on the first of the month. Seats, agents, MCP servers and storage show current totals.'),
        h('div', { class: 'use-plan-cta' }, btn('Upgrade / manage plan', () => go('plans'), 'link')));
    };
    const planCard = h('div', { class: 'card use-plan' },
      h('div', { class: 'use-card-head' }, h('b', {}, 'Plan limits'), bill && bill.enabled ? h('span', { class: 'chip ' + (bill.status === 'active' || bill.status === 'trialing' ? 'ok' : 'warn') }, bill.status || 'unknown') : null), planBody());
    const modelRows = models.length ? models.map((m) => h('tr', {},
      h('td', { class: 'mono' }, m.model), h('td', {}, m.provider), h('td', {}, num(m.calls)), h('td', { class: m.errors ? 'use-err' : '' }, num(m.errors)),
      h('td', { class: 'mono' }, num(m.tokens_in)), h('td', { class: 'mono' }, num(m.tokens_out)), h('td', {}, m.avg_latency_ms ? `${num(m.avg_latency_ms)} ms` : '—'),
      h('td', {}, money(m.cost, m.currency), m.calls_with_unknown_cost ? h('span', { class: 'muted use-small' }, ` · ${num(m.calls_with_unknown_cost)} unpriced calls`) : null),
      h('td', {}, num(m.fallback_calls)))) : h('tr', {}, h('td', { colspan: 9, class: 'muted' }, 'No model calls in this period. Demo replies make no model calls.'));
    const modelsTable = h('div', { class: 'card use-table-card' }, h('div', { class: 'tbl-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Model', 'Provider', 'Calls', 'Errors', 'Input tokens', 'Output tokens', 'Avg latency', 'Known cost', 'Fallbacks'].map((c) => h('th', {}, c)))), h('tbody', {}, modelRows))));
    const budgetCard = h('div', { class: 'card use-section' },
      h('p', { class: 'muted', style: 'margin-top:0' }, cap ? `Cap ${cap.amount} ${cap.currency}. Spent this month on priced calls: ${budget.spent_this_month_known_cost} ${cap.currency}. Calls stop when the cap is reached.` : 'No cap set. Calls are never stopped by cost.'),
      cap ? h('div', { class: 'progress' + (budget.spent_this_month_known_cost >= cap.amount ? ' hot' : '') }, h('i', { style: `width:${Math.min(100, Math.round((budget.spent_this_month_known_cost / Math.max(cap.amount, 1)) * 100))}%` })) : null,
      cap ? h('p', { class: 'muted use-small', style: 'margin-top:4px' }, 'Only priced calls count against the cap; unpriced calls are not included.') : null,
      h('div', { class: 'row2', style: 'margin-top:8px' }, inp(S, 'cap', 'Amount, for example 20', 'number'), btn('Set cap', () => run(async () => { await api('/api/usage/budget', { method: 'PUT', body: { amount: S.cap ? Number(S.cap) : null, currency: (cap && cap.currency) || 'USD' } }); await reload(); }), 'btn')),
      h('p', { class: 'muted use-small' }, 'An empty or zero amount clears the cap; the server never stores a zero budget.'));
    const provChip = (p) => h('span', { class: 'chip ' + (p.status === 'ok' ? 'ok' : p.status === 'failed' ? 'warn' : '') }, p.status || 'untested');
    const provCard = (p) => {
      const mi = h('input', { class: 'field', placeholder: 'Model to test, for example llama-3.1-8b', 'aria-label': 'Test model for ' + p.id, value: S.ptest[p.id] || '' });
      mi.addEventListener('input', () => { S.ptest[p.id] = mi.value; });
      return h('div', { class: 'card use-prov' },
        h('div', { class: 'use-prov-head' }, h('b', {}, p.id), provChip(p)),
        p.name && p.name !== p.id ? h('div', { class: 'muted use-small' }, p.name) : null,
        h('div', { class: 'mono use-prov-url', title: p.base_url }, p.base_url),
        h('div', { class: 'row2 use-prov-meta' }, h('span', { class: 'chip ' + (p.has_key ? 'ok' : ''), title: 'The API key is stored encrypted and never returned by the API.' }, p.has_key ? 'Key set' : 'No key'), h('span', { class: 'muted use-small' }, p.last_test ? 'Last test ' + when(p.last_test) : 'Not tested yet')),
        h('div', { class: 'use-prov-test' }, mi, btn('Test', () => { const model = (S.ptest[p.id] || '').trim(); if (!model) { S.err = `Enter a model name to test ${p.id}.`; render(); return; } run(async () => { const r = await api(`/api/providers/${p.id}/test`, { method: 'POST', body: { model } }); S.info = r.status === 'ok' ? `${p.id} answered.` : `${p.id} failed: ${r.detail || 'no detail returned'}`; await reload(); }); }, 'btn')),
        h('div', { class: 'row2 use-prov-actions' }, btn('Remove', () => run(async () => { await api('/api/providers/' + p.id, { method: 'DELETE' }); S.info = `Provider ${p.id} removed.`; await reload(); }), 'link')));
    };
    const addProvider = h('div', { class: 'card use-prov use-add' },
      h('b', {}, 'Add provider'),
      h('p', { class: 'muted use-small' }, 'Any OpenAI-compatible provider. The key is encrypted at rest and never returned. Adding requires CFA_SECRET_KEY on the host; without it the server refuses the request and its error appears at the top of this screen.'),
      h('div', { class: 'rbox' }, inp(S.pnew, 'id', 'Provider id, for example mistral'), inp(S.pnew, 'base_url', 'Base URL, for example https://api.mistral.ai/v1'), inp(S.pnew, 'api_key', 'API key', 'password')),
      h('div', { class: 'row2', style: 'margin-top:8px' }, btn('Add provider', () => run(async () => { const id = S.pnew.id; await api('/api/providers', { method: 'POST', body: S.pnew }); S.info = `Provider ${id} added.`; S.pnew = { id: '', base_url: '', api_key: '' }; await reload(); }), 'btn primary')),
      h('p', { class: 'muted use-small' }, 'Ids hf, openai and default are reserved. Use model ids as provider-id:model-name in an agent\'s model field.'));
    const providers = h('div', {}, S.provs.length ? null : h('p', { class: 'muted' }, 'No custom providers yet.'), h('div', { class: 'use-prov-grid' }, S.provs.map(provCard), addProvider));
    const fallbackCard = h('div', { class: 'card use-section' },
      h('p', { class: 'muted', style: 'margin-top:0' }, 'Used only after a provider failure (credits, rate limit, outage). Every use is recorded in the fallback column above. Up to 3 models, comma separated.'),
      h('div', { class: 'row2' }, (u.fallback_models || []).length ? u.fallback_models.map((m) => h('span', { class: 'chip' }, m)) : h('span', { class: 'muted' }, 'No fallback models configured.')),
      h('div', { class: 'row2', style: 'margin-top:8px' }, inp(S, 'fb', (u.fallback_models || []).join(', ') || 'for example provider:model'), btn('Save', () => run(async () => { await api('/api/fallbacks', { method: 'PUT', body: { models: S.fb.split(',').map((x) => x.trim()).filter(Boolean) } }); await reload(); }), 'btn')));
    const priceRows = S.prices.map((p) => h('tr', {}, h('td', {}, p.provider), h('td', { class: 'mono' }, p.model), h('td', {}, p.input_per_mtok), h('td', {}, p.output_per_mtok), h('td', {}, p.currency), h('td', { class: 'mono' }, when(p.effective_from)), h('td', {}, p.source)));
    const priceCard = h('div', { class: 'card use-section' }, h('b', {}, 'Add price'),
      h('div', { class: 'rbox', style: 'margin-top:8px' }, inp(S.pr, 'provider', 'Provider id (default for the main key)'), inp(S.pr, 'model', 'Model name'), inp(S.pr, 'input_per_mtok', 'Input price per 1M tokens', 'number'), inp(S.pr, 'output_per_mtok', 'Output price per 1M tokens', 'number'), inp(S.pr, 'source', 'Source, for example the provider pricing page URL')),
      h('div', { class: 'row2', style: 'margin-top:8px' }, btn('Add price', () => run(async () => { await api('/api/prices', { method: 'PUT', body: { ...S.pr, input_per_mtok: Number(S.pr.input_per_mtok), output_per_mtok: Number(S.pr.output_per_mtok) } }); S.pr = { provider: '', model: '', input_per_mtok: '', output_per_mtok: '', source: '' }; await reload(); }), 'btn primary')));
    const cuCard = h('div', { class: 'card use-section' }, h('p', { class: 'muted', style: 'margin-top:0' }, S.cu.note), h('div', { class: 'row2' }, h('span', { class: 'chip ' + (S.cu.status === 'ready' ? 'ok' : 'warn') }, S.cu.status || 'unknown'), (S.cu.problems || []).map((x) => h('span', { class: 'muted use-small' }, x))));
    return h('div', { class: 'body' }, h('div', { class: 'wide' },
      h('h2', {}, 'Models & usage'),
      h('p', { class: 'muted use-note' }, u.note + (u.cost_is_partial ? ' Some calls have no price record, so the cost total is partial.' : '')),
      h('div', { class: 'use-hero' }, h('div', { class: 'use-hero-main' }, tiles, uChart), planCard),
      h('h3', {}, 'Models'),
      h('p', { class: 'muted' }, `Calls in the last ${windowDays} days, grouped by provider and model and sorted by calls. Token counts come from the provider usage data.`),
      modelsTable,
      h('p', { class: 'muted use-small' }, 'Known cost = input tokens times the price record input rate plus output tokens times its output rate, using the price effective at call time. Calls without a matching price record are unpriced and shown as unknown, never as zero.'),
      h('h3', {}, 'Monthly budget'), budgetCard,
      h('h3', {}, 'Providers'), h('p', { class: 'muted' }, 'Keys are stored encrypted and never returned; the API only reports whether a key is set. Use provider-id:model-name in an agent\'s model field.'),
      providers,
      h('h3', {}, 'Fallback models'), fallbackCard,
      h('h3', {}, 'Prices'), h('p', { class: 'muted' }, 'Costs are calculated only from price records you add, each with a source. Prices are per million tokens and apply from their effective date.'),
      S.prices.length ? h('div', { class: 'card use-table-card' }, h('div', { class: 'tbl-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Provider', 'Model', 'Input', 'Output', 'Currency', 'From', 'Source'].map((c) => h('th', {}, c)))), h('tbody', {}, priceRows)))) : h('p', { class: 'muted' }, 'No prices yet, so every cost shows as unknown.'),
      priceCard,
      h('h3', {}, 'Computer use'), cuCard));
  }
  // ---------- inventory: derived trust ring, rights panel, bulk actions ----------
  // The trust score is derived only from fields the API returns; the formula is shown verbatim in the view.
  const INV_TRUST_RULE = 'Trust score (derived, not stored): start at 100, minus 35 if unverified, minus 6 x risk score, minus 8 x accountability gap; a suspended agent scores 0 (clamped to 0-100).';
  const INV_GREEN = '#3D7A4F', INV_AMBER = '#B7791F';
  const INV_GAP_TEXT = { no_owner: 'no owner', no_sponsor: 'no sponsor', no_purpose: 'no purpose' };
  const invScore = (a) => {
    if (a.status === 'suspended') return 0;
    const raw = 100 - (a.trust === 'unverified' ? 35 : 0) - 6 * ((a.risk && a.risk.score) || 0) - 8 * ((a.accountability || []).length);
    return Math.max(0, Math.min(100, raw));
  };
  const invRingColor = (a, score) => (a.status === 'suspended' ? 'var(--muted)' : score >= 80 ? INV_GREEN : score >= 60 ? INV_AMBER : 'var(--bad)');
  const invTrust = (a) => {
    const score = invScore(a), why = [];
    if (a.status === 'suspended') why.push('Suspended: every capability is off');
    else {
      if (a.trust === 'unverified') why.push('Unverified source: -35');
      const rs = (a.risk && a.risk.score) || 0;
      if (rs) why.push(`Risk score ${rs}: -${6 * rs}`);
      const g = (a.accountability || []).length;
      if (g) why.push(`${g} accountability gap${g === 1 ? '' : 's'}: -${8 * g}`);
    }
    const title = `Trust score ${score} of 100. ` + (why.length ? `Deductions: ${why.join('; ')}.` : 'No deductions.');
    const total = 2 * Math.PI * 20, el = document.createElementNS(NS, 'svg');
    for (const [k, v] of Object.entries({ viewBox: '0 0 48 48', width: 48, height: 48, role: 'img', class: 'inv-ring', 'aria-label': `Trust score ${score} of 100` })) el.setAttribute(k, v);
    sadd(el, 'circle', { cx: 24, cy: 24, r: 20, fill: 'none', stroke: 'var(--line)', 'stroke-width': 5 });
    if (score > 0) sadd(el, 'circle', { cx: 24, cy: 24, r: 20, fill: 'none', stroke: invRingColor(a, score), 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-dasharray': `${(total * score / 100).toFixed(2)} ${total.toFixed(2)}`, transform: 'rotate(-90 24 24)' });
    sadd(el, 'text', { x: 24, y: 28.5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 600, fill: 'currentColor' }, String(score));
    return h('span', { class: 'inv-trust', title }, el);
  };
  const invFact = (label, value, muted) => h('div', { class: 'inv-fact' }, h('span', { class: 'muted' }, label), h('span', { class: muted ? 'muted' : '' }, value));
  const invFacts = (a) => h('div', { class: 'inv-facts' }, invFact('Owner', a.owner === 'system' ? 'unassigned' : a.owner, a.owner === 'system'), invFact('Sponsor', a.sponsor || 'unassigned', !a.sponsor), invFact('Purpose', a.purpose || 'not set', !a.purpose));
  const invGapChips = (a) => ((a.accountability || []).length ? h('div', { class: 'row2 inv-gaps' }, a.accountability.map((g) => h('span', { class: 'chip warn', title: 'Accountability gap: the agent has ' + (INV_GAP_TEXT[g] || g) + '.' }, INV_GAP_TEXT[g] || g))) : null);
  const invPrune = () => {
    const ids = new Set((S.inv || []).map((a) => a.id));
    if (S.invSel instanceof Set) for (const id of [...S.invSel]) if (!ids.has(id)) S.invSel.delete(id);
    if (S.invPick && !ids.has(S.invPick)) { S.invPick = null; S.invRights = null; }
    if (S.invEdit && !ids.has(S.invEdit.id)) S.invEdit = null;
  };
  const invRefresh = async () => {
    [S.inv, S.invSum] = await Promise.all([api('/api/inventory'), api('/api/inventory/summary')]);
    await loadBots();
    invPrune();
  };
  const invAct = (a, path, body, method = 'POST') => run(async () => { await api(path, { method, body }); await invRefresh(); S.invRights = null; });
  const invBulk = (kind) => {
    const ids = [...(S.invSel || [])].filter((id) => (S.inv || []).some((a) => a.id === id));
    if (!ids.length || S.invBulk) return;
    const spec = {
      suspend: { path: (id) => `/api/bots/${id}/status`, body: { status: 'suspended', reason: 'bulk inventory action' }, verb: 'suspended' },
      resume: { path: (id) => `/api/bots/${id}/status`, body: { status: 'active', reason: 'bulk inventory action' }, verb: 'resumed' },
      verify: { path: (id) => `/api/bots/${id}/trust`, body: { trust: 'verified' }, verb: 'marked verified' },
    }[kind];
    S.invBulk = true;
    render();
    run(async () => {
      try {
        const rs = await Promise.allSettled(ids.map((id) => api(spec.path(id), { method: 'POST', body: spec.body })));
        const failed = rs.filter((r) => r.status === 'rejected');
        await invRefresh();
        S.invRights = null;
        const first = failed[0] && failed[0].reason && failed[0].reason.message;
        S.info = `${ids.length - failed.length} of ${ids.length} agent(s) ${spec.verb}.` + (failed.length ? ` ${failed.length} failed${first ? ': ' + first : '.'}` : '');
      } finally { S.invBulk = false; }
    });
  };
  // ---------- inventory v2: dashboard with real SVG charts + model technical data ----------
  const INV2_RISK = { low: '#1B7F79', medium: '#B7791F', high: 'var(--bad)', suspended: 'var(--muted)' };
  const INV2_OK = '#3D7A4F', INV2_ACCENT = '#2F5BD3', INV2_WARN = '#B7791F';
  const inv2Pct = (v, total) => (total > 0 ? Math.round((v / total) * 100) : 0);
  const inv2MiniBar = (value, total, color) => {
    const W = 108, H = 6, s = svg(W, H);
    sadd(s, 'rect', { x: 0, y: 0, width: W, height: H, rx: 3, fill: 'var(--line)' });
    if (total > 0 && value > 0) sadd(s, 'rect', { x: 0, y: 0, width: Math.max(3, Math.round((W * value) / total)), height: H, rx: 3, fill: color });
    s.setAttribute('class', 'inv2-mini');
    s.setAttribute('aria-hidden', 'true');
    return s;
  };
  const inv2StackBar = (parts, total) => {
    const W = 108, H = 8, s = svg(W, H);
    sadd(s, 'rect', { x: 0, y: 0, width: W, height: H, rx: 4, fill: 'var(--line)' });
    let x = 0;
    for (const p of parts) {
      if (!p.value || total <= 0) continue;
      const w = Math.min(W - x, Math.round((W * p.value) / total));
      if (w <= 0) continue;
      sadd(s, 'rect', { x, y: 0, width: w, height: H, rx: 4, fill: p.color });
      x += w;
    }
    s.setAttribute('class', 'inv2-mini');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('title', parts.map((p) => `${p.label || ''} ${p.value}`).join(', '));
    return s;
  };
  const inv2Bars = (items, opts = {}) => {
    const W = opts.width || 260, labelW = opts.labelW || 86, valueW = 28, rowH = 24, H = Math.max(1, items.length) * rowH + 4;
    const total = opts.total || items.reduce((a, b) => a + (b.value || 0), 0) || 1;
    const trackW = W - labelW - valueW;
    const s = svg(W, H);
    s.setAttribute('class', 'inv2-svg inv2-bars');
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', opts.aria || 'Distribution');
    items.forEach((it, i) => {
      const y = i * rowH + 4, short = it.label.length > 15 ? it.label.slice(0, 14) + '…' : it.label;
      sadd(s, 'text', { x: 2, y: y + 12, 'font-size': 11, fill: 'currentColor', 'fill-opacity': .72 }, short);
      sadd(s, 'rect', { x: labelW, y: y + 3, width: trackW, height: 12, rx: 6, fill: 'var(--line)' });
      const w = it.value ? Math.max(6, Math.round((trackW * it.value) / total)) : 0;
      if (w > 0) sadd(s, 'rect', { x: labelW, y: y + 3, width: w, height: 12, rx: 6, fill: it.color });
      sadd(s, 'text', { x: W, y: y + 12, 'text-anchor': 'end', 'font-size': 11, 'font-weight': 600, fill: 'currentColor' }, String(it.value));
    });
    return s;
  };
  const inv2Donut = (segments, total, center, sub, aria) => {
    const SZ = 140, R = 54, C = 2 * Math.PI * R, s = svg(SZ, SZ);
    s.setAttribute('class', 'inv2-svg inv2-donut');
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', aria || 'Distribution');
    sadd(s, 'circle', { cx: 70, cy: 70, r: R, fill: 'none', stroke: 'var(--line)', 'stroke-width': 14 });
    let off = 0;
    for (const seg of segments) {
      if (!seg.value || total <= 0) continue;
      const len = (C * seg.value) / total;
      sadd(s, 'circle', { cx: 70, cy: 70, r: R, fill: 'none', stroke: seg.color, 'stroke-width': 14, 'stroke-dasharray': `${len.toFixed(2)} ${(C - len).toFixed(2)}`, 'stroke-dashoffset': (-off).toFixed(2), transform: 'rotate(-90 70 70)' });
      off += len;
    }
    sadd(s, 'text', { x: 70, y: 69, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 700, fill: 'currentColor' }, String(center));
    sadd(s, 'text', { x: 70, y: 86, 'text-anchor': 'middle', 'font-size': 10, fill: 'currentColor', 'fill-opacity': .6 }, sub);
    return s;
  };
  const inv2Legend = (rows) => h('div', { class: 'inv2-legend' }, rows.map((r) => h('div', { class: 'inv2-leg' }, h('span', { class: 'inv2-dot', style: 'background:' + r.color }), h('span', { class: 'inv2-leg-label' }, r.label), h('b', {}, String(r.value)))));
  const inv2Chart = (title, sub, body) => h('div', { class: 'card inv2-chart' },
    h('div', { class: 'inv2-chart-head' }, h('b', {}, title), h('span', { class: 'muted inv2-chart-sub' }, sub)),
    h('div', { class: 'inv2-chart-body' }, body));
  const inv2Kpi = (label, value, caption, chart) => h('div', { class: 'card inv2-kpi' },
    h('div', { class: 'muted inv2-kpi-label' }, label), h('div', { class: 'inv2-kpi-value' }, String(value)),
    caption ? h('div', { class: 'muted inv2-kpi-cap' }, caption) : null, chart || null);
  const inv2Channel = (m) => {
    if (m.startsWith('hf:')) return 'Hugging Face';
    if (m.startsWith('openai:')) return 'OpenAI';
    if (m.startsWith('anthropic:') || /^claude/i.test(m)) return 'Anthropic';
    if (m.startsWith('gemini:') || /^gemini/i.test(m)) return 'Google';
    const i = m.indexOf(':');
    return i > 0 ? m.slice(0, i) : 'Default endpoint';
  };
  const inv2ModelCell = (a) => {
    if (!a.model) return h('div', { class: 'inv2-model inv2-model-empty', title: 'No model is set for this agent. Model must be configured in the agent settings.' }, h('span', { class: 'muted inv2-model-missing' }, 'Model must be configured'));
    return h('div', { class: 'inv2-model', title: a.model },
      h('div', { class: 'inv2-model-id mono' }, a.model),
      h('div', { class: 'row2 inv2-model-meta' }, h('span', { class: 'muted inv2-model-ch' }, inv2Channel(a.model)),
        a.model_configured ? h('span', { class: 'chip ok inv2-model-state' }, 'ready') : h('span', { class: 'chip warn inv2-model-state', title: 'The model is set but no API key is available for its provider.' }, 'no API key')),
      a.model_configured ? null : h('div', { class: 'muted inv2-model-missing' }, 'Model must be configured'));
  };
  const inv2CoverageRow = (label, value, total) => h('div', { class: 'inv2-cov-row' }, h('span', { class: 'inv2-cov-label' }, label), inv2MiniBar(value, total, INV2_WARN), h('b', { class: 'inv2-cov-n' }, String(value)));
  const inv2Dashboard = (rows, sum) => {
    const total = rows.length;
    const risk = ['low', 'medium', 'high', 'suspended'].map((lvl) => ({ label: lvl, value: rows.filter((a) => a.risk.level === lvl).length, color: INV2_RISK[lvl] }));
    const suspended = sum.suspended, highRisk = sum.high_risk;
    const verified = rows.filter((a) => a.trust === 'verified').length, unverified = total - verified;
    const configured = rows.filter((a) => a.model_configured).length, notConfigured = total - configured;
    const teams = {};
    rows.forEach((a) => { teams[a.team] = (teams[a.team] || 0) + 1; });
    const teamRows = Object.entries(teams).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(([label, value]) => ({ label, value, color: INV2_ACCENT }));
    const emptyChart = () => h('p', { class: 'muted inv2-chart-empty' }, 'No agents yet.');
    const kpis = h('div', { class: 'inv2-kpis' },
      inv2Kpi('Agents', sum.total, `${sum.total - suspended} active · ${suspended} suspended`, inv2StackBar(risk, total)),
      inv2Kpi('High risk', highRisk, `${inv2Pct(highRisk, total)}% of agents`, inv2MiniBar(highRisk, total, 'var(--bad)')),
      inv2Kpi('Suspended', suspended, `${inv2Pct(suspended, total)}% of agents`, inv2MiniBar(suspended, total, 'var(--muted)')),
      inv2Kpi('Unverified', unverified, `${inv2Pct(unverified, total)}% of agents`, inv2MiniBar(unverified, total, INV2_WARN)));
    const coverage = h('div', { class: 'inv2-coverage' },
      h('div', { class: 'card inv2-cov' }, h('div', { class: 'inv2-cov-head' }, h('b', {}, 'Accountability'), h('span', { class: 'muted' }, `${sum.ownerless + sum.no_sponsor + sum.no_purpose} open gap(s)`)),
        h('div', { class: 'inv2-cov-rows' }, inv2CoverageRow('Without owner', sum.ownerless, total), inv2CoverageRow('Without sponsor', sum.no_sponsor, total), inv2CoverageRow('Without purpose', sum.no_purpose, total))),
      h('div', { class: 'card inv2-cov' }, h('div', { class: 'inv2-cov-head' }, h('b', {}, 'Model coverage'), h('span', { class: 'muted' }, `${configured} of ${total} configured`)),
        h('div', { class: 'inv2-cov-model' }, inv2MiniBar(configured, total, INV2_ACCENT)),
        inv2Legend([{ label: 'Configured', value: configured, color: INV2_ACCENT }, { label: 'Not configured', value: notConfigured, color: INV2_WARN }]),
        h('p', { class: 'muted inv2-cov-note' }, 'Agents without a model show "Model must be configured".')));
    const charts = h('div', { class: 'inv2-charts' },
      inv2Chart('Risk distribution', `${total} agent(s)`, total ? inv2Bars(risk, { total, aria: `Risk distribution: ${risk.map((r) => `${r.value} ${r.label}`).join(', ')}` }) : emptyChart()),
      inv2Chart('Trust mix', `${verified} verified · ${unverified} unverified`, total ? h('div', { class: 'inv2-donut-wrap' },
        inv2Donut([{ value: verified, color: INV2_OK }, { value: unverified, color: INV2_WARN }], total, total, 'agents', `Trust mix: ${verified} verified, ${unverified} unverified`),
        inv2Legend([{ label: 'Verified', value: verified, color: INV2_OK }, { label: 'Unverified', value: unverified, color: INV2_WARN }])) : emptyChart()),
      inv2Chart('Team distribution', `${teamRows.length} team(s)`, teamRows.length ? h('div', { class: 'inv2-bars-scroll' },
        inv2Bars(teamRows, { total, aria: `Team distribution: ${teamRows.map((t) => `${t.label} ${t.value}`).join(', ')}` })) : emptyChart()),
      inv2Chart('Model coverage', `${configured} of ${total} configured`, total ? h('div', { class: 'inv2-donut-wrap' },
        inv2Donut([{ value: configured, color: INV2_ACCENT }, { value: notConfigured, color: INV2_WARN }], total, `${configured}/${total}`, 'configured', `Model coverage: ${configured} of ${total} agents configured`),
        inv2Legend([{ label: 'Configured', value: configured, color: INV2_ACCENT }, { label: 'Not configured', value: notConfigured, color: INV2_WARN }])) : emptyChart()));
    return h('section', { class: 'inv2-dash', 'aria-label': 'Inventory overview' }, kpis, coverage, charts);
  };
  function accountabilityForm() {
    const e = S.invEdit, f = (k, ph, max) => { const i = h('input', { class: 'field', placeholder: ph, maxlength: max, value: e[k] || '', 'aria-label': ph }); i.addEventListener('input', () => { e[k] = i.value; }); return i; };
    return h('div', { class: 'card inv-edit' }, h('b', {}, `Who is accountable for ${e.name}?`), h('p', { class: 'muted', style: 'margin:4px 0 8px' }, 'Owner runs it day to day, sponsor approves that it should exist, purpose says what it is for. Admin only.'),
      h('div', { class: 'rbox' }, f('owner', 'Owner (a person)', 80), f('sponsor', 'Sponsor (a person)', 80), f('purpose', 'Purpose, one sentence', 300)),
      h('div', { class: 'row2', style: 'margin-top:8px' }, btn('Save', () => run(async () => { await api(`/api/bots/${e.id}/accountability`, { method: 'PATCH', body: { owner: e.owner || '', sponsor: e.sponsor || '', purpose: e.purpose || '' } }); S.invEdit = null; await invRefresh(); S.invRights = null; S.info = `Accountability saved for ${e.name}.`; }), 'btn primary'), btn('Cancel', () => { S.invEdit = null; render(); }, 'btn')));
  }
  function inventoryView() {
    if (S.invTrust === undefined) S.invTrust = '';
    if (S.invStatus === undefined) S.invStatus = '';
    if (S.invPick === undefined) S.invPick = null;
    if (S.invRights === undefined) S.invRights = null;
    if (!(S.invSel instanceof Set)) S.invSel = new Set();
    if (S.invBulk === undefined) S.invBulk = false;
    const known = new Set((S.inv || []).map((a) => a.id));
    for (const id of [...S.invSel]) if (!known.has(id)) S.invSel.delete(id);
    let picked = S.invPick ? S.inv.find((a) => a.id === S.invPick) : null;
    if (S.invPick && !picked) { S.invPick = null; S.invRights = null; }
    if (S.invPick && !S.invRights) {
      S.invRights = { loading: true };
      const id = S.invPick;
      run(async () => {
        try {
          const [bots, apps, tmpl] = await Promise.all([api('/api/bots'), api('/api/apps'), api('/api/templates')]);
          if (S.invPick !== id) return;
          const bot = (bots || []).find((b) => b.id === id) || null;
          const caps = (tmpl.find((t) => t.capabilities) || {}).capabilities || [];
          const grants = [];
          for (const ap of apps || []) {
            const tools = (((ap.grants || {})[id]) || []).map((name) => ({ name, risk: (((ap.tools || []).find((t) => t.name === name)) || {}).risk || 'read' }));
            if (tools.length) grants.push({ id: ap.id, name: ap.name, connected: !!ap.connected, tools });
          }
          S.invRights = { bot, caps, grants };
        } catch (e) { S.invRights = { error: e.message || 'Could not load rights data.' }; throw e; }
      });
    }
    const loading = !S.invSum && !S.inv.length;
    if (loading) return h('div', { class: 'body' }, h('div', { class: 'wide inv2-view' }, h('h2', {}, 'Agent inventory'), h('p', { class: 'muted' }, 'Loading agents…')));
    const all = S.inv;
    const sum = S.invSum || {
      total: all.length, suspended: all.filter((a) => a.status === 'suspended').length, high_risk: all.filter((a) => a.risk.level === 'high').length,
      ownerless: all.filter((a) => a.accountability.includes('no_owner')).length, no_sponsor: all.filter((a) => a.accountability.includes('no_sponsor')).length,
      no_purpose: all.filter((a) => a.accountability.includes('no_purpose')).length,
    };
    const q = h('input', { class: 'field inv-search inv2-search', placeholder: 'Search agents', value: S.invQ, 'aria-label': 'Search agents' }); q.addEventListener('input', () => { S.invQ = q.value; const p = q.selectionStart; render(); const e = document.querySelector('input[aria-label="Search agents"]'); if (e) { e.focus(); e.setSelectionRange(p, p); } });
    const needle = S.invQ.trim().toLowerCase();
    const rows = all.filter((a) => {
      if (needle && ![a.name, a.team, a.source, a.owner, a.sponsor, a.purpose, a.model, a.role].join(' ').toLowerCase().includes(needle)) return false;
      if (S.invRisk && a.risk.level !== S.invRisk) return false;
      if (S.invTrust && a.trust !== S.invTrust) return false;
      if (S.invStatus && a.status !== S.invStatus) return false;
      return true;
    });
    const filtered = !!(needle || S.invRisk || S.invTrust || S.invStatus);
    const clearFilters = () => { S.invQ = ''; S.invRisk = ''; S.invTrust = ''; S.invStatus = ''; render(); };
    const chipRow = (label, key, values) => h('div', { class: 'inv-filter-row inv2-filter-row' }, h('span', { class: 'muted inv-filter-label' }, label),
      h('div', { class: 'row2' }, [''].concat(values).map((v) => btn(v ? v : 'All', () => { S[key] = v; render(); }, 'chip' + (S[key] === v ? ' ok' : ''), { 'aria-pressed': S[key] === v ? 'true' : 'false' }))));
    const filteredIds = rows.map((a) => a.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => S.invSel.has(id));
    const master = h('input', { type: 'checkbox', class: 'inv-master-check', checked: allSelected, disabled: !filteredIds.length, 'aria-label': 'Select all filtered agents' });
    master.addEventListener('click', (e) => { e.stopPropagation(); const on = e.target.checked; filteredIds.forEach((id) => (on ? S.invSel.add(id) : S.invSel.delete(id))); render(); });
    const openRights = (a) => { if (S.invEdit && S.invEdit.id !== a.id) S.invEdit = null; S.invPick = S.invPick === a.id ? null : a.id; S.invRights = null; render(); };
    const editFor = (a) => { S.invPick = a.id; S.invEdit = { id: a.id, name: a.name, owner: a.owner === 'system' ? '' : a.owner, sponsor: a.sponsor || '', purpose: a.purpose || '' }; render(); };
    const closePanel = () => { S.invPick = null; S.invRights = null; S.invEdit = null; render(); };
    const toggle = (e, id) => { e.stopPropagation(); if (e.target.checked) S.invSel.add(id); else S.invSel.delete(id); render(); };
    const row = (a) => h('tr', { class: 'inv2-row' + (S.invPick === a.id ? ' pick' : ''), onclick: () => openRights(a) },
      h('td', { class: 'inv2-c-check' }, h('input', { type: 'checkbox', class: 'inv-check', checked: S.invSel.has(a.id), 'aria-label': 'Select ' + a.name, onclick: (e) => toggle(e, a.id) })),
      h('td', { class: 'inv2-c-agent', 'data-label': 'Agent' }, h('div', { class: 'row2 inv2-agent' }, tile(a, 32), h('div', { class: 'inv2-agent-txt' }, h('b', { class: 'inv2-name' }, a.name), h('span', { class: 'muted inv2-role' }, a.role || 'Agent')))),
      h('td', { class: 'inv2-c-team', 'data-label': 'Team' }, h('span', { class: 'inv2-team' }, a.team)),
      h('td', { class: 'inv2-c-owner', 'data-label': 'Owner' }, h('div', {}, h('div', { class: a.owner === 'system' ? 'muted' : 'inv2-owner' }, a.owner === 'system' ? 'unassigned' : a.owner),
        a.accountability.length ? h('div', { class: 'muted inv2-gap', title: 'Missing: ' + a.accountability.map((g) => INV_GAP_TEXT[g] || g).join(', ') }, `${a.accountability.length} gap${a.accountability.length === 1 ? '' : 's'}`) : h('div', { class: 'muted inv2-gap' }, 'accountable'))),
      h('td', { class: 'inv2-c-trust', 'data-label': 'Trust' }, invTrust(a)),
      h('td', { class: 'inv2-c-risk', 'data-label': 'Risk' }, h('span', { class: 'chip risk-' + a.risk.level, title: (a.risk.reasons || []).length ? a.risk.reasons.join('; ') : 'No risk reasons recorded.' }, `${a.risk.level} · ${a.risk.score}`)),
      h('td', { class: 'inv2-c-model', 'data-label': 'Model' }, inv2ModelCell(a)),
      h('td', { class: 'inv2-c-last', 'data-label': 'Last active' }, h('span', { class: 'muted mono inv2-last' }, a.last_activity ? when(a.last_activity) : 'never')),
      h('td', { class: 'inv2-c-status', 'data-label': 'Status' }, h('span', { class: 'chip ' + (a.status === 'suspended' ? 'warn' : 'ok') }, a.status)),
      h('td', { class: 'inv2-c-actions', 'data-label': 'Actions' }, h('span', { class: 'row2 inv2-actions' },
        btn('Rights', (e) => { e.stopPropagation(); openRights(a); }, 'link'),
        btn(a.status === 'suspended' ? 'Resume' : 'Suspend', (e) => { e.stopPropagation(); invAct(a, `/api/bots/${a.id}/status`, { status: a.status === 'suspended' ? 'active' : 'suspended', reason: 'inventory' }); }, 'link'),
        btn('Edit', (e) => { e.stopPropagation(); editFor(a); }, 'link', { 'aria-label': `Edit accountability for ${a.name}` }))));
    const table = (list) => h('div', { class: 'card inv2-table-card' }, h('div', { class: 'tbl-wrap inv2-table-wrap' },
      h('table', { class: 'inv2-table' },
        h('thead', {}, h('tr', {}, ['', 'Agent', 'Team', 'Owner', 'Trust', 'Risk', 'Model', 'Last active', 'Status', 'Actions'].map((c, i) => h('th', { scope: 'col', class: 'inv2-th-' + i }, c)))),
        h('tbody', {}, list.map(row)))));
    const rightsPanel = (a) => {
      const r = S.invRights || { loading: true };
      const head = h('div', { class: 'inv-panel-head inv2-panel-head' }, tile(a, 40), h('div', { class: 'inv-title' }, h('b', {}, a.name), h('div', { class: 'muted inv-sub' }, a.role || 'Agent')),
        btn(icon('x', 16), closePanel, 'link', { 'aria-label': 'Close rights panel' }));
      let body;
      if (r.loading) body = h('p', { class: 'muted inv-note' }, 'Loading rights…');
      else if (r.error) body = h('p', { class: 'muted inv-note' }, 'Rights data could not be loaded. ' + r.error);
      else {
        const bot = r.bot, caps = r.caps || [], spaces = (bot && bot.spaces) || [], scopes = (bot && bot.scopes) || [];
        const granted = caps.filter((c) => scopes.includes(c)).length;
        body = [
          h('h3', {}, 'Scopes'),
          scopes.length ? h('div', { class: 'row2' }, scopes.map((s) => h('span', { class: 'chip' }, s))) : h('p', { class: 'muted inv-note' }, 'No scope is granted to this agent.'),
          h('h3', {}, 'Capabilities'),
          bot && caps.length ? [h('p', { class: 'muted inv-note' }, `${granted} of ${caps.length} capabilities granted. The server enforces every capability.`),
            h('div', { class: 'inv-caps' }, caps.map((c) => { const on = scopes.includes(c); return h('div', { class: 'inv-cap' + (on ? '' : ' off') }, icon(on ? 'check' : 'x', 14), h('span', { class: on ? 'inv-ok' : 'muted' }, c), h('span', { class: 'muted', style: 'font-size:11px' }, on ? 'granted' : 'not granted')); }))] : h('p', { class: 'muted inv-note' }, 'No capability data for this agent.'),
          h('h3', {}, 'Memory spaces'),
          spaces.length ? h('div', { class: 'row2' }, spaces.map((s, i) => h('span', { class: 'chip', title: i === spaces.length - 1 ? 'The last space is where the agent writes.' : 'Memory space' }, s + (i === spaces.length - 1 ? ' · write' : '')))) : h('p', { class: 'muted inv-note' }, 'No memory spaces. The agent cannot read or write memory.'),
          h('h3', {}, 'App and tool grants'),
          (r.grants || []).length ? r.grants.map((g) => h('div', { class: 'inv-grant' }, h('div', { class: 'row2' }, h('b', {}, g.name), h('span', { class: 'chip' + (g.connected ? ' ok' : '') }, g.connected ? 'connected' : 'not connected')),
            h('div', { class: 'row2' }, g.tools.map((t) => h('span', { class: 'chip risk-' + (t.risk === 'write' ? 'high' : t.risk === 'secret' ? 'medium' : 'low'), title: 'Tool risk: ' + t.risk }, `${t.name} · ${t.risk}`)))))
            : h('p', { class: 'muted inv-note' }, 'No app or tool grants. The agent cannot call any connected app tool.'),
          h('h3', {}, 'Accountability'), invFacts(a), invGapChips(a),
          h('div', { style: 'margin-top:6px' }, btn('Edit accountability', () => editFor(a), 'link')),
          h('h3', {}, 'Risk and trust'),
          h('p', { class: 'muted inv-note' }, `Risk score ${a.risk.score} of 10, level ${a.risk.level}. Trust ${a.trust}, status ${a.status}, criticality ${a.criticality}.`),
          (a.risk.reasons || []).length ? h('ul', { class: 'inv-reasons' }, a.risk.reasons.map((x) => h('li', {}, x))) : h('p', { class: 'muted inv-note' }, 'No risk reasons recorded.'),
          h('h3', {}, 'Model'),
          inv2ModelCell(a),
          h('h3', {}, 'Last activity'), h('p', { class: 'muted inv-note mono' }, a.last_activity ? when(a.last_activity) : 'Never active.'),
          h('h3', {}, 'Actions'),
          h('div', { class: 'row2' },
            btn(a.status === 'suspended' ? 'Resume agent' : 'Suspend agent', () => invAct(a, `/api/bots/${a.id}/status`, { status: a.status === 'suspended' ? 'active' : 'suspended', reason: 'inventory panel' }), 'btn'),
            btn(a.trust === 'unverified' ? 'Mark verified' : 'Mark unverified', () => invAct(a, `/api/bots/${a.id}/trust`, { trust: a.trust === 'unverified' ? 'verified' : 'unverified' }), 'btn')),
          h('div', { class: 'row2', style: 'margin-top:8px' }, h('span', { class: 'muted' }, 'Criticality'),
            h('select', { class: 'field inv-crit', 'aria-label': 'Criticality for ' + a.name, onchange: (e) => invAct(a, `/api/bots/${a.id}/meta`, { criticality: e.target.value }, 'PUT') }, ['low', 'medium', 'high'].map((v) => h('option', { value: v, selected: a.criticality === v }, v)))),
          S.invEdit && S.invEdit.id === a.id ? accountabilityForm() : null,
          h('div', { class: 'row2', style: 'margin-top:10px' }, btn('Close', closePanel, 'link')),
        ];
      }
      return h('aside', { class: 'inv-aside inv2-aside', role: 'complementary', 'aria-label': `Rights panel for ${a.name}` }, head,
        h('div', { class: 'row2 inv-panel-chips' }, h('span', { class: 'chip ' + (a.trust === 'unverified' ? 'warn' : 'ok') }, a.trust), h('span', { class: 'chip ' + (a.status === 'suspended' ? 'warn' : 'ok') }, a.status), h('span', { class: 'chip' }, `criticality ${a.criticality}`), h('span', { class: 'chip risk-' + a.risk.level, title: (a.risk.reasons || []).length ? a.risk.reasons.join('; ') : 'No risk reasons recorded.' }, `risk ${a.risk.level} · ${a.risk.score}`)),
        body);
    };
    const nSel = S.invSel.size;
    const bulk = nSel ? h('div', { class: 'inv-bulk inv2-bulk', role: 'toolbar', 'aria-label': 'Bulk actions' }, h('b', {}, `${nSel} selected`),
      btn('Suspend selected', () => invBulk('suspend'), 'btn', { disabled: !!S.invBulk }), btn('Resume selected', () => invBulk('resume'), 'btn', { disabled: !!S.invBulk }), btn('Mark verified', () => invBulk('verify'), 'btn', { disabled: !!S.invBulk }),
      h('span', { class: 'sp' }), btn('Clear', () => { S.invSel.clear(); render(); }, 'link')) : null;
    const legend = h('p', { class: 'inv-legend inv2-trust-rule' }, INV_TRUST_RULE);
    const listBody = all.length === 0
      ? h('div', { class: 'card inv2-empty' }, emptyState('table', 'No agents yet', 'This workspace has no agents. Create one to give it an owner, a sponsor, a purpose and a model.', btn([icon('plus', 16), 'New agent'], openAgent, 'btn primary')))
      : rows.length ? table(rows)
        : h('div', { class: 'card inv2-empty' }, emptyState('lens', 'No agents match', 'No agent matches the current search and filters.', btn('Clear filters', clearFilters, 'btn')));
    return h('div', { class: 'body' }, h('div', { class: 'wide inv2-view' },
      h('div', { class: 'row2 inv2-head' }, h('div', { class: 'inv2-head-txt' }, h('h2', {}, 'Agent inventory'), h('p', { class: 'muted' }, 'Every agent with its owner, trust, risk and model. Open a row for its real permissions.')),
        btn([icon('plus', 16), 'New agent'], openAgent, 'btn primary inv2-newagent')),
      inv2Dashboard(all, sum),
      h('h3', { class: 'inv2-list-title' }, 'Agents'),
      h('div', { class: 'inv-layout' + (picked ? '' : ' inv-layout-full') }, h('div', { class: 'inv-main' },
        S.invEdit && !(picked && S.invEdit.id === picked.id) ? accountabilityForm() : null,
        h('div', { class: 'card inv2-toolbar' },
          h('div', { class: 'row2 inv2-toolbar-row' }, q, h('span', { class: 'sp' }), h('span', { class: 'muted inv2-count', 'aria-live': 'polite' }, `${rows.length} of ${all.length}`), filtered ? btn('Clear filters', clearFilters, 'link') : null),
          h('div', { class: 'inv2-filters' }, chipRow('Risk', 'invRisk', ['low', 'medium', 'high', 'suspended']), chipRow('Trust', 'invTrust', ['verified', 'unverified']), chipRow('Status', 'invStatus', ['active', 'suspended'])),
          h('div', { class: 'row2 inv2-toolrow' }, h('label', { class: 'inv-master' }, master, h('span', { class: 'muted' }, 'Select all filtered')))),
        bulk, legend, listBody),
        picked ? rightsPanel(picked) : null)));
  }
  const importAgent = (body, label) => run(async () => { const r = await api('/api/marketplace/import', { method: 'POST', body }); await loadBots(); S.info = `${label} added as "${r.name}".` + (r.note ? ' ' + r.note : ''); });
  function marketView() {
    // Wave-2 marketplace: hero + sticky filters + featured cards + category sections. State is lazy.
    if (S.mkt2Q == null) S.mkt2Q = '';
    if (S.mkt2Cat == null) S.mkt2Cat = '';
    if (S.mkt2Risk == null) S.mkt2Risk = '';
    if (S.mkt2HfDone == null) S.mkt2HfDone = false;
    const q = S.mkt2Q.trim().toLowerCase();
    const matched = S.market.filter((c) => (!q || [c.name, c.description, c.category, ...(c.scopes || [])].join(' ').toLowerCase().includes(q)) && (!S.mkt2Cat || c.category === S.mkt2Cat) && (!S.mkt2Risk || c.risk === S.mkt2Risk));
    const filtered = !!(q || S.mkt2Cat || S.mkt2Risk);
    const clearFilters = () => { S.mkt2Q = ''; S.mkt2Cat = ''; S.mkt2Risk = ''; render(); };
    const cats = ['', ...new Set(S.market.map((c) => c.category))], risks = ['', 'low', 'medium', 'high'];
    const featured = new Set(S.market.slice(0, 3).map((c) => c.id));
    const trust = (curated) => (curated ? h('span', { class: 'chip ok mkt2-trust' }, icon('check', 12), 'Verified source') : h('span', { class: 'chip warn mkt2-trust' }, 'Unverified external'));
    const tag = (s, mono) => h('span', { class: 'mkt2-tag' + (mono ? ' mono' : '') }, s);
    const catChip = (cat) => h('span', { class: 'mkt2-cat' }, cat);
    const scopesFold = (c, limit = 3) => { const sc = c.scopes || [], extra = sc.slice(limit); return h('div', { class: 'mkt2-tags' }, tag('template: ' + c.template, true), sc.slice(0, limit).map((s) => tag(s)), extra.length ? h('details', { class: 'mkt2-more' }, h('summary', {}, `+${extra.length} scopes`), h('div', { class: 'mkt2-tags' }, extra.map((s) => tag(s)))) : null); };
    const preview = (c) => h('details', { class: 'mkt2-prev' }, h('summary', {}, 'Preview'),
      h('div', { class: 'mkt2-prev-body' },
        h('div', { class: 'mkt2-kv' }, h('span', { class: 'mkt2-k' }, 'Role'), h('span', {}, c.role || c.template)),
        h('div', { class: 'mkt2-kv' }, h('span', { class: 'mkt2-k' }, 'Template scopes'), h('span', { class: 'mkt2-tags' }, (c.scopes || []).map((s) => tag(s)))),
        h('p', { class: 'mkt2-note' }, "Curated agents are imported as verified and inherit the template's scopes.")));
    const nameInput = (c, label) => { const i = h('input', { class: 'field mkt2-nameinput', value: S.mname[c.id] ?? c.name, maxlength: 40, 'aria-label': label }); i.addEventListener('input', () => { S.mname[c.id] = i.value; }); return i; };
    const addCurated = (c, name) => importAgent({ source: 'curated', ref: c.id, name: name || (S.mname[c.id] ?? c.name) }, c.name);
    const tabs = h('div', { class: 'mkt2-tabs', role: 'group', 'aria-label': 'Marketplace sources' }, [['curated', 'Curated'], ['hf', 'Hugging Face'], ['card', 'Import a card']].map(([k, l]) => btn(l, () => { S.mtab = k; render(); }, 'mkt2-tab', { role: 'tab', 'aria-selected': S.mtab === k, 'aria-pressed': S.mtab === k })));
    const hero = h('section', { class: 'mkt2-hero' },
      h('div', { class: 'mkt2-eyebrow' }, 'Templates and open models'),
      h('h2', { class: 'mkt2-title' }, 'Marketplace'),
      h('p', { class: 'mkt2-lede' }, 'Curated agent templates for your workspace, plus open models from Hugging Face. Every import gets a name you choose, and nothing runs until you add it.'),
      h('div', { class: 'mkt2-trustkey' },
        h('span', { class: 'mkt2-trustitem' }, icon('check', 14), 'Verified source: curated imports keep the template scopes'),
        h('span', { class: 'mkt2-trustitem' }, icon('shield', 14), 'Unverified external: Hugging Face models and pasted cards, read-only until reviewed')),
      tabs);
    const featCard = (c) => {
      const nm = nameInput(c, 'Name for featured ' + c.name);
      return h('article', { class: 'mkt2-featcard', style: '--mkt2-c:' + (c.color || '#5B6B88') },
        h('div', { class: 'mkt2-feat-top' }, tile(c, 56), h('div', { class: 'mkt2-feat-id' }, h('b', { class: 'mkt2-name' }, c.name), h('span', { class: 'mkt2-role' }, c.role || c.category), catChip(c.category))),
        h('div', { class: 'mkt2-badges' }, trust(true), h('span', { class: 'chip risk-' + c.risk }, 'risk: ' + c.risk)),
        h('p', { class: 'mkt2-desc' }, c.description),
        scopesFold(c),
        preview(c),
        h('div', { class: 'mkt2-featfoot' }, nm, btn('Add to workspace', () => addCurated(c, nm.value), 'btn primary')));
    };
    const row = (c) => {
      const isFeat = !filtered && featured.has(c.id), nm = isFeat ? null : nameInput(c, 'Name for ' + c.name);
      return h('article', { class: 'mkt2-row' }, tile(c, 40),
        h('div', { class: 'mkt2-rowmain' },
          h('div', { class: 'mkt2-rowhead' }, h('b', { class: 'mkt2-name' }, c.name), isFeat ? h('span', { class: 'mkt2-featmark' }, 'Featured') : null, h('span', { class: 'chip risk-' + c.risk }, 'risk: ' + c.risk)),
          h('p', { class: 'mkt2-desc' }, c.description),
          scopesFold(c),
          preview(c)),
        h('div', { class: 'mkt2-rowadd' }, catChip(c.category), trust(true), nm,
          btn('Add', () => addCurated(c, nm ? nm.value : null), 'btn primary')));
    };
    const groups = () => {
      const sections = [...new Set(S.market.map((c) => c.category))].map((cat) => ({ cat, items: matched.filter((c) => c.category === cat) })).filter((s) => s.items.length);
      if (!sections.length) return emptyState('search', 'No curated agents match', 'Nothing in the curated catalog matches this search and filter. Clear the filters to see all entries.', btn('Clear filters', clearFilters, 'btn'));
      return sections.map((s) => h('section', { class: 'mkt2-sec', 'aria-label': s.cat + ' curated agents' },
        h('div', { class: 'mkt2-sec-head' }, h('h3', {}, s.cat), h('span', { class: 'muted' }, 'Curated templates'), h('span', { class: 'mkt2-sec-count' }, `${s.items.length} agent${s.items.length === 1 ? '' : 's'}`)),
        h('div', { class: 'mkt2-list' }, s.items.map(row))));
    };
    const qEl = h('input', { class: 'mkt2-search', placeholder: 'Search curated agents', value: S.mkt2Q, maxlength: 60, 'aria-label': 'Search curated agents' });
    qEl.addEventListener('input', () => { S.mkt2Q = qEl.value; const p = qEl.selectionStart; render(); const e = document.querySelector('input[aria-label="Search curated agents"]'); if (e) { e.focus(); e.setSelectionRange(p, p); } });
    const chipRow = (label, values, current, set) => h('div', { class: 'mkt2-frow' }, h('span', { class: 'mkt2-flabel' }, label), values.map((v) => btn(v || 'All', () => { set(v); render(); }, 'mkt2-chip', { 'aria-pressed': current === v })));
    const toolbar = h('div', { class: 'mkt2-sticky' },
      h('div', { class: 'mkt2-trow' }, h('div', { class: 'mkt2-searchwrap' }, icon('search', 16), qEl),
        h('div', { class: 'mkt2-hits' }, h('span', {}, `${matched.length} of ${S.market.length} entries`), filtered ? btn('Clear filters', clearFilters, 'link') : null)),
      h('div', { class: 'mkt2-filters' }, chipRow('Category', cats, S.mkt2Cat, (v) => { S.mkt2Cat = v; }), chipRow('Risk', risks, S.mkt2Risk, (v) => { S.mkt2Risk = v; })));
    const featuredSec = (!filtered && S.market.length > 3) ? h('section', { class: 'mkt2-featsec', 'aria-label': 'Featured curated agents' },
      h('div', { class: 'mkt2-sec-head' }, h('h3', {}, 'Featured'), h('span', { class: 'muted' }, 'Three templates from the curated catalog')),
      h('div', { class: 'mkt2-featpanel' }, h('div', { class: 'mkt2-featrow' }, S.market.slice(0, 3).map(featCard)))) : null;
    const skeleton = h('div', { class: 'mkt2-featpanel' }, h('div', { class: 'mkt2-featrow' }, [0, 1, 2].map(() => h('div', { class: 'mkt2-featcard' }, h('span', { class: 'skel mkt2-skel' }), h('span', { class: 'skel mkt2-skel mkt2-skel-sm' })))));
    const curatedPane = h('div', { class: 'mkt2-pane' }, S.market.length ? toolbar : null, S.market.length ? featuredSec : skeleton, S.market.length ? groups() : null,
      h('p', { class: 'muted mkt2-footnote' }, 'Importing needs an admin account and is written to the audit log.'));
    const hfPane = () => {
      const hfq = h('input', { class: 'mkt2-search', placeholder: 'Search open models, for example llama or qwen', value: S.hfq, maxlength: 60, 'aria-label': 'Search Hugging Face' }); hfq.addEventListener('input', () => { S.hfq = hfq.value; });
      const search = () => run(async () => { try { S.hf = await api('/api/marketplace/huggingface?q=' + encodeURIComponent(S.hfq)); S.mkt2HfDone = true; } catch (e) { S.hf = []; S.mkt2HfDone = false; throw e; } });
      const hfCard = (m) => {
        const nm = h('input', { class: 'field mkt2-nameinput', value: S.hfname[m.id] ?? m.id.split('/')[1], maxlength: 40, 'aria-label': 'Name for ' + m.id }); nm.addEventListener('input', () => { S.hfname[m.id] = nm.value; });
        return h('article', { class: 'mkt2-hfcard' },
          h('div', { class: 'mkt2-hfhead' }, h('span', { class: 'mkt2-hfic' }, icon('store', 18)), h('div', { class: 'mkt2-hfid' }, h('b', { class: 'mkt2-name mono', title: m.id }, m.id), h('span', { class: 'mkt2-role' }, m.pipeline_tag || 'Open model')), trust(false)),
          h('div', { class: 'mkt2-tags' }, tag(`${m.downloads.toLocaleString()} downloads`), tag(`${m.likes} likes`), (m.tags || []).map((x) => tag(x))),
          h('a', { class: 'link mkt2-modellink', href: m.url, target: '_blank', rel: 'noopener noreferrer' }, 'Model card on Hugging Face'),
          h('div', { class: 'mkt2-hffoot' }, nm, btn('Import as agent', () => importAgent({ source: 'huggingface', ref: m.id, name: nm.value }, m.id), 'btn primary')));
      };
      return h('div', { class: 'mkt2-pane' },
        h('div', { class: 'mkt2-notecard' }, icon('shield', 18), h('div', {}, h('b', {}, 'External models start unverified'), h('p', { class: 'mkt2-desc' }, 'An imported model becomes an agent with read-only rights. To run it, point CFA_MODEL_BASE_URL at an OpenAI-compatible endpoint that serves it. Every import is recorded in the audit log.'))),
        h('div', { class: 'mkt2-sticky' }, h('div', { class: 'mkt2-trow' }, h('div', { class: 'mkt2-searchwrap' }, icon('search', 16), hfq), btn([icon('search', 16), 'Search'], search, 'btn primary mkt2-searchbtn'),
          S.mkt2HfDone ? h('div', { class: 'mkt2-hits' }, h('span', {}, `${S.hf.length} model${S.hf.length === 1 ? '' : 's'} from Hugging Face`)) : null)),
        S.hf.length ? h('div', { class: 'mkt2-hfgrid' }, S.hf.map(hfCard)) :
          S.mkt2HfDone ? emptyState('search', 'No open models found', 'Hugging Face returned no models for this search. Try another word.', null) :
            h('div', { class: 'mkt2-hint' }, icon('store', 20), h('div', {}, h('b', {}, 'Search Hugging Face'), h('p', { class: 'mkt2-desc' }, 'Results show the real model id, downloads, likes and tags from the Hugging Face API. Nothing is preloaded and nothing is installed without your click.'))));
    };
    const cardPane = () => {
      const ta = h('textarea', { class: 'field mkt2-json', rows: 8, placeholder: 'Paste an agent card (JSON exported from another workspace)', 'aria-label': 'Agent card JSON' }); ta.value = S.card; ta.addEventListener('input', () => { S.card = ta.value; });
      const nm = h('input', { class: 'field mkt2-nameinput', value: S.cardname, placeholder: 'Name for the agent', maxlength: 40, 'aria-label': 'Card agent name' }); nm.addEventListener('input', () => { S.cardname = nm.value; });
      return h('div', { class: 'mkt2-pane' }, h('div', { class: 'mkt2-importcard' },
        h('div', { class: 'mkt2-importhead' }, h('span', { class: 'mkt2-hfic' }, icon('doc', 18)), h('div', { class: 'mkt2-hfid' }, h('b', { class: 'mkt2-name' }, 'Paste an agent card'), h('span', { class: 'mkt2-role' }, 'JSON from another workspace')), trust(false)),
        h('p', { class: 'mkt2-desc' }, 'Cards carry a role and a system prompt, never memory or keys. Imported cards start unverified with read-only rights. Review the prompt before granting more.'),
        ta, nm,
        h('div', { class: 'mkt2-importfoot' }, btn('Import card', () => { let card; try { card = JSON.parse(S.card); } catch { S.err = 'That is not valid JSON.'; return render(); } importAgent({ source: 'card', name: S.cardname, card }, 'Card'); }, 'btn primary'),
          h('span', { class: 'mkt2-note' }, 'Admin only. Every import is written to the audit log.'))));
    };
    const pane = S.mtab === 'hf' ? hfPane() : S.mtab === 'card' ? cardPane() : curatedPane;
    return h('div', { class: 'body' }, h('div', { class: 'wide mkt2' }, hero, pane));
  }


  // ---------- control ----------
  const ctlLabel = (d) => (d === 'allow' ? 'Allow' : d === 'approval_required' ? 'Approval required' : 'Deny');
  // Date-only "to" dates include that whole day; the backend compares created_at as text.
  const ctlFilterQS = () => {
    const f = S.afilter || {};
    const until = f.until && /^\d{4}-\d{2}-\d{2}$/.test(f.until) ? f.until + 'T23:59:59.999999+00:00' : f.until;
    return [['since', f.since], ['until', until], ['actor', f.actor], ['event_type', f.event_type]]
      .map(([k, v]) => (v ? `${k}=${encodeURIComponent(v)}` : '')).filter(Boolean).join('&');
  };
  const ctlAuditPath = () => { const qs = ctlFilterQS(); return '/api/security/audit?limit=200' + (qs ? '&' + qs : ''); };
  const ctlLoadPolicies = async () => { S.policies = (await api('/api/security/policies')).policies; };
  const ctlLoadAudit = async () => {
    const d = await api(ctlAuditPath());
    S.audit = d.events || [];
    S.auditIntegrity = d.integrity || null;
    S.auditTotal = d.total_filtered == null ? S.audit.length : d.total_filtered;
    S.auditOpen = {};
  };
  const ctlRunSelfTest = () => {
    S.covBusy = true; render();
    run(async () => {
      try {
        await api('/api/selftest', { method: 'POST' });
        const [latest, cov] = await Promise.all([api('/api/selftest/latest'), api('/api/coverage')]);
        S.test = latest; S.cov = cov;
        S.info = `Self-test finished: ${latest.passed} passed, ${latest.failed} failed. Coverage evidence was refreshed.`;
      } finally { S.covBusy = false; }
    });
  };
  const ctlSavePolicy = (p) => {
    const decision = ((S.policyDraft || {})[p.action_type]) || p.decision;
    if (decision === p.decision) return;
    S.policyBusy = p.action_type; render();
    run(async () => {
      try {
        await api('/api/security/policies', { method: 'PUT', body: { action_type: p.action_type, decision } });
        await ctlLoadPolicies();
        if (S.policyDraft) delete S.policyDraft[p.action_type];
        S.info = `Policy for ${p.action_type} saved: ${ctlLabel(decision).toLowerCase()}.`;
      } finally { S.policyBusy = null; }
    });
  };
  const ctlResetPolicy = (p) => {
    S.policyBusy = p.action_type; render();
    run(async () => {
      try {
        await api(`/api/security/policies/${encodeURIComponent(p.action_type)}`, { method: 'DELETE' });
        await ctlLoadPolicies();
        if (S.policyDraft) delete S.policyDraft[p.action_type];
        S.info = `Policy for ${p.action_type} reset to the default (${ctlLabel(p.default_decision || 'deny').toLowerCase()}).`;
      } finally { S.policyBusy = null; }
    });
  };
  const ctlApplyAudit = () => {
    S.auditBusy = true; render();
    run(async () => { try { await ctlLoadAudit(); S.verify = ''; } finally { S.auditBusy = false; } });
  };
  const ctlResetAudit = () => {
    S.afilter = {};
    S.auditBusy = true; render();
    run(async () => { try { await ctlLoadAudit(); S.verify = ''; } finally { S.auditBusy = false; } });
  };
  const ctlToggleAudit = (id) => { S.auditOpen = S.auditOpen || {}; S.auditOpen[id] = !S.auditOpen[id]; render(); };
  const ctlChevron = (open) => { const v = icon('up', 14); v.style.transform = open ? 'rotate(180deg)' : ''; return v; };
  const ctlDecide = (a, decision) => run(async () => {
    await api(`/api/security/approvals/${a.id}/decision`, { method: 'POST', body: { decision, decided_by: 'ui' } });
    await go('control');
  });

  // ---- batch 19: dashboard helpers (real data only) ----
  const ctl2Age = (ts) => {
    const ms = Date.now() - Date.parse(ts || '');
    if (!Number.isFinite(ms) || ms < 0) return 'moment';
    const h = Math.floor(ms / 36e5);
    return h < 1 ? 'under 1 h' : h < 48 ? h + ' h' : Math.floor(h / 24) + ' days';
  };
  const ctl2Kpi = (label, value, sub, tone) => h('div', { class: 'ctl2-kpi' + (tone ? ' ' + tone : '') },
    h('div', { class: 'ctl2-kpi-label' }, label),
    h('div', { class: 'ctl2-kpi-value' }, value),
    h('div', { class: 'ctl2-kpi-sub' }, sub));
  const ctl2Card = (title, note, ...kids) => h('div', { class: 'ctl2-card' },
    h('div', { class: 'ctl2-card-head' }, h('b', {}, title), note ? h('span', { class: 'muted ctl2-card-note' }, note) : null),
    ...kids);
  const ctl2RiskCounts = () => {
    const k = { low: 0, medium: 0, high: 0, suspended: 0 };
    (S.ctlInv || []).forEach((a) => { const lvl = (a.risk && a.risk.level) || 'low'; k[lvl] = (k[lvl] || 0) + 1; });
    return k;
  };
  const ctl2RiskChart = () => {
    if (S.ctlInv == null) return h('p', { class: 'muted ctl2-empty' }, 'Loading inventory risk…');
    const k = ctl2RiskCounts(), order = [['low', '#1B7F79'], ['medium', '#B7791F'], ['high', '#B42318'], ['suspended', '#7C8BA5']];
    const total = order.reduce((n, [lvl]) => n + (k[lvl] || 0), 0);
    if (!total) return h('p', { class: 'muted ctl2-empty' }, 'No agents in this workspace yet. Risk levels appear once agents exist.');
    const W = 320, H = 148, barX = 78, barW = 176, max = Math.max(1, ...order.map(([lvl]) => k[lvl] || 0));
    const s = svg(W, H);
    order.forEach(([lvl, color], i) => {
      const y = 16 + i * 32, w = Math.round(((k[lvl] || 0) / max) * barW);
      sadd(s, 'text', { x: 0, y: y + 10, 'font-size': 11, fill: 'var(--muted)' }, lvl);
      sadd(s, 'rect', { x: barX, y: y, width: barW, height: 12, rx: 6, fill: 'var(--line)' });
      if (w > 0) sadd(s, 'rect', { x: barX, y: y, width: Math.max(4, w), height: 12, rx: 6, fill: color });
      sadd(s, 'text', { x: W - 2, y: y + 10, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--ink)' }, String(k[lvl] || 0));
    });
    return s;
  };
  const ctl2AuditDays = () => {
    const counts = {};
    (S.audit || []).forEach((e) => { const day = String(e.created_at || '').slice(0, 10); if (day) counts[day] = (counts[day] || 0) + 1; });
    const out = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      out.push({ day, n: counts[day] || 0 });
    }
    return out;
  };
  const ctl2AuditChart = () => {
    if (!(S.audit || []).length) return h('p', { class: 'muted ctl2-empty' }, 'No audit events in the loaded window yet.');
    const days = ctl2AuditDays(), W = 320, H = 130, pad = 14, bw = (W - 2 * pad) / days.length;
    const max = Math.max(1, ...days.map((d) => d.n));
    const s = svg(W, H);
    days.forEach((d, i) => {
      const barW = Math.max(4, bw - 8), x = pad + i * bw + 4;
      const hgt = d.n ? Math.max(3, Math.round(((H - 56) * d.n) / max)) : 2;
      const y = H - 30 - hgt;
      sadd(s, 'rect', { x, y, width: barW, height: hgt, rx: 3, fill: d.n ? 'var(--accent)' : 'var(--line)' });
      if (i % 2 === 0) sadd(s, 'text', { x: x + barW / 2, y: H - 12, 'text-anchor': 'middle', 'font-size': 9, fill: 'var(--muted)' }, d.day.slice(5));
      if (d.n) sadd(s, 'text', { x: x + barW / 2, y: y - 4, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--ink)' }, String(d.n));
    });
    return s;
  };
  const ctl2CoverageBars = () => {
    const items = (S.cov && S.cov.items) || [];
    if (!items.length) return h('p', { class: 'muted ctl2-empty' }, 'Coverage data is loading.');
    return h('div', { class: 'ctl2-bars' }, items.map((c) => {
      const covered = c.status === 'covered', partial = c.status === 'partial';
      const pct = covered ? 100 : partial ? 50 : 0, tone = covered ? 'ok' : partial ? 'warn' : 'bad';
      return h('div', { class: 'ctl2-barrow' },
        h('div', { class: 'ctl2-bar-label' },
          h('span', { class: 'ctl2-dot ' + tone, 'aria-hidden': 'true' }),
          h('span', { class: 'ctl2-bar-name', title: c.name }, (String(c.id).startsWith('ASI') ? c.id + ' · ' : '') + c.name)),
        h('div', { class: 'ctl2-track', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': c.name + ' coverage' },
          h('i', { class: 'ctl2-fill ' + tone, style: 'width:' + pct + '%' })),
        h('span', { class: 'ctl2-bar-status chip ctl-status ' + tone }, c.status));
    }));
  };
  const ctl2AttendanceCount = () => {
    const inv = S.ctlInv || [];
    return {
      unverified: inv.filter((a) => a.trust === 'unverified').length,
      gaps: inv.filter((a) => (a.accountability || []).length).length,
      high: inv.filter((a) => a.risk && a.risk.level === 'high').length,
    };
  };
  const ctl2Kpis = () => {
    const pend = (S.approvals || []).filter((a) => a.status === 'pending');
    const invSum = S.ctlInvSum, counts = ctl2AttendanceCount();
    const covItems = (S.cov && S.cov.items) || [];
    const covered = covItems.filter((c) => c.status === 'covered').length;
    const partial = covItems.filter((c) => c.status === 'partial').length;
    const policies = S.policies || [], custom = policies.filter((p) => p.overridden).length;
    const oldest = pend.length ? ctl2Age(pend[pend.length - 1].created_at) : '';
    return h('div', { class: 'ctl2-kpis' },
      ctl2Kpi('Pending approvals', pend.length ? String(pend.length) : String((S.sum || {}).pending_approvals ?? 0),
        pend.length ? 'oldest open ' + oldest : 'nothing waits for a decision', pend.length ? 'warn' : 'ok'),
      ctl2Kpi('Suspended agents', String((S.sum || {}).suspended ?? 0),
        'of ' + ((S.sum || {}).agents ?? '—') + ' agents · switch below', (S.sum || {}).suspended ? 'warn' : 'ok'),
      ctl2Kpi('High-risk agents', invSum ? String(invSum.high_risk) : '—',
        invSum ? 'risk score 4+ · ' + invSum.total + ' agents inventoried' : 'inventory is loading', counts.high ? 'bad' : 'ok'),
      ctl2Kpi('Unverified agents', S.ctlInv == null ? '—' : String(counts.unverified),
        S.ctlInv == null ? 'inventory is loading' : 'imported from outside, read-only rights', counts.unverified ? 'warn' : 'ok'),
      ctl2Kpi('Accountability gaps', S.ctlInv == null ? '—' : String(counts.gaps),
        invSum ? `${invSum.ownerless} no owner · ${invSum.no_sponsor} no sponsor · ${invSum.no_purpose} no purpose` : 'inventory is loading', counts.gaps ? 'warn' : 'ok'),
      ctl2Kpi('Coverage', covItems.length ? covered + ' / ' + covItems.length : '—',
        covItems.length ? partial + ' partial · ' + (covItems.length - covered - partial) + ' not covered' : 'coverage is loading',
        covItems.length && covered === covItems.length ? 'ok' : 'warn'),
      ctl2Kpi('Custom policies', policies.length ? custom + ' / ' + policies.length : '—',
        'effects changed from the defaults', custom ? 'info' : 'ok'));
  };
  const ctl2MetaStrip = () => h('div', { class: 'ctl2-meta' },
    [['Agents', (S.sum || {}).agents], ['Memory drafts', (S.sum || {}).drafts], ['Apps connected', (S.sum || {}).apps], ['Audit events', S.auditTotal]]
      .map(([label, value]) => h('span', { class: 'ctl2-meta-item' }, h('span', { class: 'muted' }, label), h('b', {}, String(value ?? '—')))));

  const ctl2Attention = () => {
    const inv = S.ctlInv || [], pend = (S.approvals || []).filter((a) => a.status === 'pending');
    const high = inv.filter((a) => a.risk && a.risk.level === 'high').sort((a, b) => (b.risk.score || 0) - (a.risk.score || 0));
    const gaps = inv.filter((a) => (a.accountability || []).length);
    const rows = [];
    pend.slice(0, 3).forEach((a) => rows.push(h('div', { class: 'ctl2-att-row' },
      h('span', { class: 'chip warn' }, 'approval'),
      h('div', { class: 'ctl2-att-main' }, h('b', {}, a.action_type), h('div', { class: 'muted' }, (a.risk_level || '') + ' risk · ' + a.description)),
      h('div', { class: 'ctl2-att-actions' }, btn('Approve', () => ctlDecide(a, 'approved'), 'link'), btn('Reject', () => ctlDecide(a, 'rejected'), 'link')))));
    high.slice(0, 3).forEach((a) => rows.push(h('div', { class: 'ctl2-att-row' },
      h('span', { class: 'chip risk-high' }, 'high risk'),
      h('div', { class: 'ctl2-att-main' }, h('b', {}, a.name), h('div', { class: 'muted' }, (a.team || 'General') + ' · score ' + ((a.risk && a.risk.score) || 0) + '/10 · ' + a.trust)),
      h('div', { class: 'ctl2-att-actions' }, btn('Review', () => go('inventory'), 'link')))));
    gaps.filter((a) => !(a.risk && a.risk.level === 'high')).slice(0, 3).forEach((a) => rows.push(h('div', { class: 'ctl2-att-row' },
      h('span', { class: 'chip warn' }, 'gaps'),
      h('div', { class: 'ctl2-att-main' }, h('b', {}, a.name), h('div', { class: 'muted' }, 'missing: ' + (a.accountability || []).join(', ') + ' · ' + (a.team || 'General'))),
      h('div', { class: 'ctl2-att-actions' }, btn('Assign', () => go('inventory'), 'link')))));
    const total = pend.length + high.length + gaps.length;
    return ctl2Card('Needs attention', total ? total + ' item' + (total === 1 ? '' : 's') : 'all clear',
      rows.length ? h('div', { class: 'ctl2-att-list' }, rows) : h('p', { class: 'muted ctl2-empty' }, 'Nothing needs attention: no pending approvals, no high-risk agents and no accountability gaps.'),
      total > rows.length ? h('p', { class: 'muted ctl2-more' }, (total - rows.length) + ' more item' + (total - rows.length === 1 ? '' : 's') + ' in the sections below.') : null);
  };
  const ctl2TopRisks = () => {
    const list = (S.ctlInv || []).slice().sort((a, b) => (((b.risk || {}).score) || 0) - (((a.risk || {}).score) || 0)).slice(0, 6);
    return ctl2Card('Top risks by score', 'Agents ranked by the inventory risk score',
      list.length ? h('div', { class: 'ctl2-risks' }, list.map((a) => {
        const score = (a.risk && a.risk.score) || 0, lvl = (a.risk && a.risk.level) || 'low';
        return h('div', { class: 'ctl2-risk-row' }, tile(a, 26),
          h('div', { class: 'ctl2-risk-main' }, h('b', {}, a.name), h('div', { class: 'muted ctl2-risk-sub' }, (a.team || 'General') + ' · ' + a.trust + ' · ' + a.status)),
          h('div', { class: 'ctl2-risk-score' },
            h('div', { class: 'ctl2-score', role: 'meter', 'aria-valuenow': score, 'aria-valuemin': 0, 'aria-valuemax': 10, 'aria-label': a.name + ' risk score' }, h('i', { style: 'width:' + Math.min(100, score * 10) + '%' })),
            h('span', { class: 'mono' }, score + '/10')),
          h('span', { class: 'chip risk-' + lvl }, lvl));
      })) : h('p', { class: 'muted ctl2-empty' }, 'No agent inventory yet.'),
      h('div', { class: 'ctl2-card-foot' }, btn('Open inventory', () => go('inventory'), 'link')));
  };
  const ctl2Incident = () => h('div', { class: 'ctl2-incident' },
    h('div', { class: 'ctl2-incident-main' },
      h('div', { class: 'ctl2-card-head' }, h('b', {}, 'Incident switch'), h('span', { class: 'chip ' + (S.sum.suspended ? 'warn' : 'ok') }, S.sum.suspended ? S.sum.suspended + ' suspended' : 'all agents active')),
      h('p', { class: 'muted' }, 'Suspends every agent at once: chat, calls and tool use stop. Resume restores them. Both actions are written to the audit log.')),
    h('div', { class: 'ctl2-incident-actions' },
      btn(S.panicArm ? 'Click again to suspend all agents' : 'Suspend all agents', () => {
        if (!S.panicArm) { S.panicArm = true; return render(); }
        S.panicArm = false;
        run(async () => { const r = await api('/api/security/panic', { method: 'POST', body: { action: 'suspend_all', reason: 'incident switch' } }); await loadBots(); S.sum = await api('/api/summary'); S.info = `${r.agents} agent(s) suspended.`; });
      }, S.panicArm ? 'btn primary' : 'btn'),
      btn('Resume all', () => run(async () => { await api('/api/security/panic', { method: 'POST', body: { action: 'resume_all' } }); await loadBots(); S.sum = await api('/api/summary'); S.info = 'All agents resumed.'; }))));

  // ---- audit trail: one detail renderer for the feed and the full table ----
  const ctlAuditDetail = (e) => h('div', { class: 'ctl-audit-detail-body' },
    h('div', { class: 'mono ctl-audit-meta' },
      h('div', {}, 'id: ' + e.id),
      h('div', {}, 'seq: ' + e.seq),
      h('div', {}, 'created_at: ' + e.created_at),
      h('div', {}, 'org_id: ' + e.org_id),
      h('div', {}, 'previous_hash: ' + e.previous_hash),
      h('div', {}, 'event_hash: ' + e.event_hash)),
    h('div', { class: 'muted ctl-audit-payload-label' }, 'Payload'),
    h('pre', { class: 'ctl-audit-json' }, JSON.stringify(e.payload, null, 2)));
  const ctl2FeedRow = (e) => {
    const open = !!(S.auditOpen || {})[e.id];
    const toggle = () => ctlToggleAudit(e.id);
    return h('div', { class: 'ctl2-feed-item' },
      h('div', { class: 'ctl2-feed-row', tabindex: 0, role: 'button', 'aria-expanded': open ? 'true' : 'false',
        'aria-label': `Event ${e.event_type} by ${e.actor || 'system'} — show details`, onclick: toggle,
        onkeydown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); } } },
        h('span', { class: 'mono ctl2-feed-time' }, when(e.created_at)),
        h('span', { class: 'ctl2-feed-type' }, e.event_type),
        h('span', { class: 'muted ctl2-feed-actor' }, e.actor || 'system'),
        h('span', { class: 'mono muted ctl2-feed-hash' }, String(e.event_hash || '').slice(0, 10)),
        h('span', { class: 'ctl-audit-chev' }, ctlChevron(open))),
      open ? h('div', { class: 'ctl2-feed-detail' }, ctlAuditDetail(e)) : null);
  };
  const ctl2AuditTrail = () => {
    const events = (S.audit || []).slice(0, 15), integ = S.auditIntegrity;
    const chain = integ
      ? (integ.valid ? h('span', { class: 'chip ok' }, 'chain valid · ' + integ.checked + ' events') : h('span', { class: 'chip warn' }, 'chain broken'))
      : h('span', { class: 'chip' }, 'integrity not checked yet');
    return h('section', { class: 'ctl2-sec', 'aria-label': 'Audit trail' },
      h('div', { class: 'ctl2-sec-head' }, h('h2', { class: 'ctl2-h2' }, 'Audit trail'), chain, h('span', { class: 'sp' }),
        btn('Open all events', () => { const el = document.getElementById('ctl2-all-audit'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 'link')),
      h('p', { class: 'muted ctl2-note' }, 'Newest first. Click a row for the payload and the hash chain fields. The full, filterable log with the SIEM export is in the next section.'),
      events.length ? h('div', { class: 'ctl2-feed' }, events.map(ctl2FeedRow)) : h('p', { class: 'muted ctl2-empty' }, 'No audit events yet. The first action in this workspace starts the chain.'));
  };

  function ctlCoverage() {
    const cov = S.cov || {}, items = cov.items || [];
    const covered = items.filter((c) => c.status === 'covered').length;
    const partial = items.filter((c) => c.status === 'partial').length;
    const missing = items.length - covered - partial;
    const evidence = (c) => (c.evidence && c.evidence.total
      ? `${c.evidence.passed} of ${c.evidence.total} probes passed`
      : 'No self-test run yet — evidence will appear after you run the self-test');
    const card = (c) => {
      const tone = c.status === 'covered' ? 'ok' : c.status === 'partial' ? 'warn' : 'bad';
      const controls = c.controls || [], gaps = c.gaps || [];
      return h('div', { class: 'card ctl-cov-card' },
        h('div', { class: 'row2 ctl-cov-title' }, h('span', { class: 'ctl-dot ' + tone, 'aria-hidden': 'true' }),
          h('b', { style: 'flex:1' }, (String(c.id).startsWith('ASI') ? c.id + ' · ' : '') + c.name),
          h('span', { class: 'chip ctl-status ' + tone }, c.status)),
        h('div', { class: 'muted ctl-cov-evidence' }, evidence(c)),
        controls.length ? h('ul', { class: 'ctl-cov-list' }, controls.slice(0, 3).map((x) => h('li', {}, x))) : null,
        controls.length > 3 ? h('details', { class: 'ctl-cov-more' }, h('summary', { class: 'muted' }, `Show ${controls.length - 3} more control${controls.length - 3 === 1 ? '' : 's'}`), h('ul', { class: 'ctl-cov-list' }, controls.slice(3).map((x) => h('li', {}, x)))) : null,
        gaps.length ? h('div', { class: 'muted ctl-cov-gaps' }, 'Known gaps: ' + gaps.join('; ')) : null);
    };
    return h('section', { class: 'ctl-cov', 'aria-label': 'OWASP agentic coverage' },
      h('div', { class: 'ctl-cov-head' }, h('h2', { class: 'ctl-h2' }, 'OWASP agentic coverage'), h('span', { class: 'sp' }),
        btn(S.covBusy ? 'Running self-test…' : [icon('flask', 16), 'Run self-test'], ctlRunSelfTest, 'btn' + (S.covBusy ? '' : ' primary'), { disabled: !!S.covBusy, 'aria-busy': S.covBusy ? 'true' : null })),
      h('p', { class: 'muted ctl-cov-framework' }, cov.framework || 'Coverage data is not available right now.'),
      h('p', { class: 'muted ctl-cov-disclaimer' }, cov.disclaimer || ''),
      h('p', { class: 'muted ctl-cov-summary' }, `${covered} covered · ${partial} partial · ${missing} not covered`),
      items.length ? h('div', { class: 'ctl-cov-grid' }, items.map(card)) : emptyState('shield', 'No coverage data', 'The coverage endpoint returned no items. Nothing is shown rather than guessed.'));
  }

  function ctlPolicies() {
    const list = S.policies || [], decisions = ['allow', 'approval_required', 'deny'];
    const busy = (p) => S.policyBusy === p.action_type;
    const row = (p) => {
      const draft = (S.policyDraft || {})[p.action_type];
      const current = draft == null ? p.decision : draft;
      const changed = current !== p.decision;
      const sel = h('select', { class: 'field ctl-policy-select', 'aria-label': 'Effect for the policy ' + p.action_type, disabled: busy(p), onchange: (e) => { S.policyDraft = S.policyDraft || {}; S.policyDraft[p.action_type] = e.target.value; render(); } },
        decisions.map((d) => h('option', { value: d, selected: current === d }, ctlLabel(d))));
      return h('tr', {},
        h('td', {}, h('div', { class: 'mono' }, p.action_type), p.description ? h('div', { class: 'muted ctl-policy-desc' }, p.description) : null),
        h('td', {}, sel),
        h('td', {}, h('span', { class: 'chip' + (p.overridden ? ' ok' : '') }, p.overridden ? 'custom' : 'default')),
        h('td', {}, h('span', { class: 'row2 ctl-policy-actions' },
          changed ? btn('Save', () => ctlSavePolicy(p), 'btn primary', { disabled: busy(p) }) : null,
          p.overridden ? btn('Reset', () => ctlResetPolicy(p), 'link', { disabled: busy(p) }) : null)));
    };
    return [h('h2', {}, 'Policies'),
      h('p', { class: 'muted' }, 'The policy engine decides whether an action runs immediately, waits for a human approval, or is rejected. Changes apply to new approval requests in this organisation and are written to the audit log. Admin only.'),
      h('div', { class: 'tbl-wrap ctl-policy-wrap' }, h('table', { class: 'ctl-policy-table' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Action type'), h('th', {}, 'Effect'), h('th', {}, 'Source'), h('th', {}, 'Actions'))),
        h('tbody', {}, list.map(row)))),
      h('div', { class: 'ctl-effect-help' },
        h('div', {}, h('span', { class: 'chip ok' }, 'Allow'), ' runs immediately when the risk level does not need a human decision.'),
        h('div', {}, h('span', { class: 'chip warn' }, 'Approval required'), ' creates a pending request in the approval queue and never runs on its own.'),
        h('div', {}, h('span', { class: 'chip risk-high' }, 'Deny'), ' is rejected automatically. Unknown action types always fall back to deny.')),
      S.policyMeta && S.policyMeta.note ? h('p', { class: 'muted ctl-fine' }, S.policyMeta.note) : null];
  }

  function ctlAudit() {
    const f = S.afilter || {};
    const field = (key, label, extra) => {
      const i = h('input', { class: 'field ctl-audit-filter', 'aria-label': label, value: f[key] || '', ...extra });
      i.addEventListener('input', () => { S.afilter = S.afilter || {}; S.afilter[key] = i.value; });
      return i;
    };
    const types = [...new Set((S.audit || []).map((e) => e.event_type))].sort();
    const shown = (S.audit || []).length;
    const total = S.auditTotal == null ? shown : S.auditTotal;
    const count = total > shown ? `${shown} of ${total} events shown` : `${shown} event${shown === 1 ? '' : 's'}`;
    const row = (e) => {
      const open = !!(S.auditOpen || {})[e.id];
      const toggle = () => ctlToggleAudit(e.id);
      return [h('tr', { class: 'ctl-audit-row', tabindex: 0, 'aria-expanded': open ? 'true' : 'false', 'aria-label': `Event ${e.event_type} by ${e.actor || 'system'} — show details`, onclick: toggle,
        onkeydown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); } } },
        h('td', { class: 'mono ctl-audit-time' }, when(e.created_at)),
        h('td', {}, e.event_type),
        h('td', {}, e.actor || 'system'),
        h('td', { class: 'mono' }, String(e.event_hash || '').slice(0, 12)),
        h('td', {}, h('span', { class: 'ctl-audit-chev' }, ctlChevron(open)))),
        open ? h('tr', { class: 'ctl-audit-detail' }, h('td', { colspan: 5 }, ctlAuditDetail(e))) : null];
    };
    return [h('h2', {}, 'Audit log'),
      h('p', { class: 'muted' }, 'Hash-linked chain per organisation. Filters run on the server; the export sends the same filters as NDJSON for SIEM tools. Click a row to see the full payload.'),
      h('div', { class: 'ctl-filters' },
        field('event_type', 'Event type starts with', { list: 'ctl-audit-event-types', placeholder: 'Event type starts with…' }),
        field('actor', 'Actor contains', { placeholder: 'Actor contains…' }),
        field('since', 'From date', { type: 'date' }),
        field('until', 'To date', { type: 'date' }),
        h('datalist', { id: 'ctl-audit-event-types' }, types.map((t) => h('option', { value: t })))),
      h('div', { class: 'row2 ctl-audit-actions' },
        btn(S.auditBusy ? 'Applying…' : 'Apply filters', ctlApplyAudit, 'btn primary', { disabled: !!S.auditBusy }),
        btn('Reset', ctlResetAudit, 'btn', { disabled: !!S.auditBusy }),
        h('span', { class: 'muted ctl-audit-count' }, count),
        h('span', { class: 'sp' }),
        btn('Verify integrity', () => run(async () => { const v = await api('/api/security/audit/verify'); S.verify = v.valid ? `Chain intact (${v.checked} events). It detects edits; it is not an external signature.` : 'Chain broken: ' + JSON.stringify(v); })),
        btn('Export for SIEM (NDJSON)', () => { const qs = ctlFilterQS(); run(async () => { await dl('/api/security/audit/export' + (qs ? '?' + qs : ''), 'audit-export.ndjson'); }); }, 'btn primary')),
      S.verify ? h('p', { class: 'muted' }, S.verify) : null,
      h('div', { class: 'tbl-wrap ctl-audit-wrap' }, h('table', { class: 'ctl-audit-table' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Time'), h('th', {}, 'Event type'), h('th', {}, 'Actor'), h('th', {}, 'Hash'), h('th', { 'aria-label': 'Details' }, ''))),
        h('tbody', {}, shown ? (S.audit || []).map(row) : h('tr', {}, h('td', { colspan: 5, class: 'muted' }, 'No audit events match these filters.')))))]
  }

  function controlView() {
    const pend = (S.approvals || []).filter((a) => a.status === 'pending');
    const header = h('div', { class: 'ctl2-head' },
      h('div', { class: 'ctl2-headtext' },
        h('div', { class: 'ctl2-eyebrow' }, 'Governance'),
        h('h2', { class: 'ctl2-title' }, 'Control'),
        h('p', { class: 'muted ctl2-sub' }, 'Live posture for this organisation: approvals, agent risk, coverage and the hash-linked audit trail. Every value comes from the server.')),
      h('div', { class: 'ctl2-headactions' }, btn('Refresh', () => { go('control'); }, 'btn'), btn('Open inventory', () => go('inventory'), 'btn')));
    const auditDays = ctl2AuditDays(), auditDaysUsed = auditDays.filter((d) => d.n).length;
    const auditCaption = 'Events per day from the loaded audit window (' + (S.audit || []).length + ' of up to 200 newest events).'
      + (auditDaysUsed === 1 && (S.audit || []).length ? ' The loaded window covers a single day so far; the chart fills in as the workspace is used.' : '');
    const charts = h('div', { class: 'ctl2-charts' },
      ctl2Card('Risk distribution', 'Inventory levels', h('div', { class: 'ctl2-chart' }, ctl2RiskChart()),
        h('p', { class: 'muted ctl2-caption' }, 'Computed from capabilities, tool grants, trust and criticality — not a model guess.')),
      ctl2Card('Agentic coverage', 'Self-assessment', h('div', { class: 'ctl2-chart ctl2-chart-tight' }, ctl2CoverageBars()),
        h('p', { class: 'muted ctl2-caption' }, 'Covered means every mapped control is present; partial means gaps remain. Full details below.')),
      ctl2Card('Audit volume', 'Last 14 days', h('div', { class: 'ctl2-chart' }, ctl2AuditChart()),
        h('p', { class: 'muted ctl2-caption' }, auditCaption)));
    const mid = h('div', { class: 'ctl2-mid' }, ctl2Attention(), ctl2TopRisks());
    const approvalsSec = h('section', { class: 'ctl2-sec', 'aria-label': 'Approval queue' },
      h('h2', {}, 'Approval queue'), h('p', { class: 'muted' }, 'Approving records a human decision. A tool call only runs when you execute it afterwards.'),
      pend.length ? h('div', { class: 'ctl2-list' }, pend.map((a) => h('div', { class: 'card ctl2-item' }, h('b', {}, a.action_type), ` (${a.risk_level}): ${a.description}`, h('div', { class: 'row2', style: 'margin-top:8px' }, ['approved', 'rejected'].map((d) => btn(d === 'approved' ? 'Approve' : 'Reject', () => ctlDecide(a, d))))))) : h('p', { class: 'muted ctl2-empty' }, 'Nothing pending.'));
    const toolSec = h('section', { class: 'ctl2-sec', 'aria-label': 'Tool calls' },
      h('h2', {}, 'Tool calls'), S.toolCalls.length ? h('div', { class: 'ctl2-list' }, S.toolCalls.map((t) => h('div', { class: 'card ctl2-item' }, h('b', {}, `${t.app}.${t.tool}`), ` as ${botBy(t.bot_id).name}`, h('span', { class: 'chip ' + (['invalidated', 'expired'].includes(t.status) ? 'warn' : ''), style: 'margin-left:8px' }, `${t.status} / approval ${t.approval_status}`), h('div', { class: 'pre' }, JSON.stringify(t.args)), t.payload_hash ? h('div', { class: 'muted mono', style: 'font-size:11px' }, `Approval covers exactly this payload (${t.payload_hash})` + (t.expires_at ? `, valid until ${when(t.expires_at)}` : '')) : null,
        t.status === 'pending' && t.approval_status === 'approved' ? h('div', { class: 'row2', style: 'margin-top:8px' }, btn('Execute now', () => run(async () => { await api(`/api/tool-calls/${t.approval_id}/execute`, { method: 'POST' }); await go('control'); }), 'btn primary')) : null, t.result ? h('div', { class: 'pre' }, t.result) : null))) : h('p', { class: 'muted ctl2-empty' }, 'No tool calls waiting.'));
    const selftestSec = h('section', { class: 'ctl2-sec', 'aria-label': 'Self-test section' },
      h('h2', {}, 'Authorization self-test'), h('p', { class: 'muted' }, "Synthetic probes against this app: capabilities, tool grants, suspended agents, memory spaces, unverified and instruction-like notes. It tests this app's enforcement, not model behavior."),
      h('div', { class: 'row2' }, btn(S.covBusy ? 'Running self-test…' : [icon('flask', 16), 'Run self-test'], ctlRunSelfTest, 'btn', { disabled: !!S.covBusy }), btn('Run finance demo', () => run(async () => { S.demo = await api('/api/demo/finance', { method: 'POST' }); S.test = await api('/api/selftest/latest'); S.cov = await api('/api/coverage'); await go('control'); }))),
      S.demo ? h('div', {}, S.demo.steps.map((x) => h('p', {}, (x.ok ? 'OK: ' : 'FAIL: ') + x.step))) : null,
      S.test && S.test.id ? [h('p', {}, h('b', {}, `${S.test.passed} passed, ${S.test.failed} failed `), btn('Download report', () => run(async () => { await dl(`/api/selftest/${S.test.id}/report.md`, 'selftest-report.md'); }), 'link'), ' ', S.test.share_url ? [h('a', { class: 'link', href: S.test.share_url, target: '_blank', rel: 'noopener noreferrer' }, 'Open public link'), ' ', btn('Copy', () => { navigator.clipboard && navigator.clipboard.writeText(location.origin + S.test.share_url); S.info = 'Link copied. Anyone with it can read this report.'; render(); }, 'link'), ' ', btn('Revoke', () => run(async () => { await api(`/api/selftest/${S.test.id}/share`, { method: 'DELETE' }); S.test = await api('/api/selftest/latest'); }), 'link')] : btn('Create public link', () => run(async () => { await api(`/api/selftest/${S.test.id}/share`, { method: 'POST' }); S.test = await api('/api/selftest/latest'); }), 'link')),
        h('div', { class: 'tbl-wrap' }, h('table', { class: 'ctl-selftest-table' }, h('tbody', {}, S.test.probes.filter((x) => !x.ok).concat(S.test.probes.filter((x) => x.ok).slice(0, 6)).map((x) => h('tr', {}, h('td', {}, x.name), h('td', {}, x.expected), h('td', {}, x.actual), h('td', {}, x.ok ? 'pass' : 'FAIL'))))))] : null);
    const pipelineSec = S.funnel ? h('section', { class: 'ctl2-sec', 'aria-label': 'Pipeline' },
      h('h2', {}, 'Pipeline'), h('div', { class: 'ctl2-pipeline' }, [['Page views', S.funnel.last_30_days.welcome_view], ['Pilot clicks', S.funnel.last_30_days.cta_pilot], ['Leads', S.funnel.leads_total], ['Presets applied', S.funnel.last_30_days.preset_applied], ['Upgrade clicks', S.funnel.last_30_days.upgrade_click]].map(([l, v]) => h('div', { class: 'ctl2-mini' }, h('span', { class: 'muted' }, l + ' · 30 days'), h('b', {}, String(v || 0))))),
      S.leads.length ? h('div', { class: 'tbl-wrap' }, h('table', {}, h('tbody', {}, S.leads.slice(0, 8).map((x) => h('tr', {}, h('td', { class: 'mono' }, when(x.created_at)), h('td', {}, x.name), h('td', {}, x.email), h('td', {}, x.company), h('td', { class: 'muted' }, x.message.slice(0, 60))))))) : h('p', { class: 'muted ctl2-empty' }, 'No leads yet. The public page /welcome has the pilot form.')) : null;
    return h('div', { class: 'body' }, h('div', { class: 'wide ctl2' },
      header, ctl2Kpis(), ctl2MetaStrip(), charts, ctl2Incident(), mid,
      h('div', { class: 'ctl2-two' }, approvalsSec, toolSec),
      ctl2AuditTrail(),
      h('section', { id: 'ctl2-all-audit', class: 'ctl2-sec', 'aria-label': 'All audit events' }, ctlAudit()),
      ctlCoverage(),
      h('section', { class: 'ctl2-sec', 'aria-label': 'Policies' }, ctlPolicies()),
      selftestSec,
      pipelineSec));
  }

  // ---------- modals ----------
  async function openApps() {
    S.modal = 'apps'; S.appOpen = null; S.appTab = 'catalog'; S.appQ = ''; S.appCat = 'All';
    S.menu = false; S.drawer = false; S.err = ''; S.mcpNote = ''; S.mcpBusy = null;
    S.appsLoading = !(S.apps && S.apps.length);
    render();
    await run(async () => { try { await Promise.all([loadApps(), loadBots()]); } finally { S.appsLoading = false; syncOverlays(true); } });
  }
  async function openAgent() { S.modal = 'agent'; S.menu = false; render(); await run(async () => { const t = await api('/api/templates'); S.tmpl = t.filter((x) => x.id); S.caps = (t.find((x) => x.capabilities) || {}).capabilities || []; }); }
  const close = () => { S.modal = null; render(); };
  function appsModal() {
    if (S.appTab === undefined) S.appTab = 'catalog';
    if (S.mcpBusy === undefined) S.mcpBusy = null;
    if (S.mcpNote === undefined) S.mcpNote = '';
    const apps = S.apps || [], bots = S.bots || [], tab = S.appTab || 'catalog';
    const connected = apps.filter((a) => a.connected), live = apps.filter((a) => a.live);
    const q = S.appQ || '', cat = S.appCat || 'All';
    // Structural refresh only (tab/detail switches and actions that change the connector set).
    // Everything else patches the existing DOM, so the tree does not flicker or lose scroll.
    const refresh = (top = null) => {
      const old = document.querySelector('.mcp-modal'), keep = old ? old.scrollTop : 0;
      syncOverlays(true);
      const next = document.querySelector('.mcp-modal');
      if (next) next.scrollTop = top == null ? keep : top;
    };
    const closeApps = () => { S.modal = null; S.appOpen = null; S.appTab = 'catalog'; S.appQ = ''; S.appCat = 'All'; S.mcpNote = ''; S.mcpBusy = null; S.err = ''; render(); };
    const setTab = (id) => { if (S.mcpBusy) return; S.appTab = id; S.appOpen = null; S.mcpNote = ''; S.err = ''; refresh(0); };
    const openDetail = (id) => { if (S.mcpBusy) return; S.appOpen = id; S.tcall = { bot: '', tool: '', args: '{}', out: '', outStatus: '' }; S.mcpNote = ''; S.err = ''; refresh(0); };
    const back = () => { if (S.mcpBusy) return; S.appOpen = null; S.mcpNote = ''; refresh(0); };
    const riskWord = (r) => (r === 'read' ? 'read' : r === 'write' ? 'needs approval' : 'blocked');
    const fmtTool = (n) => `${n} tool${n === 1 ? '' : 's'}`;
    const toolSummary = (a) => {
      const n = (r) => a.tools.filter((x) => x.risk === r).length, r = n('read'), w = n('write'), s = n('secret');
      return `${r} read · ${w} ${w === 1 ? 'needs' : 'need'} approval · ${s} blocked`;
    };
    const agentsOf = (a) => bots.filter((b) => (a.grants[b.id] || []).length);
    const visible = (a) => (tab !== 'catalog' || (S.appCat || 'All') === 'All' || a.category === S.appCat) && `${a.name} ${a.category} ${a.description}`.toLowerCase().includes((S.appQ || '').trim().toLowerCase());
    const filtered = apps.filter(visible);
    const cats = ['All', ...new Set(apps.map((a) => a.category))].sort((x, y) => (x === 'All' ? -1 : y === 'All' ? 1 : x.localeCompare(y)));
    const openApp = S.appOpen ? apps.find((a) => a.id === S.appOpen) : null;
    if (S.appOpen && !openApp) S.appOpen = null;
    const loading = !!S.appsLoading && !apps.length;
    // Feedback is painted into one persistent notice node instead of rebuilding the overlay.
    const paintNotice = () => {
      const el = document.getElementById('mcp-notice');
      if (!el) return;
      el.replaceChildren(...(S.err ? [h('div', { class: 'mcp-alert mcp3-alert', role: 'alert' }, S.err)]
        : S.mcpNote ? [h('div', { class: 'mcp-success mcp3-success' }, S.mcpNote)] : []));
    };
    // A button whose label can change while its request runs; the tree around it stays untouched.
    const actionBtn = (label, cls, handler) => {
      const t = h('span', {}, label);
      let b;
      b = btn([t], () => handler({ b, t }), cls || 'btn');
      return { b, t };
    };
    // One request at a time. Disables only the clicked button, then either patches the notice
    // (in-place actions) or forces one structural rebuild (opts.reload).
    const runAction = (key, ref, busyText, fn, opts = {}) => {
      if (S.mcpBusy) return;
      S.mcpBusy = key; S.err = ''; S.mcpNote = '';
      paintNotice();
      const modal = document.querySelector('.mcp-modal');
      if (modal) modal.setAttribute('aria-busy', 'true');
      const idle = ref ? ref.t.textContent : '';
      if (ref) { ref.b.disabled = true; if (busyText) ref.t.textContent = busyText; }
      run(fn).then(() => {
        S.mcpBusy = null;
        const m = document.querySelector('.mcp-modal');
        if (m) m.removeAttribute('aria-busy');
        if (ref) { ref.b.disabled = false; ref.t.textContent = idle; }
        if (S.err) S.mcpNote = '';
        if (opts.reload) refresh(); else paintNotice();
      });
    };
    // In-place search/category filtering: no overlay rebuild, so the caret never jumps.
    const applyFilter = () => {
      const body = document.getElementById('mcp-body');
      if (!body) return;
      const needle = (S.appQ || '').trim().toLowerCase(), mode = body.dataset.mode;
      let shown = 0, connShown = 0;
      body.querySelectorAll('.mcp-card').forEach((card) => {
        const okCat = (S.appCat || 'All') === 'All' || card.dataset.cat === S.appCat;
        const ok = okCat && (!needle || (card.dataset.search || '').includes(needle));
        card.hidden = !ok;
        if (ok) shown++;
      });
      body.querySelectorAll('.mcp-conn').forEach((row) => {
        const ok = !needle || (row.dataset.search || '').includes(needle);
        row.hidden = !ok;
        if (ok) connShown++;
      });
      const count = document.querySelector('[data-mcp-count]');
      if (count) count.textContent = mode === 'catalog' ? `${shown} of ${apps.length} apps` : `${connShown} of ${connected.length} connected`;
      const empty = body.querySelector('[data-mcp-empty]');
      if (empty) empty.hidden = mode === 'catalog' ? shown > 0 : connShown > 0;
      const chips = document.querySelectorAll('[data-mcp-cat]');
      chips.forEach((chip) => chip.setAttribute('aria-pressed', chip.dataset.mcpCat === (S.appCat || 'All') ? 'true' : 'false'));
    };
    const resetFilters = () => {
      S.appQ = ''; S.appCat = 'All';
      const input = document.querySelector('input[aria-label="Search connectors"]');
      if (input) input.value = '';
      applyFilter();
    };

    const tag = (label, on) => h('span', { class: 'chip mcp3-tag' + (on ? ' on' : '') }, on ? h('i', { class: 'mcp3-tag-dot', 'aria-hidden': 'true' }) : null, label);
    const head = h('div', { class: 'mcp-head mcp3-head' },
      h('div', { class: 'mcp-headtext' }, h('h2', { class: 'mcp-title mcp3-title' }, 'Connect apps'), h('p', { class: 'muted mcp3-sub' }, 'Browse the demo catalog, manage per-agent tool grants, or connect a live MCP server over Streamable HTTP.')),
      h('div', { class: 'mcp-headright' },
        h('span', { class: 'chip mcp3-count-chip' }, connected.length + ' connected'),
        h('span', { class: 'chip mcp3-count-chip' }, live.length + ' live MCP'),
        h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Close apps dialog', onclick: closeApps }, icon('x'))));
    const TABS = [['catalog', 'Catalog'], ['mine', 'My connectors'], ['add', 'Add MCP server']];
    const tabs = h('div', { class: 'tabs mcp-tabs mcp3-tabs', role: 'tablist' }, TABS.map(([id, label]) =>
      btn(label, () => setTab(id), 'mcp-tab', { role: 'tab', 'aria-selected': tab === id ? 'true' : 'false', 'aria-controls': 'mcp-body' })));
    const banner = tab !== 'add' && !openApp ? h('div', { class: 'mcp-banner mcp3-banner' }, icon('grid', 15), h('span', {}, 'The catalog apps are a demo and contact no external service. Live MCP servers you add are real and run on your own endpoint.')) : null;
    const searchEl = h('input', { class: 'mcp-searchinput', placeholder: tab === 'catalog' ? 'Search apps and MCP servers' : 'Search connected apps and servers', value: q, 'aria-label': 'Search connectors' });
    searchEl.addEventListener('input', () => { S.appQ = searchEl.value; applyFilter(); });
    const toolbar = !openApp && tab !== 'add' && !loading ? [
      h('div', { class: 'mcp-toolbar mcp3-toolbar' }, h('div', { class: 'mcp-search mcp3-search' }, icon('search', 16), searchEl),
        h('span', { class: 'muted mcp-count mcp3-result', 'data-mcp-count': '1' }, tab === 'catalog' ? `${filtered.length} of ${apps.length} apps` : `${apps.filter((a) => a.connected && visible(a)).length} of ${connected.length} connected`)),
      tab === 'catalog' ? h('div', { class: 'mcp-cats mcp3-cats' }, cats.map((c) => btn(c, () => { S.appCat = c; applyFilter(); }, 'chip mcp3-cat', { 'aria-pressed': cat === c ? 'true' : 'false', 'data-mcp-cat': c }))) : null] : [];
    const skelLine = (style) => h('span', { class: 'skel mcp3-skel-line', style });
    const skeleton = () => h('div', { class: 'mcp-grid mcp3-grid mcp3-skel' }, [0, 1, 2].map(() => h('div', { class: 'card mcp-card mcp3-card mcp3-skel-card' },
      skelLine('height:36px;width:36px;border-radius:8px'), skelLine('height:13px;width:55%;margin-top:12px'),
      skelLine('height:11px;width:92%;margin-top:12px'), skelLine('height:11px;width:70%;margin-top:7px'))));
    const skeletonRows = () => h('div', { class: 'mcp3-skel' }, [0, 1, 2].map(() => h('div', { class: 'card mcp-conn mcp3-card mcp3-skel-card mcp3-skel-row' },
      skelLine('height:36px;width:36px;border-radius:8px'), h('div', { class: 'mcp3-skel-copy' }, skelLine('height:13px;width:45%'), skelLine('height:11px;width:75%;margin-top:8px')))));

    const connectApp = (a, ref) => runAction('connect:' + a.id, ref, 'Connecting…', async () => {
      await api(`/api/apps/${a.id}/connect`, { method: 'POST' });
      await loadApps();
      S.appOpen = a.id; S.tcall = { bot: '', tool: '', args: '{}', out: '', outStatus: '' };
      S.mcpNote = `${a.name} connected in demo mode. No external service is contacted.`;
    }, { reload: true });
    const refreshServer = (a, ref) => runAction('refresh:' + a.id, ref, 'Refreshing…', async () => {
      const r = await api(`/api/mcp/servers/${a.id}/refresh`, { method: 'POST' });
      await loadApps();
      S.mcpNote = `Tools refreshed for ${a.name}: ${fmtTool((r.tools || []).length)}.`;
    }, { reload: true });
    const removeServer = (a, ref) => {
      if (S.mcpBusy) return;
      if (!window.confirm(`Remove the MCP server "${a.name}"? Its tools and every agent grant for it are deleted. This cannot be undone.`)) return;
      runAction('remove:' + a.id, ref, 'Removing…', async () => { await api(`/api/mcp/servers/${a.id}`, { method: 'DELETE' }); S.appOpen = null; S.appTab = 'mine'; await loadApps(); S.mcpNote = `Live MCP server ${a.name} removed.`; }, { reload: true });
    };
    const disconnectApp = (a, ref) => {
      if (S.mcpBusy) return;
      if (!window.confirm(`Disconnect "${a.name}"? Every agent grant for this app is deleted. You can reconnect it from the catalog at any time.`)) return;
      runAction('disconnect:' + a.id, ref, 'Disconnecting…', async () => { await api(`/api/apps/${a.id}/disconnect`, { method: 'POST' }); S.appOpen = null; S.appTab = 'mine'; await loadApps(); S.mcpNote = `${a.name} disconnected. Agent grants for it were removed.`; }, { reload: true });
    };

    const catalogCard = (a) => {
      const agents = agentsOf(a);
      const connectRef = actionBtn('Connect', 'btn mcp3-cta', (ref) => connectApp(a, ref));
      return h('div', { class: 'card mcp-card mcp3-card', hidden: !visible(a), 'data-search': `${a.name} ${a.category} ${a.description}`.toLowerCase(), 'data-cat': a.category },
        h('div', { class: 'mcp-card-top' }, appLogo(a, 36), h('div', { class: 'mcp-card-title' }, h('b', { title: a.name }, a.name), h('div', { class: 'muted' }, a.category))),
        h('div', { class: 'row2 mcp3-tags' }, tag(a.live ? 'Live' : 'Demo', a.live), a.connected ? tag('Connected', true) : null,
          a.tools.some((x) => x.risk === 'secret') ? h('span', { class: 'chip mcp3-tag mcp3-warn' }, 'secrets blocked') : null),
        h('p', { class: 'mcp-desc', title: a.description }, a.description || 'No description provided.'),
        h('div', { class: 'mcp-toolcounts' }, toolSummary(a)),
        h('div', { class: 'mcp-card-foot' },
          h('span', { class: 'mcp-status' }, a.connected ? (agents.length ? `${agents.length} agent${agents.length === 1 ? '' : 's'} with grants` : 'Connected · no agent grants yet') : 'Not connected'),
          a.connected ? btn('Manage grants', () => openDetail(a.id), 'btn mcp3-cta') : connectRef.b));
    };
    const catalogBody = () => {
      if (loading) return skeleton();
      if (!apps.length) return h('div', { class: 'mcp-empty mcp3-empty' }, icon('grid', 30), h('h3', {}, 'No apps available'), h('p', { class: 'muted' }, 'The API returned no apps for this workspace. Reload the dialog to try again.'));
      return h('div', {},
        h('div', { class: 'mcp-grid mcp3-grid' }, apps.map(catalogCard)),
        h('div', { class: 'mcp-empty mcp3-empty', 'data-mcp-empty': '1', hidden: filtered.length > 0 }, icon('search', 30), h('h3', {}, 'No apps match your search'),
          h('p', { class: 'muted' }, 'Nothing in the catalog matches the current search or category.'), btn('Reset filters', resetFilters, 'btn mcp3-cta')));
    };

    const connRow = (a) => {
      const agents = agentsOf(a);
      const refreshRef = actionBtn(a.live ? 'Refresh tools' : 'Disconnect', 'btn mcp3-cta mcp3-sm', (ref) => (a.live ? refreshServer(a, ref) : disconnectApp(a, ref)));
      const removeRef = a.live ? actionBtn('Remove server', 'link mcp-danger mcp3-danger', (ref) => removeServer(a, ref)) : null;
      return h('div', { class: 'card mcp-conn mcp3-card', 'data-search': `${a.name} ${a.category} ${a.description}`.toLowerCase() },
        h('div', { class: 'mcp-conn-main' }, appLogo(a, 36),
          h('div', { class: 'mcp-conn-info' },
            h('div', { class: 'row2' }, h('b', {}, a.name), tag(a.live ? 'Live MCP server' : 'Demo app', a.live), a.live ? null : h('span', { class: 'chip mcp3-tag' }, a.category)),
            h('div', { class: 'muted mcp-conn-desc' }, a.description || 'No description provided.'),
            h('div', { class: 'row2' }, h('span', { class: 'chip mcp3-tag' }, fmtTool(a.tools.length)), h('span', { class: 'muted' }, toolSummary(a)))),
          h('div', { class: 'mcp-conn-actions' }, btn('Manage grants', () => openDetail(a.id), 'btn mcp3-cta'),
            refreshRef.b, removeRef ? removeRef.b : null)),
        h('div', { class: 'mcp-conn-agents' }, h('span', {}, 'With grants:'),
          agents.length ? agents.map((b) => h('span', { class: 'row2 mcp-agentchip' }, tile(b, 20), b.name)) : h('span', { class: 'muted' }, 'no agent yet — open Manage grants to assign tools')));
    };
    const mineBody = () => {
      if (loading) return skeletonRows();
      if (!connected.length) return h('div', { class: 'mcp-empty mcp3-empty' }, icon('grid', 30), h('h3', {}, 'No connectors yet'),
        h('p', { class: 'muted' }, 'Demo catalog apps connect instantly and contact no external service. Live MCP servers you add are real and run on your own endpoint.'),
        h('div', { class: 'row2', style: 'justify-content:center' }, btn('Browse catalog', () => setTab('catalog'), 'btn mcp3-cta'), btn('Add MCP server', () => setTab('add'), 'btn mcp3-cta')));
      const rows = connected.filter((a) => visible(a));
      const liveRows = rows.filter((a) => a.live), demoRows = rows.filter((a) => !a.live);
      return h('div', { class: 'mcp3-conns' },
        liveRows.length ? h('div', { class: 'mcp-section' }, h('h3', {}, 'Live MCP servers'), liveRows.map(connRow)) : null,
        demoRows.length ? h('div', { class: 'mcp-section' }, h('h3', {}, 'Demo catalog apps'), demoRows.map(connRow)) : null,
        h('div', { class: 'mcp-empty mcp3-empty', 'data-mcp-empty': '1', hidden: rows.length > 0 }, icon('search', 30), h('h3', {}, 'No connectors match your search'),
          h('p', { class: 'muted' }, 'Try a different search.'), btn('Reset search', resetFilters, 'btn mcp3-cta')));
    };

    const addBody = () => {
      const m = S.mcp;
      const nm = h('input', { class: 'field', placeholder: 'Name, e.g. Acme metrics', maxlength: 40, value: m.name, 'aria-label': 'MCP server name' });
      const url = h('input', { class: 'field', placeholder: 'https://your-server.example/mcp', maxlength: 300, value: m.url, 'aria-label': 'MCP server URL' });
      const tk = h('input', { class: 'field', type: 'password', placeholder: 'Bearer token (optional)', maxlength: 500, value: m.token, autocomplete: 'off', 'aria-label': 'MCP bearer token' });
      nm.addEventListener('input', () => { m.name = nm.value; });
      url.addEventListener('input', () => { m.url = url.value; });
      tk.addEventListener('input', () => { m.token = tk.value; });
      const field = (label, inp) => h('label', { class: 'mcp-field mcp3-field' }, h('span', {}, label), inp);
      const addRef = actionBtn('Add server', 'btn mcp3-primary', (ref) => {
        if (S.mcpBusy) return;
        const name = (m.name || '').trim(), u = (m.url || '').trim();
        if (name.length < 2) { S.err = 'The server name needs at least 2 characters.'; S.mcpNote = ''; paintNotice(); return; }
        if (!/^https?:\/\//i.test(u)) { S.err = 'The server URL must start with https:// (or http:// only when this deployment allows insecure test servers).'; S.mcpNote = ''; paintNotice(); return; }
        runAction('add', ref, 'Connecting…', async () => {
          const r = await api('/api/mcp/servers', { method: 'POST', body: { name, url: u, token: (m.token || '').trim() || undefined } });
          S.mcp = { name: '', url: '', token: '' };
          await loadApps();
          S.appTab = 'catalog'; S.appOpen = r.id; S.tcall = { bot: '', tool: '', args: '{}', out: '', outStatus: '' };
          S.mcpNote = `Live MCP server added with ${fmtTool((r.tools || []).length)}.`;
        }, { reload: true });
      });
      const facts = h('aside', { class: 'card mcp-add-card mcp3-card' }, h('b', {}, 'What this connects to'),
        h('ul', { class: 'mcp-facts mcp3-facts' },
          h('li', {}, h('span', { class: 'dicon' }, icon('panel', 15)), h('span', {}, h('b', {}, 'Streamable HTTP'), 'MCP servers that answer JSON-RPC over HTTP. Their tools are discovered when you add the server; every tool counts as a write unless the server marks it read-only.')),
          h('li', {}, h('span', { class: 'dicon' }, icon('shield', 15)), h('span', {}, h('b', {}, 'Encrypted token'), 'A bearer token is encrypted at rest and never shown again. Token storage needs CFA_SECRET_KEY on the deployment.')),
          h('li', {}, h('span', { class: 'dicon' }, icon('x', 15)), h('span', {}, h('b', {}, 'Not supported'), 'OAuth and legacy SSE-only servers. Secret-looking tools are always blocked by policy.'))));
      return h('div', { class: 'mcp-add-grid mcp3-add-grid' },
        h('div', { class: 'card mcp-add-card mcp3-card' }, h('h3', { style: 'margin:0' }, 'Add a live MCP server'),
          h('p', { class: 'muted', style: 'margin:0;font-size:13px' }, 'The server must speak MCP over Streamable HTTP. Shewiun discovers its tools, encrypts the bearer token and never shows it again.'),
          field('Name', nm), field('Server URL', url), field('Bearer token (optional)', tk),
          h('div', { class: 'row2' }, addRef.b, h('span', { class: 'muted', style: 'font-size:12px' }, 'Discovery can take a few seconds.'))),
        facts);
    };

    const detailBody = (a) => {
      const t = S.tcall, callTools = a.tools.filter((x) => x.risk !== 'secret'), grantable = callTools.length;
      if (!callTools.some((x) => x.name === t.tool)) t.tool = grantable ? callTools[0].name : '';
      if (!bots.some((b) => b.id === t.bot)) t.bot = bots.length ? bots[0].id : '';
      const legend = h('div', { class: 'mcp-legend mcp3-legend' },
        h('span', { class: 'mcp-legend-item' }, h('span', { class: 'chip mcp3-risk mcp3-risk-read' }, 'read'), h('span', { class: 'muted' }, 'runs immediately')),
        h('span', { class: 'mcp-legend-item' }, h('span', { class: 'chip mcp3-risk mcp3-risk-write' }, 'write'), h('span', { class: 'muted' }, 'waits for a human approval')),
        h('span', { class: 'mcp-legend-item' }, h('span', { class: 'chip mcp3-risk mcp3-risk-secret' }, 'secret'), h('span', { class: 'muted' }, 'can never be granted (blocked by policy)')));
      const matrix = a.tools.length ? h('div', { class: 'tbl-wrap mcp-matrix-wrap mcp3-matrix-wrap' }, h('table', { class: 'mcp-matrix mcp3-matrix' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Agent'), a.tools.map((x) => h('th', {}, x.name, h('div', { class: 'mcp-risklabel' }, riskWord(x.risk)))), h('th', {}, 'Grants'))),
        h('tbody', {}, bots.map((b) => {
          const init = a.grants[b.id] || [];
          const switches = a.tools.map((x) => h('input', { type: 'checkbox', role: 'switch', value: x.name, checked: init.includes(x.name), disabled: x.risk === 'secret',
            title: x.risk === 'secret' ? 'Secret-looking tools can never be granted (policy: secrets.read is denied).' : `${x.name}: ${riskWord(x.risk)}`,
            'aria-label': `${b.name} · ${x.name} (${riskWord(x.risk)})` }));
          const countEl = h('span', { class: 'muted mcp-count mcp3-grantcount' }, `${init.length} of ${grantable} granted`);
          const syncCount = () => { countEl.textContent = `${switches.filter((i) => i.checked).length} of ${grantable} granted`; };
          switches.forEach((i) => i.addEventListener('change', syncCount));
          const key = 'grant:' + a.id + ':' + b.id;
          const saveRef = actionBtn('Save', 'btn mcp3-cta mcp3-sm', (ref) => runAction(key, ref, 'Saving…', async () => {
            const r = await api(`/api/bots/${b.id}/apps/${a.id}`, { method: 'PUT', body: { tools: switches.filter((i) => i.checked).map((i) => i.value) } });
            a.grants[b.id] = r.tools || [];
            S.mcpNote = `Grants for ${b.name} saved (${fmtTool((r.tools || []).length)}) and written to the audit log.`;
          }));
          const allRead = () => { switches.forEach((i, ix) => { if (a.tools[ix].risk === 'read') i.checked = true; }); syncCount(); };
          return h('tr', {}, h('td', {}, h('span', { class: 'row2' }, tile(b, 24), b.name)),
            switches.map((i) => h('td', {}, h('label', { class: 'mcp-switch mcp3-switch' }, i, h('span', { class: 'mcp-track mcp3-track' }, h('span', { class: 'mcp-knob mcp3-knob' }))))),
            h('td', {}, h('div', { class: 'mcp-agentacts mcp3-agentacts' }, countEl, saveRef.b, btn('All read', allRead, 'link mcp3-link'))));
        })))) : h('p', { class: 'muted' }, 'This connector exposes no tools.');
      const agentSel = h('select', { class: 'field', 'aria-label': 'Agent for test call', onchange: (e) => { t.bot = e.target.value; } }, bots.map((b) => h('option', { value: b.id, selected: b.id === t.bot }, b.name)));
      const toolSel = h('select', { class: 'field', 'aria-label': 'Tool for test call', onchange: (e) => { t.tool = e.target.value; } }, callTools.map((x) => h('option', { value: x.name, selected: x.name === t.tool }, `${x.name} (${riskWord(x.risk)})`)));
      const args = h('textarea', { class: 'field', rows: 2, 'aria-label': 'Arguments as JSON' });
      args.value = t.args;
      args.addEventListener('input', () => { t.args = args.value; });
      const outSlot = h('div', { class: 'mcp3-tryout-slot' });
      const paintOut = () => {
        outSlot.replaceChildren(...(t.out ? [h('div', { class: 'mcp-tryout mcp3-tryout' },
          h('div', { class: 'row2' }, h('span', { class: 'chip mcp3-tag' + (t.outStatus === 'pending_approval' ? ' warn' : ' on') }, t.outStatus === 'pending_approval' ? 'waiting for approval' : 'completed'), t.outMeta ? h('span', { class: 'muted mcp3-outmeta' }, t.outMeta) : null),
          h('div', { class: 'pre mcp3-pre' }, t.out))] : []));
      };
      paintOut();
      const runRef = actionBtn('Run call', 'btn mcp3-primary', (ref) => runAction('call:' + a.id, ref, 'Running…', async () => {
        let ar = {};
        try { ar = JSON.parse(t.args || '{}'); } catch { throw new Error('Arguments must be valid JSON.'); }
        const r = await api(`/api/bots/${t.bot}/tools`, { method: 'POST', body: { app: a.id, tool: t.tool, args: ar } });
        const agentName = (bots.find((b) => b.id === t.bot) || {}).name || t.bot;
        t.outStatus = r.status === 'pending_approval' ? 'pending_approval' : 'completed';
        t.outMeta = `${agentName} · ${a.id}.${t.tool}`;
        t.out = r.status === 'pending_approval' ? `Waiting for approval (${(r.approval || {}).id || 'approval'}). Approve it in Control, then execute. Nothing was executed.` : (r.result || 'The call completed without a result.');
        paintOut();
      }));
      const refreshRef = a.live ? actionBtn('Refresh tools', 'btn mcp3-cta mcp3-sm', (ref) => refreshServer(a, ref)) : null;
      const removeRef = actionBtn(a.live ? 'Remove server' : 'Disconnect', 'link mcp-danger mcp3-danger', (ref) => (a.live ? removeServer(a, ref) : disconnectApp(a, ref)));
      return h('div', { class: 'mcp-detail mcp3-detail' },
        h('div', { class: 'mcp-backrow mcp3-backrow' }, btn('Back', back, 'link mcp3-link'), h('span', { class: 'sp' }), refreshRef ? refreshRef.b : null, removeRef.b),
        h('div', { class: 'mcp-apphead mcp3-apphead' }, appLogo(a, 40),
          h('div', { class: 'mcp-apptitle' }, h('b', {}, a.name),
            h('div', { class: 'row2' }, tag(a.live ? 'Live MCP server' : 'Demo app', a.live), tag('Connected', true), a.live ? null : h('span', { class: 'chip mcp3-tag' }, a.category)))),
        h('p', { class: 'muted mcp3-desc', style: 'margin:0' }, a.description || 'No description provided.'),
        h('h3', {}, 'Agent tool grants'),
        h('p', { class: 'muted mcp3-help', style: 'margin:0;font-size:13px' }, 'Each agent needs an explicit grant per tool. Read tools run immediately; write tools create an approval request; secret-looking tools can never be granted.'),
        legend, matrix,
        h('div', { class: 'card mcp-try mcp3-card mcp3-try' }, h('h3', {}, 'Try a call'),
          h('p', { class: 'muted mcp3-help', style: 'margin:0;font-size:13px' }, a.live ? 'Runs against the live MCP server. Read tools return immediately; write tools wait for a human approval in Control.' : 'Demo call: no external service is contacted. Read tools return sample data; write tools create a real approval request.'),
          h('div', { class: 'mcp-trygrid mcp3-trygrid' }, agentSel, toolSel), args,
          h('div', { class: 'row2' }, runRef.b, h('span', { class: 'muted', style: 'font-size:12px' }, grantable ? 'The call is audited as this agent.' : 'This connector has no callable tools.')),
          outSlot));
    };

    const body = openApp ? detailBody(openApp) : tab === 'mine' ? mineBody() : tab === 'add' ? addBody() : catalogBody();
    const notice = S.err ? h('div', { class: 'mcp-alert mcp3-alert', role: 'alert' }, S.err) : S.mcpNote ? h('div', { class: 'mcp-success mcp3-success' }, S.mcpNote) : null;
    return h('div', { class: 'scrim', onclick: (e) => { if (e.target.classList.contains('scrim')) closeApps(); } },
      h('div', { class: 'modal mcp-modal mcp3-modal', role: 'dialog', 'aria-label': 'Connect apps and MCP servers' },
        head, tabs, h('div', { id: 'mcp-notice', class: 'mcp3-notice' }, notice), banner, toolbar,
        h('div', { id: 'mcp-body', 'data-mode': openApp ? 'detail' : tab }, body)));
  }
  function agentModal() {
    const d = S.ag, t = S.tmpl.find((x) => x.id === d.template) || { scopes: [] };
    const name = h('input', { class: 'field', placeholder: 'Agent name, for example Ledger', maxlength: 40, value: d.name, 'aria-label': 'Agent name' }); name.addEventListener('input', () => { d.name = name.value; });
    const team = h('input', { class: 'field', placeholder: 'Team, for example Finance desk', maxlength: 30, value: d.team, 'aria-label': 'Team' }); team.addEventListener('input', () => { d.team = team.value; });
    const tpl = h('select', { class: 'field', 'aria-label': 'Template', onchange: (e) => { d.template = e.target.value; render(); } }, S.tmpl.map((x) => h('option', { value: x.id, selected: x.id === d.template }, x.name)));
    const caps = (S.caps || []).map((c) => h('label', { class: 'row' }, h('input', { type: 'checkbox', value: c, checked: t.scopes.includes(c), disabled: d.template !== 'custom' }), c));
    const riskOf = (sc) => { let n = 0, why = []; if (sc.includes('payments.propose')) { n += 3; why.push('can propose payments'); } if (sc.includes('memory.write')) { n += 1; why.push('writes memory drafts'); } if (sc.includes('approval.request')) { n += 1; why.push('can request approvals'); } return { lvl: n >= 4 ? 'high' : n >= 2 ? 'medium' : 'low', why }; };
    const prev = h('span', { class: 'chip' }, ''), upd = () => { const r = riskOf(d.template === 'custom' ? picked(caps) : t.scopes); prev.className = 'chip risk-' + r.lvl; prev.textContent = `Risk preview: ${r.lvl}${r.why.length ? ' (' + r.why.join(', ') + ')' : ''}`; };
    caps.forEach((l) => l.firstChild.addEventListener('change', upd)); upd();
    const icons = ['compass', 'lens', 'wrench', 'scales', 'coins', 'shield', 'book', 'chat', 'spark'].map((i) => h('button', { type: 'button', 'aria-pressed': d.icon === i, 'aria-label': i, onclick: () => { d.icon = i; render(); } }, tile({ color: d.color || '#12294F', icon: i }, 34)));
    const swatches = ['#2F5BD3', '#B7791F', '#1B7F79', '#1F6F8B', '#7A4E9C', '#3D7A4F', '#B5543C', '#5B6B88'].map((c) => h('button', { type: 'button', class: 'swatch', style: `background:${c}`, 'aria-label': 'Color ' + c, 'aria-pressed': d.color === c, onclick: () => { d.color = c; render(); } }));
    return h('div', { class: 'scrim', onclick: (e) => { if (e.target.classList.contains('scrim')) close(); } }, h('div', { class: 'modal', role: 'dialog', 'aria-label': 'New agent', style: 'max-width:560px' },
      h('div', { class: 'modal-h' }, h('h2', { style: 'margin:0;flex:1' }, 'New agent'), h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Close', onclick: close }, icon('x'))),
      h('p', { class: 'muted' }, 'Demo mode: no model provider is connected, so replies are scripted. Permissions and memory spaces are real and enforced.'), S.err ? h('div', { class: 'banner', role: 'alert', style: 'color:var(--bad)' }, S.err) : null,
      h('label', {}, 'Name', name), h('div', { style: 'height:10px' }), h('label', {}, 'Team', team), h('div', { style: 'height:10px' }), h('label', {}, 'Template', tpl),
      h('p', { class: 'muted' }, d.template.startsWith('finance') || d.template.startsWith('compliance') ? 'Finance templates get a finance memory space and store their operating rules in the Brain.' : 'This agent gets a private memory space.'),
      h('div', {}, 'Capabilities'), h('div', {}, caps), h('div', { style: 'margin:6px 0' }, prev), h('div', { class: 'muted', style: 'margin-top:10px;font-size:12px' }, 'The face is drawn from the agent name; the colour sets the ring.'), h('div', { style: 'margin-top:10px' }, 'Color'), h('div', { class: 'picker' }, swatches),
      h('div', { class: 'row2', style: 'margin-top:18px' }, btn('Create agent', () => run(async () => { const body = { template: d.template, name: d.name, scopes: d.template === 'custom' ? picked(caps) : undefined, team: d.team || undefined, icon: d.icon || undefined, color: d.color || undefined };
        const r = await api('/api/bots', { method: 'POST', body }); await loadBots(); S.modal = null; S.ag = { template: 'finance-analyst', name: '', team: '', icon: '', color: '' }; await pick(r.id); }), 'btn primary'), btn('Cancel', close))));
  }

  // ---------- shell ----------
  const track = (name) => { try { fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); } catch {} };
  function appLogo(a, size = 36) {
    const box = h('span', { class: 'lbox', style: `width:${size}px;height:${size}px` }), mono = () => box.replaceChildren(h('b', {}, a.name[0]));
    if (a.live || !a.logo) { mono(); return box; }
    const img = h('img', { alt: a.name, width: size - 14, height: size - 14, loading: 'lazy' }), cdn = S.health.logo_cdn ? `${S.health.logo_cdn}/${a.logo}` : '';
    img.src = `/static/logos/${a.id}.svg`; // drop official SVGs here to override
    img.addEventListener('error', () => { if (cdn && !img.dataset.t) { img.dataset.t = '1'; img.src = cdn; } else mono(); });
    box.append(img); return box;
  }
  function meterBlock() {
    const b = S.bill; if (!b || !b.enabled) return null;
    const lim = b.limits.messages, pct = lim > 100000 ? 6 : Math.min(100, Math.round((b.usage.messages / lim) * 100));
    return h('div', { class: 'meter' }, h('div', { class: 'row2' }, h('b', {}, b.plan_name + ' plan'), h('span', { class: 'muted', style: 'flex:1;text-align:right;font-size:12px' }, `${b.usage.messages} / ${lim > 100000 ? 'unlimited' : lim} messages`)),
      h('div', { class: 'progress' + (pct >= 90 ? ' hot' : '') }, h('i', { style: `width:${pct}%` })), b.plan === 'free' ? btn('Upgrade', () => { track('upgrade_click'); go('plans'); }, 'btn primary', { style: 'width:100%;margin-top:8px;justify-content:center' }) : null);
  }
  function mobileBar() {
    return h('div', { class: 'mbar' }, h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Menu', onclick: () => { S.drawer = !S.drawer; render(); if (S.drawer) refreshSum(); } }, icon('menu')), h('div', { class: 'logo' }, 'Shewiun'), h('span', { class: 'sp' }),
      h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Connect apps', onclick: openApps }, icon('grid')), h('button', { class: 'ibtn', type: 'button', 'aria-label': 'New agent', onclick: openAgent }, icon('plus')));
  }
  // model editor shared by the agent panel and the agent settings overlay.
  // An agent with no live model says "Model must be configured" instead of pretending.
  function agxSaveModel(b, inp) {
    const st = S.modal === 'agentSettings' ? S.agx : null;
    const ok = (msg) => { S.info = msg; S.err = ''; if (st && S.modal === 'agentSettings') { st.busy = ''; st.info = msg; syncOverlays(true); } else render(); };
    const bad = (e) => { S.err = e.message; if (st && S.modal === 'agentSettings') { st.busy = ''; st.err = e.message; syncOverlays(true); } else render(); };
    if (st) { st.busy = 'model'; st.err = ''; st.info = ''; syncOverlays(true); }
    api(`/api/bots/${b.id}/model`, { method: 'PUT', body: { model: String(inp.value || '').trim() } })
      .then(() => loadBots())
      .then(() => ok('Model saved. Open models run through Hugging Face when HF_TOKEN is set.'))
      .catch(bad);
  }
  function modelEditor(b) {
    const raw = String((b && b.model) || ''), configured = agxHasModel(b), listId = 'models-list-' + (++gid);
    const inp = h('input', { class: 'field agx-model-input', placeholder: 'default, or hf:MiniMaxAI/MiniMax-M2', value: raw.endsWith('(no key)') ? raw.replace(' (no key)', '') : raw === 'demo mode' ? '' : raw, 'aria-label': 'Model for this agent', list: listId });
    const dlist = h('datalist', { id: listId }, ((S.models && S.models.suggested) || []).map((x) => h('option', { value: x.id }, x.name)));
    return h('div', { class: 'agx-model' },
      h('div', { class: 'agx-model-head' },
        h('span', { class: 'agx-model-label' }, 'Current model'),
        h('span', { class: 'chip ' + (configured ? '' : 'warn') }, agxModelLabel(b))),
      configured ? null : h('div', { class: 'agx-model-warn' }, h('b', {}, AGX_MODEL_MISSING), h('p', { class: 'muted' }, 'This agent has no live model, so replies are scripted demo text. Enter a model id below or connect a provider in Settings.')),
      h('div', { class: 'row2 agx-model-actions' }, inp, btn('Save model', () => agxSaveModel(b, inp), 'btn primary'), dlist),
      h('div', { class: 'agx-model-links' },
        btn('Settings', () => openSettings('models'), 'link'),
        h('span', { class: 'muted agx-hint' }, 'Model ids look like hf:owner/model or a plain provider model name.')));
  }

  // ---------- agent settings v2 (wave 2, batch 8) ----------
  // Panel + overlay helpers. Everything reads the endpoints the server already exposes; the UI
  // never invents a value. "Model must be configured" is the honest state for an agent that has
  // no live provider model (model === 'demo mode', ends with '(no key)', or is empty).
  const AGX_MODEL_MISSING = 'Model must be configured';
  const agxHasModel = (b) => { const m = String((b && b.model) || '').trim(); return !!m && m !== 'demo mode' && !m.endsWith('(no key)'); };
  const agxModelLabel = (b) => (agxHasModel(b) ? String(b.model) : AGX_MODEL_MISSING);
  const AGX_CAP_INFO = {
    'memory.read': { why: 'Reads verified notes from its memory spaces.', short: 'read-only', level: 'low' },
    'memory.write': { why: 'Writes memory drafts that a human reviews first.', short: 'writes memory', level: 'medium' },
    'call.join': { why: 'Joins council calls and can revise its position.', short: 'joins calls', level: 'low' },
    'approval.request': { why: 'Can ask a human to approve an action.', short: 'can request approvals', level: 'medium' },
    'payments.propose': { why: 'Can propose payments; a human still approves every payment.', short: 'can propose payments', level: 'high' },
  };
  const agxCapInfo = (c) => AGX_CAP_INFO[c] || { why: 'Capability enforced by the server on every request.', short: 'capability', level: 'low' };
  // Custom gear mark (the shared G icon map is owned by other batches and has no gear).
  const agxGear = (s = 16) => {
    const v = document.createElementNS(NS, 'svg');
    for (const [k, x] of Object.entries({ viewBox: '0 0 24 24', width: s, height: s, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) v.setAttribute(k, x);
    v.innerHTML = '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>';
    return v;
  };

  // inventory is the only endpoint that exposes owner/sponsor/purpose/last_activity per agent,
  // so the panel and the overlay read it lazily and cache it for the session.
  const agxInvRow = (id) => (Array.isArray(S.agxInv) ? S.agxInv.find((r) => r.id === id) || null : null);
  function agxInvalidate() { S.agxInv = null; S.agxInvState = ''; S.agxPanelAudit = null; }
  function agxEnsureInv(reload) {
    if (reload) { S.agxInv = null; S.agxInvState = ''; }
    if (S.agxInvState === 'loading' || S.agxInvState === 'ready' || S.agxInvState === 'error') return;
    S.agxInvState = 'loading';
    api('/api/inventory').then((rows) => {
      S.agxInv = rows; S.agxInvState = 'ready';
      if (S.modal === 'agentSettings') syncOverlays(true); else render();
    }).catch(() => {
      S.agxInvState = 'error';
      if (S.modal === 'agentSettings') syncOverlays(true); else render();
    });
  }

  // recent per-agent audit events for the panel's Activity tab
  function agxPanelAudit(botId) {
    const st = S.agxPanelAudit;
    if (st && st.bot === botId) return st;
    S.agxPanelAudit = { bot: botId, loading: true, data: null, err: '' };
    api(`/api/bots/${encodeURIComponent(botId)}/audit?limit=12`).then((d) => {
      if (!S.agxPanelAudit || S.agxPanelAudit.bot !== botId) return;
      S.agxPanelAudit = { bot: botId, loading: false, data: d, err: '' }; render();
    }).catch((e) => {
      if (!S.agxPanelAudit || S.agxPanelAudit.bot !== botId) return;
      S.agxPanelAudit = { bot: botId, loading: false, data: null, err: e.message }; render();
    });
    return S.agxPanelAudit;
  }

  // App mark for the agent panel/overlay: a local letter tile. Deliberately no logo request:
  // the catalog logos are served by the apps connector (batch 9), so the settings surfaces stay
  // free of 404s when no logo file exists for an app.
  function agxAppLogo(a, s = 26) {
    return h('span', { class: 'agx-applogo', style: `width:${s}px;height:${s}px;font-size:${Math.round(s * 0.45)}px`, 'aria-hidden': 'true' }, String((a && a.name) || '?')[0].toUpperCase());
  }

  // switch-like capability rows shared by the panel and the overlay. The server is the source of
  // truth for capabilities (/api/templates); checked state comes from the agent's scopes.
  function agxScopeRows(scopes) {
    const list = (S.caps && S.caps.length) ? S.caps : Object.keys(AGX_CAP_INFO);
    const boxes = [];
    const rows = list.map((c) => {
      const info = agxCapInfo(c), on = (scopes || []).includes(c);
      const cb = h('input', { type: 'checkbox', value: c, checked: on, class: 'agx-check', 'aria-label': 'Capability ' + c });
      cb.addEventListener('change', () => { const row = cb.closest('label'); if (row) row.classList.toggle('on', cb.checked); });
      boxes.push(cb);
      return h('label', { class: 'agx-switchrow' + (on ? ' on' : '') },
        h('span', { class: 'agx-switchtxt' },
          h('span', { class: 'agx-caprow' }, h('b', {}, c),
            info.level === 'low' ? null : h('span', { class: 'chip risk-' + info.level + ' agx-risk', title: info.why }, info.level === 'high' ? 'high risk' : 'medium risk')),
          h('small', {}, info.why)),
        cb, h('span', { class: 'agx-switch', 'aria-hidden': 'true' }));
    });
    return { rows, value: () => boxes.filter((x) => x.checked).map((x) => x.value) };
  }

  // the live screen stays available; in the new panel it lives inside the Activity tab.
  function agxLiveWindow(b) {
    return h('div', { class: 'agx-live' },
      h('div', { class: 'screenwin' }, h('div', { class: 'screenbar' }, icon('panel', 14), h('span', { style: 'flex:1' }, `${b.name} · live`), h('span', { class: 'chip ok' }, 'LIVE')), h('div', { class: 'screenbody', id: 'screenbody' })),
      h('div', { class: 'row2 agx-live-actions' },
        btn('Ask a sample question', () => { S.draft = 'Summarize what you know about payment limits.'; send(); }, 'btn primary', { disabled: b.status === 'suspended' }),
        btn('Hide live view', () => { S.tab = 'activity'; render(); }, 'link')),
      admin('This is a live stream of what the agent actually did: messages, notes read or written, tool calls and council turns. It is not a remote desktop.'));
  }

  // ---------- panel tabs ----------
  function agxOverviewTab(b) {
    const modelOk = agxHasModel(b), inv = agxInvRow(b.id);
    const fact = (k, v, cls) => h('div', { class: 'agx-fact' }, h('span', { class: 'agx-fact-k' }, k), h('span', { class: 'agx-fact-v' + (cls ? ' ' + cls : '') }, v));
    const last = inv ? (inv.last_activity ? when(inv.last_activity) : 'No recorded activity') : (S.agxInvState === 'error' ? 'Unavailable' : 'Loading…');
    const facts = h('div', { class: 'agx-card agx-facts' },
      fact('Role', b.role),
      fact('Team', b.team || 'General'),
      fact('Model', agxModelLabel(b), modelOk ? '' : 'agx-warn'),
      fact('Source', b.source || 'builtin'),
      fact('Trust', h('span', { class: 'chip ' + (b.trust === 'verified' ? 'ok' : 'warn') }, b.trust === 'verified' ? 'Verified' : 'Unverified')),
      fact('Criticality', h('span', { class: 'chip risk-' + (b.criticality || 'medium') }, b.criticality || 'medium')),
      fact('Status', h('span', { class: 'chip ' + (b.status === 'suspended' ? 'warn' : 'ok') }, b.status === 'suspended' ? 'Suspended' : 'Active')),
      fact('Last activity', last));
    const scopes = agxScopeRows(b.scopes);
    const permissions = h('div', { class: 'agx-card' },
      h('div', { class: 'agx-card-h' }, h('b', {}, 'Permissions'), h('span', { class: 'sp' }), h('span', { class: 'chip' }, `${(b.scopes || []).length} of ${scopes.rows.length}`)),
      h('div', { class: 'agx-switchlist' }, scopes.rows),
      h('div', { class: 'agx-card-actions' }, btn('Save permissions', () => run(async () => {
        await api(`/api/bots/${b.id}/scopes`, { method: 'PUT', body: { scopes: scopes.value() } });
        await loadBots(); agxInvalidate(); S.info = 'Permissions saved and written to the audit log.';
      }), 'btn primary')),
      admin('Admin only. The server enforces every capability.'));
    const controls = h('div', { class: 'agx-card' },
      h('div', { class: 'agx-card-h' }, h('b', {}, 'Controls')),
      h('div', { class: 'agx-btnrow' },
        btn(b.status === 'suspended' ? 'Resume agent' : 'Suspend agent', () => run(async () => {
          await api(`/api/bots/${b.id}/status`, { method: 'POST', body: { status: b.status === 'suspended' ? 'active' : 'suspended', reason: 'manual' } });
          await loadBots(); agxInvalidate();
          S.info = b.status === 'suspended' ? 'Agent resumed.' : 'Agent suspended. Chat, calls and tools stop immediately.';
        }), 'btn'),
        b.trust === 'unverified' ? btn('Mark as reviewed', () => run(async () => {
          await api(`/api/bots/${b.id}/trust`, { method: 'POST', body: { trust: 'verified' } });
          await loadBots(); agxInvalidate(); S.info = 'Agent marked as reviewed.';
        })) : null,
        btn('Export card', () => run(async () => { await dl(`/api/bots/${b.id}/card`, `${b.id}-card.json`); }))),
      btn([agxGear(15), 'Open full settings'], () => openAgentSettings('general'), 'btn agx-widebtn'));
    return h('div', {}, facts, permissions, h('div', { class: 'agx-card' }, modelEditor(b)), controls);
  }

  function agxActivityTab(b) {
    const live = S.tab === 'screen', pa = agxPanelAudit(b.id);
    const data = pa && pa.data, evs = (data && data.entries) || [], total = data ? data.total : 0;
    const list = evs.length ? h('div', { class: 'agx-evs' }, evs.map((e) => h('div', { class: 'agx-ev' },
      h('span', { class: 'mono agx-ev-time' }, when(e.ts)),
      h('span', { class: 'chip agx-ev-kind' }, e.kind),
      h('span', { class: 'agx-ev-sum' }, e.summary || '—'),
      h('span', { class: 'muted agx-ev-actor' }, e.actor || 'system')))) : null;
    return h('div', {},
      live ? agxLiveWindow(b) : h('div', { class: 'agx-card' },
        h('div', { class: 'agx-card-h' }, h('b', {}, 'Live view')),
        h('p', { class: 'muted agx-note' }, 'Follow what the agent is doing right now: messages, notes it reads or writes, tool calls and council turns.'),
        btn('Open live view', () => { S.tab = 'screen'; render(); }, 'btn')),
      h('div', { class: 'agx-card' },
        h('div', { class: 'agx-card-h' }, h('b', {}, 'Recent activity'), h('span', { class: 'sp' }),
          pa && pa.loading ? h('span', { class: 'muted' }, 'Loading…') : btn('Refresh', () => { S.agxPanelAudit = null; render(); }, 'link')),
        pa && pa.err ? h('p', { class: 'agx-warn agx-note' }, 'Activity could not be loaded: ' + pa.err) : null,
        pa && !pa.loading && !pa.err ? (evs.length ? list : h('div', { class: 'agx-empty' }, h('b', {}, 'No activity recorded yet'), h('p', { class: 'muted' }, 'The per-agent audit chain has no entries. Chat with the agent or run a council call, then refresh.'))) : null,
        data ? h('div', { class: 'agx-card-foot' },
          h('span', { class: 'chip ' + (data.integrity && data.integrity.valid ? 'ok' : 'warn') }, data.integrity && data.integrity.valid ? 'Chain intact' : 'Chain not verified'),
          h('span', { class: 'muted' }, `${total} event${total === 1 ? '' : 's'} recorded` + (total > evs.length ? `, newest ${evs.length} shown` : ''))) : null),
      admin('Activity comes from the agent\'s own audited history, not from a simulated feed.'));
  }

  function agxMemoryTab(b) {
    const mine = (S.notes || []).filter((n) => (b.spaces || []).includes(n.space) && n.status === 'verified').slice(0, 10);
    return h('div', {},
      h('div', { class: 'agx-card' },
        h('div', { class: 'agx-card-h' }, h('b', {}, 'Memory spaces')),
        h('p', { class: 'muted agx-note' }, 'This agent reads verified notes from these spaces only.'),
        h('div', { class: 'row2' }, (b.spaces || []).map((s) => h('span', { class: 'chip ok' }, s)))),
      h('div', { class: 'agx-card' },
        h('div', { class: 'agx-card-h' }, h('b', {}, 'Notes it can use')),
        mine.length ? h('div', { class: 'agx-list' }, mine.map((n) => btn(n.title, () => openNote(n.id), 'link'))) : h('p', { class: 'muted agx-note' }, 'No verified notes in its spaces yet.')),
      btn([icon('graph', 16), 'Open this agent\'s brain'], () => { S.graph = true; S.graphAgent = b.id; go('brain').then(() => { S.graph = true; render(); }); }, 'btn'));
  }

  function agxAppsTab(b) {
    const connected = (S.apps || []).filter((a) => a.connected);
    const grantsOf = (a) => (a.grants || {})[b.id] || [];
    const mine = connected.filter((a) => grantsOf(a).length);
    const cards = mine.map((a) => h('div', { class: 'agx-card agx-app' },
      h('div', { class: 'agx-card-h' }, agxAppLogo(a, 26), h('b', {}, a.name), h('span', { class: 'chip ' + (a.live ? 'ok' : '') }, a.live ? 'Live' : 'Demo')),
      h('div', { class: 'row2 agx-toolchips' }, grantsOf(a).map((t) => {
        const risk = (a.tools.find((x) => x.name === t) || {}).risk;
        return h('span', { class: 'chip' + (risk === 'write' ? ' warn' : '') }, t + (risk === 'write' ? ' (needs approval)' : risk === 'read' ? ' (read)' : ''));
      }))));
    const noGrant = connected.filter((a) => !grantsOf(a).length).map((a) => a.name);
    return h('div', {},
      mine.length ? h('div', {}, cards) : h('div', { class: 'agx-card agx-empty' }, h('b', {}, 'No app grants'), h('p', { class: 'muted' }, 'Without a grant this agent cannot call any tool.')),
      noGrant.length ? h('p', { class: 'muted agx-note' }, 'Connected apps with no grant for this agent: ' + noGrant.join(', ') + '.') : null,
      h('div', { class: 'row2' }, btn('Open connector', openApps, 'btn primary'), btn('Refresh grants', () => run(async () => { await loadApps(); }), 'link')));
  }

  // ---------- full agent settings overlay ----------
  const AGX_SECTIONS = [
    ['general', 'General', 'wrench'],
    ['permissions', 'Permissions', 'shield'],
    ['accountability', 'Accountability', 'user'],
    ['activity', 'Activity', 'radar'],
    ['apps', 'Apps & tools', 'grid'],
    ['danger', 'Danger', 'x'],
  ];
  function openAgentSettings(section, botId) {
    const b = (botId && (S.bots || []).find((x) => x.id === botId)) || S.bot;
    if (!b) return;
    S.modal = 'agentSettings';
    S.menu = false; S.drawer = false; S.err = ''; S.info = '';
    S.agx = { bot: b.id, section: section || 'general', loading: true, busy: '', err: '', info: '', name: b.name,
      criticality: b.criticality || 'medium', owner: '', sponsor: '', purpose: '', acctLoaded: false,
      audit: null, auditLoading: true, auditErr: '', appsErr: '', verify: null };
    syncOverlays(true);
    agxLoad();
  }
  async function agxLoad() {
    const st = S.agx; if (!st) return;
    const id = st.bot, keep = () => S.agx === st && st.bot === id;
    st.loading = true; syncOverlays(true);
    await Promise.all([
      api('/api/inventory').then((rows) => { S.agxInv = rows; S.agxInvState = 'ready'; }).catch(() => { if (S.agxInvState !== 'ready') S.agxInvState = 'error'; }),
      api(`/api/bots/${encodeURIComponent(id)}/audit?limit=30`).then((d) => { if (keep()) { st.audit = d; st.auditErr = ''; } }).catch((e) => { if (keep()) st.auditErr = e.message; }).finally(() => { if (keep()) st.auditLoading = false; }),
      loadApps().catch((e) => { if (keep()) st.appsErr = e.message; }),
      S.models ? Promise.resolve() : api('/api/models').then((m) => { S.models = m; }).catch(() => {}),
    ]);
    if (!keep()) return;
    st.auditLoading = false;
    const inv = agxInvRow(id);
    if (inv && !st.acctLoaded) { st.owner = inv.owner === 'system' ? '' : (inv.owner || ''); st.sponsor = inv.sponsor || ''; st.purpose = inv.purpose || ''; st.acctLoaded = true; }
    st.loading = false;
    syncOverlays(true);
  }
  async function agxAct(key, fn) {
    const st = S.agx; if (!st || st.busy) return;
    st.busy = key; st.err = ''; st.info = ''; S.err = '';
    syncOverlays(true);
    try { const msg = (await fn()) || 'Saved.'; st.info = msg; S.info = msg; S.err = ''; }
    catch (e) { st.err = e.message; S.err = e.message; }
    if (S.agx !== st) return;
    st.busy = '';
    if (key !== 'verify') {
      try { S.agxInv = await api('/api/inventory'); S.agxInvState = 'ready'; } catch { S.agxInvState = 'error'; }
      S.agxPanelAudit = null;
      try { st.audit = await api(`/api/bots/${encodeURIComponent(st.bot)}/audit?limit=30`); st.auditErr = ''; } catch (e) { st.auditErr = e.message; }
    }
    syncOverlays(true);
  }
  function agxRow(label, node, hint) {
    return h('div', { class: 'agx-row' }, h('span', { class: 'agx-row-k' }, label), h('div', { class: 'agx-row-v' }, node, hint ? h('small', { class: 'muted agx-hint' }, hint) : null));
  }
  function agxCard(title, kids) {
    return h('section', { class: 'agx-card' }, title ? h('div', { class: 'agx-card-h' }, h('b', {}, title)) : null, kids);
  }
  function agxModelSection(b, st) {
    return agxCard('Model', modelEditor(b));
  }
  function agxGeneralSection(b, st) {
    const name = h('input', { class: 'field agx-nameinput', maxlength: 40, value: st.name || b.name, 'aria-label': 'Agent name', style: 'flex:1;min-width:180px' });
    const rename = () => {
      const v = (st.name || '').trim();
      if (v.length < 2) { st.err = 'The name needs at least 2 characters.'; st.info = ''; syncOverlays(true); return; }
      if (v === b.name) { st.err = 'That is already the agent name.'; st.info = ''; syncOverlays(true); return; }
      agxAct('rename', async () => { await api(`/api/bots/${b.id}`, { method: 'PATCH', body: { name: v } }); await loadBots(); return `Renamed to "${v}". The rename is audited; the id stays stable.`; });
    };
    const renameBtn = btn(st.busy === 'rename' ? 'Renaming…' : 'Rename agent', rename, 'btn primary', { disabled: !!st.busy || (st.name || b.name).trim() === b.name });
    name.addEventListener('input', () => {
      st.name = name.value;
      const v = name.value.trim();
      renameBtn.disabled = !!st.busy || v === b.name || v.length < 2;
      if (st.err) { st.err = ''; syncOverlays(true); }
    });
    const crit = h('select', { class: 'field agx-select', 'aria-label': 'Criticality' },
      ['low', 'medium', 'high'].map((x) => h('option', { value: x, selected: (st.criticality || b.criticality) === x }, x)));
    const metaBtn = btn(st.busy === 'meta' ? 'Saving…' : 'Save criticality', () => agxAct('meta', async () => {
      await api(`/api/bots/${b.id}/meta`, { method: 'PUT', body: { criticality: crit.value } });
      await loadBots(); return `Criticality set to ${crit.value}.`;
    }), 'btn primary', { disabled: !!st.busy || (st.criticality || b.criticality) === b.criticality });
    crit.addEventListener('change', () => { st.criticality = crit.value; metaBtn.disabled = !!st.busy || crit.value === b.criticality; });
    return h('div', {},
      agxCard('Identity', [
        agxRow('Name', h('div', { class: 'row2' }, name, renameBtn)),
        agxRow('Role', h('span', {}, b.role), 'Roles come from the agent template and do not change after the agent is created.'),
        agxRow('Team', h('span', {}, b.team || 'General'), 'The team is set when the agent is created.'),
        agxRow('Icon & colour', h('span', { class: 'row2' }, tile(b, 26), h('span', { class: 'mono' }, b.color || '—')), 'The face is drawn from the agent name; the icon and colour are set at creation.'),
      ]),
      agxModelSection(b, st),
      agxCard('Criticality', [
        agxRow('Criticality', h('div', { class: 'row2' }, crit, metaBtn), 'How much review this agent needs before it acts: low, medium or high.'),
      ]),
      h('p', { class: 'muted agx-hint' }, 'Every change here is admin-only and written to the audit log.'));
  }
  function agxPermissionsSection(b, st) {
    const scopes = agxScopeRows(b.scopes);
    return h('div', {},
      agxCard('Capabilities', [
        h('p', { class: 'muted agx-note' }, 'Capabilities control what this agent may do. The server checks every capability on every request; this page only edits the list.'),
        h('div', { class: 'agx-switchlist' }, scopes.rows),
        h('div', { class: 'agx-card-actions' },
          btn(st.busy === 'scopes' ? 'Saving…' : 'Save permissions', () => agxAct('scopes', async () => {
            await api(`/api/bots/${b.id}/scopes`, { method: 'PUT', body: { scopes: scopes.value() } });
            await loadBots(); return 'Permissions saved and written to the audit log.';
          }), 'btn primary', { disabled: !!st.busy })),
        admin('Admin only. Payments can only be proposed, never executed, and approvals still need a human decision.'),
      ]));
  }
  function agxAccountabilitySection(b, st) {
    const inv = agxInvRow(b.id), missing = (inv && inv.accountability) || [];
    const field = (k, ph, max) => {
      const el = h('input', { class: 'field', maxlength: max, value: st[k] || '', placeholder: ph, 'aria-label': ph });
      el.addEventListener('input', () => { st[k] = el.value; });
      return el;
    };
    const purpose = h('textarea', { class: 'field', rows: 3, maxlength: 300, 'aria-label': 'Purpose', placeholder: 'What may this agent do, and where are its limits?' });
    purpose.value = st.purpose || '';
    purpose.addEventListener('input', () => { st.purpose = purpose.value; });
    const gaps = missing.length
      ? h('div', { class: 'row2 agx-gaprow' }, h('span', { class: 'muted' }, 'Missing:'), missing.map((g) => h('span', { class: 'chip warn' }, g === 'no_owner' ? 'owner' : g === 'no_sponsor' ? 'sponsor' : 'purpose')))
      : h('div', { class: 'row2 agx-gaprow' }, h('span', { class: 'chip ok' }, 'Accountability complete'));
    return h('div', {},
      agxCard('Accountability', [
        h('p', { class: 'muted agx-note' }, 'A named human owner, a sponsor and a stated purpose are what the agent inventory calls accountability. Empty fields show up as gaps.'),
        gaps,
        agxRow('Owner', field('owner', 'Name of the accountable person', 80)),
        agxRow('Sponsor', field('sponsor', 'Name of the sponsor', 80)),
        agxRow('Purpose', purpose),
        h('div', { class: 'agx-card-actions' }, btn(st.busy === 'acct' ? 'Saving…' : 'Save accountability', () => agxAct('acct', async () => {
          await api(`/api/bots/${b.id}/accountability`, { method: 'PATCH', body: { owner: (st.owner || '').trim(), sponsor: (st.sponsor || '').trim(), purpose: (st.purpose || '').trim() } });
          await loadBots(); return 'Accountability saved. The inventory updates immediately.';
        }), 'btn primary', { disabled: !!st.busy })),
      ]));
  }
  function agxActivitySection(b, st) {
    const d = st.audit, evs = (d && d.entries) || [], total = d ? d.total : 0;
    const refresh = () => {
      st.auditLoading = true; st.auditErr = ''; syncOverlays(true);
      api(`/api/bots/${encodeURIComponent(b.id)}/audit?limit=30`).then((r) => {
        if (S.agx !== st) return;
        st.audit = r; st.auditLoading = false; syncOverlays(true);
      }).catch((e) => { if (S.agx !== st) return; st.auditErr = e.message; st.auditLoading = false; syncOverlays(true); });
    };
    const verify = () => agxAct('verify', async () => {
      const v = await api(`/api/bots/${encodeURIComponent(b.id)}/audit/verify`);
      st.verify = v;
      return v.valid ? `Chain intact: ${v.checked} event${v.checked === 1 ? '' : 's'} checked.` : 'Chain broken: ' + JSON.stringify(v);
    });
    const list = evs.length ? h('div', { class: 'agx-evs agx-evs-lg' }, evs.map((e) => h('div', { class: 'agx-ev' },
      h('span', { class: 'mono agx-ev-time' }, when(e.ts)),
      h('span', { class: 'chip agx-ev-kind' }, e.kind),
      h('span', { class: 'agx-ev-sum' }, e.summary || '—'),
      h('span', { class: 'muted agx-ev-actor' }, e.actor || 'system')))) : null;
    return agxCard('History', [
      h('p', { class: 'muted agx-note' }, 'Every message, note read or written, tool call and approval for this agent is appended to its own hash-linked audit chain. The chain detects edits; it is not an external signature.'),
      h('div', { class: 'row2 agx-activity-bar' },
        st.auditLoading ? h('span', { class: 'muted' }, 'Loading activity…') : btn('Refresh', refresh, 'btn'),
        btn('Verify chain', verify, 'btn', { disabled: !!st.busy }),
        btn('Export NDJSON', () => agxAct('export', async () => { await dl(`/api/bots/${b.id}/audit/export`, `agent-${b.id}-audit.ndjson`); return 'Audit export downloaded as NDJSON.'; }), 'btn', { disabled: !!st.busy }),
        d ? h('span', { class: 'chip ' + (d.integrity && d.integrity.valid ? 'ok' : 'warn') }, d.integrity && d.integrity.valid ? 'Chain intact' : 'Chain not verified') : null,
        h('span', { class: 'sp' }),
        d ? h('span', { class: 'muted agx-hint' }, `${total} event${total === 1 ? '' : 's'} recorded${total > evs.length ? `, newest ${evs.length} shown` : ''}`) : null),
      st.auditErr ? h('p', { class: 'agx-warn agx-note' }, 'Activity could not be loaded: ' + st.auditErr) : null,
      st.auditLoading ? null : (evs.length ? list : h('div', { class: 'agx-empty agx-empty-lg' }, h('b', {}, 'No activity recorded yet'), h('p', { class: 'muted' }, 'The per-agent audit chain is empty. Chat with the agent or run a council call, then refresh.'))),
    ]);
  }
  function agxAppsSection(b, st) {
    const connected = (S.apps || []).filter((a) => a.connected);
    const grantsOf = (a) => (a.grants || {})[b.id] || [];
    const mine = connected.filter((a) => grantsOf(a).length);
    const cards = mine.map((a) => h('div', { class: 'agx-card agx-app' },
      h('div', { class: 'agx-card-h' }, agxAppLogo(a, 30), h('b', {}, a.name), h('span', { class: 'chip ' + (a.live ? 'ok' : '') }, a.live ? 'Live MCP server' : 'Demo app')),
      h('p', { class: 'muted agx-note' }, a.description || ''),
      h('div', { class: 'row2 agx-toolchips' }, grantsOf(a).map((t) => {
        const risk = (a.tools.find((x) => x.name === t) || {}).risk;
        return h('span', { class: 'chip' + (risk === 'write' ? ' warn' : '') }, t + (risk === 'write' ? ' (needs approval)' : risk === 'read' ? ' (read)' : ''));
      }))));
    const noGrant = connected.filter((a) => !grantsOf(a).length).map((a) => a.name);
    return h('div', {},
      h('p', { class: 'muted agx-note' }, 'Tools are granted per agent in the apps connector. Write tools only create an approval request; secret tools can never be granted.'),
      mine.length ? h('div', {}, cards) : h('div', { class: 'agx-card agx-empty' }, h('b', {}, 'No app grants'), h('p', { class: 'muted' }, 'Without a grant this agent cannot call any tool.')),
      noGrant.length ? h('p', { class: 'muted agx-note' }, 'Connected apps with no grant for this agent: ' + noGrant.join(', ') + '.') : null,
      st.appsErr ? h('p', { class: 'agx-warn agx-note' }, 'Apps could not be refreshed: ' + st.appsErr) : null,
      h('div', { class: 'row2' },
        btn('Open connector', () => { S.agx = null; S.modal = null; syncOverlays(true); openApps(); }, 'btn primary'),
        btn('Refresh grants', () => agxAct('apps', async () => { await loadApps(); return 'Grants reloaded from the server.'; }), 'btn', { disabled: !!st.busy })));
  }
  function agxDangerSection(b, st) {
    const status = () => agxAct('status', async () => {
      const next = b.status === 'suspended' ? 'active' : 'suspended';
      await api(`/api/bots/${b.id}/status`, { method: 'POST', body: { status: next, reason: 'manual' } });
      await loadBots();
      return next === 'suspended' ? 'Agent suspended. Chat, calls and tools stop immediately.' : 'Agent resumed.';
    });
    const trust = () => agxAct('trust', async () => {
      const next = b.trust === 'verified' ? 'unverified' : 'verified';
      await api(`/api/bots/${b.id}/trust`, { method: 'POST', body: { trust: next } });
      await loadBots();
      return next === 'verified' ? 'Agent marked as reviewed.' : 'Agent marked as unverified.';
    });
    const remove = () => {
      if (!window.confirm(`Delete "${b.name}"? This cannot be undone. The agent's audit trail stays in the recording tables.`)) return;
      agxAct('delete', async () => {
        await api(`/api/bots/${b.id}`, { method: 'DELETE' });
        S.agx = null; S.modal = null; S.agxInv = null; S.agxInvState = ''; S.agxPanelAudit = null;
        await loadBots();
        if (S.bot && S.bot.id === b.id) {
          S.bot = S.bots[0] || null;
          S.msgs = S.bot ? await api(`/api/bots/${S.bot.id}/messages`) : [];
          S.tab = 'overview';
        }
        S.info = `Agent "${b.name}" deleted.`;
        render();
        return S.info;
      });
    };
    return h('div', {},
      agxCard('Status', [
        agxRow('Current status', h('span', { class: 'chip ' + (b.status === 'suspended' ? 'warn' : 'ok') }, b.status === 'suspended' ? 'Suspended' : 'Active'), 'A suspended agent cannot chat, join calls or use tools. It can be resumed at any time.'),
        h('div', { class: 'agx-card-actions' }, btn(st.busy === 'status' ? 'Working…' : (b.status === 'suspended' ? 'Resume agent' : 'Suspend agent'), status, 'btn', { disabled: !!st.busy })),
      ]),
      agxCard('Review status', [
        agxRow('Trust', h('span', { class: 'chip ' + (b.trust === 'verified' ? 'ok' : 'warn') }, b.trust === 'verified' ? 'Verified' : 'Unverified'), 'Verified means a human reviewed this agent. The inventory uses this for its trust score.'),
        h('div', { class: 'agx-card-actions' }, btn(st.busy === 'trust' ? 'Working…' : (b.trust === 'verified' ? 'Mark as unverified' : 'Mark as reviewed'), trust, 'btn', { disabled: !!st.busy })),
      ]),
      h('section', { class: 'agx-card agx-danger' },
        h('div', { class: 'agx-card-h' }, h('b', {}, 'Delete this agent')),
        h('p', { class: 'muted agx-note' }, 'Deletes the agent, its messages, grants and team membership. The audit trail stays in the recording tables. This cannot be undone.'),
        h('div', { class: 'agx-card-actions' }, btn(st.busy === 'delete' ? 'Deleting…' : 'Delete agent', remove, 'btn agx-danger-btn', { disabled: !!st.busy }))));
  }
  function agentSettingsModal() {
    const st = S.agx;
    const b = st ? (S.bots || []).find((x) => x.id === st.bot) : null;
    if (!st || !b) return h('div');
    const close = () => { S.agx = null; S.modal = null; render(); };
    const sec = st.section || 'general';
    const def = AGX_SECTIONS.find((s) => s[0] === sec) || AGX_SECTIONS[0];
    let content;
    if (sec === 'permissions') content = agxPermissionsSection(b, st);
    else if (sec === 'accountability') content = agxAccountabilitySection(b, st);
    else if (sec === 'activity') content = agxActivitySection(b, st);
    else if (sec === 'apps') content = agxAppsSection(b, st);
    else if (sec === 'danger') content = agxDangerSection(b, st);
    else content = agxGeneralSection(b, st);
    return h('div', { class: 'scrim agx-scrim', onclick: (e) => { if (e.target.classList.contains('scrim')) close(); } },
      h('div', { class: 'modal agx-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Agent settings' },
        h('div', { class: 'agx-modal-h' }, tile(b, 44, { float: true }),
          h('div', { class: 'agx-modal-id' }, h('b', {}, b.name), h('div', { class: 'muted' }, b.role + ' · ' + (b.team || 'General'))),
          h('span', { class: 'chip ' + (agxHasModel(b) ? '' : 'warn') }, agxModelLabel(b)),
          h('span', { class: 'sp' }),
          h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Close agent settings', onclick: close }, icon('x'))),
        h('div', { class: 'agx-modal-body' },
          h('nav', { class: 'agx-nav', 'aria-label': 'Agent settings sections' }, AGX_SECTIONS.map(([id, label, ic]) =>
            h('button', { type: 'button', class: 'agx-navbtn', 'aria-current': sec === id ? 'page' : false, onclick: () => { st.section = id; syncOverlays(true); } }, icon(ic, 18), h('span', {}, label)))),
          h('div', { class: 'agx-sec' },
            h('div', { class: 'agx-sec-h' }, h('h2', {}, def[1])),
            st.err ? h('div', { class: 'banner agx-banner agx-banner-bad', role: 'alert' }, st.err) : null,
            st.info ? h('div', { class: 'banner agx-banner', role: 'status' }, st.info) : null,
            st.loading ? h('div', { class: 'agx-loading' }, 'Loading agent data…') : null,
            content))));
  }

  // Reader view: shows the source the agent is reading right now. It is a text extract, not a live browser; a real browser needs an isolated provider.
  function readerView(r) {
    const src = r.sources[r.sources.length - 1], web = src && src.kind === 'web', url = !src ? (r.running ? 'searching…' : '') : web ? src.ref : 'Brain · ' + src.title;
    return h('div', { class: 'reader', 'aria-label': 'Reader view of the current source' }, h('div', { class: 'rbar' }, h('span', { class: 'rdots' }, h('i'), h('i'), h('i')), h('span', { class: 'rurl mono' }, url || 'no page opened yet'), h('span', { class: 'chip' }, 'Reader view')),
      h('div', { class: 'rbody' + (r.running ? ' reading' : '') }, src ? [h('b', {}, src.title), h('p', { class: 'muted', style: 'margin:6px 0 0' }, src.snippet)] : h('span', { class: 'muted' }, r.running ? 'Planning the search…' : 'Nothing was read.'),
        h('div', { class: 'muted', style: 'font-size:11px;margin-top:8px' }, 'Text extract of the source, not a live browser.')));
  }
  function researchMonitor(r, rep) {
    const pr = r.prog || { done: 1, total: 1 }, pct = Math.round((pr.done / Math.max(pr.total, 1)) * 100);
    return h('div', { class: 'monitor' }, h('div', { class: 'monhead' }, r.agent ? tile(r.agent, 38, { thinking: r.running, float: !r.running }) : icon('lens', 24), h('div', { style: 'flex:1' }, h('b', {}, r.agent ? r.agent.name : 'Research agent'), h('div', { style: 'font-size:12px;opacity:.7' }, r.running ? `working: step ${pr.done} of ${pr.total}` : rep ? 'finished' : 'idle')), h('span', { class: 'chip ' + (r.running ? 'ok' : '') }, r.running ? 'LIVE' : 'DONE')),
      h('div', { class: 'progress dark' }, h('i', { style: `width:${pct}%` })), readerView(r), h('div', { class: 'monbody' }, r.activity.length ? [...r.activity].reverse().map((a) => h('div', {}, a)) : h('div', { style: 'opacity:.7' }, 'Waiting to start…')));
  }
  function upgrade(plan, seats) {
    track('upgrade_click');
    const b = S.bill || {}, wanted = Math.round(+seats), current = (b.usage && b.usage.seats) || 1;
    const base = wanted || (S.qseats != null ? S.qseats : current);
    const n = Math.max(1, Math.min(200, base || 1));
    S.up = { plan, seats: n, quote: null, busy: false, err: '', timer: null };
    S.modal = 'upgrade';
    render();
    if (!(b.plans || []).some((x) => x.id === plan)) { S.up.err = 'That plan is not available on this deployment.'; syncOverlays(true); return; }
    api(`/api/billing/quote?plan=${encodeURIComponent(plan)}&seats=${n}`).then((q) => {
      if (S.up && S.up.plan === plan && S.up.seats === n) { S.up.quote = q; syncOverlays(true); }
    }).catch((e) => {
      if (S.up && S.up.plan === plan && S.up.seats === n) { S.up.err = e.message; syncOverlays(true); }
    });
  }
  async function applyPreset(id) {
    track('preset_applied');
    await run(async () => { const r = await api(`/api/presets/${id}/apply`, { method: 'POST' }); await Promise.all([loadBots(), loadNotes(), loadTeams(), api('/api/billing').then((x) => { S.bill = x; })]); S.modal = null; S.onb = { done: true, suggest: false }; S.topic = r.topic; S.info = `Preset ready: ${r.created} agents, team "${r.team}" and ${r.notes} starter notes. Try the sample question in a council call.`; if (r.first_agent) await pick(r.first_agent); });
  }
  function onboardModal() {
    return h('div', { class: 'scrim' }, h('div', { class: 'modal wizard', role: 'dialog', 'aria-label': 'Choose a preset' }, h('div', { class: 'logo' }, 'Shewiun'), h('h2', { style: 'margin-top:16px;border:0;padding:0;font-size:22px' }, 'What are you building?'),
      h('p', { class: 'muted' }, 'Pick a starter team. It creates agents with roles and the right permissions, a shared memory with first notes, and a sample question. You can change everything later.'),
      S.err ? h('div', { class: 'banner', role: 'alert', style: 'color:var(--bad)' }, S.err) : null,
      h('div', { class: 'cards' }, S.presets.map((p) => h('div', { class: 'card appcard preset' }, h('div', { class: 'stack' }, p.agents.slice(0, 4).map((a) => tile(a, 40))), h('div', { class: 'row2' }, h('b', { style: 'flex:1' }, p.name), h('span', { class: 'chip' }, p.level), h('span', { class: 'chip ' + (p.plan === 'free' ? 'ok' : 'warn') }, p.plan === 'free' ? 'Free' : (p.plan === 'starter' ? 'Starter' : 'Professional'))), h('div', { class: 'muted' }, p.tagline), h('div', { class: 'muted', style: 'font-size:12px' }, 'For: ' + p.audience),
        h('div', { class: 'pflow' }, p.flow),
        h('ul', { class: 'pfacts' }, (p.features || []).map((f) => h('li', {}, f)), h('li', {}, `${p.agents.length} agents: ${p.agents.map((a) => a.name).join(', ')}`), h('li', {}, `${p.notes} starter notes in a shared team memory`)),
        h('p', { class: 'muted', style: 'font-size:12px;margin:8px 0 2px' }, p.plan === 'free' ? 'Included in the Free plan.' : 'Included in the ' + (p.plan === 'starter' ? 'Starter' : 'Professional') + ' plan - see Plans & usage.'), btn('Use this preset', () => applyPreset(p.id), 'btn primary')))),
      h('div', { class: 'row2', style: 'margin-top:16px' }, btn('Load the demo workspace instead', () => { S.modal = null; loadDemo(); }), btn('Skip for now', () => { S.skipOnb = true; S.modal = null; api('/api/onboarding/complete', { method: 'POST' }).catch(() => {}); render(); }, 'link'))));
  }
  function upsellModal() {
    const u = S.upsell || {}, close2 = () => { S.modal = null; S.upsell = null; render(); };
    return h('div', { class: 'scrim', onclick: (e) => { if (e.target.classList.contains('scrim')) close2(); } }, h('div', { class: 'modal', role: 'dialog', 'aria-label': 'Plan limit reached', style: 'max-width:480px' }, h('h2', {}, 'Plan limit reached'), h('p', {}, u.message || 'You reached a limit of your plan.'),
      h('div', { class: 'progress hot' }, h('i', { style: 'width:100%' })), h('p', { class: 'muted' }, `${u.used} of ${u.limit} ${u.label} used this month on the ${(u.plan || '').toUpperCase()} plan.`),
      h('div', { class: 'row2' }, btn('See plans', () => { track('upgrade_click'); S.modal = null; S.upsell = null; go('plans'); }, 'btn primary'), btn('Not now', close2))));
  }
  function leadModal() {
    const l = S.lead, f = (k, ph, type = 'text') => { const i = h('input', { class: 'field', type, placeholder: ph, maxlength: 120, value: l[k], 'aria-label': ph }); i.addEventListener('input', () => { l[k] = i.value; }); return i; };
    const msg = h('textarea', { class: 'field', rows: 3, maxlength: 1000, placeholder: 'What do you want to prove or protect?', 'aria-label': 'Message' }); msg.value = l.message; msg.addEventListener('input', () => { l.message = msg.value; });
    return h('div', { class: 'scrim', onclick: (e) => { if (e.target.classList.contains('scrim')) close(); } }, h('div', { class: 'modal', role: 'dialog', 'aria-label': 'Request a pilot', style: 'max-width:480px' }, h('h2', {}, 'Request a pilot'), h('p', { class: 'muted' }, 'We set up a workspace with you, run the authorization test on your agents and send you the evidence report.'),
      S.err ? h('div', { class: 'banner', role: 'alert', style: 'color:var(--bad)' }, S.err) : null, f('name', 'Your name'), h('div', { style: 'height:8px' }), f('email', 'Work email', 'email'), h('div', { style: 'height:8px' }), f('company', 'Company'), h('div', { style: 'height:8px' }), msg,
      h('div', { class: 'row2', style: 'margin-top:12px' }, btn('Send request', () => run(async () => { await api('/api/leads', { method: 'POST', body: { ...l, source: 'app' } }); S.lead = { name: '', email: '', company: '', message: '' }; S.modal = null; S.info = 'Thank you. We will reply by email.'; }), 'btn primary'), btn('Cancel', close))));
  }
  function plansView() {
    const b = S.bill; if (!b) return h('div', { class: 'body' }, h('p', { class: 'muted' }, 'Loading…'));
    const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString());
    const eur = (v) => (v == null ? 'Custom' : '€' + Number(v).toFixed(2));
    const perBlockSeat = (p) => (p.price_eur == null ? 'Custom' : '€' + (p.price_eur / Math.max(1, (p.limits && p.limits.seats) || 1)).toFixed(2));
    const plans = b.plans || [];
    const cur = plans.find((p) => p.id === b.plan) || plans[0] || { id: b.plan, name: b.plan_name || b.plan, price_eur: null, tagline: '', limits: b.limits || {} };
    if (S.qseats == null) S.qseats = Math.max(1, Math.min(200, (b.usage && b.usage.seats) || 1));
    S.qseats = Math.max(1, Math.min(200, Math.round(S.qseats) || 1));
    const mk = (p, seats) => { const inc = Math.max(1, (p.limits && p.limits.seats) || 1), blocks = Math.max(1, Math.ceil(seats / inc)); return { seats, inc, blocks, total: p.price_eur == null ? null : blocks * p.price_eur, custom: p.price_eur == null }; };
    const local = mk(cur, S.qseats);
    const q = S.quote && S.quote.plan === b.plan && S.quote.seats === S.qseats ? S.quote : null;
    const v = q ? { seats: q.seats, inc: q.included_seats, blocks: q.blocks, total: q.monthly_total_eur, custom: !!q.custom } : local;
    const qkey = b.plan + ':' + S.qseats;
    // The server quote is the source of truth; the local block math above only bridges the gap while it loads.
    if (!q && S.qkey !== qkey && S.qerrKey !== qkey) {
      S.qkey = qkey;
      api(`/api/billing/quote?plan=${encodeURIComponent(b.plan)}&seats=${S.qseats}`).then((r) => { if (S.qkey === qkey) { S.quote = r; S.qkey = null; S.qerr = ''; } render(); })
        .catch((e) => { if (S.qkey === qkey) { S.qkey = null; S.qerrKey = qkey; S.qerr = e.message; } render(); });
    }
    const seatsIn = h('input', { class: 'field planx-seatinput', type: 'number', min: 1, max: 200, value: S.qseats, 'aria-label': 'Seats to quote' });
    seatsIn.addEventListener('input', () => {
      S.qseats = Math.max(1, Math.min(200, Math.round(+seatsIn.value || 1)));
      S.quote = null; S.qerr = ''; S.qerrKey = null;
      if (S.qtimer) clearTimeout(S.qtimer);
      S.qtimer = setTimeout(() => {
        if (S.view !== 'plans') return;
        render();
        const el = document.querySelector('input[aria-label="Seats to quote"]');
        if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch {} }
      }, 350);
    });
    const stat = (label, value, title) => h('div', { class: 'planx-stat', title: title || null }, h('div', { class: 'planx-stat-lab' }, label), h('div', { class: 'planx-stat-val' }, value));
    const cta = (p) => {
      if (p.id === b.plan) return h('span', { class: 'chip ok' }, 'Current plan');
      if (p.id === 'enterprise') return btn('Request a pilot', () => { track('cta_pilot'); S.modal = 'lead'; render(); }, 'btn');
      if (p.id === 'free') return h('span', { class: 'muted planx-note' }, 'Free tier');
      return b.enabled && b.checkout ? btn('Upgrade', () => upgrade(p.id, S.qseats), 'btn primary') : btn('See invoice', () => upgrade(p.id, S.qseats), 'btn');
    };
    const cell = (x, cls) => h('td', { class: cls || null }, x);
    const row = (p) => h('tr', { class: p.id === b.plan ? 'planx-current' : null },
      h('th', { scope: 'row' }, h('b', {}, p.name), h('div', { class: 'muted planx-tag' }, p.tagline || '')),
      cell(p.price_eur == null ? 'Custom' : eur(p.price_eur), 'planx-num'), cell(fmt(p.limits.seats), 'planx-num'),
      cell(perBlockSeat(p), 'planx-num'), cell(fmt(p.limits.agents), 'planx-num'), cell(fmt(p.limits.messages), 'planx-num'),
      cell(fmt(p.limits.calls), 'planx-num'), cell(fmt(p.limits.research), 'planx-num'), cell(fmt(p.limits.api_calls), 'planx-num'),
      cell(fmt(p.limits.audit_days) + ' days', 'planx-num'), cell(fmt(p.limits.storage_mb) + ' MB', 'planx-num'), cell(cta(p)));
    const usage = Object.keys(b.labels || {}).map((k) => {
      const lim = (b.limits || {})[k], used = (b.usage || {})[k] || 0, pct = Math.min(100, Math.round((used / Math.max(lim || 0, 1)) * 100));
      return h('div', { class: 'planx-usage' }, h('div', { class: 'row2' }, h('span', { style: 'flex:1' }, b.labels[k]), h('span', { class: 'muted mono' }, `${used} / ${fmt(lim)}`)),
        h('div', { class: 'progress' + (pct >= 90 ? ' hot' : '') }, h('i', { style: `width:${pct}%` })));
    });
    if (b.enabled && b.portal && S.billInv === undefined) {
      S.billInv = { loading: true };
      api('/api/billing/invoices').then((r) => { S.billInv = r; render(); })
        .catch((e) => { S.billInv = { invoices: [], note: 'Invoices could not be loaded: ' + e.message }; render(); });
    }
    return h('div', { class: 'body' }, h('div', { class: 'wide' }, h('h2', {}, 'Plans and usage'),
      !b.enabled ? h('div', { class: 'banner planx-banner' }, 'Billing is off on this deployment: self-hosted installs have no limits, no online checkout and no invoices. The prices below are this release\'s launch prices, for reference only.') : null,
      b.status === 'past_due' ? h('div', { class: 'banner planx-banner', role: 'alert', style: 'color:var(--bad)' }, 'Your last payment failed. Update your payment method in Manage billing to keep your plan.') : null,
      b.cancel_at_period_end ? h('div', { class: 'banner planx-banner' }, 'This plan is cancelled and stays active until ' + when(b.period_end) + '.') : null,
      h('h2', {}, 'Plan and seat quote'),
      h('div', { class: 'card planx-quote' },
        h('div', { class: 'row2 planx-quote-head' },
          h('div', { style: 'flex:1;min-width:0' }, h('div', { class: 'row2' }, h('b', { style: 'font-size:16px' }, (cur.name || b.plan_name) + ' plan'), h('span', { class: 'chip ' + (b.status === 'active' || b.status === 'trialing' ? 'ok' : 'warn') }, b.status || 'active')), h('div', { class: 'muted' }, cur.tagline || '')),
          h('label', { class: 'planx-seatfield' }, h('span', { class: 'muted' }, 'Seats'), seatsIn)),
        h('div', { class: 'planx-stats' },
          stat('Price / month', v.custom ? 'Custom' : eur(v.total)),
          stat('Included seats', fmt(v.inc), 'Seats covered by one plan block.'),
          stat('Seat blocks', v.custom ? '—' : fmt(v.blocks), 'A partly filled block is billed as a whole block.'),
          stat('€ / seat', v.custom || v.total == null ? 'Custom' : '€' + (v.total / Math.max(1, v.seats)).toFixed(2), 'Monthly total divided by the seats you quote.')),
        h('p', { class: 'planx-line' }, v.custom ? `${fmt(v.seats)} seats and ${fmt(v.blocks)} seat block${v.blocks === 1 ? '' : 's'} of ${fmt(v.inc)}: enterprise is invoiced per contract, so request a pilot for a quote.`
          : `${fmt(v.seats)} seat${v.seats === 1 ? '' : 's'} -> ${fmt(v.blocks)} block${v.blocks === 1 ? '' : 's'} of ${fmt(v.inc)} -> ${eur(v.total)} / month`),
        h('p', { class: 'muted planx-fine' }, 'One block covers the plan\'s included seats and never splits. The euro-per-seat figure is derived from the block price; there is no separate per-seat rate.'),
        b.enabled && cur.id === 'free' && v.seats > v.inc ? h('p', { class: 'muted planx-fine' }, `The Free plan includes ${fmt(v.inc)} seats and has no self-serve seat blocks; upgrade to add more people.`) : null,
        S.qerr ? h('p', { class: 'muted planx-fine' }, 'The live server quote could not be loaded (' + S.qerr + '). The numbers above use the same plan prices.') : null),
      h('h2', {}, 'Compare plans'),
      h('div', { class: 'tbl-wrap planx-table' }, h('table', {},
        h('caption', { class: 'muted planx-caption' }, 'Prices are in EUR per organisation and per month. Included seats are the size of one seat block.'),
        h('thead', {}, h('tr', {}, ['Plan', 'Price / month', 'Included seats', '€ / seat at full block', 'Agents', 'Messages', 'Council calls', 'Research', 'API calls', 'Audit days', 'Storage', 'Choose'].map((t, i) => h('th', { scope: 'col', class: i > 0 && i < 11 ? 'planx-num' : null }, t)))),
        h('tbody', {}, plans.map(row)))),
      h('p', { class: 'muted planx-fine' }, 'Prices are launch prices in EUR, per organisation, billed monthly. Seat blocks do not split; a new block starts when the previous one is full. Cancel anytime.'),
      b.enabled ? h('h2', {}, 'Invoices') : null,
      b.enabled ? h('div', { class: 'card planx-invoices' },
        h('div', { class: 'row2 planx-actions' },
          b.portal ? btn('Manage billing and invoices', () => run(async () => { const r = await api('/api/billing/portal', { method: 'POST' }); location.href = r.url; })) : h('span', { class: 'muted' }, 'No paid subscription yet: online billing is not set up for this workspace.'),
          b.contact ? h('a', { class: 'link', href: b.contact, target: '_blank', rel: 'noopener' }, 'Talk to us') : null),
        !b.portal ? h('p', { class: 'muted planx-fine' }, 'No invoices yet.') :
          !S.billInv || S.billInv.loading ? h('p', { class: 'muted planx-fine' }, 'Loading invoices…') :
            (S.billInv.invoices || []).length ? h('div', { class: 'tbl-wrap' }, h('table', {},
              h('thead', {}, h('tr', {}, ['Number', 'Status', 'Amount', 'Created', 'Invoice'].map((t) => h('th', { scope: 'col' }, t)))),
              h('tbody', {}, S.billInv.invoices.map((i) => h('tr', {},
                h('td', { class: 'mono' }, i.number || i.id || '—'),
                h('td', { class: 'muted' }, i.status || '—'),
                h('td', {}, i.amount_due == null ? '—' : (Number(i.amount_due) / 100).toFixed(2) + ' ' + String(i.currency || 'eur').toUpperCase()),
                h('td', { class: 'muted' }, when(i.created)),
                h('td', {}, i.invoice_pdf ? h('a', { href: i.invoice_pdf, target: '_blank', rel: 'noopener' }, 'PDF') : i.hosted_invoice_url ? h('a', { href: i.hosted_invoice_url, target: '_blank', rel: 'noopener' }, 'View') : h('span', { class: 'muted' }, '—')))))))
              : h('p', { class: 'muted planx-fine' }, S.billInv.note || 'No invoices yet.')) : null,
      h('h2', {}, 'Usage this month'), h('div', { class: 'card planx-usage-card' }, usage),
      h('p', { class: 'muted planx-fine' }, 'Limits reset on the first of each month. Usage counts this workspace only.')));
  }
  function upgradeModal() {
    const u = S.up || { plan: 'starter', seats: 1, quote: null, busy: false, err: '', timer: null };
    const b = S.bill || {}, plans = b.plans || [];
    const p = plans.find((x) => x.id === u.plan) || { id: u.plan, name: u.plan, price_eur: null, tagline: '', limits: {} };
    const q = u.quote && u.quote.plan === u.plan && u.quote.seats === u.seats ? u.quote : null;
    const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString());
    const eur = (x) => (x == null ? 'Custom' : '€' + Number(x).toFixed(2));
    const inc = q ? q.included_seats : Math.max(1, (p.limits && p.limits.seats) || 1);
    const blocks = q ? q.blocks : Math.max(1, Math.ceil(u.seats / inc));
    const custom = q ? q.custom : p.price_eur == null;
    const total = q ? q.monthly_total_eur : (p.price_eur == null ? null : blocks * p.price_eur);
    const price = q ? q.unit_price_eur : p.price_eur;
    const canPay = !!(b.enabled && q && q.checkout && !custom && !u.busy);
    const closeUp = () => { if (u.timer) clearTimeout(u.timer); S.modal = null; S.up = null; syncOverlays(true); };
    const pilot = () => { if (u.timer) clearTimeout(u.timer); S.modal = 'lead'; S.up = null; render(); };
    const focusSeats = () => { try { const el = document.querySelector('input[aria-label="Seats for this invoice"]'); if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch {} } } catch {} };
    const pull = (n) => {
      if (u.timer) { clearTimeout(u.timer); u.timer = null; }
      u.seats = Math.max(1, Math.min(200, Math.round(n) || 1)); u.quote = null; u.err = '';
      syncOverlays(true); focusSeats();
      const want = u.seats;
      api(`/api/billing/quote?plan=${encodeURIComponent(u.plan)}&seats=${want}`).then((r) => {
        if (S.up === u && S.up.seats === want) { S.up.quote = r; syncOverlays(true); focusSeats(); }
      }).catch((e) => {
        if (S.up === u && S.up.seats === want) { S.up.err = e.message; syncOverlays(true); focusSeats(); }
      });
    };
    const si = h('input', { class: 'field planx-seatinput', type: 'number', min: 1, max: 200, value: u.seats, 'aria-label': 'Seats for this invoice' });
    si.addEventListener('input', () => {
      u.seats = Math.max(1, Math.min(200, Math.round(+si.value || 1))); u.quote = null; u.err = '';
      if (u.timer) clearTimeout(u.timer);
      u.timer = setTimeout(() => { if (S.modal === 'upgrade' && S.up === u) pull(u.seats); }, 320);
    });
    const pay = async () => {
      const cur = S.up;
      if (!cur || cur.busy || !cur.quote) return;
      cur.busy = true; cur.err = '';
      syncOverlays(true);
      try {
        const r = await api('/api/billing/checkout', { method: 'POST', body: { plan: cur.plan, seats: cur.seats } });
        location.href = r.url;
      } catch (e) {
        if (S.up === cur) { cur.busy = false; cur.err = e.message; syncOverlays(true); }
      }
    };
    const LBL = Object.assign({}, b.labels || {}, { audit_days: 'days of audit log', storage_mb: 'MB stored knowledge' });
    const limits = q ? q.limits : (p.limits || {});
    const lineLabel = q && q.line_items && q.line_items[0] ? q.line_items[0].label : `${p.name || u.plan} plan — seat block (${fmt(inc)} seats)`;
    return h('div', { class: 'scrim', onclick: (e) => { if (e.target.classList.contains('scrim')) closeUp(); } },
      h('div', { class: 'modal planx-modal', role: 'dialog', 'aria-label': 'Upgrade plan', style: 'max-width:600px' },
        h('div', { class: 'modal-h' }, h('h2', { style: 'margin:0;flex:1' }, 'Upgrade to ' + (p.name || u.plan)), btn([icon('x', 16)], closeUp, 'chip', { 'aria-label': 'Close' })),
        h('p', { class: 'muted' }, `You are on the ${b.plan_name || 'current'} plan. Pick the seats you need; the invoice below uses this deployment's plan prices.`),
        !b.enabled ? h('div', { class: 'banner planx-banner' }, 'Billing is off on this deployment: these prices are for reference only and checkout is disabled.') : null,
        u.err ? h('div', { class: 'banner planx-banner', role: 'alert', style: 'color:var(--bad)' }, u.err) : null,
        h('div', { class: 'planx-seatrow' }, h('span', { class: 'muted' }, 'Seats'),
          h('div', { class: 'planx-stepper' }, btn('-', () => pull(u.seats - 1), 'chip', { 'aria-label': 'One seat less' }), si, btn('+', () => pull(u.seats + 1), 'chip', { 'aria-label': 'One seat more' })),
          h('span', { class: 'muted planx-hint' }, `1 block = ${fmt(inc)} seats`)),
        h('p', { class: 'muted planx-line' }, `${fmt(u.seats)} seat${u.seats === 1 ? '' : 's'} -> ${fmt(blocks)} block${blocks === 1 ? '' : 's'} of ${fmt(inc)}`),
        h('div', { class: 'planx-invoice', 'aria-label': 'Monthly invoice' },
          h('div', { class: 'planx-inv-head' }, h('b', {}, 'Monthly invoice'), h('span', { class: 'chip' }, 'EUR')),
          h('div', { class: 'planx-inv-item' },
            h('div', { class: 'planx-inv-label' }, h('b', {}, lineLabel), h('span', { class: 'muted' }, custom ? 'Invoiced per contract' : `${eur(price)} per block`)),
            h('div', { class: 'planx-inv-qty' }, '× ' + fmt(blocks)),
            h('div', { class: 'planx-inv-amount' }, custom ? 'Custom' : eur(total))),
          h('div', { class: 'planx-inv-row' }, h('span', { class: 'muted' }, 'Subtotal'), h('span', {}, custom ? 'Custom' : eur(total))),
          h('div', { class: 'planx-inv-row planx-total' }, h('b', {}, 'Total per month'), h('b', {}, custom ? 'Custom' : eur(total))),
          h('p', { class: 'muted planx-fine' }, custom ? 'Enterprise is invoiced per contract. Request a pilot for a seat-based quote.' : 'Billed monthly, no hidden fees. Prices are in EUR; taxes may apply.'),
          !q && b.enabled ? h('p', { class: 'muted planx-fine' }, 'Refreshing the server quote…') : null),
        h('div', { class: 'planx-limits' }, h('div', { class: 'muted planx-limits-head' }, 'Included in the ' + (p.name || u.plan) + ' plan'),
          h('div', { class: 'row2 planx-chips' }, Object.keys(limits).map((k) => h('span', { class: 'chip' }, fmt(limits[k]) + ' ' + (LBL[k] || k))))),
        h('div', { class: 'row2 planx-actions' },
          custom ? btn('Request a pilot', pilot, 'btn primary') : btn(u.busy ? 'Starting checkout…' : 'Continue to checkout', pay, 'btn primary', { disabled: !canPay }),
          !custom && b.enabled && q && !q.checkout ? btn('Request a pilot', pilot, 'btn') : null,
          !b.enabled ? btn('Request a pilot', pilot, 'btn') : null,
          btn('Not now', closeUp)),
        h('p', { class: 'muted planx-fine' }, 'Continue opens Stripe Checkout for this invoice. The subscription is billed monthly and you can cancel anytime.')));
  }
  // ---------- app settings (dialog) ----------
  // The settings are an overlay, not a screen: a left navigation (like the reference recording) and a
  // content pane. Every action reuses the existing settings APIs; nothing is simulated.
  const SET_SECTIONS = [
    { id: 'readiness', label: 'Readiness', icon: 'shield', hint: 'Health and checks' },
    { id: 'models', label: 'Models', icon: 'spark', hint: 'Providers and test' },
    { id: 'search', label: 'Search', icon: 'lens', hint: 'Web search key' },
    { id: 'keys', label: 'Access keys', icon: 'table', hint: 'API tokens' },
    { id: 'mfa', label: 'Two-factor', icon: 'user', hint: 'Authenticator codes' },
    { id: 'data', label: 'Backups & data', icon: 'doc', hint: 'Backups and retention' },
    { id: 'danger', label: 'Danger', icon: 'x', hint: 'Destructive actions' },
  ];
  const settingsIsAdmin = () => ['owner', 'admin', 'super_admin'].includes((S.me && S.me.role) || '');
  const setRow = (label, desc, control) => h('div', { class: 'set2-row' },
    h('div', { class: 'set2-rowmain' }, h('b', {}, label), desc ? h('div', { class: 'muted set2-rowdesc' }, desc) : null),
    control ? h('div', { class: 'set2-controls' }, control) : null);
  const setCard = (...rows) => h('div', { class: 'set2-card' }, rows);
  const setGroup = (title, ...kids) => h('div', { class: 'set2-group' }, title ? h('div', { class: 'set2-grouplabel' }, title) : null, ...kids);
  const setFine = (text) => h('p', { class: 'muted set2-fine' }, text);

  function settingsForm(action) {
    return async () => {
      S.err = ''; S.setInfo = '';
      try { await action(); } catch (e) { S.err = e.message; }
      syncOverlays(true);
    };
  }

  function openSettings(section) {
    if (S.setSection === undefined) S.setSection = 'readiness';
    if (section) S.setSection = section;
    S.modal = 'settings';
    S.drawer = false; S.menu = false;
    S.err = ''; S.setInfo = ''; S.setArm = false; S.setLoading = true;
    render();  // closes the account popup / drawer before the dialog appears
    loadSettingsData().catch(() => { S.setLoading = false; syncOverlays(true); });
  }

  async function loadSettingsData() {
    S.setLoading = true; S.setLoadErr = ''; syncOverlays(true);
    const errs = [];
    try { S.health = await api('/api/health'); } catch (e) { errs.push('Health: ' + e.message); }
    try { S.me = await api('/api/auth/me'); } catch (e) { errs.push('Account: ' + e.message); }
    try { S.ssearch = await api('/api/search/status'); } catch (e) { errs.push('Search status: ' + e.message); }
    try { S.ready = await (await fetch('/api/health/ready')).json(); } catch (e) { errs.push('Readiness: ' + e.message); }
    if (settingsIsAdmin()) {
      for (const [k, u] of [['models', '/api/models'], ['keys', '/api/admin/keys'], ['backups', '/api/admin/backups']]) {
        try { S[k] = await api(u); } catch (e) { errs.push(u + ': ' + e.message); }
      }
    }
    S.setLoadErr = errs.join(' · ');
    S.setLoading = false;
    syncOverlays(true);
  }

  function settingsModal() {
    if (!S.mtest) S.mtest = { model: '', out: '' };
    if (S.ret == null) S.ret = 90;
    const active = S.setSection || 'readiness';
    const admin = settingsIsAdmin();
    const closeS = () => { S.modal = null; S.err = ''; S.setInfo = ''; S.setArm = false; syncOverlays(true); };
    const goSection = (id) => {
      S.setSection = id;
      S.setInfo = ''; S.err = '';  // a status from the previous section would be confusing here
      syncOverlays(true);
      if (window.matchMedia('(max-width: 760px)').matches) {
        requestAnimationFrame(() => { const el = document.getElementById('set2-sec-' + id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      }
    };
    const nav = h('nav', { class: 'set2-nav', 'aria-label': 'Settings sections' }, SET_SECTIONS.map((s) => btn(
      [icon(s.icon, 17), h('span', { class: 'set2-navtext' }, h('b', {}, s.label), h('small', {}, s.hint))],
      () => goSection(s.id), 'set2-navbtn',
      { 'aria-current': active === s.id ? 'true' : 'false', 'aria-label': 'Settings section: ' + s.label })));
    const section = (id, title, sub, ...kids) => h('section', { class: 'set2-sec' + (active === id ? ' on' : ''), id: 'set2-sec-' + id, 'aria-label': title },
      h('h3', { class: 'set2-sectitle' }, title), sub ? h('p', { class: 'muted set2-secsub' }, sub) : null, ...kids);
    const adminOnly = (what) => h('div', { class: 'set2-card' }, h('div', { class: 'set2-row' }, h('div', { class: 'set2-rowmain' },
      h('b', {}, 'Admin only'), h('div', { class: 'muted' }, `Only owners and admins can manage ${what} on this deployment. You can still review the other sections.`))));
    const missing = (what) => setFine(S.setLoading ? 'Loading…' : `${what} is not available right now. Use “Reload” at the top right.`);

    // Readiness
    const ready = S.ready;
    const checkRow = (label, ok, detail) => setRow(label, detail, h('span', { class: 'chip ' + (ok ? 'ok' : 'warn') }, ok ? 'ok' : 'needs attention'));
    const readinessSec = section('readiness', 'Readiness', 'Live checks of this installation. Every value comes from the server; nothing is cached here.',
      setGroup('Checks', setCard(
        checkRow('Readiness probe', !!(ready && ready.ready), ready ? ((ready.errors || []).length ? ready.errors.join('; ') : 'No configuration errors reported.') : 'Checking…'),
        checkRow('Model provider', !!S.health.model_configured, 'Set CFA_MODEL_API_KEY (and optionally CFA_MODEL_BASE_URL) on the host. Without a key, agents answer with demo text.'),
        checkRow('Web search', !!S.health.search_configured, 'Needed for live citations in deep research. Configure it in the Search section.'),
        checkRow('Encryption key', !!S.health.secret_key_configured, 'CFA_SECRET_KEY encrypts provider keys and the stored search key.'),
        checkRow('Mail delivery', !!S.health.mail_configured, 'Needed for invitations and password resets. Without SMTP, invitations are printed to the server log.'))),
      setGroup('Instance', setCard(
        setRow('Version', (S.health.app || 'Shewiun CFA') + ' ' + (S.health.version || '?') + (S.health.build ? ' · build ' + S.health.build : '')),
        setRow('Access mode', S.health.auth === 'disabled' ? 'Open development mode: every request counts as the workspace owner.' : 'Email and password with sessions; API keys can exist next to accounts.', h('span', { class: 'chip' }, S.health.auth_mode || S.health.auth || 'unknown')),
        setRow('Password hashing', S.health.password_hash || 'unknown'),
        setRow('Storage', (S.health.storage || 'unknown') + (S.health.storage_warning ? ' · ' + S.health.storage_warning : ''), S.health.storage === 'ephemeral_sqlite' ? h('span', { class: 'chip warn' }, 'ephemeral') : null))),
      setGroup('Warnings', (S.health.warnings || []).length
        ? h('ul', { class: 'set2-list' }, (S.health.warnings || []).map((w) => h('li', {}, w)))
        : setFine('No setup warnings right now.')),
      h('div', { class: 'set2-actions' }, btn([icon('check', 14), 'Re-check now'], settingsForm(() => loadSettingsData()), 'btn')));

    // Models
    const mi = h('input', { class: 'field set2-input', value: S.mtest.model || '', placeholder: 'default, or hf:MiniMaxAI/MiniMax-M2', 'aria-label': 'Model to test' });
    mi.addEventListener('input', () => { S.mtest.model = mi.value; });
    const modelRows = (S.models ? S.models.providers : []).map((p) => setRow(p.name, [p.model, p.host, p.env].filter(Boolean).join(' · '),
      h('span', { class: 'chip ' + (p.configured ? 'ok' : 'warn') }, p.configured ? 'key set' : 'no key')));
    const modelsSec = section('models', 'Models', 'Provider keys live in the host environment and are resolved on every call. Nothing is stored in this dialog.',
      !admin ? adminOnly('model providers') : [
        setGroup('Providers', S.models ? setCard(...modelRows) : missing('Provider data')),
        setGroup('Test a model', setCard(setRow('Connection check', 'Sends one short completion through the configured provider. Without a key it reports that instead of pretending.',
          h('div', { class: 'row2 set2-inline' }, mi, btn('Test connection', settingsForm(async () => {
            const r = await api('/api/models/test', { method: 'POST', body: { model: (S.mtest.model || '').trim() || null } });
            S.mtest.out = r.ok ? `OK: ${r.provider} / ${r.model} answered in ${r.ms} ms` : `Not working: ${r.message}`;
            S.setInfo = r.ok ? 'The model answered.' : 'The model did not answer; see the result below.';
          }), 'btn primary'))))),
        S.mtest.out ? h('div', { class: 'pre set2-out' }, S.mtest.out) : null,
        S.models ? setGroup('Open models to try', h('div', { class: 'row2 set2-chips' }, S.models.suggested.map((x) =>
          btn(x.name, () => { S.mtest.model = x.id; syncOverlays(true); }, 'chip', { title: x.note })))) : null,
        S.models && S.models.free_tier_note ? setFine(S.models.free_tier_note) : null,
        setFine('Environment: CFA_MODEL_BASE_URL, CFA_MODEL_API_KEY, CFA_MODEL_NAME, HF_TOKEN. Set the model per agent in the agent panel.')]);

    // Search
    const s = S.ssearch;
    const searchProviders = ['', ...new Set([...((s && s.providers) || []), 'brave', 'tavily', 'google', 'exa'])];
    const provSel = h('select', { class: 'field set2-select', id: 'set2-sprov', 'aria-label': 'Search provider' },
      searchProviders.map((v) => h('option', { value: v, selected: !!(s && s.provider === v) }, v || 'auto detect')));
    const keyIn = h('input', { class: 'field set2-input', id: 'set2-skey', type: 'password', placeholder: 'Search API key (stored encrypted)', autocomplete: 'off', 'aria-label': 'Search API key' });
    const canSaveSearch = s && s.key_source !== 'environment';
    const searchSec = section('search', 'Search', 'Deep research can cite live web pages. A key from the environment wins over the encrypted key saved here.',
      !admin ? adminOnly('the web search configuration') : [
        setGroup('Status', s ? setCard(
          setRow('Provider', s.note || '', h('span', { class: 'chip ' + (s.configured ? 'ok' : 'warn') }, s.provider || 'unknown')),
          setRow('Key source', s.key_source === 'environment' ? 'A key from the environment is active and takes precedence.' : s.key_source === 'database' ? 'A key saved in this workspace (encrypted) is active.' : 'No search key is configured, so research uses your Brain only.',
            h('span', { class: 'chip ' + (s.key_source === 'none' ? 'warn' : 'ok') }, s.key_source || 'none')),
          s.provider === 'google' ? setRow('Google CSE id', 'Google Custom Search needs CFA_SEARCH_CX as well as the API key.', h('span', { class: 'chip ' + (s.google_cx_set ? 'ok' : 'warn') }, s.google_cx_set ? 'set' : 'missing')) : null) : missing('Search status')),
        canSaveSearch ? setGroup('Save a provider or key', setCard(
          setRow('Provider', 'Auto detect guesses from the key prefix.', provSel),
          setRow('API key', 'Stored encrypted with CFA_SECRET_KEY. Leave empty to change only the provider.', keyIn),
          h('div', { class: 'set2-actions' },
            btn('Save settings', settingsForm(async () => {
              const provider = (document.getElementById('set2-sprov') || {}).value || '';
              const api_key = (document.getElementById('set2-skey') || {}).value || '';
              if (!provider && !api_key) { S.setInfo = 'Choose a provider or paste an API key first.'; return; }
              await api('/api/search/config', { method: 'PUT', body: { provider, api_key } });
              S.ssearch = await api('/api/search/status');
              S.stest = null;
              S.setInfo = 'Search settings saved.';
            }), 'btn primary'),
            btn('Test key', settingsForm(async () => { S.stest = await api('/api/search/test', { method: 'POST' }); })),
            btn('Check configuration', settingsForm(async () => { S.ssearch = await api('/api/search/status'); S.stest = null; S.setInfo = 'Configuration re-read.'; })),
            s.key_source === 'database' ? btn('Remove stored key', settingsForm(async () => { await api('/api/search/config', { method: 'DELETE' }); S.ssearch = await api('/api/search/status'); S.stest = null; S.setInfo = 'Stored search key removed.'; }), 'link') : null))) : null,
        S.stest ? h('div', { class: 'set2-card set2-testresult' }, setRow('Search test', S.stest.detail + (S.stest.hint ? ' ' + S.stest.hint : '') + (S.stest.results ? ' (' + S.stest.results + ' results in ' + S.stest.ms + ' ms)' : ''),
          h('span', { class: 'chip ' + (S.stest.ok ? 'ok' : 'warn') }, S.stest.ok ? 'works' : 'problem')),
          (S.stest.sample || []).length ? h('ul', { class: 'set2-list' }, S.stest.sample.map((x) => h('li', {}, x.title))) : null) : null,
        s && s.key_source === 'environment' ? setFine('The active key comes from the environment. Change it on the host, not here.') : null]);

    // Access keys
    const kname = h('input', { class: 'field set2-input', placeholder: 'Key name, for example Alice laptop', maxlength: 40, 'aria-label': 'Key name' });
    const krole = h('select', { class: 'field set2-select', style: 'width:auto', 'aria-label': 'Key role' }, ['member', 'admin', 'viewer'].map((r) => h('option', {}, r)));
    const keysSec = section('keys', 'Access keys', 'Tokens for scripts and integrations. Stored only as a hash; a new token is shown once.',
      !admin ? adminOnly('access keys') : [
        S.newKey ? h('div', { class: 'set2-newkey' }, h('b', {}, 'New token for ' + S.newKey.name + ' (' + S.newKey.role + ')'), h('div', { class: 'pre' }, S.newKey.token), setFine('Copy it now. It cannot be shown again.')) : null,
        setGroup('Existing keys', S.keys ? setCard(S.keys.keys.length ? S.keys.keys.map((x) => setRow(x.name, (x.role || '') + ' · used ' + (when(x.last_used) || 'never'),
          x.revoked ? h('span', { class: 'chip warn' }, 'revoked') : btn('Revoke', settingsForm(async () => {
            await api('/api/admin/keys/' + x.id, { method: 'DELETE' });
            S.keys = await api('/api/admin/keys');
            S.setInfo = 'Key revoked.';
          }), 'link'))) : h('div', { class: 'set2-row' }, h('div', { class: 'set2-rowmain muted' }, 'No access keys yet.'))) : missing('Access keys')),
        S.keys && S.keys.env_keys ? setFine(S.keys.env_keys + ' key(s) come from the environment and cannot be revoked here.') : null,
        setGroup('Create a key', setCard(setRow('New key', 'Use the smallest role that can do the job.', h('div', { class: 'row2 set2-inline' }, kname, krole,
          btn('Create key', settingsForm(async () => {
            const name = (kname.value || '').trim();
            if (name.length < 2) { S.setInfo = 'Give the key a name of at least 2 characters.'; return; }
            S.newKey = await api('/api/admin/keys', { method: 'POST', body: { name, role: krole.value } });
            S.keys = await api('/api/admin/keys');
            S.setInfo = 'Access key created.';
          }), 'btn primary'))))) ]);

    // Two-factor
    const me = S.me || {}, user = me.user || null;
    const mfaSetupForm = S.mfaSetup ? h('div', { class: 'set2-card set2-mfa' },
      h('div', { class: 'set2-row' }, h('div', { class: 'set2-rowmain' }, h('b', {}, 'Add this secret to your authenticator app (Base32)'), h('div', { class: 'pre' }, S.mfaSetup.secret))),
      h('div', { class: 'set2-row' }, h('div', { class: 'set2-rowmain' }, h('b', {}, 'otpauth link'), h('div', { class: 'mono set2-break' }, S.mfaSetup.otpauth))),
      h('div', { class: 'set2-row' }, h('div', { class: 'set2-rowmain' }, h('b', {}, 'Confirm with a code'),
        h('input', { class: 'field set2-input', id: 'set2-mfa-on-code', placeholder: '6-digit code from the app', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 12, 'aria-label': 'Authenticator code to activate' })),
        h('div', { class: 'set2-controls' }, btn('Activate 2FA', settingsForm(async () => {
          const code = (document.getElementById('set2-mfa-on-code') || {}).value || '';
          const r = await api('/api/auth/mfa/enable', { method: 'POST', body: { code } });
          S.mfaCodes = r.recovery_codes; S.mfaSetup = null;
          S.me = await api('/api/auth/me');
          S.setInfo = 'Two-factor is active. Save the recovery codes now.';
        }), 'btn primary')))) : null;
    const mfaOff = (user && user.mfa_enabled) ? h('details', { class: 'set2-details' }, h('summary', { class: 'muted' }, 'Disable two-factor'),
      h('div', { class: 'set2-card' },
        h('div', { class: 'set2-row' }, h('div', { class: 'set2-rowmain' }, h('b', {}, 'Password'), h('input', { class: 'field set2-input', id: 'set2-mfa-off-pw', type: 'password', placeholder: 'Password', autocomplete: 'current-password', 'aria-label': 'Password to disable two-factor' }))),
        h('div', { class: 'set2-row' }, h('div', { class: 'set2-rowmain' }, h('b', {}, 'Authenticator or recovery code'), h('input', { class: 'field set2-input', id: 'set2-mfa-off-code', placeholder: 'Authenticator or recovery code', autocomplete: 'one-time-code', 'aria-label': 'Code to disable two-factor' })),
          h('div', { class: 'set2-controls' }, btn('Disable 2FA', settingsForm(async () => {
            const password = (document.getElementById('set2-mfa-off-pw') || {}).value || '';
            const code = (document.getElementById('set2-mfa-off-code') || {}).value || '';
            await api('/api/auth/mfa/disable', { method: 'POST', body: { password, code } });
            S.me = await api('/api/auth/me');
            S.setInfo = 'Two-factor has been disabled.';
          }), 'btn'))))) : null;
    const mfaSec = section('mfa', 'Two-factor', 'Optional TOTP second factor for your account. Works with any RFC 6238 authenticator app.',
      !user ? setFine('This deployment runs without user accounts (open development mode), so there is no account to protect with two-factor.') : [
        setGroup('Your account', setCard(setRow('Status', user.mfa_enabled ? 'Two-factor is active for ' + (user.email || 'this account') + '.' : 'Two-factor is not enabled for this account.',
          h('span', { class: 'chip ' + (user.mfa_enabled ? 'ok' : 'warn') }, user.mfa_enabled ? 'active' : 'not enabled')))),
        !user.mfa_enabled && !S.mfaSetup ? h('div', { class: 'set2-actions' }, btn('Set up 2FA', settingsForm(async () => {
          S.mfaSetup = await api('/api/auth/mfa/setup', { method: 'POST' });
          S.setInfo = 'Scan or copy the secret, then confirm with a code.';
        }), 'btn primary')) : null,
        mfaSetupForm,
        mfaOff,
        (S.mfaCodes || []).length ? h('div', { class: 'set2-card set2-newkey' }, h('b', {}, 'Recovery codes — save them now'), h('div', { class: 'pre' }, S.mfaCodes.join('\n')), setFine('Each code works exactly once. They cannot be shown again.')) : null]);

    // Backups and data
    const days = h('input', { class: 'field set2-days', type: 'number', min: 7, max: 3650, value: S.ret, id: 'set2-ret', 'aria-label': 'Retention days' });
    days.addEventListener('input', () => { S.ret = +days.value; });
    const dataSec = section('data', 'Backups & data', 'Copy the whole database, export the organisation and bound how long activity is kept.',
      !admin ? adminOnly('backups, exports and retention') : [
        setGroup('Backups', setCard(
          setRow('Create a backup', 'A consistent snapshot of the database. Copy it off the host; keep three copies.', h('div', { class: 'row2 set2-inline' },
            btn('Back up now', settingsForm(async () => {
              const r = await api('/api/admin/backup', { method: 'POST' });
              S.backups = await api('/api/admin/backups');
              S.setInfo = 'Backup created: ' + r.name + ' (' + Math.round((r.bytes || 0) / 1024) + ' KB).';
            }), 'btn primary'),
            btn('Export all data (JSON)', settingsForm(async () => { await dl('/api/admin/export', 'cfa-export.json'); })))),
          (S.backups || []).length
            ? h('div', { class: 'set2-backups' }, (S.backups || []).slice(0, 8).map((x) => h('div', { class: 'set2-backuprow' }, h('span', { class: 'mono set2-backupname' }, x.name), h('span', { class: 'muted' }, Math.round(x.bytes / 1024) + ' KB'), btn('Download', settingsForm(async () => { await dl('/api/admin/backups/' + x.name, x.name); }), 'link'))))
            : setFine('No backups on this host yet.'))),
        setGroup('Retention', setCard(setRow('Delete activity older than', 'Removes chats, activity, calls and research older than this many days. The audit log is never purged.', h('div', { class: 'row2 set2-inline' }, days, h('span', { class: 'muted' }, 'days'),
          btn('Run retention', settingsForm(async () => {
            const d = Math.round(Number(S.ret));
            if (!Number.isFinite(d) || d < 7 || d > 3650) { S.setInfo = 'Enter a number of days between 7 and 3650.'; return; }
            const r = await api('/api/admin/retention', { method: 'POST', body: { days: d } });
            S.setInfo = 'Deleted: ' + (Object.entries(r.deleted || {}).map(([a, n]) => `${a} ${n}`).join(', ') || 'nothing') + '.';
          }), 'btn'))))) ]);

    // Danger
    const org = S.me && S.me.org;
    const removeDemo = () => {
      if (!S.setArm) { S.setArm = true; S.setInfo = 'Click “Remove sample data” again to confirm. This cannot be undone.'; syncOverlays(true); return; }
      S.setArm = false;
      settingsForm(async () => {
        await api('/api/demo/workspace', { method: 'DELETE' });
        await Promise.all([loadBots(), loadNotes(), loadTeams(), loadApps()]);
        render();
        S.setInfo = 'Demo workspace data removed.';
      })();
    };
    const orgSlugInp = h('input', { class: 'field set2-input', id: 'set2-org-slug', placeholder: org ? org.slug : 'organisation slug', 'aria-label': 'Organisation slug to confirm' });
    const dangerSec = section('danger', 'Danger', 'Destructive actions. Each one asks for confirmation once more; the audit log records what is deleted.',
      !admin ? adminOnly('the danger actions') : [
        setGroup('Sample data', setCard(setRow('Remove the demo workspace data', 'Deletes the agents, notes and teams created by “Load demo workspace”. Your own agents and notes stay.',
          btn(S.setArm ? 'Click again to remove sample data' : 'Remove sample data', removeDemo, 'btn')))),
        setGroup('Organisation', setCard(
          !org ? setRow('No organisation', 'This deployment runs in open development mode without user accounts, so there is no organisation to delete.', h('span', { class: 'chip' }, 'n/a'))
            : me.role !== 'owner' ? setRow('Delete the organisation', 'Only the owner can delete the organisation and everything in it.', h('span', { class: 'chip warn' }, 'owner only'))
              : setRow('Delete the organisation', 'Deletes every agent, note, call, audit event and member of this organisation. This cannot be undone.',
                h('div', { class: 'row2 set2-inline' }, orgSlugInp, btn('Delete organisation', settingsForm(async () => {
                  const typed = (orgSlugInp.value || '').trim().toLowerCase();
                  if (typed !== org.slug) { S.setInfo = 'Type the organisation slug (' + org.slug + ') to confirm.'; return; }
                  await api('/api/org?confirm=' + encodeURIComponent(org.slug), { method: 'DELETE' });
                  location.reload();
                }), 'btn'))))) ]);

    return h('div', { class: 'scrim set2-scrim', onclick: (e) => { if (e.target.classList.contains('scrim')) closeS(); } },
      h('div', { class: 'modal set2-modal', role: 'dialog', 'aria-label': 'Settings' },
        h('div', { class: 'set2-head' },
          h('div', { class: 'set2-headtext' }, h('h2', { class: 'set2-title' }, 'Settings'), h('p', { class: 'set2-sub' }, 'Workspace configuration for models, search, access and data.')),
          h('div', { class: 'set2-headbtns' }, btn('Reload', settingsForm(() => loadSettingsData()), 'chip', { 'aria-label': 'Reload settings data' }), btn([icon('x', 16)], closeS, 'chip set2-close', { 'aria-label': 'Close settings' }))),
        h('div', { class: 'set2-body' }, nav,
          h('div', { class: 'set2-content' },
            S.setLoading ? h('div', { class: 'set2-loading' }, h('span', { class: 'chip' }, 'Loading…')) : null,
            S.setLoadErr ? h('div', { class: 'banner set2-banner', role: 'alert' }, 'Some settings could not be loaded: ' + S.setLoadErr) : null,
            S.err ? h('div', { class: 'banner set2-banner', role: 'alert', style: 'color:var(--bad)' }, S.err) : null,
            S.setInfo ? h('div', { class: 'banner set2-banner', role: 'status' }, S.setInfo) : null,
            readinessSec, modelsSec, searchSec, keysSec, mfaSec, dataSec, dangerSec))));
  }

  // Settings used to be a full screen. It is a dialog now; this honest fallback is only reachable if
  // some old code sets S.view = 'settings' directly instead of calling openSettings().
  function settingsView() {
    return h('div', { class: 'body' }, h('div', { class: 'wide' }, h('h2', {}, 'Settings'), h('p', { class: 'muted' }, 'Settings open as a dialog over the current screen.'),
      h('div', { class: 'row2' }, btn('Open settings', () => openSettings(), 'btn primary'), btn('Back to chat', () => go('chat'), 'btn'))));
  }
  // live agent screen
  async function streamGet(path, signal, onEv) {
    const r = await fetch(path, { headers: token ? { Authorization: 'Bearer ' + token } : {}, credentials: 'same-origin', signal });
    if (r.status === 401) { S.auth = true; return; } if (!r.ok) throw new Error('stream failed');
    const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) { const { done, value } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i; while ((i = buf.indexOf('\n\n')) >= 0) { const chunk = buf.slice(0, i); buf = buf.slice(i + 2); const line = chunk.split('\n').find((l) => l.startsWith('data: ')); if (line) onEv(JSON.parse(line.slice(6))); } }
  }
  const SCREEN_LABEL = { research: 'research', chat: 'asked', reply: 'replied', read: 'read note', write: 'wrote draft', turn: 'council', tool: 'tool', denied: 'blocked' };
  function paintScreen() {
    const el = document.getElementById('screenbody'); if (!el) return;
    el.replaceChildren(...(S.screen.events.length ? S.screen.events.map((e) => h('div', { class: 'sline k-' + e.kind }, h('span', { class: 'mono muted' }, (e.ts || '').slice(11, 19)), h('b', {}, SCREEN_LABEL[e.kind] || e.kind), h('span', {}, e.kind === 'read' || e.kind === 'write' ? `"${e.text}"` : e.text))) : [h('div', { class: 'muted' }, 'Waiting for the agent to do something. Ask a question or start a council call.')]));
    el.scrollTop = el.scrollHeight;
  }
  function stopScreen() { if (S.screen.ctrl) S.screen.ctrl.abort(); S.screen = { bot: '', events: [], ctrl: null, seen: new Set() }; }
  function ensureScreen() {
    const want = S.view === 'chat' && S.panel && S.tab === 'screen' && S.bot && !S.auth;
    if (!want) { if (S.screen.bot) stopScreen(); return; }
    if (S.screen.bot !== S.bot.id) {
      stopScreen(); const ctrl = new AbortController(), id = S.bot.id; S.screen = { bot: id, events: [], ctrl, seen: new Set() };
      (async () => { while (!ctrl.signal.aborted) { try { await streamGet(`/api/bots/${id}/screen/stream`, ctrl.signal, (e) => { const sc = S.screen; if (sc.bot !== id || sc.seen.has(e.id)) return; sc.seen.add(e.id); sc.events = [...sc.events, e].slice(-120); paintScreen(); }); } catch {} if (ctrl.signal.aborted) break; await new Promise((r) => setTimeout(r, 2000)); } })();
    }
    paintScreen();
  }
  // sign-in / first-run setup
  async function submitAuth(kind) {
    const email = (document.getElementById('auth-email') || {}).value || '';
    const password = (document.getElementById('auth-password') || {}).value || '';
    const name = (document.getElementById('auth-name') || {}).value || '';
    const org = (document.getElementById('auth-org') || {}).value || '';
    S.tokenErr = '';
    const body = kind === 'register' ? { email, password, name, org_name: org } : { email, password, mfa_code: S.mfaCode || '' };
    try {
      const r = await fetch(kind === 'register' ? '/api/auth/register' : '/api/auth/login',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        const detail = d && d.detail && typeof d.detail === 'object' ? d.detail : null;
        const text = typeof (d && d.detail) === 'string' ? d.detail : 'Sign-in failed';
        if (detail && detail.mfa_required) { S.mfa = true; S.tokenErr = detail.detail || 'Enter your authenticator code.'; render(); return; }
        if (r.status === 409 && /no account/i.test(text)) { S.setup = true; S.tokenErr = ''; S.info = text; }
        else S.tokenErr = text; render(); return;
      }
      S.auth = false; S.setup = false; S.mfa = false; S.mfaCode = ''; S.tokenErr = ''; token = ''; sessionStorage.removeItem('cfa_token');
      await init();
    } catch (e) { S.tokenErr = e.message; render(); }
  }
  const storageWarn = (S.health && S.health.storage === 'ephemeral_sqlite') ? h('p', { class: 'warn-text', style: 'font-size:12px;margin-top:10px' }, 'Demo host: this instance has no persistent storage - accounts and data can disappear on every restart. For durable accounts use Render or Fly with a volume (docs/VERCEL.md).') : null;
  const emptyState = (ic, title, text, act) => h('div', { class: 'empty' }, icon(ic, 34), h('h3', {}, title), h('p', { class: 'muted' }, text), act || null);
  function loginView() {
    if (S.setup) {
      const email = h('input', { class: 'field', id: 'auth-email', type: 'email', placeholder: 'you@company.com', autocomplete: 'email', 'aria-label': 'Email' });
      const name = h('input', { class: 'field', id: 'auth-name', type: 'text', placeholder: 'Your name', autocomplete: 'name', 'aria-label': 'Your name' });
      const org = h('input', { class: 'field', id: 'auth-org', type: 'text', placeholder: 'Organisation (e.g. Acme)', 'aria-label': 'Organisation' });
      const pw = h('input', { class: 'field', id: 'auth-password', type: 'password', placeholder: 'At least 10 characters', autocomplete: 'new-password', 'aria-label': 'Password' });
      [email, name, org, pw].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAuth('register'); }));
      return h('div', { class: 'login' }, h('div', { class: 'card login-card' }, h('div', { class: 'logo' }, 'Shewiun'),
        h('h2', { style: 'margin-top:18px' }, 'Create your workspace'),
        h('p', { class: 'muted' }, 'This is the first start of this installation. The account you create now owns the organisation.'),
        email, name, org, pw, S.tokenErr ? h('p', { class: 'warn-text', role: 'alert' }, S.tokenErr) : null,
        h('div', { class: 'row2', style: 'margin-top:12px' }, btn('Create workspace', () => submitAuth('register'), 'btn primary')),
        h('p', { class: 'muted', style: 'font-size:12px;margin-top:16px' }, 'Passwords are hashed with Argon2id. Invite teammates later from Settings.'), storageWarn));
    }
    const email = h('input', { class: 'field', id: 'auth-email', type: 'email', placeholder: 'you@company.com', autocomplete: 'username', 'aria-label': 'Email' });
    const pw = h('input', { class: 'field', id: 'auth-password', type: 'password', placeholder: 'Password', autocomplete: 'current-password', 'aria-label': 'Password' });
    const mfa = h('input', { class: 'field', id: 'auth-mfa', type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 11, placeholder: 'Authenticator or recovery code', 'aria-label': 'Two-factor code' });
    mfa.value = S.mfaCode || '';
    mfa.addEventListener('input', () => { S.mfaCode = mfa.value; });
    [email, pw, mfa].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAuth('login'); }));
    return h('div', { class: 'login' }, h('div', { class: 'card login-card' }, h('div', { class: 'logo' }, 'Shewiun'), h('h2', { style: 'margin-top:18px' }, 'Sign in'), h('p', { class: 'muted' }, 'Use the email address and password of your Shewiun account.'),
      email, pw, S.mfa ? [h('p', { class: 'muted', style: 'font-size:12px' }, 'Two-factor is enabled for this account: enter the code from your authenticator app or use a recovery code.'), mfa] : null,
      S.tokenErr ? h('p', { class: 'warn-text', role: 'alert' }, S.tokenErr) : null, h('div', { class: 'row2', style: 'margin-top:12px' }, btn('Sign in', () => submitAuth('login'), 'btn primary')),
      h('p', { class: 'muted', style: 'font-size:12px;margin-top:16px' }, 'Forgot your password? Ask an admin to send a reset link, or use the API: POST /api/auth/password/forgot.'), storageWarn));
  }
  const logout = async () => { try { await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders('POST'), credentials: 'same-origin' }); } catch {} sessionStorage.removeItem('cfa_token'); token = ''; S.auth = true; location.reload(); };
  const refreshSum = async () => { try { S.sum = await api('/api/summary'); if (S.drawer) render(); } catch {} };
  // menu
  function drawer() {
    const f = S.menuQ.trim().toLowerCase();
    const it = (label, sub, ic, view, fn, count) => ((f && !(label + ' ' + sub).toLowerCase().includes(f)) ? null : h('button', { class: 'ditem av3-ditem', type: 'button', 'aria-current': S.view === view && !S.modal, onclick: fn || (() => go(view)) }, h('span', { class: 'dicon' }, icon(ic, 18)), h('span', { class: 'av3-ditxt' }, label, h('small', {}, sub)), badge(count)));
    const group = (title, items) => { const real = items.filter(Boolean); return real.length ? [h('h3', { class: 'av3-dgroup' }, title), real] : null; };
    const quick = h('div', { class: 'quick' }, [['New agent', 'plus', openAgent], ['New note', 'doc', () => { S.newNote = true; S.graph = false; go('brain').then(() => { S.newNote = true; S.graph = false; render(); }); }], ['New call', 'council', () => { S.room = null; go('council'); }], ['Upload file', 'up', () => { pickFile(); go('brain'); }]].map(([l, ic, fn]) => h('button', { type: 'button', class: 'qbtn', onclick: fn }, icon(ic, 18), h('span', {}, l))));
    const q = h('input', { class: 'field', placeholder: 'Search the menu', value: S.menuQ, 'aria-label': 'Search the menu' });
    q.addEventListener('input', () => { S.menuQ = q.value; const p = q.selectionStart; render(); const e = document.querySelector('input[aria-label="Search the menu"]'); if (e) { e.focus(); e.setSelectionRange(p, p); } });
    return [h('div', { class: 'dscrim', onclick: () => { if (Date.now() - (S._drawerOpened || 0) < 300) return; S.drawer = false; syncOverlays(true); } }), h('nav', { class: 'drawer', 'aria-label': 'Main menu' },
      h('div', { class: 'av3-dhead' }, h('div', { class: 'logo', style: 'flex:1' }, 'Shewiun'), h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Close menu', onclick: () => { S.drawer = false; syncOverlays(true); } }, icon('x'))), q, quick,
      h('div', { class: 'm-only' }, h('h3', { class: 'av3-dgroup' }, 'Agents'), S.bots.map((b) => h('button', { class: 'ditem av3-dagent', type: 'button', onclick: () => pick(b.id) }, h('span', { class: 'av3-agentav' }, tile(b, 34)), h('span', { class: 'av3-agenttxt' }, h('b', {}, b.name), h('small', {}, b.role)), S.pinned[b.id] ? h('span', { class: 'av3-pin', title: 'Pinned' }, av3Pin(11)) : null))),
      group('Organisation', [it('Organisation', 'Workspace, members, revenue, announcements', 'shield', 'org', null, S.org ? S.org.members.length : null)]),
      group('Workspace', [it('Agents', 'Chat with your team', 'chat', 'chat', () => (S.bot ? pick(S.bot.id) : go('chat')), S.sum.agents), it('Council', 'Live call, decision and plan', 'council', 'council'), it('Teams', 'Team memory and channels', 'teams', 'teams'), it('Brain', 'Neurons, notes and files', 'graph', 'brain', null, S.sum.drafts), it('Research', 'Deep search with citations and charts', 'lens', 'research')]),
      group('Govern', [it('Control', 'Coverage, approvals, audit, policies, self-test', 'shield', 'control', null, S.sum.pending_approvals), it('Inventory', 'Every agent, its owner, sponsor and risk', 'table', 'inventory', null, S.sum.agents), it('Models & usage', 'Providers, tokens, costs, budget', 'chart', 'usage')]),
      group('Connect', [it('Apps', 'Live MCP servers and a demo catalog', 'grid', 'apps', openApps, S.sum.apps), it('Marketplace', 'Curated agents and Hugging Face', 'store', 'market')]),
      group('Playbooks', [(f && !'agent launch review go or no-go'.includes(f)) ? null : h('a', { class: 'ditem av3-ditem', href: '/review/agent-launch' }, h('span', { class: 'dicon' }, icon('doc', 18)), h('span', { class: 'av3-ditxt' }, 'Agent launch review', h('small', {}, 'Go or no-go for an AI agent')))]),
      group('Account', [it('Plans & usage', 'Limits, upgrade, billing', 'chart', 'plans', null, S.bill && S.bill.enabled ? S.bill.plan_name : null), it('Settings', 'Models, access keys, backups', 'wrench', 'settings', openSettings), it('Load demo workspace', 'Sample agents, notes, teams and apps', 'spark', 'x', loadDemo)]),
      h('p', { class: 'muted av3-dfoot' }, `Shewiun v${S.health.version || '?'}${S.health.build ? ' · build ' + S.health.build : ''}`))];
  }

  // ---------- organisation ----------
  async function loadOrg() {
    S.org = { members: [], invitations: [], revenue: null, announcements: [], metrics: null };
    try {
      const m = await api('/api/org/members');
      S.org.members = (m && m.members) || [];
      S.org.invitations = (m && m.invitations) || [];
    } catch (e) { S.err = e.message; }
    try { S.org.revenue = await api('/api/org/revenue'); } catch {}
    try { S.org.announcements = ((await api('/api/announcements')).announcements) || []; } catch {}
    try { S.org.metrics = await api('/api/admin/metrics'); } catch {}
    render();
  }
  function orgView() {
    const o = S.org || { members: [], invitations: [], revenue: null, announcements: [], metrics: null };
    const me = S.me || {}, role = me.role || '', meId = me.user ? me.user.id : '';
    const canAdmin = ['owner', 'admin', 'super_admin'].indexOf(role) >= 0;
    const ROLES = ['viewer', 'developer', 'security_manager', 'admin', 'owner'];
    const memberCard = (u) => {
      const sel = h('select', { class: 'field', style: 'max-width:170px;font-size:12px', 'aria-label': 'Role of ' + (u.name || u.email) },
        ROLES.map((r) => h('option', { value: r, selected: u.role === r }, r)));
      sel.addEventListener('change', () => run(async () => {
        await api(`/api/org/members/${u.id}`, { method: 'PATCH', body: { role: sel.value } });
        S.info = 'Role of ' + (u.name || u.email) + ' changed to ' + sel.value + '.';
        await loadOrg();
      }));
      const remove = (u.id !== meId && u.role !== 'owner') ? btn('Remove', () => run(async () => {
        await api(`/api/org/members/${u.id}`, { method: 'DELETE' });
        await loadOrg();
      }), 'link') : null;
      return h('div', { class: 'card', style: 'padding:12px;margin-bottom:8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap' },
        h('span', { class: 'tile', style: 'width:34px;height:34px;background:var(--accent);color:var(--on-accent)' }, icon('user', 18)),
        h('div', { style: 'flex:1;min-width:160px' }, h('b', {}, u.name || u.email), h('div', { class: 'muted', style: 'font-size:12px' }, u.email + (u.id === meId ? ' · that is you' : ''))),
        canAdmin ? sel : h('span', { class: 'chip' }, u.role), remove);
    };
    const inviteInp = h('input', { class: 'field', id: 'inv-email', placeholder: 'colleague@company.example', style: 'flex:1' });
    const inviteBtn = canAdmin ? h('div', { style: 'display:flex;gap:8px;margin:10px 0;align-items:center' }, inviteInp,
      btn('Invite', () => run(async () => {
        const email = (document.getElementById('inv-email') || {}).value || '';
        const r = await api('/api/org/invitations', { method: 'POST', body: { email: email, role: 'developer' } });
        S.info = r && r.token ? 'Invitation created. Token (dev): ' + r.token : 'Invitation sent to ' + email + '.';
        await loadOrg();
      }), 'btn primary')) : h('p', { class: 'muted' }, 'Only owners and admins can invite members.');
    const rev = o.revenue;
    const money = rev ? h('div', { style: 'margin-bottom:14px' }, h('div', { class: 'cards' },
      ['plan', 'mrr_eur', 'arr_eur', 'seats'].map((k) => h('div', { class: 'card stat' },
        h('div', { class: 'muted' }, ({ plan: 'Plan', mrr_eur: 'MRR / month', arr_eur: 'ARR / year', seats: 'Seats' })[k]),
        h('b', { style: 'font-size:20px' }, k === 'plan' ? (rev.plan_name || rev.plan) : ((rev[k] || 0) + (k === 'seats' ? '' : ' EUR')))))),
      h('div', { class: 'row2', style: 'margin-top:8px' },
        h('span', { class: 'chip ' + (rev.status === 'active' ? 'ok' : 'warn') }, rev.status === 'active' ? 'Active' : rev.status === 'demo' ? 'Demo' : String(rev.status || 'n/a')),
        rev.customer_since ? h('span', { class: 'muted', style: 'font-size:12px' }, 'Customer since ' + when(rev.customer_since)) : null),
      h('p', { class: 'muted', style: 'font-size:12px;margin:6px 0 0' }, rev.note || 'MRR = plan price x paid seats (not an accounting ledger).'),
      rev.status === 'demo' ? h('div', { style: 'margin-top:10px' }, btn('Create a workspace for real revenue', () => { S.auth = true; S.setup = true; render(); }, 'btn primary')) : null) : emptyState('coins', 'No revenue data yet', 'As soon as an organisation exists this block shows plan, MRR, ARR and seats.');
    const anIn = { title: h('input', { class: 'field', id: 'an-title', placeholder: 'Title, e.g. Maintenance window Sunday 02:00', maxlength: 120 }), body: h('input', { class: 'field', id: 'an-body', placeholder: 'Message to your team', maxlength: 500 }) };
    const annCard = canAdmin ? h('div', { class: 'card', style: 'padding:12px;margin-bottom:10px' },
      h('b', {}, 'Message to the team'), h('div', { style: 'height:6px' }), anIn.title, h('div', { style: 'height:6px' }), anIn.body,
      h('div', { style: 'margin-top:8px' }, btn('Publish', () => run(async () => {
        await api('/api/announcements', { method: 'POST', body: { title: anIn.title.value.trim(), body: anIn.body.value.trim(), level: 'info', audience: 'all' } });
        anIn.title.value = ''; anIn.body.value = ''; await loadOrg();
      }), 'btn'))) : null;
    const notices = o.announcements.map((a) => h('div', { class: 'card', style: 'padding:10px;margin-bottom:6px' },
      h('div', { class: 'row2' }, h('b', {}, a.title), h('span', { class: 'chip' }, a.level)),
      h('p', { class: 'muted', style: 'margin:6px 0 0' }, a.body),
      h('div', { class: 'muted', style: 'font-size:11px' }, a.published_at ? when(a.published_at) : '')));
    const met = o.metrics;
    const danger = role === 'owner' ? h('details', { style: 'margin-top:22px' },
      h('summary', { class: 'muted' }, 'Danger zone: delete organisation'),
      h('div', { class: 'card', style: 'padding:12px;margin-top:8px' },
        h('p', { class: 'muted' }, 'Deletes every agent, note, call, audit event and member of this organisation. This cannot be undone.'),
        btn('Delete organisation', () => {
          const slug = (me.org && me.org.slug) || '';
          const typed = window.prompt('Type the slug to delete: ' + slug) || '';
          if (typed.trim().toLowerCase() === slug) run(async () => {
            await api('/api/org?confirm=' + encodeURIComponent(slug), { method: 'DELETE' });
            location.reload();
          });
          else if (typed) S.info = 'Cancelled: slug does not match.';
          else S.info = 'Cancelled.';
        }, 'btn')) ) : null;
    return h('div', { class: 'body' }, h('div', { class: 'wide' },
      h('div', { class: 'card hero', style: 'padding:18px;margin-bottom:14px' },
        h('div', { class: 'row2' }, h('div', {}, h('h2', { style: 'margin:0' }, me.org ? me.org.name : 'Organisation'), h('p', { class: 'muted', style: 'margin:4px 0 0' }, 'Your workspace: members, roles, revenue and announcements.')),
          h('span', { class: 'chip ok' }, role || '–')),
        met ? h('p', { class: 'muted', style: 'font-size:12px' }, 'Agents ' + met.counts.agents + ' · Notes ' + met.counts.notes + ' · Calls ' + met.counts.calls + ' · open approvals ' + met.counts.approvals_pending + ' · audit events ' + met.counts.audit_events) : null),
      h('div', { class: 'org-grid' },
        h('div', { class: 'org-col' },
          h('h3', {}, 'Members (' + o.members.length + ')'),
          o.members.map(memberCard), inviteBtn,
          o.invitations.length ? h('div', { class: 'muted', style: 'font-size:13px' }, 'Open invitations: ' + o.invitations.map((i) => i.email + ' (' + i.role + ')').join(', ')) : null,
          h('h3', { style: 'margin-top:18px' }, 'Announcements'),
          annCard, notices.length ? notices : emptyState('chat', 'No announcements', 'Announcements reach your engineering team right inside the platform.')),
        h('div', { class: 'org-col' },
          h('h3', {}, 'Billing & revenue'),
          money,
          h('div', { class: 'card', style: 'padding:14px;margin-bottom:14px' }, h('b', {}, 'Stripe'), h('p', { class: 'muted', style: 'font-size:12px;margin:6px 0' }, 'Checkout, customer portal and invoices run through Stripe per organisation. No shared customer.'), btn('Plans & upgrade', () => go('plans'), 'btn primary')),
          h('div', { class: 'card', style: 'padding:14px;margin-bottom:14px' }, h('b', {}, 'Data & privacy'),
            h('p', { class: 'muted', style: 'font-size:12px;margin:6px 0' }, (S.xsum ? (S.xsum.rows + ' rows across ' + S.xsum.tables + ' tables are exportable.') : 'Full JSON export of everything this organisation holds. Secrets are never included.')),
            h('div', { class: 'row2', style: 'flex-wrap:wrap' }, btn('Download full export', () => { dl('/api/org/export', 'org-export.json'); }, 'btn primary'),
              btn('What is included?', () => run(async () => { S.xsum = await api('/api/org/export/summary'); S.info = S.xsum.note; render(); }), 'btn'))),
          danger))));
  }

  function syncOverlays(force) {
    const upSig = S.up && S.modal === 'upgrade' ? '|up:' + S.up.plan + ':' + S.up.seats + ':' + (S.up.quote ? 'q' : '') + ':' + (S.up.busy ? 'b' : '') + ':' + (S.up.err || '') : '';
    const agxSig = S.modal === 'agentSettings' && S.agx ? '|agx:' + S.agx.bot + ':' + S.agx.section + ':' + (S.agx.loading ? 'l' : '') + ':' + (S.agx.busy ? 'b' : '') : '';
    // Settings has its own section/loading/status state; include it so a section switch rebuilds the dialog.
    const setSig = S.modal === 'settings' ? '|set:' + (S.setSection || '') + (S.setLoading ? ':L' : '') + (S.setLoadErr ? ':E' : '') + (S.setInfo ? ':I' : '') + (S.setArm ? ':A' : '') + (S.err ? ':X' : '') : '';
    const sig = (S.drawer ? 'drawer' : '') + '|' + (S.modal || '') + '|' + (S.ctx ? S.ctx.id : '') + '|' + (S.tmodal ? 'team' : '') + upSig + agxSig + setSig;
    if (!force && sig === S._ovlSig) return;  // unchanged overlay state: no DOM churn, no flicker
    S._ovlSig = sig;
    const parts = [];
    if (S.drawer) parts.push(...drawer());
    const m = S.modal;
    if (m === 'apps') parts.push(appsModal());
    else if (m === 'agent') parts.push(agentModal());
    else if (m === 'onboard') parts.push(onboardModal());
    else if (m === 'upsell') parts.push(upsellModal());
    else if (m === 'lead') parts.push(leadModal());
    else if (m === 'notif') parts.push(notifModal());
    else if (m === 'settings') parts.push(settingsModal());
    else if (m === 'upgrade') parts.push(upgradeModal());
    else if (m === 'agentSettings') parts.push(agentSettingsModal());
    if (S.ctx) parts.push(...agentCtx());
    if (S.tmodal) parts.push(teamModal());
    if (parts.length || overlayRoot.childElementCount) overlayRoot.replaceChildren(...parts);
  }
  async function loadNotifs() {
    try { S.notifs = await api('/api/notifications'); } catch {}
  }
  async function openNotifs() {
    S.modal = 'notif'; syncOverlays(true);
    await run(async () => { await loadNotifs(); render(); });
  }
  function notifModal() {
    const n = S.notifs || { items: [], unread: 0 };
    const close = () => { S.modal = null; syncOverlays(true); };
    const markAll = () => run(async () => {
      await api('/api/notifications/read', { method: 'POST', body: { keys: n.items.map((i) => i.key) } });
      await loadNotifs(); syncOverlays(true);
    });
    return h('div', { class: 'scrim', onclick: (e) => { if (e.target.classList.contains('scrim')) close(); } },
      h('div', { class: 'modal', role: 'dialog', 'aria-label': 'Notifications', style: 'max-width:560px' },
        h('div', { class: 'row2' }, h('h2', { style: 'margin:0;flex:1' }, 'Notifications'),
          n.unread ? h('span', { class: 'chip warn' }, n.unread + ' unread') : h('span', { class: 'chip ok' }, 'all read'),
          btn('Mark all read', markAll, 'chip'), btn([icon('x', 16)], close, 'chip', { 'aria-label': 'Close' })),
        n.items.length ? h('div', { style: 'margin-top:10px' }, n.items.map((i) => h('button', { type: 'button', class: 'notif-item' + (i.read ? ' read' : ''),
          onclick: () => { S.modal = null; syncOverlays(true); go(i.view || 'control'); } },
          h('span', { class: 'chip ' + (i.kind === 'approval' ? 'warn' : i.kind === 'run' ? 'warn' : 'ok') }, i.kind),
          h('span', { style: 'flex:1;min-width:0' }, h('b', {}, i.title), h('div', { class: 'muted', style: 'font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, String(i.detail || ''))),
          h('span', { class: 'muted mono', style: 'font-size:11px' }, when(i.ts))))) : h('div', { class: 'empty' }, h('p', { class: 'muted' }, 'Nothing needs your attention right now.'))));
  }
  function closeCtx() { S.ctx = null; syncOverlays(true); }
  function agentCtx() {
    const c = S.ctx, bot = S.bots.find((b) => b.id === c.id);
    if (!bot) { S.ctx = null; return h('div'); }
    const act = (label, fn, danger) => h('button', { type: 'button', class: 'ctxitem' + (danger ? ' danger' : ''), onclick: () => { S.ctx = null; syncOverlays(true); fn(); } }, label);
    const style = 'left:' + Math.min(c.x, window.innerWidth - 240) + 'px;top:' + Math.min(c.y, window.innerHeight - 260) + 'px';
    return [h('div', { class: 'ctxscrim', onclick: closeCtx, oncontextmenu: (e) => { e.preventDefault(); closeCtx(); } }),
      h('div', { class: 'ctxmenu', style: style, role: 'menu' },
        h('div', { class: 'ctxhead' }, bot.name),
        act('Rename', () => run(async () => { const n = window.prompt('New name for ' + bot.name, bot.name); if (!n || n.trim().length < 2) return; await api('/api/bots/' + bot.id, { method: 'PATCH', body: { name: n.trim() } }); await loadBots(); })),
        act('Open agent screen', () => { S.tab = 'screen'; S.panel = true; pick(bot.id); }),
        act(S.pinned[bot.id] ? 'Unpin' : 'Pin to top', () => { if (S.pinned[bot.id]) delete S.pinned[bot.id]; else S.pinned[bot.id] = true; render(); }),
        act('Mark as unread', () => { S.unreadA[bot.id] = true; render(); }),
        act('Create team with this agent', () => openTeamModal(null, new Set([bot.id]))),
        act('Delete agent', () => run(async () => {
          if (!window.confirm('Delete ' + bot.name + '? This cannot be undone.')) return;
          await api('/api/bots/' + bot.id, { method: 'DELETE' });
          if (S.bot && S.bot.id === bot.id) { S.bot = null; S.view = 'chat'; } await loadBots();
        }), true))];
  }
  function openTeamModal(teamId, preselect) {
    const t = teamId ? (S.teams || []).find((x) => x.id === teamId) : null;
    if (teamId && !t) { S.err = 'That team could not be found. Reload the page and try again.'; render(); return; }
    S.tmodal = true;
    S.tedit = t ? t.id : null;
    S.tname = t ? (t.name || '') : '';
    S.tmission = t ? (t.mission || '') : '';
    S.tsel = new Set(t ? (t.members || []).map((m) => m.id) : (preselect ? Array.from(preselect) : []));
    S.ticon = t ? (t.icon || 'teams') : 'teams';
    S.tcolor = t ? (t.color || '#2F5BD3') : '#2F5BD3';
    syncOverlays(true);
  }
  function teamModal() {
    const edit = S.tedit ? (S.teams || []).find((x) => x.id === S.tedit) : null, isEdit = !!edit;
    if (S.ticon === undefined) S.ticon = isEdit ? (edit.icon || 'teams') : 'teams';
    if (S.tcolor === undefined) S.tcolor = isEdit ? (edit.color || '#2F5BD3') : '#2F5BD3';
    const close = () => { S.tmodal = false; S.tedit = null; syncOverlays(true); };
    const TEAM_ICONS = ['teams', 'compass', 'rocket', 'shield', 'coins', 'book', 'chat', 'wrench', 'chart', 'radar', 'spark', 'lens'];
    const TEAM_COLORS = ['#2F5BD3', '#1B7F79', '#B5543C', '#7A4E9C', '#1F6F8B', '#B7791F', '#3D7A4F'];
    const boxes = S.bots.map((b) => { const cb = h('input', { type: 'checkbox', checked: S.tsel.has(b.id), 'aria-label': b.name });
      cb.addEventListener('change', () => { cb.checked ? S.tsel.add(b.id) : S.tsel.delete(b.id); });
      return h('label', { class: 'tsel' }, cb, tile(b, 22), b.name); });
    const nm = h('input', { class: 'field', placeholder: 'Team name, e.g. Engineering', maxlength: 40, value: S.tname || '', 'aria-label': 'Team name' }); nm.addEventListener('input', () => { S.tname = nm.value; });
    const ms = h('input', { class: 'field', placeholder: 'Mission (optional)', maxlength: 300, value: S.tmission || '', 'aria-label': 'Mission' }); ms.addEventListener('input', () => { S.tmission = ms.value; });
    const icons = h('div', { class: 'tm-picker', role: 'group', 'aria-label': 'Team icon' }, TEAM_ICONS.map((ic) =>
      h('button', { type: 'button', class: 'tm-pick', 'aria-label': 'Icon ' + ic, 'aria-pressed': S.ticon === ic ? 'true' : 'false', onclick: () => { S.ticon = ic; syncOverlays(true); } },
        h('span', { class: 'tile', style: 'width:22px;height:22px;background:' + S.tcolor + ';color:#fff' }, icon(ic, 13)))));
    const colors = h('div', { class: 'tm-picker', role: 'group', 'aria-label': 'Team color' }, TEAM_COLORS.map((c) =>
      h('button', { type: 'button', class: 'tm-colpick', 'aria-label': 'Color ' + c, 'aria-pressed': S.tcolor === c ? 'true' : 'false', onclick: () => { S.tcolor = c; syncOverlays(true); } },
        h('span', { class: 'tm-dot', style: 'background:' + c }))));
    const fail = (m) => { S.err = m; render(); };
    const save = () => {
      const name = (S.tname || '').trim(), members = Array.from(S.tsel), body = { name, mission: S.tmission || '', members, icon: S.ticon, color: S.tcolor };
      if (name.length < 2) return fail('The team needs a name of at least 2 characters.');
      if (name.length > 40) return fail('The team name must be 40 characters or fewer.');
      run(async () => {
        if (isEdit) await api('/api/teams/' + edit.id, { method: 'PUT', body });
        else await api('/api/teams', { method: 'POST', body });
        S.tmodal = false; S.tedit = null;
        await Promise.all([loadTeams(), loadBots()]);
        S.info = isEdit ? 'Team updated.' : 'Team created.';
      });
    };
    const remove = () => {
      if (!isEdit) return;
      if (!window.confirm('Delete the team "' + edit.name + '"? Its members lose access to the team memory space. This cannot be undone.')) return;
      run(async () => {
        await api('/api/teams/' + edit.id, { method: 'DELETE' });
        S.tmodal = false; S.tedit = null;
        await Promise.all([loadTeams(), loadBots()]);
        S.info = 'Team deleted.';
      });
    };
    return h('div', { class: 'scrim', onclick: (e) => { if (e.target.classList.contains('scrim')) close(); } },
      h('div', { class: 'modal tm-modal', role: 'dialog', 'aria-label': isEdit ? 'Edit team' : 'Create team' },
        h('div', { class: 'row2', style: 'align-items:flex-start' }, h('h2', { style: 'margin:0;flex:1' }, isEdit ? 'Edit team' : 'Create team'), btn([icon('x', 16)], close, 'chip', { 'aria-label': 'Close team dialog' })),
        h('p', { class: 'muted' }, isEdit ? 'Change the name, mission, logo or members. Members share this team memory space; other agents cannot read it.' : 'Pick the agents that share this team memory. Team members can read the team space, other agents cannot.'),
        h('div', { class: 'tm-field' }, h('span', {}, 'Name'), nm),
        h('div', { class: 'tm-field' }, h('span', {}, 'Mission'), ms),
        h('div', { class: 'tm-field' }, h('span', {}, 'Icon'), icons),
        h('div', { class: 'tm-field' }, h('span', {}, 'Color'), colors),
        h('div', { class: 'tm-field' }, h('span', {}, 'Members (' + S.tsel.size + ')'), h('div', { class: 'tsel-list' }, boxes)),
        isEdit ? h('div', { class: 'tm-danger' }, btn('Delete team', remove, 'link tm-del')) : null,
        h('div', { class: 'row2', style: 'margin-top:14px' }, btn(isEdit ? 'Save changes' : 'Create team', save, 'btn primary'), btn('Cancel', close))));
  }
  // Scroll preservation across full re-renders. Every state change rebuilds the view tree; without
  // this the content scroller starts at the top again, which made deep research jump on every source.
  const SCROLL_SELECTORS = ['#scroll', '.main > .body', '.brain > div', '.transcript', '.monbody', '.feed', '.cmsgs', '.screenbody'];
  function captureScrollState() {
    const mem = [];
    for (const sel of SCROLL_SELECTORS) {
      document.querySelectorAll(sel).forEach((el, i) => {
        if (el.scrollTop <= 0) return;
        mem.push({ sel, i, top: el.scrollTop, atBottom: el.scrollHeight - el.clientHeight - el.scrollTop < 24 });
      });
    }
    return mem;
  }
  function restoreScrollState(mem) {
    if (!mem || !mem.length) return;
    for (const m of mem) {
      const el = document.querySelectorAll(m.sel)[m.i];
      // Stick to the bottom only when the reader was already there; otherwise keep the position.
      if (el) el.scrollTop = m.atBottom ? el.scrollHeight : Math.min(m.top, el.scrollHeight);
    }
  }
  function render() {
    stopSim(); hideHover();
    if (S.auth) { stopScreen(); root.replaceChildren(loginView()); return; } const hd = S.health, groups = [...new Set(S.bots.map((b) => b.team))];
    const viewChanged = S._v !== S.view;
    const scrollMem = viewChanged ? null : captureScrollState();
    S._v = S.view;
    const side = h('aside', { class: 'side' },
      h('div', { class: 'side-top' }, h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Menu', 'aria-expanded': S.drawer, onclick: (e) => { e.preventDefault(); e.stopPropagation(); S.drawer = !S.drawer; if (S.drawer) S._drawerOpened = Date.now(); syncOverlays(true); if (S.drawer) refreshSum(); } }, icon('menu')), h('div', { class: 'logo' }, 'Shewiun'), h('span', { class: 'sp' }),
        h('button', { class: 'ibtn bell', type: 'button', 'aria-label': 'Notifications', onclick: openNotifs }, icon('bell') || icon('chat'), S.notifs && S.notifs.unread ? h('span', { class: 'badge' }, String(S.notifs.unread)) : null),
        h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Search notes', onclick: () => go('brain') }, icon('search')), h('button', { class: 'ibtn', type: 'button', 'aria-label': 'New agent', onclick: openAgent }, icon('plus'))),
      h('div', { class: 'agents av3-agents' }, groups.map((g) => {
        const list = S.bots.filter((b) => b.team === g).sort((a, b) => (S.pinned[b.id] ? 1 : 0) - (S.pinned[a.id] ? 1 : 0));
        return [h('div', { class: 'group av3-group' }, h('span', { class: 'av3-glabel' }, g), h('span', { class: 'av3-gcount', 'aria-hidden': 'true' }, String(list.length))),
          list.map((b) => h('button', { class: 'agent av3-agent', type: 'button', 'aria-current': S.view === 'chat' && S.bot && S.bot.id === b.id ? 'true' : false,
              title: `${b.name} · ${b.status === 'suspended' ? 'suspended' : b.preview || b.role}`,
              onclick: () => { delete S.unreadA[b.id]; pick(b.id); },
              oncontextmenu: (e) => { e.preventDefault(); S.ctx = { id: b.id, x: e.clientX, y: e.clientY }; syncOverlays(true); } },
            h('span', { class: 'av3-agentav' }, tile(b, 38)),
            h('span', { class: 'av3-agenttxt' }, h('b', {}, b.name), h('small', {}, b.status === 'suspended' ? 'suspended' : b.preview || b.role)),
            S.pinned[b.id] ? h('span', { class: 'av3-pin', title: 'Pinned', 'aria-label': 'Pinned' }, av3Pin(12)) : null,
            S.unreadA[b.id] ? h('span', { class: 'av3-unread', title: 'Unread', 'aria-label': 'Unread' }) : null))];
      })),
      meterBlock(),
      h('button', { class: 'appsbtn mcp3-connect', type: 'button', title: 'Connect apps and MCP servers', onclick: openApps },
        h('span', { class: 'mcp3-connect-ic' }, icon('grid', 18)),
        h('span', { class: 'mcp3-connect-txt' }, h('b', {}, 'Connect apps'), h('small', {}, `${S.sum.apps || 0} connected · MCP`)),
        h('span', { class: 'mcp3-connect-count', 'aria-hidden': 'true' }, String(S.sum.apps || 0))),
      h('div', { style: 'position:relative' }, S.menu ? h('div', { class: 'pop', role: 'menu' }, btn([icon('chart', 16), 'Plans & usage'], () => go('plans'), 'menuitem'), btn([icon('wrench', 16), 'Settings'], () => openSettings(), 'menuitem'), btn([icon('table', 16), 'Agent inventory'], () => go('inventory'), 'menuitem'), btn([icon('grid', 16), 'Apps'], openApps, 'menuitem'),
        btn([icon('spark', 16), 'Load demo workspace'], loadDemo, 'menuitem'), btn([icon('x', 16), 'Sign out'], logout, 'menuitem')) : null,
        h('button', { class: 'acct av3-acct', type: 'button', 'aria-expanded': S.menu, 'aria-label': 'Account menu', onclick: () => { S.menu = !S.menu; render(); } },
          h('span', { class: 'av3-acctav' }, h('span', { class: 'tile av3-usertile' }, icon('user', 18))),
          h('span', { class: 'av3-accttxt' }, h('b', {}, (S.me && S.me.org ? S.me.org.name : 'Workspace owner')),
            h('small', {}, S.me && S.me.user ? S.me.user.email : (hd.auth === 'enabled' ? 'Signed in' : 'Open dev mode, no login')),
            h('small', {}, (S.me && S.me.role ? S.me.role + ' · ' : '') + (hd.model_configured ? 'Model connected' : 'No model, demo replies'))),
          h('span', { class: 'av3-acctchip', title: hd.build ? 'build ' + hd.build : '' }, `v${hd.version || '?'}`),
          h('span', { class: 'av3-acctchev' }, icon('up', 14)))));
    if (!S.notifs && !S._notifsAsked) { S._notifsAsked = true; loadNotifs().then(() => { if (S.notifs && S.notifs.unread) syncOverlays(); }); }
    const view = { chat: chatView, council: councilView, brain: brainView, research: researchView, teams: teamsView, inventory: inventoryView, usage: usageView, market: marketView, control: controlView, plans: plansView, settings: settingsView, org: orgView }[S.view]();
    const hasPanel = S.view === 'chat' && S.panel && S.bot, warn = (hd.warnings || []).length && S.view === 'chat' && !S.err && !S.info;
    root.replaceChildren(h('div', { class: 'shell' + (hasPanel ? ' has-panel' : '') }, side,
      h('main', { class: 'main', style: viewChanged ? 'animation:cfaFade .22s ease' : '' }, mobileBar(), S.err && !S.modal ? h('div', { class: 'banner', role: 'alert', style: 'color:var(--bad)' }, S.err) : null, S.info && !S.err ? h('div', { class: 'banner', role: 'status' }, S.info) : null,
        warn ? h('div', { class: 'banner', title: hd.warnings.join('\n') }, `${hd.warnings.length} setup warning(s): ${hd.warnings[0]}`) : null, view), hasPanel ? passport() : null),
      );
    restoreScrollState(scrollMem);
    const sc = document.getElementById('scroll');
    if (sc && !(scrollMem && scrollMem.some((m) => m.sel === '#scroll'))) sc.scrollTop = sc.scrollHeight;
    ensureScreen();
    syncOverlays();
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (S.modal) close(); else if (S.drawer) { S.drawer = false; syncOverlays(true); } } });
  async function init() {
    S.err = '';
    try {
      const st = await api('/api/auth/status');
      S.setup = !!st.setup_required;
      if (st.auth_required) { S.me = await api('/api/auth/me').catch(() => null); }
    } catch (e) { S.err = e.message; }
    try { S.health = await api('/api/health'); } catch (e) { S.err = e.message; }
    // Fail-closed production: without any account the API rejects everything, so offer the
    // first-run setup form instead of showing an empty workspace with an error banner.
    if (S.setup) { S.setup = true; S.auth = true; S.tokenErr = ''; render(); return; }
    if (S.auth) { render(); return; }
    try {
      S.bots = await api('/api/bots'); S.bot = S.bots[0]; const t = await api('/api/templates'); S.caps = (t.find((x) => x.capabilities) || {}).capabilities || [];
      S.msgs = await api(`/api/bots/${S.bot.id}/messages`); await Promise.all([loadNotes(), loadApps(), loadTeams(), api('/api/calls').then((c) => { S.calls = c; }), api('/api/selftest/latest').then((x) => { S.test = x; }), api('/api/summary').then((x) => { S.sum = x; }), api('/api/billing').then((x) => { S.bill = x; }), api('/api/onboarding').then((x) => { S.onb = x; }), api('/api/presets').then((x) => { S.presets = x; })]);
    } catch (e) { if (S.auth) { S.err = ''; S.tokenErr = S.setup ? '' : 'Please sign in again.'; } else S.err = e.message; }
    if (S.onb && S.onb.suggest && !S.skipOnb && S.bots.length <= 4 && !S.auth) S.modal = 'onboard';
    if (/billing=success/.test(location.search)) { S.info = 'Thank you! Your plan updates in a few seconds.'; setTimeout(() => api('/api/billing').then((x) => { S.bill = x; render(); }).catch(() => {}), 3500); }
    render();
  }
  init();
})();
