const BASE = { TYRE: 300, BATTERY: 350, FUEL: 250, LOCKOUT: 400, TOW: 800, REPAIR: 500 };
const PER_KM = 12;
const calculatePrice = (type, distKm) => Math.round((BASE[type] || 500) + distKm * PER_KM);
const etaMinutes = (distKm) => Math.ceil(distKm * 3) + 5;
module.exports = { BASE, calculatePrice, etaMinutes };
