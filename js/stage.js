// 스테이지 데이터 · 지형 충돌 · 카메라 · 스트리밍
// 로드 순서 7/11 · 의존: core
'use strict';

// ---------- 스테이지 ----------
// 한 화면 아레나에서 옆으로 흐르는 스테이지로. 세로는 한 화면(540) 안에서 해결한다.
// plats = 위에서만 밟히는 발판 / blocks = 사방이 막힌 덩어리(언덕·상자)


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
