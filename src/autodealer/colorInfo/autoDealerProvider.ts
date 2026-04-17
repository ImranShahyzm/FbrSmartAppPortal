import {
    DataProvider,
    DeleteManyParams,
    DeleteManyResult,
    fetchUtils,
    GetListParams,
    GetManyReferenceParams,
    GetManyReferenceResult,
    QueryFunctionContext,
    RaRecord,
    UpdateManyParams,
    UpdateManyResult,
} from 'react-admin';

const apiUrl = 'http://localhost:5227/api';
const httpClient = fetchUtils.fetchJson;

/** Maps react-admin resource name to ASP.NET route segment. */
function apiResourcePath(resource: string): string {
    if (resource === 'vehicleGroupInfo') return 'VehicleGroup';
    return resource;
}

function buildListQuery(params: GetListParams): string {
    const { page = 1, perPage = 25 } = params.pagination ?? {};
    const skip = (page - 1) * perPage;
    const take = perPage;
    const filter = (params.filter ?? {}) as Record<string, unknown>;
    const q = typeof filter.q === 'string' ? filter.q.trim() : '';
    const parts: string[] = [`range=${encodeURIComponent(`[${skip},${skip + take - 1}]`)}`];
    if (q) parts.push(`q=${encodeURIComponent(q)}`);
    const sort = params.sort;
    if (sort?.field) {
        parts.push(`sort=${encodeURIComponent(sort.field)}`);
        parts.push(`order=${encodeURIComponent((sort.order ?? 'ASC').toLowerCase())}`);
    }
    return parts.join('&');
}

export const autoDealerDataProvider: DataProvider = {
    getList: async (resource, params) => {
        const path = apiResourcePath(resource);
        const query = buildListQuery(params);
        const url = `${apiUrl}/${path}?${query}`;

        const { headers, json } = await httpClient(url);
        const contentRange = headers.get('Content-Range') ?? '';
        const total = parseInt(contentRange.split('/').pop() ?? '0', 10) || json.length || 0;

        return {
            data: json.map((item: any) => ({
                ...item,
                id: item[getPrimaryKey(resource)] ?? item.id,
            })),
            total,
        };
    },

    getOne: async (resource, params) => {
        const path = apiResourcePath(resource);
        const { json } = await httpClient(`${apiUrl}/${path}/${params.id}`);
        const record = json?.data ?? json;
        return {
            data: {
                ...record,
                id: record[getPrimaryKey(resource)] ?? record.id ?? params.id,
            },
        };
    },
create: async (resource, params) => {
    const path = apiResourcePath(resource);
    const payload =
        resource === 'salesServiceInfo'
            ? sanitizeSalesServiceCreateBody(params.data as Record<string, unknown>)
            : params.data;

    const { json } = await httpClient(`${apiUrl}/${path}`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    // Unwrap the response from your controller
    const record = json?.data ?? json;

    // Use the correct primary key from your model (ColorID)
    const primaryKey = getPrimaryKey(resource);
    let newId = record[primaryKey];

    // Extra fallback in case the key name varies
    if (!newId) {
        newId =
            record.colorID ||
            record.saleServiceInfoID ||
            record.SaleServiceInfoID ||
            record.vehicleGroupID ||
            record.VehicleGroupID ||
            record.id;
    }

    if (!newId) {
        console.error('❌ Create response structure:', json);
        throw new Error(`Server did not return a valid ID for the new ${resource} record.`);
    }

    console.log(`✅ ${resource} created successfully with ID:`, newId);

    return {
        data: {
            ...record,
            id: newId,           // ← Critical: React Admin needs this field named "id"
        },
    };
},

    update: async (resource, params) => {
        const path = apiResourcePath(resource);
        const { json } = await httpClient(`${apiUrl}/${path}/${params.id}`, {
            method: 'PUT',
            body: JSON.stringify(params.data),
        });

        const record = json?.data ?? json;
        return {
            data: {
                ...record,
                id: record[getPrimaryKey(resource)] ?? record.id ?? params.id,
            },
        };
    },

    // ... keep your other methods (getMany, delete, etc.) as they are
    getMany: async (resource, params) => {
        const path = apiResourcePath(resource);
        const results = await Promise.all(
            params.ids.map(id => httpClient(`${apiUrl}/${path}/${id}`).then(({ json }) => {
                const record = json?.data ?? json;
                return {
                    ...record,
                    id: record[getPrimaryKey(resource)] ?? record.id ?? id,
                };
            })
            )
        );
        return { data: results };
    },

    delete: async (resource, params) => {
        const path = apiResourcePath(resource);
        await httpClient(`${apiUrl}/${path}/${params.id}`, { method: 'DELETE' });
        return { data: { id: params.id } as any };
    },
    getManyReference: function <RecordType extends RaRecord = any>(resource: string, params: GetManyReferenceParams & QueryFunctionContext): Promise<GetManyReferenceResult<RecordType>> {
        throw new Error('Function not implemented.');
    },
    updateMany: function <RecordType extends RaRecord = any>(resource: string, params: UpdateManyParams): Promise<UpdateManyResult<RecordType>> {
        throw new Error('Function not implemented.');
    },
    deleteMany: function <RecordType extends RaRecord = any>(resource: string, params: DeleteManyParams<RecordType>): Promise<DeleteManyResult<RecordType>> {
        throw new Error('Function not implemented.');
    }
};

function sanitizeSalesServiceCreateBody(data: Record<string, unknown>): Record<string, unknown> {
    const out = { ...data };
    if (out.saleServiceInfoID == null || out.saleServiceInfoID === '') {
        delete out.saleServiceInfoID;
    }
    return out;
}

function getPrimaryKey(resource: string): string {
    const map: Record<string, string> = {
        colorInformation: 'colorID',
        salesServiceInfo: 'saleServiceInfoID',
        vehicleGroupInfo: 'vehicleGroupID',
        VehicleInfo: 'vehicleID',
        BankInformation: 'bankInfoID',
        VariantInfo: 'varientID',
    };
    return map[resource] ?? 'id';
}