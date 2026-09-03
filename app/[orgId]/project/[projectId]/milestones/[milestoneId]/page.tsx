import ProjectMilestonePlanning from '@/components/common/projects/details/project-milestone-planning';
import Header from '@/components/layout/headers/project/header';
import MainLayout from '@/components/layout/main-layout';

interface ProjectMilestonePlanningPageProps {
   params: Promise<{ projectId: string; milestoneId: string }>;
}

export default async function ProjectMilestonePlanningPage({
   params,
}: ProjectMilestonePlanningPageProps) {
   const { projectId, milestoneId } = await params;

   return (
      <MainLayout header={<Header projectId={projectId} />}>
         <ProjectMilestonePlanning projectId={projectId} milestoneId={milestoneId} />
      </MainLayout>
   );
}
