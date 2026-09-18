class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.setHeaderCartIconAccessibility();
  }

  /**
   * Policy A — header cart intercept:
   * - Icons keep href="{{ routes.cart_url }}" (/cart) so no-JS (and pre-JS) clicks reach the cart page.
   * - When this drawer is present and JS has loaded, intercept those clicks and open the drawer instead.
   * - Uses capture-phase document delegation so re-rendered icon markup still opens the drawer.
   */
  setHeaderCartIconAccessibility() {
    const markIcon = (cartLink) => {
      cartLink.setAttribute('role', 'button');
      cartLink.setAttribute('aria-haspopup', 'dialog');
      if (!cartLink.getAttribute('aria-controls')) {
        cartLink.setAttribute('aria-controls', 'CartDrawer');
      }
    };

    document.querySelectorAll('a[id^="cart-icon-bubble"]').forEach(markIcon);

    if (CartDrawer.headerCartInterceptBound) return;
    CartDrawer.headerCartInterceptBound = true;

    const cartIconFromEvent = (event) => {
      const target = event.target;
      if (!target || typeof target.closest !== 'function') return null;
      return target.closest('a[id^="cart-icon-bubble"]');
    };

    const openDrawerForIcon = (event, cartLink) => {
      const drawer = document.querySelector('cart-drawer');
      // No drawer on /cart template (or if cart_type != drawer) → allow native /cart navigation.
      if (!drawer) return;
      event.preventDefault();
      markIcon(cartLink);
      drawer.open(cartLink);
    };

    document.addEventListener(
      'click',
      (event) => {
        const cartLink = cartIconFromEvent(event);
        if (!cartLink) return;
        openDrawerForIcon(event, cartLink);
      },
      true
    );

    document.addEventListener(
      'keydown',
      (event) => {
        if (event.code !== 'Space' && event.key !== ' ') return;
        const cartLink = cartIconFromEvent(event);
        if (!cartLink) return;
        openDrawerForIcon(event, cartLink);
      },
      true
    );
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    setTimeout(() => {
      this.classList.add('active');
      this.classList.add('animate');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    if(document.querySelectorAll('.popup-modal.active').length == 0){
      document.body.style.paddingRight = this.getScrollbarWidth() + 'px';
      document.body.classList.add('overflow-hidden');
    }
  }

  close() {
    this.classList.remove('animate');
    setTimeout(() => {
      this.classList.remove('active');
      if(document.querySelectorAll('.popup-modal.active').length == 0){
        document.body.classList.remove('overflow-hidden');
        document.body.style.paddingRight = '';
      }
    }, 500);
    removeTrapFocus(this.activeElement);
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.classList.remove('is-empty');
    this.querySelector('.drawer__inner')?.classList.remove('is-empty');
    this.querySelector('cart-drawer-items')?.classList.remove('is-empty');
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionHtml = parsedState.sections?.[section.id];
      if (!sectionHtml) return;
      const sectionElement = section.selector ? document.querySelector(section.selector) : document.getElementById(section.id);
      const sectionContent = this.getSectionInnerHTML(sectionHtml, section.selector);
      if (sectionElement && sectionContent) sectionElement.innerHTML = sectionContent;
      if(section.id == 'cart-free-delivery' && document.querySelector('#product-page-free-delivery')){
        document.querySelector('#product-page-free-delivery').innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
      }
      if(section.id == 'cart-icon-bubble' && document.querySelector('.footer-sticky-nav__item__icon .cart-count-bubble')){
        const parser = new DOMParser();
        const bubble = parser.parseFromString(this.getSectionInnerHTML(parsedState.sections[section.id], section.selector), 'text/html');
        var ib = bubble.querySelector('.cart-count-bubble')?bubble.querySelector('.cart-count-bubble').innerHTML : '' ;
        document.querySelector('.footer-sticky-nav__item__icon .cart-count-bubble').innerHTML = ib;
      }
    });

    setTimeout(() => {
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    if (!html) return '';
    const section = new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
    return section ? section.innerHTML : '';
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: 'cart-icon-bubble',
      },
      {
        id: 'cart-icon-bubble--mobile'
      },
      {
        id: 'cart-free-delivery'
      }
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
  getScrollbarWidth() {
    return window.innerWidth - document.documentElement.clientWidth;
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
      {
        id: 'cart-icon-bubble--mobile',
        section: 'cart-icon-bubble--mobile',
        selector: '.shopify-section'
      }
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);

class CartDrawerUpsell extends HTMLElement {
  connectedCallback() {
    if (this._giftBound) return;
    this._giftBound = true;
    this.busy = false;
    this.errorEl = this.querySelector('[data-gift-error]');

    this.addEventListener('click', (event) => {
      const swatch = event.target.closest('[data-gift-variant]');
      if (swatch && this.contains(swatch)) {
        event.preventDefault();
        this.selectVariant(swatch);
        return;
      }
      const minusBtn = event.target.closest('[data-gift-minus]');
      if (minusBtn && this.contains(minusBtn)) {
        event.preventDefault();
        event.stopPropagation();
        this.changeQty(minusBtn, -1, false);
        return;
      }
      const plusBtn = event.target.closest('[data-gift-plus]');
      if (plusBtn && this.contains(plusBtn)) {
        event.preventDefault();
        event.stopPropagation();
        this.changeQty(plusBtn, 1, false);
        return;
      }
      const addBtn = event.target.closest('[data-gift-add]');
      if (addBtn && this.contains(addBtn)) {
        event.preventDefault();
        event.stopPropagation();
        this.changeQty(addBtn, 1, true);
      }
    });
  }

  selectVariant(swatch) {
    const row = swatch.closest('[data-gift-row]');
    if (!row) return;
    row.querySelectorAll('[data-gift-variant]').forEach((item) => {
      const selected = item === swatch;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    const variantId = swatch.dataset.variantId;
    const qty = Number(swatch.dataset.qty || 0);
    const lineKey = swatch.dataset.lineKey || '';
    row.querySelectorAll('[data-gift-add], [data-gift-plus], [data-gift-minus]').forEach((btn) => {
      btn.dataset.variantId = variantId;
      btn.dataset.lineKey = lineKey;
    });
    const qtyValue = row.querySelector('[data-gift-qty-value]');
    if (qtyValue) qtyValue.textContent = String(qty);
    const minus = row.querySelector('[data-gift-minus]');
    if (minus) minus.disabled = qty <= 0;
    const meta = row.querySelector('.gn-gift-row__meta');
    if (meta) {
      const label = swatch.getAttribute('aria-label') || '';
      meta.textContent = meta.textContent.replace(/^[^·]+·/, `${label} ·`);
    }
  }

  showError(message) {
    if (!this.errorEl) return;
    this.errorEl.hidden = !message;
    this.errorEl.textContent = message || '';
  }

  changeQty(button, delta, fromAdd) {
    if (this.busy || !button || button.disabled) return;
    const variantId = Number(button.dataset.variantId);
    if (!variantId || !Number.isFinite(delta) || delta === 0) return;

    const row = button.closest('[data-gift-row]');
    const cart = this.closest('cart-drawer');

    this.busy = true;
    this.showError('');
    button.classList.add('is-loading');
    button.setAttribute('aria-disabled', 'true');
    row?.classList.add('is-adding');

    const sections = cart ? cart.getSectionsToRender().map((section) => section.id) : [];
    const sections_url = window.location.pathname;
    const config = fetchConfig('javascript');

    fetch(`${routes.cart_url}.js`)
      .then((response) => response.json())
      .then((cartJson) => {
        const matches = (cartJson.items || []).filter(
          (item) => Number(item.variant_id) === variantId
        );
        const currentQty = matches.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

        if (delta < 0 && currentQty <= 0) {
          throw new Error('nothing-to-remove');
        }

        const nextQty = Math.max(0, currentQty + delta);

        // First add — single clean line
        if (matches.length === 0) {
          return fetch(`${routes.cart_add_url}`, {
            ...config,
            body: JSON.stringify({
              id: variantId,
              quantity: nextQty || 1,
              sections,
              sections_url,
            }),
          }).then((response) => response.json());
        }

        // Consolidate same-variant lines onto the first key and zero the rest.
        // Stops BXGY/free-gift splits leaving 3+ towel rows for one gift qty.
        const updates = {};
        matches.forEach((item, index) => {
          updates[item.key] = index === 0 ? nextQty : 0;
        });

        return fetch(`${routes.cart_update_url}`, {
          ...config,
          body: JSON.stringify({
            updates,
            sections,
            sections_url,
          }),
        }).then((response) => response.json());
      })
      .then((response) => {
        if (!response || response.status) {
          if (response?.status) {
            this.showError(
              response.description || response.message || window.cartStrings?.error || 'Could not update cart'
            );
          }
          row?.classList.remove('is-adding');
          return;
        }

        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: fromAdd ? 'cart-drawer-gift-add' : 'cart-drawer-gift-qty',
          productVariantId: variantId,
          cartData: response,
        });

        if (!cart) return;

        cart.classList.remove('is-empty');
        if (response.sections) {
          cart.renderContents(response);
          return;
        }

        // Fallback section refresh if update response omitted sections
        return fetch(`${routes.cart_url}?section_id=cart-drawer`)
          .then((sectionResponse) => sectionResponse.text())
          .then((html) => {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const incoming = doc.querySelector('#CartDrawer');
            const current = document.getElementById('CartDrawer');
            if (current && incoming) current.innerHTML = incoming.innerHTML;
          });
      })
      .catch((error) => {
        if (error?.message !== 'nothing-to-remove') {
          console.error(error);
          this.showError(window.cartStrings?.error || 'Could not update cart');
        }
        row?.classList.remove('is-adding');
      })
      .finally(() => {
        this.busy = false;
        button.classList.remove('is-loading');
        button.removeAttribute('aria-disabled');
      });
  }
}

if (!customElements.get('cart-drawer-upsell')) {
  customElements.define('cart-drawer-upsell', CartDrawerUpsell);
}