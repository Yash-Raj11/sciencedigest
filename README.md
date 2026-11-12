# Science Digest

Clinical research in five-minute reads. Each read ends with a simulator and a protocol you can
add to a daily tracker, scored by how strong the evidence behind each action is.

```
npm install
npm run dev          # http://localhost:3000, demo mode: nothing to set up
```

| Read this | For |
|---|---|
| [docs/MANUAL.md](docs/MANUAL.md) | Running, changing, adding papers, going live. Includes a glossary |
| [CLAUDE.md](CLAUDE.md) | The rules that must stay true, for people and for coding assistants |
| [docs/data-model.md](docs/data-model.md) | The database |
| [docs/BUILD-LOG.md](docs/BUILD-LOG.md) | Decisions made and why |

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Run the app locally |
| `npm run lint` / `typecheck` / `test` / `build` | The checks to pass before releasing |
| `npm run db:test` | Database access-rule tests (Docker). `db:test:local` without Docker |
| `npm run db:mutation` | Break each database rule in turn and confirm the tests notice |
| `npm run content:build` | Re-check every paper and rewrite the files the app reads |
| `npm run paper -- fetch\|extract\|draft\|approve\|unpublish` | The paper pipeline, one stage at a time |
| `npm run retractions` | Check published papers against the Retraction Watch list |
| `npm run parity:gen` | Regenerate the test that compares TypeScript scoring with SQL scoring |

## The starter papers

All CC BY 4.0. Summaries are ours; quoted passages are the authors'.

- Inoue K, et al. *JAMA Netw Open.* 2023;6(3):e235174. doi:[10.1001/jamanetworkopen.2023.5174](https://doi.org/10.1001/jamanetworkopen.2023.5174)
- Weibel J, et al. *Sci Rep.* 2021;11(1):4668. doi:[10.1038/s41598-021-84088-x](https://doi.org/10.1038/s41598-021-84088-x)
- Khodadadi F, et al. *J Clin Med.* 2023;12(6):2291. doi:[10.3390/jcm12062291](https://doi.org/10.3390/jcm12062291)

Not medical advice.
# sciencedigest
