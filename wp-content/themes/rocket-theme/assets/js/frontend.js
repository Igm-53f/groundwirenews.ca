/* rocket-theme — frontend.js
 * Central place for all block frontend JS (ES6).
 * Namespace injected by PHP via wp_localize_script as window.RocketTheme.ns
 */
(() => {
    'use strict';

    const ns = (window.RocketTheme && window.RocketTheme.ns) ? window.RocketTheme.ns : 'base';

    /* --------------------------------------------------------
       NEWS CAROUSEL
       Desktop: prev/next buttons scroll one slide width.
       Mobile:  native swipe via CSS scroll-snap (no JS needed).
       Buttons disable at the scroll extremes.
    -------------------------------------------------------- */
    document.querySelectorAll(`.${ns}-news-carousel`).forEach((carousel) => {
        const track = carousel.querySelector(`.${ns}-news-carousel__track`);
        const prev  = carousel.querySelector(`.${ns}-news-carousel__nav--prev`);
        const next  = carousel.querySelector(`.${ns}-news-carousel__nav--next`);
        if (!track || !prev || !next) return;

        const slideWidth = () => track.clientWidth;

        prev.addEventListener('click', () => track.scrollBy({ left: -slideWidth(), behavior: 'smooth' }));
        next.addEventListener('click', () => track.scrollBy({ left:  slideWidth(), behavior: 'smooth' }));

        const updateButtons = () => {
            prev.disabled = track.scrollLeft <= 4;
            next.disabled = track.scrollLeft >= (track.scrollWidth - track.clientWidth - 4);
        };

        track.addEventListener('scroll', updateButtons, { passive: true });
        window.addEventListener('resize', updateButtons);
        updateButtons();
    });

    /* --------------------------------------------------------
       SCROLL TO TOP
       Always-present button (rendered in the footer by PHP).
       Appears after scrolling down; smooth-scrolls to the top.
    -------------------------------------------------------- */
    const scrollTopBtn = document.querySelector(`.${ns}-scroll-top`);
    if (scrollTopBtn) {
        const toggleScrollTop = () => {
            scrollTopBtn.classList.toggle('is-visible', window.scrollY > 400);
        };
        toggleScrollTop();
        window.addEventListener('scroll', toggleScrollTop, { passive: true });
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /* --------------------------------------------------------
       HEADER SEARCH TOGGLE
       Icon button reveals/hides the header search panel and
       focuses the input when opened.
    -------------------------------------------------------- */
    const searchToggle = document.querySelector(`.${ns}-search-toggle`);
    const searchPanel  = document.getElementById(`${ns}-header-search`);
    if (searchToggle && searchPanel) {
        searchToggle.addEventListener('click', () => {
            const willOpen = searchPanel.hasAttribute('hidden');
            searchPanel.toggleAttribute('hidden', !willOpen);
            searchToggle.setAttribute('aria-expanded', String(willOpen));
            if (willOpen) {
                const input = searchPanel.querySelector('input[type="search"]');
                if (input) input.focus();
            }
        });
    }

    /* --------------------------------------------------------
       MOBILE NAV (BURGER)
       Burger button opens the primary menu as a full-screen
       overlay; closes on toggle, Escape, or clicking a link.
    -------------------------------------------------------- */
    const navToggle = document.querySelector(`.${ns}-nav-toggle`);
    const navMenu   = document.getElementById(`${ns}-primary-menu`);
    if (navToggle && navMenu) {
        // The toggle (X) plus the menu's links form the focus loop.
        const focusables = () => [
            navToggle,
            ...navMenu.querySelectorAll('a[href], button:not([disabled])'),
        ];
        let lastFocused = null;

        const isOpen = () => navToggle.getAttribute('aria-expanded') === 'true';

        const setNavOpen = (open) => {
            navToggle.setAttribute('aria-expanded', String(open));
            navMenu.classList.toggle('is-open', open);
            document.body.classList.toggle(`${ns}-nav-open`, open);
            if (open) {
                lastFocused = document.activeElement;
                const first = navMenu.querySelector('a[href], button');
                if (first) first.focus();
            } else if (lastFocused && typeof lastFocused.focus === 'function') {
                lastFocused.focus();
            }
        };

        navToggle.addEventListener('click', () => setNavOpen(!isOpen()));
        navMenu.addEventListener('click', (e) => {
            if (e.target.closest('a')) setNavOpen(false);
        });

        document.addEventListener('keydown', (e) => {
            if (!isOpen()) return;
            if (e.key === 'Escape') {
                setNavOpen(false);
                navToggle.focus();
                return;
            }
            if (e.key === 'Tab') {
                // Trap focus inside the open overlay.
                const f = focusables();
                if (f.length === 0) return;
                const first = f[0];
                const last  = f[f.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });

        // If the viewport grows back to desktop while open, reset state.
        window.addEventListener('resize', () => {
            if (isOpen() && window.innerWidth > 1024) setNavOpen(false);
        });
    }

    /* --------------------------------------------------------
       Add future block JS below this line.
       Pattern:
         document.querySelectorAll(`.${ns}-your-block`).forEach(...)
    -------------------------------------------------------- */

})();
