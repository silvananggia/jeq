import XYZ from "ol/source/XYZ";
import TileLayer from "ol/layer/Tile";

/** Preview tile (Jakarta, z=12) for basemap thumbnails */
const THUMB = { z: 12, x: 3263, y: 2118 };

export const BASEMAPS = [
  {
    id: "carto-grey",
    label: "Grey",
    attribution: "© OpenStreetMap © CARTO",
    url: "https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    thumb: `https://a.basemaps.cartocdn.com/light_all/${THUMB.z}/${THUMB.x}/${THUMB.y}.png`,
  },
  {
    id: "carto-plain",
    label: "Plain",
    attribution: "© OpenStreetMap © CARTO",
    url: "https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    thumb: `https://a.basemaps.cartocdn.com/rastertiles/voyager/${THUMB.z}/${THUMB.x}/${THUMB.y}.png`,
  },
  {
    id: "google-hybrid",
    label: "Satellite",
    attribution: "© Google",
    url: "https://mt{0-3}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    thumb: `https://mt1.google.com/vt/lyrs=y&x=${THUMB.x}&y=${THUMB.y}&z=${THUMB.z}`,
    maxZoom: 20,
  },
  {
    id: "carto-dark",
    label: "Dark",
    attribution: "© OpenStreetMap © CARTO",
    url: "https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    thumb: `https://a.basemaps.cartocdn.com/dark_all/${THUMB.z}/${THUMB.x}/${THUMB.y}.png`,
  },
];

export const DEFAULT_BASEMAP = "carto-grey";

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
