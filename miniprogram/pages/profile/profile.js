// 个人中心页
const graph = require('../../utils/graph');
const storage = require('../../utils/storage');

// 成就定义
const achievements = [
  { id: 'first', icon: '🌟', name: '初识汉字', desc: '认识第1个汉字', check: n => n >= 1 },
  { id: 'newbie5', icon: '🌱', name: '识字新手', desc: '认识5个汉字', check: n => n >= 5 },
  { id: 'learner20', icon: '📖', name: '识字达人', desc: '认识20个汉字', check: n => n >= 20 },
  { id: 'scholar50', icon: '🎓', name: '汉字小博士', desc: '认识50个汉字', check: n => n >= 50 },
  { id: 'master100', icon: '👑', name: '汉字大师', desc: '认识100个汉字', check: n => n >= 100 },
  { id: 'king200', icon: '🏆', name: '汉字王者', desc: '认识200个汉字', check: n => n >= 200 }
];

const petEmojiMap = { 1: '🐯', 4: '🐲', 6: '🦅', 8: '🐉' };
const petNames = {
  1: '小萌宠', 2: '成长宠', 3: '勇敢宠',
  4: '小灵龙', 5: '灵龙', 6: '飞鹰',
  7: '雄鹰', 8: '神龙', 9: '龙王', 10: '龙王'
};

function getPetExpToNext(level) {
  return level * 5;
}

Page({
  data: {
    eyeProtect: false,
    soundEnabled: true,
    currentUser: '',
    // 统计
    learnedCount: 0,
    unlockedCount: 0,
    starCount: 0,
    todayCount: 0,
    streakDays: 0,
    // 列表
    recentChars: [],
    mistakeChars: [],
    // 宠物
    petEmoji: '🐯',
    petName: '小萌宠',
    petLevel: 1,
    petExp: 0,
    petExpNext: 5,
    petExpPct: 0,
    // 成就
    badges: [],
    // 用户
    users: [],
    newUserName: '',
    // 复习
    showReview: false,
    reviewIndex: 0,
    reviewChar: '',
    reviewPinyin: '',
    reviewOrigin: ''
  },

  onLoad(options) {
    const tab = options.tab || '';
    this.loadAllData();
    if (tab === 'user') {
      // 可以滚动到用户区域
    }
  },

  onShow() {
    this.loadAllData();
  },

  loadAllData() {
    const userData = storage.getUserData();
    const learned = userData.learned || ['一'];
    const unlocked = userData.unlocked || ['一'];
    const mistakes = userData.mistakes || [];
    const petLevel = userData.petLevel || 1;
    const petExp = userData.petExp || 0;
    const petExpNext = getPetExpToNext(petLevel);
    const petExpPct = Math.min(100, Math.round((petExp / petExpNext) * 100));

    // 宠物图标
    let petEmoji = '🐯';
    if (petLevel >= 8) petEmoji = petEmojiMap[8];
    else if (petLevel >= 6) petEmoji = petEmojiMap[6];
    else if (petLevel >= 4) petEmoji = petEmojiMap[4];

    // 计算成就
    const badges = [];
    achievements.forEach(a => {
      if (a.check(learned.length)) {
        badges.push(a.icon + a.name);
      }
    });
    if (badges.length === 0) badges.push('🌟 识字小能手');

    this.setData({
      eyeProtect: storage.getEyeProtect(),
      soundEnabled: storage.getSoundEnabled(),
      currentUser: storage.getCurrentUser() || '默认',
      learnedCount: learned.length,
      unlockedCount: unlocked.length,
      starCount: userData.stars || 0,
      todayCount: userData.todayCount || 0,
      streakDays: userData.streakDays || 1,
      recentChars: (userData.recent || []).slice(0, 10),
      mistakeChars: mistakes,
      petEmoji: petEmoji,
      petName: petNames[petLevel] || '大宠物',
      petLevel: petLevel,
      petExp: petExp,
      petExpNext: petExpNext,
      petExpPct: petExpPct,
      badges: badges,
      users: storage.getUsers()
    });
  },

  // 设置
  toggleEye() {
    const val = !this.data.eyeProtect;
    storage.setEyeProtect(val);
    this.setData({ eyeProtect: val });
    // 同步更新全局页面样式
    const pages = getCurrentPages();
    if (pages.length > 0) {
      const page = pages[pages.length - 1];
      if (page.setData) {
        page.setData({ eyeProtect: val });
      }
    }
  },

  toggleSound() {
    const val = !this.data.soundEnabled;
    storage.setSoundEnabled(val);
    this.setData({ soundEnabled: val });
  },

  // 错字复习
  startReview() {
    const mistakes = this.data.mistakeChars;
    if (mistakes.length === 0) {
      wx.showToast({ title: '没有错字需要复习', icon: 'none' });
      return;
    }
    this.setData({ showReview: true, reviewIndex: 0 });
    this.showReviewCard(0);
  },

  showReviewCard(index) {
    const mistakes = this.data.mistakeChars;
    if (index >= mistakes.length) {
      this.setData({ showReview: false });
      wx.showToast({ title: '🎉 复习完成！', icon: 'none' });
      return;
    }
    const nodeMap = graph.getNodeMap();
    const node = nodeMap.get(mistakes[index]);
    if (!node) {
      // 跳过无效的错字
      this.nextReview(index + 1);
      return;
    }
    this.setData({
      reviewIndex: index,
      reviewChar: node.name,
      reviewPinyin: node.pinyin || '',
      reviewOrigin: node.oracle || node.origin || ''
    });
  },

  reviewKnow() {
    // 从错字本中移除
    const userData = storage.getUserData();
    const mistakes = userData.mistakes || [];
    const charId = mistakes[this.data.reviewIndex];
    const newMistakes = mistakes.filter(id => id !== charId);
    storage.saveField('mistakes', newMistakes);
    storage.saveAll();
    
    // 更新显示
    this.setData({ mistakeChars: newMistakes });
    this.nextReview(this.data.reviewIndex);
  },

  reviewSkip() {
    this.nextReview(this.data.reviewIndex + 1);
  },

  nextReview(nextIndex) {
    const mistakes = this.data.mistakeChars;
    if (nextIndex >= mistakes.length) {
      this.setData({ showReview: false });
      wx.showToast({ title: '🎉 复习完成！', icon: 'none' });
      // 重新加载数据
      this.loadAllData();
      return;
    }
    this.setData({ reviewIndex: nextIndex });
    this.showReviewCard(nextIndex);
  },

  closeReview() {
    this.setData({ showReview: false });
  },

  // 用户管理
  onUserNameInput(e) {
    this.setData({ newUserName: e.detail.value });
  },

  createUser() {
    const name = this.data.newUserName.trim();
    if (!name) {
      wx.showToast({ title: '请输入用户名', icon: 'none' });
      return;
    }
    const users = storage.getUsers();
    if (users.indexOf(name) >= 0) {
      wx.showToast({ title: '该用户名已存在', icon: 'none' });
      return;
    }
    users.push(name);
    storage.saveUsers(users);
    storage.setCurrentUser(name);
    getApp().loadCurrentUserData();
    
    this.setData({
      users: users,
      newUserName: '',
      currentUser: name
    });
    this.loadAllData();
    wx.showToast({ title: '创建成功！', icon: 'success' });
  },

  switchToUser(e) {
    const name = e.currentTarget.dataset.name;
    if (name === this.data.currentUser) return;
    storage.setCurrentUser(name);
    getApp().loadCurrentUserData();
    this.setData({ currentUser: name });
    this.loadAllData();
    wx.showToast({ title: '切换到 ' + name, icon: 'none' });
  },

  goBack() {
    wx.navigateBack();
  }
});
