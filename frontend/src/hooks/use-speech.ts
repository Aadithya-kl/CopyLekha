import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import type { VoiceSpeed } from "@/lib/types";

// Speaks a word with the browser's speechSynthesis. Without speech
// support every call does nothing, so the rest of the app works as usual.

export const SPEECH_RATES: Record<VoiceSpeed, number> = {
  slow: 0.75,
  normal: 0.95,
  fast: 1.15,
};

// Everything except letters, digits, apostrophes, hyphens and % is left out.
const NOT_SPOKEN = /[^\p{L}\p{N}'%-]/gu;

export const toSpokenWord = (word: string): string => word.replace(NOT_SPOKEN, "");

const isEnglish = (voice: SpeechSynthesisVoice): boolean =>
  voice.lang.toLowerCase().startsWith("en");

const isBritish = (voice: SpeechSynthesisVoice): boolean =>
  voice.lang.toLowerCase().replace("_", "-") === "en-gb";

// The name shown in the voice list. Many names already say the language
// ("Microsoft David - English (United States)"); the others get their code ("Daniel (en-GB)").
export const getVoiceLabel = (voice: SpeechSynthesisVoice): string =>
  /english/i.test(voice.name) ? voice.name : `${voice.name} (${voice.lang})`;

// The first en-GB voice, else the first English voice.
export const pickDefaultVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null =>
  voices.find(isBritish) ?? voices[0] ?? null;

const hasSpeech = (): boolean => "speechSynthesis" in window;

// Support never changes while the page is open; the build has no window, so false there.
const subscribeToNothing = () => () => {};

const readEnglishVoices = (): SpeechSynthesisVoice[] =>
  window.speechSynthesis.getVoices().filter(isEnglish);

type SpeechOptions = {
  voiceName: string | null;
  speed: VoiceSpeed;
};

export const useSpeech = ({ voiceName, speed }: SpeechOptions) => {
  const isSupported = useSyncExternalStore(subscribeToNothing, hasSpeech, () => false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Voices can arrive after the page loads.
  useEffect(() => {
    if (!isSupported) {
      return;
    }
    const synth = window.speechSynthesis;
    const handleVoicesChanged = () => setVoices(readEnglishVoices());

    handleVoicesChanged();
    synth.addEventListener("voiceschanged", handleVoicesChanged);
    return () => {
      synth.removeEventListener("voiceschanged", handleVoicesChanged);
      synth.cancel();
    };
  }, [isSupported]);

  // A saved voice that no longer exists falls back to the default.
  const voice = voices.find((item) => item.name === voiceName) ?? pickDefaultVoice(voices);
  const rate = SPEECH_RATES[speed];

  // A new word stops the one being spoken, so no queue builds up.
  const speak = useCallback(
    (word: string) => {
      const text = toSpokenWord(word);
      if (!isSupported || text === "") {
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.lang = voice === null ? "en-GB" : voice.lang;
      if (voice !== null) {
        utterance.voice = voice;
      }
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, rate, voice],
  );

  return { isSupported, voices, voice, speak };
};
