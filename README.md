# EV vs ICE Cost Comparison

A single-page static web app that compares the operating cost of an electric
vehicle against an internal-combustion vehicle in Philippine Pesos, with
per-trip results and daily/monthly/annual projections.

## Run

Open `index.html` in any modern browser (double-click, or deploy the folder to
any static host such as GitHub Pages or Netlify). No build step or server
required.

## Test

```
node --test tests/logic.test.js
```

(Node 18+ for the built-in test runner. On Node 24 use the explicit file path
above rather than `node --test tests/`.)

## Files

- `index.html` — page structure
- `styles.css` — dark-dashboard theme
- `logic.js` — pure calculation, conversion, validation, formatting (unit-tested)
- `app.js` — DOM wiring
- `tests/logic.test.js` — unit tests
