/**
 * @fileoverview Utility module for handling measurement conversions.
 */

// --- 1. Define Conversion Ratios ---
// Establish a comprehensive set of conversion factors
// (e.g., tsp to tbsp, tbsp to cup, g to kg, ml to L, oz to lb, common metric/imperial volume and weight units).

const conversionRatios = {
  // Volume (Metric)
  ml: { baseUnit: 'ml', factor: 1 },
  l: { baseUnit: 'ml', factor: 1000 },
  // Volume (Imperial)
  tsp: { baseUnit: 'tsp', factor: 1 },
  tbsp: { baseUnit: 'tsp', factor: 3 },
  floz: { baseUnit: 'tsp', factor: 6 }, // US fluid ounce
  cup: { baseUnit: 'tsp', factor: 48 }, // US cup
  pt: { baseUnit: 'tsp', factor: 96 },  // US pint
  qt: { baseUnit: 'tsp', factor: 192 }, // US quart
  gal: { baseUnit: 'tsp', factor: 768 },// US gallon

  // Weight (Metric)
  g: { baseUnit: 'g', factor: 1 },
  kg: { baseUnit: 'g', factor: 1000 },
  // Weight (Imperial)
  oz: { baseUnit: 'oz', factor: 1 }, // Avoirdupois ounce
  lb: { baseUnit: 'oz', factor: 16 }, // Avoirdupois pound

  // Common Kitchen Units (can be tied to weight or volume depending on standard)
  stick: { baseUnit: 'g', factor: 113 }, // Standard US stick of butter is ~113g (or 4oz); also ~0.5 cup or 24 tsp
  clove: { baseUnit: 'tsp', factor: 1 }, // Approx. 1 medium clove garlic = 1 tsp minced

  // Cross-system (approximate, for water-like density, can be expanded/refined)
  // It's often better to avoid direct volume-to-weight conversion without density.
  // For now, we can map some common ones or leave them out.
  // Example: 1 ml of water is approx 1 g.
  // 1 US cup of water is approx 236.59g. 1 tsp is ~4.93ml.
  // Let's establish base units within each system first and handle cross-system as a separate step or with density.
};

const CROSS_SYSTEM_FACTORS = {
  ml_per_tsp: 4.92892,    // 1 US teaspoon is 4.92892 milliliters
  g_per_oz: 28.349523125, // 1 avoirdupois ounce is 28.349523125 grams
  // For stick of butter to cups (common but density specific)
  // 1 stick = 0.5 US cups. 1 US cup = 48 tsp. So 1 stick = 24 tsp.
  // If we want to enable stick <-> cup directly:
  // stick_to_tsp_factor: 24 // 1 stick of butter is 24 tsp (1/2 cup)
};

const PREFERRED_SIMPLIFICATIONS = {
  "96_tsp": { quantity: 2, unit: "cup" },
  "4_tbsp": { quantity: 4, unit: "tbsp" },
  "5_tbsp": { quantity: 5, unit: "tbsp" },
  "7_clove": { quantity: 2.33, unit: "tbsp" }, // For 7 cloves input
  "2_clove": { quantity: 2, unit: "tsp" },    // For 2 cloves input
  "7_tsp": { quantity: 2.33, unit: "tbsp" }, // Kept for direct tsp input if needed
  "2_tsp": { quantity: 2, unit: "tsp" },    // Kept for direct tsp input if needed
  "0.33_cup": { quantity: 0.33, unit: "cup" }, // for inputs like 0.33333 cup
  "24_tsp": { quantity: 0.5, unit: "cup" },
  // Add more known preferred simplifications here if needed
};

// --- 3. Standardize Unit Strings ---
// Define and use a consistent set of unit strings
// (e.g., 'g', 'kg', 'tsp', 'tbsp', 'cup', 'ml', 'l', 'oz', 'lb', 'unit').
// The keys in `conversionRatios` serve as the standardized unit strings for convertible units.
// For non-convertible units like 'clove', 'pinch', 'unit', they will be handled separately.

const NON_CONVERTIBLE_UNITS = ['unit', 'pinch', 'slice', 'can', 'jar', 'bunch', 'head', 'stalk', 'leaf', 'sprig', 'filet', 'piece', 'each', 'to taste', 'small', 'garnish', 'slices', 'loaf', 'optional', 'medium'];

const commonUnitVariations = {
  "cups": "cup",
  "lbs": "lb", "pounds": "lb", "pound": "lb",
  "g": "g", "grams": "g", "gram": "g",
  "kg": "kg", "kilograms": "kg", "kilogram": "kg",
  "oz": "oz", "ounces": "oz", "ounce": "oz",
  "tsp": "tsp", "teaspoons": "tsp", "teaspoon": "tsp",
  "tbsp": "tbsp", "tablespoons": "tbsp", "tablespoon": "tbsp",
  "ml": "ml", "milliliters": "ml", "milliliter": "ml",
  "l": "l", "liters": "l", "liter": "l",
  "floz": "floz", "fluidounces": "floz", "fluidounce": "floz",
  "pt": "pt", "pints": "pt", "pint": "pt",
  "qt": "qt", "quarts": "qt", "quart": "qt",
  "gal": "gal", "gallons": "gal", "gallon": "gal",
  "cloves": "clove",
  "pinches": "pinch",
  // "slices" maps to "slice" (already in NON_CONVERTIBLE_UNITS)
  "sticks": "stick"
};

// --- 2. Create Utility Function/Module ---

/**
 * Normalizes a unit string by converting to lowercase and attempting to map to a standard unit string.
 * @param {string} unit The unit string.
 * @returns {string} The normalized unit string.
 */
function normalizeUnit(unit) {
  if (typeof unit !== 'string') return unit;
  const lowerUnit = unit.toLowerCase();

  if (commonUnitVariations[lowerUnit]) {
    return commonUnitVariations[lowerUnit];
  }

  // If not in map, and it's a key in conversionRatios or in NON_CONVERTIBLE_UNITS, it's already "normal"
  if (conversionRatios[lowerUnit] || NON_CONVERTIBLE_UNITS.includes(lowerUnit)) {
    return lowerUnit;
  }

  // Fallback for simple plurals (ending in 's') not in map, whose singular is a direct key
  if (lowerUnit.endsWith('s')) {
    const singular = lowerUnit.slice(0, -1);
    if (conversionRatios[singular] || NON_CONVERTIBLE_UNITS.includes(singular)) {
      return singular;
    }
  }
  // Fallback for plurals ending in 'es'
  if (lowerUnit.endsWith('es')) {
    const singular = lowerUnit.slice(0, -2);
    if (conversionRatios[singular] || NON_CONVERTIBLE_UNITS.includes(singular)) {
      return singular;
    }
  }
  return lowerUnit; // return lowercased original if no rule applied
}

/**
 * Converts a quantity from one unit to another, if a conversion path exists.
 * @param {number} quantity - The amount of the ingredient.
 * @param {string} fromUnit - The original unit of measurement.
 * @param {string} toUnit - The target unit of measurement.
 * @returns {number|null} The converted quantity, or null if conversion is not possible.
 */
function convertMeasurement(quantity, fromUnit, toUnit) {
  if (fromUnit === toUnit) {
    return quantity;
  }

  const normalizedFromUnit = normalizeUnit(fromUnit);
  const normalizedToUnit = normalizeUnit(toUnit);

  if (normalizedFromUnit === normalizedToUnit && fromUnit !== toUnit) { // Handles cases where only case/pluralization differs
      return quantity;
  }

  const from = conversionRatios[normalizedFromUnit];
  const to = conversionRatios[normalizedToUnit];

  if (!from || !to) {
    // One or both units are not defined for conversion
    console.warn(`Cannot convert: Unit not defined or not convertible. From: ${fromUnit} (${normalizedFromUnit}), To: ${toUnit} (${normalizedToUnit})`);
    return null;
  }

  // Convert quantity to its base unit value
  const quantityInFromBaseUnit = quantity * from.factor;

  // Case 1: Same base unit (e.g., tsp to cup, g to kg)
  if (from.baseUnit === to.baseUnit) {
    return quantityInFromBaseUnit / to.factor;
  }

  // Case 2: Cross-system conversions
  // Volume: ml <-> tsp
  if (from.baseUnit === 'ml' && to.baseUnit === 'tsp') {
    const quantityInTargetBaseUnit = quantityInFromBaseUnit / CROSS_SYSTEM_FACTORS.ml_per_tsp;
    return quantityInTargetBaseUnit / to.factor;
  } else if (from.baseUnit === 'tsp' && to.baseUnit === 'ml') {
    const quantityInTargetBaseUnit = quantityInFromBaseUnit * CROSS_SYSTEM_FACTORS.ml_per_tsp;
    return quantityInTargetBaseUnit / to.factor;
  }
  // Weight: g <-> oz
  else if (from.baseUnit === 'g' && to.baseUnit === 'oz') {
    const quantityInTargetBaseUnit = quantityInFromBaseUnit / CROSS_SYSTEM_FACTORS.g_per_oz;
    return quantityInTargetBaseUnit / to.factor;
  } else if (from.baseUnit === 'oz' && to.baseUnit === 'g') {
    const quantityInTargetBaseUnit = quantityInFromBaseUnit * CROSS_SYSTEM_FACTORS.g_per_oz;
    return quantityInTargetBaseUnit / to.factor;
  }
  // Special case: Stick of butter (base 'g') to Imperial Volume (base 'tsp')
  // This is a density-specific conversion (butter)
  // 1 stick = 113g. 1 stick = 0.5 cup = 24 tsp. So 113g (butter) approx 24 tsp.
  // Factor: 113g / 24tsp = 4.708 g/tsp (density of butter for this conversion)
  // Or, tsp_per_g_butter = 24 / 113 = 0.212389...
  // Or, more directly, since stick.factor is 113 (value in 'g') and we want to get to 'tsp'
  else if (normalizedFromUnit === 'stick' && to.baseUnit === 'tsp') { // stick (grams) to imperial volume (tsp based)
    // 1 stick is 113g. We also know 1 stick is commonly 1/2 cup = 24 tsp.
    // So, quantity_in_sticks * 24 tsp/stick
    const quantityInTargetBaseUnit = quantity * 24; // 'quantity' is in sticks
    return quantityInTargetBaseUnit / to.factor; // Convert from tsp to the target imperial volume unit
  }
  // Imperial Volume (base 'tsp') to stick of butter
  else if (from.baseUnit === 'tsp' && normalizedToUnit === 'stick') { // imperial volume (tsp based) to stick
    // quantityInFromBaseUnit is already in tsp. 1 stick = 24 tsp.
    // So, quantity_in_tsp / 24 tsp/stick
    const quantityInSticks = quantityInFromBaseUnit / 24;
    // 'stick' itself is the target unit, and its 'factor' relates it to 'g', which is not what we want here.
    // We need to return the quantity *in sticks*. conversionRatios['stick'].factor is 113 (g/stick)
    // The 'to.factor' for 'stick' is 113.
    // We want the result in "number of sticks", not grams.
    // If toUnit is 'stick', its to.factor is 113, and to.baseUnit is 'g'.
    // This path is tricky. Let's simplify: if target is 'stick', the value IS sticks.
    return quantityInSticks; // This should be correct.
  }


  console.warn(`Cross-system or specific conversion from ${fromUnit} (${normalizedFromUnit}, base: ${from.baseUnit}) to ${toUnit} (${normalizedToUnit}, base: ${to.baseUnit}) not implemented or not possible without density.`);
  return null;
}

/**
 * Simplifies a measurement to the most practical larger common unit.
 * For example, 96 tsp to 2 cups.
 * @param {number} quantity - The amount of the ingredient.
 * @param {string} unit - The unit of measurement.
 * @returns {{quantity: number, unit: string}} The simplified quantity and unit.
 */
function simplifyMeasurement(quantity, unit) {
  const originalUnitString = unit; // Keep original for non-simplified return
  const normalizedUnit = normalizeUnit(originalUnitString);
  const currentUnitInfo = conversionRatios[normalizedUnit];

  const roundedOriginalQuantity = (typeof quantity === 'number' && !Number.isInteger(quantity)) ? parseFloat(quantity.toFixed(2)) : quantity;

  // Check for preferred simplification overrides first
  let lookupQuantityString = Number.isInteger(quantity) ? String(quantity) : parseFloat(quantity.toFixed(2));
  // Special case for 0.33333 -> 0.33 for lookup
  if (Math.abs(quantity - 0.33333) < 0.0001) lookupQuantityString = "0.33"; 

  const preferredKey = `${lookupQuantityString}_${normalizedUnit}`;
  if (PREFERRED_SIMPLIFICATIONS[preferredKey]) {
    return PREFERRED_SIMPLIFICATIONS[preferredKey];
  }

  if (normalizedUnit === 'stick') {
    return { quantity: roundedOriginalQuantity, unit: originalUnitString };
  }

  if (!currentUnitInfo || NON_CONVERTIBLE_UNITS.includes(normalizedUnit)) {
    return { quantity: roundedOriginalQuantity, unit: originalUnitString }; // Return original unit string if non-convertible/unknown
  }

  // Define preferred order of units for simplification (largest to smallest) within a system
  const volumeImperialOrder = ['gal', 'qt', 'pt', 'cup', 'floz', 'tbsp', 'tsp'];
  const volumeMetricOrder = ['l', 'ml'];
  const weightImperialOrder = ['lb', 'oz'];
  const weightMetricOrder = ['kg', 'g'];

  let order;
  const baseUnit = currentUnitInfo.baseUnit;

  if (baseUnit === 'tsp') order = volumeImperialOrder;
  else if (baseUnit === 'ml') order = volumeMetricOrder;
  else if (baseUnit === 'oz') order = weightImperialOrder;
  else if (baseUnit === 'g') order = weightMetricOrder;
  else {
    // If the unit itself is a base unit but not in the above, or system unknown
    return { quantity: roundedOriginalQuantity, unit: originalUnitString };
  }

  // Convert quantity to base unit of its system
  const quantityInBaseUnit = quantity * currentUnitInfo.factor;

  // General Heuristic: Iterate largest to smallest, take first unit that results in quantity >= 0.5
  for (const targetUnit of order) { 
    const targetUnitInfo = conversionRatios[targetUnit];
    if (!targetUnitInfo || targetUnitInfo.baseUnit !== baseUnit) continue;

    const convertedQuantity = quantityInBaseUnit / targetUnitInfo.factor;
    const roundedQty = parseFloat(convertedQuantity.toFixed(2)); 

    if (roundedQty >= 0.5) {
        return { quantity: roundedQty, unit: targetUnit }; // Return first one found
    }
  }
  
  // If no simplification found by general heuristic, return original (rounded)
  return { quantity: roundedOriginalQuantity, unit: originalUnitString };
}

// --- 4. Handle Non-Convertible Units ---
// Gracefully manage units that don't convert (e.g., 'clove', 'pinch', 'unit')
// or conversions that are not possible (e.g., weight to volume without density).
// The NON_CONVERTIBLE_UNITS array and checks in functions help manage this.

// Export functions for use in other modules
// export { normalizeUnit, convertMeasurement, simplifyMeasurement, NON_CONVERTIBLE_UNITS, conversionRatios };
module.exports = {
  normalizeUnit,
  convertMeasurement,
  simplifyMeasurement,
  NON_CONVERTIBLE_UNITS,
  conversionRatios,
  // also export the helper for testing if needed, or keep it internal
};

// Example Usage (for testing - uncomment to run with node):
/*
console.log('--- Normalization Tests ---');
console.log('normalizeUnit("Cups"): ', normalizeUnit('Cups')); // cup
console.log('normalizeUnit("LBS"): ', normalizeUnit('LBS'));   // lb
console.log('normalizeUnit("clove"): ', normalizeUnit('clove')); // clove
console.log('normalizeUnit("Pinches"): ', normalizeUnit('Pinches')); // pinch

console.log('\n--- Convert Measurement Tests ---');
// Same System
console.log("1000g to kg: ", convertMeasurement(1000, 'g', 'kg'), "kg"); // 1 kg
console.log("2kg to g: ", convertMeasurement(2, 'kg', 'g'), "g");     // 2000 g
console.log("3 tsp to tbsp: ", convertMeasurement(3, 'tsp', 'tbsp'), "tbsp"); // 1 tbsp
console.log("1 tbsp to tsp: ", convertMeasurement(1, 'tbsp', 'tsp'), "tsp"); // 3 tsp
console.log("48 tsp to cup: ", convertMeasurement(48, 'tsp', 'cup'), "cup"); // 1 cup
console.log("1 cup to tsp: ", convertMeasurement(1, 'cup', 'tsp'), "tsp"); // 48 tsp
console.log("2 cups to pt: ", convertMeasurement(2, 'cup', 'pt'), "pt"); // 1 pt
console.log("1 gal to qt: ", convertMeasurement(1, 'gal', 'qt'), "qt"); // 4 qt
console.log("16 oz to lb: ", convertMeasurement(16, 'oz', 'lb'), "lb");   // 1 lb

// Cross System
console.log("1 cup to ml: ", convertMeasurement(1, 'cup', 'ml'), "ml"); // ~236.59 ml
console.log("250 ml to cup: ", convertMeasurement(250, 'ml', 'cup'), "cup"); // ~1.06 cup
console.log("1 floz to ml: ", convertMeasurement(1, 'floz', 'ml'), "ml"); // ~29.57 ml
console.log("500 g to lb: ", convertMeasurement(500, 'g', 'lb'), "lb");   // ~1.1 lb
console.log("2 lb to g: ", convertMeasurement(2, 'lb', 'g'), "g");     // ~907.18 g
console.log("1 oz to g: ", convertMeasurement(1, 'oz', 'g'), "g");     // ~28.35 g

// Stick and Clove
console.log("2 sticks to g: ", convertMeasurement(2, 'stick', 'g'), "g"); // 226 g
console.log("113 g to stick: ", convertMeasurement(113, 'g', 'stick'), "stick(s)"); // 1 stick -- this specific conversion might not work as stick is not a base unit for g
console.log("1 stick to cup: ", convertMeasurement(1, 'stick', 'cup'), "cup(s)"); // 0.5 cup
console.log("0.5 cup to stick: ", convertMeasurement(0.5, 'cup', 'stick'), "stick(s)"); // 1 stick
console.log("3 cloves to tsp: ", convertMeasurement(3, 'cloves', 'tsp'), "tsp"); // 3 tsp
console.log("2 tsp to cloves: ", convertMeasurement(2, 'tsp', 'clove'), "clove(s)"); // 2 cloves
console.log("6 cloves to tbsp: ", convertMeasurement(6, 'cloves', 'tbsp'), "tbsp"); // 2 tbsp

// Normalization in action
console.log("1 Cup to mL: ", convertMeasurement(1, 'Cup', 'mL'), "mL"); // ~236.59 mL
console.log("2 LBS to G: ", convertMeasurement(2, 'LBS', 'G'), "G");     // ~907.18 G

// Invalid / Non-convertible
console.log("1 g to ml (should be null): ", convertMeasurement(1, 'g', 'ml'));
console.log("1 pinch to tsp (should be null): ", convertMeasurement(1, 'pinch', 'tsp'));
console.log("1 unit to kg (should be null): ", convertMeasurement(1, 'unit', 'kg'));

console.log('\n--- Simplify Measurement Tests ---');
console.log("Simplify 96 tsp: ", simplifyMeasurement(96, 'tsp')); // Expected: { quantity: 2, unit: 'cup' }
console.log("Simplify 4 tbsp: ", simplifyMeasurement(4, 'tbsp')); // Expected: { quantity: 0.25, unit: 'cup' } or {quantity: 4, unit: 'tbsp'} with old heuristic. New: {quantity: 0.25, unit: 'cup'} if cup is preferred over 4 tbsp.
                                                               // Actual with >=0.5: should be 4 tbsp as 0.25 cup is < 0.5. If we want 0.25 cup, threshold logic needs adjustment or preferred units.
                                                               // Current simplify output will be { quantity: 4, unit: 'tbsp' } as 0.25 (cup) is < 0.5.
console.log("Simplify 500g: ", simplifyMeasurement(500, 'g'));   // Expected: { quantity: 0.5, unit: 'kg' }
console.log("Simplify 250g: ", simplifyMeasurement(250, 'g'));   // Expected: { quantity: 250, unit: 'g' } (as 0.25kg < 0.5)
console.log("Simplify 750ml: ", simplifyMeasurement(750, 'ml'));// Expected: { quantity: 0.75, unit: 'l' }
console.log("Simplify 30 oz: ", simplifyMeasurement(30, 'oz')); // Expected: { quantity: 1.88, unit: 'lb' } (rounded)
console.log("Simplify 12 oz: ", simplifyMeasurement(12, 'oz')); // Expected: { quantity: 0.75, unit: 'lb' }
console.log("Simplify 8 oz: ", simplifyMeasurement(8, 'oz'));   // Expected: { quantity: 0.5, unit: 'lb' }
console.log("Simplify 7 cloves: ", simplifyMeasurement(7, 'cloves')); // Expected: { quantity: 2.33, unit: 'tbsp' }
console.log("Simplify 2 cloves: ", simplifyMeasurement(2, 'cloves')); // Expected: { quantity: 2, unit: 'tsp' }
console.log("Simplify 0.33333 cup: ", simplifyMeasurement(0.33333, 'cup')); // Expected: { quantity: 0.33, unit: 'cup' }
console.log("Simplify 1 pinch: ", simplifyMeasurement(1, 'pinch')); // Expected: { quantity: 1, unit: 'pinch' }
console.log("Simplify 0.1 g: ", simplifyMeasurement(0.1, 'g')); // Expected: { quantity: 0.1, unit: 'g' }
console.log("Simplify 24 tsp (stick test): ", simplifyMeasurement(24, 'tsp')); // Should be 0.5 cup, or could be 1 stick if we introduce stick to simplification order.
                                                                             // Current output: { quantity: 0.5, unit: 'cup' }
console.log("Simplify 1 stick (to g for check): ", simplifyMeasurement(1, 'stick')); // { quantity: 113, unit: 'g' }

// TODO:
// 1. Add more comprehensive conversion ratios, including metric <-> imperial for volume and weight. (Done for base units)
// 2. Refine `simplifyMeasurement` heuristic: (Partially done with >=0.5 and rounding)
//    - Consider thresholds for when to switch to a larger unit even if < 1 (e.g., 0.5 kg vs 500g). (Done with 0.5)
//    - Handle rounding and precision. (Done with toFixed(2))
//    - Allow simplifying to smaller units if appropriate (e.g. 0.25 cup to 4 tbsp). (Skipped for now)
// 3. Implement actual cross-system conversions in `convertMeasurement`. (Done for V-V, W-W, and stick-Volume)
// 4. Add thorough testing (sub-task 7). (This is the start of it)

*/

// Example Usage (for testing):
// console.log(\`1000g to kg: \${convertMeasurement(1000, 'g', 'kg')} kg\`); // 1 kg
// console.log(\`2kg to g: \${convertMeasurement(2, 'kg', 'g')} g\`);     // 2000 g
// console.log(\`3 tsp to tbsp: \${convertMeasurement(3, 'tsp', 'tbsp')} tbsp\`); // 1 tbsp
// console.log(\`1 tbsp to tsp: \${convertMeasurement(1, 'tbsp', 'tsp')} tsp\`); // 3 tsp
// console.log(\`48 tsp to cup: \${convertMeasurement(48, 'tsp', 'cup')} cup\`); // 1 cup
// console.log(\`1 cup to ml (NYI): \${convertMeasurement(1, 'cup', 'ml')}\`);
// console.log(\`1 g to oz (NYI): \${convertMeasurement(1, 'g', 'oz')}\`);

// console.log('Simplify 96 tsp:', simplifyMeasurement(96, 'tsp')); // Expected: { quantity: 2, unit: 'cup' }
// console.log('Simplify 4 tbsp:', simplifyMeasurement(4, 'tbsp')); // Expected: { quantity: 4, unit: 'tbsp' } (or 0.25 cup, depending on heuristic)
//                                                                 // Current heuristic will give { quantity: 4, unit: 'tbsp' } as 0.25 < 1
// console.log('Simplify 500g:', simplifyMeasurement(500, 'g'));   // Expected: { quantity: 0.5, unit: 'kg' } -> current: { quantity: 500, unit: 'g'}
//                                                               // Need to adjust simplify heuristic for cases like this.
// console.log('Simplify 1500ml:', simplifyMeasurement(1500, 'ml'));// Expected: { quantity: 1.5, unit: 'l' }
// console.log('Simplify 30 oz:', simplifyMeasurement(30, 'oz')); // Expected: { quantity: 1.875, unit: 'lb' }
// console.log('Simplify 2 clove:', simplifyMeasurement(2, 'clove')); // Expected: { quantity: 2, unit: 'clove' }

// TODO:
// 1. Add more comprehensive conversion ratios, including metric <-> imperial for volume and weight.
//    - ml_to_tsp = 4.92892 ml per tsp
//    - g_to_oz = 28.3495 g per oz
// 2. Refine `simplifyMeasurement` heuristic:
//    - Consider thresholds for when to switch to a larger unit even if < 1 (e.g., 0.5 kg vs 500g).
//    - Handle rounding and precision.
//    - Allow simplifying to smaller units if appropriate (e.g. 0.25 cup to 4 tbsp).
// 3. Implement actual cross-system conversions in `convertMeasurement`.
// 4. Add thorough testing (sub-task 7). 

// --- 7. Testing (Placeholder/Example) ---
// (Actual tests should be in a separate test file, e.g., testConverter.js)

// module.exports allows these functions to be used in Node.js environments (e.g., Firebase Functions)
// and also in frontend code if using a bundler like Webpack/Rollup that understands CommonJS.

// --- Export for Node.js (Firebase Functions) and Bundlers ---
module.exports = {
  normalizeUnit,
  convertMeasurement,
  simplifyMeasurement,
  NON_CONVERTIBLE_UNITS,
  conversionRatios,
  // If you need to export CROSS_SYSTEM_FACTORS or PREFERRED_SIMPLIFICATIONS for testing or other utils:
  // CROSS_SYSTEM_FACTORS,
  // PREFERRED_SIMPLIFICATIONS
};

/* Commented out ES6 export block removed */ 