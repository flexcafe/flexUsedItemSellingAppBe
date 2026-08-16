import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(
  fs.readFileSync(path.join(here, '..', 'src', 'common', 'geo', 'myanmar-adm1.json'), 'utf8'),
);

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function extract(lat, lng) {
  for (const region of data.regions) {
    const [minLng, minLat, maxLng, maxLat] = region.bbox;
    if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) continue;
    for (const polygon of region.polygons) {
      if (!pointInRing(lng, lat, polygon.outer)) continue;
      if (polygon.holes.some((hole) => pointInRing(lng, lat, hole))) continue;
      return region.name;
    }
  }
  return null;
}

const samples = [
  ['Yangon downtown', 16.8409, 96.1735, 'Yangon Region'],
  ['Bago city', 17.3369, 96.4797, 'Bago Region'],
  ['Hpa-an', 16.8896, 97.6348, 'Kayin State'],
  ['Mawlamyine', 16.4906, 97.6281, 'Mon State'],
  ['Mandalay', 21.9588, 96.0891, 'Mandalay Region'],
  ['Naypyidaw', 19.7633, 96.0785, 'Naypyidaw Union Territory'],
  ['Taunggyi', 20.7892, 97.0378, 'Shan State'],
  ['Sittwe', 20.1544, 92.8584, 'Rakhine State'],
  ['Pathein', 16.7792, 94.7321, 'Ayeyarwady Region'],
  ['Hakha', 22.6445, 93.6059, 'Chin State'],
  ['Loikaw', 19.6742, 97.2098, 'Kayah State'],
  ['Myitkyina', 25.3833, 97.3964, 'Kachin State'],
  ['Dawei', 14.0828, 98.194, 'Tanintharyi Region'],
  ['Magway', 20.1497, 94.9414, 'Magway Region'],
  ['Monywa', 22.1083, 95.1358, 'Sagaing Region'],
  ['Kawthaung', 9.9823, 98.5503, 'Tanintharyi Region'],
  ['Tachileik', 20.4489, 99.8808, 'Shan State'],
  ['Myawaddy', 16.6891, 98.5089, 'Kayin State'],
  ['Bangkok', 13.7563, 100.5018, null],
];

let failed = 0;
for (const [label, lat, lng, expected] of samples) {
  const got = extract(lat, lng);
  const ok = got === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? 'OK' : 'FAIL'} ${label}: got=${got} expected=${expected}`);
}
process.exit(failed ? 1 : 0);
