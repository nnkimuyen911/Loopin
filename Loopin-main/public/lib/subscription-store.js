(function () {
    'use strict';

    var INITIAL_STATE = {
        isPremium: false,
        isExpired: false,
        plan: 'monthly',
        startDate: null,
        expirationDate: null,
        isLoading: false
    };

    var state = Object.assign({}, INITIAL_STATE);
    var listeners = [];
    var hasLoadedOnce = false;

    function cloneState() {
        return Object.assign({}, state);
    }

    function notify() {
        var snapshot = cloneState();
        // Temporary debug safety (requested)
        console.log('Subscription state:', snapshot);
        listeners.forEach(function (listener) {
            try {
                listener(snapshot);
            } catch (error) {
                console.warn('Subscription listener error:', error);
            }
        });
    }

    function setState(nextPartial) {
        state = Object.assign({}, state, nextPartial || {});
        notify();
    }

    function subscribe(listener) {
        if (typeof listener !== 'function') {
            return function noop() {};
        }
        listeners.push(listener);
        return function unsubscribe() {
            listeners = listeners.filter(function (item) { return item !== listener; });
        };
    }

    function resolveSession() {
        var rawUser = JSON.parse(localStorage.getItem('loopin_user') || '{}');
        var userId = rawUser && (rawUser.id || rawUser._id);
        var token = localStorage.getItem('loopin_token') || '';
        return { rawUser: rawUser, userId: userId, token: token };
    }

    function normalizeSubscription(data) {
        var normalized = data || {};
        var expirationDate = normalized.expirationDate || null;
        var parsedExpiration = expirationDate ? new Date(expirationDate) : null;
        var isExpiredByDate = !!parsedExpiration && !Number.isNaN(parsedExpiration.getTime()) && new Date() > parsedExpiration;

        var isPremium = !!normalized.isPremium && !isExpiredByDate;
        var isExpired = !!normalized.isExpired || isExpiredByDate;

        return {
            isPremium: isPremium,
            isExpired: isExpired,
            plan: normalized.plan || 'monthly',
            startDate: normalized.startDate || null,
            expirationDate: expirationDate,
            isLoading: false
        };
    }

    async function load(options) {
        options = options || {};

        if (state.isLoading) return cloneState();
        if (!options.force && hasLoadedOnce) return cloneState();

        var session = resolveSession();
        if (!session.userId || !session.token) {
            setState(Object.assign({}, INITIAL_STATE, { isLoading: false }));
            hasLoadedOnce = true;
            return cloneState();
        }

        setState({ isLoading: true });

        try {
            if (!window.PremiumService || typeof window.PremiumService.getSubscription !== 'function') {
                throw new Error('PremiumService.getSubscription is not available.');
            }

            var result = await window.PremiumService.getSubscription({
                userId: session.userId,
                token: session.token
            });
            var payload = result && result.data ? result.data : {};
            var normalized = normalizeSubscription(payload);

            setState(normalized);
            hasLoadedOnce = true;
            return cloneState();
        } catch (error) {
            console.warn('Failed to load subscription state:', error);
            setState(Object.assign({}, INITIAL_STATE, { isLoading: false }));
            hasLoadedOnce = true;
            return cloneState();
        }
    }

    function setPremiumNow() {
        var now = new Date();
        var expiration = new Date(now);
        expiration.setMonth(expiration.getMonth() + 1);

        setState({
            isPremium: true,
            isExpired: false,
            plan: 'monthly',
            startDate: now.toISOString(),
            expirationDate: expiration.toISOString(),
            isLoading: false
        });
    }

    function reset() {
        hasLoadedOnce = false;
        setState(Object.assign({}, INITIAL_STATE));
    }

    window.SubscriptionState = {
        getState: cloneState,
        setState: setState,
        subscribe: subscribe,
        load: load,
        setPremiumNow: setPremiumNow,
        reset: reset,
        resolveSession: resolveSession
    };

    // App-start hydration from backend (single source of truth)
    load({ force: true });
})();
