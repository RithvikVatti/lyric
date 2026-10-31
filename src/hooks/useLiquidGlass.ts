import { useEffect, useRef } from 'react';
import { LiquidGlass } from '@ybouane/liquidglass';

interface UseLiquidGlassOptions {
  refraction?: number;
  chromAberration?: number;
  edgeHighlight?: number;
  blurAmount?: number;
  cornerRadius?: number;
  floating?: boolean;
}

/**
 * React hook to attach ybouane/liquidglass WebGL shader to HTML elements
 */
export function useLiquidGlass(
  rootRef: React.RefObject<HTMLElement | null>,
  glassRefs: React.RefObject<HTMLElement | null>[],
  options: UseLiquidGlassOptions = {}
) {
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    let isCancelled = false;

    const initGlass = async () => {
      const root = rootRef.current;
      if (!root) return;

      const glassElements = glassRefs
        .map(ref => ref.current)
        .filter((el): el is HTMLElement => el !== null);

      if (glassElements.length === 0) return;

      // Clean up previous instance
      if (instanceRef.current) {
        try {
          instanceRef.current.destroy();
        } catch (e) {
          // ignore
        }
        instanceRef.current = null;
      }

      try {
        const instance = await LiquidGlass.init({
          root,
          glassElements,
          defaults: {
            refraction: options.refraction ?? 0.65,
            chromAberration: options.chromAberration ?? 0.04,
            edgeHighlight: options.edgeHighlight ?? 0.08,
            blurAmount: options.blurAmount ?? 0.2,
            cornerRadius: options.cornerRadius ?? 36,
            floating: options.floating ?? true
          }
        });

        if (!isCancelled) {
          instanceRef.current = instance;
        } else {
          instance.destroy();
        }
      } catch (err) {
        console.warn('LiquidGlass WebGL init notice (using CSS glass fallback):', err);
      }
    };

    // Small delay to ensure DOM and images are painted
    const timer = setTimeout(initGlass, 150);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      if (instanceRef.current) {
        try {
          instanceRef.current.destroy();
        } catch (e) {
          // ignore
        }
        instanceRef.current = null;
      }
    };
  }, [rootRef, ...glassRefs, options.refraction, options.blurAmount, options.cornerRadius]);

  return instanceRef;
}
