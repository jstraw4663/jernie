import type { ReactNode } from 'react';

interface CollapsibleSectionProps {
  color: string;
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  rightSlot?: ReactNode;
}

export function CollapsibleSection({ color, label, open, onToggle, children, rightSlot }: CollapsibleSectionProps) {
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
