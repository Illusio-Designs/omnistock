'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

interface TrackingIds {
  gaId: string;
  fbPixelId: string;
  clarityId: string;
}

export function Analytics() {
  const [ids, setIds] = useState<TrackingIds>({
    gaId: process.env.NEXT_PUBLIC_GA_ID || '',
    fbPixelId: process.env.NEXT_PUBLIC_FB_PIXEL_ID || '',
    clarityId: process.env.NEXT_PUBLIC_CLARITY_ID || '',
  });

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    fetch(`${api}/public/tracking`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setIds(prev => ({
            gaId: data.gaId || prev.gaId,
            fbPixelId: data.fbPixelId || prev.fbPixelId,
            clarityId: data.clarityId || prev.clarityId,
          }));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {/* ── Google Analytics (gtag.js) ── */}
      {ids.gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ids.gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ids.gaId}', {
                page_path: window.location.pathname,
                anonymize_ip: true,
              });
            `}
          </Script>
        </>
      )}

      {/* ── Facebook Pixel ── */}
      {ids.fbPixelId && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${ids.fbPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {/* ── Microsoft Clarity ── */}
      {ids.clarityId && (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${ids.clarityId}");
          `}
        </Script>
      )}

      {/* ── Global error logger ── */}
      <Script id="error-logger" strategy="afterInteractive">
        {`
          window.addEventListener('error', function(e) {
            console.error('[Runtime Error]', e.message, e.filename, e.lineno, e.colno);
          });
          window.addEventListener('unhandledrejection', function(e) {
            console.error('[Unhandled Promise]', e.reason);
          });
        `}
      </Script>
    </>
  );
}
