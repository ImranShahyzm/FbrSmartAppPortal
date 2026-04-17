import { DataProvider, DeleteManyParams, DeleteManyResult, fetchUtils, GetManyReferenceParams, GetManyReferenceResult, QueryFunctionContext, RaRecord, UpdateManyParams, UpdateManyResult } from 'react-admin';

const apiUrl = 'http://localhost:5227/api';
const httpClient = fetchUtils.fetchJson;

export const autoDealerDataProvider: DataProvider = {
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination ?? { page: 1, perPage: 10 };
    const skip = (page - 1) * perPage;
    const take = perPage;

    let url = `${apiUrl}/${resource}?range=[${skip},${skip + take - 1}]`;

    // ✅ VehicleInfo filtering by group
    if (resource === 'VehicleInfo' && params.filter?.VehicleGroupID) {
        url = `${apiUrl}/VehicleInfo/by-group/${params.filter.VehicleGroupID}`;
    }

    const { headers, json } = await httpClient(url);

    const total =
        headers.get('Content-Range')
            ? parseInt(headers.get('Content-Range')!.split('/').pop() || '0', 10)
            : json.length;

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

        const record = json?.data ?? json;

        const primaryKey = getPrimaryKey(resource);
        let newId = record[primaryKey];

        // Extra fallbacks for Sales Service Info
        if (!newId) {
            newId = record.saleServiceInfoID || record.SaleServiceInfoID || record.id;
        }

        if (!newId) {
            console.error('❌ Create response structure:', json);
            throw new Error(`Server did not return a valid ID for the new ${resource} record.`);
        }

        console.log(`✅ ${resource} created successfully with ID:`, newId);

        return {
            data: {
                ...record,
                id: newId,
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

// ==================== PRIMARY KEY MAPPING ====================
function getPrimaryKey(resource: string): string {
    const map: Record<string, string> = {
        colorInformation: 'colorID',
        BankInformation: 'bankInfoID',
        VariantInfo: 'varientID',
        VehicleGroup: 'vehicleGroupID',
        VehicleInfo: 'vehicleID',

        salesServiceInfo: 'saleServiceInfoID',  
        SaleServiceInfo: 'saleServiceInfoID',
        'sales-service-info': 'saleServiceInfoID',
        
        // Add more resources here as needed
    };
    return map[resource] ?? 'id';
}