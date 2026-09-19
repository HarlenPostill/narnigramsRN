import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const decode = require('decode-uri-component') as (value: string) => string;

test('URI decoding security backport preserves CommonJS and legacy query-string behavior', () => {
  assert.equal(decode('hello+world'), 'hello world');
  assert.equal(decode('%C3%A5%20%F0%9F%8D%8C'), 'å 🍌');
  assert.equal(decode('%FF%20hello'), '%FF hello');
  assert.equal(decode('%C2'), '\uFFFD');
  assert.throws(() => decode(null as unknown as string), TypeError);
  const query = require('query-string') as { parse(value: string): Record<string, string> };
  assert.equal(query.parse('word=hello+world&next=%FF').word, 'hello world');
  assert.equal(query.parse('word=hello+world&next=%FF').next, '%FF');
});

test('malformed external URL input does not hang the parser', () => {
  // Child timeout makes regression to the exponential implementation fail safely.
  const output = execFileSync(process.execPath, ['-e', "const decode=require('decode-uri-component'); const input='%FF'.repeat(4000); if(decode(input)!==input) process.exit(2); process.stdout.write('ok');"], { timeout: 2000, encoding: 'utf8' });
  assert.equal(output, 'ok');
});
