// deno-lint-ignore-file jsx-no-useless-fragment
import { useEffect, useState } from "react";
import { cookie } from "../utils/cookie.ts";
import "./Header.css";
import { GameMode } from "../constants.ts";

type Settings = {
  mode: GameMode;
  clickAfterStyle: string;
  clickBeforeStyle: string;
  changeMode: (newMode: GameMode) => void;
  I18N: { [key: string]: string };
};

const Header = (
  { settings, gameTime, gameTapRate, gameScore, score, tapRate }: {
    settings: Settings;
    gameTime: number;
    gameTapRate: string;
    gameScore: number;
    score: number;
    tapRate: number;
  },
) => {
  const [bestScore, setBestScore] = useState(() => {
    const cookieName = settings.mode === "NORMAL"
      ? "best-score"
      : "endless-best-score";
    return parseFloat(cookie(cookieName) || "0");
  });
  const scoreToString = (score: number) => {
    return settings.mode === "ENDLESS" ? score.toFixed(2) : score.toString();
  };

  const getBestScore = (score: number, tapRate: number) => {
    const cookieName = settings.mode === "NORMAL"
      ? "best-score"
      : "endless-best-score";
    const tapRateCookieName = settings.mode === "NORMAL"
      ? "normal-best-tap-rate"
      : "endless-best-tap-rate";

    const currentBest = parseFloat(cookie(cookieName) || "0");
    const currentBestCPS = parseFloat(cookie(tapRateCookieName) || "0");

    // スコアとCPSの両方を考慮してベストスコアを判定
    const isNewBest = score > currentBest ||
      (score === currentBest && tapRate > currentBestCPS);

    const { mode } = settings;

    if (isNewBest) {
      console.log("[Best Score] New record!", {
        mode,
        previousBest: currentBest,
        previousBestCPS: currentBestCPS,
        newBest: score,
        newBestCPS: tapRate,
        currentScore: score,
        currentCPS: tapRate,
      });

      // スコアとCPSの両方を保存
      cookie(cookieName, score.toFixed(2), 100);
      cookie(tapRateCookieName, tapRate.toFixed(2), 100);
      setBestScore(score);
    }

    return {
      score: Math.max(currentBest, score),
      tapRate: Math.max(currentBestCPS, tapRate),
    };
  };

  useEffect(() => {
    const bestScores = getBestScore(score, tapRate);
    console.log(scoreToString(bestScores.score));
  }, [gameScore])

  useEffect(() => {
    // ベストスコアの更新を監視
    const cookieName = settings.mode === "NORMAL"
      ? "best-score"
      : "endless-best-score";
    const currentBest = parseFloat(cookie(cookieName) || "0");
    if (currentBest !== bestScore) {
      setBestScore(currentBest);
    }
  }, [settings.mode, score]);

  return (
    <div className="Header">
      <div className="GameMode">
        {settings.I18N[
          settings.mode === "NORMAL"
            ? "normal"
            : settings.mode === "ENDLESS"
            ? "endless"
            : "practice"
        ]}
      </div>
      <div className="Score">
        {settings.mode === "NORMAL"
          ? (
            <div className="ScoreItem">
              <div>Time</div>
              <div>{gameTime}</div>
            </div>
          )
          : <></>}

        {settings.mode !== "PRACTICE"
          ? (
            <div className="ScoreItem">
              <div>Tap Rate</div>
              <div>{gameTapRate}</div>
            </div>
          )
          : <></>}
        <div className="ScoreItem">
          <div>{settings.I18N["score"]}</div>
          <div>{gameScore}</div>
        </div>

        <div className="ScoreItem">
          <div>{settings.I18N["best"]}</div>
          <div>{bestScore}</div>
        </div>
      </div>
    </div>
  );
};
export default Header;
