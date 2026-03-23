'use client';

import React from 'react';
import { Tooltip } from 'antd';
import type { PipelineState, PipelineNodeStatus, RoleNodeStatus, PipelineRole } from '@/types';

interface PipelineProgressProps {
  readonly pipeline: PipelineState;
  readonly showRoleDots?: boolean;
}

const NODE_LABELS = ['项目发起', '资料录入与AI检查', '维护审核', 'SQA审核', '信息变更'] as const;

const STATUS_COLORS: Record<PipelineNodeStatus, string> = {
  not_started: '#d9d9d9',
  in_progress: '#1677ff',
  success: '#52c41a',
  failed: '#ff4d4f',
};

const ROLE_STATUS_COLORS: Record<RoleNodeStatus, string> = {
  not_started: '#d9d9d9',
  in_progress: '#1677ff',
  completed: '#52c41a',
  rejected: '#ff4d4f',
};

const ROLE_STATUS_LABELS: Record<RoleNodeStatus, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  completed: '已完成',
  rejected: '被拒绝',
};

const ROLE_LABELS: Record<PipelineRole, string> = {
  'SPM': 'SPM',
  '测试': '测试',
  '底软': '底软',
  '系统': '系统',
  '影像': '影像',
};

export default function PipelineProgress({ pipeline, showRoleDots = true }: PipelineProgressProps) {
  const nodeStatuses: ReadonlyArray<PipelineNodeStatus> = [
    pipeline.projectInit,
    pipeline.dataEntry,
    pipeline.maintenanceReview,
    pipeline.sqaReview,
    pipeline.infoChange,
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, padding: '20px 0' }}>
      {NODE_LABELS.map((label, index) => {
        const status = nodeStatuses[index];
        const color = STATUS_COLORS[status];
        const isLast = index === NODE_LABELS.length - 1;
        const showDots = showRoleDots && (index === 1 || index === 2);

        return (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 100 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
              <div style={{ marginTop: 8, fontSize: 13, color: '#333', textAlign: 'center', whiteSpace: 'nowrap' }}>
                {label}
              </div>
              {showDots && (
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {pipeline.roleProgress.map((rp) => {
                    const roleStatus = index === 1 ? rp.entryStatus : rp.reviewStatus;
                    const dotColor = ROLE_STATUS_COLORS[roleStatus];
                    return (
                      <Tooltip
                        key={rp.role}
                        title={`${ROLE_LABELS[rp.role]}: ${ROLE_STATUS_LABELS[roleStatus]}`}
                      >
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: dotColor,
                            cursor: 'pointer',
                            border: '1px solid rgba(0,0,0,0.1)',
                          }}
                        />
                      </Tooltip>
                    );
                  })}
                </div>
              )}
            </div>
            {!isLast && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: '#e0e0e0',
                  marginTop: 15,
                  minWidth: 60,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
