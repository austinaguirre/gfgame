'use client';

import { SHOP_ITEMS, type ItemDef } from '@/data/items';

interface ShopContentProps {
  money: number;
  onBuy: (itemId: string) => void;
}

const CATEGORIES = [
  { label: 'Floors', filter: (i: ItemDef) => i.type === 'floor' },
  { label: 'Walls', filter: (i: ItemDef) => i.type === 'walls' },
  { label: 'Furniture', filter: (i: ItemDef) => i.type === 'placeable' && !i.isRelationship },
  { label: 'Special', filter: (i: ItemDef) => i.type === 'placeable' && !!i.isRelationship },
] as const;

function ItemCard({ item, money, onBuy }: { item: ItemDef; money: number; onBuy: (id: string) => void }) {
  const canAfford = money >= item.buyPrice;
  return (
    <div className="flex items-center gap-3 rounded-lg bg-zinc-800 px-3 py-2">
      <div
        className="w-10 h-10 rounded bg-zinc-700 bg-cover bg-center shrink-0"
        style={{ backgroundImage: `url(/game/${item.asset})` }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 truncate">{item.name}</p>
        <p className="text-xs text-zinc-500">{item.gridWidth}×{item.gridHeight}</p>
      </div>
      <button
        onClick={() => onBuy(item.id)}
        disabled={!canAfford}
        className={`rounded px-3 py-1 text-xs font-medium ${
          canAfford ? 'bg-emerald-700 text-white hover:bg-emerald-600' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
        }`}
      >
        ${item.buyPrice}
      </button>
    </div>
  );
}

export function ShopContent({ money, onBuy }: ShopContentProps) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-amber-400 font-medium">Balance: ${money}</p>
      {CATEGORIES.map(cat => {
        const items = SHOP_ITEMS.filter(cat.filter);
        if (items.length === 0) return null;
        return (
          <div key={cat.label}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">{cat.label}</h3>
            <div className="space-y-1">
              {items.map(item => (
                <ItemCard key={item.id} item={item} money={money} onBuy={onBuy} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
