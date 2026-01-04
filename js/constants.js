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
    [BUTTERFLY]: { xMin: 55,  xMax: 105, yMin: 73,  yMax: 95 },
    [TIBHAR]:    { xMin: 114, xMax: 132, yMin: 113, yMax: 132 },
    [XIOM]:      { xMin: 30,  xMax: 95, yMin: 38,  yMax: 75 },
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

