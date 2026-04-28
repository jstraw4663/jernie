import { createContext, useContext } from 'react';
import type { ExploreDeepLink } from '../navigation';

interface NavigationContextValue {
  navigateToExplore(link: ExploreDeepLink): void;
}

export const NavigationContext = createContext<NavigationContextValue>({
  navigateToExplore: () => {},
});

export const useNavigation = () => useContext(NavigationContext);
