/**
 * User icon - Profile/Account
 * Simple user profile silhouette design
 */

import { Icon, IconProps } from "../Icon";

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shadow layers */}
        <circle className="shadow" cx="12" cy="8" r="3.5" />
        <path
          className="shadow"
          d="M6.5 19.5C6.5 16.5 8.5 14.5 12 14.5C15.5 14.5 17.5 16.5 17.5 19.5"
        />
        
        {/* Base layers */}
        <circle 
          className="base" 
          cx="12" 
          cy="8" 
          r="3" 
          stroke="currentColor" 
          strokeWidth="2"
        />
        <path
          className="base"
          d="M6 19C6 16 8 14 12 14C16 14 18 16 18 19"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        
        {/* Accent dot */}
        <circle className="accent" cx="12" cy="8" r="0.8" />
      </svg>
    </Icon>
  );
}






















