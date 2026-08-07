if (!customElements.get("product-form")) {
  customElements.define(
    "product-form",
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector("form");
        this.form.addEventListener("submit", this.onSubmitHandler.bind(this));
        this.cartNotification = document.querySelector("cart-notification");
        this.cartItems = document.querySelector("cart-items");
        this.quickViewWarpper = document.getElementById("quickViewWrapper");
        //console.log(this.cartNotification);

        this.hideErrors = this.dataset.hideErrors === "true";
      }

      onSubmitHandler(evt) {
        evt.preventDefault();

        const submitButton = this.querySelector('[type="submit"]');

        submitButton.setAttribute("disabled", true);
        submitButton.classList.add("loading");
        // Get Cart API
        let config = fetchConfig("javascript");
        config.headers["X-Requested-With"] = "XMLHttpRequest";
        delete config.headers["Content-Type"];

        let formData = new FormData(this.form);

        if (this.cartNotification) {
          formData.append(
            "sections",
            this.cartNotification
              .getSectionsToRender()
              .map((section) => section.id)
          );
          this.cartNotification.setActiveElement(document.activeElement);
        }

        formData.append("sections_url", window.location.pathname);
        config.body = formData;
        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((parsedState) => {
            console.log(parsedState)
            if (parsedState.status) {
              this.handleErrorMessage(parsedState.description);
              return;
            }
            if (this.cartNotification) {
              this.cartNotification.renderContents(parsedState);
            }
            if (this.cartItems) {
              this.cartItems.renderContents(parsedState);
            }
            document
              .querySelector(".product-form__error-message-wrapper")
              ?.classList.add("no-js-inline");
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            submitButton.classList.remove("loading");
            submitButton.removeAttribute("disabled");
            this.quickViewWarpper?.classList.remove("show__modal");
            document.body.classList.remove("overflow-hidden");
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper ||
          this.querySelector(".product-form__error-message-wrapper");
        this.errorMessage =
          this.errorMessage ||
          this.errorMessageWrapper.querySelector(
            ".product-form__error-message"
          );
        this.errorMessageWrapper.toggleAttribute("hidden", !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
          this.errorMessageWrapper.classList.remove("no-js-inline");
        }
      }
    }
  );
}
