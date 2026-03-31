import * as Phaser from 'phaser';
import { bridge, EVENTS } from '../event-bridge';

const TILE = 24;
const COLS = 20;
const ROWS = 15;
const TICK_MS = 150;
const WIN_SCORE = 10;

type Dir = { x: number; y: number };
const UP: Dir = { x: 0, y: -1 };
const DOWN: Dir = { x: 0, y: 1 };
const LEFT: Dir = { x: -1, y: 0 };
const RIGHT: Dir = { x: 1, y: 0 };

export class SnakeScene extends Phaser.Scene {
  private snake: { x: number; y: number }[] = [];
  private dir: Dir = RIGHT;
  private nextDir: Dir = RIGHT;
  private treat = { x: 0, y: 0 };
  private score = 0;
  private alive = true;
  private timer = 0;
  private gfx!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private offsetX = 0;
  private offsetY = 0;

  constructor() { super({ key: 'Snake' }); }

  create() {
    const cam = this.cameras.main;
    this.offsetX = Math.floor((cam.width - COLS * TILE) / 2);
    this.offsetY = Math.floor((cam.height - ROWS * TILE) / 2) + 20;

    this.gfx = this.add.graphics();
    this.scoreText = this.add.text(cam.width / 2, 16, 'Score: 0', {
      fontSize: '20px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    this.add.text(cam.width / 2, cam.height - 16, 'Arrow keys to move · Reach 10 to win!', {
      fontSize: '12px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5, 1);

    this.reset();

    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && this.dir !== DOWN) this.nextDir = UP;
      else if (e.key === 'ArrowDown' && this.dir !== UP) this.nextDir = DOWN;
      else if (e.key === 'ArrowLeft' && this.dir !== RIGHT) this.nextDir = LEFT;
      else if (e.key === 'ArrowRight' && this.dir !== LEFT) this.nextDir = RIGHT;
    });

    bridge.emit(EVENTS.SCENE_READY, 'Snake');
  }

  private reset() {
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    this.snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];
    this.dir = RIGHT;
    this.nextDir = RIGHT;
    this.score = 0;
    this.alive = true;
    this.timer = 0;
    this.spawnTreat();
    this.updateScore();
  }

  private spawnTreat() {
    const occupied = new Set(this.snake.map(s => `${s.x},${s.y}`));
    let x: number, y: number;
    do {
      x = Phaser.Math.Between(0, COLS - 1);
      y = Phaser.Math.Between(0, ROWS - 1);
    } while (occupied.has(`${x},${y}`));
    this.treat = { x, y };
  }

  update(_: number, delta: number) {
    if (!this.alive) return;

    this.timer += delta;
    if (this.timer < TICK_MS) { this.draw(); return; }
    this.timer -= TICK_MS;

    this.dir = this.nextDir;
    const head = this.snake[0];
    const nx = head.x + this.dir.x;
    const ny = head.y + this.dir.y;

    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS ||
        this.snake.some(s => s.x === nx && s.y === ny)) {
      this.alive = false;
      this.endGame();
      return;
    }

    this.snake.unshift({ x: nx, y: ny });

    if (nx === this.treat.x && ny === this.treat.y) {
      this.score++;
      this.updateScore();
      if (this.score >= WIN_SCORE) { this.endGame(); return; }
      this.spawnTreat();
    } else {
      this.snake.pop();
    }

    this.draw();
  }

  private draw() {
    this.gfx.clear();

    // Board background
    this.gfx.fillStyle(0x111122, 1);
    this.gfx.fillRect(this.offsetX, this.offsetY, COLS * TILE, ROWS * TILE);
    this.gfx.lineStyle(2, 0x333355, 1);
    this.gfx.strokeRect(this.offsetX, this.offsetY, COLS * TILE, ROWS * TILE);

    // Snake body (Mila — dark brown/black)
    for (let i = 0; i < this.snake.length; i++) {
      const s = this.snake[i];
      const isHead = i === 0;
      this.gfx.fillStyle(isHead ? 0x332211 : 0x221100, 1);
      this.gfx.fillRect(
        this.offsetX + s.x * TILE + 1,
        this.offsetY + s.y * TILE + 1,
        TILE - 2, TILE - 2,
      );
      if (isHead) {
        this.gfx.fillStyle(0xffffff, 1);
        const ex = this.offsetX + s.x * TILE + TILE * 0.3;
        const ey = this.offsetY + s.y * TILE + TILE * 0.3;
        this.gfx.fillCircle(ex, ey, 3);
        this.gfx.fillCircle(ex + TILE * 0.4, ey, 3);
      }
    }

    // Treat (golden bone)
    this.gfx.fillStyle(0xddaa44, 1);
    this.gfx.fillRect(
      this.offsetX + this.treat.x * TILE + 4,
      this.offsetY + this.treat.y * TILE + 4,
      TILE - 8, TILE - 8,
    );
  }

  private updateScore() {
    this.scoreText.setText(`Score: ${this.score}`);
  }

  private endGame() {
    const won = this.score >= WIN_SCORE;
    const msg = won ? 'Mila got all the treats!' : 'Oh no! Try again?';
    const color = won ? '#88cc88' : '#cc6666';

    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      msg,
      { fontSize: '24px', color, fontFamily: 'monospace', backgroundColor: '#000000aa', padding: { x: 16, y: 8 } },
    ).setOrigin(0.5);

    this.time.delayedCall(1500, () => {
      bridge.emit(EVENTS.CHALLENGE_COMPLETE, { challengeId: 'snake_mila', won });
    });
  }
}
