"use client";

import { Settings as SettingsIcon } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getVoiceLabel } from "@/hooks/use-speech";
import { FONT_SIZE_STEP, MAX_FONT_SIZE, MIN_FONT_SIZE } from "@/lib/storage";
import type { Settings, Theme, VoiceSpeed } from "@/lib/types";

// Theme, text size, voice and voice speed. Every change is saved at once.

const THEME_OPTIONS: readonly { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const FONT_SIZES: readonly number[] = Array.from(
  { length: (MAX_FONT_SIZE - MIN_FONT_SIZE) / FONT_SIZE_STEP + 1 },
  (_, step) => MIN_FONT_SIZE + step * FONT_SIZE_STEP,
);

const SPEED_OPTIONS: readonly { value: VoiceSpeed; label: string }[] = [
  { value: "slow", label: "Slow" },
  { value: "normal", label: "Normal" },
  { value: "fast", label: "Fast" },
];

const isTheme = (value: string): value is Theme =>
  THEME_OPTIONS.some((option) => option.value === value);

const isVoiceSpeed = (value: string): value is VoiceSpeed =>
  SPEED_OPTIONS.some((option) => option.value === value);

type SettingsPopoverProps = {
  settings: Settings;
  // False until the stored settings are read.
  isReady: boolean;
  onChange: (settings: Settings) => void;
  // The English voices of this browser, and the one in use.
  voices: SpeechSynthesisVoice[];
  voice: SpeechSynthesisVoice | null;
  // Called instead of the popover's own focus return, so focus can go to the typing box.
  onCloseAutoFocus: (event: Event) => void;
};

export const SettingsPopover = ({
  settings,
  isReady,
  onChange,
  voices,
  voice,
  onCloseAutoFocus,
}: SettingsPopoverProps) => {
  const themeLabelId = useId();
  const fontSizeId = useId();
  const voiceId = useId();
  const speedId = useId();
  const titleId = useId();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon-lg" aria-label="Settings" disabled={!isReady}>
          <SettingsIcon aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-labelledby={titleId}
        // Wide enough for long voice names, never wider than a phone screen.
        className="flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-5"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <h2 id={titleId} className="font-semibold">
          Settings
        </h2>

        <div className="flex flex-col gap-2">
          <p id={themeLabelId} className="text-sm font-medium">
            Theme
          </p>
          <RadioGroup
            aria-labelledby={themeLabelId}
            value={settings.theme}
            onValueChange={(value) => isTheme(value) && onChange({ ...settings, theme: value })}
            className="flex gap-4"
          >
            {THEME_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <RadioGroupItem value={option.value} id={`${themeLabelId}-${option.value}`} />
                <Label htmlFor={`${themeLabelId}-${option.value}`} className="font-normal">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={fontSizeId}>Text size</Label>
          <Select
            value={String(settings.fontSize)}
            onValueChange={(value) => onChange({ ...settings, fontSize: Number(value) })}
          >
            <SelectTrigger id={fontSizeId} className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={voiceId}>Voice</Label>
          {/* Without English voices (or speech support) there is nothing to choose. */}
          <Select
            value={voice === null ? undefined : voice.name}
            onValueChange={(value) => onChange({ ...settings, voiceName: value })}
            disabled={voices.length === 0}
          >
            <SelectTrigger id={voiceId} className="w-full">
              <SelectValue placeholder="No English voice found" />
            </SelectTrigger>
            <SelectContent>
              {voices.map((item) => (
                <SelectItem key={item.voiceURI} value={item.name}>
                  {getVoiceLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={speedId}>Voice speed</Label>
          <Select
            value={settings.speed}
            onValueChange={(value) =>
              isVoiceSpeed(value) && onChange({ ...settings, speed: value })
            }
          >
            <SelectTrigger id={speedId} className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEED_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
};
