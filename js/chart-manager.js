/**
 * Chart management and rendering
 */

import { BUTTERFLY, TIBHAR, XIOM, BRAND_AXIS_RANGES } from './constants.js';
import { colorForRubberPoint, mapPointStyle } from './color-utils.js';
import { renderMarkdown } from './markdown.js';
import { maybeEmbedYouTubeClick } from './youtube-embed.js';
import { makeIconLink, productUrlForPoint, shopIconMetaForUrl, youtubeUrlForPoint } from './tooltip.js';

// Global scale for anything drawn inside the Chart.js canvas (fonts, point radius, etc).
// Increased by +20% twice total (1.2 * 1.2 = 1.44) per UI sizing request.
const CHART_SCALE_20 = 1.44;
const CHART_POINT_RADIUS = 7 * CHART_SCALE_20;
const CHART_POINT_HOVER_RADIUS = 9 * CHART_SCALE_20;
const CHART_TICK_FONT_SIZE = 12 * CHART_SCALE_20;
const CHART_AXIS_TITLE_FONT_SIZE = 12 * CHART_SCALE_20;
const CHART_TICK_PADDING = 8 * CHART_SCALE_20;
const CHART_DATALABEL_OFFSET = 8 * CHART_SCALE_20;
const CHART_DATALABEL_FONT_SIZE = 11 * CHART_SCALE_20;
const CHART_DATALABEL_FONT_SIZE_SELECTED = 12 * CHART_SCALE_20;
const CHART_SELECTED_TEXT_STROKE_WIDTH = 3 * CHART_SCALE_20;
const CHART_BEST_SELLER_BADGE_FONT_SIZE = 9.5 * CHART_SCALE_20;
const CHART_LABEL_MEASURE_FONT_SIZE = 12 * CHART_SCALE_20;

class ChartManager {
    constructor(canvasId, i18nManager, urlManager, tooltipManager) {
        this.canvasId = canvasId;
        this.i18nManager = i18nManager;
        this.urlManager = urlManager;
        this.tooltipManager = tooltipManager;
        this.currentBrand = BUTTERFLY;
        // Set A uses the existing selection semantics.
        this.selectedRubber = null;
        // Set B is selected via Shift+Click.
        this.selectedRubberB = null;
        this.chart = null;
        this._rubberDetailsReqIdA = 0;
        this._rubberDetailsReqIdB = 0;
        this._rubberCompareReqId = 0;
        this._rubberDetailsEls = null;
    }

    getRubberDetailsEls() {
        if (this._rubberDetailsEls) return this._rubberDetailsEls;
        const container = document.getElementById('rubberCompare');

        const setA = document.getElementById('rubberSetA');
        const titleA = document.getElementById('rubberNameA');
        const actionsA = document.getElementById('rubberActionsA');
        const bodyA = document.getElementById('rubberDetailsBodyA');

        const setB = document.getElementById('rubberSetB');
        const titleB = document.getElementById('rubberNameB');
        const actionsB = document.getElementById('rubberActionsB');
        const bodyB = document.getElementById('rubberDetailsBodyB');

        const compare = document.getElementById('rubberComparison');
        const compareTitle = document.getElementById('rubberComparisonTitle');
        const compareBody = document.getElementById('rubberComparisonBody');

        if (!container || !setA || !titleA || !actionsA || !bodyA || !setB || !titleB || !actionsB || !bodyB || !compare || !compareTitle || !compareBody) {
            return null;
        }

        this._rubberDetailsEls = {
            container,
            setA, titleA, actionsA, bodyA,
            setB, titleB, actionsB, bodyB,
            compare, compareTitle, compareBody
        };
        return this._rubberDetailsEls;
    }

    clearRubberDetails() {
        const els = this.getRubberDetailsEls();
        if (!els) return;
        // Always show the compare panel (even before any click) with placeholders.
        els.container.hidden = false;

        this._renderSlotTitle(els.titleA, 'A', this.i18nManager.t('slotA'));
        try { while (els.actionsA.firstChild) els.actionsA.removeChild(els.actionsA.firstChild); } catch { /* ignore */ }
        els.actionsA.hidden = true;
        els.bodyA.innerHTML = `<p class="rubber-placeholder">${this.i18nManager.t('noSelectedRubber')}</p>`;

        els.setB.hidden = false;
        this._renderSlotTitle(els.titleB, 'B', this.i18nManager.t('slotB'));
        try { while (els.actionsB.firstChild) els.actionsB.removeChild(els.actionsB.firstChild); } catch { /* ignore */ }
        els.actionsB.hidden = true;
        els.bodyB.innerHTML = `<p class="rubber-placeholder">${this.i18nManager.t('noSelectedRubber')}</p>`;

        els.compare.hidden = false;
        try {
            while (els.compareTitle.firstChild) els.compareTitle.removeChild(els.compareTitle.firstChild);
            const aSpan = this._buildCompareSlotNode('A');
            const vsSpan = document.createElement('span');
            vsSpan.className = 'rubber-compare__vs';
            vsSpan.textContent = 'vs';
            const bSpan = this._buildCompareSlotNode('B');
            els.compareTitle.appendChild(aSpan);
            els.compareTitle.appendChild(vsSpan);
            els.compareTitle.appendChild(bSpan);
        } catch {
            els.compareTitle.textContent = `${this.i18nManager.t('slotA')} vs ${this.i18nManager.t('slotB')}`;
        }
        els.compareBody.innerHTML = `<p class="rubber-placeholder">${this.i18nManager.t('noComparisonYet')}</p>`;
    }

    clearRubberSelection(opts) {
        const options = opts && typeof opts === 'object' ? opts : {};
        const clearDetails = options.clearDetails !== false;

        this.selectedRubber = null;
        this.selectedRubberB = null;
        this._rubberDetailsReqIdA++; // invalidate any in-flight details load
        this._rubberDetailsReqIdB++;
        this._rubberCompareReqId++;

        try {
            this.tooltipManager?.setForcedPosition?.(null);
        } catch {
            // ignore
        }

        try {
            this.chart?.setActiveElements?.([]);
            this.chart?.tooltip?.setActiveElements?.([], { x: 0, y: 0 });
        } catch {
            // ignore
        }

        if (clearDetails) this.clearRubberDetails();

        try {
            // Avoid click "blink" by skipping chart animations for selection updates.
            this.chart?.update?.('none');
        } catch {
            // ignore
        }
    }

    /**
     * Clears only chart highlight/tooltip state (active elements + forced tooltip position),
     * while keeping the selected rubbers and details panel intact.
     * Useful when switching brand tabs but wanting to keep descriptions visible.
     */
    clearChartFocus() {
        try {
            this.tooltipManager?.setForcedPosition?.(null);
        } catch {
            // ignore
        }

        try {
            this.chart?.setActiveElements?.([]);
            this.chart?.tooltip?.setActiveElements?.([], { x: 0, y: 0 });
        } catch {
            // ignore
        }

        try {
            // Avoid click "blink" by skipping chart animations for focus changes.
            this.chart?.update?.('none');
        } catch {
            // ignore
        }
    }

    _clearEl(el) {
        try {
            while (el && el.firstChild) el.removeChild(el.firstChild);
        } catch {
            // ignore
        }
    }

    _makeSlotBadge(slot) {
        const targetSlot = slot === 'B' ? 'B' : 'A';
        const badge = document.createElement('span');
        badge.className = `rubber-slot-badge rubber-slot-badge--${targetSlot === 'B' ? 'b' : 'a'}`;
        badge.textContent = targetSlot === 'B' ? '2' : '1';
        badge.title = this.i18nManager.t(targetSlot === 'B' ? 'slotB' : 'slotA');
        badge.setAttribute('aria-hidden', 'true');
        return badge;
    }

    _renderSlotTitle(titleEl, slot, content) {
        this._clearEl(titleEl);
        titleEl.appendChild(this._makeSlotBadge(slot));

        if (typeof content === 'string') {
            const span = document.createElement('span');
            span.className = 'rubber-details__title-text';
            span.textContent = content;
            titleEl.appendChild(span);
            return;
        }

        if (content) titleEl.appendChild(content);
    }

    _buildCompareSlotNode(slot) {
        const targetSlot = slot === 'B' ? 'B' : 'A';
        const span = document.createElement('span');
        span.className = `rubber-compare__slot rubber-compare__slot--${targetSlot === 'B' ? 'b' : 'a'}`;
        span.appendChild(this._makeSlotBadge(targetSlot));
        span.appendChild(document.createTextNode(this.i18nManager.t(targetSlot === 'B' ? 'slotB' : 'slotA')));
        return span;
    }

    _buildCompareNameNode(slot, label) {
        const targetSlot = slot === 'B' ? 'B' : 'A';
        const span = document.createElement('span');
        span.className = `rubber-compare__name rubber-compare__name--${targetSlot === 'B' ? 'b' : 'a'}`;
        span.appendChild(this._makeSlotBadge(targetSlot));
        span.appendChild(document.createTextNode(String(label || '')));
        return span;
    }

    _renderRubberDetailsHeader(label, pointData, slot) {
        const targetSlot = slot === 'B' ? 'B' : 'A';
        const els = this.getRubberDetailsEls();
        if (!els) return;

        const titleEl = targetSlot === 'B' ? els.titleB : els.titleA;
        const actionsEl = targetSlot === 'B' ? els.actionsB : els.actionsA;

        const rawLabel = String(label || pointData?.label || '').trim();
        if (!rawLabel) {
            this._renderSlotTitle(titleEl, targetSlot, this.i18nManager.t(targetSlot === 'B' ? 'slotB' : 'slotA'));
            this._clearEl(actionsEl);
            actionsEl.hidden = true;
            return;
        }

        const localizedLabel = this.i18nManager.localizeRubberName(rawLabel);
        const country = this.i18nManager.getCountry();
        const product = productUrlForPoint(pointData || {}, country);
        const youtube = youtubeUrlForPoint(pointData || {}, country);

        // Title: link to product page when available (same behavior as the chart tooltip).
        if (product) {
            const a = document.createElement('a');
            a.href = product;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.className = 'rubber-details__title-link rubber-details__title-text';
            a.textContent = localizedLabel;
            a.addEventListener('click', () => {
                try { this.urlManager?.setRubberParam?.(rawLabel); } catch { /* ignore */ }
            });
            this._renderSlotTitle(titleEl, targetSlot, a);
        } else {
            const t = document.createElement('span');
            t.className = 'rubber-details__title-text';
            t.textContent = localizedLabel;
            this._renderSlotTitle(titleEl, targetSlot, t);
        }

        // Actions: shop + YouTube icons.
        this._clearEl(actionsEl);
        const shopMeta = shopIconMetaForUrl(product, country, this.i18nManager);
        const aShop = shopMeta ? makeIconLink(shopMeta.src, shopMeta.alt, product) : null;
        const aYt = makeIconLink('images/youtube.ico', this.i18nManager.t('iconYouTube'), youtube);

        if (aShop) {
            aShop.addEventListener('click', () => {
                try { this.urlManager?.setRubberParam?.(rawLabel); } catch { /* ignore */ }
            });
            actionsEl.appendChild(aShop);
        }

        if (aYt) {
            aYt.addEventListener('click', (e) => {
                try { this.urlManager?.setRubberParam?.(rawLabel); } catch { /* ignore */ }
                try { this.urlManager?.setYouTubeParam?.(youtube); } catch { /* ignore */ }
                maybeEmbedYouTubeClick(e, youtube);
            });
            actionsEl.appendChild(aYt);
        }

        actionsEl.hidden = !(aShop || aYt);
    }

    async loadRubberDetails(label, slot, pointData) {
        const targetSlot = slot === 'B' ? 'B' : 'A';
        const els = this.getRubberDetailsEls();
        if (!els) return;

        const rawLabel = String(label || '').trim();
        const bodyEl = targetSlot === 'B' ? els.bodyB : els.bodyA;
        const reqId = targetSlot === 'B' ? ++this._rubberDetailsReqIdB : ++this._rubberDetailsReqIdA;

        els.container.hidden = false;
        if (targetSlot === 'B') els.setB.hidden = false;

        if (!rawLabel) {
            this._renderRubberDetailsHeader('', null, targetSlot);
            bodyEl.innerHTML = `<p class="rubber-placeholder">${this.i18nManager.t('noInfoYet')}</p>`;
            this.updateComparisonPanel();
            return;
        }

        this._renderRubberDetailsHeader(rawLabel, pointData, targetSlot);
        bodyEl.textContent = this.i18nManager.t('loading');

        const lang = (this.i18nManager?.getLang?.() || 'en').toLowerCase();
        const safeLang = (lang === 'ko' || lang === 'en') ? lang : 'en';
        const baseName = `${encodeURIComponent(rawLabel)}.md`;
        const primaryUrl = `rubbers/${safeLang}/${baseName}`;
        const fallbackUrl = `rubbers/${safeLang === 'ko' ? 'en' : 'ko'}/${baseName}`;
        try {
            let res = await fetch(primaryUrl, { cache: 'no-store' });
            const stillValid = targetSlot === 'B'
                ? (reqId === this._rubberDetailsReqIdB)
                : (reqId === this._rubberDetailsReqIdA);
            if (!stillValid) return; // stale
            if (!res.ok && res.status === 404) {
                // If a translation doesn't exist yet, try the other language folder.
                res = await fetch(fallbackUrl, { cache: 'no-store' });
                const stillValid2 = targetSlot === 'B'
                    ? (reqId === this._rubberDetailsReqIdB)
                    : (reqId === this._rubberDetailsReqIdA);
                if (!stillValid2) return; // stale
            }

            if (!res.ok) {
                if (res.status === 404) {
                    bodyEl.textContent = this.i18nManager.t('noInfoYet');
                } else {
                    bodyEl.textContent = `Failed to load info (${res.status}).`;
                }
                this.updateComparisonPanel();
                return;
            }

            const text = await res.text();
            const stillValid3 = targetSlot === 'B'
                ? (reqId === this._rubberDetailsReqIdB)
                : (reqId === this._rubberDetailsReqIdA);
            if (!stillValid3) return; // stale
            const md = (text || '').trim();
            if (!md) {
                bodyEl.textContent = this.i18nManager.t('noInfoYet');
                this.updateComparisonPanel();
                return;
            }
            bodyEl.innerHTML = renderMarkdown(md);
            this.updateComparisonPanel();
        } catch {
            const stillValid4 = targetSlot === 'B'
                ? (reqId === this._rubberDetailsReqIdB)
                : (reqId === this._rubberDetailsReqIdA);
            if (!stillValid4) return; // stale
            bodyEl.textContent = 'Failed to load info.';
            this.updateComparisonPanel();
        }
    }

    refreshRubberDetailsForCurrentSelection() {
        const selA = this.selectedRubber;
        try {
            if (selA && selA.datasetIndex != null && selA.dataIndex != null) {
                const dsA = this.chart?.data?.datasets?.[selA.datasetIndex];
                const pointDataA = dsA?.data?.[selA.dataIndex] || {};
                void this.loadRubberDetails(pointDataA?.label, 'A', pointDataA);
            } else {
                // No selection: show placeholder for Set A
                const els = this.getRubberDetailsEls();
                if (els) {
                    els.container.hidden = false;
                    this._renderSlotTitle(els.titleA, 'A', this.i18nManager.t('slotA'));
                    this._clearEl(els.actionsA);
                    els.actionsA.hidden = true;
                    els.bodyA.innerHTML = `<p class="rubber-placeholder">${this.i18nManager.t('noSelectedRubber')}</p>`;
                }
            }

            const selB = this.selectedRubberB;
            if (selB && selB.datasetIndex != null && selB.dataIndex != null) {
                const dsB = this.chart?.data?.datasets?.[selB.datasetIndex];
                const pointDataB = dsB?.data?.[selB.dataIndex] || {};
                void this.loadRubberDetails(pointDataB?.label, 'B', pointDataB);
            } else {
                // No selection: show placeholder for Set B (always visible)
                const els = this.getRubberDetailsEls();
                if (els) {
                    els.container.hidden = false;
                    els.setB.hidden = false;
                    this._renderSlotTitle(els.titleB, 'B', this.i18nManager.t('slotB'));
                    this._clearEl(els.actionsB);
                    els.actionsB.hidden = true;
                    els.bodyB.innerHTML = `<p class="rubber-placeholder">${this.i18nManager.t('noSelectedRubber')}</p>`;
                }
                this.updateComparisonPanel();
            }
        } catch {
            // ignore
        }
    }

    async loadComparisonDetails(labelA, labelB) {
        const els = this.getRubberDetailsEls();
        if (!els) return;

        const a = String(labelA || '').trim();
        const b = String(labelB || '').trim();
        if (!a || !b) {
            // Show placeholder comparison card until both rubbers are selected
            els.compare.hidden = false;
            try {
                while (els.compareTitle.firstChild) els.compareTitle.removeChild(els.compareTitle.firstChild);
                const aSpan = this._buildCompareSlotNode('A');
                const vsSpan = document.createElement('span');
                vsSpan.className = 'rubber-compare__vs';
                vsSpan.textContent = 'vs';
                const bSpan = this._buildCompareSlotNode('B');
                els.compareTitle.appendChild(aSpan);
                els.compareTitle.appendChild(vsSpan);
                els.compareTitle.appendChild(bSpan);
            } catch {
                els.compareTitle.textContent = `${this.i18nManager.t('slotA')} vs ${this.i18nManager.t('slotB')}`;
            }
            els.compareBody.innerHTML = `<p class="rubber-placeholder">${this.i18nManager.t('noComparisonYet')}</p>`;
            return;
        }

        // Sort alphabetically to match the comparison file convention.
        const sorted = [a, b].sort((x, y) => String(x).localeCompare(String(y), 'en', { sensitivity: 'base' }));
        const fileBase = `${encodeURIComponent(sorted[0])}_${encodeURIComponent(sorted[1])}.md`;

        const reqId = ++this._rubberCompareReqId;
        els.compare.hidden = false;
        // Render title with the same colors as the chart selections (blue/red).
        try {
            while (els.compareTitle.firstChild) els.compareTitle.removeChild(els.compareTitle.firstChild);
            const aSpan = this._buildCompareNameNode('A', this.i18nManager.localizeRubberName(a));
            const vsSpan = document.createElement('span');
            vsSpan.className = 'rubber-compare__vs';
            vsSpan.textContent = 'vs';
            const bSpan = this._buildCompareNameNode('B', this.i18nManager.localizeRubberName(b));
            els.compareTitle.appendChild(aSpan);
            els.compareTitle.appendChild(vsSpan);
            els.compareTitle.appendChild(bSpan);
        } catch {
            els.compareTitle.textContent = `${this.i18nManager.localizeRubberName(a)} vs ${this.i18nManager.localizeRubberName(b)}`;
        }
        els.compareBody.textContent = this.i18nManager.t('loading');

        const lang = (this.i18nManager?.getLang?.() || 'en').toLowerCase();
        const safeLang = (lang === 'ko' || lang === 'en') ? lang : 'en';
        const primaryUrl = `rubbers/comparison/${safeLang}/${fileBase}`;
        const fallbackUrl = `rubbers/comparison/${safeLang === 'ko' ? 'en' : 'ko'}/${fileBase}`;

        try {
            let res = await fetch(primaryUrl, { cache: 'no-store' });
            if (reqId !== this._rubberCompareReqId) return; // stale
            if (!res.ok && res.status === 404) {
                res = await fetch(fallbackUrl, { cache: 'no-store' });
                if (reqId !== this._rubberCompareReqId) return; // stale
            }

            if (!res.ok) {
                if (res.status === 404) {
                    els.compareBody.textContent = this.i18nManager.t('noComparisonYet');
                } else {
                    els.compareBody.textContent = `Failed to load comparison (${res.status}).`;
                }
                return;
            }

            const text = await res.text();
            if (reqId !== this._rubberCompareReqId) return; // stale
            const md = (text || '').trim();
            if (!md) {
                els.compareBody.textContent = this.i18nManager.t('noComparisonYet');
                return;
            }
            els.compareBody.innerHTML = renderMarkdown(md);
        } catch {
            if (reqId !== this._rubberCompareReqId) return; // stale
            els.compareBody.textContent = 'Failed to load comparison.';
        }
    }

    updateComparisonPanel() {
        try {
            const a = this.getSelectedLabel('A');
            const b = this.getSelectedLabel('B');
            if (a && b) void this.loadComparisonDetails(a, b);
            else {
                const els = this.getRubberDetailsEls();
                if (els) {
                    els.compare.hidden = false;
                    try {
                        while (els.compareTitle.firstChild) els.compareTitle.removeChild(els.compareTitle.firstChild);
                        const aSpan = this._buildCompareSlotNode('A');
                        const vsSpan = document.createElement('span');
                        vsSpan.className = 'rubber-compare__vs';
                        vsSpan.textContent = 'vs';
                        const bSpan = this._buildCompareSlotNode('B');
                        els.compareTitle.appendChild(aSpan);
                        els.compareTitle.appendChild(vsSpan);
                        els.compareTitle.appendChild(bSpan);
                    } catch {
                        els.compareTitle.textContent = `${this.i18nManager.t('slotA')} vs ${this.i18nManager.t('slotB')}`;
                    }
                    els.compareBody.innerHTML = `<p class="rubber-placeholder">${this.i18nManager.t('noComparisonYet')}</p>`;
                }
            }
        } catch {
            // ignore
        }
    }

    getSelectedLabel(slot) {
        const sel = slot === 'B' ? this.selectedRubberB : this.selectedRubber;
        if (!sel || sel.datasetIndex == null || sel.dataIndex == null) return '';
        const ds = this.chart?.data?.datasets?.[sel.datasetIndex];
        const pointData = ds?.data?.[sel.dataIndex] || {};
        return String(pointData?.label || '').trim();
    }

    createDatasets() {
        return [
            {
                label: BUTTERFLY,
                data: butterflyRubbers,
                pointBackgroundColor: butterflyRubbers.map(d => colorForRubberPoint(d, BUTTERFLY, butterflyRubbers)),
                pointBorderColor: butterflyRubbers.map(d => colorForRubberPoint(d, BUTTERFLY, butterflyRubbers)),
                pointStyle: butterflyRubbers.map(d => mapPointStyle(d.shape)),
                pointRadius: CHART_POINT_RADIUS,
                pointHoverRadius: CHART_POINT_HOVER_RADIUS
            },
            {
                label: TIBHAR,
                data: tibharRubbers,
                pointBackgroundColor: tibharRubbers.map(d => colorForRubberPoint(d, TIBHAR, tibharRubbers)),
                pointBorderColor: tibharRubbers.map(d => colorForRubberPoint(d, TIBHAR, tibharRubbers)),
                pointStyle: tibharRubbers.map(d => mapPointStyle(d.shape ?? 'normal')),
                pointRadius: CHART_POINT_RADIUS,
                pointHoverRadius: CHART_POINT_HOVER_RADIUS
            },
            {
                label: XIOM,
                data: xiomRubbers,
                pointBackgroundColor: xiomRubbers.map(d => colorForRubberPoint(d, XIOM, xiomRubbers)),
                pointBorderColor: xiomRubbers.map(d => colorForRubberPoint(d, XIOM, xiomRubbers)),
                pointStyle: xiomRubbers.map(d => mapPointStyle(d.shape ?? 'normal')),
                pointRadius: CHART_POINT_RADIUS,
                pointHoverRadius: CHART_POINT_HOVER_RADIUS
            }
        ];
    }

    createPlugins() {
        const overlayAlignPlugin = {
            id: 'overlayAlignPlugin',
            afterLayout: (chart) => {
                const wrap = chart?.canvas?.closest?.('.canvas-wrap');
                if (!wrap || !chart?.chartArea) return;

                const shapeLegend = wrap.querySelector('.shape-legend');
                if (!shapeLegend) return;

                const cs = getComputedStyle(shapeLegend);
                const padRight = parseFloat(cs.paddingRight) || 0;
                const insetRight = (chart.width - chart.chartArea.right) || 0;

                const right = Math.max(0, insetRight - padRight);
                shapeLegend.style.right = `${right}px`;
            }
        };

        // Draw a "B" badge inside the point marker for best-seller rubbers.
        // Enable by setting `bestSeller: true` on the rubber point object in `data.js`.
        const bestSellerBadgePlugin = {
            id: 'bestSellerBadgePlugin',
            afterDatasetsDraw: (chart) => {
                const ctx = chart?.ctx;
                if (!ctx) return;

                ctx.save();
                // Keep the badge compact and readable on both circle + rotated-rect markers.
                ctx.font = `900 ${CHART_BEST_SELLER_BADGE_FONT_SIZE}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const datasets = chart?.data?.datasets || [];
                for (let di = 0; di < datasets.length; di++) {
                    if (chart.isDatasetVisible && !chart.isDatasetVisible(di)) continue;

                    const ds = datasets[di];
                    const data = ds?.data || [];
                    const meta = chart.getDatasetMeta?.(di);
                    const els = meta?.data || [];

                    for (let pi = 0; pi < data.length; pi++) {
                        const d = data[pi] || {};
                        if (!d.bestSeller) continue;
                        const el = els[pi];
                        if (!el) continue;

                        const pos = el.getProps ? el.getProps(['x', 'y'], true) : { x: el.x, y: el.y };
                        const x = pos?.x;
                        const y = pos?.y;
                        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

                        // Subtle dark stroke to keep the white "B" readable on bright fills.
                        ctx.lineWidth = CHART_SELECTED_TEXT_STROKE_WIDTH;
                        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
                        ctx.strokeText('B', x, y + 0.2);
                        ctx.fillStyle = 'rgba(255,255,255,0.98)';
                        ctx.fillText('B', x, y + 0.2);
                    }
                }

                ctx.restore();
            }
        };

        // No circle highlight/halo: we highlight selections via label color instead.
        return [overlayAlignPlugin, bestSellerBadgePlugin];
    }

    createChart() {
        const ctx = document.getElementById(this.canvasId).getContext('2d');
        const plugins = this.createPlugins();

        this.chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: this.createDatasets()
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 20, right: 20, bottom: 56, left: 20 }
                },
                scales: {
                    x: {
                        display: true,
                        min: 40,
                        max: 100,
                        ticks: {
                            display: true,
                            color: 'rgba(255,255,255,0.55)',
                            padding: CHART_TICK_PADDING,
                            font: { size: CHART_TICK_FONT_SIZE, weight: 'normal' }
                        },
                        title: {
                            display: true,
                            text: this.i18nManager.t('axisSpin'),
                            font: { size: CHART_AXIS_TITLE_FONT_SIZE, weight: 'normal' },
                            color: 'rgba(255,255,255,0.88)',
                            padding: { top: 10 }
                        },
                        grid: {
                            color: 'rgba(255,255,255,0.10)',
                            lineWidth: 1
                        }
                    },
                    y: {
                        display: true,
                        min: 40,
                        max: 100,
                        ticks: {
                            display: true,
                            color: 'rgba(255,255,255,0.55)',
                            padding: CHART_TICK_PADDING,
                            font: { size: CHART_TICK_FONT_SIZE, weight: 'normal' }
                        },
                        title: {
                            display: true,
                            text: this.i18nManager.t('axisSpeed'),
                            font: { size: CHART_AXIS_TITLE_FONT_SIZE, weight: 'normal' },
                            color: 'rgba(255,255,255,0.88)'
                        },
                        grid: {
                            color: 'rgba(255,255,255,0.10)',
                            lineWidth: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false,
                        external: (context) => {
                            this.tooltipManager.externalTooltipHandler(context);
                        }
                    },
                    datalabels: {
                        align: 'right',
                        anchor: 'center',
                        offset: CHART_DATALABEL_OFFSET,
                        color: (ctx) => {
                            const isSelectedA = !!this.selectedRubber
                                && ctx?.datasetIndex === this.selectedRubber.datasetIndex
                                && ctx?.dataIndex === this.selectedRubber.dataIndex;
                            const isSelectedB = !!this.selectedRubberB
                                && ctx?.datasetIndex === this.selectedRubberB.datasetIndex
                                && ctx?.dataIndex === this.selectedRubberB.dataIndex;
                            if (isSelectedA) return 'rgba(124, 211, 255, 0.98)'; // Rubber 1
                            if (isSelectedB) return 'rgba(239, 68, 68, 0.98)'; // Rubber 2
                            return 'rgba(255,255,255,0.82)';
                        },
                        font: (ctx) => {
                            const isSelectedA = !!this.selectedRubber
                                && ctx?.datasetIndex === this.selectedRubber.datasetIndex
                                && ctx?.dataIndex === this.selectedRubber.dataIndex;
                            const isSelectedB = !!this.selectedRubberB
                                && ctx?.datasetIndex === this.selectedRubberB.datasetIndex
                                && ctx?.dataIndex === this.selectedRubberB.dataIndex;
                            const isSelected = isSelectedA || isSelectedB;
                            return {
                                size: isSelected ? CHART_DATALABEL_FONT_SIZE_SELECTED : CHART_DATALABEL_FONT_SIZE,
                                weight: isSelected ? 'bold' : 'normal'
                            };
                        },
                        textStrokeColor: (ctx) => {
                            const isSelectedA = !!this.selectedRubber
                                && ctx?.datasetIndex === this.selectedRubber.datasetIndex
                                && ctx?.dataIndex === this.selectedRubber.dataIndex;
                            const isSelectedB = !!this.selectedRubberB
                                && ctx?.datasetIndex === this.selectedRubberB.datasetIndex
                                && ctx?.dataIndex === this.selectedRubberB.dataIndex;
                            const isSelected = isSelectedA || isSelectedB;
                            return isSelected ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)';
                        },
                        textStrokeWidth: (ctx) => {
                            const isSelectedA = !!this.selectedRubber
                                && ctx?.datasetIndex === this.selectedRubber.datasetIndex
                                && ctx?.dataIndex === this.selectedRubber.dataIndex;
                            const isSelectedB = !!this.selectedRubberB
                                && ctx?.datasetIndex === this.selectedRubberB.datasetIndex
                                && ctx?.dataIndex === this.selectedRubberB.dataIndex;
                            const isSelected = isSelectedA || isSelectedB;
                            return isSelected ? CHART_SELECTED_TEXT_STROKE_WIDTH : 0;
                        },
                        textAlign: 'left',
                        clamp: true,
                        formatter: (value) => {
                            return this.i18nManager.localizeRubberName(value.label);
                        }
                    }
                },
                onClick: (evt, activeElements, chart) => {
                    if (activeElements.length > 0) {
                        const datasetIndex = activeElements[0].datasetIndex;
                        const dataIndex = activeElements[0].index;
                        const ds = chart.data.datasets[datasetIndex];
                        const pointData = ds.data[dataIndex];
                        const isShift = !!(evt?.native?.shiftKey || evt?.shiftKey);
                        const slot = (isShift && this.selectedRubber) ? 'B' : 'A';

                        if (slot === 'A') {
                            this.urlManager.setRubber1Param?.(pointData?.label);
                            // Back-compat: if UrlManager doesn't have rubber1 support yet, fall back.
                            if (!this.urlManager.setRubber1Param) this.urlManager.setRubberParam(pointData?.label);
                        } else {
                            this.urlManager.setRubber2Param?.(pointData?.label);
                        }
                        this.openRubberInfo({ brand: ds.label, datasetIndex, dataIndex }, { slot });
                    }
                }
            },
            plugins: [ChartDataLabels, ...plugins]
        });

        return this.chart;
    }

    setActiveBrand(brand) {
        this.currentBrand = brand;
        this.chart.setDatasetVisibility(0, brand === BUTTERFLY);
        this.chart.setDatasetVisibility(1, brand === TIBHAR);
        this.chart.setDatasetVisibility(2, brand === XIOM);

        const r = BRAND_AXIS_RANGES[brand];
        if (r) {
            this.chart.options.scales.x.min = r.xMin;
            this.chart.options.scales.x.max = r.xMax;
            this.chart.options.scales.y.min = r.yMin;
            this.chart.options.scales.y.max = r.yMax;
        }

        // Keep brand switching snappy and avoid animation flashes.
        this.chart.update('none');

        const tabs = document.querySelectorAll('.tab[data-brand]');
        tabs.forEach((btn) => {
            const isActive = btn.getAttribute('data-brand') === brand;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    }

    findRubberByLabel(label) {
        const target = String(label || '').trim().toLowerCase();
        if (!target) return null;

        const brands = [
            { brand: BUTTERFLY, datasetIndex: 0, data: butterflyRubbers },
            { brand: TIBHAR, datasetIndex: 1, data: tibharRubbers },
            { brand: XIOM, datasetIndex: 2, data: xiomRubbers },
        ];

        for (const b of brands) {
            const idx = b.data.findIndex((d) => String(d?.label || '').trim().toLowerCase() === target);
            if (idx >= 0) return { brand: b.brand, datasetIndex: b.datasetIndex, dataIndex: idx };
        }
        return null;
    }

    openRubberInfo(match, opts) {
        if (!match) return false;
        const slot = (opts && opts.slot === 'B') ? 'B' : 'A';
        const noBrandSwitch = !!(opts && opts.noBrandSwitch);
        const nextSel = { datasetIndex: match.datasetIndex, dataIndex: match.dataIndex };

        // Apply the selection to Set A or Set B.
        if (slot === 'B') {
            this.selectedRubberB = nextSel;
        } else {
            this.selectedRubber = nextSel;
        }

        // Avoid duplicate A/B selections.
        try {
            const a = this.getSelectedLabel('A');
            const b = this.getSelectedLabel('B');
            if (a && b && a.toLowerCase() === b.toLowerCase()) {
                this.selectedRubberB = null;
                try {
                    this.urlManager?.deleteParam?.('rubber2');
                } catch {
                    // ignore
                }
                const els = this.getRubberDetailsEls();
                if (els) {
                    els.titleB.textContent = '';
                    this._clearEl(els.actionsB);
                    els.actionsB.hidden = true;
                    els.bodyB.innerHTML = '';
                    els.setB.hidden = true;
                }
            }
        } catch {
            // ignore
        }

        if (!noBrandSwitch) this.setActiveBrand(match.brand);

        const meta = this.chart.getDatasetMeta(match.datasetIndex);
        const el = meta?.data?.[match.dataIndex];
        // If we aren't switching brands (e.g. restoring Rubber 2 from URL),
        // the dataset may be hidden; still allow loading details without chart focus.
        if (!el && !noBrandSwitch) return false;

        // Update the rubber details panel (loaded from /rubbers/<lang>/*.md).
        try {
            const ds = this.chart.data.datasets[match.datasetIndex];
            const pointData = ds?.data?.[match.dataIndex] || {};
            void this.loadRubberDetails(pointData?.label, slot, pointData);
        } catch {
            // ignore
        }

        if (noBrandSwitch || !el) {
            this.updateComparisonPanel();
            try { this.chart?.update?.('none'); } catch { /* ignore */ }
            return true;
        }

        const pos = el.getProps(['x', 'y'], true);
        const active = [{ datasetIndex: match.datasetIndex, index: match.dataIndex }];

        const preferLabel = !!(opts && opts.preferLabelPosition);
        if (preferLabel) {
            try {
                const ds = this.chart.data.datasets[match.datasetIndex];
                const pointData = ds?.data?.[match.dataIndex] || {};
                const labelText = this.i18nManager.localizeRubberName(pointData?.label || '');
                const ctx = this.chart.ctx;
                ctx.save();
                ctx.font = `bold ${CHART_LABEL_MEASURE_FONT_SIZE}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
                const w = ctx.measureText(String(labelText)).width || 0;
                ctx.restore();

                const pointRadius = CHART_POINT_RADIUS;
                const labelOffset = CHART_DATALABEL_OFFSET;
                const labelStartX = pos.x + pointRadius + labelOffset;
                const labelAnchorX = labelStartX + Math.min(w, 110);
                this.tooltipManager.setForcedPosition({ x: labelAnchorX + 12, y: pos.y - 10 });
            } catch {
                this.tooltipManager.setForcedPosition({ x: pos.x + 12, y: pos.y + 12 });
            }
        } else {
            this.tooltipManager.setForcedPosition(null);
        }

        this.chart.setActiveElements(active);
        this.chart.tooltip.setActiveElements(active, { x: pos.x, y: pos.y });
        // Avoid click "blink" by skipping chart animations for selection updates.
        this.chart.update('none');

        // Trigger comparison load if both are selected.
        this.updateComparisonPanel();
        return true;
    }

    getCurrentBrand() {
        return this.currentBrand;
    }
}

export { ChartManager };

