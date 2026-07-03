import { useEffect, useRef } from 'react';
import { animate } from 'framer-motion';

export default function CountUp({ value, duration = 0.6, className = '' }) {
  const nodeRef = useRef();
  const prevValue = useRef(0);

  useEffect(() => {
    const node = nodeRef.current;
    
    // Parse value, removing non-numeric chars if string, but keeping decimals
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : value;
    const oldNumericValue = prevValue.current;

    const controls = animate(oldNumericValue, numericValue, {
      duration,
      ease: "easeOut",
      onUpdate(val) {
        if (node) {
          // If the original value was an integer, show integer, else show 2 decimals
          if (Number.isInteger(numericValue) && Number.isInteger(oldNumericValue)) {
            node.textContent = Math.round(val).toString();
          } else {
            node.textContent = val.toFixed(2);
          }
        }
      }
    });

    prevValue.current = numericValue;

    return () => controls.stop();
  }, [value, duration]);

  return <span ref={nodeRef} className={`tabular-nums ${className}`} />;
}
