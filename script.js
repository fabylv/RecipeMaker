/* ===========================
   Recipe Maker — script.js
   =========================== */

// ==============================
// PLAN CONFIG — easy to adjust
// ==============================
const PLANS = {
  free: { label: 'Free',  limit: 5,        period: 'day'  },
  pro:  { label: 'Pro',   limit: Infinity,  period: 'day'  },
  chef: { label: 'Chef',  limit: Infinity,  period: 'day'  },
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
  const pill  = document.getElementById('usagePill');
  const plan  = getPlan();
  const limit = getLimit();
  const left  = recipesLeft();

  if (plan === 'chef') {
    pill.className = 'usage-pill pro';
    pill.innerHTML = `<span class="usage-dot"></span> Chef Plan — Unlimited`;
    return;
  }

  if (plan === 'pro') {
    pill.className = 'usage-pill pro';
    pill.innerHTML = `<span class="usage-dot"></span> Pro Plan — Unlimited`;
    return;
  }

  pill.className = left <= 1 ? 'usage-pill warn' : 'usage-pill';
  pill.innerHTML = `<span class="usage-dot"></span> ${left} of ${limit} free recipes today`;
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
let currentRecipe = null;

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

  // Clear the input after generating
  document.getElementById('ingredient').value = '';

  const recipe = buildRecipe(ingredient, cuisine, dietary, meal, method);
  currentRecipe = recipe;
  renderRecipe(recipe);

  btn.disabled = false;
  text.classList.remove('hidden');
  loader.classList.add('hidden');

  // Nudge on last free recipe
  if (getPlan() === 'free' && recipesLeft() === 0) {
    setTimeout(() => toast("That was your last free recipe today! Upgrade to keep going 🍽"), 1500);
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
  return {
    name: t.name, cuisine, dietary, meal, method,
    ingredients: t.ingredients, steps: t.steps,
    time: t.time, serves: t.serves, difficulty: t.difficulty,
    rawIngredient: ingredient,
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
function exportPDF() {
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
      <p class="print-recipe-footer">Recipe ${i + 1} of ${saved.length} — Created with Recipe Generator ✨</p>
    </div>
  `).join('');

  window.print();
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
