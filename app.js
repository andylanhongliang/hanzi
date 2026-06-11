(function(){
  // ======================== 用户系统 ========================
  var USER_KEY = 'hanzi_active_user';
  var USERS_KEY = 'hanzi_users';
  var currentUser = null;
  var currentUserData = {}; // { unlocked, learned, stars, lastNode, recent, avatar, nickname, petLevel, petExp, petMessage, dailyTarget, lastActiveDate, streakDays, todayCount, history }
  var selectedAvatar = '👤';
  var avatarOptions = ['😀','😄','😎','🐼','🦊','🐢','🦁','🐥','🌟','🍉','🍇','🍒'];

  function getUserKey(field) {
    return 'hanzi_' + (currentUser || 'default') + '_' + field;
  }

  function loadUsers() {
    try {
      var raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  function saveUsers(users) {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch(e) {}
  }

  function createUser(name) {
    var users = loadUsers();
    if(users.indexOf(name) >= 0) return false;
    users.push(name);
    saveUsers(users);
    return true;
  }

  function switchUser(name) {
    currentUser = name;
    try { localStorage.setItem(USER_KEY, name); } catch(e) {}
    loadCurrentUserData();
    updateUserDisplay();
  }

  function getActiveUser() {
    if(currentUser) return currentUser;
    var saved = null;
    try { saved = localStorage.getItem(USER_KEY); } catch(e) {}
    if(saved) { currentUser = saved; }
    return currentUser;
  }

  function loadCurrentUserData() {
    var u = getActiveUser();
    if(!u) { currentUserData = { unlocked: ['一'], learned: ['一'], stars: 0, lastNode: '一', recent: [], mistakes: [], avatar: '👤', nickname: '', dailyTarget: 3, lastActiveDate: '', streakDays: 0, todayCount: 0, history: {}, petLevel: 1, petExp: 0, petMessage: '' }; return; }
    try {
      var raw = localStorage.getItem(getUserKey('unlocked'));
      if(raw) {
        currentUserData.unlocked = JSON.parse(raw);
        raw = localStorage.getItem(getUserKey('learned'));
        currentUserData.learned = raw ? JSON.parse(raw) : ['一'];
        currentUserData.stars = parseInt(localStorage.getItem(getUserKey('stars')) || '0');
        currentUserData.lastNode = localStorage.getItem(getUserKey('lastNode')) || '一';
        raw = localStorage.getItem(getUserKey('recent'));
        currentUserData.recent = raw ? JSON.parse(raw) : [];
        raw = localStorage.getItem(getUserKey('mistakes'));
        currentUserData.mistakes = raw ? JSON.parse(raw) : [];
        currentUserData.avatar = localStorage.getItem(getUserKey('avatar')) || '👤';
        // nickname 已废弃，用户名即显示名
        currentUserData.dailyTarget = parseInt(localStorage.getItem(getUserKey('dailyTarget')) || '3', 10);
        currentUserData.lastActiveDate = localStorage.getItem(getUserKey('lastActiveDate')) || '';
        currentUserData.streakDays = parseInt(localStorage.getItem(getUserKey('streakDays')) || '0', 10);
        currentUserData.todayCount = parseInt(localStorage.getItem(getUserKey('todayCount')) || '0', 10);
        raw = localStorage.getItem(getUserKey('history'));
        currentUserData.history = raw ? JSON.parse(raw) : {};
        currentUserData.petLevel = parseInt(localStorage.getItem(getUserKey('petLevel')) || '1', 10);
        currentUserData.petExp = parseInt(localStorage.getItem(getUserKey('petExp')) || '0', 10);
        currentUserData.petMessage = localStorage.getItem(getUserKey('petMessage')) || '';
        return;
      }
      // 尝试从旧格式迁移
      raw = localStorage.getItem('gameUnlocked');
      if(raw) {
        currentUserData.unlocked = JSON.parse(raw);
        var oldLearned = localStorage.getItem('learnedSet');
        currentUserData.learned = oldLearned ? JSON.parse(oldLearned) : currentUserData.unlocked;
        currentUserData.stars = parseInt(localStorage.getItem('starNum') || '0');
        currentUserData.lastNode = '一';
        currentUserData.recent = [];
        currentUserData.mistakes = [];
        saveCurrentUserData();
        localStorage.removeItem('gameUnlocked');
        localStorage.removeItem('learnedSet');
        localStorage.removeItem('starNum');
        return;
      }
      currentUserData = { unlocked: ['一'], learned: ['一'], stars: 0, lastNode: '一', recent: [], mistakes: [], avatar: '👤', nickname: '', dailyTarget: 3, lastActiveDate: '', streakDays: 0, todayCount: 0, history: {}, petLevel: 1, petExp: 0, petMessage: '' };
    } catch(e) {
      currentUserData = { unlocked: ['一'], learned: ['一'], stars: 0, lastNode: '一', recent: [], mistakes: [], avatar: '👤', nickname: '', dailyTarget: 3, lastActiveDate: '', streakDays: 0, todayCount: 0, history: {}, petLevel: 1, petExp: 0, petMessage: '' };
    }
  }

  function saveCurrentUserData() {
    var u = getActiveUser();
    if(!u) return;
    try {
      localStorage.setItem(getUserKey('unlocked'), JSON.stringify(Array.from(unlocked)));
      localStorage.setItem(getUserKey('learned'), JSON.stringify(Array.from(learnedSet)));
      localStorage.setItem(getUserKey('stars'), String(starCount));
      localStorage.setItem(getUserKey('lastNode'), lastUnlockedNodeId);
      localStorage.setItem(getUserKey('recent'), JSON.stringify(recentUnlocks));
      localStorage.setItem(getUserKey('mistakes'), JSON.stringify(Array.from(mistakeSet)));
      localStorage.setItem(getUserKey('avatar'), currentUserData.avatar || '👤');
      // nickname 已废弃
      localStorage.setItem(getUserKey('dailyTarget'), String(currentUserData.dailyTarget || 3));
      localStorage.setItem(getUserKey('lastActiveDate'), currentUserData.lastActiveDate || '');
      localStorage.setItem(getUserKey('streakDays'), String(currentUserData.streakDays || 0));
      localStorage.setItem(getUserKey('todayCount'), String(currentUserData.todayCount || 0));
      localStorage.setItem(getUserKey('history'), JSON.stringify(currentUserData.history || {}));
      localStorage.setItem(getUserKey('petLevel'), String(currentUserData.petLevel || 1));
      localStorage.setItem(getUserKey('petExp'), String(currentUserData.petExp || 0));
      localStorage.setItem(getUserKey('petMessage'), currentUserData.petMessage || '');
    } catch(e) {}
  }

  function updateUserDisplay() {
    var el = document.getElementById('userNameDisplay');
    var label = currentUser || '默认';
    if(el) el.innerText = label;
    var avatarEl = document.getElementById('userAvatar');
    if(avatarEl) avatarEl.innerText = currentUserData.avatar || '👤';
  }

  // ======================== 配置 ========================
  const STORAGE = { eyeProtect: 'eyeProtect' };
  let myChart = null;
  let unlocked = new Set(['一']);
  let learnedSet = new Set(['一']);
  let starCount = 0;
  let currentGuessTarget = null, currentHintIndex = 0, guessAttempts = 3;
  let nodePositionsCache = {}, useFixedPositions = false;
  var statsCache = null;
  var achievementsCache = null;
  let showOnlyUnlocked = false;
  let lastUnlockedNodeId = '一';
  var recentUnlocks = [];
  var soundEnabled = true;
  var mistakeSet = new Set();

  // 获取某节点下第一个未解锁的子节点
  function getFirstUnguessedChild(nodeId) {
    var children = childrenMap.get(nodeId) || [];
    for(var i = 0; i < children.length; i++) {
      if(!unlocked.has(children[i])) return children[i];
    }
    return null;
  }

  // 智能推荐下一节点（广度优先，逐层展开）：
  // 1. 优先推荐父节点的其他未解锁子节点（兄弟优先）
  // 2. 兄弟都解锁完了 → 看当前节点的子节点
  // 3. BFS 从根遍历，找第一个「已解锁但有未解锁子节点」的节点
  function getRecommendedNode() {
    // 1. 兄弟优先：同父节点下的未解锁节点
    var parent = getParent(lastUnlockedNodeId);
    if(parent) {
      var children = childrenMap.get(parent) || [];
      for(var i = 0; i < children.length; i++) {
        if(!unlocked.has(children[i]) && children[i] !== lastUnlockedNodeId) return children[i];
      }
    }
    // 2. 当前节点的子节点
    var child = getFirstUnguessedChild(lastUnlockedNodeId);
    if(child) return child;
    // 3. 沿父链向上：祖父、曾祖父…每层找未解锁子节点（保持在家族附近）
    var ancestor = parent;
    while(ancestor) {
      var ancKids = childrenMap.get(ancestor) || [];
      for(var i = 0; i < ancKids.length; i++) {
        if(!unlocked.has(ancKids[i]) && ancKids[i] !== lastUnlockedNodeId) return ancKids[i];
      }
      ancestor = getParent(ancestor);
    }
    // 4. BFS 全图搜索
    var visited = new Set();
    var queue = ['一'];
    while(queue.length > 0) {
      var id = queue.shift();
      if(visited.has(id)) continue;
      visited.add(id);
      if(!unlocked.has(id)) continue;
      var kids = childrenMap.get(id) || [];
      for(var i = 0; i < kids.length; i++) {
        var ch = kids[i];
        if(!unlocked.has(ch)) return ch;
        if(!visited.has(ch)) queue.push(ch);
      }
    }
    // 5. 回退：任意未解锁节点
    for(var i = 0; i < ALL_NODES.length; i++) {
      if(!unlocked.has(ALL_NODES[i].id)) return ALL_NODES[i].id;
    }
    return null;
  }

  // ======================== 数据预处理 ========================
  const nodeMap = new Map();           // id → node 对象
  const childrenMap = new Map();      // id → [child ids]
  const linkMap = new Map();          // "source→target" → [link数组]
  const neighborMap = new Map();      // id → [related ids]
  const parentMap = new Map();        // id → parent id（O(1)）

  function initDataStructures() {
    ALL_NODES.forEach(n => {
      nodeMap.set(n.id, n);
      childrenMap.set(n.id, []);
      neighborMap.set(n.id, []);
      parentMap.set(n.id, null);
    });
    ALL_LINKS.forEach(l => {
      if(!nodeMap.has(l.source) || !nodeMap.has(l.target)) return;
      const key = l.source + '→' + l.target;
      if(!linkMap.has(key)) linkMap.set(key, []);
      linkMap.get(key).push(l);
      if(childrenMap.get(l.source).indexOf(l.target) < 0) childrenMap.get(l.source).push(l.target);
      if(parentMap.get(l.target) === null) parentMap.set(l.target, l.source);
      if(neighborMap.get(l.source).indexOf(l.target) < 0) neighborMap.get(l.source).push(l.target);
      if(neighborMap.get(l.target).indexOf(l.source) < 0) neighborMap.get(l.target).push(l.source);
    });
  }

  function getParent(nodeId) {
    return parentMap.get(nodeId) || null;
  }

  // ======================== 可见数据（战争迷雾：仅1跳邻居） ========================
  // 只显示：已解锁节点 + 它们的直接子节点（"?"待猜）
  // 每解锁一个节点，它的子节点才出现在图谱中
  function getVisibleData(recommendedId) {
    const vn = new Set(), vl = [], linkSeen = new Set();
    if(recommendedId === undefined) recommendedId = getRecommendedNode();

    unlocked.forEach(function(id) {
      if(nodeMap.has(id)) vn.add(id);
    });

    unlocked.forEach(function(id) {
      (childrenMap.get(id) || []).forEach(function(ch) {
        if(!nodeMap.has(ch)) return;
        if(showOnlyUnlocked && ch !== recommendedId) return;
        vn.add(ch);
        const key = id + '→' + ch;
        (linkMap.get(key) || []).forEach(function(link) {
          if(!linkSeen.has(link)) { linkSeen.add(link); vl.push(link); }
        });
      });
    });

    if(recommendedId && nodeMap.has(recommendedId) && !vn.has(recommendedId)) {
      vn.add(recommendedId);
      var recParent = getParent(recommendedId);
      if(recParent && unlocked.has(recParent)) {
        var recKey = recParent + '→' + recommendedId;
        (linkMap.get(recKey) || []).forEach(function(link) {
          if(!linkSeen.has(link)) { linkSeen.add(link); vl.push(link); }
        });
      }
    }

    unlocked.forEach(function(src) {
      (childrenMap.get(src) || []).forEach(function(tgt) {
        if(unlocked.has(tgt)) {
          const key = src + '→' + tgt;
          (linkMap.get(key) || []).forEach(function(link) {
            if(!linkSeen.has(link)) { linkSeen.add(link); vl.push(link); }
          });
        }
      });
    });

    return { vn: Array.from(vn), vl };
  }

  // ======================== 用户数据持久化 ========================
  function saveUserData() {
    saveCurrentUserData();
  }

  function loadUserData() {
    loadCurrentUserData();
    unlocked = new Set(currentUserData.unlocked);
    learnedSet = new Set(currentUserData.learned);
    starCount = currentUserData.stars;
    lastUnlockedNodeId = currentUserData.lastNode;
    recentUnlocks = currentUserData.recent.slice();
    mistakeSet = new Set(currentUserData.mistakes || []);
  }

  function addLearnedChar(charId) {
    if(!learnedSet.has(charId)) {
      learnedSet.add(charId);
      saveUserData();
      return true;
    }
    return false;
  }

  // ======================== 位置保持 & 聚焦 ========================
  function captureNodePositions() {
    if(!myChart) return;
    try {
      nodePositionsCache = {};
      var opt = myChart.getOption();
      if(!opt.series || !opt.series[0] || !opt.series[0].data) return;
      opt.series[0].data.forEach(function(d) {
        if(d.x != null && d.y != null) nodePositionsCache[d.id] = [d.x, d.y];
      });
    } catch(e) {}
  }

  function applyFocus(nid, extraIds, centerId) {
    if(!myChart) return;
    var related = new Set([nid]);
    if(extraIds) extraIds.forEach(function(id) { related.add(id); });
    (childrenMap.get(nid) || []).forEach(function(c) { related.add(c); });
    var opt = myChart.getOption();
    if(!opt.series || !opt.series[0]) return;
    opt.series[0].data.forEach(function(item) {
      if(related.has(item.id)) {
        item.itemStyle.opacity = 1;
        item.itemStyle.shadowBlur = item.id === nid ? 25 : (extraIds && extraIds.indexOf(item.id) >= 0 ? 15 : 10);
      } else {
        item.itemStyle.opacity = 0.1;
        item.itemStyle.shadowBlur = 0;
      }
    });
    myChart.setOption(opt);
    // 居中到指定节点（默认新节点）
    var targetId = centerId || nid;
    setTimeout(function() {
      var d = myChart.getOption().series[0].data.find(function(x) { return x.id === targetId; });
      if(d && d.x != null && d.y != null) {
        myChart.dispatchAction({ type: 'graphRoam', dx: myChart.getWidth()/2 - d.x, dy: myChart.getHeight()/2 - d.y });
      }
    }, 300);
  }

  // ======================== 图谱渲染 ========================
  const linkColors = {
    '形似': '#8bc34a', '加笔': '#64b5f6', '减笔': '#ffb74d',
    '构件': '#ba68c8', '意义': '#e57373', '笔数': '#ffb74d', '语音': '#4dd0e1'
  };
  const linkDashes = {
    '加笔': 'dashed', '减笔': 'dotted', '构件': 'dashed',
    '笔数': 'dotted', '语音': 'dotted'
  };

  function renderChart() {
    if(!myChart) return;
    var recommendedId = getRecommendedNode();
    const { vn, vl } = getVisibleData(recommendedId);
    const nodes = [], links = [];
    vn.forEach(id => {
      const n = nodeMap.get(id);
      if(!n) return;
      const isUnlocked = unlocked.has(id);
      const isRoot = id === '一';
      const isRecommended = !isUnlocked && id === recommendedId;
      nodes.push({
        id: n.id, name: isRecommended ? '⭐?' : (isUnlocked ? n.name : '?'),
        symbolSize: isRoot ? 70 : (isRecommended ? 48 : (isUnlocked ? 55 : 30)),
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
        _raw: n,
        ...(useFixedPositions && nodePositionsCache[n.id] ? {
          x: nodePositionsCache[n.id][0],
          y: nodePositionsCache[n.id][1],
          fixed: true
        } : (isRecommended && !nodePositionsCache[n.id] ? {
          // 新推荐节点：初始位置放在父节点旁边，确保在视野内
          x: (function() {
            var p = getParent(n.id);
            if(p && nodePositionsCache[p]) return nodePositionsCache[p][0] + 60;
            var cw = myChart && myChart.getWidth && myChart.getWidth();
            return cw ? cw/2 : 400;
          })(),
          y: (function() {
            var p = getParent(n.id);
            if(p && nodePositionsCache[p]) return nodePositionsCache[p][1] + 60;
            var ch = myChart && myChart.getHeight && myChart.getHeight();
            return ch ? ch/2 : 400;
          })()
        } : {}))
      });
    });

    var edgeIndexMap = {};
    var edgeCurves = [0.15, -0.15, 0.25, -0.25, 0.35, -0.35, 0.45, -0.45];
    vl.forEach(l => {
      var key = l.source + '→' + l.target;
      var idx = (edgeIndexMap[key] || 0);
      edgeIndexMap[key] = idx + 1;
      links.push({
        source: l.source, target: l.target,
        lineStyle: {
          color: linkColors[l.linkType] || '#999',
          type: linkDashes[l.linkType] || 'solid',
          width: 2, curveness: edgeCurves[idx % edgeCurves.length] || 0.2, opacity: 0.7
        },
        label: { show: true, formatter: l.branchName, fontSize: 10, backgroundColor: 'rgba(255,255,240,0.8)', padding: [2,4] }
      });
    });

    myChart.setOption({
      tooltip: {
        formatter: function(p) {
          if(p.dataType === 'node') {
            var n = p.data._raw;
            if(!n) return '';
            if(!unlocked.has(n.id)) return '🔒 点击猜猜这是什么字？';
            return '<b>' + n.name + '</b><br/>' + (n.pinyin || '') + '<br/>' + (n.oracle || '');
          }
          return (p.data._raw ? p.data._raw.branchName : '');
        }
      },
      series: [{
        type: 'graph', layout: 'force', roam: 'scale', draggable: true,
        force: { repulsion: 400, gravity: 0.2, edgeLength: [80, 150], friction: 0.6 },
        data: nodes, links: links,
        emphasis: { focus: 'adjacency', lineStyle: { width: 4 } }
      }]
    }, true);
    // 启动推荐节点脉冲动画
    startPulse(recommendedId);
  }

  var pulseTimer = null;
  function startPulse(nodeId) {
    if(pulseTimer) clearInterval(pulseTimer);
    if(!nodeId || !myChart) return;
    var big = true;
    pulseTimer = setInterval(function() {
      if(!myChart) { clearInterval(pulseTimer); return; }
      var opt = myChart.getOption();
      if(!opt.series || !opt.series[0] || !opt.series[0].data) return;
      var allData = opt.series[0].data;
      var d = allData.find(function(x) { return x.id === nodeId; });
      if(!d) return;
      d.symbolSize = big ? 52 : 44;
      big = !big;
      // 传入完整 data 数组，不是只有 [d]
      myChart.setOption({ series: [{ data: allData }] });
    }, 600);
  }

  // ======================== 右侧面板 ========================
  function fillPanel(nodeId) {
    const node = nodeMap.get(nodeId);
    if(!node) return;
    document.querySelector('.empty-tip').style.display = 'none';
    document.getElementById('panelContent').style.display = 'block';
    document.getElementById('panelChar').innerText = node.name;
    document.getElementById('panelPinyin').innerText = node.pinyin || '';
    var tradEl = document.getElementById('panelTrad');
    if(node.nameTrad && node.nameTrad !== node.name) {
      tradEl.innerText = '繁：' + node.nameTrad;
      tradEl.style.display = '';
    } else {
      tradEl.style.display = 'none';
    }
    document.getElementById('panelOracle').innerText = node.oracle || '古人造字的智慧';
    document.getElementById('panelOrigin').innerText = node.origin || '一笔一划都有故事';
    const wordsWrap = document.getElementById('panelWords');
    wordsWrap.innerHTML = '';
    if(node.groupWords) {
      node.groupWords.split('|').forEach(function(w) {
        var span = document.createElement('span');
        span.className = 'tag-item'; span.innerText = w;
        wordsWrap.appendChild(span);
      });
    }
    const idiomsWrap = document.getElementById('panelIdioms');
    idiomsWrap.innerHTML = '';
    if(node.idioms) {
      node.idioms.split('|').forEach(function(item) {
        var parts = item.split('::');
        var span = document.createElement('span');
        span.className = 'tag-item'; span.innerText = parts[0];
        if(parts[1]) span.title = parts[1];
        idiomsWrap.appendChild(span);
      });
    }
    // 关联汉字
    const relatedWrap = document.getElementById('panelRelated');
    relatedWrap.innerHTML = '';
    var neighbors = (neighborMap.get(nodeId) || []).slice(0, 8);
    neighbors.forEach(function(nid) {
      var span = document.createElement('span');
      span.className = 'tag-item related-tag';
      span.innerText = nid;
      span.onclick = function() {
        if(!unlocked.has(nid)) {
          openGuess(nid);
        } else {
          fillPanel(nid);
          applyFocus(nid);
        }
      };
      relatedWrap.appendChild(span);
    });
  }

  // ======================== 猜字游戏（节点点击触发） ========================
  function openGuess(nodeId) {
    currentGuessTarget = nodeId;
    currentHintIndex = 0;
    guessAttempts = 3;
    var n = nodeMap.get(nodeId);
    if(!n) return;

    var hints = n.hints ? n.hints.split('|') : ['猜猜这个字是什么？'];
    document.getElementById('guessHint').innerText = '📖 ' + hints[0];
    document.getElementById('guessInput').value = '';
    document.getElementById('guessInput').style.display = '';
    document.getElementById('candidateWrap').style.display = 'none';
    document.getElementById('guessResult').innerHTML = '';
    document.getElementById('attemptCount').innerText = '💡 剩余机会：' + guessAttempts + '次  |  点"更多提示"获取线索';
    document.getElementById('guessSubmit').disabled = false;
    document.getElementById('guessSubmit').style.display = '';
    document.getElementById('guessMore').style.display = '';
    document.getElementById('guessMore').innerText = '💡 更多提示';
    document.getElementById('guessMore').onclick = nextHint;
    document.getElementById('guessNext').innerText = '跳过';
    document.getElementById('guessNext').onclick = closeGuess;
    document.querySelector('#guessMask .modal-title').innerText = '🔍 猜猜这是什么字？';
    document.getElementById('guessMask').classList.add('show');
    setTimeout(function() { document.getElementById('guessInput').focus(); }, 200);
  }

  function submitGuess() {
    if(!currentGuessTarget) return;
    var n = nodeMap.get(currentGuessTarget);
    var ans = document.getElementById('guessInput').value.trim();
    if(!ans) return;

    if(ans === n.name) {
      // ★ 答对了！
      unlocked.add(currentGuessTarget);
      lastUnlockedNodeId = currentGuessTarget; // 更新引导锚点
      // 记录最近解锁（去重，保留最近5个）
      recentUnlocks = recentUnlocks.filter(function(x) { return x !== currentGuessTarget; });
      recentUnlocks.unshift(currentGuessTarget);
      if(recentUnlocks.length > 5) recentUnlocks.pop();
      addLearnedChar(currentGuessTarget);
      starCount++;
      incStat('correctTotal');
      saveUserData();
      updateProgress();
      recordToday();
      checkAchievements();
      recordDailyLearn();
      showFirework();
      playCorrectSound();
      playUnlockSound();
      speakText('答对了！' + n.name);

      var detailHtml = '<div style="text-align:center;font-size:48px;color:#4a90e2;">' + n.name + '</div>';
      if(n.pinyin) detailHtml += '<div style="text-align:center;font-size:18px;color:#f5a623;">' + n.pinyin + '</div>';
      if(n.oracle) detailHtml += '<div style="margin-top:10px;font-weight:bold;color:#4a90e2;">汉字怎么来的？</div><div>' + n.oracle + '</div>';
      if(n.origin) detailHtml += '<div style="margin-top:8px;font-weight:bold;color:#4a90e2;">一句话记住</div><div>' + n.origin + '</div>';
      if(n.groupWords) detailHtml += '<div style="margin-top:8px;font-weight:bold;color:#4a90e2;">常用词语</div><div>' + n.groupWords.replace(/\|/g, ' · ') + '</div>';
      document.getElementById('guessResult').innerHTML = detailHtml;
      document.getElementById('guessSubmit').style.display = 'none';
      document.getElementById('guessMore').style.display = 'none';
      document.getElementById('guessInput').style.display = 'none';
      document.getElementById('attemptCount').innerText = '🎉 解锁成功！';
      document.getElementById('guessNext').innerText = '回到图谱';
      document.getElementById('guessNext').onclick = function() {
        closeGuess();
        fillPanel(currentGuessTarget);
        setTimeout(function() { locateToRecommended(); }, 600);
      };

      captureNodePositions();
      useFixedPositions = true;
      renderChart();
      useFixedPositions = false;
    } else {
      // 记录错字
      if(currentGuessTarget) { mistakeSet.add(currentGuessTarget); saveUserData(); }
      guessAttempts--;
      document.getElementById('attemptCount').innerText = '💡 剩余机会：' + guessAttempts + '次';
      if(guessAttempts > 0) {
        playWrongSound();
        document.getElementById('guessResult').innerHTML = '<span class="result-error">不对哦～再想想！</span>';
        document.getElementById('guessInput').select();
      } else {
        // 复习模式：放大展示正确汉字
        document.getElementById('guessHint').innerHTML = '<div class="review-char">' + n.name + '</div>';
        document.getElementById('candidateWrap').style.display = 'none';
        document.getElementById('guessInput').style.display = 'none';
        document.getElementById('guessResult').innerHTML = '<span style="color:var(--color-secondary);font-size:18px;">' + (n.pinyin || '') + '</span>';
        document.getElementById('attemptCount').innerText = n.origin || '记住它吧 💪';
        document.getElementById('guessSubmit').style.display = 'none';
        document.getElementById('guessMore').innerText = '🔊 再读';
        document.getElementById('guessMore').onclick = function() { speakText(n.name); };
        document.getElementById('guessNext').innerText = '记住了 ✅';
        document.getElementById('guessNext').onclick = closeGuess;
        speakText(n.name);
      }
    }
  }

  function nextHint() {
    if(!currentGuessTarget) return;
    var n = nodeMap.get(currentGuessTarget);
    if(!n || !n.hints) return;
    var hints = n.hints.split('|');
    currentHintIndex = Math.min(currentHintIndex + 1, hints.length - 1);
    document.getElementById('guessHint').innerText = '📖 ' + hints[currentHintIndex];
  }

  function generateCandidates(nodeId) {
    var n = nodeMap.get(nodeId);
    if(!n) return [];
    var correct = n.name;
    var usedNames = new Set([correct]);
    var distractors = [];

    // 优先：同一父节点的兄弟字（视觉/结构相关）
    var parent = getParent(nodeId);
    if(parent) {
      var siblings = (childrenMap.get(parent) || []).filter(function(id) {
        return id !== nodeId && !usedNames.has(nodeMap.get(id).name);
      });
      shuffle(siblings);
      for(var i = 0; i < Math.min(2, siblings.length); i++) {
        var name = nodeMap.get(siblings[i]).name;
        distractors.push(name);
        usedNames.add(name);
      }
    }

    // 补充：随机从剩余节点中选（手机端6个候选，电脑端4个）
    var isMobile = window.innerWidth < 768;
    var targetCount = isMobile ? 5 : 3;
    var pool = ALL_NODES.filter(function(x) { return !usedNames.has(x.name); });
    shuffle(pool);
    while(distractors.length < targetCount && pool.length > 0) {
      distractors.push(pool.shift().name);
    }

    var all = distractors.concat([correct]);
    shuffle(all); return all;
  }

  function shuffle(array) {
    for(var i = array.length-1; i>0; i--) { var j=Math.floor(Math.random()*(i+1)); var t=array[i]; array[i]=array[j]; array[j]=t; }
    return array;
  }

  function renderCandidates(candidates, correctAnswer) {
    var wrap = document.getElementById('candidateWrap');
    wrap.innerHTML = '';
    candidates.forEach(function(ch) {
      var btn = document.createElement('button');
      btn.className = 'candidate-btn';
      btn.innerText = ch;
      btn.onclick = function() {
        if(btn.classList.contains('correct') || btn.classList.contains('wrong')) return;
        if(ch === correctAnswer) {
          btn.classList.add('correct');
          document.getElementById('guessInput').value = ch;
          submitGuess();
        } else {
          btn.classList.add('wrong');
        }
      };
      wrap.appendChild(btn);
    });
    wrap.style.display = '';
  }

  function closeGuess() {
    currentGuessTarget = null;
    document.getElementById('guessMask').classList.remove('show');
  }

  function unlockNode(charId) {
    if(!unlocked.has(charId)) {
      unlocked.add(charId);
      renderChart();
      recordToday();
      checkAchievements();
    }
  }

  // ======================== 成就系统 ========================
  var achievements = [
    { id: 'first',     icon: '🌟', name: '初识汉字', desc: '认识第1个汉字', check: function() { return learnedSet.size >= 1; } },
    { id: 'newbie5',   icon: '🌱', name: '识字新手', desc: '认识5个汉字',   check: function() { return learnedSet.size >= 5; } },
    { id: 'learner20', icon: '📖', name: '识字达人', desc: '认识20个汉字',  check: function() { return learnedSet.size >= 20; } },
    { id: 'scholar50', icon: '🎓', name: '汉字小博士', desc: '认识50个汉字', check: function() { return learnedSet.size >= 50; } },
    { id: 'master100',icon: '👑', name: '汉字大师', desc: '认识100个汉字', check: function() { return learnedSet.size >= 100; } },
    { id: 'king200',  icon: '🏆', name: '汉字王者', desc: '认识200个汉字', check: function() { return learnedSet.size >= 200; } },
    { id: 'streak3',  icon: '🔥', name: '一马当先', desc: '连续3天学习',   check: function() { return getStreak() >= 3; } },
    { id: 'streak7',  icon: '💪', name: '坚持不懈', desc: '连续7天学习',   check: function() { return getStreak() >= 7; } },
    { id: 'days30',   icon: '📅', name: '全勤标兵', desc: '累计学习30天',  check: function() { return getTotalDays() >= 30; } },
    { id: 'correct10',icon: '🎯', name: '十全十美', desc: '累计答对10次',  check: function() { return getStat('correctTotal') >= 10; } },
    { id: 'correct100',icon:'💯', name: '百发百中', desc: '累计答对100次', check: function() { return getStat('correctTotal') >= 100; } },
    { id: 'review10', icon: '🔄', name: '知错能改', desc: '复习错字10次',  check: function() { return getStat('reviewCount') >= 10; } }
  ];

  function getAchievementKey() { return getUserKey('achievements'); }
  function getUnlockedAchievements() {
    if(achievementsCache) return achievementsCache;
    try { achievementsCache = JSON.parse(localStorage.getItem(getAchievementKey()) || '[]'); } catch(e) { achievementsCache = []; }
    return achievementsCache;
  }
  function saveAchievement(id) {
    var arr = getUnlockedAchievements();
    if(arr.indexOf(id) < 0) { arr.push(id); localStorage.setItem(getAchievementKey(), JSON.stringify(arr)); }
  }

  function getStats() {
    if(statsCache) return statsCache;
    try { statsCache = JSON.parse(localStorage.getItem(getUserKey('stats')) || '{}'); } catch(e) { statsCache = {}; }
    return statsCache;
  }
  function saveStats(s) { statsCache = s || statsCache || {}; localStorage.setItem(getUserKey('stats'), JSON.stringify(statsCache)); }
  function getStat(key) { var s = getStats(); return s[key] || 0; }
  function incStat(key) { var s = getStats(); s[key] = (s[key] || 0) + 1; saveStats(s); }

  function recordToday() {
    var today = new Date().toDateString();
    var s = getStats();
    s.lastDate = s.lastDate || '';
    if(s.lastDate !== today) {
      var yesterday = new Date(Date.now() - 86400000).toDateString();
      if(s.lastDate === yesterday) { s.streak = (s.streak || 0) + 1; }
      else { s.streak = 1; }
      s.days = (s.days || 0) + 1;
      s.lastDate = today;
      saveStats(s);
    }
  }
  function getStreak() { var s = getStats(); recordToday(); return s.streak || 0; }
  function getTotalDays() { var s = getStats(); recordToday(); return s.days || 0; }

  var lastAchieveToastTime = 0;
  function checkAchievements() {
    var unlocked = getUnlockedAchievements();
    var newAchieve = null;
    achievements.forEach(function(a) {
      if(unlocked.indexOf(a.id) < 0 && a.check()) {
        saveAchievement(a.id);
        if(!newAchieve) newAchieve = a;
      }
    });
    if(newAchieve && Date.now() - lastAchieveToastTime > 2000) {
      lastAchieveToastTime = Date.now();
      showAchievementToast(newAchieve);
    }
  }

  function showAchievementToast(a) {
    var toast = document.getElementById('milestoneToast');
    document.getElementById('milestoneBadge').innerText = a.icon;
    document.getElementById('milestoneTitle').innerText = a.name + '：' + a.desc;
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 2500);
    playCorrectSound();
  }

  function getAchievementById(id) {
    for(var i=0; i<achievements.length; i++) {
      if(achievements[i].id === id) return achievements[i];
    }
    return null;
  }

  // ======================== 宠物系统 ========================
  function getPetStageName(level) {
    if(level >= 8) return '汉字守护神';
    if(level >= 6) return '智慧小仙';
    if(level >= 4) return '活力小精灵';
    return '小萌宠';
  }
  function getPetExpToNext(level) { return 5 + (level - 1) * 5; }

  function updatePetUI() {
    var petStage = document.getElementById('petStageName');
    var petLevel = document.getElementById('petLevelDisplay');
    if(petStage) petStage.innerText = getPetStageName(currentUserData.petLevel || 1);
    if(petLevel) petLevel.innerText = 'Lv' + (currentUserData.petLevel || 1);
    var avatarEl = document.getElementById('petAvatar');
    if(avatarEl) {
      var map = {1:'🐯',4:'🐲',6:'🦅',8:'🐉'};
      var emoji = '🐯';
      if(currentUserData.petLevel >= 8) emoji = map[8];
      else if(currentUserData.petLevel >= 6) emoji = map[6];
      else if(currentUserData.petLevel >= 4) emoji = map[4];
      avatarEl.innerText = emoji;
    }
    var expFill = document.getElementById('petExpFill');
    var expFillCenter = document.getElementById('petExpFillCenter');
    var expLabel = document.getElementById('petExpLabel');
    var next = getPetExpToNext(currentUserData.petLevel || 1);
    var cur = currentUserData.petExp || 0;
    var pct = Math.min(100, Math.round((cur / next) * 100));
    if(expFill) expFill.style.width = pct + '%';
    if(expFillCenter) expFillCenter.style.width = pct + '%';
    if(expLabel) expLabel.innerText = cur + '/' + next;
  }

  function showPetBubble(message) {
    var bubble = document.getElementById('petBubble');
    if(!bubble) return;
    bubble.innerText = message || '继续努力，我会陪你成长！';
    bubble.style.display = 'block';
    bubble.style.opacity = '1';
    clearTimeout(bubble._hideTimer);
    bubble._hideTimer = setTimeout(function() {
      bubble.style.opacity = '0';
      setTimeout(function() { bubble.style.display = 'none'; }, 300);
    }, 2600);
  }

  function addPetExp(amount) {
    if(!currentUserData.petLevel) currentUserData.petLevel = 1;
    if(typeof currentUserData.petExp !== 'number') currentUserData.petExp = 0;
    currentUserData.petExp += amount;
    var next = getPetExpToNext(currentUserData.petLevel || 1);
    var leveled = false;
    if(currentUserData.petExp >= next) {
      currentUserData.petExp -= next;
      currentUserData.petLevel = (currentUserData.petLevel || 1) + 1;
      currentUserData.petMessage = '我长大啦！现在我是' + getPetStageName(currentUserData.petLevel) + '！';
      leveled = true;
    } else {
      currentUserData.petMessage = '我获得了 +' + amount + ' 经验，继续加油～';
    }
    showPetBubble(currentUserData.petMessage);
    if(leveled) { playUnlockSound(); speakText('太棒了！宠物进化了！'); }
    var avatarEl = document.getElementById('petAvatar');
    if(avatarEl) {
      avatarEl.classList.remove('bounce');
      void avatarEl.offsetWidth;
      avatarEl.classList.add('bounce');
      setTimeout(function(){ avatarEl.classList.remove('bounce'); }, 900);
    }
    if(leveled) spawnConfettiAt(avatarEl);
    saveCurrentUserData();
    updatePetUI();
  }

  function spawnConfettiAt(targetEl) {
    try {
      var zone = document.getElementById('petConfetti');
      if(!zone) return;
      var rect = targetEl ? targetEl.getBoundingClientRect() : { left: window.innerWidth/2, top: 80 };
      var colors = ['#ffd666','#ff6b6b','#7bd389','#66b3ff','#f5a623'];
      for(var i=0;i<18;i++) {
        var piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.background = colors[i % colors.length];
        var left = rect.left + (rect.width||40)/2 + (Math.random()-0.5)*80;
        var top = rect.top + (rect.height||40)/2 + (Math.random()-0.5)*20;
        piece.style.left = left + 'px';
        piece.style.top = top + 'px';
        piece.style.animationDelay = (Math.random()*0.5)+'s';
        zone.appendChild(piece);
        setTimeout(function() { if(piece.parentNode) piece.parentNode.removeChild(piece); }, 2000);
      }
    } catch(e) {}
  }

  // ======================== 每日学习统计 ========================
  function updateDailyTask() {
    var today = new Date().toDateString();
    if(currentUserData.lastActiveDate !== today) {
      currentUserData.lastActiveDate = today;
      var yesterday = new Date(Date.now()-86400000).toDateString();
      if(currentUserData.lastActiveDate_prev === yesterday) {
        currentUserData.streakDays = (currentUserData.streakDays||0)+1;
      } else {
        currentUserData.streakDays = 1;
      }
      currentUserData.todayCount = 0;
      currentUserData.lastActiveDate_prev = today;
    }
    var tip = document.getElementById('dailyTaskTip');
    if(tip) tip.innerText = '今日任务：已学' + (currentUserData.todayCount||0) + ' / ' + (currentUserData.dailyTarget||3) + ' 个字';
    var todayEl = document.getElementById('myTodayCount');
    if(todayEl) todayEl.innerText = (currentUserData.todayCount||0);
    var streakEl = document.getElementById('myStreakDays');
    if(streakEl) streakEl.innerText = (currentUserData.streakDays||0) + '天';
    // 🏠 家长报告
    try {
      var pd = document.getElementById('parentWeekDays');
      if(pd) pd.innerText = (currentUserData.streakDays||0) + '天';
      var pn = document.getElementById('parentWeekNew');
      if(pn) pn.innerText = (currentUserData.todayCount||0) + '个';
      var pm = document.getElementById('parentMistakes');
      if(pm) pm.innerText = (mistakeSet ? mistakeSet.size : 0) + '个';
      var pg = document.getElementById('parentTodayGoal');
      if(pg) pg.innerText = (currentUserData.todayCount||0) + '/' + (currentUserData.dailyTarget||3);
    } catch(e) {}
    saveCurrentUserData();
  }

  function recordDailyLearn() {
    currentUserData.todayCount = (currentUserData.todayCount||0)+1;
    addPetExp(1);
    updateDailyTask();
  }

  // ======================== 用户档案 ========================
  function setSelectedAvatar(emoji) { selectedAvatar = emoji; }

  function renderAvatarPicker() {
    var picker = document.getElementById('avatarPicker');
    if(!picker) return;
    picker.innerHTML = '';
    avatarOptions.forEach(function(emoji) {
      var opt = document.createElement('span');
      opt.className = 'avatar-option' + (emoji === (currentUserData.avatar||'👤') ? ' active' : '');
      opt.innerText = emoji;
      opt.onclick = function() {
        selectedAvatar = emoji;
        Array.from(picker.children).forEach(function(c) { c.classList.remove('active'); });
        opt.classList.add('active');
      };
      picker.appendChild(opt);
    });
    selectedAvatar = currentUserData.avatar || '👤';
  }

  function saveProfile() {
    // 用户名即显示名，点击保存直接关闭弹窗
    document.getElementById('userMask').classList.remove('show');
  }

  // ======================== 辅助功能 ========================
  function speakText(text) {
    try {
      window.speechSynthesis.cancel();
      var utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'zh-CN'; utter.rate = 0.8;
      window.speechSynthesis.speak(utter);
    } catch(e) {}
  }

  function showFirework() {
    var particles = document.querySelectorAll('.firework');
    var emojis = ['🎉','⭐','🌟','✨','🎊'];
    for(var i=0; i<3 && i<particles.length; i++) {
      var p = particles[i];
      p.innerHTML = emojis[Math.floor(Math.random()*emojis.length)];
      p.style.left = 30+Math.random()*40+'%';
      p.style.display = 'block';
      setTimeout(function() { p.style.display = 'none'; }, 1200);
    }
    speakText('好棒！');
  }

  function updateProgress() {
    var total = ALL_NODES.length;
    var done = unlocked.size;
    var pct = done / total;
    var circumference = 2 * Math.PI * 42; // ~263.89
    var fill = document.getElementById('progressFill');
    var text = document.getElementById('progressText');
    if(fill) {
      fill.style.strokeDashoffset = circumference * (1 - pct);
      var color = pct < 0.15 ? '#f5a623' : pct < 0.35 ? '#64b5f6' : pct < 0.65 ? '#4a90e2' : '#52c41a';
      fill.style.stroke = color;
    }
    if(text) text.innerText = done + '/' + total;
    // 检查里程碑
    checkMilestone(done);
  }

  // ======================== 音效（Web Audio API） ========================
  var audioCtx = null;
  function getAudioCtx() {
    if(!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    return audioCtx;
  }

  function playCorrectSound() {
    if(!soundEnabled) return;
    var ctx = getAudioCtx();
    if(!ctx) return;
    var now = ctx.currentTime;
    [523.25, 659.25].forEach(function(freq, i) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.3);
    });
  }

  function playWrongSound() {
    if(!soundEnabled) return;
    var ctx = getAudioCtx();
    if(!ctx) return;
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'square'; osc.frequency.value = 180;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.2);
  }

  function playUnlockSound() {
    if(!soundEnabled) return;
    var ctx = getAudioCtx();
    if(!ctx) return;
    var now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach(function(freq, i) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.35);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.35);
    });
  }

  var milestones = [
    { count: 10, badge: '🌱', title: '识字萌芽' },
    { count: 20, badge: '🌿', title: '识字新苗' },
    { count: 50, badge: '🌳', title: '识字小树' },
    { count: 100, badge: '🏆', title: '识字达人' },
    { count: 200, badge: '🎖️', title: '识字高手' },
    { count: 300, badge: '👑', title: '识字大师' },
    { count: 400, badge: '🐉', title: '汉字龙王' },
    { count: 500, badge: '🌟', title: '汉字之神' }
  ];
  var lastMilestone = 0;

  function checkMilestone(count) {
    for(var i = 0; i < milestones.length; i++) {
      if(count >= milestones[i].count && milestones[i].count > lastMilestone) {
        lastMilestone = milestones[i].count;
        showMilestone(milestones[i]);
        break;
      }
    }
  }

  function showMilestone(m) {
    document.getElementById('milestoneBadge').innerText = m.badge;
    document.getElementById('milestoneTitle').innerText = m.title;
    var toast = document.getElementById('milestoneToast');
    toast.classList.add('show');
    playUnlockSound();
    speakText('太棒了！你获得了' + m.title + '徽章！');
    setTimeout(function() { toast.classList.remove('show'); }, 2800);
  }

  function updateMyCenter() {
    document.getElementById('myCharNum').innerText = learnedSet.size;
    document.getElementById('myStarNum').innerText = starCount;
    document.getElementById('myLevel').innerText = '第' + (Math.ceil(learnedSet.size/10)+1) + '关';
    // 最近解锁的字
    var rc = document.getElementById('recentChars');
    rc.innerHTML = '';
    if(recentUnlocks.length === 0) {
      rc.innerHTML = '<span style="color:var(--text-secondary);font-size:14px;">开始探索吧！</span>';
    } else {
      recentUnlocks.forEach(function(id) {
        var span = document.createElement('span');
        span.className = 'tag-item'; span.innerText = id;
        rc.appendChild(span);
      });
    }
    // 错字
    var mc = document.getElementById('mistakeChars');
    mc.innerHTML = '';
    var mistakes = Array.from(mistakeSet);
    if(mistakes.length === 0) {
      mc.innerHTML = '<span style="color:var(--text-secondary);font-size:14px;">暂无错字 👍</span>';
    } else {
      mistakes.forEach(function(id) {
        var span = document.createElement('span');
        span.className = 'tag-item'; span.style.background = 'rgba(255,77,79,0.12)'; span.style.color = '#ff4d4f'; span.innerText = id;
        mc.appendChild(span);
      });
    }
    document.getElementById('reviewMistakes').style.display = mistakes.length > 0 ? '' : 'none';
    document.getElementById('mistakeLabel').style.display = ''; // always show label
    if(mistakes.length === 0) document.getElementById('mistakeLabel').innerText = '错字本 (0)';
    else document.getElementById('mistakeLabel').innerText = '错字本 (' + mistakes.length + ')';
    // 成就展示
    var badgeEl = document.getElementById('myBadge');
    badgeEl.innerHTML = '';
    var unlockedAchieves = getUnlockedAchievements();
    if(unlockedAchieves.length === 0) {
      badgeEl.innerHTML = '<span style="color:var(--text-secondary);font-size:14px;">继续探索解锁成就！</span>';
    } else {
      unlockedAchieves.forEach(function(aid) {
        var a = getAchievementById(aid);
        if(!a) return;
        var span = document.createElement('span');
        span.className = 'tag-item achievement-tag';
        span.title = a.desc;
        span.innerHTML = a.icon + ' ' + a.name;
        badgeEl.appendChild(span);
      });
    }
  }

  // ======================== 复习闪卡 ========================
  var reviewList = [], reviewIdx = 0;
  function loadReview() {
    reviewList = Array.from(mistakeSet);
    if(reviewList.length === 0) return;
    reviewIdx = 0;
    showReviewCard();
    document.getElementById('reviewMask').classList.add('show');
  }
  function showReviewCard() {
    if(reviewIdx >= reviewList.length) {
      document.getElementById('reviewMask').classList.remove('show');
      updateMyCenter();
      return;
    }
    var id = reviewList[reviewIdx];
    var node = nodeMap.get(id);
    document.getElementById('reviewChar').innerText = node ? node.name : id;
    document.getElementById('reviewPinyin').innerText = node ? (node.pinyin || '') : '';
    document.getElementById('reviewOrigin').innerText = node ? (node.oracle || '') : '';
    if(node) speakText(node.name);
  }
  function removeMistake() {
    var id = reviewList[reviewIdx];
    mistakeSet.delete(id);
    incStat('reviewCount');
    saveUserData();
    reviewList.splice(reviewIdx, 1);
    if(reviewList.length === 0) {
      document.getElementById('reviewMask').classList.remove('show');
      updateMyCenter();
      return;
    }
    if(reviewIdx >= reviewList.length) reviewIdx = 0;
    showReviewCard();
  }
  function skipReview() {
    reviewIdx++;
    showReviewCard();
  }

  // ======================== UI 绑定 ========================
  function bindUI() {
    // 缩放工具（graph 类型需直接操作 zoom 属性）
    function getZoom() {
      var opt = myChart && myChart.getOption();
      return (opt && opt.series && opt.series[0] && opt.series[0].zoom) || 1;
    }
    function setZoom(z) {
      if(!myChart) return;
      myChart.setOption({ series: [{ zoom: Math.max(0.2, Math.min(5, z)) }] });
    }
    document.getElementById('zoomIn').onclick = function() { setZoom(getZoom() * 1.3); };
    document.getElementById('zoomOut').onclick = function() { setZoom(getZoom() / 1.3); };
    document.getElementById('resetView').onclick = function() { setZoom(1); myChart && myChart.dispatchAction({type:'restore'}); };
    document.getElementById('backRoot').onclick = function() { setZoom(1); myChart && myChart.dispatchAction({type:'restore'}); };
    // 只看已解锁切换
    document.getElementById('filterBtn').onclick = function() {
      showOnlyUnlocked = !showOnlyUnlocked;
      this.classList.toggle('active', showOnlyUnlocked);
      this.innerText = showOnlyUnlocked ? '🔍' : '⭐';
      this.title = showOnlyUnlocked ? '显示全部节点' : '只看已解锁的字';
      renderChart();
    };
    // 定位到指定节点
    function locateToNode(nodeId, retryLeft) {
      if(!nodeId || !myChart) return;
      if(retryLeft === undefined) retryLeft = 5;
      var opt = myChart.getOption();
      if(!opt.series || !opt.series[0] || !opt.series[0].data) {
        if(retryLeft > 0) setTimeout(function() { locateToNode(nodeId, retryLeft - 1); }, 400);
        return;
      }
      var node = opt.series[0].data.find(function(d) { return d.id === nodeId; });
      if(!node || node.x == null || node.y == null) {
        // 节点坐标未就绪，延迟重试
        if(retryLeft > 0) setTimeout(function() { locateToNode(nodeId, retryLeft - 1); }, 400);
        return;
      }
      myChart.setOption({ series: [{ zoom: 1.5 }] });
      setTimeout(function() {
        var dx = (myChart.getWidth() / 2 - node.x) * 0.7;
        var dy = (myChart.getHeight() / 2 - node.y) * 0.7;
        myChart.dispatchAction({ type: 'graphRoam', seriesIndex: 0, dx: dx, dy: dy });
      }, 150);
    }
    function locateToRecommended() {
      var rec = getRecommendedNode();
      if(!rec) {
        var tip = document.getElementById('hintTip');
        if(tip) { tip.innerText = '🎉 太棒了！所有汉字都解锁了！'; tip.classList.add('show'); tip.style.color = '#52c41a'; setTimeout(function(){ tip.classList.remove('show'); tip.style.color = ''; tip.innerText = '点击 ⭐? 猜字解锁 · 点击汉字查看详情 · 滚轮缩放'; }, 2000); }
        return;
      }
      clearFocus();
      locateToNode(rec);
    }

    // 自动定位（布局已稳定，最多 3 次重试）
    function autoLocateRecommended(attempt) {
      if(attempt >= 3) return;
      if(!myChart) return;
      // 图表尺寸未就绪则重试
      var cw = myChart.getWidth(), ch = myChart.getHeight();
      if(!cw || !ch || cw < 100) {
        setTimeout(function() { autoLocateRecommended(attempt + 1); }, 400);
        return;
      }
      var rec = getRecommendedNode();
      if(!rec) return;
      var opt = myChart.getOption();
      if(!opt.series || !opt.series[0] || !opt.series[0].data) {
        setTimeout(function() { autoLocateRecommended(attempt + 1); }, 400);
        return;
      }
      var node = opt.series[0].data.find(function(d) { return d.id === rec; });
      if(!node || node.x == null || node.y == null) {
        setTimeout(function() { autoLocateRecommended(attempt + 1); }, 400);
        return;
      }
      // 平移到推荐节点（显式指定 seriesIndex）
      var dx = (cw / 2 - node.x) * 0.7;
      var dy = (ch / 2 - node.y) * 0.7;
      myChart.dispatchAction({ type: 'graphRoam', seriesIndex: 0, dx: dx, dy: dy });
    }

    function clearFocus() {
      if(!myChart) return;
      var opt = myChart.getOption();
      if(!opt.series || !opt.series[0] || !opt.series[0].data) return;
      var changed = false;
      opt.series[0].data.forEach(function(item) {
        if(item.itemStyle && item.itemStyle.opacity !== undefined && item.itemStyle.opacity < 1) {
          item.itemStyle.opacity = 1;
          item.itemStyle.shadowBlur = 0;
          changed = true;
        }
      });
      if(changed) myChart.setOption(opt);
    }
    document.getElementById('asideToggle').onclick = function() {
      document.getElementById('asidePanel').classList.toggle('hide');
      document.getElementById('asideToggle').classList.toggle('hide');
    };
    document.getElementById('voicePlay').onclick = function() {
      var ch = document.getElementById('panelChar').innerText;
      if(ch) speakText(ch);
    };

    // 图表交互
    if(myChart) {
      myChart.off('click');
      myChart.on('click', function(params) {
        if(params.dataType !== 'node') return;
        var id = params.data.id;
        // 可见反馈：底部提示闪烁
        var tip = document.getElementById('hintTip');
        if(tip) { tip.classList.add('show'); tip.style.color = '#f5a623'; setTimeout(function(){ tip.classList.remove('show'); tip.style.color = ''; }, 1200); }
        if(!unlocked.has(id)) {
          // 未解锁 → 猜字
          openGuess(id);
        } else {
          // 已解锁 → 填充面板内容（手机端不自动弹出，桌面端弹出）
          var panel = document.getElementById('asidePanel');
          var isMobile = window.innerWidth < 768;
          if(!isMobile && panel.classList.contains('hide')) {
            panel.classList.remove('hide');
            document.getElementById('asideToggle').classList.remove('hide');
          }
          fillPanel(id);
          applyFocus(id);
          speakText(params.data.name);
        }
      });
    }

    // 搜索功能
    var searchInput = document.getElementById('searchInput');
    var searchResults = document.getElementById('searchResults');
    searchInput.addEventListener('input', function() {
      var q = this.value.trim();
      if(!q) { searchResults.classList.remove('show'); return; }
      var matches = ALL_NODES.filter(function(n) {
        return n.name.indexOf(q) >= 0 || (n.pinyin && n.pinyin.indexOf(q) >= 0);
      }).slice(0, 8);
      searchResults.innerHTML = '';
      if(matches.length === 0) {
        searchResults.classList.remove('show');
        return;
      }
      matches.forEach(function(n) {
        var div = document.createElement('div');
        div.className = 'search-item';
        div.innerHTML = '<span class="char">' + n.name + '</span><span class="pinyin">' + (n.pinyin||'') + '</span>';
        div.onclick = function() {
          searchResults.classList.remove('show');
          searchInput.value = '';
          if(!unlocked.has(n.id)) {
            openGuess(n.id);
          } else {
            var panel = document.getElementById('asidePanel');
            var isMobile = window.innerWidth < 768;
            if(!isMobile && panel.classList.contains('hide')) { panel.classList.remove('hide'); document.getElementById('asideToggle').classList.remove('hide'); }
            fillPanel(n.id);
            applyFocus(n.id);
          }
          locateToNode(n.id);
        };
        searchResults.appendChild(div);
      });
      searchResults.classList.add('show');
    });
    searchInput.addEventListener('blur', function() {
      setTimeout(function() { searchResults.classList.remove('show'); }, 200);
    });

    // 猜字弹窗事件
    document.getElementById('guessClose').onclick = closeGuess;
    document.getElementById('guessMask').onclick = function(e) { if(e.target === this) closeGuess(); };
    document.getElementById('guessInput').onkeydown = function(e) { if(e.key === 'Enter') submitGuess(); };

    document.getElementById('guessSubmit').onclick = submitGuess;
    document.getElementById('guessMore').onclick = function() {
      nextHint();
    };

    document.getElementById('guessNext').onclick = closeGuess;

    document.getElementById('starClose').onclick = function() { document.getElementById('starMask').classList.remove('show'); };

    var parentMask = document.getElementById('parentMask');
    document.getElementById('parentBtn').onclick = function() { parentMask.classList.add('show'); };
    document.getElementById('starBtn').onclick = function() {
      updateMyCenter(); document.getElementById('starMask').classList.add('show');
    };
    // 复习错字
    document.getElementById('reviewMistakes').onclick = function() {
      document.getElementById('starMask').classList.remove('show');
      loadReview();
    };
    document.getElementById('reviewClose').onclick = function() { document.getElementById('reviewMask').classList.remove('show'); };
    document.getElementById('reviewKnow').onclick = removeMistake;
    document.getElementById('reviewSkip').onclick = skipReview;
    document.getElementById('reviewMask').onclick = function(e) { if(e.target === this) this.classList.remove('show'); };
    document.getElementById('parentClose').onclick = function() { parentMask.classList.remove('show'); };

    // ======================== 用户切换 ========================
    function renderUserList() {
      var list = document.getElementById('userList');
      var users = loadUsers();
      list.innerHTML = '';
      users.forEach(function(name) {
        var div = document.createElement('div');
        div.className = 'user-item' + (name === currentUser ? ' active' : '');
        div.innerText = name;
        div.onclick = function() {
          switchUser(name);
          reloadAll();
          document.getElementById('userMask').classList.remove('show');
        };
        list.appendChild(div);
      });
    }

    function reloadAll() {
      unlocked = new Set(currentUserData.unlocked);
      learnedSet = new Set(currentUserData.learned);
      starCount = currentUserData.stars;
      lastUnlockedNodeId = currentUserData.lastNode;
      recentUnlocks = currentUserData.recent.slice();
      updateProgress();
      renderChart();
      updateUserDisplay();
      setTimeout(function() { locateToRecommended(); }, 600);
    }

    document.getElementById('userBtn').onclick = function() {
      renderUserList();
      document.getElementById('newUserName').value = '';
      document.getElementById('userMask').classList.add('show');
    };
    document.getElementById('userClose').onclick = function() {
      document.getElementById('userMask').classList.remove('show');
    };
    document.getElementById('userCreate').onclick = function() {
      var name = document.getElementById('newUserName').value.trim();
      if(!name) return;
      if(createUser(name)) {
        switchUser(name);
        reloadAll();
        document.getElementById('userMask').classList.remove('show');
      } else {
        alert('该用户名已存在！');
      }
    };
    // 保存档案
    try { document.getElementById('saveProfileBtn').onclick = saveProfile; } catch(e) {}
    document.getElementById('userMask').onclick = function(e) {
      if(e.target === this) this.classList.remove('show');
    };

    // 首次使用自动弹出用户选择
    if(!getActiveUser()) {
      setTimeout(function() {
        renderUserList();
        document.getElementById('userMask').classList.add('show');
      }, 1500);
    }

    // 护眼模式
    var eyeSwitch = document.getElementById('eyeSwitch');
    var eyeBtn = document.getElementById('eyeBtn');
    function toggleEye() {
      document.documentElement.classList.toggle('eye-protect');
      eyeSwitch.classList.toggle('active');
      localStorage.setItem(STORAGE.eyeProtect, eyeSwitch.classList.contains('active'));
    }
    if(localStorage.getItem(STORAGE.eyeProtect) === 'true') {
      document.documentElement.classList.add('eye-protect'); eyeSwitch.classList.add('active');
    }
    // 音效开关
    var muteBtn = document.getElementById('muteBtn');
    if(localStorage.getItem('soundEnabled') === 'false') {
      soundEnabled = false;
      muteBtn.innerText = '🔇';
    }
    muteBtn.onclick = function() {
      soundEnabled = !soundEnabled;
      this.innerText = soundEnabled ? '🔊' : '🔇';
      localStorage.setItem('soundEnabled', soundEnabled);
    };
    eyeSwitch.onclick = toggleEye;
    eyeBtn.onclick = toggleEye;

    // 遮罩点击关闭
    document.querySelectorAll('.modal-mask').forEach(function(mask) {
      mask.addEventListener('click', function(e) { if(e.target === mask) mask.classList.remove('show'); });
    });

    // 加载动画
    setTimeout(function() {
      document.getElementById('loadingMask').classList.add('hide');
      speakText('欢迎来到汉字王国');
    }, 1200);
  }

  // ======================== 启动 ========================
  function init() {
    try {
      if(typeof ALL_NODES === 'undefined' || typeof ALL_LINKS === 'undefined') {
        document.querySelector('.loading-text').innerText = '数据加载失败';
        return;
      }
      initDataStructures();
      loadUserData();
      updateUserDisplay();
      // 初始化里程碑状态
      for(var mi = milestones.length-1; mi >= 0; mi--) {
        if(unlocked.size >= milestones[mi].count) { lastMilestone = milestones[mi].count; break; }
      }
      updateProgress();
      var chartDom = document.getElementById('chart');
      if(!chartDom) throw new Error('找不到图表容器');
      myChart = echarts.init(chartDom);
      renderChart();
      bindUI();
      // 启动后自动定位到推荐节点
      setTimeout(function() {
        locateToRecommended();
      }, 800);
      updateDailyTask();
      updatePetUI();
      window.addEventListener('resize', function() { if(myChart) myChart.resize(); });
      console.log('汉字王国初始化完成 | 用户: ' + (currentUser||'默认') + ' | 已解锁: ' + unlocked.size + ' 个');
    } catch(e) {
      console.error('初始化失败:', e);
      document.querySelector('.loading-text').innerText = '加载出错: ' + e.message;
      document.getElementById('loadingMask').classList.remove('hide');
    }
  }
  init();
})();