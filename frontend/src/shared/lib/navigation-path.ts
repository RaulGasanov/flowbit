export const toRoutePath = (href?: string | null) => {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return undefined;
  }

  try {
    const base = typeof window === "undefined" ? "http://flowbit.local" : window.location.origin;
    const url = new URL(href, base);
    if (typeof window !== "undefined" && url.origin !== window.location.origin) {
      return undefined;
    }
    return url.pathname || "/";
  } catch {
    return href.startsWith("/") ? href.split(/[?#]/)[0] || "/" : undefined;
  }
};

export const routePathMatches = (href: string | undefined, pathname: string) => toRoutePath(href) === pathname;
