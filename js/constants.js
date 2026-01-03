/**
 * Constants and configuration
 */

// Brand identifiers
export const BUTTERFLY = 'Butterfly';
export const BUTTERFLY_ICON = 'images/butterfly.ico';

export const TIBHAR = 'Tibhar';
export const TIBHAR_ICON = 'images/tibhar.png';

export const XIOM = 'XIOM';
export const XIOM_ICON = 'images/xiom.png';

// Axis ranges per brand
export const BRAND_AXIS_RANGES = {
    [BUTTERFLY]: { xMin: 55,  xMax: 105, yMin: 60,  yMax: 95 },
    [TIBHAR]:    { xMin: 110, xMax: 135, yMin: 110, yMax: 135 },
    [XIOM]:      { xMin: 30,  xMax: 95, yMin: 40,  yMax: 80 },
};

// Color shades for rubber hardness
export const NORMAL_RUBBER_ULTRA_LIGHT = '#FFE0B2';
export const NORMAL_RUBBER_VERY_LIGHT  = '#FFCC80';
export const NORMAL_RUBBER_LIGHT       = '#FFB74D';
export const NORMAL_RUBBER_COLOR       = '#FF9100';
export const NORMAL_RUBBER_DARK        = '#EF6C00';

export const NORMAL_RUBBER_SHADES = [
    NORMAL_RUBBER_ULTRA_LIGHT,
    NORMAL_RUBBER_VERY_LIGHT,
    NORMAL_RUBBER_LIGHT,
    NORMAL_RUBBER_COLOR,
    NORMAL_RUBBER_DARK
];

// Hardness ranges by brand
export const BRAND_HARDNESS_RANGES = {
    [BUTTERFLY]: { min: 32, max: 44 },
    [TIBHAR]:    { min: 40, max: 55 },
    [XIOM]:      { min: 40, max: 55 },
};

