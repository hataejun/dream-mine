// 타격 이펙트 — 입자 · 충격파 링 · 화면 펀치 · 떠오르는 숫자
// 로드 순서 2/11 · 의존: core
'use strict';

function spawnParticles(x, y, n, color, opts){
  if(REDUCED) n = Math.min(n, 3);
  const o = opts || {};
  for(let i=0;i<n;i++){
    particles.push({
      x, y,
      vx: rand(-(o.spread||150), o.spread||150),
      vy: rand(-(o.up||220), 40),
      life: rand(.3, o.life||.7), max: .7,
      size: rand(3, o.size||8),
      color, grav: o.grav===undefined ? 900 : o.grav,
      spin: rand(-8,8), rot: rand(0,6.28),
      shape: o.shape || 'circle',
    });
  }
}

function addRing(x, y, maxR, color, width){
  if(REDUCED) return;
  rings.push({ x, y, r:7, maxR, life:.26, max:.26, color, width: width || 6 });
}
function addPunch(x, y){ punch.x = x; punch.y = y; punch.t = .12; }

function floatText(x, y, text, color){
  floaters.push({ x, y, text, color:color||'#fff', life:.9 });
}

// ---------- 수명 관리 ----------
function updateFx(dt){
  // --- 입자/텍스트 ---
  for(const pa of particles){
    pa.life -= dt;
    pa.vy += pa.grav * dt;
    pa.x += pa.vx * dt; pa.y += pa.vy * dt;
    pa.rot += pa.spin * dt;
  }
  particles = particles.filter(p2=>p2.life > 0);
  for(const r of rings){ r.life -= dt; r.r += (r.maxR - r.r) * Math.min(1, dt*16); }
  rings = rings.filter(r=>r.life > 0);
  for(const g of ghosts) g.life -= dt;
  ghosts = ghosts.filter(g=>g.life > 0);
  punch.t = Math.max(0, punch.t - dt);
  for(const f of floaters){ f.life -= dt; f.y -= 34 * dt; }
  floaters = floaters.filter(f=>f.life > 0);
}
