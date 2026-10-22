(() => {
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

  const start = () => {
    if (syncSaveBadges()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (syncSaveBadges() || tries > 50) clearInterval(timer);
    }, 100);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
