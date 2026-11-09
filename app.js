import { POKEMON_DATA, MOVES_DATA, ABILITIES_DATA, ITEMS_DATA } from './data/pokemon-data.js';
import { LEARNSETS_DATA } from './data/learnsets-data.js';

export const DONATION_CONFIG = {
  paypalUrl: 'https://www.paypal.biz/famousnamegames',
  kofiUrl: '', // Optional: e.g. 'https://ko-fi.com/famousnamegames'
};

const ALL_TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
];

const TYPE_COLORS = {
  Normal: '#9ca3af',
  Fire: '#ef4444',
  Water: '#3b82f6',
  Electric: '#eab308',
  Grass: '#22c55e',
  Ice: '#06b6d4',
  Fighting: '#c2410c',
  Poison: '#a855f7',
  Ground: '#d97706',
  Flying: '#6366f1',
  Psychic: '#ec4899',
  Bug: '#84cc16',
  Rock: '#b45309',
  Ghost: '#7c3aed',
  Dragon: '#4f46e5',
  Dark: '#475569',
  Steel: '#64748b',
  Fairy: '#f472b6',
};

const SITE_LABELS = {
  pokemondb: 'PokémonDB',
  bulbapedia: 'Bulbapedia',
  serebii: 'Serebii',
  smogon: 'Smogon',
};

const GAME_GEN_MAP = {
  rby: 1,
  gsc: 2,
  rse: 3,
  frlg: 3,
  dppt: 4,
  hgss: 4,
  bw: 5,
  xy: 6,
  oras: 6,
  sm: 7,
  lgpe: 7,
  swsh: 8,
  bdsp: 8,
  pla: 8,
  sv: 9,
  lza: 9,
};

// ============================================================================
// State
// ============================================================================
const state = {
  activePage: 'scrambler', // 'scrambler' | 'lettermon'
  settingsOpen: false,

  filters: {
    generations: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    excludeLegendaries: false,
    excludeMythics: false,
    maxBst: 780,
    game: 'all',
    // Advanced Settings
    minBst: 175,
    types: new Set(ALL_TYPES),
    includeForms: false,
    allowNatDexGame: false,
    padMode: 'pad4', // Default: 4-digit padded (123 -> 0123 so 1023 is included)
    infoSite: 'pokemondb',
  },

  scrambler: {
    query: '123',
  },

  lettermon: {
    rawName: 'Garchomp',
    selectedPokemon: null,
    activeLetterIndex: null, // null = All unique letters
    learnableOnly: false,
    subFilter: '',
    expandedColumns: new Set(),
  },
};

// Index Pokemon by Dex number and lowercase name
const pokemonByNum = new Map();
const pokemonByName = new Map();
for (const p of POKEMON_DATA) {
  if (!pokemonByNum.has(p.num)) pokemonByNum.set(p.num, []);
  pokemonByNum.get(p.num).push(p);
  pokemonByName.set(p.name.toLowerCase(), p);
}

// Index Moves, Abilities, Items by first letter A-Z
const movesByLetter = new Map();
const abilitiesByLetter = new Map();
const itemsByLetter = new Map();
for (let c = 65; c <= 90; c++) {
  const ch = String.fromCharCode(c);
  movesByLetter.set(ch, []);
  abilitiesByLetter.set(ch, []);
  itemsByLetter.set(ch, []);
}
for (const m of MOVES_DATA) {
  if (movesByLetter.has(m.letter)) movesByLetter.get(m.letter).push(m);
}
for (const a of ABILITIES_DATA) {
  if (abilitiesByLetter.has(a.letter)) abilitiesByLetter.get(a.letter).push(a);
}
const seenItemIds = new Set();
for (const it of ITEMS_DATA) {
  if (seenItemIds.has(it.id)) continue;
  seenItemIds.add(it.id);
  if (itemsByLetter.has(it.letter)) itemsByLetter.get(it.letter).push(it);
}

// ============================================================================
// Helpers
// ============================================================================
function getSpriteUrl(poke) {
  if (poke.isForme) {
    return `https://play.pokemonshowdown.com/sprites/dex/${poke.spriteId}.png`;
  }
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${poke.num}.png`;
}

function getFallbackSpriteUrl(poke) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.num}.png`;
}

function getPokemonInfoUrl(poke) {
  const site = state.filters.infoSite;
  const base = poke.baseName || poke.name;
  if (site === 'bulbapedia') {
    return `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(base.replace(/ /g, '_'))}_(Pok%C3%A9mon)`;
  }
  if (site === 'serebii') {
    const slug = base.toLowerCase().replace(/♀/g, 'f').replace(/♂/g, 'm').replace(/é/g, 'e').replace(/[^a-z0-9]/g, '');
    return `https://www.serebii.net/pokemon/${slug}/`;
  }
  if (site === 'smogon') {
    const slug = poke.name.toLowerCase().replace(/♀/g, '-f').replace(/♂/g, '-m').replace(/é/g, 'e').replace(/['’.]/g, '').replace(/[^a-z0-9-]+/g, '-');
    return `https://www.smogon.com/dex/sv/pokemon/${slug}/`;
  }
  const slug = base.toLowerCase().replace(/♀/g, '-f').replace(/♂/g, '-m').replace(/é/g, 'e').replace(/['’.]/g, '').replace(/\s+/g, '-');
  return `https://pokemondb.net/pokedex/${slug}`;
}

function findPokemonByInput(nameStr) {
  const clean = nameStr.trim().replace(/\s*\(#\d+\)\s*$/, '').toLowerCase();
  if (!clean) return null;
  if (pokemonByName.has(clean)) return pokemonByName.get(clean);
  const idClean = clean.replace(/[^a-z0-9]/g, '');
  if (!idClean) return null;
  return POKEMON_DATA.find(p => p.id === idClean) || null;
}

function passesGlobalFilters(poke) {
  const f = state.filters;

  if (poke.isForme && !f.includeForms) return false;
  if (!f.generations.has(poke.gen)) return false;
  if (poke.bst > f.maxBst || poke.bst < f.minBst) return false;

  if (f.excludeLegendaries && (poke.status === 'Legendary' || poke.status === 'Sub-Legendary')) {
    return false;
  }
  if (f.excludeMythics && poke.status === 'Mythical') {
    return false;
  }

  if (f.game !== 'all') {
    const allowedPool = f.allowNatDexGame ? poke.natGames : poke.regGames;
    if (!allowedPool.includes(f.game)) {
      return false;
    }
  }

  if (!poke.types.some(t => f.types.has(t))) return false;

  return true;
}

function countActiveFilters() {
  const f = state.filters;
  let count = 0;
  if (f.generations.size < 9) count++;
  if (f.excludeLegendaries) count++;
  if (f.excludeMythics) count++;
  if (f.maxBst < 780) count++;
  if (f.minBst > 175) count++;
  if (f.game !== 'all') count++;
  if (f.types.size < 18) count++;
  if (f.includeForms) count++;
  if (f.allowNatDexGame) count++;
  return count;
}

function updateFilterSummaryUI() {
  const activeCount = countActiveFilters();
  const badge = document.getElementById('active-filter-count');
  badge.textContent = String(activeCount);
  badge.hidden = activeCount === 0;

  const eligible = POKEMON_DATA.filter(passesGlobalFilters).length;
  document.getElementById('settings-pool-readout').textContent = `${eligible.toLocaleString()} Pokémon eligible`;
}

// ============================================================================
// Page 1: Pokédex Scrambler (4-Digit Padded Permutations by Default)
// ============================================================================
function resolveScramblerInput(rawQuery) {
  const trimmed = rawQuery.trim();
  if (!trimmed) return { digitsToPermute: '', sourcePokemon: null };

  // 1. Check if the input matches a Pokemon name first (e.g. "Porygon2", "Mudkip", "Scyther (#0123)")
  const byName = findPokemonByInput(trimmed);
  if (byName) {
    return {
      digitsToPermute: formatDigitsForScramble(String(byName.num)),
      sourcePokemon: byName,
    };
  }

  // 2. Otherwise extract numeric digits
  const rawDigits = trimmed.replace(/\D/g, '').slice(0, 6);
  if (!rawDigits) return { digitsToPermute: '', sourcePokemon: null };

  const numericVal = parseInt(rawDigits, 10);
  const exactPoke = (numericVal >= 1 && numericVal <= 1025) ? (pokemonByNum.get(numericVal) || [])[0] : null;

  return {
    digitsToPermute: formatDigitsForScramble(rawDigits),
    sourcePokemon: exactPoke || null,
  };
}

function formatDigitsForScramble(rawDigits) {
  const mode = state.filters.padMode;
  if (mode === 'pad4' && rawDigits.length < 4) {
    return rawDigits.padStart(4, '0');
  }
  if (mode === 'pad3' && rawDigits.length < 3) {
    return rawDigits.padStart(3, '0');
  }
  return rawDigits;
}

function getUniquePermutations(digitsStr) {
  if (!digitsStr) return [];
  const chars = digitsStr.split('').sort();
  const used = new Array(chars.length).fill(false);
  const results = [];

  function backtrack(current) {
    if (current.length === chars.length) {
      results.push(current.join(''));
      return;
    }
    for (let i = 0; i < chars.length; i++) {
      if (used[i]) continue;
      if (i > 0 && chars[i] === chars[i - 1] && !used[i - 1]) continue;
      used[i] = true;
      current.push(chars[i]);
      backtrack(current);
      current.pop();
      used[i] = false;
    }
  }

  backtrack([]);
  return results;
}

function renderScramblerPage() {
  const { digitsToPermute, sourcePokemon } = resolveScramblerInput(state.scrambler.query);
  const allPerms = getUniquePermutations(digitsToPermute);

  const metaEl = document.getElementById('scrambler-meta');
  const gridEl = document.getElementById('scrambler-results');
  metaEl.replaceChildren();
  gridEl.replaceChildren();

  if (allPerms.length === 0) {
    metaEl.textContent = 'Enter a Pokédex number (e.g. 123, 258, 493) or Pokémon name above.';
    return;
  }

  // Filter permutations to valid National Pokedex range (1..1025), deduplicating by numeric Dex #
  const seenDexNums = new Set();
  const validDexPerms = [];

  for (const permStr of allPerms) {
    const dexNum = parseInt(permStr, 10);
    if (dexNum >= 1 && dexNum <= 1025 && !seenDexNums.has(dexNum)) {
      seenDexNums.add(dexNum);
      validDexPerms.push({ permStr, dexNum });
    }
  }

  const matchedCards = [];
  const pillsWrap = document.createElement('div');
  pillsWrap.className = 'perm-pills-inline';

  for (const { permStr, dexNum } of validDexPerms) {
    const candidates = pokemonByNum.get(dexNum) || [];
    const passing = candidates.filter(passesGlobalFilters);

    const tag = document.createElement('span');
    tag.className = 'perm-tag';
    if (passing.length === 0) {
      tag.classList.add('is-filtered');
      tag.title = `Filtered out (#${dexNum} ${candidates[0]?.name || ''})`;
    } else {
      tag.title = `#${dexNum} ${passing[0].name}`;
    }
    tag.textContent = `${permStr} (#${dexNum})`;
    pillsWrap.appendChild(tag);

    for (const poke of passing) {
      matchedCards.push({ permStr, poke });
    }
  }

  const summaryText = document.createElement('span');
  const sourceLabel = sourcePokemon ? ` (#${String(sourcePokemon.num).padStart(4, '0')} ${sourcePokemon.name})` : '';
  summaryText.textContent = `Scrambling "${digitsToPermute}"${sourceLabel} — ${matchedCards.length} Pokémon from ${validDexPerms.length} valid Dex permutations:`;
  metaEl.append(summaryText, pillsWrap);

  if (matchedCards.length === 0) {
    const emptyP = document.createElement('p');
    emptyP.style.color = 'var(--text-muted)';
    emptyP.textContent = validDexPerms.length === 0
      ? `None of the permutations of "${digitsToPermute}" fall within Pokédex #1–1025.`
      : `All ${validDexPerms.length} Pokédex permutations of "${digitsToPermute}" are excluded by your active filters.`;
    gridEl.appendChild(emptyP);
    return;
  }

  const frag = document.createDocumentFragment();
  for (const { permStr, poke } of matchedCards) {
    frag.appendChild(buildPokemonCard(permStr, poke));
  }
  gridEl.appendChild(frag);
}

function buildPokemonCard(permStr, poke) {
  const article = document.createElement('article');
  article.className = 'poke-card';

  const img = document.createElement('img');
  img.src = getSpriteUrl(poke);
  img.alt = poke.name;
  img.width = 72;
  img.height = 72;
  img.loading = 'lazy';
  img.addEventListener('error', () => {
    const fb = getFallbackSpriteUrl(poke);
    if (img.src !== fb) img.src = fb;
  }, { once: true });

  const header = document.createElement('header');

  const metaTop = document.createElement('div');
  metaTop.className = 'poke-meta-top';
  const numSpan = document.createElement('span');
  numSpan.textContent = `#${String(poke.num).padStart(4, '0')}`;
  const permSpan = document.createElement('span');
  permSpan.textContent = `Gen ${poke.gen}`;
  metaTop.append(numSpan, permSpan);

  const h3 = document.createElement('h3');
  const link = document.createElement('a');
  link.href = getPokemonInfoUrl(poke);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = poke.name;
  h3.appendChild(link);

  const typeRow = document.createElement('div');
  typeRow.className = 'type-row';
  for (const t of poke.types) {
    const badge = document.createElement('span');
    badge.className = 'type-badge';
    badge.style.setProperty('--type-bg', TYPE_COLORS[t] || '#64748b');
    badge.textContent = t;
    typeRow.appendChild(badge);
  }

  header.append(metaTop, h3, typeRow);

  const footer = document.createElement('footer');
  const bstSpan = document.createElement('span');
  bstSpan.className = 'bst-tag';
  bstSpan.textContent = `BST ${poke.bst}`;

  const infoLink = document.createElement('a');
  infoLink.className = 'info-link';
  infoLink.href = getPokemonInfoUrl(poke);
  infoLink.target = '_blank';
  infoLink.rel = 'noopener noreferrer';
  infoLink.textContent = `${SITE_LABELS[state.filters.infoSite]} ↗`;
  const srName = document.createElement('span');
  srName.className = 'visually-hidden';
  srName.textContent = ` (${poke.name})`;
  infoLink.appendChild(srName);

  footer.append(bstSpan, infoLink);
  article.append(img, header, footer);
  return article;
}

// ============================================================================
// Page 2: Lettermon Builder (Moves, Abilities & Items per Letter)
// ============================================================================
function renderLettermonPage() {
  const rawName = state.lettermon.rawName.trim() || 'Garchomp';
  const matchedPoke = state.lettermon.selectedPokemon || findPokemonByInput(rawName);
  state.lettermon.selectedPokemon = matchedPoke;

  const pokeBar = document.getElementById('lettermon-pokemon-bar');
  const learnableCheck = document.getElementById('lettermon-learnable-only');
  pokeBar.replaceChildren();

  if (matchedPoke) {
    pokeBar.hidden = false;
    learnableCheck.disabled = false;

    const left = document.createElement('div');
    left.className = 'selected-poke-info';

    const img = document.createElement('img');
    img.src = getSpriteUrl(matchedPoke);
    img.alt = matchedPoke.name;
    img.width = 48;
    img.height = 48;

    const textDiv = document.createElement('div');
    const title = document.createElement('strong');
    const passes = passesGlobalFilters(matchedPoke);
    title.textContent = `${matchedPoke.name} (#${String(matchedPoke.num).padStart(4, '0')})${passes ? '' : ' [Filtered by current settings]'}`;
    const sub = document.createElement('div');
    sub.style.fontSize = '0.8rem';
    sub.style.color = 'var(--text-muted)';
    sub.textContent = `${matchedPoke.types.join(' / ')} • BST ${matchedPoke.bst} • Abilities: ${matchedPoke.abilities.join(', ')}`;
    textDiv.append(title, sub);
    left.append(img, textDiv);

    const extLink = document.createElement('a');
    extLink.className = 'info-link';
    extLink.href = getPokemonInfoUrl(matchedPoke);
    extLink.target = '_blank';
    extLink.rel = 'noopener noreferrer';
    extLink.textContent = `View on ${SITE_LABELS[state.filters.infoSite]} ↗`;

    pokeBar.append(left, extLink);
  } else {
    pokeBar.hidden = true;
    learnableCheck.disabled = true;
  }

  // Extract letters A-Z and group positions for duplicate letters when in "All" view
  const letters = [];
  for (const ch of rawName.toUpperCase()) {
    if (ch >= 'A' && ch <= 'Z') letters.push(ch);
  }

  // Render Letter Navigation Pills
  const navEl = document.getElementById('letter-nav-pills');
  navEl.replaceChildren();

  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'letter-pill-btn';
  if (state.lettermon.activeLetterIndex === null) allBtn.classList.add('is-active');
  allBtn.textContent = `All (${letters.length})`;
  allBtn.addEventListener('click', () => {
    state.lettermon.activeLetterIndex = null;
    renderLettermonPage();
  });
  navEl.appendChild(allBtn);

  letters.forEach((letter, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'letter-pill-btn';
    if (state.lettermon.activeLetterIndex === idx) btn.classList.add('is-active');
    btn.textContent = letter;
    btn.addEventListener('click', () => {
      state.lettermon.activeLetterIndex = state.lettermon.activeLetterIndex === idx ? null : idx;
      renderLettermonPage();
    });
    navEl.appendChild(btn);
  });

  // Build list of letter groups to render (deduplicate identical letters in "All" view to prevent duplicate bloat)
  const letterGroups = [];
  if (state.lettermon.activeLetterIndex !== null) {
    const idx = state.lettermon.activeLetterIndex;
    if (letters[idx]) {
      letterGroups.push({ letter: letters[idx], positions: [idx + 1] });
    }
  } else {
    const mapByLetter = new Map();
    letters.forEach((ch, idx) => {
      if (!mapByLetter.has(ch)) {
        const group = { letter: ch, positions: [] };
        mapByLetter.set(ch, group);
        letterGroups.push(group);
      }
      mapByLetter.get(ch).positions.push(idx + 1);
    });
  }

  // Render Letter Cards
  const resultsEl = document.getElementById('lettermon-results');
  resultsEl.replaceChildren();

  const learnsetSet = (state.lettermon.learnableOnly && matchedPoke && LEARNSETS_DATA[matchedPoke.id])
    ? new Set(LEARNSETS_DATA[matchedPoke.id])
    : null;
  const pokeAbilitiesSet = (state.lettermon.learnableOnly && matchedPoke)
    ? new Set(matchedPoke.abilities.map(a => a.toLowerCase()))
    : null;
  const maxGameGen = state.filters.game !== 'all' ? (GAME_GEN_MAP[state.filters.game] || 9) : 9;
  const q = state.lettermon.subFilter.trim().toLowerCase();

  const frag = document.createDocumentFragment();

  letterGroups.forEach(({ letter, positions }, renderIdx) => {
    const moves = (movesByLetter.get(letter) || []).filter(m => {
      if (learnsetSet && !learnsetSet.has(m.id)) return false;
      if (!state.filters.generations.has(m.gen) || m.gen > maxGameGen) return false;
      if (!state.filters.types.has(m.type)) return false;
      if (q && !`${m.name} ${m.type} ${m.category} ${m.desc}`.toLowerCase().includes(q)) return false;
      return true;
    });

    const abilities = (abilitiesByLetter.get(letter) || []).filter(a => {
      if (maxGameGen < 3) return false; // Abilities introduced in Gen 3
      if (pokeAbilitiesSet && !pokeAbilitiesSet.has(a.name.toLowerCase())) return false;
      if (!state.filters.generations.has(a.gen) || a.gen > maxGameGen) return false;
      if (q && !`${a.name} ${a.desc}`.toLowerCase().includes(q)) return false;
      return true;
    });

    const items = (itemsByLetter.get(letter) || []).filter(it => {
      if (!state.filters.generations.has(it.gen) || it.gen > maxGameGen) return false;
      if (q && !`${it.name} ${it.category} ${it.desc}`.toLowerCase().includes(q)) return false;
      return true;
    });

    const card = document.createElement('section');
    card.className = 'letter-card';
    if (renderIdx >= 2) {
      card.classList.add('letter-card-deferred');
    }

    const header = document.createElement('div');
    header.className = 'letter-card-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'letter-card-title';

    const badge = document.createElement('span');
    badge.className = 'letter-badge';
    badge.textContent = letter;

    const h3 = document.createElement('h3');
    h3.textContent = `${moves.length} Attacks • ${abilities.length} Abilities • ${items.length} Items`;

    titleWrap.append(badge, h3);

    const posTag = document.createElement('span');
    posTag.className = 'letter-pos-tag';
    posTag.textContent = positions.length > 1
      ? `Letters #${positions.join(', #')} in "${rawName.toUpperCase()}"`
      : `Letter #${positions[0]} in "${rawName.toUpperCase()}"`;

    header.append(titleWrap, posTag);

    const cols = document.createElement('div');
    cols.className = 'letter-columns';

    const isSingleLetterView = state.lettermon.activeLetterIndex !== null;

    // Column 1: Attacks
    cols.appendChild(buildLetterCategoryBox(`${letter}-moves`, 'Attacks', moves, isSingleLetterView, (m) => {
      const li = document.createElement('li');
      li.className = 'item-row';
      const top = document.createElement('div');
      top.className = 'item-row-top';
      const nameSpan = document.createElement('span');
      nameSpan.textContent = m.name;
      const typeBadge = document.createElement('span');
      typeBadge.className = 'type-badge';
      typeBadge.style.setProperty('--type-bg', TYPE_COLORS[m.type] || '#64748b');
      typeBadge.textContent = m.type;
      top.append(nameSpan, typeBadge);

      const sub = document.createElement('div');
      sub.className = 'item-row-sub';
      const bp = m.power > 0 ? `${m.power} BP` : 'Status';
      sub.textContent = `${m.category} • ${bp} • ${m.desc}`;
      li.append(top, sub);
      return li;
    }));

    // Column 2: Abilities
    cols.appendChild(buildLetterCategoryBox(`${letter}-abilities`, 'Abilities', abilities, isSingleLetterView, (a) => {
      const li = document.createElement('li');
      li.className = 'item-row';
      const top = document.createElement('div');
      top.className = 'item-row-top';
      const nameSpan = document.createElement('span');
      nameSpan.textContent = a.name;
      top.appendChild(nameSpan);

      const sub = document.createElement('div');
      sub.className = 'item-row-sub';
      sub.textContent = a.desc;
      li.append(top, sub);
      return li;
    }));

    // Column 3: Items
    cols.appendChild(buildLetterCategoryBox(`${letter}-items`, 'Items', items, isSingleLetterView, (it) => {
      const li = document.createElement('li');
      li.className = 'item-row';
      const top = document.createElement('div');
      top.className = 'item-row-top';
      const nameSpan = document.createElement('span');
      nameSpan.textContent = it.name;
      top.appendChild(nameSpan);

      const sub = document.createElement('div');
      sub.className = 'item-row-sub';
      sub.textContent = `${it.category} — ${it.desc}`;
      li.append(top, sub);
      return li;
    }));

    card.append(header, cols);
    frag.appendChild(card);
  });

  resultsEl.appendChild(frag);
}

function buildLetterCategoryBox(colKey, title, items, forceExpand, renderItem) {
  const box = document.createElement('div');
  box.className = 'category-box';

  const header = document.createElement('div');
  header.className = 'category-box-title';
  const titleSpan = document.createElement('span');
  titleSpan.textContent = title;
  const countSpan = document.createElement('span');
  countSpan.textContent = String(items.length);
  header.append(titleSpan, countSpan);
  box.appendChild(header);

  const ul = document.createElement('ul');
  ul.className = 'category-list';

  const INITIAL_LIMIT = 8;
  const isExpanded = forceExpand || state.lettermon.expandedColumns.has(colKey);
  const visibleItems = isExpanded ? items : items.slice(0, INITIAL_LIMIT);

  if (items.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'item-row';
    empty.style.color = 'var(--text-muted)';
    empty.textContent = 'None matching filters';
    ul.appendChild(empty);
  } else {
    for (const item of visibleItems) {
      ul.appendChild(renderItem(item));
    }
  }

  box.appendChild(ul);

  if (!forceExpand && items.length > INITIAL_LIMIT) {
    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'show-more-btn';
    moreBtn.textContent = isExpanded
      ? 'Show fewer'
      : `Show all ${items.length} ${title.toLowerCase()} (+${items.length - INITIAL_LIMIT} more)`;
    moreBtn.addEventListener('click', () => {
      if (state.lettermon.expandedColumns.has(colKey)) {
        state.lettermon.expandedColumns.delete(colKey);
      } else {
        state.lettermon.expandedColumns.add(colKey);
      }
      renderLettermonPage();
    });
    box.appendChild(moreBtn);
  }

  return box;
}

// ============================================================================
// Accessible Autosuggest Combobox (supports names and numbers)
// ============================================================================
function setupAutosuggest(inputEl, menuEl, onPick) {
  let activeIdx = -1;
  let currentItems = [];

  function updateMenu() {
    const q = inputEl.value.trim().toLowerCase();
    if (!q) {
      menuEl.hidden = true;
      inputEl.setAttribute('aria-expanded', 'false');
      inputEl.removeAttribute('aria-activedescendant');
      return;
    }

    const starts = [];
    const contains = [];
    for (const p of POKEMON_DATA) {
      if (p.isForme && !state.filters.includeForms) continue;
      const n = p.name.toLowerCase();
      const numStr = String(p.num);
      const pad4Str = numStr.padStart(4, '0');
      if (n.startsWith(q) || numStr === q || pad4Str === q) {
        starts.push(p);
      } else if (n.includes(q) || numStr.startsWith(q) || pad4Str.startsWith(q)) {
        contains.push(p);
      }
      if (starts.length + contains.length >= 16) break;
    }

    currentItems = [...starts, ...contains].slice(0, 8);
    activeIdx = -1;

    if (currentItems.length === 0) {
      menuEl.hidden = true;
      inputEl.setAttribute('aria-expanded', 'false');
      inputEl.removeAttribute('aria-activedescendant');
      return;
    }

    menuEl.replaceChildren();
    currentItems.forEach((poke, idx) => {
      const li = document.createElement('li');
      li.className = 'suggest-row';
      li.id = `${menuEl.id}-opt-${idx}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');

      const left = document.createElement('div');
      left.className = 'suggest-left';

      const img = document.createElement('img');
      img.src = getFallbackSpriteUrl(poke);
      img.alt = '';
      img.width = 34;
      img.height = 34;
      img.loading = 'lazy';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'suggest-name';
      nameSpan.textContent = poke.name;

      const numSpan = document.createElement('span');
      numSpan.className = 'suggest-num';
      numSpan.textContent = `#${String(poke.num).padStart(4, '0')}`;

      left.append(img, nameSpan, numSpan);
      li.appendChild(left);

      if (!passesGlobalFilters(poke)) {
        const tag = document.createElement('span');
        tag.className = 'suggest-filtered-tag';
        tag.textContent = 'Filtered';
        li.appendChild(tag);
      }

      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onPick(poke);
        menuEl.hidden = true;
        inputEl.setAttribute('aria-expanded', 'false');
        inputEl.removeAttribute('aria-activedescendant');
      });

      menuEl.appendChild(li);
    });

    menuEl.hidden = false;
    inputEl.setAttribute('aria-expanded', 'true');
  }

  function syncHighlight(rows) {
    rows.forEach((r, i) => {
      const isSelected = i === activeIdx;
      r.classList.toggle('is-highlighted', isSelected);
      r.setAttribute('aria-selected', String(isSelected));
    });
    if (activeIdx >= 0 && rows[activeIdx]) {
      inputEl.setAttribute('aria-activedescendant', rows[activeIdx].id);
    } else {
      inputEl.removeAttribute('aria-activedescendant');
    }
  }

  inputEl.addEventListener('input', updateMenu);

  inputEl.addEventListener('keydown', (e) => {
    if (e.isComposing || menuEl.hidden || currentItems.length === 0) return;
    const rows = menuEl.querySelectorAll('.suggest-row');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = (activeIdx + 1) % currentItems.length;
      syncHighlight(rows);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = (activeIdx - 1 + currentItems.length) % currentItems.length;
      syncHighlight(rows);
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      onPick(currentItems[activeIdx]);
      menuEl.hidden = true;
      inputEl.setAttribute('aria-expanded', 'false');
      inputEl.removeAttribute('aria-activedescendant');
    } else if (e.key === 'Escape') {
      menuEl.hidden = true;
      inputEl.setAttribute('aria-expanded', 'false');
      inputEl.removeAttribute('aria-activedescendant');
    }
  });

  inputEl.addEventListener('blur', () => {
    setTimeout(() => {
      menuEl.hidden = true;
      inputEl.setAttribute('aria-expanded', 'false');
      inputEl.removeAttribute('aria-activedescendant');
    }, 150);
  });
}

// ============================================================================
// Initialization & Event Wiring
// ============================================================================
function renderActivePage() {
  updateFilterSummaryUI();
  if (state.activePage === 'scrambler') {
    renderScramblerPage();
  } else {
    renderLettermonPage();
  }
}

function switchPage(page) {
  state.activePage = page;
  const isScrambler = page === 'scrambler';

  const tabScrambler = document.getElementById('tab-scrambler');
  const tabLettermon = document.getElementById('tab-lettermon');
  tabScrambler.classList.toggle('is-active', isScrambler);
  tabLettermon.classList.toggle('is-active', !isScrambler);
  if (isScrambler) {
    tabScrambler.setAttribute('aria-current', 'page');
    tabLettermon.removeAttribute('aria-current');
  } else {
    tabLettermon.setAttribute('aria-current', 'page');
    tabScrambler.removeAttribute('aria-current');
  }

  document.getElementById('page-scrambler').hidden = !isScrambler;
  document.getElementById('page-lettermon').hidden = isScrambler;

  renderActivePage();
}

function toggleSettingsPanel(forceOpen) {
  const panel = document.getElementById('settings-panel');
  const btn = document.getElementById('settings-toggle-btn');
  const handle = document.getElementById('right-edge-handle');
  state.settingsOpen = typeof forceOpen === 'boolean' ? forceOpen : !state.settingsOpen;
  panel.hidden = !state.settingsOpen;
  btn.setAttribute('aria-expanded', String(state.settingsOpen));
  handle.setAttribute('aria-expanded', String(state.settingsOpen));
}

function init() {
  // Apply Donation Config
  const topDonate = document.getElementById('top-donate-link');
  if (topDonate && DONATION_CONFIG.paypalUrl) {
    topDonate.href = DONATION_CONFIG.paypalUrl;
  }
  const footerKofi = document.getElementById('footer-kofi-link');
  if (footerKofi && DONATION_CONFIG.kofiUrl) {
    footerKofi.href = DONATION_CONFIG.kofiUrl;
    footerKofi.hidden = false;
  }

  // Populate 18 Types in Advanced Settings
  const typesGrid = document.getElementById('types-grid');
  for (const t of ALL_TYPES) {
    const label = document.createElement('label');
    label.className = 'type-filter-pill';
    label.style.setProperty('--type-color', TYPE_COLORS[t]);

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'type';
    input.value = t;
    input.checked = true;

    const span = document.createElement('span');
    span.textContent = t;

    label.append(input, span);
    typesGrid.appendChild(label);
  }

  // Page Tabs
  document.getElementById('tab-scrambler').addEventListener('click', () => switchPage('scrambler'));
  document.getElementById('tab-lettermon').addEventListener('click', () => switchPage('lettermon'));

  // Right Settings Panel Toggle (Top button, Right-edge handle, Close button, Escape)
  document.getElementById('settings-toggle-btn').addEventListener('click', () => toggleSettingsPanel());
  document.getElementById('right-edge-handle').addEventListener('click', () => toggleSettingsPanel(true));
  document.getElementById('settings-close-btn').addEventListener('click', () => toggleSettingsPanel(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.settingsOpen) toggleSettingsPanel(false);
  });

  // Scrambler Search Bar
  const scramblerInput = document.getElementById('scrambler-input');
  const scramblerMenu = document.getElementById('scrambler-suggestions');
  setupAutosuggest(scramblerInput, scramblerMenu, (poke) => {
    const formatted = `${poke.name} (#${String(poke.num).padStart(4, '0')})`;
    scramblerInput.value = formatted;
    state.scrambler.query = formatted;
    renderScramblerPage();
  });

  document.getElementById('scrambler-form').addEventListener('submit', (e) => {
    e.preventDefault();
    state.scrambler.query = scramblerInput.value;
    renderScramblerPage();
  });

  scramblerInput.addEventListener('input', () => {
    state.scrambler.query = scramblerInput.value;
    renderScramblerPage();
  });

  // Lettermon Search Bar
  const lettermonInput = document.getElementById('lettermon-input');
  const lettermonMenu = document.getElementById('lettermon-suggestions');
  setupAutosuggest(lettermonInput, lettermonMenu, (poke) => {
    lettermonInput.value = poke.name;
    state.lettermon.rawName = poke.name;
    state.lettermon.selectedPokemon = poke;
    state.lettermon.activeLetterIndex = null;
    state.lettermon.expandedColumns.clear();
    renderLettermonPage();
  });

  document.getElementById('lettermon-form').addEventListener('submit', (e) => {
    e.preventDefault();
    state.lettermon.rawName = lettermonInput.value;
    state.lettermon.selectedPokemon = findPokemonByInput(lettermonInput.value);
    state.lettermon.activeLetterIndex = null;
    state.lettermon.expandedColumns.clear();
    renderLettermonPage();
  });

  lettermonInput.addEventListener('input', () => {
    state.lettermon.rawName = lettermonInput.value;
    state.lettermon.selectedPokemon = findPokemonByInput(lettermonInput.value);
    state.lettermon.activeLetterIndex = null;
    state.lettermon.expandedColumns.clear();
    renderLettermonPage();
  });

  document.getElementById('lettermon-learnable-only').addEventListener('change', (e) => {
    state.lettermon.learnableOnly = e.target.checked;
    renderLettermonPage();
  });

  document.getElementById('lettermon-filter-input').addEventListener('input', (e) => {
    state.lettermon.subFilter = e.target.value;
    renderLettermonPage();
  });

  // Settings Panel Listeners
  const genGrid = document.getElementById('gen-grid');
  genGrid.addEventListener('change', () => {
    const checked = [...genGrid.querySelectorAll('input:checked')].map(el => parseInt(el.value, 10));
    state.filters.generations = new Set(checked);
    renderActivePage();
  });
  document.getElementById('gen-select-all').addEventListener('click', () => {
    genGrid.querySelectorAll('input').forEach(el => { el.checked = true; });
    state.filters.generations = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    renderActivePage();
  });
  document.getElementById('gen-select-none').addEventListener('click', () => {
    genGrid.querySelectorAll('input').forEach(el => { el.checked = false; });
    state.filters.generations = new Set();
    renderActivePage();
  });

  document.getElementById('exclude-legendaries').addEventListener('change', (e) => {
    state.filters.excludeLegendaries = e.target.checked;
    renderActivePage();
  });

  document.getElementById('exclude-mythics').addEventListener('change', (e) => {
    state.filters.excludeMythics = e.target.checked;
    renderActivePage();
  });

  const maxBstSlider = document.getElementById('max-bst-slider');
  const maxBstReadout = document.getElementById('max-bst-readout');
  const minBstSlider = document.getElementById('min-bst-slider');
  const minBstReadout = document.getElementById('min-bst-readout');

  function syncBstRange(newMin, newMax) {
    const clampedMin = Math.max(175, Math.min(700, parseInt(newMin, 10) || 175));
    const clampedMax = Math.max(clampedMin, Math.min(780, parseInt(newMax, 10) || 780));
    state.filters.minBst = clampedMin;
    state.filters.maxBst = clampedMax;
    minBstSlider.value = String(clampedMin);
    minBstReadout.textContent = String(clampedMin);
    maxBstSlider.value = String(clampedMax);
    maxBstReadout.textContent = clampedMax >= 780 ? '780 (No Limit)' : `≤ ${clampedMax}`;
    renderActivePage();
  }

  maxBstSlider.addEventListener('input', () => {
    const targetMax = parseInt(maxBstSlider.value, 10) || 780;
    const safeMin = Math.min(parseInt(minBstSlider.value, 10) || 175, targetMax);
    syncBstRange(safeMin, targetMax);
  });
  minBstSlider.addEventListener('input', () => {
    const targetMin = parseInt(minBstSlider.value, 10) || 175;
    const safeMax = Math.max(parseInt(maxBstSlider.value, 10) || 780, targetMin);
    syncBstRange(targetMin, safeMax);
  });
  document.querySelectorAll('[data-max-bst]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetMax = parseInt(btn.dataset.maxBst, 10);
      const safeMin = Math.min(state.filters.minBst, targetMax);
      syncBstRange(safeMin, targetMax);
    });
  });

  document.getElementById('game-select').addEventListener('change', (e) => {
    state.filters.game = e.target.value;
    renderActivePage();
  });

  // Advanced Settings Listeners
  typesGrid.addEventListener('change', () => {
    const checked = [...typesGrid.querySelectorAll('input:checked')].map(el => el.value);
    state.filters.types = new Set(checked);
    renderActivePage();
  });
  document.getElementById('types-select-all').addEventListener('click', () => {
    typesGrid.querySelectorAll('input').forEach(el => { el.checked = true; });
    state.filters.types = new Set(ALL_TYPES);
    renderActivePage();
  });
  document.getElementById('types-select-none').addEventListener('click', () => {
    typesGrid.querySelectorAll('input').forEach(el => { el.checked = false; });
    state.filters.types = new Set();
    renderActivePage();
  });

  document.getElementById('include-alt-forms').addEventListener('change', (e) => {
    state.filters.includeForms = e.target.checked;
    renderActivePage();
  });

  document.getElementById('allow-nat-dex-game').addEventListener('change', (e) => {
    state.filters.allowNatDexGame = e.target.checked;
    renderActivePage();
  });

  document.getElementById('pad-mode-select').addEventListener('change', (e) => {
    state.filters.padMode = e.target.value;
    renderActivePage();
  });

  document.getElementById('info-site-select').addEventListener('change', (e) => {
    state.filters.infoSite = e.target.value;
    renderActivePage();
  });

  // Reset All Filters
  document.getElementById('reset-filters-btn').addEventListener('click', () => {
    state.filters.generations = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    state.filters.excludeLegendaries = false;
    state.filters.excludeMythics = false;
    state.filters.maxBst = 780;
    state.filters.game = 'all';
    state.filters.minBst = 175;
    state.filters.types = new Set(ALL_TYPES);
    state.filters.includeForms = false;
    state.filters.allowNatDexGame = false;
    state.filters.padMode = 'pad4';

    genGrid.querySelectorAll('input').forEach(el => { el.checked = true; });
    document.getElementById('exclude-legendaries').checked = false;
    document.getElementById('exclude-mythics').checked = false;
    maxBstSlider.value = '780';
    maxBstReadout.textContent = '780 (No Limit)';
    document.getElementById('game-select').value = 'all';
    minBstSlider.value = '175';
    minBstReadout.textContent = '175';
    typesGrid.querySelectorAll('input').forEach(el => { el.checked = true; });
    document.getElementById('include-alt-forms').checked = false;
    document.getElementById('allow-nat-dex-game').checked = false;
    document.getElementById('pad-mode-select').value = 'pad4';

    renderActivePage();
  });

  renderActivePage();
}

init();
