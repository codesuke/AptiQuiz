"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";

gsap.registerPlugin(ScrollTrigger);

const REVEAL_OFFSET_PX = 28;
const REVEAL_START = "top 85%";

function animateHero() {
  const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
  timeline
    .from("[data-hero-image]", { scale: 1.08, duration: 1.6, ease: "power2.out" })
    .from("[data-hero-item]", { y: 32, autoAlpha: 0, duration: 0.9, stagger: 0.12 }, 0.15);

  gsap.to("[data-hero-image]", {
    yPercent: 12,
    ease: "none",
    scrollTrigger: {
      trigger: "[data-hero-image]",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });
}

function revealGroups() {
  for (const group of gsap.utils.toArray<HTMLElement>("[data-reveal-group]")) {
    gsap.from(group.querySelectorAll("[data-reveal]"), {
      y: REVEAL_OFFSET_PX,
      autoAlpha: 0,
      duration: 0.8,
      ease: "power2.out",
      stagger: 0.1,
      scrollTrigger: { trigger: group, start: REVEAL_START, once: true },
    });
  }
}

function staggerCards() {
  for (const group of gsap.utils.toArray<HTMLElement>("[data-stagger-group]")) {
    gsap.from(group.querySelectorAll("[data-stagger-item]"), {
      y: 48,
      autoAlpha: 0,
      duration: 0.9,
      ease: "power3.out",
      stagger: 0.15,
      scrollTrigger: { trigger: group, start: "top 80%", once: true },
    });
  }
}

function parallaxImages() {
  for (const frame of gsap.utils.toArray<HTMLElement>("[data-parallax-frame]")) {
    const image = frame.querySelector("img");
    if (!image) continue;
    gsap.fromTo(
      image,
      { yPercent: -8, scale: 1.15 },
      {
        yPercent: 8,
        ease: "none",
        scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: true },
      },
    );
  }
}

function scrubProcessSteps() {
  const container = document.querySelector<HTMLElement>("[data-steps]");
  if (!container) return;
  const steps = container.querySelectorAll("[data-step]");
  gsap
    .timeline({
      scrollTrigger: { trigger: container, start: "top 80%", end: "bottom 60%", scrub: 0.6 },
    })
    .from(steps, { y: 40, autoAlpha: 0, stagger: 0.4, ease: "power2.out" });
}

export function HomeMotion() {
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      animateHero();
      revealGroups();
      staggerCards();
      parallaxImages();
      scrubProcessSteps();
    });
    return () => media.revert();
  }, []);

  return null;
}
