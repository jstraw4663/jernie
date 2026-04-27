import { Icons } from '../design/icons';
import type { Stop } from '../types';
import { Colors, IconColors } from '../design/tokens';
import { wmo, DAYS } from '../domain/trip';
import type { WeatherDaily } from '../domain/trip';
import { WeatherIcon } from './WeatherIcon';

interface WeatherStripProps {
  stop: Stop;
  weatherData: Record<string, WeatherDaily>;
}

export function WeatherStrip({ stop, weatherData }: WeatherStripProps) {
  const data = weatherData[stop.id];
  const tripStart = new Date(stop.weather_start + "T12:00:00");
  const today = new Date();
  const daysOut = Math.ceil((tripStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const availDate = new Date(tripStart.getTime() - 15 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <div style={{marginBottom:"22px"}}>
      <div style={{fontSize:"0.72rem",fontWeight:"bold",color:stop.accent,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"9px",display:"flex",alignItems:"center",gap:5}}><WeatherIcon emoji="🌤️" size={13} /> Forecast — {stop.city}</div>
      {!data ? (
        <div style={{background:stop.accent+"08",border:"1px dashed "+stop.accent+"30",borderRadius:"10px",padding:"14px 18px",display:"flex",alignItems:"center",gap:"12px"}}>
          <Icons.CalendarBlank size={26} weight="duotone" color={stop.accent} />
          <div>
            <div style={{fontWeight:"bold",fontSize:"0.85rem",color:Colors.textPrimary}}>Forecast not yet available</div>
            <div style={{fontSize:"0.8rem",color:Colors.textMuted,marginTop:"2px"}}>{daysOut > 16 ? "Opens around " + availDate + " — will auto-populate on refresh." : "Loading weather data…"}</div>
          </div>
        </div>
      ) : (
        <div style={{display:"flex",gap:"8px",overflowX:"auto",paddingBottom:"2px"}}>
          {data.time.map((dt, i) => {
            const d = new Date(dt + "T12:00:00");
            const w = wmo(data.weathercode[i]);
            const hi = Math.round(data.temperature_2m_max[i]);
            const lo = Math.round(data.temperature_2m_min[i]);
            const precip = data.precipitation_probability_max[i];
            return (
              <div key={i} style={{flex:"0 0 auto",minWidth:"84px",background:Colors.surface,border:"1px solid "+stop.accent+"22",borderRadius:"12px",padding:"12px 10px",textAlign:"center",boxShadow:"0 1px 5px "+stop.accent+"0D"}}>
                <div style={{fontSize:"0.68rem",fontWeight:"bold",color:Colors.textMuted,letterSpacing:"0.06em"}}>{DAYS[d.getDay()]}</div>
                <div style={{fontSize:"0.68rem",color:Colors.textMuted,marginBottom:"7px"}}>{d.getMonth()+1}/{d.getDate()}</div>
                <div style={{lineHeight:1,marginBottom:"5px",display:"flex",justifyContent:"center"}}><WeatherIcon emoji={w.e} size={26} /></div>
                <div style={{fontSize:"0.68rem",color:Colors.textMuted,marginBottom:"5px"}}>{w.d}</div>
                <div style={{fontWeight:"bold",fontSize:"0.88rem",color:Colors.textPrimary}}>{hi}°<span style={{fontWeight:"normal",color:Colors.textMuted,fontSize:"0.78rem"}}> {lo}°</span></div>
                <div style={{fontSize:"0.7rem",color:precip>50?Colors.navyLight:Colors.textMuted,marginTop:"4px",fontWeight:precip>50?"bold":"normal",display:"flex",alignItems:"center",justifyContent:"center",gap:2}}><Icons.Drop size={10} weight="duotone" color={precip>50?IconColors.weatherRain:Colors.textMuted} />{precip}%</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
