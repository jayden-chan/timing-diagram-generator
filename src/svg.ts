import { ProcessedDiagram, ProcessedTick } from "./diagram";
const LIFELINE_BASE_X = 400;

export function render(d: ProcessedDiagram): string {
  const width = (d.ticks.length - 1) * 50 + LIFELINE_BASE_X + 30;
  const labelBoxHeight = 45;
  const labelBoxWidth = 300;
  const svg = [];

  svg.push(`<text x="10" y="30" class="title">${d.title}</text>`);

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
    svg.push(boxSvg);
  });
  svg.push("</svg>");

  const height = currHeight;
  let header = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<style>
  .title { font: bold 20px sans-serif }
  .state-label { font-family: sans-serif }
  .lifeline-label { font: bold 17px sans-serif }
</style>
<polyline points="${width - 3},0 ${width - 3},${height - 3} 0,${
    height - 3
  }" stroke="black" fill="none" style="stroke-width:3px" />
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
      }" y2="${yCoord + height + 15}" stroke="black" />`
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
    `<polyline points="${LIFELINE_BASE_X},${yCoord + height - 10}${ticks.reduce(
      (acc, curr, i, arr) => {
        acc += ` ${LIFELINE_BASE_X + i * 50},${
          yCoord + height - 10 - curr[lifelineName] * 50
        }`;
        if (
          i < arr.length - 1 &&
          curr[lifelineName] !== arr[i + 1][lifelineName]
        ) {
          acc += ` ${LIFELINE_BASE_X + (i + 1) * 50},${
            yCoord + height - 10 - curr[lifelineName] * 50
          }`;
        }
        return acc;
      },
      ""
    )}" fill="none" stroke="black" style="stroke-width:3px"/>`
  );

  return [ret.join(""), height + 15];
}
