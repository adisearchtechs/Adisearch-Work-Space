import { Issue } from './issues';
import { User, users } from './users';

/* -------------------------------------------------------------------------- */
/*                         Rich content block model                           */
/* -------------------------------------------------------------------------- */

/**
 * Structured description content. Text supports lightweight inline
 * formatting: `code` and **bold** (parsed by the block renderer).
 */
export type ContentBlock =
   | { type: 'heading'; text: string; level?: 1 | 2 }
   | { type: 'paragraph'; text: string }
   | { type: 'bullet-list'; items: string[] }
   | { type: 'numbered-list'; items: string[] }
   | { type: 'checklist'; items: { text: string; checked: boolean }[] }
   | { type: 'code'; language: string; code: string }
   | { type: 'image'; alt: string; caption?: string; aspect?: 'wide' | 'video' | 'square' }
   | { type: 'video'; title: string; duration?: string }
   | { type: 'quote'; text: string; author?: string }
   | { type: 'divider' }
   | { type: 'issue-ref'; identifier: string; note?: string };

export interface CommentReaction {
   emoji: string;
   count: number;
}

export type ActivityItem =
   | {
        kind: 'event';
        id: string;
        actor: User;
        /** e.g. 'created' | 'status' | 'label' | 'priority' | 'cycle' | 'blocked' | 'unblocked' | 'related' | 'pr' */
        event: string;
        text: string;
        timeAgo: string;
     }
   | {
        kind: 'comment';
        id: string;
        actor: User;
        timeAgo: string;
        body: ContentBlock[];
        reactions?: CommentReaction[];
     };

export interface PrLink {
   id: string;
   title: string;
   status: 'open' | 'merged' | 'draft';
}

export interface IssueDetail {
   identifier: string;
   description: ContentBlock[];
   activity: ActivityItem[];
   subIssueIds?: string[];
   relatedIds?: string[];
   blockedByIds?: string[];
   prLinks?: PrLink[];
   milestone?: string;
}

/* -------------------------------------------------------------------------- */
/*                        Handcrafted issue details                           */
/* -------------------------------------------------------------------------- */

const details: IssueDetail[] = [
   {
      identifier: 'ADI-703',
      description: [
         { type: 'heading', text: 'Context' },
         {
            type: 'paragraph',
            text: 'The current focus trap in `Dialog` relies on a hand-rolled `focusin` listener. It breaks as soon as a nested portal (Select, Combobox, DatePicker) renders its content outside the dialog subtree: focus is yanked back to the dialog and the nested widget closes.',
         },
         { type: 'heading', text: 'Proposed approach' },
         {
            type: 'paragraph',
            text: 'Track an **allowlist of portal roots** registered through context. Any element inside a registered root is treated as part of the dialog for focus containment purposes.',
         },
         {
            type: 'code',
            language: 'tsx',
            code: `const PortalRootContext = createContext<Set<HTMLElement>>(new Set());

export function useDialogPortalRoot(node: HTMLElement | null) {
   const roots = useContext(PortalRootContext);
   useEffect(() => {
      if (!node) return;
      roots.add(node);
      return () => void roots.delete(node);
   }, [node, roots]);
}`,
         },
         { type: 'heading', text: 'Acceptance criteria' },
         {
            type: 'checklist',
            items: [
               { text: 'Select opened inside a Dialog keeps focus on its listbox', checked: true },
               { text: 'Nested Dialog (2 levels) traps focus on the topmost layer', checked: true },
               { text: 'Escape closes only the topmost layer', checked: false },
               { text: 'VoiceOver / NVDA announce the dialog correctly', checked: false },
            ],
         },
         { type: 'divider' },
         {
            type: 'issue-ref',
            identifier: 'ADI-643',
            note: 'previous scrollbar layout-shift fix touches the same overlay code',
         },
      ],
      activity: [
         {
            kind: 'event',
            id: 'a1',
            actor: users[1],
            event: 'created',
            text: 'created the issue',
            timeAgo: '12d ago',
         },
         {
            kind: 'event',
            id: 'a2',
            actor: users[1],
            event: 'label',
            text: 'added label Bug',
            timeAgo: '12d ago',
         },
         {
            kind: 'event',
            id: 'a3',
            actor: users[2],
            event: 'status',
            text: 'moved from Todo to In Progress',
            timeAgo: '9d ago',
         },
         {
            kind: 'comment',
            id: 'a4',
            actor: users[1],
            timeAgo: '8d ago',
            body: [
               {
                  type: 'paragraph',
                  text: 'Heads up: Radix solves this with a `DismissableLayer` tree. Worth reading their implementation before we reinvent it — the branch pruning logic is subtle.',
               },
            ],
            reactions: [{ emoji: '👍', count: 3 }],
         },
         {
            kind: 'comment',
            id: 'a5',
            actor: users[2],
            timeAgo: '6d ago',
            body: [
               {
                  type: 'paragraph',
                  text: 'Agreed. I kept the context registry approach but mirrored their layer ordering. Draft PR is up, the two remaining checkboxes need the screen-reader pass.',
               },
            ],
         },
      ],
      relatedIds: ['ADI-643', 'ADI-744'],
      prLinks: [
         { id: '#212', title: 'fix(dialog): portal-aware focus containment', status: 'open' },
      ],
   },
   {
      identifier: 'ADI-704',
      description: [
         {
            type: 'paragraph',
            text: 'Rendering 10k+ rows makes the `DataTable` unusable: initial render takes **4.2s** and scrolling drops to ~11fps on a mid-range laptop.',
         },
         {
            type: 'image',
            alt: 'React Profiler flamegraph of a 10k-row render',
            caption: 'Profiler capture — 92% of the time is spent mounting row cells',
            aspect: 'wide',
         },
         { type: 'heading', text: 'Plan' },
         {
            type: 'numbered-list',
            items: [
               'Windowing with a fixed overscan of 12 rows (no external dep, ~120 LOC)',
               'Row measurement cache keyed by row id for variable heights',
               'Sticky header stays outside the scroll container',
               'Keyboard navigation jumps must scroll the virtual window',
            ],
         },
         {
            type: 'video',
            title: 'Scroll capture — prototype at 120fps',
            duration: '0:42',
         },
         {
            type: 'quote',
            text: 'Budget: first paint of the table under 300ms with 10k rows, scroll at 60fps minimum.',
            author: 'perf budget, Q3 notes',
         },
      ],
      activity: [
         {
            kind: 'event',
            id: 'b1',
            actor: users[4],
            event: 'created',
            text: 'created the issue',
            timeAgo: '11d ago',
         },
         {
            kind: 'event',
            id: 'b2',
            actor: users[4],
            event: 'cycle',
            text: 'added issue to Cycle 21',
            timeAgo: '11d ago',
         },
         {
            kind: 'event',
            id: 'b3',
            actor: users[0],
            event: 'priority',
            text: 'set priority to High',
            timeAgo: '10d ago',
         },
         {
            kind: 'comment',
            id: 'b4',
            actor: users[0],
            timeAgo: '4d ago',
            body: [
               {
                  type: 'paragraph',
                  text: 'Prototype numbers on the reference dataset: first paint **278ms**, steady scroll at 60fps, 74MB heap (was 410MB). Ship it.',
               },
            ],
            reactions: [
               { emoji: '🔥', count: 4 },
               { emoji: '🚀', count: 2 },
            ],
         },
      ],
      subIssueIds: ['ADI-726'],
      relatedIds: ['ADI-685'],
      prLinks: [{ id: '#198', title: 'perf(table): windowed row rendering', status: 'merged' }],
   },
   {
      identifier: 'ADI-701',
      description: [
         { type: 'heading', text: 'Steps to reproduce' },
         {
            type: 'numbered-list',
            items: [
               'Open the Combobox demo with a list containing disabled options',
               'Focus the input and press `ArrowDown` repeatedly',
               'Reach a disabled option surrounded by two enabled ones',
            ],
         },
         { type: 'heading', text: 'Expected' },
         {
            type: 'paragraph',
            text: 'Focus skips the disabled option and lands on the next enabled one, in both directions.',
         },
         { type: 'heading', text: 'Actual' },
         {
            type: 'paragraph',
            text: 'Going **down** skips correctly, going **up** stops on the disabled option and the `aria-activedescendant` points to a non-interactive element.',
         },
         { type: 'video', title: 'Screen recording — keyboard navigation bug', duration: '0:18' },
         { type: 'divider' },
         {
            type: 'paragraph',
            text: 'Likely an off-by-one in `findNextEnabledIndex` when iterating backwards.',
         },
      ],
      activity: [
         {
            kind: 'event',
            id: 'c1',
            actor: users[0],
            event: 'created',
            text: 'created the issue',
            timeAgo: '10d ago',
         },
         {
            kind: 'event',
            id: 'c2',
            actor: users[0],
            event: 'status',
            text: 'moved from Triage to Product Feedback',
            timeAgo: '9d ago',
         },
         {
            kind: 'comment',
            id: 'c3',
            actor: users[7],
            timeAgo: '7d ago',
            body: [
               {
                  type: 'paragraph',
                  text: 'Confirmed on Firefox and Safari as well — not browser specific. The backwards iterator starts at `index` instead of `index - 1`.',
               },
            ],
            reactions: [{ emoji: '👀', count: 2 }],
         },
      ],
      relatedIds: ['ADI-819'],
   },
   {
      identifier: 'ADI-702',
      description: [
         {
            type: 'quote',
            text: 'Navigating between months on my old Android phone takes almost a second, the animation stutters badly.',
            author: 'user feedback, support ticket #482',
         },
         {
            type: 'paragraph',
            text: 'Reproduced on a throttled 4x CPU profile. Each month navigation re-renders **42 day cells** plus the header, and every cell recomputes its formatter.',
         },
         { type: 'heading', text: 'Hypotheses' },
         {
            type: 'bullet-list',
            items: [
               'The `Intl.DateTimeFormat` instance is created per cell per render — hoist and reuse',
               'Month transition animates `box-shadow` (paint-heavy), switch to `transform`/`opacity`',
               'Day cells can be memoized: only selection and today change between renders',
            ],
         },
         {
            type: 'image',
            alt: 'Chrome performance trace of a month navigation',
            caption: 'Trace — 610ms scripting, 220ms rendering on 4x throttle',
            aspect: 'wide',
         },
      ],
      activity: [
         {
            kind: 'event',
            id: 'd1',
            actor: users[6],
            event: 'created',
            text: 'created the issue',
            timeAgo: '10d ago',
         },
         {
            kind: 'comment',
            id: 'd2',
            actor: users[6],
            timeAgo: '5d ago',
            body: [
               {
                  type: 'paragraph',
                  text: 'Hoisting the formatter alone cuts scripting from 610ms to 180ms. The rest is the shadow animation.',
               },
            ],
         },
         {
            kind: 'comment',
            id: 'd3',
            actor: users[13],
            timeAgo: '4d ago',
            body: [
               {
                  type: 'paragraph',
                  text: 'Design is fine with a simple opacity crossfade on low-end devices — we can key it on `prefers-reduced-motion` too.',
               },
            ],
            reactions: [{ emoji: '✅', count: 1 }],
         },
      ],
   },
   {
      identifier: 'ADI-706',
      description: [
         { type: 'heading', text: 'Goals' },
         {
            type: 'bullet-list',
            items: [
               'Move every color token from HSL to **OKLCH** for perceptual uniformity',
               'Keep HSL fallbacks for browsers without `oklch()` support',
               'No visual regression above a deltaE of 1.5 on existing themes',
            ],
         },
         { type: 'heading', text: 'Token mapping' },
         {
            type: 'code',
            language: 'css',
            code: `:root {
   /* before */
   --primary: hsl(243 75% 59%);

   /* after — fallback first, then OKLCH override */
   --primary: hsl(243 75% 59%);
}

@supports (color: oklch(0% 0 0)) {
   :root {
      --primary: oklch(58.5% 0.233 277.1);
   }
}`,
         },
         { type: 'heading', text: 'Migration steps' },
         {
            type: 'checklist',
            items: [
               {
                  text: 'Script converting the HSL palette to OKLCH (round-trip checked)',
                  checked: true,
               },
               { text: 'Regenerate `globals.css` tokens for light + dark', checked: true },
               { text: 'Visual diff on the 12 template pages', checked: false },
               { text: 'Update theming docs and the theme generator', checked: false },
            ],
         },
         { type: 'divider' },
         { type: 'issue-ref', identifier: 'ADI-729', note: 'theme switcher must re-read tokens' },
      ],
      activity: [
         {
            kind: 'event',
            id: 'e1',
            actor: users[12],
            event: 'created',
            text: 'created the issue',
            timeAgo: '8d ago',
         },
         {
            kind: 'event',
            id: 'e2',
            actor: users[12],
            event: 'status',
            text: 'moved from Backlog to In Progress',
            timeAgo: '7d ago',
         },
         {
            kind: 'comment',
            id: 'e3',
            actor: users[19],
            timeAgo: '2d ago',
            body: [
               {
                  type: 'paragraph',
                  text: 'The converted dark palette looks noticeably smoother on gradients. Two tokens (`--warning`, `--chart-3`) drifted above deltaE 1.5, adjusting chroma manually.',
               },
            ],
            reactions: [{ emoji: '🎨', count: 2 }],
         },
      ],
      subIssueIds: ['ADI-729', 'ADI-734'],
      milestone: 'Design Tokens v2',
   },
   {
      identifier: 'ADI-710',
      description: [
         {
            type: 'paragraph',
            text: 'When an async source passed to the command palette **throws** (network error, bad JSON), the loading spinner never resolves and the whole palette becomes unresponsive — even for local commands.',
         },
         {
            type: 'code',
            language: 'text',
            code: `Unhandled Promise Rejection: TypeError: results is not iterable
   at CommandPalette.mergeSources (command-palette.tsx:141)
   at async Promise.all (index 2)`,
         },
         {
            type: 'paragraph',
            text: 'Fix direction: isolate each source with `Promise.allSettled`, render per-source error rows, and keep local commands interactive while remote sources are pending.',
         },
      ],
      activity: [
         {
            kind: 'event',
            id: 'f1',
            actor: users[3],
            event: 'created',
            text: 'c