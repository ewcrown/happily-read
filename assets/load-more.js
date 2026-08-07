/**
 * Load More Button - Basic Implementation
 * Handles click-to-load pagination for product grids and collections
 */

class LoadMoreButton extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector('[data-load-more-btn]');
    this.productGrid = document.querySelector('[data-product-grid]');
    this.paginationWrapper = document.querySelector('.pagination-wrapper');
    this.loadingSpinner = this.querySelector('.load-more__spinner');
    this.currentPage = 1;
    this.isLoading = false;

    if (this.button) {
      this.button.addEventListener('click', this.loadMore.bind(this));
      this.init();
    }
  }

  init() {
    // Hide standard pagination if load more is enabled
    if (this.paginationWrapper) {
      this.paginationWrapper.style.display = 'none';
    }

    // Get total pages from data attribute
    this.totalPages = parseInt(this.dataset.totalPages) || 1;
    this.nextPageUrl = this.dataset.nextUrl || null;

    // Update button state
    this.updateButtonState();
  }

  async loadMore() {
    if (this.isLoading || !this.nextPageUrl) return;

    this.isLoading = true;
    this.showLoading();

    try {
      const response = await fetch(this.nextPageUrl);
      if (!response.ok) throw new Error('Network response was not ok');

      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');

      // Get new products
      const newProducts = doc.querySelectorAll('[data-product-grid] > .col');
      const newProductGrid = doc.querySelector('[data-product-grid]');

      if (newProducts.length > 0 && this.productGrid) {
        newProducts.forEach((product) => {
          const clone = product.cloneNode(true);
          this.productGrid.appendChild(clone);
        });

        // Trigger animations for new products
        this.animateNewProducts(newProducts.length);
      }

      // Update next page URL
      const newLoadMore = doc.querySelector('load-more-button');
      if (newLoadMore && newLoadMore.dataset.nextUrl) {
        this.nextPageUrl = newLoadMore.dataset.nextUrl;
        this.currentPage++;
      } else {
        this.nextPageUrl = null;
      }

      // Update button state
      this.updateButtonState();

      // Publish event for other components
      if (typeof publish === 'function') {
        publish('load-more:loaded', {
          currentPage: this.currentPage,
          totalPages: this.totalPages,
        });
      }
    } catch (error) {
      console.error('Load more error:', error);
      this.showError();
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  }

  showLoading() {
    this.button.classList.add('loading');
    if (this.loadingSpinner) {
      this.loadingSpinner.style.display = 'inline-block';
    }
    this.button.disabled = true;
  }

  hideLoading() {
    this.button.classList.remove('loading');
    if (this.loadingSpinner) {
      this.loadingSpinner.style.display = 'none';
    }
    this.button.disabled = false;
  }

  updateButtonState() {
    if (!this.nextPageUrl || this.currentPage >= this.totalPages) {
      this.button.style.display = 'none';
      this.style.display = 'none';
    } else {
      this.button.style.display = 'inline-flex';
      this.style.display = 'block';
    }

    // Update button text with page count
    const pageText = this.button.querySelector('[data-page-text]');
    if (pageText) {
      pageText.textContent = `${this.currentPage} / ${this.totalPages}`;
    }
  }

  animateNewProducts(count) {
    const allProducts = this.productGrid.querySelectorAll('.col');
    const newProducts = Array.from(allProducts).slice(-count);

    newProducts.forEach((product, index) => {
      product.style.opacity = '0';
      product.style.transform = 'translateY(20px)';

      setTimeout(() => {
        product.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        product.style.opacity = '1';
        product.style.transform = 'translateY(0)';
      }, index * 50);
    });
  }

  showError() {
    const errorMsg = this.querySelector('.load-more__error');
    if (errorMsg) {
      errorMsg.style.display = 'block';
      setTimeout(() => {
        errorMsg.style.display = 'none';
      }, 3000);
    }
  }
}

customElements.define('load-more-button', LoadMoreButton);
