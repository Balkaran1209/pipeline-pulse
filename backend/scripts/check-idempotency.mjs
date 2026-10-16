import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const baseUrl = 'http://localhost:8080/api/v1';
const createdIds = new Set();

async function request(method, path, options = {}) {
  const { body, key, status = 200 } = options;
  const headers = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (key !== undefined) {
    headers['Idempotency-Key'] = key;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (method === 'POST' && path === '/pipelines'
      && response.status === 201 && json?.id) {
    createdIds.add(json.id);
  }

  assert.equal(
    response.status,
    status,
    `${method} ${path}: expected ${status}, got ${response.status}: ${text}`,
  );

  return { text, json };
}

const suffix = randomUUID();
const key = `concurrent-test-${suffix}`;
const body = {
  name: `Idempotency test ${suffix}`,
  product: 'flasharray',
};

try {
  const results = await Promise.allSettled(
    Array.from({ length: 8 }, () =>
      request('POST', '/pipelines', { body, key, status: 201 }),
    ),
  );

  const responses = results.map((result) => {
    if (result.status === 'rejected') {
      throw result.reason;
    }

    return result.value;
  });

  const original = responses[0];

  for (const response of responses) {
    assert.equal(response.text, original.text);
  }

  const list = await request('GET', '/pipelines');
  assert.equal(
    list.json.filter((pipeline) => pipeline.name === body.name).length,
    1,
  );

  console.log('PASS: eight simultaneous requests created one pipeline');

  await request('POST', '/pipelines', {
    key,
    body: { ...body, name: 'Different input' },
    status: 409,
  });

  console.log('PASS: conflicting input returned 409');

  const path = `/pipelines/${original.json.id}`;

  const updated = await request('PATCH', path, {
    body: { name: `Renamed ${suffix}`, product: 'flashblade' },
  });

  assert.equal(updated.json.name, `Renamed ${suffix}`);
  assert.equal(updated.json.product, 'flashblade');

  const afterUpdate = await request('POST', '/pipelines', {
    body, key, status: 201,
  });

  assert.equal(afterUpdate.text, original.text);

  const current = await request('GET', path);
  assert.equal(current.json.name, `Renamed ${suffix}`);
  assert.equal(current.json.product, 'flashblade');

  console.log('PASS: replay returned the original response after PATCH');

  await request('DELETE', path, { status: 204 });

  const afterDelete = await request('POST', '/pipelines', {
    body, key, status: 201,
  });

  assert.equal(afterDelete.text, original.text);
  await request('GET', path, { status: 404 });

  console.log('PASS: replay after DELETE did not recreate the pipeline');

  const first = await request('POST', '/pipelines', {
    body, status: 201,
  });

  const second = await request('POST', '/pipelines', {
    body, status: 201,
  });

  assert.notEqual(first.json.id, second.json.id);

  console.log('PASS: requests without a key created separate pipelines');

  const blankKey = await request('POST', '/pipelines', {
    body, key: '', status: 400,
  });

  assert.equal(blankKey.json.error.code, 'VALIDATION_ERROR');

  console.log('PASS: a blank key returned 400');
}finally {
  for (const id of createdIds) {
    const response = await fetch(`${baseUrl}/pipelines/${id}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(10000),
    });

    await response.text();

    assert.ok(
      response.status === 204 || response.status === 404,
      `Cleanup failed for pipeline ${id}: ${response.status}`,
    );
  }
}

console.log('All idempotency checks passed.');