import { createContext, useContext } from 'react'

interface NavigationContextType {
  currentScreen: string
  currentPath: string
}

export const NavigationContext = createContext<NavigationContextType>({
  currentScreen: '',
  currentPath: '',
})

export const useNavigationContext = () => useContext(NavigationContext)
