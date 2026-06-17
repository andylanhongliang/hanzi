// 批量添加新节点和连线到 data.js
const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, '..', 'data.js');
let content = fs.readFileSync(dataPath, 'utf8');

// ── 新节点 ──
const newNodes = [
  // === 虫字族 ===
  { id:"蚂",name:"蚂",nameTrad:"螞",pinyin:"ma",category:"normal",oracle:"虫加马，马提示读音",origin:"蚂蚁，一种小昆虫",hints:"一种小虫子，喜欢成群结队|蚂__|虫字旁加马|蚂蚁的蚂",groupWords:"蚂蚁|蚂蚱|蚂蟥|蚂蜂",idioms:"蚂蚁搬家::蚂蚁迁移巢穴预示天要下雨|热锅上的蚂蚁::形容非常着急",riddles:"虫旁加马::形声法",synonyms:"",antonyms:"" },
  { id:"蚁",name:"蚁",nameTrad:"蟻",pinyin:"yi",category:"normal",oracle:"虫加义，义提示读音",origin:"蚂蚁，群体生活的昆虫",hints:"和蚂是好朋友|蚂__|小身体大力气|虫字旁加义",groupWords:"蚂蚁|白蚁|蚁后|工蚁",idioms:"千里之堤溃于蚁穴::小蚂蚁洞可以毁掉大堤坝，比喻小事不注意会酿成大祸",riddles:"虫旁加义::形声法",synonyms:"",antonyms:"" },
  { id:"蚊",name:"蚊",nameTrad:"蚊",pinyin:"wen",category:"normal",oracle:"虫加文，文提示读音",origin:"蚊子，吸血的小飞虫",hints:"夏天嗡嗡叫的小虫子|吸血的虫子|虫字旁加文|蚊__",groupWords:"蚊子|蚊香|蚊帐|驱蚊|蚊虫",idioms:"蚊蝇飞舞::形容环境脏乱",riddles:"虫旁加文::形声法",synonyms:"",antonyms:"" },
  { id:"蝇",name:"蝇",nameTrad:"蠅",pinyin:"ying",category:"normal",oracle:"虫加黾，黾提示读音",origin:"苍蝇，常见飞虫",hints:"嗡嗡飞的脏虫子|苍__|和蚊子一样讨人厌|虫字旁",groupWords:"苍蝇|蚊蝇|蝇拍|蝇头",idioms:"蝇头小利::像苍蝇头那么小的利益",riddles:"虫旁加黾::形声法",synonyms:"",antonyms:"" },
  // === 鱼字族 ===
  { id:"鲤",name:"鲤",nameTrad:"鯉",pinyin:"li",category:"normal",oracle:"鱼加里，里提示读音",origin:"鲤鱼，常见的淡水鱼",hints:"一种常见的鱼|__鱼|红色的__鱼|鱼字旁加里",groupWords:"鲤鱼|锦鲤|鲤跃|鲤科",idioms:"鲤鱼跳龙门::比喻努力奋斗获得成功",riddles:"鱼旁加里::形声法",synonyms:"",antonyms:"" },
  { id:"鲨",name:"鲨",nameTrad:"鯊",pinyin:"sha",category:"normal",oracle:"鱼加沙省，沙提示读音",origin:"鲨鱼，海洋中的大型鱼",hints:"海里最凶猛的鱼|__鱼|大海里的捕食者|鱼字旁",groupWords:"鲨鱼|虎鲨|鲸鲨|大白鲨",idioms:"",riddles:"鱼旁加沙省::形声法",synonyms:"",antonyms:"" },
  // === 木字族 ===
  { id:"松",name:"松",nameTrad:"松",pinyin:"song",category:"normal",oracle:"木加公，公提示读音",origin:"松树，常绿乔木",hints:"一年四季绿色的树|__树|__果|木字旁加公",groupWords:"松树|松果|松鼠|轻松|松软",idioms:"松柏长青::松树和柏树四季常绿|苍松翠柏::形容松柏的翠绿",riddles:"木旁加公::形声法",synonyms:"",antonyms:"紧" },
  { id:"柏",name:"柏",nameTrad:"柏",pinyin:"bai",category:"normal",oracle:"木加白，白提示读音",origin:"柏树，常绿乔木",hints:"和松树一样四季常绿|__树|松__|木字旁加白",groupWords:"柏树|松柏|柏油|柏木",idioms:"松柏长青::松树和柏树四季常绿",riddles:"木旁加白::形声法",synonyms:"",antonyms:"" },
  { id:"杨",name:"杨",nameTrad:"楊",pinyin:"yang",category:"normal",oracle:"木加昜，昜提示读音",origin:"杨树，高大落叶乔木",hints:"一种高高的树|__树|白__|木字旁",groupWords:"杨树|杨柳|白杨|杨梅",idioms:"百步穿杨::形容箭法非常准",riddles:"木旁加昜::形声法",synonyms:"",antonyms:"" },
  { id:"梅",name:"梅",nameTrad:"梅",pinyin:"mei",category:"normal",oracle:"木加每，每提示读音",origin:"梅花，冬天开放的花",hints:"冬天开的花|__花|傲雪开放的植物|木字旁加每",groupWords:"梅花|梅子|梅雨|杨梅|腊梅",idioms:"梅花香自苦寒来::形容成功需要经历艰苦|青梅竹马::形容从小一起长大的朋友",riddles:"木旁加每::形声法",synonyms:"",antonyms:"" },
  // === 基础常用字 ===
  { id:"比",name:"比",nameTrad:"比",pinyin:"bi",category:"normal",oracle:"两个人并排站立",origin:"比较，并列",hints:"两个人并排站|__较|__赛|对__",groupWords:"比较|比赛|比如|对比|无比",idioms:"无与伦比::没有可以相比的|比比皆是::到处都是",riddles:"两个人并排::会意法",synonyms:"较",antonyms:"" },
  { id:"主",name:"主",nameTrad:"主",pinyin:"zhu",category:"normal",oracle:"灯台上的火焰形",origin:"主人，主要",hints:"一家之__|做__|和客相反|__人",groupWords:"主人|主要|主意|公主|主动",idioms:"六神无主::形容惊慌失措|喧宾夺主::客人声音比主人还大",riddles:"王上加一点::指事法",synonyms:"",antonyms:"客" },
  { id:"反",name:"反",nameTrad:"反",pinyin:"fan",category:"normal",oracle:"厂加又，用手翻转",origin:"翻转，相反",hints:"和正相反|翻转过来|__面|__对",groupWords:"相反|反对|反面|反映|反复",idioms:"举一反三::从一个例子想到三个|反复无常::变化不定",riddles:"厂下加又::会意法",synonyms:"",antonyms:"正" },
  { id:"先",name:"先",nameTrad:"先",pinyin:"xian",category:"normal",oracle:"脚在人上，走在前面的意思",origin:"走在前面，先生",hints:"走在前面|和后相反|首__|__生",groupWords:"先生|先后|首先|先进|先前",idioms:"一马当先::形容走在最前面|争先恐后::形容抢着向前",riddles:"牛字少一横加儿::拆字法",synonyms:"前",antonyms:"后" },
  { id:"成",name:"成",nameTrad:"成",pinyin:"cheng",category:"normal",oracle:"戊加丁，完成的意思",origin:"完成，成功",hints:"把事情做好了|__功|完__|__长",groupWords:"成功|完成|成长|成为|成绩",idioms:"马到成功::形容事情顺利|水到渠成::条件成熟事情自然成功",riddles:"戊加丁::会意法",synonyms:"",antonyms:"败" },
  { id:"向",name:"向",nameTrad:"向",pinyin:"xiang",category:"normal",oracle:"房子下面一个口",origin:"朝向，方向",hints:"朝着某个地方|方__|__前|朝__",groupWords:"方向|向前|向上|向往|向日葵",idioms:"欣欣向荣::形容蓬勃发展|人心所向::大家一致拥护的",riddles:"一撇加冂加口::会意法",synonyms:"朝",antonyms:"背" },
  { id:"住",name:"住",nameTrad:"住",pinyin:"zhu",category:"normal",oracle:"人加主，主提示读音",origin:"居住，停留",hints:"在一个地方生活|居__|__房|__下来",groupWords:"居住|住房|住址|记住|站住",idioms:"衣食住行::生活中的四件大事",riddles:"人旁加主::形声法",synonyms:"居",antonyms:"" },
  { id:"每",name:"每",nameTrad:"每",pinyin:"mei",category:"normal",oracle:"母上加草形，草木茂盛",origin:"每一个，每次",hints:"每一个|__天|__次|__人",groupWords:"每天|每个|每次|每人|每年",idioms:"每时每刻::每一分每一秒|每况愈下::情况越来越坏",riddles:"母上加草头::象形法",synonyms:"各",antonyms:"" },
  { id:"感",name:"感",nameTrad:"感",pinyin:"gan",category:"normal",oracle:"咸加心，心里有所触动",origin:"感觉，感受",hints:"心里有所触动|__觉|__动|__谢",groupWords:"感觉|感动|感恩|感情|感冒",idioms:"感恩戴德::对恩情感激不尽|多愁善感::容易伤感",riddles:"咸下加心::形声法",synonyms:"觉",antonyms:"" },
  { id:"因",name:"因",nameTrad:"因",pinyin:"yin",category:"normal",oracle:"大被口围住",origin:"原因，因为",hints:"大被框在里面|__为|原__|__果",groupWords:"因为|原因|因此|因果|因素",idioms:"事出有因::事情发生都有原因|前因后果::事情的起因和结果",riddles:"大口里面藏大字::会意法",synonyms:"由",antonyms:"果" },
];

// ── 新连线 ──
const newLinks = [
  // 虫字族桥接
  { source:"虫",target:"蚂",branchName:"虫子旁→蚂",linkType:"构件" },
  { source:"虫",target:"蚁",branchName:"虫子旁→蚁",linkType:"构件" },
  { source:"虫",target:"蚊",branchName:"虫子旁→蚊",linkType:"构件" },
  { source:"虫",target:"蝇",branchName:"虫子旁→蝇",linkType:"构件" },
  // 虫字族互连
  { source:"蚂",target:"蚁",branchName:"蚂蚁",linkType:"构件" },
  { source:"蚊",target:"蝇",branchName:"蚊蝇",linkType:"构件" },
  { source:"蜂",target:"蚁",branchName:"蜂蚁都是群居昆虫",linkType:"意义" },
  { source:"蝶",target:"蝇",branchName:"蝶蝇都是飞虫",linkType:"意义" },
  // 鱼字族桥接
  { source:"鱼",target:"鲤",branchName:"鱼字旁→鲤",linkType:"构件" },
  { source:"鱼",target:"鲨",branchName:"鱼字旁→鲨",linkType:"构件" },
  // 鱼字族互连
  { source:"鲤",target:"鲜",branchName:"鲤鱼味道鲜美",linkType:"意义" },
  { source:"鲨",target:"鲸",branchName:"鲨鲸都是海洋大鱼",linkType:"意义" },
  // 木字族桥接
  { source:"木",target:"松",branchName:"木字旁→松",linkType:"构件" },
  { source:"木",target:"柏",branchName:"木字旁→柏",linkType:"构件" },
  { source:"木",target:"杨",branchName:"木字旁→杨",linkType:"构件" },
  { source:"木",target:"梅",branchName:"木字旁→梅",linkType:"构件" },
  // 木字族互连
  { source:"松",target:"柏",branchName:"松柏都是常青树",linkType:"意义" },
  { source:"杨",target:"柳",branchName:"杨柳都是树",linkType:"意义" },
  { source:"梅",target:"桃",branchName:"梅桃都是果树",linkType:"意义" },
  // 基础字桥接（每条至少2条连线连主网）
  { source:"比",target:"此",branchName:"比此形似",linkType:"形似" },
  { source:"比",target:"对",branchName:"比较对比",linkType:"意义" },
  { source:"主",target:"从",branchName:"主从相对",linkType:"意义" },
  { source:"主",target:"帝",branchName:"君主帝王",linkType:"意义" },
  { source:"反",target:"正",branchName:"反正相反",linkType:"意义" },
  { source:"反",target:"板",branchName:"反是板的声旁",linkType:"构件" },
  { source:"先",target:"后",branchName:"先后相反",linkType:"意义" },
  { source:"先",target:"前",branchName:"先前",linkType:"意义" },
  { source:"成",target:"城",branchName:"成是城的声旁",linkType:"构件" },
  { source:"成",target:"功",branchName:"成功",linkType:"构件" },
  { source:"向",target:"方",branchName:"方向",linkType:"意义" },
  { source:"向",target:"前",branchName:"向前",linkType:"意义" },
  { source:"住",target:"居",branchName:"居住",linkType:"意义" },
  { source:"住",target:"家",branchName:"住家",linkType:"意义" },
  { source:"每",target:"海",branchName:"每是海的声旁",linkType:"构件" },
  { source:"每",target:"母",branchName:"每上似母",linkType:"形似" },
  { source:"感",target:"心",branchName:"感有心旁",linkType:"构件" },
  { source:"感",target:"咸",branchName:"感咸同声",linkType:"构件" },
  { source:"因",target:"果",branchName:"因果相连",linkType:"意义" },
  { source:"因",target:"大",branchName:"因中间是大",linkType:"构件" },
];

// ── 插入节点：在 ALL_NODES 的 ]; 之前 ──
const nodesEnd = content.indexOf('\n];\n\n// ===');
if (nodesEnd === -1) throw new Error('找不到 ALL_NODES 结尾');
const nodesStr = ',\n' + newNodes.map(n =>
  `  { id:"${n.id}",name:"${n.name}",nameTrad:"${n.nameTrad}",pinyin:"${n.pinyin}",category:"${n.category}",oracle:"${n.oracle}",origin:"${n.origin}",hints:"${n.hints}",groupWords:"${n.groupWords}",idioms:"${n.idioms}",riddles:"${n.riddles}",synonyms:"${n.synonyms}",antonyms:"${n.antonyms}" }`
).join(',\n') + '\n';
content = content.slice(0, nodesEnd) + nodesStr + content.slice(nodesEnd);

// ── 插入连线：在 ALL_LINKS 的 ]; 之前 ──
const linksEnd = content.lastIndexOf('\n];');
if (linksEnd === -1) throw new Error('找不到 ALL_LINKS 结尾');
const linksStr = ',\n' + newLinks.map(l =>
  `{ source:"${l.source}",target:"${l.target}",branchName:"${l.branchName}",linkType:"${l.linkType}" }`
).join(',\n') + ',\n  \n';
content = content.slice(0, linksEnd) + linksStr + content.slice(linksEnd);

fs.writeFileSync(dataPath, content);

// ── 验证 ──
eval(content);
const nodeCount = ALL_NODES.filter(n => n).length;
const linkCount = ALL_LINKS.filter(l => l).length;
console.log('插入完成！节点:' + nodeCount + ' 连线:' + linkCount);
console.log('新增节点:' + newNodes.length + ' 新增连线:' + newLinks.length);
