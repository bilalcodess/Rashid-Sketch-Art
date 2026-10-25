/* ============================================================
   RSA STORE — APPLICATION LOGIC
   ============================================================ */

const YT_CACHE_KEY = 'rsa_yt_cache';
const YT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ──────────────────────────────────────────────────
// ROUTING
// ──────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────
// PRODUCT GRID RENDERING
// ──────────────────────────────────────────────────
let currentFilter = 'all';

function filterHome(cat) {
  currentFilter = cat;
  
  const hero = document.getElementById('hero-section');
  if (hero) {
    if (cat === 'all') hero.style.display = 'flex';
    else hero.style.display = 'none';
  }

  // Update ALL matching nav links (desktop + mobile)
  document.querySelectorAll('.nav-link').forEach(t => {
    t.classList.remove('active');
    if (t.getAttribute('onclick') && t.getAttribute('onclick').includes(`'${cat}'`)) {
      t.classList.add('active');
    }
  });

  // Update filter tabs
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${cat}'`)) {
      btn.classList.add('active');
    }
  });

  renderGrid('product-grid', cat);
  
  if (cat !== 'all') {
    const col = document.getElementById('collection');
    if (col) col.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function filterCategory(cat, tabEl) {
  showPage('home');
  setTimeout(() => filterHome(cat), 50);
}

function getCatBadgeClass(cat) {
  if (cat === 'Canvas')      return 'canvas';
  if (cat === 'Neon Light')  return 'neon';
  if (cat === 'Most Viewed') return 'viewed';
  if (cat === 'Most Liked')  return 'liked';
  if (cat === 'Rising')      return 'rising';
  return '';
}

function formatNumber(n) {
  if (!n || n === 0) return null;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(0) + 'K';
  return n.toLocaleString('en-IN');
}

function buildWaLink(p) {
  const phone = p.whatsapp || RSA_CONFIG.whatsapp;
  const msg = encodeURIComponent(`Hi, I'm interested in "${p.title}" (₹${p.price.toLocaleString('en-IN')}). Is it still available?`);
  return `https://wa.me/${phone}?text=${msg}`;
}

// ──────────────────────────────────────────────────
// CARD CREATION
// ──────────────────────────────────────────────────
function createCard(product, isRelated) {
  const card = document.createElement('div');
  card.className = 'product-card' + (isRelated ? ' related-card' : '');
  card.onclick = () => openProduct(product.id);

  const v = formatNumber(product.views);
  const l = formatNumber(product.likes);
  const statsHtml = (v || l)
    ? `<p id="yt-stats-${product.id}" class="card-yt-stats visible">${v ? `\u25B6 ${v}` : ''}${v && l ? ' &nbsp;\u00B7&nbsp; ' : ''}${l ? `\u2665 ${l}` : ''}</p>`
    : `<p id="yt-stats-${product.id}" class="card-yt-stats"></p>`;

  let priceHtml = `\u20B9${product.price.toLocaleString('en-IN')}`;
  if (product.original_price && product.original_price > product.price) {
    const pct = Math.round(((product.original_price - product.price) / product.original_price) * 100);
    priceHtml += ` <span class="card-mrp">\u20B9${product.original_price.toLocaleString('en-IN')}</span> <span class="card-discount">${pct}% OFF</span>`;
  }

  card.innerHTML = `
    <div class="card-img-wrap">
      <img src="${product.img}" alt="${product.title}" class="card-img" loading="lazy">
      <span class="card-badge ${getCatBadgeClass(product.category)}">${product.category}</span>
    </div>
    <div class="card-body">
      <h3 class="card-title">${product.title}</h3>
      ${statsHtml}
      <p class="card-price">${priceHtml}</p>
      <p class="card-delivery"><svg class="card-truck-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg> Free Delivery</p>
      <a href="${buildWaLink(product)}" target="_blank" class="card-buy-btn" onclick="event.stopPropagation();">Buy on WhatsApp</a>
    </div>
  `;
  return card;
}

function renderGrid(gridId, category) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';

  let items = RSA_PRODUCTS;
  if (category === 'Canvas') {
    items = RSA_PRODUCTS.filter(p => p.category === 'Canvas' || p.type === 'canvas');
  } else if (category === 'Neon Light') {
    items = RSA_PRODUCTS.filter(p => p.category === 'Neon Light' || p.type === 'neon');
  } else if (category === 'Most Viewed') {
    const explicitlyTagged = RSA_PRODUCTS.filter(p => p.category === 'Most Viewed');
    if (explicitlyTagged.length > 0) {
      items = explicitlyTagged;
    } else {
      const withViews = RSA_PRODUCTS.filter(p => p.views && p.views > 0);
      if (withViews.length > 0) {
        items = [...withViews].sort((a, b) => (b.views || 0) - (a.views || 0));
      } else {
        items = RSA_PRODUCTS.slice(0, 12);
      }
    }
  } else if (category !== 'all') {
    items = RSA_PRODUCTS.filter(p => p.category === category);
  }

  if (items.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--fg3); padding: 50px 20px; font-family: \'Inter\', sans-serif;">No paintings found in this category.</p>';
    return;
  }

  items.forEach(p => grid.appendChild(createCard(p, false)));
}

// ──────────────────────────────────────────────────
// IMAGE SLIDER (for canvas paintings with 2 images)
// ──────────────────────────────────────────────────
let currentSlide = 0;

function slideImage(dir) {
  const slides = document.querySelectorAll('.pd-slide');
  const dots = document.querySelectorAll('.pd-dot');
  if (slides.length === 0) return;
  slides[currentSlide].classList.remove('active');
  slides[currentSlide].style.display = 'none';
  dots[currentSlide]?.classList.remove('active');
  
  currentSlide = (currentSlide + dir + slides.length) % slides.length;
  
  slides[currentSlide].classList.add('active');
  slides[currentSlide].style.display = 'block';
  dots[currentSlide]?.classList.add('active');
}

function goToSlide(idx) {
  const slides = document.querySelectorAll('.pd-slide');
  const dots = document.querySelectorAll('.pd-dot');
  if (slides.length === 0) return;
  slides[currentSlide].classList.remove('active');
  slides[currentSlide].style.display = 'none';
  dots[currentSlide]?.classList.remove('active');
  
  currentSlide = idx;
  
  slides[currentSlide].classList.add('active');
  slides[currentSlide].style.display = 'block';
  dots[currentSlide]?.classList.add('active');
}

// ──────────────────────────────────────────────────
// PRODUCT DETAIL
// ──────────────────────────────────────────────────
function openProduct(id) {
  const p = RSA_PRODUCTS.find(x => x.id === id);
  if (!p) return;

  // Reset slider
  currentSlide = 0;
  
  // Primary image
  const img1 = document.getElementById('pd-img');
  const img2 = document.getElementById('pd-img2');
  const prevBtn = document.getElementById('pd-prev');
  const nextBtn = document.getElementById('pd-next');
  const dots = document.getElementById('pd-dots');
  
  img1.src = p.img;
  img1.alt = p.title;
  img1.style.display = 'block';
  img1.classList.add('active');
  
  // Second image (for canvas paintings)
  if (p.img2) {
    img2.src = p.img2;
    img2.alt = p.title + ' (alternate view)';
    img2.style.display = 'none';
    img2.classList.remove('active');
    prevBtn.style.display = '';
    nextBtn.style.display = '';
    dots.style.display = '';
    document.querySelectorAll('.pd-dot').forEach((d, i) => {
      d.classList.toggle('active', i === 0);
    });
  } else {
    img2.src = '';
    img2.style.display = 'none';
    img2.classList.remove('active');
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    dots.style.display = 'none';
  }

  document.getElementById('pd-title').textContent = p.title;
  document.getElementById('pd-cat-label').textContent = p.category;
  document.getElementById('pd-cat-badge').textContent = p.category;
  let pdPriceHtml = `\u20B9${p.price.toLocaleString('en-IN')}`;
  if (p.original_price && p.original_price > p.price) {
    const pct = Math.round(((p.original_price - p.price) / p.original_price) * 100);
    pdPriceHtml += ` <span class="pd-mrp">\u20B9${p.original_price.toLocaleString('en-IN')}</span> <span class="pd-discount">${pct}% OFF</span>`;
  }
  document.getElementById('pd-price').innerHTML = pdPriceHtml;
  document.getElementById('pd-wa-btn').href = buildWaLink(p);

  // Description
  const descEl = document.getElementById('pd-description');
  if (p.description) {
    descEl.textContent = p.description;
    descEl.style.display = '';
  } else {
    descEl.style.display = 'none';
  }

  // Size info
  const sizeInfo = document.getElementById('pd-size-info');
  if (p.size) {
    document.getElementById('pd-size').textContent = p.size;
    sizeInfo.style.display = '';
  } else {
    sizeInfo.style.display = 'none';
  }

  // Type badge
  const typeInfo = document.getElementById('pd-type-info');
  const typeBadge = document.getElementById('pd-type-badge');
  if (p.type) {
    typeBadge.textContent = p.type === 'canvas' ? 'Canvas · Gold Leaf Painting' : 'Neon Light Calligraphy';
    typeBadge.className = `pd-type-badge pd-type-${p.type}`;
    typeInfo.style.display = '';
  } else {
    typeInfo.style.display = 'none';
  }

  // Stats
  const statsEl = document.getElementById('pd-stats');
  const views = formatNumber(p.views);
  const likes = formatNumber(p.likes);
  if (views || likes) {
    statsEl.style.display = 'flex';
    document.getElementById('pd-views').textContent = views ? `\u25B6 ${views} views` : '';
    document.getElementById('pd-likes').textContent = likes ? `\u2665 ${likes} likes` : '';
  } else {
    statsEl.style.display = 'none';
  }

  // YouTube video & stats under video
  const videoSection = document.getElementById('pd-video-section');
  const iframe = document.getElementById('pd-iframe');
  const ytLink = document.getElementById('pd-yt-link');
  const vViews = document.getElementById('pd-video-views');
  const vLikes = document.getElementById('pd-video-likes');
  
  if (p.yt_id && p.yt_id.trim() !== '') {
    videoSection.style.display = 'flex';
    iframe.src = `https://www.youtube.com/embed/${p.yt_id}?autoplay=0&rel=0`;
    if (ytLink) ytLink.href = `https://www.youtube.com/watch?v=${p.yt_id}`;
    if (vViews) {
      vViews.textContent = views ? `\u25B6 ${views} views` : '\u25B6 YouTube Short';
      vViews.style.display = '';
    }
    if (vLikes) {
      vLikes.textContent = likes ? `\u2665 ${likes} likes` : '';
      vLikes.style.display = likes ? '' : 'none';
    }
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

// ──────────────────────────────────────────────────
// YOUTUBE STATS (FROM STATIC JSON)
// ──────────────────────────────────────────────────
async function fetchYouTubeStats() {
  try {
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

      const el = document.getElementById(`yt-stats-${p.id}`);
      if (el) {
        const v = formatNumber(p.views);
        const l = formatNumber(p.likes);
        if (v || l) {
          el.innerHTML = `${v ? `\u25B6 ${v}` : ''}${v && l ? ' &nbsp;\u00B7&nbsp; ' : ''}${l ? `\u2665 ${l}` : ''}`;
          el.classList.add('visible');
        }
      }
    }
  });
}

// ──────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const btn = document.getElementById('theme-toggle');

  if (btn) btn.textContent = currentTheme === 'light' ? '\u263E' : '\u2600';
  renderGrid('product-grid', 'all');
  fetchYouTubeStats();
});

// ──────────────────────────────────────────────────
// THEME TOGGLE
// ──────────────────────────────────────────────────
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('rsa_theme', newTheme);
  
  const btn = document.getElementById('theme-toggle');
  if(btn) {
    btn.textContent = newTheme === 'light' ? '\u263E' : '\u2600';
  }
}

// Load saved theme (defaults to luxury dark obsidian)
const savedTheme = localStorage.getItem('rsa_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);


// ──────────────────────────────────────────────────
// MOBILE MENU
// ──────────────────────────────────────────────────
let menuOpenTime = 0;
function toggleMenu() { 
  const menu = document.getElementById('mobile-menu');
  menu.classList.toggle('open');
  if (menu.classList.contains('open')) {
    menuOpenTime = Date.now();
  }
}
function closeMenu() { 
  document.getElementById('mobile-menu').classList.remove('open'); 
}

window.addEventListener('scroll', () => {
  if (Date.now() - menuOpenTime > 300) {
    const menu = document.getElementById('mobile-menu');
    if (menu && menu.classList.contains('open')) {
      menu.classList.remove('open');
    }
  }
}, { passive: true });

document.addEventListener('click', (e) => {
  if (Date.now() - menuOpenTime > 300) {
    const menu = document.getElementById('mobile-menu');
    const btn = document.getElementById('menu-btn');
    if (menu && menu.classList.contains('open') && !menu.contains(e.target) && !btn.contains(e.target)) {
      menu.classList.remove('open');
    }
  }
});
