// 기본 설정 · 캔버스 · 유틸 · 효과음 합성
// 로드 순서 1/11 · 의존 없음
'use strict';

// ---------- 기본 설정 ----------
const W = 960, H = 540;          // 논리 해상도 (실제 캔버스는 DPR 배율로 확대)
const GROUND_Y = 442;            // 땅 윗면 (핫바 위로 올려 캐릭터가 가리지 않게)
const GRAV = 2100;               // 중력 (px/s^2)
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');

function resize(){
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width  = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
}
resize();
window.addEventListener('resize', resize);

// ---------- 유틸 ----------
const clamp = (v,a,b)=> v<a?a : v>b?b : v;
const rand = (a,b)=> a + Math.random()*(b-a);
function overlap(a,b){
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

// ---------- 사운드 (WebAudio 합성 — 외부 음원 없음) ----------
let ac = null;
function audioUnlock(){
  if(!ac){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(AC) ac = new AC();
  }
  if(ac && ac.state === 'suspended') ac.resume();
}
function tone(freq, dur, type, vol, delay, slideTo){
  if(!ac) return;
  const t0 = ac.currentTime + (delay||0);
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type || 'square';
  osc.frequency.setValueAtTime(freq, t0);
  if(slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol || 0.14, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(ac.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.03);
}
function noise(dur, vol, delay){
  if(!ac) return;
  const t0 = ac.currentTime + (delay||0);
  const n = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for(let i=0;i<n;i++) d[i] = (Math.random()*2-1) * (1 - i/n);
  const src = ac.createBufferSource(); src.buffer = buf;
  const g = ac.createGain(); g.gain.value = vol || 0.1;
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400;
  src.connect(f); f.connect(g); g.connect(ac.destination);
  src.start(t0);
}
function sfx(kind){
  if(!ac) return;
  switch(kind){
    case 'jump':   tone(430, .16, 'square', .10, 0, 780); break;
    case 'land':   tone(160, .07, 'sine', .07); break;
    case 'swing':  noise(.09, .07); tone(300, .10, 'sawtooth', .05, 0, 140); break;
    case 'swing3': noise(.15, .10); tone(240, .20, 'sawtooth', .09, 0, 80); break;
    case 'hit3':   tone(720, .14, 'square', .14, 0, 230); noise(.13, .12);
                   tone(190, .22, 'sawtooth', .08, .02, 80); break;
    case 'dash':   noise(.13, .06); tone(780, .10, 'triangle', .05, 0, 300); break;
    case 'hit':    tone(560, .09, 'square', .12, 0, 300); noise(.07, .09); break;
    case 'throw':  tone(640, .09, 'triangle', .09, 0, 900); break;
    case 'block':  tone(220, .12, 'triangle', .12); tone(330, .10, 'triangle', .07, .02); break;
    case 'bash':   tone(180, .16, 'sawtooth', .10, 0, 90); noise(.1, .08); break;
    case 'pop':    tone(700, .08, 'triangle', .10, 0, 1100);
                   tone(950, .10, 'triangle', .08, .06, 1300); break;
    case 'hurt':   tone(300, .22, 'sawtooth', .12, 0, 110); break;
    case 'heal':   tone(620, .10, 'sine', .10); tone(830, .12, 'sine', .09, .08); break;
    case 'swap':   tone(520, .05, 'square', .06); break;
    case 'wave':   [523,659,784,1047].forEach((f,i)=> tone(f, .16, 'triangle', .09, i*0.09)); break;
    case 'boss':   [196,165,147,131].forEach((f,i)=> tone(f, .34, 'sawtooth', .10, i*0.14)); break;
    case 'boom':   tone(90, .40, 'sawtooth', .16, 0, 40); noise(.30, .16); break;
    case 'roll':   tone(120, .5, 'sawtooth', .07, 0, 180); noise(.4, .05); break;
    case 'bossdown': [523,587,659,784,880,1047].forEach((f,i)=> tone(f, .3, 'triangle', .11, i*0.12)); break;
    case 'item':   tone(880, .08, 'triangle', .10); tone(1175, .12, 'triangle', .09, .07); break;
    case 'grow':   [392,523,659,784].forEach((f,i)=> tone(f, .16, 'triangle', .10, i*0.07)); break;
    case 'shrink': [784,659,523,392].forEach((f,i)=> tone(f, .14, 'triangle', .09, i*0.06)); break;
    case 'star':   [659,784,988,1319,1568].forEach((f,i)=> tone(f, .18, 'square', .08, i*0.06)); break;
    case 'power':  tone(330, .14, 'sawtooth', .09, 0, 660); tone(660, .16, 'triangle', .08, .09, 990); break;
    case 'reflect':tone(1200, .10, 'square', .10, 0, 700); noise(.06, .07); break;
    case 'forge':  [523,659,784,1047,1319].forEach((f,i)=> tone(f, .20, 'triangle', .10, i*0.07));
                   noise(.10, .08); break;
    case 'over':   [440,392,330,262].forEach((f,i)=> tone(f, .3, 'triangle', .10, i*0.16)); break;
  }
}

// ---------- 그림 자산 ----------
// 자산은 "있으면 쓰고 없으면 직접 그린다". 못 불러와도 게임이 멈추면 안 된다
// (파일을 직접 열었을 때, 배포가 덜 됐을 때, 느린 연결일 때 모두).
const IMG = {};
function loadImage(key, src){
  if(typeof Image === 'undefined') return null;      // 헤드리스 테스트 환경
  const im = new Image();
  im.decoding = 'async';
  im.onload  = ()=>{ im.ready = true; };
  im.onerror = ()=>{ im.ready = false; };            // 조용히 포기하고 폴백으로 그린다
  im.src = src;
  IMG[key] = im;
  return im;
}
const imgReady = key => {
  const i = IMG[key];
  return !!(i && i.ready && i.naturalWidth);
};

loadImage('bg', 'assets/bg/bg_grasslands.png');

// 지형 타일 (원본 70×70, 화면에는 절반 크기로 깐다)
const TS = 35;
// grassCenter 가 잔디 밑 흙이다. dirt* 는 이름과 달리 다른 바이옴(연한 색)이라 안 쓴다.
for(const t of ['grassMid','grassLeft','grassRight',
                'grassHalfMid','grassHalfLeft','grassHalfRight',
                'grassCenter','grassCliffLeft','grassCliffRight']){
  loadImage(t, 'assets/tiles/' + t + '.png');
}

// 아이템 그림 — 이모지는 기기마다 모양이 달라서 스프라이트로 그린다
for(const t of ['hud_heartFull','hud_heartEmpty','mushroomRed','star','gemBlue']){
  loadImage(t, 'assets/items/' + t + '.png');
}

// ---------- 연출 세기 ----------
// 히트스톱과 화면 흔들림은 조금만 넘쳐도 "게임이 버벅인다"로 느껴진다.
// 두 숫자만 만지면 전체 세기가 한 번에 바뀐다. 0으로 두면 완전히 꺼진다.
const FX_STOP = 0.62;     // 멈춤 세기
const FX_SHAKE = 0.68;    // 흔들림 세기
const STOP_MAX = 0.11;    // 한 번에 이보다 오래 멈추지 않는다 (연타로 쌓이는 걸 막는다)

// 멈춤을 건다 — 이미 걸린 것보다 길 때만 갱신하고, 상한을 넘기지 않는다
function freeze(sec){
  hitstop = Math.min(Math.max(hitstop, sec * FX_STOP), STOP_MAX);
}
// 흔들림을 더한다
function shakeBy(amount, max){
  shake = Math.min(shake + amount * FX_SHAKE, (max || 12) * FX_SHAKE);
}

// ---------- HUD 아이콘 ----------
// 이모지는 기기마다 모양이 달라서 SVG로 직접 그린다.
// 캔버스 그림과 색을 맞추고, 무기는 강화 단계 색까지 반영한다.
const SVG_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true">';

// 곡괭이 — 자루 + 자루 끝을 가로지르는 초승달 날
function pickaxeSVG(grip, gripD, blade, edge){
  return SVG_OPEN +
    '<path d="M5.6 19.4 16 7.2" stroke="' + gripD + '" stroke-width="5.6" stroke-linecap="round"/>' +
    '<path d="M5.6 19.4 16 7.2" stroke="' + grip + '" stroke-width="3.6" stroke-linecap="round"/>' +
    '<path d="M8.2 3.2Q16.6 4.4 20 11.4Q16.8 9.2 14.2 10.1Q14.6 6.2 8.2 3.2Z" ' +
      'fill="' + blade + '" stroke="' + edge + '" stroke-width="1.1" stroke-linejoin="round"/>' +
    '<circle cx="15.6" cy="7.6" r="2.1" fill="' + gripD + '"/>' +
    '</svg>';
}
function shieldSVG(face, rim){
  return SVG_OPEN +
    '<path d="M12 2.4 20 5.4V12c0 5-3.6 8.4-8 9.8C7.6 20.4 4 17 4 12V5.4Z" ' +
      'fill="' + face + '" stroke="' + rim + '" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M12 6.4v11M12 9.6l3.4-2.4M12 13l3.4-2.4M12 9.6 8.6 7.2M12 13l-3.4-2.4" ' +
      'stroke="' + rim + '" stroke-width="1.2" stroke-linecap="round"/>' +
    '</svg>';
}
function acornSVG(nut, cap){
  return SVG_OPEN +
    '<ellipse cx="12" cy="14.8" rx="6.1" ry="6.9" fill="' + nut + '"/>' +
    '<rect x="5.2" y="6" width="13.6" height="6" rx="2.6" fill="' + cap + '"/>' +
    '<rect x="10.8" y="2.4" width="2.4" height="4.4" rx="1.2" fill="' + cap + '"/>' +
    '<ellipse cx="9.6" cy="14.4" rx="1.6" ry="2.4" fill="rgba(255,255,255,.38)"/>' +
    '</svg>';
}

// 강화 효과 칩
const POWER_SVG = {
  armor: SVG_OPEN +
    '<path d="M4.8 5.6h14.4v7c0 5-3.6 7.8-7.2 8.8-3.6-1-7.2-3.8-7.2-8.8Z" ' +
      'fill="#e6fbf8" stroke="#2fa79c" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M12 8.6 15.6 12 12 15.4 8.4 12Z" fill="#2fa79c"/></svg>',
  big: SVG_OPEN +
    '<path d="M2.8 12.4C2.8 7 6.9 3.4 12 3.4s9.2 3.6 9.2 9Z" fill="#e84d4d" stroke="#b62f2f" stroke-width="1.2" stroke-linejoin="round"/>' +
    '<circle cx="8" cy="8.6" r="1.7" fill="#fff"/><circle cx="14.6" cy="7.4" r="1.3" fill="#fff"/>' +
    '<path d="M9.4 12.4h5.2v5.4c0 1.8-1.2 2.8-2.6 2.8s-2.6-1-2.6-2.8Z" fill="#ffeccb" stroke="#d9bd93" stroke-width="1.1"/></svg>',
  star: SVG_OPEN +
    '<path d="M12 2.6 14.7 9h6.7l-5.4 4.1 2 6.6L12 15.8 6 19.7l2-6.6L2.6 9h6.7Z" ' +
      'fill="#ffd23f" stroke="#dda413" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  honey: SVG_OPEN +
    '<rect x="5.4" y="8.6" width="13.2" height="11.6" rx="3.4" fill="#c98a4b" stroke="#8a5a30" stroke-width="1.3"/>' +
    '<rect x="4.2" y="5.6" width="15.6" height="4.2" rx="2" fill="#ffb84d" stroke="#d99a2e" stroke-width="1.1"/>' +
    '<path d="M14.6 9.6q2 3 .4 5.2-1.8-2.2 -.4-5.2Z" fill="#ffb84d"/>' +
    '<rect x="10.4" y="2.6" width="3.2" height="3.4" rx="1.4" fill="#8a5a30"/></svg>',
  leaf: SVG_OPEN +
    '<path d="M4.4 19.6Q3.2 8 12 4.4Q20.6 4 20 11.4Q18.8 19.2 4.4 19.6Z" ' +
      'fill="#7bd35a" stroke="#4f9a3c" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M5.4 18.6Q11 12 18.4 7.4" stroke="#4f9a3c" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>',
};
