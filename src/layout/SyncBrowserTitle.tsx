import * as React from 'react';
import { apiFetch } from '../api/httpClient';
import { API_BASE_URL } from '../api/apiBaseUrl';
import { APP_BROWSER_TITLE } from './appBrowserTitle';

const base = import.meta.env.BASE_URL ?? '/';
const DEFAULT_FAVICON_HREF = `${base.endsWith('/') ? base : `${base}/`}favicon.ico`;

function setFaviconHref(href: string) {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = href;
}

/**
 * Browser tab: document title = app bar title (#react-admin-title) only.
 * Company logo (when available) is applied as the favicon — company name stays in the app bar.
 */
export function SyncBrowserTitle() {
    React.useLayoutEffect(() => {
        let cancelled = false;
        let obs: MutationObserver | undefined;
        let pollId: number | undefined;

        const syncTitle = (el: HTMLElement) => {
            const t = el.textContent?.trim() ?? '';
            document.title = t || APP_BROWSER_TITLE;
        };

        const attach = () => {
            const el = document.getElementById('react-admin-title');
            if (!el || cancelled) return false;
            syncTitle(el as HTMLElement);
            obs?.disconnect();
            obs = new MutationObserver(() => syncTitle(el as HTMLElement));
            obs.observe(el, { childList: true, subtree: true, characterData: true });
            return true;
        };

        if (!attach()) {
            let attempts = 0;
            pollId = window.setInterval(() => {
                attempts += 1;
                if (attach() || cancelled || attempts > 200) {
                    if (pollId != null) window.clearInterval(pollId);
                    pollId = undefined;
                }
            }, 50);
        }

        return () => {
            cancelled = true;
            if (pollId != null) window.clearInterval(pollId);
            obs?.disconnect();
            document.title = APP_BROWSER_TITLE;
        };
    }, []);

    React.useEffect(() => {
        let alive = true;
        apiFetch('/api/companies/my', { method: 'GET' })
            .then(async res => {
                if (!res.ok) return null;
                return (await res.json()) as {
                    companyImage?: string | null;
                } | null;
            })
            .then(data => {
                if (!alive) return;
                const path = data?.companyImage?.trim();
                if (!path) {
                    setFaviconHref(DEFAULT_FAVICON_HREF);
                    return;
                }
                const href = `${API_BASE_URL}/${String(path).replace(/^\//, '')}`;
                setFaviconHref(href);
            })
            .catch(() => {
                if (!alive) return;
                setFaviconHref(DEFAULT_FAVICON_HREF);
            });

        return () => {
            alive = false;
            setFaviconHref(DEFAULT_FAVICON_HREF);
        };
    }, []);

    return null;
}
