import * as Phaser from 'phaser';
import { ECONOMY } from '@/data/economy';
import { ITEMS_BY_ID, type ItemDef } from '@/data/items';
import { getRoomDef } from '@/data/rooms';
import type { PlacementData, RoomLayout } from '@/lib/game-types';
import { bridge, EVENTS } from '../event-bridge';

const CELL = ECONOMY.CELL_SIZE;
const WALL_THICKNESS = CELL;
const GRID_COLOR = 0x666666;
const GRID_ALPHA = 0.25;
const HIGHLIGHT_COLOR = 0x44ff44;
const INVALID_COLOR = 0xff4444;
const SELECT_COLOR = 0x4488ff;

interface PlacedSprite {
  sprite: Phaser.GameObjects.Image;
  data: PlacementData;
  index: number;
}

export class LocationScene extends Phaser.Scene {
  private gridGfx!: Phaser.GameObjects.Graphics;
  private wallGfx!: Phaser.GameObjects.Graphics;
  private wallBackTiles: Phaser.GameObjects.TileSprite | null = null;
  private wallLeftTiles: Phaser.GameObjects.TileSprite | null = null;
  private floorTiles: Phaser.GameObjects.TileSprite | null = null;
  private placedSprites: PlacedSprite[] = [];
  private ghostSprite: Phaser.GameObjects.Image | null = null;
  private selectionRect: Phaser.GameObjects.Graphics | null = null;

  private editMode = false;
  private placingItemId: string | null = null;
  private selectedIndex = -1;
  private draggingPlacementIndex = -1;

  private currentLayout: RoomLayout = {
    locationId: 1, roomIndex: 0,
    floorItemId: null, wallItemId: null, placements: [],
  };
  private savedLayout: RoomLayout | null = null;

  private gridW = 16;
  private gridH = 12;
  private originX = WALL_THICKNESS;
  private originY = WALL_THICKNESS;

  private preventContextMenu = (e: MouseEvent) => e.preventDefault();
  private preventDragOver = (e: DragEvent) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; };
  private handleCanvasDrop = (e: DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer?.getData('text/plain');
    if (itemId) bridge.emit(EVENTS.DROP_ITEM_FOR_PLACEMENT, { itemId, clientX: e.clientX, clientY: e.clientY });
  };

  constructor() { super({ key: 'Location' }); }

  create() {
    this.gridGfx = this.add.graphics();
    this.wallGfx = this.add.graphics();
    this.selectionRect = this.add.graphics();

    const canvas = this.sys.game.canvas;
    if (canvas) {
      canvas.addEventListener('contextmenu', this.preventContextMenu);
      canvas.addEventListener('dragover', this.preventDragOver);
      canvas.addEventListener('drop', this.handleCanvasDrop);
    }

    this.setupCamera();
    this.setupInput();
    this.listenToBridge();

    this.rebuildRoom();
    bridge.emit(EVENTS.SCENE_READY, 'Location');
  }

  shutdown() {
    const canvas = this.sys.game.canvas;
    if (canvas) {
      canvas.removeEventListener('contextmenu', this.preventContextMenu);
      canvas.removeEventListener('dragover', this.preventDragOver);
      canvas.removeEventListener('drop', this.handleCanvasDrop);
    }
  }

  // ── Camera ──

  private setupCamera() {
    const cam = this.cameras.main;
    cam.setBackgroundColor('#1a1a2e');

    let dragStart: { x: number; y: number } | null = null;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) dragStart = { x: cam.scrollX + p.x, y: cam.scrollY + p.y };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (dragStart && p.rightButtonDown()) {
        cam.scrollX = dragStart.x - p.x;
        cam.scrollY = dragStart.y - p.y;
      }
    });
    this.input.on('pointerup', () => { dragStart = null; });

    // Integer zoom keeps pixel art crisp (Phaser's roundPixels only works when zoom is integer).
    this.input.on('wheel', (_: unknown, __: unknown, ___: unknown, dy: number) => {
      const step = Math.sign(dy);
      const next = Math.round(cam.zoom) - step;
      cam.zoom = Phaser.Math.Clamp(next, 1, 3);
    });
  }

  // ── Input ──

  private setupInput() {
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.editMode) return;
      if (this.placingItemId) {
        this.updateGhostPosition(p);
        return;
      }
      if (this.draggingPlacementIndex >= 0) {
        this.updateDragGhostPosition(p);
      }
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.editMode || p.rightButtonDown()) return;

      if (this.placingItemId) {
        this.placeGhostItem(p);
        return;
      }

      // If something is selected, check for move or start drag
      if (this.selectedIndex >= 0) {
        const hit = this.getPlacementAtPoint(p.worldX, p.worldY);
        if (hit === undefined) {
          this.tryMoveSelectedToCell(p);
          return;
        }
        if (hit === this.selectedIndex) {
          this.startDragSelected();
          return;
        }
        // fall through to select the clicked item
      }

      this.trySelectPlacement(p);
    });

    this.input.on('pointerup', (_p: Phaser.Input.Pointer) => {
      if (this.draggingPlacementIndex >= 0) {
        this.commitDragPlacement();
      }
    });
  }

  // ── Bridge listeners ──

  private listenToBridge() {
    bridge.on(EVENTS.ENTER_EDIT_MODE, () => {
      this.editMode = true;
      this.savedLayout = JSON.parse(JSON.stringify(this.currentLayout));
      this.drawGrid();
    });

    bridge.on(EVENTS.EXIT_EDIT_MODE, (save: unknown) => {
      if (save) {
        bridge.emit(EVENTS.LAYOUT_FOR_SAVE, this.currentLayout);
      } else if (this.savedLayout) {
        this.currentLayout = this.savedLayout;
        this.rebuildRoom();
      }
      this.editMode = false;
      this.savedLayout = null;
      this.clearGhost();
      this.clearDragGhost();
      this.clearSelection();
      this.gridGfx.clear();
    });

    bridge.on(EVENTS.SELECT_ITEM_FOR_PLACEMENT, (itemId: unknown) => {
      this.placingItemId = itemId as string;
      this.clearSelection();
      this.createGhost();
    });

    bridge.on(EVENTS.DROP_ITEM_FOR_PLACEMENT, (data: unknown) => {
      const { itemId, clientX, clientY } = data as { itemId: string; clientX: number; clientY: number };
      this.placeItemAtScreenPosition(itemId, clientX, clientY);
    });

    bridge.on(EVENTS.CANCEL_PLACEMENT, () => { this.clearGhost(); });

    bridge.on(EVENTS.ROTATE_SELECTION, () => {
      if (this.selectedIndex >= 0) {
        const p = this.currentLayout.placements[this.selectedIndex];
        p.rotation = (p.rotation + 90) % 360;
        this.rebuildRoom();
        this.highlightSelected();
      }
    });

    bridge.on(EVENTS.REMOVE_SELECTION, () => {
      if (this.selectedIndex >= 0) {
        this.currentLayout.placements.splice(this.selectedIndex, 1);
        this.selectedIndex = -1;
        this.rebuildRoom();
      }
    });

    bridge.on(EVENTS.LOAD_ROOM, (data: unknown) => {
      const { locationId, roomIndex, layout } = data as {
        locationId: number; roomIndex: number; layout: RoomLayout | null;
      };
      const def = getRoomDef(locationId, roomIndex);
      if (def) {
        this.gridW = def.gridWidth;
        this.gridH = def.gridHeight;
      }
      this.currentLayout = layout ?? {
        locationId, roomIndex,
        floorItemId: null, wallItemId: null, placements: [],
      };
      this.rebuildRoom();
      this.cameras.main.scrollX = 0;
      this.cameras.main.scrollY = 0;
    });

    bridge.on(EVENTS.OBSTACLE_CLICKED, () => {});
  }

  // ── Rendering ──

  rebuildRoom() {
    this.clearPlacedSprites();
    this.drawWalls();
    this.drawFloor();
    this.drawPlacements();
    if (this.editMode) this.drawGrid();
  }

  private drawWalls() {
    this.wallBackTiles?.destroy();
    this.wallBackTiles = null;
    this.wallLeftTiles?.destroy();
    this.wallLeftTiles = null;

    this.wallGfx.clear();
    const totalW = this.gridW * CELL;
    const totalH = this.gridH * CELL;

    const wallDef = this.currentLayout.wallItemId
      ? ITEMS_BY_ID.get(this.currentLayout.wallItemId)
      : null;
    const wallTexKey = wallDef ? `item-${wallDef.id}` : '';
    const hasWallTexture = !!wallTexKey && this.textures.exists(wallTexKey);

    if (hasWallTexture) {
      this.wallBackTiles = this.add.tileSprite(
        this.originX, this.originY - WALL_THICKNESS, totalW, WALL_THICKNESS,
        wallTexKey,
      ).setOrigin(0, 0).setDepth(-1);
      this.wallLeftTiles = this.add.tileSprite(
        this.originX - WALL_THICKNESS, this.originY - WALL_THICKNESS, WALL_THICKNESS, totalH + WALL_THICKNESS,
        wallTexKey,
      ).setOrigin(0, 0).setDepth(-1);
    } else {
      const wallColor = wallDef ? 0xc4b896 : 0xd4c5a9;
      this.wallGfx.fillStyle(wallColor, 1);
      this.wallGfx.fillRect(this.originX, this.originY - WALL_THICKNESS, totalW, WALL_THICKNESS);
      this.wallGfx.fillRect(this.originX - WALL_THICKNESS, this.originY - WALL_THICKNESS, WALL_THICKNESS, totalH + WALL_THICKNESS);
    }

    this.wallGfx.lineStyle(2, 0x333333, 0.5);
    this.wallGfx.strokeRect(this.originX - WALL_THICKNESS, this.originY - WALL_THICKNESS, totalW + WALL_THICKNESS, totalH + WALL_THICKNESS);
  }

  private drawFloor() {
    this.floorTiles?.destroy();
    this.floorTiles = null;

    const totalW = this.gridW * CELL;
    const totalH = this.gridH * CELL;

    const floorDef = this.currentLayout.floorItemId
      ? ITEMS_BY_ID.get(this.currentLayout.floorItemId)
      : null;

    if (floorDef && this.textures.exists(`item-${floorDef.id}`)) {
      this.floorTiles = this.add.tileSprite(
        this.originX, this.originY, totalW, totalH,
        `item-${floorDef.id}`,
      ).setOrigin(0, 0).setDepth(0);
    } else {
      const gfx = this.add.graphics().setDepth(0);
      gfx.fillStyle(0x8b7d6b, 1);
      gfx.fillRect(this.originX, this.originY, totalW, totalH);
    }
  }

  private drawGrid() {
    this.gridGfx.clear();
    if (!this.editMode) return;

    this.gridGfx.lineStyle(1, GRID_COLOR, GRID_ALPHA);
    const totalW = this.gridW * CELL;
    const totalH = this.gridH * CELL;

    for (let x = 0; x <= this.gridW; x++) {
      this.gridGfx.lineBetween(
        this.originX + x * CELL, this.originY,
        this.originX + x * CELL, this.originY + totalH,
      );
    }
    for (let y = 0; y <= this.gridH; y++) {
      this.gridGfx.lineBetween(
        this.originX, this.originY + y * CELL,
        this.originX + totalW, this.originY + y * CELL,
      );
    }
    this.gridGfx.setDepth(1);
  }

  /**
   * Fit into the grid cell while preserving aspect ratio to avoid squishing.
   * When texKey is provided and the texture exists, uses the texture's actual frame size (PNG dimensions);
   * otherwise uses def.pixelWidth / def.pixelHeight.
   */
  private getDisplaySizeForDef(def: ItemDef, texKey?: string): { w: number; h: number } {
    const maxW = def.gridWidth * CELL;
    const maxH = def.gridHeight * CELL;
    let srcW = def.pixelWidth;
    let srcH = def.pixelHeight;
    if (texKey && this.textures.exists(texKey)) {
      const frame = this.textures.get(texKey).get();
      if (frame && frame.width > 0 && frame.height > 0) {
        srcW = frame.width;
        srcH = frame.height;
      }
    }
    const scale = Math.min(maxW / srcW, maxH / srcH);
    return { w: srcW * scale, h: srcH * scale };
  }

  private drawPlacements() {
    for (let i = 0; i < this.currentLayout.placements.length; i++) {
      const p = this.currentLayout.placements[i];
      const def = ITEMS_BY_ID.get(p.itemId);
      if (!def) continue;

      const texKey = `item-${def.id}`;
      const px = this.originX + p.x * CELL + (def.gridWidth * CELL) / 2;
      const py = this.originY + p.y * CELL + (def.gridHeight * CELL) / 2;

      const hasTexture = this.textures.exists(texKey);
      const sprite = hasTexture
        ? this.add.image(px, py, texKey)
        : this.createPlaceholder(px, py, def);

      const { w, h } = this.getDisplaySizeForDef(def, hasTexture ? texKey : undefined);
      sprite.setDisplaySize(w, h);
      sprite.setAngle(p.rotation);
      sprite.setDepth(2 + p.y);
      sprite.setInteractive();

      this.placedSprites.push({ sprite, data: p, index: i });
    }
  }

  private createPlaceholder(x: number, y: number, def: ItemDef): Phaser.GameObjects.Image {
    const key = `placeholder-${def.gridWidth}x${def.gridHeight}`;
    if (!this.textures.exists(key)) {
      const g = this.make.graphics(undefined, false);
      const w = def.gridWidth * CELL;
      const h = def.gridHeight * CELL;
      g.fillStyle(def.type === 'obstacle' ? 0x884444 : 0x667788, 0.8);
      g.fillRect(0, 0, w, h);
      g.lineStyle(2, 0xffffff, 0.4);
      g.strokeRect(1, 1, w - 2, h - 2);
      g.generateTexture(key, w, h);
      g.destroy();
    }
    return this.add.image(x, y, key);
  }

  private clearPlacedSprites() {
    for (const ps of this.placedSprites) ps.sprite.destroy();
    this.placedSprites = [];
  }

  // ── Ghost (placing item) ──

  private createGhost() {
    this.ghostSprite?.destroy();
    this.ghostSprite = null;
    if (!this.placingItemId) return;
    const def = ITEMS_BY_ID.get(this.placingItemId);
    if (!def) return;

    const texKey = `item-${def.id}`;
    const hasTexture = this.textures.exists(texKey);
    this.ghostSprite = hasTexture
      ? this.add.image(0, 0, texKey)
      : this.createPlaceholder(0, 0, def);

    const { w, h } = this.getDisplaySizeForDef(def, hasTexture ? texKey : undefined);
    this.ghostSprite.setDisplaySize(w, h);
    this.ghostSprite.setAlpha(0.6);
    this.ghostSprite.setDepth(100);

    // Position ghost under cursor immediately when entering place mode
    const pointer = this.input.activePointer;
    if (pointer) this.updateGhostPosition(pointer);
  }

  private updateGhostPosition(p: Phaser.Input.Pointer) {
    if (!this.ghostSprite || !this.placingItemId) return;
    const def = ITEMS_BY_ID.get(this.placingItemId);
    if (!def) return;

    const worldX = p.worldX;
    const worldY = p.worldY;
    const cellX = Math.floor((worldX - this.originX) / CELL);
    const cellY = Math.floor((worldY - this.originY) / CELL);
    const clampX = Phaser.Math.Clamp(cellX, 0, this.gridW - def.gridWidth);
    const clampY = Phaser.Math.Clamp(cellY, 0, this.gridH - def.gridHeight);

    this.ghostSprite.setPosition(
      this.originX + clampX * CELL + (def.gridWidth * CELL) / 2,
      this.originY + clampY * CELL + (def.gridHeight * CELL) / 2,
    );

    const valid = this.canPlace(clampX, clampY, def);
    this.ghostSprite.setTint(valid ? HIGHLIGHT_COLOR : INVALID_COLOR);
  }

  private placeGhostItem(p: Phaser.Input.Pointer) {
    if (!this.placingItemId) return;
    this.placeItemAtWorld(this.placingItemId, p.worldX, p.worldY);
    this.clearGhost();
    this.placingItemId = null;
    this.rebuildRoom();
  }

  /** Place an item at screen (client) coordinates, e.g. from a drag-and-drop from inventory. */
  private placeItemAtScreenPosition(itemId: string, clientX: number, clientY: number) {
    if (!this.editMode) return;
    const canvas = this.sys.game.canvas;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cam = this.cameras.main;
    const viewX = ((clientX - rect.left) / rect.width) * cam.width;
    const viewY = ((clientY - rect.top) / rect.height) * cam.height;
    const worldPoint = new Phaser.Math.Vector2();
    cam.getWorldPoint(viewX, viewY, worldPoint);
    this.placeItemAtWorld(itemId, worldPoint.x, worldPoint.y);
    this.clearGhost();
    this.rebuildRoom();
  }

  private placeItemAtWorld(itemId: string, worldX: number, worldY: number) {
    const def = ITEMS_BY_ID.get(itemId);
    if (!def) return;

    const cellX = Math.floor((worldX - this.originX) / CELL);
    const cellY = Math.floor((worldY - this.originY) / CELL);
    const clampX = Phaser.Math.Clamp(cellX, 0, this.gridW - def.gridWidth);
    const clampY = Phaser.Math.Clamp(cellY, 0, this.gridH - def.gridHeight);

    if (!this.canPlace(clampX, clampY, def)) return;

    if (def.type === 'floor' || def.placement === 'floor') {
      this.currentLayout.floorItemId = def.id;
    } else if (def.type === 'walls' || def.placement === 'wall') {
      this.currentLayout.wallItemId = def.id;
    } else {
      this.currentLayout.placements.push({
        itemId: def.id, x: clampX, y: clampY, rotation: 0,
      });
    }
    bridge.emit(EVENTS.ITEM_PLACED_IN_EDIT, def.id);
  }

  // ── Selection ──

  /** Index of placement under (worldX, worldY), or undefined if none. */
  private getPlacementAtPoint(worldX: number, worldY: number): number | undefined {
    for (let i = this.placedSprites.length - 1; i >= 0; i--) {
      const ps = this.placedSprites[i];
      if (ps.sprite.getBounds().contains(worldX, worldY)) return ps.index;
    }
    return undefined;
  }

  private tryMoveSelectedToCell(p: Phaser.Input.Pointer) {
    if (this.selectedIndex < 0) return;
    const placement = this.currentLayout.placements[this.selectedIndex];
    const def = ITEMS_BY_ID.get(placement?.itemId);
    if (!def) return;

    const cellX = Math.floor((p.worldX - this.originX) / CELL);
    const cellY = Math.floor((p.worldY - this.originY) / CELL);
    const clampX = Phaser.Math.Clamp(cellX, 0, this.gridW - def.gridWidth);
    const clampY = Phaser.Math.Clamp(cellY, 0, this.gridH - def.gridHeight);

    if (!this.canPlaceAtExcluding(clampX, clampY, def, this.selectedIndex)) return;

    placement.x = clampX;
    placement.y = clampY;
    this.rebuildRoom();
    this.highlightSelected();
  }

  private trySelectPlacement(p: Phaser.Input.Pointer) {
    this.clearSelection();
    const worldX = p.worldX;
    const worldY = p.worldY;

    for (let i = this.placedSprites.length - 1; i >= 0; i--) {
      const ps = this.placedSprites[i];
      const bounds = ps.sprite.getBounds();
      if (bounds.contains(worldX, worldY)) {
        this.selectedIndex = ps.index;
        this.highlightSelected();

        const placement = this.currentLayout.placements[ps.index];
        const def = ITEMS_BY_ID.get(placement.itemId);
        if (def?.type === 'obstacle') {
          bridge.emit(EVENTS.OBSTACLE_CLICKED, {
            locationId: this.currentLayout.locationId,
            roomIndex: this.currentLayout.roomIndex,
            placementIndex: ps.index,
            itemId: placement.itemId,
          });
        }
        bridge.emit(EVENTS.ITEM_SELECTED, placement.itemId);
        return;
      }
    }
    bridge.emit(EVENTS.ITEM_SELECTED, null);
  }

  private highlightSelected() {
    this.selectionRect?.clear();
    if (this.selectedIndex < 0) return;
    const ps = this.placedSprites.find(s => s.index === this.selectedIndex);
    if (!ps) return;

    const bounds = ps.sprite.getBounds();
    this.selectionRect!.lineStyle(3, SELECT_COLOR, 1);
    this.selectionRect!.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    this.selectionRect!.setDepth(200);
  }

  private clearSelection() {
    this.selectedIndex = -1;
    this.selectionRect?.clear();
    bridge.emit(EVENTS.ITEM_SELECTED, null);
  }

  private clearGhost() {
    this.ghostSprite?.destroy();
    this.ghostSprite = null;
    this.placingItemId = null;
  }

  private clearDragGhost() {
    this.ghostSprite?.destroy();
    this.ghostSprite = null;
    this.draggingPlacementIndex = -1;
  }

  private startDragSelected() {
    if (this.selectedIndex < 0) return;
    const placement = this.currentLayout.placements[this.selectedIndex];
    const def = ITEMS_BY_ID.get(placement?.itemId);
    if (!def) return;
    this.clearDragGhost();
    const texKey = `item-${def.id}`;
    const hasTexture = this.textures.exists(texKey);
    this.ghostSprite = hasTexture
      ? this.add.image(0, 0, texKey)
      : this.createPlaceholder(0, 0, def);
    const { w, h } = this.getDisplaySizeForDef(def, hasTexture ? texKey : undefined);
    this.ghostSprite.setDisplaySize(w, h);
    this.ghostSprite.setAlpha(0.6);
    this.ghostSprite.setDepth(100);
    this.draggingPlacementIndex = this.selectedIndex;
    this.updateDragGhostPosition(this.input.activePointer);
  }

  private updateDragGhostPosition(p: Phaser.Input.Pointer) {
    if (!this.ghostSprite || this.draggingPlacementIndex < 0) return;
    const placement = this.currentLayout.placements[this.draggingPlacementIndex];
    const def = ITEMS_BY_ID.get(placement?.itemId);
    if (!def) return;
    const worldX = p.worldX;
    const worldY = p.worldY;
    const cellX = Math.floor((worldX - this.originX) / CELL);
    const cellY = Math.floor((worldY - this.originY) / CELL);
    const clampX = Phaser.Math.Clamp(cellX, 0, this.gridW - def.gridWidth);
    const clampY = Phaser.Math.Clamp(cellY, 0, this.gridH - def.gridHeight);
    this.ghostSprite.setPosition(
      this.originX + clampX * CELL + (def.gridWidth * CELL) / 2,
      this.originY + clampY * CELL + (def.gridHeight * CELL) / 2,
    );
    const valid = this.canPlaceAtExcluding(clampX, clampY, def, this.draggingPlacementIndex);
    this.ghostSprite.setTint(valid ? HIGHLIGHT_COLOR : INVALID_COLOR);
  }

  private commitDragPlacement() {
    if (this.draggingPlacementIndex < 0) {
      this.clearDragGhost();
      return;
    }
    const p = this.input.activePointer;
    const placement = this.currentLayout.placements[this.draggingPlacementIndex];
    const def = ITEMS_BY_ID.get(placement?.itemId);
    if (!def) {
      this.clearDragGhost();
      return;
    }
    const cellX = Math.floor((p.worldX - this.originX) / CELL);
    const cellY = Math.floor((p.worldY - this.originY) / CELL);
    const clampX = Phaser.Math.Clamp(cellX, 0, this.gridW - def.gridWidth);
    const clampY = Phaser.Math.Clamp(cellY, 0, this.gridH - def.gridHeight);
    if (this.canPlaceAtExcluding(clampX, clampY, def, this.draggingPlacementIndex)) {
      placement.x = clampX;
      placement.y = clampY;
    }
    this.clearDragGhost();
    this.rebuildRoom();
    this.highlightSelected();
  }

  // ── Collision ──

  private canPlace(cellX: number, cellY: number, def: ItemDef): boolean {
    return this.canPlaceAtExcluding(cellX, cellY, def, -1);
  }

  private canPlaceAtExcluding(cellX: number, cellY: number, def: ItemDef, excludeIndex: number): boolean {
    if (def.type === 'floor' || def.type === 'walls') return true;

    if (cellX < 0 || cellY < 0 ||
        cellX + def.gridWidth > this.gridW ||
        cellY + def.gridHeight > this.gridH) return false;

    const placements = this.currentLayout.placements;
    for (let i = 0; i < placements.length; i++) {
      if (i === excludeIndex) continue;
      const p = placements[i];
      const pDef = ITEMS_BY_ID.get(p.itemId);
      if (!pDef) continue;
      if (rectsOverlap(cellX, cellY, def.gridWidth, def.gridHeight,
                        p.x, p.y, pDef.gridWidth, pDef.gridHeight)) {
        return false;
      }
    }
    return true;
  }
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
