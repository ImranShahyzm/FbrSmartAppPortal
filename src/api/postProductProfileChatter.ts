import { getAccessToken } from './tokenStorage';
import { API_BASE_URL } from './apiBaseUrl';

export type ProductChatterAttachmentPayload = {
    name: string;
    mime: string;
    dataBase64: string;
};

export async function postProductProfileChatter(
    productId: string,
    body: string,
    attachments: ProductChatterAttachmentPayload[]
): Promise<void> {
    const token = getAccessToken();
    const headers: HeadersInit = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(
        `${API_BASE_URL}/api/productProfiles/${encodeURIComponent(productId)}/chatter`,
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
