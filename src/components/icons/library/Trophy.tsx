/**
 * Trophy icon - Stats/Data
 * Organic trophy design
 */

import { Icon, IconProps } from "../Icon";

export function TrophyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shadow layers */}
        <path
          className="shadow"
          d="M8.5 4.5H15.5V9.5C15.5 12 14 13.5 12 13.5C10 13.5 8.5 12 8.5 9.5V4.5Z"
        />
        <rect className="shadow" x="7.5" y="17.5" width="9" height="2" rx="1" />
        
        {/* Base layers */}
        <path
          className="base"
          d="M8 4H16V9C16 11.5 14.5 13 12 13C9.5 13 8 11.5 8 9V4Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <line className="base" x1="12" y1="13" x2="12" y2="17" stroke="currentColor" strokeWidth="2" />
        <rect className="base" x="7" y="17" width="10" height="2.5" rx="1" />
        
        {/* Handles */}
        <path className="base" d="M8 6H6C5 6 4 7 4 8V9C4 10 5 11 6 11H8" stroke="currentColor" strokeWidth="2" />
        <path className="base" d="M16 6H18C19 6 20 7 20 8V9C20 10 19 11 18 11H16" stroke="currentColor" strokeWidth="2" />
        
        {/* Accent star */}
        <circle className="accent" cx="12" cy="7.5" r="1.5" />
      </svg>
    </Icon>
  );
}

