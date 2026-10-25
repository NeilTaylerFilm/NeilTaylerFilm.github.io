import assert from 'node:assert/strict';
import test from 'node:test';
import { rehypeSanitizeMdx } from '../astro.config.ts';

test('preserves MDX imports and components while sanitizing component children', () => {
  const tree = {
    type: 'root',
    children: [
      { type: 'mdxjsEsm', value: "import YouTubeEmbed from './YouTubeEmbed.astro';" },
      {
        type: 'mdxJsxFlowElement',
        name: 'YouTubeEmbed',
        attributes: [],
        children: [
          {
            type: 'element',
            tagName: 'script',
            properties: { 'data-mdx-nested-script': true },
            children: [{ type: 'text', value: 'window.unsafe = true;' }],
          },
        ],
      },
    ],
  };

  const result = rehypeSanitizeMdx()(tree);

  assert.equal(result.children[0].type, 'mdxjsEsm');
  assert.equal(result.children[1].name, 'YouTubeEmbed');
  assert.equal(
    result.children[1].children.some((node) => node.tagName === 'script'),
    false,
  );
});
