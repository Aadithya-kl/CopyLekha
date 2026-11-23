import Script from "next/script";

// The Umami script, only in production builds and only when a website id is set, so
// forks and local runs send nothing. Umami sets no cookies.

const DEFAULT_SCRIPT_URL = "https://cloud.umami.is/script.js";

const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const scriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || DEFAULT_SCRIPT_URL;

// True when this build counts usage, so the About text says so only then.
export const isAnalyticsOn = process.env.NODE_ENV === "production" && Boolean(websiteId);

export const Analytics = () => {
  if (!isAnalyticsOn) {
    return null;
  }

  return <Script src={scriptUrl} data-website-id={websiteId} />;
};
