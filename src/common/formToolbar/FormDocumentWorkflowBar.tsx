import * as React from 'react';
import { Box, Button, Chip, Divider, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

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
    /** Optional style overrides for the header bar container. */
    sx?: SxProps<Theme>;
    /** Shown next to the title (e.g. Draft / Posted). */
    statusChip?: { label: string; color?: 'default' | 'primary' | 'success' | 'warning' };
    /** Optional centered content (e.g. Balance). */
    centerContent?: React.ReactNode;
    /** Primary posting action (separate from save draft). */
    showPost?: boolean;
    postLabel?: string;
    onPost?: () => void | Promise<void>;
    postDisabled?: boolean;
    /** Optional actions shown on the right, before the toolbar (e.g. prev/next). */
    navigationActions?: React.ReactNode;
    /**
     * @deprecated Use `navigationActions` to keep placement consistent across ERP.
     * Kept for backwards compatibility (this file is only used in a few places).
     */
    leadingActions?: React.ReactNode;
};

/**
 * Document header: title, optional status chip, Post, then save/delete/settings/close from {@link FormHeaderToolbar}.
 */
export function FormDocumentWorkflowBar(props: FormDocumentWorkflowBarProps) {
    const {
        title,
        subtitle,
        sx,
        statusChip,
        centerContent,
        showPost,
        postLabel = 'Post',
        onPost,
        postDisabled,
        navigationActions,
        leadingActions,
        ...toolbarProps
    } = props;

    const nav = navigationActions ?? leadingActions;

    return (
        <Box
            sx={{
                ...stickySimpleFormHeaderBarSx,
                ...(centerContent
                    ? {
                          display: 'grid',
                          gridTemplateColumns: '1fr auto 1fr',
                          alignItems: 'center',
                      }
                    : {}),
                ...(sx as object),
            }}
        >
            <Box sx={{ minWidth: 0, ...(centerContent ? { gridColumn: 1 } : { flex: '1 1 200px' }) }}>
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
                </Box>
                {subtitle ? (
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                        {subtitle}
                    </Typography>
                ) : null}
            </Box>
            {centerContent ? (
                <Box sx={{ gridColumn: 2, justifySelf: 'center', display: 'flex', alignItems: 'center' }}>
                    {centerContent}
                </Box>
            ) : null}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexWrap: 'wrap',
                    ...(centerContent ? { gridColumn: 3, justifySelf: 'end' } : {}),
                }}
            >
                {nav ? (
                    <>
                        {nav}
                        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                    </>
                ) : null}
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
