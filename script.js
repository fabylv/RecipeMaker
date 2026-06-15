/* ===========================
   Recipe Maker — script.js
   =========================== */

// Images removed — no external dependency

// Convert image URL to base64 via fetch + FileReader (avoids canvas CORS issues)
async function imgToBase64(url) {
  try {
    const res  = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ==============================
// NUTRITION ESTIMATOR
// ==============================
const NUTRITION_DB = {
  // [calories, protein(g), carbs(g), fat(g), fiber(g)] per 100g
  // Proteins
  chicken:   [165, 31, 0,   3.6, 0],
  beef:      [250, 26, 0,   17,  0],
  pork:      [242, 27, 0,   14,  0],
  salmon:    [208, 20, 0,   13,  0],
  tuna:      [130, 29, 0,   1,   0],
  shrimp:    [99,  24, 0.2, 0.3, 0],
  fish:      [136, 24, 0,   5,   0],
  egg:       [155, 13, 1,   11,  0],
  eggs:      [155, 13, 1,   11,  0],
  tofu:      [76,  8,  2,   4,   0.3],
  tempeh:    [193, 19, 9,   11,  0],
  turkey:    [189, 29, 0,   7,   0],
  lamb:      [294, 25, 0,   21,  0],
  // Vegetables
  broccoli:  [34,  2.8, 7,  0.4, 2.6],
  spinach:   [23,  2.9, 3.6, 0.4, 2.2],
  zucchini:  [17,  1.2, 3.1, 0.3, 1],
  carrot:    [41,  0.9, 10,  0.2, 2.8],
  potato:    [77,  2,   17,  0.1, 2.2],
  tomato:    [18,  0.9, 3.9, 0.2, 1.2],
  onion:     [40,  1.1, 9.3, 0.1, 1.7],
  garlic:    [149, 6.4, 33,  0.5, 2.1],
  mushroom:  [22,  3.1, 3.3, 0.3, 1],
  eggplant:  [25,  1,   6,   0.2, 3],
  pepper:    [31,  1,   6,   0.3, 2.1],
  asparagus: [20,  2.2, 3.9, 0.1, 2.1],
  // Legumes
  lentil:    [116, 9,   20,  0.4, 7.9],
  lentils:   [116, 9,   20,  0.4, 7.9],
  chickpea:  [164, 8.9, 27,  2.6, 7.6],
  chickpeas: [164, 8.9, 27,  2.6, 7.6],
  beans:     [127, 8.7, 22,  0.5, 6.4],
  // Grains
  rice:      [130, 2.7, 28,  0.3, 0.4],
  pasta:     [158, 5.8, 31,  0.9, 1.8],
  quinoa:    [120, 4.4, 21,  1.9, 2.8],
  oats:      [389, 17,  66,  7,   10.6],
  bread:     [265, 9,   49,  3.2, 2.7],
  // Dairy
  cheese:    [402, 25,  1.3, 33,  0],
  milk:      [61,  3.2, 4.8, 3.3, 0],
  yogurt:    [59,  10,  3.6, 0.4, 0],
  // Fruit
  lemon:     [29,  1.1, 9,   0.3, 2.8],
  banana:    [89,  1.1, 23,  0.3, 2.6],
  apple:     [52,  0.3, 14,  0.2, 2.4],
  avocado:   [160, 2,   9,   15,  6.7],
};

const METHOD_CALORIE_ADD = {
  'Fried':       200, 'Air Fried': 60, 'Sautéed': 80,
  'Baked':       30,  'Roasted':   40, 'Grilled':  20,
  'Steamed':     0,   'Raw / No-Cook': 0, 'Slow Cooked': 20,
  'Instant Pot': 10,
};

function estimateNutrition(rawIngredient, method, dietary, serves) {
  const key = rawIngredient.toLowerCase().split(' ')[0].replace(/s$/, '');
  const base = NUTRITION_DB[key] || NUTRITION_DB[key + 's'] || [200, 15, 15, 8, 2];
  const servings = parseInt(serves) || 2;
  // Assume ~300g per serving of the main ingredient
  const gramsPerServing = 300 / servings;
  const factor = gramsPerServing / 100;
  const extra  = (METHOD_CALORIE_ADD[method] || 25);

  let [cal, prot, carb, fat, fib] = base.map(v => Math.round(v * factor));
  cal += extra;

  // Dietary adjustments
  if (dietary === 'Keto')     { carb = Math.max(2, Math.round(carb * 0.3)); fat = Math.round(fat * 1.5); }
  if (dietary === 'Low-Carb') { carb = Math.max(4, Math.round(carb * 0.5)); }
  if (dietary === 'Vegan' || dietary === 'Vegetarian') { prot = Math.max(prot, 8); }

  return { cal, prot, carb, fat, fib };
}

// ==============================
// PLAN CONFIG — easy to adjust
// ==============================
const PLANS = {
  free:    { label: 'Free',    limit: 5,       period: 'day' },
  premium: { label: 'Premium', limit: Infinity, period: 'day' },
};

const USAGE_KEY  = 'rm_usage';   // { month: 'YYYY-MM', count: N }
const PLAN_KEY   = 'rm_plan';    // 'free' | 'pro' | 'chef'
const SAVED_KEY  = 'rm_saved';

// ==============================
// USAGE / PLAN HELPERS
// ==============================
function currentDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getUsage() {
  try {
    const u = JSON.parse(localStorage.getItem(USAGE_KEY));
    if (u && u.day === currentDay()) return u;
  } catch {}
  return { day: currentDay(), count: 0 };
}

function setUsage(u)  { localStorage.setItem(USAGE_KEY, JSON.stringify(u)); }

function getPlan()   { return localStorage.getItem(PLAN_KEY) || 'free'; }
function setPlan(p)  { localStorage.setItem(PLAN_KEY, p); }

function getLimit()  { return PLANS[getPlan()].limit; }

function recipesLeft() {
  const limit = getLimit();
  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - getUsage().count);
}

function incrementUsage() {
  const u = getUsage();
  u.count++;
  setUsage(u);
}



// ---- Usage pill ----
function renderUsagePill() {
  const pill       = document.getElementById('usagePill');
  const upgradeBtn = document.getElementById('upgradeBtn');
  const plan  = getPlan();
  const limit = getLimit();
  const left  = recipesLeft();

  if (plan === 'premium') {
    pill.className = 'usage-pill pro';
    pill.innerHTML = `<span class="usage-dot"></span> Premium — Unlimited`;
    if (upgradeBtn) { upgradeBtn.textContent = 'Manage Plan'; upgradeBtn.style.display = 'inline-flex'; }
    return;
  }

  pill.className = left <= 1 ? 'usage-pill warn' : 'usage-pill';
  pill.innerHTML = `<span class="usage-dot"></span> ${left} of ${limit} free recipes today`;
  if (upgradeBtn) { upgradeBtn.textContent = 'View Plans ↗'; upgradeBtn.style.display = 'inline-flex'; }
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
  // TODO: Replace with real Stripe Checkout redirect
  // e.g. window.location.href = '/checkout?plan=' + plan;
  // For now: simulate successful upgrade
  setPlan(plan);
  closePaywall();
  renderUsagePill();
  toast(`✨ Welcome to ${PLANS[plan].label}! You're all set.`);
}

// Close on overlay click
document.getElementById('paywallModal').addEventListener('click', function(e) {
  if (e.target === this) closePaywall();
});

// ==============================
// PILL TOGGLE LOGIC
// ==============================
document.querySelectorAll('.pill').forEach(pill => {
  pill.addEventListener('click', () => {
    const group = pill.dataset.group;
    document.querySelectorAll(`.pill[data-group="${group}"]`).forEach(p => p.classList.remove('active'));
    pill.classList.toggle('active');
  });
});

function getActive(group) {
  const el = document.querySelector(`.pill[data-group="${group}"].active`);
  return el ? el.dataset.value : '';
}

// ==============================
// SAVED RECIPES
// ==============================
function getSaved() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; }
  catch { return []; }
}

function setSaved(arr) { localStorage.setItem(SAVED_KEY, JSON.stringify(arr)); }

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
// CURRENT RECIPE STATE
// ==============================
let currentRecipe   = null;
let lastIngredient  = '';

// ==============================
// GENERATE
// ==============================
async function generateRecipe() {
  const ingredient = document.getElementById('ingredient').value.trim();
  if (!ingredient) {
    toast('Please enter an ingredient first!');
    document.getElementById('ingredient').focus();
    return;
  }

  // ---- Paywall check ----
  if (recipesLeft() <= 0) {
    openPaywall();
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
  text.classList.add('hidden');
  loader.classList.remove('hidden');

  await new Promise(r => setTimeout(r, 800 + Math.random() * 600));

  incrementUsage();
  renderUsagePill();

  // Store ingredient and clear input
  lastIngredient = ingredient;
  document.getElementById('ingredient').value = '';
  updateAnotherBtn();

  const recipe = buildRecipe(ingredient, cuisine, dietary, meal, method);



  currentRecipe = recipe;
  renderRecipe(recipe);

  btn.disabled = false;
  text.classList.remove('hidden');
  loader.classList.add('hidden');

  // Nudge on last free recipe
  if (getPlan() === 'free' && recipesLeft() === 0) {
    setTimeout(() => toast("That was your last free recipe today! Upgrade to Premium to keep going 🍽"), 1500);
  }
}

// ==============================
// RENDER RECIPE
// ==============================
function renderRecipe(r) {
  document.getElementById('recipeName').textContent = r.name;

  const badges = document.getElementById('resultBadges');
  badges.innerHTML = '';
  [r.cuisine, r.dietary, r.meal, r.method].filter(Boolean).forEach(val => {
    const b = document.createElement('span');
    b.className = 'badge';
    b.textContent = val;
    badges.appendChild(b);
  });

  document.getElementById('ingredientsList').innerHTML =
    r.ingredients.map(i => `<li>${i}</li>`).join('');
  document.getElementById('instructionsList').innerHTML =
    r.steps.map(s => `<li>${s}</li>`).join('');
  document.getElementById('resultMeta').innerHTML =
    `<span>⏱ ${r.time}</span><span>🍽 Serves ${r.serves}</span><span>📊 ${r.difficulty}</span>`;

  // Nutrition facts — visible to all tiers
  const nutrEl = document.getElementById('nutritionSection');
  const n      = r.nutrition;
  nutrEl.innerHTML = `
    <div class="nutrition-box">
      <p class="nutrition-title">🧑‍🍳 Nutrition per serving <span class="nutrition-est">estimated</span></p>
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
  const ing  = capitalize(ingredient);
  const cui  = cuisine || pick(['Italian','Mediterranean','Asian','American','French']);
  const diet = dietary || '';
  const ml   = meal   || pick(['Lunch','Dinner','Snack']);
  const meth = method || pick(['Baked','Grilled','Sautéed','Roasted']);
  const t    = getTemplate(ing, cui, diet, ml, meth);
  const nutrition = estimateNutrition(ingredient, meth, diet, t.serves);
  return {
    name: t.name, cuisine, dietary, meal, method,
    ingredients: t.ingredients, steps: t.steps,
    time: t.time, serves: t.serves, difficulty: t.difficulty,
    rawIngredient: ingredient, nutrition,
  };
}

function getTemplate(ing, cui, diet, ml, meth) {
  const adj  = pick(['Rustic','Golden','Fresh','Herb-Roasted','Spiced','Zesty','Smoky','Creamy','Simple','Quick']);
  const name = `${adj} ${cuisineStyle(cui)}${ing} ${mealSuffix(ml)}`;
  return {
    name,
    ingredients: [...baseIngredients(ing, cui, diet), ...extraIngredients(meth)],
    steps:       buildSteps(ing, meth),
    time:        cookTime(meth),
    serves:      pick(['2','4','2–4','6']),
    difficulty:  pick(['Easy','Easy','Moderate','Easy']),
  };
}

function baseIngredients(ing, cui, diet) {
  const list = [
    `1–1.5 lbs ${ing}`,
    `2 cloves garlic, minced`,
    `1 medium onion, diced`,
    `2 tbsp olive oil`,
    `Salt & black pepper to taste`,
    pick(['Fresh herbs (parsley, basil, or thyme)', '1 lemon, zested and juiced', 'Red pepper flakes (optional)']),
  ];
  const extras = {
    Italian:'½ cup cherry tomatoes, ¼ cup Parmesan grated'.split(','),
    Mexican:'1 tsp cumin, 1 tsp chili powder, Fresh cilantro'.split(','),
    Asian:'2 tbsp soy sauce, 1 tsp sesame oil, 1 tsp fresh ginger'.split(','),
    Mediterranean:'¼ cup Kalamata olives, 1 tsp dried oregano'.split(','),
    Indian:'1 tsp turmeric, 1 tsp garam masala, 1 can coconut milk'.split(','),
    American:'2 tbsp butter, 1 tsp smoked paprika'.split(','),
    French:'½ cup dry white wine, 1 tbsp Dijon mustard'.split(','),
    Japanese:'2 tbsp miso paste, 1 tbsp mirin, 1 tsp rice vinegar'.split(','),
    Thai:'2 tbsp fish sauce (or soy sauce), 1 tbsp Thai red curry paste, Fresh basil'.split(','),
    Greek:'½ cup feta crumbled, 1 tsp dried oregano, Lemon juice'.split(','),
    'Middle Eastern':'1 tsp cumin, 1 tsp coriander, Fresh mint'.split(','),
  };
  return [...list, ...(extras[cui] || ['Fresh herbs of your choice']).map(s => s.trim())];
}

function extraIngredients(meth) {
  return {
    'Baked':        ['Parchment paper or foil for lining'],
    'Grilled':      ['Oil for grilling'],
    'Steamed':      ['Water or broth for steaming'],
    'Roasted':      ['1 tbsp balsamic vinegar'],
    'Slow Cooked':  ['1 cup vegetable broth', '1 bay leaf'],
    'Air Fried':    ['Cooking spray'],
    'Sautéed':      ['Splash of white wine or broth'],
    'Fried':        ['Oil for frying'],
    'Instant Pot':  ['1 cup broth or water', '1 bay leaf'],
    'Raw / No-Cook':['Drizzle of extra-virgin olive oil'],
  }[meth] || [];
}

function buildSteps(ing, meth) {
  const prep = [
    `Wash and prepare the ${ing.toLowerCase()}. Pat dry if needed.`,
    `Mince the garlic, dice the onion, and measure all ingredients.`,
  ];
  const cook = {
    'Baked':    [`Preheat oven to 400°F (200°C). Line baking dish with parchment.`,`Toss ${ing.toLowerCase()} with oil, garlic, onion, and seasonings.`,`Arrange in a single layer. Add extras on top.`,`Bake 25–35 min until golden at the edges.`,`Finish with fresh herbs or lemon. Adjust seasoning.`],
    'Grilled':  [`Preheat grill or grill pan to medium-high. Brush with oil.`,`Marinate ${ing.toLowerCase()} with oil, garlic, and seasonings 10 min.`,`Grill 4–6 min per side until nicely charred.`,`Rest 5 min before slicing. Finish with herbs or sauce.`],
    'Roasted':  [`Preheat oven to 425°F (220°C).`,`Toss ${ing.toLowerCase()} with oil, garlic, onion, and seasonings on a sheet pan.`,`Spread in a single layer — don't crowd.`,`Roast 25–40 min, tossing halfway, until caramelized.`,`Drizzle with balsamic and a pinch of finishing salt.`],
    'Sautéed':  [`Heat oil in a large skillet over medium-high until shimmering.`,`Add onion, cook 3 min. Add garlic, cook 1 min more.`,`Add ${ing.toLowerCase()}, cook stirring 8–12 min.`,`Deglaze with a splash of wine or broth.`,`Season, finish with herbs, serve immediately.`],
    'Slow Cooked':[`Add ${ing.toLowerCase()}, onion, garlic, and broth to slow cooker.`,`Stir in all seasonings and herbs.`,`Cook on LOW 6–8 hrs or HIGH 3–4 hrs.`,`Taste and adjust seasoning. Remove bay leaf.`,`Serve over rice, bread, or as-is.`],
    'Air Fried':[`Preheat air fryer to 380°F (193°C).`,`Toss ${ing.toLowerCase()} with oil and seasonings.`,`Arrange in a single layer — cook in batches.`,`Air fry 12–18 min, shaking halfway.`,`Finish with herbs and a squeeze of lemon.`],
    'Raw / No-Cook':[`Slice or tear ${ing.toLowerCase()} to desired size.`,`Whisk together oil, lemon juice, garlic, and a pinch of salt.`,`Toss ingredient with dressing and aromatics.`,`Let sit 5–10 min for flavors to meld.`,`Taste, adjust acid and salt, serve fresh.`],
  };
  return [...prep, ...(cook[meth] || cook['Roasted'])];
}

function cuisineStyle(c) {
  return {Italian:'Tuscan ',Mexican:'Baja ',Asian:'Asian-Style ',Mediterranean:'Mediterranean ',
    Indian:'Spiced ',American:'',French:'French ',Japanese:'Japanese-Inspired ',
    Thai:'Thai ',Greek:'Greek ','Middle Eastern':'Levant-Style '}[c] || '';
}

function mealSuffix(m) {
  return {Breakfast:'Bowl',Lunch:'Plate',Dinner:'Dish',Snack:'Bites',
    Appetizer:'Starter',Dessert:'Treat',Soup:'Soup',Salad:'Salad'}[m] || 'Dish';
}

function cookTime(m) {
  return {'Baked':'40 min','Grilled':'25 min','Roasted':'45 min','Sautéed':'20 min',
    'Steamed':'30 min','Slow Cooked':'6–8 hrs','Air Fried':'25 min',
    'Fried':'20 min','Instant Pot':'35 min','Raw / No-Cook':'10 min'}[m] || '30 min';
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }

// ==============================
// SAVE / SHARE
// ==============================
function saveRecipe() {
  if (!currentRecipe) return;
  const saved = getSaved();
  if (saved.some(r => r.name === currentRecipe.name && r.rawIngredient === currentRecipe.rawIngredient)) {
    toast('Already saved!'); return;
  }
  saved.unshift({ ...currentRecipe, savedAt: Date.now() });
  setSaved(saved);
  updateSavedCount();
  toast('Recipe saved! 💾');
  // If the saved panel is already open, refresh it live
  const section = document.getElementById('savedSection');
  if (!section.classList.contains('hidden')) renderSaved();
}

function shareRecipe() {
  if (!currentRecipe) return;
  const text = `🥘 ${currentRecipe.name}\n\n🛒 Ingredients:\n${currentRecipe.ingredients.map(i=>'• '+i).join('\n')}\n\n👩‍🍳 Instructions:\n${currentRecipe.steps.map((s,i)=>(i+1)+'. '+s).join('\n')}\n\n⏱ ${currentRecipe.time} · Serves ${currentRecipe.serves}`;
  if (navigator.share) {
    navigator.share({ title: currentRecipe.name, text }).catch(() => {});
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
  const s = document.getElementById('savedSection');
  if (s.classList.contains('hidden')) {
    renderSaved();
    s.classList.remove('hidden');
    setTimeout(() => s.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  } else {
    s.classList.add('hidden');
  }
}

function renderSaved() {
  const saved = getSaved();
  const list  = document.getElementById('savedList');
  if (!saved.length) {
    list.innerHTML = '<div class="saved-empty">No saved recipes yet. Generate one and tap Save!</div>';
    return;
  }
  list.innerHTML = saved.map((r, i) => `
    <div class="saved-item">
      <div class="saved-item-name">${r.name}</div>
      <div class="saved-item-meta">${[r.cuisine,r.dietary,r.meal,r.method].filter(Boolean).join(' · ') || 'No filters'}</div>
      <div class="saved-item-actions">
        <button onclick="loadSaved(${i})">📖 View</button>
        <button onclick="deleteSaved(${i})">🗑 Delete</button>
      </div>
    </div>
  `).join('');
}

function loadSaved(i) {
  const r = getSaved()[i];
  if (!r) return;
  currentRecipe = r;
  renderRecipe(r);
  document.getElementById('ingredient').value = r.rawIngredient || '';
  document.querySelectorAll('.pill').forEach(p => {
    const key = p.dataset.group;
    p.classList.toggle('active', !!r[key] && r[key] === p.dataset.value);
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
// PDF EXPORT
// ==============================
async function exportPDF() {
  const plan = getPlan();
  if (plan === 'free') {
    openPaywall();
    toast('Upgrade to Pro to export your Recipe Book! 📄');
    return;
  }

  const saved = getSaved();
  if (!saved.length) {
    toast('Save some recipes first!');
    return;
  }

  // Show loading state on button
  const btn = document.querySelector('.btn-export-pdf');
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '⏳ Preparing PDF…';
  btn.disabled = true;

  // Convert all photos to base64 now (fresh, avoids localStorage size issues)
  const base64Map = {};
  // No images to load

  const now = new Date();
  document.getElementById('printDate').textContent =
    now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const container = document.getElementById('printRecipes');
  container.innerHTML = saved.map((r, i) => `
    <div class="print-recipe${i > 0 ? ' print-page-break' : ''}">

      <div class="print-recipe-header">
        <span class="print-recipe-num">${String(i + 1).padStart(2, '0')}</span>
        <h2 class="print-recipe-name">${r.name}</h2>
        <div class="print-recipe-meta">⏱ ${r.time} &bull; Serves ${r.serves} &bull; ${r.difficulty}</div>
        <div class="print-recipe-tags">${[r.cuisine,r.dietary,r.meal,r.method].filter(Boolean).map(t => `<span class="print-tag">${t}</span>`).join('')}</div>
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
        <h3>NUTRITION PER SERVING (ESTIMATED)</h3>
        <div class="print-nutr-row">
          <span><strong>${r.nutrition.cal}</strong> kcal</span>
          <span><strong>${r.nutrition.prot}g</strong> Protein</span>
          <span><strong>${r.nutrition.carb}g</strong> Carbs</span>
          <span><strong>${r.nutrition.fat}g</strong> Fat</span>
          <span><strong>${r.nutrition.fib}g</strong> Fiber</span>
        </div>
      </div>` : ''}
      <p class="print-recipe-footer">Recipe ${i + 1} of ${saved.length} — Created with Recipe Generator ✨</p>
    </div>
  `).join('');

  // Restore button then print
  btn.innerHTML = originalHTML;
  btn.disabled = false;

  window.print();
}


// ==============================
// ANOTHER RECIPE
// ==============================
function generateAnother() {
  if (lastIngredient) document.getElementById('ingredient').value = lastIngredient;
  generateRecipe();
}

function newSearch() {
  document.getElementById('ingredient').value = '';
  document.getElementById('ingredient').focus();
  document.getElementById('ingredient').scrollIntoView({ behavior: 'smooth', block: 'center' });
  // Deselect all pills
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
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
document.getElementById('ingredient').addEventListener('keydown', e => {
  if (e.key === 'Enter') generateRecipe();
});

// ==============================
// INIT
// ==============================
renderUsagePill();
updateSavedCount();
