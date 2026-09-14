// 주인공 애니메이션(포즈 키프레임)과 그리기
// 로드 순서 4/11 · 의존: core
'use strict';

/* ============================================================
   주인공 애니메이션
   "포즈"(주인공을 그리는 데 필요한 숫자 묶음)를 키프레임으로 정의하고
   시간에 따라 보간한다. sin()으로 흔드는 대신 예비동작 → 타격 → 잔동작
   타이밍을 직접 쥐는 방식. 별의커비류의 귀여움은 그림보다 타이밍에서 온다.
   ============================================================ */

const BASE_POSE = {
  bodyY:0, bodyRot:0, sx:1, sy:1,      // 몸 위치 · 기울기 · 스쿼시
  headY:-44, headRot:0, hairRot:0,
  armRot:-0.45,                         // 무기 든 팔 (무기 각도에서 자동 계산)
  legF:0, legB:0,                       // 앞발 · 뒷발 앞뒤 오프셋
  flapRot:0, flapSpread:1,
  eye:0,                                // 0 뜬눈 · 1 감은눈 · 2 >_<
};

// t는 0~1 정규화. mode:'progress'면 시간이 아니라 공격 진행도로 재생된다.
const ANIM = {
  // 숨쉬기 — 가만히 서 있어도 살아있어 보이게
  idle: { loop:true, dur:2.0, keys:[
    { t:0,   p:{ sy:1,     bodyY:0,    flapRot:0,    hairRot:0,    headY:-44 } },
    { t:.28, p:{ sy:1.035, bodyY:-1.6, flapRot:.10,  hairRot:-.06, headY:-45 } },
    { t:.52, p:{ sy:1,     bodyY:0,    flapRot:.02,  hairRot:0,    headY:-44 } },
    { t:.78, p:{ sy:1.03,  bodyY:-1.3, flapRot:-.09, hairRot:.05,  headY:-45 } },
    { t:1,   p:{ sy:1,     bodyY:0,    flapRot:0,    hairRot:0,    headY:-44 } },
  ]},

  // 달리기 4단계: 착지 → 눌림 → 반대발 착지 → 눌림
  run: { loop:true, dur:.44, keys:[
    { t:0,   p:{ legF: 8, legB:-8, bodyY: 0,   sy:.98,  bodyRot:.07, flapRot:-.18, hairRot: .10, headY:-43.5 } },
    { t:.25, p:{ legF: 1, legB: 2, bodyY:-3.6, sy:1.03, bodyRot:.11, flapRot: .05, hairRot:-.14, headY:-45.5 } },
    { t:.5,  p:{ legF:-8, legB: 8, bodyY: 0,   sy:.98,  bodyRot:.07, flapRot: .18, hairRot: .10, headY:-43.5 } },
    { t:.75, p:{ legF: 2, legB: 1, bodyY:-3.6, sy:1.03, bodyRot:.11, flapRot:-.05, hairRot:-.14, headY:-45.5 } },
    { t:1,   p:{ legF: 8, legB:-8, bodyY: 0,   sy:.98,  bodyRot:.07, flapRot:-.18, hairRot: .10, headY:-43.5 } },
  ]},

  // 뛰어오를 때 쭉 늘어났다가 공중에서 자세를 잡는다
  jump: { loop:false, dur:.34, keys:[
    { t:0,   p:{ sy:1.22, sx:.84, legF:-5, legB:-5, bodyRot:-.16, flapRot:-.40, hairRot:-.22 } },
    { t:.35, p:{ sy:1.04, sx:.97, legF:-3, legB: 4, bodyRot:-.10, flapRot:-.28, hairRot:-.16 } },
    { t:1,   p:{ sy:1,    sx:1,   legF:-2, legB: 5, bodyRot:-.07, flapRot:-.22, hairRot:-.12 } },
  ]},
  fall: { loop:false, dur:.3, keys:[
    { t:0, p:{ legF: 4, legB:-2, bodyRot:.08, flapRot:.18, hairRot:.16 } },
    { t:1, p:{ legF: 6, legB:-4, bodyRot:.12, flapRot:.26, hairRot:.20 } },
  ]},
  // 잠옷 자락이 부풀어 천천히 내려온다
  glide: { loop:true, dur:1.0, keys:[
    { t:0,  p:{ flapSpread:1.42, flapRot:-.08, legF:7, legB:-7, bodyRot:-.05, hairRot:.10, sy:.98  } },
    { t:.5, p:{ flapSpread:1.52, flapRot: .07, legF:9, legB:-5, bodyRot:-.01, hairRot:.18, sy:1.01 } },
    { t:1,  p:{ flapSpread:1.42, flapRot:-.08, legF:7, legB:-7, bodyRot:-.05, hairRot:.10, sy:.98  } },
  ]},
  // 세게 떨어졌을 때만 — 푹 눌렸다가 살짝 넘치게 튀어오른다
  land: { loop:false, dur:.22, keys:[
    { t:0,   p:{ sy:.74, sx:1.24, legF: 6, legB:-6, flapRot: .30, hairRot: .26, headY:-41 } },
    { t:.45, p:{ sy:1.08,sx:.95,  legF: 2, legB:-2, flapRot:-.10, hairRot:-.10, headY:-45 } },
    { t:1,   p:{ sy:1,   sx:1,    legF: 0, legB: 0, flapRot: 0,   hairRot: 0,   headY:-44 } },
  ]},
  dash: { loop:false, dur:.2, keys:[
    { t:0, p:{ sx:1.22, sy:.86, bodyRot:.30, legF:-9, legB: 9, flapRot:.55, hairRot:.34, headY:-42 } },
    { t:1, p:{ sx:1.10, sy:.94, bodyRot:.22, legF:-6, legB: 6, flapRot:.42, hairRot:.26, headY:-43 } },
  ]},
  hurt: { loop:false, dur:.35, keys:[
    { t:0, p:{ bodyRot:-.30, sx:1.06, sy:.94, legF:-5, legB:5, flapRot:-.35, hairRot:-.30, eye:2, headY:-43 } },
    { t:1, p:{ bodyRot:-.12, sx:1,    sy:1,   legF:-2, legB:2, flapRot:-.15, hairRot:-.10, eye:2, headY:-44 } },
  ]},
  block: { loop:true, dur:1.6, keys:[
    { t:0,  p:{ sy:.95, bodyRot:.10, legF:5, legB:-5, flapRot:.16, hairRot:.20, headY:-42   } },
    { t:.5, p:{ sy:.97, bodyRot:.12, legF:5, legB:-5, flapRot:.20, hairRot:.20, headY:-42.6 } },
    { t:1,  p:{ sy:.95, bodyRot:.10, legF:5, legB:-5, flapRot:.16, hairRot:.20, headY:-42   } },
  ]},

  // --- 공격 --- 앞에서 몸을 젖히고(예비동작), 짧게 터뜨리고(타격), 천천히 돌아온다(잔동작)
  atk1: { mode:'progress', keys:[
    { t:0,   p:{ bodyRot:-.26, sx:.96, sy:1.02, legF:-4, legB: 4, flapRot:-.30, hairRot:-.20, headY:-45   } },
    { t:.28, p:{ bodyRot:-.34, sx:.94, sy:1.04, legF:-6, legB: 6, flapRot:-.40, hairRot:-.26, headY:-46   } },
    { t:.46, p:{ bodyRot: .22, sx:1.08,sy:.94,  legF: 7, legB:-7, flapRot: .30, hairRot: .22, headY:-42.5 } },
    { t:1,   p:{ bodyRot: .04, sx:1,   sy:1,    legF: 2, legB:-2, flapRot: .08, hairRot: .04, headY:-44   } },
  ]},
  atk2: { mode:'progress', keys:[
    { t:0,   p:{ bodyRot: .20, sx:1.04,sy:.97,  legF: 5, legB:-5, flapRot: .26, hairRot: .18, headY:-43   } },
    { t:.28, p:{ bodyRot: .28, sx:1.06,sy:.95,  legF: 7, legB:-7, flapRot: .34, hairRot: .24, headY:-42.5 } },
    { t:.46, p:{ bodyRot:-.24, sx:.94, sy:1.07, legF:-7, legB: 7, flapRot:-.34, hairRot:-.24, headY:-46.5 } },
    { t:1,   p:{ bodyRot:-.04, sx:1,   sy:1,    legF:-2, legB: 2, flapRot:-.08, hairRot:-.04, headY:-44   } },
  ]},
  // 마무리 일격 — 크게 젖혔다가 온몸으로 내리친다
  atk3: { mode:'progress', keys:[
    { t:0,   p:{ bodyRot:-.30, sx:.94, sy:1.05, legF:-5,  legB:  5, flapRot:-.36, hairRot:-.24, headY:-45   } },
    { t:.30, p:{ bodyRot:-.52, sx:.88, sy:1.10, legF:-11, legB: 11, flapRot:-.60, hairRot:-.40, headY:-47.5 } },
    { t:.44, p:{ bodyRot: .40, sx:1.16,sy:.88,  legF: 12, legB:-12, flapRot: .52, hairRot: .38, headY:-40.5 } },
    { t:.62, p:{ bodyRot: .26, sx:1.06,sy:.96,  legF: 8,  legB: -8, flapRot: .34, hairRot: .22, headY:-42   } },
    { t:1,   p:{ bodyRot: .05, sx:1,   sy:1,    legF: 2,  legB: -2, flapRot: .08, hairRot: .04, headY:-44   } },
  ]},
  bash: { mode:'progress', keys:[
    { t:0,   p:{ bodyRot:-.14, sx:.97,  legF:-4, legB: 4, flapRot:-.18, headY:-44 } },
    { t:.35, p:{ bodyRot: .24, sx:1.10, sy:.94, legF: 8, legB:-8, flapRot:.30, hairRot:.20, headY:-42 } },
    { t:1,   p:{ bodyRot: .08, sx:1,    sy:1,   legF: 4, legB:-4, flapRot:.12, headY:-43 } },
  ]},
  throw: { mode:'progress', keys:[
    { t:0,   p:{ bodyRot:-.20, sx:.96,  legF:-4, legB: 4, flapRot:-.24, headY:-45   } },
    { t:.30, p:{ bodyRot:-.28, sx:.94,  legF:-6, legB: 6, flapRot:-.32, headY:-46   } },
    { t:.48, p:{ bodyRot: .22, sx:1.07, sy:.95, legF: 7, legB:-7, flapRot:.26, headY:-42.5 } },
    { t:1,   p:{ bodyRot: .02, sx:1,    sy:1,   legF: 1, legB:-1, flapRot:.04, headY:-44   } },
  ]},
};

// 키프레임의 빠진 값은 기본 포즈로 채워 미리 완성해둔다 (매 프레임 병합하지 않도록)
for(const name in ANIM){
  const A = ANIM[name];
  if(A.mode === 'progress') A.dur = 1;
  A.keys = A.keys.map(k => ({ t:k.t, pose: Object.assign({}, BASE_POSE, k.p) }));
}

function lerpPose(a, b, k){
  const o = {};
  for(const key in BASE_POSE){
    o[key] = (key === 'eye') ? (k < .5 ? a[key] : b[key])
                             : a[key] + (b[key] - a[key]) * k;
  }
  return o;
}

function sampleClip(A, time){
  const u = clamp(time / A.dur, 0, 1);
  const keys = A.keys;
  let i = 0;
  while(i < keys.length - 1 && u > keys[i+1].t) i++;
  const a = keys[i], b = keys[Math.min(i+1, keys.length-1)];
  const span = Math.max(1e-6, b.t - a.t);
  let k = clamp((u - a.t) / span, 0, 1);
  k = k * k * (3 - 2*k);              // 부드럽게 (직선 보간은 기계처럼 보인다)
  return lerpPose(a.pose, b.pose, k);
}

// 지금 상태에 맞는 동작 고르기 — 위에 있을수록 우선한다
function pickClip(p){
  if(p.hurtT > 0) return 'hurt';
  if(p.dashT > 0) return 'dash';
  if(p.atk > 0){
    const id = WEAPONS[p.weapon].id;
    if(id === 'sword') return 'atk' + (p.combo + 1);
    return id === 'shield' ? 'bash' : 'throw';
  }
  if(p.blocking) return 'block';
  if(!p.onGround) return p.gliding ? 'glide' : (p.vy < -40 ? 'jump' : 'fall');
  if(p.landT > 0) return 'land';
  return Math.abs(p.vx) > 30 ? 'run' : 'idle';
}

// 무기가 향하는 각도 — 팔 각도와 칼자국이 모두 여기서 나온다
function weaponAngle(p){
  const id = WEAPONS[p.weapon].id;
  const prog = (p.atk > 0 && p.atkDur > 0) ? clamp(1 - p.atk/p.atkDur, 0, 1) : -1;
  p.weaponProg = prog;
  if(id === 'sword'){
    const st = SWORD_COMBO[p.combo];
    // 쉴 땐 자루 끝이 위를 향한다 (연장을 어깨에 걸치듯). 손 위치는 아래 armRot이 따로 정한다.
    if(prog < 0) return -0.62 + Math.sin(p.animT * 2.6) * 0.06;
    // 앞부분은 천천히 젖혔다가(예비동작) 뒤에서 빠르게 지나간다
    const e = prog < .28 ? (prog/.28)*.18 : .18 + ((prog-.28)/.72)*.82;
    return st.arc[0] + (st.arc[1] - st.arc[0]) * e;
  }
  if(id === 'shield') return prog >= 0 ? Math.sin(prog*Math.PI)*.5 : (p.blocking ? .12 : 0);
  return prog >= 0 ? -prog*2.4 : Math.sin(p.animT*2.6)*.06;
}

function updateAnim(p, dt){
  const clip = pickClip(p);
  if(clip !== p.anim){
    p.poseFrom = p.pose;            // 직전 포즈에서 부드럽게 넘어간다 (툭 끊기지 않게)
    p.blendT = p.blendDur;
    p.anim = clip; p.animT = 0;
  }
  const A = ANIM[clip];

  if(A.mode === 'progress'){
    p.animT = (p.atkDur > 0) ? clamp(1 - p.atk/p.atkDur, 0, 1) : 1;
  } else {
    // 달리기는 실제 속도에 맞춰 빨라진다
    const sp = clip === 'run' ? clamp(Math.abs(p.vx)/230, .75, 1.8) : 1;
    p.animT += dt * sp;
    if(A.loop) p.animT %= A.dur;
    else p.animT = Math.min(p.animT, A.dur);
  }

  let pose = sampleClip(A, p.animT);
  if(p.blendT > 0){
    p.blendT = Math.max(0, p.blendT - dt);
    pose = lerpPose(p.poseFrom, pose, 1 - p.blendT/p.blendDur);
  }

  // 팔 각도 — 휘두르는 중에만 무기를 따라간다.
  // 쉴 때까지 무기를 따라가게 두면 손이 얼굴 옆까지 올라온다.
  p.weaponAng = weaponAngle(p);
  const swinging = p.atk > 0;
  const REST_ARM = 0.62;                      // 팔을 가슴~허리 높이로 내려 쥔다
  const armTarget = swinging
    ? clamp(p.weaponAng * .55 - .12, -1.5, 1.3)
    : REST_ARM + Math.sin(p.animT * 2.6) * 0.05;
  if(p.armRotS === undefined) p.armRotS = armTarget;
  // 휘두를 땐 즉시 따라가고(빨라야 한다), 돌아올 땐 부드럽게 내린다
  p.armRotS = swinging ? armTarget
                       : p.armRotS + (armTarget - p.armRotS) * Math.min(1, dt * 11);
  pose.armRot = p.armRotS;
  p.pose = pose;

  // 잠옷 자락과 머리카락은 몸을 한 박자 늦게 따라온다 — 잔동작(follow-through)
  p.flapLag += (pose.flapRot - p.flapLag) * Math.min(1, dt * 13);
  p.hairLag  += (pose.hairRot  - p.hairLag ) * Math.min(1, dt * 18);

  // 눈 깜빡임
  p.blinkT -= dt;
  if(p.blinkT < -0.13) p.blinkT = rand(2.2, 5.5);
}

// ---------- 주인공 그리기 ----------
// 캐릭터 시트를 캔버스 도형으로 옮긴 것. 외부 이미지 없이 전부 여기서 그린다.
// 비율은 치비(머리가 크고 팔다리가 짧다) — 머리 지름이 몸통 높이보다 크다.
const SKIN = '#ffdcc0', SKIN_D = '#eec0a2';
// 마리오식 배색 — 노랑(옷·모자) · 파랑(멜빵) · 흰색(장갑) · 갈색(신발).
// 값이 뚜렷이 갈려서 작게 보여도 형태가 뭉치지 않는다.
const CAP = '#ffd23f', CAP_D = '#dda413';
const OVR = '#2f6fd0', OVR_D = '#1d4a99';
const GLOVE = '#ffffff', GLOVE_D = '#cfd4e0';
const SHOE = '#8a5a30', SHOE_D = '#5d3a1a';
const PJ   = '#f7efc6', PJ_D  = '#e4d49a', PJ_L = '#fdf9e2';
const HAIR = '#2f2722', HAIR_L = '#4d4038';

function drawHero(){
  const p = player;
  if(p.inv > 0 && Math.floor(p.inv*18) % 2 === 0) return;   // 무적 중 깜빡임
  const po = p.pose;
  if(!po) return;

  ctx.save();
  ctx.translate(p.x + p.w/2, p.y + p.h);

  // 그림자 — 몸 변형을 따라가지 않는다
  ctx.save();
  ctx.globalAlpha = .18; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(0, 0.5, 14 * (po.sx*.5+.5), 4.2, 0, 0, 6.2832); ctx.fill();
  ctx.restore();

  ctx.scale(p.facing, 1);
  if(p.big) ctx.scale(1.18, 1.18);          // 🍄 도토리버섯을 먹으면 커진다

  // ⭐ 별을 먹은 동안은 잠옷이 무지개로 돈다
  let pj = PJ, pjD = PJ_D, pjL = PJ_L;
  if(p.starT > 0){
    const h = (time * 420) % 360;
    pj  = 'hsl(' + h + ',88%,74%)';
    pjD = 'hsl(' + ((h + 34) % 360) + ',72%,58%)';
    pjL = 'hsl(' + h + ',95%,86%)';
  }

  // ===== 몸통 그룹: 발끝 기준으로 스쿼시, 엉덩이를 축으로 기울임 =====
  ctx.save();
  ctx.translate(0, po.bodyY);
  ctx.scale(po.sx, po.sy);
  ctx.translate(0, -22); ctx.rotate(po.bodyRot); ctx.translate(0, 22);

  // ----- 장비 단계 -----
  // 0 잠옷 / 1 가죽 보호대 / 2 갑옷 + 망토 / 3 전신 다이아몬드 갑옷
  const gear = p.armor ? 3 : Math.max(p.weaponLv[0], p.weaponLv[1], p.weaponLv[2]);
  const caped = gear >= 2;
  const sp = po.flapSpread;

  // 작게 보일 땐 외곽선이 형태를 살린다. 색만으로는 옷·팔·다리가 한 덩어리로 뭉친다.
  const INK = 'rgba(96,72,44,.62)';
  const inked = (w)=>{ ctx.strokeStyle = INK; ctx.lineWidth = w || 1.5; ctx.stroke(); };

  // ----- 망토 -----  어깨에서 시작해 아래로 넓어지고, 아랫단이 물결진다
  if(caped){
    const CA = gear >= 3 ? '#4a95ef' : '#3573d6';
    const CA_D = gear >= 3 ? '#1f5bb5' : '#1c4a9c';
    // 접혔을 땐 등 뒤로 치우쳐 늘어지고, 활강하면 좌우로 활짝 펴진다.
    // 좌우 대칭으로 접으면 부채처럼 보여서 천 느낌이 안 난다.
    const t = clamp((sp - 1) / 0.5, 0, 1);            // 0 접힘 · 1 활짝
    const back  = -19 - 11 * t;                        // 등 쪽 가장자리
    const front =   3 + 27 * t;                        // 앞쪽 가장자리 (접히면 몸에 붙는다)
    const bot   = -15 +  7 * t;                        // 아랫단 높이
    const mid   = (back + front) / 2;

    ctx.save();
    ctx.translate(0, -41); ctx.rotate(p.flapLag * (.45 + .55 * t)); ctx.translate(0, 41);
    ctx.beginPath();
    ctx.moveTo(-10, -42);
    ctx.quadraticCurveTo(back - 3, -33, back, bot - 3);           // 등을 타고 흘러내림
    ctx.quadraticCurveTo((back + mid)/2, bot + 5, mid, bot);      // 물결진 아랫단
    ctx.quadraticCurveTo((mid + front)/2, bot + 5, front, bot - 3);
    ctx.quadraticCurveTo(front + 2, -33, 10, -42);
    ctx.closePath();
    ctx.fillStyle = CA; ctx.fill();
    ctx.strokeStyle = CA_D; ctx.lineWidth = 1.8; ctx.stroke();
    // 세로 주름 — 천이 늘어져 있다는 걸 보여준다
    ctx.strokeStyle = 'rgba(14,40,92,.30)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for(const f of [0.3, 0.55, 0.78]){
      const x0 = -10 + (back + 10) * f * 0.5;
      const x1 = back + (front - back) * f;
      ctx.beginPath();
      ctx.moveTo(x0, -40);
      ctx.quadraticCurveTo((x0 + x1)/2 - 2, (-40 + bot)/2, x1, bot + 1);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    ctx.save();                                        // 잠옷 자락
    ctx.translate(0, -32); ctx.rotate(p.flapLag * .7); ctx.translate(0, 32);
    ctx.beginPath();
    ctx.moveTo(-11, -38);
    ctx.quadraticCurveTo(-21*sp, -26, -13*sp, -9);
    ctx.quadraticCurveTo(0, -16, 13*sp, -9);
    ctx.quadraticCurveTo(21*sp, -26, 11, -38);
    ctx.closePath();
    ctx.fillStyle = pjD; ctx.fill();
    if(sp > 1.05) inked(1.4);
    ctx.restore();
  }

  // ----- 다리 -----
  // 마리오처럼 짧고 통통한 다리를 "엉덩이에서 회전"시킨다.
  // 옆으로 평행이동만 하면 다리가 벌어지기만 하고 걷는 걸로 안 보인다.
  const HIP_Y = -20, LEG_LEN = 14;
  function leg(hipX, swing){
    const ang  = swing * 0.05;                       // ±8 → 약 ±23°
    const bend = Math.max(0, -swing) * 0.55;         // 뒤로 간 다리는 무릎이 굽어 짧아진다
    const len  = LEG_LEN - bend;
    ctx.save();
    ctx.translate(hipX, HIP_Y);
    ctx.rotate(-ang);                                // 값이 +면 앞으로 뻗는다
    ctx.fillStyle = pjD;
    roundRect(-4, -2, 8, len + 2, 4); ctx.fill(); inked();
    ctx.fillStyle = pjL;                             // 발목 단
    roundRect(-4, len - 4.5, 8, 4.5, 2.2); ctx.fill(); inked(1.2);
    if(gear >= 3){                                   // 정강이 보호대
      ctx.fillStyle = '#e6fbf8';
      roundRect(-4, len - 11, 8, 7, 2.6); ctx.fill();
      ctx.strokeStyle = '#2fa79c'; ctx.lineWidth = 1.4; ctx.stroke();
    }
    // 갈색 신발 — 다리 회전을 일부만 따라가 땅과 나란하게 유지한다
    ctx.translate(0, len);
    ctx.rotate(ang * 0.8);
    ctx.fillStyle = SHOE;
    ctx.beginPath();
    ctx.moveTo(-4.6, -0.5);
    ctx.quadraticCurveTo(-5.6, 5.6, 0, 6.0);
    ctx.quadraticCurveTo(7.2, 6.2, 8.6, 3.0);        // 앞코가 앞으로 나온다
    ctx.quadraticCurveTo(8.2, -0.8, 4.4, -1);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = SHOE_D; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = SHOE_D;                          // 밑창
    ctx.beginPath();
    ctx.moveTo(-5, 3.8); ctx.quadraticCurveTo(0, 6.6, 8.4, 3.6);
    ctx.quadraticCurveTo(7.4, 6.2, 0, 6.2);
    ctx.quadraticCurveTo(-5.4, 6.0, -5, 3.8);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  leg(-5.4, po.legB);                                // 뒷다리 — 두 다리를 붙여 놓는다
  leg( 5.4, po.legF);

  // ----- 뒷팔 -----
  ctx.lineCap = 'round';
  // 앞팔과 같은 어깨 높이에서 나오게 맞춘다 (좌우 높이가 어긋나면 어색하다)
  const bShX = -10.5, bShY = -30.5;
  const bPawX = -13 - po.legF*.35, bPawY = -20 + po.legF*.3;
  ctx.strokeStyle = INK; ctx.lineWidth = 9.4;
  ctx.beginPath(); ctx.moveTo(bShX, bShY);
  ctx.quadraticCurveTo(bShX - 3.4, (bShY + bPawY)/2, bPawX, bPawY); ctx.stroke();
  ctx.strokeStyle = pjD; ctx.lineWidth = 7.2;
  ctx.beginPath(); ctx.moveTo(bShX, bShY);
  ctx.quadraticCurveTo(bShX - 3.4, (bShY + bPawY)/2, bPawX, bPawY); ctx.stroke();
  ctx.fillStyle = GLOVE;                                   // 뒷손 장갑
  ctx.beginPath(); ctx.arc(bPawX, bPawY, 4.4, 0, 6.2832); ctx.fill();
  ctx.strokeStyle = GLOVE_D; ctx.lineWidth = 1.4; ctx.stroke();

  // ----- 앞팔 ----- 몸통보다 먼저 그려서 어깨가 몸통에 가려지게 한다.
  // 팔을 몸통 위에 얹으면 이음새가 보여서 "붙여놓은 막대"처럼 보인다.
  const shX = 10.5, shY = -30.5;
  const armLen = 13;
  const pawX = shX + Math.cos(po.armRot) * armLen;
  const pawY = shY + Math.sin(po.armRot) * armLen;
  const armC = gear >= 1 ? (gear >= 3 ? '#e6fbf8' : gear >= 2 ? '#cfe7f8' : '#cfa97a') : pj;

  // 팔꿈치를 살짝 굽힌다. 곧은 막대는 몸에 얹어놓은 것처럼 보인다.
  const _dx = pawX - shX, _dy = pawY - shY;
  const _dl = Math.hypot(_dx, _dy) || 1;
  const elX = (shX + pawX)/2 - _dy/_dl * 3.4;
  const elY = (shY + pawY)/2 + _dx/_dl * 3.4;

  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = 10.6;
  ctx.beginPath(); ctx.moveTo(shX - 3, shY); ctx.quadraticCurveTo(elX, elY, pawX, pawY); ctx.stroke();
  ctx.strokeStyle = armC; ctx.lineWidth = 8.2;
  ctx.beginPath(); ctx.moveTo(shX - 3, shY); ctx.quadraticCurveTo(elX, elY, pawX, pawY); ctx.stroke();
  if(gear === 0){                              // 잠옷 소매 단
    ctx.strokeStyle = pjL; ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(elX, elY);
    ctx.quadraticCurveTo((elX+pawX)/2, (elY+pawY)/2, pawX, pawY);
    ctx.stroke();
  }

  // ----- 상의 -----
  ctx.fillStyle = pj;
  roundRect(-12, -41, 24, 22, 8); ctx.fill(); inked(1.6);
  ctx.fillStyle = pjL;                                    // 별무늬
  star(-6.5, -34, 2.2); star(5, -29.5, 1.9); star(0, -38, 1.7); star(8, -36, 1.8);
  ctx.fillStyle = pjL;                                    // 옷깃
  ctx.beginPath();
  ctx.moveTo(-8, -41); ctx.lineTo(2.5, -34); ctx.lineTo(12, -41);
  ctx.quadraticCurveTo(2.5, -37.5, -8, -41);
  ctx.closePath(); ctx.fill(); inked(1.2);
  ctx.fillStyle = pjD;                                    // 허리 — 상의보다 좁게
  roundRect(-10, -23, 20, 4.6, 2.2); ctx.fill(); inked(1.3);

  // ----- 파란 멜빵 ----- 노란 옷 위에서 몸통을 위아래로 갈라준다
  if(p.starT <= 0){
    ctx.fillStyle = OVR;
    roundRect(-7.5, -32, 15, 13, 3); ctx.fill();          // 가슴판
    ctx.strokeStyle = OVR_D; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.lineCap = 'round';                                 // 어깨끈
    ctx.strokeStyle = OVR; ctx.lineWidth = 4.2;
    ctx.beginPath(); ctx.moveTo(-5.5, -31); ctx.lineTo(-9.5, -41); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 5.5, -31); ctx.lineTo( 9.5, -41); ctx.stroke();
    ctx.fillStyle = CAP;                                   // 단추
    ctx.beginPath(); ctx.arc(-5.5, -30.5, 1.9, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc( 5.5, -30.5, 1.9, 0, 6.2832); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.28)';               // 광택
    roundRect(-6, -30.5, 4.5, 9, 2); ctx.fill();
  }

  // ----- 갑옷 -----
  if(gear >= 1){
    const pl  = gear >= 3 ? '#e6fbf8' : gear >= 2 ? '#cfe7f8' : '#cfa97a';
    const plD = gear >= 3 ? '#2fa79c' : gear >= 2 ? '#3d74b8' : '#7d6040';

    if(gear >= 2){                                        // 가슴 갑옷
      ctx.fillStyle = pl;
      roundRect(-11, -40, 22, 18, 6); ctx.fill();
      ctx.strokeStyle = plD; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = plD;
      ctx.beginPath();
      ctx.moveTo(0, -36); ctx.lineTo(5.5, -31);
      ctx.lineTo(0, -26); ctx.lineTo(-5.5, -31);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      roundRect(-8.5, -38, 5, 11, 2.5); ctx.fill();
    }
    ctx.fillStyle = pl;                                   // 어깨 보호대
    roundRect(-16.5, -42.5, 10, 10.5, 4.6); ctx.fill();
    ctx.strokeStyle = plD; ctx.lineWidth = 1.6; ctx.stroke();
    roundRect(  6.5, -42.5, 10, 10.5, 4.6); ctx.fill();
    ctx.strokeStyle = plD; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = plD;                                  // 허리띠
    roundRect(-10, -23.4, 20, 4.6, 2.2); ctx.fill();

    if(caped){                                            // 망토 걸쇠
      ctx.fillStyle = gear >= 3 ? '#ffd45c' : '#e8c14a';
      ctx.beginPath(); ctx.arc(-9, -40, 2.8, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc( 9, -40, 2.8, 0, 6.2832); ctx.fill();
    }
  }

  // ----- 머리 -----
  // 3등신을 맞추려고 머리를 작게 그린다. 얼굴 좌표는 그대로 두고 통째로 축소.
  ctx.save();
  ctx.translate(1, po.headY - 4);
  ctx.scale(0.95, 0.95);
  ctx.rotate(po.headRot);
  // 귀
  ctx.fillStyle = SKIN;
  ctx.beginPath(); ctx.ellipse(16.5, 2, 3.4, 4.6, 0, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-16.5, 2, 3.0, 4.2, 0, 0, 6.2832); ctx.fill();

  // 얼굴
  ctx.fillStyle = SKIN;
  ctx.beginPath(); ctx.arc(0, 0, 17, 0, 6.2832); ctx.fill();
  ctx.strokeStyle = 'rgba(196,140,102,.55)'; ctx.lineWidth = 1.5; ctx.stroke();

  // 머리카락 — 모자 밖으로 나온 부분만. 한 박자 늦게 따라 흔들린다.
  ctx.save(); ctx.rotate(p.hairLag * .8);
  ctx.fillStyle = HAIR;
  // 귀(±16.5, y 2)를 덮지 않게 뒤통수만 귀 위쪽에 남긴다.
  // 옆머리·구레나룻은 두지 않는다 — 귀를 가리면 금방 덥수룩해 보인다.
  ctx.beginPath(); ctx.ellipse(-14.5, -7, 4.0, 4.6, .18, 0, 6.2832); ctx.fill();
  // 모자 챙 밑으로 비져나온 앞머리
  ctx.beginPath();
  ctx.moveTo(-16.5, -5);
  ctx.quadraticCurveTo(0, -11, 16.5, -6);
  ctx.lineTo(14, -1.5); ctx.lineTo(10.5, -5.5);
  ctx.lineTo(7, -0.5);  ctx.lineTo(3.5, -5.5);
  ctx.lineTo(0, -0.5);  ctx.lineTo(-3.5, -5);
  ctx.lineTo(-7.5, -1); ctx.lineTo(-11, -5);
  ctx.lineTo(-14, -1.5);
  ctx.closePath(); ctx.fill();

  // ----- 노란 모자 -----
  ctx.fillStyle = CAP;
  ctx.beginPath();
  ctx.moveTo(-17.5, -6);
  ctx.quadraticCurveTo(-19, -18, -8, -22);
  ctx.quadraticCurveTo(0, -24.5, 9, -21.5);
  ctx.quadraticCurveTo(19, -17, 17.5, -6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = CAP_D; ctx.lineWidth = 1.6; ctx.stroke();
  // 챙 — 앞으로 길게 나온다
  ctx.fillStyle = CAP_D;
  ctx.beginPath();
  ctx.moveTo(2, -9.5);
  ctx.quadraticCurveTo(20, -13, 26.5, -7.5);
  ctx.quadraticCurveTo(20, -3.5, 2, -4.5);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = CAP;
  ctx.beginPath();
  ctx.moveTo(2, -9.5);
  ctx.quadraticCurveTo(19, -12.5, 25, -8);
  ctx.quadraticCurveTo(19, -5.5, 2, -6.5);
  ctx.closePath(); ctx.fill();
  // 앞면 동그란 마크
  ctx.fillStyle = OVR;
  ctx.beginPath(); ctx.arc(6, -14.5, 5.2, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#8fc0ff';
  ctx.beginPath(); ctx.arc(6, -14.5, 2.6, 0, 6.2832); ctx.fill();
  // 모자 윤기
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath(); ctx.ellipse(-5, -17, 6, 2.6, -.35, 0, 6.2832); ctx.fill();
  ctx.restore();

  // 눈
  const closed = po.eye === 1 || p.blinkT < 0;
  ctx.fillStyle = '#2b2320'; ctx.strokeStyle = '#2b2320';
  if(po.eye === 2){                       // 아플 때 >_<
    ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo( 4, 2); ctx.lineTo(12, 9); ctx.moveTo(12, 2); ctx.lineTo( 4, 9);
    ctx.moveTo(-11, 2); ctx.lineTo(-4, 9); ctx.moveTo(-4, 2); ctx.lineTo(-11, 9);
    ctx.stroke();
  } else if(closed){                      // 깜빡임 / 웃는 눈
    ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(3.5, 6); ctx.quadraticCurveTo(8, 1.5, 12.5, 6);
    ctx.moveTo(-12, 6); ctx.quadraticCurveTo(-8, 1.5, -4, 6);
    ctx.stroke();
  } else {
    ctx.beginPath(); ctx.ellipse( 8, 4.5, 4.8, 6.2, 0, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-8, 4.5, 4.4, 5.8, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc( 9.8, 2.2, 2.0, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(-6.6, 2.2, 1.7, 0, 6.2832); ctx.fill();
  }

  // 볼터치 · 입
  ctx.fillStyle = 'rgba(255,140,150,.42)';
  ctx.beginPath(); ctx.ellipse(13, 11, 4.4, 2.8, 0, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-12, 11, 4.0, 2.6, 0, 0, 6.2832); ctx.fill();
  ctx.strokeStyle = '#7a4a3a'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath();
  if(po.eye === 2) ctx.arc(1, 13.5, 3.2, Math.PI, 0);        // 아플 땐 찡그린 입
  else ctx.arc(1, 11, 3.4, 0.25, Math.PI - 0.25);
  ctx.stroke();

  ctx.restore();   // 머리

  // ----- 손 + 무기 ----- 팔은 위에서 몸통 뒤에 그렸고, 여기선 앞으로 나오는 것만 그린다
  drawHeldWeapon(pawX, pawY, shX, shY);

  // 주먹은 무기 위에 — 손으로 자루를 쥐고 있는 게 보여야 한다
  ctx.fillStyle = GLOVE;
  ctx.beginPath(); ctx.arc(pawX, pawY, 5.6, 0, 6.2832); ctx.fill();
  ctx.strokeStyle = GLOVE_D; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = GLOVE_D; ctx.lineWidth = 1.3;          // 손등 주름
  ctx.beginPath();
  ctx.arc(pawX - Math.cos(po.armRot)*1.4, pawY - Math.sin(po.armRot)*1.4, 3.4,
          po.armRot - 1.1, po.armRot + 1.1);
  ctx.stroke();

  ctx.restore();   // 몸통 그룹
  ctx.restore();
}

// 잠옷의 작은 별무늬
function star(x, y, r){
  ctx.beginPath();
  for(let i = 0; i < 4; i++){
    const a = i * Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.quadraticCurveTo(x, y, x + Math.cos(a + Math.PI/4) * r * .34,
                               y + Math.sin(a + Math.PI/4) * r * .34);
  }
  ctx.closePath(); ctx.fill();
}

// 손에 든 무기 — 위치는 손(paw), 각도는 p.weaponAng
function drawHeldWeapon(pawX, pawY, shX, shY){
  const p = player;
  const id = WEAPONS[p.weapon].id;
  const ang = p.weaponAng;
  const prog = p.weaponProg;

  if(id === 'sword'){
    const st = SWORD_COMBO[p.combo];
    const honey = p.honeyT > 0;                 // 🍯 먹으면 금빛으로 빛난다
    const tier = tierOf(0);
    const lv = lvOf(0);
    const len = 25 + lv * 4;                    // 단계가 오르면 길어진다

    ctx.save();
    ctx.translate(pawX, pawY);
    ctx.rotate(ang);
    if(p.combo === 2) ctx.scale(1.24, 1.24);
    if(honey){ ctx.shadowColor = 'rgba(255,190,60,.95)'; ctx.shadowBlur = 14; }
    else if(tier.glow){ ctx.shadowColor = tier.glow; ctx.shadowBlur = 12; }

    // 자루 — 손(원점) 뒤에서 시작해 x=len 에서 끝난다
    ctx.fillStyle = tier.grip;
    roundRect(-9, -3.2, len + 9, 6.4, 3.2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    roundRect(-6, -2.2, Math.max(2, len + 2), 2.0, 1.0); ctx.fill();

    // 곡괭이 머리 — 자루 끝에서 양쪽으로 휘어 나와 뾰족하게 끝난다.
    // 끝이 자루 쪽(뒤)을 향해야 곡괭이로 읽힌다. 둥근 끝으로 하면 갈고리가 된다.
    ctx.beginPath();
    ctx.moveTo(len - 12, -16.5);                          // 위 갈래 뾰족한 끝
    ctx.quadraticCurveTo(len + 3.5, -11.5, len + 6.5, 0); // 앞쪽 바깥선
    ctx.quadraticCurveTo(len + 3.5, 11.5, len - 12, 16.5);// 아래 갈래 뾰족한 끝
    ctx.lineTo(len - 8.5, 10.5);                          // 아래 갈래 안쪽
    ctx.quadraticCurveTo(len - 1.5, 6, len - 1.5, 0);     // 자루를 감싸는 안쪽 곡선
    ctx.quadraticCurveTo(len - 1.5, -6, len - 8.5, -10.5);
    ctx.closePath();
    ctx.fillStyle = tier.blade; ctx.fill();
    ctx.strokeStyle = tier.edge; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.stroke();
    // 자루와 머리를 잇는 쇠테
    ctx.fillStyle = tier.edge;
    roundRect(len - 9, -4.2, 8, 8.4, 2.4); ctx.fill();
    // 날의 반짝임
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath();
    ctx.moveTo(len - 9, -13); ctx.quadraticCurveTo(len + 1, -9, len + 3, -3);
    ctx.lineTo(len + 0.5, -3); ctx.quadraticCurveTo(len - 2, -8, len - 9, -11);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // 휘두른 자국 — 지나간 만큼만 남는다
    if(prog >= .16 && prog < .70){
      const finisher = p.combo === 2 || honey;
      const fade = 1 - (prog - .16)/.54;
      const way = Math.sign(st.arc[1] - st.arc[0]) || 1;
      const tail = ang - .9 * way;
      ctx.save();
      ctx.globalAlpha = fade * (finisher ? .95 : .8);
      ctx.lineCap = 'round';
      ctx.strokeStyle = finisher ? '#fff1b8' : '#e8f6ff';
      ctx.lineWidth = finisher ? 15 : 9;
      ctx.beginPath();
      ctx.arc(shX, shY, finisher ? 64 : 50, Math.min(ang, tail), Math.max(ang, tail));
      ctx.stroke();
      ctx.globalAlpha *= .7;
      ctx.strokeStyle = finisher ? '#ff9f43' : (tier.glow ? '#6ef0e4' : '#7ab8ff');
      ctx.lineWidth = finisher ? 5.5 : 3.5;
      ctx.stroke();
      ctx.restore();
    }
    return;
  }

  if(id === 'shield'){
    ctx.save();
    ctx.translate(pawX, pawY);
    ctx.rotate(ang * .6);
    if(p.blocking || p.blockGlow > 0){
      ctx.shadowColor = 'rgba(255,240,160,.95)';
      ctx.shadowBlur = 16 + (p.blockGlow > 0 ? 14 : 0);
    }
    const tierS = tierOf(1);
    if(tierS.glow && !p.blocking){ ctx.shadowColor = tierS.glow; ctx.shadowBlur = 10; }
    const grow = lvOf(1) * 1.4;                 // 단계가 오르면 조금 더 큼직해진다
    ctx.fillStyle = tierS.shieldRim;
    ctx.beginPath(); ctx.ellipse(6, 0, 11+grow, 17+grow, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = tierS.shield;
    ctx.beginPath(); ctx.ellipse(5, 0, 8.5+grow, 14+grow, 0, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = tierS.shieldRim; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(5,-13); ctx.lineTo(5,13); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5,-6); ctx.lineTo(10,-10); ctx.moveTo(5,1); ctx.lineTo(10,-3);
    ctx.moveTo(5,-6); ctx.lineTo(0,-10);  ctx.moveTo(5,1); ctx.lineTo(0,-3);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // 도토리 — 던지기 직전까지만 손에 들려 있다
  if(prog < 0 || prog < .28){
    ctx.save();
    ctx.translate(pawX, pawY);
    ctx.rotate(ang);
    drawAcorn(4, 0, 1, lvOf(2));
    ctx.restore();
  }
}

function drawAcorn(x, y, s, lv){
  const t = TIERS[lv === undefined ? 0 : lv];
  ctx.save();
  ctx.translate(x, y); ctx.scale(s * (1 + (lv||0) * .12), s * (1 + (lv||0) * .12));
  if(t.glow){ ctx.shadowColor = t.glow; ctx.shadowBlur = 9; }
  ctx.fillStyle = t.nut;
  ctx.beginPath(); ctx.ellipse(0, 2, 7, 8.5, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = t.nutCap;
  roundRect(-8, -7, 16, 7, 3); ctx.fill();
  ctx.fillStyle = t.nutCap;
  roundRect(-1.6, -12, 3.2, 6, 1.6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.beginPath(); ctx.ellipse(-2.4, 2, 2, 3, -.4, 0, 6.2832); ctx.fill();
  ctx.restore();
}

// 대시 잔상 — 실루엣만 옅게
function drawGhost(g){
  ctx.save();
  ctx.globalAlpha = clamp(g.life / g.max, 0, 1) * .4;
  ctx.translate(g.x + 22, g.y + 46);
  ctx.scale(g.facing, 1);
  ctx.fillStyle = '#ffeaa8';
  roundRect(-11, -22, 10, 17, 4.5); ctx.fill();     // 다리
  roundRect(1, -22, 10, 17, 4.5); ctx.fill();
  roundRect(-15, -38, 30, 20, 9); ctx.fill();       // 상의
  ctx.fillStyle = '#ffd9a0';
  ctx.beginPath(); ctx.arc(1, -44, 17, 0, 6.2832); ctx.fill();   // 머리
  ctx.restore();
}
