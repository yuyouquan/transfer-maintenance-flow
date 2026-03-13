'use client';

import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, type MenuProps } from 'antd';
import {
  ProjectOutlined,
  SettingOutlined,
  UserOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { CURRENT_USER } from '@/mock';

const { Header, Sider, Content } = Layout;

interface AppLayoutProps {
  readonly children: React.ReactNode;
}

const MENU_ITEMS: MenuProps['items'] = [
  {
    key: '/workbench',
    icon: <ProjectOutlined />,
    label: '转维项目',
  },
  {
    key: '/config',
    icon: <SettingOutlined />,
    label: '设置',
  },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const selectedKey = pathname.startsWith('/config') ? '/config' : '/workbench';

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    router.push(key);
  };

  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', label: `${CURRENT_USER.name} (${CURRENT_USER.role})` },
    { key: 'logout', label: '退出登录' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        style={{ background: '#4338ca' }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: collapsed ? 14 : 16,
            fontWeight: 600,
            padding: '0 16px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {collapsed ? '转维' : '转维流程系统'}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[selectedKey]}
          items={MENU_ITEMS}
          onClick={handleMenuClick}
          style={{ background: 'transparent' }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 16,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Avatar
              icon={<UserOutlined />}
              style={{ cursor: 'pointer', background: '#4338ca' }}
            />
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, background: '#f5f5f5', minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
