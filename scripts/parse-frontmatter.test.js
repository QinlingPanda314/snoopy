import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter } from './parse-frontmatter.js';

test('parses frontmatter and body', () => {
  const input = '---\ntitle: Hello world\n---\nBody text here.';
  const { data, body } = parseFrontmatter(input);
  assert.equal(data.title, 'Hello world');
  assert.equal(body, 'Body text here.');
});

test('returns empty data when no frontmatter', () => {
  const { data, body } = parseFrontmatter('Just body.');
  assert.deepEqual(data, {});
  assert.equal(body, 'Just body.');
});

test('handles empty input', () => {
  const { data, body } = parseFrontmatter('');
  assert.deepEqual(data, {});
  assert.equal(body, '');
});

test('trims whitespace around values', () => {
  const { data } = parseFrontmatter('---\ntitle:   spaced   \n---\n');
  assert.equal(data.title, 'spaced');
});

test('ignores lines without colons in frontmatter', () => {
  const { data, body } = parseFrontmatter('---\ntitle: T\nnocolon\n---\nb');
  assert.equal(data.title, 'T');
  assert.equal(body, 'b');
});
