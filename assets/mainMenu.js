theme.headerMainMenuModule = (function () {
  function mainMenu() {
    let menuLiSelector = document.querySelectorAll(".header__menu_li");
    menuLiSelector.forEach((item) => {
      if (item.classList.contains("menu__item_has_children")) {
        let menuItemUrl = "",
          menuItemLocation = "";
        item.addEventListener("mouseover", (event) => {
          let listDetails = item.querySelector("details");
          listDetails.setAttribute("open", "");
          item.querySelector("summary").setAttribute("aria-expanded", true);
        });
        item.addEventListener("mouseleave", (event) => {
          let listDetails = item.querySelector("details");
          listDetails.removeAttribute("open");
          item.querySelector("summary").setAttribute("aria-expanded", false);
        });
        item.querySelector("summary").addEventListener("click", (event) => {
          event.stopPropagation();
          menuItemUrl = item.querySelector("summary").dataset.href;
          menuItemLocation = `${window.location.origin}${menuItemUrl}`;
          let itemAttr = item.querySelector("details");
          if (itemAttr.hasAttribute("open")) {
            location.href = `${menuItemLocation}`;
          }
        });
      }
    });
  }
  return mainMenu;
})();
