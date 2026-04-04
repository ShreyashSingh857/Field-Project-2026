/**
 * useGeoJSON - Client-side GeoJSON loader for map rendering
 * 
 * Loads geometries from Supabase Storage (geo bucket) or local backend/public/geo/ for development.
 * Keeps database lean (metadata only); geometries loaded on-demand client-side.
 * 
 * Usage:
 *   const geo = useGeoJSON('state/27/district/523');  // Load Maharashtra > Pune geometry
 *   const { loading, error, feature } = geo;
 *   if (feature) renderOnMap(feature.geometry);
 * 
 * Configuration:
 *   Set VITE_GEO_STORAGE_URL in .env to use Supabase Storage bucket.
 *   If not set, defaults to local /geo/ path (development).
 */

import { useEffect, useState } from 'react';

// Get storage URL from environment, default to local geo folder
const GEO_STORAGE_URL = import.meta.env.VITE_GEO_STORAGE_URL || '/geo';

/**
 * Construct GeoJSON file path from hierarchy.
 * Supports both Supabase Storage URLs and local paths.
 * 
 * Examples:
 *   '27' -> /geo/27.geojson or {VITE_GEO_STORAGE_URL}/27.geojson
 *   '27/523' -> /geo/27/523.geojson or {VITE_GEO_STORAGE_URL}/27/523.geojson
 *   '27/523/5504' -> /geo/27/523/5504.geojson
 *   '27/523/5504/556432' -> /geo/27/523/5504/556432.geojson
 */
function buildGeometryPath(hierarchy) {
  const parts = hierarchy.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  
  let path = `${GEO_STORAGE_URL}/${parts[0]}`;
  for (let i = 1; i < parts.length; i++) {
    path += `/${parts[i]}`;
  }
  path += '.geojson';
  return path;
}

export function useGeoJSON(hierarchy) {
  const [feature, setFeature] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hierarchy) {
      setFeature(null);
      return;
    }

    const fetchGeometry = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const path = buildGeometryPath(hierarchy);
        if (!path) throw new Error('Invalid hierarchy');
        
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`Failed to load geometry: ${response.statusText}`);
        }
        
        const data = await response.json();
        setFeature(data);
      } catch (err) {
        setError(err.message);
        setFeature(null);
      } finally {
        setLoading(false);
      }
    };

    fetchGeometry();
  }, [hierarchy]);

  return { feature, loading, error };
}

/**
 * useBoundaryGeometries - Load multiple geometries at once
 * 
 * Usage:
 *   const results = useBoundaryGeometries(['27', '27/523', '27/523/5504']);
 *   results.forEach(({ path, feature, loading, error }) => {...});
 */
export function useBoundaryGeometries(hierarchies = []) {
  const [results, setResults] = useState({});
  const [allLoading, setAllLoading] = useState(false);

  useEffect(() => {
    if (!hierarchies.length) {
      setResults({});
      return;
    }

    const fetchAll = async () => {
      setAllLoading(true);
      const newResults = {};

      for (const hierarchy of hierarchies) {
        const path = buildGeometryPath(hierarchy);
        if (!path) continue;

        try {
          const response = await fetch(path);
          if (response.ok) {
            newResults[hierarchy] = {
              path,
              feature: await response.json(),
              error: null,
            };
          } else {
            newResults[hierarchy] = {
              path,
              feature: null,
              error: `HTTP ${response.status}`,
            };
          }
        } catch (err) {
          newResults[hierarchy] = {
            path,
            feature: null,
            error: err.message,
          };
        }
      }

      setResults(newResults);
      setAllLoading(false);
    };

    fetchAll();
  }, [hierarchies.length, JSON.stringify(hierarchies)]);

  return { results, allLoading };
}

/**
 * Example: Render district boundary on Leaflet map
 */
export function MapLayerExample({ stateCode, districtCode, map }) {
  const hierarchy = districtCode ? `${stateCode}/${districtCode}` : stateCode;
  const { feature, loading, error } = useGeoJSON(hierarchy);

  useEffect(() => {
    if (!feature || !map) return;

    // Add GeoJSON layer to Leaflet map
    const geoJsonLayer = L.geoJSON(feature, {
      style: {
        color: 'blue',
        weight: 2,
        opacity: 0.7,
      },
    }).addTo(map);

    // Fit bounds to geometry
    map.fitBounds(geoJsonLayer.getBounds());

    return () => {
      map.removeLayer(geoJsonLayer);
    };
  }, [feature, map]);

  if (loading) return <div>Loading geometry...</div>;
  if (error) return <div>Error: {error}</div>;
  return null;
}

export default useGeoJSON;
