export interface Word {
  id: string;
  term: string;              // English word
  synonyms: string;          // e.g. "syn: Moderately, relatively, somewhat" or "Moderately..."
  phrase: string;            // e.g. "comparatively few disasters" (collocation / first Meaning column)
  turkishMeanings: string[]; // e.g. ["kısmen [zf.]", "nispeten [zf.]"]
  listId: string;            // e.g. "day-19"
  learned: boolean;          // Kept for legacy compatibility
  status?: 'unmarked' | 'learned' | 'struggled'; // Dynamic status state: neutral, success, fail
}

export interface WordList {
  id: string;
  name: string;              // e.g. "Day 19"
  isCustom?: boolean;         // True if user uploaded it
}

export interface StudySession {
  wordIds: string[];
  currentIndex: number;
  mode: 'sequential' | 'shuffled';
  selectedListIds: string[];
}
