(function () {
	'use strict';

	var CompareProducts = () => {
		const selectors = {
			addButton: ".js-compare-products-button",
			productButton: ".js-compare-products-popup-button",
			stickyAddToCart: ".js-sticky-add-to-cart",
			compareProductCard: ".js-compare-product",
			compareProducts: ".js-compare-products",
			modal: "compare-products",
			compareProductRow: ".js-product-compare-row",
			removeButton: ".js-product-compare-remove",
			clearButton: ".js-compare-products-clear"
		};

		const attributes = {
			product: "data-product-handle",
			productTitle: "data-product-title",
			ariaLabel: "aria-label",
			count: "data-count",
			empty: "data-empty"
		};

		const MAX_COMPARE_PRODUCTS = 6;

		const closeIconAlternateDesign = `
		<svg class="icon" aria-hidden="true" focusable="false" width="57" height="57" viewBox="0 0 57 57" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect x="12.8594" y="15.4238" width="2.85714" height="40" rx="0.5" transform="rotate(-45 12.8594 15.4238)" fill="currentColor"/>
			<rect x="15.7109" y="43.9961" width="2.85714" height="40" rx="0.5" transform="rotate(-135 15.7109 43.9961)" fill="currentColor"/>
		</svg>
	`;
		const closeIconDefault = `
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z"></path>
		</svg>
	`;

		const classes = {
			...window.themeCore.utils.cssClasses,
			bigPadding: "big-padding"
		};
		let productButton, translations, overlay, Toggle, container, modal, isAlternateDesign;

		function init() {
			productButton = document.querySelector(selectors.productButton);
			isAlternateDesign = document.body.classList.contains(classes.designAlternate);

			if (!productButton) {
				return;
			}

			updateProductButton();
			initAddButtons();
			setInitLister();
			addEventListeners();
		}

		function setInitLister() {
			window.themeCore.EventBus.listen(`compare-products:init`, initAddButtons);
		}

		function initAddButtons() {
			translations = {
				add: window.themeCore.translations.get("products.compare_products.product_button_add"),
				remove: window.themeCore.translations.get("products.compare_products.product_button_remove"),
				error: window.themeCore.translations.get("products.compare_products.quantity_error")
			};
			overlay = window.themeCore.utils.overlay;
			Toggle = window.themeCore.utils.Toggle;

			const addButtons = [...document.querySelectorAll(selectors.addButton)];

			if (!addButtons.length) {
				return;
			}

			const products = getComparedProducts();

			addButtons.forEach((button) => {
				const product = button.getAttribute(attributes.product);

				if (!product) {
					return;
				}

				const productTitle = button.getAttribute(attributes.productTitle);

				if (productTitle) {
					const ariaLabel = translations[products.includes(product) ? "remove" : "add"].replaceAll("{{ product }}", productTitle);
					button.setAttribute(attributes.ariaLabel, ariaLabel);
				}

				button.classList.toggle(classes.active, products.includes(product));
				button.classList.remove(classes.hidden);
			});

			productButton.setAttribute(attributes.count, products.length);
		}

		function getComparedProducts() {
			const products = localStorage.getItem("theme-compare-products");

			if (!products) {
				return [];
			}

			try {
				return JSON.parse(products);
			} catch (e) {
				return [];
			}
		}

		function setComparedProducts(products) {
			if (!products) {
				return;
			}

			if (products.length > MAX_COMPARE_PRODUCTS) {
				showErrorNotification();
				return;
			}

			localStorage.setItem("theme-compare-products", JSON.stringify(products));
			initAddButtons();
		}

		function toggleProduct(product) {
			let products = getComparedProducts();

			if (products.includes(product)) {
				products = products.filter((productElement) => productElement !== product);
			} else {
				products = [...products, product];
			}

			setComparedProducts(products);
		}

		function removeProduct(product) {
			let products = getComparedProducts();
			products = products.filter((productElement) => productElement !== product);

			setComparedProducts(products);
		}

		function clear() {
			setComparedProducts([]);
		}

		function addEventListeners() {
			document.addEventListener("click", addButtonsClickHandler);
			document.addEventListener("click", removeButtonsClickHandler);
			productButton.addEventListener("click", productButtonClickHandler);
		}

		function addButtonsClickHandler(event) {
			const addButton = event.target.closest(selectors.addButton);

			if (!addButton) {
				return;
			}

			const product = addButton.getAttribute(attributes.product);

			if (!product) {
				return;
			}

			toggleProduct(product);
		}

		function removeButtonsClickHandler(event) {
			const removeButton = event.target.closest(selectors.removeButton);
			const clearButton = event.target.closest(selectors.clearButton);

			if (!removeButton && !clearButton) {
				return;
			}

			if (clearButton) {
				clear();
				modal.close(container);
				return;
			}

			const product = removeButton.getAttribute(attributes.product);

			if (!product) {
				return;
			}

			removeProduct(product);

			const productCount = getComparedProducts().length;
			const compareProducts = document.querySelector(selectors.compareProducts);

			if (compareProducts) {
				if (productCount < 2) {
					modal.close(container);
					return;
				}

				const productRows = [...compareProducts.querySelectorAll(`[${attributes.product}="${product}"]`)];
				productRows.forEach((row) => row.remove());
				compareProducts.style = `--compare-products-count: ${productCount}`;
			}
		}

		function updateProductButton() {
			const hasStickyAddToCart = !!document.querySelector(selectors.stickyAddToCart);

			if (!hasStickyAddToCart) {
				return;
			}

			productButton.classList.add(classes.bigPadding);
		}

		function showErrorNotification() {
			setTimeout(() => {
				const CartNotificationError = window.themeCore.CartNotificationError;
				CartNotificationError.addNotification(translations.error, window.themeCore.translations.get("products.compare_products.quantity_error_heading"));
				CartNotificationError.open();
			});
		}

		async function productButtonClickHandler() {
			const productCount = getComparedProducts().length;
			productButton.disabled = true;

			overlay({ namespace: "compare-products-preloader" }).open(true);
			const productCards = await getProductCards();
			container = getLayout(productCards);
			container.style = `--compare-products-count: ${productCount}`;

			document.body.append(container);

			const toggleConfig = {
				toggleSelector: selectors.modal,
				previouslySelectedElement: productButton
			};

			modal = Toggle(toggleConfig);
			modal.init({ once: true });
			modal.open(container);

			setTimeout(() => container.focus(), 50);
			productButton.disabled = false;
		}

		async function getProductCards() {
			const products = getComparedProducts();

			try {
				return await Promise.all(products.map((product) => getProductCard(product)));
			} catch (error) {
				console.log(error);
			}
		}

		async function getProductCard(product) {
			const locale = window.Shopify.routes.root;
			const url = `${locale}products/${product}?view=compare`;

			return await getHTML(url, selectors.compareProductCard);
		}

		async function getHTML(url, selector) {
			try {
				const response = await fetch(url);
				const resText = await response.text();
				let result = new DOMParser().parseFromString(resText, "text/html");
				if (selector) {
					result = result.querySelector(selector);
				}

				return result;
			} catch (error) {
				console.log(error);
			}
		}

		function getLayout(productCards) {
			const productCardsLayout = document.createElement("html");
			productCardsLayout.innerHTML = productCards.map((card) => card.outerHTML).join(" ");

			let rows = Array.from(Array(11)).map((x, index) => {
				return [...productCardsLayout.querySelectorAll(`${selectors.compareProductRow}[data-index="${index + 1}"]`)];
			});

			rows = rows.filter((row) => !row.every((col) => col.hasAttribute(attributes.empty)));

			const html = document.createElement("html");
			const blockClass = isAlternateDesign ? "compare-products-new" : "compare-products";
			const productCardClass = isAlternateDesign ? "compare-product-card-new" : "compare-product-card";
			const closeIcon = isAlternateDesign ? closeIconAlternateDesign : closeIconDefault;

			html.innerHTML = `
			<div
				class="modal ${blockClass} js-compare-products"
				id="compare-products"
				data-modal-once="true"
				tabindex="-1"
				aria-modal="true"
				role="dialog"
			>
				<header class="modal__header compare-products__header">
					${
						window.themeCore.compareProductsTitle &&
						`<h2 class="compare-products__heading ${isAlternateDesign ? "h4" : ""}">
							${window.themeCore.compareProductsTitle}
						</h2>`
					}
					${
						window.themeCore.translations.get("products.compare_products.clear_all") &&
						`<button class="compare-products__clear js-compare-products-clear focus-visible-outline">
						${window.themeCore.translations.get("products.compare_products.clear_all")}
					</button>`
					}


					<button
						class="compare-products__close focus-visible-outline"
						data-target="compare-products"
						aria-label="${window.themeCore.translations.get("general.accessibility.close")}"
						data-js-toggle="compare-products"
					>
						${closeIcon}
					</button>
				</header>

				<div class="modal__body compare-products__body">
					<div class="modal__body compare-products__content ${productCardClass}">
						${rows.map((row) => row.map((col) => col.outerHTML).join("")).join("")}
					</div>
				</div>
			</div>
		`;

			return html.querySelector(selectors.compareProducts);
		}

		return Object.freeze({
			init
		});
	};

	/**
	 * Section: Compare products
	 * ------------------------------------------------------------------------------
	 * @namespace CompareProducts
	 */

	const action = () => {
		window.themeCore.CompareProducts = window.themeCore.CompareProducts || CompareProducts();
		window.themeCore.utils.register(window.themeCore.CompareProducts, "compare-products");
	};

	if (window.themeCore && window.themeCore.loaded) {
		action();
	} else {
		document.addEventListener("theme:all:loaded", action, { once: true });
	}

})();
