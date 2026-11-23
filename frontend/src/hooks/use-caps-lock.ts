import { type KeyboardEvent, useCallback, useState } from "react";

// The "Caps Lock is on" notice. The typing box passes its own
// key events here; there is no listener on the window.
export const useCapsLock = () => {
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  const handleKeyEvent = useCallback((event: KeyboardEvent) => {
    setIsCapsLockOn(event.getModifierState("CapsLock"));
  }, []);

  return { isCapsLockOn, handleKeyEvent };
};
