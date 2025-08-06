(function () {
	'use strict';

	var NewsletterForm = (section) => {
		const cssClasses = window.themeCore.utils.cssClasses;
		const selectors = {
			form: ".js-newsletter-form",
			input: ".js-newsletter-input"
		};

		function init() {
			const form = section.querySelector(selectors.form);
			const input = section.querySelector(selectors.input);

			if (form && isCurrentForm(form)) {
				section.classList.add(cssClasses.current);
				input.focus();
			}
		}

		function isCurrentForm(form) {
			return window.location.hash === "#" + form.id;
		}

		return Object.freeze({
			init
		});
	};

	const selectors = {
		section: ".js-newsletter"
	};

	var Newsletter = () => {
		function init(sectionId) {
			const sections = [...document.querySelectorAll(selectors.section)].filter((section) => !sectionId || section.closest(`#shopify-section-${sectionId}`));
			sections.forEach((section) => NewsletterForm(section).init());
		}

		return Object.freeze({
			init
		});
	};

	const action = () => {
		window.themeCore.Newsletter = window.themeCore.Newsletter || Newsletter();
		window.themeCore.utils.register(window.themeCore.Newsletter, "newsletter");
	};

	if (window.themeCore && window.themeCore.loaded) {
		action();
	} else {
		document.addEventListener("theme:all:loaded", action, { once: true });
	}

})();
