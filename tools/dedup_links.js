// 去重 ALL_LINKS 并写回 data.js，保留注释和格式
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data.js');
let content = fs.readFileSync(dataPath, 'utf8');

// 找到 ALL_LINKS 块
const startMarker = 'var ALL_LINKS = [\n';
const startIdx = content.indexOf(startMarker);
if (startIdx === -1) { console.log('找不到 ALL_LINKS 开始'); process.exit(1); }

const afterStart = content.slice(startIdx + startMarker.length);
const endIdx = afterStart.indexOf('\n];');
if (endIdx === -1) { console.log('找不到 ALL_LINKS 结束'); process.exit(1); }

const blockContent = afterStart.slice(0, endIdx);
const lines = blockContent.split('\n');

// 去重连线行
const seen = new Set();
const dedupedLines = [];
let beforeCount = 0;
let afterCount = 0;

for (const line of lines) {
  // 检查是否是连线行
  const linkMatch = line.match(/\{\s*source\s*:\s*"([^"]+)"\s*,\s*target\s*:\s*"([^"]+)"\s*,\s*branchName\s*:\s*"([^"]+)"\s*,\s*linkType\s*:\s*"([^"]+)"\s*\}/);
  if (linkMatch) {
    beforeCount++;
    const key = linkMatch[1] + '|' + linkMatch[2] + '|' + linkMatch[3] + '|' + linkMatch[4];
    if (!seen.has(key)) {
      seen.add(key);
      dedupedLines.push(line);
      afterCount++;
    }
    // 跳过重复的
  } else {
    // 注释或空行，保留
    dedupedLines.push(line);
  }
}

console.log('连线去重: ' + beforeCount + ' -> ' + afterCount + ' (移除 ' + (beforeCount-afterCount) + ' 条重复)');

// 重建
const before = content.slice(0, startIdx + startMarker.length);
const after = afterStart.slice(endIdx);
const newBlock = dedupedLines.join('\n');
content = before + newBlock + after;

fs.writeFileSync(dataPath, content, 'utf8');
console.log('Done.');
