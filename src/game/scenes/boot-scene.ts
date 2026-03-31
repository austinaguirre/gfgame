import * as Phaser from 'phaser';
import { ITEMS } from '@/data/items';
import { bridge, EVENTS } from '../event-bridge';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'Boot' }); }

  preload() {
    // Load every item so texture key item-${def.id} exists for Location scene.
    // URL matches React inventory/shop: /game/${def.asset}. Failed loads (e.g. 404) leave
    // texture missing; Location keeps using placeholders via textures.exists() checks.
    this.load.on('loaderror', (_: unknown, file: { key?: string }) => {
      console.warn('[Boot] Failed to load asset:', file?.key ?? 'unknown');
    });
    for (const def of ITEMS) {
      const key = 'item-' + def.id;
      const url = '/game/' + def.asset;
      this.load.image(key, url);
    }
  }

  create() {
    bridge.on(EVENTS.START_CHALLENGE, (data: unknown) => {
      const { type } = data as { type: string };
      this.scene.stop('Location');
      if (type === 'snake') this.scene.start('Snake');
      else if (type === 'worcester_run') this.scene.start('WorcesterRun');
    });

    bridge.on(EVENTS.RETURN_TO_LOCATION, () => {
      this.scene.stop('Snake');
      this.scene.stop('WorcesterRun');
      this.scene.start('Location');
    });

    bridge.emit(EVENTS.SCENE_READY, 'Boot');
    this.scene.launch('Location');
    this.scene.sleep();
  }
}
