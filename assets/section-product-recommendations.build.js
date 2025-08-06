(function () {
	'use strict';

	const selectors = {
		section: ".js-product-recommendations",
		content: ".js-product-recommendations-content",
		recommendations: "[data-product-recommendations]",
		recommendationsItems: ".js-product-recommendations-col",
		recommendationsRowWrapper: ".js-product-recommendations-row-wrapper",
		viewedContent: ".js-product-recommendations-viewed-content",
		productCard: ".js-product-card",
		tabsButton: ".js-product-recommendations-tab-button",
		tabsContent: ".js-product-recommendations-tab-content",
		buttonsWrapper: ".js-product-recommendations--buttons-wrapper",
		existingProduct: "[data-existing-product]",
		sliderPagination: ".js-featured-content-slider-pagination"
	};

	const attributes = {
		id: "id",
		cardsIndent: "data-cards-indent",
		alternateDesign: "data-alternate-design"
	};

	const PARAMS = {
		section: "section_id",
		limit: "limit",
		product: "product_id",
		view: "view"
	};

	var ProductRecommendations = () => {
		let Swiper = window.themeCore.utils.Swiper;
		let sections = [];

		const cssClasses = window.themeCore.utils.cssClasses;

		const classes = {
			featuredContentSlider: "js-featured-content-slider",
			tabs: "is-tabs",
			recommendations: "is-recommendations",
			recentlyViewedOnly: "is-recently-viewed-only",
			...cssClasses
		};

		async function init(sectionId) {
			sections = setSections(sectionId);

			await Promise.all(sections.map((section) => setupRecommendations(section)));

			window.themeCore.LazyLoadImages.init();

			sections.forEach((section) => {
				const sliders = [...section.el.querySelectorAll(selectors.recommendationsRowWrapper)];

				sliders.forEach((slider) => initSlider(section, slider));
			});
		}

		function initSlider(section, slider) {
			let swiperInstance = null;

			const createSwiper = () => {
				const sliderOptions = {
					grabCursor: true,
					slidesPerView: 2,
					pagination: {
						el: selectors.sliderPagination,
						clickable: true,
						bulletElement: "button"
					},
					watchSlidesProgress: true,
					on: {
						init() {
							section.el.classList.remove(classes.loading);
						}
					}
				};

				if (section.el.hasAttribute(attributes.cardsIndent)) {
					sliderOptions.spaceBetween = 10;
				}

				if (section.el.hasAttribute(attributes.alternateDesign)) {
					sliderOptions.spaceBetween = 12;
				}

				swiperInstance = new Swiper(slider, sliderOptions);
			};

			const destroySwiper = () => {
				if (swiperInstance) {
					swiperInstance.destroy(true, true);
					swiperInstance = null;
				}
			};

			const mediaQuery = window.matchMedia("(min-width: 768px)");

			const handleMediaChange = (e) => {
				if (e.matches) {
					destroySwiper();
				} else {
					if (!swiperInstance) {
						createSwiper();
					}
				}
			};

			mediaQuery.addEventListener("change", handleMediaChange);

			if (!mediaQuery.matches) {
				createSwiper();
			} else {
				section.el.classList.remove(classes.loading);
			}
		}

		function setSections(sectionId) {
			return [...document.querySelectorAll(selectors.section)]
				.filter((section) => !sectionId || section.closest(`#shopify-section-${sectionId}`))
				.map((section) => {
					const id = section.getAttribute(attributes.id);
					const requestUrl = window.themeCore.objects.routes.product_recommendations_url;
					const product = section.dataset.productId;
					const limit = section.dataset.limit;
					const viewedLimit = section.dataset.productViewedLimit;
					const layout = section.dataset.layout;

					const enableRecommendations = Boolean(section.closest(selectors.recommendations));

					return {
						el: section,
						id,
						requestUrl,
						product,
						limit,
						viewedLimit,
						enableRecommendations,
						layout
					};
				});
		}

		async function setupRecommendations(section) {
			if (!section.enableRecommendations) {
				if (!section.viewedLimit) {
					return Promise.resolve();
				}

				let recommendations = section.el.querySelector(selectors.content);
				await initRecentlyViewed(recommendations, section);

				return Promise.resolve();
			}

			try {
				const url = new URL(window.location.origin + section.requestUrl);
				url.searchParams.set(PARAMS.section, section.id);
				url.searchParams.set(PARAMS.product, section.product);
				url.searchParams.set(PARAMS.limit, section.limit);

				await fetch(url.toString())
					.then((response) => response.text())
					.then(async (response) => {
						const html = document.createElement("div");
						html.innerHTML = response;

						const currentRecommendations = section.el.querySelector(selectors.content);
						let recommendations = html.querySelector(selectors.content);
						const recommendationsItems = [...recommendations.querySelectorAll(selectors.recommendationsItems)];
						const recommendationsRowWrapper = recommendations.querySelector(selectors.recommendationsRowWrapper);

						if (section.viewedLimit) {
							recommendations = await initRecentlyViewed(recommendations, section);
						} else {
							const recommendationsExist = !!recommendations.querySelector(selectors.existingProduct);

							if (!recommendationsExist) {
								section.el.remove();
								return;
							}
						}

						if (recommendations && recommendations.innerHTML.trim().length) {
							currentRecommendations.innerHTML = recommendations.innerHTML;
						}

						recommendationsItems && recommendationsItems.length && recommendationsRowWrapper && recommendationsRowWrapper.classList.add(classes.featuredContentSlider);

						window.themeCore.EventBus.emit("compare-products:init");
					})
					.catch((e) => {
						console.error(e);
					});
			} catch (e) {
				console.error(e);
			}
		}

		async function initRecentlyViewed(recommendations, section) {
			if (!recommendations) {
				return;
			}

			let handles = localStorage.getItem("theme_recently_viewed");
			const recommendationsExist = !!recommendations.querySelector(selectors.existingProduct);

			if (!handles) {
				if (!recommendationsExist) {
					section.el.remove();
				}

				return recommendations;
			}

			try {
				handles = JSON.parse(handles);

				if (window.location.href.includes("/products/")) {
					const url = new URL(window.location.href);
					const pathname = url.pathname;
					const trimmedPathname = pathname.startsWith("/") ? pathname.substring(1) : pathname;
					const currentHandle = trimmedPathname.split("/").pop();

					handles = handles.filter((handle) => handle !== currentHandle);
				}

				handles = handles.slice(-1 * +section.viewedLimit - 1);

				if (!handles.length) {
					if (!recommendationsExist) {
						section.el.remove();
					}

					return recommendations;
				}

				const productCards = (await getProductCards(handles)).map((promise) => promise.value).filter(Boolean);
				const productCols = productCards.map((card) => getWrappedProductCard(card, section));
				const recommendationsViewedContent = recommendations.querySelector(selectors.viewedContent);

				if (recommendationsViewedContent) {
					recommendationsViewedContent.innerHTML = productCols.reduce((acc, col) => (acc += col.outerHTML), "");

					if (recommendationsExist) {
						section.el.classList.add(classes.tabs);
						initTabs(section);
						return recommendations;
					} else {
						section.el.classList.add(classes.recentlyViewedOnly);
					}

					const recommendationsRowWrapper = [...recommendations.querySelectorAll(selectors.recommendationsRowWrapper)].find((button) => +button.dataset.index === 1);

					if (recommendationsRowWrapper) {
						recommendationsRowWrapper.classList.add(classes.hidden);
					}

					const firstHeading = [...section.el.querySelectorAll(selectors.tabsButton)].find((button) => +button.dataset.index === 1);

					if (firstHeading) {
						firstHeading.remove();
					}

					const viewedContent = [...recommendations.querySelectorAll(selectors.recommendationsRowWrapper)].find((button) => +button.dataset.index === 2);

					if (viewedContent) {
						viewedContent.classList.add(classes.active);
					}

					return recommendations;
				}
			} catch (e) {
				console.log(e);
				return recommendations;
			}

			return recommendations;
		}

		async function getProductCards(handles) {
			return await Promise.allSettled(handles.map((handle) => getProductCard(handle)));
		}

		async function getProductCard(handle) {
			let url = new URL(`${window.location.origin}${window.themeCore.objects.routes.root_url}/products/${handle}`);
			url.searchParams.set(PARAMS.view, "card");

			return await fetch(url.toString())
				.then((response) => response.text())
				.then((response) => {
					const html = document.createElement("div");
					html.innerHTML = response;

					return html.querySelector(selectors.productCard);
				})
				.catch((e) => {
					console.error(e);
				});
		}

		function getWrappedProductCard(productCard, section) {
			const html = document.createElement("div");
			html.innerHTML = `
			<div class="product-recommendations__col swiper-slide product-recommendations__col--${section.layout}">
				${productCard.outerHTML}
			</div>
		`;

			return html.querySelector(".product-recommendations__col");
		}

		function initTabs(section) {
			if (!section || !section.el) {
				return;
			}

			section.el.addEventListener("click", (event) => {
				const currentButton = event.target.closest(selectors.tabsButton);

				if (!currentButton) {
					return;
				}

				const activeIndex = currentButton.dataset.index;
				const buttons = [...section.el.querySelectorAll(selectors.tabsButton)];
				const contents = [...section.el.querySelectorAll(selectors.tabsContent)];
				const buttonsWrapper = section.el.querySelector(selectors.buttonsWrapper);

				if (!activeIndex || !buttons.length || !contents.length || !buttonsWrapper) {
					return;
				}

				buttons.forEach((button) => button.classList.toggle(classes.active, button === currentButton));
				contents.forEach((content) => content.classList.toggle(classes.active, content.dataset.index === activeIndex));

				const newActiveOffset = currentButton.offsetLeft;

				buttonsWrapper.scrollTo({
					left: newActiveOffset,
					behavior: "smooth"
				});
			});
		}

		return Object.freeze({
			init
		});
	};

	const action = () => {
		window.themeCore.ProductRecommendations = window.themeCore.ProductRecommendations || ProductRecommendations();
		window.themeCore.utils.register(window.themeCore.ProductRecommendations, "product-recommendations");
	};

	if (window.themeCore && window.themeCore.loaded) {
		action();
	} else {
		document.addEventListener("theme:all:loaded", action, { once: true });
	}

})();
