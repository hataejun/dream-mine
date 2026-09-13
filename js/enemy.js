// 적 정의 · 행동 · 그리기
// 로드 순서 5/10 · 의존: core, stage
'use strict';

// ---------- 적 ----------
// 모두 둥글둥글하고 무섭지 않은 생김새. 이름도 다정하게.
const ENEMY_DEF = {
  chestnut: { w:38, h:36, hp:2, speed:64,  score:10, color:'#a9744a', name:'밤톨이' },
  hopper:   { w:40, h:34, hp:2, speed:0,   score:15, color:'#8ed17a', name:'통통이' },
  flyer:    { w:36, h:30, hp:1, speed:82,  score:20, color:'#c39bef', name:'잎새' },
};

// atX를 주면 그 자리에 놓고, 없으면 화면 옆에서 걸어 들어온다(보스 소환용)
function spawnEnemy(type, side, atX){
  const d = ENEMY_DEF[type];
  const fromLeft = side === undefined ? Math.random() < .5 : side === 0;
  const px = atX !== undefined ? atX
           : (fromLeft ? cam.x - d.w - 10 : cam.x + W + 10);
  const e = {
    type, w:d.w, h:d.h, hp:d.hp, maxHp:d.hp,
    homeX: px,
    x: px,
    y: type === 'flyer' ? rand(140, 300) : GROUND_Y - d.h,
    vx: (fromLeft ? 1 : -1) * d.speed,
    vy: 0, dir: fromLeft ? 1 : -1,
    onGround:false, hitT:0, stun:0, t: rand(0,6),
    hopT: rand(.4,1.2), blink: rand(2,5),
  };
  enemies.push(e);
}

function updateEnemy(e, dt){
  const d = ENEMY_DEF[e.type];
  e.t += dt;
  e.hitT = Math.max(0, e.hitT - dt);
  e.stun = Math.max(0, e.stun - dt);
  e.blink -= dt;
  if(e.blink < -0.14) e.blink = rand(2.5, 6);

  const px = player.x + player.w/2, py = player.y + player.h/2;
  const ex = e.x + e.w/2, ey = e.y + e.h/2;

  // 맞은 직후에는 경직 — 날아가기만 하고 공격도 이동도 하지 않는다.
  // (경직 중엔 플레이어를 다치게 하지 않아서, 때린 쪽이 유리해진다)
  if(e.stun > 0){
    if(e.type === 'flyer'){
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.vx *= 0.9; e.vy *= 0.9;
      e.x = clamp(e.x, worldL(), worldR() - e.w);
      e.y = clamp(e.y, 40, GROUND_Y - e.h - 10);
    } else {
      e.vy += GRAV * dt;
      moveBody(e, dt, true);
      if(e.onGround) e.vx *= 0.85;
    }
    return;
  }

  if(e.type === 'chestnut'){
    // 뒤뚱뒤뚱 걸으며 플레이어 쪽으로 천천히 방향을 바꾼다
    // 처음 놓인 자리 근처를 왔다갔다 한다 (스테이지 밖으로 새지 않게)
    if(e.x < Math.max(8, e.homeX - 160)) e.dir = 1;
    if(e.x + e.w > Math.min(STAGE.width - 8, e.homeX + 220)) e.dir = -1;
    if(Math.abs(px - ex) > 40 && Math.sin(e.t*1.5) > .96) e.dir = px > ex ? 1 : -1;
    e.vx = e.dir * d.speed;
    e.vy += GRAV * dt;
    moveBody(e, dt, true);

  } else if(e.type === 'hopper'){
    // 주기적으로 플레이어를 향해 폴짝
    e.hopT -= dt;
    if(e.onGround){
      e.vx *= 0.86;
      if(e.hopT <= 0){
        e.hopT = rand(0.9, 1.5);
        e.vy = -640;
        e.vx = (px > ex ? 1 : -1) * rand(120, 190);
        e.dir = px > ex ? 1 : -1;
      }
    }
    e.vy += GRAV * dt;
    moveBody(e, dt, true);

  } else { // flyer — 사인파를 그리며 접근
    const dx = px - ex, dy = (py - 30) - ey;
    const len = Math.hypot(dx, dy) || 1;
    e.vx = (dx/len) * d.speed;
    e.vy = (dy/len) * d.speed * 0.6 + Math.sin(e.t*4) * 60;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.x = clamp(e.x, worldL(), worldR() - e.w);
    e.y = clamp(e.y, 40, GROUND_Y - e.h - 10);
    e.dir = e.vx > 0 ? 1 : -1;
  }

  // 플레이어와 접촉
  if(player.starT > 0 && overlap(e, player)){
    // ⭐ 별 상태에서는 부딪히기만 해도 정리된다
    damageEnemy(e, 99, Math.sign(ex - (player.x + player.w/2)) || 1, 560, { stop:.04, shake:4 });
  } else if(player.inv <= 0 && overlap(e, player)){
    if(player.blocking && Math.sign(ex - (player.x + player.w/2)) === player.facing){
      // 방패로 정면 방어 — 피해 없이 밀어낸다
      e.vx = player.facing * 260; e.vy = -180;
      e.hitT = .12;
      player.blockGlow = .25;
      spawnParticles(player.x + player.w/2 + player.facing*24, player.y+20, 6, '#fff2b0', {up:120, spread:90, grav:300});
      sfx('block');
    } else {
      hurtPlayer(Math.sign(ex - (player.x + player.w/2)) || 1, e);
    }
  }
}

function damageEnemy(e, dmg, knockDir, knockPower, fx){
  const heavy = dmg >= 2;
  const stop = (fx && fx.stop) || 0.05;
  const shk  = (fx && fx.shake) || 3;

  e.hp -= dmg;
  e.hitT = .18;
  e.stun = Math.max(e.stun, heavy ? .38 : .22);
  e.vx = knockDir * (knockPower || 300);
  if(e.type !== 'flyer') e.vy = heavy ? -360 : -200;

  const cx = e.x + e.w/2, cy = e.y + e.h/2;
  spawnParticles(cx, cy, heavy ? 15 : 8, '#ffe9a8', {up:200, spread:180});
  addRing(cx, cy, heavy ? 66 : 38, '#fff6c9', heavy ? 9 : 6);
  addPunch(knockDir * (heavy ? 10 : 4), 0);

  if(e.hp <= 0){
    const d = ENEMY_DEF[e.type];
    score += d.score;
    floatText(cx, cy - 10, '+' + d.score, '#ffd76a');
    spawnParticles(cx, cy, 16, d.color, {up:260, spread:240, size:9});
    spawnParticles(cx, cy, 6, '#ffffff', {up:200, spread:200, size:6});
    addRing(cx, cy, 78, d.color, 8);
    e.dead = true;
    hitstop = Math.max(hitstop, stop + .05);
    shake = Math.min(shake + 5 + shk, 15);
    sfx('pop');
    // 가끔 뭔가를 떨어뜨린다 — 체력이 깎였을 때만 하트가 나온다
    const roll = Math.random();
    if(roll < 0.14 && player.hp < player.maxHp){
      pickups.push({ kind:'heart', x:cx-11, y:cy-11, w:22, h:22, vy:-150, t:0, life:9 });
    } else if(roll < 0.46){
      pickups.push({ kind:'acorn', x:cx-11, y:cy-11, w:22, h:22, vy:-180, t:0, life:7 });
    }
    syncHUD();
  } else {
    hitstop = Math.max(hitstop, stop);
    shake = Math.min(shake + shk, 12);
    sfx(heavy ? 'hit3' : 'hit');
  }
}

function hurtPlayer(dir, src){
  const p = player;
  if(p.starT > 0) return;                 // ⭐ 별을 먹은 동안은 아프지 않다
  if(p.inv > 0) return;

  // 🍄 변신 중이면 체력 대신 변신이 깨진다 — 아이에게 실수 한 번을 봐주는 안전망
  if(p.big){
    p.big = false;
    p.inv = p.armor ? 2.1 : 1.5; p.hurtT = .35;
    p.vx = -dir * 260; p.vy = -260;
    p.combo = 0; p.comboT = 0; p.dashT = 0; p.lungeT = 0;
    if(src){ src.vx = dir * 300; src.vy = -160; src.hitT = .12; }
    shake = 11;
    hitstop = Math.max(hitstop, .10);
    addRing(p.x + p.w/2, p.y + p.h/2, 90, '#ffd2c0', 8);
    spawnParticles(p.x + p.w/2, p.y + p.h/2, 12, '#ffd2c0', {up:240, spread:220});
    floatText(p.x + p.w/2, p.y - 6, '작아졌다!', '#ff8f7a');
    sfx('shrink');
    syncHUD();
    return;
  }

  player.hp -= 1;
  player.inv = player.armor ? 2.1 : 1.5;
  // 때린 적도 같이 튕겨나가게 해서 붙어서 연속으로 맞는 일을 줄인다
  if(src){ src.vx = dir * 300; src.vy = -160; src.hitT = .12; }
  player.hurtT = .35;
  player.vx = -dir * 330;
  player.vy = -320;
  player.combo = 0; player.comboT = 0;
  player.dashT = 0; player.lungeT = 0;
  shake = 12;
  hitstop = Math.max(hitstop, .13);
  addPunch(-dir * 12, 0);
  addRing(player.x+player.w/2, player.y+player.h/2, 60, '#ffb3c4', 7);
  spawnParticles(player.x+player.w/2, player.y+player.h/2, 10, '#ff9db4', {up:240, spread:200});
  sfx('hurt');
  syncHUD();
  if(player.hp <= 0) gameOver();
}

// ---------- 적 그리기 ----------
function drawEnemy(e){
  const cx = e.x + e.w/2, by = e.y + e.h;
  const hit = e.hitT > 0;
  const wob = Math.sin(e.t*7) * 2;
  const blinking = e.blink < 0;

  // 그림자
  if(e.type !== 'flyer'){
    ctx.save(); ctx.globalAlpha = .16; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(cx, Math.min(by+2, GROUND_Y+2), e.w*0.42, 5, 0, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, by);
  ctx.scale(e.dir, 1);
  if(hit){ ctx.save(); ctx.globalAlpha = 1; }

  const eyeY = -e.h*0.55;

  if(e.type === 'chestnut'){
    // 밤톨이 — 둥근 밤. 무섭지 않게 뾰족한 부분 최소화
    ctx.fillStyle = hit ? '#ffffff' : '#f0d9a8';
    ctx.beginPath(); ctx.ellipse(0, -10, 18, 11, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = hit ? '#ffffff' : '#a9744a';
    ctx.beginPath();
    ctx.moveTo(-18, -10);
    ctx.quadraticCurveTo(-16, -38 + wob, 0, -36 + wob);
    ctx.quadraticCurveTo(16, -38 + wob, 18, -10);
    ctx.closePath(); ctx.fill();
    // 작은 발
    ctx.fillStyle = hit ? '#fff' : '#8a5a30';
    ctx.beginPath(); ctx.ellipse(-7, -1, 5, 3.4, 0, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(7, -1, 5, 3.4, 0, 0, 6.2832); ctx.fill();
    drawFace(0, eyeY-2, 4, blinking, hit, '#fff');

  } else if(e.type === 'hopper'){
    // 통통이 — 말랑한 젤리. 점프 중엔 늘어난다
    const stretch = e.onGround ? 1 : 1.16;
    ctx.save(); ctx.scale(1/stretch, stretch);
    ctx.fillStyle = hit ? '#ffffff' : '#8ed17a';
    ctx.beginPath(); ctx.ellipse(0, -16, 19, 17, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = hit ? '#fff' : 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.ellipse(-6, -24, 6, 4, -.5, 0, 6.2832); ctx.fill();
    ctx.restore();
    drawFace(0, -18, 4.2, blinking, hit, '#2f4a28');

  } else {
    // 잎새 — 나뭇잎 날개를 단 동글이
    const flap = Math.sin(e.t*14) * 10;
    ctx.fillStyle = hit ? '#ffffff' : '#9fd98a';
    ctx.save(); ctx.rotate(flap*Math.PI/180);
    ctx.beginPath(); ctx.ellipse(-17, -18, 13, 6, -.4, 0, 6.2832); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.rotate(-flap*Math.PI/180);
    ctx.beginPath(); ctx.ellipse(17, -18, 13, 6, .4, 0, 6.2832); ctx.fill();
    ctx.restore();
    ctx.fillStyle = hit ? '#ffffff' : '#c39bef';
    ctx.beginPath(); ctx.arc(0, -15, 15, 0, 6.2832); ctx.fill();
    ctx.fillStyle = hit ? '#fff' : 'rgba(255,255,255,.3)';
    ctx.beginPath(); ctx.ellipse(-5, -21, 5, 3.4, -.5, 0, 6.2832); ctx.fill();
    drawFace(0, -16, 4, blinking, hit, '#3a2456');
  }

  if(hit) ctx.restore();
  ctx.restore();
}

function drawFace(x, y, r, blinking, hit, cheek){
  ctx.fillStyle = hit ? '#c9c9c9' : '#3b2a1e';
  if(blinking){
    ctx.lineWidth = 2; ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath(); ctx.moveTo(x-9, y); ctx.lineTo(x-3, y); ctx.moveTo(x+3, y); ctx.lineTo(x+9, y); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.ellipse(x-6, y, r*0.75, r, 0, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+6, y, r*0.75, r, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x-4.6, y-1.6, 1.3, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(x+7.4, y-1.6, 1.3, 0, 6.2832); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,140,150,.4)';
  ctx.beginPath(); ctx.ellipse(x-12, y+5, 3.4, 2.2, 0, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x+12, y+5, 3.4, 2.2, 0, 0, 6.2832); ctx.fill();
}


// ---------- 적 한 프레임 ----------
function updateEnemies(dt){
  // --- 적 ---
  for(const e of enemies) if(!e.dead) updateEnemy(e, dt);
  enemies = enemies.filter(e=>!e.dead);
}
