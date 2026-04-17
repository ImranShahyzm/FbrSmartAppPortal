import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
    Box,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import {
    EXCEL_GRID_ROW_INPUT_MIN_HEIGHT,
    excelGridBodyCellSx,
    excelGridDragHandleCellSx,
    excelGridDragHandleIconWrapperSx,
    excelGridInlineFieldSx,
    excelGridTableContainerSx,
    excelGridTableSx,
} from '../../common/themeSharedStyles';

type VehicleRow = {
    vehicleCode: string;
    vehicleTitle: string;
};

function emptyVehicleRow(): VehicleRow {
    return { vehicleCode: '', vehicleTitle: '' };
}

export function VehicleGroupVehiclesTable() {
    const { setValue } = useFormContext();
    const rows = (useWatch({ name: 'vehicles' }) as VehicleRow[] | undefined) ?? [];

    const sync = (next: VehicleRow[]) => {
        setValue('vehicles', next, { shouldDirty: true, shouldTouch: true });
    };

    const patchRow = (index: number, patch: Partial<VehicleRow>) => {
        const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
        sync(next);
    };

    const removeRow = (index: number) => {
        sync(rows.filter((_, i) => i !== index));
    };

    const addRow = () => {
        sync([...rows, emptyVehicleRow()]);
    };

    return (
        <Box sx={{ width: '100%' }}>   {/* Removed p:1 for maximum width */}
            {/* Add Button - Same style as Security Group */}
            <Box
                role="button"
                tabIndex={0}
                onClick={addRow}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        addRow();
                    }
                }}
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.5,
                    py: '7px',
                    fontSize: 13,
                    color: '#999',
                    cursor: 'pointer',
                    mb: 1.5,
                    '&:hover': { color: '#017E84' },
                }}
            >
                <AddCircleOutlineIcon sx={{ fontSize: 18 }} />
                Add Vehicle
            </Box>

            {/* Full Width Table - Matching Security Group exactly */}
            <TableContainer sx={excelGridTableContainerSx}>
                <Table 
                    size="small" 
                    stickyHeader 
                    sx={{
                        ...excelGridTableSx,
                        width: '100%',           // Force full width
                        minWidth: '100%',
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell 
                                width={32} 
                                sx={{ 
                                    ...excelGridBodyCellSx, 
                                    bgcolor: 'background.paper',
                                    borderTopLeftRadius: '4px'
                                }} 
                            />
                            <TableCell 
                                sx={{ 
                                    ...excelGridBodyCellSx, 
                                    fontWeight: 600, 
                                    minWidth: 160, 
                                    bgcolor: 'background.paper' 
                                }}
                            >
                                Vehicle Code
                            </TableCell>
                            <TableCell 
                                sx={{ 
                                    ...excelGridBodyCellSx, 
                                    fontWeight: 600, 
                                    minWidth: 280, 
                                    bgcolor: 'background.paper' 
                                }}
                            >
                                Vehicle Title
                            </TableCell>
                            <TableCell 
                                width={40} 
                                sx={{ 
                                    ...excelGridBodyCellSx, 
                                    bgcolor: 'background.paper',
                                    borderTopRightRadius: '4px'
                                }} 
                            />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell 
                                    colSpan={4} 
                                    sx={{ 
                                        ...excelGridBodyCellSx, 
                                        color: 'text.secondary', 
                                        fontSize: 12, 
                                        textAlign: 'center',
                                        py: 6
                                    }}
                                >
                                    No vehicles added yet. Click "Add Vehicle" above to start.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row, index) => (
                                <TableRow key={index} hover>
                                    <TableCell sx={excelGridDragHandleCellSx}>
                                        <Box sx={excelGridDragHandleIconWrapperSx}>
                                            <DragIndicatorIcon sx={{ fontSize: 15 }} />
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={excelGridBodyCellSx}>
                                        <TextField
                                            variant="standard"
                                            fullWidth
                                            value={row.vehicleCode}
                                            onChange={e => patchRow(index, { vehicleCode: e.target.value })}
                                            sx={excelGridInlineFieldSx}
                                            placeholder="e.g. VHC-001"
                                        />
                                    </TableCell>
                                    <TableCell sx={excelGridBodyCellSx}>
                                        <TextField
                                            variant="standard"
                                            fullWidth
                                            value={row.vehicleTitle}
                                            onChange={e => patchRow(index, { vehicleTitle: e.target.value })}
                                            sx={excelGridInlineFieldSx}
                                            placeholder="Vehicle Title"
                                        />
                                    </TableCell>
                                    <TableCell padding="checkbox" sx={excelGridBodyCellSx}>
                                        <IconButton 
                                            size="small" 
                                            onClick={() => removeRow(index)}
                                        >
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}