# WANA — Static Data Layer

All datasets in this folder are imported at build-time by `/src/lib/api.js`,
which provides an axios-compatible in-memory API.

The app runs 100% on the frontend — no backend, no MongoDB, no network calls.

## Files
- `regulations.json` — 130 forestry regulations (38 provinces, 10 categories, 4 risk levels)
- `spatial.json` — 60 indigenous territories with polygon coordinates + overlap flags
- `alerts.json` — 14 curated alerts referencing high-risk regulations
- `notifications.json` — 10 system activity items (`minutes_ago` resolved to ISO at runtime)
- `conflicts.json` — 55 agrarian conflicts
- `news.json` — 32 news & journal items

## Regenerate
Source generator: `backend/wana_seed.py`. To regenerate:

```bash
cd backend && python3 -c "
import json
from wana_seed import gen_regulations, gen_territories, gen_conflicts, gen_news, gen_alerts
regs = gen_regulations(130); terrs = gen_territories(regs, 60)
for name, data in [('regulations',regs),('spatial',terrs),
                   ('conflicts',gen_conflicts(regs,terrs,55)),
                   ('news',gen_news(regs,32)),('alerts',gen_alerts(regs,14))]:
    json.dump(data, open(f'../frontend/src/data/{name}.json','w'), ensure_ascii=False, indent=2)
"
```

## GitHub Pages
1. `cd frontend && yarn build`
2. Push `frontend/build/` to your `gh-pages` branch, OR set GitHub Pages to serve from `/build`.
3. Routing uses `HashRouter` (`#/route`) so URLs work without any server config.

`package.json` `"homepage": "."` makes assets relative — works at any path.
