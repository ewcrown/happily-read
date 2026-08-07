class CompareProduct extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.onAddCompare);
    this.LOCAL_STORAGE_COMPARE_KEY = "shopify-compare";
    this.LOCAL_STORAGE_DELIMITER = ",";
    this.BUTTON_ACTIVE_CLASS = "active";
    this.onAddActiveClass();
    this.CompareItemCounter();
  }

  CompareItemCounter() {
    let COMPARE_ITEM_COUNT = document.querySelector(".compare__count");
    let Compare_item_length = this.getCompare().length;

    if (COMPARE_ITEM_COUNT) {
      COMPARE_ITEM_COUNT.innerText = Compare_item_length;
    }
  }

  onAddActiveClass() {
    const CompareAddedButton = this.querySelector("button");
    if (CompareAddedButton != null) {
      let productHandle = CompareAddedButton.dataset.productHandle || false;
      if (!productHandle)
        return console.error(
          "[compare] Missing `data-product-handle` attribute. Failed to update the Compare."
        );
      if (this.CompareContains(productHandle))
        CompareAddedButton.classList.add(this.BUTTON_ACTIVE_CLASS);
    }
  }

  onAddCompare() {
    const CompareItem = this.querySelector("button");
    let productHandle = CompareItem.dataset.productHandle || false;
    if (!productHandle)
      return console.error(
        "[compare] Missing `data-product-handle` attribute. Failed to update the Compare."
      );

    this.updateCompare(productHandle);
    CompareItem.classList.toggle(this.BUTTON_ACTIVE_CLASS);

    let COMPARE_ITEM_COUNT = document.querySelector(".compare__count");
    let Compare_item_length = this.getCompare().length;

    if (COMPARE_ITEM_COUNT) {
      setTimeout(function () {
        COMPARE_ITEM_COUNT.innerText = Compare_item_length;
      }, 500);
    }

    let grid = document.querySelector("[grid-compare]") || false;

    if (grid) {
      this.closest(".product-grid-item").remove();
    } else {
      CompareItem.classList.add("loading", "adding");
      setTimeout(function () {
        CompareItem.classList.remove("loading");
      }, 500);
      setTimeout(function () {
        document.querySelector(".adding").classList.remove("adding");
      }, 1000);
    }

    if (Compare_item_length <= 0) {
      grid.parentElement.classList.remove("compare_exists");
    }
  }

  getCompare() {
    let Compare = localStorage.getItem(this.LOCAL_STORAGE_COMPARE_KEY) || false;
    if (Compare) return Compare.split(this.LOCAL_STORAGE_DELIMITER);
    return [];
  }

  setCompare(array) {
    let Compare = array.join(this.LOCAL_STORAGE_DELIMITER);
    if (array.length)
      localStorage.setItem(this.LOCAL_STORAGE_COMPARE_KEY, Compare);
    else localStorage.removeItem(this.LOCAL_STORAGE_COMPARE_KEY);
    return Compare;
  }

  updateCompare(handle) {
    let Compare = this.getCompare();
    let indexInCompare = Compare.indexOf(handle);
    if (indexInCompare === -1) Compare.push(handle);
    else Compare.splice(indexInCompare, 1);
    return this.setCompare(Compare);
  }

  CompareContains(handle) {
    let Compare = this.getCompare();
    return Compare.indexOf(handle) !== -1;
  }
}
customElements.define("compare-item", CompareProduct);

let newCompareObj = new CompareProduct();

document.addEventListener("DOMContentLoaded", function () {
  let grid = document.querySelector("[grid-compare]") || false;
  if (grid) {
    steupCompare(grid);
  }
});

let steupCompare = function (grid) {
  let compare = newCompareObj.getCompare();
  let CompareExistBtn = document.querySelector(".compare-page");

  if (compare.length > 0) {
    if (CompareExistBtn) {
      CompareExistBtn.classList = "compare_exists";
    }
  }

  let requests = compare.map(function (handle) {
    let productTileTemplateUrl = "/products/" + handle + "?view=compare";
    return fetch(productTileTemplateUrl).then(function (res) {
      if (res.status == 200) {
        return res.text();
      }
    });
  });

  Promise.all(requests).then(function (responses) {
    let compareProductCards = responses.join("");
    grid.innerHTML = compareProductCards;
    let buttons = grid.querySelectorAll("compare-item") || [];
  });
};
