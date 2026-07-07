import React, { useState, useEffect } from 'react';
import { Word, WordList } from './types';
import { parseCSV, defaultCSVData, speakWord } from './utils';
import StatsView from './components/StatsView';
import CSVImporter from './components/CSVImporter';
import CardView from './components/CardView';
import QuizView from './components/QuizView';
import WordExplorer from './components/WordExplorer';
import ListInspectorModal from './components/ListInspectorModal';
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
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuizChoiceSnapshot {
  id: string;
  term: string;
  synonyms: string;
}

interface QuizAnswerSnapshot {
  choices: QuizChoiceSnapshot[];
  selectedId: string | null;
  isAnswered: boolean;
  isCorrect: boolean;
}

export default function App() {
  const [lists, setLists] = useState<WordList[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('lexicards_auth') === 'true');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'collections' | 'study' | 'library' | 'import'>('collections');
  
  // Dashboard states
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [studyMode, setStudyMode] = useState<'sequential' | 'shuffled'>('sequential');
  const [filterMode, setFilterMode] = useState<'all' | 'unlearned' | 'learned'>('all');
  const [studyType, setStudyType] = useState<'card' | 'quiz'>('card');
  const [quizMode, setQuizMode] = useState<'syn-to-word' | 'word-to-syn'>('syn-to-word');
  
  // Active study states
  const [isStudying, setIsStudying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, QuizAnswerSnapshot>>({});
  const [quizNavDirection, setQuizNavDirection] = useState<1 | -1>(1);

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
    setIsAuthenticated(false);
    setLoginPassword('');
  };

  const handleTabChange = (tab: 'collections' | 'study' | 'library' | 'import') => {
    setIsStudying(false);
    setInspectingListId(null);
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

    // Filter by synonyms existence if in quiz mode
    if (studyType === 'quiz') {
      candidates = candidates.filter(w => w.synonyms && w.synonyms.trim() !== '');
    }

    if (candidates.length === 0) {
      if (studyType === 'quiz') {
        alert('Seçilen kriterlerde eş anlamlısı (syn) olan çalışılacak kelime kalmadı! Lütfen farklı bir liste seçin veya kelime ekleyin.');
      } else {
        alert('Seçilen kriterlerde çalışılacak kelime kalmadı! Tüm kelimeler öğrenildi olarak işaretlenmiş olabilir.');
      }
      return;
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
    setIsStudying(true);
    setIsCompleted(false);

    // Pronounce first word (only if in card mode or word-to-syn quiz mode)
    if (candidates.length > 0) {
      if (studyType === 'card' || quizMode === 'word-to-syn') {
        setTimeout(() => speakWord(candidates[0].term), 300);
      }
    }
  };

  // Card view events
  const handleNextCard = () => {
    setQuizNavDirection(1);
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex < sessionWords.length - 1) {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        // Auto-pronounce next term (only if in card mode or word-to-syn quiz mode)
        if (studyType === 'card' || quizMode === 'word-to-syn') {
          speakWord(sessionWords[nextIdx].term);
        }
      } else {
        // Study Completed!
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
        // Auto-pronounce previous term (only if in card mode or word-to-syn quiz mode)
        if (studyType === 'card' || quizMode === 'word-to-syn') {
          speakWord(sessionWords[prevIdx].term);
        }
      }
    }, 150);
  };

  const handleCardFlip = () => {
    setIsFlipped(!isFlipped);
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
      return !!(w.synonyms && w.synonyms.trim() !== '');
    }
    return true;
  }).length;

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
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 overflow-hidden select-none z-50">
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

          <div className="flex items-center space-x-2 text-[10px] text-slate-450 dark:text-slate-450 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-950 border border-slate-150/50 dark:border-slate-850 px-3 py-1.5 rounded-full">
            <span>{studyType === 'quiz' ? `Quiz: ${quizMode === 'syn-to-word' ? 'syn-word' : 'word-syn'}` : 'Kart'}</span>
            <span className="text-slate-200 dark:text-slate-800">•</span>
            <span>{studyMode === 'shuffled' ? 'Karışık' : 'Sıralı'}</span>
            <span className="text-slate-200 dark:text-slate-800">•</span>
            <span>{filterMode === 'unlearned' ? 'Yeni' : filterMode === 'learned' ? 'Bilinen' : 'Tümü'}</span>
          </div>
        </header>

        {/* Center Study Container */}
        <div className="flex-1 flex flex-col justify-center items-center p-4 min-h-0 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20">
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

                <div className="p-4 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto shadow-xs">
                  <Award className="w-10 h-10 animate-bounce" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-display font-bold text-slate-800 dark:text-white flex items-center justify-center space-x-1.5">
                    <span>Tebrikler!</span>
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                  </h2>
                  <p className="text-xs text-slate-405 dark:text-slate-400 leading-relaxed font-semibold uppercase tracking-wider">
                    Harika bir seans bitirdiniz!
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Çalışma listenizdeki tüm kelimeleri baştan sona başarıyla incelediniz!
                  </p>
                </div>

                {/* Mini statistics summary */}
                <div className="bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl grid grid-cols-2 gap-4 text-left">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Çalışılan</span>
                    <span className="text-lg font-display font-bold text-slate-800 dark:text-slate-100">{sessionWords.length} Kelime</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Öğrenilen Oranı</span>
                    <span className="text-lg font-display font-bold text-indigo-600 dark:text-indigo-400">
                      %{Math.round((sessionWords.filter(w => w.status === 'learned' || w.learned).length / sessionWords.length) * 100) || 0}
                    </span>
                  </div>
                </div>

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
                className="w-full flex flex-col items-center my-auto"
              >
                {/* Mobile top progress bar (only for card view, quiz view has its own progress styling) */}
                {studyType === 'card' && (
                  <div className="w-full max-w-md px-2 mb-4 sm:hidden">
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      <span>Kart {currentIndex + 1} / {sessionWords.length}</span>
                      <span>%{Math.round(((currentIndex) / sessionWords.length) * 100)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / sessionWords.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {sessionWords.length > 0 && (
                  studyType === 'quiz' ? (
                    <QuizView
                      word={sessionWords[currentIndex]}
                      allWords={words}
                      currentIndex={currentIndex}
                      totalCount={sessionWords.length}
                      quizMode={quizMode}
                      answerState={quizAnswers[sessionWords[currentIndex].id]}
                      navDirection={quizNavDirection}
                      onNext={handleNextCard}
                      onPrev={handlePrevCard}
                      onSaveAnswer={handleSaveQuizAnswer}
                      onSetStatus={handleSetStatusOnActiveWord}
                    />
                  ) : (
                    <CardView
                      word={sessionWords[currentIndex]}
                      isFlipped={isFlipped}
                      onFlip={handleCardFlip}
                      onNext={handleNextCard}
                      onPrev={handlePrevCard}
                      onSetStatus={handleSetStatusOnActiveWord}
                      currentIndex={currentIndex}
                      totalCount={sessionWords.length}
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
              onClick={() => {
                if (confirm('Verilerinizi ilk günkü varsayılan kelimelere (Day 19-26) döndürmek istiyor musunuz?')) {
                  loadDefaultData();
                }
              }}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-850 dark:text-slate-350 border border-slate-200/60 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-750 font-bold text-[10px] rounded-xl transition-all cursor-pointer shadow-3xs"
              title="Varsayılan Kelimeleri Yükle"
            >
              <RotateCcw className="w-3 h-3 text-indigo-500" />
              <span>Varsayılana Sıfırla</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-850 dark:text-slate-350 border border-slate-200/60 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-750 font-bold text-[10px] rounded-xl transition-all cursor-pointer shadow-3xs"
              title="Çıkış yap"
            >
              <LogOut className="w-3 h-3 text-slate-500" />
              <span>Çıkış</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 md:py-8 pb-24 md:pb-12">
        
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
                            onClick={handleSelectAllLists}
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

                      {/* Lists Grid - REDESIGNED PREMIUM VIEW */}
                      {lists.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center bg-slate-50/30 dark:bg-slate-950/20 rounded-2xl border-2 border-dashed border-slate-150 dark:border-slate-800">
                          <HelpCircle className="w-14 h-14 text-slate-250 dark:text-slate-800 mb-3" />
                          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Henüz hiçbir kelime koleksiyonu yok.</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm">"İçe Aktar" sekmesinden hazır listeleri yükleyebilir veya hemen aşağıdan yeni bir koleksiyon oluşturabilirsiniz.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                          {lists.map(list => {
                            const wordCount = words.filter(w => w.listId === list.id).length;
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
                     className="space-y-6"
                  >
                     {/* Stat Bento Box Row */}
                     <StatsView 
                       words={words} 
                       lists={lists} 
                       onResetLearned={handleResetLearned} 
                     />

                     {/* Redesigned Premium & User Friendly Preferences Card */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs space-y-6">
                        
                        {/* Compact Header */}
                        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-850">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl">
                            <Settings className="w-5 h-5 stroke-[2.5px]" />
                          </div>
                          <div>
                            <h2 className="text-base font-display font-black text-slate-800 dark:text-slate-100 leading-tight">Çalışma Tercihleri</h2>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-wider uppercase block mt-0.5">Seans Ayarları</span>
                          </div>
                        </div>

                        {/* Settings Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* Sıralama Modu */}
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                              Sıralama Modu
                            </label>
                            <div className="grid grid-cols-2 gap-1.5 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-850">
                              <button
                                type="button"
                                onClick={() => setStudyMode('sequential')}
                                className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                                  studyMode === 'sequential'
                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-3xs border border-slate-150/40 dark:border-slate-700/40'
                                    : 'text-slate-450 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-350'
                                }`}
                              >
                                Sıralı
                              </button>
                              <button
                                type="button"
                                onClick={() => setStudyMode('shuffled')}
                                className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                                  studyMode === 'shuffled'
                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-3xs border border-slate-150/40 dark:border-slate-700/40'
                                    : 'text-slate-450 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-350'
                                }`}
                              >
                                Karışık
                              </button>
                            </div>
                          </div>

                          {/* Kelime Filtresi */}
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                              Kelime Durumu
                            </label>
                            <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-850">
                              <button
                                type="button"
                                onClick={() => setFilterMode('all')}
                                className={`py-2 px-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer text-center ${
                                  filterMode === 'all'
                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-3xs border border-slate-150/40 dark:border-slate-750/40'
                                    : 'text-slate-450 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-350'
                                }`}
                              >
                                Tümü
                              </button>
                              <button
                                type="button"
                                onClick={() => setFilterMode('unlearned')}
                                className={`py-2 px-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer text-center ${
                                  filterMode === 'unlearned'
                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-3xs border border-slate-150/40 dark:border-slate-750/40'
                                    : 'text-slate-450 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-350'
                                }`}
                                title="Öğrenilmeyenler"
                              >
                                Çalışılacak
                              </button>
                              <button
                                type="button"
                                onClick={() => setFilterMode('learned')}
                                className={`py-2 px-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer text-center ${
                                  filterMode === 'learned'
                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-3xs border border-slate-150/40 dark:border-slate-750/40'
                                    : 'text-slate-450 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-350'
                                }`}
                              >
                                Öğrenilen
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Çalışma Türü ve Quiz Modu Seçenekleri */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-850 space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                              Çalışma Türü
                            </label>
                            <div className="grid grid-cols-2 gap-1.5 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-850">
                              <button
                                type="button"
                                onClick={() => setStudyType('card')}
                                className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer text-center ${
                                  studyType === 'card'
                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-3xs border border-slate-150/40 dark:border-slate-700/40'
                                    : 'text-slate-450 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-350'
                                }`}
                              >
                                Klasik Kartlar
                              </button>
                              <button
                                type="button"
                                onClick={() => setStudyType('quiz')}
                                className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer text-center ${
                                  studyType === 'quiz'
                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-3xs border border-slate-150/40 dark:border-slate-700/40'
                                    : 'text-slate-450 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-350'
                                }`}
                              >
                                Quiz
                              </button>
                            </div>
                          </div>

                          {/* Çoktan Seçmeli Detaylı Ayarları */}
                          {studyType === 'quiz' && (
                            <motion.div
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-4 bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl space-y-3"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                <label className="text-xs font-black text-indigo-950 dark:text-indigo-300 uppercase tracking-wider block">
                                  Quiz modu
                                </label>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setQuizMode('syn-to-word')}
                                  className={`p-3 rounded-xl text-xs font-bold transition-all border text-left flex flex-col justify-between cursor-pointer h-20 ${
                                    quizMode === 'syn-to-word'
                                      ? 'bg-white dark:bg-slate-800 border-indigo-400 text-indigo-600 dark:text-indigo-400 shadow-3xs'
                                      : 'bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-550 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-750'
                                  }`}
                                >
                                  <div>
                                    <span className="font-extrabold text-[9px] uppercase tracking-wider block text-slate-400 dark:text-slate-500 leading-none">Mod A</span>
                                    <span className="block mt-1 font-black text-slate-800 dark:text-slate-100 leading-tight">syn-word</span>
                                  </div>
                                  <span className="block text-[10px] text-slate-450 dark:text-slate-500 font-medium leading-none">syn sorulur</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setQuizMode('word-to-syn')}
                                  className={`p-3 rounded-xl text-xs font-bold transition-all border text-left flex flex-col justify-between cursor-pointer h-20 ${
                                    quizMode === 'word-to-syn'
                                      ? 'bg-white dark:bg-slate-800 border-indigo-400 text-indigo-600 dark:text-indigo-400 shadow-3xs'
                                      : 'bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-550 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-750'
                                  }`}
                                >
                                  <div>
                                    <span className="font-extrabold text-[9px] uppercase tracking-wider block text-slate-400 dark:text-slate-500 leading-none">Mod B</span>
                                    <span className="block mt-1 font-black text-slate-800 dark:text-slate-100 leading-tight">word-syn</span>
                                  </div>
                                  <span className="block text-[10px] text-slate-450 dark:text-slate-500 font-medium leading-none">word sorulur</span>
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* Koleksiyon Seçimi */}
                        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                              Çalışılacak Koleksiyonlar ({selectedListIds.length} Seçili)
                            </label>
                            
                            <div className="flex items-center space-x-3 text-[10px] font-bold uppercase tracking-wider">
                              <button
                                type="button"
                                onClick={handleSelectAllLists}
                                className="text-indigo-650 dark:text-indigo-400 hover:text-indigo-500 cursor-pointer transition-colors"
                              >
                                Tümünü Seç
                              </button>
                              <span className="text-slate-200 dark:text-slate-800">|</span>
                              <button
                                type="button"
                                onClick={handleClearListSelection}
                                className="text-slate-450 hover:text-indigo-600 cursor-pointer transition-colors"
                              >
                                Temizle
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto p-2.5 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850/60 rounded-2xl scrollbar-thin">
                            {lists.map(list => {
                              const isSelected = selectedListIds.includes(list.id);
                              const listWordCount = words.filter(w => w.listId === list.id).length;
                              return (
                                <button
                                  key={list.id}
                                  type="button"
                                  onClick={() => handleToggleListId(list.id)}
                                  className={`flex items-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
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
                                  <span className="truncate max-w-[130px]">{list.name}</span>
                                  <span className="text-[10px] font-medium opacity-50">({listWordCount})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Start Study Action Panel */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="text-center sm:text-left">
                            {selectedListIds.length === 0 ? (
                              <p className="text-xs text-rose-500 font-extrabold bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 rounded-xl border border-rose-100 dark:border-rose-900/40">
                                Lütfen en az bir koleksiyon seçin!
                              </p>
                            ) : targetWordsCount === 0 ? (
                              <p className="text-xs text-amber-600 dark:text-amber-400 font-extrabold bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-xl border border-amber-100 dark:border-amber-900/40">
                                Seçilen filtreye uygun kelime bulunamadı!
                              </p>
                            ) : (
                              <div className="space-y-0.5">
                                <p className="text-xs text-slate-450 dark:text-slate-400 font-bold uppercase tracking-wider">Seans Özeti</p>
                                <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                                  Toplam <span className="font-black text-indigo-600 dark:text-indigo-400">{targetWordsCount}</span> kelime seansa hazır.
                                </p>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={handleStartStudy}
                            disabled={selectedListIds.length === 0 || targetWordsCount === 0}
                            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-display font-black uppercase tracking-wider py-3.5 px-7 rounded-2xl shadow-md transition-all cursor-pointer text-xs disabled:cursor-not-allowed hover:scale-[1.02]"
                          >
                            <Play className="w-4 h-4 fill-current text-white shrink-0" />
                            <span>Çalışmayı Başlat ({targetWordsCount})</span>
                          </button>
                        </div>

                      </div>
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

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-45 md:hidden bg-white/95 dark:bg-slate-950/95 border-t border-slate-200/50 dark:border-slate-850/80 backdrop-blur-md px-2 py-2 flex justify-around items-center shadow-[0_-4px_12px_rgba(0,0,0,0.03)] pb-safe">
        {/* Collection Tab */}
        <button
          onClick={() => {
            handleTabChange('collections');
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
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
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            !isStudying && activeTab === 'study'
              ? 'text-indigo-600 dark:text-indigo-400 scale-105 font-bold'
              : 'text-slate-450 dark:text-slate-500'
          }`}
        >
          <GraduationCap className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Çalışma</span>
        </button>

        {/* Library Tab */}
        <button
          onClick={() => {
            handleTabChange('library');
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
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
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
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




