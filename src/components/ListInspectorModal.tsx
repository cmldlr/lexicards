import React, { useState } from 'react';
import { Word, WordList } from '../types';
import { 
  X, 
  Search, 
  Plus, 
  Check, 
  Trash2, 
  Edit2, 
  Volume2, 
  Award, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  Save, 
  CheckCircle, 
  Circle,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { speakWord, getWordTypeColor } from '../utils';

interface ListInspectorModalProps {
  list: WordList;
  words: Word[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateWord: (updatedWord: Word) => void;
  onDeleteWord: (wordId: string) => void;
  onAddWord: (wordData: { term: string; synonyms: string; phrase: string; turkishMeanings: string[]; listId: string }) => void;
  onDeleteList: (listId: string) => void;
}

export default function ListInspectorModal({
  list,
  words,
  isOpen,
  onClose,
  onUpdateWord,
  onDeleteWord,
  onAddWord,
  onDeleteList
}: ListInspectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalFilter, setModalFilter] = useState<'all' | 'learned' | 'unlearned' | 'struggled'>('all');
  const [isAddingFormOpen, setIsAddingFormOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // New word form state
  const [newTerm, setNewTerm] = useState('');
  const [newSynonyms, setNewSynonyms] = useState('');
  const [newPhrase, setNewPhrase] = useState('');
  const [newTurkish, setNewTurkish] = useState('');

  // Editing word state
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [editTerm, setEditTerm] = useState('');
  const [editSynonyms, setEditSynonyms] = useState('');
  const [editPhrase, setEditPhrase] = useState('');
  const [editTurkish, setEditTurkish] = useState('');

  if (!isOpen) return null;

  // Filter words belonging to this list
  const listWords = words.filter(w => w.listId === list.id);
  const learnedCount = listWords.filter(w => {
    const status = w.status || (w.learned ? 'learned' : 'unmarked');
    return status === 'learned';
  }).length;
  const progressPercent = listWords.length > 0 ? Math.round((learnedCount / listWords.length) * 100) : 0;

  const filteredWords = listWords.filter(word => {
    const status = word.status || (word.learned ? 'learned' : 'unmarked');
    
    // Status filter
    if (modalFilter === 'learned' && status !== 'learned') return false;
    if (modalFilter === 'unlearned' && status === 'learned') return false;
    if (modalFilter === 'struggled' && status !== 'struggled') return false;

    const query = searchQuery.toLowerCase();
    return (
      word.term.toLowerCase().includes(query) ||
      word.synonyms.toLowerCase().includes(query) ||
      word.phrase.toLowerCase().includes(query) ||
      word.turkishMeanings.some(m => m.toLowerCase().includes(query))
    );
  });

  const handleAddNewWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim()) {
      alert('Lütfen İngilizce kelime alanını doldurun.');
      return;
    }
    const turkishMeanings = newTurkish
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);

    if (turkishMeanings.length === 0) {
      alert('Lütfen en az bir Türkçe karşılık girin.');
      return;
    }

    onAddWord({
      term: newTerm.trim(),
      synonyms: newSynonyms.trim(),
      phrase: newPhrase.trim(),
      turkishMeanings,
      listId: list.id
    });

    // Reset Form
    setNewTerm('');
    setNewSynonyms('');
    setNewPhrase('');
    setNewTurkish('');
    setIsAddingFormOpen(false);
  };

  const handleStartEdit = (word: Word) => {
    setIsAddingFormOpen(false);
    setIsSearchOpen(false);
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

  const handleDeleteListClick = () => {
    if (confirm(`"${list.name}" koleksiyonunu ve içindeki tüm ${listWords.length} kelimeyi tamamen silmek istediğinize emin misiniz?`)) {
      onDeleteList(list.id);
      onClose();
    }
  };

  if (editingWord) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-xl animate-scale-up overflow-hidden">
          <div className="px-4 sm:px-6 py-4 bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-150/40 dark:border-slate-850 flex items-center justify-between shrink-0">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{list.name}</p>
              <h2 className="text-base sm:text-lg font-display font-black text-slate-800 dark:text-slate-100 truncate">Kelimeyi Düzenle</h2>
            </div>
            <button onClick={() => setEditingWord(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" title="Kapat">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">İngilizce Kelime *</label>
              <input type="text" value={editTerm} onChange={(e) => setEditTerm(e.target.value)} className="w-full px-3 py-3 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500" />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Eş Anlamlılar</label>
              <input type="text" value={editSynonyms} onChange={(e) => setEditSynonyms(e.target.value)} className="w-full px-3 py-3 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500" />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Örnek Kalıp / Cümle</label>
              <textarea value={editPhrase} onChange={(e) => setEditPhrase(e.target.value)} rows={3} className="w-full px-3 py-3 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 resize-none" />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Türkçe Anlamlar</label>
              <textarea value={editTurkish} onChange={(e) => setEditTurkish(e.target.value)} rows={3} className="w-full px-3 py-3 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 resize-none" />
              <p className="text-[10px] text-slate-400 font-semibold">Virgülle ayır: örn. katman [i.], sınıf [i.]</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button type="button" onClick={() => setEditingWord(null)} className="py-3 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer">İptal</button>
              <button type="submit" className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer">Kaydet</button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-xl animate-scale-up overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-150/40 dark:border-slate-850 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            {/* Circular Progress Ring starting from 12 o'clock */}
            <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Gray background track */}
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="transparent"
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="3.5"
                />
                {/* Colored progress line */}
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="transparent"
                  stroke="currentColor"
                  className="text-indigo-600 dark:text-indigo-400 transition-all duration-500 ease-out"
                  strokeWidth="3.5"
                  strokeDasharray="100.53"
                  strokeDashoffset={100.53 - (progressPercent / 100) * 100.53}
                  strokeLinecap="round"
                />
              </svg>
              {/* Central upright text showing learned ratio/percentage */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-display font-black text-slate-800 dark:text-slate-250">
                  %{progressPercent}
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-display font-black text-slate-800 dark:text-slate-100">
                {list.name} Koleksiyonu
              </h2>
              <span className="inline-flex items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                {learnedCount} / {listWords.length} KELİME ÖĞRENİLDİ
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-1.5">
            {/* Search Toggle Icon */}
            <button
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isAddingFormOpen) setIsAddingFormOpen(false);
              }}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isSearchOpen 
                  ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Koleksiyonda Ara"
            >
              <Search className="w-4.5 h-4.5" />
            </button>

            {/* Add Word Toggle Icon */}
            <button
              onClick={() => {
                setIsAddingFormOpen(!isAddingFormOpen);
                if (isSearchOpen) setIsSearchOpen(false);
              }}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isAddingFormOpen 
                  ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Yeni Kelime Ekle"
            >
              <Plus className="w-4.5 h-4.5" />
            </button>

            <button
              onClick={handleDeleteListClick}
              className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              title="Koleksiyonu Sil"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Sub-Header: Search & Filtering Controls */}
        <div className="px-4 sm:px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 space-y-2.5 shrink-0">
          {/* Animated/Toggleable Search Input */}
          {isSearchOpen && (
            <div className="relative animate-fade-in mb-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Bu koleksiyonda kelime veya anlam ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-750 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
              />
            </div>
          )}

          {/* Modal List-level Filtering Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1">Görünüm:</span>
            <button
              onClick={() => setModalFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                modalFilter === 'all'
                  ? 'bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-slate-700/60'
                  : 'text-slate-450 hover:text-slate-700 dark:text-slate-450 dark:hover:text-slate-200'
              }`}
            >
              Tümü ({listWords.length})
            </button>
            <button
              onClick={() => setModalFilter('learned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                modalFilter === 'learned'
                  ? 'bg-emerald-50 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 border border-emerald-100/40 dark:border-emerald-900/40'
                  : 'text-slate-450 hover:text-emerald-650 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Öğrendiklerim ({listWords.filter(w => (w.status || (w.learned ? 'learned' : 'unmarked')) === 'learned').length})
            </button>
            <button
              onClick={() => setModalFilter('unlearned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                modalFilter === 'unlearned'
                  ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100/40 dark:border-amber-900/40'
                  : 'text-slate-450 hover:text-amber-650 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Öğrenmediklerim ({listWords.filter(w => (w.status || (w.learned ? 'learned' : 'unmarked')) !== 'learned').length})
            </button>
            <button
              onClick={() => setModalFilter('struggled')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                modalFilter === 'struggled'
                  ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100/40 dark:border-rose-900/40'
                  : 'text-slate-450 hover:text-rose-650 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Zor Gelenler ({listWords.filter(w => (w.status || (w.learned ? 'learned' : 'unmarked')) === 'struggled').length})
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-5">
          
          {/* Inline Add New Word Form */}
          {isAddingFormOpen && (
            <form 
              onSubmit={handleAddNewWord}
              className="bg-indigo-50/30 dark:bg-indigo-950/15 border border-indigo-100/30 dark:border-indigo-900/40 p-4 rounded-2xl space-y-3 animate-fade-in"
            >
              <h3 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-1">Yeni Kelime Oluştur</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-slate-450 dark:text-slate-400 uppercase tracking-wider">İngilizce Terim *</label>
                  <input
                    type="text"
                    required
                    placeholder="örn: diminish"
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Eş Anlamlılar</label>
                  <input
                    type="text"
                    placeholder="örn: syn: decrease, decline"
                    value={newSynonyms}
                    onChange={(e) => setNewSynonyms(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Örnek Kalıp / Cümle</label>
                <input
                  type="text"
                  placeholder="örn: diminish of natural resources"
                  value={newPhrase}
                  onChange={(e) => setNewPhrase(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Türkçe Karşılıklar (Virgülle ayırın) *</label>
                <input
                  type="text"
                  required
                  placeholder="örn: azalmak [f.], eksilmek [f.]"
                  value={newTurkish}
                  onChange={(e) => setNewTurkish(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                  TÜRLER: <code className="text-indigo-600">[zf.]</code> zarf, <code className="text-indigo-600">[f.]</code> fiil, <code className="text-indigo-600">[i.]</code> isim, <code className="text-indigo-600">[s.]</code> sıfat.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingFormOpen(false)}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Kaydet
                </button>
              </div>
            </form>
          )}

          {/* Words List */}
          <div className="space-y-3">
            {filteredWords.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-550 italic text-sm">
                Arama kriterlerine uygun kelime bulunamadı.
              </div>
            ) : (
              filteredWords.map(word => {
                const isEditingThis = editingWord?.id === word.id;

                if (isEditingThis) {
                  return (
                    <div 
                      key={word.id} 
                      className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl space-y-3 animate-fade-in"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Kelimeyi Düzenle</span>
                        <button onClick={() => setEditingWord(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={editTerm}
                          onChange={(e) => setEditTerm(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-800"
                        />
                        <input
                          type="text"
                          placeholder="Eş anlamlılar"
                          value={editSynonyms}
                          onChange={(e) => setEditSynonyms(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-800"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Örnek kullanım"
                        value={editPhrase}
                        onChange={(e) => setEditPhrase(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-800"
                      />
                      <input
                        type="text"
                        placeholder="Türkçe anlamlar (virgülle ayırın)"
                        value={editTurkish}
                        onChange={(e) => setEditTurkish(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-800"
                      />
                      
                      <div className="flex justify-end space-x-2 pt-1">
                        <button
                          onClick={() => setEditingWord(null)}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs"
                        >
                          İptal
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                        >
                          Değişiklikleri Kaydet
                        </button>
                      </div>
                    </div>
                  );
                }

                const currentStatus = word.status || (word.learned ? 'learned' : 'unmarked');

                let cardClass = "border-slate-200/60 dark:border-slate-800 bg-white hover:bg-slate-50/40 dark:bg-slate-950/20";
                let leftAccentBar = "bg-slate-300 dark:bg-slate-700";
                let termColor = "text-slate-800 dark:text-slate-100";

                if (currentStatus === 'learned') {
                  cardClass = "border-emerald-200 dark:border-emerald-950/40 bg-emerald-50/10 dark:bg-emerald-950/5 hover:bg-emerald-55/15";
                  leftAccentBar = "bg-emerald-500";
                  termColor = "text-emerald-850 dark:text-emerald-450";
                } else if (currentStatus === 'struggled') {
                  cardClass = "border-rose-200 dark:border-rose-950/40 bg-rose-50/10 dark:bg-rose-950/5 hover:bg-rose-55/15";
                  leftAccentBar = "bg-rose-500";
                  termColor = "text-rose-850 dark:text-rose-450 font-black";
                }

                return (
                  <div 
                    key={word.id}
                    className={`relative pl-4 pr-10 sm:pr-4 py-3.5 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-200 overflow-hidden ${cardClass}`}
                  >
                    {/* Status Vertical Stripe */}
                    <div className={`absolute left-0 inset-y-0 w-1.5 rounded-l-2xl ${leftAccentBar}`} />

                    {/* Edit/Delete Icons Absolutely Positioned in top-right */}
                    <div className="absolute top-2.5 right-2.5 flex items-center space-x-0.5 z-10">
                      <button
                        onClick={() => handleStartEdit(word)}
                        className="p-1.5 text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
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
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Left/Middle Content Area */}
                    <div className="space-y-2 flex-1 min-w-0 overflow-hidden">
                      {/* Term + Audio */}
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className={`font-display font-black text-base tracking-tight select-all break-words min-w-0 max-w-full ${termColor}`}>
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

                      {/* Synonyms */}
                      {word.synonyms && (
                        <div className="text-xs text-slate-650 dark:text-slate-300">
                          <span className="font-bold text-slate-450 dark:text-slate-500 mr-1">Eş Anlam:</span>
                          <span className="font-medium break-words">{word.synonyms}</span>
                        </div>
                      )}

                      {/* Collocation styled as clean callout blockquote */}
                      {word.phrase && (
                        <div className="p-2 bg-indigo-50/15 dark:bg-indigo-950/10 border border-indigo-100/10 dark:border-indigo-900/15 rounded-xl text-xs italic text-indigo-600 dark:text-indigo-400 font-serif leading-relaxed break-words">
                          "{word.phrase}"
                        </div>
                      )}

                      {/* Turkish Meanings */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {word.turkishMeanings.map((meaning, idx) => {
                          const { text, cleanMeaning, colorClass } = getWordTypeColor(meaning);
                          return (
                            <span 
                              key={idx} 
                              className="inline-flex items-center space-x-1 px-2.5 py-1 max-w-full break-words bg-slate-50 dark:bg-slate-900 border border-slate-150/40 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-350 rounded-lg shadow-3xs"
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

                    {/* Right Controls Area (Actions and Toggles) */}
                    <div className="shrink-0 self-start sm:self-center max-w-full overflow-x-auto">
                      {/* Status Selector Segment Controls on the Right */}
                      <div className="inline-flex items-center space-x-1 p-0.5 bg-slate-100/70 dark:bg-slate-900/80 rounded-xl border border-slate-150/40 dark:border-slate-800/40">
                        {/* Unmarked Option */}
                        <button
                          onClick={() => onUpdateWord({ ...word, status: 'unmarked', learned: false })}
                          className={`p-1 px-2 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center space-x-1 ${
                            currentStatus === 'unmarked'
                              ? 'bg-white dark:bg-slate-800 text-slate-750 dark:text-slate-200 shadow-3xs border border-slate-200/30 dark:border-slate-700/60'
                              : 'text-slate-450 hover:text-slate-650 dark:hover:text-slate-350'
                          }`}
                          title="Çalışılmadı"
                        >
                          <Circle className="w-3 h-3" />
                          <span>Çalış</span>
                        </button>
                        
                        {/* Struggled Option */}
                        <button
                          onClick={() => onUpdateWord({ ...word, status: 'struggled', learned: false })}
                          className={`p-1 px-2.5 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center space-x-1 ${
                            currentStatus === 'struggled'
                              ? 'bg-rose-50 dark:bg-rose-950/45 text-rose-600 dark:text-rose-400 border border-rose-100/40 dark:border-rose-900/40'
                              : 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/15'
                          }`}
                          title="Zor / Öğrenemedim"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Zor</span>
                        </button>

                        {/* Learned Option */}
                        <button
                          onClick={() => onUpdateWord({ ...word, status: 'learned', learned: true })}
                          className={`p-1 px-2.5 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center space-x-1 ${
                            currentStatus === 'learned'
                              ? 'bg-emerald-50 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 border border-emerald-100/40 dark:border-emerald-900/40'
                              : 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15'
                          }`}
                          title="Öğrendim"
                        >
                          <Check className="w-3 h-3 stroke-[2.5px]" />
                          <span>Öğrendim</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>
    </div>
  );
}



