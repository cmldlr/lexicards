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

export interface StudyHistoryEntry {
  id: string;
  startedAt: string;
  completedAt: string;
  lists: Array<Pick<WordList, 'id' | 'name'>>;
  studyType: 'card' | 'quiz';
  studyMode: 'sequential' | 'shuffled';
  filterMode: 'all' | 'unlearned' | 'learned';
  quizMode?: 'syn-to-word' | 'word-to-syn' | 'word-to-tr' | 'tr-to-word';
  wordCount: number;
  successRate: number;
  correct?: number;
  wrong?: number;
  unanswered?: number;
  learnedCount?: number;
  sourceType?: 'vocabulary' | 'combinations';
  combinationMode?: 'cards' | 'completion';
}

export interface CombinationCollection {
  id: string;
  name: string;
  fileName: string;
  importedAt: string;
}

export interface CommonCombination {
  id: string;
  collectionId: string;
  family: 'verb' | 'adjective' | 'noun' | 'prep-noun' | 'other';
  section: string;
  pattern: string;
  expression: string;
  meaning: string;
  answer: string;
  acceptedAnswers: string[];
  clozePrompt: string;
  status: 'unmarked' | 'learned' | 'struggled';
}
