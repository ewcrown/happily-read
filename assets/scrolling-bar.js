theme.scrollingText = (function () {
  function announcementModule(e) {
    let announcementList = e.querySelectorAll(".announcement-bar");
    announcementList.forEach((element) => {
      element.addEventListener("click", (evt) => {
        let evtTargetElement = evt.target;
        if (evtTargetElement.classList.contains("close__announcement--bar")) {
          evtTargetElement.parentElement.remove();
        }
      });
    });
  }
  return announcementModule;
})();

if (!customElements.get("marquee-scroll-bar")) {
  customElements.define(
    "marquee-scroll-bar",
    class marqueeScrollBar extends HTMLElement {
      constructor() {
        super();
        this.closeButton = this.querySelector(".close__announcement--bar")
        this.morqueeClassList = this.classList.contains("marqueee");
        this.scrolling = this.querySelector(".scrolling--item");
        this.initScroll();
        this.closeFun()
      }
      initScroll() {
        const childCount = this.childElementCount === 1 ? true : false;
        if (childCount && this.morqueeClassList) {
          this.scrolling.classList.add("scrolling--animated");
    
          for (let i = 0; i < 10; i++) {
            this.clone = this.scrolling.cloneNode(true);
            this.clone.setAttribute("aria-hidden", true);
            this.appendChild(this.clone);
          }
        }
      }
      closeFun(e){
        // console.log(this.closeButton)
      }
  })
}