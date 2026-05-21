import http from 'k6/http';
import { sleep } from 'k6';
import {
  BASE_URL,
  authHeadersFromToken,
  expect2xx,
  pickOne,
  splitCsv,
} from './_shared.js';

function productIds() {
  return splitCsv(__ENV.PRODUCT_IDS || '');
}
function categoryIds() {
  return splitCsv(__ENV.CATEGORY_IDS || '');
}
const optionalAuthToken = (__ENV.PRODUCT_AUTH_TOKEN || '').trim();

const maybeAuthHeaders = authHeadersFromToken(optionalAuthToken || null);

const isLocal = (__ENV.K6_PROFILE || 'full') === 'local';

const fullScenarios = {
  home_catalog_mix: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 25 },
      { duration: '3m', target: 60 },
      { duration: '30s', target: 0 },
    ],
    exec: 'homeCatalogScenario',
  },
  product_detail: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 20 },
      { duration: '3m', target: 50 },
      { duration: '30s', target: 0 },
    ],
    exec: 'productDetailScenario',
    startTime: '10s',
  },
};

const localScenarios = {
  home_catalog_mix: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '15s', target: 5 },
      { duration: '45s', target: 15 },
      { duration: '15s', target: 0 },
    ],
    exec: 'homeCatalogScenario',
  },
  product_detail: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '15s', target: 5 },
      { duration: '45s', target: 12 },
      { duration: '15s', target: 0 },
    ],
    exec: 'productDetailScenario',
    startTime: '5s',
  },
};

export const options = {
  scenarios: isLocal ? localScenarios : fullScenarios,
  thresholds: {
    http_req_failed: ['rate<0.02'],
    'http_req_duration{scenario:home_catalog_mix}': ['p(95)<350'],
    'http_req_duration{scenario:product_detail}': ['p(95)<350'],
  },
};

function randomPage() {
  return 1 + Math.floor(Math.random() * 6);
}

function randomLimit() {
  const limits = [10, 20, 30];
  return limits[Math.floor(Math.random() * limits.length)];
}

function randomLatLng() {
  // Yangon +/- small range
  const latitude = 16.85 + (Math.random() - 0.5) * 0.2;
  const longitude = 96.16 + (Math.random() - 0.5) * 0.2;
  return { latitude, longitude };
}

export function homeCatalogScenario() {
  const catId = pickOne(categoryIds());
  const page = randomPage();
  const limit = randomLimit();
  const { latitude, longitude } = randomLatLng();
  const parts = [
    `page=${page}`,
    `limit=${limit}`,
    `latitude=${latitude}`,
    `longitude=${longitude}`,
  ];
  if (catId) {
    parts.push(`categoryId=${catId}`);
  }
  if (__ITER % 3 === 0) {
    parts.push('search=iphone');
  }
  const query = parts.join('&');

  const productsRes = http.get(
    `${BASE_URL}/api/v1/client/products?${query}`,
    {
      headers: maybeAuthHeaders,
      tags: { scenario: 'home_catalog_mix' },
    },
  );
  expect2xx(productsRes, 'product catalog');

  const categoriesRes = http.get(`${BASE_URL}/api/v1/client/categories`, {
    tags: { scenario: 'home_catalog_mix' },
  });
  expect2xx(categoriesRes, 'categories');

  const slidersRes = http.get(`${BASE_URL}/api/v1/client/slider-ads`, {
    tags: { scenario: 'home_catalog_mix' },
  });
  expect2xx(slidersRes, 'slider ads');

  sleep(0.5);
}

export function productDetailScenario() {
  const productId = pickOne(productIds());
  if (!productId) {
    sleep(1);
    return;
  }
  const detailRes = http.get(
    `${BASE_URL}/api/v1/client/products/${productId}`,
    {
      headers: maybeAuthHeaders,
      tags: { scenario: 'product_detail' },
    },
  );
  expect2xx(detailRes, 'product detail');
  sleep(0.35);
}
