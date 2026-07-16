const KEY = "water-manager-core-v0.1.0";

export const demoState = {
  metadata: { version: "0.1.0", status: "Architecture Candidate" },
  sources: [
    { id: "src-ibc-1", name: "IBC Vorgarten", type: "IBC", capacityLiters: 1000, currentLiters: 1000, reserveLiters: 300, priority: 1 },
    { id: "src-well-1", name: "Bohrbrunnen", type: "Bohrbrunnen", capacityLiters: 0, currentLiters: 0, reserveLiters: 0, priority: 2, depthMeters: 14, intakeDepthMeters: 12 }
  ],
  pumps: [
    { id: "pump-ibc-1", name: "Gartenpumpe am IBC", sourceId: "src-ibc-1", manufacturer: "Unbestaetigt", model: "Typenschild-Foto", ratedFlowLph: 4600, measuredFlowLph: 0, maxHeadMeters: 48, measuredPressureBar: 0, verification: "manual-photo" },
    { id: "pump-well-1", name: "Bohrlochpumpe", sourceId: "src-well-1", manufacturer: "Unbekannt", model: "Unbekannt", ratedFlowLph: 0, measuredFlowLph: 430, maxHeadMeters: 0, measuredPressureBar: 0.3, verification: "manual" }
  ],
  zones: [
    { id: "zone-1", name: "Blumen und Kuebel", category: "Blumen", areaM2: 18, targetMm: 6, priority: 90, enabled: true, irrigationType: "Schlauch/Giesskanne" },
    { id: "zone-2", name: "Suedlicher Vorgarten", category: "Rasen", areaM2: 65, targetMm: 10, priority: 35, enabled: true, irrigationType: "Hunter Pro-Spray" }
  ],
  settings: { safetyReservePercent: 20, weatherAdjustment: 1 }
};

export function loadState() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || structuredClone(demoState);
  } catch {
    return structuredClone(demoState);
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState() {
  const state = structuredClone(demoState);
  saveState(state);
  return state;
}
