import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { travel } from '@/lib/game-db';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { locationId } = await req.json();
    if (typeof locationId !== 'number') {
      return NextResponse.json({ error: 'Invalid locationId' }, { status: 400 });
    }
    const progress = await travel(session.user.id as string, locationId);
    return NextResponse.json({ progress });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
