class CartDiscount extends HTMLElement {
    constructor() {
        super();
        this.cartDiscountError = this.querySelector('[ref="cartDiscountError"]');
        this.cartDiscountErrorDiscountCode = this.querySelector('[ref="cartDiscountErrorDiscountCode"]');
        this.cartDiscountErrorShipping = this.querySelector('[ref="cartDiscountErrorShipping"]');

        this.form = this.querySelector('form');
        this._onSubmit = this.submitHandler.bind(this);
        this._onClick = this.handleDynamicClick.bind(this);
        this.addEventListener('submit', this._onSubmit);
        this.addEventListener('click', this._onClick);
    }

    connectedCallback() {
        this.cartDiscountError = this.querySelector('[ref="cartDiscountError"]');
        this.cartDiscountErrorDiscountCode = this.querySelector('[ref="cartDiscountErrorDiscountCode"]');
        this.cartDiscountErrorShipping = this.querySelector('[ref="cartDiscountErrorShipping"]');
        this.drawer = this.closest('cart-drawer');
        if (this.drawer) {
            this.drawer.addEventListener('click', this._onClick);
        }
    }

    disconnectedCallback() {
        if (this.drawer) {
            this.drawer.removeEventListener('click', this._onClick);
            this.drawer = null;
        }
    }

    async submitHandler(event){
        event.preventDefault();
        event.stopPropagation();

        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;

        const discountCode = form.querySelector('input[name="discount"]');
        if (!(discountCode instanceof HTMLInputElement) || typeof this.dataset.sectionId !== 'string') return;

        const discountCodeValue = discountCode.value.trim();
        if (!discountCodeValue) return;

        try {
            const existingDiscounts = this.existingDiscounts();
            if (existingDiscounts.includes(discountCodeValue)) return;

            this.cartDiscountError?.classList.add('hidden');
            this.cartDiscountErrorDiscountCode?.classList.add('hidden');
            this.cartDiscountErrorShipping?.classList.add('hidden');

            const config = this.fetchConfig('json', {
                body: JSON.stringify({
                    discount: [...existingDiscounts, discountCodeValue].join(','),
                    sections: [this.dataset.sectionId]
                })
            });
            const response = await fetch(window.routes.cart_update_url, {...config});
            const data = await response.json();

            if (
                data.discount_codes.find((discount) => {
                    return discount.code === discountCodeValue && discount.applicable === false;
                })
            ) {
                discountCode.value = '';
                this.handleDiscountError('discount_code');
                this.updateToggleTab();
                return;
            }

            const newHtml = data.sections[this.dataset.sectionId];
            const parsedHtml = new DOMParser().parseFromString(newHtml, 'text/html');
            const section = parsedHtml.getElementById(`shopify-section-${this.dataset.sectionId}`);
            const discountCodes = section?.querySelectorAll('[data-discount-code]') || [];
            if (section) {
                const codes = Array.from(discountCodes)
                .map((element) => (element.dataset.discountCode))
                .filter(Boolean);
                if (
                    codes.length === existingDiscounts.length &&
                    codes.every((code) => existingDiscounts.includes(code)) &&
                    data.discount_codes.find((discount) => {
                        return discount.code === discountCodeValue && discount.applicable === true;
                    })
                ) {
                    this.handleDiscountError('shipping');
                    discountCode.value = '';
                    this.updateToggleTab();
                    return;
                }
            }
            this.closest('cart-drawer') && this.closest('cart-drawer').renderContents(data);

            var cart_page = document.querySelector('[id*="cart-items"]');
            if(cart_page){
                cart_page.querySelector('cart-items').onCartUpdate();
                var _el = this.closest('[id="main-cart-footer"]').querySelector('.js-contents');
                _el.innerHTML = section.querySelector('.js-contents').innerHTML;
            }
        }
        catch (error) {
        }
    }

    handleDynamicClick(event){
        const removeBtn = event.target instanceof Element
            ? event.target.closest('.cart-discount__pill-remove, .gn-cart-totals__discount-remove')
            : null;
        if (removeBtn) {
            event.preventDefault();
            event.stopPropagation();
            this.removeDiscount(event, removeBtn);
        }
    }

    async removeDiscount(event, removeBtn){
        event.preventDefault();
        event.stopPropagation();
        if (
            (event instanceof KeyboardEvent && event.key !== 'Enter') ||
            !(event instanceof MouseEvent) ||
            typeof this.dataset.sectionId !== 'string'
        ) {
            return;
        }

        const discountCode = removeBtn?.dataset?.discountCode
            || removeBtn?.closest('[data-discount-code]')?.dataset?.discountCode;
        if (!discountCode) return;

        const existingDiscounts = this.existingDiscounts();
        const index = existingDiscounts.indexOf(discountCode);
        if (index === -1) return;
        existingDiscounts.splice(index, 1);

        try {
            const config = this.fetchConfig('json', {
                body: JSON.stringify({ discount: existingDiscounts.join(','), sections: [this.dataset.sectionId] }),
            });
            const response = await fetch(window.routes.cart_update_url, {...config});
            const data = await response.json();
            this.closest('cart-drawer') && this.closest('cart-drawer').renderContents(data);

            var cart_page = document.querySelector('[id*="cart-items"]');
            if(cart_page){
                const newHtml = data.sections[this.dataset.sectionId];
                const parsedHtml = new DOMParser().parseFromString(newHtml, 'text/html');
                const section = parsedHtml.getElementById(`shopify-section-${this.dataset.sectionId}`);
                cart_page.querySelector('cart-items').onCartUpdate();
                var _el = this.closest('[id="main-cart-footer"]').querySelector('.js-contents');
                _el.innerHTML = section.querySelector('.js-contents').innerHTML;
            }
        }
        catch (error) {
        }
    }

    updateToggleTab(){
        this.closest('toggle-component')&&this.closest('toggle-component').resizeHandler();
    }

    existingDiscounts() {
        const discountCodes = [];
        const scope = this.closest('cart-drawer') || this.closest('[id="main-cart-footer"]') || this;
        const nodes = scope.querySelectorAll('[data-discount-code]');
        for (const node of nodes) {
            if (typeof node.dataset.discountCode === 'string' && node.dataset.discountCode) {
                discountCodes.push(node.dataset.discountCode);
            }
        }
        return [...new Set(discountCodes)];
    }

    handleDiscountError(type) {
        const target = type === 'discount_code' ? this.cartDiscountErrorDiscountCode : this.cartDiscountErrorShipping;
        this.cartDiscountError?.classList.remove('hidden');
        target?.classList.remove('hidden');
    }

    fetchConfig(type = 'json', config = {}) {
        const headers = { 'Content-Type': 'application/json', Accept: `application/${type}`, ...config.headers };
        if (type === 'javascript') {
            headers['X-Requested-With'] = 'XMLHttpRequest';
            delete headers['Content-Type'];
        }
        return {method: 'POST',headers:(headers),body: config.body,};
    }
}
if (!customElements.get('cart-discount-component')) {
  customElements.define('cart-discount-component', CartDiscount);
}
