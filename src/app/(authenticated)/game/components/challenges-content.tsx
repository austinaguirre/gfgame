'use client';

import { CHALLENGES } from '@/data/challenges';
import { ECONOMY } from '@/data/economy';

interface ChallengesContentProps {
  onStartChallenge: (challengeId: string) => void;
}

export function ChallengesContent({ onStartChallenge }: ChallengesContentProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">
        Complete challenges to earn <span className="text-amber-400">${ECONOMY.MONEY_PER_WIN}</span> and a random item!
      </p>
      {CHALLENGES.map(ch => (
        <div key={ch.id} className="flex items-center gap-4 rounded-lg bg-zinc-800 p-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-zinc-100">{ch.name}</h3>
            <p className="text-xs text-zinc-400 mt-1">{ch.description}</p>
          </div>
          <button
            onClick={() => onStartChallenge(ch.id)}
            className="rounded bg-purple-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-purple-600"
          >
            Play
          </button>
        </div>
      ))}
    </div>
  );
}
