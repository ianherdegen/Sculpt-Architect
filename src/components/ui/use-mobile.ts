import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    // Check for touch capability (includes tablets)
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    // Check screen width (tablets in landscape can be > 768px)
    const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT;
    // Combined: mobile if small screen OR has touch (for tablets)
    const isMobileDevice = hasTouch || isSmallScreen;
    
    setIsMobile(isMobileDevice);
    
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      const hasTouchNow = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreenNow = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(hasTouchNow || isSmallScreenNow);
    };
    mql.addEventListener("change", onChange);
    
    // Also listen for resize to catch tablet orientation changes
    window.addEventListener("resize", onChange);
    
    return () => {
      mql.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, []);

  return !!isMobile;
}
