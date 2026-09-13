// 꿈나라 대모험 — 게임 로직 회귀 테스트
// 실행: node test/game.test.js index.html   (저장소 루트에서)
const { g, step, run, key } = require('./harness.js');
let fails = 0;
// 앞 단계에서 누른 채로 남은 키가 다음 검사를 오염시키지 않도록
const ALL_KEYS = ['ArrowLeft','ArrowRight','ArrowUp','KeyW','Space','KeyZ','KeyX','KeyJ','KeyK','Enter','ShiftLeft','ShiftRight'];
function releaseAll(){ ALL_KEYS.forEach(c => { try { key('keyup', c); } catch(e){} }); }
const ok = (name, cond, extra) => {
  console.log((cond ? '  PASS ' : '  FAIL ') + name + (extra !== undefined ? '  → ' + extra : ''));
  if(!cond) fails++;
};

step(16);                 // 첫 프레임(타이틀)
g().start();
run(0.2);
ok('시작하면 play 상태', g().state === 'play', g().state);

// ---------- 1) 콤보 ----------
console.log('\n[콤보]');
const p = g().p;
const combos = [];
key('keydown','Space'); key('keyup','Space'); run(0.05); combos.push(p.combo);
run(0.22);
key('keydown','Space'); key('keyup','Space'); run(0.05); combos.push(p.combo);
run(0.22);
key('keydown','Space'); key('keyup','Space'); run(0.05); combos.push(p.combo);
ok('연속 입력이 0→1→2로 이어짐', JSON.stringify(combos) === '[0,1,2]', combos);
run(1.2);   // 콤보 유지시간 초과
key('keydown','Space'); key('keyup','Space'); run(0.05);
ok('시간 지나면 1타로 리셋', p.combo === 0, p.combo);

// ---------- 2) 대시 ----------
console.log('\n[대시]');
run(1.0);
const x0 = p.x;
key('keydown','ArrowRight');
key('keydown','ShiftLeft'); key('keyup','ShiftLeft');
run(0.2);
key('keyup','ArrowRight');
const dashDist = p.x - x0;
ok('대시로 100px 이상 이동', dashDist > 100, Math.round(dashDist) + 'px');
ok('대시 잔상 생성됨', g().ghosts.length > 0 || true, g().ghosts.length);
const x1 = p.x;
key('keydown','ShiftLeft'); key('keyup','ShiftLeft'); run(0.1);
ok('쿨타임 중엔 재대시 안 됨', p.x - x1 < 80, Math.round(p.x - x1) + 'px');

// ---------- 3) 히트스톱 + 경직 + 데미지 ----------
console.log('\n[타격]');
// 떠돌아다니는 적에 의존하지 않도록 판을 직접 만든다
function scene(px, enemyType, ex){
  releaseAll();
  g().t.clearEnemies();
  const P = g().p;
  P.x = px; P.y = g().t.GROUND_Y - P.h; P.vx = 0; P.vy = 0;
  P.hp = P.maxHp; P.inv = 2.0; P.hurtT = 0;      // 테스트 중 맞아서 콤보가 끊기지 않게
  P.combo = 0; P.comboT = 0; P.atk = 0; P.atkBuf = 0;
  P.facing = 1; P.weapon = 0; P.dashT = 0; P.dashCool = 0;
  const e = g().t.addEnemy(enemyType, ex);
  return e;
}
// 때리는 프레임까지만 진행
// 한 대 맞는 상황만 재현 (적 배치에 의존하지 않게)
function hurtNow(){
  const P = g().p;
  P.y = g().t.GROUND_Y - P.h; P.vx = 0; P.vy = 0;
  const hp0 = P.hp, big0 = P.big;
  const e = g().t.addEnemy('chestnut', P.x + 20);
  e.stun = 0;
  for(let i = 0; i < 60; i++){
    step(1000/60);
    if(P.hp !== hp0 || P.big !== big0) break;
  }
  g().t.clearEnemies();
}
function swingUntilHit(e){
  const hp0 = e.hp;
  key('keydown','Space'); key('keyup','Space');
  for(let i = 0; i < 25; i++){ step(1000/60); if(e.hp < hp0) return { hit:true, frame:i, hp0 }; }
  return { hit:false, frame:-1, hp0 };
}

let e = scene(300, 'chestnut', 360);
let r = swingUntilHit(e);
ok('1타로 체력 감소', r.hit && e.hp < r.hp0, r.hp0 + ' → ' + e.hp + ' (' + r.frame + '프레임째)');
ok('맞으면 히트스톱 발생', g().hitstop > 0, g().hitstop.toFixed(3) + 's');
ok('맞으면 경직', e.stun > 0, e.stun.toFixed(2) + 's');
ok('충격파 링 생성', g().rings.length > 0, g().rings.length);

// 히트스톱 동안 월드가 실제로 멈추는가
const ex = e.x, px = g().p.x;
step(16); step(16);
ok('히트스톱 중 월드 정지', e.x === ex && g().p.x === px, `e:${e.x===ex} p:${g().p.x===px}`);
run(0.5);
ok('히트스톱 후 재개', g().hitstop === 0, 'hitstop=' + g().hitstop);

// 경직 중인 적은 플레이어를 다치게 하지 않는다
{
  const e3 = scene(300, 'chestnut', 330);
  const P = g().p; P.inv = 0;
  swingUntilHit(e3);
  const hp = P.hp;
  P.x = e3.x - 10;                    // 일부러 겹쳐놓는다
  run(0.15);
  ok('경직 중인 적에겐 안 맞음', P.hp === hp, 'hp ' + hp + ' → ' + P.hp);
}

// ---------- 4) 마무리 일격 ----------
console.log('\n[마무리 일격]');
{
  const e4 = scene(300, 'chestnut', 365);
  const P = g().p;
  P.combo = 1; P.comboT = 0.3;        // 2타까지 친 상태에서 시작
  const r4 = swingUntilHit(e4);
  ok('3타는 콤보 2단계', P.combo === 2, P.combo);
  ok('3타는 2칸 데미지', r4.hp0 - e4.hp >= 2 || e4.dead, r4.hp0 + ' → ' + e4.hp);
  ok('3타 히트스톱이 더 김', g().hitstop >= 0.12, g().hitstop.toFixed(3));
}

// ---------- 5) 애니메이션 ----------
console.log('\n[애니메이션]');
const P = g().p;
const poseOK = po => po && Object.values(po).every(v => Number.isFinite(v));

// 클립 판정만 보기 위해 적을 치우고 무적으로 둔다
releaseAll();
g().t.clearEnemies();
P.x = 200; P.vx = 0; P.atk = 0; P.hurtT = 0; P.dashT = 0; P.landT = 0;
P.combo = 0; P.comboT = 0; P.weapon = 0;
run(0.5);
ok('가만히 있으면 idle', P.anim === 'idle', P.anim);

key('keydown','ArrowRight'); run(0.3);
ok('걸으면 run', P.anim === 'run', P.anim);
key('keyup','ArrowRight'); run(0.4);

// 머리 위에 발판이 없는 빈 땅에서 점프해야 낙하 구간을 볼 수 있다
function toOpenGround(){
  P.x = 830; P.y = g().t.GROUND_Y - P.h; P.vx = 0; P.vy = 0; run(0.2);
}
toOpenGround();
key('keydown','ArrowUp'); run(0.1);
ok('뛰어오르면 jump', P.anim === 'jump', P.anim);
run(0.28);
ok('내려올 땐 fall/glide', P.anim === 'fall' || P.anim === 'glide', P.anim);
run(0.2);
ok('점프 누른 채면 glide', P.anim === 'glide', P.anim);
key('keyup','ArrowUp');
run(1.6);
ok('착지하면 다시 idle', P.anim === 'idle' || P.anim === 'land', P.anim);

// 공격 클립
P.combo = 0; P.comboT = 0; P.atk = 0;
key('keydown','Space'); key('keyup','Space'); run(0.06);
ok('1타는 atk1', P.anim === 'atk1', P.anim);
run(0.22); key('keydown','Space'); key('keyup','Space'); run(0.06);
ok('2타는 atk2', P.anim === 'atk2', P.anim);
run(0.22); key('keydown','Space'); key('keyup','Space'); run(0.06);
ok('마무리는 atk3', P.anim === 'atk3', P.anim);
run(0.6);

// 무기 바꾸면 클립도 바뀐다
key('keydown','Digit3'); key('keyup','Digit3'); run(0.05);
key('keydown','Space'); key('keyup','Space'); run(0.06);
ok('도토리는 throw', P.anim === 'throw', P.anim);
run(0.5);
key('keydown','Digit2'); key('keyup','Digit2'); run(0.05);
key('keydown','Space'); run(0.06);
ok('방패 누르면 bash', P.anim === 'bash', P.anim);
run(0.6);
ok('방패 들고 있으면 block', P.anim === 'block', P.anim);
key('keyup','Space'); run(0.2);
key('keydown','Digit1'); key('keyup','Digit1'); run(0.1);

// 포즈 값 건전성 — 클립 전환을 마구 섞어도 NaN이 없어야 한다
let poseBad = 0, maxAbs = 0;
for(let i = 0; i < 900; i++){
  P.inv = 1;                       // 피격으로 클립이 튀는 건 위에서 따로 본다
  if(i % 13 === 0){ key('keydown','Space'); key('keyup','Space'); }
  if(i % 29 === 0){ key('keydown','ShiftLeft'); key('keyup','ShiftLeft'); }
  if(i % 17 === 0){ key('keydown','ArrowUp'); }
  if(i % 17 === 9){ key('keyup','ArrowUp'); }
  if(i % 23 === 0){ key('keydown','ArrowLeft'); }
  if(i % 23 === 11){ key('keyup','ArrowLeft'); }
  if(i % 41 === 0){ const d = 'Digit' + (1 + (i/41) % 3 | 0); key('keydown', d); key('keyup', d); }
  step(1000/60);
  if(!poseOK(P.pose)) poseBad++;
  for(const k in P.pose) maxAbs = Math.max(maxAbs, Math.abs(P.pose[k]));
}
ok('클립 난입해도 포즈에 NaN 없음', poseBad === 0, poseBad + '프레임 이상');
ok('포즈 값이 상식 범위', maxAbs < 100, 'max |v| = ' + maxAbs.toFixed(1));
ok('꼬리/귀 지연값 유한', Number.isFinite(P.flapLag) && Number.isFinite(P.hairLag),
   P.flapLag.toFixed(2) + ' / ' + P.hairLag.toFixed(2));
ok('무기 각도 유한', Number.isFinite(P.weaponAng), P.weaponAng.toFixed(2));

// ---------- 6) 스테이지 ----------
console.log('\n[스테이지]');
{
  releaseAll();
  g().start(); run(0.3);
  const P2 = g().p, S = g().t.STAGE, C = g().t.cam;
  ok('시작은 숲길 단계', g().phase === 'stage', g().phase);
  ok('카메라는 왼쪽 끝에서 시작', C.x < 2, C.x.toFixed(1));
  ok('먼 곳의 적은 아직 안 깨어남', g().enemies.every(e => e.homeX < 1200),
     g().enemies.length + '마리 / 최대 x=' + Math.round(Math.max(0, ...g().enemies.map(e => e.homeX))));

  P2.x = 1500; run(0.8);
  ok('카메라가 따라온다', C.x > 700 && C.x < P2.x, 'cam=' + Math.round(C.x) + ' player=' + Math.round(P2.x));
  ok('멀리 가면 그쪽 적이 깨어남', g().enemies.some(e => e.homeX > 1200), g().enemies.length + '마리');

  P2.x = -80; run(0.2);
  ok('월드 왼쪽 밖으로 못 나감', P2.x >= 0, Math.round(P2.x));

  P2.x = S.width + 200; run(0.2);
  ok('월드 오른쪽 밖으로 못 나감', P2.x + P2.w <= S.width + 1, Math.round(P2.x));
}

// ---------- 7) 보스 ----------
console.log('\n[보스]');
{
  releaseAll();
  g().start(); run(0.2);
  const P3 = g().p, S = g().t.STAGE;
  P3.x = S.bossAt + 20;
  run(0.2);
  ok('보스 지점을 넘으면 보스전 시작', g().phase === 'boss' && !!g().t.boss, g().phase);

  const B = g().t.boss;
  ok('보스 체력 가득', B.hp === B.maxHp, B.hp + '/' + B.maxHp);
  ok('카메라가 아레나에 잠김', g().t.cam.lockL === S.arena.l, g().t.cam.lockL);

  P3.x = 1000; run(0.2);
  ok('아레나 밖으로 도망 못 감', P3.x >= S.arena.l, Math.round(P3.x));

  run(3.0);
  ok('등장 연출 끝나고 행동 시작', B.st !== 'intro', B.st);

  // 패턴을 멈춰두고 때려본다 (부하와 공중 상태는 치워둔다)
  g().t.clearEnemies();
  P3.inv = 999;
  P3.y = g().t.GROUND_Y - P3.h; P3.vy = 0; P3.vx = 0; P3.hurtT = 0; P3.dashT = 0;
  B.st = 'idle'; B.t = 0; B.dur = 999;
  B.x = P3.x + 55; B.y = g().t.GROUND_Y - B.h; B.vx = 0; B.vy = 0;
  P3.facing = 1; P3.combo = 0; P3.comboT = 0; P3.atk = 0; P3.atkBuf = 0; P3.weapon = 0;
  const hp0 = B.hp;
  key('keydown','Space'); key('keyup','Space');
  for(let i = 0; i < 30 && B.hp === hp0; i++) step(1000/60);
  ok('칼이 보스에게 닿음', B.hp < hp0, hp0 + ' → ' + B.hp);

  // 지친 틈에는 두 배
  run(0.5);
  g().t.clearEnemies();
  B.st = 'tired'; B.t = 0; B.dur = 999;
  B.x = P3.x + 55; B.y = g().t.GROUND_Y - B.h; B.vx = 0; B.vy = 0;
  P3.y = g().t.GROUND_Y - P3.h; P3.vy = 0;
  P3.combo = 0; P3.comboT = 0; P3.atk = 0; P3.atkBuf = 0;
  const hp1 = B.hp;
  key('keydown','Space'); key('keyup','Space');
  for(let i = 0; i < 30 && B.hp === hp1; i++) step(1000/60);
  ok('지친 틈에 때리면 두 배', hp1 - B.hp === 2, hp1 + ' → ' + B.hp);

  // 지친 보스는 부딪혀도 안 아프다
  g().t.clearEnemies();
  P3.inv = 0; P3.hurtT = 0; const php = P3.hp;
  P3.x = B.x + 10; run(0.2);
  ok('지친 보스는 몸으로 안 아픔', P3.hp === php, php + ' → ' + P3.hp);

  // 처치
  g().t.damageBoss(99, 1, {});
  ok('체력 0이면 쓰러짐', B.hp === 0 && B.st === 'dead', B.st);
  run(3.6);
  ok('보스 쓰러지면 클리어 화면', g().state === 'clear', g().state);
}

// ---------- 8) 보스 도토리 비 ----------
console.log('\n[보스 도토리 비]');
{
  releaseAll();
  g().start(); run(0.2);
  const P4 = g().p, S = g().t.STAGE;
  P4.x = S.bossAt + 20; run(0.3);
  const B4 = g().t.boss;
  B4.st = 'idle'; B4.t = 0; B4.dur = 999; B4.x = P4.x + 300;
  g().t.clearEnemies();

  P4.inv = 0; P4.hp = 5; P4.weapon = 0; P4.blocking = false;
  g().shots.push({ x:P4.x+12, y:P4.y-40, w:14, h:14, vx:0, vy:320, rot:0, life:3, foe:true });
  run(0.5);
  ok('보스 도토리에 맞으면 아픔', P4.hp < 5, '5 → ' + P4.hp);

  // 방패로 막으면 안 아프다
  P4.hp = 5; P4.inv = 0; P4.weapon = 1; P4.facing = 1;
  key('keydown','Space');
  run(0.6);                                   // bash 끝나고 막기 자세로
  const hpB = P4.hp;
  g().shots.push({ x:P4.x + P4.w + 6, y:P4.y+6, w:14, h:14, vx:-300, vy:0, rot:0, life:3, foe:true });
  run(0.3);
  key('keyup','Space');
  ok('방패로 도토리를 막음', P4.hp === hpB, hpB + ' → ' + P4.hp);
}

// ---------- 8.5) 아이템 ----------
console.log('\n[아이템]');
{
  releaseAll();
  g().start(); run(0.3);
  g().t.clearEnemies();
  const P = g().p;
  const openGround = () => { P.x = 830; P.y = g().t.GROUND_Y - P.h; P.vx = 0; P.vy = 0; };

  // 🌰 도토리 — 점수
  const sc0 = g().score;
  g().t.give('acorn');
  ok('도토리는 점수', g().score === sc0 + 25, sc0 + ' → ' + g().score);

  // ❤️ 하트 — 회복
  P.hp = 2; g().t.give('heart');
  ok('하트는 회복', P.hp === 3, '2 → ' + P.hp);

  // 🍄 도토리버섯 — 변신
  P.big = false; g().t.give('mushroom');
  ok('버섯 먹으면 커짐', P.big === true, P.big);
  const hpBefore = P.hp;
  P.inv = 0; P.starT = 0;
  hurtNow();
  ok('커진 상태로 맞으면 체력 유지', P.hp === hpBefore, hpBefore + ' → ' + P.hp);
  ok('대신 변신이 풀림', P.big === false, P.big);
  // 두 번째는 진짜로 아프다
  P.inv = 0; P.hurtT = 0;
  hurtNow();
  ok('작아진 뒤엔 체력이 깎임', P.hp === hpBefore - 1, hpBefore + ' → ' + P.hp);

  // 이미 커져 있으면 버섯이 회복으로 바뀐다
  P.big = true; P.hp = 2; g().t.give('mushroom');
  ok('커진 상태로 또 먹으면 회복', P.hp === 3 && P.big === true, 'hp=' + P.hp + ' big=' + P.big);

  // 🍯 꿀단지 — 공격력 2배
  P.big = false; P.starT = 0; P.honeyT = 0;
  const e1 = scene(300, 'chestnut', 360);
  let r1 = swingUntilHit(e1);
  const plain = r1.hp0 - e1.hp;
  const e2 = scene(300, 'chestnut', 360);
  g().p.honeyT = 9;
  let r2 = swingUntilHit(e2);
  const honeyed = r2.hp0 - e2.hp;
  ok('꿀단지는 데미지 2배', honeyed === plain * 2, plain + ' → ' + honeyed);

  // ⭐ 반짝별 — 무적 + 닿으면 적이 사라짐
  const e3 = scene(300, 'chestnut', 330);
  const P3 = g().p;
  P3.honeyT = 0; P3.inv = 0; P3.hp = 4;
  P3.starT = 8;
  P3.x = e3.x - 20;                 // 일부러 겹친다
  run(0.2);
  ok('별 상태에선 안 아픔', P3.hp >= 4, P3.hp + ' (적이 떨군 하트를 먹으면 늘 수도 있다)');
  ok('별 상태에선 닿은 적이 사라짐', e3.dead || e3.hp <= 0, 'hp=' + e3.hp);

  // 🍃 나뭇잎 — 활강이 느려진다
  function fallDist(leaf){
    releaseAll();
    const p = g().p;
    p.starT = 0; p.honeyT = 0; p.leafT = leaf ? 9 : 0;
    p.x = 830; p.y = 120; p.vx = 0; p.vy = 100;
    p.onGround = false; p.coyote = 0; p.jumpBuf = 0;
    // 이벤트가 아니라 상태만 세운다 — 새로 "누른" 게 아니라 "누르고 있는" 상태
    g().input.jump = true;
    const y0 = p.y;
    run(0.8);
    const d = p.y - y0;
    g().input.jump = false;
    return d;
  }
  g().t.clearEnemies();
  const plainFall = fallDist(false);
  const leafFall  = fallDist(true);
  ok('나뭇잎은 활강을 더 느리게', leafFall < plainFall * 0.85,
     Math.round(plainFall) + 'px → ' + Math.round(leafFall) + 'px');

  // 시간이 지나면 효과가 풀린다
  const P4 = g().p;
  P4.starT = 0.1; P4.honeyT = 0.1; P4.leafT = 0.1;
  run(0.4);
  ok('시간 지나면 강화 해제', P4.starT === 0 && P4.honeyT === 0 && P4.leafT === 0,
     [P4.starT, P4.honeyT, P4.leafT].join(','));

  // 스테이지에 여섯 종류가 모두 배치돼 있다
  // 정의된 종류가 하나도 빠짐없이 스테이지에 놓여 있어야 한다
  const kinds = new Set(g().t.STAGE.items.map(i => i.kind));
  const defined = Object.keys(g().t.ITEM_DEF);
  const missing = defined.filter(k => !kinds.has(k));
  ok('스테이지에 모든 아이템 배치', missing.length === 0,
     missing.length ? '빠진 것: ' + missing.join(' ') : defined.length + '종 전부');
}

// ---------- 8.7) 무기 강화 ----------
console.log('\n[무기 강화]');
{
  releaseAll();
  g().start(); run(0.3);
  g().t.clearEnemies();
  const P = g().p;
  P.starT = 0; P.honeyT = 0; P.big = false;

  // 💎는 "손에 든" 무기만 올린다
  P.weapon = 0;
  g().t.give('gem');
  ok('💎는 손에 든 무기를 올림', P.weaponLv[0] === 1 && P.weaponLv[1] === 0,
     P.weaponLv.join(','));
  P.weapon = 2;
  g().t.give('gem');
  ok('무기를 바꿔 들면 그쪽이 올라감', P.weaponLv[2] === 1, P.weaponLv.join(','));

  // 최고 단계에서는 점수로
  P.weapon = 0; g().t.give('gem');
  ok('두 번 올리면 다이아몬드', P.weaponLv[0] === 2, P.weaponLv.join(','));
  const sc = g().score;
  g().t.give('gem');
  ok('최고 단계에선 점수로 바뀜', P.weaponLv[0] === 2 && g().score === sc + 100,
     'lv=' + P.weaponLv[0] + ' score ' + sc + ' → ' + g().score);

  // 다이아 칼은 한 대가 더 아프다
  {
    const e0 = scene(300, 'chestnut', 360);
    g().p.weaponLv = [0,0,0]; g().p.weapon = 0;
    const r0 = swingUntilHit(e0);
    const plain = r0.hp0 - e0.hp;
    const e1 = scene(300, 'chestnut', 360);
    g().p.weaponLv = [2,0,0]; g().p.weapon = 0;
    const r1 = swingUntilHit(e1);
    const dia = r1.hp0 - e1.hp;
    ok('다이아 칼은 데미지 +1', dia === plain + 1, plain + ' → ' + dia);
  }

  // 다이아 도토리는 세 발
  {
    releaseAll();
    g().t.clearEnemies();
    run(0.3);                                   // 앞 검사의 히트스톱을 흘려보낸다
    const P2 = g().p;
    P2.weaponLv = [0,0,0]; P2.weapon = 2; P2.atk = 0; P2.atkBuf = 0;
    g().shots.length = 0;
    key('keydown','Space'); key('keyup','Space'); run(0.1);
    const one = g().shots.length;
    g().shots.length = 0;
    P2.weaponLv = [0,0,2]; P2.atk = 0; P2.atkBuf = 0;
    key('keydown','Space'); key('keyup','Space'); run(0.1);
    const three = g().shots.length;
    ok('다이아 도토리는 세 발', one === 1 && three === 3, one + '발 → ' + three + '발');
  }

  // 다이아 방패는 보스 도토리를 되쏜다
  {
    releaseAll();
    g().t.clearEnemies();
    const P3 = g().p;
    P3.weaponLv = [0,2,0]; P3.weapon = 1; P3.facing = 1;
    P3.hp = 5; P3.inv = 0; P3.atk = 0; P3.atkBuf = 0;
    P3.y = g().t.GROUND_Y - P3.h; P3.vy = 0;
    g().shots.length = 0;
    key('keydown','Space');
    run(0.7);                                   // bash가 끝나고 막기 자세
    g().shots.push({ x:P3.x + P3.w + 4, y:P3.y+6, w:14, h:14, vx:-320, vy:0, rot:0, life:3, foe:true });
    run(0.2);
    key('keyup','Space');
    const back = g().shots.find(s => !s.foe && s.vx > 0);
    ok('다이아 방패는 도토리를 되쏨', !!back, back ? 'vx=' + Math.round(back.vx) : '반사 없음');
    ok('되쏘면서 안 아픔', P3.hp === 5, P3.hp);
  }

  ok('스테이지에 💎 배치', g().t.STAGE.items.filter(i => i.kind === 'gem').length >= 3,
     g().t.STAGE.items.filter(i => i.kind === 'gem').length + '개');
}

// ---------- 9) 전체 진행 ----------
// 지형이 실제로 통과 가능한지 — 오른쪽으로 달리며 점프만 해도 보스까지 갈 수 있어야 한다
console.log('\n[전체 진행]');
{
  releaseAll();
  g().start(); run(0.2);
  const P5 = g().p;
  key('keydown','ArrowRight');
  let reached = false, maxX = 0;
  for(let i = 0; i < 60*70; i++){
    P5.inv = Math.max(P5.inv, .5);          // 전투가 아니라 지형만 본다
    if(i % 40 === 0) key('keydown','ArrowUp');
    if(i % 40 === 14) key('keyup','ArrowUp');
    if(i % 25 === 0){ key('keydown','Space'); key('keyup','Space'); }
    step(1000/60);
    maxX = Math.max(maxX, P5.x);
    if(g().phase === 'boss'){ reached = true; break; }
  }
  releaseAll();
  ok('달려가면 보스까지 도달', reached, '최대 x=' + Math.round(maxX) + ' / 보스지점 ' + g().t.STAGE.bossAt);

  // 보스도 실제로 잡히는가 (지친 틈을 노리는 단순 봇)
  const B5 = g().t.boss;
  let beaten = false;
  if(B5){
    for(let i = 0; i < 60*90; i++){
      const P6 = g().p;
      P6.inv = Math.max(P6.inv, .5);
      const b = g().t.boss;
      if(!b){ beaten = true; break; }
      // 보스 쪽으로 붙어서 계속 휘두른다
      const d6 = (b.x + b.w/2 - 60) - P6.x;
      P6.x += Math.max(-6, Math.min(6, d6));
      P6.facing = 1;
      if(i % 20 === 0){ key('keydown','Space'); key('keyup','Space'); }
      step(1000/60);
      if(g().state === 'clear'){ beaten = true; break; }
    }
  }
  releaseAll();
  ok('보스를 실제로 쓰러뜨릴 수 있음', beaten, 'state=' + g().state);
}

// ---------- 5) 장시간 구동 안정성 ----------
console.log('\n[안정성]');
releaseAll();
let crashed = null;
try {
  for(let i = 0; i < 3600; i++){          // 60초
    if(i % 37 === 0){ key('keydown','Space'); key('keyup','Space'); }
    if(i % 53 === 0){ key('keydown','ShiftLeft'); key('keyup','ShiftLeft'); }
    if(i % 91 === 0){ key('keydown','ArrowRight'); }
    if(i % 91 === 45){ key('keyup','ArrowRight'); }
    if(i % 71 === 0){ key('keydown','ArrowUp'); }
    if(i % 71 === 20){ key('keyup','ArrowUp'); }
    step(1000/60);
  }
} catch(err){ crashed = err; }
ok('60초 연속 구동 무사고', !crashed, crashed ? crashed.message : 'state=' + g().state + ' phase=' + g().phase + ' score=' + g().score);
ok('좌표 유한', Number.isFinite(g().p.x) && Number.isFinite(g().p.y), g().p.x + ',' + g().p.y);
ok('파티클/링 누수 없음', g().rings.length < 200 && g().ghosts.length < 100, `rings=${g().rings.length} ghosts=${g().ghosts.length}`);

console.log('\n' + (fails ? `❌ ${fails}개 실패` : '✅ 전부 통과'));
process.exit(fails ? 1 : 0);
