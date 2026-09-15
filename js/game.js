// 전역 상태 · HUD · 메인 루프 · 화면 전환
// 로드 순서 11/11 · 의존: 전부
'use strict';

// ---------- 상태 ----------
let state = 'title';             // title | play | over | clear
let phase = 'stage';             // stage | boss | cleared
let player, enemies, shots, particles, pickups, floaters;
let boss = null;
let spawned;                     // 이미 깨운 스테이지 적/아이템 인덱스
let score;
let shake, time;
let hitstop = 0;                  // 타격 순간 화면을 살짝 멈춘다 (타격감의 핵심)
let rings = [];                   // 충격파 링
let ghosts = [];                  // 대시 잔상
const punch = { x:0, y:0, t:0 };  // 때린 방향으로 화면을 툭 미는 연출

function makePlayer(){
  return {
    x: 90, y: GROUND_Y-46, w:44, h:46,
    vx:0, vy:0,
    facing:1, onGround:false,
    hp:5, maxHp:5, inv:0,
    weapon:0,
    weaponLv:[0, 0, 0],   // 무기별 강화 단계 (나무 → 돌 → 다이아몬드)
    atk:0, atkDur:0, atkBuf:0, hitSet:null,   // 공격 진행 상태
    blocking:false, blockGlow:0,
    coyote:0, jumpBuf:0, gliding:false,
    combo:0, comboT:0,                        // 칼 콤보 단계 / 이어붙일 수 있는 시간
    dashT:0, dashCool:0, dashDir:1,           // 대시
    lungeT:0, lungeDur:0.12, lungeV:0,        // 공격하며 앞으로 미끄러지기
    hurtT:0, landT:0,
    // 아이템으로 얻는 힘
    armor:false,        // 💠 다이아몬드 방어구 — 최대 체력 +1, 맞고 나서 더 오래 무적
    big:false,          // 🍄 변신 — 한 대 맞으면 이게 대신 깨진다
    starT:0,            // ⭐ 무적
    honeyT:0,           // 🍯 공격력 2배
    leafT:0,            // 🍃 활강 강화
    starHitT:0,         // 별 상태로 보스를 때리는 간격
    // 애니메이션 상태
    anim:'idle', animT:0, blendT:0, blendDur:0.09,
    pose:Object.assign({}, BASE_POSE), poseFrom:null,
    flapLag:0, hairLag:0, blinkT:2.5,
    weaponAng:-0.45, weaponProg:-1, armRotS:undefined,
  };
}

function reset(){
  buildStage();
  player = makePlayer();
  enemies = []; shots = []; particles = []; pickups = []; floaters = [];
  score = 0;
  phase = 'stage'; boss = null;
  spawned = { enemy:new Set(), item:new Set() };
  cam.x = 0; cam.lockL = 0; cam.lockR = STAGE.width;
  if(typeof bossBarWrap !== 'undefined' && bossBarWrap) bossBarWrap.hidden = true;
  shake = 0; time = 0;
  hitstop = 0; rings = []; ghosts = [];
  punch.x = punch.y = punch.t = 0;
  syncHUD();
}

// ---------- HUD ----------
const heartsEl = document.getElementById('hearts');

// 하트 한 칸 — 그림으로 그리되, 못 불러오면 이모지로 물러선다
function makeHeart(){
  const d = document.createElement('div');
  d.className = 'heart';
  const im = document.createElement('img');
  im.alt = ''; im.draggable = false;
  im.onerror = ()=>{ im.remove(); d.classList.add('emoji'); d.textContent = '❤️'; };
  im.src = 'assets/items/hud_heartFull.png';
  d.appendChild(im);
  return d;
}
const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('waveLabel');
const powersEl = document.getElementById('powers');
const bossBarWrap = document.getElementById('bossBar');
const bossFill = document.getElementById('bossFill');
const bannerEl = document.getElementById('banner');

function syncHUD(){
  if(heartsEl.children.length !== player.maxHp){
    heartsEl.innerHTML = '';
    for(let i=0;i<player.maxHp;i++) heartsEl.appendChild(makeHeart());
  }
  [...heartsEl.children].forEach((el,i)=>{
    const empty = i >= player.hp;
    el.classList.toggle('empty', empty);
    const im = el.firstElementChild;
    if(im && im.tagName === 'IMG'){
      const want = 'assets/items/' + (empty ? 'hud_heartEmpty' : 'hud_heartFull') + '.png';
      if(!im.src.endsWith(want)) im.src = want;
    } else {
      el.textContent = empty ? '🤍' : '❤️';       // 그림을 못 불러왔을 때
    }
  });
  syncPowers();
  scoreEl.textContent = score;
  waveEl.textContent = phase === 'boss' ? '보스전' : '숲길';
  syncHotbar();
}
// 지금 걸려 있는 힘을 하트 아래 칩으로 보여준다 (값이 바뀔 때만 DOM을 건드린다)
let powerSig = '';
function syncPowers(){
  const p = player;
  if(!p) return;
  const on = [];
  if(p.armor)      on.push(['armor', '', false]);
  if(p.big)        on.push(['big',   '', false]);
  if(p.starT  > 0) on.push(['star',  Math.ceil(p.starT),  p.starT  < 3]);
  if(p.honeyT > 0) on.push(['honey', Math.ceil(p.honeyT), p.honeyT < 3]);
  if(p.leafT  > 0) on.push(['leaf',  Math.ceil(p.leafT),  p.leafT  < 3]);
  const sig = on.map(a => a.join('')).join('|');
  if(sig === powerSig) return;
  powerSig = sig;
  powersEl.innerHTML = on.map(([kind, t, low]) =>
    '<span class="power' + (low ? ' low' : '') + '">' + (POWER_SVG[kind] || '') +
    (t ? '<b>' + t + '</b>' : '') + '</span>').join('');
}

function syncBossBar(){
  if(!boss){ bossBarWrap.hidden = true; return; }
  bossFill.style.width = (boss.hp / boss.maxHp * 100) + '%';
}
function banner(text){
  bannerEl.textContent = text;
  bannerEl.classList.remove('show');
  void bannerEl.offsetWidth;   // 애니메이션 재시작
  bannerEl.classList.add('show');
}

// ---------- 메인 업데이트 ----------
// 한 프레임에 세계가 움직이는 순서. 아래로 갈수록 앞 결과에 기댄다.
function update(dt){
  time += dt;
  shake = Math.max(0, shake - dt * 34);

  updatePlayer(player, dt);   // 이동 · 공격
  updateShots(dt);            // 날아다니는 도토리
  updateEnemies(dt);          // 적
  updateItems(dt);            // 도토리 · 하트
  updateFx(dt);               // 입자 · 링 · 잔상
  updateWorld(dt);            // 스테이지 · 보스 · 카메라
  updateAnim(player, dt);     // 포즈는 상태가 다 정해진 뒤에 만든다

  input.jumpPressed = false;
  input.attackPressed = false;
  input.dashPressed = false;
}

// ---------- 아이템 ----------
// ---------- 아이템 ----------
// 마리오를 참고해 네 갈래로 나눴다.
//   모으는 것(도토리) · 회복(하트) · 변신(도토리버섯) · 시간제 강화(별·꿀·나뭇잎)
// 변신은 "한 대 맞으면 변신만 풀린다" = 아이에게 실수 한 번을 봐주는 안전망이다.
const ITEM_DEF = {
  acorn:    { emoji:'🌰', name:'도토리',     tint:'#e3aa63' },
  heart:    { emoji:'❤️', name:'하트',       tint:'#ff9db4' },
  mushroom: { emoji:'🍄', name:'도토리버섯',  tint:'#ff8f7a' },
  star:     { emoji:'⭐', name:'반짝별',     tint:'#ffe066', dur:8  },
  honey:    { emoji:'🍯', name:'꿀단지',     tint:'#ffb84d', dur:10 },
  leaf:     { emoji:'🍃', name:'나뭇잎',     tint:'#8ed17a', dur:15 },
  // 💎 손에 든 무기를 한 단계 올린다 — 무엇을 키울지는 아이가 고른다
  gem:      { emoji:'💎', name:'강화 다이아몬드', tint:'#8ef0e6' },
  // 💠 입으면 겉모습이 다이아몬드 갑옷으로 바뀐다
  armor:    { emoji:'💠', name:'다이아몬드 방어구', tint:'#b8f5ef' },
};

function applyItem(kind, x, y){
  const p = player;
  const d = ITEM_DEF[kind] || ITEM_DEF.acorn;
  spawnParticles(x, y, 10, d.tint, {up:210, spread:170});
  addRing(x, y, 56, d.tint, 6);

  switch(kind){
    case 'acorn':
      score += 25;
      floatText(x, y-6, '+25', '#ffd76a');
      sfx('item');
      break;

    case 'heart':
      p.hp = Math.min(p.maxHp, p.hp + 1);
      floatText(x, y-6, '+1 ❤️', '#ff9db4');
      sfx('heal');
      break;

    case 'mushroom':
      // 이미 커져 있으면 대신 체력을 채워준다 (먹어도 손해 없게)
      if(p.big){
        p.hp = Math.min(p.maxHp, p.hp + 1);
        floatText(x, y-6, '+1 ❤️', '#ff9db4');
        sfx('heal');
      } else {
        p.big = true;
        floatText(x, y-10, '커졌다!', '#ff8f7a');
        addRing(x, y, 96, '#ffd2c0', 9);
        sfx('grow');
      }
      break;

    case 'star':
      p.starT = ITEM_DEF.star.dur;
      floatText(x, y-10, '반짝반짝!', '#ffe066');
      addRing(x, y, 120, '#ffe066', 10);
      sfx('star');
      break;

    case 'honey':
      p.honeyT = ITEM_DEF.honey.dur;
      floatText(x, y-10, '힘이 불끈!', '#ffb84d');
      sfx('power');
      break;

    case 'leaf':
      p.leafT = ITEM_DEF.leaf.dur;
      floatText(x, y-10, '살랑살랑~', '#8ed17a');
      sfx('power');
      break;

    case 'armor':
      if(p.armor){
        p.hp = Math.min(p.maxHp, p.hp + 1);
        floatText(x, y-6, '+1 ❤️', '#ff9db4');
        sfx('heal');
      } else {
        p.armor = true;
        p.maxHp += 1;                       // 하트 칸이 하나 늘고
        p.hp = p.maxHp;                     // 가득 채워준다
        floatText(x, y-12, '다이아몬드 방어구!', '#b8f5ef');
        addRing(x, y, 150, '#b8f5ef', 12);
        spawnParticles(x, y, 20, '#b8f5ef', {up:300, spread:250, size:10});
        sfx('forge');
      }
      break;

    case 'gem': {
      const w = p.weapon;
      if(p.weaponLv[w] >= MAX_TIER){
        // 이미 최고 단계면 점수로 바꿔준다 (먹어서 손해 보는 일이 없게)
        score += 100;
        floatText(x, y-10, '+100', '#8ef0e6');
        sfx('item');
      } else {
        p.weaponLv[w]++;
        const t = TIERS[p.weaponLv[w]];
        floatText(x, y-12, t.name + ' ' + WEAPONS[w].name + '!', '#8ef0e6');
        addRing(x, y, 130, '#8ef0e6', 11);
        spawnParticles(x, y, 16, '#8ef0e6', {up:280, spread:230, size:9});
        sfx('forge');
        syncHotbar();
      }
      break;
    }
  }
  syncHUD();
}

function updateItems(dt){
  for(const it of pickups){
    it.t += dt;
    if(!it.fixed){
      it.life -= dt;
      it.vy += 1200 * dt;
      it.y += it.vy * dt;
      if(it.y + it.h > GROUND_Y){ it.y = GROUND_Y - it.h; it.vy *= -0.45; if(Math.abs(it.vy) < 40) it.vy = 0; }
    }
    if(overlap(it, player)){
      it.dead = true;
      applyItem(it.kind, it.x + it.w/2, it.y + it.h/2);
    }
    if(it.life <= 0) it.dead = true;
  }
  pickups = pickups.filter(i=>!i.dead);
}

// ---------- 루프 ----------
let last = 0, acc = 0;
const STEP = 1/60;
function frame(ts){
  requestAnimationFrame(frame);
  if(!last) last = ts;
  let dt = (ts - last) / 1000;
  last = ts;
  if(dt > 0.25) dt = 0.25;

  if(state === 'play'){
    if(hitstop > 0){
      // 히트스톱 — 맞는 순간 화면을 아주 잠깐 멈춰서 타격을 각인시킨다
      hitstop = Math.max(0, hitstop - dt);
      acc = 0;
    } else {
      acc += dt;
      let steps = 0;
      while(acc >= STEP && steps < 5){ update(STEP); acc -= STEP; steps++; }
      if(steps === 5) acc = 0;
    }
  } else {
    // 타이틀/게임오버 화면에서도 배경은 살아있게
    for(const pa of particles){ pa.life -= dt; pa.vy += pa.grav*dt; pa.x += pa.vx*dt; pa.y += pa.vy*dt; }
    particles = particles.filter(p2=>p2.life>0);
    for(const f of floaters){ f.life -= dt; f.y -= 34*dt; }
    floaters = floaters.filter(f=>f.life>0);
    for(const r of rings){ r.life -= dt; r.r += (r.maxR - r.r) * Math.min(1, dt*16); }
    rings = rings.filter(r=>r.life>0);
    ghosts.length = 0;
    punch.t = Math.max(0, punch.t - dt);
    shake = Math.max(0, shake - dt*34);
  }
  draw(dt);
}
requestAnimationFrame(frame);

// ---------- 화면 전환 ----------
const titleScreen = document.getElementById('titleScreen');
const overScreen = document.getElementById('overScreen');
const clearScreen = document.getElementById('clearScreen');

function startGame(){
  audioUnlock();
  reset();
  titleScreen.hidden = true;
  overScreen.hidden = true;
  clearScreen.hidden = true;
  bossBarWrap.hidden = true;
  state = 'play';
  last = 0; acc = 0;
}

function gameClear(){
  phase = 'cleared';
  state = 'clear';
  overAt = performance.now();
  bossBarWrap.hidden = true;
  document.getElementById('clearScore').textContent = score;
  document.getElementById('clearTime').textContent = '걸린 시간 ' + time.toFixed(1) + '초';
  clearScreen.hidden = false;
  banner('클리어! 🎉');
}
let overAt = 0;
function gameOver(){
  state = 'over';
  overAt = performance.now();
  document.getElementById('finalScore').textContent = score;
  const far = Math.round(clamp(player.x / STAGE.bossAt, 0, 1) * 100);
  document.getElementById('finalWave').textContent =
    phase === 'boss' ? '보스전까지 갔어요!' : '숲길 ' + far + '%까지 갔어요';
  overScreen.hidden = false;
  sfx('over');
}
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('againBtn').addEventListener('click', startGame);
document.getElementById('clearAgainBtn').addEventListener('click', startGame);

// 타이틀 화면 뒤에서도 숲이 보이도록 한 번 준비해둔다
reset();
