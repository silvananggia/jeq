import XYZ from "ol/source/XYZ";
import TileLayer from "ol/layer/Tile";

/** Preview tile (Jakarta, z=12) for basemap thumbnails */
const THUMB = { z: 12, x: 3263, y: 2118 };

export const BASEMAPS = [
  {
    id: "osm-standard",
    label: "Standard",
    attribution: "© OpenStreetMap contributors",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    thumb: `https://tile.openstreetmap.org/${THUMB.z}/${THUMB.x}/${THUMB.y}.png`,
  },
  {
    id: "osm-hot",
    label: "Humanitarian",
    attribution: "© OpenStreetMap contributors · HOT",
    url: "https://{a-c}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    thumb: `https://a.tile.openstreetmap.fr/hot/${THUMB.z}/${THUMB.x}/${THUMB.y}.png`,
  },
  {
    id: "opentopomap",
    label: "Terrain",
    attribution: "© OpenStreetMap · SRTM · OpenTopoMap",
    url: "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png",
    thumb: `https://a.tile.opentopomap.org/${THUMB.z}/${THUMB.x}/${THUMB.y}.png`,
    maxZoom: 17,
  },
  {
    id: "google-hybrid",
    label: "Satellite",
    attribution: "© Google",
    url: "https://mt{0-3}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    thumb: `https://mt1.google.com/vt/lyrs=y&x=${THUMB.x}&y=${THUMB.y}&z=${THUMB.z}`,
    maxZoom: 20,
  },
];

export const DEFAULT_BASEMAP = "osm-standard";

export function createBasemapLayer(basemapId = DEFAULT_BASEMAP) {
  const cfg = BASEMAPS.find((b) => b.id === basemapId) || BASEMAPS[0];
  return new TileLayer({
    source: new XYZ({
      url: cfg.url,
      attributions: cfg.attribution,
      maxZoom: cfg.maxZoom || 19,
      crossOrigin: "anonymous",
    }),
    zIndex: 0,
    properties: { basemapId: cfg.id },
  });
}
