import { ProcessedDiagram, ProcessedTick } from "./diagram";
const LIFELINE_BASE_X = 400;
const BORDER_WIDTH = 2;

export function render(d: ProcessedDiagram): string {
  const width = (d.ticks.length - 1) * 50 + LIFELINE_BASE_X + 30;
  const labelBoxHeight = 45;
  const labelBoxWidth = 300;
  const svg = [];

  svg.push(`<text x="10" y="28" class="title">${d.title}</text>`);

  const heights: { [key: string]: number } = {};
  let currHeight = 70;
  [...d.lifelines].forEach((l) => {
    const [boxSvg, height] = genLifelineBox(
      d.ticks.length,
      d.states[l].length,
      currHeight,
      l,
      d.states[l],
      d.ticks
    );
    currHeight += height + 30;
    heights[l] = currHeight - 45;
    svg.push(boxSvg);
  });

  d.arrows.forEach((a) => {
    const originPoints = getStateLineCoords(
      d.ticks,
      a.originLifeline,
      heights[a.originLifeline]
    );
    const destPoints = getStateLineCoords(
      d.ticks,
      a.destLifeline,
      heights[a.destLifeline]
    );
    svg.push(
      arrow(
        originPoints[a.originTick][a.originIdx],
        destPoints[a.destTick][a.destIdx]
      )
    );
  });

  svg.push(drawLegends(d.ticks.length, currHeight - 20));
  svg.push("</svg>");

  const height = currHeight;
  let header = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<style>
  .title { font: bold 20px sans-serif }
  .state-label { font-family: sans-serif }
  .lifeline-label { font: bold 17px sans-serif }
  .legend { font-family: sans-serif }
</style>
<defs>
  <!-- arrowhead marker definition -->
  <marker id="arrow" viewBox="0 0 15 15" refX="7.5" refY="7.5"
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
  yCoord: number,
  lifelineName: string,
  states: string[],
  ticks: ProcessedTick[]
): [string, number] {
  const height = (numStates - 1) * 50 + 25;
  const ret = [];
  // outer box
  // point order BL->TL->TR->BR->BL
  ret.push(
    `<polyline points="${LIFELINE_BASE_X - 10},${yCoord + height} ${
      LIFELINE_BASE_X - 10
    },${yCoord - 5} ${(numTicks - 1) * 50 + LIFELINE_BASE_X + 10},${
      yCoord - 5
    } ${(numTicks - 1) * 50 + LIFELINE_BASE_X + 10},${yCoord + height} ${
      LIFELINE_BASE_X - 10
    },${yCoord + height}" fill="none" stroke="black" />`
  );

  ret.push(
    `<text class="lifeline-label" x="20" y="${
      yCoord + height / 2
    }">: ${lifelineName}</text>`
  );

  for (let i = 0; i < numTicks; i++) {
    ret.push(
      `<line x1="${i * 50 + LIFELINE_BASE_X}" y1="${yCoord + height - 5}" x2="${
        i * 50 + LIFELINE_BASE_X
      }" y2="${yCoord + height + 10}" stroke="black" />`
    );
  }

  for (let i = 0; i < numStates; i++) {
    ret.push(
      `<line x1="${LIFELINE_BASE_X - 20}" y1="${
        yCoord + height - 10 - i * 50
      }" x2="${LIFELINE_BASE_X}" y2="${
        yCoord + height - 10 - i * 50
      }" stroke="black" />`
    );
  }

  states.forEach((state, i) => {
    ret.push(
      `<text text-anchor="end" class="state-label" x="${
        LIFELINE_BASE_X - 25
      }" y="${yCoord + height - 5 - i * 50}">${state}</text>`
    );
  });

  ret.push(
    `<polyline points="${getStateLineCoords(
      ticks,
      lifelineName,
      yCoord + height
    )
      .flat()
      .map(([x, y]) => `${x},${y}`)
      .join(" ")}" fill="none" stroke="black" style="stroke-width:2px"/>`
  );

  return [ret.join(""), height + 15];
}

function drawLegends(numTicks: number, yCoord: number): string {
  const ret = [];
  for (let i = 0; i < numTicks; i++) {
    ret.push(
      `<text text-anchor="middle" x="${
        i * 50 + LIFELINE_BASE_X
      }" y="${yCoord}" class="legend">${i}</text>`
    );
  }

  return ret.join("");
}

/*
 * [[x, y], [x, y]]
 * [[x, y], [x, y]]
 * [[x, y], [x, y]]
 * [[x, y], [x, y]]
 *
 * */

function getStateLineCoords(
  ticks: ProcessedTick[],
  lifelineName: string,
  yCoord: number
): [number, number][][] {
  return ticks.reduce((acc, curr, i, arr) => {
    const pointsForThisTick: [number, number][] = [];
    if (i > 0 && curr[lifelineName] !== arr[i - 1][lifelineName]) {
      pointsForThisTick.push([
        LIFELINE_BASE_X + i * 50,
        yCoord - 10 - arr[i - 1][lifelineName] * 50,
      ]);
    }
    pointsForThisTick.push([
      LIFELINE_BASE_X + i * 50,
      yCoord - 10 - curr[lifelineName] * 50,
    ]);
    acc.push(pointsForThisTick);
    return acc;
  }, [] as [number, number][][]);
}

function arrow(from: [number, number], to: [number, number]) {
  return `<polyline points="${from[0]},${from[1]} ${to[0]},${to[1]}" fill="none" stroke="black" marker-end="url(#arrow)" />`;
}
