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
const urlRubber = (urlParams.get('rubber') || '').trim();
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
    });
}

// Tab click handlers
document.querySelectorAll('.tab[data-brand]').forEach((btn) => {
    btn.addEventListener('click', () => {
        const brand = btn.getAttribute('data-brand');
        if (brand && BRAND_AXIS_RANGES[brand]) {
            chartManager.setActiveBrand(brand);
            window.localStorage.setItem('company', brand);
            urlManager.setParams({ company: chartManager.getCurrentBrand() });
        }
    });
});

// Handle initial rubber from URL
if (urlRubber) {
    const match = chartManager.findRubberByLabel(urlRubber);
    if (match) chartManager.openRubberInfo(match, { preferLabelPosition: true });
}

// Handle initial YouTube video from URL
const urlYouTube = (urlParams.get('youtube') || '').trim();
if (urlYouTube && isYouTubeUrl(urlYouTube)) {
    // Small delay to ensure page is fully loaded
    setTimeout(() => {
        openYouTubeEmbed(urlYouTube);
    }, 100);
}

