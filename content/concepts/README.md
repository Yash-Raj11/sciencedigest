# Background concepts

Textbook knowledge a read needs but its paper does not state. One file each,
`content/concepts/<slug>.json`:

```json
{
  "term": "the word as a read uses it",
  "plain": "What it physically does, in plain words.",
  "model": "The picture a reader can hold.",
  "reference": { "doi": "10.xxxx/xxxxx", "title": "The work this rests on" },
  "reviewed_by_owner": false
}
```

- **No numbers.** Any digit in `term`, `plain` or `model` fails. A number needs a gated fact.
- `reference` has a `title` and either a `doi` or an `isbn`.
- A read uses a concept as a glossary entry (`{ "term": "...", "concept": "<slug>" }`) or cites
  it in a sentence as `[concept:<slug>]`. The page shows "Background" beside it.
- A concept never becomes a protocol step and never carries weight.
- **Only the owner approves one**, at a keyboard: `npm run paper -- approve-concept <slug>`.
  A draft may use an unreviewed concept; a published read may not. Change a concept's wording
  after it was approved and it needs approving again.
