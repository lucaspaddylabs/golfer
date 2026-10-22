(() => {
  const READY_CLASS = 'ig-prices-ready';
  const MAX_WAIT_MS = 2500;
  const SETTLE_MS = 50;

  const dollarsToCents = (value) => {
    if (value == null || value === '') return null;
    const num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(num)) return null;
    return Math.round(num * 100);
  };

  const formatMoney = (cents) => {
    const amount = (Math.abs(cents) / 100).toFixed(2);
    return `$${amount}`;
  };

  const syncSaveBadges = () => {
    const priceApi = window.igData?.price;
    if (!priceApi?.getPriceByVariantId) return false;

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

    return true;
  };

  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    syncSaveBadges();
    document.documentElement.classList.add(READY_CLASS);
  };

  const revealAfterSettle = () => {
    window.setTimeout(reveal, SETTLE_MS);
  };

  window.addEventListener('ig:ready', revealAfterSettle, { once: true });

  if (Array.isArray(window.onIgReady)) {
    window.onIgReady.push(revealAfterSettle);
  } else if (typeof window.onIgReady === 'function') {
    const prev = window.onIgReady;
    window.onIgReady = [prev, revealAfterSettle];
  } else {
    window.onIgReady = revealAfterSettle;
  }

  if (window.igData?.price?.getPriceByVariantId) {
    revealAfterSettle();
  }

  window.setTimeout(reveal, MAX_WAIT_MS);
})();
