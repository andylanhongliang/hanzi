// 猜字游戏页
const graph = require('../../utils/graph');
const audio = require('../../utils/audio');
const storage = require('../../utils/storage');

Page({
  data: {
    targetNodeId: '',
    targetChar: '',
    correctAnswer: '',
    // 提示
    currentHint: '',
    hints: [],
    hintIndex: 0,
    showMoreHints: false,
    extraHint: '',
    // 候选
    candidates: [],
    // 输入
    inputValue: '',
    selectedAnswer: '',
    // 状态
    attempts: 3,
    showResult: false,
    isCorrect: false,
    wrongAnswer: '',
    // 外观
    eyeProtect: false
  },

  onLoad(options) {
    const nodeId = options.nodeId || '';
    if (!nodeId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const nodeMap = graph.getNodeMap();
    const node = nodeMap.get(nodeId);
    if (!node) {
      wx.showToast({ title: '找不到这个字', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const hints = (node.hints || '').split('|').filter(h => h);
    const userData = storage.getUserData();
    const unlocked = userData.unlocked || [];
    const candidates = graph.generateCandidates(nodeId, unlocked);

    this.setData({
      targetNodeId: nodeId,
      targetChar: node.name,
      correctAnswer: node.name,
      currentHint: hints.length > 0 ? '📖 ' + hints[0] : '猜猜这是什么字？',
      hints: hints,
      hintIndex: 0,
      candidates: candidates,
      eyeProtect: storage.getEyeProtect()
    });
  },

  // 选择候选
  selectCandidate(e) {
    if (this.data.showResult) return;
    const char = e.currentTarget.dataset.char;
    this.setData({
      selectedAnswer: char,
      inputValue: char
    });
  },

  // 手写输入
  onInput(e) {
    this.setData({
      inputValue: e.detail.value,
      selectedAnswer: e.detail.value
    });
  },

  // 提交答案
  submitGuess() {
    if (this.data.showResult) return;
    
    const answer = this.data.inputValue.trim();
    if (!answer) {
      wx.showToast({ title: '请选择一个答案', icon: 'none' });
      return;
    }

    const correct = this.data.correctAnswer;
    const isCorrect = answer === correct;

    if (isCorrect) {
      // 答对了
      audio.playCorrect();
      
      // 解锁这个字
      const userData = storage.getUserData();
      const unlocked = userData.unlocked || [];
      if (!unlocked.includes(this.data.targetNodeId)) {
        unlocked.push(this.data.targetNodeId);
        storage.saveField('unlocked', unlocked);
        
        // 记录学习
        const learned = userData.learned || [];
        if (!learned.includes(this.data.targetNodeId)) {
          learned.push(this.data.targetNodeId);
          storage.saveField('learned', learned);
        }
        
        // 加星
        const stars = (userData.stars || 0) + 1;
        storage.saveField('stars', stars);
        
        // 更新最近
        const recent = userData.recent || [];
        recent.unshift(this.data.targetNodeId);
        if (recent.length > 20) recent.pop();
        storage.saveField('recent', recent);
        
        // 更新 lastNode
        storage.saveField('lastNode', this.data.targetNodeId);
        
        // 今日计数
        recordToday();
        
        // 保存
        storage.saveAll();
      }

      this.setData({
        showResult: true,
        isCorrect: true,
        wrongAnswer: ''
      });

      wx.showToast({ title: '🎉 答对了！', icon: 'none' });

    } else {
      // 答错了
      audio.playWrong();
      const newAttempts = this.data.attempts - 1;
      
      // 记录错字
      const userData = storage.getUserData();
      const mistakes = userData.mistakes || [];
      if (!mistakes.includes(this.data.targetNodeId)) {
        mistakes.push(this.data.targetNodeId);
        storage.saveField('mistakes', mistakes);
        storage.saveAll();
      }

      if (newAttempts <= 0) {
        // 机会用尽
        this.setData({
          showResult: true,
          isCorrect: false,
          attempts: 0,
          wrongAnswer: answer
        });
        wx.showToast({ title: '😅 答案是：' + correct, icon: 'none' });
      } else {
        this.setData({
          attempts: newAttempts,
          wrongAnswer: answer,
          selectedAnswer: '',
          inputValue: ''
        });
        // 短暂显示错误后清除
        setTimeout(() => {
          this.setData({ wrongAnswer: '' });
        }, 600);
      }
    }
  },

  // 更多提示
  moreHints() {
    const hints = this.data.hints;
    let idx = this.data.hintIndex + 1;
    if (idx >= hints.length) {
      // 显示额外提示
      const nodeMap = graph.getNodeMap();
      const node = nodeMap.get(this.data.targetNodeId);
      if (node) {
        this.setData({
          showMoreHints: true,
          extraHint: '这个字读 "' + (node.pinyin || '?') + '" / 常用词：' + ((node.groupWords || '').split('|')[0] || '暂无')
        });
      }
      return;
    }
    this.setData({
      hintIndex: idx,
      currentHint: '📖 ' + hints[idx]
    });
  },

  // 继续探索
  goNext() {
    wx.navigateBack();
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});

// 记录今日学习
function recordToday() {
  const userData = storage.getUserData();
  const today = getTodayStr();
  const lastActiveDate = userData.lastActiveDate || '';
  
  if (lastActiveDate !== today) {
    // 新的一天
    userData.todayCount = 1;
    userData.lastActiveDate = today;
    // 连续天数
    const yesterday = getYesterdayStr();
    if (lastActiveDate === yesterday) {
      userData.streakDays = (userData.streakDays || 0) + 1;
    } else {
      userData.streakDays = 1;
    }
  } else {
    userData.todayCount = (userData.todayCount || 0) + 1;
  }
  
  storage.saveField('todayCount', userData.todayCount);
  storage.saveField('lastActiveDate', userData.lastActiveDate);
  storage.saveField('streakDays', userData.streakDays);
}

function getTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}
