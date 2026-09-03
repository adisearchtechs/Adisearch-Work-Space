import { AlertTriangle, ListChecks, Search, type LucideIcon } from 'lucide-react';

export interface AgentExample {
   id: string;
   icon: LucideIcon;
   title: string;
   description: string;
   prompt: string;
}

/** Read-only prompts that match the capabilities exposed by the real workspace Agent. */
export const agentExamples: AgentExample[] = [
   {
      id: 'attention',
      icon: AlertTriangle,
      title: 'What needs attention?',
      description: 'Find urgent, overdue, or blocked work from current workspace data',
      prompt: 'What needs attention in this workspace right now?',
   },
   {
      id: 'research',
      icon: Search,
      title: 'Research the backlog',
      description: 'Search issues, projects, documents, and reviews for a topic',
      prompt: 'Summarize what the workspace currently knows about accessibility work.',
   },
   {
      id: 'progress',
      icon: ListChecks,
      title: 'Summarize progress',
      description: 'Review current cycles, milestones, projects, and dependencies',
      prompt: 'Summarize current delivery progress and the biggest risks.',
   },
];
