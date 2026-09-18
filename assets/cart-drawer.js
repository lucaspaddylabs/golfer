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
    this.track = this.querySelector('[data-upsell-track]');
    this.slides = Array.from(this.querySelectorAll('[data-upsell-slide]'));
    this.prevBtn = this.querySelector('[data-upsell-prev]');
    this.nextBtn = this.querySelector('[data-upsell-next]');
    this.index = 0;
    this.adding = false;
    this.autoplayMs = 4000;
    this._autoplayTimer = null;

    this.prevBtn?.addEventListener('click', () => {
      this.go(-1);
      this.restartAutoplay();
    });
    this.nextBtn?.addEventListener('click', () => {
      this.go(1);
      this.restartAutoplay();
    });
    this.querySelectorAll('[data-upsell-variant]').forEach((swatch) => {
      swatch.addEventListener('click', () => {
        const slide = swatch.closest('[data-upsell-slide]');
        if (!slide) return;
        slide.querySelectorAll('[data-upsell-variant]').forEach((item) => {
          item.classList.toggle('is-selected', item === swatch);
          item.setAttribute('aria-pressed', item === swatch ? 'true' : 'false');
        });
        const button = slide.querySelector('[data-upsell-add]');
        if (button) button.dataset.variantId = swatch.dataset.variantId;
        this.restartAutoplay();
      });
    });
    this.querySelectorAll('[data-upsell-add]').forEach((button) => {
      button.addEventListener('click', (event) => this.add(event.currentTarget));
    });

    this.addEventListener('mouseenter', () => this.stopAutoplay());
    this.addEventListener('mouseleave', () => this.startAutoplay());
    this.addEventListener('focusin', () => this.stopAutoplay());
    this.addEventListener('focusout', (event) => {
      if (!this.contains(event.relatedTarget)) this.startAutoplay();
    });

    this.go(0);
    this.startAutoplay();
  }

  disconnectedCallback() {
    this.stopAutoplay();
  }

  startAutoplay() {
    this.stopAutoplay();
    if (this.slides.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this._autoplayTimer = window.setInterval(() => this.go(1), this.autoplayMs);
  }

  stopAutoplay() {
    if (this._autoplayTimer) {
      window.clearInterval(this._autoplayTimer);
      this._autoplayTimer = null;
    }
  }

  restartAutoplay() {
    this.startAutoplay();
  }

  go(step) {
    if (!this.slides.length) return;
    this.index = (this.index + step + this.slides.length) % this.slides.length;
    if (this.track) {
      this.track.style.transform = `translateX(-${this.index * 100}%)`;
    }
  }

  add(button) {
    if (this.adding || !button) return;
    const variantId = Number(button.dataset.variantId);
    if (!variantId) return;

    const cart = this.closest('cart-drawer');
    const slide = button.closest('[data-upsell-slide]');
    this.adding = true;
    this.stopAutoplay();
    button.classList.add('is-loading');
    button.setAttribute('aria-disabled', 'true');
    slide?.classList.add('is-adding');

    const body = {
      id: variantId,
      quantity: 1,
    };
    if (cart) {
      body.sections = cart.getSectionsToRender().map((section) => section.id);
      body.sections_url = window.location.pathname;
    }

    fetch(`${routes.cart_add_url}`, { ...fetchConfig('javascript'), body: JSON.stringify(body) })
      .then((response) => response.json())
      .then((response) => {
        if (response.status) {
          const errors = document.getElementById('CartDrawer-CartErrors');
          if (errors) errors.textContent = response.description || response.message || window.cartStrings.error;
          slide?.classList.remove('is-adding');
          this.startAutoplay();
          return;
        }

        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: 'cart-drawer-upsell',
          productVariantId: variantId,
          cartData: response,
        });

        if (cart) {
          cart.classList.remove('is-empty');
          cart.renderContents(response);
        }
      })
      .catch((error) => {
        console.error(error);
        slide?.classList.remove('is-adding');
        this.startAutoplay();
      })
      .finally(() => {
        this.adding = false;
        button.classList.remove('is-loading');
        button.removeAttribute('aria-disabled');
      });
  }
}

if (!customElements.get('cart-drawer-upsell')) {
  customElements.define('cart-drawer-upsell', CartDrawerUpsell);
}