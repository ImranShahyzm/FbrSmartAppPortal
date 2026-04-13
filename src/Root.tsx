import * as React from 'react';
import { Box, CircularProgress } from '@mui/material';
import polyglotI18nProvider from 'ra-i18n-polyglot';
import {
    localStorageStore,
    StoreContextProvider,
    useStore,
    type RaThemeOptions,
    ThemesContext,
    ThemeProvider,
} from 'react-admin';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CoreAdminContext } from 'ra-core';

import authProvider from './authProvider';
import dataProviderFactory from './dataProvider';
import englishMessages from './i18n/en';
import { themes, type ThemeName } from './themes/themes';
import CompanySignUpPage from './companies/CompanySignUpPage';
import Login from './layout/Login';
import { AppShell } from './layout/AppShell';
import { APPS_REGISTRY, DEFAULT_ACTIVE_APP_ID, ACCOUNTING_SUITE_APP_ID } from './apps/appsRegistry';
import { ACTIVE_APP_STORE_KEY } from './apps/activeAppStore';
import { SETTINGS_SECURITY_GROUPS_LIST_PATH, SETTINGS_USERS_LIST_PATH } from './apps/workspacePaths';
import { LegacyWorkspacePathRedirect } from './apps/LegacyWorkspacePathRedirect';
import { RootRedirect } from './apps/RootRedirect';
import { SelectApp } from './apps/SelectApp';

const i18nProvider = polyglotI18nProvider(
    locale => {
        if (locale === 'fr') {
            return import('./i18n/fr').then(messages => messages.default);
        }
        return englishMessages;
    },
    'en',
    [
        { locale: 'en', name: 'English' },
        { locale: 'fr', name: 'Français' },
    ]
);

const store = localStorageStore('3', 'ECommerce');

type ThemeBundle = {
    theme?: RaThemeOptions;
    lightTheme?: RaThemeOptions;
    darkTheme?: RaThemeOptions;
};

function useResolvedThemes(): ThemeBundle {
    const resolved = themes[0];
    return {
        theme: resolved?.single,
        lightTheme: resolved?.light,
        darkTheme: resolved?.dark,
    };
}

type ShellContextProps = {
    dataProvider: ReturnType<typeof dataProviderFactory>;
    theme?: RaThemeOptions;
    lightTheme?: RaThemeOptions;
    darkTheme?: RaThemeOptions;
};

function AuthenticatedShell(props: ShellContextProps & { children: React.ReactNode }) {
    return (
        <CoreAdminContext
            authProvider={authProvider}
            dataProvider={props.dataProvider}
            i18nProvider={i18nProvider}
            store={store}
        >
            <AppShell>{props.children}</AppShell>
        </CoreAdminContext>
    );
}

function RedirectFbrUsersToSettings() {
    const { pathname, search } = useLocation();
    const rest = pathname.startsWith('/fbr/users') ? pathname.slice('/fbr/users'.length) : '';
    return <Navigate to={`${SETTINGS_USERS_LIST_PATH}${rest}${search}`} replace />;
}

function WorkspaceFallback() {
    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight={240}
            width="100%"
        >
            <CircularProgress />
        </Box>
    );
}

function RootInner() {
    const [themeName, setThemeName] = useStore<ThemeName>('themeName', 'nano');
    const [activeAppId, setActiveAppId] = useStore<string>(ACTIVE_APP_STORE_KEY, DEFAULT_ACTIVE_APP_ID);
    const legacyActiveAppMigrated = React.useRef(false);

    React.useEffect(() => {
        if (themeName !== 'nano') setThemeName('nano');
    }, [themeName, setThemeName]);

    /** One-time read of legacy `activeAppId` from the RA store (older single-Admin shell). */
    React.useEffect(() => {
        if (legacyActiveAppMigrated.current || activeAppId !== DEFAULT_ACTIVE_APP_ID) return;
        legacyActiveAppMigrated.current = true;
        try {
            const legacy = store.getItem('activeAppId');
            if (legacy === 'fbr-smart' || legacy === ACCOUNTING_SUITE_APP_ID) {
                setActiveAppId(legacy);
            }
        } catch {
            /* ignore */
        }
    }, [activeAppId, setActiveAppId]);

    const { theme, lightTheme, darkTheme } = useResolvedThemes();

    const dataProvider = React.useMemo(
        () => dataProviderFactory(process.env.REACT_APP_DATA_PROVIDER || ''),
        []
    );

    const workspaceProps = {
        theme,
        lightTheme,
        darkTheme,
        i18nProvider,
        dataProvider,
    };

    return (
        <ThemesContext.Provider
            value={{
                lightTheme: lightTheme ?? theme,
                darkTheme: darkTheme,
                defaultTheme: 'light',
            }}
        >
            <ThemeProvider>
                <BrowserRouter>
                    <Routes>
                        <Route
                            path="/login"
                            element={
                                <CoreAdminContext
                                    authProvider={authProvider}
                                    dataProvider={dataProvider}
                                    i18nProvider={i18nProvider}
                                    store={store}
                                >
                                    <Login />
                                </CoreAdminContext>
                            }
                        />
                        <Route path="/fbr/login" element={<Navigate to="/login" replace />} />
                        <Route path="/accounting/login" element={<Navigate to="/login" replace />} />
                        <Route path="/settings/login" element={<Navigate to="/login" replace />} />
                        <Route path="/signup" element={<CompanySignUpPage />} />
                        <Route path="/fbr/signup" element={<Navigate to="/signup" replace />} />
                        <Route path="/accounting/signup" element={<Navigate to="/signup" replace />} />
                        <Route path="/settings/signup" element={<Navigate to="/signup" replace />} />
                        <Route
                            path="/settings/security_groups"
                            element={<Navigate to={SETTINGS_SECURITY_GROUPS_LIST_PATH} replace />}
                        />
                        <Route
                            path="/settings/security_groups/*"
                            element={<Navigate to={SETTINGS_SECURITY_GROUPS_LIST_PATH} replace />}
                        />
                        <Route path="/fbr/users/*" element={<RedirectFbrUsersToSettings />} />
                        <Route
                            path="/select-app"
                            element={
                                <AuthenticatedShell dataProvider={dataProvider}>
                                    <SelectApp />
                                </AuthenticatedShell>
                            }
                        />
                        {APPS_REGISTRY.map(app => (
                            <React.Fragment key={app.id}>
                                <Route
                                    path={app.basePath}
                                    element={
                                        <AuthenticatedShell dataProvider={dataProvider}>
                                            <React.Suspense fallback={<WorkspaceFallback />}>
                                                <app.WorkspaceComponent {...workspaceProps} app={app} />
                                            </React.Suspense>
                                        </AuthenticatedShell>
                                    }
                                />
                                <Route
                                    path={`${app.basePath}/*`}
                                    element={
                                        <AuthenticatedShell dataProvider={dataProvider}>
                                            <React.Suspense fallback={<WorkspaceFallback />}>
                                                <app.WorkspaceComponent {...workspaceProps} app={app} />
                                            </React.Suspense>
                                        </AuthenticatedShell>
                                    }
                                />
                            </React.Fragment>
                        ))}
                        <Route path="/" element={<RootRedirect />} />
                        <Route
                            path="*"
                            element={
                                <LegacyWorkspacePathRedirect>
                                    <Navigate to="/" replace />
                                </LegacyWorkspacePathRedirect>
                            }
                        />
                    </Routes>
                </BrowserRouter>
            </ThemeProvider>
        </ThemesContext.Provider>
    );
}

export function Root() {
    return (
        <StoreContextProvider value={store}>
            <RootInner />
        </StoreContextProvider>
    );
}

export default Root;
