import type { Issue } from '@/mock-data/issues';
import type { Project } from '@/mock-data/projects';
import type { SavedViewFilter } from '@/lib/views/contracts';

export function filterIssuesForSavedView(filter: SavedViewFilter, source: Issue[]) {
   return source.filter((issue) => {
      if (filter.statusCategories && !filter.statusCategories.includes(issue.status.category)) return false;
      if (filter.statusIds && !filter.statusIds.includes(issue.status.id)) return false;
      if (filter.priorityIds && !filter.priorityIds.includes(issue.priority.id)) return false;
      if (filter.hasProject && !issue.project) return false;
      return true;
   });
}

export function filterProjectsForSavedView(filter: SavedViewFilter, source: Project[]) {
   return source.filter((project) => {
      if (filter.statusCategories && !filter.statusCategories.includes(project.status.category)) return false;
      if (filter.priorityIds && !filter.priorityIds.includes(project.priority.id)) return false;
      return true;
   });
}
