import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { UserProvider } from '@/context/UserContext';
import { ApplicationProvider } from '@/context/ApplicationContext';
import './globals.css';

export const metadata: Metadata = {
  title: '转维流程系统',
  description: '项目转维电子流管理系统',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <UserProvider>
            <ApplicationProvider>{children}</ApplicationProvider>
          </UserProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
