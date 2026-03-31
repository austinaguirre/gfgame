export interface RoomDef {
  locationId: number;
  roomIndex: number;
  name: string;
  gridWidth: number;
  gridHeight: number;
}

export interface InitialPlacement {
  itemId: string;
  x: number;
  y: number;
  rotation: number;
}

export interface StarterRoomState {
  floorItemId: string | null;
  wallItemId: string | null;
  placements: InitialPlacement[];
}

export const ROOMS: RoomDef[] = [
  // Location 1 — First House
  { locationId: 1, roomIndex: 0, name: 'Starter Room', gridWidth: 16, gridHeight: 12 },
  { locationId: 1, roomIndex: 1, name: 'Side Room', gridWidth: 14, gridHeight: 10 },
  { locationId: 1, roomIndex: 2, name: 'Back Room', gridWidth: 18, gridHeight: 12 },
  { locationId: 1, roomIndex: 3, name: 'Upper Room', gridWidth: 16, gridHeight: 14 },
  { locationId: 1, roomIndex: 4, name: 'Attic', gridWidth: 12, gridHeight: 10 },

  // Location 2 — Beach House
  { locationId: 2, roomIndex: 0, name: 'Beach Living', gridWidth: 18, gridHeight: 14 },
  { locationId: 2, roomIndex: 1, name: 'Beach Deck', gridWidth: 20, gridHeight: 10 },
  { locationId: 2, roomIndex: 2, name: 'Beach Bedroom', gridWidth: 14, gridHeight: 12 },
  { locationId: 2, roomIndex: 3, name: 'Sun Room', gridWidth: 16, gridHeight: 12 },
  { locationId: 2, roomIndex: 4, name: 'Beach Loft', gridWidth: 12, gridHeight: 10 },
];

export const STARTER_ROOM: StarterRoomState = {
  floorItemId: null,
  wallItemId: null,
  placements: [
    { itemId: 'obstacle_hole', x: 3, y: 2, rotation: 0 },
    { itemId: 'obstacle_broken', x: 8, y: 5, rotation: 0 },
    { itemId: 'obstacle_mess', x: 12, y: 3, rotation: 0 },
    { itemId: 'obstacle_hole', x: 6, y: 9, rotation: 0 },
    { itemId: 'obstacle_broken', x: 10, y: 8, rotation: 0 },
  ],
};

export function getRoomDef(locationId: number, roomIndex: number): RoomDef | undefined {
  return ROOMS.find(r => r.locationId === locationId && r.roomIndex === roomIndex);
}

export function getRoomsByLocation(locationId: number): RoomDef[] {
  return ROOMS.filter(r => r.locationId === locationId);
}
