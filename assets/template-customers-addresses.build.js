(function () {
	'use strict';

	/**
	 * Section: Customer Addresses
	 * ------------------------------------------------------------------------------
	 * @namespace CustomersAddressesInit
	 */

	const selectors = {
		addressContainer: ".js-addresses-container",
		newAddressForm: ".js-addresses-new-form",
		editAddressesForm: ".js-addresses-edit-form",
		addressCountryOptions: ".js-address-country-option",
		addressDelete: ".js-address-delete",
		addressesNewToggle: ".js-address-new-toggle",
		addressesResetToggle: ".js-address-reset-toggle",
		editAddressForm: "#EditAddress_",
		addressesCountrySelect: "#AddressCountryNew",
		addressesProvinceContainer: "#AddressProvinceContainerNew",
		addressesEditToggle: ".js-address-edit-toggle"
	};

	const formsData = [];
	let cssClasses;

	var CustomersAddressesTemplate = () => {
		function init() {
			cssClasses = window.themeCore.utils.cssClasses;
			const addressContainer = document.querySelector(selectors.addressContainer);

			initProvince();
			setInitialFormData();
			toggleNewAddressForm(addressContainer);
			toggleEditAddressForm(addressContainer);
			deleteAddress(addressContainer);
		}

		function initProvince() {
			if (window.Shopify) {
				new window.Shopify.CountryProvinceSelector("AddressCountryNew", "AddressProvinceNew", {
					hideElement: "AddressProvinceContainerNew"
				});
			}

			let addressCountryOptions = [...document.querySelectorAll(selectors.addressCountryOptions)];

			addressCountryOptions.forEach((addressCountryOption) => {
				let formId = addressCountryOption.dataset.formId;
				let countrySelector = "AddressCountry_" + formId;
				let provinceSelector = "AddressProvince_" + formId;
				let containerSelector = "AddressProvinceContainer_" + formId;

				new window.Shopify.CountryProvinceSelector(countrySelector, provinceSelector, {
					hideElement: containerSelector
				});
			});

			const addressCountrySelect = document.querySelector(selectors.addressesCountrySelect);

			if (addressCountrySelect) {
				addressCountrySelect.addEventListener("change", () => {
					const provinceSelect = document.querySelector(selectors.addressesProvinceContainer);

					if (provinceSelect.style.display !== "none") {
						provinceSelect.style.display = "flex";
					}
				});
			}
		}

		function setInitialFormData() {
			const forms = document.querySelectorAll(selectors.editAddressesForm);

			forms.forEach((editAddressesForm) => {
				let formData = [];
				[...editAddressesForm.elements].forEach((element) => {
					if (element.name) {
						if (element.type === "checkbox") {
							formData[element.name] = element.checked;
						} else {
							formData[element.name] = element.value;
						}
					}
				});

				formsData.push({
					id: editAddressesForm.id,
					data: formData
				});
			});
		}

		function resetForm(event) {
			const form = event.target.closest(selectors.editAddressesForm);

			if (!form) {
				return;
			}

			const currentForm = formsData.find((formData) => form.id === formData.id);
			let formData;

			if (currentForm) {
				formData = currentForm.data;
			}

			if (!formData) {
				return;
			}

			const addressCountryOption = form.querySelector(selectors.addressCountryOptions);
			addressCountryOption.value = formData[addressCountryOption.name];
			addressCountryOption.dispatchEvent(new Event("change"));

			Object.keys(formData).forEach((key) => {
				const element = form.elements[key];

				if (element.type === "checkbox") {
					element.checked = formData[key];
				} else {
					element.value = formData[key];
				}
			});
		}

		function toggleNewAddressForm(addressContainer) {
			addressContainer.addEventListener("click", (event) => {
				const addressesNewToggle = event.target.closest(selectors.addressesNewToggle);

				if (!addressesNewToggle) {
					return;
				}

				let newAddressForm = addressContainer.querySelector(selectors.newAddressForm);

				if (!newAddressForm) {
					return;
				}

				newAddressForm.classList.toggle(cssClasses.hidden);
			});
		}

		function toggleEditAddressForm(addressContainer) {
			addressContainer.addEventListener("click", (event) => {
				const addressesEditToggle = event.target.closest(selectors.addressesEditToggle);

				if (!addressesEditToggle) {
					return;
				}

				let editAddressFormSelector = selectors.editAddressForm + event.target.dataset.formId;

				if (!editAddressFormSelector) {
					return;
				}

				const editAddressForm = addressContainer.querySelector(editAddressFormSelector);

				editAddressForm.classList.toggle(cssClasses.hidden);

				const resetToggle = event.target.closest(selectors.addressesResetToggle);
				resetToggle && resetForm(event);
			});
		}

		function deleteAddress(addressContainer) {
			addressContainer.addEventListener("click", (event) => {
				const addressDelete = event.target.closest(selectors.addressDelete);

				if (!addressDelete) {
					return;
				}

				const formId = addressDelete.dataset.formId;
				const confirmMessage = addressDelete.dataset.confirmMessage;

				if (confirm(confirmMessage || "Are you sure you wish to delete this address?")) {
					window.Shopify.postLink("/account/addresses/" + formId, {
						parameters: { _method: "delete" }
					});
				}
			});
		}

		return Object.freeze({
			init
		});
	};

	/**
	 * Section init: TemplateCustomersAddresses
	 * ------------------------------------------------------------------------------
	 *
	 * @namespace TemplateCustomersAddresses
	 */

	const action = () => {
		window.themeCore.CustomersAddressesTemplate = window.themeCore.CustomersAddressesTemplate || CustomersAddressesTemplate();
		window.themeCore.utils.register(window.themeCore.CustomersAddressesTemplate, "addresses-template");
	};

	if (window.themeCore && window.themeCore.loaded) {
		action();
	} else {
		document.addEventListener("theme:all:loaded", action, { once: true });
	}

})();
