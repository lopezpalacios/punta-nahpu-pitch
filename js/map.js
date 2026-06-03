/* ============================================================
   PUNTA NAHPU — Interactive location map (Leaflet + CARTO dark)
   ============================================================ */

const MAP_DATA = {
  project: {
    // Centroid + boundary polygon from the MIA (SEMARNAT filing), UTM 16N WGS84 -> WGS84
    coords: [20.738756, -86.993164],
    polygon: [
      [20.739930, -86.996812],
      [20.740681, -86.995108],
      [20.738750, -86.991917],
      [20.738561, -86.992354],
      [20.737582, -86.990738],
      [20.737030, -86.992057]
    ]
  },
  pois: [
    { coords: [21.0365, -86.8771], key: "poi_airport",   en: "Cancún International Airport — 30 min",      es: "Aeropuerto Internacional de Cancún — 30 min" },
    { coords: [20.8480, -86.8760], key: "poi_pm",        en: "Puerto Morelos · National Reef Park — 10 min", es: "Puerto Morelos · Parque Nacional Arrecife — 10 min" },
    { coords: [20.6850, -86.9600], key: "poi_mayakoba",  en: "Mayakoba · Etéreo Auberge — 4 min",           es: "Mayakoba · Etéreo Auberge — 4 min" },
    { coords: [20.7150, -86.9460], key: "poi_maroma",    en: "Maroma Beach · St. Regis · Belmond",          es: "Playa Maroma · St. Regis · Belmond" },
    { coords: [20.6296, -87.0739], key: "poi_playa",     en: "Playa del Carmen — 9 min",                    es: "Playa del Carmen — 9 min" },
    { coords: [20.6490, -87.1050], key: "poi_tren",      en: "Maya Train Station — 12 min",                 es: "Estación Tren Maya — 12 min" }
  ]
};

let projectMap = null;

function initMap() {
  const el = document.getElementById("projectMap");
  if (!el || typeof L === "undefined") return;

  projectMap = L.map("projectMap", {
    scrollWheelZoom: false,       // don't hijack page scroll
    zoomControl: true,
    attributionControl: true
  }).setView([20.82, -86.96], 10);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(projectMap);

  const lang = (typeof currentLang !== "undefined" ? currentLang : "es");

  // --- Project marker: gold pulse + 9 ha footprint circle ---
  const projectIcon = L.divIcon({
    className: "map-marker-project",
    html: '<div class="map-pulse"></div><div class="map-pin"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });

  const projectLabel = lang === "es"
    ? "<strong>PUNTA NAHPU</strong><br>141 residencias · 9 ha<br>Punta Maroma, Q. Roo"
    : "<strong>PUNTA NAHPU</strong><br>141 residences · 9 ha<br>Punta Maroma, Q. Roo";

  L.marker(MAP_DATA.project.coords, { icon: projectIcon, zIndexOffset: 1000 })
    .addTo(projectMap)
    .bindPopup(projectLabel, { className: "map-popup" })
    .openPopup();

  // Actual property boundary (from the MIA environmental filing)
  L.polygon(MAP_DATA.project.polygon, {
    color: "#c9a872",
    fillColor: "#c9a872",
    fillOpacity: 0.22,
    weight: 2
  }).addTo(projectMap);

  // --- POI markers: small cream dots ---
  MAP_DATA.pois.forEach(poi => {
    const icon = L.divIcon({
      className: "map-marker-poi",
      html: '<div class="map-poi-dot"></div>',
      iconSize: [10, 10],
      iconAnchor: [5, 5]
    });
    L.marker(poi.coords, { icon })
      .addTo(projectMap)
      .bindPopup(lang === "es" ? poi.es : poi.en, { className: "map-popup" });

    // subtle connection line from project to POI
    L.polyline([MAP_DATA.project.coords, poi.coords], {
      color: "#ede4d2",
      weight: 0.7,
      opacity: 0.22,
      dashArray: "4 6"
    }).addTo(projectMap);
  });

  // Fit bounds to show everything with padding
  const allPoints = [MAP_DATA.project.coords].concat(MAP_DATA.pois.map(p => p.coords));
  projectMap.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] });

  // Enable scroll zoom only after click (prevents scroll-trap)
  projectMap.on("click", () => projectMap.scrollWheelZoom.enable());
  projectMap.on("mouseout", () => projectMap.scrollWheelZoom.disable());
}

// Re-init popups on language change
document.addEventListener("langchange", () => {
  if (projectMap) {
    projectMap.remove();
    projectMap = null;
    initMap();
  }
});

document.addEventListener("DOMContentLoaded", initMap);
