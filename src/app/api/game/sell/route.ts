import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { sellItem } from '@/lib/game-db';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { itemId } = await req.json();
    if (!itemId) return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
    const progress = await sellItem(session.user.id as string, itemId);
    return NextResponse.json({ progress });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
