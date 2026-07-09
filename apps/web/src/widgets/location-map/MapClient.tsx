"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LocationMapConfig } from "./schema";

// Custom navy pin so the map matches the board identity instead of the
// default Leaflet blue marker (whose PNG assets also 404 under bundlers).
const pin = L.divIcon({
  className: "w-map__pin-wrap",
  html: `<span class="w-map__pin"></span>`,
  iconSize: [26, 26],
  iconAnchor: [13, 24],
});

export default function MapClient({ config }: { config: LocationMapConfig }) {
  return (
    <MapContainer
      className="w-map__canvas"
      center={[config.lat, config.lng]}
      zoom={config.zoom}
      zoomControl={false}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      attributionControl={false}
      keyboard={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[config.lat, config.lng]} icon={pin} />
    </MapContainer>
  );
}
