(function () {
    'use strict';

    async function parseJsonSafe(response) {
        try {
            return await response.json();
        } catch (_err) {
            return null;
        }
    }

    async function upgradeToPremium(payload) {
        var userId = payload && payload.userId ? String(payload.userId).trim() : '';
        var paymentMethod = payload && payload.paymentMethod ? String(payload.paymentMethod).trim() : '';
        var token = payload && payload.token ? String(payload.token).trim() : '';

        if (!userId || !paymentMethod || !token) {
            throw new Error('Missing userId, paymentMethod, or auth token.');
        }

        var response = await fetch('/api/upgrade-to-premium', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                userId: userId,
                paymentMethod: paymentMethod
            })
        });

        var result = await parseJsonSafe(response);

        if (!response.ok || !result || result.success !== true) {
            var message = (result && result.message) || 'Could not complete the premium upgrade.';
            var err = new Error(message);
            err.status = response.status;
            err.payload = result;
            throw err;
        }

        return result;
    }

    async function getSubscription(payload) {
        var userId = payload && payload.userId ? String(payload.userId).trim() : '';
        var token = payload && payload.token ? String(payload.token).trim() : '';

        if (!userId || !token) {
            throw new Error('Missing userId or auth token.');
        }

        var response = await fetch('/api/subscription/' + encodeURIComponent(userId), {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        var result = await parseJsonSafe(response);

        if (!response.ok || !result || result.success !== true) {
            var message = (result && result.message) || 'Could not load subscription details.';
            var err = new Error(message);
            err.status = response.status;
            err.payload = result;
            throw err;
        }

        if (!result.data) {
            result.data = {
                isPremium: result.isPremium,
                isExpired: result.isExpired,
                plan: result.plan,
                startDate: result.startDate,
                expirationDate: result.expirationDate
            };
        }

        return result;
    }

    window.PremiumService = {
        upgradeToPremium: upgradeToPremium,
        getSubscription: getSubscription
    };
})();
