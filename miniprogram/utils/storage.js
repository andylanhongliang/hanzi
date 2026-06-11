// 存储工具 — localStorage → wx.storage 封装

const app = getApp();

function getPrefix() {
  const user = app.globalData.currentUser || 'default';
  return 'hanzi_' + user + '_';
}

module.exports = {
  // 获取当前用户数据
  getUserData() {
    return app.globalData.currentUserData;
  },

  // 保存指定字段（同时更新 globalData 和 wx.storage）
  saveField(field, value) {
    const d = app.globalData.currentUserData;
    d[field] = value;
    const key = getPrefix() + field;
    wx.setStorageSync(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  },

  // 读取指定字段
  getField(field) {
    return app.globalData.currentUserData[field];
  },

  // 保存全部用户数据
  saveAll() {
    app.saveCurrentUserData();
  },

  // 全局设置
  getSoundEnabled() {
    return app.globalData.soundEnabled;
  },

  setSoundEnabled(val) {
    app.globalData.soundEnabled = val;
    wx.setStorageSync('soundEnabled', String(val));
  },

  getEyeProtect() {
    return app.globalData.eyeProtect;
  },

  setEyeProtect(val) {
    app.globalData.eyeProtect = val;
    wx.setStorageSync('eyeProtect', String(val));
  },

  // 用户列表
  getUsers() {
    return app.globalData.users;
  },

  saveUsers(users) {
    app.globalData.users = users;
    wx.setStorageSync('hanzi_users', JSON.stringify(users));
  },

  getCurrentUser() {
    return app.globalData.currentUser;
  },

  setCurrentUser(name) {
    app.globalData.currentUser = name;
    wx.setStorageSync('hanzi_active_user', name);
  }
};
