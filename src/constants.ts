export const MODE_NORMAL = 1;
export const MODE_ENDLESS = 2;
export const MODE_PRACTICE = 3;

export type GameMode = "NORMAL" | "ENDLESS" | "PRACTICE";

export const SOUND_FILES = {
  err: "./sound/err.mp3",
  end: "./sound/end.mp3",
  tap: "./sound/tap.mp3",
} as const;

export type SoundType = keyof typeof SOUND_FILES;

// i18nのキーの型定義を追加
export type I18nKey =
  | "lang"
  | "start"
  | "normal"
  | "endless"
  | "practice"
  | "settings"
  | "sound-on"
  | "sound-off"
  | "error-sound"
  | "tap-sound"
  | "end-sound"
  | "time"
  | "key"
  | "ok"
  | "default-dfjk"
  | "default-20s"
  | "game-title"
  | "game-intro1"
  | "game-intro2"
  | "game-intro3"
  | "hint-keyboard-support"
  | "hint-pointer-support"
  | "time-up"
  | "calculating"
  | "score"
  | "best"
  | "again"
  | "home"
  | "repo"
  | "text-level-1"
  | "text-level-2"
  | "text-level-3"
  | "text-level-4"
  | "text-level-5"
  | "time-over"
  | "sound-type-error";
