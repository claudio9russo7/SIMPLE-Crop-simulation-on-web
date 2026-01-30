// --- UI helpers
  function bindRange(id, outId){
    const el = document.getElementById(id);
    const out = document.getElementById(outId);
    const upd = () => out.textContent = el.value;
    el.addEventListener('input', upd);
    upd();
    return el;
  }

    const tmaxMultEl = bindRange('tmaxMult', 'vTmaxMult', (v)=>Number(v).toFixed(2));
    const tminMultEl = bindRange('tminMult', 'vTminMult', (v)=>Number(v).toFixed(2));
    const c02ppmEl   = bindRange('c02ppm', 'vC02ppm');

    const statusEl = document.getElementById('status');
    const logEl = document.getElementById('log');

    const btnInit = document.getElementById('btnInit');
    const btnRun  = document.getElementById('btnRun');
    const btnReset= document.getElementById('btnReset');
  // --- Crop selection UI
    const speciesSelect = document.getElementById('speciesSelect');
    const cultivarSelect = document.getElementById('cultivarSelect');
    const cropInfoEl = document.getElementById('cropInfo');
    const speciesGrid = document.getElementById('speciesGrid');
    const cultivarGrid = document.getElementById('cultivarGrid');
    const btnSaveCultivar = document.getElementById('btnSaveCultivar');
    const btnExportCultivar = document.getElementById('btnExportCultivar');

    const SPECIES_KEYS = ["tbase","topt","solar_max","rue","theat","textreme","sc02","swater","i50b_max_heat","i50b_max_water","generic_root_uptake"];
    const CULTIVAR_KEYS = ["tsum","hi","i50a","i50b0"];

    const REQUIRED_PARAM_KEYS = ["tbase","topt","tsum","solar_max","i50a","rue","hi","theat","textreme","sc02","swater","i50b_max_heat","i50b_max_water","generic_root_uptake"];
    const unlockSpeciesEl = document.getElementById('unlockSpecies');

function applySpeciesLock(){
  const unlocked = unlockSpeciesEl.checked;
  speciesGrid.querySelectorAll('input').forEach(inp => {
    inp.disabled = !unlocked;
  });
}
unlockSpeciesEl.addEventListener('change', applySpeciesLock);
    let speciesCatalog = [];
    let cultivarCatalog = [];
    let currentSpecies = null;
    let currentCultivar = null;
    function loadUserCultivars(){
  try { return JSON.parse(localStorage.getItem("user_cultivars") || "[]"); }
  catch { return []; }
}
function saveUserCultivars(list){
  localStorage.setItem("user_cultivars", JSON.stringify(list));
}

function renderGrid(gridEl, keys, obj, prefix){
  gridEl.innerHTML = "";
  for (const k of keys){
    const label = document.createElement("span");
    label.textContent = k;
    gridEl.appendChild(label);

    const inp = document.createElement("input");
    inp.type = "number";
    inp.id = `${prefix}${k}`;
    inp.value = (obj.params?.[k] ?? 0);

    const r = obj.ranges?.[k];
    if (r){
      if (r.min !== undefined) inp.min = r.min;
      if (r.max !== undefined) inp.max = r.max;
      if (r.step !== undefined) inp.step = r.step;
    }
    gridEl.appendChild(inp);
  }
}

function setSpecies(id){
  currentSpecies = speciesCatalog.find(s => s.id === id) || speciesCatalog[0];
  speciesSelect.value = currentSpecies.id;
  renderGrid(speciesGrid, SPECIES_KEYS, currentSpecies, "sp_");
  applySpeciesLock();
  rebuildCultivarSelect(); // filtra cultivar
}

function rebuildCultivarSelect(){
  const all = [...cultivarCatalog, ...loadUserCultivars()];
  const filtered = all.filter(c => c.species_id === currentSpecies.id);

  cultivarSelect.innerHTML = "";
  for (const c of filtered){
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.label;
    cultivarSelect.appendChild(opt);
  }

  if (filtered.length){
    setCultivar(filtered[0].id);
  } else {
    currentCultivar = null;
    cultivarGrid.innerHTML = "<div class='tiny'>Nessuna cultivar per questa specie.</div>";
  }
}

function setCultivar(id){
  const all = [...cultivarCatalog, ...loadUserCultivars()];
  currentCultivar = all.find(c => c.id === id);
  if (!currentCultivar) return;

  cultivarSelect.value = currentCultivar.id;
  renderGrid(cultivarGrid, CULTIVAR_KEYS, currentCultivar, "cv_");
  cropInfoEl.textContent = `Specie: ${currentSpecies.label} • Cultivar: ${currentCultivar.label}`;
}

speciesSelect.addEventListener("change", () => setSpecies(speciesSelect.value));
cultivarSelect.addEventListener("change", () => setCultivar(cultivarSelect.value));

async function loadSpeciesAndCultivars(){
  const [sRes, cRes] = await Promise.all([
    fetch("crops/species.json", {cache:"no-store"}),
    fetch("crops/cultivars.json", {cache:"no-store"})
  ]);
  if (!sRes.ok) throw new Error("Non trovo crops/species.json");
  if (!cRes.ok) throw new Error("Non trovo crops/cultivars.json");

  speciesCatalog = await sRes.json();
  cultivarCatalog = await cRes.json();

  speciesSelect.innerHTML = "";
  for (const s of speciesCatalog){
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.label;
    speciesSelect.appendChild(opt);
  }
  if (speciesCatalog.length) setSpecies(speciesCatalog[0].id);
}

loadSpeciesAndCultivars().catch(e => {
  console.error(e);
  cropInfoEl.textContent = "Errore caricando specie/cultivar.";
});

const meteoSelectEl = document.getElementById('meteoSelect');
const btnLoadMeteo  = document.getElementById('btnLoadMeteo');
const btnClearCsv   = document.getElementById('btnClearCsv');
const csvInfoEl     = document.getElementById('csvInfo');



  const kTT=document.getElementById('kTT');
  const kBio=document.getElementById('kBio');
  const kFsol=document.getElementById('kFsol');
  const kFw=document.getElementById('kFw');
  const kFh=document.getElementById('kFh');

  // --- Chart and Meteo Chart
  let chartBio, chartStress;
  function initBioChart(){
    chartBio = new Chart(document.getElementById('chartBio'), {

        type: 'line',
        data: {labels: [], datasets: [] },
        options: { animation:false, responsive:true, maintainAspectRatio:false,
            scales: { y: {beginAtZero: true, title:{display:true, text:'Biomassa (t/ha)'}}
        }}
        });
    }

function initStressChart(){

    chartStress = new Chart(document.getElementById('chartStress'), {
        type: 'line',
        data: { labels: [], datasets: [
        { label:'fw', data: [], pointRadius:0 },
        { label:'fh', data: [], pointRadius:0 },
        { label:'arid', data: [], pointRadius:0 },
        ]},
        options: { animation:false, responsive:true, maintainAspectRatio:false }
        });
}

  let meteoChart;
  function initMeteoChart(){
  const ctx = document.getElementById('meteoChart');
  meteoChart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [
      { label: 'Tmean', data: [], pointRadius: 0 },
      { label: 'Tmax',  data: [], pointRadius: 0 },
      { label: 'ET0',   data: [], pointRadius: 0 },
    ]},
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { ticks: { maxTicksLimit: 8 } } },
      plugins: { legend: { labels: { color: '#e6eefc' } } }
    }
  });
 }
    let yieldChart = null;
    const yieldLabels = [];
    const yieldValues = [];
function initYieldChart(){
  const ctx = document.getElementById('yieldChart');
  if (!ctx) return;

  yieldChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: yieldLabels,
      datasets: [{
        label: 'Resa (t/ha)',
        data: yieldValues
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 't/ha' } }
      }
    }
  });
}
  // --- Yield calculation
function computeYieldTperHaFromResults(results){
  if (!results?.length) return 0;

  const finalBio_gm2 = results[results.length - 1].biomass ?? 0;
  const HI = Number(document.getElementById('cv_hi')?.value ?? 0.30);

  // resa da biomassa finale
  const yield_t_ha = finalBio_gm2 * HI * 0.01;
  return yield_t_ha;
}

  
  // --- Pyodide + model
  let pyodide = null;
  let results = [];
  let playing = false;
  let frame = 0;

  const kDate  = document.getElementById('kDate');
  const kTmean = document.getElementById('kTmean');
  const kTmax  = document.getElementById('kTmax');
  const kEt0   = document.getElementById('kEt0');

    function updateMeteoKVs(i){
        if (!activeForcings?.length) return;
        const w = activeForcings[Math.min(i, activeForcings.length-1)];
        const label = (datesUsed && datesUsed[i]) ? datesUsed[i] : `Day ${i+1}`;
        kDate.textContent  = label;
        kTmean.textContent = (w.tmean ?? 0).toFixed(1);
        kTmax.textContent  = (w.tmax ?? 0).toFixed(1);
        kEt0.textContent   = (w.et0 ?? 0).toFixed(2);
    }



  // CSV override
  let forcingsFromCsv = null;
  let datesFromCsv = null;
  let csvHasEt0 = false;

  function detectDelimiter(firstLine){
    return firstLine.includes(';') ? ';' : ',';
  }
  function toNum(x){
    if (x === undefined || x === null) return NaN;
    return Number(String(x).trim().replace(',', '.'));
  }

  function parseCsvToForcings(text){
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length>0);
    if (lines.length < 2) throw new Error("CSV troppo corto.");

    const delim = detectDelimiter(lines[0]);
    const header = lines[0].split(delim).map(h => h.trim());
    const idx = Object.fromEntries(header.map((h,i)=>[h,i]));
    const has = (c) => idx[c] !== undefined;
    csvHasEt0 = has("et0");
    const get = (row, c, fb=null) => has(c) ? row[idx[c]] : fb;

    if (!has("T_max") || !has("T_min") || !has("Radiation")){
      throw new Error("Mancano colonne minime: T_max, T_min, Radiation.");
    }

    const forcings = [];
    const dates = [];

    for (let i=1; i<lines.length; i++){
      const row = lines[i].split(delim);
      const tmax = toNum(get(row,"T_max"));
      const tmin = toNum(get(row,"T_min"));
      const tmean = (tmax + tmin) / 2;

      const rad = toNum(get(row,"Radiation"));
      const precp = toNum(get(row,"Precp", 0)) || 0;
      const irr = toNum(get(row,"irr", 0)) || 0;
      const c02 = toNum(get(row,"c02", 400)) || 400;

      let et0 = has("et0") ? toNum(get(row,"et0")) : (0.0135 * (tmean + 17.8) * (rad * 0.408));

      if ([tmax,tmin,rad,et0].some(v => Number.isNaN(v))) continue;

      forcings.push({tmin, tmean, tmax, rad, et0, precp, irr, c02});
      dates.push(get(row,"Date", String(i)));
    }

    if (!forcings.length) throw new Error("Nessuna riga valida nel CSV.");
    return {forcings, dates};
  }
let sowingIndex = 0;      // 0-based
let datesUsed = null;     // etichette per grafici (dopo la semina)
let activeForcings = null;

const sowDateEl = document.getElementById('sowDate');
const sowIdxEl  = document.getElementById('sowIdx');
const sowInfoEl = document.getElementById('sowInfo');

function parseDateLoose(s){
  if (!s) return null;
  const t = String(s).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return new Date(t + 'T00:00:00');
  // YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(t)) return new Date(t.replaceAll('/','-') + 'T00:00:00');
  // DD/MM/YYYY
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`);

  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function findClosestDateIndex(dates, targetDate){
  const tgt = targetDate.getTime();
  let best = 0, bestDiff = Infinity;
  for (let i=0; i<dates.length; i++){
    const di = parseDateLoose(dates[i]);
    if (!di) continue;
    const diff = Math.abs(di.getTime() - tgt);
    if (diff < bestDiff){ bestDiff = diff; best = i; }
  }
  return best;
}

function updateSowingInfo(){
  if (!datesFromCsv?.length) {
    sowInfoEl.textContent = 'Carica un meteo per scegliere la semina.';
    return;
  }
  sowInfoEl.textContent = `Semina: riga ${sowingIndex+1} (${datesFromCsv[sowingIndex] ?? ''})`;
}


  async function initPyodideAndLoadModel(){
    statusEl.textContent = 'Carico Pyodide… (può richiedere un po\' al primo avvio)';
    pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.2/full/' });
    await pyodide.loadPackage(['numpy']);

    // Scrive i tuoi moduli Python nel filesystem virtuale di Pyodide
    const base = '/home/pyodide';
    const files = ['functions.py','soil_water_module.py','core.py'];
    for (const f of files){
      const txt = await (await fetch(f)).text();
      pyodide.FS.writeFile(`${base}/${f}`, txt);
    }

    // abilita import dai file che abbiamo scritto
    pyodide.runPython(`
import sys
if '/home/pyodide' not in sys.path:
    sys.path.insert(0, '/home/pyodide')

import core
from core import Parameters, Soil, State, simulate

def run_sim(forcings, params, soil, state0):
    p = Parameters(**params)
    so = Soil(**soil)
    s0 = State(**state0)
    out = simulate(forcings, s0, p, so)
    # aggiungo day index per comodità lato JS
    for i, row in enumerate(out, start=1):
        row['_day'] = i
    return out
`);

    statusEl.textContent = 'Pronto ✅';
    logEl.innerHTML = 'Pyodide inizializzato. Moduli caricati: <code>core.py</code>, <code>functions.py</code>, <code>soil_water_module.py</code>.';

    btnRun.disabled = false;
    btnReset.disabled = false;
    btnInit.disabled = true;

    if(!chartBio) initBioChart();
    if(!chartStress) initStressChart();
    if (!meteoChart) initMeteoChart();
    initYieldChart();
  }
  function applyScenario(days){
  const kMax = Number(tmaxMultEl.value);
  const kMin = Number(tminMultEl.value);
  const c02Override = Number(c02ppmEl.value);

  return days.map(d => {
    // sicurezza: se per qualche motivo manca tmin, lo ricostruisco da tmean e tmax
    const tmin0 = (d.tmin ?? (2*d.tmean - d.tmax));
    const tmax0 = d.tmax;

    const tmax = tmax0 * kMax;
    const tmin = tmin0 * kMin;
    const tmean = (tmax + tmin) / 2;

    // ET0: scelta bilanciata:
    // - se nel CSV c'è et0, la tengo (per non distruggere un'et0 osservata)
    // - se NON c'è, la ricalcolo coerentemente (Hargreaves semplificato)
    const et0 = csvHasEt0
      ? d.et0
      : (0.0135 * (tmean + 17.8) * (d.rad * 0.408));

    return { ...d, tmin, tmax, tmean, et0, c02: c02Override };
  });
}
  function buildForcings(){
  if (!forcingsFromCsv || !forcingsFromCsv.length) {
    datesUsed = null;
    return null;
  }

  const start = Math.max(0, Math.min(forcingsFromCsv.length - 1, sowingIndex || 0));
  const base = forcingsFromCsv.slice(start);

  datesUsed = datesFromCsv ? datesFromCsv.slice(start) : null;

  return applyScenario(base);
  }

  function buildParams(){
  const params = {};

  // specie: prendo i valori dagli input sp_*
  for (const k of SPECIES_KEYS){
    params[k] = Number(document.getElementById("sp_" + k).value);
  }
  // cultivar: prendo dai cv_* (tranne i50b0 che è stato)
  for (const k of CULTIVAR_KEYS){
    if (k === "i50b0") continue;
    params[k] = Number(document.getElementById("cv_" + k).value);
  }

  // sanity: controlla che ci siano tutti quelli richiesti da Parameters
  for (const k of REQUIRED_PARAM_KEYS){
    if (!(k in params)) throw new Error("Parametro mancante: " + k);
  }
  return params;
}

  function buildSoil(){
    return {
      // Nota: unità semplificate per demo (rootdepth=1 => mm restano mm)
      rootdepth: 1000.0,
      available_water: 0.12,
      curve_number: 10.0,
      maximum_soil_water_holding: 0.2,
      drainage_coefficient: 0.02
    };
  }

  function buildState0(soil){
  const i50b0 = Number(document.getElementById("cv_i50b0").value);
  return { tt: 0.0, biomass: 0.0, i50b: i50b0, available_water: soil.available_water };
}

  function jsFromPy(pyObj){
    // compat: alcune versioni espongono .toJs(), altre usano pyodide.ffi.toJs
    try {
      if (pyObj && typeof pyObj.toJs === 'function') {
        return pyObj.toJs({ dict_converter: Object.fromEntries });
      }
      if (pyodide && pyodide.ffi && typeof pyodide.ffi.toJs === 'function') {
        return pyodide.ffi.toJs(pyObj, { dict_converter: Object.fromEntries });
      }
    } catch (e) {
      console.warn('Conversione Py->JS fallita:', e);
    }
    return pyObj;
  }

  function runModel(){
    if (!pyodide) return;

    const forcings = buildForcings();
    if (!forcings) {
        logEl.textContent = 'Devi prima caricare un meteo CSV e selezionare una data di semina.';
        return;
    }
    activeForcings = forcings;
    const params = buildParams();
    const soil = buildSoil();
    const state0 = buildState0(soil);

    // passa oggetti JS a Python
    pyodide.globals.set('forcings', pyodide.toPy(forcings));
    pyodide.globals.set('params', pyodide.toPy(params));
    pyodide.globals.set('soil', pyodide.toPy(soil));
    pyodide.globals.set('state0', pyodide.toPy(state0));

    const pyRes = pyodide.runPython('run_sim(forcings, params, soil, state0)');
    results = jsFromPy(pyRes);
    if (pyRes && typeof pyRes.destroy === 'function') pyRes.destroy();

    if (!Array.isArray(results) || results.length === 0) {
      logEl.textContent = 'Nessun output (forse tsum troppo basso/alto o input incoerenti).';
      return;
    }
    const metSlice = activeForcings.slice(0, results.length);
    const labels = (datesUsed && datesUsed.length)
        ? datesUsed.slice(0, results.length)
        : results.map(r => r._day);
    meteoChart.data.labels = labels;
    meteoChart.data.datasets[0].data = metSlice.map(d => d.tmean);
    meteoChart.data.datasets[1].data = metSlice.map(d => d.tmax);
    meteoChart.data.datasets[2].data = metSlice.map(d => d.et0);
    meteoChart.update();
    
    // aggiorna chart con serie complete


    appendBiomassRun(results);
    function appendYieldBar(results){
        if (!yieldChart) return;

        const label = makeRunLabel();               // la stessa label che usi per le run
        const y = computeYieldTperHaFromResults(results);

        yieldLabels.push(label);
        yieldValues.push(Number(y.toFixed(2)));

        yieldChart.update();
}
    appendYieldBar(results);





    chartStress.data.labels = labels;
    chartStress.data.datasets[0].data = results.map(r => r.fw);
    chartStress.data.datasets[1].data = results.map(r => r.fh);
    chartStress.data.datasets[2].data = results.map(r => r.arid ?? 0);
    chartStress.update();

    frame = 0;
    playing = false;


    logEl.innerHTML = `Simulazione completata: <b>${results.length}</b> giorni (stop quando TT >= tsum).`;
    updateMeteoKVs(0);
    // --- aggiorna grafico meteo (solo dopo Run, quando activeForcings esiste)
    if (meteoChart && activeForcings && results.length) {
      const metSlice = activeForcings.slice(0, results.length);

      const labels = (datesUsed && datesUsed.length)
        ? datesUsed.slice(0, results.length)
        : results.map(r => r._day);

      meteoChart.data.labels = labels;
      meteoChart.data.datasets[0].data = metSlice.map(d => d.tmean);
      meteoChart.data.datasets[1].data = metSlice.map(d => d.tmax);
      meteoChart.data.datasets[2].data = metSlice.map(d => d.et0);
      meteoChart.update();
    }
  }
    
  
let runCount = 0;
const runPalette = ['#4dc9f6','#f67019','#f53794','#537bc4','#acc236','#166a8f','#00a950','#8549ba'];
const btnClearRuns = document.getElementById('btnClearRuns');
if (btnClearRuns){
  btnClearRuns.addEventListener('click', () => {
    runCount = 0;
    if (chartBio){
      chartBio.data.labels = [];
      chartBio.data.datasets = [];
      chartBio.update();
    }
    btnClearRuns.disabled = true;
  });
}

function makeRunLabel(){
  const cv = currentCultivar?.label ?? 'Cultivar';
  const kMax = Number(tmaxMultEl.value).toFixed(2);
  const kMin = Number(tminMultEl.value).toFixed(2);
  const co2  = Number(c02ppmEl.value);
  return `${cv} (Tmax×${kMax}, Tmin×${kMin}, CO₂ ${co2})`;
}

function appendBiomassRun(results){
  const y = results.map(r => ((r.biomass ?? 0)*0.01));
  const label = makeRunLabel();
  const color = runPalette[runCount % runPalette.length];
  runCount += 1;

  chartBio.data.datasets.push({
    label,
    data: y.slice(),
    pointRadius: 0,
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2,
    spanGaps: true
  });

  // X = giorni dalla semina (così confronti anche runs diverse)
  const maxLen = Math.max(...chartBio.data.datasets.map(ds => ds.data.length));
  chartBio.data.labels = Array.from({length: maxLen}, (_,i) => i+1);

  // pad con null per lunghezze diverse
  for (const ds of chartBio.data.datasets){
    if (ds.data.length < maxLen){
      ds.data = ds.data.concat(Array(maxLen - ds.data.length).fill(null));
    }
  }

  chartBio.update();
  if (btnClearRuns) btnClearRuns.disabled = chartBio.data.datasets.length === 0;
}    






function resetAll(){
  results = [];
  activeForcings = null;
  datesUsed = null;

  runCount = 0;

  if (chartBio){
    chartBio.data.labels = [];
    chartBio.data.datasets = [];   
    chartBio.update();
  }
  if (btnClearRuns){
    btnClearRuns.disabled = true;
  }

  if (chartStress){
    chartStress.data.labels = [];
    chartStress.data.datasets.forEach(ds => ds.data = []);
    chartStress.update();
  }
  if (meteoChart){
    meteoChart.data.labels = [];
    meteoChart.data.datasets.forEach(ds => ds.data = []);
    meteoChart.update();
  }

  logEl.textContent = 'Reset fatto.';
  function clearYieldBars(){
  yieldLabels.length = 0;
  yieldValues.length = 0;
  if (yieldChart) yieldChart.update();
}
    clearYieldBars();
}

  // wire buttons
  btnInit.onclick = () => initPyodideAndLoadModel().catch(err => {
    console.error(err);
    statusEl.textContent = 'Errore init ❌';
    logEl.textContent = String(err);
  });
  btnRun.onclick = runModel;
  btnReset.onclick = resetAll;


  // --- CSV loader
  async function loadMeteoManifest(){
  // legge meteo/manifest.json e popola la dropdown
  const res = await fetch('meteo/manifest.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Non trovo meteo/manifest.json');
  const list = await res.json();

  meteoSelectEl.innerHTML = '';
  for (const item of list){
    const opt = document.createElement('option');
    opt.value = `meteo/${item.file}`;
    opt.textContent = item.label;
    meteoSelectEl.appendChild(opt);
  }
}
  btnLoadMeteo.onclick = async () => {
  const url = meteoSelectEl.value;
  if (!url) return;

  try {
    csvInfoEl.textContent = 'Carico meteo…';

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch fallito: ${url}`);
    const text = await res.text();

    const parsed = parseCsvToForcings(text);
    forcingsFromCsv = parsed.forcings;
    datesFromCsv = parsed.dates;
    // init semina
sowingIndex = 0;

// abilita riga
sowIdxEl.disabled = false;
sowIdxEl.max = String(datesFromCsv.length);
sowIdxEl.value = "1";

// abilita data solo se parsabile
const d0 = parseDateLoose(datesFromCsv[0]);
const dN = parseDateLoose(datesFromCsv[datesFromCsv.length - 1]);
if (d0 && dN){
  sowDateEl.disabled = false;
  sowDateEl.min = d0.toISOString().slice(0,10);
  sowDateEl.max = dN.toISOString().slice(0,10);
  sowDateEl.value = sowDateEl.min;
} else {
  sowDateEl.disabled = true;
  sowDateEl.value = "";
}

updateSowingInfo();

    csvInfoEl.textContent = `Meteo selezionato ✅ (${meteoSelectEl.selectedOptions[0].textContent}, ${forcingsFromCsv.length} righe). Premi Run.`;
    btnClearCsv.disabled = false;

  } catch (err) {
    console.error(err);
    csvInfoEl.textContent = 'Errore meteo ❌: ' + (err?.message ?? String(err));
  }
};
sowIdxEl.addEventListener('input', () => {
  if (!datesFromCsv?.length) return;

  sowingIndex = Math.max(
    0,
    Math.min(datesFromCsv.length - 1, Number(sowIdxEl.value) - 1)
  );

  // se la data è abilitata, prova a sincronizzarla
  if (!sowDateEl.disabled) {
    const d = parseDateLoose(datesFromCsv[sowingIndex]);
    if (d) sowDateEl.value = d.toISOString().slice(0, 10);
  }

  updateSowingInfo();
});

sowDateEl.addEventListener('change', () => {
  if (!datesFromCsv?.length) return;
  const d = parseDateLoose(sowDateEl.value);
  if (!d) return;

  sowingIndex = findClosestDateIndex(datesFromCsv, d);
  sowIdxEl.value = String(sowingIndex + 1);

  updateSowingInfo();
});





  btnClearCsv.onclick = () => {
  forcingsFromCsv = null;
  datesFromCsv = null;
  datesUsed = null;
  activeForcings = null;

  csvInfoEl.textContent = 'Nessun meteo selezionato. Selezionane uno e premi "Usa questo meteo".';
  btnClearCsv.disabled = true;
};
  loadMeteoManifest().catch(err => {
  console.error(err);
  csvInfoEl.textContent = 'Errore: impossibile caricare la lista meteo.';
});
btnSaveCultivar.addEventListener("click", () => {
  if (!currentSpecies) return;

  // crea un id semplice
  const nameEl = document.getElementById('newCultivarName');
  const rawName = (nameEl.value || '').trim();
  const label = rawName || `Nuova cultivar (${currentSpecies.label})`;

  const safe = label.toLowerCase()
   .replace(/[^a-z0-9]+/g, '_')
   .replace(/^_+|_+$/g, '');

const id = `${currentSpecies.id}_${safe}_${Date.now()}`;

  const newCv = {
    id,
    species_id: currentSpecies.id,
    label,
    params: {
      tsum: Number(document.getElementById("cv_tsum").value),
      hi: Number(document.getElementById("cv_hi").value),
      i50a: Number(document.getElementById("cv_i50a").value),
      i50b0: Number(document.getElementById("cv_i50b0").value)
    },
    ranges: currentCultivar?.ranges || {}
  };

  const user = loadUserCultivars();
  user.push(newCv);
  saveUserCultivars(user);
    nameEl.value = "";

  rebuildCultivarSelect();
  setCultivar(id);
});

btnExportCultivar.addEventListener("click", () => {
  if (!currentCultivar) return;

  // esporta SOLO la cultivar (come JSON)
  const blob = new Blob([JSON.stringify(currentCultivar, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${currentCultivar.id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});
