/**
 * Fire icon - Stats/Data
 * Organic flame design for streaks/hot topics
 */

import { Icon, IconProps } from "../Icon";

export function FireIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shadow layer */}
        <path
          className="shadow"
          d="M12.5 3.5C12.5 3.5 16.5 8.5 16.5 12.5C16.5 15 15 17.5 12.5 17.5C10 17.5 8.5 15 8.5 12.5C8.5 10.5 10 8.5 10 8.5C10 8.5 9 11 9.5 13C10 15 11 16 12.5 16C14 16 15 15 15.5 13C16 11 12.5 3.5 12.5 3.5Z"
        />
        
        {/* Base layer */}
        <path
          className="base"
          d="M12 3C12 3 16 8 16 12C16 14.5 14.5 17 12 17C9.5 17 8 14.5 8 12C8 10 9.5 8 9.5 8C9.5 8 8.5 10.5 9 12.5C9.5 14.5 10.5 15.5 12 15.5C13.5 15.5 14.5 14.5 15 12.5C15.5 10.5 12 3 12 3Z"
        />
        
        {/* Accent highlights */}
        <circle className="accent" cx="12" cy="10" r="1.2" />
        <circle className="accent" cx="11" cy="13.5" r="0.8" />
        
        {/* Base for flame */}
        <ellipse className="base" cx="12" cy="18.5" rx="3.5" ry="1.5" />
      </svg>
    </Icon>
  );
}


