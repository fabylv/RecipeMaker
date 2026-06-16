/* ===========================
   Recipe Generator — script.js
   =========================== */

// ==============================
// NUTRITION ESTIMATOR
// ==============================
const NUTRITION_DB = {
    // [calories, protein(g), carbs(g), fat(g), fiber(g)] per 100g
    // --- Proteins ---
    chicken: [165, 31, 0, 3.6, 0],
    beef: [250, 26, 0, 17, 0],
    pork: [242, 27, 0, 14, 0],
    salmon: [208, 20, 0, 13, 0],
    tuna: [130, 29, 0, 1, 0],
    shrimp: [99, 24, 0.2, 0.3, 0],
    fish: [136, 24, 0, 5, 0],
    egg: [155, 13, 1, 11, 0],
    tofu: [76, 8, 2, 4, 0.3],
    turkey: [189, 29, 0, 7, 0],
    lamb: [294, 25, 0, 21, 0],
    // --- Vegetables ---
    broccoli: [34, 2.8, 7, 0.4, 2.6],
    spinach: [23, 2.9, 3.6, 0.4, 2.2],
    zucchini: [17, 1.2, 3.1, 0.3, 1],
    carrot: [41, 0.9, 10, 0.2, 2.8],
    potato: [77, 2, 17, 0.1, 2.2],
    tomato: [18, 0.9, 3.9, 0.2, 1.2],
    mushroom: [22, 3.1, 3.3, 0.3, 1],
    eggplant: [25, 1, 6, 0.2, 3],
    pepper: [31, 1, 6, 0.3, 2.1],
    asparagus: [20, 2.2, 3.9, 0.1, 2.1],
    garlic: [149, 6.4, 33, 0.5, 2.1],
    onion: [40, 1.1, 9.3, 0.1, 1.7],
    // --- Legumes ---
    lentil: [116, 9, 20, 0.4, 7.9],
    chickpea: [164, 8.9, 27, 2.6, 7.6],
    beans: [127, 8.7, 22, 0.5, 6.4],
    // --- Grains ---
    rice: [130, 2.7, 28, 0.3, 0.4],
    pasta: [158, 5.8, 31, 0.9, 1.8],
    quinoa: [120, 4.4, 21, 1.9, 2.8],
    // --- Dairy & Fats ---
    cheese: [402, 25, 1.3, 33, 0],
    parmesan: [431, 38, 4, 29, 0],
    feta: [264, 14, 4, 21, 0],
    yogurt: [59, 10, 3.6, 0.4, 0],
    butter: [717, 0.9, 0.1, 81, 0],
    'olive oil': [884, 0, 0, 100, 0],
    oil: [884, 0, 0, 100, 0],
    // --- Fruits ---
    avocado: [160, 2, 9, 15, 6.7],
    lemon: [29, 1.1, 9, 0.3, 2.8],
    tomatoes: [18, 0.9, 3.9, 0.2, 1.2],
    // --- Condiments / extras ---
    'soy sauce': [53, 8, 5, 0.1, 0.8],
    'coconut milk': [230, 2.3, 6, 24, 0],
    wine: [85, 0.1, 2.6, 0, 0],
    broth: [7, 1.2, 0.3, 0.2, 0],
    vinegar: [18, 0, 0.9, 0, 0],
    mustard: [66, 4.4, 5.8, 3.3, 3.2],
    'miso paste': [199, 12, 26, 6, 5.4],
    'curry paste': [130, 3, 14, 7, 2],
    'fish sauce': [35, 5, 3.6, 0, 0]
};

// Unit → grams conversion table
const UNIT_TO_GRAMS = {
    // weight
    g: 1,
    gram: 1,
    grams: 1,
    kg: 1000,
    oz: 28.35,
    lb: 453.6,
    lbs: 453.6,
    pound: 453.6,
    pounds: 453.6,
    // volume (approximated as water density for sauces/liquids)
    ml: 1,
    l: 1000,
    tsp: 5,
    teaspoon: 5,
    teaspoons: 5,
    tbsp: 15,
    tablespoon: 15,
    tablespoons: 15,
    cup: 240,
    cups: 240,
    // loose / countable
    clove: 4,     // garlic clove ~4g
    cloves: 4,
    slice: 25,
    slices: 25,
    piece: 80,
    pieces: 80,
    sprig: 2,
    sprigs: 2,
    bunch: 30,
    pinch: 0.5,
    dash: 1
};

// Default weight when we only have a bare count (e.g. "2 eggs") — per food key in grams
const ITEM_WEIGHT = {
    egg: 50,
    lemon: 65,
    tomato: 100,
    onion: 110,
    avocado: 150,
    potato: 150
};

/**
 * Parse a single ingredient line and return estimated weight in grams.
 * Examples handled:
 *   "1–1.5 lbs chicken"  →  ~680g
 *   "2 tbsp olive oil"   →  30g
 *   "2 cloves garlic"    →  8g
 *   "Salt & pepper to taste" → 0g (skipped)
 */
function parseIngredientWeight(line) {
    const clean = line.toLowerCase().replace(/[–—]/g, '-').trim();

    // Ignore seasoning/garnish lines that contribute negligible calories
    if (/to taste|for (lining|grilling|frying|steaming|garnish)|drizzle|spray|cooking spray|fresh herbs|red pepper flake|parchment|foil/i.test(clean)) {
        return 0;
    }

    // Extract leading quantity: supports "1", "1.5", "1-1.5", "½", "¼", "¾"
    const fracMap = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.667 };
    let qty = 0;
    let rest = clean;

    // Unicode fractions
    const fracMatch = rest.match(/^([½¼¾⅓⅔])/);
    if (fracMatch) {
        qty = fracMap[fracMatch[1]] || 0;
        rest = rest.slice(fracMatch[1].length).trim();
    } else {
        // Numeric: "1", "1.5", "1-1.5" (take average of range)
        const numMatch = rest.match(/^(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)/);
        if (numMatch) {
            const parts = numMatch[1].split('-').map(Number);
            qty = parts.length === 2 ? (parts[0] + parts[1]) / 2 : parts[0];
            rest = rest.slice(numMatch[0].length).trim();
        }
    }

    if (qty === 0) return 0;

    // Extract unit
    const unitMatch = rest.match(/^([a-z]+(?:\s+[a-z]+)?)/);
    let grams = 0;
    if (unitMatch) {
        const unitRaw = unitMatch[1].trim();
        const unitG = UNIT_TO_GRAMS[unitRaw] || UNIT_TO_GRAMS[unitRaw.split(' ')[0]];
        if (unitG) {
            grams = qty * unitG;
        }
    }

    // Fallback: treat qty as item count
    if (grams === 0) {
        // Try to identify the food word and use ITEM_WEIGHT
        for (const [food, wt] of Object.entries(ITEM_WEIGHT)) {
            if (rest.includes(food)) {
                grams = qty * wt;
                break;
            }
        }
        // Final fallback: 80g per unit (generic "medium" item)
        if (grams === 0) grams = qty * 80;
    }

    return grams;
}

/**
 * Given an ingredient line, find the best matching key in NUTRITION_DB.
 */
function matchNutritionKey(line) {
    const clean = line.toLowerCase();
    // Try multi-word keys first (longest match wins)
    const keys = Object.keys(NUTRITION_DB).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        if (clean.includes(key)) return key;
    }
    // Try singular form
    for (const key of keys) {
        if (clean.includes(key.replace(/s$/, ''))) return key;
    }
    return null;
}

const METHOD_COOKING_FAT = {
    Fried: { fat: 8, cal: 72 },        // ~8g oil absorbed
    'Air Fried': { fat: 2, cal: 18 },
    Sautéed: { fat: 3, cal: 27 },      // some oil in the pan
    Baked: { fat: 1, cal: 9 },
    Roasted: { fat: 1.5, cal: 14 },
    Grilled: { fat: 0.5, cal: 5 },
    Steamed: { fat: 0, cal: 0 },
    'Raw / No-Cook': { fat: 0, cal: 0 },
    'Slow Cooked': { fat: 0.5, cal: 5 },
    'Instant Pot': { fat: 0.5, cal: 5 }
};

/**
 * Compute nutrition by summing over the full ingredient list.
 * Falls back to a single-ingredient estimate only when no ingredients array is provided.
 */
function estimateNutrition(primaryIngredient, method, dietary, serves, ingredientsList) {
    const servings = parseInt(serves) || 2;

    let totalCal = 0, totalProt = 0, totalCarb = 0, totalFat = 0, totalFib = 0;
    let matched = 0;

    const lines = ingredientsList && ingredientsList.length ? ingredientsList : [`1–1.5 lbs ${primaryIngredient}`];

    for (const line of lines) {
        const grams = parseIngredientWeight(line);
        if (grams === 0) continue;

        const key = matchNutritionKey(line);
        const base = key
            ? NUTRITION_DB[key]
            : NUTRITION_DB[primaryIngredient.toLowerCase()] || [200, 15, 15, 8, 2];

        const f = grams / 100;
        totalCal  += base[0] * f;
        totalProt += base[1] * f;
        totalCarb += base[2] * f;
        totalFat  += base[3] * f;
        totalFib  += base[4] * f;
        if (key) matched++;
    }

    // Add extra calories/fat from cooking method (per whole recipe, not per serving)
    const mExtra = METHOD_COOKING_FAT[method] || { fat: 1, cal: 9 };
    totalCal += mExtra.cal;
    totalFat += mExtra.fat;

    // Divide by servings
    let cal  = Math.round(totalCal  / servings);
    let prot = Math.round(totalProt / servings);
    let carb = Math.round(totalCarb / servings);
    let fat  = Math.round(totalFat  / servings);
    let fib  = Math.round(totalFib  / servings);

    // Dietary adjustments
    if (dietary === 'Keto') {
        carb = Math.max(2, Math.round(carb * 0.3));
        fat  = Math.round(fat * 1.5);
        cal  = Math.round(prot * 4 + carb * 4 + fat * 9 + fib * 2);
    }
    if (dietary === 'Low-Carb') {
        carb = Math.max(4, Math.round(carb * 0.5));
        cal  = Math.round(prot * 4 + carb * 4 + fat * 9 + fib * 2);
    }
    if ((dietary === 'Vegan' || dietary === 'Vegetarian') && prot < 8) {
        prot = 8;
    }

    // Sanity floor
    cal  = Math.max(cal,  50);
    prot = Math.max(prot, 0);
    carb = Math.max(carb, 0);
    fat  = Math.max(fat,  0);
    fib  = Math.max(fib,  0);

    return { cal, prot, carb, fat, fib };
}

// ==============================
// COOKBOOK CONFIG
// ==============================
const COOKBOOK_GOAL = 20;
const SAVED_KEY = 'rm_saved';

// ==============================
// COOKBOOK PROGRESS
// ==============================
function updateCookbookProgress() {
    const count = getSaved().length;
    const pct = Math.min(100, Math.round((count / COOKBOOK_GOAL) * 100));

    // Floating bottom button
    const fill = document.getElementById('cbFill');
    const label = document.getElementById('cbBtnLabel');
    const btn = document.getElementById('cookbookBtn');

    if (fill) fill.style.width = pct + '%';

    if (count >= COOKBOOK_GOAL) {
        if (label) label.textContent = '📖 Create My Cookbook';
        if (btn) {
            btn.disabled = false;
            btn.classList.add('cookbook-btn--ready');
        }
    } else {
        if (label) label.textContent = `📖 Create My Cookbook (${count}/20 recipes)`;
        if (btn) {
            btn.disabled = true;
            btn.classList.remove('cookbook-btn--ready');
        }
    }

    // In-panel progress (if present)
    const panelFill = document.getElementById('cbProgressFill');
    const countEl = document.getElementById('cbProgressCount');
    const hint = document.getElementById('cbProgressHint');
    const panelBtn = document.getElementById('createCookbookBtn');

    if (panelFill) panelFill.style.width = pct + '%';
    if (countEl) countEl.textContent = `${count} / ${COOKBOOK_GOAL} recipes`;
    if (hint) hint.textContent = count >= COOKBOOK_GOAL
        ? '🎉 Your cookbook is ready to create!'
        : `Save ${COOKBOOK_GOAL - count} more recipe${COOKBOOK_GOAL - count === 1 ? '' : 's'} to unlock your cookbook.`;
    if (panelBtn) {
        panelBtn.disabled = count < COOKBOOK_GOAL;
        panelBtn.classList.toggle('btn-create-cookbook--ready', count >= COOKBOOK_GOAL);
    }
}

// ==============================
// CELEBRATION MODAL
// ==============================
function openCelebrationModal() {
    document.getElementById('celebrationModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeCelebrationModal() {
    document.getElementById('celebrationModal').classList.add('hidden');
    document.body.style.overflow = '';
}

document.getElementById('celebrationModal').addEventListener('click', function(e) {
    if (e.target === this) closeCelebrationModal();
});

// ==============================
// COOKBOOK MODAL
// ==============================
let selectedCoverStyle = 'rustic';

function handleCookbookBtn() {
    const count = getSaved().length;
    if (count < COOKBOOK_GOAL) {
        toast(`Save ${COOKBOOK_GOAL - count} more recipe${COOKBOOK_GOAL - count === 1 ? '' : 's'} to unlock your cookbook! 📖`);
        return;
    }
    openCelebrationModal();
}

// Keep legacy alias used by in-panel button
function handleCreateCookbook() { handleCookbookBtn(); }

function openCookbookModal() {
    closeCelebrationModal();
    selectedCoverStyle = 'rustic';
    document.querySelectorAll('.cover-style-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.style === 'rustic');
    });
    document.getElementById('cookbookModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeCookbookModal() {
    document.getElementById('cookbookModal').classList.add('hidden');
    document.body.style.overflow = '';
}

document.getElementById('cookbookModal').addEventListener('click', function(e) {
    if (e.target === this) closeCookbookModal();
});

function selectCoverStyle(style) {
    selectedCoverStyle = style;
    document.querySelectorAll('.cover-style-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.style === style);
    });
}

function createCookbook() {
    const title = (document.getElementById('cbTitle').value.trim()) || 'My Favorite Recipes';
    const author = (document.getElementById('cbAuthor').value.trim()) || '';
    const subtitle = (document.getElementById('cbSubtitle').value.trim()) || '';
    closeCookbookModal();
    exportCookbook({ title, author, subtitle, coverStyle: selectedCoverStyle });
}

// ==============================
// PILL TOGGLES
// ==============================
// Dietary = multi-select; all others = single-select
const MULTI_SELECT_GROUPS = ['dietary'];

document.querySelectorAll('.pill').forEach((pill) => {
    pill.addEventListener('click', () => {
        const group = pill.dataset.group;
        if (MULTI_SELECT_GROUPS.includes(group)) {
            pill.classList.toggle('active');
        } else {
            document.querySelectorAll(`.pill[data-group="${group}"]`)
                    .forEach((p) => p.classList.remove('active'));
            pill.classList.toggle('active');
        }
    });
});

function getActive(group) {
    if (MULTI_SELECT_GROUPS.includes(group)) {
        return [...document.querySelectorAll(`.pill[data-group="${group}"].active`)]
            .map(p => p.dataset.value).join(', ');
    }
    const el = document.querySelector(`.pill[data-group="${group}"].active`);
    return el ? el.dataset.value : '';
}

// ==============================
// SAVED RECIPES
// ==============================
function getSaved() {
    try {
        return JSON.parse(localStorage.getItem(SAVED_KEY)) || [];
    } catch {
        return [];
    }
}

function setSaved(arr) {
    localStorage.setItem(SAVED_KEY, JSON.stringify(arr));
}

function updateSavedCount() {
    document.getElementById('savedCount').textContent = getSaved().length;
}

// ==============================
// TOAST
// ==============================
function toast(msg) {
    const el = document.getElementById('toastEl');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2800);
}

// ==============================
// STATE
// ==============================
let currentRecipe = null;
let lastIngredient = '';

function setIngredient(value) {
    const input = document.getElementById('ingredient');
    input.value = value;
    input.focus();
}

// ==============================
// GENERATE
// ==============================
async function generateRecipe() {
    // Parse natural language — take the first ingredient before 'and', '&', or ','  
    const raw = document.getElementById('ingredient').value.trim();
    const ingredient = raw.split(/\s+and\s+|\s*[,&]\s*/i)[0].trim();
    if (!ingredient) {
        toast('Please enter an ingredient first!');
        document.getElementById('ingredient').focus();
        return;
    }

    const cuisine = getActive('cuisine');
    const dietary = getActive('dietary');
    const meal = getActive('meal');
    const method = getActive('method');

    const btn = document.getElementById('generateBtn');
    const text = document.getElementById('btnText');
    const loader = document.getElementById('btnLoader');
    btn.disabled = true;
    text.classList.add('hidden');
    loader.classList.remove('hidden');

    await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));

    lastIngredient = ingredient;
    document.getElementById('ingredient').value = '';
    updateAnotherBtn();

    currentRecipe = buildRecipe(ingredient, cuisine, dietary, meal, method);
    renderRecipe(currentRecipe);

    btn.disabled = false;
    text.classList.remove('hidden');
    loader.classList.add('hidden');

}

// ==============================
// RENDER RECIPE
// ==============================
function renderRecipe(r) {
    document.getElementById('recipeName').textContent =
        `${recipeEmoji(r.meal, r.rawIngredient)} ${r.name}`;

    const badges = document.getElementById('resultBadges');
    badges.innerHTML = '';
    [r.cuisine, r.dietary, r.meal, r.method].filter(Boolean).forEach((val) => {
        const b = document.createElement('span');
        b.className = 'badge';
        b.textContent = val;
        badges.appendChild(b);
    });

    document.getElementById('ingredientsList').innerHTML = r.ingredients
        .map((i) => `<li>${i}</li>`)
        .join('');
    document.getElementById('instructionsList').innerHTML = r.steps
        .map((s) => `<li>${s}</li>`)
        .join('');
    document.getElementById('resultMeta').innerHTML =
        `<span>⏱ ${r.time}</span><span>🍽 Serves ${r.serves}</span><span>📊 ${r.difficulty}</span>`;

    const n = r.nutrition;
    document.getElementById('nutritionSection').innerHTML = `
    <div class="nutrition-box">
      <p class="nutrition-title">📊 Estimated Nutrition Facts <span class="nutrition-est">per serving</span></p>
      <div class="nutrition-stats">
        <div class="nutr-stat"><span class="nutr-val">${n.cal}</span><span class="nutr-label">kcal</span></div>
        <div class="nutr-stat"><span class="nutr-val">${n.prot}g</span><span class="nutr-label">Protein</span></div>
        <div class="nutr-stat"><span class="nutr-val">${n.carb}g</span><span class="nutr-label">Carbs</span></div>
        <div class="nutr-stat"><span class="nutr-val">${n.fat}g</span><span class="nutr-label">Fat</span></div>
        <div class="nutr-stat"><span class="nutr-val">${n.fib}g</span><span class="nutr-label">Fiber</span></div>
      </div>
    </div>`;

    const el = document.getElementById('result');
    el.classList.remove('hidden');
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

// ==============================
// RECIPE BUILDER
// ==============================
function buildRecipe(ingredient, cuisine, dietary, meal, method) {
    const ing = capitalize(ingredient);
    const cui = cuisine || pick(['Italian', 'Mediterranean', 'Asian', 'American', 'French']);
    const diet = dietary || '';
    const ml = meal || pick(['Lunch', 'Dinner', 'Snack']);
    const meth = method || pick(['Baked', 'Grilled', 'Sautéed', 'Roasted']);
    const t = getTemplate(ing, cui, diet, ml, meth);
    return {
        name: t.name,
        cuisine,
        dietary,
        meal,
        method,
        ingredients: t.ingredients,
        steps: t.steps,
        time: t.time,
        serves: t.serves,
        difficulty: t.difficulty,
        rawIngredient: ingredient,
        nutrition: estimateNutrition(ingredient, meth, diet, t.serves, t.ingredients)
    };
}

function getTemplate(ing, cui, diet, ml, meth) {
    const adj = pick([
        'Rustic',
        'Golden',
        'Fresh',
        'Herb-Roasted',
        'Spiced',
        'Zesty',
        'Smoky',
        'Creamy',
        'Simple',
        'Quick'
    ]);
    const name = `${adj} ${cuisineStyle(cui)}${ing} ${mealSuffix(ml)}`;
    return {
        name,
        ingredients: [...baseIngredients(ing, cui), ...extraIngredients(meth)],
        steps: buildSteps(ing, meth),
        time: cookTime(meth),
        serves: pick(['2', '4', '2–4', '6']),
        difficulty: pick(['Easy', 'Easy', 'Moderate', 'Easy'])
    };
}

function baseIngredients(ing, cui) {
    const base = [
        `1–1.5 lbs ${ing}`,
        `2 cloves garlic, minced`,
        `1 medium onion, diced`,
        `2 tbsp olive oil`,
        `Salt & black pepper to taste`,
        pick([
            'Fresh herbs (parsley, basil, or thyme)',
            '1 lemon, zested and juiced',
            'Red pepper flakes (optional)'
        ])
    ];
    const cuiExtras = {
        Italian: ['½ cup cherry tomatoes', '¼ cup Parmesan, grated'],
        Mexican: ['1 tsp cumin', '1 tsp chili powder', 'Fresh cilantro'],
        Asian: ['2 tbsp soy sauce', '1 tsp sesame oil', '1 tsp fresh ginger'],
        Mediterranean: ['¼ cup Kalamata olives', '1 tsp dried oregano'],
        Indian: ['1 tsp turmeric', '1 tsp garam masala', '1 can coconut milk'],
        American: ['2 tbsp butter', '1 tsp smoked paprika'],
        French: ['½ cup dry white wine', '1 tbsp Dijon mustard'],
        Japanese: ['2 tbsp miso paste', '1 tbsp mirin', '1 tsp rice vinegar'],
        Thai: ['2 tbsp fish sauce (or soy sauce)', '1 tbsp Thai red curry paste', 'Fresh basil'],
        Greek: ['½ cup feta, crumbled', '1 tsp dried oregano', 'Lemon juice'],
        'Middle Eastern': ['1 tsp cumin', '1 tsp coriander', 'Fresh mint']
    };
    return [...base, ...(cuiExtras[cui] || ['Fresh herbs of your choice'])];
}

function extraIngredients(meth) {
    return (
        {
            Baked: ['Parchment paper or foil for lining'],
            Grilled: ['Oil for grilling'],
            Steamed: ['Water or broth for steaming'],
            Roasted: ['1 tbsp balsamic vinegar'],
            'Slow Cooked': ['1 cup vegetable broth', '1 bay leaf'],
            'Air Fried': ['Cooking spray'],
            Sautéed: ['Splash of white wine or broth'],
            Fried: ['Oil for frying'],
            'Instant Pot': ['1 cup broth or water', '1 bay leaf'],
            'Raw / No-Cook': ['Drizzle of extra-virgin olive oil']
        }[meth] || []
    );
}

function buildSteps(ing, meth) {
    const i = ing.toLowerCase();
    const prep = [
        `Wash and prepare the ${i}. Pat dry if needed.`,
        `Mince the garlic, dice the onion, and measure all ingredients.`
    ];
    const cook = {
        Baked: [
            `Preheat oven to 400°F (200°C). Line a baking dish with parchment.`,
            `Toss ${i} with oil, garlic, onion, and seasonings.`,
            `Arrange in a single layer. Add extras on top.`,
            `Bake 25–35 min until golden at the edges.`,
            `Finish with fresh herbs or a squeeze of lemon.`
        ],
        Grilled: [
            `Preheat grill to medium-high. Brush with oil.`,
            `Marinate ${i} with oil, garlic, and seasonings for 10 min.`,
            `Grill 4–6 min per side until nicely charred.`,
            `Rest 5 min before slicing. Finish with herbs or sauce.`
        ],
        Roasted: [
            `Preheat oven to 425°F (220°C).`,
            `Toss ${i} with oil, garlic, onion, and seasonings on a sheet pan.`,
            `Spread in a single layer — don't crowd the pan.`,
            `Roast 25–40 min, tossing halfway, until caramelized.`,
            `Drizzle with balsamic and a pinch of finishing salt.`
        ],
        Sautéed: [
            `Heat oil in a large skillet over medium-high until shimmering.`,
            `Add onion, cook 3 min. Add garlic, cook 1 min more.`,
            `Add ${i} and cook, stirring, for 8–12 min.`,
            `Deglaze with a splash of wine or broth.`,
            `Season, finish with herbs, and serve immediately.`
        ],
        'Slow Cooked': [
            `Add ${i}, onion, garlic, and broth to slow cooker.`,
            `Stir in all seasonings and herbs.`,
            `Cook on LOW 6–8 hrs or HIGH 3–4 hrs.`,
            `Taste and adjust seasoning. Remove bay leaf.`,
            `Serve over rice, bread, or as-is.`
        ],
        'Air Fried': [
            `Preheat air fryer to 380°F (193°C).`,
            `Toss ${i} with oil and seasonings.`,
            `Arrange in a single layer — cook in batches if needed.`,
            `Air fry 12–18 min, shaking halfway.`,
            `Finish with herbs and a squeeze of lemon.`
        ],
        'Raw / No-Cook': [
            `Slice or tear ${i} to desired size.`,
            `Whisk together oil, lemon juice, garlic, and a pinch of salt.`,
            `Toss with dressing and aromatics.`,
            `Let sit 5–10 min for flavors to meld.`,
            `Taste, adjust acid and salt, and serve fresh.`
        ]
    };
    return [...prep, ...(cook[meth] || cook['Roasted'])];
}

function cuisineStyle(c) {
    return (
        {
            Italian: 'Tuscan ',
            Mexican: 'Baja ',
            Asian: 'Asian-Style ',
            Mediterranean: 'Mediterranean ',
            Indian: 'Spiced ',
            American: '',
            French: 'French ',
            Japanese: 'Japanese-Inspired ',
            Thai: 'Thai ',
            Greek: 'Greek ',
            'Middle Eastern': 'Levant-Style '
        }[c] || ''
    );
}

function mealSuffix(m) {
    return (
        {
            Breakfast: 'Bowl',
            Lunch: 'Plate',
            Dinner: 'Dish',
            Snack: 'Bites',
            Appetizer: 'Starter',
            Dessert: 'Treat',
            Soup: 'Soup',
            Salad: 'Salad'
        }[m] || 'Dish'
    );
}

function cookTime(m) {
    return (
        {
            Baked: '40 min',
            Grilled: '25 min',
            Roasted: '45 min',
            Sautéed: '20 min',
            Steamed: '30 min',
            'Slow Cooked': '6–8 hrs',
            'Air Fried': '25 min',
            Fried: '20 min',
            'Instant Pot': '35 min',
            'Raw / No-Cook': '10 min'
        }[m] || '30 min'
    );
}

function recipeEmoji(meal, ingredient) {
    const i = (ingredient || '').toLowerCase();
    if (i.includes('egg')) return '🍳';
    if (i.includes('chicken')) return '🍗';
    if (i.includes('pasta')) return '🍝';
    if (i.includes('potato')) return '🥔';
    if (i.includes('avocado')) return '🥑';
    if (i.includes('lemon')) return '🍋';
    return (
        { Breakfast: '🍳', Lunch: '🥗', Dinner: '🍽️', Snack: '🥨', Dessert: '🍮', Appetizer: '🫒' }[
            meal
        ] || '🍽️'
    );
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ==============================
// SAVE & SHARE
// ==============================
function saveRecipe() {
    if (!currentRecipe) return;
    const saved = getSaved();
    if (
        saved.some(
            (r) => r.name === currentRecipe.name && r.rawIngredient === currentRecipe.rawIngredient
        )
    ) {
        toast('Already saved!');
        return;
    }
    saved.unshift({ ...currentRecipe, savedAt: Date.now() });
    setSaved(saved);
    updateSavedCount();
    updateCookbookProgress();
    if (getSaved().length === COOKBOOK_GOAL) {
        setTimeout(openCelebrationModal, 800);
    }
    toast('Recipe saved! 💾');
    const section = document.getElementById('savedSection');
    if (!section.classList.contains('hidden')) renderSaved();
}

function shareRecipe() {
    if (!currentRecipe) return;
    const r = currentRecipe;
    const text = `🥘 ${r.name}\n\n🛒 Ingredients:\n${r.ingredients.map((i) => '• ' + i).join('\n')}\n\n👩‍🍳 Instructions:\n${r.steps.map((s, i) => i + 1 + '. ' + s).join('\n')}\n\n⏱ ${r.time} · Serves ${r.serves}`;
    if (navigator.share) {
        navigator.share({ title: r.name, text }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard! 📋'));
    } else {
        toast('Sharing not supported on this browser');
    }
}

// ==============================
// SAVED PANEL
// ==============================
function toggleSaved() {
    const saved = getSaved();

    if (!saved.length) {
        toast('Save a recipe first!');
        return;
    }

    const s = document.getElementById('savedSection');

    if (s.classList.contains('hidden')) {
        renderSaved();
        s.classList.remove('hidden');
    } else {
        s.classList.add('hidden');
    }
}

function renderSaved() {
    const saved = getSaved();
    const list = document.getElementById('savedList');
    if (!saved.length) {
        list.innerHTML =
            '<div class="saved-empty">No saved recipes yet. Generate one and tap Save!</div>';
        return;
    }
    list.innerHTML = saved
        .map(
            (r, i) => `
    <div class="saved-item">
      <div class="saved-item-name">${r.name}</div>
      <div class="saved-item-meta">${[r.cuisine, r.dietary, r.meal, r.method].filter(Boolean).join(' · ') || 'No filters'}</div>
      <div class="saved-item-actions">
        <button onclick="loadSaved(${i})">📖 View</button>
        <button onclick="deleteSaved(${i})">🗑 Delete</button>
      </div>
    </div>
  `
        )
        .join('');
}

function loadSaved(i) {
    const r = getSaved()[i];
    if (!r) return;
    currentRecipe = r;
    renderRecipe(r);
    document.getElementById('ingredient').value = r.rawIngredient || '';
    document.querySelectorAll('.pill').forEach((p) => {
        p.classList.toggle(
            'active',
            !!r[p.dataset.group] && r[p.dataset.group] === p.dataset.value
        );
    });
    toggleSaved();
}

function deleteSaved(i) {
    const saved = getSaved();
    saved.splice(i, 1);
    setSaved(saved);
    updateSavedCount();
    renderSaved();
    updateCookbookProgress();
    toast('Recipe deleted');
}

// ==============================
// COOKBOOK EXPORT — $9.99
// ==============================
function exportCookbook({ title, author, subtitle, coverStyle }) {
    const saved = getSaved();
    if (!saved.length) {
        toast('Save some recipes first!');
        return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Cover
    document.getElementById('printCoverTitle').textContent = title;
    document.getElementById('printCoverSubtitle').textContent = subtitle;
    document.getElementById('printCoverAuthor').textContent = author ? 'by ' + author : '';
    document.getElementById('printDate').textContent = dateStr;

    // Table of contents
    document.getElementById('printTOC').innerHTML = `
<div class="print-toc print-page-break">
  <h2 class="print-toc-title">Table of Contents</h2>
  <ol class="print-toc-list">
    ${saved.map((r, i) => `<li>
      <span class="toc-name">${r.name}</span>
      <span class="toc-page">${i + 3}</span>
    </li>`).join('')}
  </ol>
</div>`;

    // Recipes
    document.getElementById('printRecipes').innerHTML = saved.map((r, i) => `
<div class="print-recipe${i > 0 ? ' print-page-break' : ''}">
  <div class="print-recipe-header">
    <span class="print-recipe-num">${String(i + 1).padStart(2, '0')}</span>
    <h2 class="print-recipe-name">${r.name}</h2>
    <div class="print-recipe-meta">⏱ ${r.time} &bull; Serves ${r.serves} &bull; ${r.difficulty}</div>
    <div class="print-recipe-tags">${[r.cuisine, r.dietary, r.meal, r.method].filter(Boolean).map(t => `<span class="print-tag">${t}</span>`).join('')}</div>
  </div>
  <div class="print-recipe-body">
    <div class="print-col">
      <h3>INGREDIENTS</h3>
      <ul>${r.ingredients.map(ing => `<li>${ing}</li>`).join('')}</ul>
    </div>
    <div class="print-col">
      <h3>INSTRUCTIONS</h3>
      <ol>${r.steps.map(s => `<li>${s}</li>`).join('')}</ol>
    </div>
  </div>
  ${r.nutrition ? `
  <div class="print-nutrition">
    <h3>ESTIMATED NUTRITION FACTS (PER SERVING)</h3>
    <div class="print-nutr-row">
      <span><strong>${r.nutrition.cal}</strong> kcal</span>
      <span><strong>${r.nutrition.prot}g</strong> Protein</span>
      <span><strong>${r.nutrition.carb}g</strong> Carbs</span>
      <span><strong>${r.nutrition.fat}g</strong> Fat</span>
      <span><strong>${r.nutrition.fib}g</strong> Fiber</span>
    </div>
  </div>` : ''}
  <p class="print-recipe-footer">Recipe ${i + 1} of ${saved.length} &mdash; Created with PantrySpark &#10024;</p>
</div>`).join('');

    // Apply cover style to body for print
    document.body.classList.remove('cover-rustic', 'cover-modern', 'cover-minimal', 'cover-vintage');
    document.body.classList.add('cover-' + coverStyle);

    window.print();

    setTimeout(() => {
        document.body.classList.remove('cover-rustic', 'cover-modern', 'cover-minimal', 'cover-vintage');
    }, 1000);
}

// ==============================
// ANOTHER / NEW INGREDIENT
// ==============================
function generateAnother() {
    if (lastIngredient) document.getElementById('ingredient').value = lastIngredient;
    generateRecipe();
}

function newSearch() {
    document.getElementById('ingredient').value = '';
    document.getElementById('ingredient').focus();
    document.getElementById('ingredient').scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
}

function updateAnotherBtn() {
    const btn = document.getElementById('anotherBtn');
    if (!btn) return;
    btn.innerHTML = lastIngredient
        ? `🔄 New ${capitalize(lastIngredient)} Recipe`
        : '🔄 New Recipe';
}

// ==============================
// ENTER KEY
// ==============================
document.getElementById('ingredient').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') generateRecipe();
});

// ==============================
// INIT
// ==============================
updateSavedCount();
updateCookbookProgress();