/* ===========================
   Recipe Maker — script.js
   =========================== */

// ---- Storage helpers ----
const STORAGE_KEY = 'recipeMaker_saved';

function getSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function setSaved(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

// ---- State ----
let currentRecipe = null;

// ---- Update saved count badge ----
function updateSavedCount() {
  const count = getSaved().length;
  document.getElementById('savedCount').textContent = count;
}

// ---- Toast ----
function toast(msg) {
  let el = document.getElementById('toastEl');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toastEl';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ---- Recipe generation ----
async function generateRecipe() {
  const ingredient = document.getElementById('ingredient').value.trim();
  if (!ingredient) {
    toast('Please enter an ingredient first!');
    document.getElementById('ingredient').focus();
    return;
  }

  const cuisine  = document.getElementById('cuisine').value;
  const dietary  = document.getElementById('dietary').value;
  const meal     = document.getElementById('meal').value;
  const method   = document.getElementById('method').value;

  // Show loading state
  const btn       = document.getElementById('generateBtn');
  const btnText   = document.getElementById('btnText');
  const btnLoader = document.getElementById('btnLoader');
  btn.disabled    = true;
  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');

  // Simulate brief loading (replace with real API call if desired)
  await new Promise(r => setTimeout(r, 900 + Math.random() * 700));

  const recipe = buildRecipe(ingredient, cuisine, dietary, meal, method);
  currentRecipe = recipe;

  renderRecipe(recipe);

  btn.disabled = false;
  btnText.classList.remove('hidden');
  btnLoader.classList.add('hidden');
}

// ---- Render ----
function renderRecipe(r) {
  document.getElementById('recipeName').textContent = r.name;

  // Badges
  const badges = document.getElementById('resultBadges');
  badges.innerHTML = '';
  [r.cuisine, r.dietary, r.meal, r.method].forEach(val => {
    if (val) {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = val;
      badges.appendChild(b);
    }
  });

  // Ingredients
  document.getElementById('ingredientsList').innerHTML =
    r.ingredients.map(i => `<li>${i}</li>`).join('');

  // Instructions
  document.getElementById('instructionsList').innerHTML =
    r.steps.map(s => `<li>${s}</li>`).join('');

  // Meta
  document.getElementById('resultMeta').innerHTML =
    `<span>⏱ ${r.time}</span><span>🍽 Serves ${r.serves}</span><span>📊 ${r.difficulty}</span>`;

  document.getElementById('result').classList.remove('hidden');
  document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---- Recipe builder (template-based, no API required) ----
function buildRecipe(ingredient, cuisine, dietary, meal, method) {
  const ing = capitalize(ingredient);

  // Resolve defaults
  const cui  = cuisine || pick(['Italian','Mediterranean','Asian','American','French']);
  const diet = dietary || '';
  const ml   = meal    || pick(['Lunch','Dinner','Snack']);
  const meth = method  || pick(['Baked','Grilled','Sautéed','Roasted']);

  const template = getTemplate(ing, cui, diet, ml, meth);

  return {
    name:        template.name,
    cuisine:     cuisine  || '',
    dietary:     dietary  || '',
    meal:        meal     || '',
    method:      method   || '',
    ingredients: template.ingredients,
    steps:       template.steps,
    time:        template.time,
    serves:      template.serves,
    difficulty:  template.difficulty,
    rawIngredient: ingredient,
  };
}

function getTemplate(ing, cui, diet, ml, meth) {
  // Build a contextual recipe name
  const adjective = pick(['Rustic','Golden','Fresh','Herb-Roasted','Spiced','Zesty','Smoky','Creamy','Simple','Quick']);
  const style     = cuisineStyle(cui);
  const name      = `${adjective} ${style}${ing} ${mealSuffix(ml)}`;

  // Build ingredients list
  const base = baseIngredients(ing, cui, diet);
  const extras = extraIngredients(meth, diet);

  // Build steps
  const steps = buildSteps(ing, meth, cui, diet);

  return {
    name,
    ingredients: [...base, ...extras],
    steps,
    time:        cookTime(meth),
    serves:      pick(['2','4','2–4','6']),
    difficulty:  pick(['Easy','Easy','Moderate','Easy']),
  };
}

// ---- Ingredient builder ----
function baseIngredients(ing, cui, diet) {
  const list = [
    `1–1.5 lbs ${ing}`,
    `2 cloves garlic, minced`,
    `1 medium onion, diced`,
    `2 tbsp olive oil`,
    `Salt & black pepper to taste`,
  ];

  if (!diet.toLowerCase().includes('dairy')) {
    list.push(pick([
      'Fresh herbs (parsley, basil, or thyme)',
      '1 lemon, zested and juiced',
      'Red pepper flakes (optional)',
    ]));
  }

  // Cuisine-specific additions
  const cuiExtras = {
    Italian:        ['½ cup cherry tomatoes', '¼ cup Parmesan, grated'],
    Mexican:        ['1 tsp cumin', '1 tsp chili powder', 'Fresh cilantro'],
    Asian:          ['2 tbsp soy sauce', '1 tsp sesame oil', '1 tsp fresh ginger'],
    Mediterranean:  ['¼ cup Kalamata olives', '1 tsp dried oregano'],
    Indian:         ['1 tsp turmeric', '1 tsp garam masala', '1 can coconut milk'],
    American:       ['2 tbsp butter', '1 tsp smoked paprika'],
    French:         ['½ cup dry white wine', '1 tbsp Dijon mustard'],
    Japanese:       ['2 tbsp miso paste', '1 tbsp mirin', '1 tsp rice vinegar'],
    Thai:           ['2 tbsp fish sauce (or soy sauce)', '1 tbsp Thai red curry paste', 'Fresh basil'],
    Greek:          ['½ cup feta, crumbled', '1 tsp dried oregano', 'Lemon juice'],
    'Middle Eastern': ['1 tsp cumin', '1 tsp coriander', 'Fresh mint'],
  };

  return [...list, ...(cuiExtras[cui] || ['Fresh herbs of your choice'])];
}

function extraIngredients(meth, diet) {
  const map = {
    'Baked':       ['Parchment paper or foil for lining'],
    'Grilled':     ['Oil for grilling'],
    'Steamed':     ['Water or broth for steaming'],
    'Roasted':     ['1 tbsp balsamic vinegar'],
    'Slow Cooked': ['1 cup vegetable broth', '1 bay leaf'],
    'Air Fried':   ['Cooking spray'],
    'Sautéed':     ['Splash of white wine or broth'],
    'Fried':       ['Oil for frying (vegetable or avocado)'],
    'Instant Pot': ['1 cup broth or water', '1 bay leaf'],
    'Raw / No-Cook':['Drizzle of extra-virgin olive oil'],
  };
  return map[meth] || [];
}

// ---- Steps builder ----
function buildSteps(ing, meth, cui, diet) {
  const prep = [
    `Wash and prepare the ${ing.toLowerCase()}. Pat dry if needed.`,
    `Mince the garlic, dice the onion, and have all your ingredients measured and ready.`,
  ];

  const cookMap = {
    'Baked': [
      `Preheat your oven to 400°F (200°C). Line a baking dish with parchment or lightly oil it.`,
      `Toss the ${ing.toLowerCase()} with olive oil, garlic, onion, and your chosen seasonings.`,
      `Arrange in a single layer in the baking dish. Add any cuisine-specific extras on top.`,
      `Bake for 25–35 minutes until cooked through and golden at the edges.`,
      `Finish with fresh herbs or a squeeze of lemon. Taste and adjust seasoning.`,
    ],
    'Grilled': [
      `Preheat your grill or grill pan to medium-high. Brush with a little oil.`,
      `Marinate the ${ing.toLowerCase()} with oil, garlic, and seasonings for at least 10 minutes.`,
      `Grill for 4–6 minutes per side, depending on thickness, until nicely charred.`,
      `Let rest for 5 minutes before slicing. Add fresh herbs or sauce to finish.`,
    ],
    'Roasted': [
      `Preheat oven to 425°F (220°C).`,
      `Toss the ${ing.toLowerCase()} with olive oil, garlic, onion, and seasonings on a sheet pan.`,
      `Spread in a single layer — don't crowd the pan for better caramelization.`,
      `Roast 25–40 minutes, tossing once halfway, until tender and caramelized.`,
      `Drizzle with balsamic and a finishing pinch of salt. Serve warm.`,
    ],
    'Sautéed': [
      `Heat olive oil in a large skillet over medium-high heat until shimmering.`,
      `Add onion and cook 3 minutes until softened. Add garlic and cook 1 minute more.`,
      `Add the ${ing.toLowerCase()} and cook, stirring occasionally, for 8–12 minutes.`,
      `Deglaze the pan with a splash of wine or broth if desired.`,
      `Season generously, finish with herbs, and serve immediately.`,
    ],
    'Steamed': [
      `Fill a pot with 1–2 inches of water (or broth) and bring to a gentle boil.`,
      `Place the ${ing.toLowerCase()} in a steamer basket. Season lightly.`,
      `Steam for 10–20 minutes until tender but not mushy.`,
      `Meanwhile, warm olive oil with garlic and aromatics in a small pan to make a quick sauce.`,
      `Plate and drizzle the garlic oil or sauce over the top. Season to taste.`,
    ],
    'Slow Cooked': [
      `Add the ${ing.toLowerCase()}, onion, garlic, and broth to your slow cooker.`,
      `Stir in seasonings, herbs, and any cuisine-specific spices.`,
      `Cook on LOW for 6–8 hours or HIGH for 3–4 hours.`,
      `Taste and adjust seasoning near the end. Remove bay leaf if used.`,
      `Serve over rice, crusty bread, or as-is.`,
    ],
    'Air Fried': [
      `Preheat air fryer to 380°F (193°C).`,
      `Toss the ${ing.toLowerCase()} with oil and seasonings in a bowl.`,
      `Arrange in the air fryer basket in a single layer — cook in batches if needed.`,
      `Air fry for 12–18 minutes, shaking halfway through, until crisp and cooked through.`,
      `Finish with fresh herbs and a squeeze of lemon.`,
    ],
    'Fried': [
      `Heat about 2 inches of oil in a deep pan to 350°F (175°C).`,
      `Season the ${ing.toLowerCase()} and prepare a light coating if desired (flour, breadcrumbs).`,
      `Fry in batches for 4–6 minutes until golden and cooked through. Don't overcrowd.`,
      `Drain on paper towels and season immediately with salt.`,
      `Serve hot with your favorite dipping sauce.`,
    ],
    'Instant Pot': [
      `Set Instant Pot to Sauté mode. Add oil and cook onion and garlic for 3 minutes.`,
      `Add ${ing.toLowerCase()}, broth, and all seasonings. Stir to combine.`,
      `Lock the lid. Cook on High Pressure for 15–20 minutes.`,
      `Allow natural pressure release for 10 minutes, then quick-release remaining pressure.`,
      `Taste, adjust seasoning, and serve.`,
    ],
    'Raw / No-Cook': [
      `Slice or tear the ${ing.toLowerCase()} into your desired size.`,
      `Whisk together olive oil, lemon juice, garlic, and a pinch of salt for a quick dressing.`,
      `Toss the ingredient with the dressing and any aromatics or extras.`,
      `Let sit 5–10 minutes for flavors to meld.`,
      `Taste, adjust acid and salt, and serve fresh.`,
    ],
  };

  const cookSteps = cookMap[meth] || cookMap['Roasted'];
  return [...prep, ...cookSteps];
}

// ---- Helper functions ----
function cuisineStyle(cui) {
  const map = {
    Italian: 'Tuscan ', Mexican: 'Baja ', Asian: 'Asian-Style ',
    Mediterranean: 'Mediterranean ', Indian: 'Spiced ', American: '',
    French: 'French ', Japanese: 'Japanese-Inspired ', Thai: 'Thai ',
    Greek: 'Greek ', 'Middle Eastern': 'Levant-Style ',
  };
  return map[cui] || '';
}

function mealSuffix(ml) {
  const map = {
    Breakfast: 'Bowl', Lunch: 'Plate', Dinner: 'Dish',
    Snack: 'Bites', Appetizer: 'Starter', Dessert: 'Treat',
    Soup: 'Soup', Salad: 'Salad',
  };
  return map[ml] || 'Dish';
}

function cookTime(meth) {
  const map = {
    'Baked': '40 min', 'Grilled': '25 min', 'Roasted': '45 min',
    'Sautéed': '20 min', 'Steamed': '30 min', 'Slow Cooked': '6–8 hrs',
    'Air Fried': '25 min', 'Fried': '20 min', 'Instant Pot': '35 min',
    'Raw / No-Cook': '10 min',
  };
  return map[meth] || '30 min';
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ---- Save ----
function saveRecipe() {
  if (!currentRecipe) return;
  const saved = getSaved();
  const exists = saved.some(r =>
    r.name === currentRecipe.name && r.rawIngredient === currentRecipe.rawIngredient
  );
  if (exists) { toast('Already saved!'); return; }
  saved.unshift({ ...currentRecipe, savedAt: Date.now() });
  setSaved(saved);
  updateSavedCount();
  toast('Recipe saved! 💾');
}

// ---- Toggle saved panel ----
function toggleSaved() {
  const section = document.getElementById('savedSection');
  const isHidden = section.classList.contains('hidden');
  if (isHidden) {
    renderSaved();
    section.classList.remove('hidden');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    section.classList.add('hidden');
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
      <div class="saved-item-meta">
        ${[r.cuisine, r.dietary, r.meal, r.method].filter(Boolean).join(' · ') || 'No filters'}
      </div>
      <div class="saved-item-actions">
        <button onclick="loadSaved(${i})">📖 View</button>
        <button onclick="deleteSaved(${i})">🗑 Delete</button>
      </div>
    </div>
  `).join('');
}

function loadSaved(index) {
  const saved = getSaved();
  const r = saved[index];
  if (!r) return;
  currentRecipe = r;
  renderRecipe(r);
  // Restore filter UI
  ['cuisine','dietary','meal','method'].forEach(key => {
    const el = document.getElementById(key);
    if (el && r[key]) el.value = r[key];
  });
  document.getElementById('ingredient').value = r.rawIngredient || '';
  toggleSaved();
}

function deleteSaved(index) {
  const saved = getSaved();
  saved.splice(index, 1);
  setSaved(saved);
  updateSavedCount();
  renderSaved();
  toast('Recipe deleted');
}

// ---- Share ----
function shareRecipe() {
  if (!currentRecipe) return;
  const text = `🥘 ${currentRecipe.name}\n\n🛒 Ingredients:\n${currentRecipe.ingredients.map(i => '• ' + i).join('\n')}\n\n👩‍🍳 Instructions:\n${currentRecipe.steps.map((s,i) => (i+1)+'. '+s).join('\n')}\n\n⏱ ${currentRecipe.time} · Serves ${currentRecipe.serves}`;
  if (navigator.share) {
    navigator.share({ title: currentRecipe.name, text }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard! 📋'));
  } else {
    toast('Sharing not supported on this browser');
  }
}

// ---- Enter key on ingredient ----
document.getElementById('ingredient').addEventListener('keydown', e => {
  if (e.key === 'Enter') generateRecipe();
});

// ---- Init ----
updateSavedCount();
