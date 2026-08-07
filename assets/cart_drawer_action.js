theme.CartDrawerActions = (function() {
   function cartActions(){
     let cartActionsButtons = document.querySelectorAll('.cart_notification_action_button'),
      cartCancelButtons = document.querySelectorAll('.action_drawer_footer .button__cancel'),
      cartSaveButtons = document.querySelectorAll('.action_drawer_footer .button__save'),
      cartNoteData = document.getElementById('cartNote'),
      actionOverlay = document.querySelector('.cart_action_drawer_overlay'),
      cartNote = document.getElementById('cart_note_drawer'),
      ShippingCalc = document.getElementById('shipping_drawer'),
      shippingCountry = document.getElementById('AddressCountry_Shipping'),
      countryState = document.getElementById('AddressProvince_shipping'),
      shippingCountryZip = document.getElementById('ShippingAddressZip');

     if(!cartNoteData === null) {
       fetch('/cart.js')
        .then(response => response.json()) 
        .then(json => {
        cartNoteData.value = json.note;
        })
        .catch(err => console.log(err));
     }

     cartActionsButtons.forEach((item)=> {
       item.addEventListener('click', () => {
       if(item.dataset.drawer === "note"){
       	 cartNote.classList.add('active');
         actionOverlay.classList.add('active');
       }else{
       	  ShippingCalc.classList.add('active');
          actionOverlay.classList.add('active');
       }
       });
     });
  	cartCancelButtons.forEach((item) =>{
      item.addEventListener('click', () => {
      	 if(item.dataset.action === "note"){
       		cartNote.classList.remove('active');
            actionOverlay.classList.remove('active');
          }else{
       	  	ShippingCalc.classList.remove('active');
            actionOverlay.classList.remove('active');
         }
       });               
	});

    cartSaveButtons.forEach((item) => {
	 item.addEventListener('click', () => {
      if(item.dataset.action === "note"){                      
        let noteUpdate = cartNoteData.value;
        item.classList.add('loading');  
        let body = JSON.stringify({
          note: noteUpdate
       });
       fetch(`${routes.cart_update_url}`, {...fetchConfig(), ...{ body }})
         .then((response) => {
            return response.json();
         })
         .then((state) => {
            cartNote.classList.remove('active');
            actionOverlay.classList.remove('active');
         	item.classList.remove('loading');  
         })
         .catch((e) => {
             console.error(e);
          });
		}
      	if(item.dataset.action === "shipping"){
         let shippingRatePackage = document.querySelector('.shipping_rate_package');
         let shippingAddressWrapper = document.querySelector('.shipping_rate_message');
      	 let shippingAddressCount = document.querySelector('.shipping_address_count');
          
      	 shippingRatePackage.innerHTML = '';
          if(shippingCountry.value !== "---"){
            item.classList.add('loading');  
            fetch(`/cart/shipping_rates.json?shipping_address%5Bzip%5D=${shippingCountryZip.value}&shipping_address%5Bcountry%5D=${shippingCountry.value}&shipping_address%5Bprovince%5D=${countryState.value}`)
            .then((response) => {
              if (response.ok) {
                return response.json()
              } else {
                throw `${window.shipping.wrong_message}`;
              }
            })
            .then((response) => {
              item.classList.remove('loading'); 
              
              shippingAddressWrapper.classList.remove('no-js-inline');
              shippingAddressCount.innerText = `${response.shipping_rates.length}`
              response.shipping_rates.map((item) => {
                let text = document.createElement("P"); 
                text.setAttribute("class", 'mb-0');
                text.innerText = `${item.name}: ${shopCurrencySymbol}${item.price}`
                shippingRatePackage.appendChild(text);
              })
            })
            .catch((e) => {
              item.classList.remove('loading');     
              shippingAddressWrapper.classList.add('no-js-inline');
              shippingRatePackage.innerHTML = `<p class="error mt-15">${e}</p>`;
            });
          }else{
            shippingAddressWrapper.classList.add('no-js-inline');
            shippingRatePackage.innerHTML = `<p class="error mt-15">${window.shipping.country_label}</p>`;
          }
    	} 
      }); 
    });

	
	let countrySelectsShipping = document.querySelectorAll('data-address-country-select')
    if(shippingCountry && countryState){
      if (Shopify && Shopify.CountryProvinceSelector) {
        new Shopify.CountryProvinceSelector('AddressCountry_Shipping', 'AddressProvince_shipping', {
          hideElement: 'AddressProvinceContainerNewShiping'
        });
      }
    }

   }
  return cartActions;
})();