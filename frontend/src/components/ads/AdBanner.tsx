'use client';

import { useEffect, useRef } from 'react';

type AdSize = 
  | 'leaderboard'      // 728x90 - Top of page
  | 'large-leaderboard' // 970x90 - Large top banner
  | 'rectangle'        // 300x250 - Medium rectangle
  | 'large-rectangle'  // 336x280 - Large rectangle  
  | 'skyscraper'       // 300x600 - Wide skyscraper
  | 'half-page'        // 300x600 - Half page
  | 'mobile-banner'    // 320x50 - Mobile banner
  | 'mobile-large'     // 320x100 - Large mobile banner
  | 'in-feed'          // 336x280 - In-feed native
  | 'billboard'        // 970x250 - Billboard
  | 'square'           // 250x250 - Square
  | 'small-square'     // 200x200 - Small square
  | 'vertical-banner'  // 120x240 - Vertical banner
  | 'button'           // 125x125 - Button
  | 'wide-skyscraper'; // 160x600 - Wide skyscraper

interface AdBannerProps {
  slot: string;
  size?: AdSize;
  className?: string;
  provider?: 'google' | 'medianet' | 'auto';
  label?: string;
}

const AD_SIZES: Record<AdSize, { width: number; height: number; class: string; label: string }> = {
  'leaderboard':       { width: 728, height: 90,  class: 'hidden md:flex', label: 'Leaderboard 728x90' },
  'large-leaderboard': { width: 970, height: 90,  class: 'hidden lg:flex', label: 'Large Leaderboard 970x90' },
  'rectangle':         { width: 300, height: 250, class: '', label: 'Rectangle 300x250' },
  'large-rectangle':   { width: 336, height: 280, class: '', label: 'Large Rectangle 336x280' },
  'skyscraper':        { width: 300, height: 600, class: 'hidden lg:flex', label: 'Skyscraper 300x600' },
  'half-page':         { width: 300, height: 600, class: 'hidden lg:flex', label: 'Half Page 300x600' },
  'mobile-banner':     { width: 320, height: 50,  class: 'flex md:hidden', label: 'Mobile Banner 320x50' },
  'mobile-large':      { width: 320, height: 100, class: 'flex md:hidden', label: 'Mobile Large 320x100' },
  'in-feed':           { width: 336, height: 280, class: '', label: 'In-Feed 336x280' },
  'billboard':         { width: 970, height: 250, class: 'hidden lg:flex', label: 'Billboard 970x250' },
  'square':            { width: 250, height: 250, class: '', label: 'Square 250x250' },
  'small-square':      { width: 200, height: 200, class: '', label: 'Small Square 200x200' },
  'vertical-banner':   { width: 120, height: 240, class: '', label: 'Vertical 120x240' },
  'button':            { width: 125, height: 125, class: '', label: 'Button 125x125' },
  'wide-skyscraper':   { width: 160, height: 600, class: 'hidden lg:flex', label: 'Wide Skyscraper 160x600' },
};

// Environment variables for ad network IDs
const GOOGLE_ADSENSE_ID = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID;
const MEDIANET_CUSTOMER_ID = process.env.NEXT_PUBLIC_MEDIANET_CUSTOMER_ID;
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

export default function AdBanner({ 
  slot, 
  size = 'rectangle', 
  className = '',
  provider = 'auto',
  label
}: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const adConfig = AD_SIZES[size];

  useEffect(() => {
    // Don't initialize ads in development
    if (IS_DEVELOPMENT) {
      return;
    }

    // Initialize ads based on provider
    if (provider === 'google' || provider === 'auto') {
      try {
        // @ts-expect-error - adsbygoogle is loaded externally
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.error('AdSense error:', error);
      }
    }

    if (provider === 'medianet' || provider === 'auto') {
      try {
        // @ts-expect-error - _mNHandle is loaded externally
        if (window._mNHandle) {
          // @ts-expect-error - _mNHandle is loaded externally
          window._mNHandle.queue.push(function() {
            // @ts-expect-error - _mNDetails is loaded externally
            window._mNDetails.loadTag(slot, adConfig.width + 'x' + adConfig.height, slot);
          });
        }
      } catch (error) {
        console.error('Media.net error:', error);
      }
    }
  }, [slot, provider, adConfig]);

  // Show placeholder boxes in development for visualization
  if (IS_DEVELOPMENT) {
    return (
      <div
        className={`bg-gradient-to-br from-yellow-50 to-orange-100 border-2 border-dashed border-orange-300 rounded-lg flex flex-col items-center justify-center text-orange-600 ${adConfig.class} ${className}`}
        style={{ width: adConfig.width, height: adConfig.height, maxWidth: '100%' }}
      >
        <span className="text-xs font-bold uppercase tracking-wide">Ad Space</span>
        <span className="text-sm font-semibold mt-1">{label || adConfig.label}</span>
        <span className="text-xs mt-1 opacity-60">{slot}</span>
      </div>
    );
  }

  // Don't render in production if no ad networks configured
  if (!GOOGLE_ADSENSE_ID && !MEDIANET_CUSTOMER_ID) {
    return null;
  }

  return (
    <div 
      ref={adRef}
      className={`ad-container overflow-hidden ${adConfig.class} ${className}`}
      style={{ minWidth: adConfig.width, minHeight: adConfig.height }}
    >
      {/* Google AdSense */}
      {GOOGLE_ADSENSE_ID && (provider === 'google' || provider === 'auto') && (
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: adConfig.width, height: adConfig.height }}
          data-ad-client={GOOGLE_ADSENSE_ID}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      )}

      {/* Media.net */}
      {MEDIANET_CUSTOMER_ID && (provider === 'medianet' || provider === 'auto') && !GOOGLE_ADSENSE_ID && (
        <div id={`medianet-${slot}`} />
      )}
    </div>
  );
}
