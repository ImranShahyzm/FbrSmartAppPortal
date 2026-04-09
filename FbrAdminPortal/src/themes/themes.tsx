import { nanoDarkTheme, nanoLightTheme, type RaThemeOptions } from 'react-admin';

/** Match main app stack (see main `index.html` font links). */
const fontStack = '"Inter", "Roboto", "Helvetica", "Arial", sans-serif';

/** Match main app nano theme behavior (hide docked sidebar strip). */
const withNanoSidebar = (theme: RaThemeOptions): RaThemeOptions => ({
    ...theme,
    sidebar: {
        ...((theme as RaThemeOptions & { sidebar?: object }).sidebar ?? {}),
        width: 280,
        closedWidth: 0,
    },
});

const withAdminChrome = (theme: RaThemeOptions): RaThemeOptions => ({
    ...theme,
    typography: {
        ...theme.typography,
        fontFamily: fontStack,
    },
    components: {
        ...theme.components,
        MuiCssBaseline: {
            ...theme.components?.MuiCssBaseline,
            styleOverrides: {
                ...(typeof theme.components?.MuiCssBaseline?.styleOverrides === 'object'
                    ? theme.components.MuiCssBaseline.styleOverrides
                    : {}),
                body: {
                    fontFamily: fontStack,
                },
            },
        },
        MuiButton: {
            ...theme.components?.MuiButton,
            styleOverrides: {
                ...theme.components?.MuiButton?.styleOverrides,
                root: {
                    ...(typeof theme.components?.MuiButton?.styleOverrides?.root === 'object'
                        ? theme.components.MuiButton.styleOverrides.root
                        : {}),
                    fontFamily: fontStack,
                },
            },
        },
        RaNotification: {
            ...theme.components?.RaNotification,
            defaultProps: {
                ...theme.components?.RaNotification?.defaultProps,
                anchorOrigin: { vertical: 'top', horizontal: 'right' },
            },
            styleOverrides: {
                ...theme.components?.RaNotification?.styleOverrides,
                root: {
                    top: '72px',
                    right: 16,
                },
            },
        },
    },
});

export const nanoTheme = {
    light: withAdminChrome(withNanoSidebar(nanoLightTheme)),
    dark: withAdminChrome(withNanoSidebar(nanoDarkTheme)),
};
