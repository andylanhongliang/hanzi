/**
 * game.js — 汉字冒险岛 游戏主逻辑 v0.1
 * 依赖：game-engine.js, data.js
 */

// ======================== 游戏主类 ========================

class HanziGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false; // 像素风

    this.state = 'menu'; // menu | playing | paused | quiz | levelcomplete | gameover
    this.keys = {};
    this.gameTime = 0;
    this.lastTime = 0;

    // 游戏对象
    this.camera = new Camera(canvas.width, canvas.height);
    this.level = null;
    this.player = null;
    this.levelNum = 1;

    // 答题相关
    this.currentQuizBrick = null;
    this.quizAttempts = 3;
    this.quizInput = '';

    // UI元素
    this.menuOverlay = document.getElementById('menuOverlay');
    this.quizOverlay = document.getElementById('quizOverlay');
    this.quizInputEl = document.getElementById('quizInput');
    this.quizHintEl = document.getElementById('quizHint');
    this.levelCompleteOverlay = document.getElementById('levelComplete');
    this.gameOverOverlay = document.getElementById('gameOver');

    this.bindEvents();
    this.showMenu();
  }

  // ==================== 初始化 ====================

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      if (e.key === 'Escape') {
        if (this.state === 'playing') this.pauseGame();
        else if (this.state === 'paused') this.resumeGame();
      }
      if (e.key === 'Enter') {
        if (this.state === 'quiz') this.submitQuiz();
      }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.key] = false; });

    // 答题提交
    document.getElementById('quizSubmit').addEventListener('click', () => this.submitQuiz());
    document.getElementById('quizSkip').addEventListener('click', () => this.skipQuiz());
    document.getElementById('quizClose').addEventListener('click', () => this.closeQuiz(false));

    // 过关后继续
    document.getElementById('nextLevel').addEventListener('click', () => this.nextLevel());
    document.getElementById('backToMenu').addEventListener('click', () => this.showMenu());

    // 游戏结束
    document.getElementById('retryLevel').addEventListener('click', () => this.retryLevel());
    document.getElementById('quitGame').addEventListener('click', () => this.showMenu());

    // 菜单开始
    document.getElementById('startGame').addEventListener('click', () => this.startGame());
    document.getElementById('backToMain').addEventListener('click', () => {
      // 返回主图谱
      if (window.opener) window.close();
      else window.location.href = 'index.html';
    });
  }

  showMenu() {
    this.state = 'menu';
    this.canvas.style.display = 'none';
    this.hideAllOverlays();
    this.menuOverlay.classList.remove('hidden');
  }

  startGame() {
    this.state = 'playing';
    this.canvas.style.display = 'block';
    this.hideAllOverlays();
    this.menuOverlay.classList.add('hidden');

    // 读取已解锁汉字
    const userData = JSON.parse(localStorage.getItem('hanzi_active_user_data')) || {};
    this.unlocked = new Set(userData.unlocked || []);

    // 创建玩家
    this.player = new Player(100, 400);

    // 生成第一关
    this.loadLevel(this.levelNum);
  }

  loadLevel(num) {
    this.level = new Level(this);
    this.level.generate(num, this.unlocked);
    this.camera = new Camera(this.canvas.width, this.canvas.height);
    this.camera.follow(this.player);
    this.player.x = 100;
    this.player.y = 400;
    this.player.vx = 0;
    this.player.vy = 0;
  }

  // ==================== 游戏循环 ====================

  startLoop() {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  loop(timestamp) {
    if (this.state === 'playing' || this.state === 'paused') {
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05); // 限制最大帧间隔
      this.lastTime = timestamp;
      this.gameTime += dt;

      if (this.state === 'playing') {
        this.update(dt);
      }
      this.render();
    }

    if (this.state !== 'quit') {
      requestAnimationFrame((t) => this.loop(t));
    }
  }

  update(dt) {
    // 更新玩家
    this.player.handleInput(this.keys, dt);
    this.player.update(dt, this.level);

    // 更新关卡
    this.level.update(dt);

    // 更新摄像机
    this.camera.follow(this.player);
    this.camera.update();
  }

  render() {
    const ctx = this.ctx;
    const cam = this.camera;

    // 清空
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 渲染关卡
    if (this.level) {
      this.level.render(ctx, cam);
    }

    // 渲染玩家
    if (this.player && this.player.alive) {
      this.player.render(ctx, cam);
    }

    // HUD
    this.renderHUD(ctx);
  }

  renderHUD(ctx) {
    // 分数
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(10, 10, 200, 60);
    ctx.fillStyle = '#FFD93D';
    ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🎮 关卡 ${this.levelNum}`, 20, 30);
    ctx.fillText(`⭐ 分数: ${this.player ? this.player.score : 0}`, 20, 50);

    // 目标字
    if (this.level && this.level.targetChars.length > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(this.canvas.width - 220, 10, 210, 40);
      ctx.fillStyle = '#87CEEB';
      ctx.font = '12px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'right';
      const collected = this.level.targetChars.filter(c => this.level.collectedChars.has(c)).length;
      ctx.fillText(`目标: ${collected}/${this.level.targetChars.length} 字`, this.canvas.width - 20, 35);
    }

    // 暂停提示
    if (this.state === 'paused') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⏸️ 暂停', this.canvas.width / 2, this.canvas.height / 2);
      ctx.font = '18px sans-serif';
      ctx.fillText('按 ESC 继续', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }
  }

  // ==================== 答题系统 ====================

  onBrickHit(brick) {
    // 从上方碰到问号砖头
    if (brick.type === 'question' && !brick.hit) {
      this.triggerQuiz(brick);
    }
  }

  onBrickHitFromBelow(brick) {
    // 从下方顶砖头
    if (brick.type === 'question' || brick.type === 'clue') {
      // 显示提示
      this.showHint(brick);
    }
  }

  triggerQuiz(brick) {
    this.state = 'quiz';
    this.currentQuizBrick = brick;
    this.quizAttempts = 3;
    this.quizInput = '';

    // 查找目标字的数据
    const targetId = brick.data.targetId;
    const nodeData = this.getNodeData(targetId);

    if (nodeData) {
      // 显示提示
      let hintText = `🔍 猜猜这是什么字？\n`;
      if (nodeData.hints) {
        const hints = nodeData.hints.split('|');
        hintText += `💡 提示: ${hints[0]}`;
      }
      if (nodeData.oracle) {
        hintText += `\n📖 ${nodeData.oracle}`;
      }
      this.quizHintEl.innerText = hintText;
    }

    this.quizOverlay.classList.remove('hidden');
    this.quizInputEl.value = '';
    this.quizInputEl.focus();

    // 暂停游戏物理（但渲染继续）
    this.pausePhysics = true;
  }

  submitQuiz() {
    const answer = this.quizInputEl.value.trim();
    if (!answer) return;

    const targetId = this.currentQuizBrick.data.targetId;
    const nodeData = this.getNodeData(targetId);

    // 判断答案（允许繁体/简体）
    const correct = this.checkAnswer(answer, targetId, nodeData);

    if (correct) {
      // 答对！
      this.onQuizCorrect(targetId, nodeData);
    } else {
      // 答错
      this.quizAttempts--;
      if (this.quizAttempts <= 0) {
        // 没机会了，显示答案
        this.quizHintEl.innerText += `\n\n😢 正确答案是: ${targetId}`;
        setTimeout(() => this.closeQuiz(false), 2000);
      } else {
        this.quizHintEl.innerText += `\n\n❌ 不对哦，还有 ${this.quizAttempts} 次机会`;
        this.quizInputEl.value = '';
        this.quizInputEl.focus();
      }
    }
  }

  checkAnswer(answer, targetId, nodeData) {
    // 检查多种可能答案
    const possible = [targetId];
    if (nodeData.nameTrad) possible.push(nodeData.nameTrad);
    if (nodeData.pinyin) possible.push(nodeData.pinyin);

    return possible.some(p => p === answer);
  }

  onQuizCorrect(charId, nodeData) {
    // 标记砖头为已回答
    this.currentQuizBrick.hit = true;
    this.currentQuizBrick.data.answer = charId;

    // 收集字
    this.level.collectChar(charId);
    this.player.score += 100;

    // 同步到主游戏
    this.unlockChar(charId);

    // 粒子特效
    this.level.particles.emit(
      this.player.centerX, this.player.centerY,
      12, ['#FFD700', '#FFA500', '#87CEEB'], 2, 5
    );

    // 显示答对动画
    this.quizHintEl.innerText = `✅ 答对了！\n你收集了「${charId}」${nodeData.pinyin ? ' (' + nodeData.pinyin + ')' : ''}`;
    
    setTimeout(() => {
      this.closeQuiz(true);
    }, 1500);
  }

  closeQuiz(success) {
    this.state = 'playing';
    this.quizOverlay.classList.add('hidden');
    this.pausePhysics = false;
    this.currentQuizBrick = null;
  }

  skipQuiz() {
    this.closeQuiz(false);
  }

  showHint(brick) {
    // 顶线索砖头时显示提示
    if (brick.char) {
      // 可以播放这个字的拼音读音
      if (window.gameAudio) {
        const nodeData = this.getNodeData(brick.char);
        if (nodeData && nodeData.pinyin) {
          window.gameAudio.speak(nodeData.pinyin);
        }
      }
    }
  }

  // ==================== 关卡事件 ====================

  onLevelComplete() {
    this.state = 'levelcomplete';
    this.levelCompleteOverlay.classList.remove('hidden');
    document.getElementById('levelScore').innerText = this.player.score;
    document.getElementById('levelCollected').innerText = 
      `${this.level.collectedChars.size}/${this.level.targetChars.length}`;
  }

  nextLevel() {
    this.levelNum++;
    this.levelCompleteOverlay.classList.add('hidden');
    this.loadLevel(this.levelNum);
    this.state = 'playing';
  }

  retryLevel() {
    this.gameOverOverlay.classList.add('hidden');
    this.player = new Player(100, 400);
    this.loadLevel(this.levelNum);
    this.state = 'playing';
  }

  onGameOver() {
    this.state = 'gameover';
    this.gameOverOverlay.classList.remove('hidden');
    document.getElementById('finalScore').innerText = this.player.score;
  }

  // ==================== 数据操作 ====================

  getNodeData(charId) {
    if (!window.ALL_NODES) return null;
    return window.ALL_NODES.find(n => n.id === charId || n.name === charId);
  }

  unlockChar(charId) {
    // 同步到localStorage（主图谱）
    const userData = JSON.parse(localStorage.getItem('hanzi_active_user_data')) || {};
    if (!userData.unlocked) userData.unlocked = [];
    if (!userData.unlocked.includes(charId)) {
      userData.unlocked.push(charId);
      userData.learned = (userData.learned || 0) + 1;
      userData.todayCount = (userData.todayCount || 0) + 1;
      localStorage.setItem('hanzi_active_user_data', JSON.stringify(userData));

      // 更新内存中的已解锁集合
      this.unlocked.add(charId);

      // 宠物经验（如果主游戏已加载）
      if (window.addPetExp) window.addPetExp(5);
    }
  }

  // ==================== 工具 ====================

  hideAllOverlays() {
    document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
  }

  pauseGame() {
    if (this.state === 'playing') {
      this.state = 'paused';
    }
  }

  resumeGame() {
    if (this.state === 'paused') {
      this.state = 'playing';
      this.lastTime = performance.now();
    }
  }
}

// ======================== 启动 ========================

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('游戏Canvas未找到！');
    return;
  }

  // 调整Canvas大小
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  window.game = new HanziGame(canvas);
  window.game.startLoop();

  console.log('🎮 汉字冒险岛已启动！');
});
