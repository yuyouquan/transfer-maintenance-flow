'use client';

import React from 'react';
import { Typography, Tooltip } from 'antd';
import { FileTextOutlined, LinkOutlined, FolderOpenOutlined } from '@ant-design/icons';

const { Text } = Typography;

// --- Feishu doc title extraction from URL ---

const FEISHU_TITLE_MAP: Readonly<Record<string, string>> = {
  'docs': '飞书文档',
  'sheets': '飞书表格',
  'wiki': '飞书知识库',
  'mindnotes': '飞书思维笔记',
  'slides': '飞书幻灯片',
  'bitable': '飞书多维表格',
};

function extractFeishuTitle(url: string): string {
  // Try to extract meaningful title from feishu URL path
  // e.g. https://feishu.cn/docs/xxx-ipm-project → "飞书文档"
  // e.g. https://feishu.cn/wiki/xxx → "飞书知识库"
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    for (const part of pathParts) {
      if (FEISHU_TITLE_MAP[part]) {
        // Try to extract a slug-based title from the last path segment
        const lastPart = pathParts[pathParts.length - 1];
        const slug = lastPart
          .replace(/^[a-zA-Z0-9]{20,}$/, '') // pure ID, no title
          .replace(/^.*?-/, '') // remove leading hash
          .replace(/-/g, ' ')
          .trim();
        if (slug) {
          return `${FEISHU_TITLE_MAP[part]}: ${slug}`;
        }
        return FEISHU_TITLE_MAP[part];
      }
    }
  } catch {
    // not a valid URL
  }
  return '飞书文档';
}

// --- Link type detection ---

interface ParsedSegment {
  readonly type: 'text' | 'feishu' | 'samba' | 'link';
  readonly content: string;
  readonly url?: string;
  readonly title?: string;
}

const URL_REGEX = /https?:\/\/[^\s，。、；：！？）》\]]+/g;
const SAMBA_REGEX = /\\\\[^\s，。、；：！？）》\]]+/g;

function isFeishuUrl(url: string): boolean {
  return /feishu\.(cn|com|net)/i.test(url) || /lark\.(com|net)/i.test(url);
}

function parseEntryText(text: string): ReadonlyArray<ParsedSegment> {
  if (!text) return [];

  const segments: ParsedSegment[] = [];
  // Combine URL and samba patterns
  const combinedRegex = new RegExp(
    `(${URL_REGEX.source})|(${SAMBA_REGEX.source})`,
    'g',
  );

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combinedRegex.exec(text)) !== null) {
    // Add preceding text
    if (match.index > lastIndex) {
      const preceding = text.slice(lastIndex, match.index).trim();
      if (preceding) {
        segments.push({ type: 'text', content: preceding });
      }
    }

    const matched = match[0];
    if (match[1]) {
      // HTTP(S) URL
      if (isFeishuUrl(matched)) {
        segments.push({
          type: 'feishu',
          content: matched,
          url: matched,
          title: extractFeishuTitle(matched),
        });
      } else {
        segments.push({
          type: 'link',
          content: matched,
          url: matched,
        });
      }
    } else if (match[2]) {
      // Samba path
      segments.push({
        type: 'samba',
        content: matched,
        url: `file:///${matched.replace(/\\/g, '/')}`,
      });
    }

    lastIndex = match.index + matched.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) {
      segments.push({ type: 'text', content: remaining });
    }
  }

  return segments;
}

// --- Render a single segment ---

function SegmentRenderer({ segment }: { readonly segment: ParsedSegment }) {
  switch (segment.type) {
    case 'feishu':
      return (
        <Tooltip title={segment.content}>
          <a
            href={segment.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: '#4338ca', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <FileTextOutlined />
            {segment.title}
          </a>
        </Tooltip>
      );
    case 'samba':
      return (
        <Tooltip title={segment.content}>
          <a
            href={segment.url}
            style={{ fontSize: 12, color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <FolderOpenOutlined />
            {segment.content}
          </a>
        </Tooltip>
      );
    case 'link':
      return (
        <a
          href={segment.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: '#1677ff', display: 'inline-flex', alignItems: 'center', gap: 4, wordBreak: 'break-all' }}
        >
          <LinkOutlined />
          {segment.content}
        </a>
      );
    case 'text':
    default:
      return <Text style={{ fontSize: 12 }}>{segment.content}</Text>;
  }
}

// --- Main export ---

interface EntryContentRendererProps {
  readonly content?: string;
  readonly maxLines?: number;
}

export default function EntryContentRenderer({ content, maxLines = 3 }: EntryContentRendererProps) {
  if (!content) {
    return <span style={{ color: '#999' }}>-</span>;
  }

  const segments = parseEntryText(content);

  if (segments.length === 0) {
    return <span style={{ color: '#999' }}>-</span>;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflow: 'hidden',
        ...(maxLines ? {
          display: '-webkit-box',
          WebkitLineClamp: maxLines,
          WebkitBoxOrient: 'vertical' as const,
        } : {}),
      }}
    >
      {segments.map((seg, idx) => (
        <SegmentRenderer key={idx} segment={seg} />
      ))}
    </div>
  );
}
