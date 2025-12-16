/**
 * Target icon - Stats/Data
 * Organic concentric circles target design
 */

import { Icon, IconProps } from "../Icon";

export function TargetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shadow layers */}
        <circle className="shadow" cx="12.3" cy="12.3" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle className="shadow" cx="12.3" cy="12.3" r="5.5" stroke="currentColor" strokeWidth="2" fill="none" />
        
        {/* Base layers */}
        <circle className="base" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle className="base" cx="12" cy="12" r="5.5" stroke="currentColor" strokeWidth="2" fill="none" />
        
        {/* Accent - center bullseye */}
        <circle className="accent" cx="12" cy="12" r="2.2" />
      </svg>
    </Icon>
  );
}


