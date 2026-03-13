'use client';

import React from 'react';
import { Card, Button, Breadcrumb, Space, Tag } from 'antd';
import {
  FileTextOutlined,
  AuditOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { MOCK_CHECKLIST_TEMPLATES, MOCK_REVIEW_ELEMENT_TEMPLATES } from '@/mock';

interface ConfigCardData {
  readonly key: string;
  readonly title: string;
  readonly description: string;
  readonly icon: React.ReactNode;
  readonly path: string;
  readonly itemCount: number;
}

const CONFIG_CARDS: ReadonlyArray<ConfigCardData> = [
  {
    key: 'checklist',
    title: '转维材料配置',
    description: '管理转维材料CheckList模板，包括检查项、交接资料等配置。支持导入导出和版本管理。',
    icon: <FileTextOutlined style={{ fontSize: 32, color: '#4338ca' }} />,
    path: '/config/checklist',
    itemCount: MOCK_CHECKLIST_TEMPLATES.length,
  },
  {
    key: 'review-elements',
    title: '评审要素配置',
    description: '管理评审要素模板，包括评审标准、说明、责任角色等配置。支持导入导出和版本管理。',
    icon: <AuditOutlined style={{ fontSize: 32, color: '#4338ca' }} />,
    path: '/config/review-elements',
    itemCount: MOCK_REVIEW_ELEMENT_TEMPLATES.length,
  },
];

export default function ConfigPage() {
  const router = useRouter();

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        items={[{ title: '配置中心' }]}
        style={{ marginBottom: 24 }}
      />

      <h2 style={{ marginBottom: 24, fontSize: 20, fontWeight: 600 }}>
        配置中心
      </h2>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {CONFIG_CARDS.map((card) => (
          <Card
            key={card.key}
            hoverable
            style={{ width: 380, borderRadius: 8 }}
            styles={{ body: { padding: 24 } }}
          >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {card.icon}
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {card.title}
                  </div>
                  <Tag color="blue" style={{ marginTop: 4 }}>
                    {card.itemCount} 条配置
                  </Tag>
                </div>
              </div>

              <div style={{ color: '#666', fontSize: 14, lineHeight: 1.6 }}>
                {card.description}
              </div>

              <Button
                type="primary"
                icon={<RightOutlined />}
                onClick={() => router.push(card.path)}
                style={{ background: '#4338ca' }}
              >
                管理
              </Button>
            </Space>
          </Card>
        ))}
      </div>
    </div>
  );
}
