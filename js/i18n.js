/**
 * Internationalization module
 * Handles language selection and translation
 */

const I18N = {
    en: {
        pageTitle: 'Pingpong Rubber Chart',
        ariaCountry: 'Country',
        countryKorea: 'Korea',
        countryUsa: 'USA',
        ariaBrandTabs: 'Brand',
        brandButterfly: 'Butterfly',
        brandTibhar: 'Tibhar',
        brandXiom: 'XIOM',
        legendHardness: 'Hardness',
        legendPimplesIn: 'Pimples-in',
        legendHybrid: 'Hybrid',
        axisSpin: 'Spin',
        axisSpeed: 'Speed',
        tooltipSpinSpeed: 'Spin: {spin}, Speed: {speed}',
        tooltipType: 'Type',
        tooltipArc: 'Arc',
        tooltipThickness: 'Thickness',
        tooltipSheetColors: 'Sheet colors',
        tooltipStrategy: 'Strategy',
        tooltipControl: 'Control',
        tooltipWeight: 'Weight',
        tooltipHardness: 'Hardness',
        tooltipPlayer: 'Player',
        iconSale: 'Sale',
        iconNaver: 'Naver',
        iconCoupang: 'Coupang',
        iconAmazon: 'Amazon',
        iconLink: 'Link',
        iconYouTube: 'YouTube'
    },
    ko: {
        pageTitle: '탁구 러버 차트',
        ariaCountry: '국가',
        countryKorea: '한국',
        countryUsa: '미국',
        ariaBrandTabs: '브랜드',
        brandButterfly: '버터플라이',
        brandTibhar: '티바',
        brandXiom: '엑시옴',
        legendHardness: '경도',
        legendPimplesIn: '평면러버',
        legendHybrid: '하이브리드',
        axisSpin: '회전',
        axisSpeed: '스피드',
        tooltipSpinSpeed: '회전: {spin}, 스피드: {speed}',
        tooltipType: '타입',
        tooltipArc: '궤도',
        tooltipThickness: '두께',
        tooltipSheetColors: '시트 색상',
        tooltipStrategy: '스타일',
        tooltipControl: '컨트롤',
        tooltipWeight: '무게',
        tooltipHardness: '경도',
        tooltipPlayer: '선수',
        iconSale: '구매',
        iconNaver: '네이버',
        iconCoupang: '쿠팡',
        iconAmazon: '아마존',
        iconLink: '링크',
        iconYouTube: '유튜브'
    }
};

const COUNTRY_TO_LANG = {
    kr: 'ko',
    us: 'en',
};

class I18nManager {
    constructor() {
        this.currentCountry = this.initializeCountry();
        this.currentLang = COUNTRY_TO_LANG[this.currentCountry] || 'en';
        if (!I18N[this.currentLang]) this.currentLang = 'en';
    }

    initializeCountry() {
        const urlCountry = this.getCountryFromUrl();
        if (urlCountry) return urlCountry;

        let storedCountry = window.localStorage.getItem('country');
        if (!storedCountry) {
            // Back-compat: old storage key was "lang" with values "ko" / "en".
            const legacyLang = window.localStorage.getItem('lang');
            if (legacyLang === 'ko') storedCountry = 'kr';
            else if (legacyLang === 'en') storedCountry = 'us';
        }

        return this.normalizeCountry(storedCountry || this.detectDefaultCountry());
    }

    getCountryFromUrl() {
        try {
            const params = new URLSearchParams(window.location.search || '');
            const urlCountryRaw = (params.get('country') || '').trim().toLowerCase();
            return COUNTRY_TO_LANG[urlCountryRaw] ? urlCountryRaw : null;
        } catch {
            return null;
        }
    }

    detectDefaultCountry() {
        const nav = (navigator.language || '').toLowerCase();
        return nav.startsWith('ko') ? 'kr' : 'us';
    }

    normalizeCountry(country) {
        return COUNTRY_TO_LANG[country] ? country : 'us';
    }

    t(key, vars) {
        const table = I18N[this.currentLang] || I18N.en;
        let s = table[key] ?? I18N.en[key] ?? key;
        if (vars && typeof s === 'string') {
            for (const [k, v] of Object.entries(vars)) {
                s = s.replaceAll(`{${k}}`, String(v));
            }
        }
        return s;
    }

    localizeBrandName(brand) {
        if (brand === 'Butterfly') return this.t('brandButterfly');
        if (brand === 'Tibhar') return this.t('brandTibhar');
        if (brand === 'XIOM') return this.t('brandXiom');
        return brand;
    }

    localizeRubberName(name) {
        const s = typeof name === 'string' ? name : '';
        if (!s) return '';
        if (this.currentLang !== 'ko') return s;
        return RUBBER_NAME_KO[s] ?? s;
    }

    applyToDom() {
        document.documentElement.lang = this.currentLang;
        document.title = this.t('pageTitle');

        const brandTabs = document.getElementById('brandTabs');
        if (brandTabs) brandTabs.setAttribute('aria-label', this.t('ariaBrandTabs'));

        const langSwitch = document.querySelector('.lang-switch');
        if (langSwitch) langSwitch.setAttribute('aria-label', this.t('ariaCountry'));

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            el.textContent = this.t(key);
        });

        const select = document.getElementById('countrySelect');
        if (select) {
            select.setAttribute('aria-label', this.t('ariaCountry'));
            // Update option labels based on the active language.
            Array.from(select.options || []).forEach((opt) => {
                const v = (opt && opt.value) ? String(opt.value) : '';
                if (v === 'kr') opt.textContent = `🇰🇷 ${this.t('countryKorea')}`;
                else if (v === 'us') opt.textContent = `🇺🇸 ${this.t('countryUsa')}`;
            });
            if (select.value !== this.currentCountry) {
                select.value = this.currentCountry;
            }
        }
    }

    applyToChart(chart) {
        if (!chart?.options?.scales) return;
        if (chart.options.scales.x?.title) {
            chart.options.scales.x.title.text = this.t('axisSpin');
        }
        if (chart.options.scales.y?.title) {
            chart.options.scales.y.title.text = this.t('axisSpeed');
        }
        chart.update();
    }

    setCountry(country, chart, tooltipEl) {
        if (!COUNTRY_TO_LANG[country]) return;
        this.currentCountry = country;
        this.currentLang = COUNTRY_TO_LANG[this.currentCountry] || 'en';
        window.localStorage.setItem('country', this.currentCountry);
        window.localStorage.setItem('lang', this.currentLang);
        this.applyToDom();
        this.applyToChart(chart);
        if (tooltipEl) tooltipEl.style.display = 'none';
    }

    getCountry() {
        return this.currentCountry;
    }

    getLang() {
        return this.currentLang;
    }
}

export { I18nManager, COUNTRY_TO_LANG };

