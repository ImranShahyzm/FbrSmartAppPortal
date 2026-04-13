import * as React from 'react';
import { Box, Button, Chip, Divider, Typography } from '@mui/material';

import { stickySimpleFormHeaderBarSx } from '../masterDetailFormTheme';
import { FormHeaderToolbar, type FormHeaderToolbarProps } from './FormHeaderToolbar';

export type FormDocumentWorkflowBarProps = Omit<
    FormHeaderToolbarProps,
    'saveEventName' | 'resource' | 'listPath'
> & {
    saveEventName: string;
    resource: string;
    listPath: string;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    /** Shown next to the title (e.g. Draft / Posted). */
    statusChip?: { label: string; color?: 'default' | 'primary' | 'success' | 'warning' };
    /** Primary posting action (separate from save draft). */
    showPost?: boolean;
    postLabel?: string;
    onPost?: () => void | Promise<void>;
    postDisabled?: boolean;
    /** Optional slot after title (e.g. prev/next). */
    leadingActions?: React.ReactNode;
};

/**
 * Document header: title, optional status chip, Post, then save/delete/settings/close from {@link FormHeaderToolbar}.
 */
export function FormDocumentWorkflowBar(props: FormDocumentWorkflowBarProps) {
    const {
        title,
        subtitle,
        statusChip,
        showPost,
        postLabel = 'Post',
        onPost,
        postDisabled,
        leadingActions,
        ...toolbarProps
    } = props;

    return (
        <Box sx={stickySimpleFormHeaderBarSx}>
            <Box sx={{ minWidth: 0, flex: '1 1 200px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
                        {title}
                    </Typography>
                    {statusChip ? (
                        <Chip
                            size="small"
                            label={statusChip.label}
                            color={statusChip.color ?? 'default'}
                            sx={{ fontWeight: 600 }}
                        />
                    ) : null}
                    {leadingActions}
                </Box>
                {subtitle ? (
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                        {subtitle}
                    </Typography>
                ) : null}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {showPost ? (
                    <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        disabled={postDisabled}
                        onClick={() => void onPost?.()}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                        {postLabel}
                    </Button>
                ) : null}
                {showPost ? (
                    <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                ) : null}
                <FormHeaderToolbar {...toolbarProps} />
            </Box>
        </Box>
    );
}
