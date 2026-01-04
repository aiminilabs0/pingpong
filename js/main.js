/**
 * Main application initialization
 */

import { I18nManager, COUNTRY_TO_LANG } from './i18n.js';
import { UrlManager } from './url-manager.js';
import { TooltipManager } from './tooltip.js';
import { ChartManager } from './chart-manager.js';
import { BUTTERFLY, BRAND_AXIS_RANGES } from './constants.js';
import { openYouTubeEmbed, isYouTubeUrl } from './youtube-embed.js';

// Initialize managers
const i18nManager = new I18nManager();
const urlManager = new UrlManager();

// Create tooltip
const canvasWrapEl = document.querySelector('.canvas-wrap');
const tooltipManager = new TooltipManager(canvasWrapEl, i18nManager, urlManager);

// Create chart
const chartManager = new ChartManager('rubberChart', i18nManager, urlManager, tooltipManager);
const chart = chartManager.createChart();

// Initialize from URL and localStorage
const urlParams = urlManager.getParams();
const urlCompanyOrBrand = urlParams.get('company') || urlParams.get('brand') || '';
const urlRubber1 = (urlParams.get('rubber1') || urlParams.get('rubber') || '').trim();
const urlRubber2 = (urlParams.get('rubber2') || '').trim();
const storedCompanyOrBrand = window.localStorage.getItem('company') || window.localStorage.getItem('brand') || '';
const initialBrand = urlManager.normalizeBrandParam(urlCompanyOrBrand) || 
                     urlManager.normalizeBrandParam(storedCompanyOrBrand) || 
                     BUTTERFLY;

// Persist URL overrides to localStorage
const urlCountryRaw = (urlParams.get('country') || '').trim().toLowerCase();
const urlCountry = COUNTRY_TO_LANG[urlCountryRaw] ? urlCountryRaw : null;

if (urlCountry) {
    window.localStorage.setItem('country', urlCountry);
    window.localStorage.setItem('lang', COUNTRY_TO_LANG[urlCountry] || 'en');
}
window.localStorage.setItem('company', initialBrand);

// Canonicalize URL parameters
if (urlCountry) urlManager.setParams({ country: i18nManager.getCountry() });
if (urlCompanyOrBrand || urlParams.has('brand')) urlManager.setParams({ company: initialBrand });
if (urlParams.has('brand')) urlManager.deleteParam('brand');
// Back-compat: if only `rubber` is present, mirror it into `rubber1` for compare links.
if (urlParams.has('rubber') && !urlParams.has('rubber1')) urlManager.setParams({ rubber1: (urlParams.get('rubber') || '').trim() });

// Set initial brand
chartManager.setActiveBrand(initialBrand);

// Apply initial i18n
i18nManager.applyToDom();
i18nManager.applyToChart(chart);

// Country select handler
const countrySelect = document.getElementById('countrySelect');
if (countrySelect) {
    countrySelect.addEventListener('change', () => {
        const country = countrySelect.value;
        if (!country) return;
        i18nManager.setCountry(country, chart, tooltipManager.tooltipEl);
        urlManager.setParams({ country: i18nManager.getCountry() });
        // If a rubber is currently selected, reload its details in the new language.
        chartManager.refreshRubberDetailsForCurrentSelection();
    });
}

// Tab click handlers
document.querySelectorAll('.tab[data-brand]').forEach((btn) => {
    btn.addEventListener('click', () => {
        const brand = btn.getAttribute('data-brand');
        if (brand && BRAND_AXIS_RANGES[brand]) {
            chartManager.setActiveBrand(brand);
            // Keep selected rubber descriptions (Set A/B) when switching company,
            // but clear any active chart tooltip/highlight to avoid stale positioning.
            chartManager.clearChartFocus();
            window.localStorage.setItem('company', brand);
            urlManager.setParams({ company: chartManager.getCurrentBrand() });
            // NOTE: we intentionally keep `rubber` (and `youtube`) params so the selected rubber description remains visible.
        }
    });
});

// Handle initial rubber from URL
if (urlRubber1) {
    const match = chartManager.findRubberByLabel(urlRubber1);
    if (match) chartManager.openRubberInfo(match, { preferLabelPosition: true, slot: 'A' });
}

if (urlRubber2) {
    const match2 = chartManager.findRubberByLabel(urlRubber2);
    if (match2) {
        // Don't switch chart brand on load for Rubber 2: keep the chart driven by the active tab / Rubber 1.
        chartManager.openRubberInfo(match2, { slot: 'B', noBrandSwitch: true });
    }
}

// Handle initial YouTube video from URL
const urlYouTube = (urlParams.get('youtube') || '').trim();
if (urlYouTube && isYouTubeUrl(urlYouTube)) {
    // Small delay to ensure page is fully loaded
    setTimeout(() => {
        openYouTubeEmbed(urlYouTube);
    }, 100);
}

