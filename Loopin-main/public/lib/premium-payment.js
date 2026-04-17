(function () {
    'use strict';

    var PRICE_LABEL = '$1.99/month';

    var PAYMENT_METHODS = [
        {
            id: 'mastercard',
            label: 'Mastercard',
            subtitle: 'Credit or debit card'
        },
        {
            id: 'apple-pay',
            label: 'Apple Pay',
            subtitle: 'Fast biometric checkout'
        }
    ];

    var state = {
        selectedMethodId: null,
        returnTo: '/home?openPremium=1',
        isSubmitting: false,
        currentUser: null,
        token: ''
    };

    function getEl(id) {
        return document.getElementById(id);
    }

    function parseReturnUrl() {
        var params = new URLSearchParams(window.location.search);
        var fromQuery = params.get('returnTo');
        if (fromQuery && /^\/(?!\/)/.test(fromQuery)) {
            return fromQuery;
        }
        return state.returnTo;
    }

    function renderMethods() {
        var root = getEl('paymentMethods');
        if (!root) return;

        root.innerHTML = PAYMENT_METHODS.map(function (method) {
            var selected = method.id === state.selectedMethodId;
            return '' +
                '<button type="button" class="pp-method-card' + (selected ? ' is-selected' : '') + '" data-method-id="' + method.id + '">' +
                    '<div class="pp-method-line">' +
                        '<p class="pp-method-name">' + method.label + '</p>' +
                        '<span class="pp-method-check" aria-hidden="true">✓</span>' +
                    '</div>' +
                    '<p class="pp-method-meta">' + method.subtitle + '</p>' +
                '</button>';
        }).join('');
    }

    function getSelectedMethod() {
        for (var i = 0; i < PAYMENT_METHODS.length; i += 1) {
            if (PAYMENT_METHODS[i].id === state.selectedMethodId) return PAYMENT_METHODS[i];
        }
        return null;
    }

    function updateConfirmSection() {
        var confirmBox = getEl('confirmSection');
        var confirmMethod = getEl('confirmMethod');
        var confirmBtn = getEl('confirmBtn');
        var method = getSelectedMethod();

        if (!confirmBox || !confirmMethod || !confirmBtn) return;

        if (!method) {
            confirmBox.classList.remove('is-visible');
            confirmMethod.textContent = 'Select a payment method to continue.';
            confirmBtn.disabled = true;
            return;
        }

        confirmBox.classList.add('is-visible');
        confirmMethod.textContent = 'Selected method: ' + method.label;
        confirmBtn.disabled = state.isSubmitting;
    }

    function setStatus(message, type) {
        var status = getEl('paymentStatus');
        if (!status) return;
        status.textContent = message || '';
        status.className = 'pp-status';
        if (type === 'success') status.classList.add('success');
        if (type === 'error') status.classList.add('error');
    }

    function handleMethodClick(event) {
        if (state.isSubmitting) return;
        var card = event.target && event.target.closest('[data-method-id]');
        if (!card) return;

        state.selectedMethodId = card.getAttribute('data-method-id');
        renderMethods();
        updateConfirmSection();
        setStatus('');
    }

    function navigateWithTransition(url) {
        var shell = getEl('paymentShell');
        if (!shell) {
            window.location.href = url;
            return;
        }

        shell.classList.add('pp-page-leaving');
        window.setTimeout(function () {
            window.location.href = url;
        }, 220);
    }

    function handleBack() {
        if (state.isSubmitting) return;
        navigateWithTransition(state.returnTo);
    }

    function getCurrentUserSnapshot() {
        var raw = JSON.parse(localStorage.getItem('loopin_user') || '{}');
        var userId = raw.id || raw._id;
        return { raw: raw, userId: userId };
    }

    function setConfirmLoading(isLoading) {
        state.isSubmitting = !!isLoading;

        var confirmBtn = getEl('confirmBtn');
        var confirmBtnLabel = getEl('confirmBtnLabel');
        var backBtn = getEl('backBtn');

        if (confirmBtn) {
            confirmBtn.disabled = isLoading || !state.selectedMethodId;
            confirmBtn.classList.toggle('is-loading', isLoading);
        }

        if (confirmBtnLabel) {
            confirmBtnLabel.textContent = isLoading ? 'Processing...' : 'Confirm Subscription';
        }

        if (backBtn) {
            backBtn.disabled = isLoading;
        }
    }

    function persistPremiumState(responsePayload, fallbackUser) {
        var latest = fallbackUser || JSON.parse(localStorage.getItem('loopin_user') || '{}');
        var responseUser = responsePayload && responsePayload.data && responsePayload.data.user
            ? responsePayload.data.user
            : null;

        var merged = Object.assign({}, latest, responseUser || {}, {
            isPremium: true
        });

        localStorage.setItem('loopin_user', JSON.stringify(merged));
        state.currentUser = merged;

        if (window.SubscriptionState && typeof window.SubscriptionState.setPremiumNow === 'function') {
            window.SubscriptionState.setPremiumNow();
        }
    }

    function showSuccessScreen() {
        var shell = getEl('paymentShell');
        var success = getEl('successSection');
        if (!shell || !success) return;

        shell.classList.add('is-success');
        success.classList.add('is-visible');
        success.setAttribute('aria-hidden', 'false');
    }

    async function handleConfirm() {
        if (state.isSubmitting) return;

        var method = getSelectedMethod();
        if (!method) {
            setStatus('Please select a payment method first.');
            return;
        }

        var userSnapshot = getCurrentUserSnapshot();
        if (!userSnapshot.userId || !state.token) {
            setStatus('Session expired. Please log in again.');
            window.setTimeout(function () {
                window.location.replace('/login');
            }, 900);
            return;
        }

        try {
            setStatus('');
            setConfirmLoading(true);

            var result = await window.PremiumService.upgradeToPremium({
                userId: userSnapshot.userId,
                paymentMethod: method.id,
                token: state.token
            });

            persistPremiumState(result, userSnapshot.raw);
            showSuccessScreen();

            window.setTimeout(function () {
                navigateWithTransition(state.returnTo);
            }, 1800);
        } catch (error) {
            console.error('Premium upgrade failed:', error);
            setStatus(error && error.message ? error.message : 'Could not complete your upgrade right now.', 'error');
            setConfirmLoading(false);
        }
    }

    function bindEvents() {
        var methods = getEl('paymentMethods');
        var backBtn = getEl('backBtn');
        var confirmBtn = getEl('confirmBtn');

        if (methods) {
            methods.addEventListener('click', handleMethodClick);
        }

        if (backBtn) {
            backBtn.addEventListener('click', handleBack);
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', handleConfirm);
        }
    }

    function guardAuth() {
        state.token = localStorage.getItem('loopin_token') || '';
        if (!state.token) {
            window.location.replace('/login');
            return false;
        }

        state.currentUser = JSON.parse(localStorage.getItem('loopin_user') || '{}');
        return true;
    }

    function init() {
        if (!guardAuth()) return;

        if (!window.PremiumService || typeof window.PremiumService.upgradeToPremium !== 'function') {
            setStatus('Payment service failed to load. Please refresh the page.');
            return;
        }

        state.returnTo = parseReturnUrl();
        renderMethods();
        updateConfirmSection();
        setConfirmLoading(false);
        bindEvents();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
