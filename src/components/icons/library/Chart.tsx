/**
 * Chart icon - Stats/Data
 * Organic line chart design
 */

import { Icon, IconProps } from "../Icon";

export function ChartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shadow layer */}
        <path
          className="shadow"
          d="M4.5 18.5L8.5 13.5L12.5 15.5L16.5 9.5L20.5 12.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Base layer */}
        <path
          className="base"
          d="M4 18L8 13L12 15L16 9L20 12"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Accent dots at data points */}
        <circle className="accent" cx="8" cy="13" r="1.5" />
        <circle className="accent" cx="16" cy="9" r="1.5" />
      </svg>
    </Icon>
  );
}


