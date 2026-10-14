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
