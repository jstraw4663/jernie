import { createContext, useContext } from 'react';
import type { ExploreDeepLink, JernieDeepLink } from '../navigation';

interface NavigationContextValue {
  navigateToExplore(link: ExploreDeepLink): void;
  navigateToJernie(link: JernieDeepLink): void;
}

export const NavigationContext = createContext<NavigationContextValue>({
  navigateToExplore: () => {},
  navigateToJernie: () => {},
});

export const useNavigation = () => useContext(NavigationContext);
