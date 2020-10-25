import { ProcessedDiagram, ProcessedTick } from "./diagram";
import {
  Coord,
  arrow,
  dashedArrow,
  genSVGHeader,
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
    ...Object.values(d.states)
      .flat()
      .map((s) => s.length)
  );
  const longestLifelineName = Math.max(
    ...Object.keys(d.lifelines).map((s) => s.length)
  );

  const lifelineBaseX = (longestLifelineName + longestStateName) * 11;

  svg.push(text([10, 30], "title", d.title));

  const heights: { [key: string]: number } = {};
  const lifelineConnectionPoints: { [key: string]: Coord[][] } = {};
  let currHeight = 70;

  Object.keys(d.lifelines).forEach((l) => {
    const genFn =
      d.lifelines[l].style === "simplified"
        ? genNormalLifeline
        : genSimpleLifeline;
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
    lifelineConnectionPoints[l] = getArrowAttachmentPoints({
      ticks: d.ticks,
      lifelineName: l,
      lifelineBaseX,
      yCoord: h,
      style: d.lifelines[l].style,
    });
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

function getArrowAttachmentPoints(input: {
  ticks: ProcessedTick[];
  lifelineName: string;
  lifelineBaseX: number;
  yCoord: number;
  style: "simplified" | "normal";
}): Coord[][] {
  return input.style === "normal"
    ? genTimelineCoordsNormal(input)
    : getSimpleTimelineAttachmentPoints(input);
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

function genNormalLifeline(input: {
  lifelineBaseX: number;
  yCoord: number;
  lifelineName: string;
  states: string[];
  ticks: ProcessedTick[];
}): [string, number] {
  const { lifelineBaseX, yCoord, lifelineName, states, ticks } = input;
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

  let prevX = lifelineBaseX;
  ticks.forEach((t, i) => {
    const x = lifelineBaseX + i * TICK_WIDTH;
    if (i !== 0 && t[lifelineName] !== ticks[i - 1][lifelineName]) {
      ret.push(
        text(
          [prevX + (x - prevX) / 2, y + 5],
          "simple",
          states[ticks[i - 1][lifelineName]],
          "middle"
        )
      );
      prevX = x;
    } else if (i === ticks.length - 1) {
      ret.push(
        text(
          [prevX + (x - prevX) / 2, y + 5],
          "simple",
          states[t[lifelineName]],
          "middle"
        )
      );
    }
  });

  const cParams = {
    ticks,
    lifelineName,
    lifelineBaseX,
    yCoord: yCoord + height,
  };
  const topLine = genTimelineCoordsSimple({ ...cParams, side: "top" });
  const bottomLine = genTimelineCoordsSimple({ ...cParams, side: "bottom" });
  ret.push(
    polyline(topLine.flat(), TIMELINE_STROKE_WIDTH),
    polyline(bottomLine.flat(), TIMELINE_STROKE_WIDTH)
  );

  return [ret.join(""), height];
}

function genSimpleLifeline(input: {
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
      genTimelineCoordsNormal({
        ticks,
        lifelineName,
        lifelineBaseX,
        yCoord: yCoord + height,
      }).flat(),
      TIMELINE_STROKE_WIDTH
    )
  );

  return [ret.join(""), height];
}

function genSideTick([x, y]: Coord, label: string): string {
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
      text(
        [i * TICK_WIDTH + lifelineBaseX, yCoord],
        "simple",
        i.toString(),
        "middle"
      )
    );
  }

  return ret.join("");
}

function genTimelineCoordsNormal(input: {
  ticks: ProcessedTick[];
  lifelineName: string;
  lifelineBaseX: number;
  yCoord: number;
}): Coord[][] {
  const { ticks, lifelineName, lifelineBaseX, yCoord } = input;
  return ticks.reduce((acc, curr, i, arr) => {
    const pointsForThisTick: Coord[] = [];
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
  }, [] as Coord[][]);
}

function genTimelineCoordsSimple(input: {
  ticks: ProcessedTick[];
  lifelineName: string;
  lifelineBaseX: number;
  yCoord: number;
  side: "top" | "bottom";
}): Coord[][] {
  const { ticks, lifelineName, lifelineBaseX, yCoord, side } = input;
  const yMultiplier = side === "top" ? 1.5 : 0.5;
  const yCenter = yCoord - LIFELINE_BOX_MARGIN_LOWER - TICK_HEIGHT;
  const yNorm = yCoord - LIFELINE_BOX_MARGIN_LOWER - TICK_HEIGHT * yMultiplier;
  return ticks.reduce(
    (acc, curr, i, arr) => {
      const pointsForThisTick: Coord[] = [];
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

function getSimpleTimelineAttachmentPoints(input: {
  ticks: ProcessedTick[];
  lifelineName: string;
  lifelineBaseX: number;
  yCoord: number;
}): Coord[][] {
  const { ticks, lifelineName, lifelineBaseX, yCoord } = input;
  const yCenter = yCoord - LIFELINE_BOX_MARGIN_LOWER - TICK_HEIGHT;
  return ticks.reduce((acc, curr, i, arr) => {
    const pointsForThisTick: Coord[] = [];
    if (i !== 0 && curr[lifelineName] !== arr[i - 1][lifelineName]) {
      pointsForThisTick.push([lifelineBaseX + i * TICK_WIDTH, yCenter]);
    } else {
      pointsForThisTick.push([
        lifelineBaseX + i * TICK_WIDTH,
        yCenter + TICK_HEIGHT / 2,
      ]);
      pointsForThisTick.push([
        lifelineBaseX + i * TICK_WIDTH,
        yCenter - TICK_HEIGHT / 2,
      ]);
    }

    acc.push(pointsForThisTick);
    return acc;
  }, [] as Coord[][]);
}
