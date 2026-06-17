// 修复：添加失、接、叉节点 + 修复谜语格式
const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, '..', 'data.js');
let c = fs.readFileSync(dataPath, 'utf8');

// 1. 添加节点
const nodes = [
  `  { id:"失",name:"失",nameTrad:"失",pinyin:"shi",category:"normal",oracle:"手加一横，手中东西掉落",origin:"失去，丢失",hints:"东西不见了|丢__|__去|消__",groupWords:"失去|丢失|消失|失望|失败",idioms:"塞翁失马::坏事变好事|惊慌失措::吓得不知怎么办",riddles:"夫加一撇::夫字多一撇",synonyms:"丢",antonyms:"得" },`,
  `  { id:"接",name:"接",nameTrad:"接",pinyin:"jie",category:"normal",oracle:"扌+妾，妾表音",origin:"连接，接受",hints:"一个连一个|__受|迎__|连__",groupWords:"接受|连接|迎接|接着|接力",idioms:"应接不暇::忙得来不及应付|接二连三::一个接着一个",riddles:"提手旁加妾::妾表音",synonyms:"连",antonyms:"断" },`,
  `  { id:"叉",name:"叉",nameTrad:"叉",pinyin:"cha",category:"normal",oracle:"又加一点，叉子的形状",origin:"叉子，交叉",hints:"像一个大叉|交__|__子|刀__",groupWords:"叉子|交叉|刀叉|叉车|鱼叉",idioms:"三叉路口::要选择方向的地方",riddles:"又加一点::又字多一点",synonyms:"交",antonyms:"" },`,
];

c = c.replace(
  `  { id:"哀",name:"哀",nameTrad:"哀",pinyin:"ai",category:"normal",oracle:"衣+口，悲痛出声",origin:"悲哀，哀伤",hints:"很伤心|悲__|__伤|默__",groupWords:"悲哀|哀伤|哀愁|哀悼|哀乐",idioms:"哀兵必胜::受欺辱的一方往往能获胜|喜怒哀乐::人的各种情绪",riddles:"衣加口::会意",synonyms:"悲",antonyms:"乐" },
];`,
  `  { id:"哀",name:"哀",nameTrad:"哀",pinyin:"ai",category:"normal",oracle:"衣+口，悲痛出声",origin:"悲哀，哀伤",hints:"很伤心|悲__|__伤|默__",groupWords:"悲哀|哀伤|哀愁|哀悼|哀乐",idioms:"哀兵必胜::受欺辱的一方往往能获胜|喜怒哀乐::人的各种情绪",riddles:"衣加口::会意",synonyms:"悲",antonyms:"乐" },
  // ── 连线修复 ──
${nodes.join('\n')}
];`
);

// 2. 修复谜语格式
c = c.replace(
  `{ id:"气",name:"气",nameTrad:"氣",pinyin:"qi",category:"normal",oracle:"三横加撇捺像气流",origin:"空气，气体",hints:"天上飘着的看不见的|呼吸的东__|空__|天__",groupWords:"空气|天气|气球|生气|力气",idioms:"气吞山河::形容气势宏大",riddles:"象形",synonyms:"",antonyms:""`,
  `{ id:"气",name:"气",nameTrad:"氣",pinyin:"qi",category:"normal",oracle:"三横加撇捺像气流",origin:"空气，气体",hints:"天上飘着的看不见的|呼吸的东__|空__|天__",groupWords:"空气|天气|气球|生气|力气",idioms:"气吞山河::形容气势宏大",riddles:"三横加撇捺::象形",synonyms:"",antonyms:""`
);

c = c.replace(
  `{ id:"口",name:"口",nameTrad:"口",pinyin:"kou",category:"normal",oracle:"一张嘴的形状",origin:"嘴巴，入口",hints:"人脸上说话的|一张嘴的样子|开__|门__",groupWords:"开口|门口|口水|口袋|口语",idioms:"口若悬河::形容很能说|异口同声::大家说得一样",riddles:"象形",synonyms:"嘴",antonyms:""`,
  `{ id:"口",name:"口",nameTrad:"口",pinyin:"kou",category:"normal",oracle:"一张嘴的形状",origin:"嘴巴，入口",hints:"人脸上说话的|一张嘴的样子|开__|门__",groupWords:"开口|门口|口水|口袋|口语",idioms:"口若悬河::形容很能说|异口同声::大家说得一样",riddles:"一张嘴的形状::象形",synonyms:"嘴",antonyms:""`
);

fs.writeFileSync(dataPath, c);
console.log('Done. Added 3 nodes, fixed 2 riddles');
