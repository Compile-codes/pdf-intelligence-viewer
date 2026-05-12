import { RefObject, useEffect, useState } from "react";

export function useIntersection<T extends HTMLElement>(
  ref: RefObject<T | null>,
  rootMargin = "900px"
): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { root: null, rootMargin, threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return isVisible;
}
