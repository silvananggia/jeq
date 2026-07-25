import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style";
import Overlay from "ol/Overlay";
import { historyMmi, mmiColor, mmiLabel } from "../utils/mmi";
import { createBasemapLayer, DEFAULT_BASEMAP } from "../utils/basemaps";
import "ol/ol.css";

function magnitudeColor(mag) {
  if (mag >= 6) return "#e85d04";
  if (mag >= 5) return "#f48c06";
  if (mag >= 4) return "#faa307";
  if (mag >= 3) return "#ffba08";
  return "#48cae4";
}

function magnitudeRadius(mag) {
  return Math.max(6, Math.min(22, Number(mag) * 3.2));
}

function quakeStyle(feature) {
  const mag = Number(feature.get("magnitude") || 0);
  return new Style({
    image: new CircleStyle({
      radius: magnitudeRadius(mag),
      fill: new Fill({ color: `${magnitudeColor(mag)}cc` }),
      stroke: new Stroke({ color: "#0b1c24", width: 1.5 }),
    }),
    text:
      mag >= 4.5
        ? new Text({
            text: mag.toFixed(1),
            font: "600 11px IBM Plex Sans, sans-serif",
            fill: new Fill({ color: "#0b1c24" }),
            offsetY: 1,
          })
        : undefined,
  });
}

function deviceStyle(feature, selectedDeviceId) {
  const selected = selectedDeviceId != null && feature.get("id") === selectedDeviceId;
  const color = mmiColor(feature.get("mmi"));
  return new Style({
    image: new CircleStyle({
      radius: selected ? 12 : 9,
      fill: new Fill({ color }),
      stroke: new Stroke({
        color: selected ? "#fff8f0" : "#0b1c24",
        width: selected ? 3 : 2,
      }),
    }),
    text: new Text({
      text: mmiLabel(feature.get("mmi")),
      font: "700 10px IBM Plex Sans, sans-serif",
      fill: new Fill({ color: "#0b1c24" }),
      offsetY: 1,
    }),
  });
}

function devicePopupHtml(feature) {
  const mmi = feature.get("mmi");
  const when = feature.get("mmi_at");
  return `
    <strong>Sensor ${feature.get("dev_id")}</strong>
    <p>${feature.get("location") || "Sensor Gempa"}</p>
    <small>MMI ${mmiLabel(mmi)}${when ? ` · ${new Date(when).toLocaleString("id-ID")}` : ""}${feature.get("ip") ? ` · ${feature.get("ip")}` : ""}</small>
  `;
}

export default function MapView({
  earthquakes = [],
  devices = [],
  latestByDevice = new Map(),
  selectedId,
  selectedDeviceId,
  basemap = DEFAULT_BASEMAP,
  onSelectQuake,
  onSelectDevice,
}) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const basemapLayer = useRef(null);
  const quakeSource = useRef(null);
  const deviceSource = useRef(null);
  const deviceLayer = useRef(null);
  const popupRef = useRef(null);
  const overlayRef = useRef(null);
  const callbacks = useRef({ onSelectQuake, onSelectDevice });

  useEffect(() => {
    callbacks.current = { onSelectQuake, onSelectDevice };
  }, [onSelectQuake, onSelectDevice]);

  useEffect(() => {
    if (mapObj.current) return;

    quakeSource.current = new VectorSource();
    deviceSource.current = new VectorSource();

    const popupEl = document.createElement("div");
    popupEl.className = "ol-popup";
    popupRef.current = popupEl;

    const overlay = new Overlay({
      element: popupEl,
      autoPan: { animation: { duration: 250 } },
      offset: [0, -12],
    });
    overlayRef.current = overlay;

    deviceLayer.current = new VectorLayer({
      source: deviceSource.current,
      style: (feature) => deviceStyle(feature, null),
      zIndex: 5,
    });

    basemapLayer.current = createBasemapLayer(basemap);

    const map = new Map({
      target: mapRef.current,
      layers: [
        basemapLayer.current,
        deviceLayer.current,
        new VectorLayer({
          source: quakeSource.current,
          style: quakeStyle,
          zIndex: 10,
        }),
      ],
      overlays: [overlay],
      view: new View({
        center: fromLonLat([118, -2]),
        zoom: 5,
        minZoom: 4,
        maxZoom: 18,
      }),
    });

    map.on("pointermove", (evt) => {
      const hit = map.hasFeatureAtPixel(evt.pixel);
      map.getTargetElement().style.cursor = hit ? "pointer" : "";
    });

    map.on("singleclick", (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);
      if (!feature) {
        overlay.setPosition(undefined);
        return;
      }

      const kind = feature.get("kind");
      if (kind === "quake") {
        popupEl.innerHTML = `
          <strong>M ${Number(feature.get("magnitude")).toFixed(1)}</strong>
          <p>${feature.get("location")}</p>
          <small>${new Date(feature.get("datetime")).toLocaleString("id-ID")} · ${feature.get("depth_km")} km</small>
        `;
        overlay.setPosition(evt.coordinate);
        callbacks.current.onSelectQuake?.({
          id: feature.get("id"),
          magnitude: feature.get("magnitude"),
          location: feature.get("location"),
          datetime: feature.get("datetime"),
          depth_km: feature.get("depth_km"),
        });
      } else {
        const device = {
          id: feature.get("id"),
          dev_id: feature.get("dev_id"),
          location: feature.get("location"),
          user_name: feature.get("user_name"),
          user_id: feature.get("user_id"),
          ip: feature.get("ip"),
          latitude: feature.get("latitude"),
          longitude: feature.get("longitude"),
          detail: feature.get("detail"),
        };
        popupEl.innerHTML = devicePopupHtml(feature);
        overlay.setPosition(evt.coordinate);
        callbacks.current.onSelectDevice?.(device);
      }
    });

    mapObj.current = map;

    return () => {
      map.setTarget(null);
      mapObj.current = null;
      basemapLayer.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapObj.current) return;
    const next = createBasemapLayer(basemap);
    const layers = mapObj.current.getLayers();
    if (basemapLayer.current) {
      const idx = layers.getArray().indexOf(basemapLayer.current);
      if (idx >= 0) layers.setAt(idx, next);
      else layers.insertAt(0, next);
    } else {
      layers.insertAt(0, next);
    }
    basemapLayer.current = next;
  }, [basemap]);

  useEffect(() => {
    if (!quakeSource.current) return;
    quakeSource.current.clear();

    const features = earthquakes
      .filter((eq) => eq.longitude != null && eq.latitude != null)
      .map((eq) => {
        const f = new Feature({
          geometry: new Point(
            fromLonLat([Number(eq.longitude), Number(eq.latitude)])
          ),
          kind: "quake",
          ...eq,
        });
        f.setId(`quake-${eq.id}`);
        return f;
      });

    quakeSource.current.addFeatures(features);
  }, [earthquakes]);

  useEffect(() => {
    if (!deviceSource.current) return;
    deviceSource.current.clear();

    const features = devices
      .filter((d) => d.longitude != null && d.latitude != null)
      .map((d) => {
        const latest =
          latestByDevice.get(d.id) || latestByDevice.get(d.dev_id);
        const f = new Feature({
          geometry: new Point(
            fromLonLat([Number(d.longitude), Number(d.latitude)])
          ),
          kind: "device",
          mmi: historyMmi(latest),
          mmi_at: latest?.datetime ?? null,
          ...d,
        });
        f.setId(`device-${d.id}`);
        return f;
      });

    deviceSource.current.addFeatures(features);
  }, [devices, latestByDevice]);

  useEffect(() => {
    if (!deviceLayer.current) return;
    deviceLayer.current.setStyle((feature) =>
      deviceStyle(feature, selectedDeviceId)
    );
  }, [selectedDeviceId, devices, latestByDevice]);

  useEffect(() => {
    if (!mapObj.current || !selectedId || !quakeSource.current) return;
    const feature = quakeSource.current.getFeatureById(`quake-${selectedId}`);
    if (!feature) return;

    const coord = feature.getGeometry().getCoordinates();
    mapObj.current.getView().animate({ center: coord, zoom: 7, duration: 500 });

    if (overlayRef.current && popupRef.current) {
      popupRef.current.innerHTML = `
        <strong>M ${Number(feature.get("magnitude")).toFixed(1)}</strong>
        <p>${feature.get("location")}</p>
        <small>${new Date(feature.get("datetime")).toLocaleString("id-ID")} · ${feature.get("depth_km")} km</small>
      `;
      overlayRef.current.setPosition(coord);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!mapObj.current || !selectedDeviceId || !deviceSource.current) return;
    const feature = deviceSource.current.getFeatureById(`device-${selectedDeviceId}`);
    if (!feature) return;

    const coord = feature.getGeometry().getCoordinates();
    mapObj.current.getView().animate({ center: coord, zoom: 10, duration: 500 });

    if (overlayRef.current && popupRef.current) {
      popupRef.current.innerHTML = devicePopupHtml(feature);
      overlayRef.current.setPosition(coord);
    }
  }, [selectedDeviceId]);

  return <div className="map-canvas" ref={mapRef} />;
}
