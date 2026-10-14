import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNITS } from '../logic.js';

test('module loads', () => {
  assert.equal(UNITS.ev.KM_PER_KWH, 'km/kWh');
});
