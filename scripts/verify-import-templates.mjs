import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const requiredTemplates = [
  {
    path: 'public/templates/checklist-import-template.xls',
    title: '转维材料配置导入模板',
    headers: ['类型', '评审要素', '责任角色', '资料录入-责任人', '人工审核-责任人', '智能检查规则'],
    example: 'Jenkins编译界面所有参数需更新到准确',
    page: 'src/app/config/checklist/page.tsx',
  },
  {
    path: 'public/templates/review-elements-import-template.xls',
    title: '评审要素配置导入模板',
    headers: ['标准', '说明', '备注', '责任角色', '资料录入-责任人', '人工审核-责任人', '智能检查规则'],
    example: '确认项目关键文档已归档到指定服务器',
    page: 'src/app/config/review-elements/page.tsx',
  },
];

for (const template of requiredTemplates) {
  const content = readFileSync(join(root, template.path), 'utf8');
  assert.match(content, /字段说明/);
  assert.match(content, /填写示例/);
  assert.match(content, /导入说明/);
  assert.ok(content.includes(template.title), `${template.path} should contain a template title`);
  assert.ok(content.includes(template.example), `${template.path} should contain a realistic example row`);

  for (const header of template.headers) {
    assert.ok(content.includes(header), `${template.path} should document column ${header}`);
  }

  const pageContent = readFileSync(join(root, template.page), 'utf8');
  assert.ok(pageContent.includes(`/${template.path.replace('public/', '')}`), `${template.page} should link ${template.path}`);
  assert.ok(pageContent.includes('下载导入模板'), `${template.page} should expose the template download action`);
}
