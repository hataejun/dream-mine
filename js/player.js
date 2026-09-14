// 무기 정의와 공격 판정 (칼 콤보 / 방패 / 도토리)
// 로드 순서 3/11 · 의존: core
'use strict';

// ---------- 무기 정의 ----------
// 마인크래프트처럼 손에 든 무기가 공격 방식을 결정한다.
const WEAPONS = [
  // 칼의 수치는 아래 SWORD_COMBO가 단계별로 쥔다
  { id:'sword',  name:'곡괭이', ico:'⛏️' },
  { id:'shield', name:'방패',  ico:'🛡️', cool:0.45, windup:0.04, active:0.16 },
  { id:'acorn',  name:'도토리', ico:'🌰', cool:0.36, windup:0.09, active:0.01 },
];

// 칼 3단 콤보 — 1타·2타는 빠르고, 마무리는 느리지만 크고 세다
// stop = 맞는 순간 화면을 멈추는 시간(히트스톱), arc = 칼이 지나가는 각도
const SWORD_COMBO = [
  { cool:0.24, windup:0.045, active:0.16, reach:64, dmg:1, knock:340, lunge:170, stop:0.055, shake:3, arc:[-2.05,  1.45] },
  { cool:0.24, windup:0.045, active:0.16, reach:64, dmg:1, knock:360, lunge:170, stop:0.055, shake:3, arc:[ 1.45, -2.05] },
  { cool:0.44, windup:0.115, active:0.20, reach:82, dmg:2, knock:780, lunge:300, stop:0.125, shake:9, arc:[-2.45,  1.95] },
];

// ---------- 무기 강화 단계 ----------
// 마인크래프트처럼 나무 → 돌 → 다이아몬드. 💎를 먹으면 손에 든 무기가 한 단계 오른다.
// 무기마다 "세지는 방식"이 달라야 고르는 재미가 생긴다.
//   칼   = 사거리와 힘이 는다 → 다이아는 한 대가 2칸
//   방패 = 밀치는 힘이 세지고 → 다이아는 막은 도토리를 되쏜다
//   도토리 = 굵어지고        → 다이아는 세 발로 흩뿌린다
const TIERS = [
  { name:'나무',       short:'나무',   chip:'🪵', blade:'#bcd9ff', edge:'#5a86c9', grip:'#2f6fd0', glow:null,
    shield:'#7bd35a', shieldRim:'#57a75f', nut:'#e3aa63', nutCap:'#8a5a30' },
  { name:'돌',         short:'돌',     chip:'🪨', blade:'#f2f5f9', edge:'#7d8796', grip:'#6f7a89', glow:null,
    shield:'#c3a179', shieldRim:'#8a6b46', nut:'#cfae7e', nutCap:'#6d5636' },
  { name:'다이아몬드', short:'다이아', chip:'💎', blade:'#eafffd', edge:'#3fbfb4', grip:'#2fb3a8', glow:'rgba(110,240,228,.9)',
    shield:'#8ef0e6', shieldRim:'#3fbfb4', nut:'#9ef0e8', nutCap:'#3fbfb4' },
];
const MAX_TIER = TIERS.length - 1;

const lvOf = w => player.weaponLv[w === undefined ? player.weapon : w];
const tierOf = w => TIERS[lvOf(w)];

// 🍯 꿀단지를 먹으면 모든 공격이 두 배
function dmgMul(){ return player.honeyT > 0 ? 2 : 1; }

// ---------- 공격 ----------
function swordHitbox(reach){
  reach = reach || 64;
  const hh = 46;
  return {
    x: player.facing > 0 ? player.x + player.w - 8 : player.x - reach + 8,
    y: player.y + 2, w: reach, h: hh,
  };
}
function bashHitbox(){
  const reach = 40;
  return {
    x: player.facing > 0 ? player.x + player.w - 6 : player.x - reach + 6,
    y: player.y + 6, w: reach, h: 36,
  };
}

function startAttack(){
  const wdef = WEAPONS[player.weapon];
  const p = player;
  p.hitSet = new Set();

  if(wdef.id === 'sword'){
    // 이어서 누르면 1타 → 2타 → 마무리로 연결된다
    p.combo = p.comboT > 0 ? (p.combo + 1) % 3 : 0;
    const st = SWORD_COMBO[p.combo];
    p.atk = p.atkDur = st.cool;
    p.comboT = st.cool + 0.36;        // 다음 타를 이어붙일 수 있는 시간
    lunge(st.lunge);
    sfx(p.combo === 2 ? 'swing3' : 'swing');
    return;
  }

  p.combo = 0; p.comboT = 0;
  p.atk = p.atkDur = wdef.cool;
  if(wdef.id === 'shield'){ sfx('bash'); lunge(110); }
  else {
    sfx('throw');
    const lv = lvOf();
    // 다이아몬드 도토리는 세 발로 흩어진다
    const spread = lv >= 2 ? [-95, 0, 95] : [0];
    for(const dy of spread){
      shots.push({
        x: player.x + player.w/2 - 7 + player.facing*16,
        y: player.y + 16, w:14, h:14,
        vx: player.facing * (540 + lv*60), vy: -120 + dy,
        rot:0, life: 2.2, lv,
        dmg: lv >= 1 ? 2 : 1,
        pierce: lv >= 2 ? 1 : 0,        // 다이아는 한 번 관통한다
      });
    }
    spawnParticles(player.x+player.w/2 + player.facing*20, player.y+20, 4,
                   tierOf().nut, {up:80, spread:70, grav:400});
  }
}

// 휘두르면서 앞으로 미끄러진다 — 공격에 무게감을 주고, 살짝 파고들 수 있게
function lunge(power){
  player.lungeV = power * player.facing;
  player.lungeDur = 0.12;
  player.lungeT = 0.12;
}

function updateAttack(dt){
  const wdef = WEAPONS[player.weapon];
  const p = player;

  // 콤보 유지 시간이 끝나면 1타부터 다시
  p.comboT = Math.max(0, p.comboT - dt);
  if(p.comboT <= 0 && p.atk <= 0) p.combo = 0;

  if(p.atk > 0){
    p.atk -= dt;
    const st = wdef.id === 'sword' ? SWORD_COMBO[p.combo] : wdef;
    const elapsed = p.atkDur - p.atk;
    const live = elapsed >= st.windup && elapsed <= st.windup + st.active;
    if(live && (wdef.id === 'sword' || wdef.id === 'shield')){
      const lv = lvOf();
      const box = wdef.id === 'sword'
        ? swordHitbox(st.reach + (p.big ? 14 : 0) + lv * 9)
        : bashHitbox();
      for(const e of enemies){
        if(e.dead || p.hitSet.has(e)) continue;
        if(overlap(box, e)){
          p.hitSet.add(e);
          const dir = Math.sign((e.x+e.w/2) - (p.x+p.w/2)) || p.facing;
          if(wdef.id === 'sword'){
            damageEnemy(e, (st.dmg + (lv >= 2 ? 1 : 0)) * dmgMul(), dir,
                        st.knock * (1 + lv * .18), st);
          } else {
            // 방패는 데미지보다 밀치는 맛 — 단계가 오를수록 훨씬 멀리 날아간다
            damageEnemy(e, (1 + (lv >= 2 ? 1 : 0)) * dmgMul(), dir,
                        620 * (1 + lv * .3), { stop:.07 + lv*.01, shake:5 + lv });
          }
        }
      }
      // 보스도 같은 판정으로 맞는다
      if(boss && boss.st !== 'dead' && !p.hitSet.has(boss) && overlap(box, boss)){
        p.hitSet.add(boss);
        const dir = Math.sign((boss.x+boss.w/2) - (p.x+p.w/2)) || p.facing;
        const bd = (wdef.id === 'sword' ? st.dmg : 1) + (lvOf() >= 2 ? 1 : 0);
        damageBoss(bd * dmgMul(), dir, st);
      }
    }
    if(p.atk <= 0) p.atk = 0;
  }
  // 방패를 든 채 공격 버튼을 계속 누르고 있으면 막기 자세
  p.blocking = (wdef.id === 'shield' && input.attack && p.atk <= 0);
  p.blockGlow = Math.max(0, p.blockGlow - dt);
}


// ---------- 플레이어 한 프레임 ----------
// 이동 → 공격 전진 → 대시 → 점프/활강 → 지형 충돌 → 공격 판정.
// 뒤 단계가 앞 단계의 속도를 덮어쓰는 구조라 순서가 곧 우선순위다.
function updatePlayer(p, dt){
  // --- 아이템 효과 시간 ---
  p.starT    = Math.max(0, p.starT - dt);
  p.honeyT   = Math.max(0, p.honeyT - dt);
  p.leafT    = Math.max(0, p.leafT - dt);
  p.starHitT = Math.max(0, p.starHitT - dt);
  syncPowers();
  if(p.starT > 0 && !REDUCED && Math.random() < .5){
    spawnParticles(p.x + p.w/2, p.y + p.h/2, 1, `hsl(${(time*420)%360},90%,68%)`,
                   {up:60, spread:70, grav:120, size:6, life:.5});
  }

  // --- 이동 ---
  p.inv = Math.max(0, p.inv - dt);
  p.hurtT = Math.max(0, p.hurtT - dt);

  const dir = (input.right?1:0) - (input.left?1:0);
  const slow = p.blocking ? 0.42 : 1;           // 막는 중엔 느리게
  const target = dir * 290 * slow;
  const accel = p.onGround ? 2600 : 1500;
  if(dir !== 0){
    p.vx += clamp(target - p.vx, -accel*dt, accel*dt);
    if(p.atk <= 0) p.facing = dir;
  } else {
    const fric = p.onGround ? 2400 : 700;
    if(p.vx > 0) p.vx = Math.max(0, p.vx - fric*dt);
    else         p.vx = Math.min(0, p.vx + fric*dt);
  }

  // --- 공격 전진 --- 휘두르는 동안 앞으로 미끄러져 타격에 무게가 실린다
  if(p.lungeT > 0){
    p.lungeT -= dt;
    p.vx = p.lungeV * Math.max(0, p.lungeT / p.lungeDur);
  }

  // --- 대시 --- (Shift / 방향 버튼 더블탭)
  p.dashCool = Math.max(0, p.dashCool - dt);
  if(input.dashPressed && p.dashCool <= 0 && p.dashT <= 0 && !p.blocking){
    p.dashT = .18; p.dashCool = .5;
    p.dashDir = dir !== 0 ? dir : p.facing;
    p.facing = p.dashDir;
    p.lungeT = 0;
    p.vy = Math.min(p.vy, 0);
    spawnParticles(p.x + p.w/2 - p.dashDir*16, p.y + p.h - 8, 8, '#ffe9c7',
                   {up:70, spread:130, grav:420, size:6});
    sfx('dash');
  }
  if(p.dashT > 0){
    p.dashT -= dt;
    p.vx = p.dashDir * 620;
    p.vy = Math.min(p.vy, 70);          // 대시 중에는 덜 떨어진다
    // 잔상은 일정 간격으로만 남긴다
    const lastG = ghosts[ghosts.length-1];
    if(!lastG || (p.x - lastG.x) * p.dashDir > 9){
      ghosts.push({ x:p.x, y:p.y, facing:p.dashDir, life:.2, max:.2 });
    }
  }

  // 점프 (코요테 타임 + 입력 버퍼로 아이도 쉽게 성공)
  p.coyote = p.onGround ? 0.12 : Math.max(0, p.coyote - dt);
  p.jumpBuf = input.jumpPressed ? 0.14 : Math.max(0, p.jumpBuf - dt);
  if(p.jumpBuf > 0 && p.coyote > 0){
    p.vy = -720; p.coyote = 0; p.jumpBuf = 0; p.onGround = false;
    spawnParticles(p.x+p.w/2, p.y+p.h, 6, '#e8dcc0', {up:80, spread:110, grav:500, size:6});
    sfx('jump');
  }
  // 짧게 누르면 낮게 뛴다
  if(!input.jump && p.vy < -240) p.vy += 1500 * dt;

  // 꼬리 활강 — 떨어지는 중 점프를 누르고 있으면 천천히 내려온다
  // 🍃 나뭇잎을 먹으면 훨씬 오래 떠 있는다
  p.gliding = !p.onGround && input.jump && p.vy > 40;
  const glideG   = p.leafT > 0 ? 0.13 : 0.28;
  const glideCap = p.leafT > 0 ? 78   : 130;
  p.vy += (p.gliding ? GRAV*glideG : GRAV) * dt;
  if(p.gliding){
    p.vy = Math.min(p.vy, glideCap);
    if(p.leafT > 0 && !REDUCED && Math.random() < .18){
      spawnParticles(p.x + p.w/2, p.y + p.h - 8, 1, '#8ed17a', {up:20, spread:60, grav:90, size:5, life:.8});
    }
  }

  const wasGround = p.onGround;
  const impact = p.vy;                    // 충돌 직전 낙하 속도 (moveBody가 0으로 만들기 전에)
  moveBody(p, dt, true);
  if(p.onGround && !wasGround){
    if(impact > 430) p.landT = .22;       // 살짝 떨어진 정도로는 쿵 하지 않는다
    spawnParticles(p.x+p.w/2, p.y+p.h, 5, '#e8dcc0', {up:60, spread:120, grav:600, size:5});
    sfx('land');
  }
  p.landT = Math.max(0, p.landT - dt);

  // --- 공격 ---
  // 조금 일찍/늦게 눌러도 공격이 나가도록 입력을 0.2초 기억한다
  p.atkBuf = input.attackPressed ? 0.2 : Math.max(0, p.atkBuf - dt);
  if(p.atkBuf > 0 && p.atk <= 0){ p.atkBuf = 0; startAttack(); }
  updateAttack(dt);
}

// ---------- 날아다니는 도토리 ----------
// 내가 던진 것과 보스가 뿌린 것(foe)이 같은 배열에 산다.
function updateShots(dt){
  const p = player;
  // --- 도토리 탄환 ---
  for(const s of shots){
    s.life -= dt;
    s.vy += 620 * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    s.rot += dt * 13 * Math.sign(s.vx);
    if(s.x < -30 || s.x > STAGE.width + 30 || s.y > H + 30) s.dead = true;
    for(const p2 of platforms){
      if(!p2.oneWay && overlap(s, p2)){
        s.dead = true;
        spawnParticles(s.x+7, s.y+7, 5, '#c98a4b', {up:140, spread:120});
      }
    }
    if(s.foe){
      // 보스가 뿌린 도토리 — 방패로 막을 수 있다
      if(!s.dead && overlap(s, p)){
        s.dead = true;
        const from = Math.sign((s.x + 7) - (p.x + p.w/2)) || 1;
        if(p.blocking && from === p.facing){
          p.blockGlow = .25;
          spawnParticles(s.x+7, s.y+7, 7, '#fff2b0', {up:160, spread:130});
          if(lvOf(1) >= 2){
            // 💎 다이아몬드 방패는 막은 도토리를 그대로 되쏜다
            s.dead = false; s.foe = false;
            s.vx = p.facing * 620; s.vy = -80;
            s.dmg = 2; s.pierce = 1; s.lv = 2; s.life = 2.2;
            addRing(s.x+7, s.y+7, 52, '#8ef0e6', 6);
            sfx('reflect');
          } else {
            sfx('block');
          }
        } else {
          hurtPlayer(from, null);
        }
      }
    } else {
      for(const e of enemies){
        if(e.dead || s.dead) continue;
        if(overlap(s, e)){
          damageEnemy(e, (s.dmg || 1) * dmgMul(), Math.sign(s.vx) || 1, 380 + (s.lv||0)*120);
          if(s.pierce > 0) s.pierce--;      // 다이아는 하나를 뚫고 지나간다
          else s.dead = true;
        }
      }
      if(!s.dead && boss && boss.st !== 'dead' && overlap(s, boss)){
        s.dead = true;
        damageBoss((s.dmg || 1) * dmgMul(), Math.sign(s.vx) || 1, { stop:.05 });
      }
    }
    if(s.life <= 0) s.dead = true;
  }
  shots = shots.filter(s=>!s.dead);
}
