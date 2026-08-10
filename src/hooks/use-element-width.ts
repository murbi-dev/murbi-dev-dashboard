"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Observes the rendered width of an element.
 *
 * SVG charts need the width in real pixels — scaling a `viewBox` instead would
 * stretch strokes and labels along with the plot.
 *
 * @param ref - Ref of the element to observe.
 * @returns The current width in pixels, `0` before the first measurement.
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    setWidth(element.clientWidth);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref]);

  return width;
}
