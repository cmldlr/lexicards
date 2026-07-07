import React from 'react';
import { Word, WordList } from '../types';
import { Award, BookOpen, CheckCircle, RefreshCw } from 'lucide-react';

interface StatsViewProps {
  words: Word[];
  lists: WordList[];
  onResetLearned: () => void;
}

export default function StatsView({ words, lists, onResetLearned }: StatsViewProps) {
  const totalWords = words.length;
  const learnedWords = words.filter(w => w.learned).length;
  const unlearnedWords = totalWords - learnedWords;
  const learnedPercentage = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-3xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
      {/* Stats container */}
      <div className="grid grid-cols-3 gap-1 sm:gap-6 w-full sm:w-auto flex-1 divide-x divide-slate-100 dark:divide-slate-800/60">
        {/* Total Words */}
        <div className="flex flex-col items-center sm:items-start px-1 sm:px-3">
          <div className="flex items-center space-x-1">
            <BookOpen className="w-3 h-3 text-indigo-500 shrink-0" />
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center sm:text-left">Toplam</span>
          </div>
          <div className="flex items-baseline space-x-1 mt-0.5">
            <span className="text-base sm:text-xl font-display font-black text-slate-800 dark:text-slate-100">{totalWords}</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Klm.</span>
          </div>
        </div>

        {/* Learned */}
        <div className="flex flex-col items-center sm:items-start px-2 sm:px-4">
          <div className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center sm:text-left">Öğrenilen</span>
          </div>
          <div className="flex items-baseline space-x-1 mt-0.5">
            <span className="text-base sm:text-xl font-display font-black text-emerald-600 dark:text-emerald-400">{learnedWords}</span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium hidden xs:inline">({unlearnedWords} kaldı)</span>
          </div>
        </div>

        {/* Completion */}
        <div className="flex flex-col items-center sm:items-start px-2 sm:px-4">
          <div className="flex items-center space-x-1">
            <Award className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center sm:text-left">Başarı</span>
          </div>
          <div className="flex items-center space-x-2 mt-0.5">
            <span className="text-base sm:text-xl font-display font-black text-indigo-600 dark:text-indigo-400">%{learnedPercentage}</span>
            {/* Tiny progress bar */}
            <div className="hidden md:block w-14 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${learnedPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reset Action */}
      <div className="shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800/60 pt-2 sm:pt-0 sm:pl-4 flex items-center justify-between sm:justify-end gap-2">
        <span className="sm:hidden text-[9px] text-slate-400 font-medium">İlerlemeyi sıfırla:</span>
        <button
          onClick={() => {
            if (confirm('Tüm kelimelerin öğrendim işaretini kaldırmak istediğinize emin misiniz?')) {
              onResetLearned();
            }
          }}
          disabled={learnedWords === 0}
          className="flex items-center space-x-1 py-1 px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 transition-colors text-[10px] font-bold rounded-lg disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer border border-rose-100/30 dark:border-rose-900/40"
          title="Tüm İlerlemeyi Sıfırla"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Sıfırla</span>
        </button>
      </div>
    </div>
  );
}
