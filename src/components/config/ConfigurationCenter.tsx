'use client';

import { useState } from 'react';
import { App, Breadcrumb, Card, Tabs, Typography } from 'antd';
import type { ProjectType } from '@/types/config';
import { PROJECT_TYPE_LABELS } from '@/types/config';
import { TemplateManager } from './TemplateManager';
import { TeamConfiguration } from './TeamConfiguration';

type Section = 'checklist' | 'review_element' | 'team';
export function ConfigurationCenter({ initialSection = 'checklist' }: { initialSection?: Section }) {
  const [projectType, setProjectType] = useState<ProjectType>('device');
  const [section, setSection] = useState<Section>(initialSection);
  const sectionLabels = { checklist: 'CheckList', review_element: '评审要素', team: '转维团队配置' };
  return <App><div style={{ padding: 24 }}>
    <Breadcrumb items={[{ title: '配置中心' }, { title: '转维材料模板配置' }, { title: PROJECT_TYPE_LABELS[projectType] }, { title: sectionLabels[section] }]} style={{ marginBottom: 20 }} />
    <Typography.Title level={4}>转维材料模板配置</Typography.Title>
    <Typography.Paragraph type="secondary">按项目类型管理材料模板与团队角色。当前为 Mock 演示，配置在页面切换间保留，刷新恢复初始数据。</Typography.Paragraph>
    <Tabs activeKey={projectType} onChange={key => { setProjectType(key as ProjectType); if (key === 'tos' && section === 'review_element') setSection('checklist'); }} items={(Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]).map(key => ({ key, label: PROJECT_TYPE_LABELS[key] }))} />
    <Card><Tabs activeKey={section} onChange={key => setSection(key as Section)} items={(['checklist', ...(projectType === 'device' ? ['review_element'] : []), 'team'] as Section[]).map(key => ({ key, label: sectionLabels[key] }))} />
      {section === 'team' ? <TeamConfiguration key={`${projectType}-team`} projectType={projectType} /> : <TemplateManager key={`${projectType}-${section}`} projectType={projectType} kind={section} />}
    </Card>
  </div></App>;
}
