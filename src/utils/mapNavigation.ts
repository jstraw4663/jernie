// mapNavigation — shared map deep-link construction + app launcher.
// Extracted from QuickActions for reuse in NavigationSelectorSheet.
//
// Apple Maps: HTTPS Universal Links — always installed, guaranteed to open.
// Google Maps / Uber: custom scheme deep links; fall back to App Store after
// 1.5 s if the app was not installed (detected via visibilitychange).

export const MAP_APP_STORE_URLS: Record<string, string> = {
  google: 'https://apps.apple.com/app/google-maps/id585027354',
  uber:   'https://apps.apple.com/app/uber/id368677368',
};

export function buildDeepLinks(
  lat: number | undefined,
  lon: number | undefined,
  addr: string | undefined,
  label: string | undefined,
) {
  const hasCoords = lat != null && lon != null;
  // With coords: label is the pin name shown on the map (place name is more useful than address).
  // Without coords: addr is the search query — using label causes a name search (e.g. "Avis")
  // instead of navigating to the specific address.
  const pinName   = encodeURIComponent(label ?? addr ?? '');
  const addrQuery = encodeURIComponent(addr ?? label ?? '');
  return {
    apple: hasCoords ? `maps://?ll=${lat},${lon}&q=${pinName}` : `maps://?q=${addrQuery}`,
    google: hasCoords
      ? `comgooglemaps://?center=${lat},${lon}&q=${pinName}`
      : `comgooglemaps://?q=${addrQuery}`,
    uber: hasCoords
      ? `uber://?action=setPickup&dropoff[latitude]=${lat}&dropoff[longitude]=${lon}&dropoff[nickname]=${pinName}`
      : `uber://?action=setPickup&dropoff[formatted_address]=${addrQuery}`,
  };
}

export function openMapApp(deepLink: string, appStoreKey?: string) {
  window.open(deepLink, '_blank');

  if (!appStoreKey) return;

  let left = false;
  const mark = () => { left = true; };
  document.addEventListener('visibilitychange', mark, { once: true });
  document.addEventListener('pagehide', mark, { once: true });
  setTimeout(() => {
    document.removeEventListener('visibilitychange', mark);
    document.removeEventListener('pagehide', mark);
    if (!left) window.open(MAP_APP_STORE_URLS[appStoreKey], '_blank', 'noopener,noreferrer');
  }, 1500);
}
