#!/usr/bin/env node
/**
 * Collects k6 env vars from a running API. Prints export lines to stdout.
 * Usage: node perf/collect-fixtures.mjs
 */
import 'dotenv/config';
import jwt from 'jsonwebtoken';

const BASE = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required in .env for fixture collection');
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  return { status: res.status, json };
}

function signToken(userId, phone = '+959000000000') {
  return jwt.sign({ sub: userId, phone }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION || '7d',
  });
}

async function main() {
  const catalog = await req(
    'GET',
    '/api/v1/client/products?page=1&limit=20&latitude=16.85&longitude=96.16',
  );
  const items =
    catalog.json?.data?.items ||
    catalog.json?.data?.products ||
    (Array.isArray(catalog.json?.data) ? catalog.json.data : []) ||
    [];
  if (items.length === 0) {
    throw new Error('No products in catalog; seed listings before perf tests');
  }

  const productIds = items.map((p) => p.id).filter(Boolean);
  const listingIds = productIds;
  const sellerIds = [...new Set(items.map((p) => p.sellerId || p.userId).filter(Boolean))];
  if (sellerIds.length < 2) {
    throw new Error('Need at least two distinct seller user ids in catalog');
  }

  const buyerId = sellerIds[sellerIds.length - 1];
  const sellerId = sellerIds[0];
  const listingId = items.find((p) => (p.sellerId || p.userId) === sellerId)?.id;
  const tokens = sellerIds.slice(0, 3).map((id) => signToken(id));

  const cats = await req('GET', '/api/v1/client/categories');
  const categoryIds = (cats.json?.data || []).map((c) => c.id).filter(Boolean);

  const roomIds = [];
  const buyerToken = signToken(buyerId);
  if (listingId) {
    const open = await req(
      'POST',
      '/api/v1/client/chats/rooms',
      { sellerId, listingId },
      buyerToken,
    );
    const roomId = open.json?.data?.id;
    if (roomId) roomIds.push(roomId);
  }

  const lines = [
    `BASE_URL=${BASE}`,
    `PRODUCT_IDS=${productIds.join(',')}`,
    `CATEGORY_IDS=${categoryIds.join(',')}`,
    `CHAT_TOKENS=${tokens.join(',')}`,
    `CHAT_SELLER_IDS=${sellerIds.join(',')}`,
    `CHAT_LISTING_IDS=${listingIds.join(',')}`,
    `CHAT_ROOM_IDS=${roomIds.join(',')}`,
    'ENABLE_CHAT_TRANSACTIONAL_FLOW=0',
  ];
  console.log(lines.join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
