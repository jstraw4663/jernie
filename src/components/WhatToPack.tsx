import { useState } from 'react';
import type { TripData } from '../types';

interface WhatToPackProps {
  accent: string;
  data: TripData;
  packing: Record<string, boolean>;
  onPack: (id: string, value: boolean) => void;
  onReset: () => void;
}

export function WhatToPack({ accent, data, packing, onPack, onReset }: WhatToPackProps) {
  const [open, setOpen] = useState(false);

  const totalItems = data.packing_lists.reduce((a, c) => a + c.items.length, 0);
  const checkedCount = Object.values(packing).filter(Boolean).length;

  return (
    <div style={{marginBottom:"28px"}}>
      <button onClick={() => setOpen(v => !v)} style={{width:"100%",display:"flex",alignItems:"center",gap:"12px",background:"none",border:"none",cursor:"pointer",padding:"0",marginBottom:open?"12px":"0",fontFamily:"Georgia,serif"}}>
        <div style={{fontWeight:"bold",color:accent,fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase",whiteSpace:"nowrap"}}>🎒 What to Pack</div>
        <div style={{flex:1,height:"1px",background:accent+"30"}}/>
        <span style={{fontSize:"0.7rem",color:"#999",whiteSpace:"nowrap",marginRight:"6px"}}>{checkedCount}/{totalItems} packed</span>
        <span style={{color:accent,fontSize:"0.72rem",transition:"transform 0.18s",display:"inline-block",transform:open?"rotate(180deg)":"rotate(0deg)",flexShrink:0}}>▼</span>
      </button>
      {open && (
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          {data.packing_lists.map(section => (
            <div key={section.id} style={{background:"#fff",borderRadius:"12px",border:"1px solid #e0ddd6",overflow:"hidden"}}>
              <div style={{background:accent+"0A",borderBottom:"1px solid "+accent+"15",padding:"10px 16px",fontWeight:"bold",fontSize:"0.8rem",color:accent,letterSpacing:"0.04em"}}>
                {section.category}
              </div>
              <div style={{padding:"6px 0"}}>
                {section.items.map((item, ii) => {
                  const done = !!packing[item.id];
                  return (
                    <button key={item.id} onClick={() => onPack(item.id, !packing[item.id])}
                      style={{width:"100%",display:"flex",alignItems:"center",gap:"12px",padding:"8px 16px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left",fontFamily:"Georgia,serif",borderBottom:ii<section.items.length-1?"1px solid #f5f3ef":"none",transition:"background 0.1s"}}>
                      <div style={{width:"18px",height:"18px",borderRadius:"4px",border:"2px solid "+(done?accent:"#ccc"),background:done?accent:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
                        {done && <span style={{color:"#fff",fontSize:"0.65rem",fontWeight:"bold"}}>✓</span>}
                      </div>
                      <span style={{fontSize:"0.84rem",color:done?"#bbb":"#333",textDecoration:done?"line-through":"none",lineHeight:1.4,transition:"all 0.15s"}}>{item.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {checkedCount > 0 && (
            <button onClick={onReset} style={{alignSelf:"flex-end",background:"transparent",border:"1px solid #e0ddd6",borderRadius:"6px",padding:"4px 12px",fontSize:"0.72rem",color:"#aaa",cursor:"pointer",fontFamily:"Georgia,serif"}}>
              Reset list
            </button>
          )}
        </div>
      )}
    </div>
  );
}
