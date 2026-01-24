/**
 * LogIn icon - Sign in/Authentication
 * Arrow entering door design
 */

import { Icon, IconProps } from "../Icon";

export function LogInIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shadow layers */}
        <path
          className="shadow"
          d="M15.5 5.5H18.5C19.5 5.5 20.5 6.5 20.5 7.5V16.5C20.5 17.5 19.5 18.5 18.5 18.5H15.5"
        />
        <path className="shadow" d="M9.5 12.5H17.5M14.5 9.5L17.5 12.5L14.5 15.5" />
        
        {/* Base layers */}
        <path
          className="base"
          d="M15 5H18C19 5 20 6 20 7V17C20 18 19 19 18 19H15"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          className="base"
          d="M9 12H17M14 9L17 12L14 15"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Accent line at entry */}
        <line className="accent" x1="4" y1="6" x2="4" y2="18" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </Icon>
  );
}





























