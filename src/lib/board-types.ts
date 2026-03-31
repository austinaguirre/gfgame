export type BoardSummary = {
  id: string;
  title: string;
  updated_at: string;
};

export type BoardNoteDTO = {
  id: string;
  body: string;
  created_by: string;
  created_by_username: string;
  created_at: string;
};

export type BoardCardDTO = {
  id: string;
  title: string;
  position: number;
  created_by: string;
  created_by_username: string;
  created_at: string;
  updated_at: string;
  notes: BoardNoteDTO[];
};

export type BoardColumnDTO = {
  id: string;
  title: string;
  position: number;
  cards: BoardCardDTO[];
};

export type BoardDetailDTO = {
  id: string;
  title: string;
  updated_at: string;
  columns: BoardColumnDTO[];
};
