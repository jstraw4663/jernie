import type { Place } from '../types';
import { RestaurantCard } from './RestaurantCard';
import { ActivityCard } from './ActivityCard';
import { ScrollReveal } from './ScrollReveal';
import { getActivityDisplayGroup } from '../domain/trip';

function PlaceCard({ place, accent, onAddToItinerary }: { place: Place; accent: string; onAddToItinerary?: (place: Place) => void }) {
  return place.category === "restaurant"
    ? <RestaurantCard place={place} accent={accent} onAddToItinerary={onAddToItinerary} />
    : <ActivityCard place={place} accent={accent} onAddToItinerary={onAddToItinerary} />;
}

interface PlaceListProps {
  places: Place[];
  accent: string;
  isActivities?: boolean;
  onAddToItinerary?: (place: Place) => void;
}

export function PlaceList({ places, accent, isActivities, onAddToItinerary }: PlaceListProps) {
  // Activities with groupable categories (hikes, on-the-water) get section headers
  const hasGroups = isActivities && places.some(p => p.category === "hike" || p.subcategory === "on-the-water");

  if (!hasGroups) {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:"11px"}}>
        {places.map((p, i) => (
          <ScrollReveal key={p.id} index={i} margin="-40px">
            <PlaceCard place={p} accent={accent} onAddToItinerary={onAddToItinerary}/>
          </ScrollReveal>
        ))}
      </div>
    );
  }

  const groupOrder = ["Hikes","On the Water","Walks & Views","Nature & Culture"];
  const groupEmojis: Record<string, string> = {"Hikes":"🥾","On the Water":"⛵","Walks & Views":"🚶","Nature & Culture":"🌿"};
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
            <span style={{fontSize:"1rem"}}>{groupEmojis[g] || "📍"}</span>
            <div style={{fontWeight:"bold",color:accent,fontSize:"0.72rem",letterSpacing:"0.1em",textTransform:"uppercase"}}>{g}</div>
            <div style={{flex:1,height:"1px",background:accent+"20"}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {grouped[g].map((p, i) => (
              <ScrollReveal key={p.id} index={i} margin="-40px">
                <PlaceCard place={p} accent={accent} onAddToItinerary={onAddToItinerary}/>
              </ScrollReveal>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
