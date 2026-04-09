import polyglotI18nProvider from 'ra-i18n-polyglot';
import {
    Admin,
    CustomRoutes,
    Resource,
    localStorageStore,
    useStore,
    StoreContextProvider,
} from 'react-admin';
import { Route } from 'react-router';

import authProvider from './authProvider';
import categories from './categories';
import companies from './companies';
import { Dashboard } from './dashboard';
import dataProviderFactory from './dataProvider';
import englishMessages from './i18n/en';
import invoices from './invoices';
import { AppNotification, Layout, Login } from './layout';
import fbrInvoices from './orders';
import products from './products';
import productProfiles from './productProfiles';
import {
    FbrScenarioList,
    FbrScenarioEdit,
    FbrScenarioCreate,
} from './fbrMasters/FbrScenarioAdmin';
import {
    FbrSalesTaxRateList,
    FbrSalesTaxRateEdit,
    FbrSalesTaxRateCreate,
} from './fbrMasters/FbrSalesTaxRateAdmin';
import reviews from './reviews';
import Segments from './segments/Segments';
import customers from './customers';
import CompanySignUpPage from './companies/CompanySignUpPage';
import users from './users';
import { themes, ThemeName } from './themes/themes';

const i18nProvider = polyglotI18nProvider(
    locale => {
        if (locale === 'fr') {
            return import('./i18n/fr').then(messages => messages.default);
        }

        // Always fallback on english
        return englishMessages;
    },
    'en',
    [
        { locale: 'en', name: 'English' },
        { locale: 'fr', name: 'Français' },
    ]
);

// Bump version when you need to reset persisted UI (e.g. force new default theme).
const store = localStorageStore('2', 'ECommerce');

const App = () => {
    const [themeName] = useStore<ThemeName>('themeName', 'nano');
    const singleTheme = themes.find(theme => theme.name === themeName)?.single;
    const lightTheme = themes.find(theme => theme.name === themeName)?.light;
    const darkTheme = themes.find(theme => theme.name === themeName)?.dark;
    return (
        <Admin
            title="FBR Smart Application"
            dataProvider={dataProviderFactory(
                process.env.REACT_APP_DATA_PROVIDER || ''
            )}
            store={store}
            authProvider={authProvider}
            dashboard={Dashboard}
            loginPage={Login}
            layout={Layout}
            notification={AppNotification}
            i18nProvider={i18nProvider}
            disableTelemetry
            theme={singleTheme}
            lightTheme={lightTheme}
            darkTheme={darkTheme}
            defaultTheme="light"
            requireAuth
        >
            <CustomRoutes noLayout>
                <Route path="/signup" element={<CompanySignUpPage />} />
            </CustomRoutes>
            <CustomRoutes>
                <Route path="/segments" element={<Segments />} />
            </CustomRoutes>
            <Resource name="customers" {...customers} />
            <Resource name="fbrInvoices" {...fbrInvoices} />
            <Resource name="invoices" {...invoices} />
            <Resource name="products" {...products} />
            <Resource name="productProfiles" {...productProfiles} />
            <Resource
                name="fbrScenarios"
                list={FbrScenarioList}
                edit={FbrScenarioEdit}
                create={FbrScenarioCreate}
            />
            <Resource
                name="fbrSalesTaxRates"
                options={{ label: 'Taxes' }}
                list={FbrSalesTaxRateList}
                edit={FbrSalesTaxRateEdit}
                create={FbrSalesTaxRateCreate}
            />
            <Resource name="companies" {...companies} />
            <Resource name="users" {...users} />
            <Resource name="categories" {...categories} />
            <Resource name="reviews" {...reviews} />
        </Admin>
    );
};

const AppWrapper = () => (
    <StoreContextProvider value={store}>
        <App />
    </StoreContextProvider>
);

export default AppWrapper;
