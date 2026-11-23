import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getVoiceLabel, pickDefaultVoice, toSpokenWord, useSpeech } from "@/hooks/use-speech";

const voice = (name: string, lang: string) => ({ name, lang }) as SpeechSynthesisVoice;

const US = voice("Samantha", "en-US");
const GB = voice("Daniel", "en-GB");
const FR = voice("Thomas", "fr-FR");

// A fake speechSynthesis: records what is spoken and lets a test send voiceschanged.
const createSynth = (initialVoices: SpeechSynthesisVoice[]) => {
  let voices = initialVoices;
  const listeners = new Set<() => void>();
  return {
    spoken: [] as SpeechSynthesisUtterance[],
    cancel: vi.fn(),
    speak: vi.fn(function (this: { spoken: SpeechSynthesisUtterance[] }, u) {
      this.spoken.push(u);
    }),
    getVoices: () => voices,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    setVoices: (next: SpeechSynthesisVoice[]) => {
      voices = next;
      listeners.forEach((listener) => listener());
    },
  };
};

class FakeUtterance {
  text: string;
  rate = 1;
  lang = "";
  voice: SpeechSynthesisVoice | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

let synth: ReturnType<typeof createSynth>;

beforeEach(() => {
  synth = createSynth([US, FR, GB]);
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("toSpokenWord", () => {
  it("keeps letters, digits, apostrophes, hyphens and %", () => {
    expect(toSpokenWord("years,")).toBe("years");
    expect(toSpokenWord('"well-known"')).toBe("well-known");
    expect(toSpokenWord("children's")).toBe("children's");
    expect(toSpokenWord("40%.")).toBe("40%");
    expect(toSpokenWord("(2000-2020)")).toBe("2000-2020");
  });
});

describe("getVoiceLabel", () => {
  it("adds the language code only when the name doesn't say the language", () => {
    expect(getVoiceLabel(GB)).toBe("Daniel (en-GB)");
    expect(getVoiceLabel(voice("Microsoft David - English (United States)", "en-US"))).toBe(
      "Microsoft David - English (United States)",
    );
    expect(getVoiceLabel(voice("Google UK English Female", "en-GB"))).toBe(
      "Google UK English Female",
    );
  });
});

describe("pickDefaultVoice", () => {
  it("takes the first en-GB voice, else the first voice", () => {
    expect(pickDefaultVoice([US, GB])).toBe(GB);
    expect(pickDefaultVoice([US])).toBe(US);
    expect(pickDefaultVoice([])).toBeNull();
  });
});

describe("useSpeech", () => {
  it("lists English voices only and uses en-GB by default", () => {
    const { result } = renderHook(() => useSpeech({ voiceName: null, speed: "normal" }));

    expect(result.current.isSupported).toBe(true);
    expect(result.current.voices).toEqual([US, GB]);
    expect(result.current.voice).toBe(GB);
  });

  it("speaks the word without punctuation, at the chosen speed and voice", () => {
    const { result } = renderHook(() => useSpeech({ voiceName: "Samantha", speed: "slow" }));
    act(() => result.current.speak("years,"));

    const [spoken] = synth.spoken;
    expect(spoken?.text).toBe("years");
    expect(spoken?.rate).toBe(0.75);
    expect(spoken?.voice).toBe(US);
  });

  it("stops the word being spoken before a new one", () => {
    const { result } = renderHook(() => useSpeech({ voiceName: null, speed: "fast" }));
    act(() => result.current.speak("rose"));

    expect(synth.cancel).toHaveBeenCalledBefore(synth.speak);
    expect(synth.spoken[0]?.rate).toBe(1.15);
  });

  it("says nothing for a word with no letters or digits", () => {
    const { result } = renderHook(() => useSpeech({ voiceName: null, speed: "normal" }));
    act(() => result.current.speak("..."));

    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("picks up voices that arrive late", () => {
    synth = createSynth([]);
    vi.stubGlobal("speechSynthesis", synth);
    const { result } = renderHook(() => useSpeech({ voiceName: null, speed: "normal" }));

    expect(result.current.voice).toBeNull();

    act(() => synth.setVoices([US, GB]));

    expect(result.current.voice).toBe(GB);
  });

  it("falls back to the default when the saved voice no longer exists", () => {
    const { result } = renderHook(() => useSpeech({ voiceName: "Gone", speed: "normal" }));

    expect(result.current.voice).toBe(GB);
  });

  it("does nothing, without errors, when the browser has no speech support", () => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, "speechSynthesis");
    const { result } = renderHook(() => useSpeech({ voiceName: null, speed: "normal" }));

    expect(result.current.isSupported).toBe(false);
    expect(() => act(() => result.current.speak("rose"))).not.toThrow();
  });
});
