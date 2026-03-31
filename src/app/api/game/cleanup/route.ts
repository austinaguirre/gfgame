import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { cleanupObstacle } from '@/lib/game-db';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { locationId, roomIndex, placementIndex } = await req.json();
    if (typeof locationId !== 'number' || typeof roomIndex !== 'number' || typeof placementIndex !== 'number') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const result = await cleanupObstacle(
      session.user.id as string, locationId, roomIndex, placementIndex,
    );
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
