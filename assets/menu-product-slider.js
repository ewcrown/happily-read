if (!customElements.get('menu-slider')) {
  customElements.define(
    'menu-slider',
    class MenuSlider extends HTMLElement {
      constructor() {
        super();
        this.sliderActiveContainer = this.querySelector(".menu-product-active");
        this.sliderEnable = this.dataset.sliderEnable === "true";
        this.extraLargeDesktopShow = parseInt(this.dataset.showExtraLarge);
        this.mobileShow = parseInt(this.dataset.showMobile);
        this.autoPlayValue = true;
        this.sliderAutoplay = this.dataset.autoplay;
        this.autoPlayTime = parseInt(this.dataset.autoplayTime);
        
        if (this.sliderAutoplay == "true"){
          this.autoPlayValue =  {
              delay: this.autoPlayTime
          };
        }
        
        let menuProducts = new Swiper(this.sliderActiveContainer, {
          loop: true,
          slidesPerView: this.mobileShow,
          spaceBetween: 30,
          autoplay: this.autoPlayValue,
          pagination: {
            el: this.querySelector(".swiper-pagination"),
            clickable: true,
            type: "fraction"
          },
          navigation: {
            nextEl: this.querySelector(".swiper-button-next"),
            prevEl: this.querySelector(".swiper-button-prev"),
          },
          breakpoints: {
            640: {
              slidesPerView: this.mobileShow,
            },
            750: {
              slidesPerView: this.extraLargeDesktopShow,
            },
          },
        });
      }
    }
  );
}