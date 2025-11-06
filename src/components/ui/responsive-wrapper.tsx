"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useMobileDetection } from "@/hooks/use-mobile-detection";

interface ResponsiveWrapperProps {
  children: ReactNode;
  className?: string;
  mobileClassName?: string;
  tabletClassName?: string;
  desktopClassName?: string;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
  hideOnDesktop?: boolean;
  showOnlyOnMobile?: boolean;
  showOnlyOnTablet?: boolean;
  showOnlyOnDesktop?: boolean;
}

export function ResponsiveWrapper({
  children,
  className,
  mobileClassName,
  tabletClassName,
  desktopClassName,
  hideOnMobile,
  hideOnTablet,
  hideOnDesktop,
  showOnlyOnMobile,
  showOnlyOnTablet,
  showOnlyOnDesktop,
}: ResponsiveWrapperProps) {
  const { isMobileView, isTabletView, isDesktopView } = useMobileDetection();

  // Handle visibility
  if (hideOnMobile && isMobileView) return null;
  if (hideOnTablet && isTabletView) return null;
  if (hideOnDesktop && isDesktopView) return null;
  if (showOnlyOnMobile && !isMobileView) return null;
  if (showOnlyOnTablet && !isTabletView) return null;
  if (showOnlyOnDesktop && !isDesktopView) return null;

  // Determine className based on viewport
  let responsiveClassName = className;
  if (isMobileView && mobileClassName) {
    responsiveClassName = cn(className, mobileClassName);
  } else if (isTabletView && tabletClassName) {
    responsiveClassName = cn(className, tabletClassName);
  } else if (isDesktopView && desktopClassName) {
    responsiveClassName = cn(className, desktopClassName);
  }

  return <div className={responsiveClassName}>{children}</div>;
}

