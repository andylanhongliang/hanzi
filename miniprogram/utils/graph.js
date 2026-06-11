// 图谱逻辑 — 战争迷雾、推荐算法、候选生成
// 严格对齐网页版 app.js 逻辑

var data = require('../libs/data');
var ALL_NODES = data.ALL_NODES;
var ALL_LINKS = data.ALL_LINKS;

// 颜色映射（与网页版 app.js 一致）
var linkColors = {
  '形似': '#8bc34a', '加笔': '#64b5f6', '减笔': '#ffb74d',
  '构件': '#ba68c8', '意义': '#e57373', '笔数': '#ffb74d', '语音': '#4dd0e1'
};
var linkDashes = {
  '加笔': 'dashed', '减笔': 'dotted', '构件': 'dashed',
  '笔数': 'dotted', '语音': 'dotted'
};

// 索引结构
var nodeMap = new Map();
var linkMap = new Map();
var childrenMap = new Map();
var neighborMap = new Map();
var parentMap = new Map();

function initDataStructures() {
  nodeMap.clear();
  linkMap.clear();
  childrenMap.clear();
  neighborMap.clear();
  parentMap.clear();

  ALL_NODES.forEach(function (n) {
    nodeMap.set(n.id, n);
    childrenMap.set(n.id, []);
    neighborMap.set(n.id, []);
    parentMap.set(n.id, null);
  });

  ALL_LINKS.forEach(function (l) {
    if (!nodeMap.has(l.source) || !nodeMap.has(l.target)) return;
    var key = l.source + '→' + l.target;
    if (!linkMap.has(key)) linkMap.set(key, []);
    linkMap.get(key).push(l);
    if (childrenMap.get(l.source).indexOf(l.target) < 0) childrenMap.get(l.source).push(l.target);
    if (parentMap.get(l.target) === null) parentMap.set(l.target, l.source);
    if (neighborMap.get(l.source).indexOf(l.target) < 0) neighborMap.get(l.source).push(l.target);
    if (neighborMap.get(l.target).indexOf(l.source) < 0) neighborMap.get(l.target).push(l.source);
  });

  var totalChildren = 0;
  childrenMap.forEach(function(v) { totalChildren += v.length; });
  console.log('[graph] 初始化完成 | 节点: ' + nodeMap.size + ' | ALL_LINKS长度: ' + ALL_LINKS.length + ' | 子关系总数: ' + totalChildren);
  var rootChildren = childrenMap.get('一') || [];
  console.log('[graph] 根节点"一"的子节点数: ' + rootChildren.length + ' | 前5个: ' + JSON.stringify(rootChildren.slice(0, 5)));
  if (totalChildren === 0) {
    console.error('[graph] 严重错误: childrenMap 为空！ALL_LINKS 可能加载失败。检查 data.js');
    console.error('[graph] ALL_LINKS 类型:', typeof ALL_LINKS, ' 是否为数组:', Array.isArray(ALL_LINKS));
  }
}

function getParent(nodeId) {
  return parentMap.get(nodeId) || null;
}

// 推荐算法：完全对齐网页版（兄弟优先 → 子节点 → 父链向上 → BFS 全图）
function getRecommendedNode(unlocked, lastUnlockedNodeId) {
  var unlockedSet = new Set(unlocked);
  var lastId = lastUnlockedNodeId || '一';

  // 1. 兄弟优先：同父节点下的未解锁节点
  var parent = getParent(lastId);
  if (parent) {
    var children = childrenMap.get(parent) || [];
    for (var i = 0; i < children.length; i++) {
      if (!unlockedSet.has(children[i]) && children[i] !== lastId) return children[i];
    }
  }

  // 2. 当前节点的子节点
  var child = (childrenMap.get(lastId) || []).find(function (c) { return !unlockedSet.has(c); });
  if (child) return child;

  // 3. 沿父链向上：祖父、曾祖父…每层找未解锁子节点
  var ancestor = parent;
  while (ancestor) {
    var ancKids = childrenMap.get(ancestor) || [];
    for (var i = 0; i < ancKids.length; i++) {
      if (!unlockedSet.has(ancKids[i]) && ancKids[i] !== lastId) return ancKids[i];
    }
    ancestor = getParent(ancestor);
  }

  // 4. BFS 全图搜索
  var visited = new Set();
  var queue = ['一'];
  while (queue.length > 0) {
    var id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    if (!unlockedSet.has(id)) continue;
    var kids = childrenMap.get(id) || [];
    for (var i = 0; i < kids.length; i++) {
      var ch = kids[i];
      if (!unlockedSet.has(ch)) return ch;
      if (!visited.has(ch)) queue.push(ch);
    }
  }

  // 5. 回退：任意未解锁节点
  for (var i = 0; i < ALL_NODES.length; i++) {
    if (!unlockedSet.has(ALL_NODES[i].id)) return ALL_NODES[i].id;
  }
  return null;
}

// 获取可见数据（战争迷雾）—— 完全对齐网页版 getVisibleData
function getVisibleData(unlocked, recommendedId) {
  var vn = new Set();
  var vl = [];
  var linkSeen = new Set();
  var unlockedSet = new Set(unlocked);

  unlocked.forEach(function (id) {
    if (nodeMap.has(id)) vn.add(id);
  });

  unlocked.forEach(function (id) {
    (childrenMap.get(id) || []).forEach(function (ch) {
      if (!nodeMap.has(ch)) return;
      vn.add(ch);
      var key = id + '→' + ch;
      (linkMap.get(key) || []).forEach(function (link) {
        if (!linkSeen.has(link)) { linkSeen.add(link); vl.push(link); }
      });
    });
  });

  if (recommendedId && nodeMap.has(recommendedId) && !vn.has(recommendedId)) {
    vn.add(recommendedId);
    var recParent = getParent(recommendedId);
    if (recParent && unlockedSet.has(recParent)) {
      var recKey = recParent + '→' + recommendedId;
      (linkMap.get(recKey) || []).forEach(function (link) {
        if (!linkSeen.has(link)) { linkSeen.add(link); vl.push(link); }
      });
    }
  }

  unlocked.forEach(function (src) {
    (childrenMap.get(src) || []).forEach(function (tgt) {
      if (unlockedSet.has(tgt)) {
        var key = src + '→' + tgt;
        (linkMap.get(key) || []).forEach(function (link) {
          if (!linkSeen.has(link)) { linkSeen.add(link); vl.push(link); }
        });
      }
    });
  });

  return { vn: Array.from(vn), vl: vl };
}

// Fisher-Yates 洗牌
function shuffle(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = array[i]; array[i] = array[j]; array[j] = t;
  }
  return array;
}

// 生成候选字（网页版逻辑：兄弟优先 + 随机补充）
function generateCandidates(nodeId, unlocked) {
  var n = nodeMap.get(nodeId);
  if (!n) return [];
  var correct = n.name;
  var usedNames = new Set([correct]);
  var distractors = [];

  var parent = getParent(nodeId);
  if (parent) {
    var siblings = (childrenMap.get(parent) || []).filter(function (id) {
      return id !== nodeId && !usedNames.has(nodeMap.get(id).name);
    });
    shuffle(siblings);
    for (var i = 0; i < Math.min(2, siblings.length); i++) {
      var name = nodeMap.get(siblings[i]).name;
      distractors.push(name);
      usedNames.add(name);
    }
  }

  var pool = ALL_NODES.filter(function (x) { return !usedNames.has(x.name); });
  shuffle(pool);
  var targetCount = 3;
  while (distractors.length < targetCount && pool.length > 0) {
    distractors.push(pool.shift().name);
  }

  var all = distractors.concat([correct]);
  shuffle(all);
  return all;
}

// 生成 ECharts 力导向图配置 — 完全对齐网页版 renderChart
function buildChartOption(unlocked, recommendedId) {
  var ret = getVisibleData(unlocked, recommendedId);
  var vn = ret.vn;
  var vl = ret.vl;
  console.log('[graph] buildChartOption | 可见节点: ' + vn.length + ' | 可见连线: ' + vl.length + ' | 推荐节点: ' + recommendedId);
  var unlockedSet = new Set(unlocked);
  var nodes = [];
  var links = [];

  vn.forEach(function (id) {
    var n = nodeMap.get(id);
    if (!n) return;
    var isUnlocked = unlockedSet.has(id);
    var isRoot = id === '一';
    var isRecommended = !isUnlocked && id === recommendedId;
    nodes.push({
      id: n.id,
      name: isRecommended ? '⭐?' : (isUnlocked ? n.name : '?'),
      symbolSize: isRoot ? 70 : (isRecommended ? 62 : (isUnlocked ? 55 : 39)),
      itemStyle: {
        color: isRecommended ? '#ffd700' : (isUnlocked ? (isRoot ? '#4a90e2' : '#f5a623') : '#f5a623'),
        borderColor: isRecommended ? '#ff6600' : (isUnlocked ? (isRoot ? '#357abd' : '#e6951a') : '#ccc'),
        borderWidth: isRecommended ? 5 : (isUnlocked ? 3 : 2),
        borderType: isRecommended ? 'solid' : (isUnlocked ? 'solid' : 'dashed'),
        shadowBlur: isRecommended ? 30 : (isUnlocked ? (isRoot ? 20 : 8) : 0),
        shadowColor: isRecommended ? 'rgba(255,215,0,0.8)' : (isUnlocked ? (isRoot ? 'rgba(74,144,226,0.3)' : 'rgba(245,166,35,0.15)') : 'transparent'),
        opacity: isRecommended ? 1 : (isUnlocked ? 1 : 0.35)
      },
      label: {
        show: true,
        color: isRecommended ? '#fff' : (isUnlocked ? '#fff' : '#999'),
        fontSize: isRecommended ? 18 : (isRoot ? 28 : (isUnlocked ? 22 : 14)),
        fontWeight: 'bold'
      },
      _raw: n
    });
  });

  var edgeIndexMap = {};
  var edgeCurves = [0.15, -0.15, 0.25, -0.25, 0.35, -0.35, 0.45, -0.45];
  vl.forEach(function (l) {
    var key = l.source + '→' + l.target;
    var idx = (edgeIndexMap[key] || 0);
    edgeIndexMap[key] = idx + 1;
    links.push({
      source: l.source,
      target: l.target,
      lineStyle: {
        color: linkColors[l.linkType] || '#999',
        type: linkDashes[l.linkType] || 'solid',
        width: 2,
        curveness: edgeCurves[idx % edgeCurves.length] || 0.2,
        opacity: 0.7
      },
      label: {
        show: true,
        formatter: l.branchName,
        fontSize: 10,
        backgroundColor: 'rgba(255,255,240,0.8)',
        padding: [2, 4]
      }
    });
  });

  // 小程序力导向参数调低，避免 timeout
  return {
    tooltip: {
      formatter: function (p) {
        if (p.dataType === 'node') {
          var n = p.data._raw;
          if (!n) return '';
          if (!unlockedSet.has(n.id)) return '🔒 点击猜猜这是什么字？';
          return '<b>' + n.name + '</b><br/>' + (n.pinyin || '') + '<br/>' + (n.oracle || '');
        }
        return (p.data._raw ? p.data._raw.branchName : '');
      }
    },
    series: [{
      type: 'graph',
      layout: 'circular',
      roam: true,
      draggable: true,
      circular: { rotateLabel: true },
      animation: false,
      data: nodes,
      links: links,
      emphasis: { focus: 'adjacency', lineStyle: { width: 4 } }
    }]
  };
}

module.exports = {
  initDataStructures: initDataStructures,
  getParent: getParent,
  getRecommendedNode: getRecommendedNode,
  getVisibleData: getVisibleData,
  generateCandidates: generateCandidates,
  buildChartOption: buildChartOption,
  getNodeMap: function () { return nodeMap; },
  getChildrenMap: function () { return childrenMap; },
  getNeighborMap: function () { return neighborMap; }
};
