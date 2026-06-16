/* ===========================
   Recipe Generator — script.js
   =========================== */

// ==============================
// NUTRITION ESTIMATOR
// ==============================
const NUTRITION_DB = {
    // [calories, protein(g), carbs(g), fat(g), fiber(g)] per 100g
    chicken: [165, 31, 0, 3.6, 0],
    beef: [250, 26, 0, 17, 0],
    pork: [242, 27, 0, 14, 0],
    salmon: [208, 20, 0, 13, 0],
    tuna: [130, 29, 0, 1, 0],
    shrimp: [99, 24, 0.2, 0.3, 0],
    fish: [136, 24, 0, 5, 0],
    egg: [155, 13, 1, 11, 0],
    eggs: [155, 13, 1, 11, 0],
    tofu: [76, 8, 2, 4, 0.3],
    turkey: [189, 29, 0, 7, 0],
    lamb: [294, 25, 0, 21, 0],
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
    lentil: [116, 9, 20, 0.4, 7.9],
    lentils: [116, 9, 20, 0.4, 7.9],
    chickpea: [164, 8.9, 27, 2.6, 7.6],
    chickpeas: [164, 8.9, 27, 2.6, 7.6],
    beans: [127, 8.7, 22, 0.5, 6.4],
    rice: [130, 2.7, 28, 0.3, 0.4],
    pasta: [158, 5.8, 31, 0.9, 1.8],
    quinoa: [120, 4.4, 21, 1.9, 2.8],
    cheese: [402, 25, 1.3, 33, 0],
    yogurt: [59, 10, 3.6, 0.4, 0],
    avocado: [160, 2, 9, 15, 6.7],
    lemon: [29, 1.1, 9, 0.3, 2.8]
};

const METHOD_CALORIES = {
    Fried: 200,
    'Air Fried': 60,
    Sautéed: 80,
    Baked: 30,
    Roasted: 40,
    Grilled: 20,
    Steamed: 0,
    'Raw / No-Cook': 0,
    'Slow Cooked': 20,
    'Instant Pot': 10
};

function estimateNutrition(ingredient, method, dietary, serves) {
    const key = ingredient.toLowerCase().split(' ')[0].replace(/s$/, '');
    const base = NUTRITION_DB[key] || NUTRITION_DB[key + 's'] || [200, 15, 15, 8, 2];
    const factor = 300 / (parseInt(serves) || 2) / 100;
    let [cal, prot, carb, fat, fib] = base.map((v) => Math.round(v * factor));
    cal += METHOD_CALORIES[method] || 25;
    if (dietary === 'Keto') {
        carb = Math.max(2, Math.round(carb * 0.3));
        fat = Math.round(fat * 1.5);
    }
    if (dietary === 'Low-Carb') {
        carb = Math.max(4, Math.round(carb * 0.5));
    }
    if (dietary === 'Vegan' || dietary === 'Vegetarian') {
        prot = Math.max(prot, 8);
    }
    return { cal, prot, carb, fat, fib };
}

// ==============================
// PLAN CONFIG
// ==============================
const PLANS = {
    free: { label: 'Free', limit: 5 },
    premium: { label: 'Premium', limit: Infinity }
};

const USAGE_KEY = 'rm_usage'; // { day: 'YYYY-MM-DD', count: N }
const PLAN_KEY = 'rm_plan'; // 'free' | 'premium'
const SAVED_KEY = 'rm_saved';

// ==============================
// USAGE & PLAN HELPERS
// ==============================
function currentDay() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getUsage() {
    try {
        const u = JSON.parse(localStorage.getItem(USAGE_KEY));
        if (u && u.day === currentDay()) return u;
    } catch {}
    return { day: currentDay(), count: 0 };
}

function setUsage(u) {
    localStorage.setItem(USAGE_KEY, JSON.stringify(u));
}
function getPlan() {
    return localStorage.getItem(PLAN_KEY) || 'free';
}
function setPlan(p) {
    localStorage.setItem(PLAN_KEY, p);
}
function getLimit() {
    return PLANS[getPlan()].limit;
}

function recipesLeft() {
    const limit = getLimit();
    return limit === Infinity ? Infinity : Math.max(0, limit - getUsage().count);
}

function incrementUsage() {
    const u = getUsage();
    u.count++;
    setUsage(u);
}

// ==============================
// USAGE PILL
// ==============================
function renderUsagePill() {
    const pill = document.getElementById('usagePill');
    const upgradeBtn = document.getElementById('upgradeBtn');
    const plan = getPlan();
    const left = recipesLeft();

    if (plan === 'premium') {
        pill.className = 'usage-pill pro';
        pill.innerHTML = `<span class="usage-dot"></span> Premium — Unlimited`;
        if (upgradeBtn) {
            upgradeBtn.textContent = 'Manage Plan';
            upgradeBtn.style.display = 'inline-flex';
        }
        return;
    }

    pill.className = left <= 1 ? 'usage-pill warn' : 'usage-pill';
    pill.innerHTML = `<span class="usage-dot"></span> ${left} of ${getLimit()} free recipes today`;
    if (upgradeBtn) {
        upgradeBtn.textContent = 'View Plans ↗';
        upgradeBtn.style.display = 'inline-flex';
    }
}

// ==============================
// PAYWALL
// ==============================
function openPaywall() {
    document.getElementById('paywallModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closePaywall() {
    document.getElementById('paywallModal').classList.add('hidden');
    document.body.style.overflow = '';
}

function upgradePlan(plan) {
    // TODO: replace with Stripe Checkout redirect
    // window.location.href = '/checkout?plan=' + plan;
    // ⚠️ SECURITY: Plan status is currently stored in localStorage only.
    // Anyone can unlock Premium via the browser console: localStorage.setItem('rm_plan', 'premium')
    // Before going live, verify plan status server-side (e.g. via a Stripe webhook + your own API).
    setPlan(plan);
    closePaywall();
    renderUsagePill();
    toast(`✨ Welcome to ${PLANS[plan].label}! You're all set.`);
}

document.getElementById('paywallModal').addEventListener('click', function (e) {
    if (e.target === this) closePaywall();
});

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

    if (recipesLeft() <= 0) {
        openPaywall();
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

    incrementUsage();
    renderUsagePill();

    lastIngredient = ingredient;
    document.getElementById('ingredient').value = '';
    updateAnotherBtn();

    currentRecipe = buildRecipe(ingredient, cuisine, dietary, meal, method);
    renderRecipe(currentRecipe);

    btn.disabled = false;
    text.classList.remove('hidden');
    loader.classList.add('hidden');

    if (getPlan() === 'free' && recipesLeft() === 0) {
        setTimeout(
            () => toast('That was your last free recipe today! Upgrade to keep going 🍽'),
            1500
        );
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
      <p class="nutrition-title">🧑‍🍳 Nutrition per serving <span class="nutrition-est">estimated from primary ingredient only</span></p>
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
        nutrition: estimateNutrition(ingredient, meth, diet, t.serves)
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
    const FREE_SAVE_LIMIT = 5;
    if (getPlan() === 'free' && saved.length >= FREE_SAVE_LIMIT) {
        openPaywall();
        toast('Upgrade to Premium to save unlimited recipes! ✨');
        return;
    }
    saved.unshift({ ...currentRecipe, savedAt: Date.now() });
    setSaved(saved);
    updateSavedCount();
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
    toast('Recipe deleted');
}

// ==============================
// PDF EXPORT (Premium only)
// ==============================
async function exportPDF() {
    if (getPlan() === 'free') {
        openPaywall();
        toast('Upgrade to Premium to export your Recipe Book! 📄');
        return;
    }

    const saved = getSaved();
    if (!saved.length) {
        toast('Save some recipes first!');
        return;
    }

    const btn = document.querySelector('.btn-export-pdf');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '⏳ Preparing PDF…';
    btn.disabled = true;

    const now = new Date();
    document.getElementById('printDate').textContent = now.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });

    document.getElementById('printRecipes').innerHTML = saved
        .map(
            (r, i) => `
    <div class="print-recipe${i > 0 ? ' print-page-break' : ''}">
      <div class="print-recipe-header">
        <span class="print-recipe-num">${String(i + 1).padStart(2, '0')}</span>
        <h2 class="print-recipe-name">${r.name}</h2>
        <div class="print-recipe-meta">⏱ ${r.time} &bull; Serves ${r.serves} &bull; ${r.difficulty}</div>
        <div class="print-recipe-tags">${[r.cuisine, r.dietary, r.meal, r.method]
            .filter(Boolean)
            .map((t) => `<span class="print-tag">${t}</span>`)
            .join('')}</div>
      </div>
      <div class="print-recipe-body">
        <div class="print-col">
          <h3>INGREDIENTS</h3>
          <ul>${r.ingredients.map((ing) => `<li>${ing}</li>`).join('')}</ul>
        </div>
        <div class="print-col">
          <h3>INSTRUCTIONS</h3>
          <ol>${r.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
        </div>
      </div>
      ${
          r.nutrition
              ? `
      <div class="print-nutrition">
        <h3>NUTRITION PER SERVING (ESTIMATED)</h3>
        <div class="print-nutr-row">
          <span><strong>${r.nutrition.cal}</strong> kcal</span>
          <span><strong>${r.nutrition.prot}g</strong> Protein</span>
          <span><strong>${r.nutrition.carb}g</strong> Carbs</span>
          <span><strong>${r.nutrition.fat}g</strong> Fat</span>
          <span><strong>${r.nutrition.fib}g</strong> Fiber</span>
        </div>
      </div>`
              : ''
      }
      <p class="print-recipe-footer">Recipe ${i + 1} of ${saved.length} &mdash; Created with Recipe Generator &#10024;</p>
    </div>
  `
        )
        .join('');

    btn.innerHTML = originalHTML;
    btn.disabled = false;
    window.print();
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
renderUsagePill();
updateSavedCount();