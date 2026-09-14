#!/usr/bin/env node
// stage/stage1.tmj  →  js/stage-data.js
//
// Tiled에서 스테이지를 고친 뒤 이걸 돌리면 게임이 쓰는 데이터로 바뀐다.
// 빌드 도구가 아니라 "한 번 돌리고 마는 변환기"다 — 결과물(js/stage-data.js)을
// 저장소에 그대로 커밋하므로, 게임은 여전히 스크립트 태그만으로 돌아간다.
//
//   node tools/tiled-to-stage.js
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src  = path.join(root, 'stage/stage1.tmj');
const dst  = path.join(root, 'js/stage-data.js');

const map = JSON.parse(fs.readFileSync(src, 'utf8'));

// Tiled 버전에 따라 class / type 어느 쪽이든 올 수 있다
const clsOf = o => o.class || o.type || '';
const propOf = (o, name) => {
  const p = (o.properties || []).find(v => v.name === name);
  return p ? p.value : undefined;
};
const mapProp = (name, fallback) => {
  const p = (map.properties || []).find(v => v.name === name);
  return p ? p.value : fallback;
};
const layerOf = name => (map.layers.find(l => l.name === name) || { objects: [] }).objects;

const r = n => Math.round(n);

const plats = layerOf('plats')
  .filter(o => !o.point)
  .map(o => ({ x: r(o.x), y: r(o.y), w: r(o.width) }))
  .sort((a, b) => a.x - b.x);

const blocks = layerOf('blocks')
  .filter(o => !o.point)
  .map(o => ({ x: r(o.x), y: r(o.y), w: r(o.width), h: r(o.height) }))
  .sort((a, b) => a.x - b.x);

const enemies = layerOf('enemies')
  .map(o => ({ type: propOf(o, 'kind') || o.name, x: r(o.x) }))
  .filter(e => e.type)
  .sort((a, b) => a.x - b.x);

const items = layerOf('items')
  .map(o => ({ kind: propOf(o, 'kind') || o.name, x: r(o.x), y: r(o.y) }))
  .filter(i => i.kind)
  .sort((a, b) => a.x - b.x);

// ---- 검증 ---- 잘못된 스테이지를 조용히 커밋하지 않도록 여기서 막는다
const width  = mapProp('width', map.width * map.tilewidth);
const bossAt = mapProp('bossAt', Math.round(width * 0.84));
const arenaL = mapProp('arenaL', Math.round(width * 0.80));
const arenaR = mapProp('arenaR', width);
const problems = [];
const KINDS = ['acorn','heart','mushroom','star','honey','leaf','gem','armor'];
const TYPES = ['chestnut','hopper','flyer'];
if(!(arenaL < bossAt && bossAt < arenaR)) problems.push(`보스 지점(${bossAt})이 아레나(${arenaL}~${arenaR}) 안에 있어야 합니다`);
if(arenaR > width) problems.push(`아레나 오른쪽(${arenaR})이 월드 폭(${width})을 넘습니다`);
for(const e of enemies) if(!TYPES.includes(e.type)) problems.push(`모르는 적 종류: ${e.type}`);
for(const i of items)   if(!KINDS.includes(i.kind)) problems.push(`모르는 아이템 종류: ${i.kind}`);
for(const p of plats)   if(p.x < 0 || p.x + p.w > width) problems.push(`발판이 월드 밖으로 나갑니다 (x=${p.x})`);
if(problems.length){
  console.error('❌ 스테이지에 문제가 있습니다:');
  for(const m of problems) console.error('  · ' + m);
  process.exit(1);
}

const fmt = (arr, f) => arr.length ? '\n    ' + arr.map(f).join('\n    ') + '\n  ' : '';

const out = `// 스테이지 데이터 — 이 파일은 손으로 고치지 않는다.
// stage/stage1.tmj 를 Tiled로 편집한 뒤 아래 명령으로 다시 만든다:
//   node tools/tiled-to-stage.js
// 로드 순서 6/11 · 의존: 없음 (순수 데이터)
'use strict';

const STAGE = {
  width: ${width},
  bossAt: ${bossAt},                  // 이 지점을 넘으면 보스전 시작
  arena:  { l: ${arenaL}, r: ${arenaR} },     // 보스 아레나 (카메라·플레이어가 갇힌다)

  plats: [${fmt(plats, p => `{ x:${p.x}, y:${p.y}, w:${p.w} },`)}],
  blocks: [${fmt(blocks, b => `{ x:${b.x}, y:${b.y}, w:${b.w}, h:${b.h} },`)}],

  // 카메라가 가까이 오면 깨어난다
  enemies: [${fmt(enemies, e => `{ type:'${e.type}', x:${e.x} },`)}],

  items: [${fmt(items, i => `{ kind:'${i.kind}', x:${i.x}, y:${i.y} },`)}],
};
`;

fs.writeFileSync(dst, out);
console.log('만들었습니다:', path.relative(root, dst));
console.log(`  발판 ${plats.length} · 블록 ${blocks.length} · 적 ${enemies.length} · 아이템 ${items.length}`);
