/**
 * Chart management and rendering
 */

import { BUTTERFLY, TIBHAR, XIOM, BRAND_AXIS_RANGES } from './constants.js';
import { colorForRubberPoint, mapPointStyle } from './color-utils.js';
import { renderMarkdown } from './markdown.js';

class ChartManager {
    constructor(canvasId, i18nManager, urlManager, tooltipManager) {
        this.canvasId = canvasId;
        this.i18nManager = i18nManager;
        this.urlManager = urlManager;
        this.tooltipManager = tooltipManager;
        this.currentBrand = BUTTERFLY;
        this.selectedRubber = null;
        this.chart = null;
        this._rubberDetailsReqId = 0;
        this._rubberDetailsEls = null;
    }

    getRubberDetailsEls() {
        if (this._rubberDetailsEls) return this._rubberDetailsEls;
        const container = document.getElementById('rubberDetails');
        const title = document.getElementById('rubberDetailsTitle');
        const body = document.getElementById('rubberDetailsBody');
        if (!container || !title || !body) return null;
        this._rubberDetailsEls = { container, title, body };
        return this._rubberDetailsEls;
    }

    clearRubberDetails() {
        const els = this.getRubberDetailsEls();
        if (!els) return;
        els.title.textContent = '';
        els.body.innerHTML = '';
        els.container.hidden = true;
    }

    clearRubberSelection(opts) {
        const options = opts && typeof opts === 'object' ? opts : {};
        const clearDetails = options.clearDetails !== false;

        this.selectedRubber = null;
        this._rubberDetailsReqId++; // invalidate any in-flight details load

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
            this.chart?.update?.();
        } catch {
            // ignore
        }
    }

    async loadRubberDetails(label) {
        const els = this.getRubberDetailsEls();
        if (!els) return;

        const rawLabel = String(label || '').trim();
        if (!rawLabel) {
            this.clearRubberDetails();
            return;
        }

        const reqId = ++this._rubberDetailsReqId;
        els.container.hidden = false;
        els.title.textContent = this.i18nManager.localizeRubberName(rawLabel);
        els.body.textContent = 'Loading…';

        const lang = (this.i18nManager?.getLang?.() || 'en').toLowerCase();
        const safeLang = (lang === 'ko' || lang === 'en') ? lang : 'en';
        const baseName = `${encodeURIComponent(rawLabel)}.md`;
        const primaryUrl = `rubbers/${safeLang}/${baseName}`;
        const fallbackUrl = `rubbers/${safeLang === 'ko' ? 'en' : 'ko'}/${baseName}`;
        try {
            let res = await fetch(primaryUrl, { cache: 'no-store' });
            if (reqId !== this._rubberDetailsReqId) return; // stale
            if (!res.ok && res.status === 404) {
                // If a translation doesn't exist yet, try the other language folder.
                res = await fetch(fallbackUrl, { cache: 'no-store' });
                if (reqId !== this._rubberDetailsReqId) return; // stale
            }

            if (!res.ok) {
                if (res.status === 404) {
                    els.body.textContent = 'No info yet.';
                } else {
                    els.body.textContent = `Failed to load info (${res.status}).`;
                }
                return;
            }

            const text = await res.text();
            if (reqId !== this._rubberDetailsReqId) return; // stale
            const md = (text || '').trim();
            if (!md) {
                els.body.textContent = 'No info yet.';
                return;
            }
            els.body.innerHTML = renderMarkdown(md);
        } catch {
            if (reqId !== this._rubberDetailsReqId) return; // stale
            els.body.textContent = 'Failed to load info.';
        }
    }

    refreshRubberDetailsForCurrentSelection() {
        const sel = this.selectedRubber;
        if (!sel || sel.datasetIndex == null || sel.dataIndex == null) return;
        try {
            const ds = this.chart?.data?.datasets?.[sel.datasetIndex];
            const pointData = ds?.data?.[sel.dataIndex] || {};
            void this.loadRubberDetails(pointData?.label);
        } catch {
            // ignore
        }
    }

    createDatasets() {
        return [
            {
                label: BUTTERFLY,
                data: butterflyRubbers,
                pointBackgroundColor: butterflyRubbers.map(d => colorForRubberPoint(d, BUTTERFLY, butterflyRubbers)),
                pointBorderColor: butterflyRubbers.map(d => colorForRubberPoint(d, BUTTERFLY, butterflyRubbers)),
                pointStyle: butterflyRubbers.map(d => mapPointStyle(d.shape)),
                pointRadius: 7,
                pointHoverRadius: 9
            },
            {
                label: TIBHAR,
                data: tibharRubbers,
                pointBackgroundColor: tibharRubbers.map(d => colorForRubberPoint(d, TIBHAR, tibharRubbers)),
                pointBorderColor: tibharRubbers.map(d => colorForRubberPoint(d, TIBHAR, tibharRubbers)),
                pointStyle: tibharRubbers.map(d => mapPointStyle(d.shape ?? 'normal')),
                pointRadius: 7,
                pointHoverRadius: 9
            },
            {
                label: XIOM,
                data: xiomRubbers,
                pointBackgroundColor: xiomRubbers.map(d => colorForRubberPoint(d, XIOM, xiomRubbers)),
                pointBorderColor: xiomRubbers.map(d => colorForRubberPoint(d, XIOM, xiomRubbers)),
                pointStyle: xiomRubbers.map(d => mapPointStyle(d.shape ?? 'normal')),
                pointRadius: 7,
                pointHoverRadius: 9
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

        const selectedPointHaloPlugin = {
            id: 'selectedPointHaloPlugin',
            afterDatasetsDraw: (chart) => {
                if (!this.selectedRubber) return;
                const { datasetIndex, dataIndex } = this.selectedRubber || {};
                if (datasetIndex == null || dataIndex == null) return;

                const meta = chart.getDatasetMeta(datasetIndex);
                const el = meta?.data?.[dataIndex];
                if (!el) return;

                const { x, y } = el.getProps(['x', 'y'], true);
                const ctx = chart.ctx;
                ctx.save();
                ctx.beginPath();
                ctx.arc(x, y, 12, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(124, 211, 255, 0.95)';
                ctx.lineWidth = 3;
                ctx.shadowColor = 'rgba(124, 211, 255, 0.35)';
                ctx.shadowBlur = 10;
                ctx.stroke();
                ctx.restore();
            }
        };

        return [overlayAlignPlugin, selectedPointHaloPlugin];
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
                            padding: 8
                        },
                        title: {
                            display: true,
                            text: this.i18nManager.t('axisSpin'),
                            font: { size: 16, weight: 'normal' },
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
                            padding: 8
                        },
                        title: {
                            display: true,
                            text: this.i18nManager.t('axisSpeed'),
                            font: { size: 16, weight: 'normal' },
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
                        offset: 8,
                        color: (ctx) => {
                            const isSelected = !!this.selectedRubber
                                && ctx?.datasetIndex === this.selectedRubber.datasetIndex
                                && ctx?.dataIndex === this.selectedRubber.dataIndex;
                            return isSelected ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.82)';
                        },
                        font: (ctx) => {
                            const isSelected = !!this.selectedRubber
                                && ctx?.datasetIndex === this.selectedRubber.datasetIndex
                                && ctx?.dataIndex === this.selectedRubber.dataIndex;
                            return { size: isSelected ? 12 : 11, weight: isSelected ? 'bold' : 'normal' };
                        },
                        textStrokeColor: (ctx) => {
                            const isSelected = !!this.selectedRubber
                                && ctx?.datasetIndex === this.selectedRubber.datasetIndex
                                && ctx?.dataIndex === this.selectedRubber.dataIndex;
                            return isSelected ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)';
                        },
                        textStrokeWidth: (ctx) => {
                            const isSelected = !!this.selectedRubber
                                && ctx?.datasetIndex === this.selectedRubber.datasetIndex
                                && ctx?.dataIndex === this.selectedRubber.dataIndex;
                            return isSelected ? 3 : 0;
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

                        this.urlManager.setRubberParam(pointData?.label);
                        this.openRubberInfo({ brand: ds.label, datasetIndex, dataIndex });
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

        this.chart.update();

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
        this.selectedRubber = { datasetIndex: match.datasetIndex, dataIndex: match.dataIndex };
        this.setActiveBrand(match.brand);

        const meta = this.chart.getDatasetMeta(match.datasetIndex);
        const el = meta?.data?.[match.dataIndex];
        if (!el) return false;

        // Update the rubber details panel (loaded from /rubbers/<lang>/*.md).
        try {
            const ds = this.chart.data.datasets[match.datasetIndex];
            const pointData = ds?.data?.[match.dataIndex] || {};
            void this.loadRubberDetails(pointData?.label);
        } catch {
            // ignore
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
                ctx.font = 'bold 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
                const w = ctx.measureText(String(labelText)).width || 0;
                ctx.restore();

                const pointRadius = 7;
                const labelOffset = 8;
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
        this.chart.update();
        return true;
    }

    getCurrentBrand() {
        return this.currentBrand;
    }
}

export { ChartManager };

