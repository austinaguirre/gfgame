import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { buyRoom, buyLocation, buyItem } from '@/lib/game-db';
import { LOCATIONS_BY_ID } from '@/data/locations';
import { getRoomDef } from '@/data/rooms';
import { ITEMS_BY_ID } from '@/data/items';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id as string;

  try {
    const { type, locationId, roomIndex, itemId } = await req.json();

    if (type === 'room') {
      if (!getRoomDef(locationId, roomIndex)) {
        return NextResponse.json({ error: 'Invalid room' }, { status: 400 });
      }
      const progress = await buyRoom(userId, locationId, roomIndex);
      return NextResponse.json({ progress });
    }

    if (type === 'location') {
      const loc = LOCATIONS_BY_ID.get(locationId);
      if (!loc) return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
      const progress = await buyLocation(userId, locationId, loc.unlockCost);
      return NextResponse.json({ progress });
    }

    if (type === 'item') {
      if (!ITEMS_BY_ID.has(itemId)) {
        return NextResponse.json({ error: 'Invalid item' }, { status: 400 });
      }
      const progress = await buyItem(userId, itemId);
      return NextResponse.json({ progress });
    }

    return NextResponse.json({ error: 'Invalid purchase type' }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
