# LexiCards Proje İncelemesi ve Geliştirme Yol Haritası

Tarih: 16 Temmuz 2026

Bu belge; mevcut kaynak kodun statik incelemesine dayanır. Amaç, önce veri doğruluğu ve olası hataları çözmek, ardından mobil deneyimi iyileştirmek ve son olarak öğrenme değerini artıracak özellikleri eklemektir.

## Kısa sonuç

İlk ele alınması gereken konular:

1. Öğrenme ilerlemesini sıfırlama işlemi `status` alanını temizlemediği için bazı kelimeler hâlâ öğrenilmiş görünebilir.
2. Arayüz sekmeyle ayrılmış Excel verisini desteklediğini söylüyor; mevcut ayrıştırıcı yalnızca virgülü ayırıcı kabul ediyor.
3. Giriş bilgileri kaynak kodda sabit ve oturum sadece `localStorage` değeriyle korunuyor; bu gerçek bir güvenlik sağlamıyor.
4. Quiz cevabı ilk dokunuşta yalnızca seçiliyor, ikinci dokunuşta değerlendiriliyor; arayüz bunu kullanıcıya açıklamıyor.
5. Mobil alt navigasyonda gerçek safe-area desteği yok ve bazı dokunma hedefleri küçük.

Önerilen sıra: **veri/doğruluk hataları → mobil temel deneyim → test altyapısı → öğrenme özellikleri → bulut senkronizasyonu**.

## 1. Olası hatalar ve teknik riskler

### P0 — Yayına çıkmadan önce

#### 1.1 İstemci tarafındaki giriş sistemi güvenli değil

- Kanıt: `src/App.tsx:149` içinde kullanıcı adı ve parola doğrudan kontrol ediliyor.
- Kanıt: oturum, `lexicards_auth=true` değeriyle `localStorage` içinde tutuluyor (`src/App.tsx:58`, `src/App.tsx:150`).
- Etki: Tarayıcı geliştirici araçlarını kullanan biri giriş kontrolünü kolayca aşabilir; paketlenen JavaScript içinde parola görülebilir.
- Öneri:
  - Uygulama yalnızca kişisel kullanım içindeyse giriş ekranını tamamen kaldırmak düşünülebilir.
  - Gerçek kullanıcı girişi gerekiyorsa sunucu taraflı kimlik doğrulama, hashlenmiş parola ve güvenli oturum/cookie kullanılmalı.
  - `localStorage` içindeki auth değeri güvenlik sınırı olarak kabul edilmemeli.

### P1 — Yüksek öncelikli doğruluk sorunları

#### 1.2 “İlerlemeyi sıfırla” bazı kelimeleri sıfırlamıyor

- Kanıt: `src/App.tsx:239` yalnızca `learned: false` yazıyor; `status: 'learned'` veya `status: 'struggled'` değerleri korunuyor.
- Diğer ekranlar çoğunlukla `status || learned` kuralını kullanıyor. Bu nedenle kullanıcı sıfırlama yaptıktan sonra kelime hâlâ öğrenilmiş veya zor olarak görünebilir.
- Öneri: sıfırlamada hem `learned: false` hem `status: 'unmarked'` yazılmalı.
- Kabul kriteri: sıfırlama sonrasında istatistik, koleksiyon, kütüphane ve çalışma filtrelerinin tamamında öğrenilmiş/zor kelime sayısı sıfır olmalı.

#### 1.3 Excel’den sekmeli yapıştırma çalışmayabilir

- Kanıt: İçe aktarma ekranı Excel/Google Sheets sekmeli verisinin otomatik algılanacağını söylüyor (`src/components/CSVImporter.tsx:203`).
- Kanıt: `parseCSVLine` yalnızca virgülü ayırıcı olarak işliyor (`src/utils.ts:28-55`).
- Etki: Excel’den doğrudan yapıştırılan satırlar kelime yerine koleksiyon başlığı gibi yorumlanabilir ve içe aktarma başarısız olabilir.
- Öneri:
  - Satırda tab varsa TSV, yoksa CSV ayrıştırması kullanılsın.
  - Mümkünse elle yazılmış ayrıştırıcı yerine Papa Parse gibi test edilmiş bir CSV/TSV ayrıştırıcısı kullanılsın.
  - Ön izleme ekranı eklenerek içe aktarmadan önce liste/kelime sayısı gösterilsin.

#### 1.4 Kısmi veya bozuk `localStorage` verisi varsayılanlarla ezilebilir

- Kanıt: `vocab_lists` ve `vocab_words` değerlerinden yalnızca biri eksikse uygulama varsayılan veriyi yükleyip iki anahtarı yeniden yazar (`src/App.tsx:107-143`).
- Etki: Tarayıcı depolamasındaki kısmi bir hata veya manuel temizlik, kalan geçerli verinin kaybolmasına yol açabilir.
- Öneri:
  - Her anahtar ayrı doğrulansın.
  - Yüklemeden önce veri şeması kontrol edilsin.
  - Bozuk veri otomatik ezilmeden önce kurtarma/JSON dışa aktarma seçeneği sunulsun.
  - Depolama formatına `schemaVersion` alanı eklenip migration sistemi kurulsun.

#### 1.5 Quiz cevaplama davranışı arayüz metniyle uyuşmuyor

- Kanıt: `src/components/QuizView.tsx:206-229` ilk dokunuşta seçimi kaydedip geri dönüyor; cevap ancak aynı seçeneğe ikinci kez dokunulduğunda değerlendiriliyor.
- Arayüz ise “Doğru şıkka tıklayarak cevap verin” diyor (`src/components/QuizView.tsx:558-564`).
- Etki: Özellikle mobilde ilk dokunuşun çalışmadığı düşünülebilir.
- Öneri seçenekleri:
  1. Tek dokunuşta cevabı değerlendir.
  2. İlk dokunuş seçsin, ayrı ve belirgin bir “Cevabı Onayla” butonu göster.
- Tercih: Yanlış dokunmaları önlemek isteniyorsa ikinci seçenek daha anlaşılırdır.

### P2 — Orta öncelikli sorunlar

#### 1.6 Öğrenme durumu farklı ekranlarda farklı hesaplanıyor

- `ListInspectorModal` içindeki “Öğrenmediklerim”, öğrenilmiş olmayan her şeyi içeriyor; yani zor kelimeler de bu sayıya giriyor (`src/components/ListInspectorModal.tsx:72-78`, `src/components/ListInspectorModal.tsx:352`).
- `WordExplorer` içindeki “Çalışılacaklar” yalnızca `unmarked` durumunu içeriyor (`src/components/WordExplorer.tsx:37-41`).
- Ana koleksiyon kartında öğrenilen sayısı doğrudan `learned` boolean alanından hesaplanıyor; diğer alanlar `status` değerini öncelikli kabul ediyor (`src/App.tsx:1094`).
- Öneri: Tek bir `getWordStatus(word)` yardımcı fonksiyonu oluşturulup bütün ekranlarda aynı semantik kullanılmalı.

#### 1.7 İlk quiz kelimesinin sesi iki defa tetiklenebilir

- `handleStartStudy`, quizde İngilizce kelimenin soru olduğu modlarda 300 ms sonra sesi oynatıyor (`src/App.tsx:366-370`).
- `QuizView` de aynı modlarda mount olduğunda sesi oynatıyor (`src/components/QuizView.tsx:135-204`).
- `speakWord` önce mevcut sesi iptal ettiği için kullanıcı sesin kesilip yeniden başladığını duyabilir.
- Öneri: Otomatik telaffuzun tek sahibi `QuizView` veya üst seviye session controller olmalı; iki yerde birden çalışmamalı.

#### 1.8 Depolama kotası ve yazma hataları ele alınmıyor

- `localStorage.setItem` çağrılarında `QuotaExceededError` veya erişim hatası yakalanmıyor.
- Etki: Çok sayıda liste/kelime eklendiğinde arayüz güncel görünüp yenilemede veriler kaybolabilir.
- Öneri: bütün kalıcı yazmaları tek bir storage servisine taşı, hatayı yakala ve kullanıcıya kalıcı bir uyarı göster.

#### 1.9 CSV ayrıştırıcı standart CSV uç durumlarını tam desteklemiyor

- İç içe çift tırnak (`""`) ve çok satırlı quoted alanlar güvenilir biçimde işlenmiyor.
- Tek sütunlu bir kelime satırı koleksiyon başlığı olarak yorumlanabilir.
- Öneri: ayrıştırıcı için fixture tabanlı testler ve ön izleme/validasyon eklenmeli.

#### 1.10 Koleksiyon filtresi iki ekran arasında ortak state kullanıyor

- Ana Koleksiyonlar ekranındaki arama/filtre ile Çalışma panelindeki koleksiyon filtresi aynı state’i kullanıyor.
- Etki: Kullanıcı bir ekranda “Seçilenler” filtresini açtığında diğer ekrana geçince beklenmedik biçimde aynı filtreyi görebilir.
- Öneri: Bu bilinçli bir ürün kararı değilse iki ekranın filtre state’leri ayrılmalı.

#### 1.11 Rastgele çalışma sırası taraflı bir yöntem kullanıyor

- `src/App.tsx:346-349` içinde `sort(() => Math.random() - 0.5)` kullanılıyor.
- Bu yöntem eşit dağılımlı bir shuffle üretmez.
- Öneri: Quiz seçeneklerinde zaten kullanılan Fisher–Yates yaklaşımı ortak bir `shuffle` yardımcısına taşınmalı.

## 2. Mobil kullanım iyileştirmeleri

### En yüksek değerli mobil değişiklikler

#### 2.1 Gerçek safe-area desteği

- Alt navigasyonda `pb-safe` sınıfı kullanılıyor (`src/App.tsx:1504`), ancak projede bu utility tanımlı değil.
- iPhone home indicator alanında navigasyon veya Başlat butonu sıkışabilir.
- Öneri:

```css
.pb-safe {
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
}
```

- Sabit Başlat butonunun `bottom` değeri de `env(safe-area-inset-bottom)` hesaba katılarak belirlenmeli.

#### 2.2 Küçük ekranlarda iki sütunlu koleksiyon kartları

- Ana Koleksiyonlar ekranı mobilde doğrudan üç sütun kullanıyor (`src/App.tsx:1091`).
- Uzun koleksiyon adları ve durum rozetleri 320–390 px ekranlarda sıkışabilir.
- Öneri: 420 px altı iki sütun, daha geniş telefonda üç sütun; isteğe bağlı kompakt liste/kart görünümü seçimi.

#### 2.3 Minimum 44×44 px dokunma hedefleri

- Bazı filtreler, ikon butonları ve üst bar aksiyonları yaklaşık 32 px yüksekliğinde.
- Öneri: mobilde ana aksiyonlar ve ikon butonları en az 44 px; ikincil kontroller en az 40 px olmalı.
- Yalnızca renk değil, aktif durum için ikon/metin değişimi de kullanılmalı.

#### 2.4 Çalışma ekranında dinamik viewport yüksekliği

- Çalışma ekranı `fixed inset-0` ve iç içe scroll alanları kullanıyor (`src/App.tsx:652`).
- Mobil tarayıcı adres çubuğu açılıp kapanırken içerik sıçrayabilir veya alt butonlar kesilebilir.
- Öneri: ana çalışma kabuğunda `min-height: 100dvh`/`height: 100dvh` kullan; tek bir ana scroll container bırak.

#### 2.5 Kaydırma ve kart çevirme jestlerini netleştirme

- Kart konteynerinde `touch-none` bulunuyor (`src/components/CardView.tsx:176-179`). Bu, kart üzerinden başlayan dikey sayfa kaydırmasını engelleyebilir.
- Öneri: yatay sürükleme eşiklerini koruyup `touch-pan-y` kullan; dikey hareketi sayfaya bırak.
- İlk kullanımda kısa bir swipe öğreticisi göster; daha sonra gizle.

#### 2.6 Son kartta aksiyon metni

- Kart modunda son kartta buton hâlâ “Sonraki” yazıyor (`src/components/CardView.tsx:420-435`).
- Öneri: son kartta “Çalışmayı Bitir”; önceki ilk kartta disabled durumu ve görsel geri bildirim.

#### 2.7 Modal ve formları mobil bottom-sheet olarak iyileştirme

- Koleksiyon ayrıntısı mobilde zaten alta yaslanıyor ancak focus trap, Escape yönetimi ve body scroll kilidi yok.
- Öneri:
  - mobilde tam yüksekliğe yakın sheet,
  - yapışkan başlık ve kaydet aksiyonu,
  - klavye açıldığında alanı görünür tutma,
  - dışarı dokunma/Escape/focus trap desteği.

#### 2.8 `alert`/`confirm` yerine uygulama içi geri bildirim

- Native diyaloglar mobilde bağlamı kesiyor ve tasarımla uyumsuz.
- Öneri: silme için erişilebilir confirm sheet; başarı/hata için toast; silme sonrasında 5 saniyelik “Geri al”.

### Mobil çalışma akışı için ek öneriler

- [x] Çalışma tercihlerini ayrı büyük kartlar yerine açılıp kapanabilen “Seans ayarları” alanına dönüştür.
- [x] Koleksiyon seçimini arama destekli bottom sheet içinde aç; seçilenleri üstte chip olarak göster.
- [x] Başlat butonunda yalnızca kelime sayısını değil tahmini süreyi de göster: “Başlat · 40 kelime · ~8 dk”.
- [x] Kullanıcı uygulamayı arka plana atarsa mevcut seansı, kart indeksini ve quiz cevaplarını kaydet.
- [x] Telefon titreşimi destekleniyorsa doğru/yanlış cevapta isteğe bağlı hafif haptic feedback kullan.
- [x] Uzun kelime/anlamlarda fontu agresif küçültmek yerine kontrollü sarma ve genişleyen kart kullan.
- [x] Mobil üst başlıkta “Sıfırla” ve “Çıkış” seçeneklerini üç nokta menüsüne taşıyarak başlığı sadeleştir.

## 3. Eklenebilecek özellikler

### Şimdi — küçük efor, yüksek fayda

| Özellik | Kullanıcı değeri | Not |
|---|---|---|
| JSON yedekleme ve geri yükleme | Yerel verinin kaybolmasını önler | Listeler, kelimeler, durumlar, geçmiş ve tercihler tek dosyada |
| Aktif seansı otomatik kaydetme | Yenileme/telefon kapanmasında çalışma kaybolmaz | İndeks, cevaplar, başlangıç zamanı ve seçili listeler |
| Yanlışları tekrar çalış | Quiz sonunda doğrudan zayıf kelimelere döner | Sonuç ekranına tek buton |
| Favori/yıldızlı kelimeler | Özel tekrar listesi oluşturur | Kütüphane ve kart ekranında yıldız |
| Geri al | Yanlış silme veya durum değişikliğini düzeltir | Özellikle mobilde önemli |
| Seans kelime limiti | 500 kelimelik listede kısa çalışma sağlar | 10/20/50/tümü seçenekleri |

### Sonraki — öğrenme kalitesini artıran özellikler

| Özellik | Kullanıcı değeri | Not |
|---|---|---|
| Aralıklı tekrar | Doğru kelimeyi doğru zamanda tekrar ettirir | Basit Leitner ile başlanabilir; sonra SM-2/FSRS |
| Günlük hedef ve seri | Düzenli kullanım motivasyonu | Günlük kelime, dakika veya seans hedefi |
| Zor kelimeler kuyruğu | `struggled` kelimeleri otomatik tekrar ettirir | Son çalışma ve hata sayısına göre sırala |
| Ayrıntılı analiz | Hangi liste/mod zor gösterir | Gün/hafta, doğruluk, süre, unutma eğrisi |
| Telaffuz ayarları | Farklı aksan ve hız seçimi | `speechSynthesis.getVoices()` ile ses seçimi |
| Not ve örnek cümle | Kişisel bağlam ekler | Kelime başına kısa not alanı |

### Daha sonra — ürün seviyesinde geliştirmeler

- PWA: ana ekrana kurulum, offline çalışma ve güncelleme bildirimi.
- Hesap ve bulut senkronizasyonu: cihazlar arasında ilerleme paylaşımı.
- Paylaşılabilir koleksiyon bağlantıları ve koleksiyon içe/dışa aktarma.
- Öğretmen/öğrenci modu, ödev listeleri ve sınıf istatistikleri.
- Çoklu dil desteği ve arayüz çevirileri.
- Görsel destekli kartlar ve isteğe bağlı örnek cümle üretimi.

## 4. Performans ve kod sağlığı

### 4.1 Büyük listelerde tekrar eden hesaplamalar

- Birçok render sırasında her koleksiyon için `words.filter(...)` tekrar çalışıyor.
- 500 kelimede sorun küçük olabilir; binlerce kelime ve çok sayıda koleksiyonda mobil cihazda hissedilir.
- Öneri:
  - liste bazlı toplam/öğrenilen/zor sayaçlarını tek `reduce` ile hesapla,
  - pahalı filtreleri `useMemo` ile sınırla,
  - çok uzun kelime listelerinde sanallaştırma kullan.

### 4.2 `App.tsx` fazla sorumluluk taşıyor

- Dosya; auth, storage, import, CRUD, çalışma motoru, quiz, geçmiş ve bütün tab renderlarını aynı yerde yönetiyor.
- Önerilen ayrım:
  - `services/storage.ts`
  - `hooks/useVocabulary.ts`
  - `hooks/useStudySession.ts`
  - `features/collections/`
  - `features/study/`
  - `features/history/`
- Bu ayrım bug düzeltmelerini ve test yazmayı kolaylaştırır.

### 4.3 Ortak durum yardımcıları

Tek yerde tanımlanması önerilen fonksiyonlar:

```ts
getWordStatus(word)
setWordStatus(word, status)
shuffle(items)
readStorage(key, schema)
writeStorage(key, value)
```

### 4.4 Erişilebilirlik

- `div onClick` kullanılan koleksiyon kartları klavyeyle açılamıyor (`src/App.tsx:1116`).
- Modal focus trap ve odak geri yükleme eksik.
- İkon butonların tamamında görünür veya ekran okuyucu etiketi olmalı.
- Renk karşıtlığı ve sadece renkle iletilen durumlar otomatik test edilmeli.
- `prefers-reduced-motion` desteği eklenmeli.

## 5. Test planı

Projede şu an `lint` komutu yalnızca TypeScript kontrolü yapıyor; otomatik unit/component/E2E testi bulunmuyor.

### İlk yazılacak unit testleri

1. CSV ve TSV ayrıştırma; quoted virgül, escaped quote ve boş satırlar.
2. Öğrenme durumunu sıfırlama.
3. Koleksiyon arama, görünürlük filtresi ve doğal sayısal sıralama.
4. Quizde dört benzersiz cevap üretimi.
5. Geçmiş kaydı ekleme, tek kayıt silme ve tümünü silme.
6. Bozuk/eski storage şemasından güvenli yükleme.

### Component testleri

- Ses tercihi yenileme sonrasında korunuyor mu?
- Quiz tek dokunuş/onay akışı doğru mu?
- Filtrelenmiş “Tümünü Seç” yalnızca görünen koleksiyonları seçiyor mu?
- Son kart “Bitir” aksiyonuyla geçmiş kaydı oluşuyor mu?
- Modal açıldığında odak içeride kalıyor ve kapanınca önceki elemana dönüyor mu?

### Mobil E2E matrisi

- Ekranlar: 320×568, 375×667, 390×844, 430×932.
- Tarayıcılar: iOS Safari, Android Chrome.
- Senaryolar: içe aktarma, koleksiyon filtreleme, kart swipe, quiz, ses kapatma, uygulamayı arka plana alma, geçmiş silme.
- Kontrol: safe-area, sanal klavye, yatay taşma, sabit alt bar, 2000+ kelimede filtre performansı.

## 6. Önerilen uygulama planı

### Aşama 1 — Doğruluk ve veri güvenliği

- İlerleme sıfırlama hatasını düzelt.
- CSV/TSV ayrıştırmayı ve ön izlemeyi düzelt.
- Status hesaplamasını merkezileştir.
- Storage katmanı, şema versiyonu ve JSON yedekleme ekle.
- Gerçek auth gereksinimine karar ver.

### Aşama 2 — Mobil temel deneyim

- Safe-area ve `100dvh` düzeltmeleri.
- 44 px dokunma hedefleri.
- Koleksiyon kartlarında 2/3 sütun responsive düzen.
- Quiz cevap onayı ve son kart “Bitir” aksiyonu.
- Native alert/confirm yerine toast ve bottom-sheet.

### Aşama 3 — Test ve mimari

- Vitest + React Testing Library.
- Playwright mobil senaryoları.
- Storage ve session hook’larını `App.tsx` dışına çıkar.
- Büyük veri seti için memoization ve performans ölçümü.

### Aşama 4 — Öğrenme özellikleri

- Yanlışları tekrar çalış.
- Seans limiti ve günlük hedef.
- Aralıklı tekrar.
- Analiz ekranı ve PWA.

## Önerilen ilk sprint

İlk sprintte aşağıdaki altı iş en iyi fayda/efor dengesini verir:

1. `status` sıfırlama hatası.
2. CSV + TSV güvenilir ayrıştırma ve testleri.
3. Quiz cevap onay davranışının netleştirilmesi.
4. Mobil safe-area + 44 px dokunma hedefleri.
5. JSON yedekleme/geri yükleme.
6. Aktif seansın yenileme sonrasında devam etmesi.
