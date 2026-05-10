#!/usr/bin/env node
// v0.46 · pre-commit syntax sanity check
// Run: node check-syntax.js
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
const html = fs.readFileSync(file, 'utf8');
const scripts = html.match(/<script>([\s\S]*?)<\/script>/g) || [];

let largest = '', size = 0;
for (const s of scripts) {
  if (s.length > size) { size = s.length; largest = s; }
}
const code = largest.replace(/<\/?script>/g, '');

try {
  new Function(code);
  console.log(`✅ syntax OK · ${code.length.toLocaleString()} bytes parsed clean`);
  process.exit(0);
} catch (e) {
  console.error(`❌ PARSE ERROR: ${e.message}`);
  // show a few lines of stack
  console.error(e.stack?.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
}
