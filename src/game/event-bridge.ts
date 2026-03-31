import type { PlacementData, RoomLayout } from '@/lib/game-types';

type Handler = (...args: unknown[]) => void;

class GameEventBridge {
  private handlers = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, ...args: unknown[]) {
    this.handlers.get(event)?.forEach(h => h(...args));
  }

  off(event: string, handler?: Handler) {
    if (handler) this.handlers.get(event)?.delete(handler);
    else this.handlers.delete(event);
  }

  clear() { this.handlers.clear(); }
}

export const bridge = new GameEventBridge();

// ── React → Phaser events ──
export const EVENTS = {
  ENTER_EDIT_MODE: 'enter-edit-mode',
  EXIT_EDIT_MODE: 'exit-edit-mode',
  SELECT_ITEM_FOR_PLACEMENT: 'select-item-for-placement',
  DROP_ITEM_FOR_PLACEMENT: 'drop-item-for-placement',
  CANCEL_PLACEMENT: 'cancel-placement',
  ROTATE_SELECTION: 'rotate-selection',
  REMOVE_SELECTION: 'remove-selection',
  LOAD_ROOM: 'load-room',
  START_CHALLENGE: 'start-challenge',
  RETURN_TO_LOCATION: 'return-to-location',

  // ── Phaser → React events ──
  LAYOUT_FOR_SAVE: 'layout-for-save',
  CHALLENGE_COMPLETE: 'challenge-complete',
  SCENE_READY: 'scene-ready',
  ITEM_SELECTED: 'item-selected',
  ITEM_PLACED_IN_EDIT: 'item-placed-in-edit',
  OBSTACLE_CLICKED: 'obstacle-clicked',
} as const;
