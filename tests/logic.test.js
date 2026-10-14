import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNITS } from '../logic.js';
import { toKmPerKwh, toKmPerL } from '../logic.js';

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
