# Learn Japanese

Three self-contained study pages for a beginner who knows hiragana and katakana and wants enough building blocks to follow Japanese media and put together simple sentences.

| Page | What's in it |
|---|---|
| `kana-kanji.html` | Adaptive hiragana/katakana quizzes, a tappable kana chart, word-reading practice, and 250 beginner kanji with flashcards, quizzes and a browser |
| `words.html` | The 1,000 most useful words (ranked), each with reading, romaji, meaning and two example sentences; spaced-repetition flashcards, a context drill, a searchable list and a progress view |
| `phrases.html` | 234 everyday phrases with word-by-word breakdowns and usage notes, 39 sentence patterns, and spaced-repetition practice |

**Live site:** https://developerr86.github.io/learn-japanese/ (built from `docs/`).

There are two builds of the same pages:

- `docs/` is the GitHub Pages site. Progress is saved in your browser's local storage and shared across the three pages. Each page has *Download backup* / *Restore from file* at the bottom for moving progress between devices or recovering after clearing site data. No audio.
- The `.html` files at the repo root are the claude.ai Artifact versions, which sync progress to your claude.ai account and can read words aloud.

## Suggested daily routine (~25–30 min)

| What | Amount |
|---|---|
| Kana quiz (until you rarely miss, then 2–3× a week) | 1 round |
| Words | 10 new + reviews |
| Phrases | 5 new + reviews (must-know first) |
| Sentence patterns | 1 new, Step 1 → 3 |
| Context drill | a few sentences, optional |

On a missed day, do reviews first and skip new cards until the review count is back to normal.

## Project layout

```
docs/           built GitHub Pages site
src/            page templates (including the site's index.html) plus shared core.css / core.js (storage, audio, spaced repetition)
data/           JSON content: kanji, phrases, patterns, words_A–E (raw word lists by type), words.json (merged 1000)
build.py        inlines core CSS/JS and data into the pages (repo root, or docs/ with --pages)
merge_words.py  dedupes and ranks words_A–E into data/words.json
suite.json      URLs used for the links between pages
```

Rebuild after editing anything in `src/` or `data/`:

```bash
python3 merge_words.py   # only if you changed words_A–E
python3 build.py           # claude.ai versions at the repo root
python3 build.py --pages   # GitHub Pages site in docs/
```

Commit and push `docs/` and the site updates within a minute or two.

To preview locally: `python3 -m http.server 8765`, then open http://localhost:8765/docs/.

## Caveats

The vocabulary, example sentences, kanji readings and stroke counts were AI-generated and spot-checked, not verified against a dictionary. Corrections are welcome.
