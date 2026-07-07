import React, { useState } from 'react';
import { Word, WordList } from '../types';
import { Search, Trash2, Edit2, Volume2, CheckCircle, Circle, XCircle, Save, X, BookOpen, Layers } from 'lucide-react';
import { speakWord, getWordTypeColor } from '../utils';

interface WordExplorerProps {
  words: Word[];
  lists: WordList[];
  onUpdateWord: (updatedWord: Word) => void;
  onDeleteWord: (wordId: string) => void;
  onDeleteList: (listId: string) => void;
}

export default function WordExplorer({
  words,
  lists,
  onUpdateWord,
  onDeleteWord,
  onDeleteList
}: WordExplorerProps) {
  const [selectedListId, setSelectedListId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'learned' | 'unlearned' | 'struggled'>('all');
  
  // Word Edit Modal State
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [editTerm, setEditTerm] = useState('');
  const [editSynonyms, setEditSynonyms] = useState('');
  const [editPhrase, setEditPhrase] = useState('');
  const [editTurkish, setEditTurkish] = useState('');

  // Filter words belonging to chosen conditions
  const filteredWords = words.filter(word => {
    const matchesList = selectedListId === 'all' || word.listId === selectedListId;
    
    // Status Filter Matching
    const currentStatus = word.status || (word.learned ? 'learned' : 'unmarked');
    let matchesStatus = true;
    if (statusFilter === 'learned') matchesStatus = currentStatus === 'learned';
    else if (statusFilter === 'unlearned') matchesStatus = currentStatus === 'unmarked';
    else if (statusFilter === 'struggled') matchesStatus = currentStatus === 'struggled';

    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      word.term.toLowerCase().includes(query) ||
      word.synonyms.toLowerCase().includes(query) ||
      word.phrase.toLowerCase().includes(query) ||
      word.turkishMeanings.some(m => m.toLowerCase().includes(query));
      
    return matchesList && matchesStatus && matchesSearch;
  });

  const handleStartEdit = (word: Word) => {
    setEditingWord(word);
    setEditTerm(word.term);
    setEditSynonyms(word.synonyms);
    setEditPhrase(word.phrase);
    setEditTurkish(word.turkishMeanings.join(', '));
  };

  const handleSaveEdit = () => {
    if (!editingWord) return;
    if (!editTerm.trim()) {
      alert('Kelime boş bırakılamaz!');
      return;
    }

    const updatedWord: Word = {
      ...editingWord,
      term: editTerm.trim(),
      synonyms: editSynonyms.trim(),
      phrase: editPhrase.trim(),
      turkishMeanings: editTurkish.split(',').map(m => m.trim()).filter(Boolean)
    };

    onUpdateWord(updatedWord);
    setEditingWord(null);
  };

  const handleDeleteListClick = (listId: string, listName: string) => {
    if (confirm(`"${listName}" listesini ve içindeki tüm kelimeleri silmek istediğinize emin misiniz?`)) {
      onDeleteList(listId);
      if (selectedListId === listId) {
        setSelectedListId('all');
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xs">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-display font-black text-slate-800 dark:text-slate-100">Genel Kelime Kütüphanesi</h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase mt-0.5">Tüm listeleri keşfedin ve düzenleyin</p>
          </div>
        </div>
        
        {/* Delete current list button */}
        {selectedListId !== 'all' && (
          <button
            onClick={() => {
              const list = lists.find(l => l.id === selectedListId);
              if (list) handleDeleteListClick(list.id, list.name);
            }}
            className="flex items-center space-x-2 px-3 py-1.5 border border-red-200 dark:border-red-950/50 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-900 transition-all text-[11px] font-bold rounded-xl cursor-pointer w-fit"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Koleksiyonu Sil</span>
          </button>
        )}
      </div>

      {/* Select collection and Search bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {/* List filter select */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Koleksiyon Filtrele
          </label>
          <select
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            className="w-full px-3 py-2.5 text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-250 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
          >
            <option value="all">Tüm Listeler ({words.length})</option>
            {lists.map(list => {
              const count = words.filter(w => w.listId === list.id).length;
              return (
                <option key={list.id} value={list.id}>
                  {list.name} ({count} kelime)
                </option>
              );
            })}
          </select>
        </div>

        {/* Search bar */}
        <div className="sm:col-span-2 space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Aranacak Kelime, Eş Anlamlı veya Türkçe
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kelime, eş anlam veya Türkçe karşılık ara..."
              className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 placeholder-slate-350 dark:placeholder-slate-750 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Learning Status Filter Tabs */}
      <div className="flex items-center space-x-1.5 pb-4 overflow-x-auto scrollbar-none border-b border-slate-100 dark:border-slate-800/60 mb-6 mt-1">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mr-1 shrink-0">Öğrenme Durumu:</span>
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
            statusFilter === 'all'
              ? 'bg-indigo-50 dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 border-indigo-100/50 dark:border-slate-700'
              : 'border-transparent text-slate-450 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Tümü ({words.filter(w => selectedListId === 'all' || w.listId === selectedListId).length})
        </button>
        <button
          onClick={() => setStatusFilter('learned')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
            statusFilter === 'learned'
              ? 'bg-emerald-50 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 border-emerald-100/40 dark:border-emerald-900/40'
              : 'border-transparent text-slate-450 dark:text-slate-400 hover:text-emerald-600'
          }`}
        >
          Öğrendiklerim ({words.filter(w => (selectedListId === 'all' || w.listId === selectedListId) && (w.status || (w.learned ? 'learned' : 'unmarked')) === 'learned').length})
        </button>
        <button
          onClick={() => setStatusFilter('unlearned')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
            statusFilter === 'unlearned'
              ? 'bg-slate-100 dark:bg-slate-950 text-slate-650 dark:text-slate-300 border-slate-200/50 dark:border-slate-800'
              : 'border-transparent text-slate-450 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Çalışılacaklar ({words.filter(w => (selectedListId === 'all' || w.listId === selectedListId) && (w.status || (w.learned ? 'learned' : 'unmarked')) === 'unmarked').length})
        </button>
        <button
          onClick={() => setStatusFilter('struggled')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
            statusFilter === 'struggled'
              ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100/40 dark:border-rose-900/40'
              : 'border-transparent text-slate-450 dark:text-slate-400 hover:text-rose-600'
          }`}
        >
          Zor Gelenler ({words.filter(w => (selectedListId === 'all' || w.listId === selectedListId) && (w.status || (w.learned ? 'learned' : 'unmarked')) === 'struggled').length})
        </button>
      </div>

      {/* Words List Grid - GORGEOUS MOBILE FRIENDLY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredWords.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-500 italic text-sm bg-slate-50/40 dark:bg-slate-950/15 rounded-2xl border border-slate-150/40 dark:border-slate-850">
            Aranan kriterlere uygun kelime bulunamadı.
          </div>
        ) : (
          filteredWords.map((word) => {
            const currentStatus = word.status || (word.learned ? 'learned' : 'unmarked');
            
            // Dynamic theme borders and backgrounds representing status colors
            let statusCardClass = "border-slate-200/60 dark:border-slate-800 bg-white hover:bg-slate-50/40 dark:bg-slate-950/20";
            let leftAccentBar = "bg-slate-300 dark:bg-slate-700";
            let termColor = "text-slate-800 dark:text-slate-100";
            
            if (currentStatus === 'learned') {
              statusCardClass = "border-emerald-200 dark:border-emerald-950/40 bg-emerald-50/10 dark:bg-emerald-950/5 hover:bg-emerald-55/15";
              leftAccentBar = "bg-emerald-500";
              termColor = "text-emerald-850 dark:text-emerald-450";
            } else if (currentStatus === 'struggled') {
              statusCardClass = "border-rose-200 dark:border-rose-950/40 bg-rose-50/10 dark:bg-rose-950/5 hover:bg-rose-55/15";
              leftAccentBar = "bg-rose-500";
              termColor = "text-rose-850 dark:text-rose-450 font-black";
            }

            return (
              <div 
                key={word.id} 
                className={`relative pl-5 pr-4 py-4.5 border rounded-2xl flex flex-col justify-between gap-3 transition-all duration-200 ${statusCardClass}`}
              >
                {/* Status Vertical Stripe */}
                <div className={`absolute left-0 inset-y-0 w-1.5 rounded-l-2xl ${leftAccentBar}`} />

                {/* Top: Word & Quick Speech & List Identifier */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className={`font-display font-extrabold text-base tracking-tight select-all ${termColor}`}>
                        {word.term}
                      </span>
                      <button
                        onClick={() => speakWord(word.term)}
                        className="p-1 bg-slate-50 dark:bg-slate-900 text-slate-450 hover:text-indigo-650 dark:hover:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                        title="Telaffuz Et"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {selectedListId === 'all' && (
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest block mt-0.5">
                        {lists.find(l => l.id === word.listId)?.name || 'Genel'}
                      </span>
                    )}
                  </div>

                  {/* Top-Right: Edit/Delete Action Buttons */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleStartEdit(word)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-450 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-900 cursor-pointer transition-colors"
                      title="Düzenle"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`"${word.term}" kelimesini silmek istediğinize emin misiniz?`)) {
                          onDeleteWord(word.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-900 cursor-pointer transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Body Content: Synonyms & Collocations / Phrases */}
                <div className="space-y-2 flex-1 min-w-0">
                  {/* Synonym */}
                  {word.synonyms && (
                    <div className="text-xs text-slate-650 dark:text-slate-300">
                      <span className="font-bold text-slate-400 mr-1">Eş Anlam:</span>
                      <span className="font-medium">{word.synonyms}</span>
                    </div>
                  )}

                  {/* Collocation styled as clean callout blockquote */}
                  {word.phrase && (
                    <div className="p-2 bg-indigo-50/15 dark:bg-indigo-950/10 border border-indigo-100/10 dark:border-indigo-900/15 rounded-xl text-xs italic text-indigo-600 dark:text-indigo-400 font-serif leading-relaxed">
                      "{word.phrase}"
                    </div>
                  )}

                  {/* Turkish meanings displayed as elegant tag badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {word.turkishMeanings.map((meaning, idx) => {
                      const { text, cleanMeaning, colorClass } = getWordTypeColor(meaning);
                      return (
                        <span 
                          key={idx} 
                          className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-150/40 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-350 rounded-lg shadow-3xs"
                        >
                          <span>{cleanMeaning}</span>
                          {text && (
                            <span className={`text-[9px] px-1 font-mono font-bold rounded-sm ${colorClass}`}>
                              {text}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Status Quick Toggles - highly optimized touch fields */}
                <div className="pt-2 border-t border-slate-100/60 dark:border-slate-850/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Durum Belirle:</span>
                  <div className="inline-flex items-center space-x-1 p-0.5 bg-slate-100/70 dark:bg-slate-900 rounded-xl border border-slate-150/40 dark:border-slate-800/40">
                    {/* Unmarked Option */}
                    <button
                      onClick={() => onUpdateWord({ ...word, status: 'unmarked', learned: false })}
                      className={`p-1 rounded-lg transition-all cursor-pointer ${
                        currentStatus === 'unmarked'
                          ? 'bg-white dark:bg-slate-800 text-slate-650 dark:text-slate-200 shadow-3xs border border-slate-200/30 dark:border-slate-700/60'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title="Çalışılmadı"
                    >
                      <Circle className="w-3.5 h-3.5" />
                    </button>
                    
                    {/* Struggled Option */}
                    <button
                      onClick={() => onUpdateWord({ ...word, status: 'struggled', learned: false })}
                      className={`p-1 rounded-lg transition-all cursor-pointer ${
                        currentStatus === 'struggled'
                          ? 'bg-rose-550 text-white shadow-3xs'
                          : 'text-rose-450 hover:text-rose-600'
                      }`}
                      title="Zor / Öğrenemedim"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>

                    {/* Learned Option */}
                    <button
                      onClick={() => onUpdateWord({ ...word, status: 'learned', learned: true })}
                      className={`p-1 rounded-lg transition-all cursor-pointer ${
                        currentStatus === 'learned'
                          ? 'bg-emerald-650 text-white shadow-3xs'
                          : 'text-emerald-550 hover:text-emerald-650'
                      }`}
                      title="Öğrendim"
                    >
                      <CheckCircle className="w-3.5 h-3.5 stroke-[2.5px]" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Edit Word Inline Modal Overlay */}
      {editingWord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-xl animate-scale-up">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-850">
              <h3 className="text-base font-display font-bold text-slate-800 dark:text-slate-100">Kelimeyi Düzenle</h3>
              <button 
                onClick={() => setEditingWord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* English word */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-450 dark:text-slate-400 uppercase tracking-wider">
                  İngilizce Kelime
                </label>
                <input
                  type="text"
                  value={editTerm}
                  onChange={(e) => setEditTerm(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                />
              </div>

              {/* Synonyms */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-450 dark:text-slate-400 uppercase tracking-wider">
                  Eş Anlamlılar (Synonyms)
                </label>
                <input
                  type="text"
                  value={editSynonyms}
                  onChange={(e) => setEditSynonyms(e.target.value)}
                  placeholder="örn: Moderately, relatively"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                />
              </div>

              {/* Collocations */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-450 dark:text-slate-400 uppercase tracking-wider">
                  Kalıp / Cümle
                </label>
                <input
                  type="text"
                  value={editPhrase}
                  onChange={(e) => setEditPhrase(e.target.value)}
                  placeholder="örn: comparatively few disasters"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                />
              </div>

              {/* Turkish meanings */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-450 dark:text-slate-400 uppercase tracking-wider">
                  Türkçe Anlamlar (Virgülle ayırın)
                </label>
                <input
                  type="text"
                  value={editTurkish}
                  onChange={(e) => setEditTurkish(e.target.value)}
                  placeholder="örn: kısmen [zf.], nispeten [zf.]"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                />
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">
                  TÜRLER: <code className="font-mono text-[10px] text-indigo-650">[zf.]</code> zarf, <code className="font-mono text-[10px] text-indigo-650">[f.]</code> fiil, <code className="font-mono text-[10px] text-indigo-650">[i.]</code> isim, <code className="font-mono text-[10px] text-indigo-650">[s.]</code> sıfat.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setEditingWord(null)}
                  className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Kaydet</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
