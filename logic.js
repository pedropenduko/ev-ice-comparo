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
  if (r.cheaper === 'equal') {
    return 'Both vehicles cost about the same per kilometer.';
  }
  if (r.cheaper === 'ice') {
    const evMultiple = r.ice.costPerKm === 0 ? 0 : r.ev.costPerKm / r.ice.costPerKm;
    return `The EV costs approximately ${formatNumber(evMultiple, 1)} ` +
      `times more per kilometer than the ICE vehicle.`;
  }
  return `The ICE vehicle costs approximately ${formatNumber(r.iceMultiple, 1)} ` +
    `times more per kilometer than the EV.`;
}

export function buildProjectionStatement(p) {
  if (p.monthly.savings >= 0) {
    return `Based on your driving pattern, using the EV could save approximately ` +
      `${formatPeso(p.monthly.savings)} per month and ${formatPeso(p.annual.savings)} per year.`;
  }
  return `Based on your driving pattern, using the EV would cost approximately ` +
    `${formatPeso(-p.monthly.savings)} more per month and ${formatPeso(-p.annual.savings)} more per year than the ICE vehicle.`;
}
