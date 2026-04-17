/**
 * New product registration. FBR digital-invoice line `saleType` is built on the server from
 * **Sale Type FBR** (`fbrPdiTransTypeId` → synced PDI transaction type description), not from **Product Type** (`fbrProductType`).
 */
import { Create, SimpleForm } from 'react-admin';
import { Box, Divider, Typography } from '@mui/material';
import {
    FormHeaderToolbar,
    FormSaveBridge,
    FORM_SAVE_PRODUCT_PROFILE,
} from '../common/formToolbar';
import { ProductProfileFormFields } from './ProductProfileFormFields';
import { ProductProfileFormLayout } from './ProductProfileFormLayout';

export default function ProductProfileCreate() {
    return (
        <Create
            title="Products"
            actions={false}
            sx={{
                width: '100%',
                maxWidth: '100%',
                '& .RaCreate-main': { maxWidth: '100%', width: '100%' },
                '& .RaCreate-card': {
                    maxWidth: '100% !important',
                    width: '100%',
                    boxShadow: 'none',
                },
            }}
        >
            <SimpleForm sx={{ maxWidth: 'none', width: '100%' }} toolbar={false}>
                <FormSaveBridge eventName={FORM_SAVE_PRODUCT_PROFILE} />

                <Box
                    sx={{
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
                    }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.85rem' }}>
                            Products
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                            All changes are saved on the server.
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                        <FormHeaderToolbar
                            saveEventName={FORM_SAVE_PRODUCT_PROFILE}
                            resource="productProfiles"
                            listPath="/productProfiles"
                        />
                    </Box>
                </Box>

                <ProductProfileFormLayout>
                    <ProductProfileFormFields />
                </ProductProfileFormLayout>
            </SimpleForm>
        </Create>
    );
}
