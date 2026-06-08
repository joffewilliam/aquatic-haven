// Aquatic Haven client: prefetch-on-hover navigation (McMaster technique) +
// a real localStorage cart (multi-item, quantities) + live search autocomplete.
(function () {
  'use strict';
  var cache = new Map();
  var app = document.getElementById('app');
  var flash = document.getElementById('flash');
  var ccEl = document.getElementById('cc');
  var fmt = function (n) { return '$' + n.toFixed(2); };
  var base = (window.AH_BASE || '').replace(/\/$/, '');
  var staticProducts = Array.isArray(window.AH_PRODUCTS) ? window.AH_PRODUCTS : null;

  function toUrl(path) {
    if (!path || /^(https?:|mailto:|#)/.test(path)) return path;
    if (path.charAt(0) !== '/') path = '/' + path;
    return base + path;
  }
  function fromUrl(href) {
    var url;
    try { url = new URL(href, location.origin); } catch (e) { return href || '/'; }
    if (url.origin !== location.origin) return href;
    var path = url.pathname;
    if (base && path === base) path = '/';
    else if (base && path.indexOf(base + '/') === 0) path = path.slice(base.length);
    path = path.length > 1 ? path.replace(/\/$/, '') : path;
    return path + url.search + url.hash;
  }
  function appPath(href) {
    return fromUrl(href).split('?')[0].split('#')[0];
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function stars(r) {
    var f = Math.round(r);
    return '*****'.slice(0, f) + '.....'.slice(0, 5 - f);
  }

  function note(msg) {
    if (!flash) return;
    flash.textContent = msg; flash.classList.add('on');
    clearTimeout(note._t); note._t = setTimeout(function () { flash.classList.remove('on'); }, 1200);
  }

  /* ---------------- cart (localStorage) ---------------- */
  var CART_KEY = 'ah_cart';
  function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } }
  function saveCart(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); updateBadge(); }
  function cartCount() { return getCart().reduce(function (n, i) { return n + i.qty; }, 0); }
  function cartTotal() { return getCart().reduce(function (s, i) { return s + i.qty * i.price; }, 0); }
  function updateBadge() {
    if (!ccEl) return;
    var n = cartCount();
    ccEl.textContent = n;
    if (n > 0) ccEl.removeAttribute('hidden'); else ccEl.setAttribute('hidden', '');
  }
  function addToCart(item, qty) {
    qty = qty || 1;
    var c = getCart(), row = c.find(function (i) { return i.id === item.id; });
    if (row) row.qty += qty;
    else c.push({ id: item.id, name: item.name, price: item.price, img: item.img, slug: item.slug, qty: qty });
    saveCart(c);
  }
  function setQty(id, qty) {
    var c = getCart().map(function (i) { return i.id === id ? Object.assign(i, { qty: qty }) : i; })
      .filter(function (i) { return i.qty > 0; });
    saveCart(c);
  }
  function removeItem(id) { saveCart(getCart().filter(function (i) { return i.id !== id; })); }

  function cartHtml() {
    var c = getCart();
    if (!c.length) return '<h1>Your Cart</h1><p class="cart-empty">Your cart is empty. <a data-nav href="' + toUrl('/') + '">Browse the store →</a></p>';
    var rows = c.map(function (i) {
      return '<div class="cart-row" data-id="' + i.id + '">' +
        '<img src="' + i.img + '" alt="" width="72" height="54" loading="lazy">' +
        '<div><a class="ci-name" data-nav href="' + toUrl('/p/' + i.slug) + '">' + i.name + '</a>' +
        '<div class="ci-sub">' + fmt(i.price) + ' each · <button class="ci-rm" data-cart-act="rm" data-id="' + i.id + '">Remove</button></div></div>' +
        '<div class="qty"><button data-cart-act="dec" data-id="' + i.id + '" aria-label="Decrease">−</button>' +
        '<span>' + i.qty + '</span><button data-cart-act="inc" data-id="' + i.id + '" aria-label="Increase">+</button></div>' +
        '<div class="ci-line">' + fmt(i.qty * i.price) + '</div></div>';
    }).join('');
    return '<div class="cart"><h1>Your Cart <span class="lede" style="font-size:14px">' + cartCount() + ' item' + (cartCount() === 1 ? '' : 's') + '</span></h1>' +
      rows + '<div class="cart-tot"><span>Subtotal</span><b>' + fmt(cartTotal()) + '</b></div>' +
      '<button class="checkout" data-cart-act="checkout">Checkout →</button></div>';
  }
  function renderCart() { app.innerHTML = cartHtml(); }

  function productMatches(q) {
    if (!staticProducts) return [];
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return staticProducts.map(function (p) {
      var hay = (p.name + ' ' + p.catName + ' ' + p.sku).toLowerCase();
      var score = 0;
      for (var i = 0; i < terms.length; i++) {
        if (hay.indexOf(terms[i]) < 0) return null;
        score += p.name.toLowerCase().indexOf(terms[i]) === 0 ? 3 : 1;
      }
      return { p: p, score: score };
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).map(function (x) { return x.p; });
  }

  function cardHtml(p) {
    return '<a class="card" data-nav href="' + toUrl('/p/' + p.slug) + '">' +
      '<span class="thumb"><img src="' + p.img + '" width="220" height="165" loading="lazy" decoding="async" alt="' + esc(p.name) + '"></span>' +
      '<span class="pname">' + esc(p.name) + '</span>' +
      '<span class="pcat">' + esc(p.catName) + '</span>' +
      '<span class="meta"><b class="price">' + fmt(p.price) + '</b><span class="rate" title="' + p.rating.toFixed(1) + ' of 5">' + stars(p.rating) + '</span></span>' +
      '<span class="cardfoot"><span class="badge ' + (p.stock ? 'in' : 'out') + '">' + (p.stock ? 'In stock' : 'Backorder') + '</span>' +
      (p.stock ? '<button class="qadd" type="button" data-add data-id="' + p.id + '" data-name="' + esc(p.name) + '" data-price="' + p.price + '" data-img="' + p.img + '" data-slug="' + p.slug + '">Add +</button>' : '') +
      '</span></a>';
  }

  function staticSearchHtml(q) {
    var items = productMatches(q);
    var head = '<nav class="crumb"><a data-nav href="' + toUrl('/') + '">Store</a><span>›</span>Search</nav>' +
      '<header class="pagehead"><h1>Search results</h1><p class="lede">"' + esc(q) + '" — ' + items.length + ' match' + (items.length === 1 ? '' : 'es') + '</p></header>';
    if (!items.length) return head + '<p class="empty">No products match "' + esc(q) + '". Try <a data-nav href="' + toUrl('/c/freshwater-fish') + '">freshwater fish</a>, "filter", "plant", or "tank".</p>';
    return head + '<div class="grid">' + items.map(cardHtml).join('') + '</div>';
  }

  function handleCartAct(btn) {
    var act = btn.getAttribute('data-cart-act'), id = btn.getAttribute('data-id');
    var row = getCart().find(function (i) { return i.id === id; });
    if (act === 'inc') setQty(id, row.qty + 1);
    else if (act === 'dec') setQty(id, row.qty - 1);
    else if (act === 'rm') removeItem(id);
    else if (act === 'checkout') {
      var n = cartCount(), tot = cartTotal();
      if (!n) return;
      localStorage.removeItem(CART_KEY); updateBadge();
      app.innerHTML = '<div class="cart"><h1>Order placed 🎉</h1><div class="ordered">✓ Thank you! Your order of <b>' + n +
        ' item' + (n === 1 ? '' : 's') + '</b> (' + fmt(tot) + ') is confirmed and ships same day with our live-arrival guarantee. ' +
        '<a data-nav href="' + toUrl('/') + '">Continue shopping →</a></div></div>';
      note('Order placed — ' + fmt(tot));
      return;
    }
    renderCart();
  }

  /* ---------------- navigation (prefetch-on-hover) ---------------- */
  function fragUrl(href) {
    href = fromUrl(href);
    return toUrl(href === '/' ? '/fragment/home' : '/fragment' + href);
  }
  function prefetch(href) {
    href = fromUrl(href);
    if (cache.has(href)) return cache.get(href);
    if (staticProducts && appPath(href) === '/search') {
      var q = new URLSearchParams(href.split('?')[1] || '').get('q') || '';
      var local = Promise.resolve(staticSearchHtml(q));
      cache.set(href, local);
      return local;
    }
    var pr = fetch(fragUrl(href), { headers: { 'x-fragment': '1' } }).then(function (r) { return r.text(); });
    cache.set(href, pr);
    return pr;
  }
  function setActive(path) {
    path = appPath(path);
    document.querySelectorAll('.sidebar a[data-nav]').forEach(function (a) {
      a.classList.toggle('active', appPath(a.getAttribute('href')) === path);
    });
  }
  function show(href, push) {
    href = fromUrl(href);
    hideSuggest();
    var path = appPath(href);
    if (path === '/cart') {
      renderCart();
      if (push) history.pushState({ href: '/cart' }, '', toUrl('/cart'));
      setActive(''); window.scrollTo(0, 0); return;
    }
    var t = performance.now();
    prefetch(href).then(function (html) {
      app.innerHTML = html;
      if (push) history.pushState({ href: href }, '', toUrl(href));
      setActive(path); window.scrollTo(0, 0);
      note('navigated in ' + Math.round(performance.now() - t) + 'ms');
    });
  }

  function navLink(e) { return e.target.closest && e.target.closest('a[data-nav]'); }
  ['mouseover', 'focusin'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { var a = navLink(e); if (a) prefetch(fromUrl(a.getAttribute('href'))); });
  });
  document.addEventListener('touchstart', function (e) { var a = navLink(e); if (a) prefetch(fromUrl(a.getAttribute('href'))); }, { passive: true });

  document.addEventListener('click', function (e) {
    // product-page quantity stepper
    var q = e.target.closest('[data-q]');
    if (q) {
      var inp = document.getElementById('qv');
      if (inp) inp.value = Math.max(1, (parseInt(inp.value, 10) || 1) + parseInt(q.getAttribute('data-q'), 10));
      return;
    }
    // add to cart — works as quick-add inside a card link OR the product-page button
    var add = e.target.closest('[data-add]');
    if (add) {
      e.preventDefault(); e.stopPropagation();
      var qty = 1, qid = add.getAttribute('data-qty');
      if (qid) { var qe = document.getElementById(qid); if (qe) qty = Math.max(1, parseInt(qe.value, 10) || 1); }
      addToCart({ id: add.dataset.id, name: add.dataset.name, price: +add.dataset.price, img: add.dataset.img, slug: add.dataset.slug }, qty);
      note('Added ' + (qty > 1 ? qty + ' × ' : '') + '“' + add.dataset.name + '” to cart');
      return;
    }
    var cact = e.target.closest('[data-cart-act]'); if (cact) { handleCartAct(cact); return; }
    var cartL = e.target.closest('a[data-cart]'); if (cartL) { e.preventDefault(); show('/cart', true); return; }
    var a = navLink(e);
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    show(fromUrl(a.getAttribute('href')), true);
  });

  window.addEventListener('popstate', function () { show(fromUrl(location.pathname + location.search), false); });

  /* ---------------- search + autocomplete ---------------- */
  var form = document.querySelector('form.search');
  var input = document.getElementById('q');
  var box = document.getElementById('suggest');
  var hi = -1, items = [];
  function hideSuggest() { if (box) { box.hidden = true; box.innerHTML = ''; hi = -1; items = []; } }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  function renderSuggest(list) {
    items = list; hi = -1;
    if (!list.length) { hideSuggest(); return; }
    box.innerHTML = list.map(function (s) {
      return '<a data-nav href="' + toUrl('/p/' + s.slug) + '"><span>' + s.name + ' <span class="s-cat">' + s.catName + '</span></span><span class="s-price">' + fmt(s.price) + '</span></a>';
    }).join('');
    box.hidden = false;
  }
  var doSuggest = debounce(function () {
    var qv = input.value.trim();
    if (!qv) { hideSuggest(); return; }
    if (staticProducts) {
      renderSuggest(productMatches(qv).slice(0, 7).map(function (p) {
        return { name: p.name, slug: p.slug, catName: p.catName, price: p.price };
      }));
      return;
    }
    fetch(toUrl('/api/suggest?q=' + encodeURIComponent(qv))).then(function (r) { return r.json(); }).then(renderSuggest).catch(hideSuggest);
  }, 110);

  if (form) {
    input.addEventListener('input', doSuggest);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (hi >= 0 && items[hi]) { show('/p/' + items[hi].slug, true); input.blur(); return; }
      var qv = input.value.trim(); if (qv) show('/search?q=' + encodeURIComponent(qv), true);
    });
    input.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      var links = box.querySelectorAll('a');
      if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hi + 1, links.length - 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); hi = Math.max(hi - 1, 0); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (hi >= 0 && items[hi]) show('/p/' + items[hi].slug, true);
        else {
          var qv = input.value.trim();
          if (qv) show('/search?q=' + encodeURIComponent(qv), true);
        }
        input.blur();
        return;
      }
      else if (e.key === 'Escape') { hideSuggest(); return; }
      else return;
      links.forEach(function (l, i) { l.classList.toggle('hi', i === hi); });
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.search')) hideSuggest(); });
  }

  /* ---------------- boot ---------------- */
  updateBadge();
  var initialPath = fromUrl(location.pathname + location.search);
  history.replaceState({ href: initialPath }, '', location.href);
  if (appPath(initialPath) === '/cart') renderCart();
  else if (staticProducts && appPath(initialPath) === '/search') {
    app.innerHTML = staticSearchHtml(new URLSearchParams(initialPath.split('?')[1] || '').get('q') || '');
    setActive('');
  } else setActive(initialPath);
})();
