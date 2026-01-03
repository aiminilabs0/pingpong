/**
 * Color and styling utilities
 */

import { NORMAL_RUBBER_COLOR, NORMAL_RUBBER_SHADES, BRAND_HARDNESS_RANGES } from './constants.js';

function parseHardness(h) {
    if (typeof h === 'number' && Number.isFinite(h)) return h;
    if (typeof h === 'string') {
        const n = Number.parseFloat(h.trim());
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function computeHardnessRange(data) {
    let min = Infinity;
    let max = -Infinity;
    for (const d of data) {
        const h = parseHardness(d?.hardness);
        if (h == null) continue;
        if (h < min) min = h;
        if (h > max) max = h;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { min, max };
}

function clamp01(t) {
    if (t < 0) return 0;
    if (t > 1) return 1;
    return t;
}

function shadeFromHardness(h, range) {
    if (h == null || !range) return NORMAL_RUBBER_COLOR;
    const denom = (range.max - range.min);
    const t = denom === 0 ? 0.5 : clamp01((h - range.min) / denom);
    const idx = Math.round(t * (NORMAL_RUBBER_SHADES.length - 1));
    return NORMAL_RUBBER_SHADES[idx] ?? NORMAL_RUBBER_COLOR;
}

function colorForRubberPoint(d, brand, brandData) {
    const h = parseHardness(d?.hardness);
    const range = BRAND_HARDNESS_RANGES[brand] ?? computeHardnessRange(brandData);
    return shadeFromHardness(h, range);
}

function mapPointStyle(shape) {
    if (shape === 'hybrid') return 'rectRot';
    if (shape === 'normal') return 'circle';
    return shape ?? 'normal';
}

export { colorForRubberPoint, mapPointStyle };

