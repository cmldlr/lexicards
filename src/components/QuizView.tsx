import React, { useState, useEffect } from 'react';
import { Word } from '../types';
import { speakWord } from '../utils';
import { 
  Volume2, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft,
  ChevronRight, 
  HelpCircle, 
  Info,
  Sparkles,
  VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuizViewProps {
  word: Word;
  allWords: Word[];
  currentIndex: number;
  totalCount: number;
  quizMode: 'syn-to-word' | 'word-to-syn' | 'word-to-tr' | 'tr-to-word';
  answerState?: QuizAnswerState;
  answerStates: Record<string, QuizAnswerState>;
  navDirection: 1 | -1;
  pronunciationEnabled: boolean;
  onNext: () => void;
  onPrev: () => void;
  onJumpToIndex: (index: number) => void;
  onSaveAnswer: (wordId: string, answer: QuizAnswerState) => void;
}

interface Choice {
  id: string;
  term: string;
  synonyms: string;
  turkishMeanings: string[];
}

interface QuizAnswerState {
  choices: Choice[];
  selectedId: string | null;
  isAnswered: boolean;
  isCorrect: boolean;
}

export default function QuizView({
  word,
  allWords,
  currentIndex,
  totalCount,
  quizMode,
  answerState,
  answerStates,
  navDirection,
  pronunciationEnabled,
  onNext,
  onPrev,
  onJumpToIndex,
  onSaveAnswer
}: QuizViewProps) {
  const [choices, setChoices] = useState<Choice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);
  const activeWords = allWords.length > 0 ? allWords : [word];
  const progressPercent = totalCount > 0 ? ((currentIndex + 1) / totalCount) * 100 : 0;
  const quizStatusCounts = activeWords.reduce(
    (acc, item) => {
      const answer = answerStates[item.id];
      if (!answer?.isAnswered) {
        acc.unanswered += 1;
      } else if (answer.isCorrect) {
        acc.correct += 1;
      } else {
        acc.wrong += 1;
      }
      return acc;
    },
    { unanswered: 0, wrong: 0, correct: 0 }
  );

  const findNextQuizStatusIndex = (status: 'unanswered' | 'wrong' | 'correct') => {
    if (activeWords.length === 0) return -1;

    for (let offset = 1; offset <= activeWords.length; offset++) {
      const nextIndex = (currentIndex + offset) % activeWords.length;
      const answer = answerStates[activeWords[nextIndex].id];
      const matchesStatus =
        status === 'unanswered'
          ? !answer?.isAnswered
          : status === 'wrong'
            ? !!answer?.isAnswered && !answer.isCorrect
            : !!answer?.isAnswered && answer.isCorrect;

      if (matchesStatus) return nextIndex;
    }

    return -1;
  };

  const handleJumpToQuizStatus = (status: 'unanswered' | 'wrong' | 'correct') => {
    const nextIndex = findNextQuizStatusIndex(status);
    if (nextIndex >= 0) {
      onJumpToIndex(nextIndex);
    }
  };

  const getTurkishChoiceText = (choice: Pick<Choice, 'turkishMeanings'>) => (
    choice.turkishMeanings.length > 0 ? choice.turkishMeanings.join(', ') : 'Türkçe anlam yok'
  );

  const getChoiceText = (choice: Choice) => {
    if (quizMode === 'syn-to-word' || quizMode === 'tr-to-word') return choice.term;
    if (quizMode === 'word-to-syn') return choice.synonyms;
    return getTurkishChoiceText(choice);
  };

  const shuffleItems = <T,>(items: T[]) => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const getAnswerKey = (item: Word | Choice) => {
    if (quizMode === 'word-to-tr') return getTurkishChoiceText(item).toLowerCase().trim();
    if (quizMode === 'word-to-syn') return item.synonyms.toLowerCase().trim();
    return item.term.toLowerCase().trim();
  };

  // Re-generate choices when the active word changes
  useEffect(() => {
    if (!word) return;

    if (answerState) {
      setChoices(answerState.choices);
      setSelectedId(answerState.selectedId);
      setIsAnswered(answerState.isAnswered);
      setIsCorrect(answerState.isCorrect);

      if (pronunciationEnabled && (quizMode === 'word-to-syn' || quizMode === 'word-to-tr')) {
        speakWord(word.term);
      }
      return;
    }

    // Reset interaction state
    setSelectedId(null);
    setIsAnswered(false);
    setIsCorrect(false);

    // Filter out candidates that cannot be used as answer options for the current mode
    const validDistractorPool = allWords.filter(w => {
      if (w.id === word.id || w.term.toLowerCase() === word.term.toLowerCase()) return false;
      if (quizMode === 'word-to-tr' || quizMode === 'tr-to-word') return w.turkishMeanings.length > 0;
      return true;
    });

    const randomizedPool = shuffleItems(validDistractorPool);

    // Pick 3 random distractors with unique visible answer texts
    const chosenDistractors: Word[] = [];
    const usedAnswerKeys = new Set<string>([getAnswerKey(word)]);

    for (const item of randomizedPool) {
      if (chosenDistractors.length >= 3) break;

      const answerKey = getAnswerKey(item);
      if (answerKey && !usedAnswerKeys.has(answerKey)) {
        chosenDistractors.push(item);
        usedAnswerKeys.add(answerKey);
      }
    }

    // Assemble the 4 choices (correct + 3 distractors)
    const rawChoices: Choice[] = [
      { id: word.id, term: word.term, synonyms: word.synonyms, turkishMeanings: word.turkishMeanings },
      ...chosenDistractors.map(d => ({
        id: d.id,
        term: d.term,
        synonyms: d.synonyms,
        turkishMeanings: d.turkishMeanings
      }))
    ];

    // Shuffle the options
    const shuffled = shuffleItems(rawChoices);
    setChoices(shuffled);
    onSaveAnswer(word.id, {
      choices: shuffled,
      selectedId: null,
      isAnswered: false,
      isCorrect: false
    });

    // Automatically speak the term if the English word is the prompt
    if (pronunciationEnabled && (quizMode === 'word-to-syn' || quizMode === 'word-to-tr')) {
      speakWord(word.term);
    }
  }, [word.id, quizMode, pronunciationEnabled]);

  const handleSelectChoice = (choice: Choice) => {
    if (isAnswered) return;

    if (selectedId !== choice.id) {
      setSelectedId(choice.id);
      onSaveAnswer(word.id, {
        choices,
        selectedId: choice.id,
        isAnswered: false,
        isCorrect: false
      });
      return;
    }

    setSelectedId(choice.id);
    const correct = choice.id === word.id;
    setIsCorrect(correct);
    setIsAnswered(true);
    onSaveAnswer(word.id, {
      choices,
      selectedId: choice.id,
      isAnswered: true,
      isCorrect: correct
    });

    if (correct) {
      // Speak term for confirmation & pronunciation reinforcement
      if (pronunciationEnabled) {
        speakWord(word.term);
      }
    }
  };

  const handlePronounce = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!pronunciationEnabled) return;
    speakWord(word.term);
  };

  const handleDrag = (event: any, info: any) => {
    if (info.offset.x < -40) {
      setDragDirection('left');
    } else if (info.offset.x > 40) {
      setDragDirection('right');
    } else {
      setDragDirection(null);
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    setDragDirection(null);
    if (info.offset.x < -85) {
      onNext();
    } else if (info.offset.x > 85 && currentIndex > 0) {
      onPrev();
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-2 sm:px-0 overflow-hidden select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties}>
      <div className="w-full mb-3 space-y-2.5">
        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <span>SORU {currentIndex + 1} / {totalCount}</span>
          <span>İlerleme</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleJumpToQuizStatus('unanswered')}
            disabled={quizStatusCounts.unanswered === 0}
            className="min-w-0 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-2 py-2 text-center disabled:opacity-35 disabled:cursor-default cursor-pointer"
          >
            <div className="text-[8px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Cevapsız</div>
            <div className="mt-0.5 text-sm font-display font-black text-indigo-600 dark:text-indigo-400">{quizStatusCounts.unanswered}<span className="mx-0.5 text-[10px] opacity-70">/</span><span className="text-xs">{activeWords.length}</span></div>
          </button>
          <button
            type="button"
            onClick={() => handleJumpToQuizStatus('wrong')}
            disabled={quizStatusCounts.wrong === 0}
            className="min-w-0 rounded-xl border border-rose-500/20 bg-rose-500/10 px-2 py-2 text-center disabled:opacity-35 disabled:cursor-default cursor-pointer"
          >
            <div className="text-[8px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Yanlış</div>
            <div className="mt-0.5 text-sm font-display font-black text-rose-600 dark:text-rose-400">{quizStatusCounts.wrong}<span className="mx-0.5 text-[10px] opacity-70">/</span><span className="text-xs">{activeWords.length}</span></div>
          </button>
          <button
            type="button"
            onClick={() => handleJumpToQuizStatus('correct')}
            disabled={quizStatusCounts.correct === 0}
            className="min-w-0 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2 py-2 text-center disabled:opacity-35 disabled:cursor-default cursor-pointer"
          >
            <div className="text-[8px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Doğru</div>
            <div className="mt-0.5 text-sm font-display font-black text-emerald-600 dark:text-emerald-400">{quizStatusCounts.correct}<span className="mx-0.5 text-[10px] opacity-70">/</span><span className="text-xs">{activeWords.length}</span></div>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={word.id}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.35}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0, x: navDirection * 36 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: navDirection * -36 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex flex-col space-y-5 cursor-grab active:cursor-grabbing touch-pan-y select-none"
        >
      
      {/* Quiz Card Box */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs hover:shadow-md transition-all relative overflow-hidden">
        
        {/* Decorative Top Line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>

        {/* Visual swipe suggestion arrows */}
        <AnimatePresence>
          {dragDirection === 'left' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 0.9, x: 0 }}
              exit={{ opacity: 0 }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-slate-950 text-white p-3.5 rounded-2xl shadow-lg pointer-events-none"
            >
              <ChevronRight className="w-5 h-5 animate-bounce text-indigo-400" />
            </motion.div>
          )}
          {dragDirection === 'right' && currentIndex > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 0.9, x: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-slate-950 text-white p-3.5 rounded-2xl shadow-lg pointer-events-none"
            >
              <ChevronLeft className="w-5 h-5 animate-bounce text-indigo-400" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card Header Info */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center space-x-1.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/40 dark:border-indigo-900/30 px-2.5 py-1 rounded-xl">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {quizMode === 'syn-to-word' ? 'syn-word' : quizMode === 'word-to-syn' ? 'word-syn' : quizMode === 'word-to-tr' ? 'word-tr' : 'tr-word'}
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg">
            Soru {currentIndex + 1} / {totalCount}
          </span>
        </div>

        {/* Question Area */}
        <div className="text-center py-4 px-2 bg-slate-50/30 dark:bg-slate-950/20 border border-slate-100/60 dark:border-slate-850 rounded-2xl mb-6">
          <span className="text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest block mb-2">
            {quizMode === 'syn-to-word'
              ? 'syn verildi, kelimeyi seç:'
              : quizMode === 'word-to-syn'
                ? 'kelime verildi, syn seç:'
                : quizMode === 'word-to-tr'
                  ? 'kelime verildi, Türkçe anlamı seç:'
                  : 'Türkçe anlam verildi, kelimeyi seç:'
            }
          </span>

          {quizMode === 'syn-to-word' ? (
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-serif italic font-black text-indigo-700 dark:text-indigo-400 leading-relaxed px-4 break-words">
                "{word.synonyms}"
              </h1>
            </div>
          ) : quizMode === 'tr-to-word' ? (
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-display font-black text-indigo-700 dark:text-indigo-400 leading-relaxed px-4 break-words">
                {word.turkishMeanings.join(', ')}
              </h1>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-800 dark:text-white tracking-tight break-all">
                  {word.term}
                </h1>
                <button
                  onClick={handlePronounce}
                  disabled={!pronunciationEnabled}
                  className={`p-1.5 rounded-full transition-all active:scale-95 ${
                    pronunciationEnabled
                      ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-indigo-400 cursor-pointer'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                  }`}
                  title={pronunciationEnabled ? 'Sesli Telaffuz' : 'Telaffuz kapalı'}
                >
                  {pronunciationEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Extra visual hint: Turkish meanings shown as a tiny helper badge after answered */}
              {isAnswered && quizMode !== 'word-to-tr' && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap justify-center gap-1 mt-1"
                >
                  {word.turkishMeanings.slice(0, 2).map((m, idx) => (
                    <span key={idx} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-bold">
                      {m}
                    </span>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Options / Choices */}
        <div className="space-y-3">
          {choices.map((choice, idx) => {
            const isSelected = selectedId === choice.id;
            const isCorrectAnswer = choice.id === word.id;
            
            // Determine button colors based on answered state
            let buttonClass = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700';
            let iconElement = <span className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400 dark:text-slate-500 shrink-0 bg-slate-50 dark:bg-slate-950">{String.fromCharCode(65 + idx)}</span>;

            if (isAnswered) {
              if (isCorrectAnswer) {
                // Highlight correct option in Emerald Green
                buttonClass = 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/10';
                iconElement = <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
              } else if (isSelected) {
                // Highlight incorrect user choice in Rose Red
                buttonClass = 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-800 dark:text-rose-300 ring-2 ring-rose-500/10';
                iconElement = <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;
              } else {
                // Muted/disabled other options
                buttonClass = 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-150 dark:border-slate-850 text-slate-400 dark:text-slate-650 opacity-60 cursor-not-allowed';
              }
            } else if (isSelected) {
              buttonClass = 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 text-indigo-800 dark:text-indigo-300 ring-2 ring-indigo-500/10';
              iconElement = <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">{String.fromCharCode(65 + idx)}</span>;
            }

            return (
              <button
                key={choice.id}
                disabled={isAnswered}
                onClick={() => handleSelectChoice(choice)}
                className={`w-full p-3.5 sm:p-4 rounded-2xl border-2 text-left font-bold transition-all flex items-center justify-between cursor-pointer text-xs sm:text-sm active:scale-[0.99] ${buttonClass}`}
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  {iconElement}
                  <span className="min-w-0 whitespace-normal break-words leading-snug">
                    {getChoiceText(choice)}
                  </span>
                </div>
                
                {/* Additional badge for English term in word-to-syn mode once answered */}
                {isAnswered && isCorrectAnswer && quizMode === 'word-to-syn' && (
                  <span className="text-[9px] font-mono font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded">DOĞRU</span>
                )}
                {isAnswered && isCorrectAnswer && quizMode !== 'word-to-syn' && (
                  <span className="text-[9px] font-mono font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded">DOĞRU</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Answer Feedback */}
        <AnimatePresence>
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-850 overflow-hidden"
            >
              <div className="flex items-start space-x-2.5">
                {isCorrect ? (
                  <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 animate-spin-slow" />
                  </div>
                ) : (
                  <div className="p-1.5 bg-rose-50 dark:bg-rose-950/50 rounded-xl text-rose-600 shrink-0 mt-0.5">
                    <Info className="w-4 h-4" />
                  </div>
                )}
                <div className="space-y-0.5">
                  <p className={`text-xs font-black uppercase tracking-wider ${isCorrect ? 'text-emerald-650 dark:text-emerald-400' : 'text-rose-650 dark:text-rose-400'}`}>
                    {isCorrect ? 'Tebrikler! Doğru Cevap' : 'Yanlış Cevap! Doğrusu:'}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 font-bold leading-normal">
                    {quizMode === 'syn-to-word' || quizMode === 'tr-to-word' ? (
                      <span>
                        <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">{word.term}</strong>
                        {word.turkishMeanings.length > 0 && ` (${word.turkishMeanings.join(', ')})`}
                      </span>
                    ) : quizMode === 'word-to-syn' ? (
                      <span>
                        <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">{word.term}</strong> eş anlamlıları: <em className="text-slate-500 font-medium">"{word.synonyms}"</em>
                      </span>
                    ) : (
                      <span>
                        <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">{word.term}</strong>: <em className="text-slate-500 font-medium">{word.turkishMeanings.join(', ')}</em>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={onNext}
                className="hidden"
              >
                <span>{currentIndex < totalCount - 1 ? 'Sonraki Soru' : 'Sonuçları Gör'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between gap-3">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="py-3 px-4 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-850 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Geri</span>
          </button>

          <button
            onClick={onNext}
            className="flex-1 sm:flex-none py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-xs"
          >
            <span>
              {currentIndex < totalCount - 1
                ? (isAnswered ? 'Sonraki' : 'Atla')
                : 'Bitir'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Secondary mini helper banner to prompt space-bar or clicking */}
      {!isAnswered && (
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            <span>Doğru şıkka tıklayarak cevap verin</span>
          </p>
        </div>
      )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
