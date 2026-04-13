import { createRoot } from 'react-dom/client';

import Root from './Root';
import fakeServerWorker from './fakeServer';

const container = document.getElementById('root');
if (!container) {
    throw new Error('No container found');
}
const root = createRoot(container);

async function bootstrap() {
    // MSW installs a service worker; keep it opt-in to avoid stale SW/cache issues during real backend development.
    const enableMsw = String(import.meta.env.VITE_ENABLE_MSW ?? '').toLowerCase() === 'true';
    if (!import.meta.env.PROD && enableMsw) {
        const providerType = process.env.REACT_APP_DATA_PROVIDER ?? '';
        const worker = await fakeServerWorker(providerType);
        await worker.start({
            onUnhandledRequest: 'bypass',
            quiet: true,
            serviceWorker: { url: './mockServiceWorker.js' },
        });
    } else if (!import.meta.env.PROD && 'serviceWorker' in navigator) {
        // Best-effort cleanup: unregister existing service workers on this origin.
        try {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.allSettled(regs.map(r => r.unregister()));
        } catch {
            // ignore
        }
    }
    root.render(<Root />);
}

bootstrap();
