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
    Divider,
    Button
} from '@mui/material';
import { PageContainer, LoadingSpinner } from '../components/mui'; // Assuming common components

function ShopperShoppingListPage() {
    const { currentUser, userProfile } = useAuth();
    const [mealCycle, setMealCycle] = useState(null);
    const [shoppingList, setShoppingList] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updateError, setUpdateError] = useState('');
    const [isCompleting, setIsCompleting] = useState(false); // For Mark as Completed button state

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

    const handleMarkShoppingListCompleted = async () => {
        if (!mealCycle || !mealCycle.id || !currentUser) {
            setUpdateError("Cannot mark as completed: Critical information is missing.");
            return;
        }

        // Optional: Add a confirmation dialog here if desired
        // if (!window.confirm("Are you sure you want to mark this shopping list as completed?")) {
        //     return;
        // }

        setIsCompleting(true);
        setUpdateError('');

        try {
            const cycleRef = doc(db, 'mealCycles', mealCycle.id);
            await updateDoc(cycleRef, {
                'shoppingList.status': 'shopping_completed',
                'shoppingList.completedAt': serverTimestamp(),
                'shoppingList.completedBy': currentUser.uid
            });

            // Refresh the list. This will either show the next active list
            // or the "no active lists" message if this was the last one.
            await fetchActiveShoppingList();
            // No explicit success message here, as the list disappearing is the primary feedback.
            // fetchActiveShoppingList will set an info message if no lists are left.

        } catch (err) {
            console.error("Error marking shopping list as completed:", err);
            setUpdateError(`Failed to mark shopping list as completed: ${err.message}`);
        } finally {
            setIsCompleting(false);
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
                        {mealCycle && mealCycle.targetCookDate && (
                            `Cook Date: ${mealCycle.targetCookDate.toDate().toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })} | `
                        )}
                        {mealCycle && mealCycle.chosenRecipe && mealCycle.chosenRecipe.recipeName && (
                            `Recipe: ${mealCycle.chosenRecipe.recipeName} | `
                        )}
                        {shoppingList && shoppingList.status && (
                            `Status: ${shoppingList.status.replace('_', ' ').toUpperCase()}`
                        )}
                    </Typography>
                </Box>
                <Divider sx={{mb:2}}/>
                {updateError && <MuiAlert severity="error" sx={{mb:2}}>{updateError}</MuiAlert>}

                {mealCycle && shoppingList && (shoppingList.status === 'approved' || shoppingList.status === 'shopping_in_progress') && (
                    <Box sx={{ mt: 1, mb: 2, display: 'flex', justifyContent: 'center' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleMarkShoppingListCompleted}
                            disabled={loading || isCompleting} // Disable if page is loading or this action is processing
                        >
                            {isCompleting ? <CircularProgress size={24} color="inherit" /> : "Mark Shopping as Completed"}
                        </Button>
                    </Box>
                )}

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