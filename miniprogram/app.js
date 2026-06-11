// 汉字王国小程序入口
App({
  globalData: {
    currentUser: null,
    currentUserData: {
      unlocked: ['一'],
      learned: ['一'],
      stars: 0,
      lastNode: '一',
      recent: [],
      mistakes: [],
      avatar: '👤',
      nickname: '',
      dailyTarget: 3,
      lastActiveDate: '',
      streakDays: 0,
      todayCount: 0,
      history: {},
      petLevel: 1,
      petExp: 0,
      petMessage: ''
    },
    soundEnabled: true,
    eyeProtect: false,
    users: []
  },

  onLaunch() {
    // 加载用户列表
    try {
      const users = wx.getStorageSync('hanzi_users');
      if (users) this.globalData.users = JSON.parse(users);
    } catch (e) { /* 忽略 */ }
    
    // 加载活跃用户
    try {
      const user = wx.getStorageSync('hanzi_active_user');
      if (user) this.globalData.currentUser = user;
    } catch (e) { /* 忽略 */ }
    
    // 加载音效设置
    try {
      const sound = wx.getStorageSync('soundEnabled');
      if (sound !== '') this.globalData.soundEnabled = sound !== 'false';
    } catch (e) { /* 忽略 */ }
    
    // 加载护眼模式
    try {
      const eye = wx.getStorageSync('eyeProtect');
      if (eye !== '') this.globalData.eyeProtect = eye === 'true';
    } catch (e) { /* 忽略 */ }
    
    this.loadCurrentUserData();
  },

  // 加载当前用户数据
  loadCurrentUserData() {
    const u = this.globalData.currentUser;
    if (!u) return;
    
    const prefix = 'hanzi_' + u + '_';
    try {
      const unlocked = wx.getStorageSync(prefix + 'unlocked');
      if (unlocked) {
        this.globalData.currentUserData = {
          unlocked: JSON.parse(unlocked),
          learned: JSON.parse(wx.getStorageSync(prefix + 'learned') || '["一"]'),
          stars: parseInt(wx.getStorageSync(prefix + 'stars') || '0'),
          lastNode: wx.getStorageSync(prefix + 'lastNode') || '一',
          recent: JSON.parse(wx.getStorageSync(prefix + 'recent') || '[]'),
          mistakes: JSON.parse(wx.getStorageSync(prefix + 'mistakes') || '[]'),
          avatar: wx.getStorageSync(prefix + 'avatar') || '👤',
          nickname: wx.getStorageSync(prefix + 'nickname') || '',
          dailyTarget: parseInt(wx.getStorageSync(prefix + 'dailyTarget') || '3'),
          lastActiveDate: wx.getStorageSync(prefix + 'lastActiveDate') || '',
          streakDays: parseInt(wx.getStorageSync(prefix + 'streakDays') || '0'),
          todayCount: parseInt(wx.getStorageSync(prefix + 'todayCount') || '0'),
          history: JSON.parse(wx.getStorageSync(prefix + 'history') || '{}'),
          petLevel: parseInt(wx.getStorageSync(prefix + 'petLevel') || '1'),
          petExp: parseInt(wx.getStorageSync(prefix + 'petExp') || '0'),
          petMessage: wx.getStorageSync(prefix + 'petMessage') || ''
        };
      }
    } catch (e) {
      console.error('加载用户数据失败:', e);
    }
  },

  // 保存当前用户数据
  saveCurrentUserData() {
    const u = this.globalData.currentUser;
    if (!u) return;
    const d = this.globalData.currentUserData;
    const prefix = 'hanzi_' + u + '_';
    try {
      wx.setStorageSync(prefix + 'unlocked', JSON.stringify(d.unlocked));
      wx.setStorageSync(prefix + 'learned', JSON.stringify(d.learned));
      wx.setStorageSync(prefix + 'stars', String(d.stars));
      wx.setStorageSync(prefix + 'lastNode', d.lastNode);
      wx.setStorageSync(prefix + 'recent', JSON.stringify(d.recent));
      wx.setStorageSync(prefix + 'mistakes', JSON.stringify(d.mistakes));
      wx.setStorageSync(prefix + 'avatar', d.avatar);
      wx.setStorageSync(prefix + 'nickname', d.nickname);
      wx.setStorageSync(prefix + 'dailyTarget', String(d.dailyTarget));
      wx.setStorageSync(prefix + 'lastActiveDate', d.lastActiveDate);
      wx.setStorageSync(prefix + 'streakDays', String(d.streakDays));
      wx.setStorageSync(prefix + 'todayCount', String(d.todayCount));
      wx.setStorageSync(prefix + 'history', JSON.stringify(d.history));
      wx.setStorageSync(prefix + 'petLevel', String(d.petLevel));
      wx.setStorageSync(prefix + 'petExp', String(d.petExp));
      wx.setStorageSync(prefix + 'petMessage', d.petMessage);
    } catch (e) {
      console.error('保存用户数据失败:', e);
    }
  }
});
