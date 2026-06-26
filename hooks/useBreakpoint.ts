'use client';

import { Grid } from 'antd';

export function useBreakpoint() {
  const screens = Grid.useBreakpoint();

  return {
    isMobile: !screens.md,               // < 768px
    isTablet: !!screens.md && !screens.xl,  // 768px – ~1200px
    isDesktop: !!screens.xl,                // >= ~1200px
    screens,
  };
}
