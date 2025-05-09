import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import ShopperShoppingListItemDetails from '../components/shopping/ShopperShoppingListItemDetails';
import {
    Container,
    Typography,
    Box,
    Paper,
    List,
    CircularProgress,
    Alert as MuiAlert,
    Divider
} from '@mui/material';
import { PageContainer, LoadingSpinner } from '../components/mui'; // Assuming common components

function ShopperShoppingListPage() {
    const { currentUser, userProfile } = useAuth();
    const [mealCycle, setMealCycle] = useState(null);
    const [shoppingList, setShoppingList] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updateError, setUpdateError] = useState('');

    const fetchActiveShoppingList = useCallback(async () => {
        if (!currentUser) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const mealCyclesRef = collection(db, 'mealCycles');
            // Query for cycles that are 'approved' or 'shopping_in_progress' for their shopping list
            // This might need adjustment based on exact status flow. Assuming direct status on shoppingList object.
            const q = query(
                mealCyclesRef,
                where('shoppingList.status', 'in', ['approved', 'shopping_in_progress']),
                // TODO: Potentially order by a relevant field if multiple can be active
                // orderBy('cookDate', 'desc') 
            );
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                setError('No active shopping lists found for you to manage.');
                setMealCycle(null);
                setShoppingList(null);
            } else {
                // Assuming for now shopper handles one at a time, or the first one returned
                const cycleDoc = querySnapshot.docs[0];
                const cycleData = cycleDoc.data();
                setMealCycle({ id: cycleDoc.id, ...cycleData });
                setShoppingList(cycleData.shoppingList);
            }
        } catch (err) {
            console.error("Error fetching active shopping list:", err);
            setError('Failed to load shopping list.');
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchActiveShoppingList();
    }, [fetchActiveShoppingList]);

    const handleUpdateItemOnHand = async (cycleId, itemName, itemUnit, newOnHandQuantity) => {
        setUpdateError('');
        if (!cycleId || !itemName || typeof itemUnit === 'undefined') {
            console.error('Missing parameters for update', { cycleId, itemName, itemUnit, newOnHandQuantity });
            setUpdateError('Could not update item: missing critical information.');
            return;
        }

        const cycleRef = doc(db, 'mealCycles', cycleId);
        try {
            const currentShoppingList = shoppingList;
            if (!currentShoppingList || !currentShoppingList.items) {
                setUpdateError('Shopping list data is not available for update.');
                return;
            }

            const updatedItems = currentShoppingList.items.map(item => {
                if (item.name === itemName && item.unit === itemUnit) {
                    return { ...item, onHandQuantity: parseFloat(newOnHandQuantity) || 0 };
                }
                return item;
            });

            // Update the shoppingList.items and shoppingList.lastUpdatedAt in Firestore
            await updateDoc(cycleRef, {
                'shoppingList.items': updatedItems,
                'shoppingList.lastUpdatedAt': serverTimestamp()
            });
            
            // Refresh local state to reflect the change immediately
            setShoppingList(prev => ({
                 ...prev, 
                 items: updatedItems, 
            }));

        } catch (err) {
            console.error("Error updating on-hand quantity:", err);
            setUpdateError(`Failed to update ${itemName}: ${err.message}`);
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <MuiAlert severity="error">{error}</MuiAlert>;
    }

    if (!mealCycle || !shoppingList || !shoppingList.items || shoppingList.items.length === 0) {
        return <Typography sx={{ p: 2, fontStyle: 'italic' }}>Shopping list is empty or not available.</Typography>;
    }

    // Determine if onHand fields should be editable based on shopping list status
    const allowOnHandEditing = shoppingList.status === 'approved' || shoppingList.status === 'shopping_in_progress';

    return (
        <PageContainer title="Shopping List">
            <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Current Shopping List</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{fontWeight: "bold"}}>
                        Cycle: {mealCycle.name || mealCycle.id} | Status: {shoppingList.status.replace('_', ' ').toUpperCase()}
                    </Typography>
                </Box>
                <Divider sx={{mb:2}}/>
                {updateError && <MuiAlert severity="error" sx={{mb:2}}>{updateError}</MuiAlert>}
                <List dense>
                    {shoppingList.items.map((item, index) => (
                        <ShopperShoppingListItemDetails
                            key={`${item.name}-${item.unit}-${index}`}
                            item={item}
                            onHandQuantityChange={handleUpdateItemOnHand}
                            cycleId={mealCycle.id}
                            disabled={!allowOnHandEditing}
                        />
                    ))}
                </List>
            </Paper>
        </PageContainer>
    );
}

export default ShopperShoppingListPage; 