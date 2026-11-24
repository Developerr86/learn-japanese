# Learn Japanese

Three self-contained study pages for a beginner who knows hiragana and katakana and wants enough building blocks to follow Japanese media and put together simple sentences.

| Page | What's in it |
|---|---|
| `kana-kanji.html` | Adaptive hiragana/katakana quizzes, a tappable kana chart, word-reading practice, and 250 beginner kanji with flashcards, quizzes and a browser |
| `words.html` | The 1,000 most useful words (ranked), each with reading, romaji, meaning and two example sentences; spaced-repetition flashcards, a context drill, a searchable list and a progress view |
| `phrases.html` | 234 everyday phrases with word-by-word breakdowns and usage notes, 39 sentence patterns, and spaced-repetition practice |

Open any of the built `.html` files in a browser to use it. Progress saves in the browser (and to your claude.ai account when the pages run as published Artifacts).

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
src/            page templates plus shared core.css / core.js (storage, audio, spaced repetition)
data/           JSON content: kanji, phrases, patterns, words_A–E (raw word lists by type), words.json (merged 1000)
build.py        inlines core CSS/JS and data into the three pages at the repo root
merge_words.py  dedupes and ranks words_A–E into data/words.json
suite.json      URLs used for the links between pages
```

Rebuild after editing anything in `src/` or `data/`:

```bash
python3 merge_words.py   # only if you changed words_A–E
python3 build.py
```

To preview locally: `python3 -m http.server 8765`, then open http://localhost:8765/words.html.

## Caveats

The vocabulary, example sentences, kanji readings and stroke counts were AI-generated and spot-checked, not verified against a dictionary. Corrections are welcome.
