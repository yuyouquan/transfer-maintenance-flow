'use client';

import React, { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import {
  Form,
  Select,
  DatePicker,
  Input,
  Button,
  Card,
  Avatar,
  Image,
  message,
  Typography,
  Row,
  Col,
  Space,
  Descriptions,
  Tag,
  Alert,
} from 'antd';
import {
  UserOutlined,
  ArrowLeftOutlined,
  SwapOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { MOCK_PROJECTS, MOCK_USERS } from '@/mock';
import dayjs from 'dayjs';
import type { Project, TeamMember, RoleType, TransferApplication } from '@/types';
import { useCurrentUser } from '@/context/UserContext';
import { useApplications } from '@/context/ApplicationContext';
import { useConfiguration } from '@/context/ConfigurationContext';
import { PROJECT_TYPE_LABELS } from '@/types/config';
import { getSpmMember } from '@/lib/workflow-roles';
import { matchConfiguredMember, validateApplicationTeam } from '@/lib/project-team';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ROLE_COLORS: Readonly<Record<RoleType, string>> = {
  SPM: '#4338ca',
  TPM: '#0891b2',
  SQA: '#059669',
  '底软': '#d97706',
  '系统': '#dc2626',
  '影像': '#7c3aed',
};

// --- 转维指南卡片数据 ---

interface GuideCard {
  readonly title: string;
  readonly description: string;
  readonly imagePlaceholder: string;
}

const GUIDE_CARDS: ReadonlyArray<GuideCard> = [
  {
    title: '转维流程概览',
    description: '了解转维流程的整体步骤和关键节点',
    imagePlaceholder: '转维流程概览图',
  },
  {
    title: '转维CheckList',
    description: '查看转维所需的检查项和交付物清单',
    imagePlaceholder: '转维CheckList图',
  },
  {
    title: '转维评审要素',
    description: '了解转维评审的关键评审标准和要素',
    imagePlaceholder: '转维评审要素图',
  },
];

// --- 表单值类型 ---

interface ApplyFormValues {
  readonly projectId: string;
  readonly plannedReviewDate: unknown;
  readonly remark: string;
}

// --- 可编辑成员选择组件 ---

interface MemberSelectProps {
  readonly role: RoleType;
  readonly roleLabel: string;
  readonly member: TeamMember | null;
  readonly teamType: 'research' | 'maintenance';
  readonly onChangeMember: (teamType: 'research' | 'maintenance', role: RoleType, userId: string | null) => void;
  readonly allMembers: ReadonlyArray<TeamMember>;
}

function MemberSelect({ role, roleLabel, member, teamType, onChangeMember, allMembers }: MemberSelectProps) {
  const roleColor = ROLE_COLORS[role] ?? '#666';

  const availableOptions = allMembers
    .map((m) => ({
      label: `${m.name}（${m.department}）`,
      value: m.id,
    }));

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 8,
        background: '#fafafa',
        border: '1px solid #f0f0f0',
        minHeight: 52,
      }}
    >
      <Avatar
        size={32}
        icon={<UserOutlined />}
        style={{ background: member ? roleColor : '#d9d9d9', flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Tag
          color={roleColor}
          style={{ fontSize: 11, lineHeight: '18px', marginBottom: 4 }}
        >
          {roleLabel}
        </Tag>
        <Select
          size="small"
          aria-label={`${teamType === 'research' ? '在研' : '维护'}团队-${roleLabel}`}
          placeholder="请选择人员"
          value={member?.id ?? undefined}
          options={availableOptions}
          onChange={(val) => onChangeMember(teamType, role, val ?? null)}
          showSearch
          optionFilterProp="label"
          allowClear
          onClear={() => onChangeMember(teamType, role, null)}
          style={{ width: '100%' }}
          popupMatchSelectWidth={false}
        />
      </div>
    </div>
  );
}

// --- 转维指南卡片组件 ---

interface GuideCardItemProps {
  readonly card: GuideCard;
}

function GuideCardItem({ card }: GuideCardItemProps) {
  const placeholderSrc = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
      <rect fill="#f0f0f0" width="400" height="240" rx="8"/>
      <text x="200" y="120" text-anchor="middle" dominant-baseline="central" fill="#999" font-size="16" font-family="sans-serif">${card.imagePlaceholder}</text>
    </svg>`
  )}`;

  return (
    <Card
      hoverable
      size="small"
      style={{ height: '100%' }}
      cover={
        <div style={{ padding: '12px 12px 0' }}>
          <Image
            src={placeholderSrc}
            alt={card.title}
            style={{
              borderRadius: 6,
              width: '100%',
              height: 160,
              objectFit: 'cover',
            }}
            preview={{ mask: '点击预览' }}
          />
        </div>
      }
    >
      <Card.Meta
        title={<Text strong style={{ fontSize: 14 }}>{card.title}</Text>}
        description={
          <Text type="secondary" style={{ fontSize: 12 }}>
            {card.description}
          </Text>
        }
      />
    </Card>
  );
}

// --- 主页面组件 ---

function ApplyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromId = searchParams?.get('from') ?? null;
  const boundProjectId = searchParams?.get('projectId') ?? null;
  const { configurations } = useConfiguration();
  const { currentUser } = useCurrentUser();
  const { applications, addApplication, reopenApplication } = useApplications();
  const [form] = Form.useForm<ApplyFormValues>();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Editable team state: role → member mapping
  const [researchMembers, setResearchMembers] = useState<ReadonlyArray<{ role: RoleType; member: TeamMember | null }>>([]);
  const [maintenanceMembers, setMaintenanceMembers] = useState<ReadonlyArray<{ role: RoleType; member: TeamMember | null }>>([]);

  // Source application when reopening a failed flow
  const sourceApp = useMemo(
    () => (fromId ? applications.find((a) => a.id === fromId) : undefined),
    [fromId, applications],
  );
  const isReopen = Boolean(sourceApp);

  // Guard: reopening requires project SPM or admin permission
  const canReopenSource = useMemo(() => {
    if (!sourceApp) return false;
    if (currentUser.isAdmin) return true;
    return getSpmMember(sourceApp, 'research')?.id === currentUser.id;
  }, [sourceApp, currentUser]);

  // Projects with active (in_progress/completed) applications cannot be selected again.
  // Failed/cancelled applications do not block re-apply.
  const activeProjectIds = useMemo(
    () => new Set(
      applications
        .filter((a) => a.status === 'in_progress' || a.status === 'completed')
        .map((a) => a.projectId),
    ),
    [applications],
  );

  const projectOptions = useMemo(
    () =>
      MOCK_PROJECTS
        .filter((project) => !activeProjectIds.has(project.id))
        .map((project) => ({
          label: `${project.name} (${project.code})`,
          value: project.id,
        })),
    [activeProjectIds],
  );

  const selectedProject: Project | undefined = useMemo(
    () => MOCK_PROJECTS.find((p) => p.id === selectedProjectId),
    [selectedProjectId]
  );

  const projectType = selectedProject?.projectType ?? 'device';
  const config = configurations[projectType];
  const configuredRoles = config.roles;

  const initTeamFromProject = useCallback((project: Project) => {
    const roles = configurations[project.projectType ?? 'device'].roles;
    setResearchMembers(roles.map(role => ({ role: role.id, member: matchConfiguredMember(project.team.research, role) })));
    setMaintenanceMembers(roles.map(role => ({ role: role.id, member: matchConfiguredMember(project.team.maintenance, role) })));
  }, [configurations]);

  const handleProjectChange = useCallback(
    (value: string) => {
      setSelectedProjectId(value);
      const project = MOCK_PROJECTS.find((p) => p.id === value);
      if (project) {
        initTeamFromProject(project);
      }
    },
    [initTeamFromProject]
  );

  const handleClearProject = useCallback(() => {
    setSelectedProjectId(null);
    setResearchMembers([]);
    setMaintenanceMembers([]);
  }, []);

  // Pre-fill form when reopening from a failed application
  useEffect(() => {
    if (!sourceApp) return;
    setSelectedProjectId(sourceApp.projectId);
    form.setFieldsValue({
      projectId: sourceApp.projectId,
      plannedReviewDate: sourceApp.plannedReviewDate ? dayjs(sourceApp.plannedReviewDate) : undefined,
      remark: sourceApp.remark,
    });

    const project = MOCK_PROJECTS.find(p => p.id === sourceApp.projectId);
    if (project) initTeamFromProject(project);
  }, [sourceApp, form, initTeamFromProject]);

  useEffect(() => {
    if (sourceApp || !boundProjectId) return;
    const project = MOCK_PROJECTS.find(p => p.id === boundProjectId);
    if (project) {
      form.setFieldValue('projectId', project.id);
      setSelectedProjectId(project.id);
      initTeamFromProject(project);
    }
  }, [boundProjectId, sourceApp, form, initTeamFromProject]);

  const handleChangeMember = useCallback(
    (teamType: 'research' | 'maintenance', role: RoleType, userId: string | null) => {
      const newMember = userId ? MOCK_USERS.find((u) => u.id === userId) ?? null : null;

      if (teamType === 'research') {
        setResearchMembers((prev) =>
          prev.map((row) =>
            row.role === role ? { ...row, member: newMember } : row
          )
        );
      } else {
        setMaintenanceMembers((prev) =>
          prev.map((row) =>
            row.role === role ? { ...row, member: newMember } : row
          )
        );
      }
    },
    []
  );

  const handleSubmit = useCallback(
    async (values: ApplyFormValues) => {
      if (!selectedProject) return;
      if (activeProjectIds.has(selectedProject.id)) { message.warning('该项目已有生效的转维申请'); return; }
      if (sourceApp && (!canReopenSource || sourceApp.status !== 'failed' || sourceApp.reopenedAsId)) { message.warning('当前申请不可重新发起'); return; }
      const snapshotTeam = (members: typeof researchMembers): TeamMember[] => members.flatMap(row => {
        const role = configuredRoles.find(r => r.id === row.role);
        return row.member && role ? [{ ...row.member, role: role.id, roleName: role.name, ipmRoleCode: role.ipmRoleCode }] : [];
      });
      const team = { research: snapshotTeam(researchMembers), maintenance: snapshotTeam(maintenanceMembers) };
      const problem = validateApplicationTeam(team, config, projectType);
      if (problem) { message.warning(problem); return; }
      setSubmitting(true);
      try {
        const now = new Date().toISOString();
        const newApp: TransferApplication = {
          id: `app-${Date.now()}`,
          projectId: selectedProject.id,
          projectType,
          roles: configuredRoles.map(role => ({ ...role })),
          templateVersions: { checklist: config.checklistVersions[0].id, ...(projectType === 'device' ? { review_element: config.reviewVersions[0]?.id } : {}) },
          projectName: selectedProject.name,
          applicant: currentUser.name,
          applicantId: currentUser.id,
          team,
          plannedReviewDate: values.plannedReviewDate
            ? dayjs(values.plannedReviewDate as string | Date).format('YYYY-MM-DD')
            : '',
          remark: values.remark ?? '',
          status: 'in_progress',
          predecessorId: sourceApp?.id,
          pipeline: {
            projectInit: 'success',
            dataEntry: 'in_progress',
            maintenanceReview: 'not_started',
            maintenanceSpmReview: 'not_started',
            infoChange: 'not_started',
            roleProgress: configuredRoles.map(role => ({ role: role.id, entryStatus: 'not_started', reviewStatus: 'not_started' })),
          },
          createdAt: now,
          updatedAt: now,
        };

        if (sourceApp) {
          reopenApplication(sourceApp.id, newApp);
          message.success('转维申请已重新发起，匹配成功的历史录入已回填');
        } else {
          addApplication(newApp);
          message.success('转维申请提交成功！');
        }
        router.push('/workbench');
      } catch {
        message.error('提交失败，请重试');
      } finally {
        setSubmitting(false);
      }
    },
    [router, selectedProject, currentUser, researchMembers, maintenanceMembers, addApplication, reopenApplication, sourceApp, activeProjectIds, canReopenSource, configuredRoles, config, projectType]
  );

  const handleCancel = useCallback(() => {
    router.push('/workbench');
  }, [router]);

  const spmMember = selectedProject?.team.research.find(
    (m) => m.role === 'SPM'
  );

  // Block unauthorized reopen access (direct URL typing)
  if (isReopen && sourceApp && (!canReopenSource || sourceApp.status !== 'failed' || sourceApp.reopenedAsId)) {
    const reason = sourceApp.reopenedAsId
      ? '该申请已被重新发起过，不能再次重开'
      : '只有该项目的 SPM 或系统管理员可以重新发起转维申请';
    return (
      <div style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
        <Alert type="warning" showIcon title="无权限重新发起" description={reason} style={{ marginBottom: 16 }} />
        <Button onClick={() => router.push(`/workbench/${sourceApp.id}`)}>返回详情</Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Card
        style={{ borderRadius: 12 }}
        styles={{ body: { padding: '24px 32px 32px' } }}
      >
        {/* 页面标题 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 28,
          }}
        >
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleCancel}
            style={{ padding: '4px 8px' }}
          />
          <Title level={4} style={{ margin: 0 }}>
            {isReopen ? '重新发起转维申请' : '项目转维申请'}
          </Title>
          {isReopen && (
            <Tag icon={<RedoOutlined />} color="orange" style={{ marginLeft: 4 }}>
              重开
            </Tag>
          )}
        </div>

        {isReopen && sourceApp && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 20 }}
            title="基于已终止的转维申请重新发起"
            description={
              <div style={{ fontSize: 13 }}>
                <div>原申请 维护SPM 驳回原因：{sourceApp.failureReason ?? '（无）'}</div>
                <div style={{ marginTop: 4, color: '#666' }}>
                  发起后将按当前项目类型的最新模板创建新流水线；仅唯一匹配的历史录入会回填，新增或规则变化的项需要重新录入。AI 检查与维护审核结果会清空，由各角色负责人重新提交。
                </div>
              </div>
            }
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark="optional"
          size="large"
        >
          {/* 项目选择 */}
          <Form.Item
            label="项目选择"
            name="projectId"
            rules={[{ required: true, message: '请选择项目' }]}
            extra={isReopen ? '重开流程锁定原项目，如需更换请返回发起新申请' : undefined}
          >
            <Select
              placeholder="请搜索并选择项目"
              showSearch
              optionFilterProp="label"
              options={projectOptions}
              onChange={handleProjectChange}
              allowClear={!isReopen && !boundProjectId}
              onClear={handleClearProject}
              disabled={isReopen || Boolean(boundProjectId)}
            />
          </Form.Item>

          {selectedProject && <Tag color="blue" style={{ marginBottom: 16 }}>{PROJECT_TYPE_LABELS[projectType]}</Tag>}
          {/* 项目 SPM 信息 */}
          {selectedProject && spmMember && (
            <Descriptions
              size="small"
              column={2}
              style={{ marginBottom: 24 }}
              items={[
                {
                  key: 'spm',
                  label: '项目SPM',
                  children: (
                    <Space>
                      <Avatar
                        size="small"
                        icon={<UserOutlined />}
                        style={{ background: ROLE_COLORS.SPM }}
                      />
                      <Text>{spmMember.name}</Text>
                      <Text type="secondary">({spmMember.department})</Text>
                    </Space>
                  ),
                },
                {
                  key: 'code',
                  label: '项目代号',
                  children: <Text>{selectedProject.code}</Text>,
                },
              ]}
            />
          )}

          {/* 项目人员 - 一一对应布局 */}
          {selectedProject && researchMembers.length > 0 && (
            <Form.Item label="项目人员" required>
              <Card
                size="small"
                style={{ borderRadius: 8 }}
                styles={{ body: { padding: '16px 20px' } }}
              >
                <p style={{ color: '#666', marginTop: 0 }}>请为模板涉及的录入、审核角色及 SPM 配置人员。同一人可承担多个角色。</p>
                {/* 表头 */}
                <Row gutter={16} style={{ marginBottom: 12 }}>
                  <Col span={11}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 4,
                          height: 16,
                          background: '#4338ca',
                          borderRadius: 2,
                        }}
                      />
                      <Text strong style={{ fontSize: 14, color: '#4338ca' }}>在研团队</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>（自动获取，可修改）</Text>
                    </div>
                  </Col>
                  <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <SwapOutlined style={{ color: '#bbb', fontSize: 16 }} />
                  </Col>
                  <Col span={11}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 4,
                          height: 16,
                          background: '#059669',
                          borderRadius: 2,
                        }}
                      />
                      <Text strong style={{ fontSize: 14, color: '#059669' }}>维护团队</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>（自动获取，可修改）</Text>
                    </div>
                  </Col>
                </Row>

                {/* 对应行：SPM, TPM, 底软, 系统 */}
                {configuredRoles.map((roleConfig, idx) => {
                  const role = roleConfig.id;
                  const resRow = researchMembers.find((r) => r.role === role);
                  const mainRow = maintenanceMembers.find((r) => r.role === role);
                  return (
                    <Row key={role} gutter={16} style={{ marginBottom: idx < configuredRoles.length - 1 ? 8 : 0 }}>
                      <Col span={11}>
                        <MemberSelect
                          role={role}
                          roleLabel={roleConfig.name}
                          member={resRow?.member ?? null}
                          teamType="research"
                          onChangeMember={handleChangeMember}
                          allMembers={MOCK_USERS}
                        />
                      </Col>
                      <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div
                          style={{
                            width: 1,
                            height: '100%',
                            minHeight: 40,
                            background: '#f0f0f0',
                            position: 'relative',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: '#f5f5f5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              color: '#bbb',
                            }}
                          >
                            ↔
                          </div>
                        </div>
                      </Col>
                      <Col span={11}>
                        <MemberSelect
                          role={role}
                          roleLabel={roleConfig.name}
                          member={mainRow?.member ?? null}
                          teamType="maintenance"
                          onChangeMember={handleChangeMember}
                          allMembers={MOCK_USERS}
                        />
                      </Col>
                    </Row>
                  );
                })}

              </Card>
            </Form.Item>
          )}

          {/* 计划评审日期 */}
          <Form.Item
            label="计划评审日期"
            name="plannedReviewDate"
            rules={[{ required: true, message: '请选择计划评审日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="请选择计划评审日期"
              format="YYYY-MM-DD"
            />
          </Form.Item>

          {/* 备注 */}
          <Form.Item label="备注" name="remark">
            <TextArea
              rows={4}
              placeholder="请输入备注信息（选填）"
              maxLength={500}
              showCount
            />
          </Form.Item>

          {/* 转维指南 */}
          <Form.Item label="转维指南">
            <Row gutter={16}>
              {GUIDE_CARDS.filter(card => projectType !== 'tos' || card.title !== '转维评审要素').map((card) => (
                <Col key={card.title} xs={24} sm={8}>
                  <GuideCardItem card={card} />
                </Col>
              ))}
            </Row>
          </Form.Item>

          {/* 底部按钮 */}
          <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
            <Space size="middle">
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{ minWidth: 100, background: '#4338ca' }}
              >
                提交
              </Button>
              <Button onClick={handleCancel} style={{ minWidth: 100 }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#999' }}>加载中...</div>}>
      <ApplyPageContent />
    </Suspense>
  );
}
