import React, { useState, useRef } from 'react';
import { Upload, Clipboard, Info, Check, AlertCircle } from 'lucide-react';
import { parseCSV } from '../utils';
import { Word, WordList } from '../types';

interface CSVImporterProps {
  onImport: (newLists: WordList[], newWords: Word[]) => void;
}

export default function CSVImporter({ onImport }: CSVImporterProps) {
  const [pasteText, setPasteText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImportText = (text: string) => {
    try {
      if (!text.trim()) {
        setStatusMessage({ type: 'error', text: 'Lütfen veri girin veya bir dosya yükleyin.' });
        return;
      }

      const { lists, words } = parseCSV(text);

      if (words.length === 0) {
        setStatusMessage({ 
          type: 'error', 
          text: 'Kelime bulunamadı. Sütunların doğru formatta olduğuna emin olun (Kelime, Eş Anlam, Örnek Cümle, Türkçe...).' 
        });
        return;
      }

      onImport(lists, words);
      setStatusMessage({
        type: 'success',
        text: `Başarıyla ${lists.length} liste ve ${words.length} kelime aktarıldı!`
      });
      setPasteText('');
      
      setTimeout(() => {
        setStatusMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Dosya işlenirken hata oluştu: ' + err.message });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processImportText(text);
    };
    reader.onerror = () => {
      setStatusMessage({ type: 'error', text: 'Dosya okunurken bir hata oluştu.' });
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setStatusMessage({ type: 'error', text: 'Lütfen sadece .csv veya .txt dosyası yükleyin.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processImportText(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-xs mb-10">
      <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-450 rounded-xl">
          <Upload className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-display font-bold text-slate-800 dark:text-slate-100">Koleksiyon Aktar (Excel / CSV)</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Middle: Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20' 
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-950/20'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.txt"
              className="hidden"
            />
            <Upload className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">CSV veya Excel Dosyası Sürükleyin</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Veya bilgisayarınızdan seçmek için tıklayın (.csv, .txt)</p>
          </div>

          <div className="relative flex items-center justify-center my-4">
            <span className="absolute px-4 bg-white dark:bg-slate-900 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Veya Doğrudan Yapıştırın</span>
            <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
          </div>

          {/* Text Area Input */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Excel'den Kopyalanan Sütunları Buraya Yapıştırın
            </label>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`Örnek satır:\ncomparatively\tsyn: Moderately, relatively\tcomparatively few disasters\tkısmen [zf.]\tnispeten [zf.]`}
              rows={4}
              className="w-full px-4 py-3 text-sm font-mono border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/35 dark:bg-slate-950/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-700"
            />
            <button
              onClick={() => processImportText(pasteText)}
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest py-3.5 px-4 rounded-xl transition-all duration-200 cursor-pointer shadow-xs"
            >
              <Clipboard className="w-4 h-4" />
              <span>Verileri Çözümle ve Aktar</span>
            </button>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className={`p-4 rounded-xl border flex items-start space-x-3 text-sm font-medium ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900' 
                : 'bg-red-50 text-red-800 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900'
            }`}>
              {statusMessage.type === 'success' ? (
                <Check className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Right Column: Guidelines */}
        <div className="bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 space-y-4">
          <div className="flex items-center space-x-2 font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Excel / CSV Şablon Rehberi</span>
          </div>
          <p className="leading-relaxed text-slate-500 dark:text-slate-400">
            Sisteminizin listeleri otomatik tanıyabilmesi için verilerinizi şu yapıda hazırlayın:
          </p>
          <ul className="list-disc pl-4 space-y-2 leading-relaxed">
            <li>
              <strong className="text-slate-600 dark:text-slate-300">Koleksiyon Başlığı:</strong> <code className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 font-mono rounded text-[11px]">Day 27</code> gibi bir ifadeyi tek bir satıra yazarak altına kelimeleri ekleyin.
            </li>
            <li>
              <strong className="text-slate-600 dark:text-slate-300">1. Sütun:</strong> İngilizce kelime (Term)
            </li>
            <li>
              <strong className="text-slate-600 dark:text-slate-300">2. Sütun:</strong> Eş anlamlı kelimeler (örn: <code className="text-indigo-500 font-mono">syn: Moderately</code>)
            </li>
            <li>
              <strong className="text-slate-600 dark:text-slate-300">3. Sütun:</strong> Örnek cümle (örn: <code className="italic">comparatively few disasters</code>)
            </li>
            <li>
              <strong className="text-slate-600 dark:text-slate-300">4. Sütun ve sonrası:</strong> Türkçe karşılıkları ve kelime türü (örn: <code className="font-bold text-slate-700 dark:text-slate-300">kısmen [zf.]</code>).
            </li>
          </ul>
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 font-mono rounded-lg leading-relaxed scale-95 origin-top-left overflow-x-auto text-[10px] text-slate-400 dark:text-slate-350">
            <p className="font-bold text-indigo-500">Day 19, ,,,,,,</p>
            <p>comparatively,"syn: relatively",comparatively few disasters,kısmen [zf.],nispeten [zf.]</p>
            <p>decline,"syn: Decrease",population declines,azalma [i.],azalmak [f.]</p>
          </div>
          <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/30 dark:border-indigo-900/30 rounded-xl text-[11px] leading-relaxed text-indigo-650 dark:text-indigo-350">
            💡 <strong className="text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-bold">Kolaylık:</strong> Excel veya Google E-Tablolar'daki satırları doğrudan seçip kopyalayarak sol tarafa yapıştırabilirsiniz. Sütun ayrımı otomatik olarak tab-separated şeklinde algılanacaktır.
          </div>
        </div>
      </div>
    </div>
  );
}
