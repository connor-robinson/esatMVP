/**
 * Calendar icon - Stats/Data
 * Organic rounded calendar design
 */

import { Icon, IconProps } from "../Icon";

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shadow layer */}
        <rect className="shadow" x="4.5" y="5.5" width="15" height="15" rx="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
        
        {/* Base layer */}
        <rect className="base" x="4" y="5" width="15" height="15" rx="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
        
        {/* Top bar */}
        <line className="base" x1="4" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="2" />
        
        {/* Date markers */}
        <circle className="accent" cx="9" cy="14" r="1.2" />
        <circle className="accent" cx="12" cy="14" r="1.2" />
        <circle className="accent" cx="15" cy="14" r="1.2" />
        
        {/* Hangers */}
        <line className="base" x1="8" y1="3" x2="8" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line className="base" x1="16" y1="3" x2="16" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </Icon>
  );
}

