// 보스 왕밤톨이
// 로드 순서 8/11 · 의존: core, enemy
'use strict';

/* ============================================================
   보스: 왕밤톨이
   구르기 → 지침 / 도토리 비 → 지침 / 부하 소환 의 반복.
   체력이 줄수록 패턴이 빨라지고 험해진다.
   "지침" 구간은 아이가 안심하고 때릴 수 있는 시간 — 이때 데미지 2배.
   ============================================================ */
const BOSS_MAX_HP = 16;

function bossPhase(b){
  return b.hp > b.maxHp * .66 ? 1 : b.hp > b.maxHp * .33 ? 2 : 3;
}
function setBossState(st, dur){
  boss.st = st; boss.t = 0; boss.dur = dur;
}

function startBoss(){
  phase = 'boss';
  cam.lockL = STAGE.arena.l;
  cam.lockR = STAGE.arena.r;
  // 아레나 밖의 적은 정리해서 보스에 집중하게 한다
  enemies = enemies.filter(e => e.x > STAGE.arena.l - 60);
  boss = {
    x: STAGE.arena.l + (STAGE.arena.r - STAGE.arena.l) * .62,
    y: -160, w: 104, h: 92,
    vx: 0, vy: 0, onGround: false,
    hp: BOSS_MAX_HP, maxHp: BOSS_MAX_HP,
    st: 'intro', t: 0, dur: 4, dir: -1,
    hitT: 0, blink: 2, pattern: 0, rolls: 0, rainLeft: 0, rainT: 0,
  };
  banner('왕밤톨이 등장!');
  sfx('boss');
  bossBarWrap.hidden = false;
  syncBossBar();
}

function chooseBossPattern(){
  const b = boss;
  const ph = bossPhase(b);
  const menu = ph === 1 ? ['roll', 'summon', 'roll']
             : ph === 2 ? ['roll', 'rain', 'summon', 'roll']
             :            ['roll', 'rain', 'roll', 'rain'];
  const next = menu[b.pattern % menu.length];
  b.pattern++;
  if(next === 'roll')        setBossState('wind', ph === 3 ? .40 : .58);
  else if(next === 'rain'){  setBossState('rain', 1.1); b.rainLeft = ph === 3 ? 7 : 5; b.rainT = .35; }
  else                       setBossState('summon', .7);
}

function updateBoss(dt){
  const b = boss;
  b.t += dt;
  b.hitT = Math.max(0, b.hitT - dt);
  b.blink -= dt;
  if(b.blink < -0.15) b.blink = rand(2.5, 6);

  const aL = STAGE.arena.l, aR = STAGE.arena.r;
  const px = player.x + player.w/2;
  const bx = b.x + b.w/2;
  const ph = bossPhase(b);

  // 도토리 비를 뿌릴 때만 공중에 뜬다
  if(b.st !== 'rain'){
    b.vy += GRAV * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if(b.y + b.h >= GROUND_Y){ b.y = GROUND_Y - b.h; b.vy = 0; b.onGround = true; }
    else b.onGround = false;
    b.x = clamp(b.x, aL + 12, aR - b.w - 12);
  }

  switch(b.st){
    case 'intro':
      // 하늘에서 쿵 하고 떨어진다
      if(b.onGround && b.t > .25){
        shake = 18;
        addRing(bx, GROUND_Y, 150, '#ffd9a0', 11);
        spawnParticles(bx, GROUND_Y, 20, '#b3825a', {up:280, spread:320, size:11});
        sfx('boom');
        setBossState('idle', 1.2);
      }
      break;

    case 'idle':
      b.vx *= .86;
      b.dir = px < bx ? -1 : 1;
      if(b.t >= b.dur) chooseBossPattern();
      break;

    case 'wind':                       // 구르기 예비동작 — 제자리에서 부르르
      b.vx = 0;
      if(b.t >= b.dur){
        setBossState('roll', 3.4);
        b.rolls = 0;
        b.vx = b.dir * (ph === 3 ? 430 : 340);
        sfx('roll');
      }
      break;

    case 'roll':                       // 굴러온다 — 점프로 피한다
      if(b.x <= aL + 14 || b.x + b.w >= aR - 14){
        b.vx *= -1; b.dir *= -1; b.rolls++;
        shake = 11;
        addPunch(b.dir * 9, 0);
        spawnParticles(b.x + (b.vx > 0 ? 6 : b.w - 6), GROUND_Y - 14, 10, '#c9a06a', {up:220, spread:170});
        sfx('bash');
      }
      if(b.rolls >= 2 || b.t >= b.dur) setBossState('tired', ph === 3 ? 1.25 : 1.75);
      break;

    case 'rain':                       // 떠올라서 도토리를 떨어뜨린다
      b.y += (118 - b.y) * Math.min(1, dt * 3.2);
      b.x += ((px - b.w/2) - b.x) * Math.min(1, dt * 1.3);
      b.x = clamp(b.x, aL + 12, aR - b.w - 12);
      b.onGround = false;
      b.rainT -= dt;
      if(b.rainT <= 0 && b.rainLeft > 0){
        b.rainLeft--;
        b.rainT = ph === 3 ? .32 : .44;
        shots.push({
          x: b.x + b.w/2 - 7, y: b.y + b.h - 6, w:14, h:14,
          vx: rand(-70, 70), vy: 60, rot:0, life:5, foe:true,
        });
        sfx('throw');
      }
      if(b.rainLeft <= 0 && b.t > b.dur + .5) setBossState('drop', 1.4);
      break;

    case 'drop':                       // 내려와서 지친다
      if(b.onGround){
        shake = 12;
        addRing(bx, GROUND_Y, 110, '#ffd9a0', 8);
        spawnParticles(bx, GROUND_Y, 12, '#b3825a', {up:220, spread:240, size:9});
        sfx('boom');
        setBossState('tired', 1.6);
      }
      break;

    case 'summon':
      if(b.t >= b.dur){
        for(let i = 0; i < 2; i++){
          spawnEnemy(i ? 'hopper' : 'chestnut', 0, clamp(bx + (i ? 80 : -110), aL + 20, aR - 60));
        }
        spawnParticles(bx, GROUND_Y - 20, 10, '#8ed17a', {up:200, spread:220});
        sfx('pop');
        setBossState('idle', 1.0);
      }
      break;

    case 'tired':                      // 때릴 수 있는 시간 (데미지 2배)
      b.vx *= .8;
      if(b.t >= b.dur) setBossState('idle', .8);
      break;

    case 'dead':
      b.vx *= .9;
      b.y += Math.sin(b.t * 18) * .6;
      if(Math.random() < .4){
        spawnParticles(rand(b.x, b.x + b.w), rand(b.y, b.y + b.h), 3, '#ffd76a', {up:220, spread:180, size:8});
      }
      if(b.t >= b.dur){ boss = null; gameClear(); }
      return;                          // 쓰러진 뒤엔 부딪혀도 안 아프다
  }

  // 몸통 박치기 — 지쳐 있을 땐 안전하다
  if(overlap(b, player)){
    const side = Math.sign((b.x + b.w/2) - (player.x + player.w/2)) || 1;
    if(player.starT > 0){
      // ⭐ 별 상태에선 오히려 보스가 조금씩 깎인다 (너무 세지 않게 간격을 둔다)
      if(player.starHitT <= 0){
        player.starHitT = .45;
        damageBoss(1, side, { stop:.05 });
      }
    } else if(b.st !== 'tired' && player.inv <= 0){
      hurtPlayer(side, null);
    }
  }
}

function damageBoss(dmg, dir, fx){
  const b = boss;
  if(!b || b.st === 'dead') return;
  const weak = b.st === 'tired' ? 2 : 1;     // 지쳤을 때 때리면 두 배
  b.hp = Math.max(0, b.hp - dmg * weak);
  b.hitT = .2;

  const cx = b.x + b.w/2, cy = b.y + b.h/2;
  spawnParticles(cx, cy, weak > 1 ? 14 : 9, '#ffe9a8', {up:230, spread:210});
  addRing(cx, cy, weak > 1 ? 86 : 62, '#fff6c9', weak > 1 ? 10 : 7);
  addPunch(dir * (weak > 1 ? 10 : 5), 0);
  hitstop = Math.max(hitstop, ((fx && fx.stop) || .06) * (weak > 1 ? 1.7 : 1));
  shake = Math.min(shake + (weak > 1 ? 8 : 4), 15);
  sfx(weak > 1 ? 'hit3' : 'hit');
  if(weak > 1) floatText(cx, cy - 30, '두 배!', '#ffd76a');
  syncBossBar();

  if(b.hp <= 0){
    setBossState('dead', 2.2);
    hitstop = .38; shake = 22;
    score += 500;
    floatText(cx, cy - 20, '+500', '#ffd76a');
    addRing(cx, cy, 200, '#fff1b8', 14);
    spawnParticles(cx, cy, 30, '#a9744a', {up:340, spread:340, size:12});
    sfx('bossdown');
    syncHUD();
  }
}

// ---------- 보스 그리기 ----------
function drawBoss(){
  const b = boss;
  if(!b) return;
  const cx = b.x + b.w/2, by = b.y + b.h;
  const hit = b.hitT > 0;
  const tired = b.st === 'tired';
  const dead = b.st === 'dead';

  // 그림자
  ctx.save();
  ctx.globalAlpha = .18; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(cx, Math.min(by + 3, GROUND_Y + 3), b.w * .42, 8, 0, 0, 6.2832); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, by);
  if(dead) ctx.rotate(Math.sin(b.t * 6) * .12);
  if(b.st === 'roll'){                       // 구를 땐 통째로 돈다
    ctx.translate(0, -b.h * .5);
    ctx.rotate(b.t * 11 * Math.sign(b.vx || 1));
    ctx.translate(0, b.h * .5);
  }
  // 예비동작에선 부르르 떤다
  if(b.st === 'wind') ctx.translate(rand(-3, 3), 0);
  ctx.scale(b.dir, 1);

  const shellC = hit ? '#ffffff' : (tired ? '#8f6440' : '#a9744a');
  const belly = hit ? '#ffffff' : '#f0d9a8';

  // 아랫배
  ctx.fillStyle = belly;
  ctx.beginPath(); ctx.ellipse(0, -20, 46, 24, 0, 0, 6.2832); ctx.fill();
  // 밤 껍질
  ctx.fillStyle = shellC;
  ctx.beginPath();
  ctx.moveTo(-46, -20);
  ctx.quadraticCurveTo(-42, -86, 0, -84);
  ctx.quadraticCurveTo(42, -86, 46, -20);
  ctx.closePath(); ctx.fill();

  // 왕관
  ctx.fillStyle = hit ? '#ffffff' : '#ffc83d';
  ctx.beginPath();
  ctx.moveTo(-24, -84); ctx.lineTo(-18, -104); ctx.lineTo(-8, -90);
  ctx.lineTo(0, -110);  ctx.lineTo(8, -90);    ctx.lineTo(18, -104);
  ctx.lineTo(24, -84);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = hit ? '#fff' : '#ff8fa3';
  ctx.beginPath(); ctx.arc(0, -96, 3.4, 0, 6.2832); ctx.fill();

  // 발
  ctx.fillStyle = hit ? '#fff' : '#8a5a30';
  ctx.beginPath(); ctx.ellipse(-18, -3, 12, 7, 0, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.ellipse( 18, -3, 12, 7, 0, 0, 6.2832); ctx.fill();
  // 팔
  ctx.beginPath(); ctx.ellipse(-44, -34, 9, 12, .4, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.ellipse( 44, -34, 9, 12, -.4, 0, 6.2832); ctx.fill();

  // 얼굴
  const ey = -46;
  ctx.fillStyle = hit ? '#c9c9c9' : '#3b2a1e';
  ctx.strokeStyle = ctx.fillStyle;
  if(dead || tired){                         // 지치면 >_<
    ctx.lineWidth = 3.6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-24, ey-6); ctx.lineTo(-10, ey+6); ctx.moveTo(-10, ey-6); ctx.lineTo(-24, ey+6);
    ctx.moveTo( 10, ey-6); ctx.lineTo( 24, ey+6); ctx.moveTo( 24, ey-6); ctx.lineTo( 10, ey+6);
    ctx.stroke();
  } else if(b.blink < 0){
    ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-24, ey); ctx.lineTo(-10, ey); ctx.moveTo(10, ey); ctx.lineTo(24, ey);
    ctx.stroke();
  } else {
    ctx.beginPath(); ctx.ellipse(-17, ey, 7.5, 9, 0, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 17, ey, 7.5, 9, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-14.6, ey-3, 2.6, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc( 19.4, ey-3, 2.6, 0, 6.2832); ctx.fill();
  }
  // 볼터치 · 입
  ctx.fillStyle = 'rgba(255,140,150,.42)';
  ctx.beginPath(); ctx.ellipse(-31, ey+13, 8, 5, 0, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.ellipse( 31, ey+13, 8, 5, 0, 0, 6.2832); ctx.fill();
  if(!dead){
    ctx.strokeStyle = hit ? '#c9c9c9' : '#3b2a1e';
    ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath();
    if(tired) ctx.arc(0, ey+20, 8, 0, Math.PI);          // 헥헥
    else { ctx.moveTo(-7, ey+19); ctx.quadraticCurveTo(0, ey+25, 7, ey+19); }
    ctx.stroke();
  }

  ctx.restore();

  // 지쳤을 때 "지금!" 표시 — 아이가 때릴 타이밍을 알 수 있게
  if(tired && !REDUCED){
    ctx.save();
    ctx.globalAlpha = .55 + Math.sin(time * 12) * .3;
    ctx.font = '800 20px ' + getComputedStyle(document.body).fontFamily;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(59,42,30,.55)';
    ctx.strokeText('지금!', cx, b.y - 22);
    ctx.fillStyle = '#ffe9a0';
    ctx.fillText('지금!', cx, b.y - 22);
    ctx.restore();
  }
}
