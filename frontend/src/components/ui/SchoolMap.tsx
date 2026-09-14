'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
    interface Window {
        google: any;
        __initGoogleMap: () => void;
    }
}
const google = (typeof window !== 'undefined' ? (window as any).google : undefined) as any;

import { useEffect, useRef, useState } from 'react';

interface SchoolMapProps {
    latitude?: number;
    longitude?: number;
    schoolName: string;
    address?: string;
    className?: string;
    height?: string;
}

/**
 * Google Maps component for school detail pages
 * Falls back to a placeholder if no coordinates or API key is available
 */
export default function SchoolMap({
    latitude,
    longitude,
    schoolName,
    address,
    className = '',
    height = '300px',
}: SchoolMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState(false);

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const hasCoordinates = latitude && longitude;

    useEffect(() => {
        if (!hasCoordinates || !apiKey || !mapRef.current) {
            return;
        }

        // Check if Google Maps script is already loaded
        if (window.google?.maps) {
            initMap();
            return;
        }

        // Load Google Maps script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__initGoogleMap`;
        script.async = true;
        script.defer = true;

        // Global callback
        (window as any).__initGoogleMap = () => {
            initMap();
            delete (window as any).__initGoogleMap;
        };

        script.onerror = () => {
            setError(true);
        };

        document.head.appendChild(script);

        return () => {
            delete (window as any).__initGoogleMap;
        };
    }, [hasCoordinates, apiKey]);

    function initMap() {
        if (!mapRef.current || !latitude || !longitude) return;

        try {
            const position = { lat: latitude, lng: longitude };

            const map = new google.maps.Map(mapRef.current, {
                center: position,
                zoom: 15,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
                zoomControl: true,
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }],
                    },
                ],
            });

            new google.maps.Marker({
                position,
                map,
                title: schoolName,
                animation: google.maps.Animation.DROP,
            });

            // Info window
            const infoWindow = new google.maps.InfoWindow({
                content: `
          <div style="padding: 8px; max-width: 200px;">
            <strong style="font-size: 14px; color: #1D4ED8;">${schoolName}</strong>
            ${address ? `<p style="margin: 4px 0 0; font-size: 12px; color: #6B7280;">${address}</p>` : ''}
          </div>
        `,
            });

            // Show on click
            map.addListener('click', () => infoWindow.close());
        } catch {
            setError(true);
        }
    }

    // No coordinates — show placeholder
    if (!hasCoordinates) {
        return (
            <div
                className={`rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center ${className}`}
                style={{ height }}
            >
                <div className="text-center text-gray-400 px-4">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm">Map location not available</p>
                    {address && <p className="text-xs mt-1">{address}</p>}
                </div>
            </div>
        );
    }

    // No API key — show static map link
    if (!apiKey) {
        return (
            <a
                href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`block rounded-lg overflow-hidden bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center ${className}`}
                style={{ height }}
            >
                <div className="text-center text-blue-600 px-4">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm font-medium">View on Google Maps →</p>
                    {address && <p className="text-xs mt-1 text-blue-500">{address}</p>}
                </div>
            </a>
        );
    }

    // Error state
    if (error) {
        return (
            <div
                className={`rounded-lg overflow-hidden bg-red-50 flex items-center justify-center ${className}`}
                style={{ height }}
            >
                <div className="text-center text-red-400 px-4">
                    <p className="text-sm">Unable to load map</p>
                    <a
                        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                    >
                        Open in Google Maps →
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={mapRef}
            className={`rounded-lg overflow-hidden ${className}`}
            style={{ height }}
        />
    );
}
