(() => {
  const dollarsToCents = (value) => {
    if (value == null || value === '') return null;
    const num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(num)) return null;
    return Math.round(num * 100);
  };

  const formatMoney = (cents) => {
    let result = `$${(Math.abs(cents) / 100).toFixed(2)}`;
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      try {
        result = window.Shopify.formatMoney(cents);
      } catch (error) {
        // keep fallback
      }
    }
    return String(result).replace(/US\$/g, '$').replace(/US \$/g, '$');
  };

  const syncSaveBadges = (priceApi) => {
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
      el.textContent = `SAVE ${formatMoney(compareCents - priceCents)}`;
    });
  };

  // Intelligems often leaves collection Liquid prices alone — write them from igData ourselves.
  const applyCollectionPrices = () => {
    const priceApi = window.igData?.price;
    if (!priceApi?.getPriceByVariantId) return false;

    document
      .querySelectorAll('.price__sale[data-variant-id], .price__main[data-variant-id]')
      .forEach((el) => {
        const priceCents = dollarsToCents(priceApi.getPriceByVariantId(el.getAttribute('data-variant-id')));
        if (priceCents == null) return;
        el.textContent = formatMoney(priceCents);
      });

    document.querySelectorAll('.price__regular[data-variant-id]').forEach((el) => {
      const variantId = el.getAttribute('data-variant-id');
      const priceCents = dollarsToCents(priceApi.getPriceByVariantId(variantId));
      const compareCents = dollarsToCents(priceApi.getComparePriceByVariantId?.(variantId));
      if (priceCents == null || compareCents == null || compareCents <= priceCents) {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      el.textContent = formatMoney(compareCents);
    });

    syncSaveBadges(priceApi);
    return true;
  };

  const start = () => {
    if (applyCollectionPrices()) return;

    const onReady = () => {
      applyCollectionPrices();
    };
    window.addEventListener('ig:ready', onReady, { once: true });

    if (Array.isArray(window.onIgReady)) {
      window.onIgReady.push(onReady);
    } else if (typeof window.onIgReady === 'function') {
      const prev = window.onIgReady;
      window.onIgReady = [prev, onReady];
    } else {
      window.onIgReady = onReady;
    }
  };

  start();
})();
