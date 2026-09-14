// 스테이지 데이터 — 이 파일은 손으로 고치지 않는다.
// stage/stage1.tmj 를 Tiled로 편집한 뒤 아래 명령으로 다시 만든다:
//   node tools/tiled-to-stage.js
// 로드 순서 6/11 · 의존: 없음 (순수 데이터)
'use strict';

const STAGE = {
  width: 4400,
  bossAt: 3700,                  // 이 지점을 넘으면 보스전 시작
  arena:  { l: 3540, r: 4400 },     // 보스 아레나 (카메라·플레이어가 갇힌다)

  plats: [
    { x:300, y:344, w:170 },
    { x:560, y:292, w:150 },
    { x:1230, y:300, w:150 },
    { x:1460, y:244, w:140 },
    { x:1700, y:330, w:130 },
    { x:1900, y:272, w:130 },
    { x:2110, y:218, w:130 },
    { x:2330, y:280, w:150 },
    { x:2700, y:330, w:160 },
    { x:2960, y:300, w:140 },
    { x:3180, y:336, w:140 },
    { x:3360, y:276, w:140 },
    { x:3660, y:300, w:150 },
    { x:4080, y:300, w:150 },
  ],
  blocks: [
    { x:900, y:382, w:130, h:60 },
    { x:1030, y:330, w:130, h:112 },
    { x:2480, y:382, w:110, h:60 },
    { x:3040, y:382, w:120, h:60 },
  ],

  // 카메라가 가까이 오면 깨어난다
  enemies: [
    { type:'chestnut', x:520 },
    { type:'chestnut', x:760 },
    { type:'chestnut', x:1120 },
    { type:'hopper', x:1330 },
    { type:'hopper', x:1560 },
    { type:'flyer', x:1820 },
    { type:'flyer', x:2060 },
    { type:'chestnut', x:2250 },
    { type:'hopper', x:2420 },
    { type:'chestnut', x:2620 },
    { type:'chestnut', x:2780 },
    { type:'flyer', x:2900 },
    { type:'hopper', x:3080 },
    { type:'chestnut', x:3240 },
    { type:'flyer', x:3420 },
    { type:'chestnut', x:3480 },
  ],

  items: [
    { kind:'acorn', x:330, y:300 },
    { kind:'acorn', x:600, y:250 },
    { kind:'mushroom', x:640, y:250 },
    { kind:'gem', x:1180, y:380 },
    { kind:'acorn', x:1265, y:256 },
    { kind:'acorn', x:1500, y:200 },
    { kind:'leaf', x:1690, y:286 },
    { kind:'acorn', x:1740, y:286 },
    { kind:'acorn', x:1940, y:228 },
    { kind:'acorn', x:2150, y:174 },
    { kind:'gem', x:2200, y:174 },
    { kind:'acorn', x:2370, y:236 },
    { kind:'heart', x:2530, y:330 },
    { kind:'honey', x:2610, y:380 },
    { kind:'acorn', x:2740, y:286 },
    { kind:'gem', x:2900, y:380 },
    { kind:'acorn', x:3000, y:256 },
    { kind:'acorn', x:3220, y:292 },
    { kind:'mushroom', x:3300, y:232 },
    { kind:'gem', x:3380, y:232 },
    { kind:'acorn', x:3400, y:232 },
    { kind:'heart', x:3450, y:380 },
    { kind:'armor', x:3470, y:300 },
    { kind:'star', x:3510, y:380 },
  ],
};
