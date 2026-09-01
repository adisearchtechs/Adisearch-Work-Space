'use client';

import { FilterSelector } from '@/components/data-table-filter/components/filter-selector';
import { useDataTableFilters } from '@/components/data-table-filter/hooks/use-data-table-filters';
import { useFilterStore } from '@/store/filter-store';
import { useIssuesStore } from '@/store/issues-store';
import { useProjectsStore } from '@/store/projects-store';
import { createIssueFilterColumns } from './issue-filter-columns';
import { useMemo } from 'react';

/**
 * Standalone "Filter" button for the header toolbars, on the same row as
 * the issue count / Display options (Linear-style). The applied filter
 * chips live in <IssueFilterBar/>, which only shows up once at least one
 * filter is active.
 */
export function IssueFilterTrigger() {
   const { issues } = useIssuesStore();
   const projects = useProjectsStore((state) => state.projects);
   const { filters, setFilters } = useFilterStore();
   const issueFilterColumns = useMemo(() => createIssueFilterColumns(projects), [projects]);

   const { columns, actions, strategy } = useDataTableFilters({
      strategy: 'client',
      data: issues,
      columnsConfig: issueFilterColumns,
      filters,
      onFiltersChange: setFilters,
   });

   return (
      <FilterSelector columns={columns} filters={filters} actions={actions} strategy={strategy} />
   );
}
