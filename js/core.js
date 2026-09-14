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
