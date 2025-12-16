/**
 * Animated number component with smooth transitions
 */

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  decimals?: number;
  duration?: number;
}

export function AnimatedNumber({
  value,
  className = "",
  decimals = 0,
  duration = 0.5,
}: AnimatedNumberProps) {
  const spring = useSpring(value, {
    duration: duration * 1000,
    bounce: 0,
  });
  
  const display = useTransform(spring, (current) =>
    current.toFixed(decimals)
  );
  
  const [displayValue, setDisplayValue] = useState(value.toFixed(decimals));
  
  useEffect(() => {
    spring.set(value);
    const unsubscribe = display.on("change", (latest) => {
      setDisplayValue(latest);
    });
    
    return () => unsubscribe();
  }, [value, spring, display]);
  
  return (
    <motion.span className={className}>
      {displayValue}
    </motion.span>
  );
}

