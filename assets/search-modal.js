class SearchModal extends HTMLElement {
  constructor() {
    super();
    this.addEventListener(
      "keyup",
      (evt) => evt.code === "Escape" && this.close()
    );
    this.querySelector(".modal__close-button").addEventListener(
      "click",
      this.close.bind(this)
    );
    this.querySelector(".offcanvas-overlay").addEventListener(
      "click",
      this.close.bind(this)
    );
    this.setHeaderSearchIconAccessibility();
  }

  setHeaderSearchIconAccessibility() {
    const searchIconButton = document.querySelector("#header_search__action");
    if (searchIconButton) {
      searchIconButton.setAttribute("role", "button");
      searchIconButton.setAttribute("aria-haspopup", "dialog");
      searchIconButton.addEventListener("click", (event) => {
        event.preventDefault();
        this.open(searchIconButton);
      });
    }
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    setTimeout(() => {
      this.classList.add("animate", "active");
    });

    this.addEventListener(
      "transitionend",
      () => {
        const focusElement =
          this.querySelector(".search__content_inner") ||
          this.querySelector(".modal__close-button");
        trapFocus(focusElement);
      },
      { once: true }
    );
    document.body.classList.add("body-overflow-hidden");
  }

  close() {
    this.classList.remove("active");
    document.body.classList.remove("body-overflow-hidden");
  }
  setActiveElement(element) {
    this.activeElement = element;
  }
}
customElements.define("search-modal", SearchModal);
