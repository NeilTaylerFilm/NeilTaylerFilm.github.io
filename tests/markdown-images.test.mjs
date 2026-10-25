import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import markdownImages from '../scripts/markdown-images.mjs';

const element = (tagName, children = [], properties = {}) => ({
  type: 'element',
  tagName,
  properties,
  children,
});
const text = (value) => ({ type: 'text', value });
const manifestImage = Object.keys(
  JSON.parse(readFileSync(new URL('../src/generated/images.json', import.meta.url), 'utf8')),
)[0];
const image = (properties = {}) =>
  element('img', [], { src: manifestImage, alt: 'Photo', ...properties });
const paragraph = (...children) => element('p', children);

test('article media figures group standalone images and documented captions', () => {
  const tree = {
    type: 'root',
    children: [
      paragraph(text('\n  '), image(), text('\n')),
      text('\n'),
      paragraph(element('em', [text('A photo caption.')])),
      text('\n'),
      paragraph(element('a', [image()], { href: '/photo/' })),
      text('\n'),
      paragraph(text('Text before '), image()),
      text('\n'),
      paragraph(element('a', [text('Source')], { href: 'https://example.com', title: 'cite' })),
      text('\n'),
      paragraph(element('button', [image()], { type: 'button' })),
      text('\n'),
      paragraph(image({ className: ['citation-icon'], dataCitationIcon: '' })),
      text('\n'),
      paragraph(element('em', [text('An unrelated italic paragraph.')])),
      element('blockquote', [paragraph(image())]),
    ],
  };

  markdownImages()(tree, { path: '/repo/src/content/blog/media.md' });

  const mediaContainers = tree.children.filter(
    (node) => node.type === 'element' && node.properties.dataArticleMedia !== undefined,
  );
  assert.equal(mediaContainers.length, 2);
  assert.equal(mediaContainers[0].children[0].tagName, 'figure');
  assert.equal(mediaContainers[0].children[0].children[1].tagName, 'figcaption');
  assert.equal(mediaContainers[0].children[0].children[1].children[0].tagName, 'em');
  assert.match(mediaContainers[0].children[0].children[0].properties.sizes, /820px/);
  assert.match(mediaContainers[1].children[0].children[0].children[0].properties.sizes, /820px/);

  const mixedParagraph = tree.children.find(
    (node) =>
      node.type === 'element' && node.tagName === 'p' && node.children[0]?.value === 'Text before ',
  );
  const buttonParagraph = tree.children.find(
    (node) =>
      node.type === 'element' && node.tagName === 'p' && node.children[0]?.tagName === 'button',
  );
  const nestedBlockquote = tree.children.find((node) => node.tagName === 'blockquote');
  assert.match(mixedParagraph.children[1].properties.sizes, /700px/);
  assert.equal(buttonParagraph.children[0].properties.dataArticleMedia, undefined);
  assert.match(buttonParagraph.children[0].children[0].properties.sizes, /700px/);
  assert.equal(nestedBlockquote.children[0].properties.dataArticleMedia, undefined);
  assert.match(nestedBlockquote.children[0].children[0].properties.sizes, /700px/);

  const photography = { type: 'root', children: [paragraph(image())] };
  markdownImages()(photography, { path: '/repo/src/content/photography/project.md' });
  assert.equal(photography.children[0].properties.dataArticleMedia, undefined);
  assert.match(photography.children[0].children[0].properties.sizes, /700px/);

  const noFile = { type: 'root', children: [paragraph(image())] };
  markdownImages()(noFile);
  assert.equal(noFile.children[0].properties.dataArticleMedia, undefined);
  assert.match(noFile.children[0].children[0].properties.sizes, /700px/);
});
