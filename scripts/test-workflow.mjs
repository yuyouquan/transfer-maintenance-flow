import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadTs } from './lib/load-ts.mjs';

assert.ok(existsSync('src/lib/workflow-roles.ts'), 'Application snapshot role resolver must exist');
const roles = loadTs('src/lib/workflow-roles.ts');
const custom = { id: 'release', name: '版本交付', ipmRoleCode: 'MOCK_RELEASE' };
const lead = { id: 'lead', name: '项目经理', ipmRoleCode: 'MOCK_LEAD', isSpm: true };
const app = { id: 'a', projectType: 'tos', roles: [lead, custom], team: {
  research: [{ id: 'one', name: '甲', role: 'lead' }, { id: 'two', name: '乙', role: 'release' }],
  maintenance: [{ id: 'three', name: '丙', role: 'lead' }, { id: 'four', name: '丁', role: 'release' }],
} };
assert.deepEqual(roles.getUserRoles(app, 'research', 'two'), ['release']);
assert.equal(roles.getRoleName(app, 'release'), '版本交付');
assert.equal(roles.getSpmMember(app, 'maintenance').id, 'three');
assert.deepEqual(roles.getUserRoles({team:{research:[{id:'u',role:'TPM'}],maintenance:[]}}, 'research', 'u'), ['测试']);
assert.equal(roles.getItemRole({responsibleRole:'lead',entryRoleId:'release'}, 'entry'), 'release');
assert.equal(roles.getItemRole({responsibleRole:'lead',reviewRoleId:'release'}, 'review'), 'release');
assert.equal(roles.computeRoleEntryStatus([], 'release'), 'completed');
assert.equal(roles.computeRoleReviewStatus([], 'release'), 'completed');
assert.equal(roles.computeRoleEntryStatus([{responsibleRole:'lead',entryRoleId:'release',entryStatus:'not_entered'}], 'release'), 'not_started');
assert.equal(roles.computeRoleReviewStatus([{responsibleRole:'lead',reviewRoleId:'release',reviewStatus:'rejected'}], 'release'), 'rejected');

const materials = loadTs('src/lib/application-materials.ts');
const row = {id:'row-1',seq:'V-01',content:'版本内容',type:'检查项',responsibleRole:'release',entryRole:'release',reviewRole:'lead',aiCheckRule:'核对版本'};
const config={roles:[lead,custom],checklistVersions:[{id:'v1',version:'v1.0',createdAt:'2026-09-28',rows:[row]}],reviewVersions:[]};
const generated=materials.generateApplicationMaterials(app,config);
assert.equal(generated.checklist[0].seq,'V-01');
assert.equal(generated.checklist[0].entryPersonId,'two');
assert.equal(generated.checklist[0].reviewPersonId,'three');
assert.equal(generated.review.length,0);
assert.equal(generated.checklist[0].templateItemId,'row-1');
const withInput={...generated.checklist[0],entryContent:'原交付内容',entryStatus:'entered',deliverables:[]};
assert.equal(materials.backfillMaterialItems(generated.checklist,[withInput])[0].entryContent,'原交付内容');
assert.equal(materials.backfillMaterialItems(generated.checklist,[withInput,{...withInput,id:'duplicate'}])[0].entryContent,undefined,'Ambiguous matches must not copy arbitrary content');
assert.equal(materials.backfillMaterialItems([{...generated.checklist[0],aiCheckRule:'不同规则'}],[withInput])[0].entryContent,undefined,'Changed row semantics require new input');
const configChanged={...config,roles:[{...custom,name:'改名后的角色'}]};
assert.equal(roles.getRoleName(app,'release'),'版本交付','Existing application snapshot remains unchanged');
assert.notDeepEqual(app.roles,configChanged.roles);
const { validateApplicationTeam, matchConfiguredMember } = loadTs('src/lib/project-team.ts');
assert.equal(validateApplicationTeam({ ...app.team, research: [app.team.research[1]] },config,'tos'),undefined,'Only template entry slots and maintenance SPM are required');
assert.match(validateApplicationTeam({...app.team,maintenance:[]},config,'tos'),/维护/);
assert.equal(matchConfiguredMember([{id:'mapped',ipmRoleCode:'MOCK_RELEASE'}],custom).id,'mapped');
assert.equal(matchConfiguredMember([{id:'wrong',role:'release'}],custom),null,'Missing IPM mapping must stay unassigned');
const { getMaterialActions } = loadTs('src/lib/workflow-access.ts');
const active = {...app,status:'in_progress',pipeline:{maintenanceSpmReview:'not_started'}};
const ready = {...generated.checklist[0],entryStatus:'entered',aiCheckStatus:'passed'};
assert.equal(getMaterialActions(active,[ready],'two').canEnter,true,'Entry owner still needs to submit ready material');
assert.equal(getMaterialActions(active,[ready],'three').canReview,false,'Unsubmitted material is not reviewable');
assert.equal(getMaterialActions(active,[{...ready,reviewStatus:'reviewing'}],'three').canReview,true);
assert.equal(getMaterialActions(active,[{...ready,reviewStatus:'reviewing'}],'two').canEnter,false);
assert.equal(roles.computeRoleEntryStatus([{...ready,reviewStatus:'rejected'}],'release'),'rejected','Rejection belongs to entry axis');
assert.equal(roles.computeRoleEntryStatus([{...ready,reviewStatus:'rejected'}],'lead'),'completed','Reviewer axis cannot reject unrelated entry role');
console.log('PASS: dynamic snapshot roles, axis assignment, zero-task roles, tOS material generation, safe unique reopen matching');
