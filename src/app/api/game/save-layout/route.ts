import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { saveRoomLayout } from '@/lib/game-db';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { locationId, roomIndex, floorItemId, wallItemId, placements } = await req.json();
    if (typeof locationId !== 'number' || typeof roomIndex !== 'number') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const result = await saveRoomLayout(
      session.user.id as string, locationId, roomIndex,
      floorItemId ?? null, wallItemId ?? null, placements ?? [],
    );
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
