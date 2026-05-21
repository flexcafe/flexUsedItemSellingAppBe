import http from 'k6/http';
import { sleep } from 'k6';
import {
  BASE_URL,
  authHeadersFromToken,
  expect2xx,
  mustHaveEnv,
  parseJsonSafe,
  pickOne,
  splitCsv,
} from './_shared.js';

const chatTokens = splitCsv(mustHaveEnv('CHAT_TOKENS'));
const sellerIds = splitCsv(__ENV.CHAT_SELLER_IDS || '');
const listingIds = splitCsv(__ENV.CHAT_LISTING_IDS || '');
const roomIds = splitCsv(__ENV.CHAT_ROOM_IDS || '');
const transactionIds = splitCsv(__ENV.CHAT_TRANSACTION_IDS || '');

const enableTransactionalFlow = (__ENV.ENABLE_CHAT_TRANSACTIONAL_FLOW || '0') === '1';
const isLocal = (__ENV.K6_PROFILE || 'full') === 'local';

const fullScenarios = {
  open_room: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 10 },
      { duration: '2m', target: 25 },
      { duration: '30s', target: 0 },
    ],
    exec: 'openRoomScenario',
  },
  list_rooms: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 20 },
      { duration: '2m', target: 50 },
      { duration: '30s', target: 0 },
    ],
    exec: 'listRoomsScenario',
    startTime: '10s',
  },
  list_messages: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 20 },
      { duration: '2m', target: 40 },
      { duration: '30s', target: 0 },
    ],
    exec: 'listMessagesScenario',
    startTime: '15s',
  },
  send_messages: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 10 },
      { duration: '2m', target: 30 },
      { duration: '30s', target: 0 },
    ],
    exec: 'sendMessageScenario',
    startTime: '20s',
  },
  transactional_actions: {
    executor: 'constant-vus',
    vus: enableTransactionalFlow ? 5 : 0,
    duration: '2m',
    exec: 'transactionalScenario',
    startTime: '30s',
  },
};

const localScenarios = {
  open_room: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 3 },
      { duration: '40s', target: 8 },
      { duration: '10s', target: 0 },
    ],
    exec: 'openRoomScenario',
  },
  list_rooms: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 5 },
      { duration: '40s', target: 12 },
      { duration: '10s', target: 0 },
    ],
    exec: 'listRoomsScenario',
    startTime: '5s',
  },
  list_messages: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 5 },
      { duration: '40s', target: 10 },
      { duration: '10s', target: 0 },
    ],
    exec: 'listMessagesScenario',
    startTime: '8s',
  },
  send_messages: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 3 },
      { duration: '40s', target: 8 },
      { duration: '10s', target: 0 },
    ],
    exec: 'sendMessageScenario',
    startTime: '10s',
  },
  transactional_actions: {
    executor: 'constant-vus',
    vus: enableTransactionalFlow ? 2 : 0,
    duration: '40s',
    exec: 'transactionalScenario',
    startTime: '15s',
  },
};

const activeScenarios = isLocal ? { ...localScenarios } : { ...fullScenarios };
if (!enableTransactionalFlow) {
  delete activeScenarios.transactional_actions;
}

export const options = {
  scenarios: activeScenarios,
  thresholds: {
    http_req_failed: ['rate<0.02'],
    'http_req_duration{scenario:list_rooms}': ['p(95)<250'],
    'http_req_duration{scenario:list_messages}': ['p(95)<280'],
    'http_req_duration{scenario:send_messages}': ['p(95)<300'],
    'http_req_duration{scenario:open_room}': ['p(95)<250'],
  },
};

function randomToken() {
  return pickOne(chatTokens);
}

function randomRoomId() {
  return pickOne(roomIds);
}

function randomSellerAndListing() {
  const sellerId = pickOne(sellerIds);
  const listingId = pickOne(listingIds);
  if (!sellerId || !listingId) {
    return null;
  }
  return { sellerId, listingId };
}

export function openRoomScenario() {
  const token = randomToken();
  const pair = randomSellerAndListing();
  if (!token || !pair) {
    sleep(1);
    return;
  }
  const res = http.post(
    `${BASE_URL}/api/v1/client/chats/rooms`,
    JSON.stringify({
      sellerId: pair.sellerId,
      listingId: pair.listingId,
    }),
    { headers: authHeadersFromToken(token), tags: { scenario: 'open_room' } },
  );
  expect2xx(res, 'open room');
  sleep(0.2);
}

export function listRoomsScenario() {
  const token = randomToken();
  if (!token) {
    sleep(1);
    return;
  }
  const res = http.get(
    `${BASE_URL}/api/v1/client/chats/rooms?take=20`,
    { headers: authHeadersFromToken(token), tags: { scenario: 'list_rooms' } },
  );
  expect2xx(res, 'list rooms');
  sleep(0.3);
}

export function listMessagesScenario() {
  const token = randomToken();
  const roomId = randomRoomId();
  if (!token || !roomId) {
    sleep(1);
    return;
  }
  const res = http.get(
    `${BASE_URL}/api/v1/client/chats/${roomId}/messages?take=20`,
    {
      headers: authHeadersFromToken(token),
      tags: { scenario: 'list_messages' },
    },
  );
  expect2xx(res, 'list messages');
  sleep(0.3);
}

export function sendMessageScenario() {
  const token = randomToken();
  const roomId = randomRoomId();
  if (!token || !roomId) {
    sleep(1);
    return;
  }
  const key = `k6-msg-${__VU}-${__ITER}-${Date.now()}`;
  const res = http.post(
    `${BASE_URL}/api/v1/client/chats/${roomId}/messages`,
    JSON.stringify({
      content: `k6 message ${__VU}-${__ITER}`,
      type: 'TEXT',
      idempotencyKey: key,
    }),
    {
      headers: authHeadersFromToken(token),
      tags: { scenario: 'send_messages' },
    },
  );
  expect2xx(res, 'send message');
  sleep(0.4);
}

export function transactionalScenario() {
  const token = randomToken();
  const roomId = randomRoomId();
  const txId = pickOne(transactionIds);
  if (!token || !roomId) {
    sleep(1);
    return;
  }

  const directTradeRes = http.post(
    `${BASE_URL}/api/v1/client/chats/${roomId}/direct-trade`,
    JSON.stringify({
      meetingDate: '2026-12-31',
      meetingTime: '18:00',
      meetingLocation: 'k6 test location',
      meetingLatitude: 16.85,
      meetingLongitude: 96.15,
    }),
    {
      headers: authHeadersFromToken(token),
      tags: { scenario: 'transactional_actions' },
    },
  );
  expect2xx(directTradeRes, 'direct trade');

  const statusRes = http.get(
    `${BASE_URL}/api/v1/client/chats/${roomId}/safe-payment`,
    {
      headers: authHeadersFromToken(token),
      tags: { scenario: 'transactional_actions' },
    },
  );
  expect2xx(statusRes, 'safe payment status');

  if (txId) {
    const completeRes = http.post(
      `${BASE_URL}/api/v1/client/chats/transactions/complete`,
      JSON.stringify({ transactionId: txId }),
      {
        headers: authHeadersFromToken(token),
        tags: { scenario: 'transactional_actions' },
      },
    );
    // Completion may return 400/403 depending on state/user; keep observability.
    parseJsonSafe(completeRes);
  }
  sleep(0.8);
}
