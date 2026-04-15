'use client';

import React, { useRef, useCallback } from 'react';
import { Input, Button, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { InputRef } from 'antd';
import type { ColumnType } from 'antd/es/table';
import type { FilterDropdownProps } from 'antd/es/table/interface';

/**
 * Returns Ant Design column props that add a search input filter dropdown.
 * Usage: { ...getColumnSearchProps('dataIndex') }
 */
export function useColumnSearch<T>() {
  const searchInput = useRef<InputRef>(null);

  const getColumnSearchProps = useCallback(
    (dataIndex: keyof T & string): Pick<ColumnType<T>, 'filterDropdown' | 'filterIcon' | 'onFilter' | 'filterDropdownProps'> => ({
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
        <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
          <Input
            ref={searchInput}
            placeholder="搜索"
            value={selectedKeys[0] as string}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 80 }}
            >
              搜索
            </Button>
            <Button
              onClick={() => { clearFilters?.(); confirm(); }}
              size="small"
              style={{ width: 80 }}
            >
              重置
            </Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
      ),
      onFilter: (value, record) => {
        const val = record[dataIndex];
        if (val == null) return false;
        return String(val).toLowerCase().includes(String(value).toLowerCase());
      },
      filterDropdownProps: {
        onOpenChange: (visible) => {
          if (visible) {
            setTimeout(() => searchInput.current?.select(), 100);
          }
        },
      },
    }),
    [],
  );

  return { getColumnSearchProps };
}
