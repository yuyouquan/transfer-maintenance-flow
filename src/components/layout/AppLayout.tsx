'use client';

import React from 'react';
import { Layout, Menu, Avatar, Dropdown, Tag, type MenuProps } from 'antd';
import {
  ProjectOutlined,
  SettingOutlined,
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
        <div style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>当前用户</span>
          <div style={{ fontWeight: 600, marginTop: 4, fontSize: 14 }}>
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
        <span style={{ color: '#999', fontSize: 11 }}>
          <SwapOutlined style={{ marginRight: 4 }} />
          切换用户（测试用）
        </span>
      ),
      disabled: true,
    },
    ...allUsers.map((user) => ({
      key: user.id,
      label: (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '2px 0',
          fontWeight: user.id === currentUser.id ? 600 : 400,
        }}>
          <Avatar
            size="small"
            style={{
              background: user.id === currentUser.id ? '#4338ca' : '#e0e0e0',
              fontSize: 11,
              flexShrink: 0,
            }}
          >
            {user.name.slice(-1)}
          </Avatar>
          <span style={{ minWidth: 40 }}>{user.name}</span>
          <Tag style={{ fontSize: 11, lineHeight: '18px' }}>{user.role}</Tag>
          <span style={{ color: '#999', fontSize: 11, marginLeft: 'auto' }}>{user.department}</span>
          {user.id === currentUser.id && (
            <CheckCircleOutlined style={{ color: '#4338ca', fontSize: 14 }} />
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
          background: 'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 12px rgba(67, 56, 202, 0.35)',
          height: 56,
          lineHeight: '56px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            color: '#fff',
            fontSize: 18,
            fontWeight: 700,
            marginRight: 48,
            whiteSpace: 'nowrap',
            letterSpacing: 2,
            userSelect: 'none',
            cursor: 'pointer',
          }}
          onClick={() => router.push('/workbench')}
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
            fontSize: 14,
          }}
        />

        {/* User Dropdown */}
        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          trigger={['click']}
          styles={{ root: { minWidth: 300 } }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '5px 14px',
              borderRadius: 24,
              background: 'rgba(255,255,255,0.12)',
              transition: 'all 0.25s ease',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.22)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
            }}
          >
            <Avatar
              size={28}
              style={{
                background: 'rgba(255,255,255,0.25)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {currentUser.name.slice(-1)}
            </Avatar>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
              {currentUser.name}
            </span>
            <Tag
              color="rgba(255,255,255,0.18)"
              style={{
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.25)',
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

      <Content style={{ background: '#f0f2f5', minHeight: 'calc(100vh - 56px)' }}>
        {children}
      </Content>
    </Layout>
  );
}
