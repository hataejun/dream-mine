#!/usr/bin/env node
// 홈 화면 아이콘(icon.png 180×180)을 만든다.
//
//   node tools/make-icon.js
//
// 외부 라이브러리 없이 픽셀을 직접 찍고 zlib으로 PNG를 만든다.
// 4배로 그린 뒤 줄여서 계단현상을 없앤다(수퍼샘플링).
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const OUT = 180;          // 최종 크기
const SS = 4;             // 수퍼샘플링 배율
const N = OUT * SS;       // 내부 작업 크기
const buf = new Uint8Array(N * N * 3);

// ---------- 기본 도구 ----------
const hex = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const lerp = (a, b, t) => a + (b - a) * t;

function px(x, y, c){
  if(x < 0 || y < 0 || x >= N || y >= N) return;
  const i = (y * N + x) * 3;
  buf[i] = c[0]; buf[i+1] = c[1]; buf[i+2] = c[2];
}
function fillRect(x0, y0, w, h, c){
  for(let y = Math.max(0, y0|0); y < Math.min(N, (y0+h)|0); y++)
    for(let x = Math.max(0, x0|0); x < Math.min(N, (x0+w)|0); x++) px(x, y, c);
}
// 세로 그라디언트
function fillGradient(y0, y1, cTop, cBot){
  for(let y = y0; y < y1; y++){
    const t = (y - y0) / Math.max(1, y1 - y0 - 1);
    const c = [lerp(cTop[0],cBot[0],t)|0, lerp(cTop[1],cBot[1],t)|0, lerp(cTop[2],cBot[2],t)|0];
    for(let x = 0; x < N; x++) px(x, y, c);
  }
}
function fillEllipse(cx, cy, rx, ry, c){
  for(let y = Math.max(0, Math.ceil(cy-ry)); y <= Math.min(N-1, Math.floor(cy+ry)); y++){
    const dy = (y - cy) / ry;
    const k = 1 - dy*dy;
    if(k < 0) continue;
    const half = rx * Math.sqrt(k);
    for(let x = Math.max(0, Math.ceil(cx-half)); x <= Math.min(N-1, Math.floor(cx+half)); x++) px(x, y, c);
  }
}
// 스캔라인 다각형 채우기
function fillPoly(pts, c){
  let minY = Infinity, maxY = -Infinity;
  for(const p of pts){ if(p[1] < minY) minY = p[1]; if(p[1] > maxY) maxY = p[1]; }
  for(let y = Math.max(0, Math.ceil(minY)); y <= Math.min(N-1, Math.floor(maxY)); y++){
    const xs = [];
    for(let i = 0, j = pts.length - 1; i < pts.length; j = i++){
      const [x1,y1] = pts[j], [x2,y2] = pts[i];
      if((y1 <= y && y2 > y) || (y2 <= y && y1 > y)){
        xs.push(x1 + (y - y1) / (y2 - y1) * (x2 - x1));
      }
    }
    xs.sort((a,b) => a-b);
    for(let i = 0; i + 1 < xs.length; i += 2){
      for(let x = Math.max(0, Math.ceil(xs[i])); x <= Math.min(N-1, Math.floor(xs[i+1])); x++) px(x, y, c);
    }
  }
}
// 2차 베지에를 점으로 풀어낸다
function quad(p0, p1, p2, steps){
  const out = [];
  for(let i = 0; i <= steps; i++){
    const t = i/steps, u = 1-t;
    out.push([u*u*p0[0] + 2*u*t*p1[0] + t*t*p2[0], u*u*p0[1] + 2*u*t*p1[1] + t*t*p2[1]]);
  }
  return out;
}
// 굵은 선분 = 네 점 다각형 + 양 끝 둥글게
function thickLine(a, b, w, c){
  const dx = b[0]-a[0], dy = b[1]-a[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy/L * w/2, ny = dx/L * w/2;
  fillPoly([[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]], c);
  fillEllipse(a[0], a[1], w/2, w/2, c);
  fillEllipse(b[0], b[1], w/2, w/2, c);
}

// ---------- 그리기 ----------
const S = v => v * SS;                       // 180 기준 좌표를 내부 좌표로
const SKY_T = hex('#4fb0ec'), SKY_B = hex('#b7e6fa');
const HILL  = hex('#a8dfae'), GRASS = hex('#7cc98a'), GRASS_T = hex('#95dc9f');
const DIRT  = hex('#b3825a'), DIRT_D = hex('#946a45');
const BLUE  = hex('#2f6fd0'), BLUE_D = hex('#1d4a99');
const BLADE = hex('#cfe9ff'), BLADE_D = hex('#7fb4ea');
const WHITE = hex('#ffffff');

fillGradient(0, N, SKY_T, SKY_B);
// 구름
fillEllipse(S(34), S(32), S(13), S(9), WHITE);
fillEllipse(S(50), S(28), S(17), S(11), WHITE);
fillEllipse(S(65), S(33), S(12), S(8), WHITE);
// 먼 언덕
fillEllipse(S(36), S(150), S(74), S(38), HILL);
fillEllipse(S(150), S(152), S(66), S(34), HILL);
// 땅
fillRect(0, S(146), N, S(34), GRASS);
fillRect(0, S(146), N, S(8), GRASS_T);
fillRect(0, S(164), N, S(16), DIRT);
fillRect(0, S(176), N, S(4), DIRT_D);

// ---------- 곡괭이 ----------
// 자루: 왼쪽 아래 → 오른쪽 위. 짧고 굵게 해야 아이콘 크기에서 연장으로 읽힌다.
const gripA = [S(56), S(150)], gripB = [S(106), S(72)];
thickLine(gripA, gripB, S(17), BLUE_D);
thickLine(gripA, gripB, S(12.5), BLUE);
thickLine([S(60), S(143)], [S(100), S(80)], S(4), hex('#7fb0e8'));   // 광택

// 날: 자루 끝을 가로지르는 큰 초승달. 양 갈래 끝이 자루 쪽(뒤)을 향한다.
const tip = gripB;
const ang = Math.atan2(gripB[1]-gripA[1], gripB[0]-gripA[0]);
function at(fx, fy){
  const ca = Math.cos(ang), sa = Math.sin(ang);
  return [tip[0] + fx*ca - fy*sa, tip[1] + fx*sa + fy*ca];
}
function headPoly(k){                       // k배로 부풀린 같은 모양 (테두리용)
  const m = (x, y) => at(S(x*k), S(y*k));
  return [].concat(
    quad(m(-20,-30), m(8,-22), m(13,0), 26),
    quad(m(13,0), m(8,22), m(-20,30), 26),
    quad(m(-20,30), m(-13,19), m(-5,17), 14),
    quad(m(-5,17), m(-2,9), m(-2,0), 12),
    quad(m(-2,0), m(-2,-9), m(-5,-17), 12),
    quad(m(-5,-17), m(-13,-19), m(-20,-30), 14),
  );
}
fillPoly(headPoly(1.09), BLADE_D);          // 테두리
fillPoly(headPoly(1.0), BLADE);             // 날
fillPoly([].concat(                         // 반짝임
  quad(at(S(-12),S(-19)), at(S(2),S(-14)), at(S(6),S(-5)), 18),
  quad(at(S(6),S(-5)), at(S(0),S(-10)), at(S(-12),S(-15)), 18),
), WHITE);
fillEllipse(tip[0], tip[1], S(8), S(8), BLUE_D);   // 자루와 날을 잇는 쇠테
fillEllipse(tip[0], tip[1], S(5.5), S(5.5), BLUE);

// ---------- 다운샘플링 후 PNG ----------
const out = Buffer.alloc(OUT * OUT * 3);
for(let y = 0; y < OUT; y++){
  for(let x = 0; x < OUT; x++){
    let r = 0, g = 0, b = 0;
    for(let sy = 0; sy < SS; sy++){
      for(let sx = 0; sx < SS; sx++){
        const i = (((y*SS+sy) * N) + (x*SS+sx)) * 3;
        r += buf[i]; g += buf[i+1]; b += buf[i+2];
      }
    }
    const n = SS*SS, o = (y*OUT + x) * 3;
    out[o] = r/n; out[o+1] = g/n; out[o+2] = b/n;
  }
}

// PNG 조립 (필터 0, 트루컬러)
const raw = Buffer.alloc(OUT * (OUT*3 + 1));
for(let y = 0; y < OUT; y++){
  raw[y * (OUT*3+1)] = 0;
  out.copy(raw, y*(OUT*3+1) + 1, y*OUT*3, (y+1)*OUT*3);
}
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}
let TBL = null;
function crc32(b){
  if(!TBL){
    TBL = new Int32Array(256);
    for(let n = 0; n < 256; n++){
      let c = n;
      for(let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      TBL[n] = c;
    }
  }
  let c = -1;
  for(let i = 0; i < b.length; i++) c = TBL[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
  return c ^ -1;
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(OUT, 0); ihdr.writeUInt32BE(OUT, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
const dst = path.join(__dirname, '..', 'icon.png');
fs.writeFileSync(dst, png);
console.log('만들었습니다:', path.relative(path.join(__dirname,'..'), dst), png.length + ' bytes', OUT + '×' + OUT);
