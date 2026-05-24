(function () {
  'use strict';

  var container = document.getElementById('badge-fan');
  if (!container) return;

  var BADGES = [
    { name: 'Film Summit',  file: 'Film%20Summit.png' },
    { name: 'Sponsor',      file: 'Sponsor.png' },
    { name: 'Staff',        file: 'Staff.png' },
    { name: 'Screenwriter', file: 'Screenwriter.png' },
    { name: 'Press',        file: 'Press.png' },
    { name: 'Filmmaker',    file: 'Filmmaker.png' },
    { name: 'Day Pass',     file: 'Day%20Pass.png' },
    { name: 'All Access',   file: 'All%20Access.png' }
  ];

  var IMG_BASE = '../images/design/hollyshorts21/badges/';
  var N = BADGES.length;
  var FAN_ARC = 70;
  var MID = (N - 1) / 2;
  var SPREAD = Math.min(container.offsetWidth * 0.6, 500);

  /* ── BARCODE ── */
  function barcode(seed) {
    var s = '', x = 4, r = seed * 137.508;
    for (var i = 0; i < 28; i++) {
      r = (r * 9301 + 49297) % 233280;
      var w = (r % 3) + 1;
      r = (r * 9301 + 49297) % 233280;
      var g = (r % 2) + 1;
      s += '<rect x="' + x + '" y="3" width="' + w + '" height="34" rx="0.5" fill="#222"/>';
      x += w + g;
    }
    return s;
  }

  /* ── BUILD ── */
  var cards = [];
  var flipped = -1;

  BADGES.forEach(function (b, i) {
    var angle = (i - MID) * (FAN_ARC / (N - 1));
    var ox = (i - MID) * (SPREAD / (N - 1));

    var el = document.createElement('div');
    el.className = 'badge-card';
    el.style.setProperty('--bx', ox + 'px');
    el.style.setProperty('--ba', angle + 'deg');
    el.style.zIndex = i;

    var inner = document.createElement('div');
    inner.className = 'badge-card-inner';

    var front = document.createElement('div');
    front.className = 'badge-card-face badge-card-front';
    var img = new Image();
    img.src = IMG_BASE + b.file;
    img.alt = b.name + ' badge';
    img.draggable = false;
    front.appendChild(img);
    front.insertAdjacentHTML('beforeend', '<span class="badge-hole"></span>');

    var back = document.createElement('div');
    back.className = 'badge-card-face badge-card-back';
    back.innerHTML =
      '<div class="badge-back-content">' +
        '<span class="badge-hole badge-hole--back"></span>' +
        '<svg class="badge-back-hs" viewBox="0 0 140 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
          '<text x="70" y="30" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="16" font-weight="700" letter-spacing="0.3" fill="#111">HollyShorts</text>' +
          '<text x="70" y="48" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="6.5" font-weight="400" letter-spacing="2.5" fill="#999">FILM FESTIVAL</text>' +
        '</svg>' +
        '<span class="badge-back-type">' + b.name.toUpperCase() + '</span>' +
        '<div class="badge-back-barcode">' +
          '<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">' + barcode(i) + '</svg>' +
          '<span>HS21-' + String(2025000 + i * 137) + '</span>' +
        '</div>' +
        '<p class="badge-back-fine">21st Annual Oscar\u00AE-Qualifying HollyShorts Film Festival<br>TCL Chinese Theatres \u2014 Los Angeles<br><br>Property of Alta Global Media. Must be worn<br>and visible at all times. Non-transferable.</p>' +
      '</div>';

    inner.appendChild(front);
    inner.appendChild(back);
    el.appendChild(inner);
    container.appendChild(el);

    cards.push({ el: el, inner: inner, i: i, angle: angle, ox: ox });

    el.addEventListener('mouseenter', function () {
      if (flipped === i) return;
      el.classList.add('badge-hover');
      el.style.zIndex = N + 1;
    });

    el.addEventListener('mouseleave', function () {
      if (flipped === i) return;
      el.classList.remove('badge-hover');
      el.style.zIndex = i;
    });

    el.addEventListener('click', function (e) {
      e.stopPropagation();
      if (flipped === i) {
        // flip back
        inner.style.transform = '';
        el.classList.remove('badge-flipped');
        flipped = -1;
      } else {
        // reset previous
        if (flipped !== -1) {
          cards[flipped].inner.style.transform = '';
          cards[flipped].el.classList.remove('badge-flipped', 'badge-hover');
          cards[flipped].el.style.zIndex = cards[flipped].i;
        }
        inner.style.transform = 'rotateY(180deg)';
        el.classList.add('badge-flipped');
        el.style.zIndex = N + 1;
        flipped = i;
      }
    });
  });

  /* click outside resets */
  document.addEventListener('click', function (e) {
    if (flipped !== -1 && !container.contains(e.target)) {
      var c = cards[flipped];
      c.inner.style.transform = '';
      c.el.classList.remove('badge-flipped', 'badge-hover');
      c.el.style.zIndex = c.i;
      flipped = -1;
    }
  });
})();
