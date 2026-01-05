/**
 * Internationalization module
 * Handles language selection and translation
 */

const I18N = {
    en: {
        pageTitle: 'AI PingPong',
        heroTitle: '🏓 AI PingPong',
        heroSubtitle: 'Table Tennis Rubber Comparison',
        chartTitle: 'Rubber Performance Matrix',
        chartSubtitle: 'Compare speed and spin characteristics across different rubber models',
        ariaCountry: 'Country',
        countryKorea: 'Korea',
        countryUsa: 'USA',
        ariaBrandTabs: 'Brand',
        brandButterfly: 'Butterfly',
        brandTibhar: 'Tibhar',
        brandXiom: 'XIOM',
        legendHardness: 'Hardness',
        legendBestSeller: 'BestSeller',
        legendPimplesIn: 'Pimples-in',
        legendHybrid: 'Hybrid',
        axisSpin: 'Spin',
        axisSpeed: 'Speed',
        tooltipSpinSpeed: 'Spin: {spin}, Speed: {speed}',
        tooltipBestSeller: '⭐ Best Seller',
        tooltipHot: '🔥 Hot',
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
        iconYouTube: 'YouTube',

        slotA: 'Rubber',
        slotB: 'Rubber',
        slotComparison: 'Comparison',
        compareHint: 'Click a point to set Rubber 1. Shift+click to set Rubber 2.',
        loading: 'Loading…',
        noInfoYet: 'No info yet.',
        noSelectedRubber: 'No rubber selected.',
        noComparisonYet: 'No comparison yet.'
    },
    ko: {
        pageTitle: 'AI PingPong',
        heroTitle: '🏓 AI PingPong',
        heroSubtitle: '탁구 러버 비교',
        chartTitle: '러버 성능 비교',
        chartSubtitle: '러버 모델별 회전과 스피드 특성을 비교해 보세요',
        ariaCountry: '국가',
        countryKorea: '한국',
        countryUsa: 'USA',
        ariaBrandTabs: '브랜드',
        brandButterfly: '버터플라이',
        brandTibhar: '티바',
        brandXiom: '엑시옴',
        legendHardness: '경도',
        legendBestSeller: '베스트셀러',
        legendPimplesIn: '평면러버',
        legendHybrid: '하이브리드',
        axisSpin: '회전',
        axisSpeed: '스피드',
        tooltipSpinSpeed: '회전: {spin}, 스피드: {speed}',
        tooltipBestSeller: '⭐ 베스트셀러',
        tooltipHot: '🔥 인기',
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
        iconYouTube: '유튜브',

        slotA: '러버',
        slotB: '러버',
        slotComparison: '비교',
        compareHint: '차트에서 클릭하면 러버 1, Shift+클릭하면 러버 2로 선택됩니다.',
        loading: '불러오는 중…',
        noInfoYet: '정보가 아직 없습니다.',
        noSelectedRubber: '선택된 러버가 없습니다',
        noComparisonYet: '비교 정보가 아직 없습니다.'
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

            if (key === 'compareInstrLine') {
                el.innerHTML = this.getCompareInstrLineHtml();
                return;
            }

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

    getCompareInstrLineHtml() {
        if (this.currentLang === 'ko') {
            return '💡 <span class="rubber-slot-badge rubber-slot-badge--a">1</span> <span class="compare-instruction__slot compare-instruction__slot--a">러버</span>: 클릭, <span class="rubber-slot-badge rubber-slot-badge--b">2</span> <span class="compare-instruction__slot compare-instruction__slot--b">러버</span>: Shift+클릭';
        }
        return '💡 Click for <span class="rubber-slot-badge rubber-slot-badge--a">1</span> <span class="compare-instruction__slot compare-instruction__slot--a">Rubber</span>, Shift+click for <span class="rubber-slot-badge rubber-slot-badge--b">2</span> <span class="compare-instruction__slot compare-instruction__slot--b">Rubber</span>';
    }
}

export { I18nManager, COUNTRY_TO_LANG };

