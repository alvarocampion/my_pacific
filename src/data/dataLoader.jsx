// src/data/dataLoader.jsx

import * as d3 from "d3";

export async function loadDatasets() {
  const [radarRows, seaGlobal, seaPacificRaw] = await Promise.all([
    d3.csv("/data/radar_consolidated_dataset.csv", d3.autoType),
    d3.csv("/data/global_sealevel_consolidated_dataset.csv", d3.autoType),
    d3.csv("/data/local_sealevel_consolidated_dataset.csv", d3.autoType)
  ]);


const seaPacific = seaPacificRaw.map(d => ({
  ...d,
  MEAN: d.MEAN * 100,
  P10: d.P10 * 100,
  P90: d.P90 * 100
}));
  const sustainByGeo = d3.group(radarRows, d => d.GEO_PICT);

  const geoCodes = [...sustainByGeo.keys()]
    .filter(code => code !== "ALL")
    .sort();

  return {
    seaGlobal,
    seaPacific,
    sustainRows: radarRows,
    sustainByGeo,
    geoCodes
  };
}