import { useEffect, useRef, useState } from "react";
import {
  BlockElement,
  createExtendedElement,
  GameBlock,
  GameLayerElement,
} from "../components/GameLayer.tsx";
import { SoundType } from "../constants.ts";
import { Settings } from "./useSettings.ts";

const _clearttClsReg = / t{1,2}\d+| bad/;
const maxScreenWidth = 632;
const TAP_THRESHOLD = 0; // 16msから8msに短縮（120FPS対応）
const _ttreg = / t{1,2}(\d+)/;

export const useGameLayer = ({
  playSound,
  settings,
  activeRef,
  gameLayerRefs,
  gameLayerBGRef,
  bodyRef,
  isDesktop,
  setShown,
  setGameTime,
}: {
  playSound: (soundId: SoundType) => void;
  settings: Settings;
  activeRef: React.RefObject<boolean>;
  gameLayerRefs: React.RefObject<GameLayerElement[]>;
  gameLayerBGRef: React.RefObject<HTMLDivElement | null>;
  bodyRef: React.RefObject<HTMLElement | null>;
  isDesktop: boolean;
  setShown: React.Dispatch<React.SetStateAction<boolean>>;
  setGameTime: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const [score, setScore] = useState(0);
  const [isGameStart, setIsGameStart] = useState(false);
  const [gameBBList, setGameBBList] = useState<GameBlock[]>([]);
  const [gameBBListIndex, setGameBBlistIndex] = useState(0);
  const [tapRate, setTapRate] = useState(0);
  const [blockSize, setBlockSize] = useState(0);
  const [touchArea, setTouchArea] = useState<number[]>([]);
  const [_transform, setTransform] = useState<string>("");
  const [gameTimeNum, setGameTimeNum] = useState(settings.gameSettingNum);
  const [gameScore, setGameScore] = useState(1);
  const [date1, setDate1] = useState<Date>();
  const [gameTapRate, setGameTapRate] = useState<string>(
    settings.I18N["calculating"],
  );
  const [gameStartTime, setGameStartTime] = useState(0);
  const [gameStartDatetime, setGameStartDatetime] = useState(0);
  const [isGameOver, setGameOver] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [isClickable, setClickable] = useState(false);
  const refreshSizeTimeRef = useRef<number | null>(null);
  const gameTimeIntervalRef = useRef<number | null>(null);
  const gameScoreRef = useRef<number | null>(null);
  const date1Ref = useRef<Date | undefined>(undefined);
  const blockSizeRef = useRef(0);

  const gameStart = () => {
    if (settings.mode === "PRACTICE") {
      setIsGameStart(true);
      return;
    }

    const now = new Date();
    setIsGameStart(true);
    setGameStartDatetime(now.getTime());

    const { gameSettingNum } = settings;

    if (settings.mode === "NORMAL") {
      console.log("[NORMAL] Game Start:", {
        time: now.getTime(),
        gameSettingNum,
        gameTimeNum,
      });
      setDate1(now);
    }

    if (!gameTimeIntervalRef.current) {
      gameTimeIntervalRef.current = globalThis.setInterval(timer, 1000);
    }
  };

  const getCPS = () => {
    if (
      !gameStartDatetime || !gameScore ||
      gameStartTime < 2
    ) {
      return 0;
    }
    const timeDiff = (new Date().getTime() - gameStartDatetime) / 1000;
    if (timeDiff <= 0) {
      return 0;
    }
    return gameScore / timeDiff;
  };

  const updatePanel = () => {
    setClickable(true);
    if (settings.mode === "NORMAL") {
      if (!isGameOver) {
        setGameTime(gameTimeNum);
        const currentCPS = getCPS();
        const text = currentCPS === 0
          ? settings.I18N["calculating"]
          : currentCPS.toFixed(2);
        setGameTapRate(text);
        console.log("[NORMAL] Time and State:", {
          gameTimeNum,
          gameStartTime,
          date1: date1?.getTime(),
          isGameStart,
          isGameOver,
        });
      }
    } else if (settings.mode === "ENDLESS") {
      const currentCPS = getCPS();
      const text = currentCPS === 0
        ? settings.I18N["calculating"]
        : currentCPS.toFixed(2);
      setGameTapRate(text);
      console.log("[ENDLESS] CPS and State:", {
        currentCPS,
        gameStartDatetime,
        gameStartTime,
        gameScore,
        isGameStart,
        isGameOver,
      });
    } else {
      console.log("[PRACTICE] Score:", {
        gameScore,
        gameBBListIndex,
      });
    }
  };

  const refreshGameLayer = (
    box: GameLayerElement,
    loop?: number,
    offset?: number,
  ) => {
    console.log("[refreshGameLayer] Start", {
      boxId: box.id,
      loop,
      offset,
      currentY: box.y,
    });

    let i = Math.floor(Math.random() * 1000) % settings.columns +
      (loop ? 0 : settings.columns);
    const children = Array.from(box.children) as BlockElement[];

    const newBlocks: GameBlock[] = [];

    // トランジションを一時的に無効化
    box.style.transitionDuration = "0ms";

    // ブロックの更新を一括で準備
    const blockUpdates = children.map((r, j) => {
      const left = (j % settings.columns) * blockSize;
      const bottom = Math.floor(j / settings.columns) * blockSize;
      const isTarget = i === j;

      if (isTarget) {
        const newBlock = {
          cell: i % settings.columns,
          id: r.id,
        };
        newBlocks.push(newBlock);
        i = (Math.floor(j / settings.columns) + 1) * settings.columns +
          Math.floor(Math.random() * 1000) % settings.columns;
      }

      // トランジションを設定
      r.style.transition = "all 100ms ease-in-out";

      return {
        element: r,
        style: {
          left: `${left}px`,
          bottom: `${bottom}px`,
          width: `${blockSize}px`,
          height: `${blockSize}px`,
        },
        isTarget,
        className: r.className.replace(_clearttClsReg, "") +
          (isTarget ? ` t${Math.floor(Math.random() * 1000) % 5 + 1}` : ""),
      };
    });

    // スタイルとクラスの更新を一括で適用
    blockUpdates.forEach((update) => {
      const { element, style, isTarget, className } = update;
      Object.assign(element.style, style);
      element.className = className;
      element.notEmpty = isTarget;
    });

    // gameBBListの更新を一回だけ実行
    if (newBlocks.length > 0) {
      setGameBBList((prev) => {
        console.log("[refreshGameLayer] Updating gameBBList", {
          previousLength: prev.length,
          newBlocksLength: newBlocks.length,
          newBlocks,
        });
        return [...prev, ...newBlocks];
      });
    }

    if (loop) {
      // トランジションの適用を非同期で実行
      requestAnimationFrame(() => {
        box.style.display = "none";
        box.y = -blockSize *
          (Math.floor(children.length / settings.columns) + (offset || 0)) *
          loop;

        requestAnimationFrame(() => {
          box.style.transform = `translate3D(0,${box.y}px,0)`;
          box.style.transitionDuration = "150ms";
          box.style.display = "block";
        });
      });
    } else {
      box.y = 0;
      box.style.transform = `translate3D(0,${box.y}px,0)`;
      // トランジションを再有効化
      requestAnimationFrame(() => {
        box.style.transitionDuration = "150ms";
      });
    }
  };

  const countBlockSize = () => {
    if (!bodyRef.current) return;

    // 画面の短い方の辺を基準にする
    const screenWidth = globalThis.innerWidth;
    const screenHeight = globalThis.innerHeight;
    const minDimension = Math.min(screenWidth, screenHeight);

    // デスクトップ環境での最大幅を632pxに制限
    const maxDesktopWidth = isDesktop ? maxScreenWidth : screenWidth;
    const calculatedWidth = Math.min(minDimension, maxDesktopWidth);

    // ブロックサイズを画面幅のcolumn数の逆に設定
    const calculatedBlockSize = Math.floor(calculatedWidth / settings.columns);

    console.log("[countBlockSize]:", {
      screenWidth,
      screenHeight,
      minDimension,
      maxDesktopWidth,
      calculatedWidth,
      calculatedBlockSize,
    });

    setBlockSize(calculatedBlockSize);

    // ゲーム領域の高さを設定
    const gameHeight = screenHeight;
    bodyRef.current.style.height = `${gameHeight}px`;

    if (gameLayerBGRef.current) {
      gameLayerBGRef.current.style.height = `${gameHeight}px`;
      // 横幅も設定
      gameLayerBGRef.current.style.width = `${
        calculatedBlockSize * settings.columns
      }px`;
      // 中央寄せ
      gameLayerBGRef.current.style.left = `${
        (screenWidth - calculatedBlockSize * settings.columns) / 2
      }px`;
    }

    // タッチエリアを調整
    const touchAreaTop = gameHeight;
    const touchAreaBottom = gameHeight - calculatedBlockSize * 3;
    setTouchArea([touchAreaTop, touchAreaBottom]);
  };

  const gameRestart = () => {
    setGameBBList([]);
    setGameBBlistIndex(0);
    setGameScore(0);
    setScore(0);
    setGameOver(false);
    setIsGameStart(false);
    setTapRate(0);

    // モードに応じた初期化
    if (settings.mode === "NORMAL") {
      setGameTimeNum(settings.gameSettingNum);
      setDate1(undefined);
    } else if (settings.mode === "ENDLESS") {
      setGameStartTime(0);
      setGameStartDatetime(0);
    }

    countBlockSize();

    const [layer1, layer2] = gameLayerRefs.current;
    if (layer1 && layer2) {
      refreshGameLayer(layer1);
      refreshGameLayer(layer2, 1);
    }

    updatePanel();
  };

  const showGameScoreLayer = (cps: number) => {
    const score = gameScore;

    // ノーマルモードの場合、時間超過をチェック
    let isTimeValid = true;
    if (settings.mode === "NORMAL" && date1) {
      const currentDeviation = new Date().getTime() - date1.getTime();
      isTimeValid = currentDeviation <= (settings.gameSettingNum + 3) * 1000;
      console.log("[NORMAL] Score time validation:", {
        currentDeviation,
        isTimeValid,
        threshold: (settings.gameSettingNum + 3) * 1000,
        score,
        cps,
      });
    }
    setShown(true);
  };

  const calculateCurrentCPS = () => {
    if (settings.mode === "ENDLESS") {
      if (!gameStartDatetime || !gameScore) return 0;
      const timeDiff = (new Date().getTime() - gameStartDatetime) / 1000;
      return timeDiff > 0 ? gameScore / timeDiff : 0;
    } else if (settings.mode === "NORMAL" && date1Ref.current) {
      const currentScore = (score === gameScoreRef.current)
        ? score
        : gameScoreRef.current;
      console.log(`[calculateCurrentCPS]:`, {
        currentScore,
        date1Ref,
      });
      const timeDiff = (new Date().getTime() - date1Ref.current.getTime()) /
        1000;
      return (timeDiff > 0) && currentScore ? currentScore / timeDiff : 0;
    }
    return 0;
  };

  const gameOver = (finalCPS?: number) => {
    console.log(`[${settings.mode}] Game Over:`, {
      gameScore,
      gameTimeNum,
      gameStartTime,
      finalCPS,
      cps: finalCPS || (settings.mode === "ENDLESS" ? getCPS() : undefined),
      intervalRef: !!gameTimeIntervalRef.current,
    });

    setGameOver(true);

    // インターバルのクリア（念のため）
    if (gameTimeIntervalRef.current) {
      clearInterval(gameTimeIntervalRef.current);
      gameTimeIntervalRef.current = null;
    }

    if (settings.mode === "NORMAL") {
      showGameScoreLayer(finalCPS || 0);
    } else if (settings.mode === "ENDLESS") {
      showGameScoreLayer(finalCPS || getCPS());
    }
  };

  const timer = () => {
    if (settings.mode === "NORMAL") {
      setGameStartTime((prev) => prev + 1);
      setGameTimeNum((prev) => {
        const newTimeNum = prev - 1;
        console.log("[NORMAL] Timer update:", {
          prev,
          newTimeNum,
          isGameOver,
        });

        if (newTimeNum <= 0 && !isGameOver) {
          console.log(`[NORMAL] Time Over:`, {
            gameScore,
            gameScoreRef,
            gameTimeNum,
            date1Ref,
          });
          // タイマーをクリアしてからゲームオーバー処理を行う
          if (gameTimeIntervalRef.current) {
            clearInterval(gameTimeIntervalRef.current);
            gameTimeIntervalRef.current = null;
          }
          if (gameLayerBGRef.current) {
            gameLayerBGRef.current.className += " flash";
          }
          playSound("end");
          const currentCPS = calculateCurrentCPS();
          setTapRate(currentCPS);
          gameOver(currentCPS);
          return 0;
        }
        return newTimeNum;
      });
    } else if (settings.mode === "ENDLESS") {
      setGameStartTime((prev) => prev + 1);
    }
  };

  const gameLayerMoveNextRow = () => {
    console.log("[gameLayerMoveNextRow] Start", {
      gameLayerRefs: gameLayerRefs.current.map((g) => ({
        id: g?.id,
        y: g?.y,
        children: g?.children?.length,
      })),
    });

    // 全レイヤーの移動を一括で計算
    const updates = gameLayerRefs.current.map((g: GameLayerElement) => {
      if (!g) return null;
      const newY = (g.y || 0) + blockSize;
      const threshold = blockSize *
        (Math.floor(g.children.length / settings.columns));
      return {
        layer: g,
        newY,
        needsRefresh: newY > threshold,
      };
    }).filter(Boolean);

    console.log("[gameLayerMoveNextRow] Updates", { updates });

    // 更新を一括で適用
    updates.forEach((update) => {
      if (!update) return;
      const { layer, newY, needsRefresh } = update;

      // トランジションを設定
      layer.style.transition = "transform 150ms ease-in-out";
      layer.y = newY;

      console.log("[gameLayerMoveNextRow] Update", {
        layer: layer.id,
        newY,
        needsRefresh,
      });

      if (needsRefresh) {
        console.log("[gameLayerMoveNextRow] Refreshing layer", {
          id: layer.id,
          currentY: newY,
        });
        // リフレッシュを非同期で実行
        setTimeout(() => {
          refreshGameLayer(layer, 1, -1);
        }, 0);
      } else {
        console.log("[gameLayerMoveNextRow] No refresh", {
          layer: layer.id,
          newY,
          needsRefresh,
        });
        layer.style.transform = `translate3D(0,${newY}px,0)`;
      }
    });
  };

  const handleGameTap = (x: number, y: number, target: BlockElement) => {
    if (!isClickable || !activeRef.current) return false;
    const currentTime = Date.now();
    const timeSinceLastTap = currentTime - lastTapTime;
    console.log("[handleGameTap]: ", {
      activeRef,
      isClickable,
    });

    // 前回のタップからの時間が短すぎる場合は無視
    if (timeSinceLastTap < TAP_THRESHOLD) {
      return false;
    }

    // 前回のタップから長すぎる場合はリセット
    if (timeSinceLastTap > 1000) {
      setLastTapTime(0);
    } else {
      setLastTapTime(currentTime);
    }

    if (isGameOver) {
      return false;
    }

    const p = gameBBList[gameBBListIndex];
    if (!p || !target) return false;

    if (y > touchArea[0] || y < touchArea[1]) {
      return false;
    }

    const blockX = x - (x % blockSize);
    const blockIndex = Math.floor(blockX / blockSize);

    // ブロックの境界付近の判定を緩和
    const tolerance = blockSize * 0.1; // 10%の許容範囲
    const isWithinBlock = (index: number) => {
      const blockStart = index * blockSize - tolerance;
      const blockEnd = (index + 1) * blockSize + tolerance;
      return x >= blockStart && x < blockEnd;
    };

    const isCorrectBlock = (p.id === target.id && target.notEmpty) ||
      (p.cell === blockIndex && isWithinBlock(blockIndex));

    console.log("[processTouch]", {
      isCorrectBlock,
      isGameOver,
      activeRef,
    });
    if (isCorrectBlock) {
      if (!isGameStart) {
        gameStart();
      }

      const targetElement = document.getElementById(p.id) as BlockElement;
      if (targetElement) {
        targetElement.className = targetElement.className.replace(
          _ttreg,
          " tt$1",
        );

        // アニメーションフレームで状態更新をスケジュール
        requestAnimationFrame(() => {
          playSound("tap");
          setGameBBlistIndex((prev) => prev + 1);
          setGameScore((prev) => prev + 1);
          setScore((prev) => prev + 1);

          updatePanel();
          gameLayerMoveNextRow();
        });
      }
    } else if (isGameStart && !target.notEmpty) {
      playSound("err");
      target.classList.add("bad");
      if (settings.mode !== "PRACTICE") {
        setClickable(false);
        const currentCPS = calculateCurrentCPS();
        setTapRate(currentCPS);

        if (settings.mode === "NORMAL" && gameTimeNum <= 0) {
          return false;
        }
        gameOver(currentCPS);
      } else {
        setTimeout(() => {
          target.classList.remove("bad");
        }, 500);
      }
    }
    return false;
  };

  const refreshSizeHandler = () => {
    refreshSize();
    if (refreshSizeTimeRef.current) {
      globalThis.clearTimeout(refreshSizeTimeRef.current);
    }
    refreshSizeTimeRef.current = globalThis.setTimeout(refreshSize, 200);
  };

  const refreshSize = () => {
    countBlockSize();
    Array.from(gameLayerRefs.current[0].children).forEach((r, j) => {
      if (r instanceof HTMLElement) {
        const extR = createExtendedElement(r);
        extR.style.left = (j % settings.columns) * blockSizeRef.current + "px";
        extR.style.bottom =
          Math.floor(j / settings.columns) * blockSizeRef.current + "px";
        extR.style.width = blockSizeRef.current + "px";
        extR.style.height = blockSizeRef.current + "px";
      }
    });

    const [f, a] = gameLayerRefs.current;
    if (!f || !a) return;

    if (f.y > a.y) {
      const y = (gameBBListIndex % 10) * blockSize;
      f.y = y;
      f.style.transform = `translate3D(0,${f.y}px,0)`;
      a.y = -blockSize * Math.floor(f.children.length / settings.columns) + y;
      a.style.transform = `translate3D(0,${a.y}px,0)`;
    } else {
      const y = (gameBBListIndex % 10) * blockSize;
      a.y = y;
      a.style.transform = `translate3D(0,${a.y}px,0)`;
      f.y = -blockSize * Math.floor(a.children.length / settings.columns) + y;
      f.style.transform = `translate3D(0,${f.y}px,0)`;
    }
  };

  useEffect(() => {
    const bodyElement = document.getElementById("gameBody");
    if (bodyElement) {
      bodyRef.current = bodyElement;
      //bodyElement.style.height = globalThis.innerHeight + "px";
      setTransform(
        typeof (bodyElement.style.webkitTransform) !== "undefined"
          ? "webkitTransform"
          : "transform",
      );
    }

    const bgElement = document.getElementById("GameLayerBG");
    if (bgElement) {
      gameLayerBGRef.current = bgElement as HTMLDivElement;
    }

    // 初期化の順序を修正
    setTimeout(() => {
      countBlockSize();
      gameRestart();
    }, 0);

    globalThis.addEventListener("resize", refreshSizeHandler, false);

    return () => {
      globalThis.removeEventListener("resize", refreshSizeHandler);
      if (gameTimeIntervalRef.current) {
        clearInterval(gameTimeIntervalRef.current);
      }
      if (refreshSizeTimeRef.current) {
        clearTimeout(refreshSizeTimeRef.current);
      }
    };
  }, []);

  useEffect(() => {
    gameScoreRef.current = gameScore;
  }, [gameScore]);

  useEffect(() => {
    date1Ref.current = date1;
  }, [date1]);

  useEffect(() => {
    blockSizeRef.current = blockSize;
  }, [blockSize]);

  useEffect(() => {
    if (!isGameStart) return;
    setClickable(true);
  }, [isGameStart]);

  useEffect(() => {
    console.log(gameBBList)
  }, [gameBBList])

  return {
    tapRate,
    gameTapRate,
    gameScore,
    score,
    handleGameTap,
    gameTimeNum,
    touchArea,
    gameBBListIndex,
    gameBBList,
    gameRestart,
  };
};
