// Transparent demo scoring only. Replace with locally calibrated hydrological model.
export function calculateRisk(river = [], rainfall = []) {
  const latest = river.at(-1);
  const previous = river.at(-2);
  const rain = rainfall.at(-1)?.rainfall ?? 0;
  if (!latest) return {score:0, level:'Unknown', reasons:['No river observations available'], disclaimer:'Not a validated flood forecast.'};
  const ratio = latest.dangerLevel ? latest.level / latest.dangerLevel : 0;
  const rise = previous ? latest.level - previous.level : 0;
  let score = 10;
  if (ratio >= 0.99) score += 55;
  else if (ratio >= 0.95) score += 40;
  else if (ratio >= 0.90) score += 25;
  if (rise >= 0.5) score += 20;
  else if (rise >= 0.2) score += 12;
  if (rain >= 50) score += 20;
  else if (rain >= 25) score += 12;
  else if (rain >= 10) score += 5;
  score = Math.min(100, score);
  const level = score >= 75 ? 'Critical' : score >= 55 ? 'High' : score >= 30 ? 'Moderate' : 'Low';
  const reasons = [`Latest sample level: ${latest.level} (units must be confirmed)`, `Latest sample rainfall: ${rain} mm`, `Recent level change: ${rise.toFixed(2)}`];
  return {score, level, reasons, disclaimer:'Rule-based demonstration score only; not an official warning or validated flood prediction.'};
}
