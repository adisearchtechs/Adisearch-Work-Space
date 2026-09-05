import SettingsSectionRuntime from '@/components/common/settings/settings-section-runtime';
import { PLACEHOLDER_SECTIONS } from '@/components/common/settings/placeholder-sections';
import MainLayout from '@/components/layout/main-layout';
import Header from '@/components/layout/headers/settings/header';
import { notFound } from 'next/navigation';

const DEDICATED_SECTIONS = new Set([
   'agent-personalization',
   'ai',
   'code-and-reviews',
   'connected-accounts',
   'integrations',
   'issue-labels',
   'issue-templates',
   'members',
   'notifications',
   'preferences',
   'profile',
   'project-statuses',
   'security',
]);

export default async function SettingsSectionPage({
   params,
}: {
   params: Promise<{ section: string }>;
}) {
   const { section } = await params;
   if (!DEDICATED_SECTIONS.has(section) && !PLACEHOLDER_SECTIONS[section]) notFound();

   return (
      <MainLayout header={<Header />} headersNumber={1}>
         <SettingsSectionRuntime section={section} />
      </MainLayout>
   );
}
