export const ECONOMY = {
  MONEY_PER_WIN: 400,
  FIRST_ROOM_COST: 500,
  ROOM_COST_INCREMENT: 100,
  OBSTACLE_CLEANUP_COST: 100,
  ITEM_BUY_PRICE: 200,
  ITEM_SELL_PRICE: 100,
  FLOOR_BUY_PRICE: 200,
  FLOOR_SELL_PRICE: 100,
  WALL_BUY_PRICE: 200,
  WALL_SELL_PRICE: 100,
  CELL_SIZE: 48,
} as const;

export const LOCATION_COSTS: Record<number, number> = {
  1: 0,
  2: 5000,
};

export function roomCost(roomsBoughtSoFar: number): number {
  return ECONOMY.FIRST_ROOM_COST + roomsBoughtSoFar * ECONOMY.ROOM_COST_INCREMENT;
}
