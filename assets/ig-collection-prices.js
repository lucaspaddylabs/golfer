(() => {
  const READY_CLASS = 'ig-prices-ready';
  const MAX_WAIT_MS = 3000;
  const POLL_MS = 32;

  const dollarsToCents = (value) => {
    if (value == null || value === '') return null;
    const num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(num)) return null;
    // igData returns dollars; DOM money strings do too.
    return Math.round(num * 100);
  };

  const formatMoney = (cents) => {
    const amount = (Math.abs(cents) / 100).toFixed(2);
    return `$${amount}`;
  };

  const syncSaveBadges = () => {
    const priceApi = window.igData?.price;
    if (!priceApi?.getPriceByVariantId) return;

    document.querySelectorAll('[data-ig-save-badge][data-variant-id]').forEach((el) => {
      const variantId = el.getAttribute('data-variant-id');
      const priceCents = dollarsToCents(priceApi.getPriceByVariantId(variantId));
      let compareCents = dollarsToCents(priceApi.getComparePriceByVariantId?.(variantId));
      if (compareCents == null) {
        const fallback = Number(el.getAttribute('data-compare-cents'));
        compareCents = Number.isFinite(fallback) && fallback > 0 ? fallback : null;
      }

      if (priceCents == null || compareCents == null || compareCents <= priceCents) {
        el.hidden = true;
        return;
      }

      el.hidden = false;
      el.textContent = `Save ${formatMoney(compareCents - priceCents)}`;
    });
  };

  const saleNodes = () =>
    document.querySelectorAll(
      '.price__sale[data-variant-id], .price__main[data-variant-id], [data-gn-price][data-variant-id]'
    );

  const pricesMatchIg = () => {
    const priceApi = window.igData?.price;
    if (!priceApi?.getPriceByVariantId) return false;

    const nodes = saleNodes();
    if (!nodes.length) return true;

    let checked = 0;
    for (const el of nodes) {
      const variantId = el.getAttribute('data-variant-id');
      const expected = dollarsToCents(priceApi.getPriceByVariantId(variantId));
      if (expected == null) continue;
      checked += 1;
      const actual = dollarsToCents(el.textContent);
      if (actual !== expected) return false;
    }

    // If nothing on the page is in the price test, ig:ready is enough.
    return true;
  };

  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    syncSaveBadges();
    document.documentElement.classList.add(READY_CLASS);
  };

  const started = Date.now();
  const tick = () => {
    if (pricesMatchIg()) {
      syncSaveBadges();
      reveal();
      return;
    }
    if (Date.now() - started >= MAX_WAIT_MS) {
      reveal();
      return;
    }
    window.setTimeout(tick, POLL_MS);
  };

  const start = () => {
    if (window.igData?.price?.getPriceByVariantId) {
      tick();
      return;
    }

    const onReady = () => tick();
    window.addEventListener('ig:ready', onReady, { once: true });

    if (Array.isArray(window.onIgReady)) {
      window.onIgReady.push(onReady);
    } else if (typeof window.onIgReady === 'function') {
      const prev = window.onIgReady;
      window.onIgReady = [prev, onReady];
    } else {
      window.onIgReady = onReady;
    }

    window.setTimeout(tick, MAX_WAIT_MS);
  };

  start();
})();
