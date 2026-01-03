/**
 * YouTube embed functionality
 */

function isYouTubeUrl(u) {
    try {
        const url = new URL(u);
        const h = url.hostname.replace(/^www\./, '');
        return h === 'youtube.com' || h === 'm.youtube.com' || h === 'youtu.be' || h.endsWith('.youtube.com');
    } catch {
        return false;
    }
}

function parseStartSeconds(u) {
    try {
        const url = new URL(u);
        const t = url.searchParams.get('t') || url.searchParams.get('start');
        if (!t) return 0;
        if (/^\d+$/.test(t)) return parseInt(t, 10);
        let s = 0;
        const m = String(t).match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
        if (!m) return 0;
        if (m[1]) s += parseInt(m[1], 10) * 3600;
        if (m[2]) s += parseInt(m[2], 10) * 60;
        if (m[3]) s += parseInt(m[3], 10);
        return Number.isFinite(s) ? s : 0;
    } catch {
        return 0;
    }
}

function toYouTubeEmbedUrl(u) {
    try {
        const url = new URL(u);
        const host = url.hostname.replace(/^www\./, '');
        let id = '';
        if (host === 'youtu.be') {
            id = url.pathname.split('/').filter(Boolean)[0] || '';
        } else {
            id = url.searchParams.get('v') || '';
            if (!id) {
                const parts = url.pathname.split('/').filter(Boolean);
                if (parts[0] === 'shorts' && parts[1]) id = parts[1];
                if (parts[0] === 'embed' && parts[1]) id = parts[1];
            }
        }
        if (!id) return null;
        const start = parseStartSeconds(u);
        const embed = new URL(`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`);
        embed.searchParams.set('autoplay', '1');
        embed.searchParams.set('rel', '0');
        embed.searchParams.set('modestbranding', '1');
        embed.searchParams.set('playsinline', '1');
        if (start > 0) embed.searchParams.set('start', String(start));
        if (typeof location !== 'undefined' && location.origin && location.origin !== 'null') {
            embed.searchParams.set('origin', location.origin);
        }
        return embed.toString();
    } catch {
        return null;
    }
}

function ensureYouTubeOverlay() {
    let overlay = document.getElementById('ytOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'ytOverlay';
    overlay.className = 'yt-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'YouTube player');

    const modal = document.createElement('div');
    modal.className = 'yt-modal';

    const head = document.createElement('div');
    head.className = 'yt-modal-head';

    const title = document.createElement('div');
    title.className = 'yt-modal-title';
    title.textContent = '';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'yt-close';
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';

    const openLink = document.createElement('a');
    openLink.className = 'yt-open';
    openLink.textContent = 'Open on YouTube';
    openLink.target = '_blank';
    openLink.rel = 'noopener noreferrer';
    openLink.href = '#';

    const frameWrap = document.createElement('div');
    frameWrap.className = 'yt-frame';
    const iframe = document.createElement('iframe');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('title', 'YouTube video player');
    frameWrap.appendChild(iframe);

    head.appendChild(title);
    head.appendChild(openLink);
    head.appendChild(closeBtn);
    modal.appendChild(head);
    modal.appendChild(frameWrap);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function closeOverlay() {
        overlay.classList.remove('open');
        iframe.src = '';
    }

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeOverlay();
    });
    closeBtn.addEventListener('click', closeOverlay);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) closeOverlay();
    });

    overlay._yt = { iframe, title, closeOverlay, openLink };
    return overlay;
}

function openYouTubeEmbed(originalUrl) {
    const embedUrl = toYouTubeEmbedUrl(originalUrl);
    if (!embedUrl) return false;
    const overlay = ensureYouTubeOverlay();
    overlay._yt.title.textContent = '';
    overlay._yt.openLink.href = originalUrl;
    overlay._yt.iframe.src = embedUrl;
    overlay.classList.add('open');
    return true;
}

function maybeEmbedYouTubeClick(e, url) {
    if (!isYouTubeUrl(url)) return false;
    if (e.button !== 0) return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    e.preventDefault();
    e.stopPropagation();
    return openYouTubeEmbed(url);
}

export { isYouTubeUrl, maybeEmbedYouTubeClick };

