import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { completeChallenge } from '@/lib/game-db';
import { CHALLENGES_BY_ID } from '@/data/challenges';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { challengeId } = await req.json();
    if (!challengeId || !CHALLENGES_BY_ID.has(challengeId)) {
      return NextResponse.json({ error: 'Invalid challenge' }, { status: 400 });
    }
    const result = await completeChallenge(session.user.id as string, challengeId);
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
