/**
 * game-engine.js — 汉字冒险岛 游戏引擎核心 v0.1
 * 纯Canvas 2D，零外部依赖
 */

// ======================== 常量 ========================
const G = {
  GRAVITY: 0.6,
  JUMP_FORCE: -12,
  MOVE_SPEED: 4,
  MAX_FALL_SPEED: 12,
  TILE: 48,              // 砖头标准尺寸
  PARTICLE_MAX: 50,      // 最大粒子数
  CAMERA_SMOOTH: 0.1,  // 摄像机平滑跟随系数
};

// ======================== 工具函数 ========================

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }

// 碰撞检测 AABB
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// 圆形碰撞（粒子用）
function circoll(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy < (a.r + b.r) * (a.r + b.r);
}

// ======================== 粒子系统 ========================

class Particle {
  constructor(x, y, color, vx, vy, life, size) {
    this.x = x; this.y = y;
    this.color = color;
    this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.size = size || 4;
  }
  update(dt) {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.15; // 微重力
    this.life -= dt;
  }
  render(ctx, cam) {
    const alpha = clamp(this.life / this.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x - cam.x, this.y - cam.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  get dead() { return this.life <= 0; }
}

class ParticleSystem {
  constructor() { this.particles = []; }

  emit(x, y, count, colors, speedMin, speedMax) {
    for (let i = 0; i < count && this.particles.length < G.PARTICLE_MAX; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(speedMin || 1, speedMax || 4);
      const color = colors[randInt(0, colors.length - 1)];
      this.particles.push(new Particle(
        x, y, color,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 2,
        rand(0.4, 0.8),
        rand(3, 6)
      ));
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].dead) this.particles.splice(i, 1);
    }
  }

  render(ctx, cam) {
    this.particles.forEach(p => p.render(ctx, cam));
  }
}

// ======================== 摄像机 ========================

class Camera {
  constructor(w, h) {
    this.x = 0; this.y = 0;
    this.tx = 0; this.ty = 0;
    this.w = w; this.h = h;
  }
  follow(target) {
    this.tx = target.x - this.w * 0.35;
    this.ty = 0;
  }
  update() {
    this.x = lerp(this.x, this.tx, G.CAMERA_SMOOTH);
    this.y = lerp(this.y, this.ty, G.CAMERA_SMOOTH);
    this.x = Math.max(0, this.x);
  }
  screenX(worldX) { return worldX - this.x; }
  screenY(worldY) { return worldY - this.y; }
  visible(l, t, r, b) {
    return l < this.x + this.w && r > this.x && t < this.y + this.h && b > this.y;
  }
}

// ======================== 物理实体基类 ========================

class Entity {
  constructor(x, y, w, h) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.alive = true;
    this.facing = 1;
  }
  update(dt) {}
  render(ctx, cam) {}
  get left() { return this.x; }
  get right() { return this.x + this.w; }
  get top() { return this.y; }
  get bottom() { return this.y + this.h; }
  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }
}

// ======================== 角色 ========================

class Player extends Entity {
  constructor(x, y) {
    super(x, y, 32, 32);
    this.jumpSquash = 0;
    this.animTimer = 0;
    this.walkFrame = 0;
    this.hearts = 3;
    this.invincible = 0; // 无敌时间（被碰后）
    this.score = 0;
    this.groundedTimer = 0;
  }

  handleInput(keys, dt) {
    // 水平移动
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
      this.vx = -G.MOVE_SPEED;
      this.facing = -1;
    } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
      this.vx = G.MOVE_SPEED;
      this.facing = 1;
    } else {
      this.vx *= 0.75; // 摩擦力
    }

    // 跳跃
    if ((keys['ArrowUp'] || keys['w'] || keys['W'] || keys[' ']) && this.onGround) {
      this.vy = G.JUMP_FORCE;
      this.onGround = false;
      this.jumpSquash = -0.4;
      // 播跳跃音效（如果有的话）
      if (window.gameAudio) window.gameAudio.play('jump');
    }
  }

  update(dt, level) {
    // 无敌时间
    if (this.invincible > 0) this.invincible -= dt;

    // 重力
    this.vy += G.GRAVITY;
    if (this.vy > G.MAX_FALL_SPEED) this.vy = G.MAX_FALL_SPEED;

    // 移动
    this.x += this.vx;
    this.y += this.vy;

    // 与地面/砖头碰撞
    this.onGround = false;
    this.resolveCollisions(level);

    // 跳跃拉伸恢复
    this.jumpSquash *= 0.85;

    // 动画计时
    this.animTimer += dt;
    if (Math.abs(this.vx) > 0.5 && this.onGround) {
      if (this.animTimer > 0.15) {
        this.animTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % 4;
      }
    }

    // 掉出地图
    if (this.y > level.height + 100) {
      this.die(level);
    }
  }

  resolveCollisions(level) {
    // 与砖头碰撞
    for (const brick of level.bricks) {
      if (!brick.solid) continue;
      if (aabb(this, brick)) {
        this.resolveBrickCollision(brick);
      }
    }

    // 与平台碰撞（只从上方）
    for (const plat of level.platforms) {
      if (this.vy >= 0 &&
          this.bottom - this.vy <= plat.y &&
          this.bottom >= plat.y &&
          this.right > plat.x && this.left < plat.x + plat.w) {
        this.y = plat.y - this.h;
        this.vy = 0;
        this.onGround = true;
        this.groundedTimer = 0.1;
      }
    }
  }

  resolveBrickCollision(brick) {
    const overlapLeft = this.right - brick.x;
    const overlapRight = brick.right - this.left;
    const overlapTop = this.bottom - brick.y;
    const overlapBottom = brick.bottom - this.top;

    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapTop && this.vy >= 0) {
      // 从上方碰撞 → 站上去
      this.y = brick.y - this.h;
      this.vy = 0;
      this.onGround = true;
      this.groundedTimer = 0.1;

      // 如果砖头是问号块，触发答题
      if (brick.type === 'question' && !brick.hit) {
        brick.hit = true;
        level.game.onBrickHit(brick);
      }
    } else if (minOverlap === overlapBottom && this.vy <= 0) {
      // 从下方顶砖头
      this.y = brick.bottom;
      this.vy = 2; // 轻微反弹
      this.jumpSquash = 0.3;

      if (brick.type === 'question' || brick.type === 'clue') {
        level.game.onBrickHitFromBelow(brick);
      }
    } else if (minOverlap === overlapLeft) {
      this.x = brick.x - this.w;
      this.vx = 0;
    } else if (minOverlap === overlapRight) {
      this.x = brick.right;
      this.vx = 0;
    }
  }

  die(level) {
    this.hearts--;
    if (this.hearts <= 0) {
      level.game.onGameOver();
    } else {
      // 从检查点重生
      const cp = level.getLastCheckpoint();
      this.x = cp.x;
      this.y = cp.y;
      this.vx = 0;
      this.vy = 0;
      this.invincible = 2; // 2秒无敌
    }
  }

  render(ctx, cam) {
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;

    // 无敌闪烁
    if (this.invincible > 0 && Math.floor(this.invincible * 10) % 2 === 0) return;

    ctx.save();
    ctx.translate(sx + this.w / 2, sy + this.h / 2);
    ctx.scale(this.facing * (1 + this.jumpSquash * 0.2), 1 - this.jumpSquash * 0.2);

    // 身体
    const bodyGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, this.w * 0.6);
    bodyGrad.addColorStop(0, '#FFD93D');
    bodyGrad.addColorStop(1, '#FF6B35');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.w * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-6, -4, 8, 0, Math.PI * 2);
    ctx.arc(6, -4, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    const lookX = this.facing * 2;
    ctx.beginPath();
    ctx.arc(-4 + lookX, -4, 4, 0, Math.PI * 2);
    ctx.arc(8 + lookX, -4, 4, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-2 + lookX, -6, 2, 0, Math.PI * 2);
    ctx.arc(10 + lookX, -6, 2, 0, Math.PI * 2);
    ctx.fill();

    // 嘴巴
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    if (this.onGround && Math.abs(this.vx) < 0.5) {
      // 待机微笑
      ctx.beginPath();
      ctx.arc(0, 2, 6, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else if (!this.onGround) {
      // 跳跃张嘴
      ctx.beginPath();
      ctx.arc(0, 4, 5, 0, Math.PI);
      ctx.stroke();
    } else {
      // 走路
      ctx.beginPath();
      ctx.arc(0, 2, 6, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }

    ctx.restore();

    // 生命值显示
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    for (let i = 0; i < this.hearts; i++) {
      ctx.fillText('❤️', sx - cam.x + 10 + i * 20, sy - cam.y - 10);
    }
  }
}

// ======================== 砖头 ========================

class Brick extends Entity {
  constructor(x, y, type, char, data) {
    super(x, y, G.TILE, G.TILE);
    this.type = type;       // 'normal'|'question'|'clue'|'platform'
    this.char = char || '';
    this.data = data || {};  // 附加数据（如目标字ID）
    this.solid = type !== 'platform';
    this.hit = false;        // 是否被顶过
    this.animTimer = 0;
    this.floatY = 0;
    this.glowPhase = Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.animTimer += dt;
    if (this.type === 'question' && !this.hit) {
      this.floatY = Math.sin(this.animTimer * 3 + this.glowPhase) * 3;
    }
  }

  render(ctx, cam) {
    if (!cam.visible(this.x, this.y, this.x + this.w, this.y + this.h)) return;

    const sx = this.x - cam.x;
    const sy = this.y - cam.y + this.floatY;

    ctx.save();

    if (this.type === 'normal') {
      // 已学字砖头
      const grad = ctx.createLinearGradient(sx, sy, sx, sy + this.h);
      grad.addColorStop(0, '#FFF9E6');
      grad.addColorStop(1, '#FFE4B5');
      ctx.fillStyle = grad;
      this.roundRect(ctx, sx, sy, this.w, this.h, 12);
      ctx.fill();
      ctx.strokeStyle = '#DEB887';
      ctx.lineWidth = 2;
      this.roundRect(ctx, sx, sy, this.w, this.h, 12);
      ctx.stroke();

      if (this.char) {
        ctx.fillStyle = '#8B4513';
        ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.char, sx + this.w / 2, sy + this.h / 2);
      }
    } 
    else if (this.type === 'question' && !this.hit) {
      // 问号砖头 — 发光
      const glow = ctx.createRadialGradient(sx + this.w / 2, sy + this.h / 2, 4, sx + this.w / 2, sy + this.h / 2, this.w);
      glow.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
      glow.addColorStop(1, 'rgba(255, 165, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(sx - 8, sy - 8, this.w + 16, this.h + 16);

      const grad = ctx.createRadialGradient(sx + this.w / 2, sy + this.h / 2, 4, sx + this.w / 2, sy + this.h / 2, this.w * 0.7);
      grad.addColorStop(0, '#FFD700');
      grad.addColorStop(1, '#FF8C00');
      ctx.fillStyle = grad;
      this.roundRect(ctx, sx, sy, this.w, this.h, 12);
      ctx.fill();
      ctx.strokeStyle = '#FFA500';
      ctx.lineWidth = 3;
      this.roundRect(ctx, sx, sy, this.w, this.h, 12);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❓', sx + this.w / 2, sy + this.h / 2);
    } 
    else if (this.type === 'question' && this.hit) {
      // 已顶过的问号砖头 → 变成普通砖头（显示答案字）
      const grad = ctx.createLinearGradient(sx, sy, sx, sy + this.h);
      grad.addColorStop(0, '#FFF9E6');
      grad.addColorStop(1, '#FFE4B5');
      ctx.fillStyle = grad;
      this.roundRect(ctx, sx, sy, this.w, this.h, 12);
      ctx.fill();
      ctx.strokeStyle = '#DEB887';
      ctx.lineWidth = 2;
      this.roundRect(ctx, sx, sy, this.w, this.h, 12);
      ctx.stroke();

      if (this.data.answer) {
        ctx.fillStyle = '#228B22';
        ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.data.answer, sx + this.w / 2, sy + this.h / 2);
      }
    } 
    else if (this.type === 'clue') {
      // 线索砖头 — 冰蓝色摇摆
      ctx.translate(sx + this.w / 2, sy + this.h / 2);
      ctx.rotate(Math.sin(this.animTimer * 2) * 0.05);

      const grad = ctx.createLinearGradient(-this.w / 2, -this.h / 2, -this.w / 2, this.h / 2);
      grad.addColorStop(0, '#E0F7FA');
      grad.addColorStop(1, '#B2EBF2');
      ctx.fillStyle = grad;
      this.roundRect(ctx, -this.w / 2, -this.h / 2, this.w, this.h, 12);
      ctx.fill();
      ctx.strokeStyle = '#4DD0E1';
      ctx.lineWidth = 2;
      this.roundRect(ctx, -this.w / 2, -this.h / 2, this.w, this.h, 12);
      ctx.stroke();

      ctx.fillStyle = '#00796B';
      ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.char || '', 0, 0);
    } 
    else if (this.type === 'platform') {
      // 平台
      ctx.fillStyle = '#A0522D';
      this.roundRect(ctx, sx, sy, this.w, 16, 6);
      ctx.fill();
    }

    ctx.restore();
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  onHitFromBelow(player, level) {
    if (this.type === 'question' && !this.hit) {
      this.hit = true;
      level.game.onQuizTrigger(this);
    }
  }
}

// ======================== 敌人 ========================

class Enemy extends Entity {
  constructor(x, y, type, char) {
    super(x, y, 28, 28);
    this.type = type;
    this.char = char || '';
    this.vx = -1.5;
    this.alive = true;
  }

  update(dt, level) {
    if (!this.alive) return;

    this.x += this.vx;
    this.vy += G.GRAVITY;
    this.y += this.vy;

    // 与地面碰撞
    if (this.y + this.h >= level.groundY) {
      this.y = level.groundY - this.h;
      this.vy = 0;
    }

    // 碰到砖头边缘转弯
    let onEdge = true;
    for (const brick of level.bricks) {
      if (aabb({ x: this.x, y: this.y + this.h + 1, w: this.w, h: 1 }, brick)) {
        onEdge = false;
        break;
      }
    }
    if (onEdge && this.vy === 0) {
      this.vx = -this.vx;
      this.facing = -this.facing;
    }
  }

  render(ctx, cam) {
    if (!this.alive) return;
    if (!cam.visible(this.x, this.y, this.x + this.w, this.y + this.h)) return;

    const sx = this.x - cam.x;
    const sy = this.y - cam.y;

    // 身体
    ctx.fillStyle = '#FF4444';
    ctx.beginPath();
    ctx.arc(sx + this.w / 2, sy + this.h / 2, this.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#AA0000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 叉叉眼
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    // 左眼
    ctx.beginPath();
    ctx.moveTo(sx + 8, sy + 10);
    ctx.lineTo(sx + 14, sy + 16);
    ctx.moveTo(sx + 14, sy + 10);
    ctx.lineTo(sx + 8, sy + 16);
    ctx.stroke();
    // 右眼
    ctx.beginPath();
    ctx.moveTo(sx + this.w - 8, sy + 10);
    ctx.lineTo(sx + this.w - 14, sy + 16);
    ctx.moveTo(sx + this.w - 14, sy + 10);
    ctx.lineTo(sx + this.w - 8, sy + 16);
    ctx.stroke();

    // 显示错字
    if (this.char) {
      ctx.fillStyle = '#fff';
      ctx.font = '10px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.char, sx + this.w / 2, sy + this.h + 14);
    }
  }

  onPlayerHit(player, level) {
    // 玩家从上方踩到
    if (player.vy > 0 && player.bottom < this.y + this.h * 0.4) {
      this.alive = false;
      player.vy = G.JUMP_FORCE * 0.6;
      level.particles.emit(this.centerX, this.centerY, 8, ['#FFD700', '#FFA500'], 2, 5);
      return 'stomped';
    } 
    // 玩家碰到侧面/下方
    else if (player.invincible <= 0) {
      player.die(level);
      return 'hurt';
    }
    return 'none';
  }
}

// ======================== 关卡 ========================

class Level {
  constructor(game) {
    this.game = game;
    this.bricks = [];
    this.platforms = [];
    this.enemies = [];
    this.checkpoints = [];
    this.width = 4000;
    this.height = 600;
    this.groundY = 500;
    this.particles = new ParticleSystem();
    this.targetChars = [];  // 本关需要收集的字
    this.collectedChars = new Set();
  }

  generate(levelNum, unlockedSet) {
    // 根据关卡号和已解锁集合，生成关卡
    // 这里先手动设计第一关作为原型
    this.bricks = [];
    this.platforms = [];
    this.enemies = [];
    this.targetChars = [];
    this.collectedChars.clear();

    // 地面砖头（已学过的字）
    const groundChars = ['一', '二', '三', '人', '大', '日', '月'];
    let gx = 0;
    for (const ch of groundChars) {
      this.bricks.push(new Brick(gx, this.groundY - G.TILE, 'normal', ch));
      gx += G.TILE + 4;
    }

    // 间隙
    gx += 80;

    // 平台
    this.platforms.push({ x: gx, y: this.groundY - 80, w: G.TILE * 2, h: 16 });
    this.platforms.push({ x: gx + G.TILE * 3, y: this.groundY - 80, w: G.TILE * 2, h: 16 });

    // 线索砖头
    this.bricks.push(new Brick(gx - G.TILE, this.groundY - G.TILE, 'clue', '日'));
    this.bricks.push(new Brick(gx, this.groundY - G.TILE, 'clue', '+'));
    this.bricks.push(new Brick(gx + G.TILE, this.groundY - G.TILE, 'clue', '月'));

    // 问号砖头（目标字：明）
    const qBrick = new Brick(gx + G.TILE * 2, this.groundY - G.TILE * 2, 'question', '?', { answer: '明', targetId: '明' });
    this.bricks.push(qBrick);
    this.targetChars.push('明');

    // 更多地面
    gx += G.TILE * 4;
    for (let i = 0; i < 8; i++) {
      this.bricks.push(new Brick(gx, this.groundY - G.TILE, 'normal', ''));
      gx += G.TILE + 4;
    }

    // 敌人
    this.enemies.push(new Enemy(gx - 200, this.groundY - 28, 'wrongchar', '目'));

    // 检查点
    this.checkpoints = [{ x: 100, y: this.groundY - 32 }];

    // 终点门
    this.exitDoor = { x: gx + 100, y: this.groundY - 80, w: 48, h: 80 };

    this.width = gx + 300;
  }

  update(dt) {
    // 更新砖头
    for (const brick of this.bricks) brick.update(dt);

    // 更新敌人
    for (const enemy of this.enemies) {
      enemy.update(dt, this);
      // 碰撞检测
      if (enemy.alive && aabb(player, enemy)) {
        enemy.onPlayerHit(player, this);
      }
    }

    // 更新粒子
    this.particles.update(dt);

    // 检查是否到达终点
    if (player.alive && aabb(player, this.exitDoor)) {
      this.game.onLevelComplete();
    }
  }

  render(ctx, cam) {
    // 背景
    this.renderBackground(ctx, cam);

    // 砖头
    for (const brick of this.bricks) brick.render(ctx, cam);

    // 平台
    ctx.fillStyle = '#A0522D';
    for (const plat of this.platforms) {
      if (cam.visible(plat.x, plat.y, plat.x + plat.w, plat.y + plat.h)) {
        const sx = plat.x - cam.x;
        const sy = plat.y - cam.y;
        ctx.beginPath();
        ctx.moveTo(sx + 6, sy);
        ctx.lineTo(sx + plat.w - 6, sy);
        ctx.quadraticCurveTo(sx + plat.w, sy, sx + plat.w, sy + 6);
        ctx.lineTo(sx + plat.w, sy + plat.h);
        ctx.lineTo(sx, sy + plat.h);
        ctx.lineTo(sx, sy + 6);
        ctx.quadraticCurveTo(sx, sy, sx + 6, sy);
        ctx.fill();
      }
    }

    // 敌人
    for (const enemy of this.enemies) enemy.render(ctx, cam);

    // 终点门
    if (this.exitDoor) {
      const sx = this.exitDoor.x - cam.x;
      const sy = this.exitDoor.y - cam.y;
      ctx.fillStyle = '#228B22';
      ctx.fillRect(sx, sy, this.exitDoor.w, this.exitDoor.h);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, this.exitDoor.w, this.exitDoor.h);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🚪', sx + this.exitDoor.w / 2, sy + this.exitDoor.h / 2 + 5);
    }

    // 粒子
    this.particles.render(ctx, cam);
  }

  renderBackground(ctx, cam) {
    // 天空
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(1, '#E0F7FA');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 云朵（视差）
    const cloudOffset = cam.x * 0.2;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    this.drawCloud(ctx, 200 - cloudOffset, 80, 60);
    this.drawCloud(ctx, 500 - cloudOffset, 120, 40);
    this.drawCloud(ctx, 800 - cloudOffset * 0.5, 60, 50);

    // 远山
    const mtnOffset = cam.x * 0.5;
    ctx.fillStyle = 'rgba(100, 150, 100, 0.3)';
    this.drawMountain(ctx, 100 - mtnOffset, 350, 300, 150);
    this.drawMountain(ctx, 400 - mtnOffset, 370, 250, 130);

    // 地面
    const groundGrad = ctx.createLinearGradient(0, this.groundY, 0, this.groundY + 100);
    groundGrad.addColorStop(0, '#8B7355');
    groundGrad.addColorStop(1, '#A0522D');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, this.groundY, this.width, 100);

    // 草地
    ctx.fillStyle = '#7CFC00';
    ctx.fillRect(0, this.groundY, this.width, 8);
  }

  drawCloud(ctx, x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.3, y, size * 0.6, 0, Math.PI * 2);
    ctx.arc(x + size * 0.7, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawMountain(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w * 0.3, y);
    ctx.lineTo(x + w * 0.7, y + h * 0.3);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
  }

  getLastCheckpoint() {
    // 简化：返回第一个检查点
    return this.checkpoints[0] || { x: 100, y: this.groundY - 32 };
  }

  collectChar(charId) {
    this.collectedChars.add(charId);
    // 检查是否收集完本关所有目标字
    const allCollected = this.targetChars.every(c => this.collectedChars.has(c));
    if (allCollected) {
      // 可以通往终点门
    }
  }
}

// ======================== 导出 ========================
// 在浏览器中作为全局变量
window.G = G;
window.Entity = Entity;
window.Player = Player;
window.Brick = Brick;
window.Enemy = Enemy;
window.Level = Level;
window.Camera = Camera;
window.ParticleSystem = ParticleSystem;
window.aabb = aabb;
