'use client';

interface BottomBarProps {
  money: number;
  inventoryCount: number;
  editMode: boolean;
  inChallenge: boolean;
  locationName: string;
  onToggleEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onOpenInventory: () => void;
  onOpenShop: () => void;
  onOpenLocations: () => void;
  onOpenChallenges: () => void;
  onOpenRooms: () => void;
}

function BarButton({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-emerald-600 text-white'
          : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
      }`}
    >
      {label}
    </button>
  );
}

export function BottomBar(props: BottomBarProps) {
  const {
    money, inventoryCount, editMode, inChallenge, locationName,
    onToggleEdit, onSave, onCancel,
    onOpenInventory, onOpenShop, onOpenLocations, onOpenChallenges, onOpenRooms,
  } = props;

  return (
    <div className="flex items-center justify-between gap-2 border-t border-zinc-700 bg-zinc-900 px-4 py-2 text-sm">
      {/* Left: stats */}
      <div className="flex items-center gap-4 text-zinc-300">
        <span className="font-medium text-amber-400">${money}</span>
        <span>{inventoryCount} items</span>
        <span className="text-zinc-500">{locationName}</span>
      </div>

      {/* Center: actions */}
      {!inChallenge && (
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <BarButton label="Save" onClick={onSave} active />
              <BarButton label="Cancel" onClick={onCancel} />
              <BarButton label="Inventory" onClick={onOpenInventory} />
            </>
          ) : (
            <>
              <BarButton label="Edit" onClick={onToggleEdit} />
              <BarButton label="Inventory" onClick={onOpenInventory} />
              <BarButton label="Shop" onClick={onOpenShop} />
              <BarButton label="Rooms" onClick={onOpenRooms} />
              <BarButton label="Locations" onClick={onOpenLocations} />
              <BarButton label="Challenges" onClick={onOpenChallenges} />
            </>
          )}
        </div>
      )}

      {/* Right: edit controls */}
      {editMode && (
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="text-xs">Right-click drag to pan · Scroll to zoom</span>
        </div>
      )}
    </div>
  );
}
