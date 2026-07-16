import React, { useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  History,
  Layers3,
  Trash2,
} from 'lucide-react';
import { StudyHistoryEntry } from '../types';

interface StudyHistoryViewProps {
  entries: StudyHistoryEntry[];
  onClear: () => void;
  onDelete: (entryId: string) => void;
}

const dateKey = (date: Date) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

const getDayLabel = (date: Date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dateKey(date) === dateKey(today)) return 'Bugün';
  if (dateKey(date) === dateKey(yesterday)) return 'Dün';

  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const getStudyTypeLabel = (entry: StudyHistoryEntry) => {
  if (entry.studyType === 'card') return 'Kart çalışması';
  const quizLabels: Record<NonNullable<StudyHistoryEntry['quizMode']>, string> = {
    'syn-to-word': 'Syn → Kelime',
    'word-to-syn': 'Kelime → Syn',
    'word-to-tr': 'Kelime → Türkçe',
    'tr-to-word': 'Türkçe → Kelime',
  };
  return entry.quizMode ? `Quiz · ${quizLabels[entry.quizMode]}` : 'Quiz';
};

export default function StudyHistoryView({ entries, onClear, onDelete }: StudyHistoryViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );
  const todayKey = dateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const todayCount = entries.filter(entry => dateKey(new Date(entry.completedAt)) === todayKey).length;
  const lastSevenDays = entries.filter(entry => new Date(entry.completedAt) >= sevenDaysAgo);
  const lastSevenDayLists = new Set(lastSevenDays.flatMap(entry => entry.lists.map(list => list.id))).size;

  const groupedEntries = sortedEntries.reduce<Array<{ key: string; date: Date; entries: StudyHistoryEntry[] }>>(
    (groups, entry) => {
      const date = new Date(entry.completedAt);
      const key = dateKey(date);
      const currentGroup = groups[groups.length - 1];
      if (currentGroup?.key === key) {
        currentGroup.entries.push(entry);
      } else {
        groups.push({ key, date, entries: [entry] });
      }
      return groups;
    },
    [],
  );

  return (
    <div className="space-y-3 sm:space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs dark:border-slate-800/80 dark:bg-slate-900 sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 sm:items-start sm:p-6 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 sm:p-2.5">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-extrabold text-slate-800 dark:text-slate-100">Çalışma Geçmişi</h2>
              <p className="mt-0.5 text-[10px] font-medium leading-snug text-slate-400 sm:text-[11px]">Tamamlanan çalışmalar bu cihazda saklanır.</p>
            </div>
          </div>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Tüm çalışma geçmişini silmek istediğinize emin misiniz?')) onClear();
              }}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 text-[10px] font-bold text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400 sm:h-auto sm:w-auto sm:px-2.5 sm:py-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Geçmişi Sil</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-100 p-3 sm:p-4 dark:divide-slate-800/80">
          <div className="px-2 text-center">
            <History className="mx-auto mb-1 h-4 w-4 text-indigo-500" />
            <div className="font-display text-xl font-black text-slate-800 dark:text-slate-100">{entries.length}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Toplam</div>
          </div>
          <div className="px-2 text-center">
            <CalendarDays className="mx-auto mb-1 h-4 w-4 text-emerald-500" />
            <div className="font-display text-xl font-black text-slate-800 dark:text-slate-100">{todayCount}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Bugün</div>
          </div>
          <div className="px-2 text-center">
            <Layers3 className="mx-auto mb-1 h-4 w-4 text-amber-500" />
            <div className="font-display text-xl font-black text-slate-800 dark:text-slate-100">{lastSevenDayLists}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">7 Günde Liste</div>
          </div>
        </div>
      </section>

      {groupedEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center dark:border-slate-800 dark:bg-slate-900/40 sm:rounded-3xl sm:px-6 sm:py-14">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <CalendarDays className="h-6 w-6" />
          </div>
          <h3 className="font-display text-sm font-extrabold text-slate-700 dark:text-slate-200">Henüz çalışma kaydı yok</h3>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-400">Bir kart veya quiz çalışmasını tamamladığınızda burada tarih ve liste bilgileriyle görünecek.</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-6">
          {groupedEntries.map(group => {
            const defaultExpanded = group.key === todayKey || group.key === yesterdayKey;
            const isExpanded = expandedGroups[group.key] ?? defaultExpanded;

            return (
            <section key={group.key} className="overflow-hidden rounded-2xl bg-white/35 px-1 dark:bg-slate-900/20 sm:overflow-visible sm:rounded-none sm:bg-transparent sm:px-0 dark:sm:bg-transparent">
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={`history-group-${group.key}`}
                onClick={() => setExpandedGroups(current => ({ ...current, [group.key]: !isExpanded }))}
                className="mb-2 flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/50 sm:mb-2.5 sm:min-h-0 sm:px-1 sm:py-1"
              >
                <CalendarDays className="h-4 w-4 shrink-0 text-indigo-500" />
                <h3 className="min-w-0 truncate font-display text-xs font-black capitalize text-slate-700 dark:text-slate-200">{getDayLabel(group.date)}</h3>
                <span className="shrink-0 text-[10px] font-semibold text-slate-400">· {group.entries.length}</span>
                <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && <div id={`history-group-${group.key}`} className="space-y-2 px-1 pb-1 sm:space-y-2.5 sm:px-0 sm:pb-0">
                {group.entries.map(entry => {
                  const startedAt = new Date(entry.startedAt).getTime();
                  const completedAt = new Date(entry.completedAt).getTime();
                  const durationMinutes = Math.max(1, Math.round((completedAt - startedAt) / 60000));

                  return (
                    <article key={entry.id} className="rounded-xl border border-slate-100 bg-white p-3 shadow-3xs dark:border-slate-800/80 dark:bg-slate-900 sm:rounded-2xl sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{getStudyTypeLabel(entry)}</span>
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              {entry.studyMode === 'shuffled' ? 'Karışık' : 'Sıralı'}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-400">
                            <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(entry.completedAt))}</span>
                            <span>{durationMinutes} dk.</span>
                            <span>{entry.wordCount} kelime</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="flex items-center justify-end gap-1 text-indigo-600 dark:text-indigo-400">
                            <BarChart3 className="h-4 w-4" />
                            <span className="font-display text-lg font-black">%{entry.successRate}</span>
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Başarı</span>
                        </div>
                      </div>

                      <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none sm:mt-3 sm:flex-wrap sm:overflow-visible sm:pb-0">
                        {entry.lists.map(list => (
                          <span key={list.id} className="shrink-0 rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300">
                            {list.name}
                          </span>
                        ))}
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5 text-[10px] font-bold dark:border-slate-800/80 sm:mt-3 sm:gap-3 sm:pt-3">
                        {entry.studyType === 'quiz' ? (
                          <>
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />{entry.correct ?? 0} doğru</span>
                            <span className="text-rose-600 dark:text-rose-400">{entry.wrong ?? 0} yanlış</span>
                            <span className="text-slate-400">{entry.unanswered ?? 0} cevapsız</span>
                          </>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />{entry.learnedCount ?? 0} öğrenilen</span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Bu çalışma kaydını geçmişten silmek istediğinize emin misiniz?')) {
                              onDelete(entry.id);
                            }
                          }}
                          className="ml-auto flex min-h-8 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                          aria-label="Çalışma kaydını sil"
                          title="Bu çalışma kaydını sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Sil</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>}
            </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
