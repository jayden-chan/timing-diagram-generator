import { ProcessedDiagram, ProcessedTick } from "./diagram";
import {
  arrow,
  dashedArrow,
  generateSpan,
  lerp,
  line,
  polyline,
  rect,
  text,
} from "./svg_utils";

const TIMELINE_STROKE_WIDTH = 2;
const TICK_HEIGHT = 40;
const TICK_WIDTH = 50;
const LIFELINE_OUTER_MARGIN = 45;
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

  const lifelineBaseX = (longestLifelineName + longestStateName) * 11;
  const width = (d.ticks.length - 1) * TICK_WIDTH + lifelineBaseX + 30;
  const svg = [];

  svg.push(text([10, 28], "title", d.title));

  const heights: { [key: string]: number } = {};
  const lifelineCoords: { [key: string]: [number, number][][] } = {};
  let currHeight = 70;

  Object.keys(d.lifelines).forEach((l) => {
    const [boxSvg, height] = genLifelineBox({
      lifelineBaseX: lifelineBaseX,
      yCoord: currHeight,
      lifelineName: l,
      states: d.states[l],
      ticks: d.ticks,
    });

    currHeight += height;
    const h = currHeight;
    currHeight += LIFELINE_OUTER_MARGIN;

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
      svg.push(text([x + xOffset, y], "simple", a.label, anchor));
    }
  });

  svg.push(drawLegends(d.ticks.length, currHeight - 20, lifelineBaseX));

  const labelBoxHeight = 45;
  const labelBoxWidth = d.title.length * 14;
  svg.unshift(
    getSVGHeader([width, currHeight], [labelBoxWidth, labelBoxHeight])
  );

  svg.push("</svg>");
  return svg.join("");
}

function genLifelineBox(input: {
  lifelineBaseX: number;
  yCoord: number;
  lifelineName: string;
  states: string[];
  ticks: ProcessedTick[];
}): [string, number] {
  const { lifelineBaseX, yCoord, lifelineName, states, ticks } = input;
  const height = (states.length - 1) * TICK_HEIGHT + LIFELINE_BOX_MARGIN;
  const ret = [];
  // outer box
  ret.push(
    rect(
      [lifelineBaseX - 10, yCoord],
      [(ticks.length - 1) * TICK_WIDTH + 20, height]
    )
  );

  // Lifeline label
  ret.push(text([20, yCoord + height / 2], "lifeline-label", lifelineName));

  // Bottom ticks
  ticks.forEach((_, i) => {
    ret.push(
      line(
        [i * TICK_WIDTH + lifelineBaseX, yCoord + height - 5],
        [i * TICK_WIDTH + lifelineBaseX, yCoord + height + 10]
      )
    );
  });

  states.forEach((state, i) => {
    // Side tick
    const y = yCoord + height - LIFELINE_BOX_MARGIN_LOWER - i * TICK_HEIGHT;
    ret.push(line([lifelineBaseX - 20, y], [lifelineBaseX - 5, y]));

    // Label
    ret.push(
      text(
        [
          lifelineBaseX - 25,
          yCoord + height + 5 - LIFELINE_BOX_MARGIN_LOWER - i * TICK_HEIGHT,
        ],
        "simple",
        state,
        "end"
      )
    );
  });

  // Timeline
  ret.push(
    polyline(
      getTimelineCoords(
        ticks,
        lifelineName,
        lifelineBaseX,
        yCoord + height
      ).flat(),
      TIMELINE_STROKE_WIDTH
    )
  );

  return [ret.join(""), height];
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
      }" y="${yCoord}" class="simple">${i}</text>`
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

function getSVGHeader(
  [width, height]: [number, number],
  [labelWidth, labelHeight]: [number, number]
): string {
  const borderWidth = 2;
  const labelBoxEdgeSize = 20;
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<style>
  .title { font: bold 20px sans-serif }
  .lifeline-label { font: bold 17px sans-serif }
  .simple { font-family: sans-serif }
  text { white-space: pre }
</style>
<defs>
  <marker id="arrow" viewBox="0 0 15 15" refX="15" refY="7.5"
      markerWidth="9" markerHeight="9"
      orient="auto-start-reverse">
    <path d="M 0 0 L 15 7.5 L 0 15 z" />
  </marker>
</defs>
<polyline points="${width - borderWidth},0 ${width - borderWidth},${
    height - borderWidth
  } 0,${
    height - borderWidth
  }" stroke="black" fill="none" style="stroke-width:${borderWidth}px" />
<polyline points="0,${labelHeight} ${
    labelWidth - labelBoxEdgeSize
  },${labelHeight} ${labelWidth},${
    labelHeight - labelBoxEdgeSize
  } ${labelWidth},0" stroke="black" fill="none" style="stroke-width:2px" />
`;
}
