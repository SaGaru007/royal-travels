"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type LatLng = [number, number];

interface LiveMapProps {
  /** Driver's last reported position. */
  lat: number;
  lng: number;
  /** Recent positions, oldest first, drawn as a faint breadcrumb trail. */
  trail?: LatLng[];
  /** True when the last report is old enough that the dot may be misleading. */
  stale?: boolean;
}

/**
 * Small Leaflet wrapper tuned for this project:
 *
 * - Leaflet is imported inside the effect so the static build never touches
 *   `window` on the server.
 * - The marker is a `divIcon`, which avoids the classic broken-image icon that
 *   bundlers cause by moving marker-icon.png.
 * - Tiles come from OpenStreetMap, so there is no API key and no billing.
 *   Low traffic only; a paid tile provider is the upgrade path (see ADR 0008).
 */
export default function LiveMap({ lat, lng, trail = [], stale = false }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Leaflet objects are intentionally typed loosely: the module is loaded
  // asynchronously, so its types are awkward to thread through refs.
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const lineRef = useRef<import("leaflet").Polyline | null>(null);
  const followRef = useRef(true);
  const [follow, setFollow] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;

    (async () => {
      const L = await import("leaflet");
      if (disposed || !containerRef.current || mapRef.current) return;

      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([lat, lng], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      lineRef.current = L.polyline(trail.length > 1 ? trail : [], {
        color: "#b8860b",
        weight: 3,
        opacity: 0.35,
      }).addTo(map);

      markerRef.current = L.marker([lat, lng], { icon: pin(L, stale) }).addTo(map);

      // Stop auto-following as soon as the visitor pans by hand.
      map.on("dragstart", () => {
        followRef.current = false;
        setFollow(false);
      });

      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      lineRef.current = null;
    };
    // Mount-only: later props are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!ready || !L || !map || !marker) return;

    const position: LatLng = [lat, lng];
    marker.setLatLng(position);
    marker.setIcon(pin(L, stale));
    lineRef.current?.setLatLngs(trail.length > 1 ? trail : []);

    if (followRef.current) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [lat, lng, trail, stale, ready]);

  function recentre() {
    followRef.current = true;
    setFollow(true);
    mapRef.current?.setView([lat, lng], 16, { animate: true });
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full h-72 rounded-xl border border-line z-0"
        role="img"
        aria-label="Map showing the driver's last reported position"
      />
      {!follow && ready && (
        <button
          type="button"
          onClick={recentre}
          className="absolute bottom-3 right-3 z-[400] text-xs bg-white border border-line rounded-md px-3 py-1.5 shadow-sm hover:bg-cream"
        >
          Recentre on driver
        </button>
      )}
      <style jsx global>{`
        .rt-pin {
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          border: 3px solid #ffffff;
          box-shadow: 0 0 0 2px rgba(23, 20, 15, 0.25);
        }
        .rt-pin-live {
          background: #15803d;
          animation: rt-pulse 2s ease-out infinite;
        }
        .rt-pin-stale {
          background: #9ca3af;
        }
        @keyframes rt-pulse {
          0% {
            box-shadow: 0 0 0 2px rgba(21, 128, 61, 0.45);
          }
          70% {
            box-shadow: 0 0 0 14px rgba(21, 128, 61, 0);
          }
          100% {
            box-shadow: 0 0 0 2px rgba(21, 128, 61, 0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .rt-pin-live {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

function pin(L: typeof import("leaflet"), stale: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="rt-pin ${stale ? "rt-pin-stale" : "rt-pin-live"}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}
