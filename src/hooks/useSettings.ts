import * as ja from "../assets/i18n/ja.json" with { type: "json" };
import * as zh from "../assets/i18n/zh.json" with { type: "json" };
import * as en from "../assets/i18n/en.json" with { type: "json" };
import { useEffect, useState } from "react";
import { cookie } from "../utils/cookie.ts";
import {
  GameMode,
  I18nKey,
  MODE_ENDLESS,
  MODE_NORMAL,
  MODE_PRACTICE,
  SoundType,
} from "../constants.ts";
import clickBeforeImage from "../image/ClickBefore.png";
import clickAfterImage from "../image/AfterClicking.png";

export type Settings = {
  mode: GameMode;
  clickAfterStyle: string;
  clickBeforeStyle: string;
  changeMode: (newMode: GameMode) => void;
  I18N: { [key: string]: string };
  map: { [key: string]: number };
  gameSettingNum: number;
  columns: number;
  changeSoundMode: () => void;
  handleClickAfterImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  resetClickBeforeImage: () => void;
  resetClickAfterImage: () => void;
  handleSoundUpload: (
    event: React.ChangeEvent<HTMLInputElement>,
    soundType: SoundType,
  ) => void;
  handleClickBeforeImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  resetSound: (soundType: SoundType) => void;
  setGameSettingNum: React.Dispatch<React.SetStateAction<number>>;
  setColumns: React.Dispatch<React.SetStateAction<number>>;
};

const useSettings = (
  { soundMode, toggleSoundMode, updateSound }: {
    soundMode: "on" | "off";
    toggleSoundMode: () => void;
    updateSound: (soundType: SoundType, soundData: string | null) => void;
  },
) => {
  const userLang = navigator.language.startsWith("ja")
    ? "ja"
    : navigator.language.startsWith("en")
    ? "en"
    : "zh";
  const I18N = userLang === "ja"
    ? ja.default
    : userLang === "en"
    ? en.default
    : zh.default;

  const getI18nText = (key: I18nKey): string => {
    return I18N[key] || key;
  };

  const [mode, setMode] = useState<GameMode>(() => {
    const savedMode = cookie("gameMode");
    if (!savedMode) return "NORMAL";
    return savedMode === MODE_ENDLESS.toString()
      ? "ENDLESS"
      : savedMode === MODE_PRACTICE.toString()
      ? "PRACTICE"
      : "NORMAL";
  });
  const [_customSounds, setCustomSounds] = useState<{ [key: string]: string }>(
    () => {
      const saved = {
        tap: localStorage.getItem("customSound_tap") || "",
        err: localStorage.getItem("customSound_err") || "",
        end: localStorage.getItem("customSound_end") || "",
      };
      return Object.fromEntries(
        Object.entries(saved).filter(([_, v]) => v !== ""),
      );
    },
  );
  const [clickBeforeStyle, setClickBeforeStyle] = useState<string>("");
  const [clickAfterStyle, setClickAfterStyle] = useState<string>("");
  const [columns, setColumns] = useState(4);
  const [gameSettingNum, setGameSettingNum] = useState(20);
  const [map, setMap] = useState<{ [key: string]: number }>({
    "d": 1,
    "f": 2,
    "j": 3,
    "k": 4,
  });

  const initSetting = () => {
    let keyboard = cookie("keyboard");
    if (keyboard) {
      keyboard = keyboard.toString().toLowerCase();
      const keyboardInput = document.getElementById(
        "keyboard",
      ) as HTMLInputElement;
      if (keyboardInput) {
        keyboardInput.value = keyboard;
      }
      const newMap: { [key: string]: number } = {};
      newMap[keyboard.charAt(0)] = 1;
      newMap[keyboard.charAt(1)] = 2;
      newMap[keyboard.charAt(2)] = 3;
      newMap[keyboard.charAt(3)] = 4;
      setMap(newMap);
    }

    if (cookie("gameTime")) {
      const gameTime = parseInt(cookie("gameTime"));
      setGameSettingNum(gameTime);

      if (isNaN(gameTime) || gameTime <= 0) {
        setGameSettingNum(20);
        cookie("gameTime", 20);
        alert(I18N["time-over"]);
      }
    }
  };

  const changeMode = (newMode: GameMode) => {
    setMode(newMode);
    cookie(
      "gameMode",
      newMode === "NORMAL"
        ? MODE_NORMAL
        : newMode === "ENDLESS"
        ? MODE_ENDLESS
        : MODE_PRACTICE,
    );
  };

  const changeSoundMode = () => {
    toggleSoundMode();
    cookie("soundMode", soundMode === "on" ? "off" : "on");
  };

  const saveImage = (file: File, callback: (result: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        callback(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClickAfterImage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.files && event.target.files[0]) {
      saveImage(event.target.files[0], (result) => {
        const style = `
                    .tt1, .tt2, .tt3, .tt4, .tt5 {
                        background-size: auto 86%;
                        background-image: url("${result}");
                    }
                `;
        setClickAfterStyle(style);
        localStorage.setItem("clickAfterImage", result);
      });
      saveCookie();
    }
  };

  const resetClickBeforeImage = () => {
    const style = `
            .t1, .t2, .t3, .t4, .t5 {
                background-size: auto 100%;
                background-image: url("${clickBeforeImage}");
            }
        `;
    setClickBeforeStyle(style);
    localStorage.removeItem("clickBeforeImage");
    saveCookie();
  };

  const resetClickAfterImage = () => {
    const style = `
            .tt1, .tt2, .tt3, .tt4, .tt5 {
                background-size: auto 86%;
                background-image: url("${clickAfterImage}");
            }
        `;
    setClickAfterStyle(style);
    localStorage.removeItem("clickAfterImage");
    saveCookie();
  };

  const handleSoundUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    soundType: SoundType,
  ) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (!file.type.startsWith("audio/")) {
        alert(getI18nText("sound-type-error"));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setCustomSounds((prev) => {
            const newSounds = { ...prev, [soundType]: reader.result as string };
            localStorage.setItem(
              `customSound_${soundType}`,
              reader.result as string,
            );
            updateSound(soundType, reader.result as string);
            return newSounds;
          });
        }
      };
      reader.readAsDataURL(file);
      saveCookie();
    }
  };

  const resetSound = (soundType: SoundType) => {
    setCustomSounds((prev) => {
      const newSounds = { ...prev };
      delete newSounds[soundType];
      localStorage.removeItem(`customSound_${soundType}`);
      updateSound(soundType, null);
      return newSounds;
    });
    saveCookie();
  };

  const saveCookie = () => {
    const settings = ["keyboard", "gameTime"];
    for (const s of settings) {
      const element = document.getElementById(s) as HTMLInputElement;
      const value = element?.value;
      if (value) {
        cookie(s, value.toString(), 100);
      }
    }
    initSetting();
  };

  const handleClickBeforeImage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.files && event.target.files[0]) {
      saveImage(event.target.files[0], (result) => {
        const style = `
                        .t1, .t2, .t3, .t4, .t5 {
                            background-size: auto 100%;
                            background-image: url("${result}");
                        }
                    `;
        setClickBeforeStyle(style);
        localStorage.setItem("clickBeforeImage", result);
      });
      saveCookie();
    }
  };

  useEffect(() => {
    const savedBeforeImage = localStorage.getItem("clickBeforeImage");
    const savedAfterImage = localStorage.getItem("clickAfterImage");

    setClickBeforeStyle(`
            .t1, .t2, .t3, .t4, .t5 {
                background-size: auto 100%;
                background-image: url("${
      savedBeforeImage || clickBeforeImage
    }");
            }
        `);

    setClickAfterStyle(`
            .tt1, .tt2, .tt3, .tt4, .tt5 {
                background-size: auto 86%;
                background-image: url("${savedAfterImage || clickAfterImage}");
            }
        `);
    initSetting();
  }, []);

  useEffect(() => {
    cookie("gameTime", gameSettingNum.toString(), 100);
  }, [gameSettingNum]);

  return {
    mode,
    clickAfterStyle,
    clickBeforeStyle,
    changeMode,
    I18N,
    map,
    gameSettingNum,
    columns,
    changeSoundMode,
    handleClickAfterImage,
    resetClickBeforeImage,
    resetClickAfterImage,
    handleSoundUpload,
    handleClickBeforeImage,
    resetSound,
    setGameSettingNum,
    setColumns,
    setClickBeforeStyle,
    setClickAfterStyle,
  };
};

export default useSettings;
