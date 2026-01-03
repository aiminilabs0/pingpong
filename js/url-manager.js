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
        this.setParams({ rubber: s });
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

