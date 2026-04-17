import { DataProvider, DeleteManyParams, DeleteManyResult, fetchUtils, GetManyReferenceParams, GetManyReferenceResult, QueryFunctionContext, RaRecord, UpdateManyParams, UpdateManyResult } from 'react-admin';

const apiUrl = 'http://localhost:5227/api';
const httpClient = fetchUtils.fetchJson;

export const autoDealerDataProvider: DataProvider = {
    getList: async (resource, params) => {
        const { page, perPage } = params.pagination ?? { page: 1, perPage: 10 };
        const skip = (page - 1) * perPage;
        const take = perPage;

        const url = `${apiUrl}/${resource}?range=[${skip},${skip + take - 1}]`;

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
        const { json } = await httpClient(`${apiUrl}/${resource}/${params.id}`);
        const record = json?.data ?? json;
        return {
            data: {
                ...record,
                id: record[getPrimaryKey(resource)] ?? record.id ?? params.id,
            },
        };
    },
create: async (resource, params) => {
    const { json } = await httpClient(`${apiUrl}/${resource}`, {
        method: 'POST',
        body: JSON.stringify(params.data),
    });

    // Unwrap the response from your controller
    const record = json?.data ?? json;

    // Use the correct primary key from your model (ColorID)
    const primaryKey = getPrimaryKey(resource);
    let newId = record[primaryKey];

    // Extra fallback in case the key name varies
    if (!newId) newId = record.colorID || record.id;

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
        const { json } = await httpClient(`${apiUrl}/${resource}/${params.id}`, {
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
        const results = await Promise.all(
            params.ids.map(id => httpClient(`${apiUrl}/${resource}/${id}`).then(({ json }) => {
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
        await httpClient(`${apiUrl}/${resource}/${params.id}`, { method: 'DELETE' });
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

function getPrimaryKey(resource: string): string {
    const map: Record<string, string> = {
        colorInformation: 'colorID',      // ← Changed to match your C# model
        VehicleInfo: 'vehicleID',
        BankInformation: 'bankInfoID',
        VariantInfo: 'varientID',
        // add more resources here as needed
    };
    return map[resource] ?? 'id';
}