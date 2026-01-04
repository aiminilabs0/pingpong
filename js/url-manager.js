/**
 * URL parameter management module
 * Handles reading and writing URL parameters
 */

class UrlManager {
    getParams() {
        try {
            return new URLSearchParams(window.location.search || '');
        } catch {
            return new URLSearchParams();
        }
    }

    setParams(next) {
        try {
            const url = new URL(window.location.href);
            if (next && typeof next === 'object') {
                if (next.country) url.searchParams.set('country', String(next.country));
                if (next.company) url.searchParams.set('company', String(next.company));
                if (next.rubber) url.searchParams.set('rubber', String(next.rubber));
                if (next.rubber1) url.searchParams.set('rubber1', String(next.rubber1));
                if (next.rubber2) url.searchParams.set('rubber2', String(next.rubber2));
                if (next.youtube) url.searchParams.set('youtube', String(next.youtube));
            }
            window.history.replaceState({}, '', url.toString());
        } catch {
            // ignore
        }
    }

    setRubberParam(label) {
        const s = (typeof label === 'string' ? label : '').trim();
        if (!s) return;
        // Back-compat: `rubber` remains supported, but we also set `rubber1`.
        this.setParams({ rubber: s, rubber1: s });
        // If the rubber changes, the previously selected YouTube link (if any) should be cleared.
        this.deleteParam('youtube');
    }

    setRubber1Param(label) {
        const s = (typeof label === 'string' ? label : '').trim();
        if (!s) return;
        this.setParams({ rubber1: s, rubber: s });
        // Treat Rubber 1 as the primary selection for YouTube deep links.
        this.deleteParam('youtube');
    }

    setRubber2Param(label) {
        const s = (typeof label === 'string' ? label : '').trim();
        if (!s) return;
        this.setParams({ rubber2: s });
    }

    setYouTubeParam(youtubeUrl) {
        const s = (typeof youtubeUrl === 'string' ? youtubeUrl : '').trim();
        if (!s) return;
        this.setParams({ youtube: s });
    }

    deleteParam(key) {
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete(String(key));
            window.history.replaceState({}, '', url.toString());
        } catch {
            // ignore
        }
    }

    normalizeBrandParam(raw) {
        const s = (typeof raw === 'string' ? raw : '').trim().toLowerCase();
        if (!s) return null;
        if (s === 'butterfly') return 'Butterfly';
        if (s === 'tibhar') return 'Tibhar';
        if (s === 'xiom') return 'XIOM';
        return null;
    }

    normalizeRubberParam(raw) {
        if (typeof raw !== 'string') return '';
        return raw.trim();
    }
}

export { UrlManager };

