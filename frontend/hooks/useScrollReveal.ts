'use client';

import { useEffect } from 'react';

/**
 * Progressive-enhancement scroll reveal.
 * Adds .js-ready to <html> (which triggers the hidden-until-observed CSS),
 * then uses IntersectionObserver to reveal elements as they enter the viewport.
 * A 1.5s failsafe reveals everything if the observer hasn't fired — guarantees
 * content is never stuck invisible.
 */
export function useScrollReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Mark JS-ready — CSS picks this up to hide [data-reveal] elements
    document.documentElement.classList.add('js-ready');

    if (!('IntersectionObserver' in window)) {
      // No observer support → just reveal everything
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' }
    );

    const scan = () => {
      document.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((el) => {
        observer.observe(el);
      });
    };

    scan();

    // Catch elements added after mount (route changes, dynamic content)
    const mutationObserver = new MutationObserver(() => scan());
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    // Failsafe: reveal anything still hidden after 1.5s
    const failsafe = setTimeout(() => {
      document.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((el) => {
        el.classList.add('is-visible');
      });
    }, 3000);

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      clearTimeout(failsafe);
    };
  }, []);
}
