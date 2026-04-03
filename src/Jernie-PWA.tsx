// @ts-nocheck — types deferred; will be added during CSS/architecture refactor (phase:foundation)
import { useState, useEffect, useMemo } from "react";
import { useTripData } from "./hooks/useTripData";
import type { Booking, Group, Place, Stop, TripData } from "./types";

const WMO: Record<number,{e:string,d:string}> = {
  0:{e:"☀️",d:"Clear"},1:{e:"🌤️",d:"Mostly Clear"},2:{e:"⛅",d:"Partly Cloudy"},3:{e:"☁️",d:"Overcast"},
  45:{e:"🌫️",d:"Foggy"},48:{e:"🌫️",d:"Foggy"},51:{e:"🌦️",d:"Drizzle"},53:{e:"🌦️",d:"Drizzle"},
  55:{e:"🌧️",d:"Rain"},61:{e:"🌧️",d:"Light Rain"},63:{e:"🌧️",d:"Rain"},65:{e:"🌧️",d:"Heavy Rain"},
  71:{e:"🌨️",d:"Snow"},73:{e:"🌨️",d:"Snow"},75:{e:"❄️",d:"Heavy Snow"},80:{e:"🌦️",d:"Showers"},
  81:{e:"🌧️",d:"Showers"},82:{e:"⛈️",d:"Storms"},95:{e:"⛈️",d:"Thunderstorm"},99:{e:"⛈️",d:"Severe Storm"}
};
const wmo = (c:number) => WMO[c] || {e:"🌡️",d:"—"};
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const appleMaps = (addr:string) => "https://maps.apple.com/?q=" + encodeURIComponent(addr);

// ── Countdown ─────────────────────────────────────────────────

function useCountdown(departure: Date | null) {
  const calc = () => {
    if (!departure) return null;
    const diff = departure.getTime() - Date.now();
    if (diff <= 0) return null;
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins: Math.floor((diff % 3600000) / 60000),
      secs: Math.floor((diff % 60000) / 1000),
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [departure]);
  return t;
}

// ── Cache Utilities ───────────────────────────────────────────

function readCache(key) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, cachedAt: Date.now() })); }
  catch {}
}

// ── Flight Utilities ──────────────────────────────────────────

function deriveFlightGroups(bookings: Booking[]) {
  const groups: Record<string,any> = {};
  bookings.filter(b => b.type === "flight" && b.flights).forEach(b => {
    b.flights!.forEach(f => {
      const dateKey = new Date(f.date).toISOString().split("T")[0];
      if (!groups[dateKey]) groups[dateKey] = { dateKey, flights: [] };
      if (!groups[dateKey].flights.find((x:any) => x.key === f.key)) {
        groups[dateKey].flights.push({
          key: f.key,
          flight: f.airline + " " + f.num.replace(" ",""),
          route: f.route,
          date: f.date,
          schedDep: f.dep,
          schedArr: f.arr,
        });
      }
    });
  });
  return groups;
}

function isWithinFlightWindow(dateKey: string, flights: any[]) {
  let earliest = Infinity;
  flights.forEach(f => {
    const t = Date.parse(dateKey + " " + f.schedDep);
    if (!isNaN(t) && t < earliest) earliest = t;
  });
  if (!isFinite(earliest)) return false;
  const now = Date.now();
  return now >= earliest - 48 * 3600000 && now <= earliest + 24 * 3600000;
}

async function fetchWeatherForStop(s: Stop) {
  const key = "jernie_weather_" + s.id;
  const cached = readCache(key);
  if (cached && (Date.now() - cached.cachedAt) < 3 * 3600000) {
    return { data: cached.data, fromCache: true };
  }
  if (!navigator.onLine) {
    return cached ? { data: cached.data, fromCache: true } : null;
  }
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + s.lat + "&longitude=" + s.lon + "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&temperature_unit=fahrenheit&timezone=America%2FNew_York&start_date=" + s.weather_start + "&end_date=" + s.weather_end;
    const r = await fetch(url);
    const d = await r.json();
    if (d.error || !d.daily?.time?.length) return cached ? { data: cached.data, fromCache: true } : null;
    writeCache(key, d.daily);
    return { data: d.daily, fromCache: false };
  } catch {
    return cached ? { data: cached.data, fromCache: true } : null;
  }
}

async function fetchFlightStatusGroupWithData(
  dateKey: string,
  flights: any[],
  setStatus: (fn: (prev: Record<string,any>) => Record<string,any>) => void,
  setLoading: (b: boolean) => void,
  setLastUpdated: (fn: (prev: Record<string,any>) => Record<string,any>) => void
) {
  setLoading(true);
  const cacheKey = "jernie_flights_" + dateKey;

  if (!navigator.onLine) {
    const cached = readCache(cacheKey);
    if (cached) setStatus(prev => ({ ...prev, ...cached.data }));
    setLastUpdated(prev => ({ ...prev, [dateKey]: cached ? new Date(cached.cachedAt) : new Date() }));
    setLoading(false);
    return;
  }

  const sysPrompt = "You are a flight status assistant. Search for the current real-time status of each flight. Return ONLY a valid JSON array with no markdown, no backticks, no explanation. Each element must include: {\"key\":\"\",\"status\":\"On Time|Delayed|Cancelled|Scheduled\",\"actualDep\":\"\",\"actualArr\":\"\",\"gate\":\"\",\"terminal\":\"\",\"delayMin\":0}. If real-time data is unavailable use status Scheduled and empty strings for actual times.";
  const userMsg = "Get current status for these flights and return a JSON array only: " + JSON.stringify(flights);

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"claude-sonnet-4-20250514", max_tokens:1000,
        tools:[{type:"web_search_20250305",name:"web_search"}],
        system:sysPrompt,
        messages:[{role:"user",content:userMsg}]
      })
    });
    const data = await resp.json();
    const txt = (data.content||[]).filter((b:any)=>b.type==="text").map((b:any)=>b.text).join("");
    const arr = JSON.parse(txt.replace(/```json|```/g,"").trim());
    const map: Record<string,any> = {};
    arr.forEach((f:any) => { map[f.key] = f; });
    writeCache(cacheKey, map);
    setStatus(prev => ({ ...prev, ...map }));
  } catch {
    const cached = readCache(cacheKey);
    if (cached) setStatus(prev => ({ ...prev, ...cached.data }));
  }

  setLastUpdated(prev => ({ ...prev, [dateKey]: new Date() }));
  setLoading(false);
}

// ── Sub-components ────────────────────────────────────────────

function AlertBox({type, text, link}: {type:string, text:string, link?:{label:string, url:string}}) {
  const s = ({warning:{bg:"#FFF8E7",bd:"#E8A020"},info:{bg:"#EBF4F8",bd:"#2D6A8F"},tip:{bg:"#EDFAF1",bd:"#1B7A4A"}}as any)[type]||{bg:"#EBF4F8",bd:"#2D6A8F"};
  return <div style={{background:s.bg,borderLeft:"4px solid "+s.bd,borderRadius:"0 8px 8px 0",padding:"12px 16px",marginBottom:"10px",fontSize:"0.87rem",lineHeight:1.55,color:"#2a2a2a"}}>
    {text}
    {link&&<div style={{marginTop:"8px"}}><a href={link.url} target="_blank" rel="noopener noreferrer" style={{color:s.bd,fontWeight:"bold",fontSize:"0.83rem"}}>{link.label}</a></div>}
  </div>;
}

function SecHead({color, label}: {color:string, label:string}) {
  return <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
    <div style={{fontWeight:"bold",color,fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase"}}>{label}</div>
    <div style={{flex:1,height:"1px",background:color+"30"}}/>
  </div>;
}

function StarRating({rating}: {rating:number}) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  return <span style={{display:"inline-flex",alignItems:"center",gap:"2px",fontSize:"0.72rem"}}>
    {[1,2,3,4,5].map(i=>(
      <span key={i} style={{color:i<=full?"#F59E0B":(i===full+1&&half?"#F59E0B":"#ddd"),fontSize:"0.75rem"}}>
        {i<=full?"★":(i===full+1&&half?"⯨":"★")}
      </span>
    ))}
    <span style={{color:"#888",marginLeft:"3px",fontFamily:"Georgia,serif"}}>{rating}</span>
  </span>;
}

function PriceBadge({price}: {price:string}) {
  const n = (price||"").length;
  return <span style={{display:"inline-flex",letterSpacing:"0.01em",fontSize:"0.8rem"}}>
    {[1,2,3,4].map(i=><span key={i} style={{color:i<=n?"#2A7A47":"#ddd",fontWeight:i<=n?"600":"normal"}}>$</span>)}
  </span>;
}

function HotelCard({accent, label, booking}: any) {
  return <div style={{background:"#fff",border:"1px solid "+accent+"30",borderLeft:"5px solid "+accent,borderRadius:"0 12px 12px 0",padding:"18px 22px"}}>
    <div style={{fontSize:"0.68rem",letterSpacing:"0.22em",textTransform:"uppercase",color:accent,marginBottom:"6px"}}>{label}</div>
    {booking.url
      ? <a href={booking.url} target="_blank" rel="noopener noreferrer" style={{fontWeight:"bold",fontSize:"1rem",marginBottom:"4px",color:"#1a1a1a",textDecoration:"none",borderBottom:"1px dotted #bbb",display:"inline-block"}}>{booking.label}</a>
      : <div style={{fontWeight:"bold",fontSize:"1rem",marginBottom:"4px",color:"#1a1a1a"}}>{booking.label}</div>
    }
    {booking.addr&&<a href={appleMaps(booking.addr)} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:"5px",fontSize:"0.78rem",color:accent,textDecoration:"none",marginBottom:"6px",opacity:0.85,marginTop:"4px"}}>📍 {booking.addr} <span style={{fontSize:"0.7rem",opacity:0.6}}>· Maps</span></a>}
    {booking.confirmation&&<div style={{fontSize:"0.72rem",color:"#999",marginBottom:"6px",letterSpacing:"0.02em"}}>🎫 Confirmation: <span style={{fontWeight:"bold",color:"#555"}}>{booking.confirmation}</span></div>}
    {booking.note&&<div style={{color:"#666",fontSize:"0.86rem",lineHeight:1.6,fontStyle:"italic",marginTop:"6px"}}>{booking.note}</div>}
  </div>;
}

function StatusBadge({status}: {status:string}) {
  const cfg = ({"On Time":{bg:"#EDFAF1",color:"#1B7A4A",dot:"#1B7A4A"},"Delayed":{bg:"#FFF8E7",color:"#b07010",dot:"#E8A020"},"Cancelled":{bg:"#FEF2F2",color:"#b91c1c",dot:"#ef4444"},"Scheduled":{bg:"#EBF4F8",color:"#2D6A8F",dot:"#2D6A8F"}}as any)[status]||{bg:"#f5f5f5",color:"#888",dot:"#aaa"};
  return <span style={{display:"inline-flex",alignItems:"center",gap:"5px",background:cfg.bg,color:cfg.color,fontSize:"0.7rem",fontWeight:"bold",padding:"2px 9px",borderRadius:"20px",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>
    <span style={{width:"6px",height:"6px",borderRadius:"50%",background:cfg.dot,flexShrink:0}}/>{status}
  </span>;
}

function FlightRow({f, sMap, loading}: any) {
  const s = sMap?.[f.key];
  const delayed = s?.delayMin > 0;
  const actualDep = s?.actualDep && s.actualDep !== f.dep ? s.actualDep : null;
  const actualArr = s?.actualArr && s.actualArr !== f.arr ? s.actualArr : null;
  return <div style={{borderTop:"1px solid #f0ede6",paddingTop:"11px",marginTop:"11px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"6px",marginBottom:"8px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
        {f.trackingUrl
          ? <a href={f.trackingUrl} target="_blank" rel="noopener noreferrer" style={{fontWeight:"bold",fontSize:"0.96rem",color:"#1a1a1a",textDecoration:"none",borderBottom:"1px dotted #aaa"}}>{f.num}</a>
          : <span style={{fontWeight:"bold",fontSize:"0.96rem"}}>{f.num}</span>
        }
        <span style={{color:"#999",fontSize:"0.8rem"}}>{f.airline}</span>
        <span style={{color:"#ccc",fontSize:"0.8rem"}}>·</span>
        <span style={{color:"#666",fontSize:"0.82rem"}}>{f.route}</span>
        <span style={{color:"#ccc",fontSize:"0.8rem"}}>·</span>
        <span style={{color:"#999",fontSize:"0.8rem"}}>{f.date}</span>
      </div>
      {loading?<span style={{fontSize:"0.72rem",color:"#aaa"}}>Checking…</span>:s&&<StatusBadge status={s.status||"Unknown"}/>}
    </div>
    <div style={{display:"flex",gap:"20px",flexWrap:"wrap",alignItems:"flex-end"}}>
      {[["Departs",f.dep,actualDep],["Arrives",f.arr,actualArr]].map(([lbl,sched,actual])=>(
        <div key={lbl as string}>
          <div style={{fontSize:"0.65rem",color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"2px"}}>{lbl}</div>
          <div style={{fontWeight:"bold",fontSize:"0.9rem",display:"flex",alignItems:"center",gap:"5px"}}>
            {actual?<><span style={{textDecoration:"line-through",color:"#ccc",fontWeight:"normal",fontSize:"0.8rem"}}>{sched as string}</span><span style={{color:delayed?"#b07010":"#1B7A4A"}}>{actual}</span></>:sched}
          </div>
        </div>
      ))}
      {s?.gate&&<div><div style={{fontSize:"0.65rem",color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"2px"}}>Gate</div><div style={{fontWeight:"bold",fontSize:"0.9rem",color:"#1a1a1a"}}>{s.gate||"TBD"}</div></div>}
      {!s&&<div><div style={{fontSize:"0.65rem",color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"2px"}}>Gate</div><div style={{fontWeight:"bold",fontSize:"0.9rem",color:"#bbb"}}>TBD</div></div>}
      {s?.terminal&&<div><div style={{fontSize:"0.65rem",color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"2px"}}>Terminal</div><div style={{fontWeight:"bold",fontSize:"0.9rem"}}>{s.terminal}</div></div>}
      {delayed&&<div><div style={{fontSize:"0.65rem",color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"2px"}}>Delay</div><div style={{fontWeight:"bold",fontSize:"0.9rem",color:"#b07010"}}>+{s.delayMin} min</div></div>}
    </div>
  </div>;
}

function BookingCard({booking, accent, flightStatus, flightLoading}: any) {
  return <div style={{background:"#fff",border:"1px solid "+accent+"25",borderRadius:"10px",padding:"15px 18px",display:"flex",gap:"14px",alignItems:"flex-start"}}>
    <div style={{fontSize:"1.3rem",lineHeight:1,marginTop:"2px",flexShrink:0}}>{booking.icon}</div>
    <div style={{flex:1}}>
      <div style={{fontWeight:"bold",color:"#777",fontSize:"0.7rem",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"8px"}}>
        {booking.label.includes("Avis") ? (() => {
          const parts = booking.label.split("Avis");
          return <>{parts[0]}<span style={{color:"#CC2200"}}>Avis</span>{parts[1]}</>;
        })() : booking.label}
      </div>
      {booking.flights?.map((f:any,i:number)=><FlightRow key={i} f={f} sMap={flightStatus} loading={flightLoading}/>)}
      {booking.lines?.map((l:string,i:number)=>{
        const isAddr=l.startsWith("📍");
        return <div key={i} style={{fontSize:"0.86rem",lineHeight:1.6,marginBottom:"2px",fontWeight:i===0?"600":"normal",color:l.startsWith("⏰")||l.startsWith("📅")?"#666":"#222"}}>
          {isAddr&&booking.addr?<a href={appleMaps(booking.addr)} target="_blank" rel="noopener noreferrer" style={{color:accent,textDecoration:"none"}}>📍 {l.replace("📍","").trim()} <span style={{fontSize:"0.7rem",opacity:0.7}}>· Open in Maps</span></a>:l}
        </div>;
      })}
      {booking.confirmation_link&&(
        <div style={{fontSize:"0.86rem",lineHeight:1.6,marginTop:"2px"}}>
          <a href={booking.confirmation_link.url} target="_blank" rel="noopener noreferrer"
            style={{color:accent,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:"6px"}}>
            🎫 {booking.confirmation_link.label}
            <span style={{fontSize:"0.72rem",opacity:0.7}}>· View Reservation</span>
          </a>
        </div>
      )}
    </div>
  </div>;
}

function LegSummary({stop}: {stop:Stop}) {
  if (!stop.summary) return null;
  return (
    <div style={{background:stop.accent+"0D",borderLeft:"4px solid "+stop.accent,borderRadius:"0 10px 10px 0",padding:"14px 18px",marginBottom:"22px"}}>
      <div style={{fontSize:"0.68rem",fontWeight:"bold",color:stop.accent,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"6px"}}>{stop.emoji} {stop.city} · {stop.dates}</div>
      <div style={{fontSize:"0.88rem",color:"#3a3a3a",lineHeight:1.65,fontStyle:"italic"}}>{stop.summary}</div>
    </div>
  );
}

function WeatherStrip({stop, weatherData}: any) {
  const data = weatherData[stop.id];
  const tripStart = new Date(stop.weather_start+"T12:00:00");
  const today = new Date();
  const daysOut = Math.ceil((tripStart.getTime()-today.getTime())/(1000*60*60*24));
  const availDate = new Date(tripStart.getTime()-15*24*60*60*1000).toLocaleDateString("en-US",{month:"long",day:"numeric"});
  return <div style={{marginBottom:"22px"}}>
    <div style={{fontSize:"0.72rem",fontWeight:"bold",color:stop.accent,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"9px"}}>🌤️ Forecast — {stop.city}</div>
    {!data?(
      <div style={{background:stop.accent+"08",border:"1px dashed "+stop.accent+"30",borderRadius:"10px",padding:"14px 18px",display:"flex",alignItems:"center",gap:"12px"}}>
        <span style={{fontSize:"1.6rem"}}>📅</span>
        <div>
          <div style={{fontWeight:"bold",fontSize:"0.85rem",color:"#444"}}>Forecast not yet available</div>
          <div style={{fontSize:"0.8rem",color:"#888",marginTop:"2px"}}>{daysOut>16?"Opens around "+availDate+" — will auto-populate on refresh.":"Loading weather data…"}</div>
        </div>
      </div>
    ):(
      <div style={{display:"flex",gap:"8px",overflowX:"auto",paddingBottom:"2px"}}>
        {data.time.map((dt:string,i:number)=>{
          const d=new Date(dt+"T12:00:00");
          const w=wmo(data.weathercode[i]);
          const hi=Math.round(data.temperature_2m_max[i]);
          const lo=Math.round(data.temperature_2m_min[i]);
          const precip=data.precipitation_probability_max[i];
          return <div key={i} style={{flex:"0 0 auto",minWidth:"84px",background:"#fff",border:"1px solid "+stop.accent+"22",borderRadius:"12px",padding:"12px 10px",textAlign:"center",boxShadow:"0 1px 5px "+stop.accent+"0D"}}>
            <div style={{fontSize:"0.68rem",fontWeight:"bold",color:"#888",letterSpacing:"0.06em"}}>{DAYS[d.getDay()]}</div>
            <div style={{fontSize:"0.68rem",color:"#ccc",marginBottom:"7px"}}>{d.getMonth()+1}/{d.getDate()}</div>
            <div style={{fontSize:"1.6rem",lineHeight:1,marginBottom:"5px"}}>{w.e}</div>
            <div style={{fontSize:"0.68rem",color:"#aaa",marginBottom:"5px"}}>{w.d}</div>
            <div style={{fontWeight:"bold",fontSize:"0.88rem",color:"#333"}}>{hi}°<span style={{fontWeight:"normal",color:"#bbb",fontSize:"0.78rem"}}> {lo}°</span></div>
            <div style={{fontSize:"0.7rem",color:precip>50?"#2D6A8F":"#ccc",marginTop:"4px",fontWeight:precip>50?"bold":"normal"}}>💧{precip}%</div>
          </div>;
        })}
      </div>
    )}
  </div>;
}

function PlaceCard({place, accent}: {place:Place, accent:string}) {
  const isRestaurant = place.category === "restaurant";
  const isAllTrails = place.url?.includes("alltrails.com");
  const isHike = place.category === "hike";
  const showMust = isRestaurant && place.must;

  return (
    <div style={{background:"#fff",borderRadius:"10px",padding:"15px 18px",border:"1px solid "+(showMust?accent+"40":"#e0ddd6"),display:"flex",gap:"13px",alignItems:"flex-start",boxShadow:showMust?"0 2px 10px "+accent+"12":"none"}}>
      {isRestaurant&&(
        showMust
          ?<div style={{background:accent,color:"#fff",fontSize:"0.58rem",letterSpacing:"0.1em",textTransform:"uppercase",padding:"3px 7px",borderRadius:"4px",whiteSpace:"nowrap",marginTop:"3px",flexShrink:0}}>Must</div>
          :<div style={{width:"36px",flexShrink:0}}/>
      )}
      {!isRestaurant&&(
        <div style={{fontSize:"1.2rem",flexShrink:0,lineHeight:1,marginTop:"1px",width:"22px",textAlign:"center"}}>{place.emoji}</div>
      )}
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"baseline",gap:"8px",flexWrap:"wrap",marginBottom:"3px"}}>
          {isRestaurant&&<span style={{fontSize:"1.1rem",lineHeight:1,flexShrink:0}}>{place.emoji}</span>}
          {place.url
            ?<a href={place.url} target="_blank" rel="noopener noreferrer" style={{fontWeight:"bold",fontSize:isRestaurant?"0.98rem":"0.94rem",color:"#1a1a1a",textDecoration:"none",borderBottom:"1px dotted #bbb"}}>{place.name}</a>
            :<span style={{fontWeight:"bold",fontSize:isRestaurant?"0.98rem":"0.94rem"}}>{place.name}</span>
          }
          {isRestaurant&&<span style={{fontSize:"0.76rem",color:"#999",fontStyle:"italic"}}>{place.subcategory.replace(/-/g," ")}</span>}
          {place.attribution_handle==="stacy"&&<span style={{fontSize:"0.6rem",background:"#F3EDF7",color:"#7B4FA6",padding:"1px 7px",borderRadius:"10px",letterSpacing:"0.04em"}}>Stacy's Find</span>}
          {isHike&&isAllTrails&&<a href={place.url!} target="_blank" rel="noopener noreferrer" style={{fontSize:"0.6rem",background:"#E8F5E9",color:"#2E7D32",padding:"1px 7px",borderRadius:"10px",letterSpacing:"0.04em",textDecoration:"none",border:"1px solid #A5D6A730",display:"inline-flex",alignItems:"center",gap:"3px"}}>🌿 AllTrails</a>}
          {place.flag&&<span style={{fontSize:"0.6rem",background:"#FFF8E7",color:"#b07010",padding:"1px 7px",borderRadius:"10px",border:"1px solid #E8A02040"}}>⚠ {place.flag}</span>}
        </div>
        {isRestaurant&&place.rating!=null&&(
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"4px",flexWrap:"wrap"}}>
            <StarRating rating={place.rating}/>
            {place.price&&<PriceBadge price={place.price}/>}
          </div>
        )}
        {isHike&&(place.difficulty||place.duration||place.distance)&&(
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"5px"}}>
            {place.difficulty&&<span style={{fontSize:"0.62rem",background:place.difficulty==="strenuous"?"#FEF2F2":place.difficulty==="moderate"?"#FFF8E7":"#EDFAF1",color:place.difficulty==="strenuous"?"#b91c1c":place.difficulty==="moderate"?"#b07010":"#1B7A4A",padding:"1px 8px",borderRadius:"10px",fontWeight:"bold",letterSpacing:"0.04em",textTransform:"capitalize"}}>{place.difficulty}</span>}
            {place.distance&&<span style={{fontSize:"0.62rem",background:"#F0F4FF",color:"#3557A0",padding:"1px 8px",borderRadius:"10px",letterSpacing:"0.04em"}}>📏 {place.distance}</span>}
            {place.duration&&<span style={{fontSize:"0.62rem",background:"#F5F0FF",color:"#5B3FA6",padding:"1px 8px",borderRadius:"10px",letterSpacing:"0.04em"}}>⏱ {place.duration}</span>}
          </div>
        )}
        {place.note&&<div style={{color:"#555",fontSize:"0.86rem",lineHeight:1.55,marginTop:"3px"}}>{place.note}</div>}
      </div>
    </div>
  );
}

function getActivityDisplayGroup(place: Place): string {
  if (place.category === "hike") return "Hikes";
  if (place.subcategory === "on-the-water") return "On the Water";
  if (place.category === "sight") return "Walks & Views";
  return "Nature & Culture";
}

function PlaceList({places, accent, isActivities}: {places:Place[], accent:string, isActivities?:boolean}) {
  // Activities with groupable categories (hikes, on-the-water) get section headers
  const hasGroups = isActivities && places.some(p => p.category === "hike" || p.subcategory === "on-the-water");

  if (!hasGroups) {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:"11px"}}>
        {places.map((p)=><PlaceCard key={p.id} place={p} accent={accent}/>)}
      </div>
    );
  }

  const groupOrder = ["Hikes","On the Water","Walks & Views","Nature & Culture"];
  const groupEmojis: Record<string,string> = {"Hikes":"🥾","On the Water":"⛵","Walks & Views":"🚶","Nature & Culture":"🌿"};
  const grouped: Record<string,Place[]> = {};
  places.forEach(p => {
    const g = getActivityDisplayGroup(p);
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(p);
  });

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
      {groupOrder.filter(g=>grouped[g]?.length).map(g=>(
        <div key={g}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
            <span style={{fontSize:"1rem"}}>{groupEmojis[g]||"📍"}</span>
            <div style={{fontWeight:"bold",color:accent,fontSize:"0.72rem",letterSpacing:"0.1em",textTransform:"uppercase"}}>{g}</div>
            <div style={{flex:1,height:"1px",background:accent+"20"}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {grouped[g].map((p)=><PlaceCard key={p.id} place={p} accent={accent}/>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function CollapsibleSection({color, label, open, onToggle, children, rightSlot}: any) {
  return (
    <div style={{marginBottom:"28px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:open?"12px":"0"}}>
        <button onClick={onToggle} style={{flex:1,display:"flex",alignItems:"center",gap:"12px",background:"none",border:"none",cursor:"pointer",padding:"0",fontFamily:"Georgia,serif"}}>
          <div style={{fontWeight:"bold",color,fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</div>
          <div style={{flex:1,height:"1px",background:color+"30"}}/>
          <span style={{color,fontSize:"0.72rem",transition:"transform 0.18s",display:"inline-block",transform:open?"rotate(180deg)":"rotate(0deg)",flexShrink:0}}>▼</span>
        </button>
        {rightSlot}
      </div>
      {open && children}
    </div>
  );
}

function DailyItinerary({stop, data}: {stop:Stop, data:TripData}) {
  const [openDay, setOpenDay] = useState(0);
  const LS_KEY = "jernie_confirmed_" + stop.id;
  const [userConfirmed, setUserConfirmed] = useState<Record<string,boolean>>(()=>{
    try { return JSON.parse(localStorage.getItem(LS_KEY)||"{}"); } catch { return {}; }
  });
  const toggleConfirm = (key: string) => {
    setUserConfirmed(prev => {
      const next = {...prev, [key]: !prev[key]};
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const days = data.itinerary_days.filter(d => d.stop_id === stop.id);
  const itemsByDay = useMemo(() => {
    const map: Record<string, typeof data.itinerary_items> = {};
    data.itinerary_items.forEach(it => {
      if (!map[it.day_id]) map[it.day_id] = [];
      map[it.day_id].push(it);
    });
    return map;
  }, [data.itinerary_items]);

  return (
    <div style={{marginBottom:"28px"}}>
      <SecHead color={stop.accent} label="📅 Daily Itinerary — Loose Plan"/>
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {days.map((day,di)=>{
          const items = itemsByDay[day.id] || [];
          return (
          <div key={day.id} style={{border:"1px solid "+stop.accent+(openDay===di?"40":"20"),borderRadius:"12px",overflow:"hidden",background:"#fff",transition:"border-color 0.15s"}}>
            <button onClick={()=>setOpenDay(openDay===di?-1:di)}
              style={{width:"100%",padding:"14px 18px",display:"flex",alignItems:"center",gap:"12px",background:openDay===di?stop.accent+"0A":"transparent",border:"none",cursor:"pointer",textAlign:"left",fontFamily:"Georgia,serif",transition:"background 0.15s"}}>
              <span style={{fontSize:"1.25rem",flexShrink:0}}>{day.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:"bold",fontSize:"0.92rem",color:"#1a1a1a"}}>{day.date}</div>
                <div style={{fontSize:"0.75rem",color:"#888",marginTop:"2px",fontStyle:"italic"}}>{day.label}</div>
              </div>
              <span style={{color:stop.accent,fontSize:"0.75rem",display:"inline-block",transform:openDay===di?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.15s"}}>▼</span>
            </button>
            {openDay===di&&(
              <div style={{padding:"0 18px 14px 18px",borderTop:"1px solid "+stop.accent+"15"}}>
                {items.map((item,ii)=>{
                  const isLocked = item.locked || userConfirmed[item.id];
                  return (
                  <div key={item.id} style={{display:"flex",gap:"12px",padding:"10px 0",borderBottom:ii<items.length-1?"1px dashed #f0ede6":"none",alignItems:"flex-start"}}>
                    <div style={{minWidth:"96px",flexShrink:0,display:"flex",flexDirection:"column",gap:"5px",paddingTop:"2px"}}>
                      <div style={{fontSize:"0.7rem",color:"#aaa",lineHeight:1.4,fontStyle:"italic"}}>{item.time}</div>
                      {isLocked ? (
                        <button onClick={()=>!item.locked&&toggleConfirm(item.id)}
                          title={item.locked?"Locked in":"Click to unmark"}
                          style={{background:stop.accent,color:"#fff",fontSize:"0.52rem",padding:"2px 6px",borderRadius:"4px",letterSpacing:"0.06em",textTransform:"uppercase",display:"inline-block",width:"fit-content",border:"none",cursor:item.locked?"default":"pointer",fontFamily:"Georgia,serif"}}>
                          ✓ Confirmed
                        </button>
                      ) : (
                        <>
                          {item.book_now&&(
                            item.booking_url
                              ? <a href={item.booking_url} target="_blank" rel="noopener noreferrer"
                                  style={{background:"#FFF3CD",color:"#7a5800",fontSize:"0.52rem",padding:"2px 8px",borderRadius:"4px",letterSpacing:"0.06em",textTransform:"uppercase",border:"1px solid #F0C040aa",display:"inline-block",width:"fit-content",textDecoration:"none",cursor:"pointer"}}>
                                  📅 Book Now
                                </a>
                              : <span style={{background:"#FFF3CD",color:"#7a5800",fontSize:"0.52rem",padding:"2px 6px",borderRadius:"4px",letterSpacing:"0.06em",textTransform:"uppercase",border:"1px solid #F0C040aa",display:"inline-block",width:"fit-content"}}>📅 Book Now</span>
                          )}
                          {item.alert&&!item.book_now&&(
                            <span style={{background:"#FFF8E7",color:"#b07010",fontSize:"0.52rem",padding:"2px 6px",borderRadius:"4px",letterSpacing:"0.06em",textTransform:"uppercase",border:"1px solid #E8A02050",display:"inline-block",width:"fit-content"}}>⚠ Note</span>
                          )}
                          <button onClick={()=>toggleConfirm(item.id)}
                            style={{background:"transparent",color:"#bbb",fontSize:"0.52rem",padding:"2px 6px",borderRadius:"4px",letterSpacing:"0.06em",textTransform:"uppercase",border:"1px dashed #ddd",display:"inline-block",width:"fit-content",cursor:"pointer",fontFamily:"Georgia,serif",marginTop:"1px"}}>
                            + Confirm
                          </button>
                        </>
                      )}
                    </div>
                    <div style={{fontSize:"0.86rem",color:"#333",lineHeight:1.55,flex:1,paddingTop:"2px"}}>
                      {item.text}
                      {item.addr&&(
                        <div style={{marginTop:"5px"}}>
                          <a href={appleMaps(item.addr)} target="_blank" rel="noopener noreferrer"
                            style={{display:"inline-flex",alignItems:"center",gap:"4px",fontSize:"0.76rem",color:stop.accent,textDecoration:"none",fontStyle:"normal"}}>
                            📍 {item.addr_label||item.addr} <span style={{fontSize:"0.68rem",opacity:0.7}}>· Maps</span>
                          </a>
                        </div>
                      )}
                      {item.tide_url&&(
                        <div style={{marginTop:"5px"}}>
                          <a href={item.tide_url} target="_blank" rel="noopener noreferrer"
                            style={{display:"inline-flex",alignItems:"center",gap:"4px",fontSize:"0.76rem",color:"#2D6A8F",textDecoration:"none",fontStyle:"normal"}}>
                            🌊 Bar Harbor Tide Chart <span style={{fontSize:"0.68rem",opacity:0.7}}>· NOAA</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

function Countdown({departure}: {departure:Date|null}) {
  const t = useCountdown(departure);
  if (!t) return (
    <p style={{margin:"16px auto 0",color:"#A8C4D4",fontSize:"1rem",fontStyle:"italic"}}>We're in Maine! 🦞</p>
  );
  return (
    <div style={{marginTop:"20px"}}>
      <div style={{fontSize:"0.65rem",letterSpacing:"0.25em",color:"#7A9FB5",textTransform:"uppercase",marginBottom:"10px"}}>Countdown to Departure · May 22 · 8:20 AM</div>
      <div style={{display:"flex",justifyContent:"center",gap:"6px",flexWrap:"wrap"}}>
        {([["days",t.days],["hrs",t.hours],["min",t.mins],["sec",t.secs]] as [string,number][]).map(([label,val])=>(
          <div key={label} style={{textAlign:"center",background:"rgba(255,255,255,0.07)",borderRadius:"10px",padding:"10px 14px",minWidth:"56px"}}>
            <div style={{fontSize:"clamp(1.3rem,4vw,1.9rem)",fontWeight:"bold",color:"#FDFAF4",lineHeight:1,fontVariantNumeric:"tabular-nums",letterSpacing:"-0.02em"}}>{String(val).padStart(2,"0")}</div>
            <div style={{fontSize:"0.58rem",color:"#7A9FB5",letterSpacing:"0.15em",textTransform:"uppercase",marginTop:"4px"}}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── What to Pack ──────────────────────────────────────────────

function WhatToPack({accent, data}: {accent:string, data:TripData}) {
  const LS_KEY = "jernie_pack";
  const [checked, setChecked] = useState<Record<string,boolean>>(()=>{
    try { return JSON.parse(localStorage.getItem(LS_KEY)||"{}"); } catch { return {}; }
  });
  const [open, setOpen] = useState(false);

  const toggle = (itemId: string) => {
    setChecked(prev => {
      const next = {...prev, [itemId]: !prev[itemId]};
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const totalItems = data.packing_lists.reduce((a,c)=>a+c.items.length,0);
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div style={{marginBottom:"28px"}}>
      <button onClick={()=>setOpen(v=>!v)} style={{width:"100%",display:"flex",alignItems:"center",gap:"12px",background:"none",border:"none",cursor:"pointer",padding:"0",marginBottom:open?"12px":"0",fontFamily:"Georgia,serif"}}>
        <div style={{fontWeight:"bold",color:accent,fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase",whiteSpace:"nowrap"}}>🎒 What to Pack</div>
        <div style={{flex:1,height:"1px",background:accent+"30"}}/>
        <span style={{fontSize:"0.7rem",color:"#999",whiteSpace:"nowrap",marginRight:"6px"}}>{checkedCount}/{totalItems} packed</span>
        <span style={{color:accent,fontSize:"0.72rem",transition:"transform 0.18s",display:"inline-block",transform:open?"rotate(180deg)":"rotate(0deg)",flexShrink:0}}>▼</span>
      </button>
      {open && (
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          {data.packing_lists.map((section)=>(
            <div key={section.id} style={{background:"#fff",borderRadius:"12px",border:"1px solid #e0ddd6",overflow:"hidden"}}>
              <div style={{background:accent+"0A",borderBottom:"1px solid "+accent+"15",padding:"10px 16px",fontWeight:"bold",fontSize:"0.8rem",color:accent,letterSpacing:"0.04em"}}>
                {section.category}
              </div>
              <div style={{padding:"6px 0"}}>
                {section.items.map((item,ii)=>{
                  const done = !!checked[item.id];
                  return (
                    <button key={item.id} onClick={()=>toggle(item.id)}
                      style={{width:"100%",display:"flex",alignItems:"center",gap:"12px",padding:"8px 16px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left",fontFamily:"Georgia,serif",borderBottom:ii<section.items.length-1?"1px solid #f5f3ef":"none",transition:"background 0.1s"}}>
                      <div style={{width:"18px",height:"18px",borderRadius:"4px",border:"2px solid "+(done?accent:"#ccc"),background:done?accent:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
                        {done&&<span style={{color:"#fff",fontSize:"0.65rem",fontWeight:"bold"}}>✓</span>}
                      </div>
                      <span style={{fontSize:"0.84rem",color:done?"#bbb":"#333",textDecoration:done?"line-through":"none",lineHeight:1.4,transition:"all 0.15s"}}>{item.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {checkedCount > 0 && (
            <button onClick={()=>{
              setChecked({});
              try { localStorage.removeItem(LS_KEY); } catch {}
            }} style={{alignSelf:"flex-end",background:"transparent",border:"1px solid #e0ddd6",borderRadius:"6px",padding:"4px 12px",fontSize:"0.72rem",color:"#aaa",cursor:"pointer",fontFamily:"Georgia,serif"}}>
              Reset list
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Travel Section ────────────────────────────────────────────

function TravelSection({stop, stopBookings, groups, flightStatus, flightLoading, lastUpdated}: any) {
  // Sort by display_order for chronological story (arrival: flights → car → hotel; departure: hotel → car → flights)
  const sorted = [...stopBookings].sort((a:Booking, b:Booking) => (a.display_order ?? 999) - (b.display_order ?? 999));

  const hasFlights = stopBookings.some((b:Booking) => b.type === "flight");

  // Compute last updated timestamp for flights on this stop
  const flightBookings = stopBookings.filter((b:Booking) => b.type === "flight" && b.flights);
  const dateKeys = [...new Set(
    flightBookings.flatMap((b:any) => b.flights.map((f:any) => new Date(f.date).toISOString().split("T")[0]))
  )] as string[];
  const relevantTimestamps = dateKeys.map((dk:string) => lastUpdated[dk]).filter(Boolean);
  const mostRecent = relevantTimestamps.length > 0
    ? new Date(Math.max(...relevantTimestamps.map((d:Date) => d.getTime())))
    : null;

  const renderBooking = (b: Booking) => {
    if (b.type === "accommodation") {
      const groupName = b.group_ids
        ? groups.find((g:Group) => g.id === b.group_ids![0])?.name
        : "Party-Wide";
      return <HotelCard key={b.id} accent={stop.accent} label={"🏠 " + groupName + "'s Accommodations"} booking={b}/>;
    }
    return <BookingCard key={b.id} booking={b} accent={stop.accent} flightStatus={flightStatus} flightLoading={flightLoading}/>;
  };

  return (
    <>
      {hasFlights && mostRecent && (
        <div style={{fontSize:"0.7rem",color:"#bbb",textAlign:"right",marginBottom:"10px"}}>
          {!navigator.onLine?"Offline · ":""}Last checked: {mostRecent.toLocaleTimeString()}
        </div>
      )}
      {hasFlights && !mostRecent && (
        <div style={{fontSize:"0.7rem",color:"#bbb",textAlign:"right",marginBottom:"10px"}}>Live status begins 48hrs before departure</div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
        {sorted.map(renderBooking)}
      </div>
    </>
  );
}

// ── PIN Gate ──────────────────────────────────────────────────

const PIN = "0824";
const SESSION_KEY = "maine2026_unlocked";

function PinGate({onUnlock}: {onUnlock: ()=>void}) {
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);

  const handleDigit = (d: string) => {
    if (digits.length >= 4) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 4) {
      const entered = next.join("");
      if (entered === PIN) {
        setFlash(true);
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
        setTimeout(onUnlock, 380);
      } else {
        setShake(true);
        setTimeout(() => { setDigits([]); setShake(false); }, 650);
      }
    }
  };

  const handleDelete = () => setDigits(d => d.slice(0,-1));

  const keys = [
    ["1",""],["2","ABC"],["3","DEF"],
    ["4","GHI"],["5","JKL"],["6","MNO"],
    ["7","PQRS"],["8","TUV"],["9","WXYZ"],
    null,["0",""],["DEL",""]
  ];

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:9999,
      background:"linear-gradient(170deg,#1a2a3a 0%,#0D2B3E 50%,#0a1f2e 100%)",
      display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",
      opacity: flash ? 0 : 1,
      transition: flash ? "opacity 0.35s ease" : "none",
      fontFamily:"Georgia,'Times New Roman',serif",
    }}>
      <div style={{fontSize:"2rem",marginBottom:"10px",opacity:0.5}}>🔒</div>
      <div style={{color:"#FDFAF4",fontSize:"1.45rem",fontWeight:"normal",letterSpacing:"0.01em",marginBottom:"6px",textAlign:"center"}}>
        Enter Passcode to View
      </div>
      <div style={{color:"#7A9FB5",fontSize:"0.9rem",letterSpacing:"0.04em",marginBottom:"36px",fontStyle:"italic"}}>
        Happy Birthday Ford
      </div>
      <div style={{
        display:"flex",gap:"18px",marginBottom:"44px",
        animation: shake ? "pinShake 0.55s ease" : "none",
      }}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{
            width:"13px",height:"13px",borderRadius:"50%",
            border:"2px solid rgba(255,255,255,0.5)",
            background: i < digits.length ? "#FDFAF4" : "transparent",
            transition:"background 0.15s",
          }}/>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"13px",width:"min(290px,80vw)"}}>
        {keys.map((k,i)=>{
          if (!k) return <div key={i}/>;
          const [num, letters] = k;
          const isDel = num === "DEL";
          return (
            <button key={i}
              onClick={()=> isDel ? handleDelete() : handleDigit(num)}
              style={{
                width:"100%",aspectRatio:"1",borderRadius:"50%",
                border:"none",cursor:"pointer",
                background: isDel ? "transparent" : "rgba(255,255,255,0.12)",
                backdropFilter:"blur(8px)",
                WebkitBackdropFilter:"blur(8px)",
                display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"center",
                color:"#FDFAF4",
                transition:"background 0.12s,transform 0.08s",
                fontFamily:"inherit",
              }}
              onMouseDown={e=>(e.currentTarget.style.background = isDel ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.25)")}
              onMouseUp={e=>(e.currentTarget.style.background = isDel ? "transparent" : "rgba(255,255,255,0.12)")}
              onTouchStart={e=>(e.currentTarget.style.background = isDel ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.25)")}
              onTouchEnd={e=>(e.currentTarget.style.background = isDel ? "transparent" : "rgba(255,255,255,0.12)")}
            >
              {isDel
                ? <span style={{fontSize:"1.1rem",opacity:0.7}}>⌫</span>
                : <>
                    <span style={{fontSize:"1.65rem",fontWeight:"300",lineHeight:1}}>{num}</span>
                    {letters && <span style={{fontSize:"0.5rem",letterSpacing:"0.18em",opacity:0.6,marginTop:"2px"}}>{letters}</span>}
                  </>
              }
            </button>
          );
        })}
      </div>
      <style>{`
        @keyframes pinShake {
          0%   { transform: translateX(0); }
          15%  { transform: translateX(-10px); }
          30%  { transform: translateX(10px); }
          45%  { transform: translateX(-8px); }
          60%  { transform: translateX(8px); }
          75%  { transform: translateX(-4px); }
          90%  { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function MaineGuide() {
  const { data, loading, error } = useTripData();
  const [unlocked, setUnlocked] = useState(()=>{
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
  });

  const [active, setActive] = useState("portland");
  const [weatherData, setWeatherData] = useState<Record<string,any>>({});
  const [flightStatus, setFlightStatus] = useState<Record<string,any>>({});
  const [flightLoading, setFlightLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Record<string,Date>>({});
  const [travelOpen, setTravelOpen] = useState(true);
  const [eatOpen, setEatOpen] = useState(true);
  const [doOpen, setDoOpen] = useState(true);
  // Memoized so useCountdown's [departure] dependency stays stable — prevents interval churn
  // Must be at top level (before early returns) to satisfy Rules of Hooks
  const departure = useMemo(() => data ? new Date(data.trip.departure) : null, [data?.trip?.departure]);

  // Load caches and kick off fetches once data is available
  useEffect(() => {
    if (!data) return;

    // Weather: load cache then fetch
    const weatherInit: Record<string,any> = {};
    data.stops.forEach(s => {
      const c = readCache("jernie_weather_" + s.id);
      if (c) weatherInit[s.id] = c.data;
    });
    setWeatherData(weatherInit);
    data.stops.forEach(async s => {
      const result = await fetchWeatherForStop(s);
      if (result) setWeatherData(prev => ({...prev, [s.id]: result.data}));
    });

    // Flights: load cache then fetch if within window
    const flightInit: Record<string,any> = {};
    const lastUpdatedInit: Record<string,Date> = {};
    const groups = deriveFlightGroups(data.bookings);
    Object.keys(groups).forEach(dk => {
      const c = readCache("jernie_flights_" + dk);
      if (c) {
        Object.assign(flightInit, c.data);
        lastUpdatedInit[dk] = new Date(c.cachedAt);
      }
    });
    setFlightStatus(flightInit);
    setLastUpdated(lastUpdatedInit);
    Object.entries(groups).forEach(([dateKey, group]: [string, any]) => {
      if (isWithinFlightWindow(dateKey, group.flights)) {
        fetchFlightStatusGroupWithData(dateKey, group.flights, setFlightStatus, setFlightLoading, setLastUpdated);
      }
    });
  }, [data]);

  useEffect(() => {
    setTravelOpen(true);
    setEatOpen(true);
    setDoOpen(true);
  }, [active]);

  if (!unlocked) return <PinGate onUnlock={()=>setUnlocked(true)}/>;

  if (loading || !data) {
    return (
      <div style={{fontFamily:"Georgia,'Times New Roman',serif",background:"#F5F0E8",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center",color:"#888"}}>
          <div style={{fontSize:"2rem",marginBottom:"12px"}}>🦞</div>
          <div style={{fontSize:"0.9rem",fontStyle:"italic"}}>Loading your trip…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{fontFamily:"Georgia,'Times New Roman',serif",background:"#F5F0E8",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center",color:"#888",padding:"32px"}}>
          <div style={{fontSize:"0.9rem",color:"#b91c1c",marginBottom:"8px"}}>Failed to load trip data.</div>
          <div style={{fontSize:"0.8rem",fontStyle:"italic"}}>{error.message}</div>
        </div>
      </div>
    );
  }

  const stop = data.stops.find(s => s.id === active)!;
  const stopBookings = data.bookings.filter(b => b.stop_id === active);
  const stopPlaces = data.places.filter(p => p.stop_id === active);
  const stopAlerts = data.alerts.filter(a => a.stop_id === active);
  const restaurants = stopPlaces.filter(p => p.category === "restaurant");
  const activities = stopPlaces.filter(p => p.category !== "restaurant");
  const hasFlights = stopBookings.some(b => b.type === "flight");

  return (
    <>
    <div style={{fontFamily:"Georgia,'Times New Roman',serif",background:"#F5F0E8",minHeight:"100vh",color:"#1a1a1a"}}>

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#0D2B3E 0%,#1B4D6B 60%,#0D2B3E 100%)",padding:"52px 24px 44px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 20% 50%,rgba(255,255,255,0.05) 0%,transparent 60%),radial-gradient(circle at 80% 20%,rgba(255,255,255,0.04) 0%,transparent 50%)"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{fontSize:"0.72rem",letterSpacing:"0.3em",color:"#A8C4D4",textTransform:"uppercase",marginBottom:"14px"}}>{data.trip.dates}</div>
          <h1 style={{margin:0,fontSize:"clamp(1.9rem,5vw,3.1rem)",fontWeight:"normal",color:"#FDFAF4",lineHeight:1.1,letterSpacing:"-0.01em"}}>{data.trip.name} Trip Guide</h1>
          <p style={{margin:"10px auto 0",maxWidth:"500px",color:"#7A9FB5",fontSize:"0.88rem",fontStyle:"italic"}}>Portland → Bar Harbor & Acadia → Southwest Harbor</p>
          <div style={{marginTop:"16px",display:"flex",justifyContent:"center",gap:"24px",flexWrap:"wrap"}}>
            {[["🦞","Seafood-focused"],["🏔️","Acadia hiking"],["🛏️","Boutique stays"]].map(([e,l])=>(
              <div key={l} style={{color:"#C8DDE8",fontSize:"0.8rem",letterSpacing:"0.04em"}}>{e} {l}</div>
            ))}
          </div>
          <Countdown departure={departure}/>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"2px solid #D4C9B0",background:"#EDE8DC",overflowX:"auto"}}>
        {data.stops.map(s=>(
          <button key={s.id} onClick={()=>setActive(s.id)} style={{flex:"1 1 auto",minWidth:"110px",padding:"14px 16px",border:"none",background:active===s.id?"#F5F0E8":"transparent",borderBottom:active===s.id?"3px solid "+s.accent:"3px solid transparent",cursor:"pointer",fontFamily:"Georgia,serif",fontSize:"0.88rem",color:active===s.id?s.accent:"#666",fontWeight:active===s.id?"bold":"normal",transition:"all 0.18s",textAlign:"center",lineHeight:1.3}}>
            <div style={{fontSize:"1.25rem"}}>{s.emoji}</div>
            <div>{s.city}</div>
            <div style={{fontSize:"0.72rem",opacity:0.65,marginTop:"2px"}}>{s.dates}</div>
          </button>
        ))}
      </div>

      {/* Main */}
      <div style={{maxWidth:"780px",margin:"0 auto",padding:"32px 20px 64px"}}>

        <LegSummary stop={stop}/>
        <WeatherStrip stop={stop} weatherData={weatherData}/>

        {/* Travel & Accommodations */}
        <CollapsibleSection
          color={stop.accent}
          label="✈️ Travel & Accommodations"
          open={travelOpen}
          onToggle={()=>setTravelOpen(v=>!v)}
          rightSlot={hasFlights&&(
            <button onClick={(e)=>{
              e.stopPropagation();
              const groups = deriveFlightGroups(stopBookings);
              Object.entries(groups).forEach(([dk, g]: [string, any]) => {
                fetchFlightStatusGroupWithData(dk, g.flights, setFlightStatus, setFlightLoading, setLastUpdated);
              });
            }} disabled={flightLoading}
              style={{background:"transparent",border:"1px solid "+stop.accent+"50",borderRadius:"6px",padding:"3px 10px",fontSize:"0.72rem",color:stop.accent,cursor:flightLoading?"default":"pointer",opacity:flightLoading?0.5:1,fontFamily:"Georgia,serif"}}>
              {flightLoading?"⏳ Checking…":"↻ Refresh"}
            </button>
          )}
        >
          <TravelSection
            stop={stop}
            stopBookings={stopBookings}
            groups={data.groups}
            flightStatus={flightStatus}
            flightLoading={flightLoading}
            lastUpdated={lastUpdated}
          />
        </CollapsibleSection>

        {/* Additional Details */}
        {stopAlerts.length>0&&(
          <div style={{marginBottom:"28px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"12px"}}>
              <div style={{fontWeight:"bold",color:stop.accent,fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase"}}>📌 Additional Details</div>
              <div style={{flex:1,height:"1px",background:stop.accent+"30"}}/>
            </div>
            {stopAlerts.map((a)=><AlertBox key={a.id} {...a}/>)}
          </div>
        )}

        <DailyItinerary stop={stop} data={data}/>

        {/* Where to Eat */}
        {active==="barharbor" ? (
          <CollapsibleSection color={stop.accent} label="🍽️ Where to Eat" open={eatOpen} onToggle={()=>setEatOpen(v=>!v)}>
            <PlaceList places={restaurants} accent={stop.accent}/>
          </CollapsibleSection>
        ) : (
          <div style={{marginBottom:"28px"}}>
            <SecHead color={stop.accent} label="🍽️ Where to Eat"/>
            <PlaceList places={restaurants} accent={stop.accent}/>
          </div>
        )}

        {/* What to Do */}
        {activities.length > 0 && (
          active==="barharbor" ? (
            <CollapsibleSection color={stop.accent} label="📍 What to Do" open={doOpen} onToggle={()=>setDoOpen(v=>!v)}>
              <PlaceList places={activities} accent={stop.accent} isActivities/>
            </CollapsibleSection>
          ) : (
            <div style={{marginBottom:"28px"}}>
              <SecHead color={stop.accent} label="📍 What to Do"/>
              <PlaceList places={activities} accent={stop.accent} isActivities/>
            </div>
          )
        )}

        {/* What to Pack */}
        <WhatToPack accent={stop.accent} data={data}/>
      </div>

      <div style={{background:"#0D2B3E",color:"#A8C4D4",textAlign:"center",padding:"22px",fontSize:"0.8rem",letterSpacing:"0.05em"}}>
        Maine Coast · May 2026 · 🌊
      </div>
    </div>
    </>
  );
}
