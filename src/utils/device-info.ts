// Client-side device information collection utility for enhancing form submission metadata
"use client";

interface DeviceInfo {
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;
  device: string;
  screenSize: {
    width: number;
    height: number;
    viewportWidth: number;
    viewportHeight: number;
    pixelRatio: number;
  } | null;
  connection?: {
    type?: string;
    downlink?: number;
    rtt?: number;
    effectiveType?: string;
    saveData?: boolean;
  };
  performance?: {
    memory?: {
      jsHeapSizeLimit?: number;
      totalJSHeapSize?: number;
      usedJSHeapSize?: number;
    };
    navigation?: {
      type?: number;
      redirectCount?: number;
    };
    timing?: {
      navigationStart?: number;
      loadEventEnd?: number;
      domComplete?: number;
    };
  };
  features?: {
    touchSupport: boolean;
    cookiesEnabled: boolean;
    doNotTrack: boolean | null;
    language: string;
    languages: string[];
    timeZone: string;
    timeZoneOffset: number;
  };
  userAgent: string;
}

/**
 * Gets comprehensive browser and device information for submission metadata
 * @returns Object containing detailed device, OS, browser and feature information
 */
export function getDeviceInfo(): DeviceInfo {
  // Safely check for window to avoid SSR issues
  if (typeof window === "undefined") {
    return {
      browser: "unknown",
      os: "unknown",
      device: "unknown",
      screenSize: null,
      userAgent: "SSR",
    };
  }

  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;

  // Parse browser info
  const browserInfo = parseBrowser(userAgent);

  // Parse OS info
  const osInfo = parseOS(userAgent, platform);

  // Determine device type
  const deviceInfo = parseDevice(userAgent);

  // Get screen size
  const screenSize = {
    width: window.screen.width,
    height: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
  };

  // Get connection info
  const connection = getConnectionInfo();

  // Get performance metrics
  const performance = getPerformanceMetrics();

  // Get browser features
  const features = getBrowserFeatures();

  return {
    ...browserInfo,
    ...osInfo,
    ...deviceInfo,
    screenSize,
    connection,
    performance,
    features,
    userAgent,
  };
}

/**
 * Parse browser name and version
 */
function parseBrowser(userAgent: string) {
  let browser = "unknown";
  let browserVersion = undefined;

  // Chrome
  const chromeMatch = userAgent.match(/Chrome\/(\d+\.\d+)/);
  if (chromeMatch) {
    browser = "Chrome";
    browserVersion = chromeMatch[1];
  }
  // Safari
  else if (userAgent.indexOf("Safari") !== -1) {
    browser = "Safari";
    const versionMatch = userAgent.match(/Version\/(\d+\.\d+)/);
    if (versionMatch) browserVersion = versionMatch[1];
  }
  // Firefox
  else if (userAgent.indexOf("Firefox") !== -1) {
    browser = "Firefox";
    const versionMatch = userAgent.match(/Firefox\/(\d+\.\d+)/);
    if (versionMatch) browserVersion = versionMatch[1];
  }
  // Edge
  else if (userAgent.indexOf("Edg") !== -1) {
    browser = "Edge";
    const versionMatch = userAgent.match(/Edg\/(\d+\.\d+)/);
    if (versionMatch) browserVersion = versionMatch[1];
  }
  // Internet Explorer
  else if (
    userAgent.indexOf("MSIE") !== -1 ||
    userAgent.indexOf("Trident/") !== -1
  ) {
    browser = "Internet Explorer";
    const versionMatch = userAgent.match(/MSIE (\d+\.\d+)/);
    if (versionMatch) browserVersion = versionMatch[1];
  }

  return { browser, browserVersion };
}

/**
 * Parse OS name and version
 */
function parseOS(userAgent: string, platform: string) {
  let os = "unknown";
  let osVersion = undefined;

  // Windows
  if (userAgent.indexOf("Win") !== -1) {
    os = "Windows";
    const versionMatch = userAgent.match(/Windows NT (\d+\.\d+)/);
    if (versionMatch) {
      const versionNum = parseFloat(versionMatch[1]);
      if (versionNum === 10.0) osVersion = "10";
      else if (versionNum === 6.3) osVersion = "8.1";
      else if (versionNum === 6.2) osVersion = "8";
      else if (versionNum === 6.1) osVersion = "7";
      else osVersion = versionMatch[1];
    }
  }
  // MacOS
  else if (userAgent.indexOf("Mac") !== -1) {
    os = "MacOS";
    const versionMatch = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    if (versionMatch) osVersion = versionMatch[1].replace("_", ".");
  }
  // Linux
  else if (userAgent.indexOf("Linux") !== -1) {
    os = "Linux";
  }
  // Android
  else if (userAgent.indexOf("Android") !== -1) {
    os = "Android";
    const versionMatch = userAgent.match(/Android (\d+\.\d+)/);
    if (versionMatch) osVersion = versionMatch[1];
  }
  // iOS
  else if (/iPad|iPhone|iPod/.test(userAgent)) {
    os = "iOS";
    const versionMatch = userAgent.match(/OS (\d+_\d+)/);
    if (versionMatch) osVersion = versionMatch[1].replace("_", ".");
  }

  return { os, osVersion };
}

/**
 * Parse device type
 */
function parseDevice(userAgent: string) {
  // Determine device type
  let device = "desktop";
  if (/iPad/.test(userAgent)) {
    device = "tablet";
  } else if (/iPhone|iPod/.test(userAgent)) {
    device = "mobile";
  } else if (userAgent.indexOf("Android") !== -1) {
    device = userAgent.indexOf("Mobile") !== -1 ? "mobile" : "tablet";
  }

  return { device };
}

/**
 * Get network connection information
 */
function getConnectionInfo() {
  try {
    // @ts-ignore - TS doesn't know about navigator.connection
    const connection =
      // @ts-ignore
      navigator.connection ||
      // @ts-ignore
      navigator.mozConnection ||
      // @ts-ignore
      navigator.webkitConnection;

    if (!connection) return undefined;

    return {
      // @ts-ignore
      type: connection.type,
      // @ts-ignore
      downlink: connection.downlink,
      // @ts-ignore
      rtt: connection.rtt,
      // @ts-ignore
      effectiveType: connection.effectiveType,
      // @ts-ignore
      saveData: connection.saveData,
    };
  } catch (e) {
    return undefined;
  }
}

/**
 * Get browser performance metrics
 */
function getPerformanceMetrics() {
  try {
    if (!window.performance) return undefined;

    // @ts-ignore - TS doesn't know about all performance properties
    const memory = window.performance.memory
      ? {
          // @ts-ignore
          jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit,
          // @ts-ignore
          totalJSHeapSize: window.performance.memory.totalJSHeapSize,
          // @ts-ignore
          usedJSHeapSize: window.performance.memory.usedJSHeapSize,
        }
      : undefined;

    const navigation = window.performance.navigation
      ? {
          type: window.performance.navigation.type,
          redirectCount: window.performance.navigation.redirectCount,
        }
      : undefined;

    const timing = window.performance.timing
      ? {
          navigationStart: window.performance.timing.navigationStart,
          loadEventEnd: window.performance.timing.loadEventEnd,
          domComplete: window.performance.timing.domComplete,
        }
      : undefined;

    return { memory, navigation, timing };
  } catch (e) {
    return undefined;
  }
}

/**
 * Get browser features and capabilities
 */
function getBrowserFeatures() {
  try {
    const nav = window.navigator;

    return {
      touchSupport: "ontouchstart" in window || !!nav.maxTouchPoints,
      cookiesEnabled: nav.cookieEnabled,
      doNotTrack:
        nav.doNotTrack === "1" || nav.doNotTrack === "yes"
          ? true
          : nav.doNotTrack === "0" || nav.doNotTrack === "no"
          ? false
          : null,
      language: nav.language,
      languages: nav.languages ? Array.from(nav.languages) : [nav.language],
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timeZoneOffset: new Date().getTimezoneOffset(),
    };
  } catch (e) {
    return {
      touchSupport: false,
      cookiesEnabled: false,
      doNotTrack: null,
      language: "unknown",
      languages: ["unknown"],
      timeZone: "unknown",
      timeZoneOffset: 0,
    };
  }
}
