import React, { useEffect, useState } from 'react';
import { Word } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, Check, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, XCircle } from 'lucide-react';
import { speakWord, getWordTypeColor } from '../utils';

interface CardViewProps {
  word: Word;
  sessionWords: Word[];
  isFlipped: boolean;
  onFlip: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSetStatus: (status: 'unmarked' | 'learned' | 'struggled') => void;
  currentIndex: number;
  totalCount: number;
}

export default function CardView({
  word,
  sessionWords,
  isFlipped,
  onFlip,
  onNext,
  onPrev,
  onSetStatus,
  currentIndex,
  totalCount
}: CardViewProps) {
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const activeWords = sessionWords.length > 0 ? sessionWords : [word];
  const getStatus = (item: Word) => item.status || (item.learned ? 'learned' : 'unmarked');
  const learnedCount = activeWords.filter(item => getStatus(item) === 'learned').length;
  const struggledCount = activeWords.filter(item => getStatus(item) === 'struggled').length;
  const pendingCount = Math.max(activeWords.length - learnedCount - struggledCount, 0);
  const totalForStats = Math.max(activeWords.length, 1);
  const percentOfTotal = (count: number) => Math.max(0, Math.min(100, (count / totalForStats) * 100));
  const learnedPercent = percentOfTotal(learnedCount);
  const struggledPercent = percentOfTotal(struggledCount);
  const pendingPercent = percentOfTotal(pendingCount);
  const previousWord = activeWords[currentIndex - 1];
  const nextWord = activeWords[currentIndex + 1];

  // Keyboard Navigation & Flip support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        onFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      } else if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
        onFlip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFlip, onNext, onPrev]);

  // Audio speech
  const handlePronounce = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip when clicking audio button
    speakWord(word.term);
  };

  // Swiping direction guide indicator
  const handleDrag = (event: any, info: any) => {
    if (Math.abs(info.offset.x) > 8) {
      setIsDragging(true);
    }

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
    window.setTimeout(() => setIsDragging(false), 0);

    if (info.offset.x < -85) {
      onNext();
    } else if (info.offset.x > 85) {
      onPrev();
    }
  };

  // Prevent card flip when clicking specific child controls
  const handleContainerClick = (e: React.MouseEvent) => {
    if (isDragging) {
      return;
    }

    // If user is clicking an interactive element, do not flip the card
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    onFlip();
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center px-2">
      {/* Study snapshot */}
      <div className="w-full mb-3 space-y-2.5">
        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <span>KART {currentIndex + 1} / {totalCount}</span>
          <span>Durum özeti</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 flex">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${learnedPercent}%` }} />
          <div className="h-full bg-rose-500 transition-all" style={{ width: `${struggledPercent}%` }} />
          <div className="h-full bg-indigo-500 transition-all" style={{ width: `${pendingPercent}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-2 py-2.5 text-center shadow-3xs">
            <div className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Öğrendim</div>
            <div className="mt-0.5 text-base font-display font-black text-emerald-600 dark:text-emerald-400">{learnedCount}<span className="mx-0.5 text-[10px] text-emerald-500/70">/</span><span className="text-xs">{activeWords.length}</span></div>
          </div>
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-2 py-2.5 text-center shadow-3xs">
            <div className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Öğrenemedim</div>
            <div className="mt-0.5 text-base font-display font-black text-rose-600 dark:text-rose-400">{struggledCount}<span className="mx-0.5 text-[10px] text-rose-500/70">/</span><span className="text-xs">{activeWords.length}</span></div>
          </div>
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-2 py-2.5 text-center shadow-3xs">
            <div className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Çalışılmayan</div>
            <div className="mt-0.5 text-base font-display font-black text-indigo-500 dark:text-indigo-400">{pendingCount}<span className="mx-0.5 text-[10px] text-indigo-500/70">/</span><span className="text-xs">{activeWords.length}</span></div>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_1.2fr_1fr] gap-2">
          <button
            onClick={onPrev}
            disabled={!previousWord}
            className="min-w-0 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 px-2 py-2 text-left disabled:opacity-35 disabled:cursor-default cursor-pointer"
          >
            <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-slate-400">
              <ChevronLeft className="w-3 h-3" />
              <span>Önceki</span>
            </div>
            <div className="truncate text-[11px] font-black text-slate-700 dark:text-slate-250">{previousWord?.term || '-'}</div>
          </button>
          <div className="min-w-0 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-2 py-2 text-center">
            <div className="text-[8px] font-black uppercase tracking-wider text-indigo-400">Şu anki</div>
            <div className="truncate text-xs font-display font-black text-slate-950 dark:text-white">{word.term}</div>
          </div>
          <button
            onClick={onNext}
            disabled={!nextWord}
            className="min-w-0 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 px-2 py-2 text-right disabled:opacity-35 disabled:cursor-default cursor-pointer"
          >
            <div className="flex items-center justify-end gap-1 text-[8px] font-black uppercase tracking-wider text-slate-400">
              <span>Sonraki</span>
              <ChevronRight className="w-3 h-3" />
            </div>
            <div className="truncate text-[11px] font-black text-slate-700 dark:text-slate-250">{nextWord?.term || '-'}</div>
          </button>
        </div>
      </div>

      {/* 3D Card Container with Perspective */}
      <div className="w-full h-[310px] sm:h-[390px] md:h-[420px] perspective-1000 touch-none select-none relative">
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.4}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          className="w-full h-full cursor-grab active:cursor-grabbing preserve-3d transition-shadow duration-300 relative"
          style={{ transformStyle: 'preserve-3d' }}
        >
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
            {dragDirection === 'right' && (
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

          <motion.div
            className="w-full h-full relative preserve-3d"
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* FRONT SIDE (English Term) */}
            <div 
              onClick={handleContainerClick}
              className={`absolute inset-0 w-full h-full rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 p-5 sm:p-8 flex flex-col justify-between backface-hidden shadow-xs hover:shadow-md transition-shadow duration-200 cursor-pointer ${isFlipped ? 'pointer-events-none' : 'pointer-events-auto'}`}
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            >
              {/* Card top badges */}
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-950 dark:text-slate-550 px-2.5 py-1 rounded-lg border border-slate-150/40 dark:border-slate-800/40">
                  İNGİLİZCE KELİME
                </span>
                {(() => {
                  const status = word.status || (word.learned ? 'learned' : 'unmarked');
                  if (status === 'learned') {
                    return (
                      <span className="flex items-center space-x-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-500/10 dark:bg-emerald-950/45 dark:text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        <Check className="w-3 h-3 stroke-[2.5px]" />
                        <span>ÖĞRENİLDİ</span>
                      </span>
                    );
                  }
                  if (status === 'struggled') {
                    return (
                      <span className="flex items-center space-x-1.5 text-[9px] font-bold text-rose-600 bg-rose-500/10 dark:bg-rose-950/45 dark:text-rose-400 px-2.5 py-1 rounded-lg border border-rose-500/20 animate-pulse">
                        <AlertCircle className="w-3 h-3" />
                        <span>ZOR / ÖĞRENEMEDİM</span>
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Central English Term */}
              <div className="flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black tracking-tight text-slate-900 dark:text-white leading-tight break-all select-all">
                  {word.term}
                </h1>
                
                {/* Audio voice button */}
                <button
                  onClick={handlePronounce}
                  className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-indigo-400 rounded-full transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                  title="Sesli Telaffuz"
                >
                  <Volume2 className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Card bottom guidance */}
              <div className="flex flex-col items-center justify-center text-center space-y-1 text-slate-400 dark:text-slate-550">
                <p className="text-[11px] sm:text-xs font-semibold flex items-center space-x-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Çevirmek için tıkla / Boşluk</span>
                </p>
                <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550">
                  Sağa sola kaydırarak kelimeler arası geçiş yap
                </p>
              </div>
            </div>

            {/* BACK SIDE (Synonyms, Collocations & Turkish Meanings) */}
            <div 
              onClick={handleContainerClick}
              className={`absolute inset-0 w-full h-full rounded-3xl bg-slate-50/50 dark:bg-slate-950 border-2 border-slate-150/50 dark:border-slate-800/80 p-4 sm:p-6 flex flex-col justify-between rotate-y-180 backface-hidden overflow-hidden shadow-xs hover:shadow-md transition-shadow duration-200 cursor-pointer ${isFlipped ? 'pointer-events-auto' : 'pointer-events-none'}`}
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              {/* Back Top header */}
              <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-850 pb-2 sm:pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs sm:text-sm font-display font-black text-slate-800 dark:text-slate-100 break-all max-w-[120px] sm:max-w-[150px] truncate">
                    {word.term}
                  </span>
                  <button
                    onClick={handlePronounce}
                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 dark:bg-slate-900 dark:text-indigo-450 rounded-full transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
                <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-indigo-100/30 bg-indigo-50/50 dark:bg-indigo-950/25">
                  ANLAM & ÖRNEKLER
                </span>
              </div>

              {/* Middle contents scrollable if long */}
              <div className="flex-1 my-2 sm:my-3.5 space-y-3 sm:space-y-4 overflow-y-auto pr-1 text-left touch-pan-y">
                {/* Synonyms - Beautiful Clean Label & Content block */}
                {word.synonyms && (
                  <div className="space-y-0.5">
                    <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest block">
                      Eş Anlamlılar (Synonyms)
                    </span>
                    <p className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 px-2.5 py-2 rounded-xl">
                      {word.synonyms}
                    </p>
                  </div>
                )}

                {/* Collocation / Phrase - Styled with a beautiful editorial background accent */}
                {word.phrase && (
                  <div className="space-y-0.5">
                    <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest block">
                      Kalıp & Örnek Cümle (Collocation)
                    </span>
                    <p className="text-[11px] sm:text-xs italic text-indigo-750 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-100/20 dark:border-indigo-900/15 rounded-xl px-3 py-2.5 sm:py-3 leading-relaxed font-serif">
                      "{word.phrase}"
                    </p>
                  </div>
                )}

                {/* Turkish Meanings - Clear elegant badges grouped together */}
                <div className="space-y-2 rounded-2xl border border-indigo-100/40 dark:border-indigo-900/30 bg-white/70 dark:bg-slate-900/55 p-3 shadow-3xs">
                  <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest block">
                    Türkçe Karşılıkları (Turkish Meanings)
                  </span>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {word.turkishMeanings.map((meaning, idx) => {
                      const { text, cleanMeaning, colorClass } = getWordTypeColor(meaning);
                      return (
                        <div 
                          key={idx} 
                          className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 rounded-xl text-[13px] sm:text-sm text-slate-900 dark:text-slate-100 font-black shadow-3xs"
                        >
                          <span>{cleanMeaning}</span>
                          {text && (
                            <span className={`text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-md font-mono tracking-wider font-bold uppercase ${colorClass}`}>
                              {text}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Back bottom guidance */}
              <div className="text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550 pt-2 border-t border-slate-200/55 dark:border-slate-850">
                Kartı geri çevirmek için tıkla
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Button Controls beneath the Card */}
      <div className="w-full flex flex-col items-center mt-3 sm:mt-5 space-y-2.5 sm:space-y-3">
        {/* Dual Status Buttons - Optimized for mobile tap targets */}
        <div className="w-full grid grid-cols-2 gap-2.5 sm:gap-3">
          {/* Struggled Button */}
          {(() => {
            const currentStatus = word.status || (word.learned ? 'learned' : 'unmarked');
            const isStruggled = currentStatus === 'struggled';
            return (
              <button
                onClick={() => onSetStatus(isStruggled ? 'unmarked' : 'struggled')}
                className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-2xl font-bold uppercase tracking-wider text-[10px] sm:text-[11px] cursor-pointer transition-all duration-200 flex items-center justify-center space-x-1.5 border shadow-3xs hover:shadow-xs active:scale-99 ${
                  isStruggled
                    ? 'bg-rose-600 hover:bg-rose-500 text-white border-transparent'
                    : 'bg-white hover:bg-rose-50/20 text-rose-650 border-slate-200/60 dark:bg-slate-900 dark:border-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/20'
                }`}
              >
                <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>ÖĞRENEMEDİM</span>
              </button>
            );
          })()}

          {/* Learned Button */}
          {(() => {
            const currentStatus = word.status || (word.learned ? 'learned' : 'unmarked');
            const isLearned = currentStatus === 'learned';
            return (
              <button
                onClick={() => onSetStatus(isLearned ? 'unmarked' : 'learned')}
                className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-2xl font-bold uppercase tracking-wider text-[10px] sm:text-[11px] cursor-pointer transition-all duration-200 flex items-center justify-center space-x-1.5 border shadow-3xs hover:shadow-xs active:scale-99 ${
                  isLearned
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent'
                    : 'bg-white hover:bg-emerald-50/20 text-emerald-650 border-slate-200/60 dark:bg-slate-900 dark:border-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-950/20'
                }`}
              >
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 stroke-[2.5px]" />
                <span>ÖĞRENDİM</span>
              </button>
            );
          })()}
        </div>

        {/* Previous / Next Navigation Arrows */}
        <div className="w-full grid grid-cols-2 gap-2.5 sm:gap-3">
          <button
            onClick={onPrev}
            className="flex items-center justify-center space-x-1 py-2.5 sm:py-3 px-3 sm:px-4 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-250 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-3xs transition-all active:scale-99 cursor-pointer text-[11px] sm:text-xs uppercase tracking-wider font-bold"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-450" />
            <span>Önceki</span>
          </button>
          <button
            onClick={onNext}
            className="flex items-center justify-center space-x-1 py-2.5 sm:py-3 px-3 sm:px-4 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-250 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-3xs transition-all active:scale-99 cursor-pointer text-[11px] sm:text-xs uppercase tracking-wider font-bold"
          >
            <span>Sonraki</span>
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-450" />
          </button>
        </div>
      </div>
    </div>
  );
}
