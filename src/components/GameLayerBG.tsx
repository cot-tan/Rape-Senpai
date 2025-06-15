import { Settings } from "../hooks/useSettings.ts";
import { BlockElement, GameLayer, GameLayerElement } from "./GameLayer.tsx";

export const GameLayerBG = (
  {
    settings,
    handleGameTap,
    isDesktop,
    activeRef,
    gameLayerBGRef,
    gameLayerRefs,
    bodyRef,
  }: {
    settings: Settings;
    handleGameTap: (x: number, y: number, target: BlockElement) => boolean;
    isDesktop: boolean;
    activeRef: React.RefObject<boolean>;
    gameLayerRefs: React.RefObject<GameLayerElement[]>;
    gameLayerBGRef: React.RefObject<HTMLDivElement | null>;
    bodyRef: React.RefObject<HTMLElement | null>;
  },
) => {
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    activeRef.current = true;

    const touch = e.touches[0];
    const rect = bodyRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    console.log(`[handleTouchStart]:`, {
      touch,
      rect,
      x,
      y,
    });
    handleGameTap(x, y, e.target as BlockElement);
    activeRef.current = false;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDesktop) return;
    e.preventDefault();
    e.stopPropagation();

    activeRef.current = true;

    const rect = bodyRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleGameTap(x, y, e.target as BlockElement);
    activeRef.current = false;
  };

  return (
    <div
      id="GameLayerBG"
      ref={gameLayerBGRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={() => activeRef.current = false}
      onMouseDown={handleMouseDown}
    >
      <GameLayer
        id={1}
        gameLayerRefs={gameLayerRefs}
        columns={settings.columns}
      />
      <GameLayer
        id={2}
        gameLayerRefs={gameLayerRefs}
        columns={settings.columns}
      />
    </div>
  );
};
