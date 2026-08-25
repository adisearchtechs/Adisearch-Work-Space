/**
 * Mock data of the Reviews feature (Linear-style PR reviews): list tabs
 * ("For you" / "Created"), and per-review Overview / Guide / Diff content.
 * Everything is fake and deterministic, on the Adisearch Workspace storyline; the
 * `resolves` identifiers reference real issues from mock-data/issues.ts.
 */

export type ReviewStatus = 'open' | 'merged' | 'closed';
export type ReviewList = 'for-you' | 'created';

export type ReviewFileCategory = 'implementation' | 'tests';

export interface ReviewFileStat {
   name: string;
   path: string;
   additions: number;
   deletions: number;
   category: ReviewFileCategory;
}

export interface ReviewCommit {
   sha: string;
   message: string;
   timeAgo: string;
}

export interface DiffLine {
   type: 'context' | 'add' | 'del' | 'skip';
   /** New-file line number (omitted for del/skip). */
   number?: number;
   text?: string;
   /** For 'skip': how many unchanged lines are collapsed. */
   count?: number;
}

export interface FileDiff {
   name: string;
   path: string;
   additions: number;
   deletions: number;
   lines: DiffLine[];
}

export interface GuideSection {
   title: string;
   paragraphs: string[];
   /** File name shown as chips under the prose (stat = "+n -m"). */
   fileRefs: { name: string; path: string; stat: string }[];
   /** Which file diff to show next to the section. */
   diffName: string;
}

export interface ReviewVerdictRow {
   review: string;
   verdict: string;
   critical: string;
   high: string;
   medium: string;
}

export interface ReviewNote {
   author: string;
   timeAgo: string;
   verdictLine: string;
   profileLine: string;
   rows: ReviewVerdictRow[];
   footer?: string;
}

export interface Review {
   /** URL slug. */
   id: string;
   title: string;
   status: ReviewStatus;
   list: ReviewList;
   timeAgo: string;
   repo: string;
   prNumber: number;
   targetBranch: string;
   sourceBranch: string;
   additions: number;
   deletions: number;
   /** Issue this PR resolves (real identifier from mock-data/issues.ts). */
   resolves: { identifier: string; title: string };
   checksPassed: number;
   checksTotal: number;
   files: ReviewFileStat[];
   commits: ReviewCommit[];
   /** Description "Summary" bullets — `inline code` supported via backticks. */
   summary: string[];
   testPlan: { text: string; checked: boolean }[];
   deployment?: { project: string; state: string; action: string };
   reviewNote?: ReviewNote;
}

/* -------------------------------------------------------------------------- */
/*                                   Seeds                                    */
/* -------------------------------------------------------------------------- */

type FileSeed = [name: string, path: string, add: number, del: number, cat: ReviewFileCategory];

interface ReviewSeed {
   id: string;
   title: string;
   status: ReviewStatus;
   list: ReviewList;
   timeAgo: string;
   prNumber: number;
   branch: string;
   resolves: [string, string];
   files: FileSeed[];
   commits: [string, string, string][];
   summary: string[];
   testPlan: [string, boolean][];
}

const seeds: ReviewSeed[] = [
   /* ------------------------------- For you ------------------------------- */
   {
      id: 'fix-sheet-header-truncation-with-long-titles',
      title: 'fix(sheet): header truncation with long titles [ADI-903]',
      status: 'merged',
      list: 'for-you',
      timeAgo: '1h',
      prNumber: 412,
      branch: 'fix/lnui-903-sheet-header-truncation',
      resolves: ['ADI-903', 'Fix Sheet header truncation with long titles'],
      files: [
         ['sheet.tsx', 'components/ui/sheet', 31, 6, 'implementation'],
         ['sheet-header.tsx', 'components/ui/sheet', 12, 2, 'implementation'],
         ['use-truncate.ts', 'hooks', 9, 0, 'implementation'],
         ['sheet.test.tsx', 'components/ui/__tests__', 44, 0, 'tests'],
         ['use-truncate.test.ts', 'hooks/__tests__', 21, 0, 'tests'],
      ],
      commits: [
         ['4c19ae2', 'fix(sheet): clamp the header title to two lines', '1h ago'],
         ['b02d7f1', 'feat(hooks): extract a reusable useTruncate hook', '1h ago'],
         ['9e441cc', 'fix(sheet): review round — keep the close button reachable', '1h ago'],
      ],
      summary: [
         'Bug: a Sheet with a long title pushed the close button out of the header — the title had no `min-width: 0` in the flex row, so the header overflowed instead of truncating.',
         'Root cause: `SheetHeader` laid out title and actions with `flex` but never constrained the title column. Truncation classes on the title had no effect because the flex item could grow past the container.',
         'Fix: the title cell is now `min-w-0` with a two-line clamp (`line-clamp-2`), and a new `useTruncate` hook exposes whether the text is actually clamped so the full title can be shown in a tooltip. Covers dialogs, side sheets and the mobile bottom sheet.',
      ],
      testPlan: [
         ['`sheet.test.tsx`: long titles clamp to two lines, close button stays visible', true],
         ['`use-truncate.test.ts`: reports clamped state on overflow and resize', true],
         ['Full suite: 148 files / 1 912 tests pass, `tsc --noEmit` clean', true],
      ],
   },
   {
      id: 'fix-dialog-title-id-collision-with-multiple-instances',
      title: 'fix(dialog): title id collision with multiple instances [ADI-909]',
      status: 'merged',
      list: 'for-you',
      timeAgo: '6h',
      prNumber: 409,
      branch: 'fix/lnui-909-dialog-title-id',
      resolves: ['ADI-909', 'Fix Dialog title id collision with multiple instances'],
      files: [
         ['dialog.tsx', 'components/ui/dialog', 18, 9, 'implementation'],
         ['use-stable-id.ts', 'hooks', 14, 0, 'implementation'],
         ['dialog.test.tsx', 'components/ui/__tests__', 37, 3, 'tests'],
      ],
      commits: [
         ['77aa310', 'fix(dialog): derive the title id from useId', '6h ago'],
         ['d1905be', 'test(dialog): two dialogs mounted at once keep distinct ids', '6h ago'],
      ],
      summary: [
         'Two dialogs mounted at the same time shared the hard-coded `dialog-title` id, so screen readers announced the wrong title for the second instance.',
         'The id is now derived from React `useId` through a small `useStableId` hook, keeping SSR and client ids in sync.',
         '`aria-labelledby` and `aria-describedby` always point at the ids of their own instance.',
      ],
      testPlan: [
         ['`dialog.test.tsx`: two mounted dialogs expose distinct title ids', true],
         ['Axe audit on the docs dialog page: 0 violations', true],
      ],
   },
   {
      id: 'feat-pagination-compound-component-api',
      title: 'feat(pagination): compound component API [ADI-622]',
      status: 'merged',
      list: 'for-you',
      timeAgo: '7h',
      prNumber: 405,
      branch: 'feat/lnui-622-pagination-compound',
      resolves: ['ADI-622', 'Ship Pagination compound component'],
      files: [
         ['pagination.tsx', 'components/ui/pagination', 96, 0, 'implementation'],
         ['use-pagination-range.ts', 'hooks', 38, 0, 'implementation'],
         ['pagination.test.tsx', 'components/ui/__tests__', 58, 0, 'tests'],
         ['pagination.stories.tsx', 'stories', 27, 0, 'tests'],
      ],
      commits: [
         ['ab8c1f0', 'feat(pagination): root, item, ellipsis and nav sub-components', '7h ago'],
         ['3f0de52', 'feat(hooks): windowed page ranges with boundaries', '7h ago'],
      ],
      summary: [
         'New `Pagination` compound component: `Pagination.Root`, `.Item`, `.Previous`, `.Next` and `.Ellipsis`, styled with the existing button recipes.',
         'A `usePaginationRange` hook computes the windowed page list (boundary + sibling counts) so the markup stays fully controlled by the consumer.',
         'Keyboard and screen-reader behaviour follows the WAI-ARIA pagination pattern (`nav` landmark + `aria-current="page"`).',
      ],
      testPlan: [
         ['`pagination.test.tsx`: range windows, boundaries and aria attributes', true],
         ['Storybook: default, compact and controlled examples', true],
      ],
   },
   {
      id: 'feat-docs-search-by-prop-name-and-enum-values',
      title: 'feat(docs): search by prop name and enum values [ADI-911]',
      status: 'merged',
      list: 'for-you',
      timeAgo: '1d',
      prNumber: 398,
      branch: 'feat/lnui-911-docs-prop-search',
      resolves: ['ADI-911', 'Search docs by prop name and enum values'],
      files: [
         ['search-index.ts', 'docs/lib', 52, 11, 'implementation'],
         ['prop-table.tsx', 'docs/components', 24, 5, 'implementation'],
         ['search-index.test.ts', 'docs/lib/__tests__', 40, 0, 'tests'],
      ],
      commits: [
         ['58e2b91', 'feat(docs): index prop names and enum values', '1d ago'],
         ['c4417ad', 'feat(docs): deep-link search hits to the prop row', '1d ago'],
      ],
      summary: [
         'The docs search index now includes every component prop name and enum value, so searching `sideOffset` or `"destructive"` lands on the right API table.',
         'Search hits deep-link to the exact prop row (scroll + highlight) instead of the top of the page.',
         'The index is built at compile time from the same TypeScript definitions that power the prop tables — no manual sync.',
      ],
      testPlan: [
         ['`search-index.test.ts`: props, enums and aliases are indexed', true],
         ['Manual: `sideOffset`, `variant`, `"ghost"` land on the expected rows', true],
      ],
   },
   {
      id: 'feat-combobox-multi-select-chips-inside-the-trigger',
      title: 'feat(combobox): multi-select chips inside the trigger [ADI-920]',
      status: 'open',
      list: 'for-you',
      timeAgo: '30m',
      prNumber: 415,
      branch: 'feat/lnui-920-combobox-chips',
      resolves: ['ADI-920', 'Combobox: multi-select chips inside the trigger'],
      files: [
         ['combobox.tsx', 'components/ui/combobox', 74, 18, 'implementation'],
         ['chip-list.tsx', 'components/ui/combobox', 42, 0, 'implementation'],
         ['use-chip-overflow.ts', 'hooks', 27, 0, 'implementation'],
         ['combobox.test.tsx', 'components/ui/__tests__', 51, 4, 'tests'],
      ],
      commits: [
         ['7be4a90', 'feat(combobox): render selected values as removable chips', '30m ago'],
         ['c53f1d8', 'feat(combobox): +n overflow counter with a measured chip row', '28m ago'],
      ],
      summary: [
         'Multi-select comboboxes now render their selection as removable chips inside the trigger instead of a joined string.',
         'A `useChipOverflow` hook measures the row and collapses extra chips behind a `+n` counter so the trigger height never grows.',
         'Backspace with an empty input removes the last chip, matching the pattern users know from mail clients.',
      ],
      testPlan: [
         ['`combobox.test.tsx`: chip add/remove, overflow counter, Backspace behaviour', true],
         ['Manual: keyboard-only selection with VoiceOver enabled', false],
      ],
   },
   {
      id: 'feat-form-async-validators-with-debounce-and-abort',
      title: 'feat(form): async validators with debounce and abort [ADI-777]',
      status: 'open',
      list: 'for-you',
      timeAgo: '45m',
      prNumber: 414,
      branch: 'feat/lnui-777-async-validators',
      resolves: ['ADI-777', 'Form: async validators with debounce and abort'],
      files: [
         ['form.tsx', 'components/ui/form', 39, 11, 'implementation'],
         ['use-async-validator.ts', 'hooks', 58, 0, 'implementation'],
         ['use-async-validator.test.ts', 'hooks/__tests__', 63, 0, 'tests'],
      ],
      commits: [
         ['91d70aa', 'feat(form): async validator slot on the field wrapper', '45m ago'],
         ['0ce82b7', 'feat(hooks): debounced validation with AbortController', '40m ago'],
      ],
      summary: [
         'Fields accept an async `validate` function; runs are debounced (300 ms default) and stale runs are cancelled with an `AbortController`.',
         'The field exposes a `validating` state so consumers can render a spinner without wiring their own tracking.',
         'Rejections resolve to a field error unless the abort came from a newer keystroke.',
      ],
      testPlan: [
         ['`use-async-validator.test.ts`: debounce window, abort on re-entry, error mapping', true],
         ['Manual: username availability demo against a slow endpoint', false],
      ],
   },
   {
      id: 'fix-progress-label-rounding-at-99-5-percent',
      title: 'fix(progress): label rounding at 99.5 percent [ADI-912]',
      status: 'merged',
      list: 'for-you',
      timeAgo: '1d',
      prNumber: 410,
      branch: 'fix/lnui-912-progress-rounding',
      resolves: ['ADI-912', 'Fix Progress label rounding at 99.5 percent'],
      files: [
         ['progress.tsx', 'components/ui/progress', 12, 5, 'implementation'],
         ['format-percent.ts', 'lib', 14, 0, 'implementation'],
         ['progress.test.tsx', 'components/ui/__tests__', 24, 0, 'tests'],
      ],
      commits: [
         ['5da11f3', 'fix(progress): floor the label until the value really completes', '1d ago'],
      ],
      summary: [
         '`Math.round` displayed “100%” from 99.5 upwards while the bar was still short of the end — the label lied for long uploads.',
         'The label now floors values below 100 and only shows “100%” when the value actually reaches the max.',
      ],
      testPlan: [['`progress.test.tsx`: 99.4 → 99%, 99.9 → 99%, 100 → 100%', true]],
   },
   {
      id: 'feat-spinner-size-and-stroke-tokens',
      title: 'feat(spinner): size and stroke tokens [ADI-914]',
      status: 'merged',
      list: 'for-you',
      timeAgo: '2d',
      prNumber: 413,
      branch: 'feat/lnui-914-spinner-tokens',
      resolves: ['ADI-914', 'Ship Spinner with size and stroke tokens'],
      files: [
         ['spinner.tsx', 'components/ui/spinner', 46, 0, 'implementation'],
         ['tokens.css', 'app', 9, 0, 'implementation'],
         ['spinner.stories.tsx', 'stories', 19, 0, 'tests'],
      ],
      commits: [
         ['e04c6b1', 'feat(spinner): svg spinner driven by size/stroke tokens', '2d ago'],
         ['b7f309e', 'docs(spinner): sizing and reduced-motion notes', '2d ago'],
      ],
      summary: [
         'New `Spinner` component sized by tokens (`--spinner-size-*`, `--spinner-stroke-*`) so buttons, inputs and empty states stay visually consistent.',
         'Respects `prefers-reduced-motion` by swapping the rotation for a subtle opacity pulse.',
      ],
      testPlan: [
         ['Storybook: sm/md/lg matrix in light and dark', true],
         ['Manual: reduced-motion fallback in system settings', true],
      ],
   },
   {
      id: 'feat-dialog-inert-background-instead-of-aria-hidden',
      title: 'feat(dialog): inert background instead of the aria-hidden walker [ADI-780]',
      status: 'merged',
      list: 'for-you',
      timeAgo: '2d',
      prNumber: 407,
      branch: 'feat/lnui-780-dialog-inert',
      resolves: ['ADI-780', 'Dialog: inert background instead of the aria-hidden walker'],
      files: [
         ['dialog.tsx', 'components/ui/dialog', 21, 34, 'implementation'],
         ['use-inert-others.ts', 'hooks', 32, 0, 'implementation'],
         ['dialog.test.tsx', 'components/ui/__tests__', 28, 6, 'tests'],
      ],
      commits: [
         ['a19c44d', 'feat(dialog): mark siblings inert while a dialog is open', '2d ago'],
         ['4f80b23', 'chore(dialog): delete the recursive aria-hidden walker', '2d ago'],
      ],
      summary: [
         'The open dialog used to walk the DOM and stamp `aria-hidden` on every sibling — slow on large pages and easy to leave stale on unmount.',
         'Background subtrees are now marked with the native `inert` attribute via a `useInertOthers` hook, which also blocks focus and clicks for free.',
         'The walker and its cleanup bookkeeping are deleted: −34 lines of tricky code.',
      ],
      testPlan: [
         [
            '`dialog.test.tsx`: background focusables unreachable while open, restored on close',
            true,
         ],
         ['Axe audit on nested dialog demos: 0 violations', true],
      ],
   },
   {
      id: 'fix-combobox-popover-width-in-grid-cells',
      title: 'fix(combobox)