(function () {
    'use strict';

    var overlayId = 'lpPremiumOverlay';
    var OVERLAY_LOADING_CLASS = 'is-loading';

    var DEFAULT_SUBSCRIPTION_STATE = {
        isPremium: false,
        isExpired: false,
        plan: 'monthly',
        startDate: null,
        expirationDate: null
    };

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatDate(dateString) {
        if (!dateString) return '—';
        var dt = new Date(dateString);
        if (Number.isNaN(dt.getTime())) return '—';
        return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function isPremium(user) {
        return !!user && user.isPremium === true;
    }

    function getPlan(user) {
        var p = user && user.plan ? String(user.plan).toLowerCase() : 'monthly';
        return p === 'yearly' ? 'yearly' : 'monthly';
    }

    function getCurrentUserSession() {
        var user = JSON.parse(localStorage.getItem('loopin_user') || '{}');
        var token = localStorage.getItem('loopin_token') || '';
        var userId = user && (user.id || user._id);
        return { user: user, token: token, userId: userId };
    }

    function normalizeSubscriptionData(data, fallbackPlan) {
        var plan = (data && data.plan) || fallbackPlan || 'monthly';
        var expirationDate = data && data.expirationDate ? data.expirationDate : null;
        var parsedExpiration = expirationDate ? new Date(expirationDate) : null;
        var isExpiredByDate = !!parsedExpiration && !Number.isNaN(parsedExpiration.getTime()) && new Date() > parsedExpiration;

        var isPremium = !!(data && data.isPremium) && !isExpiredByDate;
        var isExpired = !!(data && data.isExpired) || isExpiredByDate;

        return {
            isPremium: isPremium,
            isExpired: isExpired,
            plan: plan,
            startDate: data && data.startDate ? data.startDate : null,
            expirationDate: expirationDate
        };
    }

    function getCtaText(subscriptionState) {
        if (subscriptionState.isPremium) return 'Extend Premium Today';
        if (subscriptionState.isExpired) return 'Renew Premium Today';
        return 'Upgrade to Premium';
    }

    function getSubscriptionStoreState(user) {
        var fallbackPlan = getPlan(user);
        var raw = window.SubscriptionState && typeof window.SubscriptionState.getState === 'function'
            ? window.SubscriptionState.getState()
            : DEFAULT_SUBSCRIPTION_STATE;

        return normalizeSubscriptionData(raw, fallbackPlan);
    }

    async function loadSubscriptionFromStore() {
        if (!window.SubscriptionState || typeof window.SubscriptionState.load !== 'function') {
            return normalizeSubscriptionData(DEFAULT_SUBSCRIPTION_STATE, 'monthly');
        }

        var loaded = await window.SubscriptionState.load({ force: true });
        return normalizeSubscriptionData(loaded, loaded && loaded.plan ? loaded.plan : 'monthly');
    }

    function renderModalBody(overlay, user) {
        if (!overlay) return;
        var body = overlay.querySelector('#lpPremiumBody');
        if (!body) return;

        var subscriptionState = getSubscriptionStoreState(user);

        // Strict display logic:
        // - loading => render loading only (no upgrade flicker)
        // - premium/expired => status screen
        // - otherwise => upgrade screen
        if (window.SubscriptionState && window.SubscriptionState.getState().isLoading) {
            setLoadingState(overlay, true);
            body.innerHTML = '<div class="lp-loading">Loading subscription details...</div>';
            return;
        }

        var html = (subscriptionState.isPremium || subscriptionState.isExpired)
            ? buildPremiumDetailsHtml(user, subscriptionState)
            : buildUpgradeHtml(subscriptionState.plan || getPlan(user), subscriptionState);

        setLoadingState(overlay, false);
        body.innerHTML = html;
    }

    function buildUpgradeHtml(plan, subscriptionState) {
        var price = plan === 'yearly' ? '$1.99/year' : '$1.99/month';
        var ctaText = getCtaText(subscriptionState);

        var statusToneClass = subscriptionState && subscriptionState.isExpired
            ? 'lp-pill-warning'
            : 'lp-pill-neutral';
        var statusText = subscriptionState && subscriptionState.isExpired
            ? 'Subscription status: Expired'
            : 'Subscription status: Not active';

        var expiredWarning = subscriptionState && subscriptionState.isExpired
            ? '<p class="lp-warning-text">Your premium has expired</p>'
            : '';

        return '' +
            '<h2 class="lp-premium-title">Upgrade to Premium</h2>' +
            '<p class="lp-premium-subtitle">Unlock smarter habit building with Loopin</p>' +
            '<div class="lp-pill">Pricing: ' + escapeHtml(price) + '</div>' +
            '<div class="lp-pill ' + statusToneClass + '">' + statusText + '</div>' +
            expiredWarning +
            '<div class="lp-feature-box">' +
                '<h4>Premium users can additionally:</h4>' +
                '<ul>' +
                    '<li>Input learning roadmaps</li>' +
                    '<li>Automatically generate reminder schedules</li>' +
                    '<li>Receive smarter habit analysis</li>' +
                '</ul>' +
            '</div>' +
            '<div class="lp-row">' +
                '<button type="button" class="lp-cta" data-lp-action="upgrade">' + escapeHtml(ctaText) + '</button>' +
                '<button type="button" class="lp-link-btn" data-lp-action="later">Maybe later</button>' +
            '</div>';
    }

    function buildPremiumDetailsHtml(user, subscriptionState) {
        var plan = subscriptionState.plan || getPlan(user);
        var isExpired = !!subscriptionState.isExpired;
        var statusText = isExpired ? 'Subscription status: Expired' : 'Subscription status: Active';
        var statusClass = isExpired ? 'lp-pill-warning' : 'lp-pill-success';
        var ctaText = getCtaText(subscriptionState);
        var expiredWarning = isExpired ? '<p class="lp-warning-text">Your premium has expired</p>' : '';

        return '' +
            '<h2 class="lp-premium-title">Current plan: Premium</h2>' +
            '<p class="lp-premium-subtitle">Your premium billing details</p>' +
            '<div class="lp-pill ' + statusClass + '">' + statusText + '</div>' +
            expiredWarning +
            '<div class="lp-premium-grid">' +
                '<div class="lp-premium-card"><strong>Plan</strong><span>' + escapeHtml(plan) + '</span></div>' +
                '<div class="lp-premium-card"><strong>Start date</strong><span>' + escapeHtml(formatDate(subscriptionState.startDate)) + '</span></div>' +
                '<div class="lp-premium-card"><strong>Expiration date</strong><span>' + escapeHtml(formatDate(subscriptionState.expirationDate)) + '</span></div>' +
                '<div class="lp-premium-card"><strong>Features unlocked</strong><span>Roadmaps, Smart reminders, Analytics</span></div>' +
            '</div>' +
            '<div class="lp-row">' +
                '<button type="button" class="lp-cta" data-lp-action="upgrade">' + escapeHtml(ctaText) + '</button>' +
                '<button type="button" class="lp-link-btn" data-lp-action="cancel">Cancel Plan</button>' +
            '</div>';
    }

    function setLoadingState(overlay, isLoading) {
        if (!overlay) return;
        overlay.classList.toggle(OVERLAY_LOADING_CLASS, !!isLoading);
    }

    function ensureOverlay() {
        var existing = document.getElementById(overlayId);
        if (existing) return existing;

        var overlay = document.createElement('div');
        overlay.id = overlayId;
        overlay.className = 'lp-premium-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = '' +
            '<div class="lp-premium-modal" role="dialog" aria-modal="true" aria-labelledby="lpPremiumTitle">' +
                '<div class="lp-premium-inner">' +
                    '<button type="button" class="lp-premium-close" data-lp-action="close" aria-label="Close">✕</button>' +
                    '<div id="lpPremiumBody"></div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                close();
            }
            var actionEl = e.target && e.target.closest('[data-lp-action]');
            if (!actionEl) return;
            var action = actionEl.getAttribute('data-lp-action');
            if (action === 'close' || action === 'later') {
                close();
                return;
            }
            if (window.__lpHandlers && typeof window.__lpHandlers[action] === 'function') {
                window.__lpHandlers[action]();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && overlay.classList.contains('open')) {
                close();
            }
        });

        return overlay;
    }

    function open(user, handlers) {
        var overlay = ensureOverlay();
        window.__lpHandlers = handlers || {};

        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // Prevent flicker: render loading while fetching then render exactly one state.
        setLoadingState(overlay, true);
        var body = overlay.querySelector('#lpPremiumBody');
        if (body) {
            body.innerHTML = '<div class="lp-loading">Loading subscription details...</div>';
        }

        Promise.resolve().then(async function () {
            await loadSubscriptionFromStore();
            renderModalBody(overlay, user);
        });
    }

    function close() {
        var overlay = document.getElementById(overlayId);
        if (!overlay) return;
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    window.LoopinPremiumModal = {
        open: open,
        close: close,
        isPremium: isPremium,
        getPlan: getPlan,
        formatDate: formatDate
    };
})();
