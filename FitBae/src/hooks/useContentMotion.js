import { useLayoutEffect, useRef } from "react";
import { animateContent } from "@/lib/motion";

// Animate existing DOM instead of keying/remounting stateful screens.
export function useContentMotion(changeKey, variant = "rise") {
  const ref = useRef(null);
  useLayoutEffect(() => animateContent(ref.current, variant), [changeKey, variant]);
  return ref;
}
