(function () {
  "use strict";

  let DATA = null;
  let currentView = "gallery";

  const cardGrid = document.getElementById("cardGrid");
  const leaderboardList = document.getElementById("leaderboardList");
  const trainerGrid = document.getElementById("trainerGrid");
  const trainerHeader = document.getElementById("trainerHeader");
  const statsBar = document.getElementById("statsBar");
  const searchInput = document.getElementById("searchInput");
  const regionFilter = document.getElementById("regionFilter");
  const typeFilter = document.getElementById("typeFilter");
  const rarityFilter = document.getElementById("rarityFilter");
  const cardModal = document.getElementById("cardModal");
  const modalBody = document.getElementById("modalBody");
  const galleryControls = document.getElementById("galleryControls");

  fetch("data.json")
    .then((r) => r.json())
    .then((data) => {
      DATA = data;
      init();
    })
    .catch((err) => {
      cardGrid.innerHTML = '<p class="no-results">Failed to load GingerDex data.</p>';
      console.error(err);
    });

  function init() {
    renderStats();
    populateFilters();
    renderGallery();
    renderLeaderboard();
    bindEvents();
  }

  function renderStats() {
    const caught = DATA.cards.filter((c) => c.catchCount > 0).length;
    const regionCount = DATA.regions ? DATA.regions.length : 1;
    statsBar.innerHTML = `
      <div class="stat"><div class="stat-value">${DATA.totalCards}</div><div class="stat-label">GingerMon</div></div>
      <div class="stat"><div class="stat-value">${caught}</div><div class="stat-label">Discovered</div></div>
      <div class="stat"><div class="stat-value">${DATA.totalTrainers}</div><div class="stat-label">Trainers</div></div>
      <div class="stat"><div class="stat-value">${regionCount}</div><div class="stat-label">Regions</div></div>
    `;
  }

  function populateFilters() {
    if (DATA.regions) {
      DATA.regions.forEach((r) => {
        regionFilter.innerHTML += `<option value="${r}">${r}</option>`;
      });
    }
    DATA.types.forEach((t) => {
      typeFilter.innerHTML += `<option value="${t}">${capitalize(t)}</option>`;
    });
    DATA.rarities.forEach((r) => {
      const display = DATA.rarityDisplay[r] || capitalize(r);
      rarityFilter.innerHTML += `<option value="${r}">${display}</option>`;
    });
  }

  function getFilteredCards(cards) {
    let filtered = [...cards];
    const query = searchInput.value.toLowerCase().trim();
    const region = regionFilter.value;
    const type = typeFilter.value;
    const rarity = rarityFilter.value;

    if (query) {
      filtered = filtered.filter(
        (c) =>
          c.displayName.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query) ||
          c.type.toLowerCase().includes(query) ||
          (c.region && c.region.toLowerCase().includes(query)) ||
          c.caughtBy.some((t) => t.toLowerCase().includes(query))
      );
    }
    if (region) filtered = filtered.filter((c) => c.region === region);
    if (type) filtered = filtered.filter((c) => c.type === type);
    if (rarity) filtered = filtered.filter((c) => c.rarity === rarity);

    return filtered;
  }

  function renderGallery() {
    const filtered = getFilteredCards(DATA.cards);
    if (filtered.length === 0) {
      cardGrid.innerHTML = '<p class="no-results">No cards match your search.</p>';
      return;
    }

    // Group cards by region in order
    const regionOrder = DATA.regionOrder || DATA.regions || ["Original"];
    const grouped = {};
    regionOrder.forEach((r) => { grouped[r] = []; });

    filtered.forEach((c) => {
      const r = c.region || "Original";
      if (!grouped[r]) grouped[r] = [];
      grouped[r].push(c);
    });

    // Sort each region by card number
    for (const r in grouped) {
      grouped[r].sort((a, b) => (a.cardNumber || 0) - (b.cardNumber || 0));
    }

    // Build HTML with region sections
    let html = "";
    for (const region of regionOrder) {
      const cards = grouped[region];
      if (!cards || cards.length === 0) continue;

      const info = (DATA.regionInfo && DATA.regionInfo[region]) || {};
      const emoji = info.emoji || "";
      const label = info.label || region.toUpperCase();
      const count = info.cardCount || cards.length;

      html += `
        <div class="region-section">
          <div class="region-header">
            <span class="region-emoji">${emoji}</span>
            <span class="region-title">${label} (#1\u2013${count})</span>
          </div>
          <div class="card-grid">
            ${cards.map((c) => cardHTML(c, false)).join("")}
          </div>
        </div>
      `;
    }

    cardGrid.innerHTML = html;
  }

  function cardMediaHTML(card, caught, trainerCatchImg) {
    if (!caught) {
      if (card.imageFile) {
        return `<div class="card-media"><img src="cards/${card.imageFile}" alt="Unknown" class="card-img silhouette"></div>`;
      }
      return `<div class="card-media"><div class="card-placeholder silhouette">?</div></div>`;
    }

    if (trainerCatchImg) {
      if (trainerCatchImg.isVideo) {
        return `<div class="card-media"><video src="${trainerCatchImg.file}" class="card-vid" autoplay loop muted playsinline></video></div>`;
      }
      return `<div class="card-media"><img src="${trainerCatchImg.file}" alt="${card.displayName}" class="card-img"></div>`;
    }

    if (card.catchImages && card.catchImages.length > 0) {
      const latest = card.catchImages[card.catchImages.length - 1];
      if (latest.isVideo) {
        return `<div class="card-media"><video src="${latest.file}" class="card-vid" autoplay loop muted playsinline></video></div>`;
      }
      return `<div class="card-media"><img src="${latest.file}" alt="${card.displayName}" class="card-img"></div>`;
    }

    if (card.videoFile) {
      return `<div class="card-media"><video src="cards/${card.videoFile}" class="card-vid" autoplay loop muted playsinline></video></div>`;
    }
    if (card.imageFile) {
      return `<div class="card-media"><img src="cards/${card.imageFile}" alt="${card.displayName}" class="card-img"></div>`;
    }
    return `<div class="card-media"><div class="card-placeholder">${card.displayName[0]}</div></div>`;
  }

  function cardHTML(card, isTrainerView, trainerHas, trainerCatchImg) {
    const caught = isTrainerView ? trainerHas : card.catchCount > 0;
    const cls = caught ? "" : " uncaught";
    const displayName = caught ? card.displayName : "???";
    const catchBadge = !isTrainerView && card.catchCount > 0
      ? `<span class="card-catch-count">${card.catchCount} caught</span>`
      : "";
    const numberBadge = card.cardNumber
      ? `<span class="card-number">#${card.cardNumber}</span>`
      : "";

    return `
      <div class="card${cls}" data-card-key="${cardKey(card)}" style="border-color: ${caught ? card.rarityColor : 'var(--border)'}">
        ${numberBadge}
        ${catchBadge}
        ${cardMediaHTML(card, caught, trainerCatchImg)}
        <div class="card-name">${displayName}</div>
        <div class="card-meta">${capitalize(card.type)}${card.hp ? ' &middot; ' + card.hp + ' HP' : ''}</div>
        <span class="card-rarity" style="background: ${card.rarityColor}22; color: ${card.rarityColor}">${card.rarityDisplay}</span>
      </div>
    `;
  }

  function cardKey(card) {
    if (card.region && card.region !== "Original") {
      return card.region + ":" + card.displayName;
    }
    return card.name || card.displayName;
  }

  function findCardByKey(key) {
    return DATA.cards.find((c) => cardKey(c) === key);
  }

  function renderLeaderboard() {
    if (!DATA.leaderboard.length) {
      leaderboardList.innerHTML = '<p class="no-results">No trainers yet.</p>';
      return;
    }
    leaderboardList.innerHTML = DATA.leaderboard
      .map((t, i) => {
        const rankCls = i === 0 ? " gold" : i === 1 ? " silver" : i === 2 ? " bronze" : "";
        const pct = t.completionPct;
        return `
        <div class="lb-entry" data-trainer="${t.username}">
          <div class="lb-rank${rankCls}">#${i + 1}</div>
          <div class="lb-name">${escapeHtml(t.displayName)}</div>
          <div class="lb-stats">
            <div class="lb-count">${t.uniqueCount} / ${t.totalCards}</div>
            <div class="lb-pct">${pct}% complete</div>
            <div class="lb-bar-bg"><div class="lb-bar" style="width: ${pct}%"></div></div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  function showTrainerView(username) {
    const trainer = DATA.leaderboard.find((t) => t.username === username);
    if (!trainer) return;

    const trainerCards = new Set(trainer.cards.map((c) => c.toLowerCase()));

    const trainerCatchLookup = {};
    if (trainer.catchImages) {
      trainer.catchImages.forEach((ci) => {
        const key = ci.cardName.toLowerCase().replace(/_/g, " ");
        trainerCatchLookup[key] = ci;
        trainerCatchLookup[key.replace(/ /g, "")] = ci;
      });
    }

    trainerHeader.innerHTML = `
      <button class="back-btn" id="backBtn">&larr; Back</button>
      <h2>${escapeHtml(trainer.displayName)}'s Collection</h2>
      <div class="trainer-stats">${trainer.uniqueCount} / ${trainer.totalCards} GingerMon &middot; ${trainer.completionPct}% complete</div>
    `;

    // Group by region, show in order, caught first within each region
    const regionOrder = DATA.regionOrder || ["Original"];
    const grouped = {};
    regionOrder.forEach((r) => { grouped[r] = []; });

    DATA.cards.forEach((c) => {
      const r = c.region || "Original";
      if (!grouped[r]) grouped[r] = [];
      grouped[r].push(c);
    });

    let html = "";
    for (const region of regionOrder) {
      const cards = grouped[region];
      if (!cards || cards.length === 0) continue;

      // Sort: caught first, then by card number
      const sorted = [...cards].sort((a, b) => {
        const aHas = hasCard(a, trainerCards) ? 0 : 1;
        const bHas = hasCard(b, trainerCards) ? 0 : 1;
        if (aHas !== bHas) return aHas - bHas;
        return (a.cardNumber || 0) - (b.cardNumber || 0);
      });

      const info = (DATA.regionInfo && DATA.regionInfo[region]) || {};
      const emoji = info.emoji || "";
      const label = info.label || region.toUpperCase();
      const count = info.cardCount || cards.length;

      html += `
        <div class="region-section">
          <div class="region-header">
            <span class="region-emoji">${emoji}</span>
            <span class="region-title">${label} (#1\u2013${count})</span>
          </div>
          <div class="card-grid">
            ${sorted.map((c) => {
              const has = hasCard(c, trainerCards);
              const catchKey = c.displayName.toLowerCase();
              const catchKeyNoSpace = catchKey.replace(/ /g, "");
              const catchImg = trainerCatchLookup[catchKey] || trainerCatchLookup[catchKeyNoSpace] || trainerCatchLookup[c.name.toLowerCase()] || null;
              return cardHTML(c, true, has, catchImg);
            }).join("")}
          </div>
        </div>
      `;
    }

    trainerGrid.innerHTML = html;
    switchView("trainer");

    document.getElementById("backBtn").addEventListener("click", () => {
      switchView("leaderboard");
    });
  }

  function hasCard(card, trainerCardsSet) {
    const dn = card.displayName.toLowerCase();
    const n = card.name.toLowerCase();
    const dnNoSpace = dn.replace(/ /g, "");
    return trainerCardsSet.has(dn) || trainerCardsSet.has(n) || trainerCardsSet.has(dnNoSpace);
  }

  function modalMediaHTML(card) {
    if (card.catchImages && card.catchImages.length > 0) {
      const latest = card.catchImages[card.catchImages.length - 1];
      if (latest.isVideo) {
        return `<div class="modal-media"><video src="${latest.file}" class="modal-vid" autoplay loop muted playsinline controls></video></div>`;
      }
      return `<div class="modal-media"><img src="${latest.file}" alt="${card.displayName}" class="modal-img"></div>`;
    }
    if (card.videoFile) {
      return `<div class="modal-media"><video src="cards/${card.videoFile}" class="modal-vid" autoplay loop muted playsinline controls></video></div>`;
    }
    if (card.imageFile) {
      return `<div class="modal-media"><img src="cards/${card.imageFile}" alt="${card.displayName}" class="modal-img"></div>`;
    }
    return "";
  }

  function catchGalleryHTML(card) {
    if (!card.catchImages || card.catchImages.length === 0) return "";

    const items = card.catchImages.map((ci) => {
      if (ci.isVideo) {
        return `
          <div class="catch-item">
            <video src="${ci.file}" class="catch-thumb" autoplay loop muted playsinline></video>
            <div class="catch-trainer">${escapeHtml(ci.displayName)}</div>
          </div>`;
      }
      return `
        <div class="catch-item">
          <img src="${ci.file}" alt="${ci.displayName}" class="catch-thumb">
          <div class="catch-trainer">${escapeHtml(ci.displayName)}</div>
        </div>`;
    }).join("");

    return `
      <div class="modal-section">
        <h3>Catches (${card.catchImages.length})</h3>
        <div class="catch-gallery">${items}</div>
      </div>
    `;
  }

  function movesHTML(moves) {
    if (!moves || !moves.length) return "";
    return `
      <div class="modal-section">
        <h3>Moves</h3>
        ${moves.map((m) => `
          <div class="modal-stat-row">
            <span class="modal-stat-label">${m.name}</span>
            <span class="move-damage">${m.damage} dmg</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function showCardModal(key) {
    const card = findCardByKey(key);
    if (!card) return;

    const pullPct = (card.pullRate / DATA.cards.reduce((s, c) => s + c.pullRate, 0) * 100).toFixed(2);

    const regionTag = card.region
      ? `<div class="modal-region-tag">${card.region} #${card.cardNumber || "?"}</div>`
      : "";

    const statsRows = [
      card.hp ? `<div class="modal-stat-row"><span class="modal-stat-label">HP</span><span>${card.hp}</span></div>` : "",
      `<div class="modal-stat-row"><span class="modal-stat-label">Type</span><span>${capitalize(card.type)}</span></div>`,
      card.weakness ? `<div class="modal-stat-row"><span class="modal-stat-label">Weakness</span><span>${card.weakness}</span></div>` : "",
      card.resistance ? `<div class="modal-stat-row"><span class="modal-stat-label">Resistance</span><span>${card.resistance}</span></div>` : "",
      `<div class="modal-stat-row"><span class="modal-stat-label">Times Caught</span><span>${card.catchCount}</span></div>`,
      `<div class="modal-stat-row"><span class="modal-stat-label">Pull Rate</span><span>${pullPct}%</span></div>`,
    ].filter(Boolean).join("");

    modalBody.innerHTML = `
      ${modalMediaHTML(card)}
      <div class="modal-card-name" style="color: ${card.rarityColor}">${card.displayName}</div>
      ${regionTag}
      <span class="card-rarity" style="background: ${card.rarityColor}22; color: ${card.rarityColor}; display:block; text-align:center; margin: 0.5rem auto; width: fit-content;">${card.rarityDisplay}</span>

      <div class="modal-section">
        <h3>Stats</h3>
        ${statsRows}
      </div>

      ${movesHTML(card.moves)}

      ${catchGalleryHTML(card)}

      <div class="modal-section">
        <h3>Caught By (${card.caughtBy.length})</h3>
        ${
          card.caughtBy.length
            ? `<div class="modal-trainers">${card.caughtBy
                .map(
                  (t) =>
                    `<span class="modal-trainer-tag" data-trainer-tag="${findUsername(t)}">${escapeHtml(t)}</span>`
                )
                .join("")}</div>`
            : '<p style="color: var(--text-dim); font-size: 0.9rem;">No one has caught this GingerMon yet!</p>'
        }
      </div>
    `;

    cardModal.classList.add("open");

    modalBody.querySelectorAll(".modal-trainer-tag").forEach((el) => {
      el.addEventListener("click", () => {
        cardModal.classList.remove("open");
        showTrainerView(el.dataset.trainerTag);
      });
    });
  }

  function findUsername(displayName) {
    const t = DATA.leaderboard.find(
      (t) => t.displayName.toLowerCase() === displayName.toLowerCase()
    );
    return t ? t.username : displayName.toLowerCase();
  }

  function switchView(view) {
    currentView = view;
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));

    if (view === "gallery") {
      document.getElementById("galleryView").classList.add("active");
      document.querySelector('[data-view="gallery"]').classList.add("active");
      galleryControls.style.display = "";
    } else if (view === "leaderboard") {
      document.getElementById("leaderboardView").classList.add("active");
      document.querySelector('[data-view="leaderboard"]').classList.add("active");
      galleryControls.style.display = "none";
    } else if (view === "trainer") {
      document.getElementById("trainerView").classList.add("active");
      galleryControls.style.display = "none";
    }
  }

  function bindEvents() {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });

    searchInput.addEventListener("input", renderGallery);
    regionFilter.addEventListener("change", renderGallery);
    typeFilter.addEventListener("change", renderGallery);
    rarityFilter.addEventListener("change", renderGallery);

    document.addEventListener("click", (e) => {
      const card = e.target.closest(".card[data-card-key]");
      if (card) showCardModal(card.dataset.cardKey);
    });

    leaderboardList.addEventListener("click", (e) => {
      const entry = e.target.closest(".lb-entry[data-trainer]");
      if (entry) showTrainerView(entry.dataset.trainer);
    });

    document.getElementById("modalClose").addEventListener("click", () => {
      cardModal.classList.remove("open");
    });
    cardModal.addEventListener("click", (e) => {
      if (e.target === cardModal) cardModal.classList.remove("open");
    });
  }

  function capitalize(s) {
    return s.split(" / ").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" / ");
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }
})();
