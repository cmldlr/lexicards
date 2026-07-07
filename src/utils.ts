import { Word, WordList } from './types';

// Browser TTS pronunciation
export function speakWord(text: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9; // Slightly slower for clear pronunciation
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Speech synthesis failed', e);
    }
  }
}

// Cleans "syn: Moderately, relatively" into "Moderately, relatively" or returns unchanged
export function cleanSynonym(syn: string): string {
  if (!syn) return '';
  let cleaned = syn.trim();
  if (cleaned.toLowerCase().startsWith('syn:')) {
    cleaned = cleaned.substring(4).trim();
  }
  return cleaned;
}

// Parses a single CSV line with support for quoted strings containing commas
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  // Clean values (unquote and trim)
  return result.map(val => {
    let s = val.trim();
    if (s.startsWith('"') && s.endsWith('"')) {
      s = s.substring(1, s.length - 1);
    }
    return s.trim();
  });
}

// Parses full CSV contents and returns structured word lists and words
export function parseCSV(csvText: string): { lists: WordList[]; words: Word[] } {
  const lines = csvText.split(/\r?\n/);
  const lists: WordList[] = [];
  const words: Word[] = [];
  
  let currentListId = '';
  let currentListName = '';
  let wordCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const row = parseCSVLine(rawLine);
    if (row.length === 0 || !row[0]) continue;

    // Skip the absolute header row if present
    if (row[0].toLowerCase() === 'terms' && row[1]?.toLowerCase() === 'meanings') {
      continue;
    }

    // Check if it's a section/day header row
    // A header row typically has "Day X" or similar in the first column, and subsequent columns are completely empty or whitespace.
    const isHeaderRow = row.slice(1).every(cell => !cell || cell.trim() === '') || row[0].toLowerCase().startsWith('day ');

    if (isHeaderRow && !row[0].includes(' ') && row.slice(1).some(cell => cell.trim() !== '')) {
      // Edge case: if first column has no space and other columns have values, it's a word (e.g. "comparatively")
      // So let's fall back to word parsing below
    } else if (isHeaderRow) {
      const listName = row[0].trim();
      const listId = listName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      currentListId = listId;
      currentListName = listName;
      
      // Prevent duplicates
      if (!lists.some(l => l.id === listId)) {
        lists.push({
          id: listId,
          name: listName,
          isCustom: true
        });
      }
      continue;
    }

    // If it's a word row but we haven't seen a header, create a default list
    if (!currentListId) {
      currentListId = 'general';
      currentListName = 'Genel Kelimeler';
      if (!lists.some(l => l.id === currentListId)) {
        lists.push({
          id: currentListId,
          name: currentListName,
          isCustom: false
        });
      }
    }

    // Map columns:
    // row[0] -> Term (e.g. comparatively)
    // row[1] -> Meaning 1 (Synonym, e.g. syn: Moderately, relatively)
    // row[2] -> Meaning 2 (Collocation/phrase, e.g. comparatively few disasters)
    // row[3..] -> Turkish meanings/values (e.g. kısmen [zf.], nispeten [zf.])
    const term = row[0].trim();
    const synonyms = row[1] ? cleanSynonym(row[1]) : '';
    const phrase = row[2] ? row[2].trim() : '';
    
    // Turkish translations (filter out empty strings)
    const turkishMeanings: string[] = [];
    for (let colIdx = 3; colIdx < row.length; colIdx++) {
      if (row[colIdx] && row[colIdx].trim()) {
        turkishMeanings.push(row[colIdx].trim());
      }
    }

    words.push({
      id: `${currentListId}-${term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${wordCounter++}`,
      term,
      synonyms,
      phrase,
      turkishMeanings,
      listId: currentListId,
      learned: false
    });
  }

  return { lists, words };
}

// Highlight word types like [zf.], [f.], [i.], [s.]
export function getWordTypeColor(meaning: string): { text: string; cleanMeaning: string; colorClass: string } {
  const match = meaning.match(/\[([a-zğüşöcı\.]+)]/i);
  if (match) {
    const type = match[1].toLowerCase();
    let colorClass = 'bg-gray-100 text-gray-700 border-gray-200'; // Default
    let typeDisplay = type;

    if (type.startsWith('zf') || type === 'zarf' || type === 'adv') {
      colorClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50';
      typeDisplay = 'zarf';
    } else if (type.startsWith('f') || type === 'fiil' || type === 'v') {
      colorClass = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50';
      typeDisplay = 'fiil';
    } else if (type.startsWith('i') || type === 'isim' || type === 'n') {
      colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50';
      typeDisplay = 'isim';
    } else if (type.startsWith('s') || type === 'sıfat' || type === 'adj') {
      colorClass = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50';
      typeDisplay = 'sıfat';
    } else if (type.startsWith('edat') || type === 'prep') {
      colorClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50';
      typeDisplay = 'edat';
    }

    const cleanMeaning = meaning.replace(match[0], '').trim();
    return {
      text: typeDisplay,
      cleanMeaning,
      colorClass
    };
  }

  return {
    text: '',
    cleanMeaning: meaning,
    colorClass: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
  };
}

export const defaultCSVData = `Terms,Meanings,Meanings,Meanings,Meanings,Meanings,Meanings,Meanings
Day 19, ,,,,,,
comparatively,"syn: Moderately, relatively, somewhat",comparatively few disasters,kısmen [zf.],nispeten [zf.],,,
decline,"syn: Decrease, weaken",population declines,azalma [i.],düşüş [i.],azalmak [f.],zayıflamak [f.],
establish,"syn: Set up, found",establish a base,kurmak [f.],tesis etmek [f.],,,
flooding,"syn: Deluge, torrent",massive flooding,sel [i.],su baskını [i.],,,
indicate,"syn: Point out, suggest, show",indicate that,işaret etmek [f.],belirtmek [f.],göstermek [f.],,
boost,"syn: Increase, improve, enhance",boost renewable energy,yükseltmek [f.],artırmak [f.],geliştirmek [f.],,
conservation,"syn: Upkeep, preservation, maintenance, protection",conservation areas,koruma [i.],muhafaza [i.],,,
persistent,"syn: Constant, permanent, lasting",persistent winds,kalıcı [s.],devamlı [s.],,,
contamination,syn: Pollution,water contamination,kirlenme [i.],kirlilik [i.],,,
threat,"syn: Danger, risk, hazard, menace",threat to life,tehdit [i.],gözdağı [i.],,,
verify,"syn: Confirm, prove, validate",verify ozone depletion,doğrulamak [f.],kanıtlamak [f.],teyit etmek [f.],,
experiment,"syn: Trial, test",experiment results,deney [i.],,,,
fatal,"syn: Deadly, lethal",fatal contamination,ölümcül [s.],öldürücü [s.],,,
eventual,"syn: Ultimate, final, last",eventual version,nihai [s.],son [s.],,,
density,"syn: Thickness, mass",density of methane,yoğunluk [i.],öz kütle [i.],,,
endanger,"syn: Put in danger, imperil, jeopardize",endanger life,tehlikeye atmak [f.],,,,
decay,"syn: Decompose, rot, spoil",organic material decays,çürümek [f.],bozulmak [f.],çürük [s.],,
estimate,"syn: Approximate, guess",estimate that,tahmin etmek [f.],hesap etmek [f.],,,
lightning,syn: Flash of light in the sky,,şimşek [i.],yıldırım [i.],,,
inquiry,"syn: Analysis, survey, investigation",inquiry and observation,anket [i.],sorgulama [i.],tahkikat [i.],,
Day 20, ,,,,,,
pollute,syn: Contaminate,pollute the atmosphere,kirletmek [f.],,,,
stability,"syn: Constancy, steadiness",stability of the ecosystem,kararlılık [i.],istikrar [i.],,,
unstable,"syn: Irrational, ambiguous",unstable conditions,istikrarsız [s.],kararsız [s.],,,
mitigate,"syn: Alleviate, diminish",mitigate effects of climate change,hafifletmek [f.],azaltmak [f.],,,
visibility,"syn: Sight, vision",poor visibility,görüş mesafesi [i.],görünürlük [i.],,,
undeniable,"syn: Irrefutable, indisputable",undeniable effects,inkâr edilemez [s.],kesin [s.],,,
sensible,"syn: Reasonable, plausible, logical",sensible heat flux,akla uygun [s.],mantıklı [s.],,,
hazard,"syn: Danger, threat, risk, peril",pose hazards to,tehlike [i.],risk [i.],,,
urge,"syn: Advise, recommend, suggest, force",urge sb to do,tavsiye etmek [f.],zorlamak [f.],,,
earthquake,"syn: Tremor, shaking",earthquake occurs,deprem [i.],sarsıntı [i.],,,
regardless of,syn: Irrespective of,regardless of the method,-e bakılmaksızın [edat],,,,
lessen,"syn: Lower, reduce",lessen the need for,azaltmak [f.],hafifletmek [f.],,,
harmful,"syn: Damaging, dangerous, destructive, detrimental",harmful effects/plants,zararlı [s.],,,,
evolution,"syn: Development, growth, progress",human evolution,evrim [i.],gelişim [i.],,,
efficiency,"syn: Effectiveness, productivity",efficiency of solar panels,verimlilik [i.],etkililik [i.],,,
disaster,"syn: Catastrophe, calamity",environmental disaster,afet [i.],felaket [i.],,,
amplification,"syn: Intensification, strengthening, augmentation, extension",amplification of seismic waves,kuvvetlendirme [i.],yükseltme [i.],artış [i.],,
adverse,"syn: Unfavorable, unpleasant",adverse effect on,ters [s.],olumsuz [s.],,,
altitude,"syn: Height, elevation",at high altitude,irtifa [i.],rakım [i.],yükseklik [i.],,
crash,"syn: Collision, accident",crash was caused by,çarpışma [i.],kaza [i.],,,
Day 21, ,,,,,,
refuse,"syn: Reject, rebuff, turn down",refuse to do,geri çevirmek [f.],reddetmek [f.],,,
precious,"syn: Valuable, costly, expensive",precious ecosystems,kıymetli [s.],değerli [s.],,,
insecticide,syn: Pesticide,insecticide gets into plants,böcek ilacı [i.],,,,
huge,"syn: Enormous, vast, gigantic, massive",huge amounts,muazzam [s.],devasa [s.],çok büyük [s.],,
disappearance,"syn: Vanishing, fading, loss",disappearance of species,yok olma [i.],gözden kaybolma [i.],,,
be composed of,"syn: Consist of, be made up of, comprise",be composed of groups,-den oluşmak [f.],,,,
allege,"syn: Assert, claim, maintain",allege that,iddia etmek [f.],ileri sürmek [f.],,,
exceed,"syn: Go beyond, surpass",exceed 100,aşmak [f.],ileri gitmek [f.],,,
sustainability,syn: Maintaining an ecological balance,sustainability policies,sürdürülebilirlik [i.],doğal denge [i.],,,
adjust,"syn: Modify, regulate, adapt",adjust to conditions,ayarlamak [f.],uyum sağlamak [f.],,,
approval,"syn: Acceptance, agreement",approval of the committee,tasvip [i.],onay [i.],,,
space shuttle,syn: Spacecraft,space shuttle missions,uzay mekiği [i.],,,,
sanitation,"syn: Hygiene, cleanliness",poor sanitation,sıhhi temizlik [i.],,,,
friction,"syn: Rubbing, resistance",atmospheric friction,sürtünme [i.],,,,
equilibrium,"syn: Balance, stability",reach equilibrium,denge [i.],kararlılık [i.],,,
fertilize,"syn: Compost, manure",fertilize the soil,gübrelemek [f.],verimli kılmak [f.],,,
arid,"syn: Dry, waterless, infertile, barren",arid conditions,verimsiz [s.],çorak [s.],kuru [s.],,
dependence,"syn: Reliance, addiction, need",dependence on,gereksinim [i.],bel bağlama [i.],,,
strike,"syn: Beat, hit",strike Earth,vurmak [f.],çarpmak [f.],etkilemek [f.],darbe [i.],çarpma [i.]
vapour,"syn: Steam, haze, fume",water vapour,buhar [i.],buğu [i.],,,
Day 22, ,,,,,,
harvest,"syn: Collect, catch",harvest coral,hasat etmek [f.],toplamak [f.],yakalamak [f.],,
identical,"syn: Same, indistinguishable",genetically identical animals,aynı [s.],ayırt edilemez [s.],özdeş [s.],,
retain,"syn: Keep, save, maintain, preserve",retain images,muhafaza etmek [f.],tutmak [f.],korumak [f.],,
unmanned,syn: Not having or needing a crew or staff,unmanned missions,insansız çalışan [s.],mürettebatsız [s.],,,
invisible,"syn: Unseen, hidden, concealed",invisible dark matter,görünmez [s.],gizli [s.],,,
intent,"syn: Aim, plan, mean",intend to do,niyet etmek [f.],hedeflemek [f.],planlamak [f.],,
forecast,"syn: Predict, foresee, estimate, guess",forecast temperatures,tahmin etmek [f.],öngörmek [f.],,,
massive,"syn: Huge, immense, enormous, vast",massive pollution,büyük [s.],muazzam [s.],devasa [s.],,
immigration,syn: Arrival of settlers in a new country,,göç [i.],,,,
intense,"syn: Extreme, intensified",intense storms,yoğun [s.],şiddetli [s.],,,
copper,syn: Reddish-brown metal,,bakır [i.],,,,
assumption,"syn: Supposition, postulation, hypothesis",assumption that,sanı [i.],farzetme [i.],varsayım [i.],,
account for,"syn: Constitute, comprise, make up",account for 90%,oluşturmak [f.],tekabül etmek [f.],,,
deforestation,syn: The action of clearing a wide area of trees,deforestation contributes to,ormansızlaşma [i.],,,,
diversify,"syn: Branch out, vary, expand",life diversified,çeşitlenmek [f.],çeşitlendirmek [f.],farklılaştırmak [f.],,
strengthen,"syn: Reinforce, fortify, consolidate",monsoons strengthen,sağlamlaştırmak [f.],güçlendirmek [f.],,,
doubtful,"syn: Unsure, uncertain",doubtful whether,şüpheli [s.],kuşkulu [s.],,,
erroneous,"syn: Mistaken, flawed, wrong",erroneous results,yanlış [s.],hatalı [s.],,,
advocate,"syn: Support, counsel, back up",advocated for weight loss,savunmak [f.],destek olmak [f.],,,
substantially,"syn: Considerably, significantly",contribute substantially to,önemli ölçüde [zf.],epeyce [zf.],,,
Day 23, ,,,,,,
magnificent,"syn: Wonderful, splendid, glorious",magnificent eagle,görkemli [s.],muhteşem [s.],gösterişli [s.],,
overlook,"syn: Ignore, neglect",overlooked in fossil record,görmezden gelmek [f.],,,,
regarding,"syn: Concerning, about, as to",regarding nutrition,ile ilgili olarak [edat],hakkında [edat],,,
evaluate,"syn: Assess, appraise",evaluate initiatives,değerlendirmek [f.],kıymetlendirmek [f.],,,
trigger,"syn: Activate, cause, generate",trigger earthquakes,tetiklemek [f.],sebep olmak [f.],,,
purify,"syn: Cleanse, decontaminate",purify water,arıtmak [f.],saflaştırmak [f.],,,
accomplish,"syn: Achieve, complete, carry out",accomplish research,tamamlamak [f.],bitirmek [f.],,,
crack,"syn: Split, fissure, break",cracks in the crust,çatlak [i.],yarık [i.],,,
avalanche,syn: Downhill fall of snow,avalanche occurs,çığ [i.],,,,
demolish,"syn: Destroy, ruin, damage",demolish ecology,yıkmak [f.],tahrip etmek [f.],,,
disputable,"syn: Arguable, debatable",disputable decision,tartışmaya açık [s.],,,,
vertical,syn: Upright,vertical stabilizer,dik [s.],dikey [s.],,,
end up with,"syn: Result in, wind up with",end up with failure,ile sonuçlanmak [f.],,,,
tackle,"syn: Deal with, cope with, handle, overcome",tackle climate change,üstesinden gelmek [f.],uğraşmak [f.],mücadele etmek [f.],,
volume,"syn: Capacity, cubic measure",smaller volume,hacim [i.],,,,
degrade,"syn: Break down, take apart",degrade biologically,ayrıştırmak [f.],parçalara ayırmak [f.],,,
excessive,"syn: Extreme, too much",excessive exposure to,aşırı [s.],çok fazla [s.],,,
exhibit,"syn: Show, display, demonstrate",exhibit sensitivity to,göstermek [f.],sergilemek [f.],,,
habitable,"syn: Liveable, fit to live",habitable planets,yaşanabilir [s.],,,,
imply,"syn: Suggest, indicate, hint",imply that,işaret etmek [f.],ima etmek [f.],,,
Day 24, ,,,,,,
reveal,"syn: Unveil, divulge, disclose",reveal the process,ortaya koymak [f.],açığa kavuşturmak [f.],,,
delicate,"syn: Weak, fragile",delicate shipments,hassas [s.],nazik [s.],zarif [s.],,
dense,syn: Thick,dense fog,yoğun [s.],,,,
suggest,"syn: Indicate, propose, put forward",suggest that,işaret etmek [f.],belirtmek [f.],,,
aversion,"syn: Dislike, hatred",food aversions,hoşlanmama [i.],sevmeme [i.],kaçınma [i.],,
consist of,"syn: Be made up of, be composed of",consist of two spacecraft,-den oluşmak [f.],,,,
deplete,"syn: Expend, use up, exhaust",deplete habitats,tükenmek [f.],bitmek [f.],boşaltmak [f.],,
erratic,"syn: Inconsistent, irregular",erratic sleep and diet,düzensiz [s.],dengesiz [s.],,,
affluent,"syn: Rich, wealthy, prosperous",affluent societies,zengin [s.],gelişmiş [s.],,,
durability,"syn: Toughness, sturdiness",safety and durability,dayanıklılık [i.],,,,
germination,syn: Start growing from seed,after germination,çimlenme [i.],,,,
accelerate,"syn: Expedite, speed up",accelerate erosion,hızlan(dır)mak [f.],,,,
commence,"syn: Start, begin, embark on",commence field research,başla(t)mak [f.],,,,
glacier,"syn: A large mass of ice, iceberg",glaciers melt,buzul [i.],,,,
impair,"syn: Damage, harm",impair ability to,zarar vermek [f.],bozmak [f.],,,
constitute,"syn: Comprise, make up",constitute 7 percent,oluşturmak [f.],teşkil etmek [f.],,,
execute,"syn: Carry out, perform, implement",execute procedures,icra etmek [f.],uygulamak [f.],,,
solid,"syn: Hard, rigid","solid, liquid, gas",katı [s.],,,,
instantaneous,"syn: Prompt, rapid, sudden, immediate",instantaneous effects,ani [s.],hemen [zf.],,,
sustain,"syn: Maintain, continue, keep up",sustain profitability,sürdürmek [f.],ayakta tutmak [f.],,,
Day 25, ,,,,,,
refinement,"syn: Purification, cleansing",three-step refinement,arıtma [i.],geliştirme [i.],,,
enlighten,"syn: Explain, clarify, inform, notify",enlighten sb on/about,aydınlatmak [f.],öğretmek [f.],bilgi vermek [f.],,
fulfill,"syn: Carry out, accomplish, implement, execute",fulfill pledges,uygulamak [f.],gerçekleştirmek [f.],yerine getirmek [f.],,
mean,"syn: Signify, denote",mean “...”,anlamına gelmek [f.],,,,
prejudice,"syn: Bias, prejudgment",overcome prejudice,ön yargı [i.],peşin hüküm [i.],,,
rigid,"syn: Unbending, inflexible, stiff",rigid material,sert [s.],eğilmez [s.],,,
spread,"syn: Disperse, distribute",spread viruses,dağılmak [f.],yayılmak [f.],,,
numerous,"syn: Many, plentiful, abundant",numerous compounds,sayısız [s.],pek çok [s.],,,
validity,"syn: Soundness, reasonableness, rationality",validity and reliability,geçerlilik [i.],,,,
innovation,"syn: Novelty, invention, revolution",innovation in production,yenilik [i.],buluş [i.],,,
gravity,syn: The force that attracts a body towards the centre of the earth,force of gravity,yerçekimi [i.],,,,
exploitation,"syn: Utilization, taking advantage, misuse",agricultural exploitation,sömürü [i.],kullanma [i.],faydalanma [i.],,
specimen,"syn: Sample, example",test specimens,örnek [i.],numune [i.],,,
ensure,"syn: Make sure, make certain, guarantee",ensure coordination,garantiye almak [f.],emin olmak [f.],sağlamak [f.],,
obstacle,"syn: Difficulty, hindrance, impediment",obstacle to life,mani [i.],engel [i.],,,
lineage,"syn: Ancestry, family",human lineage,soy [i.],köken [i.],,,
humidity,"syn: Moisture, dampness",high humidity,nem [i.],rutubet [i.],,,
excavation,"syn: Digging, archaeological site",excavations in Russia,kazı [i.],,,,
phase,syn: Stage,phase of carbon,safha [i.],aşama [i.],,,
initiate,"syn: Start, begin, commence",initiate programs,başlatmak [f.],girişmek [f.],,,
Day 26, ,,,,,,
giant,"syn: Immense, vast, huge, enormous",giant storm,muazzam [s.],devasa [s.],,,
external,"syn: Outside, exterior",external influence,dış [s.],harici [s.],,,
disassemble,syn: Take apart,disassemble the sarcophagus,sökmek [f.],demonte etmek [f.],,,
continent,"syn: Landmass, mainland",ancient continent,kıta [i.],anakara [i.],,,
dramatically,"syn: Radically, considerably, spectacularly, significantly",drop dramatically,çarpıcı şekilde [zf.],önemli ölçüde [zf.],,,
inflammable,"syn: Flammable, combustible, ignitable, burnable",inflammable material,yanıcı [s.],parlayıcı [s.],alev alan [s.],,
portable,"syn: Movable, transportable, transferable",portable electronics,taşınabilir [s.],seyyar [s.],,,
ignorance,"syn: Incomprehension, lack of knowledge, illiteracy",ignorance of radioactivity,cahillik [i.],cehalet [i.],bilgisizlik [i.],,
withstand,"syn: Endure, resist, bear, tolerate",withstand quakes,direnmek [f.],dayanmak [f.],mukavemet etmek [f.],,
useless,"syn: Pointless, futile",useless against threats,yararsız [s.],faydasız [s.],boşuna [zf.],,
mutual,"syn: Joint, shared",mutual gravity,müşterek [s.],ortak [s.],,,
deal with,"syn: Cope with, manage, handle",deal with needs,başa çıkmak [f.],üstesinden gelmek [f.],,,
confirm,"syn: Verify, prove",confirmed by results,doğrulamak [f.],teyit etmek [f.],,,
artificial,"syn: Synthetic, fake, imitation",artificial silk,yapay [s.],suni [s.],,,
accumulate,"syn: Amass, collect, gather, pile up",accumulate in a reservoir,toplamak [f.],birik(tir)mek [f.],,,
deprive of,"syn: Dispossess, divest",deprive sb/sth of,-den mahrum etmek [f.],yoksun bırakmak [f.],,,
alloy,"syn: Mixture, amalgam, blend",alloy developed by,alaşım [i.],,,,
attribute to,"syn: Ascribe, assign",attribute meaning to,atfetmek [f.],dayandırmak [f.],bağlamak [f.],,
replenish,"syn: Refill, recharge",replenish nutrients,tazelemek [f.],doldurmak [f.],yenilenmek [f.],,
pole,syn: Either of the two points on the Earth,North Pole,kutup [i.],,,,`;
