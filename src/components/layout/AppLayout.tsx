'use client';

import React from 'react';
import { Layout, Menu, Avatar, Dropdown, Tag, type MenuProps } from 'antd';
import {
  ProjectOutlined,
  SettingOutlined,
  UserOutlined,
  SwapOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useCurrentUser } from '@/context/UserContext';

const { Header, Content } = Layout;

interface AppLayoutProps {
  readonly children: React.ReactNode;
}

const NAV_ITEMS: MenuProps['items'] = [
  {
    key: '/workbench',
    icon: <ProjectOutlined />,
    label: '转维项目',
  },
  {
    key: '/config',
    icon: <SettingOutlined />,
    label: '配置中心',
  },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, switchUser, allUsers } = useCurrentUser();

  const selectedKey = pathname.startsWith('/config') ? '/config' : '/workbench';

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    router.push(key);
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'current-label',
      label: (
        <div style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ color: '#999', fontSize: 12 }}>当前用户</span>
          <div style={{ fontWeight: 600, marginTop: 2 }}>
            {currentUser.name}
            <Tag color="blue" style={{ marginLeft: 8, fontSize: 11 }}>
              {currentUser.role}
            </Tag>
          </div>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'switch-label',
      label: (
        <span style={{ color: '#999', fontSize: 12 }}>
          <SwapOutlined style={{ marginRight: 4 }} />
          切换用户（测试用）
        </span>
      ),
      disabled: true,
    },
    ...allUsers.map((user) => ({
      key: user.id,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar
            size="small"
            style={{
              background: user.id === currentUser.id ? '#4338ca' : '#d9d9d9',
              fontSize: 11,
            }}
          >
            {user.name.slice(-1)}
          </Avatar>
          <span>{user.name}</span>
          <Tag style={{ fontSize: 11, lineHeight: '18px' }}>{user.role}</Tag>
          <span style={{ color: '#999', fontSize: 11 }}>{user.department}</span>
          {user.id === currentUser.id && (
            <CheckCircleOutlined style={{ color: '#4338ca', marginLeft: 'auto' }} />
          )}
        </div>
      ),
      onClick: () => switchUser(user.id),
    })),
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#4338ca',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(67, 56, 202, 0.3)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            color: '#fff',
            fontSize: 17,
            fontWeight: 700,
            marginRight: 40,
            whiteSpace: 'nowrap',
            letterSpacing: 1,
          }}
        >
          转维流程系统
        </div>

        {/* Navigation Menu */}
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={NAV_ITEMS}
          onClick={handleMenuClick}
          style={{
            background: 'transparent',
            borderBottom: 'none',
            flex: 1,
            minWidth: 0,
          }}
        />

        {/* User Dropdown */}
        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          trigger={['click']}
          overlayStyle={{ minWidth: 280 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '4px 12px',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.15)',
              transition: 'background 0.2s',
            }}
          >
            <Avatar
              size="small"
              icon={<UserOutlined />}
              style={{ background: 'rgba(255,255,255,0.3)' }}
            />
            <span style={{ color: '#fff', fontSize: 13 }}>
              {currentUser.name}
            </span>
            <Tag
              color="rgba(255,255,255,0.2)"
              style={{
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                fontSize: 11,
                lineHeight: '18px',
                margin: 0,
              }}
            >
              {currentUser.role}
            </Tag>
          </div>
        </Dropdown>
      </Header>

      <Content style={{ background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
        {children}
      </Content>
    </Layout>
  );
}
