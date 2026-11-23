import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SettingsPopover } from "@/components/SettingsPopover";
import { DEFAULT_SETTINGS } from "@/lib/storage";

const voice = (name: string, lang: string) =>
  ({ name, lang, voiceURI: name }) as SpeechSynthesisVoice;
const DANIEL = voice("Daniel", "en-GB");
const SAMANTHA = voice("Samantha", "en-US");

const setup = (voices: SpeechSynthesisVoice[] = [DANIEL, SAMANTHA]) => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <SettingsPopover
      settings={DEFAULT_SETTINGS}
      isReady
      onChange={onChange}
      voices={voices}
      voice={voices[0] ?? null}
      onCloseAutoFocus={() => {}}
    />,
  );
  return {
    user,
    onChange,
    open: () => user.click(screen.getByRole("button", { name: "Settings" })),
  };
};

afterEach(() => {
  cleanup();
});

describe("SettingsPopover", () => {
  it("shows the current theme and text size", async () => {
    const { open } = setup();
    await open();

    expect(screen.getByRole("radio", { name: "System" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("combobox", { name: "Text size" }).textContent).toBe("20 px");
  });

  it("changes the theme", async () => {
    const { user, onChange, open } = setup();
    await open();
    await user.click(screen.getByRole("radio", { name: "Dark" }));

    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, theme: "dark" });
  });

  it("offers text sizes from 16 to 28 px in steps of 2 and changes it", async () => {
    const { user, onChange, open } = setup();
    await open();
    await user.click(screen.getByRole("combobox", { name: "Text size" }));

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "16 px",
      "18 px",
      "20 px",
      "22 px",
      "24 px",
      "26 px",
      "28 px",
    ]);

    await user.click(screen.getByRole("option", { name: "24 px" }));

    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, fontSize: 24 });
  });
});

describe("SettingsPopover: voice and speed", () => {
  it("lists the English voices and changes the voice", async () => {
    const { user, onChange, open } = setup();
    await open();
    const voiceSelect = screen.getByRole("combobox", { name: "Voice" });

    expect(voiceSelect.textContent).toBe("Daniel (en-GB)");

    await user.click(voiceSelect);
    await user.click(screen.getByRole("option", { name: "Samantha (en-US)" }));

    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, voiceName: "Samantha" });
  });

  it("changes the voice speed", async () => {
    const { user, onChange, open } = setup();
    await open();
    await user.click(screen.getByRole("combobox", { name: "Voice speed" }));

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Slow",
      "Normal",
      "Fast",
    ]);

    await user.click(screen.getByRole("option", { name: "Fast" }));

    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, speed: "fast" });
  });

  it("disables the voice list when there is no English voice", async () => {
    const { open } = setup([]);
    await open();
    const voiceSelect = screen.getByRole("combobox", { name: "Voice" });

    expect(voiceSelect.hasAttribute("disabled")).toBe(true);
    expect(voiceSelect.textContent).toBe("No English voice found");
  });
});
