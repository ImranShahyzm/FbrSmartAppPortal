import { Chip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

export type FbrPillTone = { label: string; bg: string; color: string; border: string };

/**
 * Rounded status pill — same visual language as {@link FbrInvoiceList} invoice status chips.
 */
export const FBR_PILL_CHIP_SX: SxProps<Theme> = {
    height: 24,
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: '0.02em',
    '& .MuiChip-label': { px: '10px', py: 0 },
};

export function FbrPillChip({ tone }: { tone: FbrPillTone }) {
    return (
        <Chip
            size="small"
            label={tone.label}
            sx={{
                ...FBR_PILL_CHIP_SX,
                bgcolor: tone.bg,
                color: tone.color,
                border: `1px solid ${tone.border}`,
            }}
        />
    );
}

/** Security group user rows — green “Validated”-style pill for active, muted for archived. */
export function userAccountStatusTone(isActive: boolean): FbrPillTone {
    return isActive
        ? { label: 'Confirmed', bg: '#2e7d32', color: '#ffffff', border: '#2e7d32' }
        : { label: 'Archived', bg: '#f5f5f5', color: '#616161', border: '#bdbdbd' };
}
