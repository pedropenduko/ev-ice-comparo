import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNITS } from '../logic.js';
import { toKmPerKwh, toKmPerL } from '../logic.js';
import { compare } from '../logic.js';
import { project } from '../logic.js';

function near(actual, expected, eps = 1e-6) {
  assert.ok(Math.abs(actual - expected) < eps, `${actual} !~= ${expected}`);
}

test('module loads', () => {
  assert.equal(UNITS.ev.KM_PER_KWH, 'km/kWh');
});

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
