import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/db/prisma';
import CategoriesManager from '@/components/admin/CategoriesManager';

export default async function AdminCategoriesPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const t = await getTranslations('admin.categories');

  const categories = await prisma.category.findMany({
    where: { tenantId },
    include: { _count: { select: { processTemplates: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
      <CategoriesManager categories={categories} />
    </div>
  );
}
