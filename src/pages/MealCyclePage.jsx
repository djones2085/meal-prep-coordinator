import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import Spinner from '../components/ui/Spinner';
import Alert from '../components/ui/Alert';

// Helper function to format protein counts (same as in MealCycleManagementPage)
const formatProteinCounts = (counts) => {
    if (!counts || typeof counts !== 'object' || Object.keys(counts).length === 0) {
        return 'N/A'; // Return N/A if no counts
    }
    return Object.entries(counts)
        .map(([protein, count]) => `${protein}: ${count}`)
        .join(', ');
};

// Helper to round numbers nicely (can copy from RecipeDetailPage if needed, or simple rounding)
function roundNicely(num) {
    if (num === 0 || !num) return 0;
    if (Math.abs(num) < 0.1) return num.toPrecision(1);
    if (Math.abs(num) < 1) return Math.round(num * 100) / 100;
    return Math.round(num * 10) / 10;
}

function MealCyclePage() {
    const [cycle, setCycle] = useState(null);
    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchCurrentCycleAndRecipe = async () => {
            setLoading(true);
            setError('');
            setCycle(null);
            setRecipe(null);

            try {
                // 1. Find the most recent active cycle (not planned, completed, or cancelled)
                const cyclesRef = collection(db, "mealCycles");
                const activeStatuses = ['ordering_open', 'ordering_closed', 'shopping', 'cooking', 'packaging', 'distributing'];
                const q = query(
                    cyclesRef,
                    where("status", "in", activeStatuses),
                    orderBy("creationDate", "desc"), // Get the latest one first
                    limit(1)
                );
                const cycleSnapshot = await getDocs(q);

                if (cycleSnapshot.empty) {
                    setError("No active meal cycle found.");
                    setLoading(false);
                    return;
                }

                const cycleDoc = cycleSnapshot.docs[0];
                const cycleData = {
                    id: cycleDoc.id,
                    ...cycleDoc.data(),
                    // Ensure dates are JS Dates if needed (they are needed for display here)
                     orderDeadline: cycleDoc.data().orderDeadline?.toDate ? cycleDoc.data().orderDeadline.toDate() : null,
                     targetCookDate: cycleDoc.data().targetCookDate?.toDate ? cycleDoc.data().targetCookDate.toDate() : null,
                     creationDate: cycleDoc.data().creationDate?.toDate ? cycleDoc.data().creationDate.toDate() : null,
                      // aggregationTimestamp might also be useful
                     aggregationTimestamp: cycleDoc.data().aggregationTimestamp?.toDate ? cycleDoc.data().aggregationTimestamp.toDate() : null,
                };
                setCycle(cycleData);

                // 2. Fetch the associated recipe
                const recipeId = cycleData.chosenRecipe?.recipeId;
                if (recipeId) {
                    const recipeDocRef = doc(db, 'recipes', recipeId);
                    const recipeSnap = await getDoc(recipeDocRef);
                    if (recipeSnap.exists()) {
                        setRecipe({ id: recipeSnap.id, ...recipeSnap.data() });
                    } else {
                        setError(`Recipe (ID: ${recipeId}) for the current cycle not found.`);
                         // Still show cycle data even if recipe fetch fails
                    }
                } else {
                    setError("Current cycle is missing recipe information.");
                }

            } catch (err) {
                console.error("Error fetching current cycle details:", err);
                setError("Failed to load current meal cycle information.");
            } finally {
                setLoading(false);
            }
        };

        fetchCurrentCycleAndRecipe();
    }, []);

    // Function to determine status chip color
    const getStatusChipClass = (status) => {
        switch (status) {
            case 'ordering_open':
                return 'bg-green-100 text-green-800';
            case 'ordering_closed':
                return 'bg-yellow-100 text-yellow-800';
            case 'shopping':
            case 'cooking':
            case 'packaging':
            case 'distributing':
                return 'bg-blue-100 text-blue-800';
            case 'completed':
                return 'bg-gray-100 text-gray-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mb-4">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-6 md:mb-8">
                Current Meal Cycle Details
            </h1>

            {loading && (
                <div className="flex justify-center items-center py-10">
                    <Spinner size="large" />
                </div>
            )}

            {error && !cycle && !loading && (
                <Alert type="error" message={error} className="mb-4" />
            )}

            {!loading && !cycle && !error && (
                <div className="text-center mt-8 bg-white shadow-md rounded-lg p-6">
                     <p className="text-xl font-medium text-gray-700">No Active Cycle</p>
                    <p className="text-gray-500 mt-2">
                        There isn't an active meal cycle currently available. Check back later!
                    </p>
                </div>
            )}

            {cycle && !loading && (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <div className="p-4 sm:p-6">
                        <div className="mb-4">
                             <h2 className="text-xl font-semibold text-gray-800 mb-2">
                                 Cycle Overview
                             </h2>
                             <p className="text-sm text-gray-500 mb-3">ID: {cycle.id}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusChipClass(cycle.status)}`}>
                                     {cycle.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                 </span>
                                {cycle.orderDeadline && (
                                    <span className="flex items-center text-sm text-gray-600">
                                        Deadline: {cycle.orderDeadline.toLocaleString()}
                                    </span>
                                )}
                                {cycle.targetCookDate && (
                                    <span className="flex items-center text-sm text-gray-600">
                                        Cook Date: {cycle.targetCookDate.toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>

                        <hr className="my-4 border-gray-200" />

                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Recipe</h3>
                            {recipe ? (
                                <div className="mb-4">
                                    <h4 className="text-xl font-semibold text-indigo-700">{recipe.name}</h4>
                                    <p className="mt-1 text-sm text-gray-600">
                                        {recipe.description}
                                    </p>
                                </div>
                            ) : (
                                <Alert type="warning" message={error || `Recipe details could not be loaded.`} />
                            )}
                        </div>

                        <hr className="my-4 border-gray-200" />

                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Order Summary</h3>
                            {cycle.aggregationTimestamp ? (
                                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500">Total Servings</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{cycle.totalMealCounts ?? 'N/A'}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500">Protein Counts</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{formatProteinCounts(cycle.totalCountsByProtein)}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500">Dine-In Containers</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{cycle.dineInContainers ?? 'N/A'}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500">Carry-Out Containers</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{cycle.carryOutContainers ?? 'N/A'}</dd>
                                    </div>
                                    <div className="sm:col-span-2 mt-2">
                                        <p className="text-xs text-gray-400">
                                            Summary generated on: {cycle.aggregationTimestamp.toLocaleString()}
                                        </p>
                                    </div>
                                </dl>
                            ) : (
                                <div className="flex items-center text-sm text-gray-500 italic">
                                     <span>Order aggregation has not run yet for this cycle. Summary will appear once orders are finalized.</span>
                                </div>
                            )}
                        </div>

                        <hr className="my-4 border-gray-200" />

                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Shopping List</h3>
                            {(cycle.aggregationTimestamp && cycle.totalIngredients && cycle.totalIngredients.length > 0) ? (
                                <ul role="list" className="divide-y divide-gray-200">
                                    {cycle.totalIngredients.map((ing, index) => (
                                        <li key={index} className="flex py-3 items-center">
                                             <div className="flex-1 ml-3">
                                                 <p className="text-sm font-medium text-gray-900">{ing.name}</p>
                                                 <p className="text-sm text-gray-500">{`${roundNicely(ing.quantity)} ${ing.unit}`}</p>
                                             </div>
                                        </li>
                                    ))}
                                </ul>
                             ) : (
                                 <div className="flex items-center text-sm text-gray-500 italic">
                                     {cycle.aggregationTimestamp ? (
                                         <>
                                             <span>No ingredients calculated yet. This might mean no orders were placed or there was an issue with the recipe data during aggregation.</span>
                                         </>
                                     ) : (
                                         <>
                                             <span>Shopping list will be generated after order aggregation runs.</span>
                                         </>
                                     )}
                                </div>
                             )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MealCyclePage; 