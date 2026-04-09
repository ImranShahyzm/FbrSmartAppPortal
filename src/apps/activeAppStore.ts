import type { ThemeName } from '../themes/themes';

/** localStorage-backed key (via react-admin store) */
export const STORE_KEY_ACTIVE_APP = 'activeAppId';

/** Optional: only render Odoo top nav + launcher when theme is nano */
export function isOdooShellTheme(themeName: ThemeName): boolean {
    return themeName === 'nano';
}
