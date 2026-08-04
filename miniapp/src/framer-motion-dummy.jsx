import React, { forwardRef } from 'react';

// A lightweight proxy that drops all Framer Motion specific props and returns standard HTML tags
export const motion = new Proxy({}, {
  get: (_, tag) => {
    return forwardRef((props, ref) => {
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
  }
});

// AnimatePresence becomes a simple transparent pass-through
export const AnimatePresence = ({ children }) => <>{children}</>;
