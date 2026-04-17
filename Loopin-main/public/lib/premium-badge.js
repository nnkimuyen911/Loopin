(function () {
    'use strict';

    function isStrictPremium(user) {
        return !!user && user.isPremium === true;
    }

    function renderPremiumBadge(badgeEl, user) {
        if (!badgeEl) return;
        badgeEl.style.display = isStrictPremium(user) ? 'inline-flex' : 'none';
    }

    function renderUsernameWithBadge(nameEl, badgeEl, user) {
        if (nameEl) {
            nameEl.textContent = user && user.username ? String(user.username) : 'User';
        }
        renderPremiumBadge(badgeEl, user);
    }

    window.PremiumBadgeUI = {
        isStrictPremium: isStrictPremium,
        renderPremiumBadge: renderPremiumBadge,
        renderUsernameWithBadge: renderUsernameWithBadge
    };
})();
