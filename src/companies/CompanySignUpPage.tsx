import * as React from 'react';
import {
    Alert,
    AppBar,
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Divider,
    Grid,
    IconButton,
    InputAdornment,
    MenuItem,
    TextField,
    Toolbar,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import { Link } from 'react-router-dom';
import {
    fetchPublicFbrProvinces,
    registerCompany,
    type PublicFbrProvince,
    type RegisterCompanyPayload,
} from '../api/registerCompany';
import { FieldRow, FIELD_LABEL_SX, UNDERLINE_FIELD_SX } from '../common/odooCompactFormFields';

const NAV_TEAL = '#3d7a7a';

const ADDRESS_SINGLE_LINE_SX = {
    '& .MuiInputBase-input': {
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
    },
};

const SELECT_UNDERLINE_SX = {
    ...UNDERLINE_FIELD_SX,
    '& .MuiSelect-select': { py: '5px' },
    '& .MuiSelect-icon': { top: 'calc(50% - 12px)' },
};

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result ?? ''));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
    });
}

type SignupFormState = {
    title: string;
    shortTitle: string;
    ntnNo: string;
    st_Registration: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    fbrProvinceId: number | null;
    employeeCount: number | '';
    logoBase64: string;
    username: string;
    fullName: string;
};

const emptyForm: SignupFormState = {
    title: '',
    shortTitle: '',
    ntnNo: '',
    st_Registration: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    fbrProvinceId: null,
    employeeCount: '',
    logoBase64: '',
    username: '',
    fullName: '',
};

function SignupTextField(props: React.ComponentProps<typeof TextField>) {
    return (
        <TextField
            variant="standard"
            size="small"
            margin="none"
            fullWidth
            sx={{ ...UNDERLINE_FIELD_SX, ...(props.sx as object) }}
            {...props}
        />
    );
}

/**
 * Self-service company registration — layout and field density match the in-app company form.
 */
export default function CompanySignUpPage() {
    const [form, setForm] = React.useState<SignupFormState>({ ...emptyForm });
    const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
    const [provinces, setProvinces] = React.useState<PublicFbrProvince[]>([]);
    const [loadProvErr, setLoadProvErr] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);
    const [formError, setFormError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState<{
        username: string;
        temporaryPassword: string;
        message: string;
    } | null>(null);

    React.useEffect(() => {
        void (async () => {
            try {
                const list = await fetchPublicFbrProvinces();
                setProvinces(list);
            } catch {
                setLoadProvErr('Could not load FBR provinces. You can still register and set province later.');
            }
        })();
    }, []);

    const setField = <K extends keyof SignupFormState>(key: K, value: SignupFormState[K]) => {
        setForm(f => ({ ...f, [key]: value }));
    };

    const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const dataUrl = await readFileAsDataUrl(file);
            setField('logoBase64', dataUrl);
            setLogoPreview(dataUrl);
        } catch {
            setFormError('Could not read image file.');
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        if (!form.title.trim()) {
            setFormError('Company name is required.');
            return;
        }
        if (!form.shortTitle.trim()) {
            setFormError('Short title is required.');
            return;
        }
        if (form.shortTitle.trim().length > 10) {
            setFormError('Short title must be at most 10 characters.');
            return;
        }
        if (!form.ntnNo.trim()) {
            setFormError('NTN is required.');
            return;
        }
        const signInEmail = form.username.trim();
        if (!signInEmail) {
            setFormError('Sign-in email is required.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signInEmail)) {
            setFormError('Enter a valid sign-in email address.');
            return;
        }
        if (!form.fullName.trim()) {
            setFormError('Your full name is required.');
            return;
        }

        let employeeCount: number | undefined;
        if (form.employeeCount !== '') {
            const n = Number(form.employeeCount);
            if (Number.isNaN(n) || n < 0 || !Number.isInteger(n)) {
                setFormError('Number of employees must be a whole number, zero or greater.');
                return;
            }
            employeeCount = n;
        }

        const payload: RegisterCompanyPayload = {
            title: form.title.trim(),
            shortTitle: form.shortTitle.trim(),
            ntnNo: form.ntnNo.trim(),
            st_Registration: form.st_Registration?.trim() || undefined,
            address: form.address?.trim() || undefined,
            phone: form.phone?.trim() || undefined,
            email: form.email?.trim() || undefined,
            website: form.website?.trim() || undefined,
            fbrProvinceId: form.fbrProvinceId || null,
            employeeCount,
            logoBase64: form.logoBase64?.trim() || undefined,
            username: signInEmail,
            fullName: form.fullName.trim(),
        };

        setSubmitting(true);
        try {
            const r = await registerCompany(payload);
            setSuccess({
                username: r.username,
                temporaryPassword: r.temporaryPassword,
                message: r.message,
            });
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setSubmitting(false);
        }
    };

    const displayTitle = form.title.trim() || 'New company';

    const imgSx = {
        width: 220,
        height: 220,
        objectFit: 'contain' as const,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 1,
        display: 'block',
        flexShrink: 0,
    };

    return (
        <Box
            sx={{
                minHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.default',
            }}
        >
            <AppBar
                position="static"
                elevation={0}
                sx={{
                    flexShrink: 0,
                    bgcolor: '#fff',
                    borderBottom: '1px solid #e8e8e8',
                }}
            >
                <Toolbar sx={{ minHeight: '56px !important', px: { xs: 2, sm: 4 }, gap: 1 }}>
                    <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: '#333' }}>
                        FBR Smart Application
                    </Typography>
                    <Box
                        sx={{
                            display: { xs: 'none', md: 'flex' },
                            alignItems: 'center',
                            gap: 0.5,
                            color: '#555',
                            fontSize: 14,
                            mr: 1,
                        }}
                    >
                        <PhoneIphoneIcon sx={{ fontSize: 16 }} />
                        <Typography variant="body2" sx={{ fontSize: 14 }}>
                            (+92) 300 8676368
                        </Typography>
                    </Box>
                    <Button
                        component={Link}
                        to="/login"
                        size="small"
                        sx={{
                            color: '#333',
                            textTransform: 'none',
                            fontWeight: 400,
                            fontSize: 15,
                            px: 1.25,
                            '&:hover': { color: NAV_TEAL, bgcolor: 'transparent' },
                        }}
                    >
                        Sign in
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        disabled
                        sx={{
                            bgcolor: NAV_TEAL,
                            color: '#fff',
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: 14,
                            borderRadius: '4px',
                            px: 2,
                            py: '6px',
                            boxShadow: 'none',
                        }}
                    >
                        Sign up
                    </Button>
                </Toolbar>
            </AppBar>

            <Box component="main" sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <Container maxWidth="lg" sx={{ py: 2, px: { xs: 2, sm: 3 } }}>
                    <form onSubmit={e => void onSubmit(e)}>
                        {!success ? (
                            <>
                                <Box
                                    sx={{
                                        position: 'sticky',
                                        top: 0,
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
                                    }}
                                >
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
                                            Company registration
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ fontSize: '0.72rem', display: 'block' }}
                                        >
                                            Submissions are saved as waiting for approval. You will receive a temporary
                                            password to sign in.
                                        </Typography>
                                    </Box>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        disabled={submitting}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            fontSize: 12,
                                            py: '6px',
                                            px: 2,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {submitting ? 'Saving…' : 'Register'}
                                    </Button>
                                </Box>

                                {loadProvErr && (
                                    <Alert severity="warning" sx={{ mb: 1.5 }}>
                                        {loadProvErr}
                                    </Alert>
                                )}
                                {formError && (
                                    <Alert severity="error" sx={{ mb: 1.5 }}>
                                        {formError}
                                    </Alert>
                                )}

                                <Card
                                    variant="outlined"
                                    sx={{
                                        width: '100%',
                                        borderColor: '#dee2e6',
                                        borderRadius: '4px',
                                        boxShadow: 'none',
                                    }}
                                >
                                    <CardContent
                                        sx={{
                                            p: '16px 20px !important',
                                            width: '100%',
                                            maxWidth: '100%',
                                            boxSizing: 'border-box',
                                        }}
                                    >
                                        <Grid
                                            container
                                            columnSpacing={4}
                                            rowSpacing={0}
                                            alignItems="flex-start"
                                            sx={{ width: '100%' }}
                                        >
                                            <Grid size={{ xs: 12, lg: 9 }}>
                                                <Box sx={{ mb: 1 }}>
                                                    <Typography
                                                        variant="overline"
                                                        color="text.secondary"
                                                        sx={{ fontSize: '0.7rem' }}
                                                    >
                                                        Company
                                                    </Typography>
                                                    <Typography
                                                        variant="h5"
                                                        fontWeight={700}
                                                        sx={{ lineHeight: 1.2, fontSize: '1.25rem' }}
                                                    >
                                                        {displayTitle}
                                                    </Typography>
                                                </Box>

                                                <FieldRow label="Company name">
                                                    <SignupTextField
                                                        value={form.title}
                                                        onChange={e => setField('title', e.target.value)}
                                                        required
                                                    />
                                                </FieldRow>
                                                <FieldRow label="Short title">
                                                    <SignupTextField
                                                        value={form.shortTitle}
                                                        onChange={e => setField('shortTitle', e.target.value)}
                                                        required
                                                        inputProps={{ maxLength: 10 }}
                                                    />
                                                </FieldRow>

                                                <Grid container columnSpacing={2} sx={{ width: '100%', mt: 0.5, mb: '4px' }}>
                                                    <Grid size={{ xs: 12, sm: 6 }}>
                                                        <FieldRow label="NTN No">
                                                            <SignupTextField
                                                                value={form.ntnNo}
                                                                onChange={e => setField('ntnNo', e.target.value)}
                                                                required
                                                            />
                                                        </FieldRow>
                                                    </Grid>
                                                    <Grid size={{ xs: 12, sm: 6 }}>
                                                        <FieldRow label="ST Registration">
                                                            <SignupTextField
                                                                value={form.st_Registration ?? ''}
                                                                onChange={e =>
                                                                    setField('st_Registration', e.target.value)
                                                                }
                                                            />
                                                        </FieldRow>
                                                    </Grid>
                                                </Grid>

                                                <FieldRow label="Address">
                                                    <SignupTextField
                                                        value={form.address ?? ''}
                                                        onChange={e => setField('address', e.target.value)}
                                                        sx={ADDRESS_SINGLE_LINE_SX}
                                                    />
                                                </FieldRow>

                                                <Grid container columnSpacing={2} sx={{ width: '100%', mb: '4px' }}>
                                                    <Grid size={{ xs: 12, sm: 6 }}>
                                                        <FieldRow label="Phone">
                                                            <SignupTextField
                                                                value={form.phone ?? ''}
                                                                onChange={e => setField('phone', e.target.value)}
                                                            />
                                                        </FieldRow>
                                                    </Grid>
                                                    <Grid size={{ xs: 12, sm: 6 }}>
                                                        <FieldRow label="Email">
                                                            <SignupTextField
                                                                type="email"
                                                                value={form.email ?? ''}
                                                                onChange={e => setField('email', e.target.value)}
                                                            />
                                                        </FieldRow>
                                                    </Grid>
                                                </Grid>

                                                <Grid container columnSpacing={2} sx={{ width: '100%', mb: '4px' }}>
                                                    <Grid size={{ xs: 12, sm: 6 }}>
                                                        <FieldRow label="Website">
                                                            <SignupTextField
                                                                value={form.website ?? ''}
                                                                onChange={e => setField('website', e.target.value)}
                                                            />
                                                        </FieldRow>
                                                    </Grid>
                                                    <Grid size={{ xs: 12, sm: 6 }}>
                                                        <FieldRow label="FBR Province">
                                                            <TextField
                                                                select
                                                                variant="standard"
                                                                size="small"
                                                                margin="none"
                                                                fullWidth
                                                                value={
                                                                    form.fbrProvinceId != null
                                                                        ? String(form.fbrProvinceId)
                                                                        : ''
                                                                }
                                                                onChange={e =>
                                                                    setField(
                                                                        'fbrProvinceId',
                                                                        e.target.value === ''
                                                                            ? null
                                                                            : Number(e.target.value)
                                                                    )
                                                                }
                                                                sx={SELECT_UNDERLINE_SX}
                                                            >
                                                                <MenuItem value="">
                                                                    <em>None</em>
                                                                </MenuItem>
                                                                {provinces.map(p => (
                                                                    <MenuItem
                                                                        key={`${p.id}-${p.companyID ?? 0}`}
                                                                        value={String(p.id)}
                                                                    >
                                                                        {p.provincename ?? p.id}
                                                                    </MenuItem>
                                                                ))}
                                                            </TextField>
                                                        </FieldRow>
                                                    </Grid>
                                                </Grid>

                                                <FieldRow label="No. of employees">
                                                    <SignupTextField
                                                        type="number"
                                                        value={
                                                            form.employeeCount === ''
                                                                ? ''
                                                                : String(form.employeeCount)
                                                        }
                                                        onChange={e => {
                                                            const v = e.target.value;
                                                            if (v === '') setField('employeeCount', '');
                                                            else {
                                                                const n = parseInt(v, 10);
                                                                setField(
                                                                    'employeeCount',
                                                                    Number.isNaN(n) ? '' : n
                                                                );
                                                            }
                                                        }}
                                                        inputProps={{ min: 0, step: 1 }}
                                                    />
                                                </FieldRow>

                                                <Typography
                                                    variant="overline"
                                                    color="text.secondary"
                                                    sx={{ fontSize: '0.7rem', display: 'block', mt: 1, mb: 0.5 }}
                                                >
                                                    Administrator account (unique sign-in email across all companies)
                                                </Typography>
                                                <FieldRow label="Sign-in email">
                                                    <SignupTextField
                                                        type="email"
                                                        value={form.username}
                                                        onChange={e => setField('username', e.target.value)}
                                                        required
                                                        autoComplete="email"
                                                    />
                                                </FieldRow>
                                                <FieldRow label="Full name">
                                                    <SignupTextField
                                                        value={form.fullName}
                                                        onChange={e => setField('fullName', e.target.value)}
                                                        required
                                                        autoComplete="name"
                                                    />
                                                </FieldRow>
                                            </Grid>

                                            <Grid size={{ xs: 12, lg: 3 }} sx={{ alignSelf: 'flex-start' }}>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: { xs: 'flex-start', lg: 'flex-end' },
                                                        gap: 1,
                                                        width: '100%',
                                                        overflow: 'hidden',
                                                        '& img': { maxWidth: '100% !important', height: 'auto' },
                                                    }}
                                                >
                                                    <Typography sx={{ ...FIELD_LABEL_SX, alignSelf: 'flex-end' }}>
                                                        Company logo
                                                    </Typography>
                                                    <Button variant="outlined" component="label" size="small" sx={{ textTransform: 'none' }}>
                                                        Select logo
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            hidden
                                                            onChange={e => void onLogo(e)}
                                                        />
                                                    </Button>
                                                    {logoPreview ? (
                                                        <Box component="img" src={logoPreview} alt="Logo preview" sx={imgSx} />
                                                    ) : null}
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            <>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: 2,
                                        mb: 2,
                                    }}
                                >
                                    <Typography variant="h6" fontWeight={700}>
                                        Registration complete
                                    </Typography>
                                    <Button component={Link} to="/login" variant="contained" sx={{ textTransform: 'none' }}>
                                        Go to Sign in
                                    </Button>
                                </Box>
                                <Card
                                    variant="outlined"
                                    sx={{ borderColor: '#dee2e6', borderRadius: '4px', boxShadow: 'none' }}
                                >
                                    <CardContent sx={{ p: '16px 20px !important' }}>
                                        <Alert severity="success" sx={{ mb: 2 }}>
                                            {success.message}
                                        </Alert>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Save these credentials; the password will not be shown again.
                                        </Typography>
                                        <FieldRow label="Sign-in email">
                                            <SignupTextField value={success.username} InputProps={{ readOnly: true }} />
                                        </FieldRow>
                                        <FieldRow label="Temporary password">
                                            <SignupTextField
                                                value={success.temporaryPassword}
                                                InputProps={{
                                                    readOnly: true,
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton
                                                                aria-label="Copy password"
                                                                onClick={() =>
                                                                    void navigator.clipboard.writeText(
                                                                        success.temporaryPassword
                                                                    )
                                                                }
                                                                edge="end"
                                                                size="small"
                                                            >
                                                                <ContentCopyIcon fontSize="small" />
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        </FieldRow>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </form>
                </Container>
            </Box>

            <Divider />
            <Box component="footer" sx={{ flexShrink: 0, py: 1.5, textAlign: 'center', bgcolor: '#fff' }}>
                <Typography variant="caption" color="text.secondary">
                    Copyright © Corbis Soft — All Rights Reserved
                </Typography>
            </Box>
        </Box>
    );
}
