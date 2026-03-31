import * as Phaser from 'phaser';
import { BootScene } from './scenes/boot-scene';
import { LocationScene } from './scenes/location-scene';
import { SnakeScene } from './scenes/snake-scene';
import { WorcesterRunScene } from './scenes/worcester-run-scene';

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth,
    height: parent.clientHeight,
    backgroundColor: '#1a1a2e',
    scene: [BootScene, LocationScene, SnakeScene, WorcesterRunScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: { keyboard: true, mouse: true },
    render: { pixelArt: true, antialias: false, roundPixels: true },
  });
}
