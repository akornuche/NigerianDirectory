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

/**
 * Slot names in the templates ("home-top-leaderboard") are not ad unit IDs.
 * AdSense needs the numeric unit ID it issues and Media.net its crid, so
 * each network gets a JSON map from slot name to unit ID, e.g.
 *   NEXT_PUBLIC_ADSENSE_SLOTS={"home-top-leaderboard":"1234567890"}
 * A slot renders only if it is mapped. This also sets ad density: map at
 * most 3 slots per page on mobile and 4-5 on desktop (REMEDIATION_PLAN.md
 * AD-5); unmapped slots render nothing.
 */
function parseSlotMap(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}
const ADSENSE_SLOTS = parseSlotMap(process.env.NEXT_PUBLIC_ADSENSE_SLOTS);
const MEDIANET_SLOTS = parseSlotMap(process.env.NEXT_PUBLIC_MEDIANET_SLOTS);

export default function AdBanner({ 
  slot, 
  size = 'rectangle', 
  className = '',
  provider = 'auto',
  label
}: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const adConfig = AD_SIZES[size];
  const adsenseUnit = GOOGLE_ADSENSE_ID ? ADSENSE_SLOTS[slot] : undefined;
  const medianetUnit = MEDIANET_CUSTOMER_ID ? MEDIANET_SLOTS[slot] : undefined;
  const useGoogle = Boolean(adsenseUnit) && (provider === 'google' || provider === 'auto');
  const useMedianet = !useGoogle && Boolean(medianetUnit) && (provider === 'medianet' || provider === 'auto');

  useEffect(() => {
    // Don't initialize ads in development
    if (IS_DEVELOPMENT) {
      return;
    }

    // Initialize only the network this slot is mapped to.
    if (useGoogle) {
      try {
        // @ts-expect-error - adsbygoogle is loaded externally
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.error('AdSense error:', error);
      }
    }

    if (useMedianet) {
      try {
        // @ts-expect-error - _mNHandle is loaded externally
        if (window._mNHandle) {
          // @ts-expect-error - _mNHandle is loaded externally
          window._mNHandle.queue.push(function() {
            // @ts-expect-error - _mNDetails is loaded externally
            window._mNDetails.loadTag(`medianet-${slot}`, adConfig.width + 'x' + adConfig.height, medianetUnit);
          });
        }
      } catch (error) {
        console.error('Media.net error:', error);
      }
    }
  }, [slot, adConfig, useGoogle, useMedianet, medianetUnit]);

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

  // Nothing renders unless this slot is mapped to a real unit ID.
  if (!useGoogle && !useMedianet) {
    return null;
  }

  return (
    <div
      ref={adRef}
      className={`ad-container w-full overflow-hidden ${adConfig.class} ${className}`}
      // Reserve the slot's height so the page does not shift when the ad loads.
      style={{ maxWidth: adConfig.width, minHeight: adConfig.height }}
    >
      {useGoogle && (
        // Responsive unit: full container width, height chosen by AdSense.
        // Fixed pixel sizes combined with data-ad-format="auto" conflicted.
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%' }}
          data-ad-client={GOOGLE_ADSENSE_ID}
          data-ad-slot={adsenseUnit}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      )}

      {useMedianet && <div id={`medianet-${slot}`} />}
    </div>
  );
}
