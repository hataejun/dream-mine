// 스테이지 데이터 · 지형 충돌 · 카메라 · 스트리밍
// 로드 순서 6/10 · 의존: core
'use strict';

// ---------- 스테이지 ----------
// 한 화면 아레나에서 옆으로 흐르는 스테이지로. 세로는 한 화면(540) 안에서 해결한다.
// plats = 위에서만 밟히는 발판 / blocks = 사방이 막힌 덩어리(언덕·상자)
const STAGE = {
  width: 4400,
  bossAt: 3700,                       // 이 지점을 넘으면 보스전 시작
  arena:  { l: 3540, r: 4400 },       // 보스 아레나 (카메라·플레이어가 갇힌다)

  plats: [
    // A. 숲 입구 — 발판 밟는 법을 익히는 구간
    { x: 300, y: 344, w: 170 }, { x: 560, y: 292, w: 150 },
    // B. 계단 언덕
    { x: 1230, y: 300, w: 150 }, { x: 1460, y: 244, w: 140 },
    // C. 공중 구간 — 잎새들이 있는 곳
    { x: 1700, y: 330, w: 130 }, { x: 1900, y: 272, w: 130 },
    { x: 2110, y: 218, w: 130 }, { x: 2330, y: 280, w: 150 },
    // D. 넓은 숲길 — 싸우는 구간
    { x: 2700, y: 330, w: 160 }, { x: 2960, y: 300, w: 140 },
    // E. 마지막 오르막
    { x: 3180, y: 336, w: 140 }, { x: 3360, y: 276, w: 140 },
    // F. 보스 아레나 — 도토리 비를 피할 발판
    { x: 3660, y: 300, w: 150 }, { x: 4080, y: 300, w: 150 },
  ],
  blocks: [
    { x:  900, y: 382, w: 130, h: 60  },
    { x: 1030, y: 330, w: 130, h: 112 },
    { x: 2480, y: 382, w: 110, h: 60  },
    { x: 3040, y: 382, w: 120, h: 60  },
  ],
  // 카메라가 가까이 오면 깨어난다
  enemies: [
    { type:'chestnut', x:  520 }, { type:'chestnut', x:  760 },
    { type:'chestnut', x: 1120 }, { type:'hopper',   x: 1330 },
    { type:'hopper',   x: 1560 }, { type:'flyer',    x: 1820 },
    { type:'flyer',    x: 2060 }, { type:'chestnut', x: 2250 },
    { type:'hopper',   x: 2420 }, { type:'chestnut', x: 2620 },
    { type:'chestnut', x: 2780 }, { type:'flyer',    x: 2900 },
    { type:'hopper',   x: 3080 }, { type:'chestnut', x: 3240 },
    { type:'flyer',    x: 3420 }, { type:'chestnut', x: 3480 },
  ],
  // 🌰 점수 · ❤️ 회복 · 🍄 변신 · 🍃 활강 · 🍯 공격력 · ⭐ 무적
  // 힘 아이템은 "그 힘이 필요한 구간 바로 앞"에 둔다 —
  // 나뭇잎은 공중 구간 앞, 꿀단지는 싸움터 앞, 별은 보스 직전.
  items: [
    { kind:'acorn',    x:  330, y: 300 }, { kind:'acorn', x:  600, y: 250 },
    { kind:'mushroom', x:  640, y: 250 },
    { kind:'gem',      x: 1180, y: 380 },
    { kind:'acorn',    x: 1265, y: 256 }, { kind:'acorn', x: 1500, y: 200 },
    { kind:'leaf',     x: 1690, y: 286 },
    { kind:'acorn',    x: 1740, y: 286 }, { kind:'acorn', x: 1940, y: 228 },
    { kind:'acorn',    x: 2150, y: 174 }, { kind:'acorn', x: 2370, y: 236 },
    { kind:'gem',      x: 2200, y: 174 },
    { kind:'heart',    x: 2530, y: 330 },
    { kind:'honey',    x: 2610, y: 380 },
    { kind:'acorn',    x: 2740, y: 286 }, { kind:'acorn', x: 3000, y: 256 },
    { kind:'gem',      x: 2900, y: 380 },
    { kind:'acorn',    x: 3220, y: 292 }, { kind:'acorn', x: 3400, y: 232 },
    { kind:'mushroom', x: 3300, y: 232 },
    { kind:'gem',      x: 3380, y: 232 },
    { kind:'armor',    x: 3470, y: 300 },
    { kind:'heart',    x: 3450, y: 380 },
    { kind:'star',     x: 3510, y: 380 },
  ],
};

// 충돌에 쓰이는 최종 지형 목록
let platforms = [];
function buildStage(){
  platforms = [
    { x:0, y:GROUND_Y, w:STAGE.width, h:H-GROUND_Y, oneWay:false },   // 땅
  ];
  for(const b of STAGE.blocks) platforms.push({ x:b.x, y:b.y, w:b.w, h:b.h, oneWay:false });
  for(const p of STAGE.plats)  platforms.push({ x:p.x, y:p.y, w:p.w, h:20, oneWay:true });
}

// ---------- 카메라 ----------
// 옆으로만 움직인다. 보스전에는 아레나 안에 잠긴다.
const cam = { x:0, lockL:0, lockR:0 };
function camBounds(){
  return phase === 'stage'
    ? { l: 0, r: STAGE.width }
    : { l: cam.lockL, r: cam.lockR };
}
function updateCamera(dt){
  const b = camBounds();
  // 보는 방향으로 조금 더 앞을 보여준다
  let target = player.x + player.w/2 - W/2 + player.facing * 70;
  target = clamp(target, b.l, Math.max(b.l, b.r - W));
  cam.x += (target - cam.x) * Math.min(1, dt * 5.5);
  cam.x = clamp(cam.x, b.l, Math.max(b.l, b.r - W));
}

// ---------- 충돌 (지형) ----------
function moveBody(b, dt, useOneWay){
  // X
  b.x += b.vx * dt;
  b.x = clamp(b.x, worldL(), worldR() - b.w);
  for(const p of platforms){
    if(p.oneWay) continue;
    if(overlap(b, p)){
      if(b.vx > 0) b.x = p.x - b.w;
      else if(b.vx < 0) b.x = p.x + p.w;
      b.vx = 0;
    }
  }
  // Y
  const prevBottom = b.y + b.h;
  b.y += b.vy * dt;
  b.onGround = false;
  for(const p of platforms){
    if(p.oneWay){
      if(!useOneWay) continue;
      // 위에서 내려올 때만 착지
      if(b.vy >= 0 && prevBottom <= p.y + 1 && b.y + b.h >= p.y &&
         b.x + b.w > p.x + 4 && b.x < p.x + p.w - 4){
        b.y = p.y - b.h; b.vy = 0; b.onGround = true;
      }
      continue;
    }
    if(overlap(b, p)){
      if(b.vy > 0){ b.y = p.y - b.h; b.vy = 0; b.onGround = true; }
      else if(b.vy < 0){ b.y = p.y + p.h; b.vy = 0; }
    }
  }
  if(b.y > H + 200){ b.y = -60; b.vy = 0; }   // 안전망
}

// ---------- 스테이지 진행 ----------
// 보스전에는 아레나 밖으로 못 나간다
function worldL(){ return phase === 'stage' ? 0 : STAGE.arena.l; }
function worldR(){ return phase === 'stage' ? STAGE.width : STAGE.arena.r; }

// 카메라 앞쪽에 들어온 적·아이템만 깨운다 (전부 한 번에 살려두면 뒤에서 난장판이 된다)
function streamStage(){
  const edge = cam.x + W + 80;
  STAGE.enemies.forEach((s0, i)=>{
    if(spawned.enemy.has(i) || s0.x > edge) return;
    spawned.enemy.add(i);
    spawnEnemy(s0.type, 0, s0.x);
  });
  STAGE.items.forEach((it, i)=>{
    if(spawned.item.has(i) || it.x > edge) return;
    spawned.item.add(i);
    pickups.push({ kind:it.kind, x:it.x, y:it.y, w:22, h:22, vy:0, t:rand(0,6), life:1e9, fixed:true });
  });
}


// ---------- 세계 진행 ----------
// 앞쪽 적 깨우기 → 보스 돌입 판정 → 보스 → 카메라
function updateWorld(dt){
  // --- 스테이지 진행 ---
  streamStage();
  if(phase === 'stage' && player.x > STAGE.bossAt) startBoss();
  if(boss) updateBoss(dt);
  updateCamera(dt);
}
