// 去除 ALL_NODES 中的重复节点（保留首次出现）
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data.js');
let content = fs.readFileSync(dataPath, 'utf8');

// 找到 ALL_NODES 块
const startMarker = 'var ALL_NODES = [\n';
const startIdx = content.indexOf(startMarker);
const afterStart = content.slice(startIdx + startMarker.length);
const endIdx = afterStart.indexOf('\n];');
const blockContent = afterStart.slice(0, endIdx);
const lines = blockContent.split('\n');

// 去重
const seen = new Set();
const dedupedLines = [];
let removed = 0;

for (const line of lines) {
  const m = line.match(/id:"([^"]+)"/);
  if (m) {
    if (seen.has(m[1])) {
      removed++;
      continue;
    }
    seen.add(m[1]);
  }
  dedupedLines.push(line);
}

console.log('移除重复节点: ' + removed);

// 重建
const before = content.slice(0, startIdx + startMarker.length);
const after = afterStart.slice(endIdx);
content = before + dedupedLines.join('\n') + after;

fs.writeFileSync(dataPath, content, 'utf8');
console.log('Done.');
