import ProjectMilestones from '@/components/common/projects/details/project-milestones';
import Header from '@/components/layout/headers/project/header';
import MainLayout from '@/components/layout/main-layout';

interface ProjectMilestonesPageProps {
   params: Promise<{ projectId: string }>;
}

export default async function ProjectMilestonesPage({ params }: ProjectMilestonesPageProps) {
   const { projectId } = await params;

   return (
      <MainLayout header={<Header projectId={projectId} />}>
         <ProjectMilestones projectId={projectId} />
      </MainLayout>
   );
}
