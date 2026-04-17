import * as React from 'react';
import { Box, CircularProgress, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

const CHEVRON_H = 32;
const CHEVRON_OVERLAP = 10;

/** Chevron-shaped workflow steps using the app theme primary palette. */
export function StatusBreadcrumb({
    stages,
    activeKey,
    onStageClick,
}: {
    stages: Array<{ key: string; label: string }>;
    activeKey: string;
    onStageClick?: (key: string) => void;
}) {
    const theme = useTheme();
    const activeIdx = stages.findIndex(s => s.key === activeKey);

    return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {stages.map((s, i) => {
                const isPast = i < activeIdx;
                const isActive = i === activeIdx;
                const isFirst = i === 0;
                const isLast = i === stages.length - 1;
                const clickable = Boolean(onStageClick);

                const pastBg = alpha(theme.palette.primary.main, 0.42);
                const bg = isActive
                    ? theme.palette.primary.main
                    : isPast
                      ? pastBg
                      : theme.palette.grey[200];
                const color = isActive
                    ? theme.palette.primary.contrastText
                    : isPast
                      ? theme.palette.getContrastText(pastBg)
                      : theme.palette.text.secondary;

                const clipPath = (() => {
                    const arrowW = 10;
                    if (isFirst && isLast) return 'none';
                    if (isFirst)
                        return `polygon(0 0, calc(100% - ${arrowW}px) 0, 100% 50%, calc(100% - ${arrowW}px) 100%, 0 100%)`;
                    if (isLast)
                        return `polygon(${arrowW}px 0, 100% 0, 100% 100%, ${arrowW}px 100%, 0 50%)`;
                    return `polygon(${arrowW}px 0, calc(100% - ${arrowW}px) 0, 100% 50%, calc(100% - ${arrowW}px) 100%, ${arrowW}px 100%, 0 50%)`;
                })();

                return (
                    <Box
                        key={s.key}
                        role={clickable ? 'button' : undefined}
                        tabIndex={clickable ? 0 : undefined}
                        onClick={clickable ? () => onStageClick?.(s.key) : undefined}
                        onKeyDown={
                            clickable
                                ? e => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          onStageClick?.(s.key);
                                      }
                                  }
                                : undefined
                        }
                        sx={{
                            position: 'relative',
                            ml: i === 0 ? 0 : `-${CHEVRON_OVERLAP}px`,
                            zIndex: stages.length - i,
                            height: CHEVRON_H,
                            display: 'flex',
                            alignItems: 'center',
                            px: isFirst ? '14px' : '20px',
                            pr: isLast ? '14px' : '20px',
                            bgcolor: bg,
                            color,
                            clipPath,
                            fontSize: 12,
                            fontWeight: isActive ? 700 : 500,
                            letterSpacing: '0.01em',
                            userSelect: 'none',
                            transition: 'background 0.15s',
                            whiteSpace: 'nowrap',
                            cursor: clickable ? 'pointer' : 'default',
                            '&:hover': clickable
                                ? {
                                      filter: 'brightness(0.97)',
                                  }
                                : undefined,
                            '&:focus-visible': clickable
                                ? {
                                      outline: '2px solid',
                                      outlineColor: theme.palette.primary.main,
                                      outlineOffset: 2,
                                      borderRadius: 1,
                                  }
                                : undefined,
                        }}
                    >
                        {s.label}
                    </Box>
                );
            })}
        </Box>
    );
}

/** Compact workflow actions aligned with theme primary / error / neutral tones. */
export function WorkflowActionButton({
    label,
    onClick,
    loading,
    variant = 'primary',
    disabled,
}: {
    label: string;
    onClick: () => void;
    loading?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    disabled?: boolean;
}) {
    return (
        <Box
            component="button"
            type="button"
            onClick={onClick}
            disabled={disabled || loading}
            sx={theme => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: 30,
                px: '12px',
                borderRadius: '4px',
                fontSize: 13,
                fontWeight: 600,
                cursor: disabled || loading ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.55 : 1,
                transition: 'filter 0.1s',
                '&:hover:not(:disabled)': { filter: 'brightness(0.92)' },
                '&:active:not(:disabled)': { filter: 'brightness(0.85)' },
                ...(variant === 'primary' && {
                    background: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    border: `1px solid ${theme.palette.primary.dark}`,
                }),
                ...(variant === 'secondary' && {
                    background: theme.palette.background.paper,
                    color: theme.palette.primary.main,
                    border: `1px solid ${theme.palette.primary.main}`,
                }),
                ...(variant === 'danger' && {
                    background: theme.palette.background.paper,
                    color: theme.palette.error.main,
                    border: `1px solid ${theme.palette.error.main}`,
                }),
                ...(variant === 'ghost' && {
                    background: theme.palette.action.hover,
                    color: theme.palette.text.secondary,
                    border: `1px solid ${theme.palette.divider}`,
                }),
            })}
        >
            {loading ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : null}
            {label}
        </Box>
    );
}
