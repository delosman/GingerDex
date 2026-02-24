(function () {
  "use strict";

  let DATA = null;
  let currentView = "gallery";
  let compareCard = null; // holds first card for comparison

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
  const packOverlay = document.getElementById("packOverlay");
  const packContainer = document.getElementById("packContainer");
  const compareOverlay = document.getElementById("compareOverlay");
  const compareBody = document.getElementById("compareBody");
  const tickerTrack = document.getElementById("tickerTrack");

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
    buildCatchFeed();
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

  // ===== ACHIEVEMENT BADGES =====

  function getAchievements(trainer) {
    const trainerCards = new Set(trainer.cards.map((c) => c.toLowerCase()));
    const uniqueCount = trainer.uniqueCount;
    const totalCards = trainer.totalCards;

    // Build set of card objects that trainer has
    const ownedCards = DATA.cards.filter((c) => hasCard(c, trainerCards));

    // Region card counts
    const originalCards = ownedCards.filter((c) => (c.region || "Original") === "Original");
    const umbraCards = ownedCards.filter((c) => c.region === "Umbrareach");
    const frostCards = ownedCards.filter((c) => c.region === "Skyfrost Vale");
    const rustCards = ownedCards.filter((c) => c.region === "Rusthallow");
    const marshCards = ownedCards.filter((c) => c.region === "Copperspore Marsh");

    // Region totals
    const totalOriginal = DATA.cards.filter((c) => (c.region || "Original") === "Original").length;
    const totalUmbra = DATA.cards.filter((c) => c.region === "Umbrareach").length;
    const totalFrost = DATA.cards.filter((c) => c.region === "Skyfrost Vale").length;
    const totalRust = DATA.cards.filter((c) => c.region === "Rusthallow").length;
    const totalMarsh = DATA.cards.filter((c) => c.region === "Copperspore Marsh").length;

    // Check for high-rarity cards
    const highRarities = ["legendary", "mythic", "1stedition", "chaos"];
    const hasHighRarity = ownedCards.some((c) => highRarities.includes(c.rarity));

    // Type collection tracking
    const ownedTypes = new Set();
    ownedCards.forEach((c) => {
      c.type.split(" / ").forEach((t) => ownedTypes.add(t.trim().toLowerCase()));
    });
    const allTypes = new Set();
    DATA.cards.forEach((c) => {
      c.type.split(" / ").forEach((t) => allTypes.add(t.trim().toLowerCase()));
    });

    // Rarity collection tracking
    const ownedRarities = new Set(ownedCards.map((c) => c.rarity));

    // Type-specific counts
    const fireCards = ownedCards.filter((c) => c.type.toLowerCase().includes("fire"));
    const darkCards = ownedCards.filter((c) => c.type.toLowerCase().includes("dark"));
    const dragonCards = ownedCards.filter((c) => c.type.toLowerCase().includes("dragon"));
    const steelCards = ownedCards.filter((c) => c.type.toLowerCase().includes("steel"));
    const poisonCards = ownedCards.filter((c) => c.type.toLowerCase().includes("poison"));
    const psychicCards = ownedCards.filter((c) => c.type.toLowerCase().includes("psychic"));
    const dualTypes = ownedCards.filter((c) => c.type.includes(" / "));

    // Multi-region presence
    const regionsWithCards = new Set(ownedCards.map((c) => c.region || "Original"));

    // Rarity tier checks
    const hasMythic = ownedCards.some((c) => c.rarity === "mythic");
    const hasChaos = ownedCards.some((c) => c.rarity === "chaos");
    const has1st = ownedCards.some((c) => c.rarity === "1stedition");
    const exCards = ownedCards.filter((c) => ["ex", "evolutionex"].includes(c.rarity));

    const achievements = [
      // --- Milestone badges ---
      { id: "first", icon: "\u2b50", name: "First Catch", desc: "Caught at least 1 GingerMon", earned: uniqueCount >= 1 },
      { id: "collector", icon: "\ud83c\udfc5", name: "Collector", desc: "Caught 10+ unique GingerMon", earned: uniqueCount >= 10 },
      { id: "veteran", icon: "\ud83c\udf96\ufe0f", name: "Veteran", desc: "Caught 25+ unique GingerMon", earned: uniqueCount >= 25 },
      { id: "master", icon: "\ud83d\udc51", name: "Master", desc: "Caught 50+ unique GingerMon", earned: uniqueCount >= 50 },
      { id: "centurion", icon: "\ud83d\udee1\ufe0f", name: "Centurion", desc: "Caught 100+ unique GingerMon", earned: uniqueCount >= 100 },
      { id: "legend", icon: "\ud83c\udf1f", name: "Living Legend", desc: "Caught 150+ unique GingerMon", earned: uniqueCount >= 150 },
      { id: "complete", icon: "\ud83c\udfc6", name: "Completionist", desc: "100% collection complete", earned: uniqueCount >= totalCards },

      // --- Region complete badges ---
      { id: "region-original", icon: "\ud83d\udd25", name: "Original Complete", desc: "All Original region cards", earned: originalCards.length >= totalOriginal },
      { id: "region-umbra", icon: "\ud83c\udf11", name: "Umbrareach Complete", desc: "All Umbrareach region cards", earned: umbraCards.length >= totalUmbra },
      { id: "region-frost", icon: "\u2744\ufe0f", name: "Skyfrost Complete", desc: "All Skyfrost Vale region cards", earned: frostCards.length >= totalFrost },
      { id: "region-rust", icon: "\u2699\ufe0f", name: "Rusthallow Complete", desc: "All Rusthallow region cards", earned: rustCards.length >= totalRust },
      { id: "region-marsh", icon: "\ud83c\udf44", name: "Copperspore Complete", desc: "All Copperspore Marsh region cards", earned: marshCards.length >= totalMarsh },

      // --- Region explorer badges ---
      { id: "shadow", icon: "\ud83c\udf0c", name: "Shadow Collector", desc: "Caught 10+ Umbrareach cards", earned: umbraCards.length >= 10 },
      { id: "frost-walker", icon: "\u26c4", name: "Frost Walker", desc: "Caught 10+ Skyfrost Vale cards", earned: frostCards.length >= 10 },
      { id: "rust-pioneer", icon: "\ud83d\udd29", name: "Rusthallow Pioneer", desc: "Caught 10+ Rusthallow cards", earned: rustCards.length >= 10 },
      { id: "marsh-explorer", icon: "\ud83c\udf3f", name: "Marsh Explorer", desc: "Caught 10+ Copperspore Marsh cards", earned: marshCards.length >= 10 },
      { id: "globetrotter", icon: "\ud83c\udf0d", name: "Globetrotter", desc: "Caught cards from all 5 regions", earned: regionsWithCards.size >= 5 },

      // --- Rarity badges ---
      { id: "rare-hunter", icon: "\ud83d\udc8e", name: "Rare Hunter", desc: "Caught a Legendary or higher rarity", earned: hasHighRarity },
      { id: "mythic-find", icon: "\ud83d\udd2e", name: "Mythic Find", desc: "Caught a Mythic rarity card", earned: hasMythic },
      { id: "chaos-touched", icon: "\ud83c\udf00", name: "Chaos Touched", desc: "Caught a Chaos rarity card", earned: hasChaos },
      { id: "first-edition", icon: "\ud83c\udccf", name: "First Edition", desc: "Caught a 1st Edition card", earned: has1st },
      { id: "ex-collector", icon: "\u26a1", name: "EX Collector", desc: "Caught 5+ EX/Evolution EX cards", earned: exCards.length >= 5 },
      { id: "rarity-rainbow", icon: "\ud83c\udf08", name: "Rarity Rainbow", desc: "Caught cards of 8+ different rarities", earned: ownedRarities.size >= 8 },

      // --- Type mastery badges ---
      { id: "pyromaniac", icon: "\ud83d\udca5", name: "Pyromaniac", desc: "Caught 10+ Fire-type cards", earned: fireCards.length >= 10 },
      { id: "shadow-lord", icon: "\ud83d\udc7b", name: "Shadow Lord", desc: "Caught 10+ Dark-type cards", earned: darkCards.length >= 10 },
      { id: "dragon-tamer", icon: "\ud83d\udc09", name: "Dragon Tamer", desc: "Caught 5+ Dragon-type cards", earned: dragonCards.length >= 5 },
      { id: "iron-forged", icon: "\u2694\ufe0f", name: "Iron Forged", desc: "Caught 5+ Steel-type cards", earned: steelCards.length >= 5 },
      { id: "toxic-touch", icon: "\u2620\ufe0f", name: "Toxic Touch", desc: "Caught 5+ Poison-type cards", earned: poisonCards.length >= 5 },
      { id: "mind-reader", icon: "\ud83e\udde0", name: "Mind Reader", desc: "Caught 5+ Psychic-type cards", earned: psychicCards.length >= 5 },
      { id: "type-master", icon: "\ud83c\udfa8", name: "Type Master", desc: "Caught every type in the game", earned: ownedTypes.size >= allTypes.size },
      { id: "dual-wielder", icon: "\u2728", name: "Dual Wielder", desc: "Caught 10+ dual-type cards", earned: dualTypes.length >= 10 },

      // --- Fun / special badges ---
      { id: "halfway", icon: "\ud83d\udcca", name: "Halfway There", desc: "Reached 50% collection completion", earned: uniqueCount >= Math.ceil(totalCards / 2) },
      { id: "power-house", icon: "\ud83d\udcaa", name: "Powerhouse", desc: "Own a card with 300+ HP", earned: ownedCards.some((c) => (c.hp || 0) >= 300) },
      { id: "nuke", icon: "\u2604\ufe0f", name: "Walking Nuke", desc: "Own a card with a 250+ damage move", earned: ownedCards.some((c) => c.moves && c.moves.some((m) => m.damage >= 250)) },
    ];

    return achievements;
  }

  function renderBadges(trainer) {
    const achievements = getAchievements(trainer);
    return `
      <div class="badge-row">
        ${achievements.map((a) => `
          <div class="badge${a.earned ? "" : " unearned"}">
            <span class="badge-icon">${a.icon}</span>
            <span>${a.name}</span>
            <div class="badge-tooltip">${a.desc}</div>
          </div>
        `).join("")}
      </div>
    `;
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
      ${renderBadges(trainer)}
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

    const compareLabel = compareCard
      ? (cardKey(compareCard) === key ? "Selected for Compare" : "Compare with " + compareCard.displayName)
      : "Compare";

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

      <div style="text-align:center;">
        <button class="compare-btn" id="compareBtn">${compareLabel}</button>
      </div>

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

    // Compare button
    document.getElementById("compareBtn").addEventListener("click", () => {
      startCompare(card);
    });

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

  // ===== CATCH FEED TICKER =====

  function buildCatchFeed() {
    // Flatten all catch images from all cards
    const allCatches = [];
    DATA.cards.forEach((card) => {
      if (card.catchImages && card.catchImages.length > 0) {
        card.catchImages.forEach((ci) => {
          allCatches.push({ card, catch: ci });
        });
      }
    });

    // Sort by timestamp descending (newest first)
    allCatches.sort((a, b) => b.catch.timestamp.localeCompare(a.catch.timestamp));

    // Take top 15
    const recent = allCatches.slice(0, 15);

    if (recent.length === 0) {
      tickerTrack.parentElement.style.display = "none";
      return;
    }

    // Build items (duplicate for seamless loop)
    const itemsHTML = recent.map((entry) => {
      const thumbSrc = entry.catch.isVideo
        ? entry.catch.file
        : entry.catch.file;
      const thumbEl = entry.catch.isVideo
        ? `<video src="${thumbSrc}" class="ticker-thumb" autoplay loop muted playsinline></video>`
        : `<img src="${thumbSrc}" class="ticker-thumb" alt="${entry.card.displayName}">`;

      return `
        <div class="ticker-item" data-card-key="${cardKey(entry.card)}">
          ${thumbEl}
          <div class="ticker-info">
            <div class="ticker-card-name">${entry.card.displayName}</div>
            <div class="ticker-trainer">${escapeHtml(entry.catch.displayName)}</div>
          </div>
        </div>
      `;
    }).join("");

    // Duplicate for seamless scroll loop
    tickerTrack.innerHTML = itemsHTML + itemsHTML;
  }

  // ===== CARD COMPARISON =====

  function startCompare(card) {
    if (!compareCard) {
      // First card selected
      compareCard = card;
      cardModal.classList.remove("open");
      showToast("Card A selected: " + card.displayName + " \u2014 now open another card and click Compare");
    } else if (cardKey(compareCard) === cardKey(card)) {
      // Same card clicked again, deselect
      compareCard = null;
      showToast("Comparison cleared");
    } else {
      // Second card selected, show comparison
      cardModal.classList.remove("open");
      showComparison(compareCard, card);
      compareCard = null;
    }
  }

  function showComparison(cardA, cardB) {
    const totalPull = DATA.cards.reduce((s, c) => s + c.pullRate, 0);
    const pullA = (cardA.pullRate / totalPull * 100).toFixed(2);
    const pullB = (cardB.pullRate / totalPull * 100).toFixed(2);

    function cardImgSrc(card) {
      if (card.catchImages && card.catchImages.length > 0) {
        return card.catchImages[card.catchImages.length - 1].file;
      }
      if (card.imageFile) return "cards/" + card.imageFile;
      return "";
    }

    function totalDamage(card) {
      if (!card.moves || !card.moves.length) return 0;
      return card.moves.reduce((s, m) => s + (m.damage || 0), 0);
    }

    function statRow(label, valA, valB, higherBetter) {
      let clsA = "", clsB = "";
      if (typeof valA === "number" && typeof valB === "number" && valA !== valB) {
        if (higherBetter) {
          clsA = valA > valB ? " compare-winner" : " compare-loser";
          clsB = valB > valA ? " compare-winner" : " compare-loser";
        } else {
          clsA = valA < valB ? " compare-winner" : " compare-loser";
          clsB = valB < valA ? " compare-winner" : " compare-loser";
        }
      }
      return `
        <div class="compare-stat-row">
          <div class="compare-val-left${clsA}">${valA}</div>
          <div class="compare-stat-label">${label}</div>
          <div class="compare-val-right${clsB}">${valB}</div>
        </div>
      `;
    }

    const dmgA = totalDamage(cardA);
    const dmgB = totalDamage(cardB);

    const movesA = cardA.moves ? cardA.moves.map((m) => m.name + " (" + m.damage + ")").join(", ") : "None";
    const movesB = cardB.moves ? cardB.moves.map((m) => m.name + " (" + m.damage + ")").join(", ") : "None";

    compareBody.innerHTML = `
      <div class="compare-header"><h2>Card Comparison</h2></div>
      <div class="compare-grid">
        <div class="compare-card">
          <img src="${cardImgSrc(cardA)}" class="compare-card-img" alt="${cardA.displayName}">
          <div class="compare-card-name" style="color:${cardA.rarityColor}">${cardA.displayName}</div>
          <span class="card-rarity" style="background:${cardA.rarityColor}22;color:${cardA.rarityColor}">${cardA.rarityDisplay}</span>
        </div>
        <div class="compare-vs">VS</div>
        <div class="compare-card">
          <img src="${cardImgSrc(cardB)}" class="compare-card-img" alt="${cardB.displayName}">
          <div class="compare-card-name" style="color:${cardB.rarityColor}">${cardB.displayName}</div>
          <span class="card-rarity" style="background:${cardB.rarityColor}22;color:${cardB.rarityColor}">${cardB.rarityDisplay}</span>
        </div>
      </div>
      <div class="compare-stats">
        ${statRow("HP", cardA.hp || 0, cardB.hp || 0, true)}
        ${statRow("Type", capitalize(cardA.type), capitalize(cardB.type), null)}
        ${statRow("Rarity Tier", cardA.rarityTier, cardB.rarityTier, true)}
        ${statRow("Weakness", cardA.weakness || "None", cardB.weakness || "None", null)}
        ${statRow("Resistance", cardA.resistance || "None", cardB.resistance || "None", null)}
        ${statRow("Catch Count", cardA.catchCount, cardB.catchCount, true)}
        ${statRow("Pull Rate", pullA + "%", pullB + "%", null)}
        ${statRow("Total Damage", dmgA, dmgB, true)}
        ${statRow("Moves", movesA, movesB, null)}
      </div>
      <button class="compare-clear-btn" id="compareClearBtn">Clear &amp; Close</button>
    `;

    compareOverlay.classList.add("open");

    document.getElementById("compareClearBtn").addEventListener("click", () => {
      compareOverlay.classList.remove("open");
      compareCard = null;
    });
  }

  function showToast(msg) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
  }

  // ===== PACK OPENER =====

  function weightedRandomCards(count) {
    const cards = DATA.cards;
    const totalWeight = cards.reduce((s, c) => s + c.pullRate, 0);
    const selected = [];

    for (let i = 0; i < count; i++) {
      let roll = Math.random() * totalWeight;
      for (const card of cards) {
        roll -= card.pullRate;
        if (roll <= 0) {
          selected.push(card);
          break;
        }
      }
    }
    return selected;
  }

  function openPack() {
    packContainer.innerHTML = `
      <button class="pack-close-btn" id="packCloseBtn">&times;</button>
      <div class="pack-wrapper" id="packClickArea">
        <div class="pack-box">
          <div class="pack-title">GingerDex</div>
          <div class="pack-subtitle">Card Pack</div>
        </div>
      </div>
      <div class="pack-hint">Click the pack to open!</div>
    `;
    packOverlay.classList.add("open");

    document.getElementById("packCloseBtn").addEventListener("click", closePack);

    document.getElementById("packClickArea").addEventListener("click", () => {
      revealPack();
    }, { once: true });
  }

  function revealPack() {
    const pulled = weightedRandomCards(3);

    // Determine the highest rarity tier for screen flash
    const maxTier = Math.max(...pulled.map((c) => c.rarityTier || 0));
    const flashColor = maxTier >= 6 ? pulled.find((c) => (c.rarityTier || 0) === maxTier).rarityColor : null;

    // Flash effect for high rarity pulls
    if (flashColor) {
      const flash = document.createElement("div");
      flash.className = "screen-flash";
      flash.style.background = flashColor;
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 500);
    }

    const cardsHTML = pulled.map((card, i) => {
      const imgSrc = card.imageFile ? `cards/${card.imageFile}` : "";
      const mediaEl = card.videoFile
        ? `<video src="cards/${card.videoFile}" class="card-vid" autoplay loop muted playsinline></video>`
        : (imgSrc ? `<img src="${imgSrc}" alt="${card.displayName}" class="card-img">` : `<div class="card-placeholder">${card.displayName[0]}</div>`);

      return `
        <div class="pack-card-wrapper" data-card-key="${cardKey(card)}" data-index="${i}" style="--glow-color: ${card.rarityColor}">
          <div class="pack-card-inner">
            <div class="pack-card-front">
              <div class="pack-card-front-design">
                <div class="logo">GingerDex</div>
                <div class="qmark">?</div>
              </div>
            </div>
            <div class="pack-card-back">
              <div class="card-media">${mediaEl}</div>
              <div class="pack-card-info">
                <div class="name" style="color:${card.rarityColor}">${card.displayName}</div>
                <span class="rarity-tag" style="background:${card.rarityColor}22;color:${card.rarityColor}">${card.rarityDisplay}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    packContainer.innerHTML = `
      <button class="pack-close-btn" id="packCloseBtn">&times;</button>
      <div class="pack-results">${cardsHTML}</div>
      <button class="pack-open-another" id="packAgainBtn">Open Another Pack</button>
    `;

    document.getElementById("packCloseBtn").addEventListener("click", closePack);
    document.getElementById("packAgainBtn").addEventListener("click", () => openPack());

    // Staggered fly-in and flip animations
    const wrappers = packContainer.querySelectorAll(".pack-card-wrapper");
    wrappers.forEach((wrapper, i) => {
      setTimeout(() => {
        wrapper.classList.add("reveal");
        // Flip after fly-in
        setTimeout(() => {
          wrapper.querySelector(".pack-card-inner").classList.add("flipped");
          // Add glow for higher rarity cards
          const card = pulled[i];
          if ((card.rarityTier || 0) >= 3) {
            wrapper.classList.add("rarity-glow");
          }
        }, 600);
      }, i * 400);
    });

    // Click revealed card to open its detail modal
    wrappers.forEach((wrapper) => {
      wrapper.addEventListener("click", () => {
        const key = wrapper.dataset.cardKey;
        closePack();
        showCardModal(key);
      });
    });
  }

  function closePack() {
    packOverlay.classList.remove("open");
  }

  // ===== EVENT BINDING =====

  function bindEvents() {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      if (btn.dataset.view) {
        btn.addEventListener("click", () => switchView(btn.dataset.view));
      }
    });

    // Open Pack button
    document.getElementById("openPackBtn").addEventListener("click", openPack);

    searchInput.addEventListener("input", renderGallery);
    regionFilter.addEventListener("change", renderGallery);
    typeFilter.addEventListener("change", renderGallery);
    rarityFilter.addEventListener("change", renderGallery);

    document.addEventListener("click", (e) => {
      // Ticker item clicks
      const tickerItem = e.target.closest(".ticker-item[data-card-key]");
      if (tickerItem) {
        showCardModal(tickerItem.dataset.cardKey);
        return;
      }

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

    // Compare overlay close
    document.getElementById("compareClose").addEventListener("click", () => {
      compareOverlay.classList.remove("open");
    });
    compareOverlay.addEventListener("click", (e) => {
      if (e.target === compareOverlay) compareOverlay.classList.remove("open");
    });

    // Pack overlay close on background click
    packOverlay.addEventListener("click", (e) => {
      if (e.target === packOverlay) closePack();
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
