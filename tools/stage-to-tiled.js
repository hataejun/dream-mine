#!/usr/bin/env node
// js/stage-data.js  →  stage/stage1.tmj  (Tiled 편집용 파일 만들기)
//
// 최초 한 번만 쓰는 방향이다. 앞으로는 Tiled에서 고치고
// tools/tiled-to-stage.js 로 되돌리면 된다.
//
//   node tools/stage-to-tiled.js
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'js/stage-data.js'), 'utf8');
const STAGE = new Function(src + '\nreturn STAGE;')();

const TILE = 32;
let nextId = 1;
const id = () => nextId++;

// 발판·블록은 사각형 오브젝트, 적·아이템은 점 오브젝트로 옮긴다.
// 타일셋 이미지가 없어도 되는 방식이라 Tiled에서 바로 열린다.
const rect = (o, cls) => ({
  id: id(), name: '', type: cls, class: cls, visible: true, rotation: 0,
  x: o.x, y: o.y, width: o.w, height: o.h,
});
const point = (o, cls) => ({
  id: id(), name: o.kind || o.type || '', type: cls, class: cls,
  visible: true, rotation: 0, point: true, x: o.x, y: o.y, width: 0, height: 0,
  properties: [{ name: 'kind', type: 'string', value: o.kind || o.type }],
});

const layer = (name, objects) => ({
  id: id(), name, type: 'objectgroup', draworder: 'topdown',
  opacity: 1, visible: true, x: 0, y: 0, objects,
});

const map = {
  type: 'map', version: '1.10', tiledversion: '1.10.2',
  orientation: 'orthogonal', renderorder: 'right-down',
  infinite: false,
  width: Math.ceil(STAGE.width / TILE), height: Math.ceil(540 / TILE),
  tilewidth: TILE, tileheight: TILE,
  backgroundcolor: '#a9e2f7',
  properties: [
    { name: 'bossAt',  type: 'int', value: STAGE.bossAt },
    { name: 'arenaL',  type: 'int', value: STAGE.arena.l },
    { name: 'arenaR',  type: 'int', value: STAGE.arena.r },
    { name: 'width',   type: 'int', value: STAGE.width },
  ],
  layers: [
    layer('plats',   STAGE.plats.map(p => rect({ x:p.x, y:p.y, w:p.w, h:20 }, 'plat'))),
    layer('blocks',  STAGE.blocks.map(b => rect(b, 'block'))),
    layer('enemies', STAGE.enemies.map(e => point(e, 'enemy'))),
    layer('items',   STAGE.items.map(i => point(i, 'item'))),
  ],
  nextlayerid: nextId, nextobjectid: nextId,
};

const out = path.join(root, 'stage/stage1.tmj');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(map, null, 1) + '\n');
console.log('만들었습니다:', path.relative(root, out));
console.log(`  발판 ${STAGE.plats.length} · 블록 ${STAGE.blocks.length} · 적 ${STAGE.enemies.length} · 아이템 ${STAGE.items.length}`);
