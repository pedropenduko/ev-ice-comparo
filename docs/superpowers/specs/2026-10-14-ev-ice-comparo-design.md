# EV vs ICE Operating-Cost Comparison — Design Spec

**Date:** 2026-10-14
**Status:** Approved for planning

## Purpose

A simple, modern web app that helps Philippine drivers understand the real-world
energy-cost difference between driving an Electric Vehicle (EV) and an Internal
Combustion Engine (ICE) vehicle. The user enters vehicle efficiency, energy/fuel
prices, and a distance; the app shows a side-by-side cost comparison, the savings
from driving the EV, and optional projected costs over daily/weekly/monthly/annual
usage.

## Scope (v1)

In scope:
- Core per-trip comparison and savings.
- Usage projections (daily / weekly / monthly / annual).
- Efficiency unit toggles (km/kWh ↔ kWh/100km, km/L ↔ L/100km).

Out of scope: accounts, persistence/local storage, multiple saved vehicles,
backend, charging-loss or degradation modelling, currencies other than PHP.

## Architecture

A **single static site** — no build step, no backend, no dependencies. Three files:

- `index.html` — structure/markup.
- `styles.css` — dark-dashboard theme.
- `app.js` — calculation logic, unit conversion, validation, rendering, projections.

The site opens by double-clicking `index.html` and deploys to any static host
(GitHub Pages, Netlify). All calculation and conversion logic lives in pure
functions (no DOM access) so it can be unit-tested independently of rendering.

### Modules within `app.js`

- **Pure logic (no DOM):**
  - `toKmPerKwh(value, unit)` — normalizes EV efficiency to km/kWh.
  - `toKmPerL(value, unit)` — normalizes ICE efficiency to km/L.
  - `compare(inputs)` — returns all derived per-trip numbers.
  - `project(inputs, dailyKm, daysPerWeek)` — returns monthly/annual figures.
  - `validate(inputs)` — returns a list of field errors.
  - `formatPeso(n)`, `formatNumber(n)` — formatting helpers.
- **DOM layer:** reads inputs, calls logic, renders results, binds events.

## Visual Direction

**Dark Dashboard:** dark slate background (`#0f172a` / `#1e293b` panels,
`#334155` borders), neon-green EV accent (`#4ade80`), cyan highlight (`#38bdf8`),
orange ICE accent (`#fb923c`), light text (`#e2e8f0`). Modern, techy "EV app"
feel with high contrast for numbers. System UI font stack.

## Layout (top to bottom)

1. **Header** — app title + one-line tagline.
2. **Savings hero** — large highlighted ₱ savings for the trip, a savings-percentage
   pill, and a "⚡ EV wins" badge. Focal point of the page.
3. **Inputs** — two cards side-by-side on desktop, stacked on mobile:
   - **⚡ EV card** (green accent): car model, efficiency + unit toggle, electricity rate (₱/kWh).
   - **⛽ ICE card** (orange accent): car model, efficiency + unit toggle, fuel price (₱/liter).
   - **Trip card**: distance travelled (km).
4. **Results** — mirrored EV and ICE cards, each showing: car model, distance,
   energy/fuel used, efficiency (km/kWh or km/L), price per unit, total cost,
   cost per km. Plus a horizontal **bar comparison** of EV cost vs ICE cost.
5. **Savings summary** — the two statement sentences (below).
6. **Projections** (collapsible, visible by default) — inputs for average daily
   distance and driving days per week; outputs monthly/annual EV cost, ICE cost,
   and savings, plus the projection sentence.
7. **Buttons** — Calculate and Reset.

Responsive: cards sit side-by-side on desktop, stack vertically on mobile.

## Inputs

**EV:** car model (text), efficiency (number) + unit selector, electricity rate (₱/kWh).
**ICE:** car model (text), efficiency (number) + unit selector, fuel price (₱/liter).
**Trip:** distance (km).
**Projections (optional):** average daily distance (km), driving days per week.

Car model is a free-text field (not a preset list).

## Efficiency Unit Handling

Each efficiency input has a unit dropdown. Values are normalized internally before
any calculation:

- EV: `km/kWh` used as-is; `kWh/100km` → `km/kWh = 100 / value`.
- ICE: `km/L` used as-is; `L/100km` → `km/L = 100 / value`.

## Calculations

Per trip:
- EV energy used (kWh) = distance ÷ EV efficiency (km/kWh)
- EV driving cost = energy used × electricity rate
- EV cost per km = EV driving cost ÷ distance
- ICE fuel used (L) = distance ÷ ICE efficiency (km/L)
- ICE driving cost = fuel used × fuel price
- ICE cost per km = ICE driving cost ÷ distance

Savings:
- Savings = ICE driving cost − EV driving cost
- Savings percentage = (savings ÷ ICE driving cost) × 100
- ICE cost multiple = ICE driving cost ÷ EV driving cost

Projections (from average daily distance `d` and driving days per week `w`):
- Weekly distance = d × w
- Monthly distance = weekly distance × 52 ÷ 12
- Annual distance = weekly distance × 52
- Each cost = (distance ÷ efficiency) × price, computed for EV and ICE at monthly
  and annual distances; savings = ICE − EV at each horizon.

## Results to Display

**EV:** car model, distance, energy used (kWh), efficiency (km/kWh), price per kWh,
total electricity cost, cost per km.

**ICE:** car model, distance, fuel used (L), efficiency (km/L), price per liter,
total fuel cost, cost per km.

**Savings summary:** amount saved, percentage savings, EV total cost, ICE total cost,
EV cost/km, ICE cost/km, which vehicle is cheaper, and how many times more expensive
the ICE vehicle is.

Statement lines:
- "Driving the EV saves ₱XXX for this trip, equivalent to XX% savings compared with
  the ICE vehicle."
- "The ICE vehicle costs approximately X.X times more per kilometer than the EV."

Projection line:
- "Based on your driving pattern, using the EV could save approximately ₱X per month
  and ₱X per year."

Note: the comparison is written assuming the EV is cheaper (the expected case).
If inputs make the ICE cheaper or costs equal, wording adapts accordingly (e.g.,
"the ICE vehicle is cheaper for this trip" / "both cost the same").

## Behavior

- **Auto-calculates live** as inputs change, and a **Calculate** button explicitly
  re-runs/validates.
- **Pre-filled with example data on load** so results show immediately:
  EV GAC AION V Elite, 8 km/kWh, ₱14.50/kWh; ICE Toyota Fortuner, 13 km/L, ₱70/liter;
  distance 75 km.
- **Reset** restores those example defaults.

## Validation

Rules (all must be greater than zero): distance, EV efficiency, ICE efficiency,
electricity price, fuel price. Car model may be blank (falls back to "EV"/"ICE"
labels). Projection inputs validated only when the projections section is in use.

Behavior: invalid or empty required fields show an inline message beneath the field
and a red border; results for the affected comparison stay hidden (or show a prompt)
until inputs are valid. Validation runs live on input/blur and on Calculate.

## Currency & Number Formatting

- Peso: `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })` → `₱403.85`.
- Energy, fuel, efficiency, cost-per-km shown to 2 decimals.

## Testing

Logic is pure functions, tested in a browser-runnable harness (`tests.html` loading
`app.js`), asserting the worked example and conversions:

Worked example (75 km; EV 8 km/kWh @ ₱14.50; ICE 13 km/L @ ₱70):
- EV energy = 9.375 kWh; EV cost = ₱135.94; EV cost/km = ₱1.81.
- ICE fuel = 5.769 L; ICE cost = ₱403.85; ICE cost/km = ₱5.38.
- Savings = ₱267.91; savings % ≈ 66.3%; ICE multiple ≈ 2.97×.

Additional cases:
- Unit conversion: 8 km/kWh ≡ 12.5 kWh/100km; 13 km/L ≡ 7.69 L/100km — same results
  either way.
- Projection: given daily distance and days/week, monthly and annual figures match
  the formulas.
- Validation: zero/negative/blank required fields produce the expected errors.
- Edge wording: ICE-cheaper and equal-cost cases produce correct summary text.

## File Structure

```
index.html
styles.css
app.js
tests.html
```
