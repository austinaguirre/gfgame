export interface PlacementData {
  itemId: string;
  x: number;
  y: number;
  rotation: number;
}

export interface RoomLayout {
  locationId: number;
  roomIndex: number;
  floorItemId: string | null;
  wallItemId: string | null;
  placements: PlacementData[];
}

export interface GameProgress {
  userId: string;
  money: number;
  tutorialDone: boolean;
  currentLocationId: number;
  inventory: string[];
  ownedLocations: number[];
  ownedRooms: Record<string, number[]>;
  completedChallenges: string[];
}

export interface ComboEvent {
  comboId: string;
  status: string;
}

export interface GameState {
  progress: GameProgress;
  roomLayouts: Record<string, RoomLayout>;
  comboEvents: ComboEvent[];
}

export function roomKey(locationId: number, roomIndex: number): string {
  return `${locationId}-${roomIndex}`;
}
