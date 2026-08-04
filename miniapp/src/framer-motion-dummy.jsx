import React, { forwardRef } from 'react';

const componentCache = {};

// A lightweight proxy that drops all Framer Motion specific props and returns standard HTML tags
export const motion = new Proxy({}, {
  get: (_, tag) => {
    if (!componentCache[tag]) {
      componentCache[tag] = forwardRef((props, ref) => {
        const {
          initial, animate, exit, transition, variants,
          whileHover, whileTap, whileFocus, whileDrag, whileInView,
          layoutId, layout, onLayoutAnimationComplete,
          onPan, onPanStart, onPanEnd,
          drag, dragConstraints, dragElastic,
          custom,
          ...rest
        } = props;
        
        // We pass the remaining props to the native HTML tag
        return React.createElement(tag, { ...rest, ref });
      });
      componentCache[tag].displayName = `motion(${tag})`;
    }
    return componentCache[tag];
  }
});

// AnimatePresence becomes a simple transparent pass-through
export const AnimatePresence = ({ children }) => <>{children}</>;
