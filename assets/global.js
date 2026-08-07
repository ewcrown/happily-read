function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute("role", "button");
  summary.setAttribute("aria-expanded", "false");

  if (summary.nextElementSibling.getAttribute("id")) {
    summary.setAttribute("aria-controls", summary.nextElementSibling.id);
  }

  summary.addEventListener("click", (event) => {
    event.currentTarget.setAttribute(
      "aria-expanded",
      !event.currentTarget.closest("details").hasAttribute("open")
    );
  });

  if (summary.closest("header-drawer")) return;
  summary.parentElement.addEventListener("keyup", onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (
      event.target !== container &&
      event.target !== last &&
      event.target !== first
    )
      return;

    document.addEventListener("keydown", trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener("keydown", trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== "TAB") return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if (
      (event.target === container || event.target === first) &&
      event.shiftKey
    ) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener("focusout", trapFocusHandlers.focusout);
  document.addEventListener("focusin", trapFocusHandlers.focusin);

  elementToFocus.focus();
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(":focus-visible");
} catch {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = [
    "ARROWUP",
    "ARROWDOWN",
    "ARROWLEFT",
    "ARROWRIGHT",
    "TAB",
    "ENTER",
    "SPACE",
    "ESCAPE",
    "HOME",
    "END",
    "PAGEUP",
    "PAGEDOWN",
  ];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener("keydown", (event) => {
    if (navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener("mousedown", (event) => {
    mouseClick = true;
  });

  window.addEventListener(
    "focus",
    () => {
      if (currentFocusedElement)
        currentFocusedElement.classList.remove("focused");

      if (mouseClick) return;

      currentFocusedElement = document.activeElement;
      currentFocusedElement.classList.add("focused");
    },
    true
  );
}

function pauseAllMedia() {
  document.querySelectorAll(".js-youtube").forEach((video) => {
    video.contentWindow.postMessage(
      '{"event":"command","func":"' + "pauseVideo" + '","args":""}',
      "*"
    );
  });
  document.querySelectorAll(".js-vimeo").forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', "*");
  });
  document.querySelectorAll("video").forEach((video) => video.pause());
  document.querySelectorAll("product-model").forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener("focusin", trapFocusHandlers.focusin);
  document.removeEventListener("focusout", trapFocusHandlers.focusout);
  document.removeEventListener("keydown", trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== "ESCAPE") return;

  const openDetailsElement = event.target.closest("details[open]");
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector("summary");
  openDetailsElement.removeAttribute("open");
  summaryElement.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector("input");
    this.changeEvent = new Event("change", { bubbles: true });
    this.input.addEventListener("change", this.onInputChange.bind(this));
    this.querySelectorAll("button").forEach((button) =>
      button.addEventListener("click", this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(
      PUB_SUB_EVENTS.quantityUpdate,
      this.validateQtyRules.bind(this)
    );
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    event.target.name === "plus" ? this.input.stepUp() : this.input.stepDown();
    if (previousValue !== this.input.value)
      this.input.dispatchEvent(this.changeEvent);
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const min = parseInt(this.input.min);
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle("disabled", value <= min);
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle("disabled", value >= max);
    }
  }
}

customElements.define("quantity-input", QuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

const serializeForm = (form) => {
  const obj = {};
  const formData = new FormData(form);

  for (const key of formData.keys()) {
    const regex = /(?:^(properties\[))(.*?)(?:\]$)/;

    if (regex.test(key)) {
      obj.properties = obj.properties || {};
      obj.properties[regex.exec(key)[2]] = formData.get(key);
    } else {
      obj[key] = formData.get(key);
    }
  }

  return JSON.stringify(obj);
};

// Shopify editor
function editorShopifyEvent(t, e, i) {
  let n = !1;
  t.type.includes("shopify:section")
    ? e.hasAttribute("data-section-id") &&
      e.getAttribute("data-section-id") === t.detail.sectionId &&
      (n = !0)
    : t.type.includes("shopify:block") && t.target === e && (n = !0),
    n && i(t);
}

// Shopify Currency Symbol
const currencySymbol = {
  AED: "د.إ",
  AFN: "؋",
  ALL: "L",
  AMD: "֏",
  ANG: "ƒ",
  AOA: "Kz",
  ARS: "$",
  AUD: "$",
  AWG: "ƒ",
  AZN: "₼",
  BAM: "KM",
  BBD: "$",
  BDT: "Tk",
  BGN: "лв",
  BHD: ".د.ب",
  BIF: "FBu",
  BMD: "$",
  BND: "$",
  BOB: "$b",
  BOV: "BOV",
  BRL: "R$",
  BSD: "$",
  BTC: "₿",
  BTN: "Nu.",
  BWP: "P",
  BYN: "Br",
  BYR: "Br",
  BZD: "BZ$",
  CAD: "$",
  CDF: "FC",
  CHE: "CHE",
  CHF: "CHF",
  CHW: "CHW",
  CLF: "CLF",
  CLP: "$",
  CNY: "¥",
  COP: "$",
  COU: "COU",
  CRC: "₡",
  CUC: "$",
  CUP: "₱",
  CVE: "$",
  CZK: "Kč",
  DJF: "Fdj",
  DKK: "kr",
  DOP: "RD$",
  DZD: "دج",
  EEK: "kr",
  EGP: "£",
  ERN: "Nfk",
  ETB: "Br",
  ETH: "Ξ",
  EUR: "€",
  FJD: "$",
  FKP: "£",
  GBP: "£",
  GEL: "₾",
  GGP: "£",
  GHC: "₵",
  GHS: "GH₵",
  GIP: "£",
  GMD: "D",
  GNF: "FG",
  GTQ: "Q",
  GYD: "$",
  HKD: "$",
  HNL: "L",
  HRK: "kn",
  HTG: "G",
  HUF: "Ft",
  IDR: "Rp",
  ILS: "₪",
  IMP: "£",
  INR: "₹",
  IQD: "ع.د",
  IRR: "﷼",
  ISK: "kr",
  JEP: "£",
  JMD: "J$",
  JOD: "JD",
  JPY: "¥",
  KES: "KSh",
  KGS: "лв",
  KHR: "៛",
  KMF: "CF",
  KPW: "₩",
  KRW: "₩",
  KWD: "KD",
  KYD: "$",
  KZT: "₸",
  LAK: "₭",
  LBP: "£",
  LKR: "₨",
  LRD: "$",
  LSL: "M",
  LTC: "Ł",
  LTL: "Lt",
  LVL: "Ls",
  LYD: "LD",
  MAD: "MAD",
  MDL: "lei",
  MGA: "Ar",
  MKD: "ден",
  MMK: "K",
  MNT: "₮",
  MOP: "MOP$",
  MRO: "UM",
  MRU: "UM",
  MUR: "₨",
  MVR: "Rf",
  MWK: "MK",
  MXN: "$",
  MXV: "MXV",
  MYR: "RM",
  MZN: "MT",
  NAD: "$",
  NGN: "₦",
  NIO: "C$",
  NOK: "kr",
  NPR: "₨",
  NZD: "$",
  OMR: "﷼",
  PAB: "B/.",
  PEN: "S/.",
  PGK: "K",
  PHP: "₱",
  PKR: "₨",
  PLN: "zł",
  PYG: "Gs",
  QAR: "﷼",
  RMB: "￥",
  RON: "lei",
  RSD: "Дин.",
  RUB: "₽",
  RWF: "R₣",
  SAR: "﷼",
  SBD: "$",
  SCR: "₨",
  SDG: "ج.س.",
  SEK: "kr",
  SGD: "S$",
  SHP: "£",
  SLL: "Le",
  SOS: "S",
  SRD: "$",
  SSP: "£",
  STD: "Db",
  STN: "Db",
  SVC: "$",
  SYP: "£",
  SZL: "E",
  THB: "฿",
  TJS: "SM",
  TMT: "T",
  TND: "د.ت",
  TOP: "T$",
  TRL: "₤",
  TRY: "₺",
  TTD: "TT$",
  TVD: "$",
  TWD: "NT$",
  TZS: "TSh",
  UAH: "₴",
  UGX: "USh",
  USD: "$",
  UYI: "UYI",
  UYU: "$U",
  UYW: "UYW",
  UZS: "лв",
  VEF: "Bs",
  VES: "Bs.S",
  VND: "₫",
  VUV: "VT",
  WST: "WS$",
  XAF: "FCFA",
  XBT: "Ƀ",
  XCD: "$",
  XOF: "CFA",
  XPF: "₣",
  XSU: "Sucre",
  XUA: "XUA",
  YER: "﷼",
  ZAR: "R",
  ZMW: "ZK",
  ZWD: "Z$",
  ZWL: "$",
};
const shopCurrencySymbol = currencySymbol[Shopify.currency.active];

/* Get Sibling */
const getSiblings = function (elem) {
  const siblings = [];
  let sibling = elem.parentNode.firstChild;
  while (sibling) {
    if (sibling.nodeType === 1 && sibling !== elem) {
      siblings.push(sibling);
    }
    sibling = sibling.nextSibling;
  }
  return siblings;
};

/* Slide Up */
const slideUp = (target, time) => {
  const duration = time ? time : 500;
  target.style.transitionProperty = "height, margin, padding";
  target.style.transitionDuration = duration + "ms";
  target.style.boxSizing = "border-box";
  target.style.height = target.offsetHeight + "px";
  target.offsetHeight;
  target.style.overflow = "hidden";
  target.style.height = 0;
  window.setTimeout(() => {
    target.style.display = "none";
    target.style.removeProperty("height");
    target.style.removeProperty("overflow");
    target.style.removeProperty("transition-duration");
    target.style.removeProperty("transition-property");
  }, duration);
};
/* Slide Down */
const slideDown = (target, time) => {
  let duration = time ? time : 500;
  target.style.removeProperty("display");
  let display = window.getComputedStyle(target).display;
  if (display === "none") display = "block";
  target.style.display = display;
  const height = target.offsetHeight;
  target.style.overflow = "hidden";
  target.style.height = 0;
  target.offsetHeight;
  target.style.boxSizing = "border-box";
  target.style.transitionProperty = "height, margin, padding";
  target.style.transitionDuration = duration + "ms";
  target.style.height = height + "px";
  window.setTimeout(() => {
    target.style.removeProperty("height");
    target.style.removeProperty("overflow");
    target.style.removeProperty("transition-duration");
    target.style.removeProperty("transition-property");
  }, duration);
};

// Get window top offset
function TopOffset(el) {
  let rect = el.getBoundingClientRect(),
    scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  return { top: rect.top + scrollTop };
}

function fetchConfig(type = "json") {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: `application/${type}`,
    },
  };
}

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == "undefined") {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent("on" + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options["method"] || "post";
  var params = options["parameters"] || {};

  var form = document.createElement("form");
  form.setAttribute("method", method);
  form.setAttribute("action", path);

  for (var key in params) {
    var hiddenField = document.createElement("input");
    hiddenField.setAttribute("type", "hidden");
    hiddenField.setAttribute("name", key);
    hiddenField.setAttribute("value", params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (
  country_domid,
  province_domid,
  options
) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(
    options["hideElement"] || province_domid
  );

  Shopify.addListener(
    this.countryEl,
    "change",
    Shopify.bind(this.countryHandler, this)
  );

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute("data-default");
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    var value = this.provinceEl.getAttribute("data-default");
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute("data-provinces");
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = "none";
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement("option");
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = "";
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement("option");
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener(
      "click",
      this.hide.bind(this)
    );
    this.addEventListener("keyup", (event) => {
      if (event.code.toUpperCase() === "ESCAPE") this.hide();
    });
    if (this.classList.contains("media-modal")) {
      this.addEventListener("pointerup", (event) => {
        if (
          event.pointerType === "mouse" &&
          !event.target.closest("deferred-media, product-model")
        )
          this.hide();
      });
    } else {
      this.addEventListener("click", (event) => {
        if (event.target.nodeName === "MODAL-DIALOG") this.hide();
      });
    }
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector(".template-popup");
    document.body.classList.add("overflow-hidden");
    this.setAttribute("open", "");
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();
  }

  hide() {
    document.body.classList.remove("overflow-hidden");
    this.removeAttribute("open");
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
  }
}
customElements.define("modal-dialog", ModalDialog);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector("button");

    if (!button) return;
    button.addEventListener("click", () => {
      const modal = document.querySelector(this.getAttribute("data-modal"));
      if (modal) modal.show(button);
    });
  }
}
customElements.define("modal-opener", ModalOpener);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener("click", this.loadContent.bind(this));
  }

  loadContent() {
    window.pauseAllMedia();
    if (!this.getAttribute("loaded")) {
      const content = document.createElement("div");
      content.appendChild(
        this.querySelector("template").content.firstElementChild.cloneNode(true)
      );

      this.setAttribute("loaded", true);
      this.appendChild(
        content.querySelector("video, model-viewer, iframe")
      ).focus();
    }
  }
}

customElements.define("deferred-media", DeferredMedia);

class DataCountdown extends HTMLElement {
  constructor() {
    super();

    this.onCountDown();
  }

  onCountDown() {
    const CountDownElement = this.querySelector("[data-countdown]");

    const countDownItem = (value, label) => {
      return `<div class="countdown-item ${label}"><div class="countdown__inner"><span class="countdown__digit">${value}</span> <span class="countdown__labels">${label}</span></div></div>`;
    };
    const date = new Date(
        CountDownElement.getAttribute("data-countdown")
      ).getTime(),
      second = 1000,
      minute = second * 60,
      hour = minute * 60,
      day = hour * 24;
    const countDownInterval = setInterval(function () {
      let currentTime = new Date().getTime(),
        timeDistance = date - currentTime,
        daysValue = Math.floor(timeDistance / day),
        hoursValue = Math.floor((timeDistance % day) / hour),
        minutesValue = Math.floor((timeDistance % hour) / minute),
        secondsValue = Math.floor((timeDistance % minute) / second);

      CountDownElement.innerHTML =
        countDownItem(daysValue, window.countdown.days) +
        countDownItem(hoursValue, window.countdown.Hours) +
        countDownItem(minutesValue, window.countdown.minutes) +
        countDownItem(secondsValue, window.countdown.second);

      if (timeDistance < 0) clearInterval(countDownInterval);
    }, 1000);
  }
}
customElements.define("countdown-timer", DataCountdown);

if (!customElements.get("color-swatch-variant")) {
  customElements.define(
    "color-swatch-variant",
    class ColorSwatchVariant extends HTMLElement {
      constructor() {
        super();
        this.variantId = this.dataset.variantId;
        this.productHandle = this.dataset.productHandle;
        this.productCard = this.closest(".product-grid-item");
        this.addEventListener("click", this.onClickHandler.bind(this));
      }

      onClickHandler(event) {
        let url = `/products/${this.productHandle}?variant=${this.variantId}&view=colorswatchjp`;
        fetch(url)
          .then((response) => response.text())
          .then((responseText) => {
            const html = new DOMParser().parseFromString(
              responseText,
              "text/html"
            );
            this.updateThumbnail(html);
          })
          .catch((e) => {
            console.error(e);
          });
        const colorButtonList = this.productCard.querySelectorAll(
          ".product--color-swatch"
        );
        colorButtonList.forEach((button) => {
          button.classList.remove("checked-color");
        });
        this.classList.add("checked-color");
      }

      updateThumbnail(html) {
        const destination = this.productCard.querySelector(".media").firstChild;
        const source = html.querySelector(".media").firstChild;
        if (source && destination) {
          destination.src = source.src;
          destination.srcset = source.srcset;
        }
        const productVariantImageIdLink = this.productCard.querySelector(
          ".product__media_thumbnail "
        );
        const productVariantIdImageLink = html.querySelector(
          ".product__media_thumbnail"
        );
        const productVariantTitleId = this.productCard.querySelector(
          ".product-grid-item__title a"
        );
        const productVariantTitleLink = html.querySelector(
          " .product-grid-item__title a"
        );
        productVariantImageIdLink.href = productVariantIdImageLink.href;
        productVariantTitleId.href = productVariantTitleLink.href;
      }
    }
  );
}

class ProductBundle extends HTMLElement {
  constructor() {
    super();
    this.wrap = this.querySelector(".products-bundle-group-wrap");
    this.cartNotification = document.querySelector("cart-notification");
    this.cartItems = document.querySelector("cart-items");
    this.addToCartButtonElement = this.querySelector(
      ".bundle-product-submit-button"
    );
    this.bundleTotalPrice = this.querySelector(".bundle-total-price")
    this.itemSelector = this.querySelectorAll("product-bundle-variant-item")
    this.productBundleListWrap = this.querySelector(".product-bundle__list")
   

    if (this.addToCartButtonElement) {
      this.addToCartButtonElement.addEventListener(
        "click",
        this.handleButtonClick.bind(this)
      );
    }
    this.productBundleItemSelector = this.querySelectorAll("[data-select-id]");
    this.productBundleItemSelector.forEach((block) =>
      block.addEventListener(
        "mouseenter",
        this.handleBlockHover.bind(this, "enter")
      )
    );
    this.productBundleItemSelector.forEach((block) =>
      block.addEventListener(
        "mouseleave",
        this.handleBlockHover.bind(this, "leave")
      )
    );
  }

  handleBlockHover(type, event) {
    if (type === "enter") {
      this.classList.add("is-hover");
      this.toggleBlockActive(event.target, true);
    } else {
      this.classList.remove("is-hover");
      this.toggleBlockActive(null, false);
    }
  }
  toggleBlockActive(target, isActive) {
    this.productBundleItemSelector.forEach((block) => {
      if (target) {
        block.dataset.selectId === target.dataset.selectId
          ? block.classList.add("active")
          : block.classList.remove("active");
      } else {
        block.classList.remove("active");
      }
    });
  }

  handleButtonClick(event) {
    event.preventDefault();
    const submitButton = this.querySelector('[type="submit"]');
    submitButton.setAttribute("disabled", true);
    submitButton.classList.add("loading");
    const items = {
      items: [...this.querySelectorAll('[name="id"]')]
        .map((e) => e.value)
        .map((e) => ({
          id: e,
          quantity: 1,
        })),
    };
    let sectionsToBundle = [];

    if (this.cartNotification) {
      this.cartNotification
        .getSectionsToRender()
        .map((section) => sectionsToBundle.push(section.id));
      this.cartNotification.setActiveElement(document.activeElement);
    }

    const body = JSON.stringify({
      ...items,
      sections: sectionsToBundle,
      section_url: window.location.pathname,
    });

    fetch(`${routes.cart_add_url}?section_id=cart-notification-product`, {
      ...fetchConfig("javascript"),
      body,
    })
    .then((response) => response.json())
    .then(async (parsedState) => {
      if (parsedState.status) {
        console.log(parsedState.description);
        return;
      }
      if (parsedState.status === 422) {
        console.log("422");
      } else {
        if (this.cartNotification) {
          this.cartNotification.renderContents(parsedState);
        }
        if (this.cartItems) {
          this.cartItems.renderContents(parsedState);
        }
      }
    })
    .catch((e) => {
      console.error(e);
    })
    .finally(() => {
      submitButton.classList.remove("loading");
      submitButton.removeAttribute("disabled");
    });
  }
}

customElements.define("products-bundle-group", ProductBundle);

class ProductBundleVariantSelector extends HTMLElement {
  constructor() {
    super();
    this.variantSelect = this.querySelector("select");
    if (this.variantSelect) {
      this.variantSelect.addEventListener(
        "change",
        this.handleVariantChange.bind(this)
      );
    }
  }

  handleVariantChange(event) {
    const variantSelect = event.target;
    const selectedVariant = variantSelect.options[variantSelect.selectedIndex];
    const salePriceElement = this.querySelector(".price__sale");
    salePriceElement.querySelector(
      ".price-item--sale"
    ).innerHTML = `${selectedVariant.dataset.price}`;
    console.log(salePriceElement)
  }
}
customElements.define(
  "product-bundle-variant-item",
  ProductBundleVariantSelector
);

// Featured collection tabs
// ====================================
class Tabs extends HTMLElement {
  constructor() {
    super();
    this.tabControl = this.getAttribute("aria-controls");
    this.tabControlDocument = document.getElementById(this.tabControl);
    this.buttons = [...this.querySelectorAll("button")];
    this.items = [...this.tabControlDocument.querySelectorAll("[tab-item]")];
    // this.items = [...this.querySelectorAll("[tab-item]")];
    this.oldIndex = 0;
    this.buttons.forEach((item) =>
      item.addEventListener("click", () =>
        this.tabChanged(item, this.buttons.indexOf(item))
      )
    );

    if (Shopify.designMode) {
      this.addEventListener("shopify:block:select", (event) => {
        const targetElement = event.target;
        targetElement.click();
      });
    }
  }

  tabChanged(item, index) {
    if (item.getAttribute("aria-current") === "true") return;
    this.buttons[this.oldIndex].setAttribute("aria-current", "false");
    this.buttons[index].setAttribute("aria-current", "true");
    this.items[this.oldIndex].removeAttribute("tab-selected");
    this.oldIndex = index;
    this.items[index].setAttribute("tab-selected", "");
  }
}

customElements.define("featured-collection-tab", Tabs);
