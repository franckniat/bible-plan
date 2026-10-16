# @workspace/bible-data

Bible texts in the **public domain**, hosted by the project so that reading is free, unlimited and works without any external service:

| Version                   | Language | Folder         |
| ------------------------- | -------- | -------------- |
| Louis Segond 1910         | French   | `data/lsg1910` |
| King James Version (1769) | English  | `data/kjv`     |

Each chapter is a JSON file, `data/<version>/<OSIS book>/<chapter>.json`:

```json
{ "version": "lsg1910", "book": "John", "chapter": 3, "verses": [[1, "Mais il y eut un homme…"], …] }
```

The web app copies `data/` to `public/bible/` and serves the chapters as static files (CDN); the future mobile app can bundle them for offline reading.

- `src/` runs everywhere (web, mobile): chapter format, version registry, loader. It stays pure (no Node.js API), like `@workspace/core`.
- `scripts/` are Node.js tools, such as the import from the eBible.org sources.

The texts are not covered by the AGPL: see [NOTICE](../../NOTICE).
