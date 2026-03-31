'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { bridge, EVENTS } from '@/game/event-bridge';
import { LOCATIONS_BY_ID } from '@/data/locations';
import { ITEMS_BY_ID } from '@/data/items';
import { CHALLENGES_BY_ID } from '@/data/challenges';
import { COMBOS_BY_ID } from '@/data/combos';
import { ECONOMY } from '@/data/economy';
import { roomKey } from '@/lib/game-types';
import type { GameState, RoomLayout } from '@/lib/game-types';
import { BottomBar } from './components/bottom-bar';
import { BaseModal } from './components/base-modal';
import { InventoryPanel } from './components/inventory-panel';
import { ShopContent } from './components/shop-content';
import { LocationsContent } from './components/locations-content';
import { ChallengesContent } from './components/challenges-content';

type ModalView = 'shop' | 'locations' | 'challenges' | null;

async function api<T>(path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : {};
  const res = await fetch(`/api/game/${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `API error ${res.status}`);
  }
  return res.json();
}

export default function GameClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);
  const gameCreatedRef = useRef(false);
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [inChallenge, setInChallenge] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [modal, setModal] = useState<ModalView>(null);
  const [comboPopup, setComboPopup] = useState<string | null>(null);
  const [rewardPopup, setRewardPopup] = useState<string | null>(null);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);

  // ── Mount Phaser when we have state and the container is in the DOM (only once) ──
  useEffect(() => {
    if (!state || gameCreatedRef.current || !containerRef.current) return;
    gameCreatedRef.current = true;
    const el = containerRef.current;

    import('@/game/create-game').then(({ createGame }) => {
      if (!gameCreatedRef.current) return;
      try {
        gameRef.current = createGame(el);
      } catch {
        gameCreatedRef.current = false;
      }
    }).catch(() => {
      gameCreatedRef.current = false;
    });
  }, [state]);

  // ── Destroy Phaser only on unmount ──
  useEffect(() => {
    return () => {
      if (gameRef.current) {
        (gameRef.current as { destroy: (b: boolean) => void }).destroy(true);
        gameRef.current = null;
      }
      gameCreatedRef.current = false;
    };
  }, []);

  // ── Load game state ──
  useEffect(() => {
    api<GameState>('state')
      .then(s => { setState(s); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // ── Send room data to Phaser when state loads or when Location scene becomes ready ──
  const sendRoomToPhaser = useCallback(() => {
    if (!state) return;
    const locId = state.progress.currentLocationId;
    const key = roomKey(locId, currentRoomIndex);
    bridge.emit(EVENTS.LOAD_ROOM, {
      locationId: locId,
      roomIndex: currentRoomIndex,
      layout: state.roomLayouts[key] ?? null,
    });
  }, [state, currentRoomIndex]);

  useEffect(() => {
    sendRoomToPhaser();
  }, [sendRoomToPhaser]);

  useEffect(() => {
    const unsub = bridge.on(EVENTS.SCENE_READY, (sceneKey: unknown) => {
      if (sceneKey === 'Location') sendRoomToPhaser();
    });
    return () => {
      unsub();
    };
  }, [sendRoomToPhaser]);

  // ── Bridge listeners ──
  useEffect(() => {
    const unsubs = [
      bridge.on(EVENTS.LAYOUT_FOR_SAVE, async (layout: unknown) => {
        try {
          const l = layout as RoomLayout;
          const result = await api<{
            progress: GameState['progress'];
            layout: RoomLayout;
            triggeredCombos: string[];
          }>('save-layout', {
            locationId: l.locationId,
            roomIndex: l.roomIndex,
            floorItemId: l.floorItemId,
            wallItemId: l.wallItemId,
            placements: l.placements,
          });
          setState(prev => {
            if (!prev) return prev;
            const k = roomKey(l.locationId, l.roomIndex);
            return {
              ...prev,
              progress: result.progress,
              roomLayouts: { ...prev.roomLayouts, [k]: result.layout },
            };
          });
          if (result.triggeredCombos.length > 0) {
            const combo = COMBOS_BY_ID.get(result.triggeredCombos[0]);
            if (combo?.reaction.type === 'popup') {
              setComboPopup(combo.reaction.text);
              setTimeout(() => setComboPopup(null), 4000);
            }
          }
        } catch (e: unknown) {
          setError((e as Error).message);
        }
        setEditMode(false);
      }),

      bridge.on(EVENTS.CHALLENGE_COMPLETE, async (data: unknown) => {
        const { challengeId, won } = data as { challengeId: string; won: boolean };
        setInChallenge(false);
        bridge.emit(EVENTS.RETURN_TO_LOCATION, null);

        if (won) {
          try {
            const result = await api<{
              progress: GameState['progress'];
              rewardItemId: string;
            }>('complete-challenge', { challengeId });
            setState(prev => prev ? { ...prev, progress: result.progress } : prev);
            const item = ITEMS_BY_ID.get(result.rewardItemId);
            setRewardPopup(`+$${ECONOMY.MONEY_PER_WIN} and ${item?.name ?? 'an item'}!`);
            setTimeout(() => setRewardPopup(null), 3500);
          } catch (e: unknown) {
            setError((e as Error).message);
          }
        }
      }),

      bridge.on(EVENTS.ITEM_PLACED_IN_EDIT, (itemId: unknown) => {
        const id = itemId as string;
        setState(prev => {
          if (!prev) return prev;
          const idx = prev.progress.inventory.indexOf(id);
          if (idx === -1) return prev;
          const inv = [...prev.progress.inventory];
          inv.splice(idx, 1);
          return { ...prev, progress: { ...prev.progress, inventory: inv } };
        });
      }),

      bridge.on(EVENTS.OBSTACLE_CLICKED, async (data: unknown) => {
        const { locationId, roomIndex, placementIndex } = data as {
          locationId: number; roomIndex: number; placementIndex: number;
        };
        const currentState = state;
        if (!currentState || currentState.progress.money < ECONOMY.OBSTACLE_CLEANUP_COST) {
          setError(`Need $${ECONOMY.OBSTACLE_CLEANUP_COST} to clean up. Do challenges to earn money!`);
          setTimeout(() => setError(null), 3000);
          return;
        }
        try {
          const result = await api<{
            progress: GameState['progress'];
            layout: RoomLayout;
          }>('cleanup', { locationId, roomIndex, placementIndex });
          const k = roomKey(locationId, roomIndex);
          setState(prev => prev ? {
            ...prev,
            progress: result.progress,
            roomLayouts: { ...prev.roomLayouts, [k]: result.layout },
          } : prev);
          bridge.emit(EVENTS.LOAD_ROOM, {
            locationId, roomIndex, layout: result.layout,
          });
        } catch (e: unknown) {
          setError((e as Error).message);
        }
      }),
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, [state, currentRoomIndex]);

  // ── Actions ──
  const handleToggleEdit = useCallback(() => {
    setEditMode(true);
    bridge.emit(EVENTS.ENTER_EDIT_MODE, null);
  }, []);

  const handleSave = useCallback(() => {
    bridge.emit(EVENTS.EXIT_EDIT_MODE, true);
  }, []);

  const handleCancel = useCallback(async () => {
    bridge.emit(EVENTS.EXIT_EDIT_MODE, false);
    setEditMode(false);
    try {
      const fresh = await api<GameState>('state');
      setState(fresh);
    } catch {
      // keep current state if refetch fails
    }
  }, []);

  const handleSelectItem = useCallback((itemId: string) => {
    bridge.emit(EVENTS.SELECT_ITEM_FOR_PLACEMENT, itemId);
  }, []);

  const handleDropFromInventory = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId) return;
    bridge.emit(EVENTS.DROP_ITEM_FOR_PLACEMENT, { itemId, clientX: e.clientX, clientY: e.clientY });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleSellItem = useCallback(async (itemId: string) => {
    try {
      const result = await api<{ progress: GameState['progress'] }>('sell', { itemId });
      setState(prev => prev ? { ...prev, progress: result.progress } : prev);
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }, []);

  const handleBuyItem = useCallback(async (itemId: string) => {
    try {
      const result = await api<{ progress: GameState['progress'] }>('purchase', { type: 'item', itemId });
      setState(prev => prev ? { ...prev, progress: result.progress } : prev);
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }, []);

  const handleBuyLocation = useCallback(async (locationId: number) => {
    try {
      const result = await api<{ progress: GameState['progress'] }>('purchase', { type: 'location', locationId });
      setState(prev => prev ? { ...prev, progress: result.progress } : prev);
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }, []);

  const handleTravel = useCallback(async (locationId: number) => {
    try {
      const result = await api<{ progress: GameState['progress'] }>('travel', { locationId });
      setState(prev => prev ? { ...prev, progress: result.progress } : prev);
      setCurrentRoomIndex(0);
      setModal(null);
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }, []);

  const handleBuyRoom = useCallback(async (locationId: number, roomIndex: number) => {
    try {
      const result = await api<{ progress: GameState['progress'] }>('purchase', { type: 'room', locationId, roomIndex });
      setState(prev => prev ? { ...prev, progress: result.progress } : prev);
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }, []);

  const handleStartChallenge = useCallback((challengeId: string) => {
    setModal(null);
    setInChallenge(true);
    const ch = CHALLENGES_BY_ID.get(challengeId);
    if (!ch) return;
    bridge.emit(EVENTS.START_CHALLENGE, { type: ch.type });
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950 text-zinc-400">
        Loading game…
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950 text-red-400">
        {error ?? 'Failed to load game'}
      </div>
    );
  }

  const { progress } = state;
  const loc = LOCATIONS_BY_ID.get(progress.currentLocationId);
  const locName = loc?.name ?? 'Unknown';
  const myRooms = progress.ownedRooms[String(progress.currentLocationId)] ?? [0];

  return (
    <div className="relative flex h-full flex-col bg-zinc-950">
      {/* Game canvas */}
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="absolute inset-0 select-none"
          onContextMenu={(e) => e.preventDefault()}
          onDragOver={handleDragOver}
          onDrop={handleDropFromInventory}
        />

        <InventoryPanel
          open={inventoryOpen}
          inventory={progress.inventory}
          editMode={editMode}
          onClose={() => setInventoryOpen(false)}
          onSelectItem={handleSelectItem}
          onSellItem={handleSellItem}
        />

        {/* Room tabs */}
        {!inChallenge && myRooms.length > 1 && (
          <div className="absolute top-2 left-2 z-20 flex gap-1">
            {myRooms.map(ri => (
              <button
                key={ri}
                onClick={() => setCurrentRoomIndex(ri)}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  ri === currentRoomIndex
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                Room {ri + 1}
              </button>
            ))}
          </div>
        )}

        {/* Popups */}
        {comboPopup && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 rounded-lg bg-purple-900/90 px-6 py-3 text-sm text-white shadow-lg animate-pulse">
            {comboPopup}
          </div>
        )}
        {rewardPopup && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 rounded-lg bg-amber-700/90 px-6 py-3 text-sm text-white shadow-lg animate-bounce">
            {rewardPopup}
          </div>
        )}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 rounded-lg bg-red-900/90 px-6 py-3 text-sm text-white shadow-lg">
            {error}
            <button onClick={() => setError(null)} className="ml-3 underline">dismiss</button>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <BottomBar
        money={progress.money}
        inventoryCount={progress.inventory.length}
        editMode={editMode}
        inChallenge={inChallenge}
        locationName={locName}
        onToggleEdit={handleToggleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        onOpenInventory={() => setInventoryOpen(o => !o)}
        onOpenShop={() => setModal('shop')}
        onOpenLocations={() => setModal('locations')}
        onOpenChallenges={() => setModal('challenges')}
        onOpenRooms={() => setModal('locations')}
      />

      {/* Modals */}
      <BaseModal open={modal === 'shop'} onClose={() => setModal(null)} title="Shop">
        <ShopContent money={progress.money} onBuy={handleBuyItem} />
      </BaseModal>

      <BaseModal open={modal === 'locations'} onClose={() => setModal(null)} title="Locations & Rooms">
        <LocationsContent
          money={progress.money}
          ownedLocations={progress.ownedLocations}
          currentLocationId={progress.currentLocationId}
          ownedRooms={progress.ownedRooms}
          onBuyLocation={handleBuyLocation}
          onTravel={handleTravel}
          onBuyRoom={handleBuyRoom}
        />
      </BaseModal>

      <BaseModal open={modal === 'challenges'} onClose={() => setModal(null)} title="Challenges">
        <ChallengesContent onStartChallenge={handleStartChallenge} />
      </BaseModal>
    </div>
  );
}
