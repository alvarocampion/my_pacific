# Pacific Climate Riks dataviz

This repository contains Pacific Climate Risk dataviz created for the Pacific Dataviz Challenge edition 2026.

The visualization highlights sea level rise trends and regional resilience across the Pacific, linking sustainable development indicators with population exposure in low-elevation coastal zones to assess climate risks and vulnerability.

pacific dataviz preprocessing.ipynb notebook contains the code used for the datasets preprocessing.
Dataviz combines different datasets from official list of datasets for the challenge and two additional ones related with the challenge theme that is Climate Change.

Input datasets from official datasets in Pacific dataviz challenge, 2026 edition [Pacific Dataviz Challenge 2026](https://pacificdatavizchallenge.org/):
- Population growth
- Crop yield
- Livestock yield
- Sea level anomalies
- Tourist arrivals

<br>
Other datasets:

- Global Mean Sea Level from [NASA Sea Level Change Portal](https://sealevel.nasa.gov/). Link to [Dataset](https://archive.podaac.earthdata.nasa.gov/podaac-ops-cumulus-protected/NASA_SSH_GMSL_INDICATOR/NASA_SSH_GMSL_INDICATOR.txt)
- Population living in low elevation coastal zones (0-10m and 0-20m above sea level) from [Pacific Environment Data Portal](https://pacific-data.sprep.org/dataset/population-living-low-elevation-coastal-zones-0-10m-and-0-20m-above-sea-level). Link to [Dataset](https://pacific-data.sprep.org/resource/population-living-low-elevation-coastal-zones-0-10m-and-0-20m-above-sea-level-data-0)


Dataviz implementation uses D3 + React and has responsiveness features, in wider screens there are some dynamic features while in narrow screens it converts to static.
In the dynamic version the visualization has 3 columns (A, B, C) and 2 rows (1, 2) where the different elements are placed. The key figures are in cells B1, B2. B1 includes two bars where the Global Sea Level trends and the Pacific Local observations are presented as a heatmap. In B2 there is a radial plot where the trends in the Development Sustainability indicators for each region and the all region are represented as a sparklines, together with the population for each region and portion in low elevation coastal zones as doughnut charts.
Cells A1, A2, C1, and C2 are static cards covering the headlines for the different observations in the dataviz, and when there is hover effect on them they produce additional visualization in B1 or B2 depending the topic.

In the static format, it starts showing the key figures in B1 and B2, and it continues by the card cells together with their additional subplot that is created in the dynamic version when hover.

Dataviz URL:
[https://alvarocampion.github.io/my_pacific/](https://alvarocampion.github.io/my_pacific/)


