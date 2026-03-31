'use client';

import { LOCATIONS } from '@/data/locations';
import { getRoomsByLocation } from '@/data/rooms';

interface LocationsContentProps {
  money: number;
  ownedLocations: number[];
  currentLocationId: number;
  ownedRooms: Record<string, number[]>;
  onBuyLocation: (locationId: number) => void;
  onTravel: (locationId: number) => void;
  onBuyRoom: (locationId: number, roomIndex: number) => void;
}

export function LocationsContent({
  money, ownedLocations, currentLocationId, ownedRooms,
  onBuyLocation, onTravel, onBuyRoom,
}: LocationsContentProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-amber-400 font-medium">Balance: ${money}</p>
      {LOCATIONS.map(loc => {
        const owned = ownedLocations.includes(loc.id);
        const isCurrent = currentLocationId === loc.id;
        const rooms = getRoomsByLocation(loc.id);
        const myRooms = ownedRooms[String(loc.id)] ?? [];

        return (
          <div key={loc.id} className="rounded-lg bg-zinc-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">{loc.name}</h3>
                <p className="text-xs text-zinc-500">{loc.biome} · max {loc.maxRooms} rooms</p>
              </div>
              {!owned && (
                <button
                  onClick={() => onBuyLocation(loc.id)}
                  disabled={money < loc.unlockCost}
                  className={`rounded px-3 py-1 text-xs font-medium ${
                    money >= loc.unlockCost
                      ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                      : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  Unlock ${loc.unlockCost}
                </button>
              )}
              {owned && !isCurrent && (
                <button
                  onClick={() => onTravel(loc.id)}
                  className="rounded bg-blue-700 px-3 py-1 text-xs text-white hover:bg-blue-600"
                >
                  Travel
                </button>
              )}
              {isCurrent && (
                <span className="text-xs text-emerald-400 font-medium">Current</span>
              )}
            </div>
            {owned && (
              <div className="space-y-1 mt-2">
                {rooms.map(room => {
                  const hasRoom = myRooms.includes(room.roomIndex);
                  return (
                    <div key={room.roomIndex} className="flex items-center justify-between text-xs">
                      <span className={hasRoom ? 'text-zinc-300' : 'text-zinc-600'}>
                        {room.name} ({room.gridWidth}×{room.gridHeight})
                      </span>
                      {!hasRoom && (
                        <button
                          onClick={() => onBuyRoom(loc.id, room.roomIndex)}
                          className="rounded bg-zinc-700 px-2 py-0.5 text-zinc-300 hover:bg-zinc-600"
                        >
                          Buy
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
