import { getAccessToken } from './tokenStorage';
import { API_BASE_URL } from './apiBaseUrl';

async function parseErrorMessage(res: Response): Promise<string> {
    const text = await res.text();
    try {
        const j = JSON.parse(text) as { message?: string };
        if (j?.message) return j.message;
    } catch {
        /* ignore */
    }
    return text || res.statusText || `HTTP ${res.status}`;
}

/** POST validate → status becomes delivered on success. */
export async function postFbrInvoiceValidate(invoiceId: string): Promise<unknown> {
    const token = getAccessToken();
    const headers: HeadersInit = {
        Accept: 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(
        `${API_BASE_URL}/api/fbrInvoices/${encodeURIComponent(invoiceId)}/validate`,
        { method: 'POST', headers, credentials: 'include' }
    );
    if (!res.ok) throw new Error(await parseErrorMessage(res));
    return res.json();
}

/** POST post → status posted, invoice locked on success. */
export async function postFbrInvoiceToFbr(invoiceId: string): Promise<unknown> {
    const token = getAccessToken();
    const headers: HeadersInit = {
        Accept: 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(
        `${API_BASE_URL}/api/fbrInvoices/${encodeURIComponent(invoiceId)}/post`,
        { method: 'POST', headers, credentials: 'include' }
    );
    if (!res.ok) throw new Error(await parseErrorMessage(res));
    return res.json();
}
