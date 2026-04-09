import { API_BASE_URL } from './apiBaseUrl';

export type RegisterCompanyPayload = {
    title: string;
    shortTitle: string;
    ntnNo: string;
    st_Registration?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    fbrProvinceId?: number | null;
    employeeCount?: number | null;
    logoBase64?: string;
    /** Sign-in email (sent as username for API compatibility). */
    username: string;
    fullName: string;
};

export type RegisterCompanyResult = {
    username: string;
    temporaryPassword: string;
    companyId: number;
    message: string;
};

export async function registerCompany(body: RegisterCompanyPayload): Promise<RegisterCompanyResult> {
    const res = await fetch(`${API_BASE_URL}/api/auth/register-company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
        json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
        json = {};
    }
    if (!res.ok) {
        const msg =
            json.message != null
                ? String(json.message)
                : json.Message != null
                  ? String(json.Message)
                  : res.statusText;
        throw new Error(msg || 'Registration failed');
    }
    return json as unknown as RegisterCompanyResult;
}

export type PublicFbrProvince = {
    id: number;
    provincename?: string | null;
    companyID?: number | null;
};

export async function fetchPublicFbrProvinces(): Promise<PublicFbrProvince[]> {
    const res = await fetch(`${API_BASE_URL}/api/public/fbr-provinces`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
        throw new Error('Could not load provinces');
    }
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as PublicFbrProvince[]) : [];
}
