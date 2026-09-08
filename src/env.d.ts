/// <reference types="astro/client" />

declare global {
  interface Window {
    /**
     * Resolves once the GSAP bundle has loaded, or immediately on devices
     * that use native scrolling and never request it. Set by the inline
     * bootstrap in InvitationLayout.astro.
     */
    __scrollStoryReady?: Promise<unknown>;
    /** True while the scroll story owns scrolling; read by tests and debugging. */
    __scrollStoryActive?: boolean;
    gsap?: any;
    ScrollTrigger?: any;
    ScrollSmoother?: any;
  }
}

export {};
