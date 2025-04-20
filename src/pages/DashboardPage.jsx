import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom'; // Keep if needed elsewhere
import { collection, getDocs, query, where, limit, addDoc, serverTimestamp, Timestamp, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import {
    Container,
    Typography,
    Box,
    Paper,
    List,
    ListItem,
    ListItemText,
    Button,
    CircularProgress,
    Alert,
    Radio, // To select one recipe
    RadioGroup,
    FormControlLabel,
    FormControl,
    FormLabel,
    Divider,
    TextField,
    Select,
    MenuItem,
    InputLabel,
    Checkbox,
    FormGroup, // Added form elements
    Grid,
    LinearProgress
} from '@mui/material';

// Assume commonUnits are defined or import them if needed from AddRecipePage
const commonUnits = ['g', 'kg', 'ml', 'l', 'unit', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'pinch', 'slice', 'clove'];

function DashboardPage() {
    const { currentUser } = useAuth();
    const [activeCycle, setActiveCycle] = useState(null); // Can be voting or ordering cycle
    const [chosenRecipeDetails, setChosenRecipeDetails] = useState(null);
    const [userVote, setUserVote] = useState(null);
    const [votedRecipeId, setVotedRecipeId] = useState(null);
    const [votedRecipeName, setVotedRecipeName] = useState('');
    const [voteCounts, setVoteCounts] = useState({});
    const [totalVotes, setTotalVotes] = useState(0);
    const [userOrder, setUserOrder] = useState(null); // Stores user's existing order for the cycle

    // --- State for Ordering Form ---
    const [orderServings, setOrderServings] = useState(1);
    const [orderProteinChoice, setOrderProteinChoice] = useState('');
    const [orderCustomizations, setOrderCustomizations] = useState([]); // e.g., ['no cheese']

    // --- Loading / Error States ---
    const [loadingCycle, setLoadingCycle] = useState(true);
    const [loadingVoteCheck, setLoadingVoteCheck] = useState(true);
    const [loadingVotedRecipe, setLoadingVotedRecipe] = useState(false);
    const [loadingOrderCheck, setLoadingOrderCheck] = useState(true);
    const [loadingRecipeDetails, setLoadingRecipeDetails] = useState(false);
    const [isSubmittingVote, setIsSubmittingVote] = useState(false);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [error, setError] = useState('');
    const [voteSuccess, setVoteSuccess] = useState('');
    const [orderSuccess, setOrderSuccess] = useState('');

    const [selectedVote, setSelectedVote] = useState('');

    // --- Fetch Active Cycle (Voting or Ordering) ---
    useEffect(() => {
        const fetchActiveCycle = async () => {
            setLoadingCycle(true);
            setError('');
            setActiveCycle(null); // Reset on fetch
            setChosenRecipeDetails(null);
            setUserVote(null);
            setVotedRecipeId(null);
            setVotedRecipeName('');
            setVoteCounts({});
            setTotalVotes(0);
            setUserOrder(null);
            setVoteSuccess('');
            setOrderSuccess('');

            try {
                const cyclesRef = collection(db, "mealCycles");
                // Look for voting_open OR ordering_open cycle
                const q = query(cyclesRef, where("status", "in", ["voting_open", "ordering_open"]), limit(1));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const cycleDoc = querySnapshot.docs[0];
                    const cycleData = cycleDoc.data();
                    const cycle = {
                        id: cycleDoc.id,
                        ...cycleData,
                        votingDeadline: cycleData.votingDeadline?.toDate ? cycleData.votingDeadline.toDate() : null,
                        orderDeadline: cycleData.orderDeadline?.toDate ? cycleData.orderDeadline.toDate() : null,
                        targetCookDate: cycleData.targetCookDate?.toDate ? cycleData.targetCookDate.toDate() : null,
                    };
                    setActiveCycle(cycle);

                    // If ordering is open, fetch the chosen recipe details
                    if (cycle.status === 'ordering_open' && cycle.chosenRecipeId) {
                        fetchChosenRecipe(cycle.chosenRecipeId);
                    }
                } else {
                    // No active cycle
                }
            } catch (err) {
                console.error("Error fetching active cycle:", err);
                setError("Could not load meal cycle information.");
            } finally {
                setLoadingCycle(false);
            }
        };
        fetchActiveCycle();
    }, []); // Fetch cycle on initial load

    // --- Fetch Chosen Recipe Details ---
    const fetchChosenRecipe = async (recipeId) => {
        if (!recipeId) return;
        setLoadingRecipeDetails(true);
        try {
            const recipeDocRef = doc(db, 'recipes', recipeId);
            const docSnap = await getDoc(recipeDocRef);
            if (docSnap.exists()) {
                setChosenRecipeDetails({ id: docSnap.id, ...docSnap.data() });
                // Set default protein choice if applicable
                const defaultOption = docSnap.data().proteinOptions?.find(opt => opt.isDefault);
                if (defaultOption) {
                    setOrderProteinChoice(defaultOption.optionName);
                } else if (docSnap.data().proteinOptions?.length > 0) {
                    // Select the first option if no default is set
                     setOrderProteinChoice(docSnap.data().proteinOptions[0].optionName);
                }

            } else {
                setError(`Chosen recipe (ID: ${recipeId}) not found.`);
                setChosenRecipeDetails(null);
            }
        } catch (err) {
            console.error("Error fetching chosen recipe:", err);
            setError("Could not load details for the chosen recipe.");
        } finally {
            setLoadingRecipeDetails(false);
        }
    };

    // --- Check User Vote and Fetch Voted Recipe Name (if applicable) ---
    useEffect(() => {
        if (activeCycle?.status !== 'voting_open' || !currentUser) {
            setLoadingVoteCheck(false);
            setVotedRecipeName('');
            return;
        }

        const checkUserVote = async () => {
            setLoadingVoteCheck(true);
            setVotedRecipeName('');
            try {
                const votesRef = collection(db, "votes");
                const q = query(votesRef, where("cycleId", "==", activeCycle.id), where("userId", "==", currentUser.uid), limit(1));
                const voteSnapshot = await getDocs(q);

                if (!voteSnapshot.empty) {
                    const voteData = voteSnapshot.docs[0].data();
                    setUserVote(voteSnapshot.docs[0].id);
                    setVotedRecipeId(voteData.recipeId);
                    setVoteSuccess("You have already voted for this cycle.");
                    fetchVotedRecipeName(voteData.recipeId);
                } else {
                    setUserVote(null);
                    setVotedRecipeId(null);
                }
            } catch (err) {
                console.error("Error checking user vote:", err);
                setError("Could not verify vote status.");
            } finally {
                setLoadingVoteCheck(false);
            }
        };

        const fetchVotedRecipeName = async (recipeId) => {
            if (!recipeId) return;
            setLoadingVotedRecipe(true);
            try {
                const recipeDocRef = doc(db, 'recipes', recipeId);
                const recipeSnap = await getDoc(recipeDocRef);
                if (recipeSnap.exists()) {
                    setVotedRecipeName(recipeSnap.data().name);
                } else {
                    setVotedRecipeName("an unknown recipe");
                }
            } catch (err) {
                console.error("Error fetching voted recipe name:", err);
                setVotedRecipeName("details unavailable");
            } finally {
                setLoadingVotedRecipe(false);
            }
        };

        checkUserVote();
    }, [activeCycle, currentUser]);

    // --- Listen for Real-time Vote Counts (if cycle is voting_open) ---
    useEffect(() => {
        if (activeCycle?.status !== 'voting_open') {
            setVoteCounts({});
            setTotalVotes(0);
            return;
        }

        const votesRef = collection(db, "votes");
        const q = query(votesRef, where("cycleId", "==", activeCycle.id));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const counts = {};
            let total = 0;
            activeCycle.proposedRecipes?.forEach(recipe => {
                counts[recipe.recipeId] = 0;
            });

            querySnapshot.forEach((doc) => {
                const recipeId = doc.data().recipeId;
                if (counts[recipeId] !== undefined) {
                    counts[recipeId]++;
                }
                total++;
            });
            setVoteCounts(counts);
            setTotalVotes(total);
            console.log("Real-time vote counts:", counts);
        }, (error) => {
            console.error("Error listening to vote counts:", error);
            setError("Could not load real-time vote counts.");
        });

        return () => unsubscribe();
    }, [activeCycle]);

    // --- Check User Order (if cycle is ordering_open) ---
     useEffect(() => {
        if (activeCycle?.status !== 'ordering_open' || !currentUser) {
            setLoadingOrderCheck(false);
            return;
        }

        const checkUserOrder = async () => {
            setLoadingOrderCheck(true);
            try {
                const ordersRef = collection(db, "orders");
                const q = query(
                    ordersRef,
                    where("cycleId", "==", activeCycle.id),
                    where("userId", "==", currentUser.uid),
                    limit(1)
                );
                const orderSnapshot = await getDocs(q);

                if (!orderSnapshot.empty) {
                    const orderData = orderSnapshot.docs[0].data();
                    setUserOrder({ id: orderSnapshot.docs[0].id, ...orderData });
                    // Pre-fill form with existing order details if needed (optional)
                    setOrderServings(orderData.servings || 1);
                    setOrderProteinChoice(orderData.proteinChoice || '');
                    setOrderCustomizations(orderData.customizations || []);
                    setOrderSuccess("You have already placed an order for this cycle.");
                } else {
                    setUserOrder(null);
                }
            } catch (err) {
                console.error("Error checking user order:", err);
                setError("Could not verify previous order status.");
            } finally {
                setLoadingOrderCheck(false);
            }
        };

        checkUserOrder();
    }, [activeCycle, currentUser]);

    // --- Handlers ---
    const handleVoteSubmit = async () => {
        setError('');
        setVoteSuccess('');
        setIsSubmittingVote(true);

        // Log values RIGHT BEFORE check
        console.log("--- Inside handleVoteSubmit ---");
        console.log("activeCycle:", activeCycle);
        console.log("currentUser:", currentUser);
        console.log("selectedVote:", selectedVote);
        console.log("activeCycle?.id:", activeCycle?.id);
        console.log("currentUser?.uid:", currentUser?.uid);
        console.log("activeCycle?.status:", activeCycle?.status);

        // Prepare data for Firestore
        const voteData = {
            cycleId: activeCycle?.id,
            userId: currentUser?.uid,
            recipeId: selectedVote,
            timestamp: serverTimestamp()
        };

        // Check 1
        if (!activeCycle?.id || !currentUser?.uid || !selectedVote) {
            console.error("Vote submission aborted at Check 1: Missing critical data.", {
                cycleId: activeCycle?.id,
                userId: currentUser?.uid,
                recipeId: selectedVote
            });
            setError("Cannot submit vote: Missing information.");
            setIsSubmittingVote(false);
            return;
        }

        // Check 2
        if (activeCycle?.status !== 'voting_open') {
             console.error("Vote submission aborted at Check 2: Cycle status is not 'voting_open'. Current status:", activeCycle?.status);
             setError("Voting is not currently open for this cycle.");
             setIsSubmittingVote(false);
             return;
         }

        // Log if checks passed
        console.log("Client-side pre-checks passed. Preparing to write...");

        try {
            // Correctly target the 'votes' collection for submitting votes
            const votesRef = collection(db, "votes");
            const docRef = await addDoc(votesRef, voteData);

            setUserVote(docRef.id);
            setVotedRecipeId(voteData.recipeId);
            setVoteSuccess("Your vote has been submitted successfully!");

        } catch (err) {
            console.error("Firestore error details:", err, err.code); // Log the error code too
            setError("Failed to submit vote. It's possible voting has closed or you have already voted.");
            if (err.code === 'permission-denied') {
                setError("Voting might be closed, you lack permission, or you have already voted. Please check the cycle status.");
            }
        } finally {
            setIsSubmittingVote(false);
        }
    };

    const handleOrderSubmit = async () => {
        if (!activeCycle || !currentUser || !chosenRecipeDetails || userOrder) {
            setError("Cannot place order at this time.");
            return;
        }
         if (orderServings <= 0) {
            setError("Please enter a valid number of servings (at least 1).");
            return;
         }

        setError('');
        setOrderSuccess('');
        setIsSubmittingOrder(true);

        try {
            // Double-check order existence (Client-side check)
             const ordersRefCheck = collection(db, "orders");
             const qCheck = query(ordersRefCheck, where("cycleId", "==", activeCycle.id), where("userId", "==", currentUser.uid), limit(1));
             const orderSnapshotCheck = await getDocs(qCheck);
             if (!orderSnapshotCheck.empty) {
                 setUserOrder({ id: orderSnapshotCheck.docs[0].id, ...orderSnapshotCheck.docs[0].data() });
                 setOrderSuccess("You have already placed an order for this cycle.");
                 setIsSubmittingOrder(false);
                 return;
             }

            // Prepare order data
            const orderData = {
                cycleId: activeCycle.id,
                userId: currentUser.uid,
                householdId: null, // TODO: Get householdId from user profile later
                recipeId: chosenRecipeDetails.id,
                recipeName: chosenRecipeDetails.name, // Store name for convenience
                servings: Number(orderServings),
                proteinChoice: orderProteinChoice || null, // Ensure null if empty
                customizations: orderCustomizations || [],
                status: 'placed', // Initial status
                orderTimestamp: serverTimestamp()
            };

            const ordersRef = collection(db, "orders");
            const docRef = await addDoc(ordersRef, orderData);

            setUserOrder({ id: docRef.id, ...orderData, orderTimestamp: new Date() }); // Update local state
            setOrderSuccess("Your order has been placed successfully!");

        } catch (err) {
             console.error("Error submitting order: ", err);
             setError("Failed to submit order. Ordering may be closed or an error occurred.");
             if (err.code === 'permission-denied') {
                 setError("Ordering might be closed or you lack permission.");
             }
        } finally {
             setIsSubmittingOrder(false);
        }
    };

     // --- Calculate if deadlines passed ---
    const isVotingExpired = activeCycle?.votingDeadline && new Date() > activeCycle.votingDeadline;
    const isOrderingExpired = activeCycle?.orderDeadline && new Date() > activeCycle.orderDeadline;


    // --- Render Logic ---
    const renderVotingSection = () => {
        console.log('Inside renderVotingSection, selectedVote:', selectedVote);

        return (
            <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
                <Typography variant="h5" gutterBottom>
                    Vote for this Week's Meal!
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Voting closes: {activeCycle.votingDeadline ? activeCycle.votingDeadline.toLocaleString() : 'N/A'}
                    {isVotingExpired && <Typography component="span" color="error" sx={{ ml: 1 }}>(Deadline Passed)</Typography>}
                </Typography>

                {/* Display user's vote if already voted */}
                {userVote && !loadingVoteCheck && (
                    <Alert severity="info" sx={{ my: 2 }}>
                        You voted for: {loadingVotedRecipe ? <CircularProgress size={14} /> : <strong>{votedRecipeName || '...'}</strong>}
                    </Alert>
                )}

                {loadingVoteCheck ? <CircularProgress size={20} sx={{ my: 2 }} /> : (
                    <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }} disabled={isSubmittingVote || !!userVote || isVotingExpired}>
                        <FormLabel component="legend">Proposed Recipes (Total Votes: {totalVotes})</FormLabel>
                        <RadioGroup
                            aria-label="proposed-recipes"
                            name="recipe-vote-group"
                            value={votedRecipeId || selectedVote}
                            onChange={(e) => setSelectedVote(e.target.value)}
                        >
                            {activeCycle.proposedRecipes?.map(recipe => {
                                const currentVotes = voteCounts[recipe.recipeId] || 0;
                                const percentage = totalVotes > 0 ? Math.round((currentVotes / totalVotes) * 100) : 0;
                                return (
                                    <Box key={recipe.recipeId} sx={{ mb: 1.5 }}>
                                        <FormControlLabel
                                            value={recipe.recipeId}
                                            control={<Radio />}
                                            label={`${recipe.recipeName || 'Unnamed Recipe'} (${currentVotes} votes)`}
                                        />
                                        <Box sx={{ display: 'flex', alignItems: 'center', pl: 4 }}>
                                            <Box sx={{ width: '100%', mr: 1 }}>
                                                <LinearProgress variant="determinate" value={percentage} />
                                            </Box>
                                            <Box sx={{ minWidth: 35 }}>
                                                <Typography variant="body2" color="text.secondary">{`${percentage}%`}</Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </RadioGroup>

                        <Button
                            variant="contained"
                            onClick={handleVoteSubmit}
                            disabled={isSubmittingVote || !!userVote || !selectedVote || isVotingExpired}
                            sx={{ mt: 2 }}
                        >
                            {isSubmittingVote ? <CircularProgress size={24} /> : (userVote ? 'Vote Submitted' : 'Submit Vote')}
                        </Button>
                        {voteSuccess && !userVote && <Alert severity="success" sx={{ mt: 2 }}>{voteSuccess}</Alert>}
                        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                    </FormControl>
                )}
            </Paper>
        );
    };

    const renderOrderingSection = () => (
        <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
            <Typography variant="h5" gutterBottom>
                Order This Week's Meal: {chosenRecipeDetails?.name || 'Loading...'}
            </Typography>
             <Typography variant="body2" color="text.secondary" gutterBottom>
                 Order Deadline: {activeCycle.orderDeadline
                    ? activeCycle.orderDeadline.toLocaleString()
                    : 'N/A'}
                 {isOrderingExpired && <Typography component="span" color="error" sx={{ml: 1}}>(Deadline Passed)</Typography>}
            </Typography>

            {loadingRecipeDetails && <CircularProgress size={20} sx={{ my: 2 }} />}

            {!loadingRecipeDetails && chosenRecipeDetails && (
                 <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }} disabled={isSubmittingOrder || !!userOrder || isOrderingExpired}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                             <TextField
                                label="Number of Servings"
                                type="number"
                                value={orderServings}
                                onChange={(e) => setOrderServings(parseInt(e.target.value) || 0)}
                                InputProps={{ inputProps: { min: 1 } }}
                                required
                                fullWidth
                            />
                        </Grid>

                        {/* Protein Options Dropdown (if applicable) */}
                        {chosenRecipeDetails.proteinOptions && chosenRecipeDetails.proteinOptions.length > 0 && (
                             <Grid item xs={12} sm={8}>
                                <FormControl fullWidth required>
                                    <InputLabel id="protein-choice-label">Protein Choice</InputLabel>
                                    <Select
                                        labelId="protein-choice-label"
                                        label="Protein Choice"
                                        value={orderProteinChoice}
                                        onChange={(e) => setOrderProteinChoice(e.target.value)}
                                    >
                                        {chosenRecipeDetails.proteinOptions.map(opt => (
                                            <MenuItem key={opt.optionName} value={opt.optionName}>
                                                {opt.optionName}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}

                        {/* Customizations (Example: Checkboxes) */}
                         {/* TODO: Define possible customizations based on recipe or globally */}
                         {/* Example:
                         <Grid item xs={12}>
                              <FormLabel component="legend">Customizations:</FormLabel>
                              <FormGroup row>
                                  <FormControlLabel control={<Checkbox checked={orderCustomizations.includes('no cheese')} onChange={(e) => handleCheckboxChange('no cheese', e.target.checked)} />} label="No Cheese" />
                                  <FormControlLabel control={<Checkbox checked={orderCustomizations.includes('extra spicy')} onChange={(e) => handleCheckboxChange('extra spicy', e.target.checked)} />} label="Extra Spicy" />
                              </FormGroup>
                         </Grid>
                         */}

                    </Grid>

                    <Button
                        variant="contained"
                        onClick={handleOrderSubmit}
                        disabled={isSubmittingOrder || !!userOrder || orderServings <= 0 || isOrderingExpired}
                        sx={{ mt: 3 }}
                    >
                        {isSubmittingOrder ? <CircularProgress size={24} /> : (userOrder ? 'Order Placed' : 'Place Order')}
                    </Button>
                     {orderSuccess && <Alert severity="success" sx={{ mt: 2 }}>{orderSuccess}</Alert>}
                     {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                 </FormControl>
            )}
             {!loadingRecipeDetails && !chosenRecipeDetails && !error && (
                 <Typography color="text.secondary">Waiting for recipe details...</Typography>
             )}

        </Paper>
    );


    // --- Main Return ---
    return (
        <Container>
            <Typography variant="h4" component="h1" gutterBottom>
                Dashboard
            </Typography>
            {currentUser && (
                <Typography variant="body1" paragraph>
                    Welcome back, {currentUser.email}!
                </Typography>
            )}

            {loadingCycle && <CircularProgress />}

            {!loadingCycle && !activeCycle && !error && (
                 <Typography sx={{ mt: 3 }} color="text.secondary">
                     No active meal cycle found. Check back later!
                 </Typography>
            )}
            {error && !loadingCycle && <Alert severity="warning" sx={{ mt: 3 }}>{error}</Alert>}


            {/* Conditionally render Voting or Ordering section based on status */}
            {!loadingCycle && activeCycle?.status === 'voting_open' && renderVotingSection()}
            {!loadingCycle && activeCycle?.status === 'ordering_open' && renderOrderingSection()}

            {/* Other Dashboard Content */}

        </Container>
    );
}

export default DashboardPage; 