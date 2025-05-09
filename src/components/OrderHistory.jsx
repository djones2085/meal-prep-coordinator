import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { Typography, Box, Paper, List, ListItem, ListItemText, CircularProgress, Alert as MuiAlert } from '@mui/material';
import { PageContainer, LoadingSpinner, StatusChip } from './mui'; // Assuming these are common components

function OrderHistory() {
    const { currentUser } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const fetchOrders = async () => {
            setLoading(true);
            setError('');
            try {
                const ordersRef = collection(db, 'orders');
                const q = query(
                    ordersRef,
                    where('userId', '==', currentUser.uid),
                    orderBy('createdAt', 'desc') // Show most recent orders first
                );
                const querySnapshot = await getDocs(q);
                const fetchedOrders = [];
                querySnapshot.forEach((doc) => {
                    fetchedOrders.push({ id: doc.id, ...doc.data() });
                });
                setOrders(fetchedOrders);
            } catch (err) {
                console.error("Error fetching orders:", err);
                setError('Failed to load order history.');
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [currentUser]);

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <MuiAlert severity="error">{error}</MuiAlert>;
    }

    if (orders.length === 0) {
        return <Typography>You have no past orders.</Typography>;
    }

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h5" gutterBottom component="div">
                Your Order History
            </Typography>
            <Paper elevation={2}>
                <List>
                    {orders.map((order) => (
                        <ListItem key={order.id} divider>
                            <ListItemText
                                primary={order.recipeName || 'N/A'}
                                secondary={
                                    <>
                                        <Typography component="span" variant="body2" color="text.secondary">
                                            Ordered on: {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'Date N/A'}
                                        </Typography>
                                        <br />
                                        <Typography component="span" variant="body2" color="text.secondary">
                                            Total Servings: {order.totalServings || 'N/A'}
                                        </Typography>
                                        {order.selectedCustomizations && order.selectedCustomizations.length > 0 && (
                                            <>
                                                <br />
                                                <Typography component="span" variant="body2" color="text.secondary">
                                                    Options: {order.selectedCustomizations.join(', ')}
                                                </Typography>
                                            </>
                                        )}
                                        {order.freeTextCustomization && (
                                            <>
                                                <br />
                                                <Typography component="span" variant="body2" color="text.secondary">
                                                    Note: {order.freeTextCustomization}
                                                </Typography>
                                            </>
                                        )}
                                        {/* TODO: Display protein/items details more clearly if needed */}
                                        {/* This might involve iterating order.items if they are complex */}
                                    </>
                                }
                            />
                            {/* Optional: Could add a link/button to view order details if we create a separate OrderDetailPage */}
                        </ListItem>
                    ))}
                </List>
            </Paper>
        </Box>
    );
}

export default OrderHistory; 