'use client';

import AdBanner from './AdBanner';

interface AdSlotProps {
  position: 'header' | 'sidebar-top' | 'sidebar-bottom' | 'in-content' | 'footer' | 'mobile';
  className?: string;
}

// Predefined ad slots with their configurations
const AD_SLOTS: Record<string, { slot: string; size: 'leaderboard' | 'rectangle' | 'skyscraper' | 'mobile-banner' | 'in-feed' }> = {
  'header': { slot: 'header-leaderboard', size: 'leaderboard' },
  'sidebar-top': { slot: 'sidebar-rectangle-1', size: 'rectangle' },
  'sidebar-bottom': { slot: 'sidebar-rectangle-2', size: 'rectangle' },
  'in-content': { slot: 'in-content-feed', size: 'in-feed' },
  'footer': { slot: 'footer-leaderboard', size: 'leaderboard' },
  'mobile': { slot: 'mobile-banner', size: 'mobile-banner' },
};

export default function AdSlot({ position, className = '' }: AdSlotProps) {
  const config = AD_SLOTS[position];
  
  if (!config) {
    return null;
  }

  return (
    <div className={`ad-slot ad-slot-${position} flex justify-center ${className}`}>
      <AdBanner slot={config.slot} size={config.size} />
    </div>
  );
}
