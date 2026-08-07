const quickViewWarpper = document.getElementById("quickViewWrapper");

class quickViewModal extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.onClickQuickViewModal);

    quickViewWarpper.addEventListener("keyup", (evt) => {
      if (evt.code === "Escape") {
        document.body.classList.remove("overflow-hidden");
        quickViewWarpper.classList.remove("show__modal");
        removeTrapFocus(this.querySelector("button.active"));
        this.querySelector("button").classList.remove("active");
      }
    });

    document.addEventListener("click", function (event) {
      let eventTarget = event.target;
      if (!eventTarget.closest(".quick_view__body")) {
        document.body.classList.remove("overflow-hidden");
        quickViewWarpper.classList.remove("show__modal");
        this.querySelector("button").classList.remove("active");
      }
    });
  }
  onClickQuickViewModal = async () => {
    let quickViewModal = this.querySelector("button");
    let productHandle = quickViewModal.dataset.productHandle;
    quickViewModal.classList.add("loading");
    try {
      const response = await fetch(`/products/${productHandle}?view=quickview`);
      const resText = await response.text();
      quickViewWarpper.innerHTML = resText;
      
      if (window.Shopify && Shopify.PaymentButton) {
        Shopify.PaymentButton.init();
      }

      document.body.classList.add("overflow-hidden");
      quickViewWarpper.classList.add("show__modal");
      quickViewModal.classList.add("active");
    } catch (error) {
      console.log("error", error);
    } finally {
      quickViewModal.classList.remove("loading");
      trapFocus(quickViewWarpper);
    }
  };

}
customElements.define("quick-view-modal", quickViewModal);

class quickViewCloseTag extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.quickViewClose);
    this.currentVariant = {};
  }

  quickViewClose() {
    document.body.classList.remove("overflow-hidden");
    quickViewWarpper.classList.remove("show__modal");
    //trapFocus(document.querySelector("button.product__quick_view.active"));
    
    document
      .querySelector(".cart--icon-button.active")
      .classList.remove("active");
  }
}
customElements.define("quick-view-close", quickViewCloseTag);

class QuickVariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("change", this.onVariantChange);
  }

  onVariantChange() {
    this.updateOptions();
    this.updateOptionsParent();
    this.updateMasterId();
    this.toggleAddButton(true, "", false);
    this.getPreOrderVariantData();

    if (!this.currentVariant) {
      this.toggleAddButton(true, "", true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateVariantInput();
      this.renderProductInfo();
    }
  }

  updateOptions() {
    this.options = Array.from(
      this.querySelectorAll("select"),
      (select) => select.value
    );
  }

  updateOptionsParent() {
    Array.from(this.querySelectorAll(".product-form__input--dropdown")).map(
      (select, index) => {
        select.children[0].children[1].innerHTML = this.options[index];
      }
    );
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;
    const newMedia = document.querySelector(
      `[data-media-id="${this.dataset.section}-${this.currentVariant.featured_media.id}"]`
    );
    if (!newMedia) return;
    const parent = newMedia.parentElement;
    if (parent.firstChild == newMedia) return;
    parent.prepend(newMedia);
    window.setTimeout(() => {
      parent.scroll(0, 0);
    });
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(
      `#product-form-${this.dataset.section}`
    );
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  renderProductInfo() {
    fetch(
      `${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${this.dataset.section}`
    )
      .then((response) => response.text())
      .then((responseText) => {
        const id = `price-${this.dataset.section}`;
        const html = new DOMParser().parseFromString(responseText, "text/html");
        const destination = document.getElementById(id);
        //console.log(destination);
        const source = html.getElementById(id);
        if (source && destination) destination.innerHTML = source.innerHTML;
     
        const price = document.getElementById(`price-${this.dataset.section}`);

        if (price) price.classList.remove("no-js-inline");
        this.toggleAddButton(
          !this.currentVariant.available,
          window.variantStrings.soldOut
        );
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    //console.log(this.PreorderVariantData);

    const productForm = document.getElementById(
      `product-form-${this.dataset.section}`
    );
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');

    if (!addButton) return;
    if (disable) {
      addButton.setAttribute("disabled", true);
      if (text) addButton.textContent = text;
    } else {
      addButton.removeAttribute("disabled");
      addButton.textContent = window.variantStrings.addToCart;
    }

    // Preorder Button
    let productVarArray = this.PreorderVariantData;
    let variant = this.currentVariant;
    let VarInventoryManagement =
      this.currentVariant?.inventory_management ?? null;
    let var_num = "";
    if (VarInventoryManagement != null) {
      for (let variant_id in productVarArray) {
        if (variant.id == variant_id) {
          var_num = productVarArray[variant_id].qty;
          var inventoryQuantity = parseInt(var_num);
          var inventoryPolicy = productVarArray[variant_id].inventory_policy;
        }
        if (inventoryQuantity <= 0 && inventoryPolicy === "continue") {
          addButton.removeAttribute("disabled");
          addButton.textContent = window.variantStrings.preorder;
        } else if (inventoryQuantity <= 0 && inventoryPolicy !== "continue") {
          addButton.setAttribute("disabled", true);
          addButton.textContent = window.variantStrings.soldOut;
        } else {
          addButton.removeAttribute("disabled");
          addButton.textContent = window.variantStrings.addToCart;
        }
      }
    }
    if (!modifyClass) return;
  }

  setUnavailable() {
    const button = document.getElementById(
      `product-form-${this.dataset.section}`
    );
    const addButton = button.querySelector('[name="add"]');
    const price = document.getElementById(`price-${this.dataset.section}`);
    if (!addButton) return;
    addButton.textContent = window.variantStrings.unavailable;
    if (price) price.classList.add("no-js-inline");
  }

  getVariantData() {
    this.variantData =
      this.variantData ||
      JSON.parse(this.querySelector("[data-variant]").textContent);
    return this.variantData;
  }
  getPreOrderVariantData() {
    this.PreorderVariantData =
      this.PreorderVariantData ||
      JSON.parse(this.querySelector("[data-preorder]").textContent);
  }
}

customElements.define("quick-variant-selects", QuickVariantSelects);

class QuickVariantRadios extends QuickVariantSelects {
  constructor() {
    super();
    this.fieldsets = Array.from(this.querySelectorAll("fieldset"));
  }

  updateOptions() {
    this.options = this.fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll("input")).find(
        (radio) => radio.checked
      ).value;
    });
  }

  updateOptionsParent() {
    this.fieldsets.map((fieldset, index) => {
      fieldset.children[0].children[1].innerHTML = this.options[index];
    });
  }
}
customElements.define("quick-variant-radios", QuickVariantRadios);
