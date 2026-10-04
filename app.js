/* ============================================================
   RSA STORE â€“ APPLICATION LOGIC
   ============================================================ */

const YT_CACHE_KEY = 'rsa_yt_cache';
const YT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ROUTING
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showPage(name) {
  document.getElementById('page-home').style.display    = name === 'home'    ? '' : 'none';
  document.getElementById('page-product').style.display = name === 'product' ? '' : 'none';
  document.getElementById('page-about').style.display   = name === 'about'   ? '' : 'none';

  // Update nav active state
  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
  const navMap = { home: 'nav-home', about: 'nav-about' };
  if (navMap[name]) document.getElementById(navMap[name])?.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PRODUCT GRID RENDERING
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let currentFilter = 'all';

function filterHome(cat) {
  currentFilter = cat;
  
  const hero = document.getElementById('hero-section');
  if (hero) {
    if (cat === 'all') hero.style.display = 'flex';
    else hero.style.display = 'none';
  }

  // Update tab buttons
  document.querySelectorAll('.nav-link').forEach(t => t.classList.remove('active'));
  const tabMap = { all: 'nav-home', Masterpieces: 'nav-master', 'Most Liked': 'nav-liked', Rising: 'nav-rising' };
  if (tabMap[cat]) document.getElementById(tabMap[cat]).classList.add('active');
  
  // Highlight mobile links as well
  const mobileMap = { all: 'nav-home-m', Masterpieces: 'nav-master-m', 'Most Liked': 'nav-liked-m', Rising: 'nav-rising-m' };
  // (We don't strictly need IDs for mobile since querySelectorAll covers them if they share class, but we just want to ensure we find all active ones. Since they don't have IDs on mobile, we can just select by text or index. Actually, querySelectorAll covers all '.nav-link' including mobile ones, so we just need to add active to the mobile ones too. We can do that by finding all matching links.)
  
  // A better way to highlight ALL matching nav links (desktop + mobile)
  document.querySelectorAll('.nav-link').forEach(t => {
    t.classList.remove('active');
    // If it's a category link and its onclick contains the category, mark it active
    if (t.getAttribute('onclick') && t.getAttribute('onclick').includes(`'${cat}'`)) {
      t.classList.add('active');
    }
  });

  renderGrid('product-grid', cat);
  
  if (cat !== 'all') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function filterCategory(cat) {
  showPage('home');
  // Wait for home page to show, then filter
  setTimeout(() => filterHome(cat), 50);
}

function getCatBadgeClass(cat) {
  if (cat === 'Rising')     return 'rising';
  if (cat === 'Most Liked') return 'liked';
  return '';
}

function formatNumber(n) {
  if (!n || n === 0) return null;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(0) + 'K';
  return n.toLocaleString('en-IN');
}

function buildWaLink(product) {
  const txt = encodeURIComponent(
    `Hi! I want to buy this painting: "${product.title}" priced at ₹${product.price.toLocaleString('en-IN')}. Can you confirm availability?`
  );
  const number = product.whatsapp || RSA_CONFIG.whatsapp;
  return `https://wa.me/${number}?text=${txt}`;
}

function createCard(p, small = false) {
  const views  = formatNumber(p.views);
  const likes  = formatNumber(p.likes);
  const hasStats = views || likes;

  const statsHtml = hasStats
    ? `<div class="card-yt-stats visible">
        ${views ? `▶ ${views}` : ''}${views && likes ? ' &nbsp;·&nbsp; ' : ''}${likes ? `♥ ${likes}` : ''}
       </div>`
    : `<div class="card-yt-stats" id="yt-stats-${p.id}"></div>`;

  const card = document.createElement('div');
  card.className = 'product-card';
  card.innerHTML = `
    <div class="card-img-wrap">
      <img src="${p.img}" alt="${p.title}" class="card-img" loading="lazy">
      <span class="card-badge ${getCatBadgeClass(p.category)}">${p.category}</span>
    </div>
    <div class="card-body">
      <div class="card-title">${p.title}</div>
      ${statsHtml}
      <div class="card-price">â‚¹${p.price.toLocaleString('en-IN')}</div>
      <a class="card-buy-btn" href="${buildWaLink(p)}" target="_blank" onclick="event.stopPropagation()">BUY</a>
    </div>
  `;
  card.addEventListener('click', () => openProduct(p.id));
  return card;
}

function renderGrid(containerId, filter = 'all') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const list = filter === 'all' ? RSA_PRODUCTS : RSA_PRODUCTS.filter(p => p.category === filter);
  list.forEach(p => container.appendChild(createCard(p)));
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PRODUCT DETAIL
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openProduct(id) {
  const p = RSA_PRODUCTS.find(x => x.id === id);
  if (!p) return;

  document.getElementById('pd-img').src         = p.img;
  document.getElementById('pd-img').alt         = p.title;
  document.getElementById('pd-title').textContent = p.title;
  document.getElementById('pd-cat-label').textContent = p.category;
  document.getElementById('pd-cat-badge').textContent = p.category;
  document.getElementById('pd-cat-badge').className = `pd-badge ${getCatBadgeClass(p.category)}`;
  document.getElementById('pd-price').textContent = `â‚¹${p.price.toLocaleString('en-IN')}`;
  document.getElementById('pd-wa-btn').href = buildWaLink(p);

  // Stats
  const statsEl = document.getElementById('pd-stats');
  const views = formatNumber(p.views);
  const likes = formatNumber(p.likes);
  if (views || likes) {
    statsEl.style.display = 'flex';
    document.getElementById('pd-views').textContent = views ? `â–¶ ${views} views` : '';
    document.getElementById('pd-likes').textContent = likes ? `â™¥ ${likes} likes` : '';
  } else {
    statsEl.style.display = 'none';
  }

  // YouTube video
  const videoSection = document.getElementById('pd-video-section');
  const iframe = document.getElementById('pd-iframe');
  if (p.yt_id) {
    videoSection.style.display = '';
    iframe.src = `https://www.youtube.com/embed/${p.yt_id}?autoplay=0&rel=0`;
  } else {
    videoSection.style.display = 'none';
    iframe.src = '';
  }

  // Related products (same category, excluding self)
  const related = RSA_PRODUCTS.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4);
  const relGrid = document.getElementById('related-grid');
  relGrid.innerHTML = '';
  related.forEach(r => relGrid.appendChild(createCard(r, true)));

  showPage('product');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// YOUTUBE STATS (FROM STATIC JSON)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function fetchYouTubeStats() {
  try {
    // We now simply read the stats.json file generated hourly by GitHub Actions
    const res = await fetch('stats.json?t=' + Date.now());
    if (!res.ok) return;
    const allStats = await res.json();
    applyStats(allStats);
  } catch (e) { 
    console.warn('Failed to load stats.json:', e); 
  }
}

function applyStats(statsMap) {
  RSA_PRODUCTS.forEach(p => {
    if (p.yt_id && statsMap[p.yt_id]) {
      p.views = statsMap[p.yt_id].views;
      p.likes = statsMap[p.yt_id].likes;

      // Live-update any visible stat elements on the grid
      const el = document.getElementById(`yt-stats-${p.id}`);
      if (el) {
        const v = formatNumber(p.views);
        const l = formatNumber(p.likes);
        if (v || l) {
          el.innerHTML = `${v ? `▶ ${v}` : ''}${v && l ? ' &nbsp;·&nbsp; ' : ''}${l ? `♥ ${l}` : ''}`;
          el.classList.add('visible');
        }
      }
    }
  });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// INIT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.addEventListener('DOMContentLoaded', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = currentTheme === 'light' ? '☾' : '☀';
  renderGrid('product-grid', 'all');
  fetchYouTubeStats();
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// THEME TOGGLE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('rsa_theme', newTheme);
  
  const btn = document.getElementById('theme-toggle');
  if(btn) {
    btn.textContent = newTheme === 'light' ? '☾' : '☀';
  }
}

// Load saved theme
const savedTheme = localStorage.getItem('rsa_theme');
if (savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
}






function toggleMenu() { document.getElementById('mobile-menu').classList.toggle('open'); }
function closeMenu() { document.getElementById('mobile-menu').classList.remove('open'); }

window.addEventListener('scroll', () => { const menu = document.getElementById('mobile-menu'); if (menu && menu.classList.contains('open')) { menu.classList.remove('open'); } }, { passive: true });
