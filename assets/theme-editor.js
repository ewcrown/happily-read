

document.addEventListener('shopify:section:select', function (event) {
  const sectionTarget = event.target.classList.contains('cart-drawer-section')
  if(!sectionTarget) return;
  const targetAction = event.target.querySelector('.cart-notification-action')
  if(sectionTarget) {
    targetAction.open()
  }

})

document.addEventListener('shopify:section:deselect', function (event) {
  const sectionDeslectTarget = event.target.classList.contains('cart-drawer-section')
  if(!sectionDeslectTarget) return;
  const targetActionRemove = event.target.querySelector('.cart-notification-action')
  if(sectionDeslectTarget) {
    targetActionRemove.close()
  }
});

