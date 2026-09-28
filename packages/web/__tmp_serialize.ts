(globalThis as unknown as { Node: unknown }).Node = {
  TEXT_NODE: 3,
  ELEMENT_NODE: 1,
};

const { serializeContainer } = await import(
  '@/app/components/smart-composer/smart-composer-dom'
);
const { buildText } = await import(
  '@/app/components/smart-composer/smart-composer-helpers'
);

const text = (t: string) => ({ nodeType: 3, textContent: t });
const token = (dataset: Record<string, string>, label: string) => ({
  nodeType: 1,
  tagName: 'SPAN',
  dataset: { ...dataset, token: 'true' },
  textContent: label,
  childNodes: [],
});

const root = {
  childNodes: [
    token({ tokenType: 'command', value: 'explore' }, '/explore'),
    text(' '),
    token({ tokenType: 'agent', value: 'explore' }, '@explore'),
    text(' '),
    token({ tokenType: 'file', value: 'AGENTS.md' }, '@AGENTS.md'),
    text(' '),
    token({ tokenType: 'skill', value: 'find-skills' }, '/find-skills'),
  ],
};

const segments = serializeContainer(root as never);
console.log('serialized:', JSON.stringify(segments));
console.log('buildText:', JSON.stringify(buildText(segments)));
