'use client';

// Captures Core Web Vitals (CLS, INP, LCP, FCP, TTFB) and ships them to the
// backend via `navigator.sendBeacon`. Beacon survives page unload, which is
// critical for LCP/CLS that finalize on hidden visibility change.
//
// Sampled: only 10% of sessions report by default. Bump SAMPLE for high-signal
// debugging (or set NEXT_PUBLIC_VITALS_SAMPLE=1 for 100%).
import { useEffect } from 'react';
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
const SAMPLE = Number(process.env.NEXT_PUBLIC_VITALS_SAMPLE || '0.1');

function send(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    path: window.location.pathname,
    referrer: document.referrer || null,
    ts: Date.now(),
  });

  const url = `${API}/metrics/vitals`;
  // sendBeacon is fire-and-forget; the browser flushes it even on unload.
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
    return;
  }
  // Fallback for older browsers.
  fetch(url, { body, method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' } })
    .catch(() => {});
}

export function WebVitalsReporter() {
  useEffect(() => {
    if (Math.random() > SAMPLE) return;
    onCLS(send);
    onINP(send);
    onLCP(send);
    onFCP(send);
    onTTFB(send);
  }, []);

  return null;
}
