"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLayoutEffect } from "react";

gsap.registerPlugin(ScrollTrigger);

/** Adds optional entrance and artwork motion to the Room entry screens. */
export function JoinMotion() {
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from("[data-join-nav]", { y: -16, autoAlpha: 0, duration: 0.55 })
          .from("[data-join-copy] > *", { y: 28, autoAlpha: 0, duration: 0.7, stagger: 0.1 }, 0.1)
          .from("[data-join-panel]", { x: 36, autoAlpha: 0, duration: 0.8 }, 0.2);

        const artwork = document.querySelector<HTMLElement>("[data-join-artwork]");
        if (artwork) {
          gsap.fromTo(
            artwork,
            { yPercent: 3, scale: 1.03 },
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
