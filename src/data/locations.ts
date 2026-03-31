export interface LocationDef {
  id: number;
  name: string;
  biome: string;
  unlockCost: number;
  maxRooms: number;
  isDefault: boolean;
}

export const LOCATIONS: LocationDef[] = [
  { id: 1, name: 'First House', biome: 'default', unlockCost: 0, maxRooms: 5, isDefault: true },
  { id: 2, name: 'Beach House', biome: 'beach', unlockCost: 5000, maxRooms: 5, isDefault: false },
];

export const LOCATIONS_BY_ID = new Map(LOCATIONS.map(l => [l.id, l]));
