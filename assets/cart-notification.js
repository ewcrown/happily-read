class CartRemoveButton2 extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", (event) => {
      event.preventDefault();
      this.closest("cart-notification").updateQuantity(this.dataset.index, 0);
      this.closest(".cart-notification-product").classList.add("loading");
      this.closest(
        ".cart-notification-product"
      ).firstElementChild.classList.remove("hidden");
    });
  }
}
customElements.define("cart-remove-button-2", CartRemoveButton2);

class CartNotification extends HTMLElement {
  constructor() {
    super();

    this.notification = document.getElementById("offcanvas__mini_cart");
    this.cartItemConatiner = document.getElementById(
      "cart-notification-product"
    );

    this.emptyCartItem = document.getElementById("min-cart-items");
    this.cartItemMessageShow = document.querySelector(".empty__cart__item");
    this.emptyCartButtonDisable = document.getElementById(
      "empty__cart__button"
    );

    this.cartAddSuccess = document.querySelector(".item__success_message ");
    this.cartEmptyHead = document.querySelector(".item__empty_message");

    this.header = document.querySelector("sticky-header");
    this.onBodyClick = this.handleBodyClick.bind(this);

    this.notification.addEventListener(
      "keyup",
      (evt) => evt.code === "Escape" && this.close()
    );

    this.querySelector(
      'button[type="button"].cart-notification__close'
    ).addEventListener("click", this.close.bind(this));

    this.currentItemCount = Array.from(
      this.querySelectorAll('[name="updates[]"]')
    ).reduce(
      (total, quantityInput) => total + parseInt(quantityInput.value),
      0
    );

    this.debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, 300);

    this.addEventListener("change", this.debouncedOnChange.bind(this));
  }

  onChange(event) {
    if (!event.target.closest("select")) {
      this.updateQuantity(
        event.target.dataset.index,
        event.target.value,
        document.activeElement.getAttribute("name"),
        event.target.dataset.quantityVariantId
      );
      // document
      //   .querySelector(".cart_action_drawer_overlay")
      //   .classList.add("active");
    }
  }

  open() {
    this.notification.classList.add("animate", "active");
    document.querySelector("body").classList.add("added__overlay");

    this.notification.addEventListener(
      "transitionend",
      () => {
        this.notification.focus();
        trapFocus(this.notification);
      },
      { once: true }
    );

    document.body.addEventListener("click", this.onBodyClick);
  }

  close() {
    document.getElementById("offcanvas__mini_cart").classList.remove("active");
    document.querySelector("body").classList.remove("added__overlay");

    document.body.removeEventListener("click", this.onBodyClick);

    //removeTrapFocus(document.querySelector(".header__actions_btn--cart"));
  }

  renderContents(parsedState) {
    this.getSectionsToRender().forEach((section) => {
      const elementToReplace = document.getElementById(section.id);
      elementToReplace.innerHTML = this.getSectionInnerHTML(
        parsedState.sections[section.id]
      );
    });

    // Toggle Class
    this.emptyCartItem.classList.toggle(
      "no-js-inline",
      parsedState.item_count === 0
    );

    if (parsedState.item_count === 0) {
      this.emptyCartItem.classList.add("no-js-inline");
      this.emptyCartButtonDisable.classList.add("no-js-inline");
      this.cartItemMessageShow.classList.remove("no-js-inline");
      this.cartAddSuccess.classList.add("no-js-inline");
      this.cartEmptyHead.classList.remove("no-js-inline");
    } else {
      this.emptyCartItem.classList.remove("no-js-inline");
      this.emptyCartButtonDisable.classList.remove("no-js-inline");
      this.cartItemMessageShow.classList.add("no-js-inline");
      this.cartAddSuccess.classList.remove("no-js-inline");
      this.cartEmptyHead.classList.add("no-js-inline");
    }

    if (this.header) this.header.reveal();
    this.open();
  }

  getSectionsToRender() {
    return [
      {
        id: "cart-notification-product",
      },
      {
        id: "cart-notification-subtotal",
      },
      {
        id: "cart-notification-count",
      },
      {
        id: "cart-notification-discount",
      },
    ];
  }

  updateQuantity(line, quantity, name, variantId) {
    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.id),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        const quantityElement = document.getElementById(`Quantity-${line}`);
        const items = document.querySelectorAll(".cart-notification-product");
        if (parsedState.errors) {
          quantityElement.value = quantityElement.getAttribute("value");
          this.updateLiveRegions(line, parsedState.errors);
          return;
        }

        this.renderContents(parsedState);

        this.getSectionsToRender().forEach((section) => {
          const elementToReplace = document.getElementById(section.id);
          elementToReplace.innerHTML = this.getSectionInnerHTML(
            parsedState.sections[section.id]
          );
        });

        const updatedValue = parsedState.items[line - 1]
          ? parsedState.items[line - 1].quantity
          : undefined;
        let message = "";
        if (
          items.length === parsedState.items.length &&
          updatedValue !== parseInt(quantityElement.value)
        ) {
          if (typeof updatedValue === "undefined") {
            message = window.cartStrings.error;
          } else {
            message = window.cartStrings.quantityError.replace(
              "[quantity]",
              updatedValue
            );
          }
        }
        this.updateLiveRegions(line, message);

        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: "cart-notification",
          cartData: parsedState,
          variantId: variantId,
        });
      })
      .catch(() => {
        // const errors =
        //   document.getElementById("cart-errors") ||
        //   document.getElementById("CartDrawer-CartErrors");
        // errors.textContent = window.cartStrings.error;
      })
      .finally(() => {
        // this.disableLoading(line);
      });
  }

  updateLiveRegions(line, message) {
    const lineItemError = document.getElementById(`Line-item-error-${line}`);
    if (lineItemError) {
      lineItemError.classList.remove("d-none");
      lineItemError.querySelector(".cart-item__error-text").innerHTML = message;
    }
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector).innerHTML;
  }

  handleBodyClick(evt) {
    const target = evt.target;
    if (
      target !== this.notification &&
      !target.closest("cart-notification") &&
      !target.closest("#quickViewWrapper")
    ) {
      this.close();
    }
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define("cart-notification", CartNotification);

class OpenMiniCart extends HTMLElement {
  constructor() {
    super();

    this.cartButton = this.querySelector("a");

    this.cartButton.addEventListener("click", (event) => {
      event.preventDefault();
      this.onClickMiniCart();
    });

    this.notification = document.getElementById("offcanvas__mini_cart");
    this.onBodyClassRemove = this.handleBodyClass.bind(this);

    this.notification.addEventListener(
      "keyup",
      (evt) => evt.code === "Escape" && this.miniCartClose()
    );
  }

  onClickMiniCart() {
    document
      .getElementById("offcanvas__mini_cart")
      .classList.add("animate", "active");
    document.querySelector("body").classList.add("added__overlay");

    this.notification.addEventListener(
      "transitionend",
      () => {
        this.notification.focus();
        trapFocus(this.notification);
      },
      { once: true }
    );

    document.body.addEventListener("click", this.onBodyClassRemove);
  }

  miniCartClose() {
    document.getElementById("offcanvas__mini_cart").classList.remove("active");
    document.querySelector("body").classList.remove("added__overlay");

    document.body.removeEventListener("click", this.onBodyClassRemove);
  }

  handleBodyClass(evt) {
    let eventTarget = evt.target;
    if (
      !eventTarget.closest("cart-notification") &&
      !eventTarget.closest("open-minicart") &&
      !eventTarget.closest("button")
    ) {
      this.miniCartClose();
    }
  }
}
customElements.define("open-minicart", OpenMiniCart);
