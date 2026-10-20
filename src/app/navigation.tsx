import {useEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode} from "react";

const NAV_EVENT = "sticktouch:navigate";
export function navigate(to: string): void {
  if (window.location.pathname !== to) window.history.pushState(null, "", to);
  window.dispatchEvent(new Event(NAV_EVENT));
  window.scrollTo(0, 0);
}
export function usePathname(): string {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onNavigate = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onNavigate);
    window.addEventListener(NAV_EVENT, onNavigate);
    return () => {
      window.removeEventListener("popstate", onNavigate);
      window.removeEventListener(NAV_EVENT, onNavigate);
    };
  }, []);
  return path;
}
type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {to: string; children: ReactNode};
export function Link({to, children, onClick, ...props}: LinkProps) {
  function follow(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey ||
        event.shiftKey || event.altKey || props.target === "_blank") return;
    event.preventDefault();
    navigate(to);
  }
  return <a href={to} onClick={follow} {...props}>{children}</a>;
}
