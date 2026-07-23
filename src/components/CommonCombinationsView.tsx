import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers3,
  ListFilter,
  Play,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import { CombinationCollection, CommonCombination, StudyHistoryEntry, Word } from '../types';
import CardView from './CardView';
import StudyModeSwitch from './StudyModeSwitch';
import { speakWord } from '../utils';
import { ensureBundledCommonCombinations } from '../seedData';

const COLLECTIONS_KEY = 'lexicards_combination_collections';
const ITEMS_KEY = 'lexicards_common_combinations';
const STUDY_HISTORY_KEY = 'lexicards_study_history';
const ACTIVE_COMBINATION_STUDY_KEY = 'lexicards_active_combination_study';

type FamilyFilter = 'all' | CommonCombination['family'];
type StudyMode = 'cards' | 'completion';
type StatusFilter = 'all' | 'unlearned' | 'learned';
type StudyOrder = 'sequential' | 'shuffled';
type LibraryStatusFilter = 'all' | CommonCombination['status'];

interface PersistedCombinationStudySession {
  version: 1;
  session: CommonCombination[];
  currentIndex: number;
  isFlipped: boolean;
  choicesByItem: Record<string, string[]>;
  answersByItem: Record<string, string>;
  results: Record<string, boolean>;
  startedAt: string;
  selectedCollectionIds: string[];
  familyFilter: FamilyFilter;
  studyMode: StudyMode;
  statusFilter: StatusFilter;
  studyOrder: StudyOrder;
  studySize: 10 | 20 | 30 | 'all';
}

const loadPersistedCombinationStudySession = (): PersistedCombinationStudySession | null => {
  try {
    const savedSession = localStorage.getItem(ACTIVE_COMBINATION_STUDY_KEY);
    if (!savedSession) return null;
    const parsedSession = JSON.parse(savedSession) as PersistedCombinationStudySession;
    if (
      parsedSession.version !== 1
      || !Array.isArray(parsedSession.session)
      || parsedSession.session.length === 0
      || !Number.isInteger(parsedSession.currentIndex)
      || parsedSession.currentIndex < 0
      || parsedSession.currentIndex >= parsedSession.session.length
      || !parsedSession.choicesByItem
      || typeof parsedSession.choicesByItem !== 'object'
      || !parsedSession.answersByItem
      || typeof parsedSession.answersByItem !== 'object'
      || !parsedSession.results
      || typeof parsedSession.results !== 'object'
      || !Array.isArray(parsedSession.choicesByItem[parsedSession.session[parsedSession.currentIndex].id])
    ) {
      localStorage.removeItem(ACTIVE_COMBINATION_STUDY_KEY);
      return null;
    }
    return parsedSession;
  } catch (error) {
    console.error('Error loading active combination study session', error);
    localStorage.removeItem(ACTIVE_COMBINATION_STUDY_KEY);
    return null;
  }
};

export const hasPersistedCombinationStudySession = () => loadPersistedCombinationStudySession() !== null;

const FAMILY_LABELS: Record<CommonCombination['family'], string> = {
  verb: 'Verb + Prep',
  adjective: 'Adj + Prep',
  noun: 'Noun + Prep',
  'prep-noun': 'Prep + Noun',
  other: 'Diğer',
};

const readStoredArray = <T,>(key: string): T[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const shuffle = <T,>(values: T[]) => [...values].sort(() => Math.random() - 0.5);

const createChoices = (item: CommonCombination, pool: CommonCombination[]) => {
  const fallback = ['in', 'on', 'at', 'of', 'for', 'about', 'with', 'to', 'from', 'over', 'into', 'against', 'between', 'by', 'out of'];
  const distractors = [...new Set([...pool.map(entry => entry.answer), ...fallback])]
    .filter(answer => !item.acceptedAnswers.includes(answer) && answer !== item.answer);
  return shuffle([item.answer, ...shuffle(distractors).slice(0, 3)]);
};

const toStudyWord = (item: CommonCombination): Word => ({
  id: item.id,
  term: item.expression,
  synonyms: '',
  phrase: '',
  turkishMeanings: [item.meaning],
  listId: item.collectionId,
  learned: item.status === 'learned',
  status: item.status,
});

const getNavigationLabel = (item?: CommonCombination) => {
  if (!item) return '-';
  const withoutAnswer = item.clozePrompt
    .replace(/_{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;:/-]+|[\s,;:/-]+$/g, '')
    .trim();
  return withoutAnswer || item.expression;
};

interface CommonCombinationsViewProps {
  view?: 'all' | 'study' | 'collections' | 'library';
  onSessionActiveChange?: (active: boolean) => void;
}

export default function CommonCombinationsView({ view = 'all', onSessionActiveChange }: CommonCombinationsViewProps) {
  const [initialBundledData] = useState(() => ensureBundledCommonCombinations());
  const [restoredStudySession] = useState(loadPersistedCombinationStudySession);
  const [collections, setCollections] = useState<CombinationCollection[]>(initialBundledData.collections);
  const [items, setItems] = useState<CommonCombination[]>(initialBundledData.items);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>(() =>
    restoredStudySession?.selectedCollectionIds ?? initialBundledData.collections.map(collection => collection.id),
  );
  const [familyFilter, setFamilyFilter] = useState<FamilyFilter>(restoredStudySession?.familyFilter ?? 'all');
  const [studyMode, setStudyMode] = useState<StudyMode>(restoredStudySession?.studyMode ?? 'completion');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(restoredStudySession?.statusFilter ?? 'all');
  const [studyOrder, setStudyOrder] = useState<StudyOrder>(restoredStudySession?.studyOrder ?? 'shuffled');
  const [studySize, setStudySize] = useState<10 | 20 | 30 | 'all'>(restoredStudySession?.studySize ?? 20);
  const [isPronunciationEnabled, setIsPronunciationEnabled] = useState(
    () => localStorage.getItem('lexicards_pronunciation_enabled') !== 'false',
  );
  const [query, setQuery] = useState('');
  const [libraryStatusFilter, setLibraryStatusFilter] = useState<LibraryStatusFilter>('all');
  const [session, setSession] = useState<CommonCombination[]>(restoredStudySession?.session ?? []);
  const [currentIndex, setCurrentIndex] = useState(restoredStudySession?.currentIndex ?? 0);
  const [isFlipped, setIsFlipped] = useState(restoredStudySession?.isFlipped ?? false);
  const [choicesByItem, setChoicesByItem] = useState<Record<string, string[]>>(restoredStudySession?.choicesByItem ?? {});
  const [choices, setChoices] = useState<string[]>(() => {
    if (!restoredStudySession) return [];
    return restoredStudySession.choicesByItem[restoredStudySession.session[restoredStudySession.currentIndex].id] ?? [];
  });
  const [answersByItem, setAnswersByItem] = useState<Record<string, string>>(restoredStudySession?.answersByItem ?? {});
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(() => {
    if (!restoredStudySession) return null;
    return restoredStudySession.answersByItem[restoredStudySession.session[restoredStudySession.currentIndex].id] ?? null;
  });
  const [results, setResults] = useState<Record<string, boolean>>(restoredStudySession?.results ?? {});
  const [isCompleted, setIsCompleted] = useState(false);
  const sessionStartedAtRef = useRef(restoredStudySession?.startedAt ?? new Date().toISOString());
  const historyRecordedRef = useRef(false);

  useEffect(() => {
    onSessionActiveChange?.(session.length > 0);
    return () => onSessionActiveChange?.(false);
  }, [onSessionActiveChange, session.length]);

  useEffect(() => {
    if (session.length === 0) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [session.length]);

  useEffect(() => {
    if (session.length === 0 || isCompleted) {
      localStorage.removeItem(ACTIVE_COMBINATION_STUDY_KEY);
      return;
    }

    const activeSession: PersistedCombinationStudySession = {
      version: 1,
      session,
      currentIndex,
      isFlipped,
      choicesByItem,
      answersByItem,
      results,
      startedAt: sessionStartedAtRef.current,
      selectedCollectionIds,
      familyFilter,
      studyMode,
      statusFilter,
      studyOrder,
      studySize,
    };

    const persistSession = () => {
      try {
        localStorage.setItem(ACTIVE_COMBINATION_STUDY_KEY, JSON.stringify(activeSession));
      } catch (error) {
        console.error('Error saving active combination study session', error);
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
    answersByItem,
    choicesByItem,
    currentIndex,
    familyFilter,
    isCompleted,
    isFlipped,
    results,
    selectedCollectionIds,
    session,
    statusFilter,
    studyMode,
    studyOrder,
    studySize,
  ]);

  const persist = (nextCollections: CombinationCollection[], nextItems: CommonCombination[]) => {
    setCollections(nextCollections);
    setItems(nextItems);
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(nextCollections));
    localStorage.setItem(ITEMS_KEY, JSON.stringify(nextItems));
  };

  const eligibleItems = useMemo(() => items.filter(item => (
    selectedCollectionIds.includes(item.collectionId)
    && (familyFilter === 'all' || item.family === familyFilter)
    && (statusFilter === 'all'
      || (statusFilter === 'learned' && item.status === 'learned')
      || (statusFilter === 'unlearned' && item.status !== 'learned'))
  )), [familyFilter, items, selectedCollectionIds, statusFilter]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');
    return items.filter(item => (
      (libraryStatusFilter === 'all' || item.status === libraryStatusFilter)
      && (!normalizedQuery || [item.expression, item.meaning, item.pattern, item.section]
        .some(value => value.toLocaleLowerCase('tr-TR').includes(normalizedQuery)))
    ));
  }, [items, libraryStatusFilter, query]);

  const learnedItemCount = items.filter(item => item.status === 'learned').length;
  const struggledItemCount = items.filter(item => item.status === 'struggled').length;
  const unmarkedItemCount = items.length - learnedItemCount - struggledItemCount;

  const startStudy = (onlyItems?: CommonCombination[]) => {
    const pool: CommonCombination[] = onlyItems || eligibleItems;
    if (pool.length === 0) return;
    const orderedPool = studyOrder === 'shuffled' ? shuffle<CommonCombination>(pool) : [...pool];
    const nextSession = orderedPool.slice(0, studySize === 'all' ? pool.length : studySize);
    onSessionActiveChange?.(true);
    setSession(nextSession);
    setCurrentIndex(0);
    setResults({});
    setAnswersByItem({});
    setIsCompleted(false);
    setIsFlipped(false);
    setSelectedAnswer(null);
    const firstChoices = createChoices(nextSession[0], items);
    setChoices(firstChoices);
    setChoicesByItem({ [nextSession[0].id]: firstChoices });
    sessionStartedAtRef.current = new Date().toISOString();
    historyRecordedRef.current = false;
    if (studyMode === 'cards' && isPronunciationEnabled) {
      window.setTimeout(() => speakWord(nextSession[0].expression), 250);
    }
  };

  const currentItem = session[currentIndex];
  const sessionWords = useMemo(() => session.map(toStudyWord), [session]);
  const openSessionItem = (nextIndex: number) => {
    const nextItem = session[nextIndex];
    if (!nextItem) return;
    const nextChoices = choicesByItem[nextItem.id] || createChoices(nextItem, items);
    setCurrentIndex(nextIndex);
    setIsFlipped(false);
    setSelectedAnswer(answersByItem[nextItem.id] || null);
    setChoices(nextChoices);
    setChoicesByItem(current => current[nextItem.id] ? current : { ...current, [nextItem.id]: nextChoices });
    if (studyMode === 'cards' && isPronunciationEnabled) speakWord(nextItem.expression);
  };

  const goToNext = () => {
    if (currentIndex >= session.length - 1) {
      setIsCompleted(true);
      return;
    }
    openSessionItem(currentIndex + 1);
  };

  const goToPrevious = () => {
    if (currentIndex === 0) return;
    openSessionItem(currentIndex - 1);
  };

  const updateItemStatus = (item: CommonCombination, status: CommonCombination['status']) => {
    const nextItems = items.map(entry => entry.id === item.id ? { ...entry, status } : entry);
    persist(collections, nextItems);
    setSession(current => current.map(entry => entry.id === item.id ? { ...entry, status } : entry));
  };

  const chooseAnswer = (answer: string) => {
    if (selectedAnswer || !currentItem) return;
    const isCorrect = currentItem.acceptedAnswers.includes(answer);
    setSelectedAnswer(answer);
    setAnswersByItem(previous => ({ ...previous, [currentItem.id]: answer }));
    setResults(previous => ({ ...previous, [currentItem.id]: isCorrect }));
    const nextItems = items.map(entry => entry.id === currentItem.id
      ? { ...entry, status: isCorrect ? 'learned' as const : 'struggled' as const }
      : entry);
    persist(collections, nextItems);
  };

  const deleteCollection = (collectionId: string) => {
    const collection = collections.find(entry => entry.id === collectionId);
    if (!collection || !confirm(`${collection.name} koleksiyonunu ve içindeki kombinasyonları silmek istiyor musunuz?`)) return;
    persist(
      collections.filter(entry => entry.id !== collectionId),
      items.filter(entry => entry.collectionId !== collectionId),
    );
    setSelectedCollectionIds(current => current.filter(id => id !== collectionId));
  };

  useEffect(() => {
    if (!isCompleted || session.length === 0 || historyRecordedRef.current) return;
    historyRecordedRef.current = true;

    const correct = Object.values(results).filter(Boolean).length;
    const wrong = Object.values(results).filter(result => !result).length;
    const learnedCount = session.filter(item => item.status === 'learned').length;
    const sessionCollectionIds = new Set(session.map(item => item.collectionId));
    const historyEntry: StudyHistoryEntry = {
      id: `study_combination_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      startedAt: sessionStartedAtRef.current,
      completedAt: new Date().toISOString(),
      lists: collections
        .filter(collection => sessionCollectionIds.has(collection.id))
        .map(collection => ({ id: collection.id, name: collection.name })),
      sourceType: 'combinations',
      combinationMode: studyMode,
      studyType: studyMode === 'cards' ? 'card' : 'quiz',
      studyMode: studyOrder,
      filterMode: statusFilter,
      wordCount: session.length,
      successRate: Math.round(((studyMode === 'cards' ? learnedCount : correct) / session.length) * 100),
      ...(studyMode === 'cards'
        ? { learnedCount }
        : { correct, wrong, unanswered: Math.max(session.length - correct - wrong, 0) }),
    };

    let previousEntries: StudyHistoryEntry[] = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(STUDY_HISTORY_KEY) || '[]');
      previousEntries = Array.isArray(parsed) ? parsed : [];
    } catch {
      previousEntries = [];
    }
    localStorage.setItem(STUDY_HISTORY_KEY, JSON.stringify([historyEntry, ...previousEntries]));
    window.dispatchEvent(new CustomEvent('lexicards:history-updated'));
  }, [collections, isCompleted, results, session, statusFilter, studyMode, studyOrder]);

  if (session.length > 0) {
    const correctCount = Object.values(results).filter(Boolean).length;
    const wrongItems = session.filter(item => results[item.id] === false);
    const answeredCount = Object.keys(results).length;
    const unansweredCount = Math.max(session.length - answeredCount, 0);
    const learnedCardCount = session.filter(item => item.status === 'learned').length;
    const struggledCardItems = session.filter(item => item.status === 'struggled');
    const retryItems = studyMode === 'completion' ? wrongItems : struggledCardItems;

    if (isCompleted) {
      const successRate = studyMode === 'completion' ? Math.round((correctCount / session.length) * 100) : null;
      return (
        <div className="fixed inset-0 z-[60] flex h-[100dvh] flex-col overflow-hidden bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/95 px-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 sm:px-5">
            <button onClick={() => setSession([])} className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-2 text-xs font-extrabold text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Çık
            </button>
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-indigo-500">Çalışma tamamlandı</p>
              <p className="text-xs font-black text-slate-800 dark:text-white">{session.length} kombinasyon</p>
            </div>
            <div className="w-[52px]" aria-hidden="true" />
          </header>

          <main className="flex min-h-0 flex-1 items-center justify-center px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
            <div className="w-full max-w-md rounded-[1.75rem] border border-slate-100 bg-white p-5 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="mt-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Harika iş</p>
                <h2 className="mt-1.5 text-xl font-black text-slate-900 dark:text-white">Çalışmayı tamamladınız</h2>
                {successRate !== null
                  ? <p className="mt-2 text-sm font-semibold text-slate-500">{correctCount} doğru · {wrongItems.length} yanlış · %{successRate} başarı</p>
                  : <p className="mt-2 text-sm font-semibold text-slate-500">{learnedCardCount} öğrenildi · {struggledCardItems.length} tekrar edilecek</p>}
              </div>
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {retryItems.length > 0 && (
                  <button onClick={() => startStudy(retryItems)} className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-xs font-extrabold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                    <RotateCcw className="h-4 w-4" /> {studyMode === 'completion' ? 'Yanlışları' : 'Zorlandıklarımı'} tekrar et
                  </button>
                )}
                <button onClick={() => setSession([])} className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-xs font-extrabold text-white sm:col-start-2">
                  Çalışma alanına dön
                </button>
              </div>
            </div>
          </main>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[60] flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-slate-50 via-slate-50 to-indigo-50/45 text-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/20 dark:text-slate-100">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/95 px-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 sm:px-5">
          <button onClick={() => setSession([])} className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-2 text-xs font-extrabold text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Çık
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-indigo-500">{studyMode === 'completion' ? 'Boşluk tamamlama' : 'Kombinasyon kartları'}</p>
            <p className="text-xs font-black text-slate-800 dark:text-white">{currentIndex + 1} / {session.length}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsPronunciationEnabled(current => {
              localStorage.setItem('lexicards_pronunciation_enabled', String(!current));
              return !current;
            })}
            className="flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            aria-label={isPronunciationEnabled ? 'Sesi kapat' : 'Sesi aç'}
          >
            {isPronunciationEnabled ? <Volume2 className="h-4 w-4 text-indigo-500" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden min-[370px]:inline">Ses {isPronunciationEnabled ? 'açık' : 'kapalı'}</span>
          </button>
        </header>

        <main className="min-h-0 flex-1 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-5 sm:pb-4 sm:pt-3">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col gap-2 sm:gap-3">
            {studyMode === 'completion' && (
              <div className="h-1 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${((currentIndex + 1) / session.length) * 100}%` }} />
              </div>
            )}

        {studyMode === 'cards' ? (
          <div className="min-h-0 flex-1">
            <CardView
              word={toStudyWord(currentItem)}
              sessionWords={sessionWords}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped(current => !current)}
              onNext={goToNext}
              onPrev={goToPrevious}
              onSetStatus={status => updateItemStatus(currentItem, status)}
              currentIndex={currentIndex}
              totalCount={session.length}
              pronunciationEnabled={isPronunciationEnabled}
              displayVariant="combination"
            />
          </div>
        ) : (
          <>
          <div className="mt-5 grid shrink-0 grid-cols-3 divide-x divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white px-1 py-1 shadow-xs dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900 sm:px-2">
            <div className="px-2 py-1 text-center">
              <p className="text-[8px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Doğru</p>
              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 sm:text-base">{correctCount}<span className="text-[9px] opacity-60">/{session.length}</span></p>
            </div>
            <div className="px-2 py-1 text-center">
              <p className="text-[8px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Yanlış</p>
              <p className="text-sm font-black text-rose-600 dark:text-rose-400 sm:text-base">{wrongItems.length}<span className="text-[9px] opacity-60">/{session.length}</span></p>
            </div>
            <div className="px-2 py-1 text-center">
              <p className="text-[8px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Kalan</p>
              <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 sm:text-base">{unansweredCount}<span className="text-[9px] opacity-60">/{session.length}</span></p>
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-[1fr_1.2fr_1fr] divide-x divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="min-h-11 min-w-0 bg-transparent px-2 py-1.5 text-left disabled:cursor-default disabled:opacity-35"
            >
              <span className="flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider text-slate-400"><ChevronLeft className="h-3 w-3" /> Önceki</span>
              <span className="block truncate text-[10px] font-black text-slate-700 dark:text-slate-200">{getNavigationLabel(session[currentIndex - 1])}</span>
            </button>
            <div className="min-h-11 min-w-0 bg-indigo-50/70 px-2 py-1.5 text-center dark:bg-indigo-950/25">
              <span className="block text-[8px] font-black uppercase tracking-wider text-indigo-400">Şu anki</span>
              <span className="block truncate text-[11px] font-black text-slate-950 dark:text-white">{getNavigationLabel(currentItem)}</span>
            </div>
            <button
              type="button"
              onClick={goToNext}
              className="min-h-11 min-w-0 bg-transparent px-2 py-1.5 text-right"
            >
              <span className="flex items-center justify-end gap-0.5 text-[8px] font-black uppercase tracking-wider text-slate-400">{currentIndex < session.length - 1 ? 'Sonraki' : 'Bitir'} <ChevronRight className="h-3 w-3" /></span>
              <span className="block truncate text-[10px] font-black text-slate-700 dark:text-slate-200">{currentIndex < session.length - 1 ? getNavigationLabel(session[currentIndex + 1]) : 'Oturumu tamamla'}</span>
            </button>
          </div>
          <motion.div
            key={currentItem.id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -70) goToNext();
              if (info.offset.x > 70) goToPrevious();
            }}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            className="my-auto flex w-[calc(100%+0.5rem)] shrink-0 self-center touch-pan-y flex-col overflow-y-auto overscroll-contain rounded-[1.7rem] border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5"
            style={{ touchAction: 'pan-y', height: 'clamp(340px, 60dvh, 470px)' }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3">
              <span className="truncate text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:text-[10px]">{FAMILY_LABELS[currentItem.family]}</span>
              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Kelime kartı</span>
            </div>

            <div className="flex min-h-[150px] flex-1 flex-col items-center justify-center py-3 text-center sm:py-4">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:text-[10px]">Doğru eki seçerek tamamlayın</p>
              <h2 className="mt-2 line-clamp-2 max-w-full break-words font-mono text-[clamp(1.45rem,3.5vh,1.9rem)] font-black leading-relaxed text-slate-900 [overflow-wrap:anywhere] dark:text-white">
                {selectedAnswer ? currentItem.expression : currentItem.clozePrompt}
              </h2>
              <p className="mt-2 line-clamp-2 max-w-full rounded-xl bg-indigo-50/65 px-3 py-2 text-[11px] font-extrabold leading-snug text-indigo-800 dark:bg-indigo-950/25 dark:text-indigo-200 sm:text-xs">
                {currentItem.meaning}
              </p>
              {selectedAnswer && (
                <button
                  type="button"
                  onClick={() => {
                    if (isPronunciationEnabled) speakWord(currentItem.expression);
                  }}
                  disabled={!isPronunciationEnabled}
                  className={`mt-3 flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95 ${
                    isPronunciationEnabled
                      ? 'cursor-pointer bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400'
                      : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                  }`}
                  aria-label={isPronunciationEnabled ? 'Doğru kombinasyonu seslendir' : 'Telaffuz kapalı'}
                  title={isPronunciationEnabled ? 'Telaffuzu dinle' : 'Telaffuz kapalı'}
                >
                  {isPronunciationEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </button>
              )}
            </div>

            <div className="mt-2 shrink-0 border-t border-slate-100 pt-2.5 dark:border-slate-800 sm:mt-3 sm:pt-3">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {choices.map(choice => {
                const isCorrectChoice = currentItem.acceptedAnswers.includes(choice);
                const isSelected = selectedAnswer === choice;
                const revealedClass = selectedAnswer
                  ? isCorrectChoice
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : isSelected
                      ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
                      : 'border-slate-100 text-slate-350 opacity-55 dark:border-slate-800'
                  : 'border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-indigo-950/20';
                return (
                  <button key={choice} onClick={() => chooseAnswer(choice)} disabled={selectedAnswer !== null} className={`min-h-11 cursor-pointer rounded-xl border-2 px-3 py-1.5 text-sm font-black transition sm:min-h-12 sm:rounded-2xl sm:px-4 sm:text-base ${revealedClass}`}>
                    {choice}
                  </button>
                );
              })}
            </div>
            {selectedAnswer && (
              <div className={`mt-2 flex min-h-[52px] items-center justify-between gap-2 rounded-xl p-2 sm:mt-3 sm:min-h-[58px] sm:gap-3 sm:rounded-2xl sm:p-3 ${results[currentItem.id] ? 'bg-emerald-50 dark:bg-emerald-950/25' : 'bg-rose-50 dark:bg-rose-950/25'}`}>
                <div className="flex min-w-0 items-center gap-2">
                  {results[currentItem.id] ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <XCircle className="h-5 w-5 shrink-0 text-rose-600" />}
                  <div className="min-w-0 text-left">
                    <p className={`truncate text-xs font-black sm:text-sm ${results[currentItem.id] ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{results[currentItem.id] ? `Doğru: ${selectedAnswer}` : `Doğru ek: ${currentItem.acceptedAnswers.join(' / ')}`}</p>
                    <p className="mt-0.5 truncate text-[9px] font-semibold text-slate-500 sm:text-[11px]">{currentItem.expression}</p>
                  </div>
                </div>
                <button onClick={goToNext} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900" aria-label={currentIndex < session.length - 1 ? 'Sonraki soru' : 'Çalışmayı bitir'}><ArrowRight className="h-5 w-5" /></button>
              </div>
            )}
            </div>
          </motion.div>
          </>
        )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {view === 'all' && (
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-4 text-white shadow-md sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><Sparkles className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.17em] text-indigo-100">YÖKDİL çalışma alanı</p>
            <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Common Combinations</h2>
            <p className="mt-1.5 text-xs font-medium leading-relaxed text-indigo-100">Kalıpları kartla öğren, doğru eki boşlukta seç.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/10 px-2 py-2 text-center"><p className="text-sm font-black">{items.length}</p><p className="text-[8px] font-bold uppercase text-indigo-100">Toplam</p></div>
          <div className="rounded-xl bg-white/10 px-2 py-2 text-center"><p className="text-sm font-black">{learnedItemCount}</p><p className="text-[8px] font-bold uppercase text-emerald-200">Öğrenilen</p></div>
          <div className="rounded-xl bg-white/10 px-2 py-2 text-center"><p className="text-sm font-black">{struggledItemCount}</p><p className="text-[8px] font-bold uppercase text-rose-200">Tekrar</p></div>
        </div>
      </section>
      )}

      {(view === 'study' || view === 'collections' || view === 'library') && items.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Layers3 className="mx-auto h-8 w-8 text-slate-300" />
          <h3 className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">Henüz kalıp koleksiyonu yok</h3>
          <p className="mt-1 text-xs font-semibold text-slate-400">Varsayılan Day 56 verisi yüklenemedi. Sayfayı yenileyip tekrar deneyin.</p>
        </div>
      )}

      {items.length > 0 && (
        <>
          {(view === 'all' || view === 'study') && (
          <div className="space-y-2 sm:space-y-3">
            <section className="grid grid-cols-3 divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-white px-2 py-1.5 shadow-xs dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900 sm:px-4 sm:py-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-wider text-slate-400"><Layers3 className="h-3 w-3 text-indigo-500" /> Toplam</div>
                <p className="mt-0.5 text-sm font-black text-slate-800 dark:text-white sm:mt-1 sm:text-base">{items.length}<span className="ml-1 text-[9px] text-slate-400">kalıp</span></p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-wider text-slate-400"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Öğrenilen</div>
                <p className="mt-0.5 text-sm font-black text-emerald-600 dark:text-emerald-400 sm:mt-1 sm:text-base">{learnedItemCount}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-wider text-slate-400"><Sparkles className="h-3 w-3 text-amber-500" /> Başarı</div>
                <p className="mt-0.5 text-sm font-black text-violet-600 dark:text-violet-400 sm:mt-1 sm:text-base">%{items.length > 0 ? Math.round((learnedItemCount / items.length) * 100) : 0}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-2.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 sm:h-9 sm:w-9 sm:rounded-xl"><Settings className="h-4 w-4" /></span><div className="min-w-0"><h3 className="text-sm font-black text-slate-900 dark:text-white">Çalışma</h3><p className="truncate text-[9px] font-semibold uppercase text-slate-400 sm:text-[10px]">{eligibleItems.length} kalıp hazır</p></div></div>
                <span className="shrink-0 rounded-xl border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-[9px] font-black uppercase text-indigo-600 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300">{selectedCollectionIds.length} liste</span>
              </div>

              <div className="mt-2 flex min-h-11 items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/45 p-1.5 dark:border-slate-800 dark:bg-slate-950/20 sm:mt-3 sm:min-h-14 sm:gap-3 sm:p-2">
                <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Seçilen koleksiyon</p><p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">{selectedCollectionIds.length === collections.length ? 'Tüm kalıp koleksiyonları' : collections.find(collection => collection.id === selectedCollectionIds[0])?.name || 'Seçilmedi'}</p></div>
                <select
                  aria-label="Kalıp koleksiyonu seç"
                  value={selectedCollectionIds.length === collections.length ? 'all' : selectedCollectionIds[0] || ''}
                  onChange={event => setSelectedCollectionIds(event.target.value === 'all' ? collections.map(collection => collection.id) : [event.target.value])}
                  className="h-11 max-w-[52%] cursor-pointer rounded-xl border border-indigo-200 bg-white px-2 text-[10px] font-black text-indigo-600 outline-none dark:border-indigo-900 dark:bg-slate-900 dark:text-indigo-300"
                >
                  <option value="all">Tümünü seç</option>
                  {collections.map(collection => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
                </select>
              </div>

              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/45 p-1 dark:border-slate-800 dark:bg-slate-950/20 sm:mt-2 sm:p-1.5">
                <label className="w-20 shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Sıralama</label>
                <div className="grid flex-1 grid-cols-2 gap-1 rounded-lg border border-slate-100 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-950">
                  <button onClick={() => setStudyOrder('sequential')} className={`min-h-10 cursor-pointer rounded-md text-[11px] font-extrabold ${studyOrder === 'sequential' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 dark:text-slate-400'}`}>Sıralı</button>
                  <button onClick={() => setStudyOrder('shuffled')} className={`min-h-10 cursor-pointer rounded-md text-[11px] font-extrabold ${studyOrder === 'shuffled' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 dark:text-slate-400'}`}>Karışık</button>
                </div>
              </div>

              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/45 p-1 dark:border-slate-800 dark:bg-slate-950/20 sm:mt-2 sm:p-1.5">
                <label className="w-20 shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Telaffuz</label>
                <div className="grid flex-1 grid-cols-2 gap-1 rounded-lg border border-slate-100 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-950">
                  <button onClick={() => { setIsPronunciationEnabled(true); localStorage.setItem('lexicards_pronunciation_enabled', 'true'); }} className={`min-h-10 cursor-pointer rounded-md text-[11px] font-extrabold ${isPronunciationEnabled ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 dark:text-slate-400'}`}>Açık</button>
                  <button onClick={() => { setIsPronunciationEnabled(false); localStorage.setItem('lexicards_pronunciation_enabled', 'false'); }} className={`min-h-10 cursor-pointer rounded-md text-[11px] font-extrabold ${!isPronunciationEnabled ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 dark:text-slate-400'}`}>Kapalı</button>
                </div>
              </div>

              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/45 p-1 dark:border-slate-800 dark:bg-slate-950/20 sm:mt-2 sm:p-1.5">
                <label className="w-20 shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Durum</label>
                <div className="grid flex-1 grid-cols-3 gap-1 rounded-lg border border-slate-100 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-950">
                  <button onClick={() => setStatusFilter('all')} className={`min-h-10 cursor-pointer rounded-md text-[10px] font-extrabold ${statusFilter === 'all' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 dark:text-slate-400'}`}>Tümü</button>
                  <button onClick={() => setStatusFilter('unlearned')} className={`min-h-10 cursor-pointer rounded-md px-0.5 text-[9px] font-extrabold sm:text-[10px] ${statusFilter === 'unlearned' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 dark:text-slate-400'}`}>Öğrenilmeyen</button>
                  <button onClick={() => setStatusFilter('learned')} className={`min-h-10 cursor-pointer rounded-md text-[9px] font-extrabold sm:text-[10px] ${statusFilter === 'learned' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 dark:text-slate-400'}`}>Öğrenilen</button>
                </div>
              </div>

              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/45 p-1 dark:border-slate-800 dark:bg-slate-950/20 sm:mt-2 sm:p-2">
                <label className="w-20 shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Tür</label>
                <StudyModeSwitch
                  value={studyMode}
                  onChange={setStudyMode}
                  options={[
                    { value: 'cards', label: 'Kart', icon: <Layers3 className="h-3.5 w-3.5" /> },
                    { value: 'completion', label: 'Boşluk', icon: <ListFilter className="h-3.5 w-3.5" /> },
                  ]}
                />
              </div>

              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:mt-2">
                <label>
                  <span className="mb-1 block text-[8px] font-black uppercase tracking-wider text-slate-400">Kalıp türü</span>
                  <select value={familyFilter} onChange={event => setFamilyFilter(event.target.value as FamilyFilter)} className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                    <option value="all">Tüm türler</option><option value="verb">Verb + Prep</option><option value="adjective">Adj + Prep</option><option value="noun">Noun + Prep</option><option value="prep-noun">Prep + Noun</option>
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-[8px] font-black uppercase tracking-wider text-slate-400">Adet</span>
                  <select value={studySize} onChange={event => setStudySize(event.target.value === 'all' ? 'all' : Number(event.target.value) as 10 | 20 | 30)} className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"><option value={10}>10 kalıp</option><option value={20}>20 kalıp</option><option value={30}>30 kalıp</option><option value="all">Tümü</option></select>
                </label>
              </div>

              <button onClick={() => startStudy()} disabled={eligibleItems.length === 0} className="mt-3 hidden min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black text-white shadow-md transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 md:flex"><Play className="h-4 w-4 fill-current" /> Başlat · {studySize === 'all' ? eligibleItems.length : Math.min(studySize, eligibleItems.length)} kalıp</button>
              {eligibleItems.length === 0 && <p className="mt-2 text-center text-[10px] font-bold text-amber-600 dark:text-amber-400">Bu seçimlere uygun kalıp bulunamadı.</p>}
            </section>

            <div className="fixed left-0 right-0 z-50 px-4 pointer-events-none md:hidden" style={{ bottom: 'calc(68px + env(safe-area-inset-bottom))' }}>
              <button onClick={() => startStudy()} disabled={eligibleItems.length === 0} className="pointer-events-auto mx-auto flex min-h-12 w-full max-w-md cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-wider text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-45"><Play className="h-4 w-4 fill-current" /> Başlat · {studySize === 'all' ? eligibleItems.length : Math.min(studySize, eligibleItems.length)} kalıp</button>
            </div>
          </div>
          )}

          {(view === 'all' || view === 'collections') && (
          <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div><h3 className="text-sm font-black text-slate-900 dark:text-white">Kalıp koleksiyonları</h3><p className="text-xs font-semibold text-slate-400">Yüklenen dosyaları görüntüle ve yönet</p></div>
              <span className="rounded-xl bg-violet-50 px-2.5 py-1.5 text-[10px] font-black text-violet-600 dark:bg-violet-950/35 dark:text-violet-300">{collections.length} koleksiyon</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {collections.map(collection => {
                const collectionItems = items.filter(item => item.collectionId === collection.id);
                const collectionLearned = collectionItems.filter(item => item.status === 'learned').length;
                const collectionStruggled = collectionItems.filter(item => item.status === 'struggled').length;
                return (
                  <div key={collection.id} className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">{collection.name}</p><p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">{collection.fileName}</p></div>
                      <button onClick={() => deleteCollection(collection.id)} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/25" aria-label="Koleksiyonu sil"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                      <span className="rounded-lg bg-slate-50 px-1 py-1.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800">{collectionItems.length} kayıt</span>
                      <span className="rounded-lg bg-emerald-50 px-1 py-1.5 text-[9px] font-bold text-emerald-600 dark:bg-emerald-950/25 dark:text-emerald-400">{collectionLearned} öğrenildi</span>
                      <span className="rounded-lg bg-rose-50 px-1 py-1.5 text-[9px] font-bold text-rose-600 dark:bg-rose-950/25 dark:text-rose-400">{collectionStruggled} tekrar</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          )}

          {(view === 'all' || view === 'collections' || view === 'library') && (
          <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h3 className="text-sm font-black text-slate-900 dark:text-white">Kombinasyon kütüphanesi</h3><p className="text-xs font-semibold text-slate-400">Öğrenme durumunu gör, filtrele ve ara</p></div>
              <label className="relative block sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="İfade veya anlam ara..." className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                ['all', 'Tümü', items.length],
                ['learned', 'Öğrenildi', learnedItemCount],
                ['struggled', 'Tekrar', struggledItemCount],
                ['unmarked', 'Yeni', unmarkedItemCount],
              ] as const).map(([value, label, count]) => (
                <button key={value} onClick={() => setLibraryStatusFilter(value)} className={`flex min-h-10 cursor-pointer items-center justify-between rounded-xl px-3 text-xs font-bold transition ${libraryStatusFilter === value ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}><span>{label}</span><span className="text-[10px] opacity-70">{count}</span></button>
              ))}
            </div>
            <div className="mt-4 max-h-[430px] space-y-2 overflow-y-auto pr-1">
              {visibleItems.map(item => {
                const statusLabel = item.status === 'learned' ? 'Öğrenildi' : item.status === 'struggled' ? 'Tekrar' : 'Yeni';
                const statusClass = item.status === 'learned'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900'
                  : item.status === 'struggled'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900'
                    : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
                return (
                  <div key={item.id} className="grid gap-2 rounded-xl border border-slate-100 px-3 py-3 dark:border-slate-800 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:gap-4 sm:px-4">
                    <div className="min-w-0"><p className="break-words text-sm font-black text-slate-800 [overflow-wrap:anywhere] dark:text-slate-100">{item.expression}</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-500">{item.pattern}</p></div>
                    <p className="break-words text-xs font-semibold text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">{item.meaning}</p>
                    <span className={`w-fit rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${statusClass}`}>{statusLabel}</span>
                  </div>
                );
              })}
              {visibleItems.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-xs font-bold text-slate-400 dark:border-slate-700">Bu filtreye uygun kombinasyon bulunamadı.</div>}
            </div>
          </section>
          )}
        </>
      )}
    </div>
  );
}
