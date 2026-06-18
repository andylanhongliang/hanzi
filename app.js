(function(){
  // ======================== 用户系统 ========================
  var USER_KEY = 'hanzi_active_user';
  var USERS_KEY = 'hanzi_users';
  var currentUser = null;
  var currentUserData = {}; // { unlocked, learned, stars, lastNode, recent, avatar, nickname, petLevel, petExp, petMessage, dailyTarget, lastActiveDate, streakDays, todayCount, history, skillCooldowns }
  var selectedAvatar = '👤';
  var avatarOptions = ['😀','😄','😎','🐼','🦊','🐢','🦁','🐥','🌟','🍉','🍇','🍒'];

  // ======================== 宠物技能系统 ========================
  const PET_SKILLS = {
    hint: { name: '提示', icon: '💡', unlockLevel: 1, cooldown: 2, desc: '排除一个错误答案' }
  };
  
  // ======================== 宠物皮肤系统 ========================
  const PET_SKINS = {
    1: [
      { id: 'tiger', name: '小老虎', emoji: '🐯', price: 0 },
      { id: 'panda', name: '小熊猫', emoji: '🐼', price: 50 },
      { id: 'fox', name: '小狐狸', emoji: '🦊', price: 50 }
    ],
    4: [
      { id: 'dragon', name: '小龙', emoji: '🐲', price: 0 },
      { id: 'lion', name: '小狮子', emoji: '🦁', price: 100 },
      { id: 'wolf', name: '小狼', emoji: '🐺', price: 100 }
    ],
    6: [
      { id: 'eagle', name: '雄鹰', emoji: '🦅', price: 0 },
      { id: 'owl', name: '猫头鹰', emoji: '🦉', price: 150 },
      { id: 'parrot', name: '鹦鹉', emoji: '🦜', price: 150 }
    ],
    8: [
      { id: 'dragon2', name: '神龙', emoji: '🐉', price: 0 },
      { id: 'unicorn', name: '独角兽', emoji: '🦄', price: 200 },
      { id: 'griffin', name: '狮鹫', emoji: '🦁', price: 200 }
    ]
  };
  
  // ======================== 每日签到与任务系统 ========================
  var DAILY_TASKS = [
    { id: 'learn3', name: '学习汉字', desc: '今日学习3个新汉字', target: 3, reward: { type: 'stars', amount: 5 }, icon: '📚' },
    { id: 'review', name: '复习巩固', desc: '完成1次复习', target: 1, reward: { type: 'stars', amount: 3 }, icon: '🔄' },
    { id: 'guess5', name: '汉字猜猜乐', desc: '猜字5次', target: 5, reward: { type: 'petExp', amount: 2 }, icon: '🎮' }
  ];
  
  var WEEKLY_TASKS = [
    { id: 'weekLearn20', name: '本周学习', desc: '本周学习20个新汉字', target: 20, reward: { type: 'stars', amount: 20 }, icon: '📖' },
    { id: 'weekStreak7', name: '连续签到', desc: '本周签到7天', target: 7, reward: { type: 'petExp', amount: 10 }, icon: '🔥' }
  ];
  
  function getTodayStr() {
    return new Date().toDateString();
  }
  
  function getWeekStr() {
    var now = new Date();
    var startOfYear = new Date(now.getFullYear(), 0, 1);
    var weekNum = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    return now.getFullYear() + '-W' + weekNum;
  }
  
  function checkDailyTasksReset() {
    var today = getTodayStr();
    var lastDate = currentUserData.dailyTasks.lastResetDate;
    if(lastDate !== today) {
      currentUserData.dailyTasks = { lastResetDate: today };
      DAILY_TASKS.forEach(function(t) {
        currentUserData.dailyTasks[t.id] = 0;
      });
      saveCurrentUserData();
    }
  }
  
  function updateDailyTaskProgress(taskId, amount) {
    checkDailyTasksReset();
    if(!currentUserData.dailyTasks[taskId]) {
      currentUserData.dailyTasks[taskId] = 0;
    }
    currentUserData.dailyTasks[taskId] += amount;
    var task = DAILY_TASKS.find(function(t) { return t.id === taskId; });
    if(task && currentUserData.dailyTasks[taskId] >= task.target) {
      if(!currentUserData.dailyTasks[taskId + '_completed']) {
        currentUserData.dailyTasks[taskId + '_completed'] = true;
        var reward = task.reward;
        if(reward.type === 'stars') {
          currentUserData.stars += reward.amount;
          starCount += reward.amount;
          showNotification('✨ 任务完成！获得 ' + reward.amount + ' 颗星星！', 'success');
        } else if(reward.type === 'petExp') {
          addPetExp(reward.amount);
          showNotification('✨ 任务完成！宠物获得 ' + reward.amount + ' 经验！', 'success');
        }
        triggerConfetti(15);
      }
    }
    saveCurrentUserData();
  }
  
  function doSignIn() {
    var today = getTodayStr();
    if(currentUserData.lastSignDate === today) {
      showNotification('今日已签到，明天再来吧！', 'info');
      return false;
    }
    
    var yesterday = new Date(Date.now() - 86400000).toDateString();
    if(currentUserData.lastSignDate === yesterday) {
      currentUserData.signStreak = (currentUserData.signStreak || 0) + 1;
    } else {
      currentUserData.signStreak = 1;
    }
    currentUserData.lastSignDate = today;
    
    // 计算签到奖励
    var baseReward = 2;
    var streakBonus = Math.min(currentUserData.signStreak, 7);
    var totalReward = baseReward + streakBonus;
    
    currentUserData.stars += totalReward;
    starCount += totalReward;
    addPetExp(1);
    
    showNotification('🎉 签到成功！连续 ' + currentUserData.signStreak + ' 天！获得 ' + totalReward + ' 星星 + 1 经验！', 'success');
    triggerConfetti(20);
    saveCurrentUserData();
    updateMyCenter();
    syncCheckinToCloud(currentUserData.signStreak);
    return true;
  }
  
  function isSignedToday() {
    return currentUserData.lastSignDate === getTodayStr();
  }

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
    if(!u) { currentUserData = { unlocked: ['一'], learned: ['一'], stars: 0, lastNode: '一', recent: [], mistakes: [], avatar: '👤', nickname: '', dailyTarget: 3, lastActiveDate: '', streakDays: 0, todayCount: 0, history: {}, petLevel: 1, petExp: 0, petMessage: '', skillCooldowns: {} }; return; }
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
        raw = localStorage.getItem(getUserKey('skillCooldowns'));
        currentUserData.skillCooldowns = raw ? JSON.parse(raw) : {};
        raw = localStorage.getItem(getUserKey('unlockedPetSkins'));
        currentUserData.unlockedPetSkins = raw ? JSON.parse(raw) : {};
        currentUserData.currentPetSkin = localStorage.getItem(getUserKey('currentPetSkin')) || '';
        // 每日签到数据
        currentUserData.lastSignDate = localStorage.getItem(getUserKey('lastSignDate')) || '';
        currentUserData.signStreak = parseInt(localStorage.getItem(getUserKey('signStreak')) || '0', 10);
        // 每日任务数据
        raw = localStorage.getItem(getUserKey('dailyTasks'));
        currentUserData.dailyTasks = raw ? JSON.parse(raw) : {};
        raw = localStorage.getItem(getUserKey('weeklyTasks'));
        currentUserData.weeklyTasks = raw ? JSON.parse(raw) : {};
        // 检查是否需要重置每日任务
        checkDailyTasksReset();
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
      currentUserData = { unlocked: ['一'], learned: ['一'], stars: 0, lastNode: '一', recent: [], mistakes: [], avatar: '👤', nickname: '', dailyTarget: 3, lastActiveDate: '', streakDays: 0, todayCount: 0, history: {}, petLevel: 1, petExp: 0, petMessage: '', skillCooldowns: {} };
    } catch(e) {
      currentUserData = { unlocked: ['一'], learned: ['一'], stars: 0, lastNode: '一', recent: [], mistakes: [], avatar: '👤', nickname: '', dailyTarget: 3, lastActiveDate: '', streakDays: 0, todayCount: 0, history: {}, petLevel: 1, petExp: 0, petMessage: '', skillCooldowns: {} };
    }
  }

  function saveCurrentUserData() {
    var u = getActiveUser();
    if(!u) return;
    // 同步全局变量到 currentUserData，确保一致性
    currentUserData.unlocked = Array.from(unlocked);
    currentUserData.learned = Array.from(learnedSet);
    currentUserData.stars = starCount;
    currentUserData.lastNode = lastUnlockedNodeId;
    currentUserData.recent = recentUnlocks.slice();
    currentUserData.mistakes = Array.from(mistakeSet);
    try {
      localStorage.setItem(getUserKey('unlocked'), JSON.stringify(currentUserData.unlocked));
      localStorage.setItem(getUserKey('learned'), JSON.stringify(currentUserData.learned));
      localStorage.setItem(getUserKey('stars'), String(currentUserData.stars));
      localStorage.setItem(getUserKey('lastNode'), currentUserData.lastNode);
      localStorage.setItem(getUserKey('recent'), JSON.stringify(currentUserData.recent));
      localStorage.setItem(getUserKey('mistakes'), JSON.stringify(currentUserData.mistakes));
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
      localStorage.setItem(getUserKey('skillCooldowns'), JSON.stringify(currentUserData.skillCooldowns || {}));
      localStorage.setItem(getUserKey('unlockedPetSkins'), JSON.stringify(currentUserData.unlockedPetSkins || {}));
      localStorage.setItem(getUserKey('currentPetSkin'), currentUserData.currentPetSkin || '');
      localStorage.setItem(getUserKey('lastSignDate'), currentUserData.lastSignDate || '');
      localStorage.setItem(getUserKey('signStreak'), String(currentUserData.signStreak || 0));
      localStorage.setItem(getUserKey('dailyTasks'), JSON.stringify(currentUserData.dailyTasks || {}));
      localStorage.setItem(getUserKey('weeklyTasks'), JSON.stringify(currentUserData.weeklyTasks || {}));
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

  // ======================== 区域系统 ========================
  const ZONE_CONFIG = {
    '数字平原': { icon: '🌄', color: '#4a90e2', desc: '一二三四五，数字真奇妙', order: 1, radicals: [] },
    '天地自然': { icon: '🌤️', color: '#5b9bd5', desc: '天地日月星，大自然的力量', order: 2, radicals: ['日','月','气','雨','风','云','雷','电','天','地','星','旦','早'] },
    '人类部落': { icon: '👨‍👩‍👧', color: '#e57373', desc: '人和人的故事', order: 3, radicals: ['亻','人','大','子','女','儿','母','父','兄','弟','姐','妹'] },
    '土石山水': { icon: '⛰️', color: '#8d6e63', desc: '山石田土，脚下的大地', order: 4, radicals: ['土','石','山','田','金','玉','王','谷','矿','沙','矿','岩'] },
    '动物森林': { icon: '🐾', color: '#66bb6a', desc: '飞禽走兽，动物朋友们', order: 5, radicals: ['犭','马','牛','羊','犬','鸟','隹','鱼','虫','龙','虎','象','兔','猫','狗','鸡','鸭','鹅'] },
    '植物花园': { icon: '🌿', color: '#43a047', desc: '花草木禾，绿色世界', order: 6, radicals: ['木','艹','禾','米','竹','林','森','花','草','树','叶','果','瓜'] },
    '生活小镇': { icon: '🏠', color: '#ffa726', desc: '衣食住行，日常生活', order: 7, radicals: ['门','户','车','舟','衣','巾','纟','食','饣','酉','皿','瓦','宀','广','厂'] },
    '智慧学园': { icon: '📚', color: '#ab47bc', desc: '学习思考，智慧成长', order: 8, radicals: ['讠','言','心','忄','目','见','耳','手','扌','足','走','辶','彳','力','刀','刂'] }
  };
  const zoneMap = new Map();  // nodeId → zoneName
  const zoneIconMap = new Map(); // nodeId → zoneIcon

  function classifyZone(nodeId) {
    // 数字序列（按 ID 直接匹配）
    var digits = ['一','二','三','四','五','六','七','八','九','十','百','千','万','亿','兆'];
    if (digits.indexOf(nodeId) >= 0) return '数字平原';
    // 按偏旁部首推断
    var radical = nodeId.charAt(0);
    for (var zn in ZONE_CONFIG) {
      var cfg = ZONE_CONFIG[zn];
      if (cfg.radicals && cfg.radicals.indexOf(radical) >= 0) return zn;
    }
    // 检查常见偏旁部首（在字中的位置）
    var commonRadicals = { '亻':'人类部落','氵':'天地自然','火':'天地自然','木':'植物花园','艹':'植物花园','口':'人类部落' };
    for (var r in commonRadicals) {
      if (nodeId.indexOf(r) >= 0) return commonRadicals[r];
    }
    return '智慧学园';
  }

  function initZones() {
    ALL_NODES.forEach(function(n) {
      var zone = classifyZone(n.id);
      zoneMap.set(n.id, zone);
      zoneIconMap.set(n.id, ZONE_CONFIG[zone].icon);
    });
    // 输出区域统计到控制台
    var counts = {};
    zoneMap.forEach(function(z) { counts[z] = (counts[z]||0) + 1; });
    console.log('区域统计:', JSON.stringify(counts));
  }

  function getZoneInfo(nodeId) {
    var zn = zoneMap.get(nodeId) || '智慧学园';
    return ZONE_CONFIG[zn] || ZONE_CONFIG['智慧学园'];
  }

  function getZoneProgress(zoneName) {
    var cfg = ZONE_CONFIG[zoneName];
    var total = 0, done = 0;
    zoneMap.forEach(function(zn, nid) {
      if (zn === zoneName) { total++; if (unlocked.has(nid)) done++; }
    });
    return { icon: cfg.icon, name: zoneName, desc: cfg.desc, total: total, done: done, pct: total ? Math.round(done/total*100) : 0 };
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
    var isMobile = window.innerWidth < 768;
    var sizeMul = isMobile ? 1.3 : 1;
    vn.forEach(id => {
      const n = nodeMap.get(id);
      if(!n) return;
      const isUnlocked = unlocked.has(id);
      const isRoot = id === '一';
      const isRecommended = !isUnlocked && id === recommendedId;
      var zoneInfo = getZoneInfo(id);
      var zoneColor = zoneInfo ? zoneInfo.color : '#f5a623';
      nodes.push({
        id: n.id, name: isRecommended ? '⭐?' : (isUnlocked ? n.name : '?'),
        symbolSize: Math.round((isRoot ? 70 : (isRecommended ? 48 : (isUnlocked ? 55 : 30))) * sizeMul),
         itemStyle: {
          color: isRecommended ? '#ffd700' : (isUnlocked ? (isRoot ? '#4a90e2' : zoneColor) : '#aaa'),
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
        type: 'graph', layout: 'force', roam: true, draggable: true,
        force: { repulsion: 400, gravity: 0.2, edgeLength: [80, 150], friction: 0.6 },
        data: nodes, links: links,
        emphasis: { focus: 'adjacency', lineStyle: { width: 4 } }
      }]
    }, true);
    // 启动推荐节点脉冲动画
    startPulse(recommendedId);
  }

  var pulseTimer = null;
  var pulseCachedData = null; // 缓存图谱数据，避免每次getOption
  function startPulse(nodeId) {
    if(pulseTimer) clearInterval(pulseTimer);
    if(!nodeId || !myChart) return;
    // 缓存当前图谱数据用于脉冲动画
    pulseCachedData = null;
    var opt = myChart.getOption();
    if(opt.series && opt.series[0] && opt.series[0].data) pulseCachedData = opt.series[0].data;
    var big = true;
    var origSize = 48; // 推荐节点原始大小
    // 找到推荐节点的原始 symbolSize
    if(pulseCachedData) {
      var d = pulseCachedData.find(function(x) { return x.id === nodeId; });
      if(d && d.symbolSize) origSize = d.symbolSize;
    }
    pulseTimer = setInterval(function() {
      if(!myChart || !pulseCachedData) { clearInterval(pulseTimer); return; }
      var d = pulseCachedData.find(function(x) { return x.id === nodeId; });
      if(!d) return;
      d.symbolSize = big ? origSize + 6 : origSize - 4;
      big = !big;
      myChart.setOption({ series: [{ data: pulseCachedData }] });
    }, 600);
  }

  // ======================== 右侧面板 ========================
  var currentPanelNodeId = null;
  function fillPanel(nodeId) {
    currentPanelNodeId = nodeId;
    const node = nodeMap.get(nodeId);
    if(!node) return;
    document.querySelector('.empty-tip').style.display = 'none';
    document.getElementById('panelContent').style.display = 'block';
    document.getElementById('panelChar').innerText = node.name;
    var pinyinEl = document.getElementById('panelPinyin');
    pinyinEl.innerText = node.pinyin || '';
    pinyinEl.style.cursor = 'pointer';
    pinyinEl.title = '点击朗读拼音';
    pinyinEl.onclick = function() { if(node.pinyin) speakText(node.pinyin); };
    var tradEl = document.getElementById('panelTrad');
    // 显示区域信息
    var zi = getZoneInfo(nodeId);
    var zoneLabel = zi.icon + ' ' + (function() {
      for (var zn in ZONE_CONFIG) { if (ZONE_CONFIG[zn] === zi) return zn; }
      return '';
    })();
    tradEl.setAttribute('data-zone', zoneLabel);
    if(node.nameTrad && node.nameTrad !== node.name) {
      tradEl.innerText = '繁：' + node.nameTrad;
      tradEl.style.display = '';
    } else {
      tradEl.style.display = 'none';
    }
    var oracleEl = document.getElementById('panelOracle');
    oracleEl.innerText = node.oracle || '古人造字的智慧';
    oracleEl.style.cursor = 'pointer';
    oracleEl.title = '点击朗读';
    oracleEl.onclick = function() { speakText(node.oracle || '古人造字的智慧'); };
    var originEl = document.getElementById('panelOrigin');
    originEl.innerText = node.origin || '一笔一划都有故事';
    originEl.style.cursor = 'pointer';
    originEl.title = '点击朗读';
    originEl.onclick = function() { speakText(node.origin || '一笔一划都有故事'); };
    const wordsWrap = document.getElementById('panelWords');
    wordsWrap.innerHTML = '';
    if(node.groupWords) {
      node.groupWords.split('|').forEach(function(w) {
        var span = document.createElement('span');
        span.className = 'tag-item tag-speak'; span.innerText = w;
        span.title = '点击朗读 · ' + w;
        span.onclick = function(e) { e.stopPropagation(); speakText(w); };
        wordsWrap.appendChild(span);
      });
    }
    const idiomsWrap = document.getElementById('panelIdioms');
    idiomsWrap.innerHTML = '';
    if(node.idioms) {
      node.idioms.split('|').forEach(function(item) {
        var parts = item.split('::');
        var span = document.createElement('span');
        span.className = 'tag-item tag-speak'; span.innerText = parts[0];
        if(parts[1]) span.title = parts[1] + '（点击朗读）';
        span.onclick = function(e) { e.stopPropagation(); speakIdiom(item); };
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
    
    // 渲染宠物技能按钮
    renderPetSkills();
    
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
      updateReviewRecord(currentGuessTarget, true); // 初始化间隔重复
      starCount++;
      incStat('correctTotal');
      saveUserData();
      updateProgress();
      recordToday();
      checkAchievements();
      recordDailyLearn();
      
      // 减少技能冷却时间
      decreaseSkillCooldowns();
      
      showFirework();
      playCorrectSound();
      playUnlockSound();
      var praise = ['太棒啦！','你真厉害！','完美通关！','又学会一个新汉字啦！'];
      speakText(praise[Math.floor(Math.random() * praise.length)] + ' ' + n.name);

      // 自动播放完整汉字信息（延迟一点开始，先播放表扬语）
      setTimeout(function() {
        var speakParts = [];
        if(n.oracle) speakParts.push('汉字怎么来的？' + n.oracle);
        if(n.origin) speakParts.push('一句话记住：' + n.origin);
        if(n.groupWords) {
          var words = n.groupWords.split('|');
          speakParts.push('常用词语：' + words.join('、'));
        }
        if(n.idioms) {
          var idiomList = n.idioms.split('|');
          var idiomNames = idiomList.map(function(item) { return item.split('::')[0]; });
          speakParts.push('相关成语：' + idiomNames.join('、'));
        }
        speakText(speakParts.join('。'), { cancel: false });
      }, 1500);

      var detailHtml = '<div class="detail-char">' + n.name + '</div>';
      if(n.oracle) {
        detailHtml += '<div class="detail-section"><span class="detail-title">📖 汉字怎么来的？</span>';
        detailHtml += '<button class="speak-btn" data-speak="' + escHtml(n.oracle) + '" title="朗读">🔊</button>';
        detailHtml += '<div class="detail-text">' + n.oracle + '</div></div>';
      }
      if(n.origin) {
        detailHtml += '<div class="detail-section"><span class="detail-title">💡 一句话记住</span>';
        detailHtml += '<button class="speak-btn" data-speak="' + escHtml(n.origin) + '" title="朗读">🔊</button>';
        detailHtml += '<div class="detail-text">' + n.origin + '</div></div>';
      }
      if(n.groupWords) {
        var words = n.groupWords.split('|');
        detailHtml += '<div class="detail-section"><span class="detail-title">📝 常用词语</span>';
        detailHtml += '<button class="speak-btn" data-speak="' + escHtml(words.join('、')) + '" title="朗读全部词语">🔊</button>';
        detailHtml += '<div class="detail-tags">';
        words.forEach(function(w) {
          detailHtml += '<span class="detail-tag">' + w + '</span>';
        });
        detailHtml += '</div></div>';
      }
      if(n.idioms) {
        var idiomList = n.idioms.split('|');
        detailHtml += '<div class="detail-section"><span class="detail-title">📚 相关成语</span>';
        detailHtml += '<button class="speak-btn" data-speak-all="' + escHtml(n.idioms) + '" title="朗读全部成语">🔊</button>';
        detailHtml += '<div class="detail-tags">';
        idiomList.forEach(function(item) {
          var parts = item.split('::');
          detailHtml += '<span class="detail-tag">' + parts[0] + '</span>';
        });
        detailHtml += '</div></div>';
      }
      document.getElementById('guessResult').innerHTML = detailHtml;
      document.getElementById('guessResult').classList.add('compact');
      document.querySelector('#guessMask .modal-title').style.display = 'none';
      document.getElementById('guessHint').style.display = 'none';
      document.getElementById('guessSubmit').style.display = 'none';
      document.getElementById('guessMore').style.display = 'none';
      document.getElementById('guessInput').style.display = 'none';
      document.getElementById('attemptCount').style.display = 'none';
      // 自动播放中，显示播放状态
      var guessNextBtn = document.getElementById('guessNext');
      var countdown = 5;
      var isSpeaking = true;
      var speakFinished = false;
      var countdownFinished = false;
      
      guessNextBtn.innerText = '🔊 正在播放...（' + countdown + '秒）';
      guessNextBtn.disabled = true;
      guessNextBtn.style.opacity = '0.5';
      guessNextBtn.style.cursor = 'not-allowed';
      
      var cdTimer = setInterval(function() {
        countdown--;
        if (countdown <= 0) {
          clearInterval(cdTimer);
          countdownFinished = true;
          checkReady();
        } else {
          guessNextBtn.innerText = '🔊 正在播放...（' + countdown + '秒）';
        }
      }, 1000);
      
      var speakEndHandler = function() {
        if(isSpeaking) {
          isSpeaking = false;
          speakFinished = true;
          checkReady();
        }
      };
      
      function checkReady() {
        if(speakFinished && countdownFinished) {
          clearInterval(cdTimer);
          guessNextBtn.innerText = '回到图谱（回车 ↵）';
          guessNextBtn.disabled = false;
          guessNextBtn.style.opacity = '';
          guessNextBtn.style.cursor = '';
          guessNextBtn.classList.add('active-btn');
          guessNextBtn.classList.remove('secondary');
          guessNextBtn.focus();
          guessNextBtn.onclick = function() {
            clearInterval(cdTimer);
            maskEl2.removeEventListener('keydown', onKeyBack);
            closeGuess();
            fillPanel(currentGuessTarget);
            setTimeout(function() { locateToRecommended(); }, 600);
          };
        } else if(speakFinished && !countdownFinished) {
          guessNextBtn.innerText = '播放完成！等待 ' + countdown + ' 秒...';
        } else if(countdownFinished && !speakFinished) {
          guessNextBtn.innerText = '🔊 正在播放...';
        }
      }
      
      // 覆盖processSpeakQueue的onend来检测播放完成
      var originalProcessSpeakQueue = processSpeakQueue;
      processSpeakQueue = function() {
        if (speakQueue.length === 0) {
          speakEndHandler();
          processSpeakQueue = originalProcessSpeakQueue;
          return;
        }
        var text = speakQueue.shift();
        try {
          var utter = new SpeechSynthesisUtterance(text);
          utter.lang = 'zh-CN';
          utter.rate = 0.85;
          utter.onend = function() { processSpeakQueue(); };
          utter.onerror = function() { processSpeakQueue(); };
          window.speechSynthesis.speak(utter);
        } catch(e) { processSpeakQueue(); }
      };
      
      // 回车回到图谱（5秒后或播放完成后才生效）
      var maskEl2 = document.getElementById('guessMask');
      maskEl2.setAttribute('tabindex', '0');
      maskEl2.focus();
      var onKeyBack = function(e) {
        if(e.key === 'Enter' && !guessNextBtn.disabled) {
          maskEl2.removeEventListener('keydown', onKeyBack);
          guessNextBtn.click();
        }
      };
      maskEl2.addEventListener('keydown', onKeyBack);

      captureNodePositions();
      useFixedPositions = true;
      renderChart();
      useFixedPositions = false;
      // 更新猜字任务进度
      updateDailyTaskProgress('guess5', 1);
    } else {
      // 记录错字
      if(currentGuessTarget) { mistakeSet.add(currentGuessTarget); saveUserData(); }
      guessAttempts--;
      document.getElementById('attemptCount').innerText = '💡 剩余机会：' + guessAttempts + '次';
      if(guessAttempts > 0) {
        playWrongSound();
        var tips = ['再试一试，你可以的！','差一点点哦，再想想~','没关系，继续加油！'];
        document.getElementById('guessResult').innerHTML = '<span class="result-error">' + tips[Math.floor(Math.random() * tips.length)] + '</span>';
        document.getElementById('guessInput').select();
        
        // 答错也减少技能冷却时间
        decreaseSkillCooldowns();
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
    window.speechSynthesis.cancel();
    speakQueue = [];
    currentGuessTarget = null;
    document.getElementById('guessResult').classList.remove('compact');
    document.querySelector('#guessMask .modal-title').style.display = '';
    document.getElementById('guessHint').style.display = '';
    document.getElementById('attemptCount').style.display = '';
    var btn = document.getElementById('guessNext');
    btn.classList.remove('active-btn');
    btn.classList.add('secondary');
    document.getElementById('guessMask').classList.remove('show');
  }

  // ======================== 宠物技能系统 ========================
  function renderPetSkills() {
    var container = document.getElementById('petSkills');
    if(!container) return;
    container.innerHTML = '';
    
    var petLevel = currentUserData.petLevel || 1;
    var cooldowns = currentUserData.skillCooldowns || {};
    
    Object.keys(PET_SKILLS).forEach(function(skillId) {
      var skill = PET_SKILLS[skillId];
      var cooldown = cooldowns[skillId] || 0;
      var isUnlocked = petLevel >= skill.unlockLevel;
      var isReady = cooldown <= 0;
      
      var btn = document.createElement('button');
      btn.className = 'pet-skill-btn';
      btn.disabled = !isUnlocked || !isReady;
      
      var label = skill.icon + ' ' + skill.name;
      if(!isUnlocked) {
        label += ' (Lv' + skill.unlockLevel + ')';
      } else if(!isReady) {
        label += ' (' + cooldown + ')';
      }
      
      btn.innerText = label;
      
      if(isUnlocked && isReady) {
        btn.onclick = function() { useSkill(skillId); };
        btn.title = skill.desc;
      } else if(!isUnlocked) {
        btn.title = '宠物等级 ' + skill.unlockLevel + ' 解锁';
      } else {
        btn.title = '冷却中，还需 ' + cooldown + ' 题';
      }
      
      container.appendChild(btn);
    });
  }
  
  function useSkill(skillId) {
    var skill = PET_SKILLS[skillId];
    if(!skill) return;
    
    var petLevel = currentUserData.petLevel || 1;
    if(petLevel < skill.unlockLevel) {
      alert('宠物等级 ' + skill.unlockLevel + ' 解锁此技能！');
      return;
    }
    
    var cooldowns = currentUserData.skillCooldowns || {};
    if(cooldowns[skillId] > 0) {
      alert('技能冷却中，还需 ' + cooldowns[skillId] + ' 题！');
      return;
    }
    
    // 执行技能效果
    switch(skillId) {
      case 'hint':
        useHintSkill();
        break;
    }
    
    // 设置冷却时间
    cooldowns[skillId] = skill.cooldown;
    currentUserData.skillCooldowns = cooldowns;
    saveCurrentUserData();
    renderPetSkills();
  }
  
  function useHintSkill() {
    // 提示技能：显示一个错误选项
    if(!currentGuessTarget) return;
    var n = nodeMap.get(currentGuessTarget);
    if(!n) return;
    
    // 生成候选答案
    var candidates = generateCandidates(n.name);
    var wrongCandidates = candidates.filter(function(c) { return c !== n.name; });
    
    if(wrongCandidates.length > 0) {
      var wrongAnswer = wrongCandidates[0];
      var wrap = document.getElementById('candidateWrap');
      
      // 显示候选按钮
      renderCandidates(candidates, n.name);
      
      // 标记一个错误答案
      var buttons = wrap.querySelectorAll('.candidate-btn');
      buttons.forEach(function(btn) {
        if(btn.innerText === wrongAnswer && !btn.classList.contains('correct')) {
          btn.classList.add('wrong');
          btn.disabled = true;
        }
      });
      
      document.getElementById('guessResult').innerHTML = '<span class="result-success">💡 提示：' + wrongAnswer + ' 不是正确答案</span>';
    }
  }
  
  function decreaseSkillCooldowns() {
    var cooldowns = currentUserData.skillCooldowns || {};
    var changed = false;
    
    Object.keys(cooldowns).forEach(function(skillId) {
      if(cooldowns[skillId] > 0) {
        cooldowns[skillId]--;
        changed = true;
      }
    });
    
    if(changed) {
      currentUserData.skillCooldowns = cooldowns;
      saveCurrentUserData();
      renderPetSkills();
    }
  }

  function unlockNode(charId) {
    if(!unlocked.has(charId)) {
      unlocked.add(charId);
      renderChart();
      recordToday();
      checkAchievements();
      triggerConfetti(12);
      updateDailyTaskProgress('learn3', 1);
      // 同步到云端
      syncUnlockToCloud(charId);
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
  function incStat(key, amount) { var s = getStats(); s[key] = (s[key] || 0) + (amount || 1); saveStats(s); }

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
  
  function getPetStage(level) {
    if(level >= 8) return 8;
    if(level >= 6) return 6;
    if(level >= 4) return 4;
    return 1;
  }
  
  function getCurrentPetSkinEmoji() {
    var level = currentUserData.petLevel || 1;
    var stage = getPetStage(level);
    var currentSkinId = currentUserData.currentPetSkin;
    var skins = PET_SKINS[stage];
    
    if(currentSkinId) {
      var skin = skins.find(function(s) { return s.id === currentSkinId; });
      if(skin) return skin.emoji;
    }
    
    return skins[0].emoji;
  }
  
  function getUnlockedPetSkins() {
    return currentUserData.unlockedPetSkins || {};
  }
  
  function isSkinUnlocked(skinId) {
    var unlocked = getUnlockedPetSkins();
    return unlocked[skinId] === true;
  }
  
  function unlockSkin(skinId) {
    var unlocked = getUnlockedPetSkins();
    unlocked[skinId] = true;
    currentUserData.unlockedPetSkins = unlocked;
    saveCurrentUserData();
  }
  
  function setCurrentSkin(skinId) {
    currentUserData.currentPetSkin = skinId;
    saveCurrentUserData();
    updatePetUI();
  }
  
  function buySkin(skinId) {
    var level = currentUserData.petLevel || 1;
    var stage = getPetStage(level);
    var skins = PET_SKINS[stage];
    var skin = skins.find(function(s) { return s.id === skinId; });
    
    if(!skin) return false;
    if(isSkinUnlocked(skinId)) return false;
    if(currentUserData.stars < skin.price) return false;
    
    currentUserData.stars -= skin.price;
    unlockSkin(skinId);
    setCurrentSkin(skinId);
    return true;
  }

  function updatePetUI() {
    var petStage = document.getElementById('petStageName');
    var petLevel = document.getElementById('petLevelDisplay');
    if(petStage) petStage.innerText = getPetStageName(currentUserData.petLevel || 1);
    if(petLevel) petLevel.innerText = 'Lv' + (currentUserData.petLevel || 1);
    var avatarEl = document.getElementById('petAvatar');
    if(avatarEl) {
      avatarEl.innerText = getCurrentPetSkinEmoji();
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
  
  function showNotification(message, type) {
    type = type || 'info';
    var colors = {
      success: '#52c41a',
      error: '#ff4d4f',
      warning: '#faad14',
      info: '#1890ff'
    };
    var color = colors[type] || colors.info;
    var tip = document.getElementById('hintTip');
    if(tip) {
      tip.innerText = message;
      tip.classList.add('show');
      tip.style.color = color;
      tip.style.fontWeight = 'bold';
      setTimeout(function() {
        tip.classList.remove('show');
        tip.style.color = '';
        tip.style.fontWeight = '';
      }, 3000);
    }
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
      currentUserData.petMessage = getPetExpMessage(amount);
    }
    showPetBubble(currentUserData.petMessage);
    if(leveled) { 
      playUnlockSound(); 
      speakText('太棒了！宠物进化了！'); 
      triggerPetLevelUpEffect();
      triggerConfetti(30);
    }
    var avatarEl = document.getElementById('petAvatar');
    if(avatarEl) {
      if(leveled) {
        avatarEl.classList.remove('bounce', 'levelup');
        void avatarEl.offsetWidth;
        avatarEl.classList.add('levelup');
        setTimeout(function(){ avatarEl.classList.remove('levelup'); }, 1600);
      } else {
        avatarEl.classList.remove('bounce');
        void avatarEl.offsetWidth;
        avatarEl.classList.add('bounce');
        setTimeout(function(){ avatarEl.classList.remove('bounce'); }, 900);
      }
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
  
  function triggerConfetti(count) {
    try {
      var zone = document.getElementById('petConfetti');
      if(!zone) return;
      var colors = ['#ffd666','#ff6b6b','#7bd389','#66b3ff','#f5a623','#ff85c0','#b37feb'];
      var emojis = ['✨','⭐','🌟','💫','🎉','🎊','🏆','💖','💗'];
      for(var i=0;i<(count||15);i++) {
        var piece = document.createElement('div');
        if(Math.random() > 0.5) {
          piece.innerText = emojis[i % emojis.length];
          piece.style.fontSize = (16 + Math.random()*12) + 'px';
          piece.style.animation = 'confetti-fall 1800ms ease-out forwards';
        } else {
          piece.className = 'confetti-piece';
          piece.style.background = colors[i % colors.length];
          piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
          piece.style.animation = 'confetti-fall 1400ms linear forwards';
        }
        var left = Math.random() * window.innerWidth;
        piece.style.left = left + 'px';
        piece.style.top = '-20px';
        piece.style.animationDelay = (Math.random()*0.8)+'s';
        zone.appendChild(piece);
        setTimeout(function() { if(piece.parentNode) piece.parentNode.removeChild(piece); }, 3000);
      }
    } catch(e) {}
  }
  
  function triggerPetLevelUpEffect() {
    try {
      var zone = document.getElementById('petConfetti');
      if(!zone) return;
      var colors = ['#ffd700','#ffec8b','#fffacd','#fff8dc'];
      for(var i=0;i<20;i++) {
        var spark = document.createElement('div');
        spark.className = 'confetti-piece';
        spark.style.background = colors[i % colors.length];
        spark.style.width = '8px';
        spark.style.height = '8px';
        spark.style.borderRadius = '50%';
        spark.style.boxShadow = '0 0 10px #ffd700';
        spark.style.animation = 'confetti-fall 2000ms ease-out forwards';
        var centerX = window.innerWidth / 2;
        var left = centerX + (Math.random()-0.5)*200;
        spark.style.left = left + 'px';
        spark.style.top = '120px';
        spark.style.animationDelay = (Math.random()*1)+'s';
        zone.appendChild(spark);
        setTimeout(function() { if(spark.parentNode) spark.parentNode.removeChild(spark); }, 3500);
      }
    } catch(e) {}
  }
  
  // ======================== 每日学习统计 ========================
  function updateDailyTask() {
    var today = new Date().toDateString();
    if(currentUserData.lastActiveDate !== today) {
      var yesterday = new Date(Date.now()-86400000).toDateString();
      if(currentUserData.lastActiveDate === yesterday) {
        currentUserData.streakDays = (currentUserData.streakDays||0)+1;
      } else {
        currentUserData.streakDays = 1;
      }
      currentUserData.lastActiveDate = today;
      currentUserData.todayCount = 0;
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
    // 延迟检查复习提醒（避免干扰当前交互）
    setTimeout(function() { checkReviewReminder(); }, 3000);
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
  // ======================== 语音朗读（增强版） ========================
  function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  var speakQueue = [];
  function speakText(text, options) {
    options = options || {};
    var cancel = options.cancel !== false;
    if (cancel) {
      try { window.speechSynthesis.cancel(); } catch(e) {}
      speakQueue = [];
    }
    if (!text) return;
    speakQueue.push(text);
    if (speakQueue.length === 1) processSpeakQueue();
  }

  function processSpeakQueue() {
    if (speakQueue.length === 0) return;
    var text = speakQueue.shift();
    try {
      var utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'zh-CN';
      utter.rate = 0.85;
      utter.onend = function() { processSpeakQueue(); };
      utter.onerror = function() { processSpeakQueue(); };
      window.speechSynthesis.speak(utter);
    } catch(e) { processSpeakQueue(); }
  }

  function speakIdiom(idiomStr) {
    var parts = idiomStr.split('::');
    var text = parts[0];
    if (parts[1]) text += '，意思是' + parts[1];
    speakText(text);
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
     osc.type = 'sine'; osc.frequency.value = 300;
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.25);
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
    // 签到状态
    var signStreakNum = document.getElementById('signStreakNum');
    if(signStreakNum) signStreakNum.innerText = currentUserData.signStreak || 0;
    var signBtn = document.getElementById('signBtn');
    if(signBtn) {
      if(isSignedToday()) {
        signBtn.innerText = '✅ 已签到';
        signBtn.classList.add('signed');
      } else {
        signBtn.innerText = '📅 今日签到';
        signBtn.classList.remove('signed');
      }
    }
    // 渲染每日任务
    renderDailyTasks();
    
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
    renderPetSkinsPanel();
  }
  
  function renderDailyTasks() {
    var container = document.getElementById('dailyTasks');
    if(!container) return;
    
    container.innerHTML = '';
    checkDailyTasksReset();
    
    DAILY_TASKS.forEach(function(task) {
      var progress = currentUserData.dailyTasks[task.id] || 0;
      var completed = currentUserData.dailyTasks[task.id + '_completed'] === true;
      var percent = Math.min(100, Math.round((progress / task.target) * 100));
      
      var item = document.createElement('div');
      item.className = 'task-item' + (completed ? ' completed' : '');
      
      var rewardText = task.reward.type === 'stars' ? task.reward.amount + '⭐' : task.reward.amount + 'exp';
      
      item.innerHTML = 
        '<span class="task-icon">' + task.icon + '</span>' +
        '<div class="task-info">' +
          '<div class="task-name">' + task.name + '</div>' +
          '<div class="task-desc">' + task.desc + '</div>' +
        '</div>' +
        '<div class="task-progress">' + progress + '/' + task.target + '</div>' +
        (completed ? 
          '<span class="task-check">✓</span>' : 
          '<span class="task-reward">' + rewardText + '</span>'
        );
      
      container.appendChild(item);
    });
  }
  
  function renderPetSkinsPanel() {
    var container = document.getElementById('petSkins');
    if(!container) return;
    
    container.innerHTML = '';
    
    var level = currentUserData.petLevel || 1;
    var stage = getPetStage(level);
    var skins = PET_SKINS[stage];
    var currentSkinId = currentUserData.currentPetSkin;
    
    skins.forEach(function(skin) {
      var unlocked = isSkinUnlocked(skin.id);
      var isCurrent = currentSkinId === skin.id;
      
      var btn = document.createElement('button');
      btn.className = 'pet-skin-btn';
      if(isCurrent) btn.classList.add('active');
      if(!unlocked) btn.classList.add('locked');
      
      btn.innerHTML = '<span class="skin-emoji">' + skin.emoji + '</span><span class="skin-name">' + skin.name + '</span>';
      
      if(unlocked) {
        btn.onclick = function() {
          setCurrentSkin(skin.id);
          renderPetSkinsPanel();
        };
      } else {
        btn.onclick = function() {
          if(currentUserData.stars >= skin.price) {
            if(buySkin(skin.id)) {
              renderPetSkinsPanel();
              updateMyCenter();
            }
          } else {
            alert('星星不足，还需要 ' + (skin.price - currentUserData.stars) + ' 颗星星！');
          }
        };
      }
      
      if(!unlocked) {
        var priceBadge = document.createElement('span');
        priceBadge.className = 'skin-price';
        priceBadge.innerText = skin.price + '⭐';
        btn.appendChild(priceBadge);
      }
      
      container.appendChild(btn);
    });
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
    // 更新复习任务进度
    updateDailyTaskProgress('review', 1);
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

  // ======================== 闯关复习系统 ========================
  var quizState = { questions: [], currentIdx: 0, correctCount: 0, totalCount: 5, answered: false };

  // 间隔重复存储
  function getReviewSchedule() {
    try {
      return JSON.parse(localStorage.getItem(getUserKey('reviewSchedule')) || '{}');
    } catch(e) { return {}; }
  }
  function saveReviewSchedule(s) {
    try { localStorage.setItem(getUserKey('reviewSchedule'), JSON.stringify(s)); } catch(e) {}
  }
  function updateReviewRecord(charId, correct) {
    var sched = getReviewSchedule();
    var now = Date.now();
    if (!sched[charId]) {
      sched[charId] = { learnedAt: now, reviews: [], nextReview: now + 86400000, interval: 1 };
    }
    var r = sched[charId];
    r.reviews.push(now);
    if (correct) {
      r.interval = Math.min(r.interval * 2, 30);
    } else {
      r.interval = 1;
    }
    r.nextReview = now + r.interval * 86400000;
    saveReviewSchedule(sched);
  }
  function getDueReviews() {
    var sched = getReviewSchedule();
    var now = Date.now();
    var due = [];
    for (var id in sched) {
      if (sched[id].nextReview <= now && unlocked.has(id)) due.push(id);
    }
    // 去重 + 限制数量
    return due.slice(0, 20);
  }
  function checkReviewReminder() {
    var due = getDueReviews();
    if (due.length >= 3) {
      showPetBubble('🕒 有 ' + due.length + ' 个字该复习了，点我去闯关！');
      var petAvatar = document.getElementById('petAvatar');
      if (petAvatar) {
        petAvatar.style.outline = '3px solid #ff6b6b';
        petAvatar.style.outlineOffset = '3px';
        petAvatar.title = '点击开始复习闯关';
        petAvatar._quizOnClick = function(e) { e.stopPropagation(); startQuiz(); };
        petAvatar.onclick = petAvatar._quizOnClick;
        setTimeout(function() {
          petAvatar.style.outline = '';
          petAvatar.title = '跟宠物聊天';
          petAvatar.onclick = function(e) { e.stopPropagation(); openPetChat(); };
        }, 10000);
      }
    }
  }

  // 四种题型生成器
  function generatePinyinMatch(preferredPool) {
    var pool;
    if (preferredPool && preferredPool.length >= 4) {
      pool = preferredPool.filter(function(id) { return nodeMap.has(id) && nodeMap.get(id).pinyin; });
    }
    if (!pool || pool.length < 4) pool = Array.from(learnedSet).filter(function(id) { return nodeMap.has(id) && nodeMap.get(id).pinyin; });
    if (pool.length < 4) pool = unlockedFilter();
    shuffle(pool);
    var correct = pool[0];
    var correctNode = nodeMap.get(correct);
    var distractors = [];
    var usedPinyin = new Set([correctNode.pinyin]);
    for (var i = 1; i < pool.length && distractors.length < 3; i++) {
      var p = nodeMap.get(pool[i]).pinyin;
      if (p && !usedPinyin.has(p)) { distractors.push(p); usedPinyin.add(p); }
    }
    while (distractors.length < 3) { distractors.push('zhi' + distractors.length); }
    var options = [correctNode.pinyin].concat(distractors);
    shuffle(options);
    return {
      type: 'pinyin',
      question: correctNode.name,
      questionLabel: '选出正确拼音',
      options: options,
      answer: correctNode.pinyin,
      charId: correct
    };
  }
  function generateWordFill(preferredPool) {
    var srcSet = preferredPool || learnedSet;
    var pool = [];
    srcSet.forEach(function(id) {
      var n = nodeMap.get(id);
      if (!n || !n.groupWords) return;
      n.groupWords.split('|').forEach(function(w) {
        if (w.indexOf(n.name) >= 0) pool.push({ charId: id, word: w, char: n.name });
      });
    });
    if (pool.length < 4) { return generatePinyinMatch(); }
    shuffle(pool);
    var item = pool[0];
    var blankWord = item.word.replace(item.char, '＿＿');
    var options = [item.char];
    var usedChars = new Set([item.char]);
    for (var i = 1; i < pool.length && options.length < 4; i++) {
      var ch = pool[i].char;
      if (!usedChars.has(ch)) { options.push(ch); usedChars.add(ch); }
    }
    shuffle(options);
    return {
      type: 'wordfill',
      question: blankWord,
      questionLabel: '填入正确的字',
      options: options,
      answer: item.char,
      charId: item.charId,
      detail: item.word
    };
  }
  function generateShapeDiscern(preferredPool) {
    var pool = preferredPool || unlockedFilter();
    shuffle(pool);
    var correct = pool[0];
    var correctNode = nodeMap.get(correct);
    var distractors = [];
    var parent = getParent(correct);
    if (parent) {
      (childrenMap.get(parent) || []).forEach(function(sib) {
        if (sib !== correct && distractors.length < 3) distractors.push(sib);
      });
    }
    while (distractors.length < 3) {
      var r = pool[Math.floor(Math.random() * pool.length)];
      if (r !== correct && distractors.indexOf(r) < 0) distractors.push(r);
    }
    var options = [correct].concat(distractors);
    shuffle(options);
    return {
      type: 'shape',
      question: correctNode.pinyin || '',
      questionLabel: '哪个是「' + (correctNode.origin || correctNode.hints || '') + '」？',
      options: options,
      answer: correct,
      charId: correct
    };
  }
  function generateIdiomFill(preferredPool) {
    var srcSet = preferredPool || learnedSet;
    var pool = [];
    srcSet.forEach(function(id) {
      var n = nodeMap.get(id);
      if (!n || !n.idioms) return;
      n.idioms.split('|').forEach(function(idiom) {
        var parts = idiom.split('::');
        if (parts[0].indexOf(n.name) >= 0) pool.push({ charId: id, idiom: parts[0], char: n.name });
      });
    });
    if (pool.length < 4) { return generateShapeDiscern(); }
    shuffle(pool);
    var item = pool[0];
    var blankIdiom = item.idiom.replace(item.char, '＿＿');
    var options = [item.char];
    var usedChars = new Set([item.char]);
    for (var i = 1; i < pool.length && options.length < 4; i++) {
      var ch = pool[i].char;
      if (!usedChars.has(ch)) { options.push(ch); usedChars.add(ch); }
    }
    shuffle(options);
    return {
      type: 'idiom',
      question: blankIdiom,
      questionLabel: '填入正确的字完成成语',
      options: options,
      answer: item.char,
      charId: item.charId,
      detail: item.idiom
    };
  }

  function unlockedFilter() {
    return Array.from(unlocked).filter(function(id) { return nodeMap.has(id); });
  }

  function generateQuizQuestions(count) {
    var questions = [];
    var generators = [generatePinyinMatch, generateWordFill, generateShapeDiscern, generateIdiomFill];
    // 优先从到期复习字中选题
    var due = getDueReviews();
    var pool = due.length >= count ? due.slice(0, count) : due.concat(
      shuffle(Array.from(learnedSet).filter(function(id) { return nodeMap.has(id) && due.indexOf(id) < 0; }))
    );
    for (var i = 0; i < count; i++) {
      questions.push(generators[i % generators.length](pool));
    }
    return questions;
  }

  function startQuiz() {
    quizState.questions = generateQuizQuestions(quizState.totalCount);
    quizState.currentIdx = 0;
    quizState.correctCount = 0;
    document.getElementById('quizMask').classList.add('show');
    document.getElementById('quizResult').style.display = 'none';
    document.getElementById('quizTitle').innerText = '🎯 闯关复习';
    showQuizQuestion();
    playCorrectSound();
  }

  function showQuizQuestion() {
    if (quizState.currentIdx >= quizState.questions.length) {
      finishQuiz();
      return;
    }
    quizState.answered = false;
    var q = quizState.questions[quizState.currentIdx];
    var idx = quizState.currentIdx + 1;
    var total = quizState.totalCount;
    document.getElementById('quizProgressFill').style.width = ((idx - 1) / total * 100) + '%';
    document.getElementById('quizProgressText').innerText = idx + '/' + total;
    document.getElementById('quizQuestion').innerHTML =
      '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">' + q.questionLabel + '</div>' +
      '<div class="' + (q.type === 'wordfill' || q.type === 'idiom' ? 'quiz-question small' : 'quiz-question') + '">' + q.question + '</div>';
    var optWrap = document.getElementById('quizOptions');
    optWrap.innerHTML = '';
    q.options.forEach(function(opt) {
      var btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.innerText = opt;
      btn.onclick = function() { submitQuizAnswer(opt, btn); };
      optWrap.appendChild(btn);
    });
    document.getElementById('quizFeedback').innerHTML = '';
    document.getElementById('quizNext').style.display = 'none';
    document.getElementById('quizSkip').style.display = '';
  }

  function submitQuizAnswer(answer, btnEl) {
    if (quizState.answered) return;
    quizState.answered = true;
    var q = quizState.questions[quizState.currentIdx];
    var isCorrect = (answer === q.answer);
    // 标记选项
    var allBtns = document.querySelectorAll('#quizOptions .quiz-option');
    allBtns.forEach(function(b) {
      b.style.pointerEvents = 'none';
      if (b.innerText === q.answer) b.classList.add('correct');
      else if (b.innerText === answer && !isCorrect) b.classList.add('wrong');
    });
    var fb = document.getElementById('quizFeedback');
    if (isCorrect) {
      quizState.correctCount++;
      fb.innerHTML = '<span class="correct-text">✅ 答对了！</span>';
      playCorrectSound();
      speakText('答对了！');
      updateReviewRecord(q.charId, true);
      syncGuessRecordToCloud(q.charId, true, quizState.currentAttempts);
    } else {
      fb.innerHTML = '<span class="wrong-text">❌ 正确答案是「' + q.answer + '」';
      if (q.detail) fb.innerHTML += '<br/><small>' + q.detail + '</small>';
      fb.innerHTML += '</span>';
      playWrongSound();
      updateReviewRecord(q.charId, false);
      syncGuessRecordToCloud(q.charId, false, quizState.currentAttempts);
    }
    document.getElementById('quizNext').style.display = '';
    document.getElementById('quizSkip').style.display = 'none';
  }

  function finishQuiz() {
    var score = quizState.correctCount;
    var total = quizState.totalCount;
    var stars = score >= total ? '🌟🌟🌟' : score >= total * 0.6 ? '🌟🌟' : '🌟';
    document.getElementById('quizTitle').innerText = '🎉 闯关完成';
    document.getElementById('quizProgressFill').style.width = '100%';
    document.getElementById('quizProgressText').innerText = total + '/' + total;
    document.getElementById('quizQuestion').innerHTML = '';
    document.getElementById('quizOptions').innerHTML = '';
    document.getElementById('quizFeedback').innerHTML = '';
    document.getElementById('quizNext').style.display = 'none';
    document.getElementById('quizSkip').style.display = 'none';
    var resultEl = document.getElementById('quizResult');
    resultEl.style.display = '';
    document.getElementById('quizScore').innerText = score + ' / ' + total;
    document.getElementById('quizStars').innerText = stars;
    if (score === total) { showFirework(); playUnlockSound(); }
    addPetExp(score);
    incStat('quizTotal');
    incStat('quizCorrect', score);
  }

  // ======================== 笔画描红系统 ========================
  var writeTarget = null;
  var writeCtx = null;

  function initWriteCanvas() {
    var canvas = document.getElementById('writeCanvas');
    if (!canvas) return;
    writeCtx = canvas.getContext('2d');
    drawTianGrid();
    // 鼠标事件
    var drawing = false;
    canvas.onmousedown = function(e) { drawing = true; drawDot(e); };
    canvas.onmousemove = function(e) { if (drawing) drawDot(e); };
    canvas.onmouseup = function() { drawing = false; };
    canvas.onmouseleave = function() { drawing = false; };
    // 触摸事件
    canvas.ontouchstart = function(e) { e.preventDefault(); drawing = true; drawDot(e.touches[0]); };
    canvas.ontouchmove = function(e) { e.preventDefault(); if (drawing) drawDot(e.touches[0]); };
    canvas.ontouchend = function() { drawing = false; };
  }

  function drawTianGrid() {
    if (!writeCtx) return;
    var w = 300, h = 300;
    writeCtx.clearRect(0, 0, w, h);
    // 外框
    writeCtx.strokeStyle = '#333';
    writeCtx.lineWidth = 2;
    writeCtx.strokeRect(4, 4, w-8, h-8);
    // 十字虚线
    writeCtx.strokeStyle = '#e57373';
    writeCtx.lineWidth = 1;
    writeCtx.setLineDash([6, 4]);
    writeCtx.beginPath();
    writeCtx.moveTo(w/2, 4); writeCtx.lineTo(w/2, h-4);
    writeCtx.moveTo(4, h/2); writeCtx.lineTo(w-4, h/2);
    writeCtx.stroke();
    // 米字虚线
    writeCtx.strokeStyle = '#ccc';
    writeCtx.beginPath();
    writeCtx.moveTo(4, 4); writeCtx.lineTo(w-4, h-4);
    writeCtx.moveTo(w-4, 4); writeCtx.lineTo(4, h-4);
    writeCtx.stroke();
    writeCtx.setLineDash([]);
  }

  function drawDot(e) {
    if (!writeCtx) return;
    var rect = document.getElementById('writeCanvas').getBoundingClientRect();
    var scaleX = 300 / rect.width;
    var scaleY = 300 / rect.height;
    var x = (e.clientX - rect.left) * scaleX;
    var y = (e.clientY - rect.top) * scaleY;
    writeCtx.fillStyle = '#333';
    writeCtx.beginPath();
    writeCtx.arc(x, y, 4, 0, Math.PI * 2);
    writeCtx.fill();
  }

  function openWrite(charId) {
    var n = nodeMap.get(charId);
    if (!n) return;
    writeTarget = charId;
    document.getElementById('writeTitle').innerText = '✍️ 写一写「' + n.name + '」';
    document.getElementById('writeModelChar').innerText = n.name;
    document.getElementById('writeFeedback').innerHTML = '';
    document.getElementById('writeMask').classList.add('show');
    setTimeout(function() {
      initWriteCanvas();
    }, 100);
  }

  function clearWriteCanvas() {
    drawTianGrid();
    document.getElementById('writeFeedback').innerHTML = '';
  }

  function finishWrite() {
    var feedback = ['写得真棒！🌟','继续加油！💪','越来越好！✨','这个字写得真好看！','你已经很棒了！'];
    document.getElementById('writeFeedback').innerHTML = feedback[Math.floor(Math.random() * feedback.length)];
    playCorrectSound();
    addPetExp(1);
    setTimeout(function() {
      document.getElementById('writeMask').classList.remove('show');
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
  
  // ======================== UI 绑定 ========================
  function bindUI() {
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
  
    document.getElementById('asideToggle').onclick = function() {
      document.getElementById('asidePanel').classList.toggle('hide');
      document.getElementById('asideToggle').classList.toggle('hide');
    };
    document.getElementById('voicePlay').onclick = function() {
      var ch = document.getElementById('panelChar').innerText;
      if(ch) speakText(ch);
    };
    document.getElementById('writeBtn').onclick = function() {
      if (currentPanelNodeId) openWrite(currentPanelNodeId);
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
    // 答对详情中的朗读按钮（事件委托）
    document.getElementById('guessResult').addEventListener('click', function(e) {
      var btn = e.target.closest('.speak-btn, .speak-btn-tiny');
      if (!btn) return;
      e.stopPropagation();
      var sp = btn.getAttribute('data-speak');
      var spAll = btn.getAttribute('data-speak-all');
      var spIdiom = btn.getAttribute('data-speak-idiom');
      if (sp) {
        speakText(sp);
      } else if (spAll) {
        spAll.split('|').forEach(function(item) { speakIdiom(item); });
      } else if (spIdiom) {
        speakIdiom(spIdiom);
      }
    });

    document.getElementById('guessSubmit').onclick = submitGuess;
    document.getElementById('guessMore').onclick = function() {
      nextHint();
    };

    document.getElementById('guessNext').onclick = closeGuess;

    document.getElementById('starClose').onclick = function() { document.getElementById('starMask').classList.remove('show'); };
    document.getElementById('signBtn').onclick = function() { doSignIn(); };
    
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
    // 闯关复习入口
    document.getElementById('startQuizBtn').onclick = function() {
      document.getElementById('starMask').classList.remove('show');
      startQuiz();
    };
    document.getElementById('reviewClose').onclick = function() { document.getElementById('reviewMask').classList.remove('show'); };
    document.getElementById('reviewKnow').onclick = removeMistake;
    document.getElementById('reviewSkip').onclick = skipReview;
    document.getElementById('reviewMask').onclick = function(e) { if(e.target === this) this.classList.remove('show'); };
    // 闯关复习事件
    document.getElementById('quizClose').onclick = function() { document.getElementById('quizMask').classList.remove('show'); };
    document.getElementById('quizMask').onclick = function(e) { if(e.target === this) this.classList.remove('show'); };
    document.getElementById('quizNext').onclick = function() {
      quizState.currentIdx++;
      showQuizQuestion();
    };
    document.getElementById('quizSkip').onclick = function() {
      updateReviewRecord(quizState.questions[quizState.currentIdx].charId, false);
      quizState.currentIdx++;
      showQuizQuestion();
    };
    document.getElementById('quizFinish').onclick = function() {
      document.getElementById('quizMask').classList.remove('show');
      updateMyCenter();
      updateDailyTask();
    };
    // 笔画描红事件
    document.getElementById('writeClose').onclick = function() { document.getElementById('writeMask').classList.remove('show'); };
    document.getElementById('writeMask').onclick = function(e) { if(e.target === this) this.classList.remove('show'); };
    document.getElementById('writeClear').onclick = clearWriteCanvas;
    document.getElementById('writeDone').onclick = finishWrite;
    document.getElementById('parentClose').onclick = function() { parentMask.classList.remove('show'); };

    // ======================== 数据导出/导入功能 ========================
    function exportUserData() {
      // 收集所有相关数据
      var exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        app: '汉字图谱',
        data: {}
      };
      
      // 导出所有 hanzi_ 开头的 localStorage 数据
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (key && key.indexOf('hanzi_') === 0) {
            var value = localStorage.getItem(key);
            try {
              exportData.data[key] = JSON.parse(value);
            } catch(e) {
              exportData.data[key] = value;
            }
          }
        }
      } catch(e) {
        console.error('导出数据失败:', e);
        alert('导出失败：无法读取本地数据');
        return;
      }
      
      // 生成并下载 JSON 文件
      var jsonStr = JSON.stringify(exportData, null, 2);
      var blob = new Blob([jsonStr], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = '汉字图谱数据_' + (currentUser || 'default') + '_' + getTodayStr() + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification('📤 数据已导出！请妥善保存文件', 'success');
    }
    
    function importUserData(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var importData = JSON.parse(e.target.result);
          
          // 验证数据格式
          if (!importData.app || importData.app !== '汉字图谱') {
            alert('导入失败：文件格式不正确');
            return;
          }
          
          if (!importData.data) {
            alert('导入失败：文件中没有数据');
            return;
          }
          
          // 确认导入
          var confirmMsg = '确定要导入数据吗？\n这将覆盖当前的所有学习记录！\n\n导出日期：' + (importData.exportDate || '未知');
          if (!confirm(confirmMsg)) {
            return;
          }
          
          // 导入数据到 localStorage
          var importedCount = 0;
          for (var key in importData.data) {
            if (key.indexOf('hanzi_') === 0) {
              var value = importData.data[key];
              if (typeof value === 'object') {
                localStorage.setItem(key, JSON.stringify(value));
              } else {
                localStorage.setItem(key, value);
              }
              importedCount++;
            }
          }
          
          showNotification('📥 数据导入成功！已恢复 ' + importedCount + ' 条记录', 'success');
          
          // 重新加载用户数据
          setTimeout(function() {
            loadUserData();
            reloadAll();
            document.getElementById('starMask').classList.remove('show');
          }, 500);
          
        } catch(err) {
          console.error('导入数据失败:', err);
          alert('导入失败：文件解析错误\n' + err.message);
        }
      };
      reader.onerror = function() {
        alert('导入失败：无法读取文件');
      };
      reader.readAsText(file);
    }

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
    // 汉字接龙跳转
    var dragonBtn = document.getElementById('dragonBtn');
    if(dragonBtn) {
      dragonBtn.onclick = function() {
        window.location.href = 'dragon.html';
      };
    }
    // 主题皮肤切换
    var themeSel = document.getElementById('themeSelect');
    if (themeSel) {
      var curTheme = localStorage.getItem('hanzi_theme') || 'default';
      themeSel.value = curTheme;
      themeSel.onchange = function() {
        var val = this.value;
        document.documentElement.classList.remove('theme-forest', 'theme-ocean', 'theme-space');
        if (val && val !== 'default') document.documentElement.classList.add('theme-' + val);
        localStorage.setItem('hanzi_theme', val);
      };
    }

    // ======================== 数据导出/导入 ========================
    document.getElementById('exportDataBtn').onclick = function() {
      exportUserData();
    };
    document.getElementById('importDataBtn').onclick = function() {
      document.getElementById('importFileInput').click();
    };
    document.getElementById('importFileInput').onchange = function(e) {
      if(e.target.files && e.target.files[0]) {
        importUserData(e.target.files[0]);
      }
      e.target.value = ''; // 清空，允许重复导入同一文件
    };

    // 宠物点击聊天
    var petAvatarBtn = document.getElementById('petAvatar');
    if(petAvatarBtn) {
      petAvatarBtn.onclick = function(e) { e.stopPropagation(); openPetChat(); };
      petAvatarBtn.title = '跟宠物聊天';
    }
    // 宠物聊天事件
    document.getElementById('petChatClose').onclick = closePetChat;
    document.getElementById('petChatMask').onclick = function(e) { if(e.target === this) closePetChat(); };
    document.getElementById('petChatSend').onclick = sendPetChat;
    document.getElementById('petChatInput').onkeydown = function(e) { if(e.key === 'Enter') sendPetChat(); };
    document.querySelectorAll('.quick-btn').forEach(function(btn) {
      btn.onclick = function() { handlePetChatQuick(this.getAttribute('data-q')); };
    });

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
      initZones();
      loadUserData();
      // 恢复主题皮肤
      var savedTheme = localStorage.getItem('hanzi_theme') || 'default';
      if (savedTheme && savedTheme !== 'default') {
        document.documentElement.classList.add('theme-' + savedTheme);
      }
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
      // 宠物主动打招呼
      setTimeout(function() {
        var greeting = getPetContextMessage();
        showPetBubble(greeting);
      }, 3000);
      window.addEventListener('resize', function() { if(myChart) myChart.resize(); });
      console.log('汉字王国初始化完成 | 用户: ' + (currentUser||'默认') + ' | 已解锁: ' + unlocked.size + ' 个');
      // 尝试从云端同步数据
      syncUserDataFromCloud();
    } catch(e) {
      console.error('初始化失败:', e);
      document.querySelector('.loading-text').innerText = '加载出错: ' + e.message;
      document.getElementById('loadingMask').classList.remove('hide');
    }
  }

  // ======================== 云端数据同步 ========================
  async function syncUserDataFromCloud() {
    if(!window.supabase || !currentUser) return;
    try {
      console.log('正在尝试从云端同步数据...');
      var cloudUser = await supabase.getUser(currentUser);
      if(cloudUser) {
        console.log('找到云端用户:', cloudUser);
        // 同步等级和经验
        if(cloudUser.level && cloudUser.level > 1) {
          currentUserData.petLevel = cloudUser.level;
          savePetData();
        }
        if(cloudUser.exp && cloudUser.exp > 0) {
          currentUserData.petExp = cloudUser.exp;
          savePetData();
        }
        if(cloudUser.stars && cloudUser.stars > currentUserData.stars) {
          currentUserData.stars = cloudUser.stars;
          saveData('stars', currentUserData.stars);
        }
        // 同步解锁记录
        var cloudUnlocked = await supabase.getUnlockedChars(cloudUser.id);
        if(cloudUnlocked && cloudUnlocked.length > 0) {
          var newUnlocked = [];
          cloudUnlocked.forEach(function(item) {
            if(!unlocked.has(item.char_name)) {
              newUnlocked.push(item.char_name);
            }
          });
          if(newUnlocked.length > 0) {
            console.log('从云端同步了 ' + newUnlocked.length + ' 个解锁汉字');
            newUnlocked.forEach(function(charId) {
              unlocked.add(charId);
            });
            saveData('unlocked', Array.from(unlocked));
            renderChart();
          }
        }
      } else {
        console.log('云端无此用户，将本地数据上传...');
        await uploadUserDataToCloud();
      }
    } catch(e) {
      console.warn('云端同步失败:', e);
    }
  }

  async function uploadUserDataToCloud() {
    if(!window.supabase || !currentUser) return;
    try {
      var existingUser = await supabase.getUser(currentUser);
      if(existingUser) {
        await supabase.updateUser(existingUser.id, {
          level: currentUserData.petLevel,
          exp: currentUserData.petExp,
          stars: currentUserData.stars,
          avatar: currentUserData.avatar
        });
        // 同步解锁记录
        var cloudUnlocked = await supabase.getUnlockedChars(existingUser.id);
        var cloudUnlockedSet = new Set(cloudUnlocked.map(function(item) { return item.char_name; }));
        unlocked.forEach(function(charId) {
          if(!cloudUnlockedSet.has(charId)) {
            supabase.unlockChar(existingUser.id, charId);
          }
        });
      } else {
        var newUser = await supabase.createUser({
          username: currentUser,
          level: currentUserData.petLevel,
          exp: currentUserData.petExp,
          stars: currentUserData.stars,
          avatar: currentUserData.avatar
        });
        if(newUser.length > 0) {
          var userId = newUser[0].id;
          unlocked.forEach(function(charId) {
            supabase.unlockChar(userId, charId);
          });
        }
      }
      console.log('数据上传成功');
    } catch(e) {
      console.warn('数据上传失败:', e);
    }
  }

  async function syncUnlockToCloud(charId) {
    if(!window.supabase || !currentUser) return;
    try {
      var cloudUser = await supabase.getUser(currentUser);
      if(cloudUser) {
        await supabase.unlockChar(cloudUser.id, charId);
        // 更新用户等级和经验
        await supabase.updateUser(cloudUser.id, {
          level: currentUserData.petLevel,
          exp: currentUserData.petExp,
          stars: currentUserData.stars
        });
      }
    } catch(e) {
      console.warn('同步解锁失败:', e);
    }
  }

  async function syncCheckinToCloud(streakDays) {
    if(!window.supabase || !currentUser) return;
    try {
      var cloudUser = await supabase.getUser(currentUser);
      if(cloudUser) {
        await supabase.checkIn(cloudUser.id, streakDays);
      }
    } catch(e) {
      console.warn('同步签到失败:', e);
    }
  }

  async function syncGuessRecordToCloud(charName, isCorrect, attempts) {
    if(!window.supabase || !currentUser) return;
    try {
      var cloudUser = await supabase.getUser(currentUser);
      if(cloudUser) {
        await supabase.addGuessRecord(cloudUser.id, charName, isCorrect, attempts);
      }
    } catch(e) {
      console.warn('同步答题记录失败:', e);
    }
  }

  init();


  // ======================== 宠物AI对话系统（本地离线） ========================
  var petChatOpen = false;
  
  // 宠物性格模板（根据宠物阶段变化）
  function getPetPersonality() {
    var level = currentUserData.petLevel || 1;
    var skinEmoji = getCurrentPetSkinEmoji();
    var stageName = getPetStageName(level);
    
    // 不同皮肤有不同口癖
    var quirks = {
      '🐯': '嗷呜～', '🐼': '嘿咻～', '🦊': '嘻嘻～',
      '🐲': '吼～', '🦁': '嗷～', '🐺': '嗷呜～',
      '🦅': '唳～', '🦉': '咕咕～', '🦜': '叽叽～',
      '🐉': '昂～', '🦄': '叮铃～'
    };
    var quirk = quirks[skinEmoji] || '～';
    
    return { emoji: skinEmoji, name: stageName, level: level, quirk: quirk };
  }
  
  // 生成情境对话（不依赖用户输入，宠物主动说）
  function getPetContextMessage() {
    var p = getPetPersonality();
    var hour = new Date().getHours();
    var learned = learnedSet.size;
    var todayCount = currentUserData.todayCount || 0;
    var streak = currentUserData.streakDays || 0;
    var target = currentUserData.dailyTarget || 3;
    
    var msgs = [];
    
    // 时间问候
    if (hour < 9) msgs.push(p.quirk + ' 早上好！新的一天，一起认识新汉字吧！');
    else if (hour < 12) msgs.push(p.quirk + ' 上午好！今天学字了吗？');
    else if (hour < 14) msgs.push(p.quirk + ' 午安～吃饱了来学几个字吧！');
    else if (hour < 18) msgs.push(p.quirk + ' 下午好！来跟我聊聊汉字吧～');
    else if (hour < 21) msgs.push(p.quirk + ' 晚上好！今天的学习任务完成了吗？');
    else msgs.push(p.quirk + ' 夜深了，早点休息哦～明天再战！');
    
    // 学习进度
    if (todayCount >= target) msgs.push('太厉害了，今天的任务已经完成啦！🌟');
    else if (todayCount > 0) msgs.push('今天已学了' + todayCount + '个字，再学' + (target - todayCount) + '个就达标了！');
    else msgs.push('今天还没开始学呢，快来猜几个字吧！');
    
    // 连续学习
    if (streak >= 7) msgs.push('哇！连续学习' + streak + '天了，你是最棒的！');
    else if (streak >= 3) msgs.push('连续学习' + streak + '天了，坚持就是胜利！');
    
    // 总量里程碑
    if (learned >= 100) msgs.push('你已经认识' + learned + '个汉字了，真是汉字小博士！');
    else if (learned >= 50) msgs.push('认识了' + learned + '个字，超过一半啦！');
    else if (learned >= 20) msgs.push('已经学了' + learned + '个字了，继续加油！');
    
    // 宠物等级
    if (p.level >= 8) msgs.push('我现在是' + p.name + '，谢谢你带我成长！' + p.emoji);
    else if (p.level >= 4) msgs.push('我进化成' + p.name + '了！一起变得更厉害吧！');
    
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  
  // 核心：根据用户输入生成回复
  function petAIReply(userText) {
    var p = getPetPersonality();
    var text = userText.trim();
    var learned = learnedSet.size;
    var todayCount = currentUserData.todayCount || 0;
    var streak = currentUserData.streakDays || 0;
    var lastChar = lastUnlockedNodeId;
    var lastNode = nodeMap.get(lastChar);
    
    // ===== 关键词匹配 =====
    
    // 成语相关
    if (/成语/.test(text)) {
      return pickPetIdiom(p);
    }
    
    // 考试/测验
    if (/考考|测验|测试|挑战/.test(text)) {
      return pickPetQuiz(p);
    }
    
    // 成绩/进度
    if (/多少|成绩|进度|学了|学会/.test(text)) {
      return p.quirk + ' 你已经认识了' + learned + '个汉字！今天学了' + todayCount + '个，连续学习' + streak + '天。' + (learned >= 50 ? '太厉害了！🌟' : '继续加油！💪');
    }
    
    // 鼓励
    if (/鼓励|加油|累了|不想|难|不会/.test(text)) {
      var encourages = [
        p.quirk + ' 别灰心！每一个汉字都是一步，你已经走了' + learned + '步了！',
        p.quirk + ' 学习就像爬山，休息一下再继续，我陪你！',
        p.quirk + ' 当初我学这些字的时候也觉得难，多看几遍就记住啦～',
        '加油呀！你已经比昨天的自己更厉害了！' + p.emoji,
        p.quirk + ' 慢慢来，不着急！学一个算一个！'
      ];
      return encourages[Math.floor(Math.random() * encourages.length)];
    }
    
    // 问候
    if (/你好|嗨|hi|hello|早上|下午|晚上/.test(text)) {
      return p.quirk + ' 你好呀！我是' + p.name + '，今天想学什么字？';
    }
    
    // 问某个字
    var charMatch = text.match(/["""]?([\u4e00-\u9fff])["""]?.*[怎么|什么|意思|写|读|讲]/);
    if (!charMatch) charMatch = text.match(/讲讲.*?["""]?([\u4e00-\u9fff])["""]?/);
    if (charMatch) {
      var ch = charMatch[1];
      var node = nodeMap.get(ch);
      if (node) {
        var parts = [];
        if (node.pinyin) parts.push('读音是"' + node.pinyin + '"');
        if (node.oracle) parts.push(node.oracle);
        if (node.origin) parts.push('记住：' + node.origin);
        if (parts.length > 0) return p.quirk + ' 「' + ch + '」' + parts.join('。') + '。';
        return p.quirk + ' 「' + ch + '」我也在学呢，一起加油！';
      }
      return p.quirk + ' 「' + ch + '」这个字我还没学到，等你解锁了告诉我哦～';
    }
    
    // 聊天/闲聊
    if (/喜欢|爱|开心|高兴|好玩|有趣/.test(text)) {
      return p.quirk + ' 我也觉得学汉字很好玩！每个字都有自己的故事呢～';
    }
    
    if (/谢谢|感谢|谢了/.test(text)) {
      return p.quirk + ' 不客气！能陪你学习我很开心！' + p.emoji;
    }
    
    if (/你是谁|你叫什么|自我介绍/.test(text)) {
      return p.quirk + ' 我是' + p.name + '，等级Lv' + p.level + '！你学汉字我长大，我们一起进步！' + p.emoji;
    }
    
    // 最近学的字
    if (/最近|上次|刚学/.test(text)) {
      if (lastNode) {
        var info = '你最近学了「' + lastChar + '」';
        if (lastNode.origin) info += '，' + lastNode.origin;
        return p.quirk + ' ' + info + '。要不要再学几个新的？';
      }
      return p.quirk + ' 还没有学习记录呢，快去猜字吧！';
    }
    
    // 默认回复（带上下文）
    var defaults = [
      p.quirk + ' 嗯嗯，要不我们学个新字？点击图谱上的问号试试！',
      p.quirk + ' 我在想…你觉得最近学的哪个字最有意思？',
      p.quirk + ' 学汉字就像交朋友，多见面就认识了～',
      p.quirk + ' 你知道吗？汉字已经有三千多年的历史了！',
      p.quirk + ' 点我身上的💡可以在猜字时获得提示哦！',
      p.quirk + ' 我现在Lv' + p.level + '，你多学字我就能进化！',
      '有什么想知道的字直接告诉我吧！' + p.emoji,
    ];
    return defaults[Math.floor(Math.random() * defaults.length)];
  }
  
  // 随机讲一个成语（从已解锁的字中找）
  function pickPetIdiom(p) {
    var charWithIdioms = [];
    unlocked.forEach(function(id) {
      var n = nodeMap.get(id);
      if (n && n.idioms) charWithIdioms.push(n);
    });
    
    if (charWithIdioms.length === 0) {
      return p.quirk + ' 你还没解锁有成语的字哦，快去学几个吧！';
    }
    
    var node = charWithIdioms[Math.floor(Math.random() * charWithIdioms.length)];
    var idiomList = node.idioms.split('|');
    var item = idiomList[Math.floor(Math.random() * idiomList.length)];
    var parts = item.split('::');
    var idiom = parts[0];
    var meaning = parts[1] || '';
    
    var msg = p.quirk + ' 给你讲个成语：「' + idiom + '」';
    if (meaning) msg += '，意思是' + meaning;
    msg += '。里面有你学过的「' + node.name + '」哦！';
    return msg;
  }
  
  // 考考用户
  function pickPetQuiz(p) {
    var pool = [];
    unlocked.forEach(function(id) {
      var n = nodeMap.get(id);
      if (n && n.origin) pool.push(n);
    });
    
    if (pool.length < 3) {
      return p.quirk + ' 你学的字还不够多，先多学几个再来考吧！';
    }
    
    var node = pool[Math.floor(Math.random() * pool.length)];
    return p.quirk + ' 考考你！哪个字的由来是："' + node.oracle + '"？点击图谱去找到它吧！💡（答案是「' + node.name + '」）';
  }
  
  
  function getPetExpMessage(amount) {
    var p = getPetPersonality();
    var msgs = [
      p.quirk + ' +' + amount + '经验！又变强了一点点！',
      p.quirk + ' 谢谢你带我长大！+' + amount + '经验～',
      '哇，+' + amount + '经验！继续学字我就能进化了！',
      p.quirk + ' +' + amount + '！你学字我长大，真好～',
      '收到' + amount + '点经验！' + p.emoji
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  // ===== 聊天UI =====
  function openPetChat() {
    petChatOpen = true;
    var mask = document.getElementById('petChatMask');
    var avatar = document.getElementById('petChatAvatar');
    var nameEl = document.getElementById('petChatName');
    var msgs = document.getElementById('petChatMessages');
    var input = document.getElementById('petChatInput');
    
    var p = getPetPersonality();
    avatar.innerText = p.emoji;
    nameEl.innerText = p.name + ' Lv' + p.level;
    
    // 如果是第一次打开，显示欢迎语
    if (msgs.children.length === 0) {
      addPetChatMsg('pet', getPetContextMessage());
    }
    
    mask.classList.add('show');
    setTimeout(function() { input.focus(); }, 200);
  }
  
  function closePetChat() {
    petChatOpen = false;
    document.getElementById('petChatMask').classList.remove('show');
  }
  
  function addPetChatMsg(type, text) {
    var msgs = document.getElementById('petChatMessages');
    var div = document.createElement('div');
    div.className = 'pet-chat-msg ' + (type === 'pet' ? 'pet-msg' : 'user-msg');
    div.innerText = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    
    // 最多保留30条
    while (msgs.children.length > 30) {
      msgs.removeChild(msgs.firstChild);
    }
  }
  
  function sendPetChat() {
    var input = document.getElementById('petChatInput');
    var text = input.value.trim();
    if (!text) return;
    
    addPetChatMsg('user', text);
    input.value = '';
    
    // 延迟回复，模拟思考
    setTimeout(function() {
      var reply = petAIReply(text);
      addPetChatMsg('pet', reply);
    }, 400 + Math.random() * 600);
  }
  
  function handlePetChatQuick(question) {
    document.getElementById('petChatInput').value = question;
    sendPetChat();
  }

})();