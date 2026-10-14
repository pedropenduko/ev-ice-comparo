// Pure calculation, validation, and formatting logic. No DOM access.
export const UNITS = {
  ev: { KM_PER_KWH: 'km/kWh', KWH_PER_100KM: 'kWh/100km' },
  ice: { KM_PER_L: 'km/L', L_PER_100KM: 'L/100km' },
};

export function toKmPerKwh(value, unit) {
  return unit === UNITS.ev.KWH_PER_100KM ? 100 / value : value;
}

export function toKmPerL(value, unit) {
  return unit === UNITS.ice.L_PER_100KM ? 100 / value : value;
}
