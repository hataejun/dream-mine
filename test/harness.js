// 게임 로직 검증용 헤드리스 하네스
// 캔버스/DOM/오디오를 스텁으로 막고, requestAnimationFrame을 직접 펌프해서
// 결정론적으로 프레임을 진행시킨다.
const fs = require('fs');

// ---- ctx: 모든 메서드가 no-op ----
const noop = () => {};
const ctxStub = new Proxy({}, {
  get(t, k){
    if(k === 'createLinearGradient' || k === 'createRadialGradient' ||
       k === 'createConicGradient' || k === 'createPattern'){
      return () => ({ addColorStop: noop });
    }
    if(k === 'measureText') return () => ({ width: 10 });
    if(k in t) return t[k];
    return noop;
  },
  set(t, k, v){ t[k] = v; return true; },
});

class El {
  constructor(id){
    this.id = id; this.textContent = ''; this._html = '';
    this.hidden = false; this.dataset = {}; this.children = [];
    this.style = {}; this.width = 0; this.height = 0;
    this.clientWidth = 960; this.clientHeight = 540;
    this.classList = {
      _s:new Set(),
      add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
      toggle(c,on){ on ? this._s.add(c) : this._s.delete(c); },
      contains(c){return this._s.has(c);},
    };
    this.offsetWidth = 100;
  }
  set innerHTML(v){ this._html = v; if(v === '') this.children = []; }
  get innerHTML(){ return this._html; }
  getContext(){ return ctxStub; }
  addEventListener(){ }
  appendChild(c){ this.children.push(c); }
  querySelectorAll(){ return []; }
  querySelector(){ return this._q || (this._q = new El('q')); }
}

const els = {};
const getEl = id => (els[id] || (els[id] = new El(id)));

const listeners = { keydown: [], keyup: [], resize: [] };
let rafCb = null;

global.window = {
  addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
  matchMedia: () => ({ matches: false }),
  devicePixelRatio: 1,
};
global.document = {
  getElementById: getEl,
  createElement: () => new El('new'),
  body: new El('body'),
};
global.getComputedStyle = () => ({ fontFamily: 'sans-serif' });
global.requestAnimationFrame = cb => { rafCb = cb; };
global.performance = { now: () => nowMs };
global.Set = Set;

let nowMs = 0;

// 시드 고정 난수 (mulberry32). 게임이 Math.random에 의존하므로 테스트에선 고정한다.
let seed = 0x9e3779b9;
Math.random = function(){
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---- 게임 소스 로드 + 내부 상태 프로브 주입 ----
const path = require('path');
const htmlPath = process.argv[2];
const html = fs.readFileSync(htmlPath, 'utf8');
const dir = path.dirname(htmlPath);
// index.html이 읽어들이는 순서 그대로 이어붙인다 (브라우저와 같은 조건)
const files = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
if(!files.length) throw new Error('no <script src> found in ' + htmlPath);
let js = files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n;\n');
const anchor = "document.getElementById('startBtn').addEventListener('click', startGame);";
if(!js.includes(anchor)) throw new Error('anchor not found');
js = js.replace(anchor, `globalThis.__g = {
  get p(){return player}, get enemies(){return enemies}, get score(){return score},
  get hitstop(){return hitstop}, get rings(){return rings}, get ghosts(){return ghosts},
  get shots(){return shots}, get pickups(){return pickups},
  get phase(){return phase}, get state(){return state},
  start: startGame, input,
  // 통제된 상황을 만들기 위한 테스트 훅
  t: {
    // 판을 비우고, 스테이지가 새 적/아이템을 더 깨우지 않도록 전부 소환 완료 처리
    clearEnemies(){
      enemies.length = 0; pickups.length = 0; shots.length = 0;
      STAGE.enemies.forEach((_, i) => spawned.enemy.add(i));
      STAGE.items.forEach((_, i) => spawned.item.add(i));
    },
    addEnemy(type, x){
      spawnEnemy(type, 0, x);
      const e = enemies[enemies.length - 1];
      e.y = GROUND_Y - e.h; e.vx = 0; e.vy = 0; e.stun = 0;
      return e;
    },
    resetStage(){ reset(); },
    give(kind){ applyItem(kind, player.x + player.w/2, player.y); },
    ITEM_DEF,
    goTo(x){ player.x = x; },
    GROUND_Y, STAGE, cam,
    get phase(){ return phase; },
    get boss(){ return boss; },
    get spawned(){ return spawned; },
    damageBoss,
  },
};\n` + anchor);

eval(js);

// ---- 프레임 펌프 ----
function step(ms){
  nowMs += ms;
  const cb = rafCb; rafCb = null;
  if(cb) cb(nowMs);
}
function run(seconds, perFrame){
  const n = Math.round(seconds * 60);
  for(let i = 0; i < n; i++){ if(perFrame) perFrame(i); step(1000/60); }
}
function key(type, code){
  for(const f of listeners[type]) f({ code, preventDefault(){} });
}

module.exports = { g: () => globalThis.__g, step, run, key, els };
