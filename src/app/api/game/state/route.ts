import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getGameState } from '@/lib/game-db';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.user.is_active) return NextResponse.json({ error: 'Inactive' }, { status: 403 });

  try {
    const state = await getGameState(session.user.id as string);
    return NextResponse.json(state);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
