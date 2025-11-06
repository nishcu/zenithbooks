"use client";

import { useState, useEffect } from "react";
import {
  isMobileDevice,
  isTabletDevice,
  isTouchDevice,
  isMobileViewport,
  isTabletViewport,
  isDesktopViewport,
  getViewportWidth,
  getViewportHeight,
} from "@/lib/mobile-utils";

export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isTabletView, setIsTabletView] = useState(false);
  const [isDesktopView, setIsDesktopView] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const updateDetection = () => {
      setIsMobile(isMobileDevice());
      setIsTablet(isTabletDevice());
      setIsTouch(isTouchDevice());
      setIsMobileView(isMobileViewport());
      setIsTabletView(isTabletViewport());
      setIsDesktopView(isDesktopViewport());
      setViewportWidth(getViewportWidth());
      setViewportHeight(getViewportHeight());
    };

    // Initial detection
    updateDetection();

    // Update on resize
    window.addEventListener("resize", updateDetection);
    window.addEventListener("orientationchange", updateDetection);

    return () => {
      window.removeEventListener("resize", updateDetection);
      window.removeEventListener("orientationchange", updateDetection);
    };
  }, []);

  return {
    isMobile,
    isTablet,
    isTouch,
    isMobileView,
    isTabletView,
    isDesktopView,
    viewportWidth,
    viewportHeight,
  };
}

