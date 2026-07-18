import { Dimensions } from 'react-native';

// iPhone 16 reference dimensions (logical points)
const REFERENCE_WIDTH = 393;
const REFERENCE_HEIGHT = 852;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const widthRatio = SCREEN_WIDTH / REFERENCE_WIDTH;
const heightRatio = SCREEN_HEIGHT / REFERENCE_HEIGHT;

/**
 * Horizontal scale — use for horizontal paddings, margins, widths, border-radius, gaps.
 * Scales linearly based on screen width relative to iPhone 16.
 */
export const s = (size: number): number => Math.round(size * widthRatio);

/**
 * Vertical scale — use for vertical paddings, margins, heights, top/bottom offsets.
 * Scales linearly based on screen height relative to iPhone 16.
 */
export const vs = (size: number): number => Math.round(size * heightRatio);

/**
 * Moderate scale — use for font sizes, icon sizes, and anything that should NOT
 * grow/shrink as aggressively as the raw scale.
 *
 * @param size   - The design value (at iPhone 16 size)
 * @param factor - How much of the scaling to apply (0 = no scaling, 1 = full scaling).
 *                 Default 0.5 means halfway between the original value and the full scale.
 */
export const ms = (size: number, factor: number = 0.5): number =>
    Math.round(size + (s(size) - size) * factor);

// Convenience booleans (derived from the same source of truth)
export const isSmallScreen = SCREEN_HEIGHT < 700;   // iPhone SE, iPod Touch
export const isLargeScreen = SCREEN_HEIGHT > 900;    // Pro Max / Plus models

export { SCREEN_WIDTH, SCREEN_HEIGHT };
