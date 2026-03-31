'use client';

import { ITEMS_BY_ID } from '@/data/items';

interface InventoryPanelProps {
  open: boolean;
  inventory: string[];
  editMode: boolean;
  onClose: () => void;
  onSelectItem: (itemId: string) => void;
  onSellItem: (itemId: string) => void;
}

function groupInventory(inventory: string[]): { itemId: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const id of inventory) counts.set(id, (counts.get(id) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([itemId, count]) => ({ itemId, count }))
    .sort((a, b) => a.itemId.localeCompare(b.itemId));
}

export function InventoryPanel({ open, inventory, editMode, onClose, onSelectItem, onSellItem }: InventoryPanelProps) {
  if (!open) return null;
  const grouped = groupInventory(inventory);

  return (
    <div className="absolute right-0 top-0 bottom-0 z-30 flex flex-col w-64 border-l border-zinc-700 bg-zinc-900/95 backdrop-blur">
      <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-2">
        <h3 className="text-sm font-semibold text-zinc-100">Inventory ({inventory.length})</h3>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100">×</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {grouped.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-8">No items yet. Complete challenges to earn items!</p>
        )}
        {grouped.map(({ itemId, count }) => {
          const def = ITEMS_BY_ID.get(itemId);
          if (!def) return null;
          return (
            <div
              key={itemId}
              className="flex items-center justify-between rounded-md bg-zinc-800 px-3 py-2 text-sm"
              {...(editMode && {
                draggable: true,
                onDragStart: (e: React.DragEvent) => {
                  e.dataTransfer.setData('text/plain', itemId);
                  e.dataTransfer.effectAllowed = 'copy';
                },
              })}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-8 h-8 rounded bg-zinc-700 bg-cover bg-center shrink-0"
                  style={{ backgroundImage: `url(/game/${def.asset})` }}
                />
                <div className="min-w-0">
                  <p className="text-zinc-200 truncate">{def.name}</p>
                  <p className="text-xs text-zinc-500">×{count}</p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {editMode && (
                  <button
                    onClick={() => onSelectItem(itemId)}
                    className="rounded bg-emerald-700 px-2 py-0.5 text-xs text-white hover:bg-emerald-600"
                  >
                    Place
                  </button>
                )}
                {!editMode && (
                  <button
                    onClick={() => onSellItem(itemId)}
                    className="rounded bg-amber-700 px-2 py-0.5 text-xs text-white hover:bg-amber-600"
                  >
                    ${def.sellPrice}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
