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
const LIFELINE_BOX_MARGIN_SIMPLE = LIFELINE_BOX_MARGIN_LOWER + 70;
const LIFELINE_BOX_MARGIN =
  LIFELINE_BOX_MARGIN_UPPER + LIFELINE_BOX_MARGIN_LOWER;

export function render(d: ProcessedDiagram): string {
  const svg = [];

  const longestStateName = Math.max(
    ...Object.values(d.states).map((ss) => Math.max(...ss.map((s) => s.length)))
  );
  const longestLifelineName = Math.max(
    ...Object.keys(d.lifelines).map((s) => s.length)
  );

  const lifelineBaseX = (longestLifelineName + longestStateName) * 11;

  svg.push(text([10, 28], "title", d.title));

  const heights: { [key: string]: number } = {};
  const lifelineConnectionPoints: { [key: string]: [number, number][][] } = {};
  let currHeight = 70;

  Object.keys(d.lifelines).forEach((l) => {
    const genFn =
      d.lifelines[l].style === "simplified" ? genNormalLifeline : genLifeline;
    const [boxSvg, height] = genFn({
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
    lifelineConnectionPoints[l] = genTimelineCoordsNormal(
      d.ticks,
      l,
      lifelineBaseX,
      h
    );
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
      lifelineConnectionPoints[a.originLifeline][a.originTick][a.originIdx];

    const destPoint =
      lifelineConnectionPoints[a.destLifeline][a.destTick][a.destIdx];

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

  svg.push(genLegends(d.ticks.length, currHeight - 20, lifelineBaseX));

  const labelBoxHeight = 45;
  const labelBoxWidth = d.title.length * 14;
  const width = (d.ticks.length - 1) * TICK_WIDTH + lifelineBaseX + 30;
  svg.unshift(
    genSVGHeader([width, currHeight], [labelBoxWidth, labelBoxHeight])
  );

  svg.push("</svg>");
  return svg.join("");
}

function genNormalLifeline(input: {
  lifelineBaseX: number;
  yCoord: number;
  lifelineName: string;
  states: string[];
  ticks: ProcessedTick[];
}): [string, number] {
  const { lifelineBaseX, yCoord, lifelineName, ticks } = input;
  const height = TICK_HEIGHT + LIFELINE_BOX_MARGIN_SIMPLE;
  const ret = [];
  ret.push(
    genLifelineBox({
      lifelineBaseX,
      lifelineName,
      yCoord,
      height,
      numTicks: ticks.length,
    })
  );

  const y = yCoord + height - LIFELINE_BOX_MARGIN_LOWER - TICK_HEIGHT;
  ret.push(genSideTick([lifelineBaseX, y], "State"));

  const topLine = genTimelineCoordsSimple(
    ticks,
    lifelineName,
    lifelineBaseX,
    yCoord + height,
    "top"
  );
  const bottomLine = genTimelineCoordsSimple(
    ticks,
    lifelineName,
    lifelineBaseX,
    yCoord + height,
    "bottom"
  );
  // Timeline
  ret.push(
    polyline(topLine.flat(), TIMELINE_STROKE_WIDTH),
    polyline(bottomLine.flat(), TIMELINE_STROKE_WIDTH)
  );

  return [ret.join(""), height];
}

function genLifelineBox(input: {
  lifelineBaseX: number;
  lifelineName: string;
  yCoord: number;
  height: number;
  numTicks: number;
}): string {
  const { lifelineBaseX, lifelineName, yCoord, numTicks, height } = input;
  const ret = [];
  ret.push(
    rect(
      [lifelineBaseX - 10, yCoord],
      [(numTicks - 1) * TICK_WIDTH + 20, height]
    )
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

  return ret.join("");
}

function genLifeline(input: {
  lifelineBaseX: number;
  yCoord: number;
  lifelineName: string;
  states: string[];
  ticks: ProcessedTick[];
}): [string, number] {
  const { lifelineBaseX, yCoord, lifelineName, states, ticks } = input;
  const height = (states.length - 1) * TICK_HEIGHT + LIFELINE_BOX_MARGIN;
  const ret = [];
  ret.push(
    genLifelineBox({
      lifelineBaseX,
      lifelineName,
      yCoord,
      height,
      numTicks: ticks.length,
    })
  );

  states.forEach((state, i) => {
    const y = yCoord + height - LIFELINE_BOX_MARGIN_LOWER - i * TICK_HEIGHT;
    ret.push(genSideTick([lifelineBaseX, y], state));
  });

  // Timeline
  ret.push(
    polyline(
      genTimelineCoordsNormal(
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

function genSideTick([x, y]: [number, number], label: string): string {
  const ret = [];
  ret.push(line([x - 20, y], [x - 5, y]));
  ret.push(text([x - 25, y + 5], "simple", label, "end"));
  return ret.join("");
}

function genLegends(
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

function genTimelineCoordsNormal(
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

function genTimelineCoordsSimple(
  ticks: ProcessedTick[],
  lifelineName: string,
  lifelineBaseX: number,
  yCoord: number,
  side: "top" | "bottom"
): [number, number][][] {
  const yMultiplier = side === "top" ? 1.5 : 0.5;
  const yCenter = yCoord - LIFELINE_BOX_MARGIN_LOWER - TICK_HEIGHT;
  const yNorm = yCoord - LIFELINE_BOX_MARGIN_LOWER - TICK_HEIGHT * yMultiplier;
  return ticks.reduce(
    (acc, curr, i, arr) => {
      const pointsForThisTick: [number, number][] = [];
      if (i !== 0 && curr[lifelineName] !== arr[i - 1][lifelineName]) {
        pointsForThisTick.push([
          lifelineBaseX + i * TICK_WIDTH - TICK_WIDTH / 3,
          yNorm,
        ]);
        pointsForThisTick.push([lifelineBaseX + i * TICK_WIDTH, yCenter]);
        pointsForThisTick.push([
          lifelineBaseX + i * TICK_WIDTH + TICK_WIDTH / 3,
          yNorm,
        ]);
      }

      if (i === arr.length - 1) {
        pointsForThisTick.push([lifelineBaseX + i * TICK_WIDTH, yNorm]);
      }
      acc.push(pointsForThisTick);
      return acc;
    },
    [[[lifelineBaseX, yNorm]]]
  );
}

function genSVGHeader(
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
${polyline(
  [
    [width - borderWidth, 0],
    [width - borderWidth, height - borderWidth],
    [0, height - borderWidth],
  ],
  borderWidth
)}
${polyline(
  [
    [0, labelHeight],
    [labelWidth - labelBoxEdgeSize, labelHeight],
    [labelWidth, labelHeight - labelBoxEdgeSize],
    [labelWidth, 0],
  ],
  borderWidth
)}
`;
}
