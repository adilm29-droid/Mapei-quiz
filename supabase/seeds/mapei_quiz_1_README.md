# Mapei Ceramic Line — Product Knowledge Quiz

30 multiple-choice questions for **sales / showroom staff**, built from the official Mapei TDS data in `MAPEI_PRODUCT_KNOWLEDGE.xlsx`.

## Files

| File | Purpose |
|---|---|
| `mapei_quiz.json` | The full quiz — 30 MCQs with answers, explanations, and source sheet refs |
| `README.md` | This file |

## Difficulty split

| Tier | Count | Points each | Notes |
|---|---|---|---|
| Very Easy | 10 | 1 | Identity-level: what is it, what colour, what packaging |
| Easy | 11 | 2 | Single-spec lookup: pot life, classification meaning, adhesion strength |
| Practical | 5 | 3 | Customer scenarios: "client wants X — what do you sell them?" |
| Medium | 4 | 4 | Trick distinctions: upgrade paths, water-ratio gotchas, longest/shortest values |
| **Total** | **30** | | **Max score: 57** |

Suggested pass mark: 70 % (≥ 40 / 57).

## Distractor design

Every wrong option is a **real value pulled from another Mapei product in the same data column** of the source workbook — so wrong answers are plausible, not obvious. Example: a question asking Granirapid's pot life uses 50 min (Ultralite S2 Quick), ~2 h (Keracolor FF), and >8 h (standard C2 adhesives) as the three distractors. This forces actual product knowledge rather than common-sense elimination.

## Products covered (20)

Granirapid · Ultralite S2 · Ultralite S2 Quick · Keraflex Maxi S1 Zero · Adesilex P7 · Ultralite S1 · Kerabond T · Kerabond Plus · Mapeset · Adesilex P9 · Keraflex · Adesilex P10 · Keralastic · Keralastic T · Keracolor FF · Kerapoxy · Kerapoxy Adhesive · Mapesil AC · Mapesil LM · Mapesil Z Plus

## JSON schema (per question)

```json
{
  "id": 1,
  "difficulty": "very_easy | easy | practical | medium",
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "correct_answer": "...",
  "explanation": "Why it's right + why the others are wrong",
  "source_sheet": "Master / Distinctions / Timing / etc."
}
```

## Running it as a quiz

The JSON is plug-and-play for any quiz app. To shuffle option order at runtime (recommended — option positions are intentionally varied but you should still randomise per session), shuffle each question's `options` array and re-locate `correct_answer` by string match.

## Source

Mapei official Technical Data Sheets — see the `TDS Reference` column on the Master sheet of the source workbook for each product's document ID.
