# LexiCards

LexiCards is a mobile-friendly vocabulary study app for learning English words with Turkish meanings, synonyms, phrases, flashcards, and quiz modes.

## Features

- Collection-based vocabulary management
- CSV / Excel-style word list import
- Flashcard study mode with learned and not learned tracking
- Quiz study mode with multiple question types:
  - Synonym to word
  - Word to synonym
  - Word to Turkish meaning
  - Turkish meaning to word
- Randomized, unique answer choices generated from the selected study words
- Quiz progress tracking for correct, wrong, and unanswered questions
- Browser text-to-speech pronunciation with an on/off toggle
- Local progress storage with `localStorage`
- Responsive layout optimized for desktop and mobile

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app runs on:

```text
http://localhost:3000
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Type Check

```bash
npm run lint
```

## CSV Format

LexiCards can import vocabulary lists from CSV-style data. A list title such as `Day 1` starts a new collection. Word rows use this structure:

```csv
Terms,Meanings,Meanings,Meanings,Meanings
Day 1,,,,
necessary,"syn: required, essential",necessary step,gerekli [s.],zaruri [s.]
occur,"syn: happen, take place",errors occur,olmak [f.],meydana gelmek [f.]
```

Column usage:

- `Terms`: English word
- Second column: synonyms
- Third column: phrase or collocation
- Remaining columns: Turkish meanings

## Project Structure

```text
src/
  components/      React components
  App.tsx          Main application flow
  types.ts         Shared TypeScript types
  utils.ts         CSV parsing and helper utilities
```

## Author

Cemil Dalar

GitHub: [cmldlr](https://github.com/cmldlr)
