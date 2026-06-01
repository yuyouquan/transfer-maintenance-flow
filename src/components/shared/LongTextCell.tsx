'use client';

import React, { useCallback, useMemo } from 'react';
import { Button, Popover, Space, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

interface LongTextCellProps {
  readonly text?: string;
  readonly lines?: number;
  readonly emptyText?: string;
  readonly maxPopoverWidth?: number;
}

export function LongTextCell({
  text,
  lines = 2,
  emptyText = '-',
  maxPopoverWidth = 560,
}: LongTextCellProps) {
  const normalizedText = (text ?? '').trim();

  const handleCopy = useCallback(
    async (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      if (!normalizedText) return;

      try {
        await navigator.clipboard.writeText(normalizedText);
        message.success('已复制');
      } catch {
        message.error('复制失败，请手动选中文本复制');
      }
    },
    [normalizedText],
  );

  const popoverContent = useMemo(
    () => (
      <div style={{ maxWidth: maxPopoverWidth }}>
        <Space
          direction="vertical"
          size={8}
          style={{ width: '100%' }}
        >
          <div
            style={{
              maxHeight: '50vh',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.7,
              color: '#1f2937',
            }}
          >
            {normalizedText}
          </div>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={handleCopy}
            aria-label="复制完整内容"
            style={{ alignSelf: 'flex-start', paddingInline: 0 }}
          >
            复制
          </Button>
        </Space>
      </div>
    ),
    [handleCopy, maxPopoverWidth, normalizedText],
  );

  if (!normalizedText) {
    return <span style={{ color: '#9ca3af' }}>{emptyText}</span>;
  }

  return (
    <Popover
      placement="topLeft"
      trigger={['hover', 'click']}
      content={popoverContent}
    >
      <span
        style={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: lines,
          overflow: 'hidden',
          wordBreak: 'break-word',
          lineHeight: '20px',
          cursor: 'pointer',
          color: '#1f2937',
        }}
      >
        {normalizedText}
      </span>
    </Popover>
  );
}
