'use client';

import React from 'react';
import { Modal, Select, Button } from 'antd';
import { MOCK_USERS } from '@/mock';

export interface DelegateModalProps {
  /** 受控显示 */
  open: boolean;
  /** 弹窗标题,默认「委派任务」;审核场景可传「委派审核」 */
  title?: string;
  /** 已选条目数,显示在底部 */
  selectedCount: number;
  /** 当前已委派给的用户 ID(若有),用于回填 */
  currentAssignee?: string | null;
  /** 排除的用户 ID(通常是当前用户自己) */
  excludeUserIds?: ReadonlyArray<string>;
  /** 确认回调;参数为新选择的用户 ID,或 null 表示「取消委派」 */
  onConfirm: (toUserId: string | null) => void;
  /** 取消回调 */
  onCancel: () => void;
}

export default function DelegateModal(props: DelegateModalProps) {
  const {
    open,
    title = '委派任务',
    selectedCount,
    currentAssignee,
    excludeUserIds,
    onConfirm,
    onCancel,
  } = props;

  const [value, setValue] = React.useState<string | undefined>(currentAssignee ?? undefined);

  React.useEffect(() => {
    if (open) {
      setValue(currentAssignee ?? undefined);
    }
  }, [open, currentAssignee]);

  const excluded = React.useMemo(
    () => new Set(excludeUserIds ?? []),
    [excludeUserIds],
  );

  const options = React.useMemo(
    () =>
      MOCK_USERS
        .filter((u) => !excluded.has(u.id))
        .map((u) => ({ value: u.id, label: `${u.name} (${u.role} - ${u.department})` })),
    [excluded],
  );

  const handleOk = () => {
    if (!value) return;
    onConfirm(value);
  };

  const handleClear = () => {
    onConfirm(null);
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      width={500}
      destroyOnHidden
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button danger type="text" onClick={handleClear} disabled={!currentAssignee}>
            清空委派
          </Button>
          <div>
            <Button onClick={onCancel} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" onClick={handleOk} disabled={!value}>确认委派</Button>
          </div>
        </div>
      }
    >
      <div style={{ marginBottom: 8, color: '#666' }}>
        选择委派人员
      </div>
      <Select
        style={{ width: '100%' }}
        placeholder="搜索/选择委派人员"
        showSearch
        value={value}
        onChange={setValue}
        options={options}
        optionFilterProp="label"
      />
      <div style={{ marginTop: 12, color: '#999', fontSize: 12 }}>
        将委派 {selectedCount} 项任务
      </div>
    </Modal>
  );
}
