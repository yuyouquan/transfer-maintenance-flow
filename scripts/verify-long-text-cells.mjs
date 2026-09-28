import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const componentPath = 'src/components/shared/LongTextCell.tsx';
const component = readFileSync(join(root, componentPath), 'utf8');

for (const required of ['Popover', 'CopyOutlined', 'navigator.clipboard.writeText', 'WebkitLineClamp', 'maxHeight', "overflow: 'auto'"]) {
  assert.ok(component.includes(required), `${componentPath} should include ${required}`);
}

// Configuration routes share one table for both template kinds.
const tablePath = 'src/components/config/TemplateRowsTable.tsx';
const table = readFileSync(join(root, tablePath), 'utf8');
assert.ok(table.includes("import { LongTextCell } from '@/components/shared/LongTextCell'"));
for (const field of ['content', 'type', 'remark', 'aiCheckRule']) {
  assert.match(table, new RegExp(`dataIndex: '${field}'[^\\n]+<LongTextCell text=\\{text\\}`), `${tablePath} renders ${field} with long-text preview`);
}
console.log('PASS: shared template table retains long-text previews');
