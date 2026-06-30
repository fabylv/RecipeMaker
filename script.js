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
const COOKBOOK_GOAL = 10;
const SAVED_KEY = 'rm_saved';
const COOKBOOK_CREATED_KEY = 'rm_cookbook_created'; // tracks if user has exported at least once
const CLAUDE_KEY_STORAGE  = 'rm_claude_key';

const AI_LOADING_MSGS = [
    'Asking Chef Claude…',
    'Crafting your recipe…',
    'Adding the finishing touches…',
    'Almost ready…'
];

function getClaudeKey() {
    return localStorage.getItem(CLAUDE_KEY_STORAGE) || '';
}
function setClaudeKey(key) {
    if (key) localStorage.setItem(CLAUDE_KEY_STORAGE, key.trim());
    else localStorage.removeItem(CLAUDE_KEY_STORAGE);
}

async function callClaudeAPI(ingredient, cuisine, dietary, meal, method) {
    const apiKey = getClaudeKey();
    if (!apiKey) return null;

    const filters = [
        cuisine  && `Cuisine style: ${cuisine}`,
        dietary  && `Dietary requirement: ${dietary}`,
        meal     && `Meal type: ${meal}`,
        method   && `Cooking method: ${method}`
    ].filter(Boolean);
    const filtersText = filters.length ? '\n' + filters.join('\n') : '';

    const prompt = `You are a creative, inventive chef. Create a genuinely unique and delicious recipe.
Primary ingredient: ${ingredient}${filtersText}

Make the name evocative and memorable. Use realistic quantities. Give 8-12 ingredients and 5-8 steps.
Respond ONLY with a valid JSON object (no markdown, no extra text):
{
  "name": "Creative recipe name",
  "ingredients": ["1 lb chicken breast, sliced thin", "..."],
  "steps": ["Heat olive oil over medium-high...", "..."],
  "time": "35 min",
  "serves": "4",
  "difficulty": "Easy",
  "tip": "One specific, memorable chef's tip"
}`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-3-5-haiku-20241022',
                max_tokens: 1024,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                toast('⚠️ Invalid API key — check ⚡ Settings');
                return null;
            }
            throw new Error(`api_error_${response.status}`);
        }

        const data   = await response.json();
        const text   = data.content[0].text.trim();
        const match  = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('bad_format');

        const recipe = JSON.parse(match[0]);
        if (!recipe.name || !recipe.ingredients || !recipe.steps) throw new Error('bad_format');
        return recipe;

    } catch (err) {
        if (err.message === 'bad_format') {
            console.warn('Claude returned unexpected format');
            return null;
        }
        throw err;
    }
}

function hasCookbookBeenCreated() {
    return !!localStorage.getItem(COOKBOOK_CREATED_KEY);
}
function markCookbookCreated() {
    localStorage.setItem(COOKBOOK_CREATED_KEY, '1');
}

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
        const already = hasCookbookBeenCreated();
        if (label) label.textContent = already
            ? `📖 New Edition (${count} recipes)`
            : '📖 Create My Cookbook';
        if (btn) {
            btn.disabled = false;
            btn.classList.add('cookbook-btn--ready');
        }
    } else {
        if (label) label.textContent = `📖 Create My Cookbook (${count}/10 recipes)`;
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
    if (hint) {
        if (count >= COOKBOOK_GOAL) {
            hint.textContent = hasCookbookBeenCreated()
                ? `📖 Ready for a new edition! You have ${count} recipes.`
                : '🎉 Your cookbook is ready to create!';
        } else {
            hint.textContent = `Save ${COOKBOOK_GOAL - count} more recipe${COOKBOOK_GOAL - count === 1 ? '' : 's'} to unlock your cookbook.`;
        }
    }
    if (panelBtn) {
        panelBtn.disabled = count < COOKBOOK_GOAL;
        panelBtn.classList.toggle('btn-create-cookbook--ready', count >= COOKBOOK_GOAL);
    }
}

// ==============================
// CELEBRATION MODAL
// ==============================
function openCelebrationModal() {
    const already = hasCookbookBeenCreated();
    const count = getSaved().length;
    const titleEl = document.getElementById('celebrationTitle');
    const subEl = document.getElementById('celebrationSub');
    if (titleEl) titleEl.textContent = already ? 'Time for a new edition!' : 'Your cookbook is ready!';
    if (subEl) subEl.innerHTML = already
        ? `You now have <strong>${count} recipes</strong>.<br>Create an updated edition of your cookbook.`
        : `You've saved <strong>${count} recipes</strong>.<br>Turn them into a beautiful cookbook you can keep forever.`;
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
    const current = input.value.trim();
    // If already in the list, remove it (toggle off)
    const parts = current ? current.split(/,\s*/) : [];
    const idx = parts.findIndex(p => p.toLowerCase() === value.toLowerCase());
    if (idx !== -1) {
        parts.splice(idx, 1);
        input.value = parts.join(', ');
    } else {
        input.value = current ? current + ', ' + value : value;
    }
    input.focus();
}

// ==============================
// GENERATE
// ==============================
async function generateRecipe() {
    const raw = document.getElementById('ingredient').value.trim();
    const allIngredients = raw
        .split(/\n|,|\s+and\s+|\s*&\s*/i)
        .map(s => s.trim())
        .filter(Boolean);
    const ingredient = allIngredients[0];
    const extraIngredientsFridge = allIngredients.slice(1);
    if (!ingredient) {
        toast('Enter at least one ingredient!');
        document.getElementById('ingredient').focus();
        return;
    }

    const cuisine = getActive('cuisine');
    const dietary = getActive('dietary');
    const meal    = getActive('meal');
    const method  = getActive('method');

    const btn    = document.getElementById('generateBtn');
    const text   = document.getElementById('btnText');
    const loader = document.getElementById('btnLoader');
    btn.disabled = true;
    text.classList.remove('hidden');
    loader.classList.add('hidden');

    const hasKey = !!getClaudeKey();
    let loadingInterval = null;

    if (hasKey) {
        let msgIdx = 0;
        text.textContent = AI_LOADING_MSGS[0];
        loadingInterval = setInterval(() => {
            msgIdx = (msgIdx + 1) % AI_LOADING_MSGS.length;
            text.textContent = AI_LOADING_MSGS[msgIdx];
        }, 1300);
    } else {
        text.classList.add('hidden');
        loader.classList.remove('hidden');
    }

    lastIngredient = raw;
    document.getElementById('ingredient').value = '';
    updateAnotherBtn();

    try {
        let recipe = null;

        if (hasKey) {
            try {
                const aiData = await callClaudeAPI(ingredient, cuisine, dietary, meal, method);
                if (aiData) {
                    recipe = {
                        name:         aiData.name,
                        cuisine, dietary, meal, method,
                        ingredients:  aiData.ingredients,
                        steps:        aiData.steps,
                        time:         aiData.time       || '35 min',
                        serves:       aiData.serves     || '4',
                        difficulty:   aiData.difficulty || 'Easy',
                        rawIngredient: ingredient,
                        fridgeExtras:  extraIngredientsFridge,
                        tip:           aiData.tip || null,
                        aiGenerated:   true,
                        nutrition: estimateNutrition(
                            ingredient, method || 'Baked', dietary,
                            aiData.serves || '4', aiData.ingredients
                        )
                    };
                }
            } catch (aiErr) {
                console.warn('AI generation failed, falling back:', aiErr);
                toast('AI timeout — using template recipe');
            }
        }

        if (!recipe) {
            await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
            recipe = buildRecipe(ingredient, cuisine, dietary, meal, method, extraIngredientsFridge);
        }

        currentRecipe = recipe;
        renderRecipe(currentRecipe);

    } finally {
        if (loadingInterval) clearInterval(loadingInterval);
        btn.disabled = false;
        text.textContent = 'Generate Recipe';
        text.classList.remove('hidden');
        loader.classList.add('hidden');
    }
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

    // AI badge
    const aiGenBadge = document.getElementById('aiGenBadge');
    if (aiGenBadge) aiGenBadge.classList.toggle('hidden', !r.aiGenerated);

    // Chef's tip (AI only)
    const tipSection = document.getElementById('chefTipSection');
    if (tipSection) {
        if (r.tip) {
            tipSection.innerHTML = `
              <div class="chef-tip-inner">
                <span class="chef-tip-icon">👨‍🍳</span>
                <div>
                  <p class="chef-tip-label">CHEF'S TIP</p>
                  <p class="chef-tip-text">${r.tip}</p>
                </div>
              </div>`;
            tipSection.classList.remove('hidden');
        } else {
            tipSection.classList.add('hidden');
        }
    }

    const el = document.getElementById('result');
    el.classList.remove('hidden');
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

// ==============================
// RECIPE BUILDER
// ==============================
function buildRecipe(ingredient, cuisine, dietary, meal, method, fridgeExtras = []) {
    const ing = capitalize(ingredient);
    const cui = cuisine || pick(['Italian', 'Mediterranean', 'Asian', 'American', 'French']);
    const diet = dietary || '';
    const ml = meal || pick(['Lunch', 'Dinner', 'Snack']);
    const meth = method || pick(['Baked', 'Grilled', 'Sautéed', 'Roasted']);
    const t = getTemplate(ing, cui, diet, ml, meth, fridgeExtras);
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
        fridgeExtras,
        nutrition: estimateNutrition(ingredient, meth, diet, t.serves, t.ingredients)
    };
}

function getTemplate(ing, cui, diet, ml, meth, fridgeExtras = []) {
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
    // Include up to 2 fridge extras in the recipe name
    const extrasLabel = fridgeExtras.length
        ? ' with ' + fridgeExtras.slice(0, 2).map(capitalize).join(' & ')
        : '';
    const name = `${adj} ${cuisineStyle(cui)}${ing}${extrasLabel} ${mealSuffix(ml)}`;
    return {
        name,
        ingredients: [...baseIngredients(ing, cui, fridgeExtras), ...extraIngredients(meth)],
        steps: buildSteps(ing, meth, fridgeExtras),
        time: cookTime(meth),
        serves: pick(['2', '4', '2–4', '6']),
        difficulty: pick(['Easy', 'Easy', 'Moderate', 'Easy'])
    };
}

function baseIngredients(ing, cui, fridgeExtras = []) {
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
    // Weave in any fridge extras, with smart quantity guessing
    const fridgeLines = fridgeExtras
        .filter(e => !base.some(b => b.toLowerCase().includes(e.toLowerCase())))
        .map(e => {
            const el = e.toLowerCase();
            if (/\begg(s)?\b/.test(el))           return `2 eggs`;
            if (/\b(rice|pasta|quinoa|oat)/.test(el)) return `1 cup ${capitalize(e)}, cooked`;
            if (/\b(potato|potatoes)/.test(el))   return `2 medium potatoes, diced`;
            if (/\b(cheese|parmesan|feta|cheddar)/.test(el)) return `\u00bc cup ${capitalize(e)}, grated or crumbled`;
            if (/\b(milk|cream|yogurt|broth)/.test(el)) return `\u00bd cup ${capitalize(e)}`;
            if (/\b(spinach|kale|lettuce|arugula)/.test(el)) return `2 cups ${capitalize(e)}, roughly chopped`;
            if (/\b(carrot|celery|zucchini|broccoli|cauliflower|asparagus)/.test(el)) return `1 cup ${capitalize(e)}, chopped`;
            if (/\b(tomato|tomatoes|pepper|peppers|mushroom)/.test(el)) return `1 cup ${capitalize(e)}, sliced`;
            if (/\b(avocado)/.test(el))           return `1 avocado, sliced`;
            if (/\b(lemon|lime)/.test(el))        return `1 ${capitalize(e)}, juiced`;
            if (/\b(butter)/.test(el))            return `2 tbsp ${capitalize(e)}`;
            if (/\b(oil)/.test(el))               return `1 tbsp ${capitalize(e)}`;
            return `1 cup ${capitalize(e)}, prepared`;
        });
    return [...base, ...fridgeLines, ...(cuiExtras[cui] || ['Fresh herbs of your choice'])];
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

function buildSteps(ing, meth, fridgeExtras = []) {
    const i = ing.toLowerCase();
    const extrasNote = fridgeExtras.length
        ? ` Prep the ${fridgeExtras.slice(0, 3).map(e => e.toLowerCase()).join(', ')} as well.`
        : '';
    const prep = [
        `Wash and prepare the ${i}. Pat dry if needed.${extrasNote}`,
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
// SHARE CARD
// ==============================
function openShareCard() {
    if (!currentRecipe) return;
    renderShareCard(currentRecipe);
    document.getElementById('shareCardModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeShareCard() {
    document.getElementById('shareCardModal').classList.add('hidden');
    document.body.style.overflow = '';
}

document.getElementById('shareCardModal').addEventListener('click', function(e) {
    if (e.target === this) closeShareCard();
});

function renderShareCard(r) {
    document.getElementById('scEmoji').textContent  = recipeEmoji(r.meal, r.rawIngredient);
    document.getElementById('scName').textContent   = r.name;
    document.getElementById('scTime').textContent   = r.time;
    document.getElementById('scServes').textContent = `Serves ${r.serves}`;
    document.getElementById('scDifficulty').textContent = r.difficulty;

    // Tags
    document.getElementById('scTags').innerHTML = [r.cuisine, r.dietary, r.meal, r.method]
        .filter(Boolean)
        .map(t => `<span class="sc-tag">${t}</span>`)
        .join('');

    // Top 6 ingredients
    document.getElementById('scIngredients').innerHTML = (r.ingredients || [])
        .slice(0, 6)
        .map(i => `<li>${i}</li>`)
        .join('');

    // Chef's tip
    const tipBox  = document.getElementById('scTip');
    const tipText = document.getElementById('scTipText');
    if (r.tip) {
        tipText.textContent = r.tip;
        tipBox.classList.remove('hidden');
    } else {
        tipBox.classList.add('hidden');
    }

    // AI badge
    const aiBadge = document.getElementById('scAiBadge');
    if (aiBadge) aiBadge.classList.toggle('hidden', !r.aiGenerated);
}

function downloadShareCard() {
    const card = document.getElementById('shareCardInner');
    if (window.html2canvas) {
        window.html2canvas(card, { scale: 2, backgroundColor: '#FBF5EC', useCORS: true })
            .then(canvas => {
                const link    = document.createElement('a');
                link.download = ((currentRecipe?.name || 'recipe')
                    .replace(/[^a-z0-9]/gi, '-').toLowerCase()) + '.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            })
            .catch(() => toast('📸 Long-press the card to save as image'));
    } else {
        toast('📸 Long-press the card to save as image');
    }
}

// ==============================
// SETTINGS
// ==============================
function openSettings() {
    const key   = getClaudeKey();
    const input = document.getElementById('settingsApiKey');
    if (input) input.value = key ? '••••••••' + key.slice(-4) : '';
    document.getElementById('settingsModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeSettings() {
    document.getElementById('settingsModal').classList.add('hidden');
    document.body.style.overflow = '';
}

document.getElementById('settingsModal').addEventListener('click', function(e) {
    if (e.target === this) closeSettings();
});

function saveSettings() {
    const raw = (document.getElementById('settingsApiKey').value || '').trim();
    if (!raw) {
        setClaudeKey('');
        toast('API key cleared');
    } else if (raw.includes('•')) {
        toast('Settings saved ✓');
    } else {
        setClaudeKey(raw);
        toast('✨ AI mode enabled! Try generating a recipe.');
    }
    closeSettings();
    updateAiStatus();
}

function clearApiKey() {
    setClaudeKey('');
    const input = document.getElementById('settingsApiKey');
    if (input) input.value = '';
    toast('API key cleared');
    updateAiStatus();
}

function updateAiStatus() {
    const hasKey = !!getClaudeKey();
    const badge  = document.getElementById('aiStatusBadge');
    if (badge) {
        badge.textContent = hasKey ? '✨ AI On' : '🔧 Template';
        badge.className   = 'ai-status-badge ' + (hasKey ? 'ai-status-badge--on' : 'ai-status-badge--off');
    }
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
<div class="print-recipe">
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
  <p class="print-recipe-footer">Recipe ${i + 1} of ${saved.length} &mdash; Created with ChefAmigo &#10024;</p>
</div>`).join('');

    // Apply cover style to body for print
    document.body.classList.remove('cover-rustic', 'cover-modern', 'cover-minimal', 'cover-vintage');
    document.body.classList.add('cover-' + coverStyle);

    window.print();

    // Mark cookbook as created so button label updates to "New Edition"
    markCookbookCreated();
    updateCookbookProgress();

    setTimeout(() => {
        document.body.classList.remove('cover-rustic', 'cover-modern', 'cover-minimal', 'cover-vintage');
    }, 1000);
}

// ==============================
// ANOTHER / NEW INGREDIENT
// ==============================
function generateAnother() {
    // Restore the full ingredient list (including fridge extras)
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
    // Show just the primary ingredient in the button label
    const primary = lastIngredient.split(/\n|,|\s+and\s+|\s*&\s*/i)[0].trim();
    btn.innerHTML = primary
        ? `🔄 New ${capitalize(primary)} Recipe`
        : '🔄 New Recipe';
}

// ==============================
// ENTER KEY
// ==============================
document.getElementById('ingredient').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') generateRecipe();
});

// ==============================
// SHOPPING LIST
// ==============================
const SL_KEY = 'rm_shopping_checked'; // Set of ingredient strings user has marked as "have it"

// Common pantry staples — auto-suggested as already owned
const PANTRY_STAPLES = [
    'olive oil', 'salt', 'black pepper', 'garlic', 'onion', 'butter',
    'soy sauce', 'vinegar', 'flour', 'sugar', 'water', 'broth'
];

function getCheckedItems() {
    try { return new Set(JSON.parse(localStorage.getItem(SL_KEY)) || []); }
    catch { return new Set(); }
}
function saveCheckedItems(set) {
    localStorage.setItem(SL_KEY, JSON.stringify([...set]));
}

/**
 * Compile all unique ingredient lines from saved recipes.
 * Strips leading quantity/unit to get a clean key for de-duplication,
 * but keeps the original line for display.
 */
function compileShoppingList() {
    const saved = getSaved();
    const seen = new Map(); // normalized key -> original display line
    for (const r of saved) {
        for (const line of (r.ingredients || [])) {
            // Skip lines that are not real ingredients
            if (/to taste|for (lining|grilling|frying|garnish)|parchment|foil|cooking spray/i.test(line)) continue;
            // Normalize: strip leading quantity + unit to get food name key
            const key = line
                .toLowerCase()
                .replace(/^[\d¼½¾⅓⅔][\d\s\u2013–.\-]*/, '')  // strip leading numbers/fractions
                .replace(/^(lbs?|oz|g|kg|cup|cups|tbsp|tsp|ml|l|cloves?|slices?|pieces?|medium|large|small|fresh|dried)\s+/i, '')
                .replace(/[,.].*$/, '')   // strip prep notes after comma
                .trim();
            if (key && !seen.has(key)) seen.set(key, line);
        }
    }
    return [...seen.values()];
}

function openShoppingList() {
    const saved = getSaved();
    if (!saved.length) {
        toast('Save some recipes first to build a shopping list!');
        return;
    }
    renderShoppingList();
    document.getElementById('shoppingListModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeShoppingList() {
    document.getElementById('shoppingListModal').classList.add('hidden');
    document.body.style.overflow = '';
}

document.getElementById('shoppingListModal').addEventListener('click', function(e) {
    if (e.target === this) closeShoppingList();
});

function renderShoppingList() {
    const items = compileShoppingList();
    const checked = getCheckedItems();
    const list = document.getElementById('slList');
    const sub = document.getElementById('slSub');
    const count = document.getElementById('slCount');

    sub.textContent = `From ${getSaved().length} saved recipe${getSaved().length === 1 ? '' : 's'} — check off what you already have.`;

    list.innerHTML = items.map((line, i) => {
        const isChecked = checked.has(line);
        // Highlight pantry staples
        const isStaple = PANTRY_STAPLES.some(s => line.toLowerCase().includes(s));
        return `
        <li class="sl-item${isChecked ? ' sl-item--checked' : ''}${isStaple ? ' sl-item--staple' : ''}" data-line="${encodeURIComponent(line)}">
            <label class="sl-label">
                <input type="checkbox" class="sl-check" ${isChecked ? 'checked' : ''}
                    onchange="slToggleItem(this, '${encodeURIComponent(line)}')" />
                <span class="sl-text">${line}</span>
            </label>
            <button class="sl-remove" onclick="slRemoveItem(this, '${encodeURIComponent(line)}')" title="Remove">&times;</button>
        </li>`;
    }).join('');

    updateSlCount();
}

function slToggleItem(checkbox, encodedLine) {
    const line = decodeURIComponent(encodedLine);
    const checked = getCheckedItems();
    if (checkbox.checked) checked.add(line);
    else checked.delete(line);
    saveCheckedItems(checked);
    const li = checkbox.closest('.sl-item');
    li.classList.toggle('sl-item--checked', checkbox.checked);
    updateSlCount();
}

function slRemoveItem(btn, encodedLine) {
    const line = decodeURIComponent(encodedLine);
    // Remove from checked set too
    const checked = getCheckedItems();
    checked.delete(line);
    saveCheckedItems(checked);
    btn.closest('.sl-item').remove();
    updateSlCount();
}

function updateSlCount() {
    const total = document.querySelectorAll('.sl-item').length;
    const done = document.querySelectorAll('.sl-item--checked').length;
    const need = total - done;
    const el = document.getElementById('slCount');
    if (el) el.textContent = need > 0 ? `${need} item${need === 1 ? '' : 's'} to buy` : '✅ All set!';
}

function slCheckCommonPantry() {
    const checked = getCheckedItems();
    document.querySelectorAll('.sl-item').forEach(li => {
        const line = decodeURIComponent(li.dataset.line);
        if (PANTRY_STAPLES.some(s => line.toLowerCase().includes(s))) {
            checked.add(line);
            li.classList.add('sl-item--checked');
            const cb = li.querySelector('.sl-check');
            if (cb) cb.checked = true;
        }
    });
    saveCheckedItems(checked);
    updateSlCount();
    toast('Pantry staples marked ✅');
}

function slClearAll() {
    saveCheckedItems(new Set());
    document.querySelectorAll('.sl-item').forEach(li => {
        li.classList.remove('sl-item--checked');
        const cb = li.querySelector('.sl-check');
        if (cb) cb.checked = false;
    });
    updateSlCount();
}

function slCopyList() {
    const items = [];
    document.querySelectorAll('.sl-item:not(.sl-item--checked)').forEach(li => {
        const text = li.querySelector('.sl-text');
        if (text) items.push('• ' + text.textContent.trim());
    });
    if (!items.length) {
        toast('Nothing left to buy — you have everything! ✅');
        return;
    }
    const text = '🛒 Shopping List\n\n' + items.join('\n');
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard! 📋'));
    } else {
        toast('Clipboard not available on this browser');
    }
}

// ==============================
// INIT
// ==============================
updateSavedCount();
updateCookbookProgress();
updateAiStatus();