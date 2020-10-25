import { ProcessedDiagram, ProcessedTick } from "./diagram";

const BORDER_WIDTH = 2;
const TICK_HEIGHT = 40;
const TICK_WIDTH = 50;
const LIFELINE_BOX_MARGIN_UPPER = 50;
const LIFELINE_BOX_MARGIN_LOWER = 20;
const LIFELINE_BOX_MARGIN =
  LIFELINE_BOX_MARGIN_UPPER + LIFELINE_BOX_MARGIN_LOWER;

export function render(d: ProcessedDiagram): string {
  const longestStateName = Math.max(
    ...Object.values(d.states).map((ss) => Math.max(...ss.map((s) => s.length)))
  );
  const longestLifelineName = Math.max(
    ...Object.keys(d.lifelines).map((s) => s.length)
  );

  const lifelineBaseX = (longestLifelineName + longestStateName) * 10;
  const width = (d.ticks.length - 1) * TICK_WIDTH + lifelineBaseX + 30;
  const labelBoxHeight = 45;
  const labelBoxWidth = d.title.length * 14;
  const svg = [];

  svg.push(text([10, 28], "title", d.title));

  const heights: { [key: string]: number } = {};
  const lifelineCoords: { [key: string]: [number, number][][] } = {};
  let currHeight = 70;

  Object.keys(d.lifelines).forEach((l) => {
    const [boxSvg, height] = genLifelineBox(
      d.ticks.length,
      d.states[l].length,
      lifelineBaseX,
      currHeight,
      l,
      d.states[l],
      d.ticks
    );
    currHeight += height + 30;
    const h = currHeight - 45;
    heights[l] = h;
    lifelineCoords[l] = getTimelineCoords(d.ticks, l, lifelineBaseX, h);
    svg.push(boxSvg);
  });

  d.spans.forEach((s) => {
    const h =
      heights[s.lifeline] - d.states[s.lifeline].length * TICK_HEIGHT + 5;
    const length = (s.destTick - s.originTick) * TICK_WIDTH;
    svg.push(
      generateSpan(
        length,
        [lifelineBaseX + s.originTick * TICK_WIDTH, h],
        s.label
      )
    );
  });

  d.arrows.forEach((a) => {
    const originPoint =
      lifelineCoords[a.originLifeline][a.originTick][a.originIdx];

    const destPoint = lifelineCoords[a.destLifeline][a.destTick][a.destIdx];

    svg.push(
      a.style === "solid"
        ? arrow(originPoint, destPoint)
        : dashedArrow(originPoint, destPoint)
    );

    if (a.label) {
      const labelPos = a.labelPos / 100;
      const anchor = a.labelSide === "R" ? "start" : "end";
      const [x, y] = lerp(originPoint, destPoint, labelPos);
      const xOffset = a.labelSide === "R" ? 10 : -10;
      svg.push(text([x + xOffset, y], "state-label", a.label, anchor));
    }
  });

  svg.push(drawLegends(d.ticks.length, currHeight - 20, lifelineBaseX));
  svg.push("</svg>");

  const height = currHeight;
  let header = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<style>
  .title { font: bold 20px sans-serif }
  .state-label { font-family: sans-serif }
  .lifeline-label { font: bold 17px sans-serif }
  .legend { font-family: sans-serif }
  text { white-space: pre }
</style>
<defs>
  <!-- arrowhead marker definition -->
  <marker id="arrow" viewBox="0 0 15 15" refX="15" refY="7.5"
      markerWidth="9" markerHeight="9"
      orient="auto-start-reverse">
    <path d="M 0 0 L 15 7.5 L 0 15 z" />
  </marker>
</defs>
<polyline points="${width - BORDER_WIDTH},0 ${width - BORDER_WIDTH},${
    height - BORDER_WIDTH
  } 0,${
    height - BORDER_WIDTH
  }" stroke="black" fill="none" style="stroke-width:${BORDER_WIDTH}px" />
<polyline points="0,${labelBoxHeight} ${
    labelBoxWidth - 20
  },${labelBoxHeight} ${labelBoxWidth},${
    labelBoxHeight - 20
  } ${labelBoxWidth},0" stroke="black" fill="none" style="stroke-width:2px" />
`;

  svg.unshift(header);

  return svg.join("");
}

function genLifelineBox(
  numTicks: number,
  numStates: number,
  lifelineBaseX: number,
  yCoord: number,
  lifelineName: string,
  states: string[],
  ticks: ProcessedTick[]
): [string, number] {
  const height = (numStates - 1) * TICK_HEIGHT + LIFELINE_BOX_MARGIN;
  const ret = [];
  // outer box
  // point order BL->TL->TR->BR->BL
  ret.push(
    polyline([
      [lifelineBaseX - 10, yCoord + height],
      [lifelineBaseX - 10, yCoord],
      [(numTicks - 1) * TICK_WIDTH + lifelineBaseX + 10, yCoord],
      [(numTicks - 1) * TICK_WIDTH + lifelineBaseX + 10, yCoord + height],
      [lifelineBaseX - 10, yCoord + height],
    ])
  );

  ret.push(text([20, yCoord + height / 2], "lifeline-label", lifelineName));

  for (let i = 0; i < numTicks; i++) {
    ret.push(
      line(
        [i * TICK_WIDTH + lifelineBaseX, yCoord + height - 5],
        [i * TICK_WIDTH + lifelineBaseX, yCoord + height + 10]
      )
    );
  }

  for (let i = 0; i < numStates; i++) {
    const y = yCoord + height - LIFELINE_BOX_MARGIN_LOWER - i * TICK_HEIGHT;
    ret.push(line([lifelineBaseX - 20, y], [lifelineBaseX, y]));
  }

  states.forEach((state, i) => {
    ret.push(
      `<text text-anchor="end" class="state-label" x="${
        lifelineBaseX - 25
      }" y="${
        yCoord + height + 5 - LIFELINE_BOX_MARGIN_LOWER - i * TICK_HEIGHT
      }">${state}</text>`
    );
  });

  ret.push(
    `<polyline points="${getTimelineCoords(
      ticks,
      lifelineName,
      lifelineBaseX,
      yCoord + height
    )
      .flat()
      .map(([x, y]) => `${x},${y}`)
      .join(" ")}" fill="none" stroke="black" style="stroke-width:2px"/>`
  );

  return [ret.join(""), height + 15];
}

function drawLegends(
  numTicks: number,
  yCoord: number,
  lifelineBaseX: number
): string {
  const ret = [];
  for (let i = 0; i < numTicks; i++) {
    ret.push(
      `<text text-anchor="middle" x="${
        i * TICK_WIDTH + lifelineBaseX
      }" y="${yCoord}" class="legend">${i}</text>`
    );
  }

  return ret.join("");
}

function getTimelineCoords(
  ticks: ProcessedTick[],
  lifelineName: string,
  lifelineBaseX: number,
  yCoord: number
): [number, number][][] {
  return ticks.reduce((acc, curr, i, arr) => {
    const pointsForThisTick: [number, number][] = [];
    if (i > 0 && curr[lifelineName] !== arr[i - 1][lifelineName]) {
      pointsForThisTick.push([
        lifelineBaseX + i * TICK_WIDTH,
        yCoord -
          LIFELINE_BOX_MARGIN_LOWER -
          arr[i - 1][lifelineName] * TICK_HEIGHT,
      ]);
    }
    pointsForThisTick.push([
      lifelineBaseX + i * TICK_WIDTH,
      yCoord - LIFELINE_BOX_MARGIN_LOWER - curr[lifelineName] * TICK_HEIGHT,
    ]);
    acc.push(pointsForThisTick);
    return acc;
  }, [] as [number, number][][]);
}

function generateSpan(
  length: number,
  [x, y]: [number, number],
  label: string
): string {
  const ret = [];
  const sideHeight = 7;
  ret.push(doubleSidedArrow([x, y], [x + length, y]));
  ret.push(line([x, y - sideHeight], [x, y + sideHeight]));
  ret.push(line([x + length, y - sideHeight], [x + length, y + sideHeight]));
  ret.push(text([x + length / 2, y - 10], "legend", label, "middle"));
  return ret.join("");
}

function arrow(from: [number, number], to: [number, number]): string {
  return `<polyline points="${from[0]},${from[1]} ${to[0]},${to[1]}" fill="none" stroke="black" marker-end="url(#arrow)" />`;
}

function dashedArrow(from: [number, number], to: [number, number]): string {
  return `<polyline points="${from[0]},${from[1]} ${to[0]},${to[1]}" fill="none" stroke="black" stroke-dasharray="10" marker-end="url(#arrow)" />`;
}

function doubleSidedArrow(
  from: [number, number],
  to: [number, number]
): string {
  return `<polyline points="${from[0]},${from[1]} ${to[0]},${to[1]}" fill="none" stroke="black" marker-start="url(#arrow)" marker-end="url(#arrow)" />`;
}

function text(
  [x, y]: [number, number],
  className: string,
  text: string,
  anchor?: "start" | "end" | "middle"
): string {
  return `<text ${
    anchor ? `text-anchor="${anchor}"` : ""
  } x="${x}" y="${y}" class="${className}">${text}</text>`;
}

function polyline(points: [number, number][]): string {
  return `<polyline points="${points
    .map(([x, y]) => `${x},${y}`)
    .join(" ")}" fill="none" stroke="black" />`;
}

function line([x1, y1]: [number, number], [x2, y2]: [number, number]): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" />`;
}

function lerp(
  [x1, y1]: [number, number],
  [x2, y2]: [number, number],
  percent: number
): [number, number] {
  const absXDiff = Math.abs(x2 - x1);
  const absYDiff = Math.abs(y2 - y1);

  return [
    x1 + absXDiff * Math.sign(x2 - x1) * percent,
    y1 + absYDiff * Math.sign(y2 - y1) * percent,
  ];
}
