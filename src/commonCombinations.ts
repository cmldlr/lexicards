import { CombinationCollection, CommonCombination } from './types';
import { parseCSVLine } from './utils';

const slugify = (value: string) => value
  .toLocaleLowerCase('tr-TR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const getFamily = (section: string): CommonCombination['family'] => {
  const normalized = section.toUpperCase();
  if (normalized.includes('PREP + NOUN')) return 'prep-noun';
  if (normalized.includes('VERB')) return 'verb';
  if (normalized.includes('ADJ')) return 'adjective';
  if (normalized.includes('NOUN + PREP')) return 'noun';
  return 'other';
};

const extractAnswer = (pattern: string): string => {
  const quoted = pattern.match(/['‘’]([^'‘’]+)['‘’]/);
  if (quoted?.[1]) return quoted[1].trim().toLowerCase();

  const plusParts = pattern.split('+').map(part => part.trim());
  const likelyPrep = plusParts.find(part => !/^(verb|adj|noun)$/i.test(part));
  return (likelyPrep || '').replace(/['‘’]/g, '').trim().toLowerCase();
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createCloze = (expression: string, expectedAnswer: string) => {
  if (!expectedAnswer) return { prompt: expression, answers: [] as string[] };

  const escapedAnswer = escapeRegExp(expectedAnswer);
  const alternativePattern = new RegExp(`\\b(${escapedAnswer})\\s*\\/\\s*([a-z]+(?:\\s+[a-z]+)?)\\b`, 'i');
  const alternativeMatch = expression.match(alternativePattern);
  if (alternativeMatch) {
    return {
      prompt: expression.replace(alternativePattern, '_____'),
      answers: [alternativeMatch[1], alternativeMatch[2]].map(value => value.trim().toLowerCase()),
    };
  }

  const directPattern = new RegExp(`\\b${escapedAnswer}\\b`, 'i');
  if (directPattern.test(expression)) {
    return {
      prompt: expression.replace(directPattern, '_____'),
      answers: [expectedAnswer],
    };
  }

  return { prompt: expression, answers: [expectedAnswer] };
};

export function parseCommonCombinations(
  text: string,
  fileName: string,
  options?: { collectionId?: string; importedAt?: string },
): { collection: CombinationCollection; items: CommonCombination[] } {
  const rows = text.replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(line => {
      const trimmedLine = line.trim();
      return trimmedLine.includes('\t')
        ? trimmedLine.split('\t').map(cell => cell.trim())
        : parseCSVLine(trimmedLine);
    })
    .filter(row => row.some(cell => cell.trim()));

  const dayName = rows.find(row => /^day\s+\d+/i.test(row[0]?.trim() || ''))?.[0]?.trim();
  const baseName = fileName.replace(/\.(csv|txt|xlsx|xls)$/i, '').replace(/[_-]+/g, ' ').trim();
  const collectionName = dayName || baseName || 'Common Combinations';
  const importKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const collection: CombinationCollection = {
    id: options?.collectionId || `combination-${slugify(collectionName)}-${importKey}`,
    name: collectionName,
    fileName,
    importedAt: options?.importedAt || new Date().toISOString(),
  };

  let section = 'COMMON COMBINATIONS';
  let pattern = '';
  const items: CommonCombination[] = [];

  rows.forEach((row, index) => {
    const first = row[0]?.trim() || '';
    const second = row[1]?.trim() || '';
    if (!first) return;

    if (!second) {
      if (/^day\s+\d+/i.test(first)) return;
      if (/combinations?$/i.test(first)) {
        section = first;
        pattern = '';
        return;
      }
      if (first.includes('+')) {
        pattern = first;
      }
      return;
    }

    const answer = extractAnswer(pattern);
    const cloze = createCloze(first, answer);
    if (!answer || cloze.prompt === first) return;

    items.push({
      id: `${collection.id}-${slugify(first)}-${index}`,
      collectionId: collection.id,
      family: getFamily(section),
      section,
      pattern,
      expression: first,
      meaning: second,
      answer,
      acceptedAnswers: [...new Set(cloze.answers)],
      clozePrompt: cloze.prompt,
      status: 'unmarked',
    });
  });

  return { collection, items };
}
