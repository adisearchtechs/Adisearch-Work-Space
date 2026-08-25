import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';

export type ThemeMode = 'system' | 'light' | 'dark' | 'custom';
export type LightVariant = 'light' | 'pure-light';
export type DarkVariant = 'dark' | 'magic-blue' | 'classic-dark';

export interface CustomTheme {
   accent: string;
   background: string;
   /** 0–100, how strong surfaces/borders contrast with the background. */
   contrast: number;
   /** Style the sidebar independently. */
   sidebar: boolean;
   sidebarAccent: string;
   sidebarBackground: string;
   sidebarContrast: number;
}

const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, 'Expected a six-digit hex color');

export const customThemeSchema: z.ZodType<CustomTheme> = z
   .object({
      accent: hexColorSchema,
      background: hexColorSchema,
      contrast: z.number().min(0).max(100),
      sidebar: z.boolean(),
      sidebarAccent: hexColorSchema,
      sidebarBackground: hexColorSchema,
      sidebarContrast: z.number().min(0).max(100),
   })
   .strict();

const persistedThemeSchema = z
   .object({
      mode: z.enum(['system', 'light', 'dark', 'custom']),
      lightVariant: z.enum(['light', 'pure-light']),
      darkVariant: z.enum(['dark', 'magic-blue', 'classic-dark']),
      custom: customThemeSchema,
   })
   .strict();

interface ThemeState {
   /** What the "Interface theme" select points at. */
   mode: ThemeMode;
   /** Variant used when the (resolved) appearance is light. */
   lightVariant: LightVariant;
   /** Variant used when the (resolved) appearance is dark. */
   darkVariant: DarkVariant;
   custom: CustomTheme;
   setMode: (mode: ThemeMode) => void;
   setLightVariant: (variant: LightVariant) => void;
   setDarkVariant: (variant: DarkVariant) => void;
   setCustom: (patch: Partial<CustomTheme>) => void;
}

export const DEFAULT_CUSTOM: CustomTheme = {
   accent: '#605e92',
   background: '#1c1a2b',
   contrast: 45,
   sidebar: false,
   sidebarAccent: '#575ac6',
   sidebarBackground: '#2a2a2a',
   sidebarContrast: 19,
};

/**
 * Linear-style theme system (Preferences → Interface and theme).
 * next-themes keeps handling light/dark/system resolution; this store adds
 * the variant layer (Pure Light, Magic Blue, Classic Dark) and the fully
 * custom theme. `ThemeApplier` (components/layout/theme-applier.tsx)
 * translates this state into DOM classes / CSS variables.
 */
export const useThemeStore = create<ThemeState>()(
   persist(
      (set) => ({
         mode: 'system',
         lightVariant: 'pure-light',
         darkVariant: 'dark',
         custom: DEFAULT_CUSTOM,
         setMode: (mode) => set({ mode }),
         setLightVariant: (lightVariant) => set({ lightVariant }),
         setDarkVariant: (darkVariant) => set({ darkVariant }),
         setCustom: (patch) => set((state) => ({ custom: { ...state.custom, ...patch } })),
      }),
      {
         name: 'theme-settings:v1',
         version: 1,
         merge: (persistedState, currentState) => {
            const parsed = persistedThemeSchema.safeParse(persistedState);
            return parsed.success ? { ...currentState, ...parsed.data } : currentState;
         },
      }
   )
);
