/**
 * Load More Button - Advanced Implementation
 * Enhanced version with progress indicator, history management, and facet support
 */

class LoadMoreAdvanced extends HTMLElement {
  constructor() {
    super();

    this.selectors = {
      button: '[data-load-more-btn]',
      spinner: '.load-more__spinner',
      progressBar: '.load-more__progress-bar',
      progressText: '.load-more__progress-text',
      productGrid: '#product-grid [data-product-column], [data-product-grid]',
      pagination: '.pagination-wrapper',
      productCount: '#ProductCountDesktop, #ProductCount',
    };

    this.button = this.querySelector(this.selectors.button);
    this.spinner = this.querySelector(this.selectors.spinner);
    this.progressBar = this.querySelector(this.selectors.progressBar);
    this.progressText = this.querySelector(this.selectors.progressText);
    this.productGrid = document.querySelector(this.selectors.productGrid);
    this.pagination = document.querySelector(this.selectors.pagination);

    this.state = {
      isLoading: false,
      currentPage: parseInt(this.dataset.currentPage) || 1,
      totalPages: parseInt(this.dataset.totalPages) || 1,
      totalProducts: parseInt(this.dataset.totalProducts) || 0,
      loadedProducts: parseInt(this.dataset.loadedProducts) || 0,
      nextUrl: this.dataset.nextUrl || null,
    };

    this.init();
  }

  init() {
    if (!this.button || !this.productGrid) return;

    // Hide standard pagination
    if (this.pagination) {
      this.pagination.style.display = 'none';
    }

    // Bind events
    this.button.addEventListener('click', this.handleClick.bind(this));

    // Update UI
    this.updateProgress();
    this.updateButtonVisibility();

    // Handle browser back/forward
    window.addEventListener('popstate', this.handlePopState.bind(this));
  }

  handleClick(event) {
    event.preventDefault();
    this.loadMore();
  }

  async loadMore() {
    if (this.state.isLoading || !this.state.nextUrl) return;

    this.state.isLoading = true;
    this.showLoading();

    try {
      const response = await fetch(this.state.nextUrl, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Find new products
      const newGrid = doc.querySelector(this.selectors.productGrid);
      const newProducts = newGrid ? newGrid.querySelectorAll(':scope > .col, :scope > .swiper-slide') : [];

      if (newProducts.length > 0) {
        // Append new products with animation
        await this.appendProducts(newProducts);

        // Update loaded count
        this.state.loadedProducts += newProducts.length;
      }

      // Get next page info
      const newLoadMore = doc.querySelector('load-more-advanced');
      if (newLoadMore) {
        this.state.nextUrl = newLoadMore.dataset.nextUrl || null;
        this.state.currentPage = parseInt(newLoadMore.dataset.currentPage) || this.state.currentPage + 1;
      } else {
        this.state.nextUrl = null;
        this.state.currentPage++;
      }

      // Update history
      this.updateHistory();

      // Update UI
      this.updateProgress();
      this.updateButtonVisibility();
      this.updateProductCount(doc);

      // Reinitialize any JavaScript components on new products
      this.reinitializeComponents();

      // Fire custom event
      this.dispatchEvent(
        new CustomEvent('loadmore:complete', {
          bubbles: true,
          detail: {
            newProducts: newProducts.length,
            currentPage: this.state.currentPage,
            totalPages: this.state.totalPages,
          },
        })
      );

    } catch (error) {
      console.error('Load more failed:', error);
      this.showError();
    } finally {
      this.state.isLoading = false;
      this.hideLoading();
    }
  }

  async appendProducts(products) {
    const fragment = document.createDocumentFragment();

    products.forEach((product) => {
      const clone = product.cloneNode(true);
      clone.style.opacity = '0';
      clone.style.transform = 'translateY(30px)';
      fragment.appendChild(clone);
    });

    this.productGrid.appendChild(fragment);

    // Animate products in
    const newItems = Array.from(this.productGrid.children).slice(-products.length);

    return new Promise((resolve) => {
      newItems.forEach((item, index) => {
        setTimeout(() => {
          item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          item.style.opacity = '1';
          item.style.transform = 'translateY(0)';

          if (index === newItems.length - 1) {
            setTimeout(resolve, 500);
          }
        }, index * 80);
      });
    });
  }

  showLoading() {
    this.button.classList.add('is-loading');
    this.button.disabled = true;

    if (this.spinner) {
      this.spinner.classList.add('is-visible');
    }
  }

  hideLoading() {
    this.button.classList.remove('is-loading');
    this.button.disabled = false;

    if (this.spinner) {
      this.spinner.classList.remove('is-visible');
    }
  }

  updateProgress() {
    const progress = this.state.totalProducts > 0
      ? Math.round((this.state.loadedProducts / this.state.totalProducts) * 100)
      : 0;

    if (this.progressBar) {
      this.progressBar.style.width = `${progress}%`;
    }

    if (this.progressText) {
      this.progressText.textContent = `${this.state.loadedProducts} / ${this.state.totalProducts}`;
    }
  }

  updateButtonVisibility() {
    if (!this.state.nextUrl || this.state.currentPage >= this.state.totalPages) {
      this.classList.add('is-hidden');
      this.button.style.display = 'none';
    } else {
      this.classList.remove('is-hidden');
      this.button.style.display = 'inline-flex';
    }
  }

  updateProductCount(doc) {
    const newCount = doc.querySelector(this.selectors.productCount);
    const currentCount = document.querySelector(this.selectors.productCount);

    if (newCount && currentCount) {
      currentCount.innerHTML = newCount.innerHTML;
    }
  }

  updateHistory() {
    const url = new URL(window.location.href);
    url.searchParams.set('page', this.state.currentPage);

    window.history.replaceState(
      { page: this.state.currentPage },
      '',
      url.toString()
    );
  }

  handlePopState(event) {
    if (event.state && event.state.page) {
      window.location.reload();
    }
  }

  reinitializeComponents() {
    // Reinitialize quick view modals
    if (typeof QuickViewModal !== 'undefined') {
      document.querySelectorAll('quick-view-modal').forEach((el) => {
        if (!el._initialized) {
          new QuickViewModal(el);
          el._initialized = true;
        }
      });
    }

    // Reinitialize product forms
    if (typeof ProductForm !== 'undefined') {
      document.querySelectorAll('product-form:not([data-initialized])').forEach((el) => {
        el.setAttribute('data-initialized', 'true');
      });
    }

    // Reinitialize wishlist buttons
    if (window.wishlist && typeof window.wishlist.init === 'function') {
      window.wishlist.init();
    }

    // Reinitialize compare buttons
    if (window.compare && typeof window.compare.init === 'function') {
      window.compare.init();
    }

    // Fire event for other scripts
    document.dispatchEvent(new CustomEvent('loadmore:reinitialized'));
  }

  showError() {
    const errorEl = this.querySelector('.load-more__error');
    if (errorEl) {
      errorEl.classList.add('is-visible');
      setTimeout(() => {
        errorEl.classList.remove('is-visible');
      }, 4000);
    }
  }
}

customElements.define('load-more-advanced', LoadMoreAdvanced);

// Also register as load-more-2 for backward compatibility
if (!customElements.get('load-more-2')) {
  customElements.define('load-more-2', class extends LoadMoreAdvanced {});
}
