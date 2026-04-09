/**
 * Shared MUI {@link Menu} `slotProps` for Catalog-style dropdowns (matches main app).
 */
export function catalogDropdownMenuSlotProps(open: boolean) {
    return {
        paper: {
            elevation: 0,
            sx: {
                mt: '7px',
                borderRadius: '10px',
                bgcolor: '#ffffff',
                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                minWidth: 240,
                maxWidth: 'min(280px, calc(100vw - 24px))',
                py: 1,
                px: 1.25,
                overflow: 'hidden',
                fontFamily:
                    '"Inter", "Roboto", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                '@keyframes odooNavDropdownEnter': {
                    from: { transform: 'translateY(-6px)' },
                    to: { transform: 'translateY(0)' },
                },
                animation: open
                    ? 'odooNavDropdownEnter 180ms cubic-bezier(0.4, 0, 0.2, 1) both'
                    : 'none',
            },
        },
        list: {
            dense: false,
            sx: {
                py: 0,
                px: 0,
                '& .MuiMenuItem-root': {
                    fontSize: '0.875rem',
                    lineHeight: 1.4,
                    color: '#333333',
                    py: '6px',
                    px: '12px',
                    minHeight: 'auto',
                    borderRadius: '6px',
                    transition: 'background-color 0.2s ease, color 0.2s ease',
                    '&:hover': {
                        bgcolor: '#f5f5f5',
                        color: '#222222',
                    },
                    '&.Mui-focusVisible': {
                        bgcolor: '#f5f5f5',
                    },
                },
            },
        },
        transition: {
            timeout: 180,
        },
    };
}
