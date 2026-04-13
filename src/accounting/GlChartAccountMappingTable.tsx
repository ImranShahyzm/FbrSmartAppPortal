import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { useGetMany } from 'react-admin';

type CompanyRow = { id: number; title?: string | null };
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { CompactTextInput } from '../common/odooCompactFormFields';

/**
 * Company | Code grid for the Mapping tab. Rows follow `companyIds` order from the Accounting tab.
 */
export function GlChartAccountMappingTable() {
    const { watch, setValue, getValues } = useFormContext();
    const companyIds = (watch('companyIds') as number[] | undefined) ?? [];
    const companyIdsKey = React.useMemo(
        () => [...companyIds].sort((a, b) => a - b).join(','),
        [companyIds]
    );
    const { data: companies, isPending } = useGetMany<CompanyRow>(
        'companies',
        { ids: companyIds },
        { enabled: companyIds.length > 0 }
    );

    React.useEffect(() => {
        const ids = (getValues('companyIds') as number[] | undefined) ?? [];
        const current = (getValues('mappingCodes') as Record<string, string> | undefined) ?? {};
        const gl = String(getValues('glCode') ?? '').trim();
        const next: Record<string, string> = { ...current };
        let changed = false;
        for (const id of ids) {
            const k = String(id);
            if (!(k in next)) {
                next[k] = gl;
                changed = true;
            }
        }
        for (const k of Object.keys(next)) {
            if (!ids.includes(Number(k))) {
                delete next[k];
                changed = true;
            }
        }
        if (changed) setValue('mappingCodes', next, { shouldDirty: true, shouldValidate: false });
    }, [companyIdsKey, getValues, setValue]);

    const titleOf = (id: number) => {
        const c = companies?.find(x => Number(x.id) === id);
        const t = c?.title != null ? String(c.title) : '';
        return t.trim() || `Company #${id}`;
    };

    if (companyIds.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                Select one or more companies on the Accounting tab to map codes per company.
            </Typography>
        );
    }

    return (
        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Company</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8rem', width: '45%' }}>
                            Code
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {isPending && companyIds.length > 0 ? (
                        <TableRow>
                            <TableCell colSpan={2}>
                                <Typography variant="body2" color="text.secondary">
                                    Loading…
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : null}
                    {companyIds.map(id => (
                        <TableRow key={id} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                            <TableCell sx={{ fontSize: '0.8rem' }}>{titleOf(id)}</TableCell>
                            <TableCell align="right" sx={{ py: 0.5 }}>
                                <Box sx={{ minWidth: 120 }}>
                                    <CompactTextInput
                                        source={`mappingCodes.${id}`}
                                        label={false}
                                        fullWidth
                                    />
                                </Box>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
