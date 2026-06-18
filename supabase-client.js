// ==================== Supabase 配置 ====================
const SUPABASE_CONFIG = {
  url: 'https://kdvkcbmolmbmxbdmqjiz.supabase.co',
  key: 'sb_publishable_Bg1uisdjhp6HzHrGb3ZQ2g_0JhCleWc'
};

// ==================== Supabase 客户端 ====================
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
  }

  async request(method, path, data = null) {
    const headers = {
      'apikey': this.key,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    const options = {
      method: method,
      headers: headers
    };

    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`${this.url}${path}`, options);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '请求失败');
      }
      return await response.json();
    } catch (error) {
      console.error('Supabase 请求错误:', error);
      throw error;
    }
  }

  // ==================== 用户相关 ====================
  async getUser(username) {
    const result = await this.request('GET', `/rest/v1/users?username=eq.${username}&select=*`);
    return result.length > 0 ? result[0] : null;
  }

  async createUser(userData) {
    return await this.request('POST', '/rest/v1/users', userData);
  }

  async updateUser(userId, userData) {
    return await this.request('PATCH', `/rest/v1/users?id=eq.${userId}`, userData);
  }

  // ==================== 汉字解锁记录 ====================
  async getUnlockedChars(userId) {
    return await this.request('GET', `/rest/v1/unlocked_chars?user_id=eq.${userId}&select=*`);
  }

  async unlockChar(userId, charName) {
    return await this.request('POST', '/rest/v1/unlocked_chars', {
      user_id: userId,
      char_name: charName
    });
  }

  // ==================== 答题记录 ====================
  async addGuessRecord(userId, charName, isCorrect, attempts) {
    return await this.request('POST', '/rest/v1/guess_records', {
      user_id: userId,
      char_name: charName,
      is_correct: isCorrect,
      attempts: attempts
    });
  }

  async getGuessRecords(userId, limit = 50) {
    return await this.request('GET', `/rest/v1/guess_records?user_id=eq.${userId}&select=*&order=guessed_at.desc&limit=${limit}`);
  }

  // ==================== 每日签到 ====================
  async checkIn(userId, consecutiveDays) {
    const today = new Date().toISOString().split('T')[0];
    return await this.request('POST', '/rest/v1/daily_checkins', {
      user_id: userId,
      checkin_date: today,
      consecutive_days: consecutiveDays
    });
  }

  async getTodayCheckin(userId) {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.request('GET', `/rest/v1/daily_checkins?user_id=eq.${userId}&checkin_date=eq.${today}&select=*`);
    return result.length > 0 ? result[0] : null;
  }

  async getLastCheckin(userId) {
    const result = await this.request('GET', `/rest/v1/daily_checkins?user_id=eq.${userId}&select=*&order=checkin_date.desc&limit=1`);
    return result.length > 0 ? result[0] : null;
  }

  // ==================== 每日任务 ====================
  async getDailyTasks(userId) {
    const today = new Date().toISOString().split('T')[0];
    return await this.request('GET', `/rest/v1/daily_tasks?user_id=eq.${userId}&task_date=eq.${today}&select=*`);
  }

  async createDailyTask(userId, taskType, targetCount) {
    const today = new Date().toISOString().split('T')[0];
    return await this.request('POST', '/rest/v1/daily_tasks', {
      user_id: userId,
      task_type: taskType,
      target_count: targetCount,
      current_count: 0,
      is_completed: false,
      task_date: today
    });
  }

  async updateDailyTask(taskId, updates) {
    return await this.request('PATCH', `/rest/v1/daily_tasks?id=eq.${taskId}`, updates);
  }

  // ==================== 成就 ====================
  async getAchievements(userId) {
    return await this.request('GET', `/rest/v1/achievements?user_id=eq.${userId}&select=*`);
  }

  async unlockAchievement(userId, achievementType, achievementName, icon, description) {
    return await this.request('POST', '/rest/v1/achievements', {
      user_id: userId,
      achievement_type: achievementType,
      achievement_name: achievementName,
      icon: icon,
      description: description
    });
  }

  // ==================== 汉字接龙 ====================
  async createDragonGame(creatorId, words, currentWord, lastChar) {
    const gameCode = this.generateGameCode();
    return await this.request('POST', '/rest/v1/dragon_games', {
      game_code: gameCode,
      creator_id: creatorId,
      words: words,
      current_word: currentWord,
      last_char: lastChar,
      is_active: true
    });
  }

  async getDragonGame(gameCode) {
    const result = await this.request('GET', `/rest/v1/dragon_games?game_code=eq.${gameCode}&select=*`);
    return result.length > 0 ? result[0] : null;
  }

  async updateDragonGame(gameCode, updates) {
    return await this.request('PATCH', `/rest/v1/dragon_games?game_code=eq.${gameCode}`, updates);
  }

  generateGameCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

// ==================== 全局 Supabase 实例 ====================
const supabase = new SupabaseClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);