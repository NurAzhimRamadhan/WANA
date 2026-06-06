import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, Popup, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { WANA } from '@/constants/testIds/wana';

const INDONESIA_CENTER = [-2.2, 117.0];

export default function SpatialCheck() {
  const { t, lang } = useLanguage();
  const [territories, setTerritories] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await api.get('/territories');
      setTerritories(data);
    })();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-3xl sm:text-4xl tracking-tight text-wana-ink">{t('spatial.title')}</h1>
        <p className="mt-2 text-wana-soil max-w-3xl text-base leading-relaxed">{t('spatial.sub')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-wana-border rounded-md overflow-hidden h-[520px]" data-testid={WANA.spatial.map}>
          <MapContainer center={INDONESIA_CENTER} zoom={5} className="h-full w-full" scrollWheelZoom={true}>
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="OpenStreetMap">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                  maxZoom={18}
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            {territories.map((trr) => (
              <React.Fragment key={trr.id}>
                <Polygon
                  positions={trr.polygon}
                  pathOptions={{
                    color: '#4A6B53',
                    fillColor: '#4A6B53',
                    fillOpacity: 0.25,
                    weight: 2,
                  }}
                  eventHandlers={{ click: () => setActive(trr) }}
                >
                  <Tooltip sticky>{trr.name}</Tooltip>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold">{trr.name}</div>
                      <div className="text-xs text-wana-soil">{trr.community} · {trr.region}</div>
                      {trr.has_overlap && (
                        <div className="mt-1 text-[#B75D46] text-xs font-semibold">⚠ {t('spatial.legend_overlap')}</div>
                      )}
                    </div>
                  </Popup>
                </Polygon>
                {trr.has_overlap && trr.overlap_polygon && (
                  <Polygon
                    positions={trr.overlap_polygon}
                    pathOptions={{
                      color: '#B75D46',
                      fillColor: '#B75D46',
                      fillOpacity: 0.4,
                      weight: 2,
                      dashArray: '4 4',
                    }}
                  >
                    <Tooltip sticky>{trr.overlap_with}</Tooltip>
                  </Polygon>
                )}
              </React.Fragment>
            ))}
          </MapContainer>
        </div>

        <div className="space-y-5">
          <div className="glass-light rounded-2xl p-5">
            <div className="text-[11px] uppercase tracking-[0.2em] font-semibold text-wana-soil">{t('spatial.legend_title')}</div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="h-3 w-6 rounded-sm bg-wana-moss/40 border border-wana-moss" />
                <span className="text-wana-ink">{t('spatial.legend_territory')}</span>
              </div>
              <div className="flex items-center gap-3" data-testid={WANA.spatial.legendOverlap}>
                <span className="h-3 w-6 rounded-sm border-2 border-dashed border-[#B75D46] bg-[#B75D46]/30" />
                <span className="text-wana-ink">{t('spatial.legend_overlap')}</span>
              </div>
            </div>
          </div>

          <div className="glass-light rounded-2xl p-5 max-h-[480px] overflow-auto">
            <div className="text-[11px] uppercase tracking-[0.2em] font-semibold text-wana-soil mb-3">{t('spatial.territories')}</div>
            <ul className="space-y-2">
              {territories.map((trr) => (
                <li
                  key={trr.id}
                  data-testid={WANA.spatial.territoryItem(trr.id)}
                  onClick={() => setActive(trr)}
                  className={`cursor-pointer rounded-xl border p-3 transition-all duration-200 hover-lift ${
                    active?.id === trr.id ? 'border-wana-forest bg-white shadow-md' : 'border-wana-border/60 bg-white/40 hover:bg-white/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm text-wana-ink">{trr.name}</div>
                      <div className="text-xs text-wana-soil">{trr.community} · {trr.region}</div>
                    </div>
                    {trr.has_overlap ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-wana-terracotta">
                        <AlertTriangle className="h-3 w-3" /> overlap
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-wana-moss">
                        <ShieldCheck className="h-3 w-3" /> safe
                      </span>
                    )}
                  </div>
                  {trr.has_overlap && (
                    <div className="mt-2 text-xs text-wana-soil">
                      <span className="font-semibold">{t('spatial.overlap_with')}:</span> {trr.overlap_with}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {active && (
            <div className="glass-light rounded-2xl p-5 glow-forest">
              <div className="text-[11px] uppercase tracking-[0.2em] font-semibold text-wana-soil">Detail</div>
              <h3 className="mt-1 font-display font-bold text-lg text-wana-ink">{active.name}</h3>
              <p className="mt-2 text-sm text-wana-soil leading-relaxed">{lang === 'id' ? active.note_id : active.note_en}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
