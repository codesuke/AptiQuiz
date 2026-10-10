"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLayoutEffect } from "react";

gsap.registerPlugin(ScrollTrigger);

/** Optional motion for the Host setup screen; the creation controls remain immediately usable. */
export function HostMotion() {
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from("[data-host-nav]", { y: -16, autoAlpha: 0, duration: 0.55 })
          .from("[data-host-copy] > *", { y: 28, autoAlpha: 0, duration: 0.7, stagger: 0.1 }, 0.1)
          .from("[data-host-panel]", { x: 36, autoAlpha: 0, duration: 0.8 }, 0.2);

        const artwork = document.querySelector<HTMLElement>("[data-host-artwork]");
        if (artwork) {
          gsap.fromTo(
            artwork,
            { yPercent: 4, scale: 1.03 },
            {
              yPercent: -5,
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: artwork,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        }
      });
      return () => context.revert();
    });
    return () => media.revert();
  }, []);

  return null;
}
