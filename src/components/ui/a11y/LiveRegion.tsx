import { useEffect, useRef, useState } from 'react';

/**
 * ARIA live region for announcing dynamic content changes to screen readers.
 *
 * Usage:
 *   <LiveRegion message={`${player.health} HP remaining`} />
 *
 * The message is spoken by the screen reader when it changes.
 */
interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
}

export function LiveRegion({ message, politeness = 'polite' }: LiveRegionProps) {
  const [announced, setAnnounced] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (message === announced) return;

    // Clear first, then set after a tick — forces screen readers to re-announce
    setAnnounced('');
    timeoutRef.current = setTimeout(() => {
      setAnnounced(message);
    }, 100);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [message, announced]);

  return (
    <div
      aria-live={politeness}
      aria-atomic="true"
      role="status"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {announced}
    </div>
  );
}
