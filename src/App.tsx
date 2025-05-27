import './App.css'
import { useEffect, useState, useRef } from 'react'
import * as ja from "./assets/i18n/ja.json" with { type: "json" }
import * as zh from "./assets/i18n/zh.json" with { type: "json" }
import clickBeforeImage from './image/ClickBefore.png'
import clickAfterImage from './image/AfterClicking.png'
import { MODE_NORMAL, MODE_ENDLESS, MODE_PRACTICE, GameMode, SoundType, I18nKey } from './constants.ts';
import { useSound } from './hooks/useSound.ts';
import { cookie } from './utils/cookie.ts';

interface GameBlock {
    cell: number;
    id: string;
}

type GameLayerElement = HTMLElement & {
    y: number;
    notEmpty: boolean;
};

interface BlockElement extends HTMLDivElement {
    notEmpty?: boolean;
}

const createExtendedElement = (element: Element): GameLayerElement => {
    if (!(element instanceof HTMLElement)) {
        throw new Error('Element must be an HTMLElement');
    }
    return Object.assign(element, {
        y: 0,
        notEmpty: false
    }) as GameLayerElement;
};

interface GameLayerProps {
    id: number;
    gameLayerRefs: React.MutableRefObject<GameLayerElement[]>;
}

const GameLayer: React.FC<GameLayerProps> = ({ id, gameLayerRefs }) => {
    const layerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (layerRef.current) {
            const extendedLayer = createExtendedElement(layerRef.current);
            gameLayerRefs.current[id - 1] = extendedLayer;
            
            // Initialize children
            Array.from(layerRef.current.querySelectorAll('div')).forEach(div => {
                const extendedDiv = createExtendedElement(div);
                extendedDiv.notEmpty = false;
                console.log("Initialize block", { id: div.id, notEmpty: extendedDiv.notEmpty });
            });
        }
    }, [id, gameLayerRefs]);

    return (
        <div 
            ref={layerRef}
            id={`GameLayer${id}`} 
            className="GameLayer"
            data-layer-id={id}
        >
            {Array.from({ length: 40 }, (_, j) => (
                <div
                    key={j}
                    id={`${id}-${j}`}
                    data-num={j}
                    className={`block${j % 4 ? ' bl' : ''}`}
                />
            ))}
        </div>
    );
};

const _ttreg = / t{1,2}(\d+)/;
const _clearttClsReg = / t{1,2}\d+| bad/;

function getSoundMode(): 'on' | 'off' {
    return (cookie('soundMode') || 'on') as 'on' | 'off';
}

function App() {
    const userLang = (navigator.language).startsWith('ja') ? 'ja' : 'zh';
    const I18N = userLang === "ja" ? ja.default : zh.default;
    const [mode, setMode] = useState<GameMode>(() => {
        const savedMode = cookie('gameMode');
        if (!savedMode) return "NORMAL";
        return savedMode === MODE_ENDLESS.toString() ? "ENDLESS" : 
               savedMode === MODE_PRACTICE.toString() ? "PRACTICE" : "NORMAL";
    });
    const { soundMode, playSound, toggleSoundMode, updateSound } = useSound(getSoundMode());
    const [isShown, setShown] = useState(false)
    const [score, setScore] = useState(0)
    const [bestScore, setBestScore] = useState(() => {
        const cookieName = mode === "NORMAL" ? 'best-score' : 'endless-best-score';
        return parseFloat(cookie(cookieName) || '0');
    });
    const [isGameOver, setGameOver] = useState(false)
    const [isGameStart, setIsGameStart] = useState(false)
    const [gameSettingNum, setGameSettingNum] = useState(20)
    const [gameBBList, setGameBBList] = useState<GameBlock[]>([])
    const [gameBBListIndex, setGameBBlistIndex] = useState(0)
    const [gameStartTime, setGameStartTime] = useState(0);
    const [gameStartDatetime, setGameStartDatetime] = useState(0);

    const [cps, setCPS] = useState(0)

    const bodyRef = useRef<HTMLElement | null>(null);
    const [blockSize, setBlockSize] = useState(0)
    const gameLayerRefs = useRef<GameLayerElement[]>([])
    const [gameLayerBG, setGameLayerBG] = useState<HTMLElement | null>(null)
    const [touchArea, setTouchArea] = useState<number[]>([])


    const [transform, setTransform] = useState<string>("")
    const [transitionDuration, setTransitionDuration] = useState()
    const [welcomeLayerClosed, setWelcomeLayerClosed] = useState(false)
    const [gameTime, setGameTime] = useState()
    const [gameTimeNum, setGameTimeNum] = useState(gameSettingNum)
    const [gameScore, setGameScore] = useState(1)
    const [date1, setDate1] = useState<Date>()
    const [deviationTime, setDeviationTime] = useState(0)

    const [gameTimeText, setGameTimeText] = useState<string>('');
    const gameTimeLayerRef = useRef<HTMLDivElement>(null);

    const gameLayerBGRef = useRef<HTMLDivElement>(null);
    const gameTimeIntervalRef = useRef<number | null>(null);
    const refreshSizeTimeRef = useRef<number | null>(null);

    const [map, setMap] = useState<{[key: string]: number}>({'d': 1, 'f': 2, 'j': 3, 'k': 4});
    const isDesktop = !navigator.userAgent.match(/(ipad|iphone|ipod|android|windows phone)/i);

    const [sounds, setSounds] = useState<{[key: string]: HTMLAudioElement}>({});

    const [refreshSizeTime, setRefreshSizeTime] = useState<number>();

    const [clickBeforeStyle, setClickBeforeStyle] = useState<string>('');
    const [clickAfterStyle, setClickAfterStyle] = useState<string>('');

    const [customSounds, setCustomSounds] = useState<{[key: string]: string}>(() => {
        const saved = {
            tap: localStorage.getItem('customSound_tap') || '',
            err: localStorage.getItem('customSound_err') || '',
            end: localStorage.getItem('customSound_end') || ''
        };
        return Object.fromEntries(
            Object.entries(saved).filter(([_, v]) => v !== '')
        );
    });

    const [lastTapTime, setLastTapTime] = useState(0);
    const TAP_THRESHOLD = 8; // 16msから8msに短縮（120FPS対応）
    const TAP_MOVE_THRESHOLD = 30; // タッチ移動の許容範囲をさらに広げる
    const TAP_TIME_THRESHOLD = 500; // タップの最大許容時間を延長

    const [touchStartPos, setTouchStartPos] = useState<{ x: number, y: number, time: number, target: BlockElement } | null>(null);

    const [isInitialized, setIsInitialized] = useState(false);
    const [isError, setIsError] = useState(false);

    const getI18nText = (key: I18nKey): string => {
        return I18N[key] || key;
    };

    const handleSoundUpload = (event: React.ChangeEvent<HTMLInputElement>, soundType: SoundType) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            if (!file.type.startsWith('audio/')) {
                alert(getI18nText('sound-type-error'));
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    setCustomSounds(prev => {
                        const newSounds = { ...prev, [soundType]: reader.result as string };
                        localStorage.setItem(`customSound_${soundType}`, reader.result as string);
                        updateSound(soundType, reader.result as string);
                        return newSounds;
                    });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const resetSound = (soundType: SoundType) => {
        setCustomSounds(prev => {
            const newSounds = { ...prev };
            delete newSounds[soundType];
            localStorage.removeItem(`customSound_${soundType}`);
            updateSound(soundType, null);
            return newSounds;
        });
    };

    const countBlockSize = () => {
        if (!bodyRef.current) return;
        
        // 画面の短い方の辺を基準にする
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const minDimension = Math.min(screenWidth, screenHeight);
        
        // ブロックサイズを画面の短い方の辺の1/4に設定
        const calculatedBlockSize = Math.floor(minDimension / 4);
        setBlockSize(calculatedBlockSize);
        
        // ゲーム領域の高さを設定
        const gameHeight = screenHeight;
        bodyRef.current.style.height = `${gameHeight}px`;
        
        if (gameLayerBGRef.current) {
            gameLayerBGRef.current.style.height = `${gameHeight}px`;
            // 横幅も設定
            gameLayerBGRef.current.style.width = `${calculatedBlockSize * 4}px`;
            // 中央寄せ
            gameLayerBGRef.current.style.left = `${(screenWidth - calculatedBlockSize * 4) / 2}px`;
        }
        
        // タッチエリアを調整
        const touchAreaTop = gameHeight;
        const touchAreaBottom = gameHeight - calculatedBlockSize * 3;
        setTouchArea([touchAreaTop, touchAreaBottom]);
    }

    const updatePanel = () => {
        let newText = '';
        if (mode === "NORMAL") {
            if (!isGameOver) {
                newText = createTimeText(gameTimeNum);
                console.log("[NORMAL] Time and State:", {
                    gameTimeNum,
                    gameStartTime,
                    date1: date1?.getTime(),
                    deviationTime,
                    isGameStart,
                    isGameOver
                });
            }
        } else if (mode === "ENDLESS") {
            const currentCPS = getCPS();
            const text = (currentCPS === 0 ? I18N['calculating'] : currentCPS.toFixed(2));
            newText = `CPS:${text}`;
            console.log("[ENDLESS] CPS and State:", {
                currentCPS,
                gameStartDatetime,
                gameStartTime,
                gameScore,
                isGameStart,
                isGameOver
            });
        } else {
            newText = `SCORE:${gameScore}`;
            console.log("[PRACTICE] Score:", {
                gameScore,
                gameBBListIndex
            });
        }
        setGameTimeText(newText);
    }

    const gameRestart = () => {
        setGameBBList([]);
        setGameBBlistIndex(0);
        setGameScore(0);
        setScore(0);
        setGameOver(false);
        setIsGameStart(false);
        setCPS(0);
        
        // モードに応じた初期化
        if (mode === "NORMAL") {
            setGameTimeNum(gameSettingNum);
            setDate1(undefined);
        } else if (mode === "ENDLESS") {
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
    }

    const getMode = () => {
        return cookie('gameMode') ? parseInt(cookie('gameMode')) : "NORMAL";
    }

    const shareText = (cps: number) => {
        if (mode === "NORMAL") {
            // date1がない場合は早期リターン
            if (!date1) {
                return I18N['text-level-1'];
            }

            // 現在時刻との差分を計算
            const currentDeviation = new Date().getTime() - date1.getTime();
            console.log("[NORMAL] Time deviation check:", {
                currentDeviation,
                gameSettingNum,
                threshold: (gameSettingNum + 3) * 1000,
                date1: date1.getTime()
            });

            // 制限時間 + 3秒を超えているかチェック
            if (currentDeviation > (gameSettingNum + 3) * 1000) {
                return I18N['time-over'] + ((currentDeviation / 1000) - gameSettingNum).toFixed(2) + 's';
            }
        }

        // CPSに基づくレベル判定
        if (cps <= 2.5) return I18N['text-level-1'];
        if (cps <= 5) return I18N['text-level-2'];
        if (cps <= 7.5) return I18N['text-level-3'];
        if (cps <= 10) return I18N['text-level-4'];
        return I18N['text-level-5'];
    }

    const getBestScore = (score: number, cps: number) => {
        const cookieName = mode === "NORMAL" ? 'bast-score' : 'endless-best-score';
        const cpsCookieName = mode === "NORMAL" ? 'normal-best-cps' : 'endless-best-cps';
        
        const currentBest = parseFloat(cookie(cookieName) || '0');
        const currentBestCPS = parseFloat(cookie(cpsCookieName) || '0');
        
        // スコアとCPSの両方を考慮してベストスコアを判定
        const isNewBest = mode === "ENDLESS" ? 
            cps > currentBestCPS : 
            (score > currentBest || (score === currentBest && cps > currentBestCPS));

        if (isNewBest) {
            console.log("[Best Score] New record!", {
                mode,
                previousBest: currentBest,
                previousBestCPS: currentBestCPS,
                newBest: score,
                newBestCPS: cps,
                currentScore: score,
                currentCPS: cps
            });
            
            // スコアとCPSの両方を保存
            cookie(cookieName, score.toFixed(2), 100);
            cookie(cpsCookieName, cps.toFixed(2), 100);
            setBestScore(score);
        }
        
        return {
            score: Math.max(currentBest, score),
            cps: Math.max(currentBestCPS, cps)
        };
    }

    const showGameScoreLayer = (cps: number) => {
        const gameScoreLayer = document.getElementById('GameScoreLayer');
        if (!gameScoreLayer) return;
        
        const targetElement = document.getElementById(gameBBList[Math.max(0, gameBBListIndex - 1)]?.id || '');
        const classMatch = targetElement?.className.match(_ttreg);
        const c = classMatch ? classMatch[1] : '1';
        const score = gameScore;
        const best = getBestScore(score, cps);

        // ノーマルモードの場合、時間超過をチェック
        let isTimeValid = true;
        if (mode === "NORMAL" && date1) {
            const currentDeviation = new Date().getTime() - date1.getTime();
            isTimeValid = currentDeviation <= (gameSettingNum + 3) * 1000;
            console.log("[NORMAL] Score time validation:", {
                currentDeviation,
                isTimeValid,
                threshold: (gameSettingNum + 3) * 1000,
                score,
                cps,
                best
            });
        }
        
        gameScoreLayer.className = `BBOX SHADE bgc${c}`;
        gameScoreLayer.style.color = isTimeValid || mode !== "NORMAL" ? '' : 'red';
        gameScoreLayer.style.display = 'block';
        setShown(true);
    }

    const gameLayerMoveNextRow = () => {
        console.log("[gameLayerMoveNextRow] Start", {
            gameLayerRefs: gameLayerRefs.current.map(g => ({
                id: g?.id,
                y: g?.y,
                children: g?.children?.length
            }))
        });

        // 全レイヤーの移動を一括で計算
        const updates = gameLayerRefs.current.map((g: GameLayerElement) => {
            if (!g) return null;
            const newY = (g.y || 0) + blockSize;
            const threshold = blockSize * (Math.floor(g.children.length / 4));
            return {
                layer: g,
                newY,
                needsRefresh: newY > threshold
            };
        }).filter(Boolean);

        console.log("[gameLayerMoveNextRow] Updates", { updates });
        
        // 更新を一括で適用
        updates.forEach(update => {
            if (!update) return;
            const { layer, newY, needsRefresh } = update;
            
            // トランジションを設定
            layer.style.transition = 'transform 150ms ease-in-out';
            layer.y = newY;

            console.log("[gameLayerMoveNextRow] Update", {
                layer: layer.id,
                newY,
                needsRefresh
            }); 
            
            if (needsRefresh) {
                console.log("[gameLayerMoveNextRow] Refreshing layer", {
                    id: layer.id,
                    currentY: newY
                });
                // リフレッシュを非同期で実行
                setTimeout(() => {
                    refreshGameLayer(layer, 1, -1);
                }, 0);
            } else {
                console.log("[gameLayerMoveNextRow] No refresh", {
                    layer: layer.id,
                    newY,
                    needsRefresh
                });
                layer.style.transform = `translate3D(0,${newY}px,0)`;
            }
        });
    }

    const refreshGameLayer = (box: GameLayerElement, loop?: number, offset?: number) => {
        console.log("[refreshGameLayer] Start", {
            boxId: box.id,
            loop,
            offset,
            currentY: box.y
        });

        let i = Math.floor(Math.random() * 1000) % 4 + (loop ? 0 : 4);
        const children = Array.from(box.children) as BlockElement[];
        
        const newBlocks: GameBlock[] = [];

        // トランジションを一時的に無効化
        box.style.transitionDuration = '0ms';
        
        // ブロックの更新を一括で準備
        const blockUpdates = children.map((r, j) => {
            const rstyle = r.style;
            const left = (j % 4) * blockSize;
            const bottom = Math.floor(j / 4) * blockSize;
            const isTarget = i === j;
            
            if (isTarget) {
                const newBlock = {
                    cell: i % 4,
                    id: r.id
                };
                newBlocks.push(newBlock);
                i = (Math.floor(j / 4) + 1) * 4 + Math.floor(Math.random() * 1000) % 4;
            }

            // トランジションを設定
            r.style.transition = 'all 100ms ease-in-out';
            
            return {
                element: r,
                style: {
                    left: `${left}px`,
                    bottom: `${bottom}px`,
                    width: `${blockSize}px`,
                    height: `${blockSize}px`
                },
                isTarget,
                className: r.className.replace(_clearttClsReg, '') + 
                    (isTarget ? ` t${Math.floor(Math.random() * 1000) % 5 + 1}` : '')
            };
        });

        // スタイルとクラスの更新を一括で適用
        blockUpdates.forEach(update => {
            const { element, style, isTarget, className } = update;
            Object.assign(element.style, style);
            element.className = className;
            element.notEmpty = isTarget;
        });

        // gameBBListの更新を一回だけ実行
        if (newBlocks.length > 0) {
            setGameBBList(prev => {
                console.log("[refreshGameLayer] Updating gameBBList", {
                    previousLength: prev.length,
                    newBlocksLength: newBlocks.length,
                    newBlocks
                });
                return [...prev, ...newBlocks];
            });
        }

        if (loop) {
            // トランジションの適用を非同期で実行
            requestAnimationFrame(() => {
                box.style.display = 'none';
                box.y = -blockSize * (Math.floor(children.length / 4) + (offset || 0)) * loop;
                
                requestAnimationFrame(() => {
                    box.style.transform = `translate3D(0,${box.y}px,0)`;
                    box.style.transitionDuration = '150ms';
                    box.style.display = 'block';
                });
            });
        } else {
            box.y = 0;
            box.style.transform = `translate3D(0,${box.y}px,0)`;
            // トランジションを再有効化
            requestAnimationFrame(() => {
                box.style.transitionDuration = '150ms';
            });
        }
    }

    // タッチ処理を即座に実行するための関数
    const processTouchImmediately = (x: number, y: number, target: BlockElement) => {
        const currentTime = Date.now();
        const timeSinceLastTap = currentTime - lastTapTime;
        
        if (timeSinceLastTap < TAP_THRESHOLD) {
            return false;
        }
        
        setLastTapTime(currentTime);

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
        
        // ブロックの判定を緩和
        const tolerance = blockSize * 0.15; // 許容範囲を15%に増加
        const isWithinBlock = (index: number) => {
            const blockStart = index * blockSize - tolerance;
            const blockEnd = (index + 1) * blockSize + tolerance;
            return x >= blockStart && x < blockEnd;
        };

        const isCorrectBlock = (p.id === target.id && target.notEmpty) || 
            (p.cell === blockIndex && isWithinBlock(blockIndex));

        if (isCorrectBlock) {
            if (!isGameStart) {
                gameStart();
            }

            const targetElement = document.getElementById(p.id) as BlockElement;
            if (targetElement) {
                targetElement.className = targetElement.className.replace(_ttreg, ' tt$1');
                playSound('tap');
                
                // 即座に状態を更新
                setGameBBlistIndex(prev => prev + 1);
                setGameScore(prev => prev + 1);
                setScore(prev => prev + 1);
                
                // アニメーションのみを遅延
                requestAnimationFrame(() => {
                    updatePanel();
                    gameLayerMoveNextRow();
                });
            }
            return true;
        } else if (isGameStart && !target.notEmpty) {
            playSound('err');
            target.classList.add('bad');
            if (mode !== "PRACTICE") {
                const currentCPS = calculateCurrentCPS();
                setCPS(currentCPS);
                
                if (mode === "NORMAL" && gameTimeNum <= 0) {
                    return false;
                }
                setTimeout(() => {
                    gameOver(currentCPS);
                }, 500);
            } else {
                setTimeout(() => {
                    target.classList.remove('bad');
                }, 500);
            }
        }
        return false;
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        
        const touch = e.touches[0];
        const rect = bodyRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const target = e.target as BlockElement;
        
        // タッチ開始時に即座に処理を試みる
        const processed = processTouchImmediately(x, y, target);
        if (!processed) {
            setTouchStartPos({ x, y, time: Date.now(), target });
        }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!touchStartPos) return;

        const touch = e.touches[0];
        const rect = bodyRef.current?.getBoundingClientRect();
        if (!rect) return;

        const currentX = touch.clientX - rect.left;
        const currentY = touch.clientY - rect.top;
        
        const moveX = Math.abs(currentX - touchStartPos.x);
        const moveY = Math.abs(currentY - touchStartPos.y);

        // 移動が大きい場合はタッチをキャンセル
        if (moveX > TAP_MOVE_THRESHOLD || moveY > TAP_MOVE_THRESHOLD) {
            setTouchStartPos(null);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!touchStartPos) return;

        const touch = e.changedTouches[0];
        const rect = bodyRef.current?.getBoundingClientRect();
        if (!rect) return;

        const endX = touch.clientX - rect.left;
        const endY = touch.clientY - rect.top;
        const endTime = Date.now();

        if (endTime - touchStartPos.time <= TAP_TIME_THRESHOLD) {
            const moveX = Math.abs(endX - touchStartPos.x);
            const moveY = Math.abs(endY - touchStartPos.y);

            if (moveX <= TAP_MOVE_THRESHOLD && moveY <= TAP_MOVE_THRESHOLD) {
                processTouchImmediately(endX, endY, touchStartPos.target);
            }
        }

        setTouchStartPos(null);
    };

    const handleTouchCancel = (e: React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setTouchStartPos(null);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        
        const rect = bodyRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        handleGameTap(x, y, e.target as BlockElement);
    };

    const handleGameTap = (x: number, y: number, target: BlockElement) => {
        const currentTime = Date.now();
        const timeSinceLastTap = currentTime - lastTapTime;
        
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

        if (isCorrectBlock) {
            if (!isGameStart) {
                gameStart();
            }

            const targetElement = document.getElementById(p.id) as BlockElement;
            if (targetElement) {
                targetElement.className = targetElement.className.replace(_ttreg, ' tt$1');
                
                // アニメーションフレームで状態更新をスケジュール
                requestAnimationFrame(() => {
                    playSound('tap');
                    setGameBBlistIndex(prev => prev + 1);
                    setGameScore(prev => prev + 1);
                    setScore(prev => prev + 1);
                    
                    updatePanel();
                    gameLayerMoveNextRow();
                });
            }
        } else if (isGameStart && !target.notEmpty) {
            playSound('err');
            target.classList.add('bad');
            if (mode !== "PRACTICE") {
                const currentCPS = calculateCurrentCPS();
                setCPS(currentCPS);
                
                if (mode === "NORMAL" && gameTimeNum <= 0) {
                    return false;
                }
                setTimeout(() => {
                    gameOver(currentCPS);
                }, 500);
            } else {
                setTimeout(() => {
                    target.classList.remove('bad');
                }, 500);
            }
        }
        return false;
    };

    const calculateCurrentCPS = () => {
        if (mode === "ENDLESS") {
            if (!gameStartDatetime || !gameScore) return 0;
            const timeDiff = (new Date().getTime() - gameStartDatetime) / 1000;
            return timeDiff > 0 ? gameScore / timeDiff : 0;
        } else if (mode === "NORMAL" && date1) {
            const timeDiff = (new Date().getTime() - date1.getTime()) / 1000;
            return timeDiff > 0 ? gameScore / timeDiff : 0;
        }
        return 0;
    };

    const gameOver = (finalCPS?: number) => {
        console.log(`[${mode}] Game Over:`, {
            gameScore,
            gameTimeNum,
            gameStartTime,
            finalCPS,
            cps: finalCPS || (mode === "ENDLESS" ? getCPS() : undefined),
            intervalRef: !!gameTimeIntervalRef.current
        });

        setGameOver(true);

        // インターバルのクリア（念のため）
        if (gameTimeIntervalRef.current) {
            clearInterval(gameTimeIntervalRef.current);
            gameTimeIntervalRef.current = null;
        }

        if (mode === "NORMAL") {
            // タイムアップによるゲームオーバーの場合のみタイムアップメッセージを表示
            if (gameTimeNum <= 0) {
                setGameTimeText(getI18nText('time-up'));
            }
            setTimeout(() => {
                if (gameLayerBGRef.current) {
                    gameLayerBGRef.current.className = gameLayerBGRef.current.className.replace(' flash', '');
                }
                showGameScoreLayer(finalCPS || 0);
                focusOnReplay();
            }, 1000);
        } else if (mode === "ENDLESS") {
            setTimeout(() => {
                if (gameLayerBGRef.current) {
                    gameLayerBGRef.current.className = '';
                }
                showGameScoreLayer(finalCPS || getCPS());
                focusOnReplay();
            }, 1000);
        }
    };

    const gameStart = () => {
        if (mode === "PRACTICE") {
            setIsGameStart(true);
            return;
        }

        const now = new Date();
        setIsGameStart(true);

        if (mode === "NORMAL") {
            console.log("[NORMAL] Game Start:", {
                time: now.getTime(),
                gameSettingNum,
                gameTimeNum
            });
            setDate1(now);
        } else if (mode === "ENDLESS") {
            setGameStartDatetime(now.getTime());
        }
        
        if (!gameTimeIntervalRef.current) {
            gameTimeIntervalRef.current = window.setInterval(timer, 1000);
        }
    }

    const getCPS = () => {
        if (mode !== "ENDLESS" || !gameStartDatetime || !gameScore || gameStartTime < 2) {
            return 0;
        }
        const timeDiff = (new Date().getTime() - gameStartDatetime) / 1000;
        if (timeDiff <= 0) {
            return 0;
        }
        return gameScore / timeDiff;
    }

    const timer = () => {
        if (mode === "PRACTICE") {
            return;
        }

        if (mode === "NORMAL") {
            setGameTimeNum(prev => {
                const newTimeNum = prev - 1;
                console.log("[NORMAL] Timer update:", {
                    prev,
                    newTimeNum,
                    isGameOver
                });
                
                if (newTimeNum <= 0 && !isGameOver) {
                    // タイマーをクリアしてからゲームオーバー処理を行う
                    if (gameTimeIntervalRef.current) {
                        clearInterval(gameTimeIntervalRef.current);
                        gameTimeIntervalRef.current = null;
                    }
                    setGameTimeText(getI18nText('time-up'));
                    if (gameLayerBGRef.current) {
                        gameLayerBGRef.current.className += ' flash';
                    }
                    playSound('end');
                    const currentCPS = calculateCurrentCPS();
                    setCPS(currentCPS);
                    gameOver(currentCPS);
                    return 0;
                }
                return newTimeNum;
            });
        } else if (mode === "ENDLESS") {
            setGameStartTime(prev => prev + 1);
        }
    }

    const focusOnReplay = () => {
        const replayButton = document.getElementById('replay');
        if (replayButton) {
            replayButton.focus();
        }
    }

    const createTimeText = (n: number) => {
        return 'TIME:' + Math.ceil(n);
    }

    const replayBtn = () => {
        safeGameRestart();
        setShown(false)
    }

    const click = (index: number) => {
        if (!welcomeLayerClosed) {
            return;
        }

        const p = gameBBList[gameBBListIndex];
        if (!p) return;

        const targetElement = document.getElementById(p.id);
        if (!targetElement) return;

        const base = parseInt(targetElement.getAttribute("data-num") || "0") - p.cell;
        const num = base + index - 1;
        const id = p.id.substring(0, 11) + num;
        const target = document.getElementById(id);

        if (!target) return;

        // 直接DOMイベントを使用
        const event = new MouseEvent('mousedown', {
            clientX: ((index - 1) * blockSize + index * blockSize) / 2 + (bodyRef.current?.offsetLeft || 0),
            clientY: (touchArea[0] + touchArea[1]) / 2,
            bubbles: true,
            cancelable: true
        });

        target.dispatchEvent(event);
    };

    useEffect(() => {
        if (isDesktop) {
            const handleKeydown = (e: KeyboardEvent) => {
                if (!welcomeLayerClosed) return;
                
                const key = e.key.toLowerCase();
                if (Object.keys(map).indexOf(key) !== -1) {
                    const index = map[key];
                    const p = gameBBList[gameBBListIndex];
                    if (!p) return;

                    const targetElement = document.getElementById(p.id);
                    if (!targetElement) return;

                    const base = parseInt(targetElement.getAttribute("data-num") || "0") - p.cell;
                    const num = base + index - 1;
                    const id = p.id.substring(0, p.id.indexOf('-')) + '-' + num;
                    const target = document.getElementById(id);

                    if (!target) return;

                    // マウスイベントをシミュレート
                    const rect = target.getBoundingClientRect();
                    const event = new MouseEvent('mousedown', {
                        clientX: rect.left + rect.width / 2,
                        clientY: (touchArea[0] + touchArea[1]) / 2,
                        bubbles: true,
                        cancelable: true
                    });

                    target.dispatchEvent(event);
                }
            };

            document.addEventListener('keydown', handleKeydown);
            return () => document.removeEventListener('keydown', handleKeydown);
        }
    }, [map, welcomeLayerClosed, gameBBList, gameBBListIndex, touchArea]);

    const initSetting = () => {
        let keyboard = cookie('keyboard');
        if (keyboard) {
            keyboard = keyboard.toString().toLowerCase();
            const keyboardInput = document.getElementById('keyboard') as HTMLInputElement;
            if (keyboardInput) {
                keyboardInput.value = keyboard;
            }
            const newMap: {[key: string]: number} = {};
            newMap[keyboard.charAt(0)] = 1;
            newMap[keyboard.charAt(1)] = 2;
            newMap[keyboard.charAt(2)] = 3;
            newMap[keyboard.charAt(3)] = 4;
            setMap(newMap);
        }

        if (cookie('gameTime')) {
            const gameTime = parseInt(cookie('gameTime'));
            setGameSettingNum(gameTime);

            if (isNaN(gameTime) || gameTime < 0) {
                setGameSettingNum(20);
                cookie('gameTime', 20);
                alert(I18N['time-over']);
            }
            gameRestart();
        }
    };

    const saveCookie = () => {
        const settings = ['keyboard', 'gameTime'];
        for (const s of settings) {
            const element = document.getElementById(s) as HTMLInputElement;
            const value = element?.value;
            if (value) {
                cookie(s, value.toString(), 100);
            }
        }
        initSetting();
    };

    const showSetting = () => {
        const settingElement = document.getElementById('setting');
        const btnGroup = document.getElementById('btn_group');
        if (settingElement && btnGroup) {
            settingElement.style.display = 'block';
            btnGroup.style.display = 'none';
        }
    };

    const showBtnGroup = () => {
        const settingElement = document.getElementById('setting');
        const btnGroup = document.getElementById('btn_group');
        if (settingElement && btnGroup) {
            settingElement.style.display = 'none';
            btnGroup.style.display = 'block';
        }
    };

    const changeMode = (newMode: GameMode) => {
        setMode(newMode);
        cookie('gameMode', 
            newMode === "NORMAL" ? MODE_NORMAL : 
            newMode === "ENDLESS" ? MODE_ENDLESS : 
            MODE_PRACTICE
        );
    };

    const changeSoundMode = () => {
        toggleSoundMode();
        cookie('soundMode', soundMode === 'on' ? 'off' : 'on');
    };

    const saveImage = (file: File, callback: (result: string) => void) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                callback(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleClickBeforeImage = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            saveImage(event.target.files[0], (result) => {
                const style = `
                    .t1, .t2, .t3, .t4, .t5 {
                        background-size: auto 100%;
                        background-image: url("${result}");
                    }
                `;
                setClickBeforeStyle(style);
                localStorage.setItem('clickBeforeImage', result);
            });
        }
    };

    const handleClickAfterImage = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            saveImage(event.target.files[0], (result) => {
                const style = `
                    .tt1, .tt2, .tt3, .tt4, .tt5 {
                        background-size: auto 86%;
                        background-image: url("${result}");
                    }
                `;
                setClickAfterStyle(style);
                localStorage.setItem('clickAfterImage', result);
            });
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
        localStorage.removeItem('clickBeforeImage');
    };

    const resetClickAfterImage = () => {
        const style = `
            .tt1, .tt2, .tt3, .tt4, .tt5 {
                background-size: auto 86%;
                background-image: url("${clickAfterImage}");
            }
        `;
        setClickAfterStyle(style);
        localStorage.removeItem('clickAfterImage');
    };

    useEffect(() => {
        // Initialize body ref
        const bodyElement = document.getElementById('gameBody') || document.body;
        if (bodyElement) {
            bodyRef.current = bodyElement;
            bodyElement.style.height = window.innerHeight + 'px';
            setTransform(typeof (bodyElement.style.webkitTransform) !== 'undefined' 
                ? 'webkitTransform' 
                : 'transform');
        }

        // デフォルトのスタイルを設定
        const savedBeforeImage = localStorage.getItem('clickBeforeImage');
        const savedAfterImage = localStorage.getItem('clickAfterImage');

        setClickBeforeStyle(`
            .t1, .t2, .t3, .t4, .t5 {
                background-size: auto 100%;
                background-image: url("${savedBeforeImage || clickBeforeImage}");
            }
        `);

        setClickAfterStyle(`
            .tt1, .tt2, .tt3, .tt4, .tt5 {
                background-size: auto 86%;
                background-image: url("${savedAfterImage || clickAfterImage}");
            }
        `);

        // Initialize background layer
        const bgElement = document.getElementById('GameLayerBG');
        if (bgElement) {
            gameLayerBGRef.current = bgElement as HTMLDivElement;
        }

        // 初期化の順序を修正
        setTimeout(() => {
            countBlockSize();
            gameRestart();
            initSetting();
        }, 0);
        
        window.addEventListener('resize', refreshSizeHandler, false);

        return () => {
            window.removeEventListener('resize', refreshSizeHandler);
            if (gameTimeIntervalRef.current) {
                clearInterval(gameTimeIntervalRef.current);
            }
            if (refreshSizeTimeRef.current) {
                clearTimeout(refreshSizeTimeRef.current);
            }
        };
    }, []);

    useEffect(() => {
        // Initialize sound button text
        const soundButton = document.getElementById('sound');
        if (soundButton) {
            soundButton.textContent = I18N[`sound-${soundMode}` as keyof typeof I18N];
        }
    }, [soundMode]);

    // フォームのエラーも修正します
    const handleGameTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        if (!isNaN(value)) {
            setGameSettingNum(value);
        }
    };

    useEffect(() => {
        // ベストスコアの更新を監視
        const cookieName = mode === "NORMAL" ? 'best-score' : 'endless-best-score';
        const currentBest = parseFloat(cookie(cookieName) || '0');
        if (currentBest !== bestScore) {
            setBestScore(currentBest);
        }
    }, [mode, score]);

    const refreshSizeHandler = () => {
        if (refreshSizeTimeRef.current) {
            window.clearTimeout(refreshSizeTimeRef.current);
        }
        refreshSizeTimeRef.current = window.setTimeout(refreshSize, 200);
    }

    const refreshSize = () => {
        countBlockSize();
        gameLayerRefs.current.forEach((box) => {
            if (!box) return;
            Array.from(box.children).forEach((r, j) => {
                if (r instanceof HTMLElement) {
                    const extR = createExtendedElement(r);
                    extR.style.left = (j % 4) * blockSize + 'px';
                    extR.style.bottom = Math.floor(j / 4) * blockSize + 'px';
                    extR.style.width = blockSize + 'px';
                    extR.style.height = blockSize + 'px';
                }
            });
        });

        const [f, a] = gameLayerRefs.current;
        if (!f || !a) return;

        if (f.y > a.y) {
            const y = ((gameBBListIndex) % 10) * blockSize;
            f.y = y;
            f.style.transform = `translate3D(0,${f.y}px,0)`;
            a.y = -blockSize * Math.floor(f.children.length / 4) + y;
            a.style.transform = `translate3D(0,${a.y}px,0)`;
        } else {
            const y = ((gameBBListIndex) % 10) * blockSize;
            a.y = y;
            a.style.transform = `translate3D(0,${a.y}px,0)`;
            f.y = -blockSize * Math.floor(a.children.length / 4) + y;
            f.style.transform = `translate3D(0,${f.y}px,0)`;
        }
    }

    const createGameLayer = () => {
        return (
            <>
                <div id="GameLayerBG">
                    {[1, 2].map((i) => (
                        <div key={i} id={`GameLayer${i}`} className="GameLayer">
                            {Array.from({ length: 40 }, (_, j) => (
                                <div
                                    key={j}
                                    id={`${i}-${j}`}
                                    className={`block${j % 4 ? ' bl' : ''}`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
                <div id="GameTimeLayer" className="text-center">
                    {gameTimeText}
                </div>
            </>
        );
    }

    const modeToString = (mode: "NORMAL" | "ENDLESS" | "PRACTICE") => {
        return mode === "NORMAL" ? I18N['normal'] : (mode === "ENDLESS" ? I18N['endless'] : I18N['practice']);
    }

    const closeWelcomeLayer = () => {
        setWelcomeLayerClosed(true);
        updatePanel();
    }

    const readyBtn = () => {
        closeWelcomeLayer();
        updatePanel();
    }

    const scoreToString = (score: number) => {
        return mode === "ENDLESS" ? score.toFixed(2) : score.toString();
    }

    // エラー回復用の関数
    const recoverFromError = () => {
        setIsError(false);
        gameRestart();
    };

    // 初期化処理を安全に行う関数
    const safeInitialize = () => {
        try {
            if (!bodyRef.current) return;
            
            // 初期化順序を制御
            const initSteps = [
                () => {
                    // ゲームレイヤーの初期化
                    const [layer1, layer2] = gameLayerRefs.current;
                    if (layer1 && layer2) {
                        refreshGameLayer(layer1);
                        refreshGameLayer(layer2, 1);
                    }
                },
                () => {
                    // ブロックサイズの計算
                    countBlockSize();
                },
                () => {
                    // 設定の初期化
                    initSetting();
                }
            ];

            // 各初期化ステップを実行
            initSteps.forEach(step => {
                try {
                    step();
                } catch (error) {
                    console.error('Initialization step failed:', error);
                    throw error;
                }
            });

            setIsInitialized(true);
        } catch (error) {
            console.error('Initialization failed:', error);
            setIsError(true);
        }
    };

    // ゲーム再起動処理を安全に行う関数
    const safeGameRestart = () => {
        try {
            setGameBBList([]);
            setGameBBlistIndex(0);
            setGameScore(0);
            setScore(0);
            setGameOver(false);
            setIsGameStart(false);
            setCPS(0);
            
            if (mode === "NORMAL") {
                setGameTimeNum(gameSettingNum);
                setDate1(undefined);
            } else if (mode === "ENDLESS") {
                setGameStartTime(0);
                setGameStartDatetime(0);
            }
            
            // レイヤーの再初期化
            const [layer1, layer2] = gameLayerRefs.current;
            if (layer1 && layer2) {
                refreshGameLayer(layer1);
                refreshGameLayer(layer2, 1);
            } else {
                throw new Error('Game layers not initialized');
            }
            
            countBlockSize();
            updatePanel();
        } catch (error) {
            console.error('Game restart failed:', error);
            setIsError(true);
        }
    };

    // エラー状態の監視
    useEffect(() => {
        if (isError) {
            const timer = setTimeout(() => {
                recoverFromError();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isError]);

    return (
        <div id="gameBody">
            {isError ? (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    zIndex: 9999
                }}>
                    <div style={{marginBottom: '20px'}}>
                        {I18N['error-occurred']}
                    </div>
                    <button 
                        className="btn btn-secondary btn-lg"
                        onClick={recoverFromError}
                    >
                        {I18N['retry']}
                    </button>
                </div>
            ) : null}
            <style>{clickBeforeStyle}</style>
            <style>{clickAfterStyle}</style>
            <div id="GameScoreLayer" className="BBOX SHADE" style={isShown ? {} : {"display": "none"}}>
                <div style={{"padding":"5%","marginTop": "200px","backgroundColor": "rgba(125, 181, 216, 0.3)"}}>
                    <div id="GameScoreLayer-text">{shareText(cps)}</div>
                    <div id="GameScoreLayer-CPS" className="mb-2 d-flex flex-row justify-content-center text-start">
                        <div className="col-3">CPS</div>
                        <div className="col-2" id="cps">{cps.toFixed(2)}</div>
                    </div>
                    <div id="GameScoreLayer-score" className="mb-2 d-flex flex-row justify-content-center text-start" style={{'display': mode === "ENDLESS" ? 'none' : ''}}>
                        <div className="col-3">{I18N['score']}</div>
                        <div className="col-2" id="score">{scoreToString(score)}</div>
                    </div>
                    <div id="GameScoreLayer-best" className="mb-2 d-flex flex-row justify-content-center text-start">
                        <div className="col-3">{I18N['best']}</div>
                        <div className="col-2" id="best">
                            {(() => {
                                const bestScores = getBestScore(score, cps);
                                return mode === "ENDLESS" ? 
                                    bestScores.cps.toFixed(2) : 
                                    scoreToString(bestScores.score);
                            })()}
                        </div>
                    </div>
                    <button type="button" className="btn btn-secondary btn-lg" id="replay" onClick={replayBtn}>{I18N['again']}</button>
                    <button type="button" className="btn btn-secondary btn-lg" onClick={() => window.location.reload()}>{I18N['home']}</button>
                    <button type="button" className="btn btn-secondary btn-lg" onClick={() => window.location.href='https://github.com/konnokai/Rape-Senpai'}>{I18N['repo']}</button>
                </div>
            </div>
            <div id="welcome" className="SHADE BOX-M" style={{"display": welcomeLayerClosed? "none" :"block"}}>
                <div className="welcome-bg FILL"></div>
                <div className="FILL BOX-M" style={{"position": "absolute", "top":0,"left":0,"right":0,"bottom":0,"zIndex":5}}>
                    <div className="container">
                        <div className="container mb-5">
                            <div style={{"fontSize":"2.6em", "color":"#FEF002"}}>{I18N['game-title']}</div>
                            <br />
                            <div id="desc" style={{"display": "block","fontSize":"2.2em", "color":"#fff", "lineHeight":"1.5em"}}>
                                <span>{I18N['game-intro1']}</span><br />
                                <span>{I18N['game-intro2']}</span><br />
                                <span>{I18N['game-intro3']}</span><br />
                            </div>
                            <br />
                            <div style={{"fontSize":"1em", "color":"#fff","lineHeight":"1.5em"}}>
                                <span>{I18N['hint-keyboard-support']}</span><br />
                                <span>{I18N['hint-pointer-support']}</span><br />
                            </div>
                        </div>
                        <div id="btn_group" className="container text-nowrap">
                            <div className="d-flex justify-content-center flex-column flex-fill mx-auto px-2">
                                <a className="btn btn-primary btn-lg mb-3" onClick={() => readyBtn()}>{I18N['start']}</a>
                                <div className="dropdown mb-3">
                                    <a className="w-100 btn btn-secondary btn-lg" href="javascript: void(0);" role="button" id="mode" data-bs-toggle="dropdown" aria-expanded="false">{modeToString(mode)}</a>
                                    <ul className="dropdown-menu" aria-labelledby="mode">
                                        <li><a className="dropdown-item" onClick={() => changeMode("NORMAL")}>{I18N['normal']}</a></li>
                                        <li><a className="dropdown-item" onClick={() => changeMode("ENDLESS")}>{I18N['endless']}</a></li>
                                        <li><a className="dropdown-item" onClick={() => changeMode("PRACTICE")}>{I18N['practice']}</a></li>
                                    </ul>
                                </div>
                                <a className="btn btn-secondary btn-lg" onClick={showSetting}>{I18N['settings']}</a>
                            </div>
                        </div>
                        <div id="setting" className="container" style={{"display": "none"}}>
                            <div className="container mb-3 btn-group">
                                <a id="sound" type="button" className="btn text-nowrap btn-secondary" onClick={() => changeSoundMode()}></a>
                            </div>
                            <div className="input-group mb-3">
                                <div className="input-group-prepend col-2">
                                    <span className="input-group-text">{I18N['key']}</span>
                                </div>
                                <input type="text" id="keyboard" className="form-control" maxLength={4} placeholder={I18N['default-dfjk']}/>
                            </div>
                            <div className="input-group mb-3">
                                <div className="input-group-prepend col-2">
                                    <span className="input-group-text">{I18N['time']}</span>
                                </div>
                                <input 
                                    type="text" 
                                    id="gameTime" 
                                    className="form-control" 
                                    maxLength={4} 
                                    placeholder={I18N['default-20s']} 
                                    value={gameSettingNum}
                                    onChange={handleGameTimeChange}
                                />
                            </div>
                            <div className="input-group mb-3">
                                <div className="input-group-prepend col-2">
                                    <span className="input-group-text">クリック前画像</span>
                                </div>
                                <input
                                    type="file"
                                    id="click-before-image"
                                    className="form-control"
                                    accept="image/*"
                                    onChange={handleClickBeforeImage}
                                />
                                <button 
                                    className="btn btn-outline-secondary" 
                                    type="button"
                                    onClick={resetClickBeforeImage}
                                >
                                    リセット
                                </button>
                            </div>
                            <div className="input-group mb-3">
                                <div className="input-group-prepend col-2">
                                    <span className="input-group-text">クリック後画像</span>
                                </div>
                                <input
                                    type="file"
                                    id="click-after-image"
                                    className="form-control"
                                    accept="image/*"
                                    onChange={handleClickAfterImage}
                                />
                                <button 
                                    className="btn btn-outline-secondary" 
                                    type="button"
                                    onClick={resetClickAfterImage}
                                >
                                    リセット
                                </button>
                            </div>
                            <div className="input-group mb-3">
                                <div className="input-group-prepend col-2">
                                    <span className="input-group-text">タップ音</span>
                                </div>
                                <input
                                    type="file"
                                    id="tap-sound"
                                    className="form-control"
                                    accept="audio/*"
                                    onChange={(e) => handleSoundUpload(e, 'tap')}
                                />
                                <button 
                                    className="btn btn-outline-secondary" 
                                    type="button"
                                    onClick={() => resetSound('tap')}
                                >
                                    リセット
                                </button>
                            </div>
                            <div className="input-group mb-3">
                                <div className="input-group-prepend col-2">
                                    <span className="input-group-text">エラー音</span>
                                </div>
                                <input
                                    type="file"
                                    id="err-sound"
                                    className="form-control"
                                    accept="audio/*"
                                    onChange={(e) => handleSoundUpload(e, 'err')}
                                />
                                <button 
                                    className="btn btn-outline-secondary" 
                                    type="button"
                                    onClick={() => resetSound('err')}
                                >
                                    リセット
                                </button>
                            </div>
                            <div className="input-group mb-3">
                                <div className="input-group-prepend col-2">
                                    <span className="input-group-text">終了音</span>
                                </div>
                                <input
                                    type="file"
                                    id="end-sound"
                                    className="form-control"
                                    accept="audio/*"
                                    onChange={(e) => handleSoundUpload(e, 'end')}
                                />
                                <button 
                                    className="btn btn-outline-secondary" 
                                    type="button"
                                    onClick={() => resetSound('end')}
                                >
                                    リセット
                                </button>
                            </div>
                            <button type="button" className="btn btn-secondary btn-lg" onClick={() => {
                                saveCookie();
                                showBtnGroup();
                            }}>{I18N['ok']}</button>
                        </div>
                    </div>
                </div>
            </div>
            <div 
                id="GameLayerBG"
                ref={gameLayerBGRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
                onMouseDown={handleMouseDown}
            >
                <GameLayer id={1} gameLayerRefs={gameLayerRefs} />
                <GameLayer id={2} gameLayerRefs={gameLayerRefs} />
            </div>
            <div id="GameTimeLayer" ref={gameTimeLayerRef} className="text-center">
                {gameTimeText}
            </div>
        </div>
    )
}

export default App
