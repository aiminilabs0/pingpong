/**
 * Tooltip functionality
 */

import { maybeEmbedYouTubeClick } from './youtube-embed.js';

function normalizeUrl(u) {
    return typeof u === 'string' ? u.trim() : '';
}

function valueForCountry(v, country) {
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object') return v[country] ?? '';
    return '';
}

function productUrlForPoint(pointData, country) {
    return normalizeUrl(valueForCountry(pointData?.productUrlByCountry ?? pointData?.productUrl, country));
}

function youtubeUrlForPoint(pointData, country) {
    return normalizeUrl(valueForCountry(pointData?.youtubeUrlByCountry ?? pointData?.youtubeUrl, country));
}

function clearEl(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
}

function makeIconLink(iconSrc, altText, url) {
    const u = normalizeUrl(url);
    if (!u) return null;
    const a = document.createElement('a');
    a.href = u;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'icon-link';
    a.setAttribute('aria-label', altText);
    const img = document.createElement('img');
    img.src = iconSrc;
    img.alt = altText;
    a.appendChild(img);
    return a;
}

class TooltipManager {
    constructor(canvasWrapEl, i18nManager, urlManager) {
        this.i18nManager = i18nManager;
        this.urlManager = urlManager;
        this.tooltipEl = this.createTooltipElement(canvasWrapEl);
        this.canvasWrapEl = canvasWrapEl;
        this.tooltipPinned = false;
        this.hideTooltipTimer = null;
        this.forcedTooltipPos = null;
        this.setupEventListeners();
    }

    createTooltipElement(parent) {
        const tooltipEl = document.createElement('div');
        tooltipEl.className = 'chart-tooltip';
        parent.appendChild(tooltipEl);
        return tooltipEl;
    }

    setupEventListeners() {
        this.tooltipEl.addEventListener('mouseenter', () => {
            this.tooltipPinned = true;
            if (this.hideTooltipTimer) {
                window.clearTimeout(this.hideTooltipTimer);
                this.hideTooltipTimer = null;
            }
        });

        this.tooltipEl.addEventListener('mouseleave', () => {
            this.tooltipPinned = false;
            if (this.hideTooltipTimer) window.clearTimeout(this.hideTooltipTimer);
            this.hideTooltipTimer = window.setTimeout(() => {
                this.tooltipEl.classList.remove('show');
                this.tooltipEl.style.display = 'none';
            }, 50);
        });
    }

    hide() {
        this.tooltipEl.style.display = 'none';
    }

    setForcedPosition(pos) {
        this.forcedTooltipPos = pos;
    }

    externalTooltipHandler(context) {
        const { chart, tooltip } = context;

        if (tooltip.opacity === 0) {
            if (this.tooltipPinned) return;

            if (this.hideTooltipTimer) window.clearTimeout(this.hideTooltipTimer);
            this.hideTooltipTimer = window.setTimeout(() => {
                if (!this.tooltipPinned) {
                    this.tooltipEl.classList.remove('show');
                    this.tooltipEl.style.display = 'none';
                }
            }, 350);
            return;
        }

        if (this.hideTooltipTimer) {
            window.clearTimeout(this.hideTooltipTimer);
            this.hideTooltipTimer = null;
        }

        const dp = tooltip?.dataPoints?.[0];
        const r = dp?.raw ?? {};
        clearEl(this.tooltipEl);

        const head = document.createElement('div');
        head.className = 'head';

        const title = document.createElement('div');
        title.className = 't';
        title.textContent = `${this.i18nManager.localizeRubberName(r.label ?? '')}`;

        const country = this.i18nManager.getCountry();
        const product = productUrlForPoint(r, country);
        const youtube = youtubeUrlForPoint(r, country);
        const aShop = makeIconLink('images/sale.png', this.i18nManager.t('iconSale'), product);
        const aYt = makeIconLink('images/youtube.ico', this.i18nManager.t('iconYouTube'), youtube);

        if (aShop || aYt) {
            const actions = document.createElement('div');
            actions.className = 'actions';

            if (aShop) {
                aShop.addEventListener('click', () => {
                    this.urlManager.setRubberParam(r?.label);
                });
                actions.appendChild(aShop);
            }

            if (aYt) {
                aYt.addEventListener('click', (e) => {
                    this.urlManager.setRubberParam(r?.label);
                    maybeEmbedYouTubeClick(e, youtube);
                });
                actions.appendChild(aYt);
            }

            head.appendChild(actions);
        }

        head.appendChild(title);
        this.tooltipEl.appendChild(head);

        const rows = [];
        if (r.type) rows.push(`${this.i18nManager.t('tooltipType')}: ${r.type}`);
        if (typeof r.arc === 'number') rows.push(`${this.i18nManager.t('tooltipArc')}: ${r.arc}`);
        if (r.thickness) rows.push(`${this.i18nManager.t('tooltipThickness')}: ${r.thickness}`);
        if (Array.isArray(r.sheetColors) && r.sheetColors.length > 0) {
            rows.push(`${this.i18nManager.t('tooltipSheetColors')}: ${r.sheetColors.join(' / ')}`);
        }
        if (r.strategy) rows.push(`${this.i18nManager.t('tooltipStrategy')}: ${r.strategy}`);
        if (typeof r.control === 'number') rows.push(`${this.i18nManager.t('tooltipControl')}: ${r.control}`);
        if (r.weight) rows.push(`${this.i18nManager.t('tooltipWeight')}: ${r.weight}`);
        if (r.hardness) rows.push(`${this.i18nManager.t('tooltipHardness')}: ${r.hardness}`);
        if (r.player) rows.push(`${this.i18nManager.t('tooltipPlayer')}: ${r.player}`);

        rows.forEach((txt) => {
            const row = document.createElement('div');
            row.className = 'row';
            row.textContent = txt;
            this.tooltipEl.appendChild(row);
        });

        const wrapRect = this.canvasWrapEl.getBoundingClientRect();
        const desired = this.forcedTooltipPos;
        this.forcedTooltipPos = null;

        const baseX = desired ? desired.x : (tooltip.caretX + 12);
        const baseY = desired ? desired.y : (tooltip.caretY + 12);

        const left = Math.min(baseX, wrapRect.width - 12);
        const top = Math.min(baseY, wrapRect.height - 12);
        this.tooltipEl.style.left = `${left}px`;
        this.tooltipEl.style.top = `${top}px`;
        this.tooltipEl.style.display = 'block';
        this.tooltipEl.classList.remove('show');
        void this.tooltipEl.offsetWidth;
        this.tooltipEl.classList.add('show');
    }
}

export { TooltipManager };

