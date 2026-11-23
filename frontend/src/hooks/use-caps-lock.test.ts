import { act, renderHook } from "@testing-library/react";
import type { KeyboardEvent } from "react";
import { describe, expect, it } from "vitest";

import { useCapsLock } from "@/hooks/use-caps-lock";

// The part of a key event the hook reads: whether Caps Lock is on.
const keyEvent = (isCapsLockOn: boolean) =>
  ({
    getModifierState: (key: string) => key === "CapsLock" && isCapsLockOn,
  }) as unknown as KeyboardEvent;

describe("useCapsLock", () => {
  it("is off before any key", () => {
    const { result } = renderHook(() => useCapsLock());

    expect(result.current.isCapsLockOn).toBe(false);
  });

  it("turns on with a key pressed while Caps Lock is on, and off again", () => {
    const { result } = renderHook(() => useCapsLock());

    act(() => result.current.handleKeyEvent(keyEvent(true)));
    expect(result.current.isCapsLockOn).toBe(true);

    act(() => result.current.handleKeyEvent(keyEvent(false)));
    expect(result.current.isCapsLockOn).toBe(false);
  });
});
