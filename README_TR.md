# LexiCards

[![English README](https://img.shields.io/badge/EN-English_README-1D4ED8?style=for-the-badge&logoColor=white)](./README.md)

LexiCards; İngilizce kelimeleri, phrasal verb yapılarını ve common
combinations kalıplarını Türkçe anlamlarıyla çalışmak için geliştirilmiş,
mobil öncelikli bir React uygulamasıdır.

## Özellikler

- Uygulamayla birlikte gelen Day 1–55 kelime koleksiyonları
- Day 56 Common Combinations koleksiyonu
- Toplam 55 kelime listesi ve 1.182 kelime
- 510 Common Combination kaydı
- Kelime kartı ve quiz çalışma modları
- Common Combinations kart ve boşluk tamamlama modları
- Türkçe anlam, eş anlam ve örnek kalıp gösterimi
- Öğrendim, öğrenemedim, doğru, yanlış ve cevapsız takibi
- Sıralı veya karışık çalışma
- Koleksiyon, durum ve kombinasyon ailesine göre filtreleme
- Tarayıcı üzerinden İngilizce telaffuz
- Mobil ekrana sabitlenen, sayfa kaydırması gerektirmeyen çalışma oturumları
- Çalışma geçmişi ve başarı istatistikleri
- Tarayıcı `localStorage` alanında cihaz bazlı ilerleme saklama
- Açık ve koyu tema desteği

Kullanıcıya açık CSV/Excel yükleme özelliği kapalıdır. Varsayılan veriler
`words/` klasöründen production paketine eklenir.

## Kullanılan Teknolojiler

<p align="left">
  <img alt="React 19" src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img alt="Motion" src="https://img.shields.io/badge/Motion-FFF312?style=for-the-badge&logo=framer&logoColor=black" />
  <img alt="Lucide" src="https://img.shields.io/badge/Lucide-F56565?style=for-the-badge&logo=lucide&logoColor=white" />
  <img alt="Netlify" src="https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white" />
</p>

## Kurulum

Gereksinimler:

- Node.js 18 veya üzeri
- npm

Bağımlılıkları kurun:

```bash
npm install
```

Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

Uygulama varsayılan olarak aşağıdaki adreste çalışır:

```text
http://localhost:3000
```

## Kontrol ve Derleme

```bash
npm run lint
npm run build
npm run preview
```

## Paketlenmiş Veriler

```text
words/
  modadil_day1_18.csv
  modadil_day19_26.csv
  modadil_day27_40.csv
  modadil_day41_54.csv
  modadil_day55_common_phrasal_verbs.csv
  modadil_day56_common_combinations.csv
```

Day 1–55 dosyaları kelime listelerine, Day 56 dosyası ise Common
Combinations çalışma alanına dönüştürülür. Day 57 dosyası şu an production
veri migrasyonuna dahil değildir.

## LocalStorage ve Veri Koruması

Aşağıdaki kullanıcı verileri yalnızca ziyaretçinin tarayıcısında saklanır:

- Öğrenildi ve zorlanıldı durumları
- Quiz ve boşluk tamamlama sonuçları
- Çalışma geçmişi
- Kullanıcı tarafından düzenlenen kelimeler ve özel listeler
- Telaffuz ve titreşim tercihleri
- Devam eden çalışma oturumu

Bu veriler GitHub’a veya Netlify’a gönderilmez. Bilgisayardaki localhost
verileri bilgisayarda, telefondaki production verileri telefonda kalır.

`localStorage` site adresine bağlıdır. Mevcut telefon ilerlemesinin korunması
için aynı Netlify domaini kullanılmalı ve tarayıcı site verileri
temizlenmemelidir.

## Sürümlü Veri Migrasyonu

Uygulama React başlamadan önce [`src/seedData.ts`](./src/seedData.ts) üzerinden
veri migrasyonu çalıştırır.

Migrasyon:

1. Mevcut `localStorage` listelerini ve kelimelerini okur.
2. Var olan ilerlemeyi, kelime düzenlemelerini ve özel listeleri korur.
3. Eksik Day 1–55 listelerini ve kelimelerini ekler.
4. Day 56 yoksa veya boşsa 510 Common kaydını oluşturur.
5. Geçmişi, ayarları ve devam eden oturumu korur.
6. Gereksiz tekrarları sürüm anahtarlarıyla engeller.

Paketlenmiş CSV içeriği değiştirildiğinde `src/seedData.ts` içindeki ilgili
seed sürümü artırılmalıdır.

## GitHub ve Netlify Deploy

Commit öncesi:

```bash
npm run lint
npm run build
git status
```

Değişiklikleri ekleyip gönderin:

```bash
git add README.md readme_tr.md src words package.json package-lock.json netlify.toml
git commit -m "Add bundled vocabulary and common combinations migration"
git push
```

Deploy tamamlandıktan sonra telefonda aynı Netlify adresi yenilendiğinde yeni
kod yüklenir. Migrasyon eksik verileri ekler; mevcut ilerleme silinmez.

## Proje Yapısı

```text
src/
  components/                  Arayüz ve çalışma bileşenleri
  App.tsx                      Ana uygulama ve navigasyon akışı
  main.tsx                     Uygulama başlangıcı
  seedData.ts                  Sürümlü veri migrasyonu
  commonCombinations.ts        Day 56 ayrıştırma işlemleri
  types.ts                     Ortak TypeScript tipleri
  utils.ts                     CSV ve yardımcı fonksiyonlar
words/                         Paketlenmiş çalışma verileri
netlify.toml                   Netlify build ve SPA yönlendirmesi
```

## Önemli Notlar

- `words/` klasörü commit’e mutlaka dahil edilmelidir.
- `dist/` klasörünün commit edilmesi gerekmez; Netlify build sırasında üretir.
- Tarayıcı `localStorage` içeriği repository’ye eklenmemelidir.
- Netlify domaini değiştirilirse ayrı bir `localStorage` alanı kullanılır.

## Geliştirici

Cemil Dalar

GitHub: [cmldlr](https://github.com/cmldlr)
