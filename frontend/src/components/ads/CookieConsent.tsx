'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const COOKIE_CONSENT_KEY = 'cookie-consent';

type ConsentLevel = 'all' | 'necessary' | null;

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay to prevent flash on page load
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'all');
    setShowBanner(false);
    // Enable all tracking
    enableTracking('all');
  };

  const handleAcceptNecessary = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'necessary');
    setShowBanner(false);
    // Only necessary cookies
    enableTracking('necessary');
  };

  const enableTracking = (level: ConsentLevel) => {
    if (level === 'all') {
      // Enable Google Analytics, AdSense personalization, etc.
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          'analytics_storage': 'granted',
          'ad_storage': 'granted',
          'ad_personalization': 'granted',
          'ad_user_data': 'granted',
        });
      }
    } else {
      // Minimal consent - no personalization
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          'analytics_storage': 'denied',
          'ad_storage': 'granted', // Still show ads, just not personalized
          'ad_personalization': 'denied',
          'ad_user_data': 'denied',
        });
      }
    }
  };

  if (!showBanner) {
    return null;
  }

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white p-4 shadow-lg">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 text-sm">
            <p>
              We use cookies to enhance your experience, serve personalized ads, and analyze traffic.
              By clicking &quot;Accept All&quot;, you consent to our use of cookies.{' '}
              <Link href="/privacy/" className="underline hover:text-secondary-400">
                Privacy Policy
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowPreferences(true)}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Preferences
            </button>
            <button
              onClick={handleAcceptNecessary}
              className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Necessary Only
            </button>
            <button
              onClick={handleAcceptAll}
              className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cookie Preferences</h2>
            
            <div className="space-y-4">
              {/* Necessary Cookies */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Necessary Cookies</h3>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Always Active</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Essential for the website to function. Cannot be disabled.
                </p>
              </div>

              {/* Analytics Cookies */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Analytics Cookies</h3>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Optional</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Help us understand how visitors interact with our website.
                </p>
              </div>

              {/* Advertising Cookies */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Advertising Cookies</h3>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Optional</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Used to serve personalized advertisements relevant to you.
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  handleAcceptNecessary();
                  setShowPreferences(false);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Necessary Only
              </button>
              <button
                onClick={() => {
                  handleAcceptAll();
                  setShowPreferences(false);
                }}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
