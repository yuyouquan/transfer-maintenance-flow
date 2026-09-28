import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const moduleCache = new Map();
function loadTypeScript(path) {
  if (moduleCache.has(path)) return moduleCache.get(path).exports;
  if (!existsSync(path)) return {};
  const compiledModule = { exports: {} };
  moduleCache.set(path, compiledModule);
  const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const nativeRequire = createRequire(path);
  const require = specifier => {
    if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      const candidate = specifier.startsWith('@/')
        ? resolve(root, 'src', specifier.slice(2)) : resolve(dirname(path), specifier);
      const file = [candidate, `${candidate}.ts`, `${candidate}/index.ts`].find(existsSync);
      assert.ok(file, `Missing local module: ${specifier}`);
      return loadTypeScript(file);
    }
    return nativeRequire(specifier);
  };
  new Function('require', 'module', 'exports', compiled)(require, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

const { getLegacyTaskAccess: access, canChangeLegacyTaskStatus: canChange, validateLegacyTaskInput: validate,
  createLegacyTask: create, updateLegacyTaskStatus: update } = loadTypeScript(resolve(root, 'src/lib/legacy-tasks.ts'));
assert.equal(typeof access, 'function', 'Legacy-task permission helpers must exist');

const spm = { id: 'maintenance-spm', name: '维护负责人', role: 'SPM' };
const owner = { id: 'owner', name: '任务责任人', role: '系统' };
const outsider = { id: 'other-spm', name: '外部SPM', role: 'SPM', isAdmin: true };
const users = [spm, owner, outsider];
const application = {
  id: 'app-one', status: 'in_progress',
  team: { research: [{ id: 'research-spm', role: 'SPM' }], maintenance: [spm] },
  pipeline: { maintenanceReview: 'success', maintenanceSpmReview: 'in_progress',
    roleProgress: [{ role: 'SPM', reviewStatus: 'completed' }] },
};
const task = { id: 'task-one', applicationId: application.id, responsiblePersonId: owner.id,
  responsiblePerson: owner.name, department: '系统部', description: '跟进测试结果', deadline: '2026-10-01',
  status: 'open', createdAt: '2026-09-28T01:00:00.000Z' };

assert.equal(access(application, spm, 'detail', task).canAdd, true);
assert.equal(access(application, spm, 'review', task).canEditStatus, true);
for (const status of ['completed', 'failed', 'cancelled']) {
  const terminal = { ...application, status };
  assert.equal(access(terminal, spm, 'detail', task).canAdd, true, `${status}: detail remains editable`);
  assert.equal(canChange(terminal, spm, 'detail', { ...task, status: 'resolved' }, 'open'), true);
  assert.equal(access(terminal, spm, 'review', task).canAdd, false);
  assert.equal(canChange(terminal, spm, 'review', task, 'resolved'), false);
}
for (const user of [outsider, { id: 'research-spm', name: '在研负责人', role: 'SPM' }]) {
  assert.equal(access(application, user, 'detail', task).canAdd, false, 'Global and research SPM roles confer no access');
  assert.equal(canChange(application, user, 'detail', task, 'resolved'), false);
}
assert.equal(access(undefined, spm, 'detail', task).canAdd, false);
const customRoleApplication = { ...application,
  roles: [{ id: 'role-lead', name: '交付主管', ipmRoleCode: 'MOCK_CUSTOM_LEAD', isSpm: true }],
  team: { ...application.team, maintenance: [{ ...spm, role: 'role-lead' }, outsider] },
};
assert.equal(access(customRoleApplication, spm, 'detail', task).canAdd, true, 'SPM uses the snapshot role ID, not its label');
assert.equal(access(customRoleApplication, outsider, 'detail', task).canAdd, false, 'A literal SPM role does not override a snapshot');
assert.equal(access(application, owner, 'detail', task).canResolve, true);
assert.equal(canChange(application, owner, 'detail', task, 'resolved'), true);
assert.equal(canChange(application, owner, 'detail', task, 'cancelled'), false);
assert.equal(canChange(application, owner, 'review', task, 'resolved'), false);
for (const status of ['resolved', 'cancelled']) {
  assert.equal(canChange(application, owner, 'detail', { ...task, status }, 'open'), false);
  assert.equal(canChange(application, owner, 'detail', { ...task, status }, 'resolved'), false);
}
assert.equal(access(application, { ...owner, id: 'same-name' }, 'detail', task).canResolve, false, 'IDs win over matching names');
assert.equal(access(application, owner, 'detail', { ...task, responsiblePersonId: undefined }).canResolve, true, 'Legacy name fallback is retained');
assert.equal(canChange(application, spm, 'detail', task, 'invalid'), false);
assert.equal(canChange(application, spm, 'detail', task, 'open'), false, 'Unchanged status is not a write');
assert.equal(canChange(application, spm, 'detail', { ...task, applicationId: 'other-app' }, 'resolved'), false);
assert.equal(canChange({ ...application, team: { ...application.team, maintenance: [outsider] } }, spm, 'detail', task, 'resolved'), false, 'Reassigned SPM loses access');
const closedReview = { ...application, pipeline: { ...application.pipeline, maintenanceSpmReview: 'success' } };
assert.equal(access(closedReview, spm, 'review', task).canAdd, false, 'Approved review cannot be edited');
const rejectedReview = { ...application, pipeline: { ...application.pipeline, maintenanceReview: 'in_progress',
  maintenanceSpmReview: 'not_started', roleProgress: [{ role: '系统', reviewStatus: 'rejected' }] } };
assert.equal(access(rejectedReview, spm, 'review', task).canAdd, true, 'Rejection handling is still an actionable review');

const input = { responsiblePersonId: ' owner ', department: ' 系统部 ', description: ' 跟进测试结果 ', deadline: ' 2026-10-01 ' };
assert.deepEqual(validate(input, users).values, { responsiblePersonId: 'owner', responsiblePerson: owner.name,
  department: '系统部', description: '跟进测试结果', deadline: '2026-10-01' });
for (const field of ['responsiblePersonId', 'department', 'description', 'deadline']) {
  assert.ok(validate({ ...input, [field]: '  ' }, users).error, `${field} cannot be blank`);
}
assert.ok(validate({ ...input, responsiblePersonId: 'missing-user' }, users).error);
for (const deadline of ['2026-02-29', '2026-02-30', '2026-13-01', '01/01/2026', '2026-1-01', '0000-01-01']) {
  assert.ok(validate({ ...input, deadline }, users).error, `Reject invalid date ${deadline}`);
}
assert.ok(validate({ ...input, deadline: '2028-02-29' }, users).values);
assert.ok(validate({ ...input, deadline: '2020-01-01' }, users).values, 'No unrequested future-only deadline restriction');
const created = create(application, spm, 'detail', input, users, 'new-task', '2026-09-28T01:00:00.000Z');
assert.equal(created.task?.status, 'open');
assert.equal(created.task?.applicationId, application.id);
assert.equal(created.task?.responsiblePersonId, owner.id);
assert.equal(created.task?.createdAt, '2026-09-28T01:00:00.000Z');
assert.ok(create(application, outsider, 'detail', input, users, 'new-task', task.createdAt).error);
assert.ok(create(closedReview, spm, 'review', input, users, 'new-task', task.createdAt).error);
assert.ok(create(application, spm, 'detail', { ...input, description: ' ' }, users, 'new-task', task.createdAt).error);

const foreignTask = { ...task, applicationId: 'other-app' };
const tasks = [task, foreignTask];
const changed = update(tasks, application, spm, 'detail', task.id, 'cancelled');
assert.equal(changed.tasks[0].status, 'cancelled');
assert.equal(changed.tasks[1], foreignTask, 'Same task ID in another application is untouched');
assert.equal(changed.previousStatus, 'open');
assert.equal(tasks[0], task, 'Original state is never mutated');
assert.equal(application.pipeline.maintenanceSpmReview, 'in_progress', 'Task writes do not affect the pipeline');
assert.equal(update(changed.tasks, application, owner, 'detail', task.id, 'resolved').tasks, changed.tasks, 'Revalidate current task status');
assert.equal(update(tasks, application, outsider, 'detail', task.id, 'resolved').tasks, tasks, 'Revalidate current user');
assert.equal(update(tasks, closedReview, spm, 'review', task.id, 'resolved').tasks, tasks, 'Revalidate current application stage');
assert.equal(update(tasks, application, spm, 'detail', 'missing-task', 'resolved').tasks, tasks);
console.log('PASS: legacy-task permissions, terminal detail access, ownership, validation, creation and scoped writes');
