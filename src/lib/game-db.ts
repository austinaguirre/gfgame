import { getSupabaseServer } from './supabase-server';

const supabase = getSupabaseServer();
import { STARTER_ROOM } from '@/data/rooms';
import { ITEMS_BY_ID, getRandomReward } from '@/data/items';
import { ECONOMY } from '@/data/economy';
import { evaluateCombos } from '@/data/combos';
import type {
  GameProgress, RoomLayout, ComboEvent, GameState, PlacementData,
} from './game-types';
import { roomKey } from './game-types';

// ── Row ↔ domain mappers ──

function rowToProgress(r: Record<string, unknown>): GameProgress {
  return {
    userId: r.user_id as string,
    money: r.money as number,
    tutorialDone: r.tutorial_done as boolean,
    currentLocationId: r.current_location_id as number,
    inventory: (r.inventory ?? []) as string[],
    ownedLocations: (r.owned_locations ?? [1]) as number[],
    ownedRooms: (r.owned_rooms ?? { '1': [0] }) as Record<string, number[]>,
    completedChallenges: (r.completed_challenges ?? []) as string[],
  };
}

function rowToLayout(r: Record<string, unknown>): RoomLayout {
  return {
    locationId: r.location_id as number,
    roomIndex: r.room_index as number,
    floorItemId: (r.floor_item_id ?? null) as string | null,
    wallItemId: (r.wall_item_id ?? null) as string | null,
    placements: (r.placements ?? []) as PlacementData[],
  };
}

// ── Init ──

async function createInitialState(userId: string): Promise<GameProgress> {
  const progress: Record<string, unknown> = {
    user_id: userId,
    money: 0,
    tutorial_done: false,
    current_location_id: 1,
    inventory: [],
    owned_locations: [1],
    owned_rooms: { '1': [0] },
    completed_challenges: [],
  };

  await supabase.from('game_progress').insert(progress);
  await supabase.from('room_layouts').insert({
    user_id: userId,
    location_id: 1,
    room_index: 0,
    floor_item_id: STARTER_ROOM.floorItemId,
    wall_item_id: STARTER_ROOM.wallItemId,
    placements: STARTER_ROOM.placements,
  });

  return rowToProgress(progress);
}

// ── Read ──

export async function getGameState(userId: string): Promise<GameState> {
  let { data: progressRow } = await supabase
    .from('game_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const progress = progressRow
    ? rowToProgress(progressRow)
    : await createInitialState(userId);

  const { data: layoutRows } = await supabase
    .from('room_layouts')
    .select('*')
    .eq('user_id', userId);

  const roomLayouts: Record<string, RoomLayout> = {};
  for (const r of layoutRows ?? []) {
    const layout = rowToLayout(r);
    roomLayouts[roomKey(layout.locationId, layout.roomIndex)] = layout;
  }

  const { data: comboRows } = await supabase
    .from('user_combo_events')
    .select('combo_id, status')
    .eq('user_id', userId);

  const comboEvents: ComboEvent[] = (comboRows ?? []).map(r => ({
    comboId: r.combo_id,
    status: r.status,
  }));

  return { progress, roomLayouts, comboEvents };
}

// ── Helpers ──

async function updateProgress(
  userId: string,
  fields: Record<string, unknown>,
): Promise<GameProgress> {
  const { data, error } = await supabase
    .from('game_progress')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to update progress');
  return rowToProgress(data);
}

// ── Inventory diffing helpers ──

function diffSlotItem(inv: string[], oldId: string | null, newId: string | null) {
  if (oldId && oldId !== newId) inv.push(oldId);
  if (newId && newId !== oldId) {
    const idx = inv.indexOf(newId);
    if (idx === -1) throw new Error(`Missing inventory item: ${newId}`);
    inv.splice(idx, 1);
  }
}

function filterNonObstacle(placements: PlacementData[]) {
  return placements.filter(p => ITEMS_BY_ID.get(p.itemId)?.type !== 'obstacle');
}

function diffPlaceables(inv: string[], oldPlacements: PlacementData[], newPlacements: PlacementData[]) {
  const oldCounts = countItems(filterNonObstacle(oldPlacements));
  const newCounts = countItems(filterNonObstacle(newPlacements));

  for (const [id, count] of Object.entries(newCounts)) {
    const added = count - (oldCounts[id] ?? 0);
    for (let i = 0; i < added; i++) {
      const idx = inv.indexOf(id);
      if (idx === -1) throw new Error(`Missing inventory item: ${id}`);
      inv.splice(idx, 1);
    }
  }
  for (const [id, count] of Object.entries(oldCounts)) {
    const removed = count - (newCounts[id] ?? 0);
    for (let i = 0; i < removed; i++) inv.push(id);
  }
}

function checkTutorialDone(locationId: number, roomIndex: number, placements: PlacementData[], currentFlag: boolean): boolean {
  if (locationId !== 1 || roomIndex !== 0) return currentFlag;
  const hasObstacles = placements.some(p => ITEMS_BY_ID.get(p.itemId)?.type === 'obstacle');
  return hasObstacles ? currentFlag : true;
}

// ── Save room layout ──

export async function saveRoomLayout(
  userId: string,
  locationId: number,
  roomIndex: number,
  floorItemId: string | null,
  wallItemId: string | null,
  placements: PlacementData[],
): Promise<{ progress: GameProgress; layout: RoomLayout; triggeredCombos: string[] }> {
  const { data: oldRow } = await supabase
    .from('room_layouts')
    .select('*')
    .eq('user_id', userId)
    .eq('location_id', locationId)
    .eq('room_index', roomIndex)
    .maybeSingle();

  const old = oldRow ? rowToLayout(oldRow) : null;

  const { data: progressRow } = await supabase
    .from('game_progress').select('*').eq('user_id', userId).single();
  if (!progressRow) throw new Error('No game progress');
  const progress = rowToProgress(progressRow);
  const inv = [...progress.inventory];

  diffSlotItem(inv, old?.floorItemId ?? null, floorItemId);
  diffSlotItem(inv, old?.wallItemId ?? null, wallItemId);
  diffPlaceables(inv, old?.placements ?? [], placements);

  const tutorialDone = checkTutorialDone(locationId, roomIndex, placements, progress.tutorialDone);

  const updatedProgress = await updateProgress(userId, {
    inventory: inv,
    tutorial_done: tutorialDone,
  });

  await supabase.from('room_layouts').upsert({
    user_id: userId,
    location_id: locationId,
    room_index: roomIndex,
    floor_item_id: floorItemId,
    wall_item_id: wallItemId,
    placements,
    updated_at: new Date().toISOString(),
  });

  const layout: RoomLayout = { locationId, roomIndex, floorItemId, wallItemId, placements };

  // Evaluate combos
  const { data: existingCombos } = await supabase
    .from('user_combo_events').select('combo_id').eq('user_id', userId);
  const triggered = new Set((existingCombos ?? []).map(c => c.combo_id));
  const placedIds = placements.map(p => p.itemId);
  const newCombos = evaluateCombos(placedIds, triggered);

  for (const combo of newCombos) {
    await supabase.from('user_combo_events').upsert({
      user_id: userId, combo_id: combo.id, status: 'triggered',
    });
  }

  return { progress: updatedProgress, layout, triggeredCombos: newCombos.map(c => c.id) };
}

function countItems(placements: PlacementData[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of placements) counts[p.itemId] = (counts[p.itemId] ?? 0) + 1;
  return counts;
}

// ── Complete challenge ──

export async function completeChallenge(
  userId: string,
  challengeId: string,
): Promise<{ progress: GameProgress; rewardItemId: string }> {
  const rewardItemId = getRandomReward();
  const { data: row } = await supabase
    .from('game_progress').select('*').eq('user_id', userId).single();
  if (!row) throw new Error('No game progress');
  const cur = rowToProgress(row);

  const updated = await updateProgress(userId, {
    money: cur.money + ECONOMY.MONEY_PER_WIN,
    inventory: [...cur.inventory, rewardItemId],
    completed_challenges: [...cur.completedChallenges, challengeId],
  });

  return { progress: updated, rewardItemId };
}

// ── Buy room ──

export async function buyRoom(
  userId: string,
  locationId: number,
  roomIndex: number,
): Promise<GameProgress> {
  const { data: row } = await supabase
    .from('game_progress').select('*').eq('user_id', userId).single();
  if (!row) throw new Error('No game progress');
  const cur = rowToProgress(row);

  const locKey = String(locationId);
  const currentRooms = cur.ownedRooms[locKey] ?? [];
  if (currentRooms.includes(roomIndex)) throw new Error('Room already owned');

  const totalRoomsBought = Object.values(cur.ownedRooms).reduce((s, r) => s + r.length, 0);
  const cost = ECONOMY.FIRST_ROOM_COST + (totalRoomsBought - 1) * ECONOMY.ROOM_COST_INCREMENT;
  if (cur.money < cost) throw new Error('Not enough money');

  const newRooms = { ...cur.ownedRooms, [locKey]: [...currentRooms, roomIndex].sort((a, b) => a - b) };

  // Create empty room layout
  await supabase.from('room_layouts').upsert({
    user_id: userId, location_id: locationId, room_index: roomIndex,
    floor_item_id: null, wall_item_id: null, placements: [],
    updated_at: new Date().toISOString(),
  });

  return updateProgress(userId, { money: cur.money - cost, owned_rooms: newRooms });
}

// ── Buy location ──

export async function buyLocation(
  userId: string,
  locationId: number,
  cost: number,
): Promise<GameProgress> {
  const { data: row } = await supabase
    .from('game_progress').select('*').eq('user_id', userId).single();
  if (!row) throw new Error('No game progress');
  const cur = rowToProgress(row);

  if (cur.ownedLocations.includes(locationId)) throw new Error('Location already owned');
  if (cur.money < cost) throw new Error('Not enough money');

  const newLocs = [...cur.ownedLocations, locationId];
  const newRooms = { ...cur.ownedRooms, [String(locationId)]: [0] };

  // Create first room layout for new location
  await supabase.from('room_layouts').upsert({
    user_id: userId, location_id: locationId, room_index: 0,
    floor_item_id: null, wall_item_id: null, placements: [],
    updated_at: new Date().toISOString(),
  });

  return updateProgress(userId, {
    money: cur.money - cost,
    owned_locations: newLocs,
    owned_rooms: newRooms,
  });
}

// ── Buy item from shop ──

export async function buyItem(userId: string, itemId: string): Promise<GameProgress> {
  const item = ITEMS_BY_ID.get(itemId);
  if (!item) throw new Error('Unknown item');

  const { data: row } = await supabase
    .from('game_progress').select('*').eq('user_id', userId).single();
  if (!row) throw new Error('No game progress');
  const cur = rowToProgress(row);

  if (cur.money < item.buyPrice) throw new Error('Not enough money');

  return updateProgress(userId, {
    money: cur.money - item.buyPrice,
    inventory: [...cur.inventory, itemId],
  });
}

// ── Sell item ──

export async function sellItem(userId: string, itemId: string): Promise<GameProgress> {
  const item = ITEMS_BY_ID.get(itemId);
  if (!item) throw new Error('Unknown item');

  const { data: row } = await supabase
    .from('game_progress').select('*').eq('user_id', userId).single();
  if (!row) throw new Error('No game progress');
  const cur = rowToProgress(row);

  const idx = cur.inventory.indexOf(itemId);
  if (idx === -1) throw new Error('Item not in inventory');
  const newInv = [...cur.inventory];
  newInv.splice(idx, 1);

  return updateProgress(userId, {
    money: cur.money + item.sellPrice,
    inventory: newInv,
  });
}

// ── Travel ──

export async function travel(userId: string, locationId: number): Promise<GameProgress> {
  const { data: row } = await supabase
    .from('game_progress').select('*').eq('user_id', userId).single();
  if (!row) throw new Error('No game progress');
  const cur = rowToProgress(row);

  if (!cur.ownedLocations.includes(locationId)) throw new Error('Location not owned');

  return updateProgress(userId, { current_location_id: locationId });
}

// ── Cleanup obstacle ──

export async function cleanupObstacle(
  userId: string,
  locationId: number,
  roomIndex: number,
  placementIndex: number,
): Promise<{ progress: GameProgress; layout: RoomLayout }> {
  const { data: progressRow } = await supabase
    .from('game_progress').select('*').eq('user_id', userId).single();
  if (!progressRow) throw new Error('No game progress');
  const cur = rowToProgress(progressRow);
  if (cur.money < ECONOMY.OBSTACLE_CLEANUP_COST) throw new Error('Not enough money');

  const { data: layoutRow } = await supabase
    .from('room_layouts').select('*')
    .eq('user_id', userId).eq('location_id', locationId).eq('room_index', roomIndex)
    .single();
  if (!layoutRow) throw new Error('Room not found');

  const placements = (layoutRow.placements as PlacementData[]) ?? [];
  const removed = placements[placementIndex];
  if (!removed) throw new Error('Invalid placement index');
  if (ITEMS_BY_ID.get(removed.itemId)?.type !== 'obstacle') throw new Error('Not an obstacle');

  const newPlacements = placements.filter((_, i) => i !== placementIndex);

  await supabase.from('room_layouts').update({
    placements: newPlacements, updated_at: new Date().toISOString(),
  }).eq('user_id', userId).eq('location_id', locationId).eq('room_index', roomIndex);

  const hasObstacles = newPlacements.some(p => ITEMS_BY_ID.get(p.itemId)?.type === 'obstacle');
  const tutorialDone = (locationId === 1 && roomIndex === 0 && !hasObstacles) || cur.tutorialDone;

  const updatedProgress = await updateProgress(userId, {
    money: cur.money - ECONOMY.OBSTACLE_CLEANUP_COST,
    tutorial_done: tutorialDone,
  });

  const layout: RoomLayout = {
    locationId, roomIndex,
    floorItemId: layoutRow.floor_item_id,
    wallItemId: layoutRow.wall_item_id,
    placements: newPlacements,
  };

  return { progress: updatedProgress, layout };
}
