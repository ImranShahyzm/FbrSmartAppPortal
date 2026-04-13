import {
    RaThemeOptions,
    nanoDarkTheme,
    nanoLightTheme,
} from 'react-admin';

export type ThemeName = 'nano';

export type Theme = {
    name: ThemeName;
    light?: RaThemeOptions;
    dark?: RaThemeOptions;
    single?: RaThemeOptions;
};

/** Nano + Odoo shell: hide docked sidebar strip (navigation is in the top bar). */
const withOdooNanoSidebar = (theme: RaThemeOptions): RaThemeOptions => ({
    ...theme,
    sidebar: {
        ...((theme as RaThemeOptions & { sidebar?: object }).sidebar ?? {}),
        width: 280,
        closedWidth: 0,
    },
});

export const themes: Theme[] = [
    {
        name: 'nano',
        light: withOdooNanoSidebar(nanoLightTheme),
        dark: withOdooNanoSidebar(nanoDarkTheme),
    },
];
