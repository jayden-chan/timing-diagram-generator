import { ProcessedDiagram, ProcessedTick } from "./diagram";
import { DiagramConfig, LifelineStyle } from "./parser";
import {
  arrow,
  Coord,
  dashedArrow,
  dashedLine,
  generateSpan,
  genSVGHeader,
  lerp,
  line,
  polygon,
  polyline,
  rect,
  scaleCoord,
  text,
} from "./svg_utils";

const TIMELINE_STROKE_WIDTH = 2;
const TICK_HEIGHT = 40;
const SIMPLE_STATECHANGE_WIDTH = 40;
const LIFELINE_OUTER_MARGIN = 45;
const LIFELINE_BOX_MARGIN_UPPER = 50;
const LIFELINE_BOX_MARGIN_LOWER = 20;
const LIFELINE_BOX_MARGIN_SIMPLE = LIFELINE_BOX_MARGIN_UPPER;
const LIFELINE_BOX_MARGIN =
  LIFELINE_BOX_MARGIN_UPPER + LIFELINE_BOX_MARGIN_LOWER;

const COLORS = [
  "#edf2f7",
  "#c6f6d5",
  "#fefcbf",
  "#fed7d7",
  "#b2f5ea",
  "#e9d8fd",
  "#feebc8",
  "#bee3f8",
  "#fed7e2",
  "#c4f1f9",
  "#c6f6d5",
];

export function render(d: ProcessedDiagram): string {
  const svg = [];
  const scale = d.config.scale;

  const longestStateName = Math.max(
    ...Object.values(d.states)
      .flat()
      .map((s) => s.length)
  );

  const longestLifelineName = Math.max(
    ...Object.keys(d.lifelines).map((s) => s.length)
  );

  const lifelineBaseX =
    longestLifelineName * 10 + longestStateName * 6 + LIFELINE_OUTER_MARGIN * 2;

  svg.push(text([10, 30], "title", d.title, scale));

  const heights: Record<string, number> = {};
  const lifelineConnectionPoints: Record<string, Coord[][]> = {};
  let currHeight = 70;

  Object.keys(d.lifelines).forEach((l) => {
    const genFn =
      d.lifelines[l].style === "simplified"
        ? genSimpleLifeline
        : genNormalLifeline;

    const [boxSvg, height] = genFn({
      config: d.config,
      color: d.lifelines[l].style === "slice",
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
      config: d.config,
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

    const length = (s.destTick - s.originTick) * d.config.tickWidth;

    svg.push(
      generateSpan(
        length,
        [lifelineBaseX + s.originTick * d.config.tickWidth, h],
        s.label,
        scale
      )
    );
  });

  d.arrows.forEach((a) => {
    const originPoint = scaleCoord(
      lifelineConnectionPoints[a.originLifeline][a.originTick][a.originIdx],
      scale
    );

    const destPoint = scaleCoord(
      lifelineConnectionPoints[a.destLifeline][a.destTick][a.destIdx],
      scale
    );

    svg.push(
      a.style === "solid"
        ? arrow(originPoint, destPoint, scale)
        : dashedArrow(originPoint, destPoint, scale)
    );

    if (a.label) {
      const labelPos = a.labelPos / 100;
      const anchor = a.labelSide === "R" ? "start" : "end";
      const [x, y] = lerp(originPoint, destPoint, labelPos);
      const xOffset = a.labelSide === "R" ? 10 : -10;
      svg.push(text([x + xOffset, y], "simple", a.label, scale, anchor));
    }
  });

  const labelBoxHeight = 45 * (scale / 2);
  const labelBoxWidth = d.title.length * 14 * (scale / 2);
  const width = (d.ticks.length - 1) * d.config.tickWidth + lifelineBaseX + 30;
  svg.unshift(
    genSVGHeader([width, currHeight], [labelBoxWidth, labelBoxHeight], scale)
  );

  svg.push("</svg>");
  return svg.join("");
}

function getArrowAttachmentPoints(input: {
  config: DiagramConfig;
  ticks: ProcessedTick[];
  lifelineName: string;
  lifelineBaseX: number;
  yCoord: number;
  style: LifelineStyle;
}): Coord[][] {
  return input.style === "normal"
    ? genTimelineCoordsNormal(input)
    : getSimpleTimelineAttachmentPoints(input);
}

function genLifelineBox(input: {
  config: DiagramConfig;
  ticks: ProcessedTick[];
  lifelineBaseX: number;
  lifelineName: string;
  yCoord: number;
  height: number;
}): string {
  const { config, lifelineBaseX, lifelineName, yCoord, ticks, height } = input;
  const ret = [];
  ret.push(
    rect(
      [lifelineBaseX - 10, yCoord],
      [(ticks.length - 1) * config.tickWidth + 20, height],
      config.scale
    )
  );

  ret.push(
    text(
      [20, yCoord + height / 2],
      "lifeline-label",
      lifelineName,
      config.scale
    )
  );
  ret.push(
    genLegends(config, ticks, yCoord + height + 25, lifelineBaseX, lifelineName)
  );

  return ret.join("");
}

function genSimpleLifeline(input: {
  config: DiagramConfig;
  lifelineBaseX: number;
  yCoord: number;
  lifelineName: string;
  states: string[];
  ticks: ProcessedTick[];
}): [string, number] {
  const { config, lifelineBaseX, yCoord, lifelineName, states, ticks } = input;
  const height = TICK_HEIGHT + LIFELINE_BOX_MARGIN_SIMPLE * 2;
  const ret = [];
  ret.push(
    genLifelineBox({
      config,
      ticks,
      lifelineBaseX,
      lifelineName,
      yCoord,
      height,
    })
  );

  const y = yCoord + height - LIFELINE_BOX_MARGIN_LOWER - TICK_HEIGHT;
  ret.push(genSideTick(config, [lifelineBaseX, y], "State"));

  let prevX = lifelineBaseX;
  ticks.forEach((t, i) => {
    const x = lifelineBaseX + i * config.tickWidth;
    if (
      i !== 0 &&
      t[lifelineName].state_idx !== ticks[i - 1][lifelineName].state_idx
    ) {
      ret.push(
        text(
          [prevX + (x - prevX) / 2, y + 5],
          "simple",
          states[ticks[i - 1][lifelineName].state_idx],
          config.scale,
          "middle"
        )
      );
      prevX = x;
    } else if (i === ticks.length - 1) {
      ret.push(
        text(
          [prevX + (x - prevX) / 2, y + 5],
          "simple",
          states[t[lifelineName].state_idx],
          config.scale,
          "middle"
        )
      );
    }
  });

  const cParams = {
    config,
    ticks,
    lifelineName,
    lifelineBaseX,
    yCoord: yCoord + height,
  };
  const topLine = genTimelineCoordsSimple({ ...cParams, side: "top" });
  const bottomLine = genTimelineCoordsSimple({ ...cParams, side: "bottom" });
  ret.push(
    polyline(topLine.flat(), config.scale, TIMELINE_STROKE_WIDTH),
    polyline(bottomLine.flat(), config.scale, TIMELINE_STROKE_WIDTH)
  );

  return [ret.join(""), height];
}

function genNormalLifeline(input: {
  config: DiagramConfig;
  color: boolean;
  lifelineBaseX: number;
  yCoord: number;
  lifelineName: string;
  states: string[];
  ticks: ProcessedTick[];
}): [string, number] {
  const { config, color, lifelineBaseX, yCoord, lifelineName, states, ticks } =
    input;
  const height = (states.length - 1) * TICK_HEIGHT + LIFELINE_BOX_MARGIN;
  const ret = [];
  ret.push(
    genLifelineBox({
      config,
      ticks,
      lifelineBaseX,
      lifelineName,
      yCoord,
      height,
    })
  );

  states.forEach((state, i) => {
    const y = yCoord + height - LIFELINE_BOX_MARGIN_LOWER - i * TICK_HEIGHT;
    if (color) {
      ret.push(genSideTick(config, [lifelineBaseX, y], state, COLORS[i]));
    } else {
      ret.push(genSideTick(config, [lifelineBaseX, y], state));
    }
  });

  // Shading
  if (color) {
    ret.push(
      genLifelineShading({
        config,
        ticks,
        lifelineName,
        lifelineBaseX,
        height,
        yCoord: yCoord + height,
      })
    );
  } else {
    // Timeline
    ret.push(
      polyline(
        genTimelineCoordsNormal({
          config,
          ticks,
          lifelineName,
          lifelineBaseX,
          yCoord: yCoord + height,
        }).flat(),
        config.scale,
        TIMELINE_STROKE_WIDTH
      )
    );
  }

  return [ret.join(""), height];
}

function genLifelineShading(input: {
  config: DiagramConfig;
  ticks: ProcessedTick[];
  lifelineName: string;
  lifelineBaseX: number;
  height: number;
  yCoord: number;
}): string {
  const { config, lifelineName, lifelineBaseX, height, yCoord } = input;
  const ticks = input.ticks.map((t) => t[lifelineName]);
  const colors: string[] = [];
  const lines: string[] = [];
  const bottomY = yCoord - LIFELINE_BOX_MARGIN_LOWER;
  const topY = yCoord - height;

  let state = ticks[0].state_idx;
  let prevX = lifelineBaseX;

  ticks.forEach((tick, i) => {
    if (i > 0 && tick.significant) {
      const currY = yCoord - LIFELINE_BOX_MARGIN_LOWER - state * TICK_HEIGHT;
      const currX = lifelineBaseX + i * config.tickWidth;
      const topLeft: Coord = [prevX, currY];
      const topRight: Coord = [currX, currY];
      const bottomLeft: Coord = [prevX, bottomY];
      const bottomRight: Coord = [currX, bottomY];

      colors.push(
        polygon(
          [topLeft, topRight, bottomRight, bottomLeft],
          COLORS[state],
          config.scale
        )
      );
      lines.push(
        polyline([topLeft, topRight], config.scale, TIMELINE_STROKE_WIDTH)
      );
      lines.push(dashedLine([currX, bottomY], [currX, topY], config.scale));
      state = tick.state_idx;
      prevX = lifelineBaseX + i * config.tickWidth;
    }
  });

  return colors.join("") + lines.join("");
}

function genSideTick(
  config: DiagramConfig,
  [x, y]: Coord,
  label: string,
  color?: string
): string {
  const ret = [];
  ret.push(line([x - 20, y], [x - 5, y], config.scale));
  if (color !== undefined) {
    const colorSquareSize = 7;
    const topRight: Coord = [x - 25, y - colorSquareSize];
    const topLeft: Coord = [x - 25 - colorSquareSize * 2, y - colorSquareSize];
    const bottomLeft: Coord = [
      x - 25 - colorSquareSize * 2,
      y + colorSquareSize,
    ];
    const bottomRight: Coord = [x - 25, y + colorSquareSize];
    ret.push(
      polygon(
        [topLeft, topRight, bottomRight, bottomLeft],
        color,
        config.scale,
        "black"
      )
    );
    ret.push(
      text(
        [x - 25 - colorSquareSize * 2 - 10, y + 5],
        "simple",
        label,
        config.scale,
        "end"
      )
    );
  } else {
    ret.push(text([x - 25, y + 5], "simple", label, config.scale, "end"));
  }
  return ret.join("");
}

function genLegends(
  config: DiagramConfig,
  ticks: ProcessedTick[],
  yCoord: number,
  lifelineBaseX: number,
  lifelineName: string
): string {
  const ret = [];
  for (let i = 0; i < ticks.length; i++) {
    if (
      (config.legendMode === "freq" && i % config.tickFreq === 0) ||
      (config.legendMode === "significant" &&
        ticks[i][lifelineName].significant)
    ) {
      ret.push(
        text(
          [i * config.tickWidth + lifelineBaseX, yCoord],
          "simple",
          i.toString(),
          config.scale,
          "middle"
        )
      );
      ret.push(
        line(
          [i * config.tickWidth + lifelineBaseX, yCoord - 30],
          [i * config.tickWidth + lifelineBaseX, yCoord - 15],
          config.scale
        )
      );
    }
  }

  return ret.join("");
}

function genTimelineCoordsNormal(input: {
  config: DiagramConfig;
  ticks: ProcessedTick[];
  lifelineName: string;
  lifelineBaseX: number;
  yCoord: number;
}): Coord[][] {
  const { config, ticks, lifelineName, lifelineBaseX, yCoord } = input;
  return ticks.reduce((acc, curr, i, arr) => {
    const pointsForThisTick: Coord[] = [];
    if (
      i > 0 &&
      curr[lifelineName].state_idx !== arr[i - 1][lifelineName].state_idx
    ) {
      pointsForThisTick.push([
        lifelineBaseX + i * config.tickWidth,
        yCoord -
          LIFELINE_BOX_MARGIN_LOWER -
          arr[i - 1][lifelineName].state_idx * TICK_HEIGHT,
      ]);
    }
    pointsForThisTick.push([
      lifelineBaseX + i * config.tickWidth,
      yCoord -
        LIFELINE_BOX_MARGIN_LOWER -
        curr[lifelineName].state_idx * TICK_HEIGHT,
    ]);
    acc.push(pointsForThisTick);
    return acc;
  }, [] as Coord[][]);
}

function genTimelineCoordsSimple(input: {
  config: DiagramConfig;
  ticks: ProcessedTick[];
  lifelineName: string;
  lifelineBaseX: number;
  yCoord: number;
  side: "top" | "bottom";
}): Coord[][] {
  const { config, ticks, lifelineName, lifelineBaseX, yCoord, side } = input;
  const yMultiplier = side === "top" ? 1.5 : 0.5;
  const yCenter = yCoord - LIFELINE_BOX_MARGIN_LOWER - TICK_HEIGHT;
  const yNorm = yCoord - LIFELINE_BOX_MARGIN_LOWER - TICK_HEIGHT * yMultiplier;
  return ticks.reduce(
    (acc, curr, i, arr) => {
      const pointsForThisTick: Coord[] = [];
      if (
        i !== 0 &&
        curr[lifelineName].state_idx !== arr[i - 1][lifelineName].state_idx
      ) {
        pointsForThisTick.push([
          lifelineBaseX + i * config.tickWidth - SIMPLE_STATECHANGE_WIDTH / 3,
          yNorm,
        ]);
        pointsForThisTick.push([lifelineBaseX + i * config.tickWidth, yCenter]);
        pointsForThisTick.push([
          lifelineBaseX + i * config.tickWidth + SIMPLE_STATECHANGE_WIDTH / 3,
          yNorm,
        ]);
      }

      if (i === arr.length - 1) {
        pointsForThisTick.push([lifelineBaseX + i * config.tickWidth, yNorm]);
      }
      acc.push(pointsForThisTick);
      return acc;
    },
    [[[lifelineBaseX, yNorm]]]
  );
}

function getSimpleTimelineAttachmentPoints(input: {
  config: DiagramConfig;
  ticks: ProcessedTick[];
  lifelineName: string;
  lifelineBaseX: number;
  yCoord: number;
}): Coord[][] {
  const { config, ticks, lifelineName, lifelineBaseX, yCoord } = input;
  const yCenter = yCoord - LIFELINE_BOX_MARGIN_LOWER - TICK_HEIGHT;
  return ticks.reduce((acc, curr, i, arr) => {
    const pointsForThisTick: Coord[] = [];
    if (
      i !== 0 &&
      curr[lifelineName].state_idx !== arr[i - 1][lifelineName].state_idx
    ) {
      pointsForThisTick.push([lifelineBaseX + i * config.tickWidth, yCenter]);
    } else {
      pointsForThisTick.push([
        lifelineBaseX + i * config.tickWidth,
        yCenter + TICK_HEIGHT / 2,
      ]);
      pointsForThisTick.push([
        lifelineBaseX + i * config.tickWidth,
        yCenter - TICK_HEIGHT / 2,
      ]);
    }

    acc.push(pointsForThisTick);
    return acc;
  }, [] as Coord[][]);
}
