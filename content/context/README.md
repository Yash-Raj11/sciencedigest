# Context studies

Another study a read may cite beside its own paper. One folder each:

```
content/context/<slug>/source.txt        the study's text, as downloaded
content/context/<slug>/extraction.json   its facts, each with the passage it came from
content/context/<slug>/withdrawn.json    written by `npm run retractions` if it is retracted
content/context/<slug>/excluded.json     facts the owner ruled out of use: { "<fact_id>": "why" }
```

`excluded.json` is for a fact that is verified but does not apply, such as an arm of the study
unlike the reader's situation. The lint refuses any citation of it. Every id must be a verified
fact and every entry needs a reason, or the source fails.

Made with the same commands as a paper, with `--role context`:

```
npm run paper -- fetch PMC1234567 <slug> --role context     # licence + retraction check
npm run paper -- extract <slug> --role context              # the model reads it; the gate checks it
```

It goes through the same gate: CC-BY, CC-BY-SA or CC0 only, and every quote must be found in
`source.txt`. Then it stops. A context study has **no `editorial.json`, no protocol and no
weight**. A read cites one of its facts as `[<slug>/<fact_id>]`, and the page shows
"From another study: <cite>, <grade>" beside it.

Add one only when the owner has agreed to it.
