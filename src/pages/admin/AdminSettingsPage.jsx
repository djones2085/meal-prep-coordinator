import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Paper,
    TextField,
    Button,
    Box,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress
} from '@mui/material';
import { db } from '../../firebaseConfig.js'; // Corrected path if firebaseConfig is in src/
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useSnackbar } from 'notistack';

const SETTINGS_DOC_PATH = 'app_config/adminDefaults';

function AdminSettingsPage() {
    const [defaultOrderDeadlineDay, setDefaultOrderDeadlineDay] = useState('');
    const [defaultOrderDeadlineTime, setDefaultOrderDeadlineTime] = useState('17:00');
    const [defaultTargetCookDay, setDefaultTargetCookDay] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const settingsDocRef = doc(db, SETTINGS_DOC_PATH);
                const docSnap = await getDoc(settingsDocRef);
                if (docSnap.exists()) {
                    const settings = docSnap.data();
                    setDefaultOrderDeadlineDay(settings.defaultOrderDeadlineDay || '');
                    setDefaultOrderDeadlineTime(settings.defaultOrderDeadlineTime || '17:00');
                    setDefaultTargetCookDay(settings.defaultTargetCookDay || '');
                } else {
                    console.log('No default settings found in Firestore. Using component defaults.');
                    // Optionally, save initial defaults here if desired
                }
            } catch (error) {
                console.error('Error fetching admin settings:', error);
                enqueueSnackbar('Failed to load settings. Please try again.', { variant: 'error' });
            }
            setLoading(false);
        };

        fetchSettings();
    }, [enqueueSnackbar]);

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            const settingsDocRef = doc(db, SETTINGS_DOC_PATH);
            await setDoc(settingsDocRef, {
                defaultOrderDeadlineDay,
                defaultOrderDeadlineTime,
                defaultTargetCookDay,
                updatedAt: serverTimestamp() // Optional: track when settings were last updated
            }, { merge: true }); // Use merge: true to avoid overwriting other fields if any
            enqueueSnackbar('Settings saved successfully!', { variant: 'success' });
        } catch (error) {
            console.error('Error saving admin settings:', error);
            enqueueSnackbar('Failed to save settings. Please check console for details.', { variant: 'error' });
        }
        setIsSaving(false);
    };

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Admin Application Settings
            </Typography>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                    Meal Cycle Defaults
                </Typography>
                <Box component="form" noValidate autoComplete="off">
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="order-deadline-day-label">Default Order Deadline Day</InputLabel>
                                <Select
                                    labelId="order-deadline-day-label"
                                    id="order-deadline-day"
                                    value={defaultOrderDeadlineDay}
                                    label="Default Order Deadline Day"
                                    onChange={(e) => setDefaultOrderDeadlineDay(e.target.value)}
                                    disabled={isSaving}
                                >
                                    {daysOfWeek.map((day) => (
                                        <MenuItem key={day} value={day}>
                                            {day}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                margin="normal"
                                id="order-deadline-time"
                                label="Default Order Deadline Time"
                                type="time"
                                value={defaultOrderDeadlineTime}
                                onChange={(e) => setDefaultOrderDeadlineTime(e.target.value)}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                disabled={isSaving}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="target-cook-day-label">Default Target Cook Day</InputLabel>
                                <Select
                                    labelId="target-cook-day-label"
                                    id="target-cook-day"
                                    value={defaultTargetCookDay}
                                    label="Default Target Cook Day"
                                    onChange={(e) => setDefaultTargetCookDay(e.target.value)}
                                    disabled={isSaving}
                                >
                                    {daysOfWeek.map((day) => (
                                        <MenuItem key={day} value={day}>
                                            {day} (of the week following deadline)
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                             <Typography variant="caption" display="block" gutterBottom>
                                (e.g., If deadline is Friday, and cook day is Sunday, it refers to the Sunday after that Friday.)
                            </Typography>
                        </Grid>
                        {/* Add more settings fields here as needed */}
                    </Grid>
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSaveSettings}
                            disabled={isSaving || loading}
                        >
                            {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Save Settings'}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
}

export default AdminSettingsPage; 