<div align="center">

# TapTile

このプロジェクトは、雷普先輩（EatKano）を一部生成AIを用いてReact化した実験的なものです。レンダリングの不整合や状態管理の不具合が発生し、動作は非常に不安定です。

意図せずこのページに漂着された場合は、以下の安定したバージョンをプレイしてください。

[EatKano (Github Pages)](https://arcxingye.github.io/EatKano/index.html) |
[雷普先輩](https://rape.konnokai.me/index.html)

繁中訳 by [孤之界](https://github.com/konnnokai)

語録訳 by [nikkorinyuki](https://github.com/nikkorinyuki)

## スクリプト

雑ですががんばって連打してくれるかわいいやつです。

</div>

```js
const Clicker = () => {
  const targets = [
    ...document.getElementsByClassName("t1"),
    ...document.getElementsByClassName("t2"),
    ...document.getElementsByClassName("t3"),
    ...document.getElementsByClassName("t4"),
    ...document.getElementsByClassName("t5"),
  ];

  const targetBottom = 158;

  const sorted = targets.slice().sort((a, b) => {
    const getBottom = (el) => {
      const style = window.getComputedStyle(el);
      return parseFloat(style.bottom) || 0;
    };

    const getParentTranslateY = (el) => {
      const parent = el.parentElement;
      if (!parent) return 0;

      const style = window.getComputedStyle(parent);
      const transform = style.transform || style.webkitTransform;

      if (!transform || transform === "none") return 0;

      const match3d = transform.match(/matrix3d\((.+)\)/);
      if (match3d) {
        const values = match3d[1].split(", ");
        return parseFloat(values[13]) || 0;
      }

      const match2d = transform.match(/matrix\((.+)\)/);
      if (match2d) {
        const values = match2d[1].split(", ");
        return parseFloat(values[5]) || 0;
      }

      return 0;
    };

    const distA = Math.abs(
      (getBottom(a) - getParentTranslateY(a)) - targetBottom,
    );
    const distB = Math.abs(
      (getBottom(b) - getParentTranslateY(b)) - targetBottom,
    );

    return distA - distB;
  });

  const el = sorted[0];
  const rect = el.getBoundingClientRect();
  const event = new MouseEvent("mousedown", {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: rect.left + rect.width / 2,
    clientY: rect.bottom + 5,
  });
  el.dispatchEvent(event);
};

setInterval(Clicker, 100);
```
