export interface ChallengeDef {
  id: string;
  type: 'snake' | 'worcester_run';
  name: string;
  description: string;
  winScore: number;
}

export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'snake_mila',
    type: 'snake',
    name: "Mila's Treat Hunt",
    description: 'Help Mila eat treats! Reach 10 points to win.',
    winScore: 10,
  },
  {
    id: 'worcester_run',
    type: 'worcester_run',
    name: 'Worcester Run',
    description: 'Run home through Worcester at night! Dodge obstacles and reach 10 points.',
    winScore: 10,
  },
];

export const CHALLENGES_BY_ID = new Map(CHALLENGES.map(c => [c.id, c]));
