class WishlistProduct extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.onAddWishlist);
    this.LOCAL_STORAGE_WISHLIST_KEY = "shopify-wishlist";
    this.LOCAL_STORAGE_DELIMITER = ",";
    this.BUTTON_ACTIVE_CLASS = "active";
    this.onAddActiveClass();
    this.WishlistItemCounter();
  }

  WishlistItemCounter() {
    let WISHLIST_ITEM_COUNT = document.querySelectorAll(".wishlist__count");
    //console.log(WISHLIST_ITEM_COUNT);
    let wishlist_item_length = this.getWishlist().length;
    if (WISHLIST_ITEM_COUNT) {
      WISHLIST_ITEM_COUNT.forEach((singleItem) => {
        singleItem.innerText = wishlist_item_length;
      });
    }
  }

  onAddActiveClass() {
    const wishlistAddedButton = this.querySelector("button");
    if (wishlistAddedButton != null) {
      let productHandle = wishlistAddedButton.dataset.productHandle || false;
      if (!productHandle)
        return console.error(
          "[Wishlist] Missing `data-product-handle` attribute. Failed to update the wishlist."
        );
      if (this.wishlistContains(productHandle))
        wishlistAddedButton.classList.add(this.BUTTON_ACTIVE_CLASS);
    }
  }

  onAddWishlist() {
    const wishlistItem = this.querySelector("button");
    let productHandle = wishlistItem.dataset.productHandle || false;
    if (!productHandle)
      return console.error(
        "[Wishlist] Missing `data-product-handle` attribute. Failed to update the wishlist."
      );

    this.updateWishlist(productHandle);
    wishlistItem.classList.toggle(this.BUTTON_ACTIVE_CLASS);

    let WISHLIST_ITEM_COUNT = document.querySelectorAll(".wishlist__count");
    let wishlist_item_length = this.getWishlist().length;
    if (WISHLIST_ITEM_COUNT) {
      WISHLIST_ITEM_COUNT.forEach((singleItem) => {
        singleItem.innerText = wishlist_item_length;
      });
    }

    let grid = document.querySelector("[grid-wishlist]") || false;

    if (grid) {
      this.closest(".product-grid-item").remove();
    } else {
      wishlistItem.classList.add("loading", "adding");
      setTimeout(function () {
        wishlistItem.classList.remove("loading");
      }, 500);

      setTimeout(function () {
        document.querySelector(".adding").classList.remove("adding");
      }, 1000);
    }

    if (wishlist_item_length <= 0) {
      grid.parentElement.classList.remove("wishlist_exists");
    }
  }

  getWishlist() {
    let wishlist =
      localStorage.getItem(this.LOCAL_STORAGE_WISHLIST_KEY) || false;
    if (wishlist) return wishlist.split(this.LOCAL_STORAGE_DELIMITER);
    return [];
  }

  setWishlist(array) {
    let wishlist = array.join(this.LOCAL_STORAGE_DELIMITER);
    if (array.length)
      localStorage.setItem(this.LOCAL_STORAGE_WISHLIST_KEY, wishlist);
    else localStorage.removeItem(this.LOCAL_STORAGE_WISHLIST_KEY);
    return wishlist;
  }

  updateWishlist(handle) {
    let wishlist = this.getWishlist();
    let indexInWishlist = wishlist.indexOf(handle);
    if (indexInWishlist === -1) wishlist.push(handle);
    else wishlist.splice(indexInWishlist, 1);
    return this.setWishlist(wishlist);
  }

  wishlistContains(handle) {
    let wishlist = this.getWishlist();
    return wishlist.indexOf(handle) !== -1;
  }
}
customElements.define("wishlist-item", WishlistProduct);

let newWishlistObj = new WishlistProduct();

document.addEventListener("DOMContentLoaded", function () {
  let grid = document.querySelector("[grid-wishlist]") || false;
  if (grid) {
    setupGrid(grid);
  }
});

var setupGrid = function (grid) {
  var wishlist = newWishlistObj.getWishlist();
  var wihslitExistBtn = document.querySelector(".wishlist-page");

  if (wishlist.length > 0) {
    wihslitExistBtn.classList = "wishlist_exists";
  }

  var requests = wishlist.map(function (handle) {
    var productTileTemplateUrl = "/products/" + handle + "?view=wishlist";
    return fetch(productTileTemplateUrl).then(function (res) {
      if (res.status == 200) {
        return res.text();
      }
    });
  });

  Promise.all(requests).then(function (responses) {
    var wishlistProductCards = responses.join("");
    grid.innerHTML = wishlistProductCards;
    var buttons = grid.querySelectorAll("wishlist-item") || [];
  });
};
