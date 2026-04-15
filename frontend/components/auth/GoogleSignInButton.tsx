'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: any;
  }
}

interface Props {
  onCredential: (credential: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  shape?: 'rectangular' | 'pill';
  width?: number;
}

/**
 * Google Identity Services button. Loads the GIS script on mount, renders
 * the official Google button into a div, and hands the returned ID token
 * (credential) to the parent via onCredential.
 */
export function GoogleSignInButton({
  onCredential,
  text = 'continue_with',
  theme = 'outline',
  shape = 'pill',
  width = 320,
}: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || clientId.includes('your_google')) return;

    const existing = document.getElementById('google-identity-services');
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'google-identity-services';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const initialize = () => {
      if (!window.google?.accounts?.id || !divRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => {
          if (response?.credential) onCredential(response.credential);
        },
        auto_select: false,
      });
      window.google.accounts.id.renderButton(divRef.current, {
        type: 'standard',
        theme,
        size: 'large',
        text,
        shape,
        logo_alignment: 'left',
        width,
      });
    };

    if (window.google?.accounts?.id) {
      initialize();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initialize();
        }
      }, 100);
      const timeout = setTimeout(() => clearInterval(interval), 5000);
      return () => { clearInterval(interval); clearTimeout(timeout); };
    }
  }, [clientId, onCredential, text, theme, shape, width]);

  if (!clientId || clientId.includes('your_google')) {
    return (
      <div className="w-full p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
        <strong>Google Sign-In not configured.</strong>
        <p className="mt-1 leading-relaxed">
          Set{' '}
          <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">
            NEXT_PUBLIC_GOOGLE_CLIENT_ID
          </code>{' '}
          in{' '}
          <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">
            frontend/.env.local
          </code>{' '}
          and{' '}
          <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">
            GOOGLE_CLIENT_ID
          </code>{' '}
          in{' '}
          <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">
            backend/.env
          </code>
          , then restart both servers.
        </p>
      </div>
    );
  }

  return <div ref={divRef} className="flex justify-center" />;
}
