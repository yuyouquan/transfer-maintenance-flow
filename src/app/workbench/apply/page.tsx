'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
} from 'antd';
import { UserOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { MOCK_PROJECTS } from '@/mock';
import type { Project, TeamMember, RoleType } from '@/types';

const { Title, Text } = Typography;
const { TextArea } = Input;

// --- 角色显示名映射 ---

const ROLE_DISPLAY_NAMES: Readonly<Record<RoleType, string>> = {
  SPM: 'SPM',
  TPM: 'TPM',
  SQA: 'SQA',
  '底软': '底软集成开发代表',
  '系统': '系统集成开发代表',
};

const ROLE_COLORS: Readonly<Record<RoleType, string>> = {
  SPM: '#4338ca',
  TPM: '#0891b2',
  SQA: '#059669',
  '底软': '#d97706',
  '系统': '#dc2626',
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

// --- 团队成员卡片组件 ---

interface MemberCardProps {
  readonly member: TeamMember;
}

function MemberCard({ member }: MemberCardProps) {
  const roleColor = ROLE_COLORS[member.role] ?? '#666';
  const roleLabel = ROLE_DISPLAY_NAMES[member.role] ?? member.role;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
        borderRadius: 8,
        background: '#fafafa',
      }}
    >
      <Avatar
        size={36}
        icon={<UserOutlined />}
        src={member.avatar || undefined}
        style={{ background: roleColor, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ display: 'block', fontSize: 14 }}>
          {member.name}
        </Text>
        <Tag
          color={roleColor}
          style={{ marginTop: 2, fontSize: 11, lineHeight: '18px' }}
        >
          {roleLabel}
        </Tag>
      </div>
    </div>
  );
}

// --- 团队面板组件 ---

interface TeamPanelProps {
  readonly title: string;
  readonly members: ReadonlyArray<TeamMember>;
  readonly borderColor: string;
}

function TeamPanel({ title, members, borderColor }: TeamPanelProps) {
  return (
    <Card
      title={
        <Space>
          <div
            style={{
              width: 4,
              height: 16,
              background: borderColor,
              borderRadius: 2,
            }}
          />
          <Text strong>{title}</Text>
        </Space>
      }
      size="small"
      style={{ flex: 1 }}
      styles={{ body: { padding: '12px 16px' } }}
    >
      <Row gutter={[12, 12]}>
        {members.map((member) => (
          <Col key={member.id} xs={24} sm={12} md={8}>
            <MemberCard member={member} />
          </Col>
        ))}
      </Row>
    </Card>
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

export default function ApplyPage() {
  const router = useRouter();
  const [form] = Form.useForm<ApplyFormValues>();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const projectOptions = useMemo(
    () =>
      MOCK_PROJECTS.map((project) => ({
        label: `${project.name} (${project.code})`,
        value: project.id,
      })),
    []
  );

  const selectedProject: Project | undefined = useMemo(
    () => MOCK_PROJECTS.find((p) => p.id === selectedProjectId),
    [selectedProjectId]
  );

  const handleProjectChange = useCallback(
    (value: string) => {
      setSelectedProjectId(value);
    },
    []
  );

  const handleSubmit = useCallback(
    async (values: ApplyFormValues) => {
      setSubmitting(true);
      try {
        // 模拟提交延迟
        await new Promise((resolve) => setTimeout(resolve, 800));

        message.success('转维申请提交成功！');
        router.push('/workbench');
      } catch {
        message.error('提交失败，请重试');
      } finally {
        setSubmitting(false);
      }
    },
    [router]
  );

  const handleCancel = useCallback(() => {
    router.push('/workbench');
  }, [router]);

  const spmMember = selectedProject?.team.research.find(
    (m) => m.role === 'SPM'
  );

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
            项目转维申请
          </Title>
        </div>

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
          >
            <Select
              placeholder="请搜索并选择项目"
              showSearch
              optionFilterProp="label"
              options={projectOptions}
              onChange={handleProjectChange}
              allowClear
              onClear={() => setSelectedProjectId(null)}
            />
          </Form.Item>

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

          {/* 项目人员 */}
          {selectedProject && (
            <Form.Item label="项目人员">
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <TeamPanel
                    title="在研团队"
                    members={selectedProject.team.research}
                    borderColor="#4338ca"
                  />
                </Col>
                <Col xs={24} md={12}>
                  <TeamPanel
                    title="维护团队"
                    members={selectedProject.team.maintenance}
                    borderColor="#059669"
                  />
                </Col>
              </Row>
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
              {GUIDE_CARDS.map((card) => (
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
