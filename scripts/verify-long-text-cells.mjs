import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const componentPath = 'src/components/shared/LongTextCell.tsx';
const component = readFileSync(join(root, componentPath), 'utf8');

for (const required of ['Popover', 'CopyOutlined', 'navigator.clipboard.writeText', 'WebkitLineClamp', 'maxHeight', "overflow: 'auto'"]) {
  assert.ok(component.includes(required), `${componentPath} should include ${required}`);
}

const usages = [
  {
    page: 'src/app/config/checklist/page.tsx',
    fields: ['checkItem', 'aiCheckRule'],
  },
  {
    page: 'src/app/config/review-elements/page.tsx',
    fields: ['description', 'remark', 'aiCheckRule'],
  },
];

for (const usage of usages) {
  const page = readFileSync(join(root, usage.page), 'utf8');
  assert.ok(page.includes("import { LongTextCell } from '@/components/shared/LongTextCell'"), `${usage.page} should import LongTextCell`);

  for (const field of usage.fields) {
    assert.ok(page.includes(`render: (${field}: string) => (`), `${usage.page} should render ${field} through LongTextCell`);
    assert.ok(page.includes(`<LongTextCell text={${field}} />`), `${usage.page} should pass ${field} to LongTextCell`);
  }
}
