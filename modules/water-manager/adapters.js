export class PumpLabelRecognitionAdapter {
  async analyzeImage(file) {
    if (!file) throw new Error("Kein Bild ausgewaehlt.");
    return {
      status: "needs-confirmation",
      manufacturer: "",
      model: "",
      ratedFlowLph: null,
      maxHeadMeters: null,
      note: "OCR-/KI-Dienst ist in V0.1.0 noch nicht angebunden. Werte muessen bestaetigt werden."
    };
  }
}

export class PumpCatalogAdapter {
  async lookup({ manufacturer, model }) {
    return {
      status: "not-connected",
      query: `${manufacturer || ""} ${model || ""}`.trim(),
      candidates: []
    };
  }
}

export class WeatherAdapter {
  async getForecast() {
    return {
      status: "not-connected",
      precipitationMm: null,
      evapotranspirationMm: null
    };
  }
}
