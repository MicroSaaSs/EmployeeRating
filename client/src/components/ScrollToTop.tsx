import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

const ScrollToTop: React.FC = () => {
  const { pathname, hash } = useLocation();
  const { isLoading } = useAuth();
  const waitingForSection = !!hash && isLoading;

  useEffect(() => {
    if (waitingForSection) return;
    const section = hash ? document.getElementById(hash.slice(1)) : null;
    if (section) section.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash, waitingForSection]);

  return null;
};

export default ScrollToTop;
