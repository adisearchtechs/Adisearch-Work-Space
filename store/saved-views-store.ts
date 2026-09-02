import type { SavedViewDto } from '@/lib/views/contracts';
import { create } from 'zustand';

interface SavedViewsState {
   views: SavedViewDto[];
   workspaceSlug: string | null;
   loading: boolean;
   canWrite: boolean;
   beginLoad: (workspaceSlug: string) => void;
   replaceViews: (workspaceSlug: string, views: SavedViewDto[], canWrite: boolean) => void;
   addView: (view: SavedViewDto) => void;
   updateView: (view: SavedViewDto) => void;
   removeView: (viewId: string) => void;
   clearViews: () => void;
}

export const useSavedViewsStore = create<SavedViewsState>((set) => ({
   views: [],
   workspaceSlug: null,
   loading: false,
   canWrite: false,
   beginLoad: (workspaceSlug) =>
      set({ views: [], workspaceSlug, loading: true, canWrite: false }),
   replaceViews: (workspaceSlug, views, canWrite) =>
      set({ views, workspaceSlug, loading: false, canWrite }),
   addView: (view) => set((state) => ({ views: [view, ...state.views] })),
   updateView: (view) =>
      set((state) => ({ views: state.views.map((item) => (item.id === view.id ? view : item)) })),
   removeView: (viewId) =>
      set((state) => ({ views: state.views.filter((item) => item.id !== viewId) })),
   clearViews: () => set({ views: [], workspaceSlug: null, loading: false, canWrite: false }),
}));
