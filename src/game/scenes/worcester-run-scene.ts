import * as Phaser from 'phaser';
import { bridge, EVENTS } from '../event-bridge';

const GROUND_Y_RATIO = 0.78;
const GRAVITY = 1200;
const JUMP_VEL = -480;
const SCROLL_SPEED = 220;
const OBSTACLE_GAP_MIN = 180;
const OBSTACLE_GAP_MAX = 320;
const WIN_SCORE = 10;

export class WorcesterRunScene extends Phaser.Scene {
  private runner!: Phaser.GameObjects.Rectangle;
  private ground!: Phaser.GameObjects.Rectangle;
  private obstacles: Phaser.GameObjects.Rectangle[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;

  private velocityY = 0;
  private grounded = true;
  private score = 0;
  private alive = true;
  private nextObstacleX = 0;
  private groundY = 0;
  private distanceTraveled = 0;
  private lastScoreDistance = 0;

  constructor() { super({ key: 'WorcesterRun' }); }

  create() {
    const cam = this.cameras.main;
    const w = cam.width;
    const h = cam.height;
    this.groundY = h * GROUND_Y_RATIO;

    // Sky
    this.cameras.main.setBackgroundColor('#0a0a2a');

    // Ground
    this.ground = this.add.rectangle(w / 2, this.groundY + 30, w, 60, 0x333344);

    // Stars
    for (let i = 0; i < 40; i++) {
      this.add.circle(
        Phaser.Math.Between(0, w), Phaser.Math.Between(0, this.groundY - 20),
        Phaser.Math.Between(1, 2), 0xffffff, 0.6,
      );
    }

    // Buildings silhouette
    for (let i = 0; i < 8; i++) {
      const bw = Phaser.Math.Between(50, 100);
      const bh = Phaser.Math.Between(60, 160);
      this.add.rectangle(
        i * (w / 8) + 30, this.groundY - bh / 2, bw, bh, 0x1a1a3a,
      );
    }

    // Runner
    this.runner = this.add.rectangle(100, this.groundY - 20, 24, 40, 0x66aaff);

    this.scoreText = this.add.text(w / 2, 20, 'Score: 0', {
      fontSize: '20px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    this.helpText = this.add.text(w / 2, h - 20, 'Space / Up to jump · Reach 10 to win!', {
      fontSize: '12px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5, 1);

    this.reset();

    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'ArrowUp') && this.grounded && this.alive) {
        this.velocityY = JUMP_VEL;
        this.grounded = false;
      }
    });

    // Also allow clicking/tapping to jump
    this.input.on('pointerdown', () => {
      if (this.grounded && this.alive) {
        this.velocityY = JUMP_VEL;
        this.grounded = false;
      }
    });

    bridge.emit(EVENTS.SCENE_READY, 'WorcesterRun');
  }

  private reset() {
    this.score = 0;
    this.alive = true;
    this.velocityY = 0;
    this.grounded = true;
    this.distanceTraveled = 0;
    this.lastScoreDistance = 0;
    this.nextObstacleX = this.cameras.main.width + 200;
    for (const o of this.obstacles) o.destroy();
    this.obstacles = [];
    this.runner.setPosition(100, this.groundY - 20);
    this.updateScore();
  }

  update(_: number, delta: number) {
    if (!this.alive) return;
    const dt = delta / 1000;

    // Gravity + jump
    this.velocityY += GRAVITY * dt;
    this.runner.y += this.velocityY * dt;

    if (this.runner.y >= this.groundY - 20) {
      this.runner.y = this.groundY - 20;
      this.velocityY = 0;
      this.grounded = true;
    }

    // Score by distance
    this.distanceTraveled += SCROLL_SPEED * dt;
    if (this.distanceTraveled - this.lastScoreDistance >= 200) {
      this.score++;
      this.lastScoreDistance = this.distanceTraveled;
      this.updateScore();
      if (this.score >= WIN_SCORE) { this.endGame(); return; }
    }

    // Spawn obstacles
    if (this.distanceTraveled >= this.nextObstacleX) {
      this.spawnObstacle();
      this.nextObstacleX = this.distanceTraveled +
        Phaser.Math.Between(OBSTACLE_GAP_MIN, OBSTACLE_GAP_MAX);
    }

    // Move obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.x -= SCROLL_SPEED * dt;
      if (o.x < -40) { o.destroy(); this.obstacles.splice(i, 1); continue; }
      if (this.checkCollision(this.runner, o)) {
        this.alive = false;
        this.endGame();
        return;
      }
    }
  }

  private spawnObstacle() {
    const h = Phaser.Math.Between(20, 50);
    const w = Phaser.Math.Between(16, 30);
    const o = this.add.rectangle(
      this.cameras.main.width + 20,
      this.groundY - h / 2,
      w, h, 0xcc4444,
    );
    this.obstacles.push(o);
  }

  private checkCollision(
    a: Phaser.GameObjects.Rectangle,
    b: Phaser.GameObjects.Rectangle,
  ): boolean {
    const ab = a.getBounds();
    const bb = b.getBounds();
    // Shrink hitbox slightly for fairness
    ab.x += 4; ab.y += 4; ab.width -= 8; ab.height -= 8;
    return Phaser.Geom.Rectangle.Overlaps(ab, bb);
  }

  private updateScore() {
    this.scoreText.setText(`Score: ${this.score}`);
  }

  private endGame() {
    const won = this.score >= WIN_SCORE;
    const msg = won ? 'Made it home safe!' : 'Tripped up! Try again?';
    const color = won ? '#88cc88' : '#cc6666';

    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      msg,
      { fontSize: '24px', color, fontFamily: 'monospace', backgroundColor: '#000000aa', padding: { x: 16, y: 8 } },
    ).setOrigin(0.5);

    this.time.delayedCall(1500, () => {
      bridge.emit(EVENTS.CHALLENGE_COMPLETE, { challengeId: 'worcester_run', won });
    });
  }
}
