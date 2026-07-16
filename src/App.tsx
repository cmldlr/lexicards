import React, { useState, useEffect } from 'react';
import { StudyHistoryEntry, Word, WordList } from './types';
import { parseCSV, defaultCSVData, speakWord } from './utils';
import StatsView from './components/StatsView';
import CSVImporter from './components/CSVImporter';
import CardView from './components/CardView';
import QuizView from './components/QuizView';
import WordExplorer from './components/WordExplorer';
import ListInspectorModal from './components/ListInspectorModal';
import StudyHistoryView from './components/StudyHistoryView';
import { 
  BookOpen, 
  RotateCcw, 
  Play, 
  BookMarked, 
  Settings, 
  HelpCircle, 
  ArrowLeft, 
  Award, 
  Sparkles, 
  Trash2, 
  Plus, 
  Layers, 
  ChevronRight, 
  CheckCircle2,
  CheckCircle,
  FolderOpen,
  GraduationCap,
  Sparkle,
  Lock,
  LogOut,
  Volume2,
  VolumeX,
  History,
  Search,
  ChevronDown,
  MoreVertical,
  X,
  Vibrate
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuizChoiceSnapshot {
  id: string;
  term: string;
  synonyms: string;
  turkishMeanings: string[];
}

interface QuizAnswerSnapshot {
  choices: QuizChoiceSnapshot[];
  selectedId: string | null;
  isAnswered: boolean;
  isCorrect: boolean;
}

interface PersistedStudySession {
  version: 1;
  sessionWords: Word[];
  currentIndex: number;
  isFlipped: boolean;
  quizAnswers: Record<string, QuizAnswerSnapshot>;
  quizNavDirection: 1 | -1;
  startedAt: string;
  lists: Array<Pick<WordList, 'id' | 'name'>>;
  studyMode: 'sequential' | 'shuffled';
  filterMode: 'all' | 'unlearned' | 'learned';
  studyType: 'card' | 'quiz';
  quizMode: 'syn-to-word' | 'word-to-syn' | 'word-to-tr' | 'tr-to-word';
}

const STUDY_HISTORY_STORAGE_KEY = 'lexicards_study_history';
const PRONUNCIATION_STORAGE_KEY = 'lexicards_pronunciation_enabled';
const HAPTICS_STORAGE_KEY = 'lexicards_haptics_enabled';
const ACTIVE_STUDY_STORAGE_KEY = 'lexicards_active_study';
const ACTIVE_TAB_STORAGE_KEY = 'lexicards_active_tab';

const loadPersistedStudySession = (): PersistedStudySession | null => {
  try {
    const savedSession = localStorage.getItem(ACTIVE_STUDY_STORAGE_KEY);
    if (!savedSession) return null;
    const parsedSession = JSON.parse(savedSession) as PersistedStudySession;
    if (
      parsedSession.version !== 1
      || !Array.isArray(parsedSession.sessionWords)
      || parsedSession.sessionWords.length === 0
      || !Number.isInteger(parsedSession.currentIndex)
    ) {
      localStorage.removeItem(ACTIVE_STUDY_STORAGE_KEY);
      return null;
    }
    return parsedSession;
  } catch (error) {
    console.error('Error loading active study session', error);
    localStorage.removeItem(ACTIVE_STUDY_STORAGE_KEY);
    return null;
  }
};

export default function App() {
  const [restoredStudySession] = useState(loadPersistedStudySession);
  const [lists, setLists] = useState<WordList[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('lexicards_auth') === 'true');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [studyHistory, setStudyHistory] = useState<StudyHistoryEntry[]>(() => {
    try {
      const savedHistory = localStorage.getItem(STUDY_HISTORY_STORAGE_KEY);
      if (!savedHistory) return [];
      const parsedHistory = JSON.parse(savedHistory);
      return Array.isArray(parsedHistory) ? parsedHistory : [];
    } catch (error) {
      console.error('Error loading study history', error);
      return [];
    }
  });
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'collections' | 'study' | 'history' | 'library' | 'import'>(() => {
    if (restoredStudySession) return 'study';
    const savedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    return savedTab && ['collections', 'study', 'history', 'library', 'import'].includes(savedTab)
      ? savedTab as 'collections' | 'study' | 'history' | 'library' | 'import'
      : 'collections';
  });
  
  // Dashboard states
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [studyMode, setStudyMode] = useState<'sequential' | 'shuffled'>(restoredStudySession?.studyMode ?? 'sequential');
  const [filterMode, setFilterMode] = useState<'all' | 'unlearned' | 'learned'>(restoredStudySession?.filterMode ?? 'all');
  const [studyType, setStudyType] = useState<'card' | 'quiz'>(restoredStudySession?.studyType ?? 'card');
  const [quizMode, setQuizMode] = useState<'syn-to-word' | 'word-to-syn' | 'word-to-tr' | 'tr-to-word'>(restoredStudySession?.quizMode ?? 'syn-to-word');
  const [collectionQuery, setCollectionQuery] = useState('');
  const [collectionVisibility, setCollectionVisibility] = useState<'all' | 'selected' | 'unselected'>('all');
  const [collectionSort, setCollectionSort] = useState<'default' | 'name-asc' | 'name-desc' | 'count-desc' | 'count-asc'>('default');
  const [isSessionSettingsExpanded, setIsSessionSettingsExpanded] = useState(false);
  const [isCollectionSheetOpen, setIsCollectionSheetOpen] = useState(false);
  const [isMobileHeaderMenuOpen, setIsMobileHeaderMenuOpen] = useState(false);
  
  // Active study states
  const [isStudying, setIsStudying] = useState(restoredStudySession !== null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionWords, setSessionWords] = useState<Word[]>(restoredStudySession?.sessionWords ?? []);
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!restoredStudySession) return 0;
    return Math.min(Math.max(restoredStudySession.currentIndex, 0), restoredStudySession.sessionWords.length - 1);
  });
  const [isFlipped, setIsFlipped] = useState(restoredStudySession?.isFlipped ?? false);
  const [isPronunciationEnabled, setIsPronunciationEnabled] = useState(
    () => localStorage.getItem(PRONUNCIATION_STORAGE_KEY) !== 'false',
  );
  const [isHapticsEnabled, setIsHapticsEnabled] = useState(
    () => localStorage.getItem(HAPTICS_STORAGE_KEY) === 'true',
  );
  const [quizAnswers, setQuizAnswers] = useState<Record<string, QuizAnswerSnapshot>>(restoredStudySession?.quizAnswers ?? {});
  const [quizNavDirection, setQuizNavDirection] = useState<1 | -1>(restoredStudySession?.quizNavDirection ?? 1);
  const sessionStartedAtRef = React.useRef(restoredStudySession?.startedAt ?? new Date().toISOString());
  const sessionListSnapshotRef = React.useRef<Array<Pick<WordList, 'id' | 'name'>>>(restoredStudySession?.lists ?? []);
  const completionRecordedRef = React.useRef(false);

  // Modal inspection states
  const [inspectingListId, setInspectingListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');

  // Load from LocalStorage or Fallback to embedded default Day 19-26 CSV
  useEffect(() => {
    const savedLists = localStorage.getItem('vocab_lists');
    const savedWords = localStorage.getItem('vocab_words');

    if (savedLists && savedWords) {
      try {
        setLists(JSON.parse(savedLists));
        setWords(JSON.parse(savedWords));
      } catch (e) {
        console.error('Error loading saved vocab, reloading defaults', e);
        loadDefaultData();
      }
    } else {
      loadDefaultData();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PRONUNCIATION_STORAGE_KEY, String(isPronunciationEnabled));
  }, [isPronunciationEnabled]);

  useEffect(() => {
    localStorage.setItem(HAPTICS_STORAGE_KEY, String(isHapticsEnabled));
  }, [isHapticsEnabled]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!isStudying || isCompleted || sessionWords.length === 0) {
      localStorage.removeItem(ACTIVE_STUDY_STORAGE_KEY);
      return;
    }

    const activeSession: PersistedStudySession = {
      version: 1,
      sessionWords,
      currentIndex,
      isFlipped,
      quizAnswers,
      quizNavDirection,
      startedAt: sessionStartedAtRef.current,
      lists: sessionListSnapshotRef.current,
      studyMode,
      filterMode,
      studyType,
      quizMode,
    };

    const persistSession = () => {
      try {
        localStorage.setItem(ACTIVE_STUDY_STORAGE_KEY, JSON.stringify(activeSession));
      } catch (error) {
        console.error('Error saving active study session', error);
      }
    };
    const persistWhenHidden = () => {
      if (document.visibilityState === 'hidden') persistSession();
    };

    persistSession();
    document.addEventListener('visibilitychange', persistWhenHidden);
    window.addEventListener('pagehide', persistSession);
    return () => {
      document.removeEventListener('visibilitychange', persistWhenHidden);
      window.removeEventListener('pagehide', persistSession);
    };
  }, [
    currentIndex,
    filterMode,
    isCompleted,
    isFlipped,
    isStudying,
    quizAnswers,
    quizMode,
    quizNavDirection,
    sessionWords,
    studyMode,
    studyType,
  ]);

  useEffect(() => {
    if (!isCollectionSheetOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCollectionSheetOpen]);

  const loadDefaultData = () => {
    const { lists: parsedLists, words: parsedWords } = parseCSV(defaultCSVData);
    setLists(parsedLists);
    setWords(parsedWords);
    saveToLocalStorage(parsedLists, parsedWords);
    
    // Auto-select Day 19 on first launch
    if (parsedLists.length > 0) {
      setSelectedListIds([parsedLists[0].id]);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('Verilerinizi ilk günkü varsayılan kelimelere (Day 19-26) döndürmek istiyor musunuz?')) {
      loadDefaultData();
    }
    setIsMobileHeaderMenuOpen(false);
  };

  const saveToLocalStorage = (currentLists: WordList[], currentWords: Word[]) => {
    localStorage.setItem('vocab_lists', JSON.stringify(currentLists));
    localStorage.setItem('vocab_words', JSON.stringify(currentWords));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (loginUsername.trim() === 'admin' && loginPassword === '123456') {
      localStorage.setItem('lexicards_auth', 'true');
      setIsAuthenticated(true);
      setLoginUsername('');
      setLoginPassword('');
      setLoginError('');
      return;
    }

    setLoginError('Kullanıcı adı veya şifre hatalı.');
  };

  const handleLogout = () => {
    localStorage.removeItem('lexicards_auth');
    setIsMobileHeaderMenuOpen(false);
    setIsAuthenticated(false);
    setLoginPassword('');
  };

  const handleTabChange = (tab: 'collections' | 'study' | 'history' | 'library' | 'import') => {
    setIsStudying(false);
    setInspectingListId(null);
    setIsCollectionSheetOpen(false);
    setIsMobileHeaderMenuOpen(false);
    setActiveTab(tab);
  };

  // Import Handler
  const handleImport = (newLists: WordList[], newWords: Word[]) => {
    // Merge lists by checking existing ID
    const mergedLists = [...lists];
    newLists.forEach(nl => {
      if (!mergedLists.some(ol => ol.id === nl.id)) {
        mergedLists.push(nl);
      }
    });

    // Merge words by replacing existing terms if they overlap in the same list
    const mergedWords = [...words];
    newWords.forEach(nw => {
      const existingIdx = mergedWords.findIndex(ow => ow.listId === nw.listId && ow.term.toLowerCase() === nw.term.toLowerCase());
      if (existingIdx > -1) {
        mergedWords[existingIdx] = nw; // update with newer record
      } else {
        mergedWords.push(nw);
      }
    });

    setLists(mergedLists);
    setWords(mergedWords);
    saveToLocalStorage(mergedLists, mergedWords);

    // Auto-select newly imported lists
    setSelectedListIds(newLists.map(l => l.id));
  };

  // Word CRUD & Status toggles
  const handleUpdateWord = (updatedWord: Word) => {
    const nextWords = words.map(w => w.id === updatedWord.id ? updatedWord : w);
    setWords(nextWords);
    saveToLocalStorage(lists, nextWords);

    // Sync active study session state if currently active
    if (isStudying) {
      const nextSessionWords = sessionWords.map(w => w.id === updatedWord.id ? updatedWord : w);
      setSessionWords(nextSessionWords);
    }
  };

  const handleDeleteWord = (wordId: string) => {
    const nextWords = words.filter(w => w.id !== wordId);
    setWords(nextWords);
    saveToLocalStorage(lists, nextWords);
  };

  const handleDeleteList = (listId: string) => {
    const nextLists = lists.filter(l => l.id !== listId);
    const nextWords = words.filter(w => w.listId !== listId);
    setLists(nextLists);
    setWords(nextWords);
    setSelectedListIds(selectedListIds.filter(id => id !== listId));
    saveToLocalStorage(nextLists, nextWords);
  };

  const handleDeleteLists = (listIdsToDelete: string[]) => {
    const nextLists = lists.filter(l => !listIdsToDelete.includes(l.id));
    const nextWords = words.filter(w => !listIdsToDelete.includes(w.listId));
    setLists(nextLists);
    setWords(nextWords);
    setSelectedListIds(selectedListIds.filter(id => !listIdsToDelete.includes(id)));
    saveToLocalStorage(nextLists, nextWords);
  };

  const handleResetLearned = () => {
    const nextWords = words.map(w => ({ ...w, learned: false }));
    setWords(nextWords);
    saveToLocalStorage(lists, nextWords);
  };

  // List selection utility toggles
  const handleToggleListId = (id: string) => {
    if (selectedListIds.includes(id)) {
      setSelectedListIds(selectedListIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedListIds([...selectedListIds, id]);
    }
  };

  const handleSelectAllLists = () => {
    setSelectedListIds(lists.map(l => l.id));
  };

  const handleClearListSelection = () => {
    setSelectedListIds([]);
  };

  // Add list collection
  const handleAddList = (listName: string): string => {
    const newListId = 'list_' + Date.now() + Math.random().toString(36).substr(2, 9);
    const newList: WordList = {
      id: newListId,
      name: listName.trim()
    };
    const nextLists = [...lists, newList];
    setLists(nextLists);
    saveToLocalStorage(nextLists, words);
    return newListId;
  };

  // Add word to master lists
  const handleAddWord = (wordData: { term: string; synonyms: string; phrase: string; turkishMeanings: string[]; listId: string }) => {
    const newWord: Word = {
      ...wordData,
      id: 'word_' + Date.now() + Math.random().toString(36).substr(2, 9),
      learned: false
    };
    const nextWords = [...words, newWord];
    setWords(nextWords);
    saveToLocalStorage(lists, nextWords);
  };

  // Prepare & Start Study session
  const handleStartStudy = () => {
    if (selectedListIds.length === 0) return;

    // Get all words matching selected lists
    let candidates = words.filter(w => selectedListIds.includes(w.listId));

    // Filter by learned mode
    if (filterMode === 'unlearned') {
      candidates = candidates.filter(w => {
        const currentStatus = w.status || (w.learned ? 'learned' : 'unmarked');
        return currentStatus !== 'learned';
      });
    } else if (filterMode === 'learned') {
      candidates = candidates.filter(w => {
        const currentStatus = w.status || (w.learned ? 'learned' : 'unmarked');
        return currentStatus === 'learned';
      });
    }

    // Filter by quiz mode requirements
    if (studyType === 'quiz') {
      if (quizMode === 'word-to-tr' || quizMode === 'tr-to-word') {
        candidates = candidates.filter(w => w.turkishMeanings.length > 0);
      } else {
        candidates = candidates.filter(w => w.synonyms && w.synonyms.trim() !== '');
      }
    }

    if (candidates.length === 0) {
      if (studyType === 'quiz') {
        alert(quizMode === 'word-to-tr' || quizMode === 'tr-to-word'
          ? 'Seçilen kriterlerde Türkçe anlamı olan çalışılacak kelime kalmadı! Lütfen farklı bir liste seçin veya kelime ekleyin.'
          : 'Seçilen kriterlerde eş anlamlısı (syn) olan çalışılacak kelime kalmadı! Lütfen farklı bir liste seçin veya kelime ekleyin.'
        );
      } else {
        alert('Seçilen kriterlerde çalışılacak kelime kalmadı! Tüm kelimeler öğrenildi olarak işaretlenmiş olabilir.');
      }
      return;
    }

    if (studyType === 'quiz' && candidates.length < 4) {
      alert('Quiz için en az 4 uygun kelime gerekir. Lütfen daha fazla kelime içeren bir liste veya daha geniş bir filtre seçin.');
      return;
    }

    if (studyType === 'quiz' && (quizMode === 'word-to-tr' || quizMode === 'tr-to-word')) {
      const uniqueAnswerCount = new Set(candidates.map(w => (
        quizMode === 'word-to-tr'
          ? w.turkishMeanings.join(', ').toLowerCase().trim()
          : w.term.toLowerCase().trim()
      ))).size;

      if (uniqueAnswerCount < 4) {
        alert('Bu mod için en az 4 benzersiz cevap şıkkı gerekir. Lütfen daha fazla farklı kelime içeren bir liste seçin.');
        return;
      }
    }

    // Sort or shuffle candidates
    if (studyMode === 'shuffled') {
      candidates = [...candidates].sort(() => Math.random() - 0.5);
    }

    setSessionWords(candidates);
    setCurrentIndex(0);
    setIsFlipped(false);
    setQuizAnswers({});
    setQuizNavDirection(1);
    setIsCollectionSheetOpen(false);
    setIsStudying(true);
    setIsCompleted(false);
    sessionStartedAtRef.current = new Date().toISOString();
    const studiedListIds = new Set(candidates.map(word => word.listId));
    sessionListSnapshotRef.current = selectedListIds.filter(listId => studiedListIds.has(listId)).map(listId => {
      const selectedList = lists.find(list => list.id === listId);
      return { id: listId, name: selectedList?.name ?? 'Silinmiş liste' };
    });
    completionRecordedRef.current = false;

    // Pronounce first word (only if the English word is the prompt)
    if (candidates.length > 0) {
      if (isPronunciationEnabled && (studyType === 'card' || quizMode === 'word-to-syn' || quizMode === 'word-to-tr')) {
        setTimeout(() => speakWord(candidates[0].term), 300);
      }
    }
  };

  const recordCompletedStudy = () => {
    if (completionRecordedRef.current || sessionWords.length === 0) return;
    completionRecordedRef.current = true;

    const quizStats = sessionWords.reduce(
      (stats, word) => {
        const answer = quizAnswers[word.id];
        if (!answer?.isAnswered) stats.unanswered += 1;
        else if (answer.isCorrect) stats.correct += 1;
        else stats.wrong += 1;
        return stats;
      },
      { correct: 0, wrong: 0, unanswered: 0 },
    );
    const learnedCount = sessionWords.filter(word => word.status === 'learned' || word.learned).length;
    const successRate = Math.round(
      ((studyType === 'quiz' ? quizStats.correct : learnedCount) / sessionWords.length) * 100,
    );
    const historyEntry: StudyHistoryEntry = {
      id: `study_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      startedAt: sessionStartedAtRef.current,
      completedAt: new Date().toISOString(),
      lists: sessionListSnapshotRef.current,
      studyType,
      studyMode,
      filterMode,
      quizMode: studyType === 'quiz' ? quizMode : undefined,
      wordCount: sessionWords.length,
      successRate,
      ...(studyType === 'quiz' ? quizStats : { learnedCount }),
    };

    setStudyHistory(previousHistory => {
      const nextHistory = [historyEntry, ...previousHistory];
      localStorage.setItem(STUDY_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
      return nextHistory;
    });
  };

  // Card view events
  const handleNextCard = () => {
    setQuizNavDirection(1);
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex < sessionWords.length - 1) {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        // Auto-pronounce next term when the English word is the prompt
        if (isPronunciationEnabled && (studyType === 'card' || quizMode === 'word-to-syn' || quizMode === 'word-to-tr')) {
          speakWord(sessionWords[nextIdx].term);
        }
      } else {
        // Study Completed!
        recordCompletedStudy();
        setIsCompleted(true);
      }
    }, 150);
  };

  const handlePrevCard = () => {
    setQuizNavDirection(-1);
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex > 0) {
        const prevIdx = currentIndex - 1;
        setCurrentIndex(prevIdx);
        // Auto-pronounce previous term when the English word is the prompt
        if (isPronunciationEnabled && (studyType === 'card' || quizMode === 'word-to-syn' || quizMode === 'word-to-tr')) {
          speakWord(sessionWords[prevIdx].term);
        }
      }
    }, 150);
  };

  const handleCardFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleClearStudyHistory = () => {
    localStorage.removeItem(STUDY_HISTORY_STORAGE_KEY);
    setStudyHistory([]);
  };

  const handleDeleteStudyHistoryEntry = (entryId: string) => {
    setStudyHistory(previousHistory => {
      const nextHistory = previousHistory.filter(entry => entry.id !== entryId);
      if (nextHistory.length > 0) {
        localStorage.setItem(STUDY_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
      } else {
        localStorage.removeItem(STUDY_HISTORY_STORAGE_KEY);
      }
      return nextHistory;
    });
  };

  const handleSetStatusOnActiveWord = (status: 'unmarked' | 'learned' | 'struggled') => {
    if (sessionWords.length === 0) return;
    const activeWord = sessionWords[currentIndex];
    const updatedWord: Word = {
      ...activeWord,
      status,
      learned: status === 'learned'
    };
    
    // Update master words state & active state
    handleUpdateWord(updatedWord);
  };

  const handleSaveQuizAnswer = (wordId: string, answer: QuizAnswerSnapshot) => {
    setQuizAnswers(prev => ({
      ...prev,
      [wordId]: answer
    }));
  };

  const handleJumpToQuizIndex = (index: number) => {
    if (index < 0 || index >= sessionWords.length || index === currentIndex) return;
    setQuizNavDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  // Calculation of words belonging to chosen checklists
  const targetWordsCount = words.filter(w => {
    const listMatch = selectedListIds.includes(w.listId);
    if (!listMatch) return false;
    
    const status = w.status || (w.learned ? 'learned' : 'unmarked');
    if (filterMode === 'unlearned') {
      if (status === 'learned') return false;
    } else if (filterMode === 'learned') {
      if (status !== 'learned') return false;
    }

    if (studyType === 'quiz') {
      if (quizMode === 'word-to-tr' || quizMode === 'tr-to-word') {
        return w.turkishMeanings.length > 0;
      }
      return !!(w.synonyms && w.synonyms.trim() !== '');
    }
    return true;
  }).length;

  const listWordCounts = words.reduce<Record<string, number>>((counts, word) => {
    counts[word.listId] = (counts[word.listId] ?? 0) + 1;
    return counts;
  }, {});
  const normalizedCollectionQuery = collectionQuery.trim().toLocaleLowerCase('tr-TR');
  const filteredAndSortedLists = lists
    .filter(list => {
      const matchesQuery = list.name.toLocaleLowerCase('tr-TR').includes(normalizedCollectionQuery);
      const isSelected = selectedListIds.includes(list.id);
      const matchesVisibility = collectionVisibility === 'all'
        || (collectionVisibility === 'selected' && isSelected)
        || (collectionVisibility === 'unselected' && !isSelected);
      return matchesQuery && matchesVisibility;
    })
    .sort((a, b) => {
      if (collectionSort === 'name-asc') return a.name.localeCompare(b.name, 'tr-TR', { numeric: true });
      if (collectionSort === 'name-desc') return b.name.localeCompare(a.name, 'tr-TR', { numeric: true });
      if (collectionSort === 'count-desc') {
        return (listWordCounts[b.id] ?? 0) - (listWordCounts[a.id] ?? 0)
          || a.name.localeCompare(b.name, 'tr-TR', { numeric: true });
      }
      if (collectionSort === 'count-asc') {
        return (listWordCounts[a.id] ?? 0) - (listWordCounts[b.id] ?? 0)
          || a.name.localeCompare(b.name, 'tr-TR', { numeric: true });
      }
      return 0;
    });

  const handleSelectVisibleLists = () => {
    setSelectedListIds(current => [
      ...new Set([...current, ...filteredAndSortedLists.map(list => list.id)]),
    ]);
  };
  const selectedLists = lists.filter(list => selectedListIds.includes(list.id));
  const estimatedStudyMinutes = targetWordsCount === 0
    ? 0
    : Math.max(1, Math.ceil((targetWordsCount * (studyType === 'quiz' ? 20 : 12)) / 60));

  const handleCreateListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const newId = handleAddList(newListName);
    setNewListName('');
    // Open inspector modal for this new list immediately so the user can easily add words to it
    setInspectingListId(newId);
  };

  // Get inspecting list object if active
  const activeInspectingList = lists.find(l => l.id === inspectingListId);
  const completedQuizStats = sessionWords.reduce(
    (acc, word) => {
      const answer = quizAnswers[word.id];
      if (!answer?.isAnswered) {
        acc.unanswered += 1;
      } else if (answer.isCorrect) {
        acc.correct += 1;
      } else {
        acc.wrong += 1;
      }
      return acc;
    },
    { correct: 0, wrong: 0, unanswered: 0 }
  );
  const completedQuizSuccessRate = sessionWords.length > 0
    ? Math.round((completedQuizStats.correct / sessionWords.length) * 100)
    : 0;
  const completedCardLearnedRate = sessionWords.length > 0
    ? Math.round((sessionWords.filter(w => w.status === 'learned' || w.learned).length / sessionWords.length) * 100)
    : 0;
  const completedSuccessRate = studyType === 'quiz' ? completedQuizSuccessRate : completedCardLearnedRate;
  const isLowCompletedSuccess = completedSuccessRate < 60;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-display font-black tracking-tight">LexiCards</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Giriş yap</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Kullanıcı adı
              </label>
              <input
                value={loginUsername}
                onChange={(e) => {
                  setLoginUsername(e.target.value);
                  setLoginError('');
                }}
                autoComplete="username"
                className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                placeholder="admin"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Şifre
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  setLoginError('');
                }}
                autoComplete="current-password"
                className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                placeholder="123456"
              />
            </div>

            {loginError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-xl px-3 py-2">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
            >
              Giriş
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isStudying) {
    return (
      <div className="fixed inset-0 h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 overflow-hidden select-none z-50">
        {/* Study Header */}
        <header className="bg-white/90 backdrop-blur-md dark:bg-slate-900/90 border-b border-slate-200/50 dark:border-slate-850 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <button
            onClick={() => setIsStudying(false)}
            className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-indigo-500 stroke-[3px]" />
            <span>Kapat</span>
          </button>

          {/* Immersive progress bar inside header for medium/large screens */}
          {sessionWords.length > 0 && !isCompleted && (
            <div className="flex-1 max-w-sm mx-6 hidden sm:block">
              <div className="flex justify-between text-[10px] text-slate-450 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">
                <span>İLERLEME ({currentIndex + 1} / {sessionWords.length})</span>
                <span>%{Math.round(((currentIndex) / sessionWords.length) * 100)}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / sessionWords.length) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isPronunciationEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                setIsPronunciationEnabled(!isPronunciationEnabled);
              }}
              className={`h-8 w-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                isPronunciationEnabled
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/35 dark:text-indigo-400 dark:border-indigo-900/50'
                  : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800'
              }`}
              title={isPronunciationEnabled ? 'Telaffuzu kapat' : 'Telaffuzu aç'}
              aria-label={isPronunciationEnabled ? 'Telaffuzu kapat' : 'Telaffuzu aç'}
            >
              {isPronunciationEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <div className="flex items-center space-x-2 text-[10px] text-slate-450 dark:text-slate-450 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-950 border border-slate-150/50 dark:border-slate-850 px-3 py-1.5 rounded-full">
              <span>{studyType === 'quiz' ? `Quiz: ${quizMode === 'syn-to-word' ? 'syn-word' : quizMode === 'word-to-syn' ? 'word-syn' : quizMode === 'word-to-tr' ? 'word-tr' : 'tr-word'}` : 'Kart'}</span>
              <span className="text-slate-200 dark:text-slate-800">•</span>
              <span>{studyMode === 'shuffled' ? 'Karışık' : 'Sıralı'}</span>
              <span className="text-slate-200 dark:text-slate-800">•</span>
              <span>{filterMode === 'unlearned' ? 'Öğrenilmeyen' : filterMode === 'learned' ? 'Öğrenilen' : 'Tümü'}</span>
            </div>
          </div>
        </header>

        {/* Center Study Container */}
        <div className="flex-1 flex flex-col justify-center items-center px-4 py-3 sm:p-4 min-h-0 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20">
          <AnimatePresence mode="wait">
            {isCompleted ? (
              /* ================= VIEW 3: SESSION COMPLETED CELEBRATION ================= */
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-lg space-y-6 relative overflow-hidden my-auto"
              >
                {/* Top accent border */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-indigo-600"></div>

                <div className={`p-4 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto shadow-xs ${
                  isLowCompletedSuccess
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                    : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                }`}>
                  <Award className={`w-10 h-10 ${isLowCompletedSuccess ? '' : 'animate-bounce'}`} />
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-display font-bold text-slate-800 dark:text-white flex items-center justify-center space-x-1.5">
                    <span>{isLowCompletedSuccess ? 'Tekrar Etmek Gerekli' : 'Tebrikler!'}</span>
                    {!isLowCompletedSuccess && <Sparkles className="w-5 h-5 text-indigo-500" />}
                  </h2>
                  <p className="text-xs text-slate-405 dark:text-slate-400 leading-relaxed font-semibold uppercase tracking-wider">
                    {isLowCompletedSuccess ? 'Bu seans biraz zor geçmiş.' : 'Harika bir seans bitirdiniz!'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {isLowCompletedSuccess
                      ? 'Yanlış veya eksik kalan kelimeleri tekrar çalışarak oranı yükseltebilirsiniz.'
                      : 'Çalışma listenizdeki tüm kelimeleri baştan sona başarıyla incelediniz!'
                    }
                  </p>
                </div>

                {/* Mini statistics summary */}
                {studyType === 'quiz' ? (
                  <div className="bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl grid grid-cols-2 gap-4 text-left">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Doğru</span>
                      <span className="text-lg font-display font-bold text-emerald-600 dark:text-emerald-400">{completedQuizStats.correct}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Yanlış</span>
                      <span className="text-lg font-display font-bold text-rose-600 dark:text-rose-400">{completedQuizStats.wrong}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cevapsız</span>
                      <span className="text-lg font-display font-bold text-slate-700 dark:text-slate-200">{completedQuizStats.unanswered}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Başarı Oranı</span>
                      <span className="text-lg font-display font-bold text-indigo-600 dark:text-indigo-400">%{completedQuizSuccessRate}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl grid grid-cols-2 gap-4 text-left">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Çalışılan</span>
                      <span className="text-lg font-display font-bold text-slate-800 dark:text-slate-100">{sessionWords.length} Kelime</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Öğrenilen Oranı</span>
                      <span className="text-lg font-display font-bold text-indigo-600 dark:text-indigo-400">%{completedCardLearnedRate}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col space-y-3 pt-4">
                  <button
                    onClick={handleStartStudy}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Tekrar Çalış</span>
                  </button>
                  <button
                    onClick={() => setIsStudying(false)}
                    className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 dark:text-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest cursor-pointer shadow-3xs"
                  >
                    <span>Listelere Geri Dön</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              /* ================= VIEW 2: ACTIVE CARD/QUIZ STUDY SESSION ================= */
              <motion.div
                key="studying"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex flex-col items-center"
              >
                {sessionWords.length > 0 && (
                  studyType === 'quiz' ? (
                    <QuizView
                      word={sessionWords[currentIndex]}
                      allWords={sessionWords}
                      currentIndex={currentIndex}
                      totalCount={sessionWords.length}
                      quizMode={quizMode}
                      pronunciationEnabled={isPronunciationEnabled}
                      hapticsEnabled={isHapticsEnabled}
                      answerState={quizAnswers[sessionWords[currentIndex].id]}
                      answerStates={quizAnswers}
                      navDirection={quizNavDirection}
                      onNext={handleNextCard}
                      onPrev={handlePrevCard}
                      onJumpToIndex={handleJumpToQuizIndex}
                      onSaveAnswer={handleSaveQuizAnswer}
                    />
                  ) : (
                    <CardView
                      word={sessionWords[currentIndex]}
                      sessionWords={sessionWords}
                      isFlipped={isFlipped}
                      onFlip={handleCardFlip}
                      onNext={handleNextCard}
                      onPrev={handlePrevCard}
                      onSetStatus={handleSetStatusOnActiveWord}
                      currentIndex={currentIndex}
                      totalCount={sessionWords.length}
                      pronunciationEnabled={isPronunciationEnabled}
                    />
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <header className="bg-white/80 backdrop-blur-md dark:bg-slate-950/80 border-b border-slate-200/60 dark:border-slate-850 sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-display font-black tracking-tight text-slate-900 dark:text-white leading-none">
                  LexiCards
                </h1>
                <span className="inline-flex items-center px-1.5 py-0.5 text-[8px] font-bold bg-slate-150/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded uppercase tracking-wider border border-slate-200/50 dark:border-slate-700/50">
                  İNGİLİZCE
                </span>
              </div>
              <span className="text-[9px] text-slate-450 dark:text-slate-500 font-bold tracking-wider block mt-1 uppercase">
                Gelişmiş Kelime Öğrenme Sistemi
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Global Library Quick Count Badge */}
            <div className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/60 rounded-xl text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{words.length} Kelime</span>
            </div>

            <button
              onClick={handleResetToDefaults}
              className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-850 dark:text-slate-350 border border-slate-200/60 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-750 font-bold text-[10px] rounded-xl transition-all cursor-pointer shadow-3xs"
              title="Varsayılan Kelimeleri Yükle"
            >
              <RotateCcw className="w-3 h-3 text-indigo-500" />
              <span>Varsayılana Sıfırla</span>
            </button>
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-850 dark:text-slate-350 border border-slate-200/60 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-750 font-bold text-[10px] rounded-xl transition-all cursor-pointer shadow-3xs"
              title="Çıkış yap"
            >
              <LogOut className="w-3 h-3 text-slate-500" />
              <span>Çıkış</span>
            </button>

            <div className="relative sm:hidden">
              <button
                type="button"
                onClick={() => setIsMobileHeaderMenuOpen(current => !current)}
                className="relative z-50 flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-600 shadow-3xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                aria-expanded={isMobileHeaderMenuOpen}
                aria-label="Menüyü aç"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {isMobileHeaderMenuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default bg-transparent"
                    onClick={() => setIsMobileHeaderMenuOpen(false)}
                    aria-label="Menüyü kapat"
                  />
                  <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">LexiCards</p>
                      <p className="mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-200">{words.length} kelime · {lists.length} koleksiyon</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetToDefaults}
                      className="mt-1 flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <RotateCcw className="h-4 w-4 text-indigo-500" />
                      Varsayılana sıfırla
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/25"
                    >
                      <LogOut className="h-4 w-4" />
                      Çıkış yap
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className={`flex-1 max-w-4xl w-full mx-auto px-4 py-6 md:py-8 md:pb-12 ${activeTab === 'study' ? 'pb-36' : 'pb-24'}`}>
        
        {/* ================= VIEW 1: TABBED WEB APPLICATION INTERFACE ================= */}
        <div className="space-y-6">
              {/* Responsive Desktop Top Tabs Switcher */}
              <div className="hidden md:flex items-center justify-center p-1 bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/40 dark:border-slate-800/80 rounded-2xl max-w-xl mx-auto mb-6">
                <button
                  onClick={() => handleTabChange('collections')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'collections'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-150/50 dark:border-slate-750/50'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-slate-200'
                  }`}
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Koleksiyonlar ({lists.length})</span>
                </button>
                <button
                  onClick={() => handleTabChange('study')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'study'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-150/50 dark:border-slate-750/50'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-slate-200'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Çalışma Odası</span>
                </button>
                <button
                  onClick={() => handleTabChange('history')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-150/50 dark:border-slate-750/50'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-slate-200'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>Geçmiş</span>
                </button>
                <button
                  onClick={() => handleTabChange('library')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'library'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-150/50 dark:border-slate-750/50'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Kütüphane ({words.length})</span>
                </button>
                <button
                  onClick={() => handleTabChange('import')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'import'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-150/50 dark:border-slate-750/50'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>İçe Aktar</span>
                </button>
              </div>

              {/* RENDER ACTIVE TAB VIEW */}
              <AnimatePresence mode="wait">
                {activeTab === 'collections' && (
                  <motion.div
                    key="tab-collections"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {/* Collections Tab Content */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs flex flex-col">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-850 pb-4 mb-4 gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl shadow-3xs">
                            <FolderOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <h2 className="text-base font-display font-extrabold text-slate-800 dark:text-slate-100 leading-tight">Kelimeleriniz ve Koleksiyonlar</h2>
                            <p className="text-[11px] text-slate-400 font-medium block mt-0.5">Kelime setlerinizi yönetin ve çalışma listenizi belirleyin.</p>
                          </div>
                        </div>
                        
                        {/* List utility toggles */}
                        <div className="flex items-center space-x-3.5 text-xs font-bold uppercase tracking-wider">
                          <button
                            onClick={handleSelectVisibleLists}
                            className="text-indigo-600 hover:text-indigo-500 cursor-pointer transition-colors"
                          >
                            Tümünü Seç
                          </button>
                          <span className="text-slate-200 dark:text-slate-800">|</span>
                          <button
                            onClick={handleClearListSelection}
                            className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer transition-colors"
                          >
                            Temizle
                          </button>
                          
                          {/* Bulk deletion of lists */}
                          {selectedListIds.length > 0 && (
                            <>
                              <span className="text-slate-200 dark:text-slate-800">|</span>
                              <button
                                onClick={() => {
                                  if (confirm(`Seçilen ${selectedListIds.length} listeyi ve içlerindeki tüm kelimeleri tamamen silmek istediğinize emin misiniz?`)) {
                                    handleDeleteLists(selectedListIds);
                                  }
                                }}
                                className="text-rose-500 hover:text-rose-600 flex items-center space-x-1 cursor-pointer transition-colors font-extrabold"
                                title="Seçilen Listeleri Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Sil ({selectedListIds.length})</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* List Description Hint */}
                      <p className="text-xs text-slate-400 dark:text-slate-400 mb-4 leading-relaxed bg-slate-50/50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150/40 dark:border-slate-850/60 flex items-center gap-2">
                        <span>💡</span>
                        <span>
                          Koleksiyonları <span className="font-bold text-indigo-600 dark:text-indigo-400">seçim kutusundan</span> seçerek çalışmaya ekleyebilir, kelimeleri görmek ve eklemek için <span className="font-bold text-slate-700 dark:text-slate-300">karta dokunabilirsiniz</span>.
                        </span>
                      </p>

                      {lists.length > 0 && (
                        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_150px_160px]">
                          <label className="relative col-span-2 sm:col-span-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              type="search"
                              value={collectionQuery}
                              onChange={event => setCollectionQuery(event.target.value)}
                              placeholder="Koleksiyonlarda ara"
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-indigo-700"
                            />
                          </label>
                          <select
                            value={collectionVisibility}
                            onChange={event => setCollectionVisibility(event.target.value as typeof collectionVisibility)}
                            aria-label="Koleksiyon filtresi"
                            className="h-10 min-w-0 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none focus:border-indigo-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                          >
                            <option value="all">Tüm listeler</option>
                            <option value="selected">Seçilenler</option>
                            <option value="unselected">Seçilmeyenler</option>
                          </select>
                          <select
                            value={collectionSort}
                            onChange={event => setCollectionSort(event.target.value as typeof collectionSort)}
                            aria-label="Koleksiyon sıralaması"
                            className="h-10 min-w-0 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none focus:border-indigo-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                          >
                            <option value="default">Eklenme sırası</option>
                            <option value="name-asc">Ad: A → Z</option>
                            <option value="name-desc">Ad: Z → A</option>
                            <option value="count-desc">Kelime: Çok → Az</option>
                            <option value="count-asc">Kelime: Az → Çok</option>
                          </select>
                        </div>
                      )}

                      {/* Lists Grid - REDESIGNED PREMIUM VIEW */}
                      {lists.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center bg-slate-50/30 dark:bg-slate-950/20 rounded-2xl border-2 border-dashed border-slate-150 dark:border-slate-800">
                          <HelpCircle className="w-14 h-14 text-slate-250 dark:text-slate-800 mb-3" />
                          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Henüz hiçbir kelime koleksiyonu yok.</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm">"İçe Aktar" sekmesinden hazır listeleri yükleyebilir veya hemen aşağıdan yeni bir koleksiyon oluşturabilirsiniz.</p>
                        </div>
                      ) : filteredAndSortedLists.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-950/20">
                          <Search className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-700" />
                          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Bu filtreye uygun koleksiyon bulunamadı.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setCollectionQuery('');
                              setCollectionVisibility('all');
                            }}
                            className="mt-3 cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                          >
                            Filtreleri temizle
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                          {filteredAndSortedLists.map(list => {
                            const wordCount = listWordCounts[list.id] ?? 0;
                            const learnedCount = words.filter(w => w.listId === list.id && w.learned).length;
                            const struggledCount = words.filter(w => w.listId === list.id && (w.status === 'struggled')).length;
                            const isSelected = selectedListIds.includes(list.id);
                            const progressPercent = wordCount > 0 ? Math.round((learnedCount / wordCount) * 100) : 0;

                            // Theme styling for cards based on progress
                            let stripeColor = 'bg-slate-300 dark:bg-slate-700';
                            let cardThemeClass = 'border-slate-100 dark:border-slate-850 bg-white hover:bg-slate-50/30 dark:bg-slate-900/50 dark:hover:bg-slate-900';
                            
                            if (isSelected) {
                              cardThemeClass = 'border-indigo-500/80 dark:border-indigo-500/50 bg-indigo-50/5 dark:bg-indigo-950/5 shadow-xs';
                              stripeColor = 'bg-indigo-500';
                            } else if (progressPercent === 100 && wordCount > 0) {
                              stripeColor = 'bg-emerald-500';
                            } else if (progressPercent > 0) {
                              stripeColor = 'bg-indigo-400';
                            }

                            return (
                              <div
                                key={list.id}
                                onClick={() => setInspectingListId(list.id)}
                                className={`group relative p-2 pl-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col gap-1.5 overflow-hidden hover:shadow-sm ${cardThemeClass}`}
                              >
                                {/* Vertical Accent Stripe */}
                                <div className={`absolute left-0 inset-y-0 w-1 ${stripeColor}`} />

                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center space-x-2 min-w-0">
                                    {/* Custom Checkbox - Touch Friendly */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent modal opening
                                        handleToggleListId(list.id);
                                      }}
                                      className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                        isSelected
                                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                                          : 'border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 hover:border-slate-400'
                                      }`}
                                      title="Çalışma listesine ekle"
                                    >
                                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5px]" />}
                                    </button>
                                    
                                    <div className="text-left min-w-0">
                                      <h3 className="font-display font-black text-[11px] sm:text-sm text-slate-800 dark:text-white tracking-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {list.name}
                                      </h3>
                                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                          {wordCount}
                                        </span>
                                        {struggledCount > 0 && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-[9px] font-bold text-rose-500 dark:text-rose-400">
                                            {struggledCount} Zor
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right side icon indication */}
                                  <div className="hidden sm:flex items-center space-x-1 shrink-0">
                                    <span className="p-1 rounded-lg bg-slate-50 dark:bg-slate-850/60 border border-slate-100/50 dark:border-slate-800 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:scale-105 transition-all">
                                      <Layers className="w-3 h-3" />
                                    </span>
                                  </div>
                                </div>

                                {/* Custom Elegant Horizontal Progress Bar */}
                                <div className="space-y-0.5">
                                  <div className="flex items-center justify-between text-[7px] sm:text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    <span className="hidden sm:inline">Durum</span>
                                    <span className={progressPercent === 100 ? 'text-emerald-500' : 'text-slate-650 dark:text-slate-300'}>
                                      %{progressPercent} ({learnedCount}/{wordCount})
                                    </span>
                                  </div>
                                  <div className="w-full h-1 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        progressPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                                      }`}
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Quick Hover Action Badge */}
                                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden sm:block">
                                  <span className="text-[9px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-md shadow-3xs">Kelimeleri Gör</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add New List form inline */}
                      <form onSubmit={handleCreateListSubmit} className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-850 flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Yeni koleksiyon adı (örn: Day 28, Akademik Kelimeler)..."
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                          className="flex-1 px-4 py-2.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-750 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                        />
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer sm:shrink-0 shadow-xs w-full sm:w-auto"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Yeni Liste Oluştur</span>
                        </button>
                      </form>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'study' && (
                  <motion.div
                     key="tab-study"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     transition={{ duration: 0.15 }}
                     className="space-y-3 sm:space-y-6"
                  >
                     {/* Stat Bento Box Row */}
                     <StatsView 
                       words={words} 
                       lists={lists} 
                       onResetLearned={handleResetLearned} 
                     />

                     {/* Compact Preferences Card */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-3 sm:p-5 shadow-xs space-y-2.5 sm:space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center space-x-2.5">
                            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-lg">
                              <Settings className="w-4 h-4 stroke-[2.5px]" />
                            </div>
                            <div>
                              <h2 className="text-base font-display font-black text-slate-800 dark:text-slate-100 leading-tight">Çalışma</h2>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{targetWordsCount} kelime hazır</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 px-2.5 py-1 rounded-full">
                              {selectedListIds.length} liste
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsSessionSettingsExpanded(current => !current)}
                              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors active:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 sm:hidden"
                              aria-expanded={isSessionSettingsExpanded}
                              aria-label={isSessionSettingsExpanded ? 'Seans ayarlarını daralt' : 'Seans ayarlarını aç'}
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform ${isSessionSettingsExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {!isSessionSettingsExpanded && (
                          <div className="flex flex-wrap gap-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:hidden">
                            <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">{studyMode === 'shuffled' ? 'Karışık' : 'Sıralı'}</span>
                            <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">{filterMode === 'all' ? 'Tümü' : filterMode === 'learned' ? 'Öğrenilen' : 'Öğrenilmeyen'}</span>
                            <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">{studyType === 'quiz' ? 'Quiz' : 'Kart'}</span>
                            <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Titreşim {isHapticsEnabled ? 'açık' : 'kapalı'}</span>
                          </div>
                        )}

                        <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 shadow-inner shadow-slate-100/40 dark:border-slate-800 dark:bg-slate-950/35 dark:shadow-none sm:hidden">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Seçilen koleksiyonlar</p>
                              <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">{selectedListIds.length > 0 ? `${selectedListIds.length} liste · ${targetWordsCount} kelime · ~${estimatedStudyMinutes} dk` : 'Henüz koleksiyon seçilmedi'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsCollectionSheetOpen(true)}
                              className="min-h-10 shrink-0 cursor-pointer rounded-xl border border-indigo-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-indigo-700 shadow-3xs active:bg-indigo-50 dark:border-indigo-900/60 dark:bg-slate-900 dark:text-indigo-300"
                            >
                              {selectedListIds.length > 0 ? 'Düzenle' : 'Koleksiyon Seç'}
                            </button>
                          </div>
                          {selectedLists.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 overflow-hidden">
                              {selectedLists.slice(0, isSessionSettingsExpanded ? 6 : 3).map(list => (
                                <button
                                  key={list.id}
                                  type="button"
                                  onClick={() => handleToggleListId(list.id)}
                                  className="flex min-h-8 max-w-[46%] cursor-pointer items-center gap-1 rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:border-indigo-900/50 dark:bg-slate-900 dark:text-indigo-300"
                                  title={`${list.name} seçimini kaldır`}
                                >
                                  <span className="truncate">{list.name}</span>
                                  <X className="h-3 w-3 shrink-0" />
                                </button>
                              ))}
                              {selectedLists.length > (isSessionSettingsExpanded ? 6 : 3) && (
                                <button
                                  type="button"
                                  onClick={() => setIsCollectionSheetOpen(true)}
                                  className="min-h-8 cursor-pointer rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                >
                                  +{selectedLists.length - (isSessionSettingsExpanded ? 6 : 3)} diğer
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className={`${isSessionSettingsExpanded ? 'space-y-1.5' : 'hidden'} sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0`}>
                          <div className="flex items-center gap-2 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50/45 dark:bg-slate-950/20 p-1.5 sm:p-2">
                            <label className="w-20 shrink-0 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sıralama</label>
                            <div className="grid grid-cols-2 gap-1 bg-white dark:bg-slate-950 p-0.5 rounded-lg border border-slate-100 dark:border-slate-850 flex-1">
                              <button type="button" onClick={() => setStudyMode('sequential')} className={`py-1.5 px-2 rounded-md text-xs font-extrabold transition-all cursor-pointer ${studyMode === 'sequential' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-350'}`}>
                                Sıralı
                              </button>
                              <button type="button" onClick={() => setStudyMode('shuffled')} className={`py-1.5 px-2 rounded-md text-xs font-extrabold transition-all cursor-pointer ${studyMode === 'shuffled' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-350'}`}>
                                Karışık
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/45 p-1.5 dark:border-slate-850 dark:bg-slate-950/20 sm:p-2">
                            <label className="flex w-20 shrink-0 items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              <Vibrate className="h-3.5 w-3.5" />
                              Titreşim
                            </label>
                            <div className="grid flex-1 grid-cols-2 gap-1 rounded-lg border border-slate-100 bg-white p-0.5 dark:border-slate-850 dark:bg-slate-950">
                              <button type="button" onClick={() => setIsHapticsEnabled(true)} className={`rounded-md px-2 py-1.5 text-xs font-extrabold transition-all ${isHapticsEnabled ? 'bg-indigo-600 text-white shadow-3xs' : 'cursor-pointer text-slate-600 dark:text-slate-500'}`}>Açık</button>
                              <button type="button" onClick={() => setIsHapticsEnabled(false)} className={`rounded-md px-2 py-1.5 text-xs font-extrabold transition-all ${!isHapticsEnabled ? 'bg-indigo-600 text-white shadow-3xs' : 'cursor-pointer text-slate-600 dark:text-slate-500'}`}>Kapalı</button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50/45 dark:bg-slate-950/20 p-1.5 sm:p-2 sm:col-span-2">
                            <label className="w-20 shrink-0 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Durum</label>
                            <div className="grid grid-cols-3 gap-1 bg-white dark:bg-slate-950 p-0.5 rounded-lg border border-slate-100 dark:border-slate-850 flex-1">
                              <button type="button" onClick={() => setFilterMode('all')} className={`py-1.5 px-1 rounded-md text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer text-center ${filterMode === 'all' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-350'}`}>
                                Tümü
                              </button>
                              <button type="button" onClick={() => setFilterMode('unlearned')} className={`py-1.5 px-1 rounded-md text-[10px] sm:text-xs font-extrabold transition-all cursor-pointer text-center leading-tight ${filterMode === 'unlearned' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-350'}`}>
                                Öğrenilmeyen
                              </button>
                              <button type="button" onClick={() => setFilterMode('learned')} className={`py-1.5 px-1 rounded-md text-[10px] sm:text-xs font-extrabold transition-all cursor-pointer text-center leading-tight ${filterMode === 'learned' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-350'}`}>
                                Öğrenilen
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50/45 dark:bg-slate-950/20 p-1.5 sm:p-2">
                            <label className="w-20 shrink-0 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tür</label>
                            <div className="grid grid-cols-2 gap-1 bg-white dark:bg-slate-950 p-0.5 rounded-lg border border-slate-100 dark:border-slate-850 flex-1">
                              <button type="button" onClick={() => setStudyType('card')} className={`py-1.5 px-2 rounded-md text-xs font-extrabold transition-all cursor-pointer text-center ${studyType === 'card' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-350'}`}>
                                Kart
                              </button>
                              <button type="button" onClick={() => setStudyType('quiz')} className={`py-1.5 px-2 rounded-md text-xs font-extrabold transition-all cursor-pointer text-center ${studyType === 'quiz' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-350'}`}>
                                Quiz
                              </button>
                            </div>
                          </div>

                          {studyType === 'quiz' && (
                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 rounded-xl border border-indigo-100/70 dark:border-indigo-900/40 bg-indigo-50/35 dark:bg-indigo-950/15 p-1.5 sm:p-2 sm:col-span-2">
                              <label className="w-20 shrink-0 pt-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quiz Modu</label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-white dark:bg-slate-950 p-0.5 rounded-lg border border-indigo-100/70 dark:border-indigo-900/40 flex-1">
                                <button type="button" onClick={() => setQuizMode('syn-to-word')} className={`py-1.5 px-1.5 rounded-md text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer text-center ${quizMode === 'syn-to-word' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-350'}`}>
                                  Syn → Word
                                </button>
                                <button type="button" onClick={() => setQuizMode('word-to-syn')} className={`py-1.5 px-1.5 rounded-md text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer text-center ${quizMode === 'word-to-syn' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-350'}`}>
                                  Word → Syn
                                </button>
                                <button type="button" onClick={() => setQuizMode('word-to-tr')} className={`py-1.5 px-1.5 rounded-md text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer text-center ${quizMode === 'word-to-tr' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-350'}`}>
                                  Word → TR
                                </button>
                                <button type="button" onClick={() => setQuizMode('tr-to-word')} className={`py-1.5 px-1.5 rounded-md text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer text-center ${quizMode === 'tr-to-word' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-350'}`}>
                                  TR → Word
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* Koleksiyon Seçimi */}
                        <div className="hidden space-y-2 border-t border-slate-100 pt-2 dark:border-slate-850 sm:block">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                              Koleksiyonlar · {filteredAndSortedLists.length}
                            </label>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                              <button
                                type="button"
                                onClick={handleSelectVisibleLists}
                                className="text-indigo-650 dark:text-indigo-400 hover:text-indigo-500 cursor-pointer transition-colors"
                                title="Görünen koleksiyonları seç"
                              >
                                Tümü
                              </button>
                              <button type="button" onClick={handleClearListSelection} className="text-slate-450 hover:text-indigo-600 cursor-pointer transition-colors">Temizle</button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-[minmax(0,1fr)_120px_130px]">
                            <label className="relative col-span-2 sm:col-span-1">
                              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                              <input
                                type="search"
                                value={collectionQuery}
                                onChange={event => setCollectionQuery(event.target.value)}
                                placeholder="Koleksiyon ara"
                                className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-[11px] font-semibold text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-indigo-700"
                              />
                            </label>
                            <select
                              value={collectionVisibility}
                              onChange={event => setCollectionVisibility(event.target.value as typeof collectionVisibility)}
                              aria-label="Koleksiyon filtresi"
                              className="h-8 min-w-0 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-600 outline-none focus:border-indigo-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                            >
                              <option value="all">Tüm listeler</option>
                              <option value="selected">Seçilenler</option>
                              <option value="unselected">Seçilmeyenler</option>
                            </select>
                            <select
                              value={collectionSort}
                              onChange={event => setCollectionSort(event.target.value as typeof collectionSort)}
                              aria-label="Koleksiyon sıralaması"
                              className="h-8 min-w-0 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-600 outline-none focus:border-indigo-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                            >
                              <option value="default">Eklenme sırası</option>
                              <option value="name-asc">Ad: A → Z</option>
                              <option value="name-desc">Ad: Z → A</option>
                              <option value="count-desc">Kelime: Çok → Az</option>
                              <option value="count-asc">Kelime: Az → Çok</option>
                            </select>
                          </div>

                          <div className="grid max-h-[196px] grid-cols-2 gap-1.5 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-1.5 scrollbar-thin dark:border-slate-850/60 dark:bg-slate-950/30 sm:max-h-[116px] sm:grid-cols-3 sm:gap-2 sm:p-2">
                            {filteredAndSortedLists.map(list => {
                              const isSelected = selectedListIds.includes(list.id);
                              const listWordCount = listWordCounts[list.id] ?? 0;
                              return (
                                <button
                                  key={list.id}
                                  type="button"
                                  onClick={() => handleToggleListId(list.id)}
                                  className={`min-w-0 flex items-center gap-2 py-1.5 sm:py-2 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                    isSelected
                                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 shadow-3xs'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-750'
                                  }`}
                                >
                                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                    isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700'
                                  }`}>
                                    {isSelected && <CheckCircle2 className="w-2.5 h-2.5 stroke-[3px]" />}
                                  </div>
                                  <span className="truncate flex-1 text-left">{list.name}</span>
                                  <span className="text-[10px] font-medium opacity-50 shrink-0">{listWordCount}</span>
                                </button>
                              );
                            })}
                            {filteredAndSortedLists.length === 0 && (
                              <div className="col-span-full px-3 py-6 text-center text-[11px] font-semibold text-slate-400">
                                Bu filtreye uygun koleksiyon bulunamadı.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Start Study Action */}
                        <div className="hidden sm:flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                          <div className="hidden sm:block flex-1">
                            {selectedListIds.length === 0 ? (
                              <p className="text-xs text-rose-500 font-extrabold">Lütfen en az bir koleksiyon seçin.</p>
                            ) : targetWordsCount === 0 ? (
                              <p className="text-xs text-amber-600 dark:text-amber-400 font-extrabold">Seçilen filtreye uygun kelime bulunamadı.</p>
                            ) : (
                              <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                                Toplam <span className="font-black text-indigo-600 dark:text-indigo-400">{targetWordsCount}</span> kelime hazır.
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={handleStartStudy}
                            disabled={selectedListIds.length === 0 || targetWordsCount === 0}
                            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-display font-black uppercase tracking-wider py-3 sm:py-3.5 px-5 sm:px-7 rounded-xl sm:rounded-2xl shadow-md transition-all cursor-pointer text-xs disabled:cursor-not-allowed hover:scale-[1.02]"
                          >
                            <Play className="w-4 h-4 fill-current text-white shrink-0" />
                            <span>Başlat · {targetWordsCount} kelime · ~{estimatedStudyMinutes} dk</span>
                          </button>
                        </div>

                      </div>
                  </motion.div>
                )}

                {activeTab === 'history' && (
                  <motion.div
                    key="tab-history"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <StudyHistoryView
                      entries={studyHistory}
                      onClear={handleClearStudyHistory}
                      onDelete={handleDeleteStudyHistoryEntry}
                    />
                  </motion.div>
                )}

                {activeTab === 'library' && (
                  <motion.div
                    key="tab-library"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* Word management database panel */}
                    <WordExplorer
                      words={words}
                      lists={lists}
                      onUpdateWord={handleUpdateWord}
                      onDeleteWord={handleDeleteWord}
                      onDeleteList={handleDeleteList}
                    />
                  </motion.div>
                )}

                {activeTab === 'import' && (
                  <motion.div
                    key="tab-import"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* Dynamic Excel / CSV Import panel */}
                    <CSVImporter onImport={handleImport} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
      </main>

      {/* List Inspection Detail Modal */}
      {activeInspectingList && (
        <ListInspectorModal
          list={activeInspectingList}
          words={words}
          isOpen={inspectingListId !== null}
          onClose={() => setInspectingListId(null)}
          onUpdateWord={handleUpdateWord}
          onDeleteWord={handleDeleteWord}
          onAddWord={handleAddWord}
          onDeleteList={handleDeleteList}
        />
      )}

      {isCollectionSheetOpen && (
        <div className="fixed inset-0 z-[70] sm:hidden" role="dialog" aria-modal="true" aria-label="Koleksiyon seçimi">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/55 backdrop-blur-[2px]"
            onClick={() => setIsCollectionSheetOpen(false)}
            aria-label="Koleksiyon seçimini kapat"
          />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl border-t border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <div>
                <h2 className="font-display text-base font-black text-slate-900 dark:text-white">Koleksiyonları seç</h2>
                <p className="text-[10px] font-semibold text-slate-400">{selectedListIds.length} liste · {targetWordsCount} kelime · ~{estimatedStudyMinutes} dk</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCollectionSheetOpen(false)}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="shrink-0 space-y-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              {selectedLists.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
                  {selectedLists.map(list => (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => handleToggleListId(list.id)}
                      className="flex min-h-9 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-bold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300"
                    >
                      <span>{list.name}</span>
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              )}
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={collectionQuery}
                  onChange={event => setCollectionQuery(event.target.value)}
                  placeholder="Koleksiyon ara"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={collectionVisibility}
                  onChange={event => setCollectionVisibility(event.target.value as typeof collectionVisibility)}
                  aria-label="Koleksiyon filtresi"
                  className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                >
                  <option value="all">Tüm listeler</option>
                  <option value="selected">Seçilenler</option>
                  <option value="unselected">Seçilmeyenler</option>
                </select>
                <select
                  value={collectionSort}
                  onChange={event => setCollectionSort(event.target.value as typeof collectionSort)}
                  aria-label="Koleksiyon sıralaması"
                  className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                >
                  <option value="default">Eklenme sırası</option>
                  <option value="name-asc">Ad: A → Z</option>
                  <option value="name-desc">Ad: Z → A</option>
                  <option value="count-desc">Kelime: Çok → Az</option>
                  <option value="count-asc">Kelime: Az → Çok</option>
                </select>
              </div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                <span className="text-slate-400">{filteredAndSortedLists.length} sonuç</span>
                <div className="flex gap-3">
                  <button type="button" onClick={handleSelectVisibleLists} className="cursor-pointer text-indigo-600 dark:text-indigo-400">Görünenleri seç</button>
                  <button type="button" onClick={handleClearListSelection} className="cursor-pointer text-rose-500">Temizle</button>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto overscroll-contain px-4 py-3">
              {filteredAndSortedLists.map(list => {
                const isSelected = selectedListIds.includes(list.id);
                return (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => handleToggleListId(list.id)}
                    className={`flex min-h-12 min-w-0 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
                      isSelected
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/35 dark:text-indigo-300'
                        : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                      {isSelected && <CheckCircle2 className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{list.name}</span>
                    <span className="shrink-0 text-[9px] opacity-50">{listWordCounts[list.id] ?? 0}</span>
                  </button>
                );
              })}
              {filteredAndSortedLists.length === 0 && (
                <div className="col-span-2 py-10 text-center text-xs font-semibold text-slate-400">Bu filtreye uygun koleksiyon bulunamadı.</div>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-100 px-4 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCollectionSheetOpen(false)}
                className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md active:bg-indigo-700"
              >
                Bitti · {selectedListIds.length} liste
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'study' && !isStudying && (
        <div
          className="fixed left-0 right-0 z-50 px-4 pointer-events-none md:hidden"
          style={{ bottom: 'calc(68px + env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handleStartStudy}
            disabled={selectedListIds.length === 0 || targetWordsCount === 0}
            className="pointer-events-auto w-full max-w-md mx-auto flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-45 disabled:hover:bg-indigo-600 text-white font-display font-black uppercase tracking-wider py-3.5 px-5 rounded-2xl shadow-lg transition-all cursor-pointer text-xs disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 fill-current text-white shrink-0" />
            <span>Başlat · {targetWordsCount} kelime · ~{estimatedStudyMinutes} dk</span>
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-45 md:hidden bg-white/95 dark:bg-slate-950/95 border-t border-slate-200/50 dark:border-slate-850/80 backdrop-blur-md px-1 py-2 flex justify-around items-center shadow-[0_-4px_12px_rgba(0,0,0,0.03)] pb-safe">
        {/* Collection Tab */}
        <button
          onClick={() => {
            handleTabChange('collections');
          }}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
            !isStudying && activeTab === 'collections'
              ? 'text-indigo-600 dark:text-indigo-400 scale-105 font-bold'
              : 'text-slate-450 dark:text-slate-500'
          }`}
        >
          <FolderOpen className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Koleksiyonlar</span>
        </button>

        {/* Study Tab */}
        <button
          onClick={() => {
            handleTabChange('study');
          }}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
            !isStudying && activeTab === 'study'
              ? 'text-indigo-600 dark:text-indigo-400 scale-105 font-bold'
              : 'text-slate-450 dark:text-slate-500'
          }`}
        >
          <GraduationCap className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Çalışma</span>
        </button>

        {/* History Tab */}
        <button
          onClick={() => {
            handleTabChange('history');
          }}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
            !isStudying && activeTab === 'history'
              ? 'text-indigo-600 dark:text-indigo-400 scale-105 font-bold'
              : 'text-slate-450 dark:text-slate-500'
          }`}
        >
          <History className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Geçmiş</span>
        </button>

        {/* Library Tab */}
        <button
          onClick={() => {
            handleTabChange('library');
          }}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
            !isStudying && activeTab === 'library'
              ? 'text-indigo-600 dark:text-indigo-400 scale-105 font-bold'
              : 'text-slate-450 dark:text-slate-500'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Kütüphane</span>
        </button>

        {/* Import Tab */}
        <button
          onClick={() => {
            handleTabChange('import');
          }}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
            !isStudying && activeTab === 'import'
              ? 'text-indigo-600 dark:text-indigo-400 scale-105 font-bold'
              : 'text-slate-450 dark:text-slate-500'
          }`}
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Yükle</span>
        </button>
      </div>
    </div>
  );
}




