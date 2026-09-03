import { z } from 'zod';

const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, 'Expected a six-digit hex color');

export const customThemeSchema = z
   .object({
      accent: hexColorSchema,
      background: hexColorSchema,
      contrast: z.number().int().min(0).max(100),
      sidebar: z.boolean(),
      sidebarAccent: hexColorSchema,
      sidebarBackground: hexColorSchema,
      sidebarContrast: z.number().int().min(0).max(100),
   })
   .strict();

export const themePreferencesSchema = z
   .object({
      mode: z.enum(['system', 'light', 'dark', 'custom']),
      lightVariant: z.enum(['light', 'pure-light']),
      darkVariant: z.enum(['dark', 'magic-blue', 'classic-dark']),
      custom: customThemeSchema,
   })
   .strict();

export type CustomTheme = z.infer<typeof customThemeSchema>;
export type ThemePreferencesDto = z.infer<typeof themePreferencesSchema>;
export type ThemeMode = ThemePreferencesDto['mode'];
export type LightVariant = ThemePreferencesDto['lightVariant'];
export type DarkVariant = ThemePreferencesDto['darkVariant'];

export const DEFAULT_THEME_PREFERENCES: ThemePreferencesDto = {
   mode: 'system',
   lightVariant: 'pure-light',
   darkVariant: 'dark',
   custom: {
      accent: '#605e92',
      background: '#1c1a2b',
      contrast: 45,
      sidebar: false,
      sidebarAccent: '#575ac6',
      sidebarBackground: '#2a2a2a',
      sidebarContrast: 19,
   },
};
