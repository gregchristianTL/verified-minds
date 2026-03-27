/** Sound name → file path mapping for the app */
export const SOUND_MAP = {
  click: "/sounds/click.mp3",
  hover: "/sounds/hover.mp3",
  success: "/sounds/success.mp3",
  error: "/sounds/error.mp3",
  navigate: "/sounds/navigate.mp3",
  send: "/sounds/send.mp3",
  receive: "/sounds/receive.mp3",
  toggle: "/sounds/toggle.mp3",
} as const;

export type SoundName = keyof typeof SOUND_MAP;

/** Volume presets per sound - some should be more subtle than others */
export const SOUND_VOLUMES: Record<SoundName, number> = {
  click: 0.3,
  hover: 0.08,
  success: 0.4,
  error: 0.25,
  navigate: 0.15,
  send: 0.2,
  receive: 0.15,
  toggle: 0.2,
};
