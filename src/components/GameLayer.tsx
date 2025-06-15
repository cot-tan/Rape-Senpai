import { useEffect, useRef } from "react";

export interface GameBlock {
  cell: number;
  id: string;
}

export type GameLayerElement = HTMLElement & {
  y: number;
  notEmpty: boolean;
};

export interface BlockElement extends HTMLDivElement {
  notEmpty?: boolean;
}

export const createExtendedElement = (element: Element): GameLayerElement => {
  if (!(element instanceof HTMLElement)) {
    throw new Error("Element must be an HTMLElement");
  }
  return Object.assign(element, {
    y: 0,
    notEmpty: false,
  }) as GameLayerElement;
};

interface GameLayerProps {
  id: number;
  gameLayerRefs: React.MutableRefObject<GameLayerElement[]>;
  columns: number;
}
export const GameLayer: React.FC<GameLayerProps> = (
  { id, gameLayerRefs, columns },
) => {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (layerRef.current) {
      const extendedLayer = createExtendedElement(layerRef.current);
      gameLayerRefs.current[id - 1] = extendedLayer;

      // Initialize children
      Array.from(layerRef.current.querySelectorAll("div")).forEach((div) => {
        const extendedDiv = createExtendedElement(div);
        extendedDiv.notEmpty = false;
        console.log("Initialize block", {
          id: div.id,
          y: extendedDiv.y,
          notEmpty: extendedDiv.notEmpty,
        });
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
      {Array.from({ length: (columns + 4) * 10 }, (_, j) => (
        <div
          key={j}
          id={`${id}-${j}`}
          data-num={j}
          className={`block${j % columns ? " bl" : ""}`}
        />
      ))}
    </div>
  );
};

export interface BlockElementProps {
  id: string;
  left: number;
  bottom: number;
  size: number;
  isTarget: boolean;
  onTap: (id: string) => void;
}

export const BlockElement: React.FC<BlockElementProps> = (
  { id, left, bottom, size, isTarget, onTap },
) => (
  <div
    id={id}
    className={`block${isTarget ? " target" : ""}`}
    style={{
      position: "absolute",
      width: `${size}px`,
      height: `${size}px`,
      left: `${left}px`,
      bottom: `${bottom}px`,
      transition: "all 100ms ease-in-out",
    }}
    onClick={() => onTap(id)}
  />
);
