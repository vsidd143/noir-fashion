export const WHEEL_SECTION_COPY = {
  heading: "New this month",
} as const;

export interface ResponsiveWheelParams {
  itemWidth: number;
  itemHeight: number;
  radius: number;
  scrollLength: number; // percentage of window.innerHeight
  spacingAngle: number;
  focusY: number;
}

/**
 * Responsive parameters tuned for zero overlap and perfectly centered middle cards across all screen widths
 */
export function getResponsiveWheelParams(viewportWidth: number, viewportHeight: number): ResponsiveWheelParams {
  if (viewportWidth >= 1024) {
    // Desktop: 240x300 (4:5 ratio)
    const stageWidth = Math.min(viewportWidth - 96, 1280);
    return {
      itemWidth: 240,
      itemHeight: 300,
      radius: Math.max(stageWidth * 0.9, 1100),
      scrollLength: 160,
      spacingAngle: 0.28,
      focusY: 28,
    };
  } else if (viewportWidth >= 640) {
    // Tablet ("Tap / Tab View"): 200x250 (4:5 ratio), perfectly balanced multi-card view
    const stageWidth = Math.min(viewportWidth - 48, 960);
    return {
      itemWidth: 200,
      itemHeight: 250,
      radius: Math.max(stageWidth * 0.95, 800),
      scrollLength: 130,
      spacingAngle: 0.32,
      focusY: 24,
    };
  } else {
    // Mobile (<640px): 160x200 (4:5 ratio), generous stage placement, centered spotlight
    const stageWidth = Math.max(viewportWidth - 32, 280);
    return {
      itemWidth: 160,
      itemHeight: 200,
      radius: Math.max(stageWidth * 1.35, 500),
      scrollLength: 100,
      spacingAngle: 0.40,
      focusY: 20,
    };
  }
}
