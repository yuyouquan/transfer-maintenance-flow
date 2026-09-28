import * as XLSX from 'xlsx';
import type { TemplateKind, TemplateRow, TransferRole } from '@/types/config';
import { resolveTemplateRole, roleLabel, validateTemplateRows } from './configuration';
import { groupTemplateRows } from './template-groups';

const MAX_TEMPLATE_ROWS = 10000;

export const TEMPLATE_HEADERS: Record<TemplateKind, string[]> = {
  checklist: ['序号', '标准', '类型', '责任角色', '资料录入-责任人', '人工审核-责任人', '智能检查规则'],
  review_element: ['序号', '评审要素', '类型', '备注', '责任角色', '资料录入-责任人', '人工审核-责任人', '智能检查规则'],
};

export function parseTemplateWorkbook(bytes: ArrayBuffer | Uint8Array, kind: TemplateKind, roles: ReadonlyArray<TransferRole>): ReadonlyArray<TemplateRow> {
  let workbook: XLSX.WorkBook;
  try { workbook = XLSX.read(bytes, { type: 'array', cellText: true, cellDates: false }); }
  catch { throw new Error('文件无法解析，请上传有效的 XLS 或 XLSX 文件'); }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet?.['!ref']) throw new Error('工作表为空');
  const range = XLSX.utils.decode_range(sheet['!ref']);
  if (range.e.r > MAX_TEMPLATE_ROWS || range.e.c > 100) throw new Error('模板最多支持10000行，请移除工作表中的多余内容');
  const headers = TEMPLATE_HEADERS[kind];
  const readCell = (row: number, column: number) => {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
    if (cell?.f) throw new Error(`第${row + 1}行：模板内容不支持公式，请粘贴为文本值`);
    return cell == null ? '' : String(cell.w ?? cell.v ?? '');
  };
  const actualHeader = Array.from({ length: Math.max(range.e.c + 1, headers.length) }, (_, column) => readCell(0, column));
  while (actualHeader.length && !actualHeader[actualHeader.length - 1]) actualHeader.pop();
  if (actualHeader.length !== headers.length || headers.some((header, column) => actualHeader[column] !== header)) throw new Error(`表头或顺序不正确，应为：${headers.join(' | ')}`);
  const merges = sheet['!merges'] ?? [];
  for (const merge of merges) {
    if (merge.s.r < 1 || merge.s.c !== merge.e.c || merge.s.c > 1) throw new Error('只允许序号与标准／评审要素列在明细区域纵向合并');
    if (merge.e.r > range.e.r) throw new Error('合并范围超出模板数据区域');
  }
  const groupedCell = (row: number, column: number) => {
    const merge = merges.find(item => item.s.c === column && item.s.r <= row && item.e.r >= row);
    return readCell(merge?.s.r ?? row, column);
  };
  const rows: TemplateRow[] = [];
  const sourceRowNumbers: number[] = [];
  for (let rowIndex = 1; rowIndex <= range.e.r; rowIndex++) {
    const cells = headers.map((_, column) => column < 2 ? groupedCell(rowIndex, column) : readCell(rowIndex, column));
    if (cells.every(cell => !cell.trim())) continue;
    const roleStart = kind === 'review_element' ? 4 : 3;
    const resolveRole = (column: number) => {
      const id = resolveTemplateRole(cells[column], roles);
      if (!id) throw new Error(`第${rowIndex + 1}行：${headers[column]}「${cells[column]}」未在当前项目类型配置角色`);
      return id;
    };
    if (!cells[0].trim() || !cells[1].trim()) throw new Error(`第${rowIndex + 1}行：序号与标准／评审要素不能为空；只有真实合并单元格可以省略重复值`);
    rows.push({ id: crypto.randomUUID(), seq: cells[0], content: cells[1], type: cells[2], ...(kind === 'review_element' ? { remark: cells[3] } : {}), responsibleRole: resolveRole(roleStart), entryRole: resolveRole(roleStart + 1), reviewRole: resolveRole(roleStart + 2), aiCheckRule: cells[roleStart + 3] });
    sourceRowNumbers.push(rowIndex + 1);
  }
  return validateTemplateRows(rows, roles, sourceRowNumbers);
}

/** Used by downloads and exports; only header/example rows differ between the two actions. */
export function exportTemplateWorkbook(rows: ReadonlyArray<TemplateRow>, kind: TemplateKind, roles: ReadonlyArray<TransferRole>, format: 'xlsx' | 'xls' = 'xlsx'): ArrayBuffer {
  const groups = groupTemplateRows(rows);
  const matrix: string[][] = [TEMPLATE_HEADERS[kind]];
  const merges: XLSX.Range[] = [];
  for (const group of groups) {
    const start = matrix.length;
    group.rows.forEach((row, index) => matrix.push([
      index === 0 ? row.seq : '', index === 0 ? row.content : '', row.type,
      ...(kind === 'review_element' ? [row.remark ?? ''] : []),
      roleLabel(roles, row.responsibleRole), roleLabel(roles, row.entryRole), roleLabel(roles, row.reviewRole), row.aiCheckRule,
    ]));
    if (group.rows.length > 1) for (const column of [0, 1]) merges.push({ s: { r: start, c: column }, e: { r: matrix.length - 1, c: column } });
  }
  const sheet = XLSX.utils.aoa_to_sheet(matrix);
  // Format the full supported input range, including blank cells: a string value
  // alone does not stop Excel from turning a newly typed business sequence 001 into 1.
  for (let row = 1; row <= MAX_TEMPLATE_ROWS; row++) {
    const address = XLSX.utils.encode_cell({ r: row, c: 0 });
    sheet[address] = { ...(sheet[address] ?? { t: 's', v: '' }), z: '@' };
  }
  sheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(MAX_TEMPLATE_ROWS, matrix.length - 1), c: TEMPLATE_HEADERS[kind].length - 1 } });
  sheet['!merges'] = merges;
  sheet['!cols'] = TEMPLATE_HEADERS[kind].map((_, index) => ({ wch: index === 1 || index === TEMPLATE_HEADERS[kind].length - 1 ? 55 : 22 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, kind === 'checklist' ? 'CheckList' : '评审要素');
  return XLSX.write(workbook, { type: 'array', bookType: format === 'xls' ? 'biff8' : 'xlsx' });
}

export function downloadTemplateWorkbook(bytes: ArrayBuffer, filename: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
