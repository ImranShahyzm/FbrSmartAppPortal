import { createRoot } from 'react-dom/client';

import App from './App';
import fakeServerWorker from './fakeServer';

const container = document.getElementById('root');
if (!container) {
    throw new Error('No container found');
}
const root = createRoot(container);

async function bootstrap() {
    // MSW + mockServiceWorker.js must not run in production (IIS); it intercepts fetch and breaks real API calls.
    if (!import.meta.env.PROD) {
        const providerType = process.env.REACT_APP_DATA_PROVIDER ?? '';
        const worker = await fakeServerWorker(providerType);
        await worker.start({
            onUnhandledRequest: 'bypass',
            quiet: true,
            serviceWorker: { url: './mockServiceWorker.js' },
        });
    }
    root.render(<App />);
}

bootstrap();
