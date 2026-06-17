// 第八批：补常见词组 + 加笔/形似 + 反义
const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, '..', 'data.js');
let c = fs.readFileSync(dataPath, 'utf8');

const links = [
  // ── 常见词组 ──
  { source:"书", target:"画", branchName:"书画", linkType:"构件" },
  { source:"语", target:"文", branchName:"语文", linkType:"构件" },
  { source:"地", target:"理", branchName:"地理", linkType:"构件" },
  { source:"江", target:"湖", branchName:"江湖", linkType:"构件" },
  { source:"跑", target:"步", branchName:"跑步", linkType:"构件" },
  { source:"欢", target:"乐", branchName:"欢乐", linkType:"构件" },
  { source:"同", target:"学", branchName:"同学", linkType:"构件" },
  { source:"儿", target:"女", branchName:"儿女", linkType:"构件" },
  { source:"男", target:"女", branchName:"男女", linkType:"意义" },
  { source:"光", target:"明", branchName:"光明", linkType:"构件" },
  { source:"开", target:"始", branchName:"开始", linkType:"构件" },
  { source:"唱", target:"歌", branchName:"唱歌", linkType:"构件" },
  { source:"说", target:"话", branchName:"说话", linkType:"构件" },
  { source:"读", target:"书", branchName:"读书", linkType:"构件" },
  { source:"游", target:"戏", branchName:"游戏", linkType:"构件" },
  { source:"帮", target:"助", branchName:"帮助", linkType:"构件" },
  { source:"等", target:"待", branchName:"等待", linkType:"构件" },
  { source:"波", target:"浪", branchName:"波浪", linkType:"构件" },
  { source:"云", target:"雾", branchName:"云雾", linkType:"构件" },
  { source:"风", target:"雨", branchName:"风雨", linkType:"构件" },
  { source:"山", target:"水", branchName:"山水", linkType:"构件" },
  { source:"轻", target:"松", branchName:"轻松", linkType:"构件" },
  { source:"沉", target:"重", branchName:"沉重", linkType:"构件" },
  { source:"告", target:"诉", branchName:"告诉", linkType:"构件" },
  { source:"愿", target:"望", branchName:"愿望", linkType:"构件" },
  { source:"知", target:"道", branchName:"知道", linkType:"构件" },
  { source:"认", target:"识", branchName:"认识", linkType:"构件" },
  { source:"桃", target:"李", branchName:"桃李", linkType:"构件" },
  { source:"父", target:"母", branchName:"父母", linkType:"构件" },
  { source:"兄", target:"弟", branchName:"兄弟", linkType:"构件" },
  { source:"姐", target:"妹", branchName:"姐妹", linkType:"构件" },
  { source:"教", target:"室", branchName:"教室", linkType:"构件" },

  // ── 加笔/形似补充 ──
  { source:"白", target:"百", branchName:"白加一横是百", linkType:"加笔" },
  { source:"干", target:"千", branchName:"干加一撇是千", linkType:"加笔" },
  { source:"十", target:"千", branchName:"十加一撇是千", linkType:"加笔" },
  { source:"万", target:"方", branchName:"万方形似", linkType:"形似" },
  { source:"未", target:"末", branchName:"未末形似", linkType:"形似" },
  { source:"土", target:"士", branchName:"土士形似", linkType:"形似" },
  { source:"土", target:"王", branchName:"土加一横是王", linkType:"加笔" },
  { source:"王", target:"玉", branchName:"王加一点是玉", linkType:"加笔" },
  { source:"二", target:"干", branchName:"二加一竖是干", linkType:"加笔" },
  { source:"二", target:"工", branchName:"二加一竖是工", linkType:"加笔" },
  { source:"工", target:"王", branchName:"工加一横是王", linkType:"加笔" },
  { source:"工", target:"土", branchName:"工土形似", linkType:"形似" },

  // ── 补充反义 ──
  { source:"东", target:"西", branchName:"东西相反", linkType:"意义" },
  { source:"南", target:"北", branchName:"南北相反", linkType:"意义" },
  { source:"悲", target:"欢", branchName:"悲欢相反", linkType:"意义" },
  { source:"哭", target:"欢", branchName:"哭欢相反", linkType:"意义" },
  { source:"始", target:"终", branchName:"始终相连", linkType:"意义" },
  { source:"男", target:"女", branchName:"男女相对", linkType:"意义" },

  // ── 字族内部互连 ──
  { source:"江", target:"河", branchName:"江河都是水流", linkType:"意义" },
  { source:"海", target:"洋", branchName:"海洋", linkType:"构件" },
  { source:"写", target:"画", branchName:"写画都是创作", linkType:"意义" },
  { source:"鼻", target:"嘴", branchName:"鼻嘴都在脸上", linkType:"意义" },
  { source:"耳", target:"鼻", branchName:"耳鼻都是五官", linkType:"意义" },
];

const lastBracket = c.lastIndexOf('];');
const linkLines = links.map(l =>
  `  ,\n{ source:"${l.source}",target:"${l.target}",branchName:"${l.branchName}",linkType:"${l.linkType}" }`
).join(',\n');
c = c.slice(0, lastBracket) + linkLines + ',\n  \n];';
fs.writeFileSync(dataPath, c);
console.log('Done. Added ' + links.length + ' links');
