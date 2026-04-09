import { getAccessToken } from './tokenStorage';
import { API_BASE_URL } from './apiBaseUrl';

export type ChatterAttachmentPayload = {
    name: string;
    mime: string;
    dataBase64: string;
};

export async function postFbrInvoiceChatter(
    invoiceId: string,
    body: string,
    attachments: ChatterAttachmentPayload[]
): Promise<void> {
    const token = getAccessToken();
    const headers: HeadersInit = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(
        `${API_BASE_URL}/api/fbrInvoices/${encodeURIComponent(invoiceId)}/chatter`,
        {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ body, attachments }),
        }
    );
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
    }
}
