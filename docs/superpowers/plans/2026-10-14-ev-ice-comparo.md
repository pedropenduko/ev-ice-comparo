# EV vs ICE Operating-Cost Comparison — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page, no-build static web app that compares the per-trip and projected operating cost of an EV vs an ICE vehicle in Philippine Pesos.

**Architecture:** Pure calculation/validation/formatting logic lives in an ES module (`logic.js`) with no DOM access, unit-tested with Node's built-in test runner. `app.js` imports that logic and wires it to the DOM (reading inputs, live recalculation, rendering, validation display). `index.html` + `styles.css` provide a dark-dashboard UI. No dependencies, no build step.

**Tech Stack:** Vanilla HTML/CSS/JavaScript (ES modules), `Intl.NumberFormat` for PHP currency, `node --test` + `node:assert` for unit tests.

---

## File Structure

- Create: `package.json` — `{ "type": "module" }` so `.js` files load as ES modules in Node and the browser.
- Create: `logic.js` — pure functions: unit conversion, `compare`, `project`, `validate`, formatting, statement builders. No DOM.
- Create: `app.js` — DOM wiring: read inputs, live calc, render, buttons, unit toggles, projections, validation display. Imports from `logic.js`.
- Create: `index.html` — structure/markup. Loads `app.js` as `<script type="module">`.
- Create: `styles.css` — dark-dashboard theme.
- Create: `tests/logic.test.js` — unit tests for `logic.js`.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `logic.js`
- Create: `tests/logic.test.js`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "ev-ice-comparo",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test tests/"
  }
}
```

- [ ] **Step 2: Create `logic.js` with a placeholder export**

```js
// Pure calculation, validation, and formatting logic. No DOM access.
export const UNITS = {
  ev: { KM_PER_KWH: 'km/kWh', KWH_PER_100KM: 'kWh/100km' },
  ice: { KM_PER_L: 'km/L', L_PER_100KM: 'L/100km' },
};
```

- [ ] **Step 3: Create `tests/logic.test.js` with a smoke test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNITS } from '../logic.js';

test('module loads', () => {
  assert.equal(UNITS.ev.KM_PER_KWH, 'km/kWh');
});
```

- [ ] **Step 4: Run the test**

Run: `node --test tests/`
Expected: PASS (1 test passing).

- [ ] **Step 5: Commit**

```bash
git add package.json logic.js tests/logic.test.js
git commit -m "chore: scaffold ev-ice-comparo project"
```

---

## Task 2: Efficiency unit conversion

Normalize entered efficiencies to km/kWh (EV) and km/L (ICE) regardless of the unit the user chose.

**Files:**
- Modify: `logic.js`
- Test: `tests/logic.test.js`

- [ ] **Step 1: Write the failing tests** (append to `tests/logic.test.js`)

```js
import { toKmPerKwh, toKmPerL } from '../logic.js';

function near(actual, expected, eps = 1e-6) {
  assert.ok(Math.abs(actual - expected) < eps, `${actual} !~= ${expected}`);
}

test('toKmPerKwh passes through km/kWh', () => {
  near(toKmPerKwh(8, UNITS.ev.KM_PER_KWH), 8);
});

test('toKmPerKwh converts kWh/100km', () => {
  near(toKmPerKwh(12.5, UNITS.ev.KWH_PER_100KM), 8);
});

test('toKmPerL passes through km/L', () => {
  near(toKmPerL(13, UNITS.ice.KM_PER_L), 13);
});

test('toKmPerL converts L/100km', () => {
  near(toKmPerL(100 / 13, UNITS.ice.L_PER_100KM), 13);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/`
Expected: FAIL — `toKmPerKwh is not a function` (import undefined).

- [ ] **Step 3: Implement conversion in `logic.js`** (append)

```js
export function toKmPerKwh(value, unit) {
  return unit === UNITS.ev.KWH_PER_100KM ? 100 / value : value;
}

export function toKmPerL(value, unit) {
  return unit === UNITS.ice.L_PER_100KM ? 100 / value : value;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/`
Expected: PASS (all conversion tests green).

- [ ] **Step 5: Commit**

```bash
git add logic.js tests/logic.test.js
git commit -m "feat: efficiency unit conversion"
```

---

## Task 3: Per-trip comparison (`compare`)

**Files:**
- Modify: `logic.js`
- Test: `tests/logic.test.js`

- [ ] **Step 1: Write the failing tests** (append)

```js
import { compare } from '../logic.js';

const EXAMPLE = {
  distanceKm: 75,
  evModel: 'GAC AION V Elite',
  evKmPerKwh: 8,
  evRate: 14.5,
  iceModel: 'Toyota Fortuner',
  iceKmPerL: 13,
  icePrice: 70,
};

test('compare computes EV figures for the worked example', () => {
  const r = compare(EXAMPLE);
  near(r.ev.energyKwh, 9.375);
  near(r.ev.cost, 135.9375);
  near(r.ev.costPerKm, 1.8125);
});

test('compare computes ICE figures for the worked example', () => {
  const r = compare(EXAMPLE);
  near(r.ice.fuelL, 75 / 13);
  near(r.ice.cost, 5250 / 13);
  near(r.ice.costPerKm, (5250 / 13) / 75);
});

test('compare computes savings, percentage and multiple', () => {
  const r = compare(EXAMPLE);
  near(r.savings, 5250 / 13 - 135.9375);
  near(r.savingsPct, (5250 / 13 - 135.9375) / (5250 / 13) * 100);
  near(r.iceMultiple, (5250 / 13) / 135.9375);
  assert.equal(r.cheaper, 'ev');
});

test('compare flags ICE cheaper when it is', () => {
  const r = compare({ ...EXAMPLE, evRate: 100 });
  assert.equal(r.cheaper, 'ice');
});

test('compare carries through models and distance', () => {
  const r = compare(EXAMPLE);
  assert.equal(r.ev.model, 'GAC AION V Elite');
  assert.equal(r.ice.model, 'Toyota Fortuner');
  assert.equal(r.distanceKm, 75);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/`
Expected: FAIL — `compare is not a function`.

- [ ] **Step 3: Implement `compare` in `logic.js`** (append)

```js
export function compare(input) {
  const { distanceKm, evKmPerKwh, evRate, iceKmPerL, icePrice } = input;

  const energyKwh = distanceKm / evKmPerKwh;
  const evCost = energyKwh * evRate;

  const fuelL = distanceKm / iceKmPerL;
  const iceCost = fuelL * icePrice;

  const savings = iceCost - evCost;

  let cheaper = 'equal';
  if (evCost < iceCost) cheaper = 'ev';
  else if (iceCost < evCost) cheaper = 'ice';

  return {
    distanceKm,
    ev: {
      model: input.evModel,
      energyKwh,
      efficiency: evKmPerKwh,
      rate: evRate,
      cost: evCost,
      costPerKm: evCost / distanceKm,
    },
    ice: {
      model: input.iceModel,
      fuelL,
      efficiency: iceKmPerL,
      price: icePrice,
      cost: iceCost,
      costPerKm: iceCost / distanceKm,
    },
    savings,
    savingsPct: iceCost === 0 ? 0 : (savings / iceCost) * 100,
    iceMultiple: evCost === 0 ? 0 : iceCost / evCost,
    cheaper,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add logic.js tests/logic.test.js
git commit -m "feat: per-trip EV vs ICE comparison"
```

---

## Task 4: Usage projections (`project`)

**Files:**
- Modify: `logic.js`
- Test: `tests/logic.test.js`

- [ ] **Step 1: Write the failing tests** (append)

```js
import { project } from '../logic.js';

const PROJ_INPUT = {
  evKmPerKwh: 8,
  evRate: 14.5,
  iceKmPerL: 13,
  icePrice: 70,
  dailyKm: 40,
  daysPerWeek: 5,
};

test('project computes distances', () => {
  const p = project(PROJ_INPUT);
  near(p.weeklyKm, 200);
  near(p.monthlyKm, 200 * 52 / 12);
  near(p.annualKm, 10400);
});

test('project computes monthly costs and savings', () => {
  const p = project(PROJ_INPUT);
  near(p.monthly.evCost, (200 * 52 / 12) / 8 * 14.5);
  near(p.monthly.iceCost, (200 * 52 / 12) / 13 * 70);
  near(p.monthly.savings, p.monthly.iceCost - p.monthly.evCost);
});

test('project computes annual costs and savings', () => {
  const p = project(PROJ_INPUT);
  near(p.annual.evCost, 18850);
  near(p.annual.iceCost, 56000);
  near(p.annual.savings, 37150);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/`
Expected: FAIL — `project is not a function`.

- [ ] **Step 3: Implement `project` in `logic.js`** (append)

```js
function costFor(distanceKm, kmPerUnit, pricePerUnit) {
  return (distanceKm / kmPerUnit) * pricePerUnit;
}

export function project(input) {
  const { evKmPerKwh, evRate, iceKmPerL, icePrice, dailyKm, daysPerWeek } = input;

  const weeklyKm = dailyKm * daysPerWeek;
  const monthlyKm = (weeklyKm * 52) / 12;
  const annualKm = weeklyKm * 52;

  const forDistance = (km) => {
    const evCost = costFor(km, evKmPerKwh, evRate);
    const iceCost = costFor(km, iceKmPerL, icePrice);
    return { evCost, iceCost, savings: iceCost - evCost };
  };

  return {
    weeklyKm,
    monthlyKm,
    annualKm,
    monthly: forDistance(monthlyKm),
    annual: forDistance(annualKm),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add logic.js tests/logic.test.js
git commit -m "feat: daily/monthly/annual usage projections"
```

---

## Task 5: Input validation (`validate`)

**Files:**
- Modify: `logic.js`
- Test: `tests/logic.test.js`

- [ ] **Step 1: Write the failing tests** (append)

```js
import { validate } from '../logic.js';

const VALID = {
  distanceKm: 75,
  evEfficiency: 8,
  iceEfficiency: 13,
  evRate: 14.5,
  icePrice: 70,
};

test('validate passes clean input', () => {
  assert.deepEqual(validate(VALID), []);
});

test('validate rejects zero and negative required fields', () => {
  const errors = validate({ ...VALID, distanceKm: 0, evEfficiency: -1 });
  const fields = errors.map((e) => e.field);
  assert.ok(fields.includes('distanceKm'));
  assert.ok(fields.includes('evEfficiency'));
  assert.equal(errors.length, 2);
});

test('validate rejects missing / non-numeric values', () => {
  const errors = validate({ ...VALID, icePrice: NaN, evRate: undefined });
  const fields = errors.map((e) => e.field);
  assert.ok(fields.includes('icePrice'));
  assert.ok(fields.includes('evRate'));
});

test('validate error objects carry a message', () => {
  const [err] = validate({ ...VALID, distanceKm: 0 });
  assert.equal(err.field, 'distanceKm');
  assert.equal(typeof err.message, 'string');
  assert.ok(err.message.length > 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/`
Expected: FAIL — `validate is not a function`.

- [ ] **Step 3: Implement `validate` in `logic.js`** (append)

```js
const REQUIRED_POSITIVE = [
  ['distanceKm', 'Distance travelled must be greater than zero.'],
  ['evEfficiency', 'EV efficiency must be greater than zero.'],
  ['iceEfficiency', 'ICE efficiency must be greater than zero.'],
  ['evRate', 'Electricity price must be greater than zero.'],
  ['icePrice', 'Fuel price must be greater than zero.'],
];

export function validate(input) {
  const errors = [];
  for (const [field, message] of REQUIRED_POSITIVE) {
    const value = input[field];
    if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
      errors.push({ field, message });
    }
  }
  return errors;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add logic.js tests/logic.test.js
git commit -m "feat: input validation rules"
```

---

## Task 6: Formatting and statement builders

**Files:**
- Modify: `logic.js`
- Test: `tests/logic.test.js`

- [ ] **Step 1: Write the failing tests** (append)

```js
import {
  formatPeso,
  formatNumber,
  buildTripStatement,
  buildPerKmStatement,
  buildProjectionStatement,
} from '../logic.js';

test('formatPeso renders PHP with peso sign and 2 decimals', () => {
  const s = formatPeso(403.846);
  assert.ok(s.includes('₱'));
  assert.ok(s.includes('403.85'));
});

test('formatNumber rounds to given decimals', () => {
  assert.equal(formatNumber(9.375, 2), '9.38');
  assert.equal(formatNumber(1.8125, 2), '1.81');
});

test('buildTripStatement describes EV savings', () => {
  const r = compare(EXAMPLE);
  const s = buildTripStatement(r);
  assert.ok(s.startsWith('Driving the EV saves ₱'));
  assert.ok(s.includes('267.91'));
  assert.ok(s.includes('66.3%'));
});

test('buildTripStatement handles ICE-cheaper case', () => {
  const r = compare({ ...EXAMPLE, evRate: 100 });
  const s = buildTripStatement(r);
  assert.ok(/ICE/.test(s));
});

test('buildPerKmStatement states the multiple to one decimal', () => {
  const r = compare(EXAMPLE);
  const s = buildPerKmStatement(r);
  assert.ok(s.includes('3.0 times'));
});

test('buildProjectionStatement states monthly and annual savings', () => {
  const p = project(PROJ_INPUT);
  const s = buildProjectionStatement(p);
  assert.ok(s.includes('per month'));
  assert.ok(s.includes('per year'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/`
Expected: FAIL — formatting functions not defined.

- [ ] **Step 3: Implement formatting and statements in `logic.js`** (append)

```js
const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPeso(n) {
  return pesoFormatter.format(n);
}

export function formatNumber(n, decimals = 2) {
  return n.toFixed(decimals);
}

export function buildTripStatement(r) {
  if (r.cheaper === 'equal') {
    return 'Both vehicles cost the same for this trip.';
  }
  if (r.cheaper === 'ice') {
    const diff = r.ev.cost - r.ice.cost;
    const pct = (diff / r.ev.cost) * 100;
    return `Driving the ICE vehicle is cheaper by ${formatPeso(diff)} for this trip, ` +
      `equivalent to ${formatNumber(pct, 1)}% less than the EV.`;
  }
  return `Driving the EV saves ${formatPeso(r.savings)} for this trip, ` +
    `equivalent to ${formatNumber(r.savingsPct, 1)}% savings compared with the ICE vehicle.`;
}

export function buildPerKmStatement(r) {
  return `The ICE vehicle costs approximately ${formatNumber(r.iceMultiple, 1)} ` +
    `times more per kilometer than the EV.`;
}

export function buildProjectionStatement(p) {
  return `Based on your driving pattern, using the EV could save approximately ` +
    `${formatPeso(p.monthly.savings)} per month and ${formatPeso(p.annual.savings)} per year.`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add logic.js tests/logic.test.js
git commit -m "feat: currency formatting and summary statements"
```

---

## Task 7: HTML structure and dark-dashboard styles

Build the static page: header, savings hero, input cards, results cards, projections, buttons. No logic yet — `app.js` is wired in the next task. Verify it loads and looks right.

**Files:**
- Create: `index.html`
- Create: `styles.css`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EV vs ICE Cost Comparison</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main class="app">
    <header class="app-header">
      <h1>EV vs ICE Cost Comparison</h1>
      <p class="tagline">See the real-world energy-cost difference for your trip, in ₱.</p>
    </header>

    <section class="hero" id="hero" aria-live="polite">
      <div class="hero-label">You save this trip</div>
      <div class="hero-amount" id="hero-amount">—</div>
      <div class="hero-badges">
        <span class="pill" id="hero-pct">—</span>
        <span class="badge" id="hero-winner">—</span>
      </div>
    </section>

    <section class="inputs">
      <div class="card card-ev">
        <h2>⚡ Electric Vehicle</h2>
        <label>Car model
          <input type="text" id="ev-model" value="GAC AION V Elite" />
        </label>
        <label>Efficiency
          <span class="field-row">
            <input type="number" id="ev-efficiency" value="8" min="0" step="any" />
            <select id="ev-unit">
              <option value="km/kWh" selected>km/kWh</option>
              <option value="kWh/100km">kWh/100km</option>
            </select>
          </span>
        </label>
        <p class="field-error" id="err-ev-efficiency"></p>
        <label>Electricity rate (₱/kWh)
          <input type="number" id="ev-rate" value="14.5" min="0" step="any" />
        </label>
        <p class="field-error" id="err-ev-rate"></p>
      </div>

      <div class="card card-ice">
        <h2>⛽ ICE Vehicle</h2>
        <label>Car model
          <input type="text" id="ice-model" value="Toyota Fortuner" />
        </label>
        <label>Efficiency
          <span class="field-row">
            <input type="number" id="ice-efficiency" value="13" min="0" step="any" />
            <select id="ice-unit">
              <option value="km/L" selected>km/L</option>
              <option value="L/100km">L/100km</option>
            </select>
          </span>
        </label>
        <p class="field-error" id="err-ice-efficiency"></p>
        <label>Fuel price (₱/liter)
          <input type="number" id="ice-price" value="70" min="0" step="any" />
        </label>
        <p class="field-error" id="err-ice-price"></p>
      </div>

      <div class="card card-trip">
        <h2>Trip</h2>
        <label>Distance travelled (km)
          <input type="number" id="distance" value="75" min="0" step="any" />
        </label>
        <p class="field-error" id="err-distanceKm"></p>
        <div class="actions">
          <button type="button" id="calc-btn">Calculate</button>
          <button type="button" id="reset-btn" class="secondary">Reset</button>
        </div>
      </div>
    </section>

    <section class="results" id="results">
      <div class="result-cards">
        <div class="card result-ev">
          <h3>⚡ <span id="r-ev-model">EV</span></h3>
          <dl>
            <dt>Distance</dt><dd id="r-ev-distance">—</dd>
            <dt>Energy used</dt><dd id="r-ev-energy">—</dd>
            <dt>Efficiency</dt><dd id="r-ev-eff">—</dd>
            <dt>Electricity price</dt><dd id="r-ev-rate">—</dd>
            <dt>Total cost</dt><dd id="r-ev-cost" class="emph">—</dd>
            <dt>Cost per km</dt><dd id="r-ev-perkm">—</dd>
          </dl>
        </div>
        <div class="card result-ice">
          <h3>⛽ <span id="r-ice-model">ICE</span></h3>
          <dl>
            <dt>Distance</dt><dd id="r-ice-distance">—</dd>
            <dt>Fuel used</dt><dd id="r-ice-fuel">—</dd>
            <dt>Efficiency</dt><dd id="r-ice-eff">—</dd>
            <dt>Fuel price</dt><dd id="r-ice-price">—</dd>
            <dt>Total cost</dt><dd id="r-ice-cost" class="emph">—</dd>
            <dt>Cost per km</dt><dd id="r-ice-perkm">—</dd>
          </dl>
        </div>
      </div>

      <div class="bars" aria-hidden="true">
        <div class="bar-row"><span class="bar-label">EV</span>
          <div class="bar-track"><div class="bar-fill bar-ev" id="bar-ev"></div></div>
        </div>
        <div class="bar-row"><span class="bar-label">ICE</span>
          <div class="bar-track"><div class="bar-fill bar-ice" id="bar-ice"></div></div>
        </div>
      </div>

      <p class="statement" id="stmt-trip">—</p>
      <p class="statement" id="stmt-perkm">—</p>
    </section>

    <section class="card projections">
      <h2>Projected usage</h2>
      <div class="proj-inputs">
        <label>Average daily distance (km)
          <input type="number" id="daily-km" value="40" min="0" step="any" />
        </label>
        <label>Driving days per week
          <input type="number" id="days-per-week" value="5" min="0" max="7" step="any" />
        </label>
      </div>
      <div class="proj-grid" id="proj-grid">
        <div><span class="label">EV / month</span><span id="p-ev-month">—</span></div>
        <div><span class="label">ICE / month</span><span id="p-ice-month">—</span></div>
        <div><span class="label">Saved / month</span><span id="p-save-month" class="emph">—</span></div>
        <div><span class="label">EV / year</span><span id="p-ev-year">—</span></div>
        <div><span class="label">ICE / year</span><span id="p-ice-year">—</span></div>
        <div><span class="label">Saved / year</span><span id="p-save-year" class="emph">—</span></div>
      </div>
      <p class="statement" id="stmt-proj">—</p>
    </section>
  </main>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `styles.css` (dark-dashboard theme)**

```css
:root {
  --bg: #0f172a;
  --panel: #1e293b;
  --border: #334155;
  --text: #e2e8f0;
  --muted: #94a3b8;
  --ev: #4ade80;
  --ev-border: #14532d;
  --ice: #fb923c;
  --ice-border: #7c2d12;
  --cyan: #38bdf8;
  --danger: #f87171;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  line-height: 1.4;
}

.app { max-width: 960px; margin: 0 auto; padding: 24px 16px 64px; }

.app-header h1 { margin: 0 0 4px; font-size: 1.6rem; }
.tagline { margin: 0 0 20px; color: var(--muted); }

.hero {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 22px;
  text-align: center;
  margin-bottom: 20px;
}
.hero-label { color: var(--muted); font-size: 0.85rem; }
.hero-amount { font-size: 2.6rem; font-weight: 800; color: var(--ev); margin: 4px 0; }
.hero-badges { display: flex; gap: 8px; justify-content: center; }
.pill {
  background: rgba(56, 189, 248, 0.15); color: var(--cyan);
  font-weight: 700; font-size: 0.8rem; padding: 3px 12px; border-radius: 999px;
}
.badge {
  background: rgba(74, 222, 128, 0.15); color: var(--ev);
  font-weight: 700; font-size: 0.8rem; padding: 3px 12px; border-radius: 999px;
}

.inputs, .result-cards { display: grid; gap: 16px; }
.inputs { grid-template-columns: 1fr 1fr; }
.inputs .card-trip { grid-column: 1 / -1; }
.result-cards { grid-template-columns: 1fr 1fr; }

.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 16px;
}
.card h2, .card h3 { margin: 0 0 12px; font-size: 1.1rem; }
.card-ev { border-color: var(--ev-border); }
.card-ice { border-color: var(--ice-border); }

label { display: block; margin-bottom: 10px; font-size: 0.85rem; color: var(--muted); }
input, select {
  width: 100%; margin-top: 4px; padding: 9px 10px;
  background: #0b1220; color: var(--text);
  border: 1px solid var(--border); border-radius: 8px; font-size: 1rem;
}
input:focus, select:focus { outline: 2px solid var(--cyan); outline-offset: 0; }
input.invalid { border-color: var(--danger); }

.field-row { display: flex; gap: 8px; }
.field-row input { flex: 2; }
.field-row select { flex: 1; }

.field-error { color: var(--danger); font-size: 0.78rem; min-height: 1em; margin: 2px 0 6px; }

.actions { display: flex; gap: 10px; margin-top: 8px; }
button {
  flex: 1; padding: 11px; border-radius: 8px; border: none;
  background: var(--ev); color: #06230f; font-weight: 700; font-size: 1rem; cursor: pointer;
}
button.secondary { background: transparent; color: var(--text); border: 1px solid var(--border); }

dl { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; margin: 0; }
dt { color: var(--muted); font-size: 0.85rem; }
dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
dd.emph { font-weight: 800; font-size: 1.05rem; }
.result-ev dd.emph { color: var(--ev); }
.result-ice dd.emph { color: var(--ice); }

.bars { margin: 16px 0; display: grid; gap: 10px; }
.bar-row { display: flex; align-items: center; gap: 10px; }
.bar-label { width: 36px; color: var(--muted); font-size: 0.8rem; }
.bar-track { flex: 1; background: #0b1220; border-radius: 6px; overflow: hidden; height: 20px; }
.bar-fill { height: 100%; width: 0; transition: width 0.3s ease; }
.bar-ev { background: var(--ev); }
.bar-ice { background: var(--ice); }

.statement { color: var(--text); margin: 8px 0; }

.proj-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.proj-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 14px 0; }
.proj-grid .label { display: block; color: var(--muted); font-size: 0.78rem; }
.proj-grid span.emph { color: var(--ev); font-weight: 800; }
.proj-grid > div { background: #0b1220; border-radius: 8px; padding: 10px; }

.results.hidden { display: none; }

@media (max-width: 640px) {
  .inputs, .result-cards, .proj-inputs { grid-template-columns: 1fr; }
  .proj-grid { grid-template-columns: 1fr 1fr; }
  .hero-amount { font-size: 2.1rem; }
}
```

- [ ] **Step 3: Verify the page loads**

Run (Windows): `start index.html`
Expected: Page renders the dark-dashboard layout — header, hero with placeholder "—", two input cards side by side (EV green-bordered, ICE orange-bordered), trip card with Calculate/Reset buttons, empty results cards, and the projections card. On a narrow window the cards stack. (No numbers yet — wiring is Task 8.)

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat: dark-dashboard HTML structure and styles"
```

---

## Task 8: DOM wiring (`app.js`)

Connect the UI to `logic.js`: read inputs, normalize units, validate, live-recalculate on input, render results + projections, wire Calculate/Reset.

**Files:**
- Create: `app.js`

- [ ] **Step 1: Create `app.js`**

```js
import {
  UNITS, toKmPerKwh, toKmPerL, compare, project, validate,
  formatPeso, formatNumber, buildTripStatement, buildPerKmStatement,
  buildProjectionStatement,
} from './logic.js';

const $ = (id) => document.getElementById(id);

const DEFAULTS = {
  'ev-model': 'GAC AION V Elite', 'ev-efficiency': '8', 'ev-unit': 'km/kWh', 'ev-rate': '14.5',
  'ice-model': 'Toyota Fortuner', 'ice-efficiency': '13', 'ice-unit': 'km/L', 'ice-price': '70',
  'distance': '75', 'daily-km': '40', 'days-per-week': '5',
};

const num = (id) => parseFloat($(id).value);

function readRaw() {
  return {
    distanceKm: num('distance'),
    evEfficiency: num('ev-efficiency'),
    iceEfficiency: num('ice-efficiency'),
    evRate: num('ev-rate'),
    icePrice: num('ice-price'),
  };
}

const ERROR_FIELDS = {
  distanceKm: 'distance',
  evEfficiency: 'ev-efficiency',
  iceEfficiency: 'ice-efficiency',
  evRate: 'ev-rate',
  icePrice: 'ice-price',
};

function clearErrors() {
  for (const inputId of Object.values(ERROR_FIELDS)) {
    $(inputId).classList.remove('invalid');
  }
  for (const field of Object.keys(ERROR_FIELDS)) {
    const el = $(`err-${field}`);
    if (el) el.textContent = '';
  }
}

function showErrors(errors) {
  clearErrors();
  for (const { field, message } of errors) {
    const inputId = ERROR_FIELDS[field];
    if (inputId) $(inputId).classList.add('invalid');
    const el = $(`err-${field}`);
    if (el) el.textContent = message;
  }
}

function render() {
  const raw = readRaw();
  const errors = validate(raw);

  if (errors.length > 0) {
    showErrors(errors);
    $('results').classList.add('hidden');
    $('hero-amount').textContent = '—';
    $('hero-pct').textContent = 'Check inputs';
    $('hero-winner').textContent = '—';
    return;
  }
  clearErrors();
  $('results').classList.remove('hidden');

  const evKmPerKwh = toKmPerKwh(raw.evEfficiency, $('ev-unit').value);
  const iceKmPerL = toKmPerL(raw.iceEfficiency, $('ice-unit').value);

  const r = compare({
    distanceKm: raw.distanceKm,
    evModel: $('ev-model').value.trim() || 'EV',
    evKmPerKwh, evRate: raw.evRate,
    iceModel: $('ice-model').value.trim() || 'ICE',
    iceKmPerL, icePrice: raw.icePrice,
  });

  // Hero
  $('hero-amount').textContent = formatPeso(Math.abs(r.savings));
  $('hero-pct').textContent = `${formatNumber(Math.abs(r.savingsPct), 1)}% savings`;
  $('hero-winner').textContent =
    r.cheaper === 'ev' ? '⚡ EV wins' : r.cheaper === 'ice' ? '⛽ ICE wins' : 'Tie';

  // EV results
  $('r-ev-model').textContent = r.ev.model;
  $('r-ev-distance').textContent = `${formatNumber(r.distanceKm, 2)} km`;
  $('r-ev-energy').textContent = `${formatNumber(r.ev.energyKwh, 2)} kWh`;
  $('r-ev-eff').textContent = `${formatNumber(r.ev.efficiency, 2)} km/kWh`;
  $('r-ev-rate').textContent = `${formatPeso(r.ev.rate)}/kWh`;
  $('r-ev-cost').textContent = formatPeso(r.ev.cost);
  $('r-ev-perkm').textContent = `${formatPeso(r.ev.costPerKm)}/km`;

  // ICE results
  $('r-ice-model').textContent = r.ice.model;
  $('r-ice-distance').textContent = `${formatNumber(r.distanceKm, 2)} km`;
  $('r-ice-fuel').textContent = `${formatNumber(r.ice.fuelL, 2)} L`;
  $('r-ice-eff').textContent = `${formatNumber(r.ice.efficiency, 2)} km/L`;
  $('r-ice-price').textContent = `${formatPeso(r.ice.price)}/L`;
  $('r-ice-cost').textContent = formatPeso(r.ice.cost);
  $('r-ice-perkm').textContent = `${formatPeso(r.ice.costPerKm)}/km`;

  // Bars (relative to the larger cost)
  const maxCost = Math.max(r.ev.cost, r.ice.cost) || 1;
  $('bar-ev').style.width = `${(r.ev.cost / maxCost) * 100}%`;
  $('bar-ice').style.width = `${(r.ice.cost / maxCost) * 100}%`;

  // Statements
  $('stmt-trip').textContent = buildTripStatement(r);
  $('stmt-perkm').textContent = buildPerKmStatement(r);

  renderProjection(evKmPerKwh, raw.evRate, iceKmPerL, raw.icePrice);
}

function renderProjection(evKmPerKwh, evRate, iceKmPerL, icePrice) {
  const dailyKm = num('daily-km');
  const daysPerWeek = num('days-per-week');
  const grid = $('proj-grid');

  if (!(dailyKm > 0) || !(daysPerWeek > 0)) {
    for (const id of ['p-ev-month', 'p-ice-month', 'p-save-month', 'p-ev-year', 'p-ice-year', 'p-save-year']) {
      $(id).textContent = '—';
    }
    $('stmt-proj').textContent = 'Enter an average daily distance and driving days per week to see projections.';
    return;
  }

  const p = project({ evKmPerKwh, evRate, iceKmPerL, icePrice, dailyKm, daysPerWeek });
  $('p-ev-month').textContent = formatPeso(p.monthly.evCost);
  $('p-ice-month').textContent = formatPeso(p.monthly.iceCost);
  $('p-save-month').textContent = formatPeso(p.monthly.savings);
  $('p-ev-year').textContent = formatPeso(p.annual.evCost);
  $('p-ice-year').textContent = formatPeso(p.annual.iceCost);
  $('p-save-year').textContent = formatPeso(p.annual.savings);
  $('stmt-proj').textContent = buildProjectionStatement(p);
}

function reset() {
  for (const [id, value] of Object.entries(DEFAULTS)) {
    $(id).value = value;
  }
  render();
}

// Live recalculation on any input/select change.
document.querySelectorAll('input, select').forEach((el) => {
  el.addEventListener('input', render);
});
$('calc-btn').addEventListener('click', render);
$('reset-btn').addEventListener('click', reset);

// Initial render with the pre-filled example data.
render();
```

- [ ] **Step 2: Verify syntax parses**

Run: `node --check app.js`
Expected: No output, exit 0 (valid syntax).

- [ ] **Step 3: Verify in the browser**

Run (Windows): `start index.html`
Expected on load (example data pre-filled):
- Hero shows **₱267.91**, pill "66.3% savings", badge "⚡ EV wins".
- EV card: energy 9.38 kWh, efficiency 8.00 km/kWh, rate ₱14.50/kWh, total **₱135.94**, ₱1.81/km.
- ICE card: fuel 5.77 L, efficiency 13.00 km/L, price ₱70.00/L, total **₱403.85**, ₱5.38/km.
- EV bar ~34% width, ICE bar full width.
- Trip statement and "approximately 3.0 times more per kilometer" statement shown.
- Projections (40 km × 5 days): EV/month ₱1,570.83, ICE/month ₱4,666.67, Saved/month ₱3,095.83; EV/year ₱18,850.00, ICE/year ₱56,000.00, Saved/year ₱37,150.00.

- [ ] **Step 4: Verify validation and controls interactively**

- Set Distance to `0`: the results section hides, the distance field turns red, and the message "Distance travelled must be greater than zero." appears beneath it.
- Restore Distance to `75`: results reappear.
- Switch EV unit to `kWh/100km` and enter `12.5`: results stay the same as 8 km/kWh (₱135.94).
- Click **Reset**: all fields return to the example data and results refresh to the load state above.

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: wire UI to calculation logic"
```

---

## Task 9: Final verification and README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Run the full test suite**

Run: `node --test tests/`
Expected: All tests PASS.

- [ ] **Step 2: Create `README.md`**

```markdown
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
node --test tests/
```

## Files

- `index.html` — page structure
- `styles.css` — dark-dashboard theme
- `logic.js` — pure calculation, conversion, validation, formatting (unit-tested)
- `app.js` — DOM wiring
- `tests/logic.test.js` — unit tests
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

## Self-Review Notes

Spec coverage check against `2026-10-14-ev-ice-comparo-design.md`:
- Inputs (EV/ICE/trip) → Task 7 markup + Task 8 reading. ✓
- EV & ICE per-trip calculations → Task 3. ✓
- Savings, percentage, ICE multiple → Task 3. ✓
- Usage projections (monthly/annual) → Task 4 + Task 8 rendering. ✓
- Efficiency unit toggles + internal conversion → Task 2 + Task 8. ✓
- Results display (all listed EV/ICE fields) → Task 7 markup + Task 8 render. ✓
- Savings summary + two statement lines + projection line → Task 6 + Task 8. ✓
- Edge wording (ICE-cheaper / equal) → Task 6 (`buildTripStatement`). ✓
- Validation (five >0 rules, inline messages, hide results) → Task 5 + Task 8. ✓
- PHP formatting via Intl → Task 6. ✓
- Live auto-calc + Calculate + Reset + example defaults → Task 8. ✓
- Dark-dashboard visual direction, responsive stacking → Task 7. ✓
- Testing of worked example, conversions, projections, validation → Tasks 2–6. ✓
