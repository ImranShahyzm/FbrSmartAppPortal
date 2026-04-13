import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Shared layout/styling for “master block + MUI Tabs below” forms (e.g. User create/edit, Security group).
 * Keeps tab strip and cards aligned across screens.
 */

/** Sticky title/actions bar inside a react-admin `SimpleForm` (see UserCreate). */
export const stickySimpleFormHeaderBarSx: SxProps<Theme> = {
    position: { md: 'sticky' },
    top: { md: 0 },
    zIndex: 5,
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
    px: 2,
    py: '6px',
    mb: 1.5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    flexWrap: 'wrap',
};

/** Outlined card for primary / “header” fields (UserHeaderCard). */
export const masterDetailPrimaryCardSx: SxProps<Theme> = {
    mb: 1.5,
    width: '100%',
    borderColor: '#dee2e6',
    borderRadius: '4px',
    boxShadow: 'none',
};

/** Inner card wrapping the tab strip + tab panels (UserMainFormBlocks). */
export const masterDetailTabbedCardSx: SxProps<Theme> = {
    width: '100%',
    borderColor: '#dee2e6',
    borderRadius: '4px',
    boxShadow: 'none',
};

/** MUI `Tabs` strip — match UserMainFormBlocks (not SecurityGroup TabbedForm). */
export const masterDetailTabsSx: SxProps<Theme> = {
    minHeight: 36,
    '& .MuiTab-root': {
        minHeight: 36,
        py: 0.5,
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.8rem',
    },
};

/** `CardContent` padding for the tabbed section (UserMainFormBlocks). */
export const masterDetailTabbedCardContentSx: SxProps<Theme> = {
    p: '12px 16px 16px !important',
};

/** `CardContent` padding for the primary / master card (UserHeaderCard). */
export const masterDetailPrimaryCardContentSx: SxProps<Theme> = {
    p: '16px 20px !important',
    width: '100%',
    boxSizing: 'border-box',
};
