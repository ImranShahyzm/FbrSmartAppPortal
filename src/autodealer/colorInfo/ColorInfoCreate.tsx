import * as React from 'react';
import { Create, SimpleForm, TextInput, required, TopToolbar, ListButton } from 'react-admin';
import { Card, CardContent, Typography, Box, Paper } from '@mui/material';

const CreateActions = () => (
    <TopToolbar>
        <ListButton label="Back to List" />
    </TopToolbar>
);

export default function ColorInformationCreate() {
    return (
        <Create 
            actions={<CreateActions />} 
            title="Create Color Information"
            redirect="list"
        >
            <SimpleForm>
                <Box sx={{ 
                    width: '100%', 
                    maxWidth: 720, 
                    mx: 'auto', 
                    px: { xs: 2, sm: 3 } 
                }}>
                    <Paper 
                        elevation={0} 
                        variant="outlined"
                        sx={{ 
                            borderRadius: 2,
                            borderColor: 'divider',
                            overflow: 'hidden'
                        }}
                    >
                        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                            {/* Header */}
                            <Typography 
                                variant="h5" 
                                fontWeight={600} 
                                gutterBottom
                                sx={{ mb: 1 }}
                            >
                                Create New Color
                            </Typography>
                            
                            <Typography 
                                variant="body2" 
                                color="text.secondary" 
                                sx={{ mb: 4 }}
                            >
                                Add a new color record for your vehicle inventory.
                            </Typography>

                            {/* Form Fields */}
                            <TextInput
                                source="colorTitle"
                                label="Color Title"
                                validate={required()}
                                fullWidth
                                sx={{
                                    '& .MuiInputBase-root': {
                                        backgroundColor: '#fff',
                                    }
                                }}
                            />
                        </CardContent>
                    </Paper>
                </Box>
            </SimpleForm>
        </Create>
    );
}