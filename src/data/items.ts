import { ECONOMY } from './economy';

export type ItemType = 'floor' | 'walls' | 'placeable' | 'obstacle';
export type Placement = 'floor' | 'wall' | 'ground';

export interface ItemDef {
  id: string;
  type: ItemType;
  name: string;
  asset: string;
  buyPrice: number;
  sellPrice: number;
  gridWidth: number;
  gridHeight: number;
  pixelWidth: number;
  pixelHeight: number;
  placement: Placement;
  inDropPool: boolean;
  isRelationship?: boolean;
}

const C = ECONOMY.CELL_SIZE;

function floor(id: string, name: string, slug: string, variant = 'default'): ItemDef {
  return {
    id, type: 'floor', name, asset: `floors/${slug}/${variant}.png`,
    buyPrice: ECONOMY.FLOOR_BUY_PRICE, sellPrice: ECONOMY.FLOOR_SELL_PRICE,
    gridWidth: 1, gridHeight: 1, pixelWidth: 64, pixelHeight: 64,
    placement: 'floor', inDropPool: true,
  };
}

function wall(id: string, name: string, slug: string, variant = 'default'): ItemDef {
  return {
    id, type: 'walls', name, asset: `walls/${slug}/${variant}.png`,
    buyPrice: ECONOMY.WALL_BUY_PRICE, sellPrice: ECONOMY.WALL_SELL_PRICE,
    gridWidth: 1, gridHeight: 1, pixelWidth: 64, pixelHeight: 64,
    placement: 'wall', inDropPool: true,
  };
}

type PlaceableOpts = Partial<Pick<ItemDef, 'gridWidth' | 'gridHeight' | 'pixelWidth' | 'pixelHeight' | 'placement' | 'isRelationship'>>;

function placeable(id: string, name: string, slug: string, variant = 'default', opts: PlaceableOpts = {}): ItemDef {
  const gw = opts.gridWidth ?? 1;
  const gh = opts.gridHeight ?? 1;
  return {
    id, type: 'placeable', name, asset: `items/${slug}/${variant}.png`,
    buyPrice: ECONOMY.ITEM_BUY_PRICE, sellPrice: ECONOMY.ITEM_SELL_PRICE,
    gridWidth: gw, gridHeight: gh,
    pixelWidth: opts.pixelWidth ?? gw * C,
    pixelHeight: opts.pixelHeight ?? gh * C,
    placement: opts.placement ?? 'ground',
    inDropPool: true,
    isRelationship: opts.isRelationship,
  };
}

function obstacle(id: string, name: string, slug: string, variant = 'default'): ItemDef {
  return {
    id, type: 'obstacle', name, asset: `items/${slug}/${variant}.png`,
    buyPrice: 0, sellPrice: 0,
    gridWidth: 1, gridHeight: 1, pixelWidth: C, pixelHeight: C,
    placement: 'ground', inDropPool: false,
  };
}

const rel = { isRelationship: true } as const;
const wallPlace = { placement: 'wall' as const };
const big = (w: number, h: number) => ({ gridWidth: w, gridHeight: h });

export const ITEMS: ItemDef[] = [
  // ── Floors ──
  floor('floor_wood', 'Wood Floor', 'wood'),
  floor('floor_checkerboard', 'Checkerboard Tile', 'checkerboard'),
  floor('floor_carpet_grey', 'Grey Carpet', 'carpet', 'grey'),
  floor('floor_marble', 'Marble', 'marble'),
  floor('floor_bamboo', 'Bamboo', 'bamboo'),
  floor('floor_dark_hardwood', 'Dark Hardwood', 'dark_hardwood'),
  floor('floor_tile_hexagon', 'Hexagon Tile', 'tile_hexagon'),
  floor('floor_brick', 'Brick', 'brick'),
  floor('floor_laminate', 'Laminate', 'laminate'),
  floor('floor_light_oak', 'Light Oak', 'light_oak'),
  floor('floor_concrete', 'Concrete', 'concrete'),
  floor('floor_parquet', 'Parquet', 'parquet'),

  // ── Walls ──
  wall('wall_cream', 'Cream Walls', 'cream'),
  wall('wall_brown_wood', 'Brown Wood Walls', 'brown_wood'),
  wall('wall_white', 'White Walls', 'white'),
  wall('wall_light_grey', 'Light Grey Walls', 'light_grey'),
  wall('wall_sage_green', 'Sage Green Walls', 'sage_green'),
  wall('wall_exposed_brick', 'Exposed Brick', 'exposed_brick'),
  wall('wall_light_blue', 'Light Blue Walls', 'light_blue'),
  wall('wall_lavender', 'Lavender Walls', 'lavender'),
  wall('wall_beige', 'Beige Walls', 'beige'),
  wall('wall_shiplap', 'Shiplap', 'shiplap'),
  wall('wall_navy_blue', 'Navy Blue Walls', 'navy_blue'),
  wall('wall_peach', 'Peach Walls', 'peach'),

  // ── Relationship placeables ──
  placeable('mila_bed', "Mila's Bed", 'mila_bed', 'default', { ...big(2, 2), ...rel }),
  placeable('oct27_calendar', 'Oct 27 Calendar', 'oct27_calendar', 'default', { ...wallPlace, ...rel }),
  placeable('frat_formal_photo', 'Frat Formal Photo', 'frat_formal_photo', 'default', { ...wallPlace, ...rel }),
  placeable('wpi_sign', 'WPI Sign', 'wpi_sign', 'default', { ...wallPlace, ...rel }),
  placeable('worcester_run_sneakers', 'Worcester Run Sneakers', 'worcester_run_sneakers', 'default', { ...rel }),
  placeable('beach_towel', 'Beach Towel', 'beach_towel', 'default', { ...big(2, 1), ...rel }),
  placeable('dinner_plate', 'Dinner Plate', 'dinner_plate', 'default', { ...rel }),
  placeable('tv_remote', 'TV Remote', 'tv_remote', 'default', { ...rel }),
  placeable('dog_leash', 'Dog Leash', 'dog_leash', 'default', { ...wallPlace, ...rel }),
  placeable('brigid_name_sign', 'Brigid Name Sign', 'wpi_sign', 'default', { ...wallPlace, ...rel }),
  placeable('black_lab_figurine', 'Black Lab Figurine', 'black_lab_figurine', 'default', { ...rel }),
  placeable('apartment_key', 'Apartment Key', 'apartment_key', 'default', { ...rel }),
  placeable('family_photo_frame', 'Family Photo Frame', 'family_photo_frame', 'default', { ...wallPlace, ...rel }),
  placeable('biotech_textbook', 'Biotech Textbook', 'biotech_textbook', 'default', { ...rel }),
  placeable('cs_laptop', 'CS Laptop', 'cs_laptop', 'default', { ...rel }),
  placeable('ma_state_shape', 'MA State Shape', 'ma_state_shape', 'default', { ...wallPlace, ...rel }),
  placeable('show_poster', 'Show Poster', 'show_poster', 'default', { ...wallPlace, ...rel }),
  placeable('cooking_pot', 'Cooking Pot', 'cooking_pot', 'default', { ...rel }),
  placeable('beach_umbrella', 'Beach Umbrella', 'beach_umbrella', 'default', { ...big(2, 2), ...rel }),
  placeable('graduation_cap', 'Graduation Cap', 'graduation_cap', 'default', { ...rel }),

  // ── Generic placeables (ground) ──
  placeable('chair_wood', 'Wood Chair', 'chair', 'wood'),
  placeable('chair_dining', 'Dining Chair', 'chair', 'dining'),
  placeable('armchair', 'Armchair', 'armchair', 'default', big(2, 2)),
  placeable('bookshelf_small', 'Small Bookshelf', 'bookshelf', 'small', big(1, 2)),
  placeable('bookshelf_large', 'Large Bookshelf', 'bookshelf', 'large', big(2, 2)),
  placeable('nightstand', 'Nightstand', 'nightstand'),
  placeable('table_lamp', 'Table Lamp', 'table_lamp', 'classic'),
  placeable('floor_lamp', 'Floor Lamp', 'floor_lamp', 'arc', big(1, 2)),
  placeable('couch_sectional', 'Sectional Couch', 'couch', 'sectional', big(3, 2)),
  placeable('couch_loveseat', 'Loveseat', 'couch', 'loveseat', big(2, 1)),
  placeable('coffee_table', 'Coffee Table', 'coffee_table', 'rectangular', big(2, 1)),
  placeable('side_table', 'Side Table', 'side_table'),
  placeable('potted_plant', 'Potted Plant', 'potted_plant', 'fern'),
  placeable('rug_medium', 'Medium Rug', 'rug', 'medium', big(3, 2)),
  placeable('rug_small', 'Small Rug', 'rug', 'small', big(2, 1)),
  placeable('desk', 'Writing Desk', 'desk', 'writing', big(2, 1)),
  placeable('bed_double', 'Double Bed', 'bed', 'double', big(2, 3)),
  placeable('dresser', 'Dresser', 'dresser', 'low', big(2, 1)),
  placeable('wardrobe', 'Wardrobe', 'wardrobe', 'default', big(2, 2)),
  placeable('sink', 'Sink', 'sink', 'single'),
  placeable('stove', 'Stove', 'stove', 'default', big(2, 1)),
  placeable('fridge', 'Fridge', 'fridge', 'default', big(1, 2)),
  placeable('trash_can', 'Trash Can', 'trash_can'),
  placeable('blanket', 'Blanket', 'blanket'),
  placeable('candle', 'Candle', 'candle'),
  placeable('vase', 'Vase', 'vase', 'tall'),
  placeable('ottoman', 'Ottoman', 'ottoman'),
  placeable('tv_stand', 'TV Stand', 'tv_stand', 'default', big(2, 1)),
  placeable('bench', 'Entry Bench', 'bench', 'entry', big(2, 1)),
  placeable('office_chair', 'Office Chair', 'office_chair'),
  placeable('coat_rack', 'Coat Rack', 'coat_rack'),
  placeable('book_stack', 'Book Stack', 'book_stack'),
  placeable('throw_pillows', 'Throw Pillows', 'throw_pillows'),
  placeable('kitchen_island', 'Kitchen Island', 'kitchen_island', 'default', big(3, 2)),
  placeable('microwave', 'Microwave', 'microwave'),
  placeable('toaster', 'Toaster', 'toaster'),
  placeable('kettle', 'Kettle', 'kettle'),

  // ── Generic placeables (wall) ──
  placeable('window_basic', 'Basic Window', 'window', 'basic', wallPlace),
  placeable('window_bay', 'Bay Window', 'window', 'bay', { ...wallPlace, ...big(2, 1) }),
  placeable('mirror_round', 'Round Mirror', 'mirror', 'round', wallPlace),
  placeable('picture_frame', 'Picture Frame', 'picture_frame', 'generic', wallPlace),
  placeable('wall_shelf', 'Wall Shelf', 'wall_shelf', 'single', wallPlace),
  placeable('clock_wall', 'Wall Clock', 'clock', 'wall', wallPlace),
  placeable('curtains', 'Curtains', 'curtains', 'default', { ...wallPlace, ...big(1, 2) }),
  placeable('ceiling_light', 'Ceiling Light', 'ceiling_light'),

  // ── Obstacles (tutorial) ──
  obstacle('obstacle_hole', 'Hole in Floor', 'obstacle'),
  obstacle('obstacle_broken', 'Broken Debris', 'obstacle'),
  obstacle('obstacle_mess', 'Mess', 'obstacle'),
];

export const ITEMS_BY_ID = new Map(ITEMS.map(i => [i.id, i]));
export const DROP_POOL = ITEMS.filter(i => i.inDropPool).map(i => i.id);
export const SHOP_ITEMS = ITEMS.filter(i => i.inDropPool);

export function getRandomReward(): string {
  return DROP_POOL[Math.floor(Math.random() * DROP_POOL.length)];
}
