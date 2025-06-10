import { useCallback, useEffect, useState } from "react";
import { SOUND_FILES, SoundType } from "../constants.ts";

export const useSound = (initialSoundMode: "on" | "off" = "on") => {
  const [soundMode, setSoundMode] = useState<"on" | "off">(initialSoundMode);
  const [sounds, setSounds] = useState<Record<SoundType, HTMLAudioElement[]>>(
    {} as Record<SoundType, HTMLAudioElement[]>,
  );
  const [currentIndex, setCurrentIndex] = useState<Record<SoundType, number>>(
    {} as Record<SoundType, number>,
  );

  const loadSound = useCallback(
    (id: SoundType, customSoundData?: string | null) => {
      // 各サウンドタイプに対して複数のAudioインスタンスを作成
      const audioInstances = Array.from({ length: 4 }, () => {
        const audio = new Audio(customSoundData || SOUND_FILES[id]);
        audio.preload = "auto"; // 事前読み込みを設定
        return audio;
      });
      return audioInstances;
    },
    [],
  );

  const reloadSounds = useCallback(() => {
    const loadedSounds: Record<SoundType, HTMLAudioElement[]> = {} as Record<
      SoundType,
      HTMLAudioElement[]
    >;
    const initialIndexes: Record<SoundType, number> = {} as Record<
      SoundType,
      number
    >;

    Object.keys(SOUND_FILES).forEach((id) => {
      const customSound = localStorage.getItem(`customSound_${id}`);
      loadedSounds[id as SoundType] = loadSound(id as SoundType, customSound);
      initialIndexes[id as SoundType] = 0;
    });

    setSounds(loadedSounds);
    setCurrentIndex(initialIndexes);
  }, [loadSound]);

  useEffect(() => {
    reloadSounds();

    return () => {
      // クリーンアップ時に全ての音声インスタンスを解放
      Object.values(sounds).forEach((audioArray) => {
        audioArray.forEach((audio) => {
          audio.pause();
          audio.currentTime = 0;
        });
      });
    };
  }, [reloadSounds]);

  const updateSound = useCallback(
    (soundType: SoundType, soundData: string | null) => {
      console.log("[Sound Update]", { soundType, hasData: !!soundData });
      const audioInstances = loadSound(soundType, soundData);
      setSounds((prev) => ({
        ...prev,
        [soundType]: audioInstances,
      }));
      setCurrentIndex((prev) => ({
        ...prev,
        [soundType]: 0,
      }));
    },
    [loadSound],
  );

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith("customSound_")) {
        const soundType = e.key.replace("customSound_", "") as SoundType;
        if (soundType in sounds) {
          updateSound(soundType, e.newValue);
        }
      }
    };

    globalThis.addEventListener("storage", handleStorageChange);
    return () => globalThis.removeEventListener("storage", handleStorageChange);
  }, [sounds, updateSound]);

  const playSound = (soundId: SoundType) => {
    if (soundMode === "on" && sounds[soundId]) {
      const audioArray = sounds[soundId];
      const currentIdx = currentIndex[soundId];

      // 現在のインデックスのオーディオインスタンスを取得
      const audio = audioArray[currentIdx];

      if (audio) {
        // 再生位置をリセットして再生
        audio.currentTime = 0;
        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn("Failed to play sound:", error);
          });
        }

        // 次のインデックスを設定（ローテーション）
        setCurrentIndex((prev) => ({
          ...prev,
          [soundId]: (currentIdx + 1) % audioArray.length,
        }));
      }
    }
  };

  const toggleSoundMode = () => {
    setSoundMode((prev) => prev === "on" ? "off" : "on");
  };

  return {
    soundMode,
    setSoundMode,
    playSound,
    toggleSoundMode,
    updateSound,
  };
};
