// deno-lint-ignore-file jsx-no-useless-fragment
import "./App.css";
import { useEffect, useRef, useState } from "react";
import { useSound } from "./hooks/useSound.ts";
import { Settings } from "./components/Settings.tsx";
import { getSoundMode } from "./utils/sound.ts";
import useSettings from "./hooks/useSettings.ts";
import { GameLayerBG } from "./components/GameLayerBG.tsx";
import { useGameLayer } from "./hooks/useGameLayer.ts";
import Header from "./components/Header.tsx";
import { GameLayerElement } from "./components/GameLayer.tsx";

function App() {
  const isDesktop = !navigator.userAgent.match(
    /(ipad|iphone|ipod|android|globalThiss phone)/i,
  );

  const [isShown, setShown] = useState(false);
  const [welcomeLayerClosed, setWelcomeLayerClosed] = useState(false);

  const [gameTime, setGameTime] = useState<number>(20);

  const gameLayerBGRef = useRef<HTMLDivElement>(null);
  const gameLayerRefs = useRef<GameLayerElement[]>([]);
  const activeRef = useRef(false);
  const bodyRef = useRef<HTMLElement | null>(null);
  const { playSound, soundMode, toggleSoundMode, updateSound } = useSound(
    getSoundMode(),
  );
  const settings = useSettings({ soundMode, toggleSoundMode, updateSound });

  const {
    gameBBList,
    gameBBListIndex,
    gameRestart,
    gameScore,
    gameTapRate,
    gameTimeNum,
    handleGameTap,
    tapRate,
    touchArea,
    score,
  } = useGameLayer({
    playSound,
    settings,
    activeRef,
    gameLayerRefs,
    gameLayerBGRef,
    bodyRef,
    isDesktop,
    setShown,
    setGameTime,
  });

  const shareText = (tapRate: number) => {
    // TapRateに基づくレベル判定
    if (tapRate <= 2.5) return settings.I18N["text-level-1"];
    if (tapRate <= 5) return settings.I18N["text-level-2"];
    if (tapRate <= 7.5) return settings.I18N["text-level-3"];
    if (tapRate <= 10) return settings.I18N["text-level-4"];
    return settings.I18N["text-level-5"];
  };

  const replayBtn = () => {
    gameRestart();
    setWelcomeLayerClosed(true);
    setShown(false);
  };

  useEffect(() => {
    if (isDesktop) {
      const handleKeydown = (e: KeyboardEvent) => {
        if (!welcomeLayerClosed) return;

        const key = e.key.toLowerCase();
        if (Object.keys(settings.map).indexOf(key) !== -1) {
          const index = settings.map[key];
          const p = gameBBList[gameBBListIndex];
          if (!p) return;

          const targetElement = document.getElementById(p.id);
          if (!targetElement) return;

          const base = parseInt(targetElement.getAttribute("data-num") || "0") -
            p.cell;
          const num = base + index - 1;
          const id = p.id.substring(0, p.id.indexOf("-")) + "-" + num;
          const target = document.getElementById(id);

          if (!target) return;

          // マウスイベントをシミュレート
          const rect = target.getBoundingClientRect();
          const event = new MouseEvent("mousedown", {
            clientX: rect.left + rect.width / 2,
            clientY: (touchArea[0] + touchArea[1]) / 2,
            bubbles: true,
            cancelable: true,
          });

          target.dispatchEvent(event);
        } else if (key === "r") {
          replayBtn();
        }
      };

      document.addEventListener("keydown", handleKeydown);
      return () => document.removeEventListener("keydown", handleKeydown);
    }
  }, [
    settings.map,
    welcomeLayerClosed,
    gameBBList,
    gameBBListIndex,
    touchArea,
  ]);

  useEffect(() => {
    setGameTime(settings.gameSettingNum);
  }, [settings.gameSettingNum]);

  useEffect(() => {
    setGameTime(gameTimeNum);
  }, [gameTimeNum]);

  return (
    <div id="gameBody">
      <style>{settings.clickBeforeStyle}</style>
      <style>{settings.clickAfterStyle}</style>
      <GameLayerBG
        handleGameTap={handleGameTap}
        settings={settings}
        isDesktop={isDesktop}
        activeRef={activeRef}
        bodyRef={bodyRef}
        gameLayerBGRef={gameLayerBGRef}
        gameLayerRefs={gameLayerRefs}
      />
      <div className="SettingLayer">
        <Header
          settings={settings}
          score={score}
          tapRate={tapRate}
          gameScore={gameScore}
          gameTapRate={gameTapRate}
          gameTime={gameTime}
        />
        <div className="Toolbar">
          <button
            type="button"
            onClick={() => {
              setWelcomeLayerClosed((prev) => {
                if (!prev) {
                  replayBtn();
                }
                return !prev;
              });
            }}
          >
            {settings.I18N["home"]}
          </button>
          <button
            type="button"
            id="replay"
            onClick={replayBtn}
          >
            {settings.I18N["again"]}
          </button>
        </div>
        {isShown
          ? (
            <div className="container">
              <div id="GameScoreLayer-text">{shareText(tapRate)}</div>
            </div>
          )
          : <></>}
        {welcomeLayerClosed ? <></> : (
          <Settings
            mode={settings.mode}
            changeMode={settings.changeMode}
            soundMode={soundMode}
            I18N={settings.I18N}
            changeSoundMode={settings.changeSoundMode}
            handleSoundUpload={settings.handleSoundUpload}
            resetSound={settings.resetSound}
            gameSettingNum={settings.gameSettingNum}
            columns={settings.columns}
            setColumn={settings.setColumns}
            setGameSettingNum={settings.setGameSettingNum}
            handleClickBeforeImage={settings.handleClickBeforeImage}
            resetClickBeforeImage={settings.resetClickBeforeImage}
            handleClickAfterImage={settings.handleClickAfterImage}
            resetClickAfterImage={settings.resetClickAfterImage}
            setClickAfterStyle={settings.setClickAfterStyle}
            setClickBeforeStyle={settings.setClickBeforeStyle}
          />
        )}
      </div>
    </div>
  );
}

export default App;
