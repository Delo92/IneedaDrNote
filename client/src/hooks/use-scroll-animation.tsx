import { useEffect, useRef, useState, useCallback } from "react";

export function useScrollAnimation(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);

  const setRef = useCallback((node: HTMLDivElement | null) => {
    elementRef.current = node;
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin: "0px 0px -50px 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { setRef, isVisible };
}

export function AnimateOnScroll(props: {
  children: React.ReactNode;
  animation?: "fade-up" | "fade-in" | "fade-left" | "fade-right" | "zoom-in";
  delay?: number;
  className?: string;
}): React.ReactElement {
  const { children, animation = "fade-up", delay = 0, className = "" } = props;
  const { setRef, isVisible } = useScrollAnimation();

  const baseHidden: Record<string, string> = {
    "fade-up": "translate-y-8 opacity-0",
    "fade-in": "opacity-0",
    "fade-left": "-translate-x-8 opacity-0",
    "fade-right": "translate-x-8 opacity-0",
    "zoom-in": "scale-95 opacity-0",
  };

  const visibleClass = "translate-y-0 translate-x-0 scale-100 opacity-100";

  return (
    <div
      ref={setRef}
      className={`transition-all duration-700 ease-out ${className} ${
        isVisible ? visibleClass : baseHidden[animation]
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
