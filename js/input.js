// 키보드 / 터치 입력과 무기 핫바
// 로드 순서 9/10 · 의존: core, player
'use strict';

// ---------- 입력 ----------
const keys = Object.create(null);
const input = { left:false, right:false, jump:false, jumpPressed:false,
                attack:false, attackPressed:false, dash:false, dashPressed:false };

const KEYMAP = {
  ArrowLeft:'left', KeyA:'left',
  ArrowRight:'right', KeyD:'right',
  ArrowUp:'jump', KeyW:'jump',
  Space:'attack', KeyZ:'attack', KeyX:'attack', KeyJ:'attack', KeyK:'attack', Enter:'attack',
  ShiftLeft:'dash', ShiftRight:'dash',
};

window.addEventListener('keydown', e=>{
  if(e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3'){
    selectWeapon(+e.code.slice(5) - 1); e.preventDefault(); return;
  }
  if(e.code === 'KeyQ'){ selectWeapon((player.weapon+2)%3); return; }
  if(e.code === 'KeyE'){ selectWeapon((player.weapon+1)%3); return; }
  const act = KEYMAP[e.code];
  if(!act) return;
  e.preventDefault();
  if(!keys[e.code]){
    keys[e.code] = true;
    if(act === 'jump') input.jumpPressed = true;
    if(act === 'attack') input.attackPressed = true;
    if(act === 'dash') input.dashPressed = true;
  }
  input[act] = true;
  if(state === 'title') startGame();
  else if((state === 'over' || state === 'clear') && performance.now() - overAt > 800) startGame();
});
window.addEventListener('keyup', e=>{
  const act = KEYMAP[e.code];
  if(!act) return;
  keys[e.code] = false;
  // 같은 동작에 매핑된 다른 키가 아직 눌려있는지 확인
  input[act] = Object.keys(KEYMAP).some(k => KEYMAP[k] === act && keys[k]);
});

// 터치 버튼
const touchLayer = document.getElementById('touch');
if(window.matchMedia('(pointer: coarse)').matches) touchLayer.classList.add('show');
const lastTap = {};
touchLayer.querySelectorAll('.btn').forEach(btn=>{
  const act = btn.dataset.act;
  const on = e=>{
    e.preventDefault();
    btn.classList.add('down');
    if(!input[act]){
      if(act === 'jump') input.jumpPressed = true;
      if(act === 'attack') input.attackPressed = true;
      // 방향 버튼을 빠르게 두 번 누르면 대시
      if(act === 'left' || act === 'right'){
        const now = performance.now();
        if(now - (lastTap[act] || 0) < 300) input.dashPressed = true;
        lastTap[act] = now;
      }
    }
    input[act] = true;
    audioUnlock();
  };
  const off = e=>{ e.preventDefault(); btn.classList.remove('down'); input[act] = false; };
  btn.addEventListener('pointerdown', on);
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointercancel', off);
  btn.addEventListener('pointerleave', off);
});

// 캔버스(게임 화면) 클릭/탭 = 공격 — 마우스만으로도 놀 수 있게
cv.addEventListener('pointerdown', e=>{
  e.preventDefault();
  audioUnlock();
  if(state === 'title'){ startGame(); return; }
  if(state !== 'play') return;
  input.attackPressed = true;
  input.attack = true;
});
cv.addEventListener('pointerup', ()=>{ input.attack = false; });
cv.addEventListener('pointercancel', ()=>{ input.attack = false; });

// ---------- 핫바 UI ----------
const hotbarEl = document.getElementById('hotbar');
WEAPONS.forEach((w,i)=>{
  const el = document.createElement('div');
  el.className = 'slot';
  el.innerHTML = '<span class="key">'+(i+1)+'</span>'
               + '<span class="tier"></span>'
               + '<span class="ico">'+w.ico+'</span>'
               + '<span class="nm">'+w.name+'</span>';
  el.addEventListener('pointerdown', e=>{ e.preventDefault(); selectWeapon(i); audioUnlock(); });
  hotbarEl.appendChild(el);
});
function selectWeapon(i){
  if(!player || i < 0 || i >= WEAPONS.length || player.weapon === i) return;
  player.weapon = i;
  player.blocking = false;
  player.atk = 0;
  player.combo = 0; player.comboT = 0;
  syncHotbar();
  sfx('swap');
}
function syncHotbar(){
  if(!player) return;
  [...hotbarEl.children].forEach((el, i)=>{
    el.classList.toggle('on', player.weapon === i);
    const lv = player.weaponLv[i];
    el.classList.toggle('lv1', lv === 1);
    el.classList.toggle('lv2', lv === 2);
    // 강화된 무기는 이름 앞에 단계 표시가 붙는다
    el.querySelector('.tier').textContent = lv > 0 ? TIERS[lv].chip : '';
    el.querySelector('.nm').textContent = (lv > 0 ? TIERS[lv].short : '') + WEAPONS[i].name;
  });
}
