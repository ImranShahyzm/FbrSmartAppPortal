import type { SxProps, Theme } from '@mui/material/styles';

import { UNDERLINE_FIELD_SX } from './odooCompactFormFields';

/**
 * Shared visual tokens for cross-feature UI (security group pickers, future modals).
 * Prefer these over scattering one-off colors so themes can evolve in one place.
 */

/** Target height for inline cell inputs — use for drag-handle column so icons align with TextFields. */
export const EXCEL_GRID_ROW_INPUT_MIN_HEIGHT = 26;

/**
 * Dense spreadsheet-style MUI Table: pair with `size="small"` and optional `stickyHeader`.
 * Tight row padding, small type, zebra rows — reuse on any Excel-like inline-edit grid.
 */
export const excelGridTableContainerSx: SxProps<Theme> = {
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
    backgroundColor: 'background.paper',
};

export const excelGridTableSx: SxProps<Theme> = {
    tableLayout: 'fixed',
    '& .MuiTableCell-root': {
        fontSize: 12,
        py: '2px',
        px: 0.75,
        lineHeight: 1.25,
        borderColor: 'divider',
        verticalAlign: 'middle',
    },
    '& .MuiTableHead-root .MuiTableCell-root': {
        fontSize: 11,
        fontWeight: 600,
        py: '3px',
        backgroundColor: 'background.paper',
    },
    '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': {
        backgroundColor: 'action.hover',
    },
    '& .MuiCheckbox-root': {
        padding: '2px',
    },
};

/** Body/header cell baseline when you need to spread onto a single `TableCell` without the full table sx. */
export const excelGridBodyCellSx: SxProps<Theme> = {
    py: '2px',
    px: 0.75,
    verticalAlign: 'middle',
    borderColor: 'divider',
};

/**
 * Drag column: narrow, vertically centers the handle with `excelGridDragHandleIconWrapperSx` + icon.
 */
export const excelGridDragHandleCellSx: SxProps<Theme> = {
    ...excelGridBodyCellSx,
    width: 28,
    maxWidth: 28,
    px: 0.25,
    textAlign: 'center',
};

/**
 * Wrap `DragIndicatorIcon` (or similar) so it sits on the same vertical band as inline inputs.
 */
export const excelGridDragHandleIconWrapperSx: SxProps<Theme> = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: EXCEL_GRID_ROW_INPUT_MIN_HEIGHT,
    width: '100%',
    cursor: 'grab',
    color: 'text.disabled',
    '&:active': { cursor: 'grabbing' },
};

/**
 * `variant="standard"` TextField / Autocomplete input inside spreadsheet cells — bottom rule only, compact.
 */
export const excelGridInlineFieldSx: SxProps<Theme> = {
    ...UNDERLINE_FIELD_SX,
    width: '100%',
    m: 0,
    '& .MuiInputBase-root': {
        fontSize: 12,
        minHeight: EXCEL_GRID_ROW_INPUT_MIN_HEIGHT,
    },
    '& .MuiInputBase-input': { py: '2px', px: 0.25 },
    '& .MuiInput-underline:before': { borderBottomColor: 'divider' },
    '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
        borderBottomColor: 'action.active',
    },
};

export const sgPickerDialogPaperSx: SxProps<Theme> = {
    borderRadius: 1,
    maxWidth: 960,
    width: '100%',
    maxHeight: 'min(90vh, 720px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
};

export const sgPickerTitleRowSx: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    px: 2,
    py: 1.25,
    borderBottom: '1px solid',
    borderColor: 'divider',
    flexShrink: 0,
};

export const sgPickerToolbarRowSx: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    px: 2,
    py: 1,
    borderBottom: '1px solid',
    borderColor: 'divider',
    flexShrink: 0,
};

export const sgPickerSearchFieldSx: SxProps<Theme> = {
    flex: 1,
    minWidth: 0,
    '& .MuiInputBase-root': {
        fontSize: 13,
    },
    '& .MuiInputBase-input': {
        py: 0.75,
    },
};

export const sgPickerTableContainerSx: SxProps<Theme> = {
    flex: 1,
    minHeight: 200,
    overflow: 'auto',
    px: 0,
};

/** Compact grid rows (MUI Table `size="small"` + tight padding). */
export const sgPickerTableSx: SxProps<Theme> = {
    '& .MuiTableCell-root': {
        fontSize: 13,
        py: '6px',
        px: 1.5,
        borderColor: 'divider',
    },
    '& .MuiTableHead-root .MuiTableCell-root': {
        fontWeight: 600,
        backgroundColor: 'background.paper',
    },
    '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': {
        backgroundColor: 'action.hover',
    },
};

export const sgPickerPaginationCaptionSx: SxProps<Theme> = {
    fontSize: 12,
    color: 'text.secondary',
    whiteSpace: 'nowrap',
    ml: 'auto',
};

export const sgPickerFooterRowSx: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    px: 2,
    py: 1.25,
    borderTop: '1px solid',
    borderColor: 'divider',
    flexShrink: 0,
};

/** Primary / secondary actions — uses theme primary (aligns with MUI defaults / column picker tone). */
export const sgPickerBtnSelectSx: SxProps<Theme> = {
    textTransform: 'none',
    fontWeight: 600,
    fontSize: 13,
    px: 2,
    py: 0.5,
    borderRadius: 1,
};

export const sgPickerBtnNewSx: SxProps<Theme> = {
    textTransform: 'none',
    fontWeight: 600,
    fontSize: 13,
    px: 2,
    py: 0.5,
    borderRadius: 1,
};

export const sgPickerBtnCloseSx: SxProps<Theme> = {
    textTransform: 'none',
    fontWeight: 600,
    fontSize: 13,
    px: 2,
    py: 0.5,
    borderRadius: 1,
};

export const sgPickerDragHandleSx: SxProps<Theme> = {
    cursor: 'grab',
    color: 'text.disabled',
    display: 'inline-flex',
    alignItems: 'center',
    '&:active': { cursor: 'grabbing' },
};

export const sgUserStatusBadgeSx = (tone: 'ok' | 'muted' | 'neutral'): SxProps<Theme> => ({
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 600,
    px: 1,
    py: 0.25,
    borderRadius: 10,
    lineHeight: 1.3,
    color: '#fff',
    bgcolor:
        tone === 'ok' ? 'success.main' : tone === 'muted' ? 'info.main' : 'text.disabled',
});
