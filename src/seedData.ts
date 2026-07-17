import type { CombinationCollection, CommonCombination, Word, WordList } from './types';
import { parseCommonCombinations } from './commonCombinations';
import { parseCSV } from './utils';
import day1To18CSV from '../words/modadil_day1_18.csv?raw';
import day19To26CSV from '../words/modadil_day19_26.csv?raw';
import day27To40CSV from '../words/modadil_day27_40.csv?raw';
import day41To54CSV from '../words/modadil_day41_54.csv?raw';
import day55CSV from '../words/modadil_day55_common_phrasal_verbs.csv?raw';
import day56CSV from '../words/modadil_day56_common_combinations.csv?raw';

const VOCAB_LISTS_KEY = 'vocab_lists';
const VOCAB_WORDS_KEY = 'vocab_words';
const COMBINATION_COLLECTIONS_KEY = 'lexicards_combination_collections';
const COMBINATION_ITEMS_KEY = 'lexicards_common_combinations';
const VOCABULARY_SEED_VERSION_KEY = 'lexicards_vocabulary_seed_version';
const COMBINATION_SEED_VERSION_KEY = 'lexicards_combination_seed_version';

// Bump these values only when bundled data changes. Existing user data will then
// be merged with the new bundle once, without resetting progress or custom lists.
const VOCABULARY_SEED_VERSION = 'modadil-day-1-55-v1';
const COMBINATION_SEED_VERSION = 'modadil-day-56-v3';
const DAY_56_COLLECTION_ID = 'bundled-common-combinations-day-56';
const BUNDLED_IMPORT_DATE = '2026-07-17T00:00:00.000Z';

const bundledVocabularyCSV = [
  day1To18CSV,
  day19To26CSV,
  day27To40CSV,
  day41To54CSV,
  day55CSV,
].join('\n');

const normalize = (value: string) => value.trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
const wordKey = (word: Pick<Word, 'listId' | 'term'>) => `${word.listId}::${normalize(word.term)}`;
const combinationKey = (item: Pick<CommonCombination, 'expression' | 'pattern' | 'section' | 'meaning'>) => (
  [item.expression, item.pattern, item.section, item.meaning].map(normalize).join('::')
);

const readStoredArray = <T,>(key: string): T[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getBundledVocabularySnapshot = (): { lists: WordList[]; words: Word[] } => (
  parseCSV(bundledVocabularyCSV)
);

const migrateVocabulary = () => {
  const hasStoredVocabulary = localStorage.getItem(VOCAB_LISTS_KEY) !== null
    && localStorage.getItem(VOCAB_WORDS_KEY) !== null;
  if (
    hasStoredVocabulary
    && localStorage.getItem(VOCABULARY_SEED_VERSION_KEY) === VOCABULARY_SEED_VERSION
  ) return;

  const existingLists = readStoredArray<WordList>(VOCAB_LISTS_KEY);
  const existingWords = readStoredArray<Word>(VOCAB_WORDS_KEY);
  const bundled = getBundledVocabularySnapshot();

  const mergedLists = [...existingLists];
  const existingListIds = new Set(existingLists.map(list => list.id));
  bundled.lists.forEach(list => {
    if (!existingListIds.has(list.id)) {
      mergedLists.push({ ...list, isCustom: false });
      existingListIds.add(list.id);
    }
  });

  const mergedWords = [...existingWords];
  const existingWordKeys = new Set(existingWords.map(wordKey));
  bundled.words.forEach(word => {
    const key = wordKey(word);
    if (!existingWordKeys.has(key)) {
      mergedWords.push(word);
      existingWordKeys.add(key);
    }
  });

  localStorage.setItem(VOCAB_LISTS_KEY, JSON.stringify(mergedLists));
  localStorage.setItem(VOCAB_WORDS_KEY, JSON.stringify(mergedWords));
  localStorage.setItem(VOCABULARY_SEED_VERSION_KEY, VOCABULARY_SEED_VERSION);
};

const isDay56Collection = (collection: CombinationCollection) => (
  collection.id === DAY_56_COLLECTION_ID
  || normalize(collection.name) === 'day 56'
  || normalize(collection.fileName).includes('day56_common_combinations')
);

const migrateCommonCombinations = () => {
  const existingCollections = readStoredArray<CombinationCollection>(COMBINATION_COLLECTIONS_KEY);
  const existingItems = readStoredArray<CommonCombination>(COMBINATION_ITEMS_KEY);
  const storedDay56Collection = existingCollections.find(isDay56Collection);
  const hasUsableDay56Data = Boolean(
    storedDay56Collection
    && existingItems.some(item => item.collectionId === storedDay56Collection.id),
  );
  if (
    hasUsableDay56Data
    && localStorage.getItem(COMBINATION_SEED_VERSION_KEY) === COMBINATION_SEED_VERSION
  ) return;

  const bundled = parseCommonCombinations(day56CSV, 'modadil_day56_common_combinations.csv', {
    collectionId: DAY_56_COLLECTION_ID,
    importedAt: BUNDLED_IMPORT_DATE,
  });

  const matchingCollection = existingCollections.find(isDay56Collection);
  const targetCollection = matchingCollection || bundled.collection;
  const mergedCollections = matchingCollection
    ? existingCollections
    : [...existingCollections, targetCollection];

  const mergedItems = [...existingItems];
  const existingItemKeys = new Set(existingItems
    .filter(item => item.collectionId === targetCollection.id)
    .map(combinationKey));
  bundled.items.forEach(item => {
    const key = combinationKey(item);
    if (!existingItemKeys.has(key)) {
      mergedItems.push({ ...item, collectionId: targetCollection.id });
      existingItemKeys.add(key);
    }
  });

  localStorage.setItem(COMBINATION_COLLECTIONS_KEY, JSON.stringify(mergedCollections));
  localStorage.setItem(COMBINATION_ITEMS_KEY, JSON.stringify(mergedItems));
  localStorage.setItem(COMBINATION_SEED_VERSION_KEY, COMBINATION_SEED_VERSION);
};

export const ensureBundledCommonCombinations = (): {
  collections: CombinationCollection[];
  items: CommonCombination[];
} => {
  migrateCommonCombinations();
  return {
    collections: readStoredArray<CombinationCollection>(COMBINATION_COLLECTIONS_KEY),
    items: readStoredArray<CommonCombination>(COMBINATION_ITEMS_KEY),
  };
};

export const bootstrapBundledData = () => {
  try {
    migrateVocabulary();
  } catch (error) {
    console.error('Bundled vocabulary migration failed', error);
  }

  try {
    ensureBundledCommonCombinations();
  } catch (error) {
    console.error('Bundled common combinations migration failed', error);
  }
};
