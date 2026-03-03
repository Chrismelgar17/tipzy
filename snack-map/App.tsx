/**
 * TIPZY MAP — Expo Snack Demo
 * ────────────────────────────────────────────────────────────────────────────
 * How to use:
 *  1. Go to https://snack.expo.dev
 *  2. Delete the default App.js content
 *  3. Paste this entire file
 *  4. In the left panel under "Dependencies" add:
 *       expo-location
 *       react-native-webview
 *  5. Run on iOS / Android device via the Expo Go app, or in the web preview
 *
 * Features:
 *  • Ultra-dark CartoDB map (matches Tipzy's dark theme)
 *  • 5 mock Miami nightlife venues with crowd-count colour markers
 *  • Tap a marker → info card slides up with photo, crowd status & description
 *  • Auto-zooms to your real location when granted
 *  • Purple recenter button (bottom-left)
 * ────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';

// ─── Mock venue data (Miami nightlife) ───────────────────────────────────────
const VENUES = [
  {
    id: '1',
    name: 'Club Neon',
    address: '1235 Washington Ave, Miami Beach',
    crowdCount: 120,
    geo: { lat: 25.782, lng: -80.1305 },
    description: "Miami's hottest nightclub with live DJ sets and neon-lit dancefloors every weekend.",
    cover: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=600',
  },
  {
    id: '2',
    name: 'Skybar',
    address: '1901 Collins Ave, Miami Beach',
    crowdCount: 73,
    geo: { lat: 25.7956, lng: -80.1299 },
    description: 'Rooftop bar with panoramic views of the Miami skyline and Biscayne Bay.',
    cover: 'https://images.unsplash.com/photo-1510076857177-7470076d4098?w=600',
  },
  {
    id: '3',
    name: 'The Velvet Room',
    address: '2301 Collins Ave, Miami Beach',
    crowdCount: 35,
    geo: { lat: 25.8052, lng: -80.1286 },
    description: 'Intimate lounge with craft cocktails, velvet booths, and smooth jazz vibes.',
    cover: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600',
  },
  {
    id: '4',
    name: 'Pulse',
    address: '700 Alton Rd, Miami Beach',
    crowdCount: 88,
    geo: { lat: 25.7751, lng: -80.1399 },
    description: 'Underground electronic music venue hosting world-class international DJs.',
    cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600',
  },
  {
    id: '5',
    name: 'Golden Hour',
    address: '1500 Ocean Dr, Miami Beach',
    crowdCount: 55,
    geo: { lat: 25.7856, lng: -80.1293 },
    description: 'Beachfront bar famous for legendary sunset cocktails and ocean breezes.',
    cover: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600',
  },
];

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg:     '#0B0B0F',
  card:   '#16161E',
  border: '#2A2A3E',
  purple: '#7C3AED',
  text:   '#FFFFFF',
  muted:  '#9CA3AF',
  green:  '#6BCF7F',
  yellow: '#FFD93D',
  red:    '#FF6B6B',
};

const crowdColor = (n: number) => n >= 100 ? T.red   : n >= 50 ? T.yellow : T.green;
const crowdLabel = (n: number) => n >= 100 ? 'Packed': n >= 50 ? 'Busy'   : 'Quiet';

// ─── Leaflet HTML (injected into WebView) ────────────────────────────────────
// Uses CartoDB Dark Matter tiles — same ultra-dark aesthetic as the Tipzy app.
// Communication: RN → WebView via postMessage({ t: 'v'|'l'|'r', ... })
//                WebView → RN via window.ReactNativeWebView.postMessage(...)
const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body, #map { width:100%; height:100%; background:#0B0B0F; }
  .leaflet-control-attribution { display:none; }
  .leaflet-control-zoom a {
    background:#16161E !important; color:#7C3AED !important;
    border-color:#2A2A3E !important; font-weight:700;
  }
  .leaflet-control-zoom a:hover { background:#2A2A3E !important; color:#fff !important; }
</style>
</head>
<body>
<div id="map"></div>
<script>
var map = L.map('map', { zoomControl:false }).setView([25.79, -80.13], 13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(map);
L.control.zoom({ position:'bottomright' }).addTo(map);

var userMarker = null;

function addVenues(venues) {
  venues.forEach(function(v) {
    var c = v.crowdCount >= 100 ? '#FF6B6B' : v.crowdCount >= 50 ? '#FFD93D' : '#6BCF7F';
    var n = v.crowdCount >= 100 ? '99+' : String(v.crowdCount);
    var h = '<div style="width:34px;height:34px;border-radius:50%;background:' + c +
      ';border:2.5px solid rgba(255,255,255,0.9);display:flex;align-items:center;' +
      'justify-content:center;font-size:10px;font-weight:700;color:#fff;font-family:sans-serif;' +
      'box-shadow:0 2px 10px rgba(0,0,0,0.6),0 0 12px ' + c + '66">' + n + '</div>';
    var icon = L.divIcon({ html:h, className:'', iconSize:[34,34], iconAnchor:[17,17] });
    var m = L.marker([v.geo.lat, v.geo.lng], { icon:icon }).addTo(map);
    (function(venue) {
      m.on('click', function() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type:'vp', venue:venue }));
        }
      });
    })(v);
  });
}

function setUserLocation(lat, lng) {
  if (userMarker) map.removeLayer(userMarker);

  var style = '<style>'
    + '@keyframes tp{0%{transform:scale(1);opacity:.55}80%{transform:scale(2.8);opacity:0}100%{transform:scale(2.8);opacity:0}}'
    + '.tpr{position:absolute;inset:0;border-radius:50%;border:1.5px solid rgba(192,38,211,.6);animation:tp 2s ease-out infinite}'
    + '</style>';

  // Clean martini glass path:
  // M5,8 L43,8 → rim (top horizontal)
  // L24,34     → right wall down to bowl point
  // L5,8       → left wall back up (closes the V)
  // M24,34 L24,43  → stem straight down
  // M16,43 L32,43  → base
  // Straw: (13,8) → (20,28)  diagonal going into bowl
  // Lemon: circle centered on right rim (41,8) r=6, with cross lines
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="40" height="40">'
    + '<defs><filter id="ng"><feGaussianBlur stdDeviation="1.6" result="b"/>'
    + '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
    + '<path d="M5,8 L43,8 L24,34 L5,8 M24,34 L24,43 M16,43 L32,43"'
    + ' stroke="#c026d3" stroke-width="2.2" fill="none"'
    + ' stroke-linecap="round" stroke-linejoin="round" filter="url(#ng)"/>'
    + '<line x1="13" y1="8" x2="20" y2="28"'
    + ' stroke="#e879f9" stroke-width="2" stroke-linecap="round" filter="url(#ng)"/>'
    + '<circle cx="41" cy="8" r="6"'
    + ' stroke="#e879f9" stroke-width="1.8" fill="none" filter="url(#ng)"/>'
    + '<line x1="41" y1="2" x2="41" y2="14" stroke="#e879f9" stroke-width="1" opacity="0.7"/>'
    + '<line x1="35" y1="8" x2="47" y2="8" stroke="#e879f9" stroke-width="1" opacity="0.7"/>'
    + '</svg>';

  var h = style
    + '<div style="position:relative;width:60px;height:60px;display:flex;align-items:center;justify-content:center;">'
    + '<div class="tpr"></div>'
    + '<div style="width:52px;height:52px;border-radius:50%;background:#0B0B0F;'
    + 'border:2px solid rgba(192,38,211,.85);display:flex;align-items:center;justify-content:center;'
    + 'box-shadow:0 0 16px rgba(192,38,211,.5),inset 0 0 10px rgba(192,38,211,.08);">'
    + svg
    + '</div></div>';

  var icon = L.divIcon({ html:h, className:'', iconSize:[60,60], iconAnchor:[30,30] });
  userMarker = L.marker([lat, lng], { icon:icon, zIndexOffset:1000 }).addTo(map);
  map.flyTo([lat, lng], 15, { animate:true, duration:1.2 });
}

function recenter() {
  if (userMarker) map.flyTo(userMarker.getLatLng(), 15, { animate:true, duration:0.8 });
}

function handleMsg(e) {
  try {
    var d = JSON.parse(e.data);
    if (d.t === 'v') addVenues(d.d);
    if (d.t === 'l') setUserLocation(d.lat, d.lng);
    if (d.t === 'r') recenter();
  } catch(x) {}
}
document.addEventListener('message', handleMsg);
window.addEventListener('message', handleMsg);
</script>
</body>
</html>`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Venue {
  id: string;
  name: string;
  address: string;
  crowdCount: number;
  geo: { lat: number; lng: number };
  description: string;
  cover: string;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const wvRef    = useRef(null);
  const loadedRef = useRef(false);
  const locRef   = useRef(null);
  const [selected, setSelected] = useState<Venue | null>(null);

  /** Thin wrapper so we never have to null-check everywhere */
  const send = useCallback((data: object) => {
    wvRef.current?.postMessage(JSON.stringify(data));
  }, []);

  /** Request location once on mount */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      locRef.current = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      // If the WebView is already loaded, send immediately; otherwise onLoad will pick it up.
      if (loadedRef.current) {
        send({ t: 'l', lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, [send]);

  /** Called once the WebView HTML finishes loading */
  const onLoad = useCallback(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    send({ t: 'v', d: VENUES });
    if (locRef.current) {
      send({ t: 'l', lat: locRef.current.latitude, lng: locRef.current.longitude });
    }
  }, [send]);

  /** Receive venue-tap events from the Leaflet map */
  const onMessage = useCallback((event: any) => {
    try {
      const d = JSON.parse(event.nativeEvent.data);
      if (d.type === 'vp') setSelected(d.venue);
    } catch {}
  }, []);

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <WebView
        ref={wvRef}
        source={{ html: MAP_HTML }}
        style={s.map}
        onLoadEnd={onLoad}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
      />

      {/* ── Header pill ──────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>🍸 Tipzy Map</Text>
        <View style={s.legend}>
          <View style={[s.dot, { backgroundColor: T.green  }]} />
          <Text style={s.lText}>Quiet</Text>
          <View style={[s.dot, { backgroundColor: T.yellow }]} />
          <Text style={s.lText}>Busy</Text>
          <View style={[s.dot, { backgroundColor: T.red    }]} />
          <Text style={s.lText}>Packed</Text>
        </View>
      </View>

      {/* ── Recenter button ───────────────────────────────────────────────── */}
      <TouchableOpacity
        style={s.recenter}
        onPress={() => send({ t: 'r' })}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 20 }}>📍</Text>
      </TouchableOpacity>

      {/* ── Venue info card ───────────────────────────────────────────────── */}
      {selected && (
        <View style={s.card}>
          <TouchableOpacity style={s.closeBtn} onPress={() => setSelected(null)}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>

          <Image source={{ uri: selected.cover }} style={s.cardImg} />

          <View style={s.cardBody}>
            <Text style={s.cardName}>{selected.name}</Text>
            <Text style={s.cardAddr}>{selected.address}</Text>

            <View style={s.crowdRow}>
              <View style={[s.crowdDot, { backgroundColor: crowdColor(selected.crowdCount) }]} />
              <Text style={[s.crowdTxt, { color: crowdColor(selected.crowdCount) }]}>
                {crowdLabel(selected.crowdCount)} · {selected.crowdCount} people
              </Text>
            </View>

            <Text style={s.cardDesc} numberOfLines={2}>{selected.description}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  map:  { flex: 1 },

  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 38,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(22,22,30,0.93)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: { color: T.text, fontSize: 15, fontWeight: '700' },
  legend: { flexDirection: 'row', alignItems: 'center' },
  dot:    { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  lText:  { color: T.muted, fontSize: 10, marginRight: 8 },

  recenter: {
    position: 'absolute',
    bottom: 160,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(22,22,30,0.93)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: T.purple,
    shadowColor: T.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },

  card: {
    position: 'absolute',
    bottom: 28,
    left: 14,
    right: 14,
    backgroundColor: T.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { color: T.text, fontSize: 13, fontWeight: '700' },
  cardImg:   { width: '100%', height: 115 },
  cardBody:  { padding: 14 },
  cardName:  { color: T.text, fontSize: 17, fontWeight: '700', marginBottom: 3 },
  cardAddr:  { color: T.muted, fontSize: 12, marginBottom: 8 },
  crowdRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  crowdDot:  { width: 9, height: 9, borderRadius: 5, marginRight: 6 },
  crowdTxt:  { fontSize: 13, fontWeight: '600' },
  cardDesc:  { color: T.muted, fontSize: 12, lineHeight: 18 },
});
