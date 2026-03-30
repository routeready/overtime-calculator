"use client";

import { useEffect, useRef, useState } from "react";

interface MapPinPickerProps {
  initialLat?: number;
  initialLng?: number;
  onPinChange: (lat: number, lng: number) => void;
}

export function MapPinPicker({
  initialLat = 39.8283,
  initialLng = -98.5795,
  onPinChange,
}: MapPinPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("NEXT_PUBLIC_MAPBOX_TOKEN is not set");
      return;
    }

    async function initMap() {
      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");

      mapboxgl.accessToken = token!;

      // Try to get user location
      let startLat = initialLat;
      let startLng = initialLng;
      let startZoom = 4;

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
          })
        );
        startLat = pos.coords.latitude;
        startLng = pos.coords.longitude;
        startZoom = 15;
      } catch {
        // Fall back to US center
      }

      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [startLng, startLat],
        zoom: startZoom,
      });

      const marker = new mapboxgl.Marker({ draggable: true, color: "#16a34a" })
        .setLngLat([startLng, startLat])
        .addTo(map);

      if (startZoom === 15) {
        onPinChange(startLat, startLng);
      }

      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        onPinChange(lngLat.lat, lngLat.lng);
      });

      map.on("click", (e) => {
        marker.setLngLat(e.lngLat);
        onPinChange(e.lngLat.lat, e.lngLat.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
      setLoaded(true);
    }

    initMap();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [initialLat, initialLng, onPinChange]);

  return (
    <div className="relative">
      <div ref={mapContainer} className="h-64 w-full rounded-[var(--radius)] border border-border" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius)] bg-muted">
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        Tap the map or drag the pin to set your location.
      </p>
    </div>
  );
}
