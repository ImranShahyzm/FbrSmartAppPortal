import * as React from 'react';
import {
    AppBar,
    Box,
    Button,
    Container,
    Divider,
    Fab,
    IconButton,
    Link,
    Toolbar,
    Typography,
} from '@mui/material';
import EmailIcon           from '@mui/icons-material/Email';
import FacebookIcon        from '@mui/icons-material/Facebook';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LinkedInIcon        from '@mui/icons-material/LinkedIn';
import PhoneIphoneIcon     from '@mui/icons-material/PhoneIphone';
import PlaceIcon           from '@mui/icons-material/Place';
import TwitterIcon         from '@mui/icons-material/Twitter';
import WhatsAppIcon        from '@mui/icons-material/WhatsApp';
import { Login as RaLogin, LoginForm } from 'react-admin';
import { Link as RouterLink } from 'react-router-dom';

// ── Design tokens ─────────────────────────────────────────────────────────────
const NAV_TEAL   = '#3d7a7a';
const PRIMARY    = '#3d7a7a';   // theme primary — teal green
const PRIMARY_DK = '#2e6262';
const FOOTER_BG  = '#161c2d';
const MUTED      = 'rgba(255,255,255,0.65)';
const LINK_COLOR = '#7c9fc0';

// ── Odoo-style login overrides ────────────────────────────────────────────────
//   • Static bold label above each input (no floating label)
//   • Light blue-tinted background on inputs, rounded border
//   • Full-width rounded-pill Log in button in theme primary colour
const raLoginSx = {
    // collapse the RA wrapper so it doesn't add its own background / padding
    display: 'contents',
    '& .RaLogin-card': {
        width: '100%',
        maxWidth: 400,
        m: '0 auto',
        boxShadow: 'none',
        borderRadius: 0,
        background: 'transparent',
        p: 0,
    },
    backgroundImage: 'none !important',
    background:      'transparent !important',
    minHeight:       '0 !important',
    height:          'auto',

    // ── Form wrapper spacing ──
    '& form': {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        p: 0,
    },

    // ── MuiFormControl wrappers: full width, no extra margin ──
    '& .MuiFormControl-root': {
        width: '100%',
        mb: 0,
    },

    // ── Static label: bold, dark, rendered above the input ──
    '& .MuiInputLabel-root': {
        position: 'static',
        transform: 'none',
        fontSize: '0.82rem',
        fontWeight: 700,
        color: '#212529',
        mb: '5px',
        display: 'block',
        lineHeight: 1.4,
        // hide the shrink animation artefact
        '&.MuiInputLabel-shrink': {
            transform: 'none',
        },
    },

    // ── Remove the notch gap left for the floating label ──
    '& legend': { display: 'none' },
    '& fieldset': { top: 0 },

    // ── Input base: light blue-tint fill, rounded corners ──
    '& .MuiInputBase-root': {
        borderRadius: '6px',
        backgroundColor: '#eaf1fb',
        fontSize: '0.9rem',
        transition: 'background-color 0.15s',
        '&:hover': { backgroundColor: '#dde8f7' },
        '&.Mui-focused': { backgroundColor: '#eaf1fb' },
    },
    '& .MuiInputBase-input': {
        py: '9px',
        px: '12px',
    },

    // ── Border colour ──
    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: '#c6d8f0',
        borderRadius: '6px',
    },
    '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: '#a8c4e0',
    },
    '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: PRIMARY,
        borderWidth: '1.5px',
    },

    // ── Submit button: full-width, rounded pill, theme primary ──
    '& .RaLoginForm-button, & button[type="submit"]': {
        width: '100%',
        borderRadius: '24px',
        bgcolor: PRIMARY,
        color: '#fff',
        textTransform: 'none',
        fontWeight: 700,
        fontSize: '0.95rem',
        py: '10px',
        mt: '4px',
        boxShadow: 'none',
        '&:hover': {
            bgcolor: PRIMARY_DK,
            boxShadow: 'none',
        },
    },
} as const;

function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Component ─────────────────────────────────────────────────────────────────
const Login = () => (
    <Box
        sx={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: '#fff',
        }}
    >
        {/* ════════════════════════════════════════════════════════════════
            HEADER
        ════════════════════════════════════════════════════════════════ */}
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                    {['Home', 'Contact us'].map(label => (
                        <Button
                            key={label}
                            size="small"
                            sx={{
                                color: '#333',
                                textTransform: 'none',
                                fontWeight: 400,
                                fontSize: 15,
                                px: 1.25,
                                '&:hover': { color: NAV_TEAL, bgcolor: 'transparent' },
                            }}
                            onClick={() => label === 'Contact us' && scrollTo('footer-contact')}
                        >
                            {label}
                        </Button>
                    ))}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                        sx={{
                            display: { xs: 'none', md: 'flex' },
                            alignItems: 'center',
                            gap: 0.5,
                            color: '#555',
                            fontSize: 14,
                        }}
                    >
                        <PhoneIphoneIcon sx={{ fontSize: 16 }} />
                        <Typography variant="body2" sx={{ fontSize: 14 }}>
                            (+92) 300 8676368
                        </Typography>
                    </Box>

                    <Button
                        size="small"
                        sx={{
                            color: '#333',
                            textTransform: 'none',
                            fontWeight: 400,
                            fontSize: 15,
                            px: 1.25,
                            '&:hover': { color: NAV_TEAL, bgcolor: 'transparent' },
                        }}
                        onClick={() => scrollTo('login-form')}
                    >
                        Sign in
                    </Button>

                    <Button
                        variant="contained"
                        size="small"
                        component={RouterLink}
                        to="/signup"
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
                            '&:hover': { bgcolor: '#2e6262', boxShadow: 'none' },
                        }}
                    >
                        Sign up
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>

        {/* ════════════════════════════════════════════════════════════════
            MAIN — login form, no card/shadow, Odoo field styling
        ════════════════════════════════════════════════════════════════ */}
        <Box
            component="main"
            id="login-form"
            sx={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#fff',
                overflow: 'auto',
                px: 2,
                py: 4,
            }}
        >
            <Box sx={{ width: '100%', maxWidth: 400 }}>
                <RaLogin sx={raLoginSx}>
                    <LoginForm />
                </RaLogin>
            </Box>
        </Box>

        {/* ════════════════════════════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════════════════════════════ */}
        <Box
            component="footer"
            sx={{
                flexShrink: 0,
                bgcolor: FOOTER_BG,
                color: '#fff',
                overflowY: 'auto',
                maxHeight: { xs: 'min(46vh, 380px)', md: 'min(40vh, 340px)' },
            }}
        >
            {/* Connect with us banner */}
            <Box
                id="footer-contact"
                sx={{
                    borderBottom: '1px solid rgba(255,255,255,0.10)',
                    py: { xs: 1.5, md: 2 },
                    px: { xs: 2, sm: 4 },
                    display: 'flex',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 1.5,
                }}
            >
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.25 }}>
                        Connect with us
                    </Typography>
                    <Typography variant="caption" sx={{ color: MUTED, display: 'block', mb: 1 }}>
                        Your message will be delivered to our client support team.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {[
                            { icon: <FacebookIcon sx={{ fontSize: 18 }} />, href: 'https://facebook.com',       label: 'Facebook' },
                            { icon: <TwitterIcon  sx={{ fontSize: 18 }} />, href: 'https://twitter.com',        label: 'Twitter'  },
                            { icon: <LinkedInIcon sx={{ fontSize: 18 }} />, href: 'https://linkedin.com',       label: 'LinkedIn' },
                            { icon: <WhatsAppIcon sx={{ fontSize: 18 }} />, href: 'https://wa.me/923008676368', label: 'WhatsApp' },
                        ].map(({ icon, href, label }) => (
                            <IconButton
                                key={label}
                                component="a"
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={label}
                                size="small"
                                sx={{
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,0.30)',
                                    borderRadius: '50%',
                                    p: '6px',
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.10)', borderColor: '#fff' },
                                }}
                            >
                                {icon}
                            </IconButton>
                        ))}
                    </Box>
                </Box>

                <Button
                    component="a"
                    href="mailto:sales@corbissoft.com"
                    variant="outlined"
                    size="small"
                    sx={{
                        alignSelf: { xs: 'stretch', sm: 'center' },
                        color: '#fff',
                        borderColor: 'rgba(255,255,255,0.40)',
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: '4px',
                        px: 2.5,
                        py: '6px',
                        flexShrink: 0,
                        '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
                    }}
                >
                    Contact Us
                </Button>
            </Box>

            {/* 3-column footer */}
            <Container maxWidth="lg" sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 2, sm: 4 } }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                        gap: { xs: 2, md: 0 },
                    }}
                >
                    <OfficeColumn
                        title="Useful Links"
                        links={['Home', 'About us', 'Products', 'Services', 'Legal', 'Contact us']}
                        showDivider
                    />
                    <OfficeColumn
                        title="About us"
                        body="We are a team of passionate people whose goal is to improve everyone's life through disruptive products. We build great products to solve your business problems."
                        showDivider
                    />
                    <OfficeColumn
                        title="Contact"
                        address="425-J3, Johar Town, Lahore"
                        phone="(+92) 300 8676368"
                        email="sales@corbissoft.com"
                        showDivider={false}
                    />
                </Box>
            </Container>

            {/* Copyright bar */}
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.10)' }} />
            <Container maxWidth="lg" sx={{ py: 1, px: { xs: 2, sm: 4 } }}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { sm: 'center' },
                        justifyContent: 'space-between',
                        gap: 1,
                    }}
                >
                    <Typography variant="caption" sx={{ color: MUTED }}>
                        Copyright © Corbis Soft — All Rights Reserved
                    </Typography>
                    <Link
                        component="button"
                        type="button"
                        variant="caption"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        sx={{
                            color: LINK_COLOR,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            cursor: 'pointer',
                            border: 'none',
                            background: 'none',
                            font: 'inherit',
                            textDecoration: 'none',
                            '&:hover': { textDecoration: 'underline' },
                        }}
                    >
                        Go to Top <KeyboardArrowUpIcon sx={{ fontSize: 16 }} />
                    </Link>
                </Box>
            </Container>
        </Box>

        {/* WhatsApp FAB */}
        <Fab
            size="small"
            component="a"
            href="https://wa.me/923008676368"
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp"
            sx={{
                position: 'fixed',
                right: 16,
                bottom: 16,
                zIndex: 10,
                bgcolor: '#25d366',
                color: '#fff',
                '&:hover': { bgcolor: '#1ebe5d' },
            }}
        >
            <WhatsAppIcon />
        </Fab>

    </Box>
);

// ── Office / links column ────────────────────────────────────────────────────
function OfficeColumn(props: {
    title: string;
    links?: string[];
    body?: string;
    address?: string;
    phone?: string;
    email?: string;
    showDivider: boolean;
}) {
    const { title, links, body, address, phone, email, showDivider } = props;
    return (
        <Box
            sx={{
                pr: { md: 3 },
                borderRight: showDivider
                    ? { md: '1px solid rgba(255,255,255,0.12)' }
                    : 'none',
            }}
        >
            <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, mb: 1.25, fontSize: 14, letterSpacing: '0.02em' }}
            >
                {title}
            </Typography>

            {links && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {links.map(l => (
                        <Link
                            key={l}
                            href="#"
                            underline="none"
                            sx={{ color: LINK_COLOR, fontSize: 13, '&:hover': { color: '#fff' } }}
                        >
                            {l}
                        </Link>
                    ))}
                </Box>
            )}

            {body && (
                <Typography variant="caption" sx={{ color: MUTED, lineHeight: 1.6, display: 'block' }}>
                    {body}
                </Typography>
            )}

            {(address || phone || email) && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {address && <FooterLine icon={<PlaceIcon sx={{ fontSize: 15 }} />} text={address} />}
                    {phone   && <FooterLine icon={<PhoneIphoneIcon sx={{ fontSize: 15 }} />} text={phone} href={`tel:${phone.replace(/\s/g, '')}`} />}
                    {email   && <FooterLine icon={<EmailIcon sx={{ fontSize: 15 }} />} text={email} href={`mailto:${email}`} />}
                </Box>
            )}
        </Box>
    );
}

function FooterLine({ icon, text, href }: { icon: React.ReactNode; text: string; href?: string }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
            <Box sx={{ color: MUTED, flexShrink: 0, mt: '1px' }}>{icon}</Box>
            {href ? (
                <Link href={href} underline="none" sx={{ color: LINK_COLOR, fontSize: 13, '&:hover': { color: '#fff' } }}>
                    {text}
                </Link>
            ) : (
                <Typography variant="caption" sx={{ color: MUTED, lineHeight: 1.4, fontSize: 13 }}>
                    {text}
                </Typography>
            )}
        </Box>
    );
}

export default Login;