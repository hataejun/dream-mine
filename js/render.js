// 배경 · 지형 · 화면 합성
// 로드 순서 9/11 · 의존: core, stage
'use strict';

/* ============================================================
   그리기
   ============================================================ */

// ---------- 배경 (별의커비 톤: 파스텔 + 둥근 언덕) ----------
// 뒤쪽 레이어일수록 천천히 흐른다 = 시차(parallax). 옆으로 걷는 느낌은 여기서 나온다.
const clouds = [];
for(let i=0;i<7;i++) clouds.push({ x:rand(0,1400), y:rand(40,200), s:rand(.6,1.3), v:rand(4,12) });

// 같은 무늬를 월드 전체에 반복해서 깔아주는 도우미
function layer(factor, period, drawFn){
  const shift = cam.x * factor;
  const k0 = Math.floor((shift - period) / period);
  const k1 = Math.ceil((shift + W + period) / period);
  for(let k = k0; k <= k1; k++) drawFn(k * period - shift, k);
}

function drawBackground(dt){
  const g = ctx.createLinearGradient(0,0,0,GROUND_Y);
  g.addColorStop(0, '#7fc9f2');
  g.addColorStop(.55, '#a9e2f7');
  g.addColorStop(1, '#d9f4e4');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

  // 해 — 아주 멀리 있으므로 거의 안 움직인다
  const sunX = 830 - cam.x * .04;
  ctx.save();
  ctx.globalAlpha = .5; ctx.fillStyle = '#fff6c9';
  ctx.beginPath(); ctx.arc(sunX, 82, 62, 0, 6.2832); ctx.fill();
  ctx.globalAlpha = 1; ctx.fillStyle = '#fff3ae';
  ctx.beginPath(); ctx.arc(sunX, 82, 38, 0, 6.2832); ctx.fill();
  ctx.restore();

  // 가장 먼 산자락 — Kenney 실루엣. 못 불러왔으면 그냥 건너뛴다(아래 언덕만으로도 그림이 된다).
  if(imgReady('bg')){
    const im = IMG.bg;
    // 원본 위쪽은 그 그림 자체의 하늘이라 잘라낸다. 안 자르면 우리 하늘 위에
    // 색이 다른 가로 띠가 생긴다.
    const sy = 150, sh = im.naturalHeight - sy;
    const bh = 210;
    const bw = im.naturalWidth * (bh / sh);
    const by = GROUND_Y - 25 - bh;
    layer(.15, bw, x => ctx.drawImage(im, 0, sy, im.naturalWidth, sh, x, by, bw, bh));
    // 잘린 윗변을 하늘색으로 부드럽게 덮어 경계를 지운다
    const fade = ctx.createLinearGradient(0, by, 0, by + 58);
    fade.addColorStop(0, '#a2def6');
    fade.addColorStop(1, 'rgba(162,222,246,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, by, W, 58);
  }

  // 구름
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  const span = W + 280;
  for(const c of clouds){
    if(!REDUCED) c.x += c.v * dt;
    const x = ((c.x - cam.x * .12) % span + span) % span - 140;
    ctx.save(); ctx.translate(x, c.y); ctx.scale(c.s, c.s);
    ctx.beginPath();
    ctx.arc(0,0,24,0,6.2832); ctx.arc(26,-8,30,0,6.2832);
    ctx.arc(56,2,22,0,6.2832); ctx.arc(28,14,26,0,6.2832);
    ctx.fill();
    ctx.restore();
  }

  // 먼 언덕
  ctx.fillStyle = '#a8dfae';
  layer(.30, 560, x=>{ hill(x+140, GROUND_Y+10, 240, 132); hill(x+420, GROUND_Y+10, 195, 104); });
  // 가까운 언덕
  ctx.fillStyle = '#8ed49a';
  layer(.55, 430, x=>{ hill(x+90, GROUND_Y+12, 205, 92); hill(x+310, GROUND_Y+12, 168, 74); });
  // 나무
  layer(.85, 350, (x,k)=>{
    tree(x+60,  GROUND_Y+6, .92);
    tree(x+225, GROUND_Y+6, (k % 3 === 0) ? .66 : .78);
  });
}
function hill(cx, baseY, rx, ry){
  ctx.beginPath();
  ctx.ellipse(cx, baseY, rx, ry, 0, Math.PI, 0);
  ctx.fill();
}
function tree(x, baseY, s){
  ctx.save(); ctx.translate(x, baseY); ctx.scale(s, s);
  ctx.fillStyle = '#b07a4e';
  ctx.fillRect(-9, -66, 18, 66);
  ctx.fillStyle = '#6ec37d';
  ctx.beginPath();
  ctx.arc(0, -86, 42, 0, 6.2832);
  ctx.arc(-32, -68, 28, 0, 6.2832);
  ctx.arc(32, -68, 28, 0, 6.2832);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.beginPath(); ctx.arc(-12, -100, 16, 0, 6.2832); ctx.fill();
  ctx.restore();
}

// ---------- 지형 ----------
// 카메라에 보이는 범위만 그린다 (월드가 4400px라 전부 그리면 낭비)
function drawPlatforms(){
  const l = cam.x - 40, r = cam.x + W + 40;

  // 타일을 못 불러오면 예전처럼 색으로 칠한다 — 화면이 비지 않게
  const tiled = imgReady('grassMid') && imgReady('grassCenter');

  if(tiled){
    // 땅 — 타일 격자를 월드 좌표에 고정해야 카메라가 움직여도 타일이 흐르지 않는다
    const k0 = Math.floor(l / TS), k1 = Math.ceil(r / TS);
    for(let k = k0; k <= k1; k++){
      const x = k * TS;
      ctx.drawImage(IMG.grassMid, x, GROUND_Y, TS + .5, TS + .5);
      for(let y = GROUND_Y + TS; y < H; y += TS){
        ctx.drawImage(IMG.grassCenter, x, y, TS + .5, TS + .5);
      }
    }
  } else {
    ctx.fillStyle = '#7cc98a'; ctx.fillRect(l, GROUND_Y, r-l, H-GROUND_Y);
    ctx.fillStyle = '#95dc9f'; ctx.fillRect(l, GROUND_Y, r-l, 14);
    ctx.fillStyle = '#b3825a'; ctx.fillRect(l, GROUND_Y+30, r-l, H-GROUND_Y-30);
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    const step = 97;
    for(let k = Math.floor(l/step); k <= Math.ceil(r/step); k++){
      const x = k * step;
      ctx.beginPath();
      ctx.arc(x, GROUND_Y + 42 + (((k*53) % 26 + 26) % 26), 3 + (((k % 3) + 3) % 3), 0, 6.2832);
      ctx.fill();
    }
  }

  // 솔리드 블록 (언덕 덩어리) — 윗줄은 잔디, 아래는 흙. 양 끝은 가장자리 타일로.
  for(const b of STAGE.blocks){
    if(b.x + b.w < l || b.x > r) continue;
    if(tiled){
      const cols = Math.max(1, Math.round(b.w / TS));
      const rows = Math.max(1, Math.round(b.h / TS));
      const cw = b.w / cols, ch = b.h / rows;
      for(let c = 0; c < cols; c++){
        const edge = cols === 1 ? 'Mid' : c === 0 ? 'Left' : c === cols-1 ? 'Right' : 'Mid';
        for(let y = 0; y < rows; y++){
          const key = y === 0 ? 'grass' + edge
                    : edge === 'Mid' ? 'grassCenter' : 'grassCliff' + edge;
          ctx.drawImage(IMG[key], b.x + c*cw, b.y + y*ch, cw + .5, ch + .5);
        }
      }
    } else {
      ctx.fillStyle = '#b3825a'; roundRect(b.x, b.y, b.w, b.h, 8); ctx.fill();
      ctx.fillStyle = '#8ed49a'; roundRect(b.x, b.y, b.w, 18, 8); ctx.fill();
      ctx.fillStyle = '#a9e6b2'; roundRect(b.x, b.y, b.w, 9, 7); ctx.fill();
    }
  }

  // 떠 있는 발판 — grassHalf* 는 위쪽 절반만 채워진 얇은 발판용 타일이다
  const halfTiled = tiled && imgReady('grassHalfMid');
  for(const p of STAGE.plats){
    if(p.x + p.w < l || p.x > r) continue;
    if(halfTiled){
      const cols = Math.max(1, Math.round(p.w / TS));
      const cw = p.w / cols;
      for(let c = 0; c < cols; c++){
        const edge = cols === 1 ? 'Mid' : c === 0 ? 'Left' : c === cols-1 ? 'Right' : 'Mid';
        ctx.drawImage(IMG['grassHalf' + edge], p.x + c*cw, p.y - 1, cw + .5, 42);
      }
    } else {
      roundRect(p.x, p.y, p.w, 28, 9); ctx.fillStyle = '#b3825a'; ctx.fill();
      roundRect(p.x, p.y, p.w, 20, 9); ctx.fillStyle = '#8ed49a'; ctx.fill();
      roundRect(p.x, p.y, p.w, 10, 8); ctx.fillStyle = '#a9e6b2'; ctx.fill();
    }
  }

  // 보스 아레나 입구 — 들어가면 덩굴이 내려와 닫힌다
  if(phase === 'boss'){
    const gx = STAGE.arena.l - 26;
    ctx.fillStyle = '#6b8f4e';
    ctx.fillRect(gx, 0, 26, H);
    ctx.fillStyle = '#84ab63';
    for(let y = 0; y < H; y += 46){
      ctx.beginPath(); ctx.ellipse(gx+13, y+23, 15, 20, 0, 0, 6.2832); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,.15)';
    ctx.fillRect(gx+22, 0, 4, H);
  }
}
function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

// ---------- 프레임 ----------
function draw(dt){
  ctx.save();
  let ox = 0, oy = 0;
  if(!REDUCED){
    if(shake > 0.4){ ox += rand(-shake,shake)*0.5; oy += rand(-shake,shake)*0.5; }
    // 때린 방향으로 화면을 툭 밀어준다
    if(punch.t > 0){ const k = punch.t/.12; ox += punch.x*k; oy += punch.y*k; }
  }
  if(ox || oy) ctx.translate(ox, oy);

  drawBackground(dt);            // 배경은 스스로 시차를 적용한다

  // ===== 여기부터 월드 좌표 — 카메라만큼 밀어서 그린다 =====
  ctx.save();
  ctx.translate(-Math.round(cam.x), 0);

  drawPlatforms();

  // 아이템
  const vl = cam.x - 60, vr = cam.x + W + 60;
  for(const it of pickups){
    if(it.x < vl || it.x > vr) continue;
    const blink = !it.fixed && it.life < 3 && Math.floor(it.life*8)%2 === 0;
    if(blink) continue;
    ctx.save();
    ctx.translate(it.x+11, it.y+11 + (it.fixed ? Math.sin(it.t*3)*3 : 0));
    ctx.scale(1 + Math.sin(it.t*6)*0.08, 1 - Math.sin(it.t*6)*0.08);
    const def = ITEM_DEF[it.kind] || ITEM_DEF.acorn;
    if(def.dur || it.kind === 'mushroom'){
      // 힘을 주는 아이템은 은은하게 빛난다 — 멀리서도 "저건 좋은 것"이 보이게
      ctx.save();
      ctx.globalAlpha = .55 + Math.sin(it.t * 4) * .2;
      const r = 22 + Math.sin(it.t * 4) * 2;
      const gl = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
      gl.addColorStop(0, def.tint);
      gl.addColorStop(.45, def.tint + '88');
      gl.addColorStop(1, def.tint + '00');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
    if(it.kind === 'acorn'){
      drawAcorn(0, 0, 1.25);
    } else {
      ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(def.emoji, 0, 1);
    }
    ctx.restore();
  }

  for(const e of enemies){
    if(e.x + e.w < vl || e.x > vr) continue;
    drawEnemy(e);
  }
  if(boss) drawBoss();

  // 날아가는 도토리
  for(const s of shots){
    ctx.save(); ctx.translate(s.x+7, s.y+7); ctx.rotate(s.rot);
    drawAcorn(0, 0, 1.05, s.foe ? 0 : (s.lv || 0));
    ctx.restore();
  }

  for(const g of ghosts) drawGhost(g);
  drawHero();

  // 타격 충격파
  for(const r of rings){
    const a = clamp(r.life / r.max, 0, 1);
    ctx.save();
    ctx.globalAlpha = a * .9;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = Math.max(1, r.width * a);
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.2832); ctx.stroke();
    ctx.restore();
  }

  // 입자
  for(const pa of particles){
    const a = clamp(pa.life / pa.max, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(pa.x, pa.y); ctx.rotate(pa.rot);
    ctx.fillStyle = pa.color;
    ctx.beginPath(); ctx.arc(0, 0, pa.size * (0.4 + a*0.6), 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  // 점수 텍스트
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for(const f of floaters){
    ctx.save();
    ctx.globalAlpha = clamp(f.life/0.9, 0, 1);
    ctx.font = '800 20px ' + getComputedStyle(document.body).fontFamily;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(59,42,30,.55)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }

  ctx.restore();   // 월드 좌표 끝
  ctx.restore();
}
