import { WorkspaceDependencyMap } from '@/components/common/workspace/workspace-dependency-map';
import MainLayout from '@/components/layout/main-layout';

export default function DependenciesPage() {
   return (
      <MainLayout>
         <WorkspaceDependencyMap />
      </MainLayout>
   );
}
