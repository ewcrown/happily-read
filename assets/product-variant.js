class VariantSelects extends HTMLElement {
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
    this.updatePickupAvailability();
    this.updateContent();
    this.updateVariantStatuses();

    if (!this.currentVariant) {
      this.toggleAddButton(true, "", true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateURL();
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

    const mediaGallery = document.getElementById(
      `MediaGallery-${this.dataset.section}`
    );
    mediaGallery.setActiveMedia(
      `${this.dataset.section}-${this.currentVariant.featured_media.id}`,
      true
    );
  }

  updateContent() {
    let variant = this.currentVariant;

    let variandID = this.currentVariant?.id ?? null;

    // Back In Stock Notification
    let notifyMeAvailableWrapper = document.querySelector(
      ".notify__me--available"
    );
    if (variandID != null && !variant.available) {
      let soldOurtProductURL = document.querySelector(".soldout__product_url");
      soldOurtProductURL.value = `${this.dataset.origin}${this.dataset.url}?variant=${this.currentVariant.id}`;
      if (notifyMeAvailableWrapper) {
        notifyMeAvailableWrapper.classList.remove("no-js-inline");
      }
    } else {
      if (notifyMeAvailableWrapper) {
        notifyMeAvailableWrapper.classList.add("no-js-inline");
      }
    }
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === "false") return;
    window.history.replaceState(
      {},
      "",
      `${this.dataset.url}?variant=${this.currentVariant.id}`
    );
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(
      `#product-form-${this.dataset.section}, #product-form-installment`
    );
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  updateVariantStatuses() {
    const selectedOptionOneVariants = this.variantData.filter(
      (variant) => this.querySelector(":checked").value === variant.option1
    );
    const inputWrappers = [...this.querySelectorAll(".product-form__input")];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [
        ...option.querySelectorAll('input[type="radio"], option'),
      ];
      const previousOptionSelected =
        inputWrappers[index - 1].querySelector(":checked").value;
      const availableOptionInputsValue = selectedOptionOneVariants
        .filter(
          (variant) =>
            variant.available &&
            variant[`option${index}`] === previousOptionSelected
        )
        .map((variantOption) => variantOption[`option${index + 1}`]);
      this.setInputAvailability(optionInputs, availableOptionInputsValue);
    });
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.getAttribute("value"))) {
        input.innerText = input.getAttribute("value");
      } else {
        input.innerText = window.variantStrings.unavailable_with_option.replace(
          "[value]",
          input.getAttribute("value")
        );
      }
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector("pickup-availability");
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute("available");
      pickUpAvailability.innerHTML = "";
    }
  }

  renderProductInfo() {
    fetch(
      `${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${this.dataset.section}`
    )
      .then((response) => response.text())
      .then((responseText) => {
        let id = `price-${this.dataset.section}`,
          stockInventory = `inventory__stock--${this.dataset.section}`,
          barcodeId = `barcode__${this.dataset.section}`,
          skuId = `sku__${this.dataset.section}`;

        const html = new DOMParser().parseFromString(responseText, "text/html");

        let destination = document.getElementById(id),
          stockInventoryDestination = document.getElementById(stockInventory),
          barcodeDestination = document.getElementById(barcodeId),
          skuDestination = document.getElementById(skuId);

        let source = html.getElementById(id),
          stockInventorySource = html.getElementById(stockInventory),
          barcodeSource = html.getElementById(barcodeId),
          skuSource = html.getElementById(skuId);

        if (source && destination) destination.innerHTML = source.innerHTML;
        if (stockInventorySource && stockInventoryDestination)
          stockInventoryDestination.innerHTML = stockInventorySource.innerHTML;
        if (barcodeSource && barcodeDestination)
          barcodeDestination.innerHTML = barcodeSource.innerHTML;
        if (skuSource && skuDestination)
          skuDestination.innerHTML = skuSource.innerHTML;

        const price = document.getElementById(`price-${this.dataset.section}`);
        if (price) price.classList.remove("no-js-inline");
        this.toggleAddButton(
          !this.currentVariant.available,
          window.variantStrings.soldOut
        );
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const cartIcon = `<svg width="22" height="19" viewBox="0 0 22 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21.3679 6.22188C21.2916 6.13269 21.1969 6.06109 21.0903 6.012C20.9837 5.96291 20.8678 5.93749 20.7504 5.9375H15.8754V2.6875C15.8754 2.04103 15.6186 1.42105 15.1615 0.963927C14.7044 0.506807 14.0844 0.25 13.4379 0.25H8.56291C7.91645 0.25 7.29646 0.506807 6.83934 0.963927C6.38222 1.42105 6.12541 2.04103 6.12541 2.6875V5.9375H1.25041C1.13264 5.93617 1.01598 5.96045 0.908523 6.00868C0.801067 6.05691 0.705381 6.12792 0.628094 6.2168C0.550808 6.30568 0.493769 6.4103 0.46093 6.52342C0.428091 6.63653 0.420237 6.75543 0.437912 6.87188L1.96541 16.7438C2.02417 17.1312 2.221 17.4844 2.51961 17.7383C2.81823 17.9921 3.19852 18.1294 3.59041 18.125H18.4267C18.8186 18.1294 19.1988 17.9921 19.4975 17.7383C19.7961 17.4844 19.9929 17.1312 20.0517 16.7438L21.5629 6.87188C21.5792 6.75588 21.5702 6.63773 21.5365 6.52554C21.5029 6.41335 21.4454 6.30976 21.3679 6.22188V6.22188ZM7.75041 2.6875C7.75041 2.47201 7.83602 2.26535 7.98839 2.11298C8.14076 1.9606 8.34742 1.875 8.56291 1.875H13.4379C13.6534 1.875 13.8601 1.9606 14.0124 2.11298C14.1648 2.26535 14.2504 2.47201 14.2504 2.6875V5.9375H7.75041V2.6875ZM18.4267 16.5H3.57416L2.20104 7.5625H19.7998L18.4267 16.5Z" fill="currentColor"></path>
                    </svg>`;
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
      addButton.innerHTML = `${cartIcon} ${window.variantStrings.addToCart}`;
    }

    // Preorder Button
    if (window.preorder_button) {
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
            addButton.innerHTML = `${cartIcon} ${window.variantStrings.preorder}`;
          } else if (inventoryQuantity <= 0 && inventoryPolicy !== "continue") {
            addButton.setAttribute("disabled", true);
            addButton.textContent = window.variantStrings.soldOut;
          } else {
            addButton.removeAttribute("disabled");
            addButton.innerHTML = `${cartIcon} ${window.variantStrings.addToCart}`;
          }
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

customElements.define("variant-selects", VariantSelects);

class VariantRadios extends VariantSelects {
  constructor() {
    super();
    this.fieldsets = Array.from(this.querySelectorAll("fieldset"));
    this.onColorSwatches();
  }

  onColorSwatches() {
    const variantList = this.getVariantData() || [];
    const swatchButtonList = this.querySelectorAll(
      `fieldset.variant--swatch-${this.dataset.colorSwatch} > label`
    );
    const result = Object.values(
      variantList.reduce((total, item) => {
        let k = `${item[this.dataset.colorSwatch]}`;
        if (!total[k]) {
          total[k] = { ...item, count: 1 };
        } else {
          total[k].count += 1;
        }
        return total;
      }, {})
    );

    if (swatchButtonList.length > 0) {
      swatchButtonList.forEach((button) => {
        result.forEach((data) => {
          if (data[this.dataset.colorSwatch] === button.dataset.value) {
            if (
              this.dataset.colorSwatchStyle === "image" &&
              data.featured_image !== null
            ) {
              button.setAttribute(
                "style",
                `--swatch-background-image: url(${
                  data.featured_image.src
                }); --swatch-background-color: ${
                  data[this.dataset.colorSwatch]
                };`
              );
            } else {
              button.setAttribute(
                "style",
                `--swatch-background-color: ${data[this.dataset.colorSwatch]};`
              );
            }
          }
        });
      });
    }
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.getAttribute("value"))) {
        input.classList.remove("disabled");
      } else {
        input.classList.add("disabled");
      }
    });
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll("fieldset"));
    this.options = fieldsets.map((fieldset) => {
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
customElements.define("variant-radios", VariantRadios);
