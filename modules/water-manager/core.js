export const VERSION = "0.1.0";

export const priorityWeights = {
  Jungpflanzen: 100,
  Gemuese: 95,
  Kuebelpflanzen: 90,
  Blumen: 80,
  Hecke: 60,
  Rasen: 35
};

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function effectivePumpFlow(pump) {
  const rated = Number(pump.ratedFlowLph) || 0;
  const measured = Number(pump.measuredFlowLph);
  return measured > 0 ? measured : rated * 0.72;
}

export function sourceUsableLiters(source) {
  const current = clamp(source.currentLiters, 0, source.capacityLiters || Number.MAX_SAFE_INTEGER);
  const reserve = Math.max(0, Number(source.reserveLiters) || 0);
  return Math.max(0, current - reserve);
}

export function zoneDailyNeed(zone) {
  const area = Math.max(0, Number(zone.areaM2) || 0);
  const mm = Math.max(0, Number(zone.targetMm) || 0);
  return area * mm;
}

export function calculateWaterBalance(state) {
  const usable = state.sources.reduce((sum, s) => sum + sourceUsableLiters(s), 0);
  const total = state.sources.reduce((sum, s) => sum + Math.max(0, Number(s.currentLiters) || 0), 0);
  const dailyNeed = state.zones
    .filter(z => z.enabled !== false)
    .reduce((sum, z) => sum + zoneDailyNeed(z), 0);
  const days = dailyNeed > 0 ? usable / dailyNeed : Infinity;
  return { usable, total, dailyNeed, days };
}

export function estimateRuntimeMinutes(volumeLiters, pumpFlowLph) {
  const v = Math.max(0, Number(volumeLiters) || 0);
  const f = Math.max(0, Number(pumpFlowLph) || 0);
  return f > 0 ? (v / f) * 60 : Infinity;
}

export function analyzeWell(state) {
  const well = state.sources.find(s => s.type === "Bohrbrunnen");
  const pump = state.pumps.find(p => p.sourceId === well?.id);
  if (!well || !pump) return { level: "info", messages: ["Keine vollstaendige Brunnenkonfiguration vorhanden."] };

  const flow = effectivePumpFlow(pump);
  const pressure = Number(pump.measuredPressureBar) || 0;
  const messages = [];
  let level = "ok";

  if (pressure < 1.5) {
    level = "danger";
    messages.push(`Der gemessene Druck von ${pressure.toFixed(1)} bar reicht fuer viele Versenkregner nicht aus.`);
  }
  if (flow < 600) {
    level = "danger";
    messages.push(`Die gemessene Foerdermenge von ${Math.round(flow)} l/h ist sehr niedrig.`);
  } else if (flow < 1200) {
    if (level !== "danger") level = "warn";
    messages.push(`Die Brunnenleistung ist eingeschraenkt (${Math.round(flow)} l/h).`);
  }
  if (!messages.length) messages.push("Brunnenleistung liegt im konfigurierten Normalbereich.");
  return { level, messages };
}

export function buildRecommendation(state) {
  const balance = calculateWaterBalance(state);
  const enabledZones = state.zones.filter(z => z.enabled !== false);
  const sorted = [...enabledZones].sort((a, b) =>
    (b.priority ?? priorityWeights[b.category] ?? 0) - (a.priority ?? priorityWeights[a.category] ?? 0)
  );
  const critical = balance.days < 1.5;
  const selected = critical ? sorted.filter(z => (z.priority ?? 0) >= 75) : sorted;

  return {
    level: balance.days < 0.75 ? "danger" : balance.days < 2.5 ? "warn" : "ok",
    headline: balance.days === Infinity
      ? "Kein Bedarf hinterlegt"
      : `Reserve reicht rechnerisch fuer ${balance.days.toFixed(1)} Tage.`,
    text: critical
      ? "Wasser ist knapp. Zuerst Blumen, Kuebel, Gemuese und Jungpflanzen versorgen; Rasen zurueckstellen."
      : "Die aktuelle Reserve deckt den hinterlegten Bedarf. Wetter und reale Foerdermengen weiter beobachten.",
    selectedZoneIds: selected.map(z => z.id)
  };
}
