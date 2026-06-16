#!/usr/bin/env node
/*
 * build.js — 把 src/zh-CN.json 词典内联进 src/engine.js，
 * 生成可分发、可直接注入 Bruno 的 src/i18n.js。
 *
 * 用法：  node build.js
 * 贡献流程：编辑 src/zh-CN.json 增改翻译 → 运行 node build.js → 提交。
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const enginePath = path.join(root, 'src', 'engine.js');
const dictPath = path.join(root, 'src', 'zh-CN.json');
const outPath = path.join(root, 'src', 'i18n.js');

const engine = fs.readFileSync(enginePath, 'utf8');
const raw = fs.readFileSync(dictPath, 'utf8');

let dict;
try {
  dict = JSON.parse(raw);
} catch (e) {
  console.error('✗ zh-CN.json 不是合法 JSON：', e.message);
  process.exit(1);
}

const marker = '/*__DICT__*/{}';
if (engine.indexOf(marker) === -1) {
  console.error('✗ engine.js 中找不到词典占位符 ' + marker);
  process.exit(1);
}

// 内联为单行 JSON，避免体积膨胀
const out = engine.replace(marker, JSON.stringify(dict));
fs.writeFileSync(outPath, out, 'utf8');

console.log('✓ 已生成 src/i18n.js');
console.log('  词典条目：' + Object.keys(dict).length);
console.log('  文件大小：' + (Buffer.byteLength(out, 'utf8') / 1024).toFixed(1) + ' KB');
