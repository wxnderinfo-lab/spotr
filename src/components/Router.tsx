// Minimal client-side router - no dependencies needed
import { createContext, useContext, useState, useEffect, ReactNode, MouseEvent } from 'react';

interface RouterContextType {
  pathname: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextType>({ pathname: '/', navigate: () => {} });

export function Router({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setPathname(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <RouterContext.Provider value={{ pathname, navigate }}>{children}</RouterContext.Provider>;
}

export function useLocation() {
  return useContext(RouterContext);
}

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  children: ReactNode;
}

export function Link({ to, children, onClick, ...rest }: LinkProps) {
  const { navigate } = useContext(RouterContext);
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onClick?.(e);
    navigate(to);
  };
  return <a href={to} onClick={handle} {...rest}>{children}</a>;
}
