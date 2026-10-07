import assert from 'node:assert/strict';
import markdownImages from './markdown-images.mjs';

const citation = {
  type: 'element',
  tagName: 'a',
  properties: { title: 'cite', href: 'https://reader:secret@example.com/article' },
  children: [{ type: 'text', value: 'Example source' }],
};
const relative = {
  type: 'element',
  tagName: 'a',
  properties: { title: 'cite', href: '#section' },
  children: [{ type: 'text', value: 'Local source' }],
};
const ordinary = {
  type: 'element',
  tagName: 'a',
  properties: { href: 'https://example.com' },
  children: [{ type: 'text', value: 'Ordinary link' }],
};
const unsupported = {
  type: 'element',
  tagName: 'a',
  properties: { title: 'cite', href: 'mailto:editor@example.com' },
  children: [{ type: 'text', value: 'Email' }],
};

markdownImages()({ type: 'root', children: [citation, relative, ordinary, unsupported] });
assert.equal(citation.children[0].properties.src, 'https://example.com/favicon.ico');
assert.equal(citation.children[0].properties.alt, '');
assert.equal(citation.children[0].properties.referrerPolicy, 'no-referrer');
assert.equal(citation.children[0].properties.dataCitationIcon, '');
assert.equal(citation.children[0].properties.ariaHidden, 'true');
assert.equal(relative.children[0].type, 'text');
assert.equal(ordinary.children[0].type, 'text');
assert.equal(unsupported.children[0].type, 'text');
console.log('Citation icon selection checks passed.');
