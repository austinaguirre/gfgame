export interface ComboDef {
  id: string;
  trigger:
    | { type: 'item_placed'; itemId: string }
    | { type: 'items_placed'; itemIds: string[] };
  reaction:
    | { type: 'popup'; text: string }
    | { type: 'room_label'; label: string };
}

export const COMBOS: ComboDef[] = [
  {
    id: 'combo_mila_bed',
    trigger: { type: 'item_placed', itemId: 'mila_bed' },
    reaction: { type: 'popup', text: '🐾 Mila curls up… the room feels cozier already.' },
  },
  {
    id: 'combo_oct27',
    trigger: { type: 'item_placed', itemId: 'oct27_calendar' },
    reaction: { type: 'popup', text: 'The day we say we started.' },
  },
  {
    id: 'combo_frat_formal',
    trigger: { type: 'item_placed', itemId: 'frat_formal_photo' },
    reaction: { type: 'popup', text: 'First date.' },
  },
  {
    id: 'combo_worcester_sneakers',
    trigger: { type: 'item_placed', itemId: 'worcester_run_sneakers' },
    reaction: { type: 'popup', text: 'Home safe. 🏠' },
  },
  {
    id: 'combo_beach',
    trigger: { type: 'items_placed', itemIds: ['beach_towel', 'beach_umbrella'] },
    reaction: { type: 'popup', text: 'Beach day vibes! 🏖️' },
  },
  {
    id: 'combo_family_photo',
    trigger: { type: 'item_placed', itemId: 'family_photo_frame' },
    reaction: { type: 'popup', text: 'Jack, Ted & Alison.' },
  },
  {
    id: 'combo_brigid_sign',
    trigger: { type: 'item_placed', itemId: 'brigid_name_sign' },
    reaction: { type: 'room_label', label: "Brigid's Room" },
  },
];

export const COMBOS_BY_ID = new Map(COMBOS.map(c => [c.id, c]));

export function evaluateCombos(
  placedItemIds: string[],
  alreadyTriggered: Set<string>,
): ComboDef[] {
  const placed = new Set(placedItemIds);
  return COMBOS.filter(c => {
    if (alreadyTriggered.has(c.id)) return false;
    if (c.trigger.type === 'item_placed') return placed.has(c.trigger.itemId);
    return c.trigger.itemIds.every(id => placed.has(id));
  });
}
