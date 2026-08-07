/**
 * Infinite Scroll - Auto-loading Pagination
 * Automatically loads more products when user scrolls near the bottom
 */

class InfiniteScroll extends HTMLElement {
  constructor() {
    super();

    this.config = {
      threshold: 400, // pixels from bottom to trigger load
      debounceDelay: 100,
      maxRetries: 3,
    };

    this.selectors = {
      productGrid: '#product-grid [data-product-column], [data-product-grid]',
      pagination: '.pagination-wrapper',
      spinner: '.infinite-scroll__spinner',
      endMessage: '.infinite-scroll__end-message',
      productCount: '#ProductCountDesktop, #ProductCount',
    };

    this.state = {
      isLoading: false,
      isEnabled: true,
      currentPage: parseInt(this.dataset.currentPage) || 1,
      totalPages: parseInt(this.dataset.totalPages) || 1,
      nextUrl: this.dataset.nextUrl || null,
      retryCount: 0,
      observer: null,
    };

    this.productGrid = document.querySelector(this.selectors.productGrid);
    this.pagination = document.querySelector(this.selectors.pagination);
    this.spinner = this.querySelector(this.selectors.spinner);
    this.endMessage = this.querySelector(this.selectors.endMessage);

    this.init();
  }

  init() {
    if (!this.productGrid) return;

    // Hide standard pagination
    if (this.pagination) {
      this.pagination.style.display = 'none';
    }

    // Setup intersection observer for better performance
    this.setupObserver();

    // Fallback scroll listener for older browsers
    this.scrollHandler = this.debounce(this.checkScroll.bind(this), this.config.debounceDelay);
    window.addEventListener('scroll', this.scrollHandler, { passive: true });

    // Handle visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkScroll();
      }
    });

    // Update initial state
    this.updateUI();
  }

  setupObserver() {
    if (!('IntersectionObserver' in window)) return;

    const options = {
      root: null,
      rootMargin: `${this.config.threshold}px`,
      threshold: 0,
    };

    this.state.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && this.state.isEnabled && !this.state.isLoading) {
          this.loadMore();
        }
      });
    }, options);

    this.state.observer.observe(this);
  }

  checkScroll() {
    if (!this.state.isEnabled || this.state.isLoading || !this.state.nextUrl) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const triggerPosition = document.body.offsetHeight - this.config.threshold;

    if (scrollPosition >= triggerPosition) {
      this.loadMore();
    }
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
      const newProducts = newGrid
        ? newGrid.querySelectorAll(':scope > .col, :scope > .swiper-slide')
        : [];

      if (newProducts.length > 0) {
        await this.appendProducts(newProducts);
        this.state.retryCount = 0;
      }

      // Get next page info from new load-more element or pagination
      this.updateNextPage(doc);

      // Update URL without reload
      this.updateURL();

      // Update product count
      this.updateProductCount(doc);

      // Reinitialize components
      this.reinitializeComponents();

      // Update UI state
      this.updateUI();

      // Fire custom event
      this.dispatchEvent(
        new CustomEvent('infinitescroll:loaded', {
          bubbles: true,
          detail: {
            page: this.state.currentPage,
            totalPages: this.state.totalPages,
            productsLoaded: newProducts.length,
          },
        })
      );

    } catch (error) {
      console.error('Infinite scroll error:', error);
      this.handleError();
    } finally {
      this.state.isLoading = false;
      this.hideLoading();
    }
  }

  async appendProducts(products) {
    const fragment = document.createDocumentFragment();

    products.forEach((product) => {
      const clone = product.cloneNode(true);
      clone.classList.add('infinite-scroll__item');
      clone.style.opacity = '0';
      clone.style.transform = 'translateY(40px)';
      fragment.appendChild(clone);
    });

    this.productGrid.appendChild(fragment);

    // Staggered animation
    const newItems = this.productGrid.querySelectorAll('.infinite-scroll__item');

    return new Promise((resolve) => {
      let animated = 0;

      newItems.forEach((item, index) => {
        setTimeout(() => {
          item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
          item.style.opacity = '1';
          item.style.transform = 'translateY(0)';
          item.classList.remove('infinite-scroll__item');

          animated++;
          if (animated === newItems.length) {
            resolve();
          }
        }, index * 60);
      });

      // Fallback resolve
      setTimeout(resolve, products.length * 60 + 600);
    });
  }

  updateNextPage(doc) {
    // Try to find next page from infinite-scroll element
    const newInfiniteScroll = doc.querySelector('infinite-scroll');
    if (newInfiniteScroll) {
      this.state.nextUrl = newInfiniteScroll.dataset.nextUrl || null;
      this.state.currentPage = parseInt(newInfiniteScroll.dataset.currentPage) || this.state.currentPage + 1;
      return;
    }

    // Fallback: find next page from pagination
    const nextLink = doc.querySelector('.pagination__item--next, .pagination__item-arrow[aria-label*="next" i]');
    if (nextLink) {
      this.state.nextUrl = nextLink.href;
      this.state.currentPage++;
    } else {
      this.state.nextUrl = null;
      this.state.currentPage++;
    }
  }

  updateURL() {
    if (!window.history.replaceState) return;

    const url = new URL(window.location.href);
    if (this.state.currentPage > 1) {
      url.searchParams.set('page', this.state.currentPage);
    }
    window.history.replaceState({ page: this.state.currentPage }, '', url.toString());
  }

  updateProductCount(doc) {
    const newCount = doc.querySelector(this.selectors.productCount);
    const currentCount = document.querySelector(this.selectors.productCount);

    if (newCount && currentCount) {
      currentCount.innerHTML = newCount.innerHTML;
    }
  }

  updateUI() {
    if (!this.state.nextUrl || this.state.currentPage >= this.state.totalPages) {
      this.showEndMessage();
      this.state.isEnabled = false;

      if (this.state.observer) {
        this.state.observer.disconnect();
      }
    }
  }

  showLoading() {
    this.classList.add('is-loading');
    if (this.spinner) {
      this.spinner.classList.add('is-visible');
    }
  }

  hideLoading() {
    this.classList.remove('is-loading');
    if (this.spinner) {
      this.spinner.classList.remove('is-visible');
    }
  }

  showEndMessage() {
    if (this.endMessage) {
      this.endMessage.classList.add('is-visible');
    }
  }

  handleError() {
    this.state.retryCount++;

    if (this.state.retryCount < this.config.maxRetries) {
      // Retry after delay
      setTimeout(() => {
        this.loadMore();
      }, 2000 * this.state.retryCount);
    } else {
      // Show error and stop
      this.state.isEnabled = false;
      const errorEl = this.querySelector('.infinite-scroll__error');
      if (errorEl) {
        errorEl.classList.add('is-visible');
      }
    }
  }

  reinitializeComponents() {
    // Reinitialize quick view
    document.querySelectorAll('quick-view-modal:not([data-initialized])').forEach((el) => {
      el.setAttribute('data-initialized', 'true');
    });

    // Reinitialize wishlist
    if (window.wishlist && typeof window.wishlist.init === 'function') {
      window.wishlist.init();
    }

    // Reinitialize compare
    if (window.compare && typeof window.compare.init === 'function') {
      window.compare.init();
    }

    // Reinitialize countdown timers
    document.querySelectorAll('countdown-timer:not([data-initialized])').forEach((el) => {
      el.setAttribute('data-initialized', 'true');
      // Trigger reinitialization if the component has an init method
      if (typeof el.init === 'function') {
        el.init();
      }
    });

    // Fire event for other scripts
    document.dispatchEvent(new CustomEvent('infinitescroll:reinitialized'));
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Public methods
  enable() {
    this.state.isEnabled = true;
    if (this.state.observer) {
      this.state.observer.observe(this);
    }
  }

  disable() {
    this.state.isEnabled = false;
    if (this.state.observer) {
      this.state.observer.disconnect();
    }
  }

  destroy() {
    this.disable();
    window.removeEventListener('scroll', this.scrollHandler);
    if (this.state.observer) {
      this.state.observer.disconnect();
    }
  }
}

customElements.define('infinite-scroll', InfiniteScroll);

// Ajax Pagination variant - alias for backward compatibility
if (!customElements.get('ajax-pagination')) {
  customElements.define('ajax-pagination', class extends InfiniteScroll {});
}
