import {
  calculateWaterBalance,
  estimateRuntimeMinutes,
  effectivePumpFlow,
  analyzeWell,
  buildRecommendation,
  zoneDailyNeed
} from "./core.js";
import { loadState, saveState, resetState } from "./store.js";

let state = loadState();
let mounted = false;

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
}[c]));

function fmt(n, digits = 0) {
  return Number.isFinite(n) ? n.toLocaleString("de-DE", { maximumFractionDigits: digits }) : "-";
}

function sourceName(id) {
  return state.sources.find(s => s.id === id)?.name || "Keine Quelle";
}

function upsert(key, item) {
  const idx = state[key].findIndex(x => x.id === item.id);
  if (idx >= 0) state[key][idx] = item;
  else state[key].push(item);
  renderWaterManager();
}

function removeItem(key, id) {
  if (!confirm("Datensatz wirklich loeschen?")) return;
  state[key] = state[key].filter(x => x.id !== id);
  renderWaterManager();
}

function listCard(title, meta, badges, actions) {
  return `
    <article class="wm-card wm-list-card">
      <div>
        <h3>${esc(title)}</h3>
        <div class="wm-meta">${meta.map(esc).join("<span> · </span>")}</div>
        <p>${badges.join(" ")}</p>
      </div>
      <div class="wm-actions">${actions}</div>
    </article>`;
}

function fieldHtml(f, initial) {
  const val = initial[f.key] ?? "";
  if (f.type === "select") {
    return `
      <label class="wm-field">${esc(f.label)}
        <select name="${esc(f.key)}">
          ${f.options.map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(val) ? "selected" : ""}>${esc(o.label)}</option>`).join("")}
        </select>
      </label>`;
  }
  return `
    <label class="wm-field">${esc(f.label)}
      <input name="${esc(f.key)}" type="${esc(f.type || "text")}" value="${esc(val)}" ${f.min != null ? `min="${esc(f.min)}"` : ""}>
    </label>`;
}

function openEditor(title, schema, initial, onSave) {
  const dialog = document.getElementById("waterManagerDialog");
  const form = document.getElementById("waterManagerForm");
  document.getElementById("waterManagerDialogTitle").textContent = title;
  document.getElementById("waterManagerFields").innerHTML = schema.map(f => fieldHtml(f, initial)).join("");
  document.getElementById("waterManagerSave").onclick = event => {
    event.preventDefault();
    const fd = new FormData(form);
    const result = { ...initial };
    schema.forEach(f => {
      const raw = fd.get(f.key);
      result[f.key] = f.type === "number" ? Number(raw) : raw;
    });
    onSave(result);
    dialog.close();
  };
  dialog.showModal();
}

function editSource(id = "") {
  const initial = state.sources.find(x => x.id === id) || {
    id: crypto.randomUUID(),
    name: "",
    type: "IBC",
    capacityLiters: 1000,
    currentLiters: 0,
    reserveLiters: 0,
    priority: 1
  };
  openEditor(id ? "Wasserquelle bearbeiten" : "Wasserquelle hinzufuegen", [
    { key: "name", label: "Bezeichnung" },
    { key: "type", label: "Typ", type: "select", options: ["IBC", "Regentonne", "Zisterne", "Bohrbrunnen", "Leitungswasser", "Sonstige"].map(x => ({ value: x, label: x })) },
    { key: "capacityLiters", label: "Kapazitaet in Litern", type: "number", min: 0 },
    { key: "currentLiters", label: "Aktueller Fuellstand in Litern", type: "number", min: 0 },
    { key: "reserveLiters", label: "Nicht antastbare Reserve in Litern", type: "number", min: 0 },
    { key: "priority", label: "Entnahme-Prioritaet", type: "number", min: 1 }
  ], initial, result => upsert("sources", result));
}

function editPump(id = "") {
  const initial = state.pumps.find(x => x.id === id) || {
    id: crypto.randomUUID(),
    name: "",
    sourceId: state.sources[0]?.id || "",
    manufacturer: "",
    model: "",
    ratedFlowLph: 0,
    measuredFlowLph: 0,
    maxHeadMeters: 0,
    measuredPressureBar: 0,
    verification: "manual"
  };
  openEditor(id ? "Pumpe bearbeiten" : "Pumpe hinzufuegen", [
    { key: "name", label: "Bezeichnung" },
    { key: "sourceId", label: "Wasserquelle", type: "select", options: state.sources.map(s => ({ value: s.id, label: s.name })) },
    { key: "manufacturer", label: "Hersteller" },
    { key: "model", label: "Modell" },
    { key: "ratedFlowLph", label: "Nennfoerdermenge l/h", type: "number", min: 0 },
    { key: "measuredFlowLph", label: "Gemessene Foerdermenge l/h", type: "number", min: 0 },
    { key: "maxHeadMeters", label: "Maximale Foerderhoehe m", type: "number", min: 0 },
    { key: "measuredPressureBar", label: "Gemessener Druck bar", type: "number", min: 0 }
  ], initial, result => upsert("pumps", result));
}

function editZone(id = "") {
  const initial = state.zones.find(x => x.id === id) || {
    id: crypto.randomUUID(),
    name: "",
    category: "Rasen",
    areaM2: 0,
    targetMm: 5,
    priority: 50,
    enabled: true,
    irrigationType: ""
  };
  openEditor(id ? "Bewaesserungskreis bearbeiten" : "Bewaesserungskreis hinzufuegen", [
    { key: "name", label: "Bezeichnung" },
    { key: "category", label: "Kategorie", type: "select", options: ["Jungpflanzen", "Gemuese", "Kuebelpflanzen", "Blumen", "Hecke", "Rasen"].map(x => ({ value: x, label: x })) },
    { key: "areaM2", label: "Flaeche m2", type: "number", min: 0 },
    { key: "targetMm", label: "Wassermenge mm", type: "number", min: 0 },
    { key: "priority", label: "Prioritaet 1-100", type: "number", min: 1 },
    { key: "irrigationType", label: "Bewaesserungsart" }
  ], initial, result => upsert("zones", result));
}

function renderDashboard(root) {
  const b = calculateWaterBalance(state);
  const rec = buildRecommendation(state);
  const ibc = state.sources.find(s => s.type === "IBC");
  const ibcPump = state.pumps.find(p => p.sourceId === ibc?.id);
  const runtime = ibc && ibcPump ? estimateRuntimeMinutes(ibc.currentLiters, effectivePumpFlow(ibcPump)) : Infinity;
  const well = analyzeWell(state);

  root.querySelector("#wmKpiGrid").innerHTML = [
    ["Gesamtwasser", `${fmt(b.total)} l`],
    ["Nutzbar", `${fmt(b.usable)} l`],
    ["Tagesbedarf", `${fmt(b.dailyNeed)} l`],
    ["Reichweite", b.days === Infinity ? "-" : `${fmt(b.days, 1)} Tage`],
    ["IBC-Laufzeit", runtime === Infinity ? "-" : `${fmt(runtime, 1)} min`],
    ["Kreise", state.zones.filter(z => z.enabled !== false).length]
  ].map(([label, value]) => `<article class="wm-card wm-kpi"><span>${label}</span><strong>${value}</strong></article>`).join("");

  root.querySelector("#wmRecommendation").innerHTML = `
    <div class="wm-alert ${rec.level}">
      <strong>${esc(rec.headline)}</strong>
      <p>${esc(rec.text)}</p>
    </div>
    ${runtime < 20 ? `<div class="wm-alert warn"><strong>IBC-Hinweis:</strong> Ein voller 1000-l-IBC kann bei dieser Pumpe rechnerisch in rund ${fmt(runtime, 1)} Minuten leer sein.</div>` : ""}
    <div class="wm-alert ${well.level}"><strong>Brunnenanalyse</strong>${well.messages.map(m => `<p>${esc(m)}</p>`).join("")}</div>`;

  root.querySelector("#wmPriorityList").innerHTML = [...state.zones]
    .sort((a, b2) => (b2.priority || 0) - (a.priority || 0))
    .map(z => `<p><span class="wm-badge">Prioritaet ${esc(z.priority)}</span> ${esc(z.name)} · ${fmt(zoneDailyNeed(z))} l/Tag</p>`)
    .join("") || "<p>Noch keine Bewaesserungskreise vorhanden.</p>";
}

function renderLists(root) {
  root.querySelector("#wmSourcesList").innerHTML = state.sources.map(s => listCard(
    s.name,
    [s.type, `aktuell ${fmt(Number(s.currentLiters))} l`, `Reserve ${fmt(Number(s.reserveLiters))} l`, s.capacityLiters ? `${fmt((Number(s.currentLiters) / Number(s.capacityLiters)) * 100)} % gefuellt` : "ohne festen Speicher"],
    [`<span class="wm-badge">${esc(s.type)}</span>`],
    `<button class="btn" data-wm-edit-source="${esc(s.id)}">Bearbeiten</button><button class="btn danger" data-wm-del-source="${esc(s.id)}">Loeschen</button>`
  )).join("") || "<div class='wm-card'>Noch keine Wasserquelle vorhanden.</div>";

  root.querySelector("#wmPumpsList").innerHTML = state.pumps.map(p => {
    const flow = effectivePumpFlow(p);
    const warn = p.measuredPressureBar > 0 && p.measuredPressureBar < 1.5;
    return listCard(
      p.name,
      [sourceName(p.sourceId), `${fmt(flow)} l/h wirksam`, `${fmt(Number(p.measuredPressureBar), 1)} bar gemessen`, p.verification || "unbestaetigt"],
      [`<span class="wm-badge ${warn ? "danger" : "ok"}">${warn ? "Druck zu niedrig" : "Betriebsdaten"}</span>`],
      `<button class="btn" data-wm-edit-pump="${esc(p.id)}">Bearbeiten</button><button class="btn danger" data-wm-del-pump="${esc(p.id)}">Loeschen</button>`
    );
  }).join("") || "<div class='wm-card'>Noch keine Pumpe vorhanden.</div>";

  root.querySelector("#wmZonesList").innerHTML = state.zones.map(z => listCard(
    z.name,
    [z.category, `${fmt(Number(z.areaM2))} m2`, `${fmt(Number(z.targetMm), 1)} mm`, `${fmt(zoneDailyNeed(z))} l je Bewaesserung`, z.irrigationType],
    [`<span class="wm-badge">${z.enabled === false ? "pausiert" : "aktiv"}</span>`, `<span class="wm-badge">Prioritaet ${esc(z.priority)}</span>`],
    `<button class="btn" data-wm-edit-zone="${esc(z.id)}">Bearbeiten</button><button class="btn danger" data-wm-del-zone="${esc(z.id)}">Loeschen</button>`
  )).join("") || "<div class='wm-card'>Noch kein Bewaesserungskreis vorhanden.</div>";
}

function renderAssistant(root) {
  const missing = [];
  if (!state.sources.length) missing.push("Mindestens eine Wasserquelle anlegen.");
  if (!state.pumps.length) missing.push("Mindestens eine Pumpe erfassen.");
  if (!state.zones.length) missing.push("Mindestens einen Bewaesserungskreis anlegen.");
  const complete = 3 - missing.length;
  root.querySelector("#wmAssistant").innerHTML = `
    <h3>Einrichtungsstand ${complete}/3</h3>
    <div class="wm-progress"><span style="width:${complete / 3 * 100}%"></span></div>
    ${missing.length ? missing.map(m => `<p>□ ${esc(m)}</p>`).join("") : "<p>✓ Grundkonfiguration vollstaendig.</p>"}
    <p><strong>Naechster sinnvoller Schritt:</strong> Reale Fuellstaende, gemessene Foerdermengen und Bedarf je Flaeche eintragen.</p>
    <p class="subtle">Sicherheitsregel: Keine automatische Pumpen- oder Ventilschaltung in dieser Version.</p>`;
}

function bindActions(root) {
  root.querySelectorAll("[data-wm-edit-source]").forEach(b => b.onclick = () => editSource(b.dataset.wmEditSource));
  root.querySelectorAll("[data-wm-del-source]").forEach(b => b.onclick = () => removeItem("sources", b.dataset.wmDelSource));
  root.querySelectorAll("[data-wm-edit-pump]").forEach(b => b.onclick = () => editPump(b.dataset.wmEditPump));
  root.querySelectorAll("[data-wm-del-pump]").forEach(b => b.onclick = () => removeItem("pumps", b.dataset.wmDelPump));
  root.querySelectorAll("[data-wm-edit-zone]").forEach(b => b.onclick = () => editZone(b.dataset.wmEditZone));
  root.querySelectorAll("[data-wm-del-zone]").forEach(b => b.onclick = () => removeItem("zones", b.dataset.wmDelZone));
}

function shell(root) {
  root.innerHTML = `
    <style>
      .wm-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid var(--border);border-radius:10px;background:#eef8f0;padding:12px;margin-bottom:12px}
      .wm-hero h2{margin:0 0 4px;color:var(--primary)}
      .wm-mode-note{font-size:12px;color:var(--muted)}
      .wm-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:8px;margin-bottom:10px}
      .wm-card{background:#fff;border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px}
      .wm-kpi span{display:block;color:var(--muted);font-size:12px}.wm-kpi strong{display:block;font-size:22px;color:var(--primary);margin-top:3px}
      .wm-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.wm-list-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:start}
      .wm-list-card h3{margin:0 0 5px}.wm-meta{display:flex;gap:6px;flex-wrap:wrap;color:var(--muted);font-size:12px}
      .wm-actions{display:flex;gap:6px;flex-wrap:wrap}.wm-badge{display:inline-block;border-radius:999px;background:#e7f1f5;padding:3px 7px;font-size:11px;font-weight:800}.wm-badge.ok{background:#dcfce7}.wm-badge.danger{background:#f8d7da}
      .wm-alert{border-radius:8px;padding:9px;margin-bottom:8px}.wm-alert.ok{background:#dcfce7}.wm-alert.warn{background:#fff3cd}.wm-alert.danger{background:#f8d7da}.wm-alert.info{background:#dbeafe}
      .wm-progress{height:9px;background:#e5edf1;border-radius:999px;overflow:hidden;margin:8px 0}.wm-progress span{display:block;height:100%;background:var(--primary)}
      .wm-section-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 0 8px}.wm-section-head h3{margin:0}
      .wm-field{display:grid;gap:4px;margin:8px 0;font-weight:700}.wm-field input,.wm-field select{padding:8px;border:1px solid var(--border);border-radius:7px}
      .wm-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}#waterManagerDialog{border:0;border-radius:12px;max-width:620px;width:calc(100% - 24px)}#waterManagerDialog form{padding:14px}
      @media(max-width:850px){.wm-grid-2,.wm-list-card{grid-template-columns:1fr}.wm-hero{grid-template-columns:1fr}.wm-actions .btn{flex:1 1 120px}}
    </style>
    <div class="wm-hero">
      <div>
        <h2>WaterManagerCore</h2>
        <div class="wm-mode-note">Expertenmodul fuer IBC, Brunnen, Pumpen, Bewaesserungskreise, Reserve und Reichweite.</div>
      </div>
      <span class="badge warn">Nur Expertenmodus</span>
    </div>
    <div class="toolbar">
      <button class="btn primary" id="wmAddSource">Quelle</button>
      <button class="btn primary" id="wmAddPump">Pumpe</button>
      <button class="btn primary" id="wmAddZone">Kreis</button>
      <button class="btn" id="wmExport">Export</button>
      <label class="btn">Import<input id="wmImport" type="file" accept="application/json" hidden></label>
      <button class="btn danger" id="wmReset">Demo zuruecksetzen</button>
    </div>
    <div id="wmKpiGrid" class="wm-kpi-grid"></div>
    <div class="wm-grid-2">
      <section class="wm-card"><h3>Empfehlung</h3><div id="wmRecommendation"></div></section>
      <section class="wm-card"><h3>Prioritaeten</h3><div id="wmPriorityList"></div></section>
    </div>
    <section class="wm-card"><h3>Einrichtungsassistent</h3><div id="wmAssistant"></div></section>
    <div class="wm-section-head"><h3>Wasserquellen</h3><button class="btn" onclick="window.WaterManagerIntegration.editSource()">Quelle hinzufuegen</button></div>
    <div id="wmSourcesList"></div>
    <div class="wm-section-head"><h3>Pumpen</h3><button class="btn" onclick="window.WaterManagerIntegration.editPump()">Pumpe hinzufuegen</button></div>
    <div class="recommendation"><b>Typenschild-Assistent vorbereitet:</b> Foto/OCR und Pumpenkatalog sind als Adapter hinterlegt. Technische Werte muessen vor Nutzung bestaetigt werden.</div>
    <div id="wmPumpsList"></div>
    <div class="wm-section-head"><h3>Bewaesserungskreise</h3><button class="btn" onclick="window.WaterManagerIntegration.editZone()">Kreis hinzufuegen</button></div>
    <div id="wmZonesList"></div>
    <dialog id="waterManagerDialog">
      <form method="dialog" id="waterManagerForm">
        <h3 id="waterManagerDialogTitle">Datensatz</h3>
        <div id="waterManagerFields"></div>
        <div class="wm-dialog-actions">
          <button class="btn" value="cancel">Abbrechen</button>
          <button class="btn primary" id="waterManagerSave" value="default">Speichern</button>
        </div>
      </form>
    </dialog>`;

  root.querySelector("#wmAddSource").onclick = () => editSource();
  root.querySelector("#wmAddPump").onclick = () => editPump();
  root.querySelector("#wmAddZone").onclick = () => editZone();
  root.querySelector("#wmReset").onclick = () => {
    if (confirm("Demo-Daten zuruecksetzen?")) {
      state = resetState();
      renderWaterManager();
    }
  };
  root.querySelector("#wmExport").onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "water-manager-config.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  root.querySelector("#wmImport").onchange = async event => {
    try {
      state = JSON.parse(await event.target.files[0].text());
      renderWaterManager();
    } catch {
      alert("Die Datei konnte nicht importiert werden.");
    }
  };
}

export function renderWaterManager() {
  const root = document.getElementById("waterManagerApp");
  if (!root) return;
  if (!mounted) {
    shell(root);
    mounted = true;
  }
  saveState(state);
  renderDashboard(root);
  renderLists(root);
  renderAssistant(root);
  bindActions(root);
}

window.WaterManagerIntegration = {
  render: renderWaterManager,
  editSource,
  editPump,
  editZone
};
