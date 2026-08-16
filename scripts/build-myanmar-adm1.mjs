import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(process.env.TEMP || '/tmp', 'mmr-adm1.geojson');
const OUT = path.join(here, '..', 'src', 'common', 'geo', 'myanmar-adm1.json');

const NAME_MAP = {
  Ayeyarwady: 'Ayeyarwady Region',
  Chin: 'Chin State',
  Saigang: 'Sagaing Region',
  Sagaing: 'Sagaing Region',
  Kachin: 'Kachin State',
  Kayah: 'Kayah State',
  Kayin: 'Kayin State',
  Magway: 'Magway Region',
  Mandalay: 'Mandalay Region',
  Mon: 'Mon State',
  Rakhine: 'Rakhine State',
  Tanitharyi: 'Tanintharyi Region',
  Tanintharyi: 'Tanintharyi Region',
  Bago: 'Bago Region',
  Yangon: 'Yangon Region',
  Shan: 'Shan State',
};

/**
 * Naypyidaw Union Territory outline traced from GAD/MIMU township extent
 * (Tatkon–Lewe–Pyinmana). Checked first so it is not swallowed by Mandalay.
 */
const NAYPYIDAW_OUTER = [
  [96.048, 20.228],
  [96.168, 20.221],
  [96.268, 20.186],
  [96.348, 20.132],
  [96.418, 20.062],
  [96.478, 19.972],
  [96.508, 19.872],
  [96.512, 19.762],
  [96.492, 19.652],
  [96.438, 19.562],
  [96.348, 19.502],
  [96.238, 19.472],
  [96.128, 19.468],
  [96.018, 19.492],
  [95.928, 19.542],
  [95.868, 19.622],
  [95.848, 19.722],
  [95.858, 19.832],
  [95.892, 19.942],
  [95.948, 20.042],
  [96.008, 20.142],
  [96.048, 20.228],
];

function perpendicularDistance(point, start, end) {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return Math.hypot(x - x1, y - y1);
  }
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + clamped * dx), y - (y1 + clamped * dy));
}

function simplifyRing(points, epsilon) {
  if (points.length <= 4) {
    return points;
  }
  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i += 1) {
    const dist = perpendicularDistance(points[i], points[0], points[end]);
    if (dist > maxDist) {
      index = i;
      maxDist = dist;
    }
  }
  if (maxDist > epsilon) {
    const left = simplifyRing(points.slice(0, index + 1), epsilon);
    const right = simplifyRing(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[end]];
}

function bboxOfRings(polygons) {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const polygon of polygons) {
    for (const [lng, lat] of polygon.outer) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return [minLng, minLat, maxLng, maxLat];
}

function roundRing(points) {
  return points.map(([lng, lat]) => [
    Math.round(lng * 10000) / 10000,
    Math.round(lat * 10000) / 10000,
  ]);
}

function convertGeometry(geometry, epsilon) {
  const parts =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.coordinates;
  return parts.map((rings) => ({
    outer: roundRing(simplifyRing(rings[0], epsilon)),
    holes: rings.slice(1).map((ring) => roundRing(simplifyRing(ring, epsilon))),
  }));
}

const raw = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const regions = [
  {
    name: 'Naypyidaw Union Territory',
    polygons: [{ outer: NAYPYIDAW_OUTER, holes: [] }],
  },
];

for (const feature of raw.features) {
  const sourceName = feature.properties.shapeName;
  const name = NAME_MAP[sourceName];
  if (!name) {
    throw new Error(`Unmapped ADM1 name: ${sourceName}`);
  }
  regions.push({
    name,
    polygons: convertGeometry(feature.geometry, 0.008),
  });
}

for (const region of regions) {
  region.bbox = bboxOfRings(region.polygons);
}

const payload = {
  source:
    'geoBoundaries MMR ADM1 (CC BY 4.0) + Naypyidaw Union Territory outline',
  regions,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload));
console.log(
  `Wrote ${OUT} (${fs.statSync(OUT).size} bytes, ${regions.length} regions)`,
);
