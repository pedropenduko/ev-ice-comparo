import {
  toKmPerKwh, toKmPerL, compare, project, validate,
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

// Maps validate() field name → input element id
const ERROR_FIELDS = {
  distanceKm: 'distance',
  evEfficiency: 'ev-efficiency',
  iceEfficiency: 'ice-efficiency',
  evRate: 'ev-rate',
  icePrice: 'ice-price',
};

// Maps validate() field name → error container element id (matches index.html)
const ERROR_ELS = {
  distanceKm: 'err-distanceKm',
  evEfficiency: 'err-ev-efficiency',
  iceEfficiency: 'err-ice-efficiency',
  evRate: 'err-ev-rate',
  icePrice: 'err-ice-price',
};

function clearErrors() {
  for (const inputId of Object.values(ERROR_FIELDS)) {
    $(inputId).classList.remove('invalid');
  }
  for (const elId of Object.values(ERROR_ELS)) {
    const el = $(elId);
    if (el) el.textContent = '';
  }
}

function showErrors(errors) {
  clearErrors();
  for (const { field, message } of errors) {
    const inputId = ERROR_FIELDS[field];
    if (inputId) $(inputId).classList.add('invalid');
    const el = $(ERROR_ELS[field]);
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
    blankProjection('Enter valid vehicle and trip details to see projections.');
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
  $('hero-pct').textContent =
    r.cheaper === 'ev' ? `${formatNumber(r.savingsPct, 1)}% savings`
    : r.cheaper === 'ice' ? `${formatNumber(Math.abs(r.savingsPct), 1)}% more expensive`
    : 'equal cost';
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

const PROJ_CELLS = ['p-ev-month', 'p-ice-month', 'p-save-month', 'p-ev-year', 'p-ice-year', 'p-save-year'];

function blankProjection(message) {
  for (const id of PROJ_CELLS) $(id).textContent = '—';
  $('stmt-proj').textContent = message;
}

function renderProjection(evKmPerKwh, evRate, iceKmPerL, icePrice) {
  const dailyKm = num('daily-km');
  const daysPerWeek = num('days-per-week');

  if (!(dailyKm > 0) || !(daysPerWeek > 0)) {
    blankProjection('Enter an average daily distance and driving days per week to see projections.');
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
