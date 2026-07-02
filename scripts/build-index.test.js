import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildIndex } from './build-index.js';

function setupFixture() {
  const root = mkdtempSync(join(tmpdir(), 'snoopy-'));
  mkdirSync(join(root, 'nature'));
  writeFileSync(join(root, 'nature', 'sunset.jpg'), '');
  writeFileSync(
    join(root, 'nature', 'sunset.md'),
    '---\ntitle: Sunset\n---\nGolden hour.'
  );
  writeFileSync(join(root, 'nature', 'lone.jpg'), '');
  mkdirSync(join(root, 'city'));
  writeFileSync(join(root, 'city', 'bridge.png'), '');
  writeFileSync(join(root, 'city', 'bridge.md'), 'No frontmatter body.');
  return root;
}

test('builds category list sorted alphabetically', () => {
  const root = setupFixture();
  try {
    const index = buildIndex(root);
    assert.deepEqual(index.categories.map(c => c.name), ['city', 'nature']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('pairs image with sibling markdown title and body', () => {
  const root = setupFixture();
  try {
    const index = buildIndex(root);
    const nature = index.categories.find(c => c.name === 'nature');
    const sunset = nature.pictures.find(p => p.src.endsWith('sunset.jpg'));
    assert.equal(sunset.title, 'Sunset');
    assert.equal(sunset.description, 'Golden hour.');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('falls back to filename when md missing', () => {
  const root = setupFixture();
  try {
    const index = buildIndex(root);
    const nature = index.categories.find(c => c.name === 'nature');
    const lone = nature.pictures.find(p => p.src.endsWith('lone.jpg'));
    assert.equal(lone.title, 'lone');
    assert.equal(lone.description, '');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('uses filename as title when md has no frontmatter title', () => {
  const root = setupFixture();
  try {
    const index = buildIndex(root);
    const city = index.categories.find(c => c.name === 'city');
    const bridge = city.pictures[0];
    assert.equal(bridge.title, 'bridge');
    assert.equal(bridge.description, 'No frontmatter body.');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('src path is relative to repo root using forward slashes', () => {
  const root = setupFixture();
  try {
    const index = buildIndex(root, { srcPrefix: 'images' });
    const nature = index.categories.find(c => c.name === 'nature');
    assert.ok(nature.pictures.every(p => p.src.startsWith('images/nature/')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('pictures within a category sorted by filename', () => {
  const root = setupFixture();
  try {
    const index = buildIndex(root);
    const nature = index.categories.find(c => c.name === 'nature');
    const names = nature.pictures.map(p => p.src.split('/').pop());
    assert.deepEqual(names, ['lone.jpg', 'sunset.jpg']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
