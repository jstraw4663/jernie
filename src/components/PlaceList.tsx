import type React from 'react';
import type { Place, PlaceEnrichment, TrailEnrichment } from '../types';
import { RestaurantCard } from './RestaurantCard';
import { ActivityCard } from './ActivityCard';
import { ScrollReveal } from './ScrollReveal';
import { getActivityDisplayGroup } from '../domain/trip';
import { Icons, PLACE_GROUP_ICON_MAP } from '../design/icons';
import { EntryIcon } from '../design/EntryIcon';

function PlaceCard({ place, accent, enrichment, trailEnrichment, isAdded, hideNote, onAddToItinerary, onExpand }: { place: Place; accent: string; enrichment?: PlaceEnrichment; trailEnrichment?: TrailEnrichment; isAdded?: boolean; hideNote?: boolean; onAddToItinerary?: (place: Place) => void; onExpand?: (place: Place, rect: DOMRect) => void }) {
  return place.category === "restaurant"
    ? <RestaurantCard place={place} accent={accent} enrichment={enrichment} isAdded={isAdded} hideNote={hideNote} onAddToItinerary={onAddToItinerary} onExpand={onExpand} />
    : <ActivityCard place={place} accent={accent} enrichment={enrichment} trailEnrichment={trailEnrichment} isAdded={isAdded} hideNote={hideNote} onAddToItinerary={onAddToItinerary} onExpand={onExpand} />;
}

interface PlaceListProps {
  places: Place[];
  accent: string;
  enrichmentMap?: Record<string, PlaceEnrichment>;
  trailEnrichmentMap?: Record<string, TrailEnrichment>;
  isActivities?: boolean;
  addedPlaceIds?: Set<string>;
  hideNote?: boolean;
  onAddToItinerary?: (place: Place) => void;
  onExpand?: (place: Place, rect: DOMRect) => void;
  scrollRoot?: React.RefObject<Element | null>;
  revealMargin?: string;
}

export function PlaceList({ places, accent, enrichmentMap, trailEnrichmentMap, isActivities, addedPlaceIds, hideNote, onAddToItinerary, onExpand, scrollRoot, revealMargin }: PlaceListProps) {
  // Activities with groupable categories (hikes, on-the-water) get section headers
  const hasGroups = isActivities && places.some(p => p.category === "hike" || p.subcategory === "on-the-water");

  if (!hasGroups) {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:"11px"}}>
        {places.map((p, i) => (
          <ScrollReveal key={p.id} index={i} margin={revealMargin ?? "-40px"} root={scrollRoot}>
            <PlaceCard place={p} accent={accent} enrichment={enrichmentMap?.[p.id]} trailEnrichment={trailEnrichmentMap?.[p.id]} isAdded={addedPlaceIds?.has(p.id)} hideNote={hideNote} onAddToItinerary={onAddToItinerary} onExpand={onExpand}/>
          </ScrollReveal>
        ))}
      </div>
    );
  }

  const groupOrder = ["Hikes","On the Water","Walks & Views","Nature & Culture"];
  const grouped: Record<string, Place[]> = {};
  places.forEach(p => {
    const g = getActivityDisplayGroup(p);
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(p);
  });

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
      {groupOrder.filter(g => grouped[g]?.length).map(g => (
        <div key={g}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
            {(() => { const e = PLACE_GROUP_ICON_MAP[g] ?? { kind: 'component' as const, Icon: Icons.Compass, color: '#22C55E' }; return <EntryIcon entry={e} size={16} />; })()}
            <div style={{fontWeight:"bold",color:accent,fontSize:"0.72rem",letterSpacing:"0.1em",textTransform:"uppercase"}}>{g}</div>
            <div style={{flex:1,height:"1px",background:accent+"20"}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {grouped[g].map((p, i) => (
              <ScrollReveal key={p.id} index={i} margin={revealMargin ?? "-40px"} root={scrollRoot}>
                <PlaceCard place={p} accent={accent} enrichment={enrichmentMap?.[p.id]} trailEnrichment={trailEnrichmentMap?.[p.id]} isAdded={addedPlaceIds?.has(p.id)} hideNote={hideNote} onAddToItinerary={onAddToItinerary} onExpand={onExpand}/>
              </ScrollReveal>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
