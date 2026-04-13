import * as React from 'react';
import { useTranslate } from 'react-admin';
import {
    Box,
    Button,
    Card,
    CardContent,
    Divider,
    IconButton,
    TextField,
    Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';

type GlChartAccountChatterProps = {
    /** True on create — no persisted id yet. */
    isNew?: boolean;
    /** Optional title for activity blurb when editing. */
    recordTitle?: string | null;
    recordId?: number | null;
};

/**
 * Odoo-style right column placeholder (messages / activity). No backend yet — matches layout of company chatter.
 */
export function GlChartAccountChatter(props: GlChartAccountChatterProps) {
    const translate = useTranslate();
    const { isNew, recordTitle, recordId } = props;
    const title = recordTitle?.trim() || translate('resources.glChartAccounts.name', { smart_count: 1 });

    return (
        <Card
            variant="outlined"
            sx={{
                borderColor: 'divider',
                borderRadius: 1,
                boxShadow: 'none',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <CardContent sx={{ p: 1.5, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                    <Button
                        size="small"
                        variant="contained"
                        color="secondary"
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12, py: 0.5 }}
                    >
                        Send message
                    </Button>
                    <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontSize: 12, py: 0.5 }}>
                        Log note
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    <IconButton size="small" disabled sx={{ p: '4px' }}>
                        <SearchIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" disabled sx={{ p: '4px' }}>
                        <AttachFileOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" disabled sx={{ p: '4px' }}>
                        <PersonOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                </Box>

                <TextField
                    size="small"
                    fullWidth
                    placeholder="Log an internal note…"
                    disabled
                    sx={{ '& .MuiInputBase-root': { fontSize: 13 } }}
                />

                <Divider />

                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Activity
                </Typography>
                <Box sx={{ flex: 1, minHeight: 120 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, py: 1 }}>
                        {isNew || recordId == null
                            ? 'Save the account to enable notes and follow-up on this record.'
                            : `Record “${title}” — activity feed will appear here when messaging is connected.`}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
}
