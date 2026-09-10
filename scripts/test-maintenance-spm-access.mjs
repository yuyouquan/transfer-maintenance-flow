import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/maintenance-spm-review.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { getMaintenanceSpmReviewAccess: access } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const application = {
  status: 'in_progress',
  team: { maintenance: [{ id: 'assigned-spm', role: 'SPM' }] },
  pipeline: {
    maintenanceReview: 'success',
    maintenanceSpmReview: 'in_progress',
    roleProgress: ['SPM', '测试', '底软', '系统', '影像'].map(role => ({ role, reviewStatus: 'completed' })),
  },
};

assert.equal(access(application, 'assigned-spm').canApprove, true);
for (const user of ['research-spm', 'sqa', 'other-project-spm']) {
  assert.equal(access(application, user).canApprove, false);
  assert.equal(access(application, user).canReject, false);
}
const rejected = {
  ...application,
  pipeline: {
    ...application.pipeline,
    maintenanceReview: 'in_progress',
    roleProgress: application.pipeline.roleProgress.map(role => role.role === '系统' ? { ...role, reviewStatus: 'rejected' } : role),
  },
};
assert.equal(access(rejected, 'assigned-spm').canApprove, false, 'A stale final-stage status cannot bypass domain rejection');
assert.equal(access(rejected, 'assigned-spm').canReject, true);
for (const status of ['failed', 'completed', 'cancelled']) {
  assert.equal(access({ ...application, status }, 'assigned-spm').canReject, false);
}
assert.equal(access({ ...application, pipeline: { ...application.pipeline, maintenanceSpmReview: 'success' } }, 'assigned-spm').canReject, false);
assert.equal(access({ ...rejected, pipeline: { ...rejected.pipeline, maintenanceSpmReview: 'success' } }, 'assigned-spm').canReject, false, 'An already-approved final review cannot be reopened by a domain change');
assert.equal(access({ ...application, pipeline: { ...application.pipeline, roleProgress: [] } }, 'assigned-spm').canApprove, false);
const reassigned = { ...application, team: { maintenance: [{ id: 'new-spm', role: 'SPM' }] } };
assert.equal(access(reassigned, 'assigned-spm').canApprove, false);
assert.equal(access(reassigned, 'new-spm').canApprove, true);
assert.equal(access(undefined, 'assigned-spm').canApprove, false);
console.log('PASS: assigned reviewer, other roles, rejection, terminal states, missing roles and reassignment');
