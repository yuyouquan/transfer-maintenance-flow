import { redirect } from 'next/navigation';

// 兼容已有链接，审核权限由新页面统一校验。
export default async function LegacySqaReviewPage({ params }: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/workbench/${id}/maintenance-spm-review`);
}
