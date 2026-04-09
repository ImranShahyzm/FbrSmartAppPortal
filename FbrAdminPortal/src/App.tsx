import polyglotI18nProvider from 'ra-i18n-polyglot';
import { Admin, Resource, localStorageStore, StoreContextProvider } from 'react-admin';
import englishMessages from 'ra-language-english';

import authProvider from './authProvider';
import { dataProvider } from './dataProvider';
import CompanyList from './companies/CompanyList';
import CompanyEdit from './companies/CompanyEdit';
import AdminUserList from './adminUsers/AdminUserList';
import AdminUserCreate from './adminUsers/AdminUserCreate';
import AdminUserEdit from './adminUsers/AdminUserEdit';
import AdminDashboard from './dashboard/AdminDashboard';
import { nanoTheme } from './themes/themes';
import { AdminTopNavLayout } from './layout/AdminTopNavLayout';

const adminEnglishMessages = {
    ...englishMessages,
    ra: {
        ...englishMessages.ra,
        notification: {
            ...englishMessages.ra.notification,
            updated: 'Saved successfully.',
            created: 'Created successfully.',
        },
    },
};

const i18nProvider = polyglotI18nProvider(() => adminEnglishMessages, 'en');

const store = localStorageStore('1', 'FbrAdminPortal');

function AppInner() {
    return (
        <Admin
            title="FBR Admin Portal"
            layout={AdminTopNavLayout}
            dashboard={AdminDashboard}
            dataProvider={dataProvider}
            authProvider={authProvider}
            i18nProvider={i18nProvider}
            store={store}
            requireAuth
            disableTelemetry
            theme={nanoTheme.light}
            lightTheme={nanoTheme.light}
            darkTheme={nanoTheme.dark}
            defaultTheme="light"
        >
            <Resource name="companies" list={CompanyList} edit={CompanyEdit} />
            <Resource name="admin-users" list={AdminUserList} create={AdminUserCreate} edit={AdminUserEdit} />
        </Admin>
    );
}

export default function App() {
    return (
        <StoreContextProvider value={store}>
            <AppInner />
        </StoreContextProvider>
    );
}

