# LexiCards

[![Türkçe README](https://img.shields.io/badge/TR-Türkçe_README-E30A17?style=for-the-badge&logoColor=white)](./README_TR.md)

LexiCards is a mobile-first React application for studying English vocabulary,
phrasal verbs, and common combinations with Turkish meanings.

## Features

- Bundled Day 1–55 vocabulary collections
- Bundled Day 56 Common Combinations collection
- 55 vocabulary collections containing 1,182 words
- 510 Common Combination records
- Vocabulary flashcard and quiz study modes
- Common Combinations card and fill-in-the-blank modes
- Turkish meanings, synonyms, and example phrases
- Learned, struggled, correct, incorrect, and unanswered tracking
- Sequential and shuffled study orders
- Collection, status, and combination-family filters
- Browser-based English pronunciation
- Mobile study sessions that fit the viewport without page scrolling
- Study history and success statistics
- Device-local progress storage with `localStorage`
- Light and dark theme support

Public CSV/Excel uploads are disabled. Default learning data is bundled from
the `words/` directory during the production build.

## Technology Stack

<p align="left">
  <img alt="React 19" src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img alt="Motion" src="https://img.shields.io/badge/Motion-FFF312?style=for-the-badge&logo=framer&logoColor=black" />
  <img alt="Lucide" src="https://img.shields.io/badge/Lucide-F56565?style=for-the-badge&logo=lucide&logoColor=white" />
  <img alt="Netlify" src="https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white" />
</p>

## Installation

Requirements:

- Node.js 18 or later
- npm

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The application runs at:

```text
http://localhost:3000
```

## Validation and Build

Run the TypeScript check:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Bundled Learning Data

The learning data is stored under `words/`:

```text
words/
  modadil_day1_18.csv
  modadil_day19_26.csv
  modadil_day27_40.csv
  modadil_day41_54.csv
  modadil_day55_common_phrasal_verbs.csv
  modadil_day56_common_combinations.csv
```

Day 1–55 files are converted into vocabulary collections. Day 56 is converted
into the Common Combinations study collection. The Day 57 source file is not
currently included in the production data migration.

Vocabulary CSV structure:

```csv
Terms,Meanings,Meanings,Meanings,Meanings
Day 1,,,,
necessary,"syn: required, essential",necessary step,gerekli [s.],zaruri [s.]
```

## LocalStorage and Data Privacy

The following user data is stored only in the visitor's browser:

- Learned and struggled statuses
- Quiz and fill-in-the-blank results
- Study history
- User-edited words and custom collections
- Pronunciation and haptic preferences
- The currently active study session

This data is never sent to GitHub or Netlify. Localhost progress remains on the
computer, while production progress remains in the browser and device that
opened the Netlify website.

`localStorage` is tied to the website origin. Keep the same Netlify domain and
do not clear browser site data if existing mobile progress must be preserved.

## Versioned Data Migration

Before React starts, the application runs the migration defined in
[`src/seedData.ts`](./src/seedData.ts).

The migration:

1. Reads existing collections and words from `localStorage`.
2. Preserves existing progress, word edits, and custom collections.
3. Adds missing Day 1–55 collections and vocabulary records.
4. Creates the 510-record Day 56 collection when it is missing or empty.
5. Preserves study history, preferences, and active sessions.
6. Uses version keys to prevent unnecessary repeated migrations.

When bundled CSV content changes, increment the relevant version in
`src/seedData.ts`:

```ts
const VOCABULARY_SEED_VERSION = 'modadil-day-1-55-v1';
const COMBINATION_SEED_VERSION = 'modadil-day-56-v3';
```

## GitHub and Netlify Deployment

If Netlify is connected to this repository and branch, pushing to GitHub
triggers an automatic deployment.

Validate the project before committing:

```bash
npm run lint
npm run build
git status
```

Stage and commit the project, including newly added source and data files:

```bash
git add README.md readme_tr.md src words package.json package-lock.json netlify.toml
git commit -m "Add bundled vocabulary and common combinations migration"
git push
```

After deployment, refreshing the same Netlify URL loads the new application.
The migration adds missing bundled data without deleting existing progress on
the phone.

## Project Structure

```text
src/
  components/                  UI and study components
  App.tsx                      Main application and navigation flow
  main.tsx                     Application entry point
  seedData.ts                  Versioned bundled-data migration
  commonCombinations.ts        Day 56 parser
  types.ts                     Shared TypeScript types
  utils.ts                     CSV parsing and helper functions
words/                         Bundled vocabulary and combination data
netlify.toml                   Netlify build and SPA routing configuration
```

## Important Notes

- The `words/` directory must be included in the commit.
- The `dist/` directory does not need to be committed; Netlify creates it.
- Browser `localStorage` contents must never be added to the repository.
- Changing the Netlify domain creates a separate `localStorage` origin.

## Author

Cemil Dalar

GitHub: [cmldlr](https://github.com/cmldlr)
