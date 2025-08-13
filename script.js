// Text-only cards: Places API (New) live search with minimal cost
// - Fix: locationBias.circle.center must be { latitude, longitude } (not lat/lng)
// - Photos are not requested (no photo charges). Details are fetched only on click.
(() => {
  const MAX_RESULTS = 6; // 表示件数
  const SAMPLE_PATH = "data/places.sample.json";

  const $ = (s, r=document) => r.querySelector(s);
  const resultsEl = $("#results");
  const badgeEl = $("#dataBadge");
  const statusEl = $("#status");
  const startBtn = $("#startSearchBtn");
  const clearBtn = $("#clearBtn");

  function setBadge(t){ if(badgeEl) badgeEl.textContent = t; }
  function setStatus(t){ if(statusEl) statusEl.textContent = t || ""; }
  function clearResults(){ resultsEl.innerHTML = ""; setStatus(""); }

  function yenRange(level){
    switch(level){
      case 0: return "参考価格: ¥0〜¥999";
      case 1: return "参考価格: ¥1,000〜¥1,999";
      case 2: return "参考価格: ¥2,000〜¥3,999";
      case 3: return "参考価格: ¥4,000〜¥6,999";
      case 4: return "参考価格: ¥7,000〜";
      default: return "";
    }
  }

  function card(p){
    const title = p.name || "名称不明";
    const rating = p.rating ?? "-";
    const reviews = p.user_ratings_total ?? 0;
    const address = p.vicinity || p.address || "";
    const price = (p.price_level != null) ? yenRange(p.price_level) : "";
    const desc = p.summary || p.editorial_summary || "";

    const el = document.createElement("article");
    el.className = "place-card";
    el.innerHTML = `
      <h3 class="place-title">${title}</h3>
      <div class="meta">
        <span>⭐ ${rating}</span>
        <span>・ ${reviews}件</span>
        ${p.price_level != null ? `<span>・ ${"¥".repeat(Math.max(1, Math.min(4, Math.round(p.price_level))))}</span>` : ""}
      </div>
      <div class="badges">
        ${address ? `<span class="badge">${address}</span>` : ""}
        ${(p.tags||[]).slice(0,3).map(t=>`<span class="badge">${t}</span>`).join("")}
      </div>
      ${desc ? `<div class="desc">${desc}</div>` : ""}
      ${price ? `<div class="price">${price}</div>` : ""}
      <div class="actions">
        ${p.url ? `<a class="secondary link" href="${p.url}" target="_blank" rel="noopener">Googleマップで開く</a>` : ""}
        <button class="secondary" data-action="details">詳細</button>
      </div>
      <div class="details hidden"></div>
    `;

    // 詳細はクリック時だけ（節約）
    const detailsBtn = el.querySelector("[data-action='details']");
    const detailsEl = el.querySelector(".details");
    detailsBtn.addEventListener("click", async () => {
      if(!detailsEl.classList.contains("hidden")){ detailsEl.classList.add("hidden"); return; }
      detailsBtn.disabled = true;
      detailsEl.classList.remove("hidden");
      detailsEl.textContent = "読み込み中...";

      try{
        const key = (typeof GOOGLE_API_KEY !== "undefined") ? GOOGLE_API_KEY : "";
        const resource = p.place_resource; // places/xxxx 形式（ライブ時のみ存在）
        if(key && resource){
          const url = `https://places.googleapis.com/v1/${encodeURIComponent(resource)}?fields=displayName,internationalPhoneNumber,formattedAddress,currentOpeningHours,websiteUri`;
          const res = await fetch(url, { headers: { "X-Goog-Api-Key": key } });
          if(!res.ok) throw new Error("DETAILS_FAIL");
          const d = await res.json();
          const name = d.displayName?.text || title;
          const tel = d.internationalPhoneNumber ? `TEL: ${d.internationalPhoneNumber}` : "";
          const addr = d.formattedAddress || address || "";
          const hours = d.currentOpeningHours?.weekdayDescriptions?.join(" / ") || "";
          const web = d.websiteUri ? `<a href="${d.websiteUri}" target="_blank" rel="noopener">公式サイト</a>` : "";
          detailsEl.innerHTML = [name, addr, tel, hours, web].filter(Boolean).map(x=>`<div>${x}</div>`).join("");
        }else{
          detailsEl.textContent = "節約モード：APIキー未設定のため詳細のライブ取得は省略。";
        }
      }catch(e){
        console.error(e);
        detailsEl.textContent = "詳細の取得に失敗しました";
      }finally{
        detailsBtn.disabled = false;
      }
    });

    return el;
  }

  function render(list){
    clearResults();
    const items = list.slice(0, MAX_RESULTS);
    if(!items.length){ setStatus("対象が見つかりませんでした"); return; }
    for(const p of items){ resultsEl.appendChild(card(p)); }
    setStatus(`${items.length}件表示（画像なし・コスト最小）`);
  }

  async function searchWithApi(){
    const key = (typeof GOOGLE_API_KEY !== "undefined") ? GOOGLE_API_KEY : "";
    if(!key) throw new Error("NO_KEY");

    // centerは { latitude, longitude } 形式にする
    const loc = DEFAULT_QUERY.location || {};
    const center = (typeof loc.latitude === "number" && typeof loc.longitude === "number")
      ? { latitude: loc.latitude, longitude: loc.longitude }
      : (typeof loc.lat === "number" && typeof loc.lng === "number")
        ? { latitude: loc.lat, longitude: loc.lng }
        : undefined;

    const body = {
      textQuery: DEFAULT_QUERY.keyword || "レストラン",
      locationBias: center ? { circle: { center, radius: DEFAULT_QUERY.radius || 1500 } } : undefined,
      maxResultCount: 12,
      languageCode: "ja",
      regionCode: "JP"
    };

    // 写真フィールドは要求しない（写真課金ゼロ）
    const FIELDS =
      "places.name,places.displayName,places.rating,places.userRatingCount,places.priceLevel,places.formattedAddress,places.googleMapsUri";

    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": FIELDS
      },
      body: JSON.stringify(body)
    });
    if(!res.ok) throw new Error("API_FAIL " + res.status);
    const data = await res.json();
    return (data.places || []).map(p => ({
      place_resource: p.name, // details用
      name: p.displayName?.text,
      rating: p.rating,
      user_ratings_total: p.userRatingCount,
      price_level: p.priceLevel,
      address: p.formattedAddress,
      url: p.googleMapsUri
    }));
  }

  async function loadSample(){
    const res = await fetch(SAMPLE_PATH, { cache:"no-store" });
    if(!res.ok) throw new Error("SAMPLE_FAIL");
    const data = await res.json();
    return data.places || data || [];
  }

  async function start(){
    setStatus("検索中…");
    try{
      let list;
      try{
        list = await searchWithApi();
        setBadge("Google Places API（ライブ）");
      }catch(e){
        console.warn("Live search failed, fallback to sample:", e);
        setBadge(SAMPLE_PATH);
        list = await loadSample();
      }
      render(list);
    }catch(err){
      console.error(err);
      clearResults();
      setStatus("読み込みに失敗しました");
    }
  }

  startBtn?.addEventListener("click", start);
  clearBtn?.addEventListener("click", clearResults);
  document.addEventListener("DOMContentLoaded", () => setBadge(SAMPLE_PATH));
})();
