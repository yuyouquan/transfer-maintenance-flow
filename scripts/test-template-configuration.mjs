import assert from 'node:assert/strict';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const nativeRequire = createRequire(import.meta.url);
const cache = new Map();
function load(file) {
  file = resolve(file);
  if (cache.has(file)) return cache.get(file);
  const loadedModule = { exports: {} };
  cache.set(file, loadedModule.exports);
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: file })((name) => {
    if (!name.startsWith('.') && !name.startsWith('@/')) return nativeRequire(name);
    const target = name.startsWith('@/') ? resolve('src', name.slice(2)) : resolve(dirname(file), name);
    return load(existsSync(`${target}.ts`) ? `${target}.ts` : `${target}/index.ts`);
  }, loadedModule, loadedModule.exports);
  cache.set(file, loadedModule.exports);
  return loadedModule.exports;
}

assert.ok(existsSync('src/lib/configuration.ts'), 'Configuration validation and atomic mutations must exist');
const config = load('src/lib/configuration.ts');
const grouping = load('src/lib/template-groups.ts');
const io = load('src/lib/template-workbook.ts');
const { MOCK_CONFIGURATIONS } = load('src/mock/configuration.ts');
const roles = MOCK_CONFIGURATIONS.device.roles;
const row = { id: 'first', seq: 'V-01', content: '标准一', type: '检查项', responsibleRole: 'SPM', entryRole: 'SPM', reviewRole: 'SPM', aiCheckRule: '完整性' };
const rows = [row, { ...row, id: 'second', responsibleRole: '测试', entryRole: '测试', reviewRole: '测试' }, { ...row, id: 'third', seq: '001', content: '标准二' }];

assert.equal(config.validateTemplateRows(rows, roles).length, 3);
assert.throws(() => config.validateTemplateRows([{ ...row, seq: '' }], roles), /序号/);
assert.throws(() => config.validateTemplateRows([row, { ...row, id: 'x', content: '冲突' }], roles), /第3行.*序号/);
assert.throws(() => config.validateTemplateRows([row, { ...row, id: 'x', seq: 'V-02' }], roles), /第3行.*对应/);
assert.throws(() => config.validateTemplateRows([{ ...row, entryRole: '未知' }], roles), /角色/);
assert.throws(() => config.validateTemplateRows([row, row], roles), /ID/);
const grouped = grouping.groupTemplateRows([rows[0], rows[2], rows[1]]);
assert.deepEqual(grouped.map(group => group.rows.map(item => item.id)), [['first', 'second'], ['third']]);
assert.equal(grouping.filterTemplateGroups(grouped, '测试', roles)[0].rows.length, 1, 'Search retains only matching details');
assert.equal(grouping.paginateTemplateGroups(grouped, 1, 1).length, 2, 'A group must not split at a page boundary');

const added = config.saveConfigurationRole(MOCK_CONFIGURATIONS, 'device', { id: 'custom', name: '应用', ipmRoleCode: 'MOCK_APP' });
assert.equal(added.device.roles.length, roles.length + 1);
assert.equal(added.tos, MOCK_CONFIGURATIONS.tos);
assert.throws(() => config.saveConfigurationRole(added, 'device', { id: 'other', name: '应用', ipmRoleCode: 'OTHER' }), /角色名/);
assert.throws(() => config.saveConfigurationRole(added, 'device', { id: 'other', name: '其他', ipmRoleCode: 'MOCK_APP' }), /Code/);
assert.throws(() => config.saveConfigurationRole(added, 'device', { id: 'SPM', name: '负责人', ipmRoleCode: 'NEW', isSpm: false }), /SPM/);
assert.throws(() => config.saveConfigurationRole(added, 'device', { id: 'spoof', name: '伪装', ipmRoleCode: 'FAKE', isSpm: true }), /SPM/);
assert.throws(() => config.removeConfigurationRole(added, 'device', 'SPM'), /SPM/);
assert.throws(() => config.removeConfigurationRole(added, 'device', '测试'), /模板/);
assert.equal(config.removeConfigurationRole(added, 'device', 'custom').device.roles.length, roles.length);
const imported = config.importConfigurationTemplate(added, 'device', 'checklist', rows);
assert.equal(imported.device.checklistVersions.length, MOCK_CONFIGURATIONS.device.checklistVersions.length + 1);
assert.equal(imported.tos, added.tos);
assert.equal(imported.device.checklistVersions[0].rows[0].seq, 'V-01');
assert.throws(() => config.importConfigurationTemplate(added, 'tos', 'review_element', rows), /tOS/);
assert.throws(() => config.importConfigurationTemplate(imported, 'device', 'checklist', [{ ...row, content: '' }]), /标准/);
assert.equal(imported.device.checklistVersions[0].rows.length, 3, 'Rejected import does not modify current version');

const XLSX = nativeRequire('xlsx');
for (const format of ['xlsx', 'xls']) {
  const bytes = io.exportTemplateWorkbook(rows, 'checklist', roles, format);
  const decoded = io.parseTemplateWorkbook(bytes, 'checklist', roles);
  const withoutId = item => Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'id'));
  assert.deepEqual(decoded.map(withoutId), rows.map(withoutId));
  const workbook = XLSX.read(bytes, { type: 'array', cellNF: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  assert.equal(sheet['!merges'].length, 2, 'Both grouping columns must be merged');
  assert.equal(sheet.A4.v, '001', 'Text sequence preserves leading zeros');
  assert.equal(sheet.A4.z, '@', 'Exported sequence cells remain text when edited in Excel');
  assert.equal(sheet.A5.z, '@', 'New sequence rows in an exported workbook are preformatted as text');
  const blankBook = XLSX.read(io.exportTemplateWorkbook([], 'checklist', roles, format), { type: 'array', cellNF: true });
  const blankSheet = blankBook.Sheets[blankBook.SheetNames[0]];
  assert.equal(blankSheet.A2?.z, '@', 'The first blank input cell must prevent 001 from being coerced into a number');
  assert.equal(blankSheet.A10001?.z, '@', 'All supported sequence entry rows are preformatted as text');
}
const reviewRows = rows.map(item => ({ ...item, remark: '完整备注' }));
assert.equal(io.parseTemplateWorkbook(io.exportTemplateWorkbook(reviewRows, 'review_element', roles), 'review_element', roles)[0].remark, '完整备注');
function makeBytes(matrix, merges = []) {
  const sheet = XLSX.utils.aoa_to_sheet(matrix); sheet['!merges'] = merges;
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, '模板');
  return XLSX.write(book, { type: 'array', bookType: 'xlsx' });
}
const header = io.TEMPLATE_HEADERS.checklist;
const cells = ['V-01', '标准一', '检查项', 'SPM', '在研TPM', '维护TPM', '规则'];
assert.equal(io.parseTemplateWorkbook(makeBytes([header, cells]), 'checklist', roles)[0].entryRole, '测试');
assert.throws(() => io.parseTemplateWorkbook(makeBytes([header, cells, ['', '', '检查项', 'SPM', 'SPM', 'SPM', '规则']]), 'checklist', roles), /第3行/);
assert.throws(() => io.parseTemplateWorkbook(makeBytes([['错误', ...header.slice(1)], cells]), 'checklist', roles), /表头/);
assert.throws(() => io.parseTemplateWorkbook(makeBytes([header, [...cells.slice(0, 3), '不存在', ...cells.slice(4)]]), 'checklist', roles), /角色/);
assert.throws(() => io.parseTemplateWorkbook(makeBytes([header, [], cells, ['V-01', '不同标准', ...cells.slice(2)]]), 'checklist', roles), /第4行/, 'Validation uses physical workbook row numbers after blank rows');
const diff = grouping.compareTemplateRows(rows, [rows[0], { ...rows[1], aiCheckRule: '新规则' }, { ...row, id: 'new', seq: 'V-03', content: '新标准' }]);
assert.deepEqual(diff.map(item => item.changeType).sort(), ['修改', '删除', '新增', '未变更'].sort());
const insertedDetail = { ...row, id: 'inserted', responsibleRole: '系统', entryRole: '系统', reviewRole: '系统' };
const insertedDiff = grouping.compareTemplateRows(rows, [insertedDetail, ...rows]);
assert.equal(insertedDiff.filter(item => item.changeType === '新增').length, 1);
assert.equal(insertedDiff.filter(item => item.changeType === '未变更').length, 3, 'Inserted detail must not steal an unchanged row match');
const similar = [{ ...row, id: 'rule-a', aiCheckRule: '规则A' }, { ...row, id: 'rule-b', aiCheckRule: '规则B' }];
assert.equal(grouping.compareTemplateRows(similar, [...similar].reverse().map((item, index) => ({ ...item, id: `reimport-${index}` }))).filter(item => item.changeType === '未变更').length, 2, 'Reimported reordered details match complete content before shared role keys');
const renamed = config.saveConfigurationRole(added, 'device', { ...roles[0], name: '项目统筹' });
assert.equal(config.roleLabel(renamed.device.roles, 'SPM'), '项目统筹');
assert.equal(io.parseTemplateWorkbook(io.exportTemplateWorkbook(rows, 'checklist', renamed.device.roles), 'checklist', renamed.device.roles)[0].entryRole, 'SPM');
for (const [kind, sourceFile, contentKey, typeKey] of [['checklist', 'checklist-template', 'checkItem', 'type'], ['review_element', 'review-element-template', 'description', 'standard']]) {
  const originals = Object.values(load(`src/mock/${sourceFile}.ts`))[0];
  const actual = MOCK_CONFIGURATIONS.device[kind === 'checklist' ? 'checklistVersions' : 'reviewVersions'][0].rows;
  assert.equal(actual.length, originals.length);
  for (const original of originals) {
    const converted = actual.find(item => item.id === original.id);
    assert.equal(converted.content, original[contentKey]); assert.equal(converted.type, original[typeKey]); assert.equal(converted.aiCheckRule, original.aiCheckRule);
  }
  config.validateTemplateRows(actual, roles);
}
assert.equal(MOCK_CONFIGURATIONS.tos.reviewVersions.length, 0);
for (const [kind, filename] of [['checklist', 'checklist-import-template'], ['review_element', 'review-elements-import-template']]) {
  for (const format of ['xls', 'xlsx']) {
    const path = `public/templates/${filename}.${format}`;
    if (process.argv.includes('--write-assets')) writeFileSync(path, Buffer.from(io.exportTemplateWorkbook([], kind, roles, format)));
    const book = XLSX.read(readFileSync(path), { type: 'buffer', cellNF: true });
    const publicSheet = book.Sheets[book.SheetNames[0]];
    const actualHeaders = XLSX.utils.sheet_to_json(publicSheet, { header: 1 })[0];
    assert.deepEqual(actualHeaders, io.TEMPLATE_HEADERS[kind], 'Public download headers must match real import schema');
    assert.equal(publicSheet.A2?.z, '@', 'Static downloads preserve text input in the sequence column');
    assert.equal(publicSheet.A10001?.z, '@', 'Static downloads preformat the complete supported input range');
  }
}
console.log('PASS: template validation, role protection, atomic versions, grouping/search/pagination, XLS/XLSX read-back, merge handling, headers, aliases, diffs, original mock fidelity');
