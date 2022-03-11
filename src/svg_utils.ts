export type Coord = [number, number];

export function scaleCoord(c: Coord, scale: number): Coord {
  return [c[0] * scale, c[1] * scale];
}

export function genSVGHeader(
  [width, height]: Coord,
  [labelWidth, labelHeight]: Coord,
  scale: number
): string {
  const borderWidth = 2;
  const labelBoxEdgeSize = 20;
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${
    height * scale
  }" viewBox="0 0 ${width * scale} ${height * scale}">
<style>
  .title { font: bold ${20 * scale}px sans-serif }
  .lifeline-label { font: bold ${17 * scale}px sans-serif }
  .simple { font-family: sans-serif }
  .sw1 { stroke-width: ${Math.floor(scale)} }
  text { white-space: pre; font: ${12 * scale}px sans-serif }
</style>
<defs>
  <marker id="arrow" viewBox="0 0 20 20" refX="20" refY="10"
      markerWidth="12" markerHeight="12"
      orient="auto-start-reverse">
    <path d="M 0 0 L 20 10 L 0 20 z" />
  </marker>
</defs>
<rect width="${width * scale}" height="${height * scale}" fill="white" />
${polyline(
  [
    [width, 0],
    [width, height],
    [0, height],
    [0, 0],
    [width, 0],
  ].map((ee) =>
    ee.map((e) => (e === 0 ? borderWidth : e - borderWidth))
  ) as Coord[],
  scale,
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

export function generateSpan(
  length: number,
  [x, y]: Coord,
  label: string,
  scale: number
): string {
  const ret = [];
  const sideHeight = 7;
  ret.push(doubleSidedArrow([x, y], [x + length, y], scale));
  ret.push(line([x, y - sideHeight], [x, y + sideHeight], scale));
  ret.push(
    line([x + length, y - sideHeight], [x + length, y + sideHeight], scale)
  );
  ret.push(text([x + length / 2, y - 10], "simple", label, scale, "middle"));
  return ret.join("");
}

export function arrow(from: Coord, to: Coord, scale: number): string {
  return `<polyline points="${from[0] * scale},${from[1] * scale} ${
    to[0] * scale
  },${
    to[1] * scale
  }" fill="none" stroke="black" class="sw1" marker-end="url(#arrow)" />`;
}

export function dashedArrow(from: Coord, to: Coord, scale: number): string {
  return `<polyline points="${from[0] * scale},${from[1] * scale} ${
    to[0] * scale
  },${to[1] * scale}" fill="none" stroke="black" stroke-dasharray="${
    10 * scale
  }" class="sw1" marker-end="url(#arrow)" />`;
}

export function dashedLine(from: Coord, to: Coord, scale: number): string {
  return `<polyline points="${from[0] * scale},${from[1] * scale} ${
    to[0] * scale
  },${to[1] * scale}" fill="none" stroke="black" stroke-dasharray="${
    10 * scale
  }" class="sw1" />`;
}

function doubleSidedArrow(from: Coord, to: Coord, scale: number): string {
  return `<polyline points="${from[0] * scale},${from[1] * scale} ${
    to[0] * scale
  },${
    to[1] * scale
  }" fill="none" stroke="black" class="sw1" marker-start="url(#arrow)" marker-end="url(#arrow)" />`;
}

export function text(
  [x, y]: Coord,
  className: string,
  text: string,
  scale: number,
  anchor?: "start" | "end" | "middle"
): string {
  return `<text ${anchor ? `text-anchor="${anchor}"` : ""} x="${
    x * scale
  }" y="${y * scale}" class="${className}">${text}</text>`;
}

export function polyline(
  points: Coord[],
  scale: number,
  strokeWidth?: number
): string {
  return `<polyline points="${points
    .map(([x, y]) => `${x * scale},${y * scale}`)
    .join(" ")}" fill="none" stroke="black" style="stroke-width:${
    (strokeWidth ?? 1) * scale
  }px"/>`;
}

export function polygon(
  points: Coord[],
  fill: string,
  scale: number,
  stroke?: string
): string {
  return `<polygon points="${points
    .map((p) => `${p[0] * scale},${p[1] * scale}`)
    .join(" ")}" fill="${fill}" stroke="${stroke ?? "none"}" class="sw1" />`;
}

export function line([x1, y1]: Coord, [x2, y2]: Coord, scale: number): string {
  return `<line x1="${x1 * scale}" y1="${y1 * scale}" x2="${x2 * scale}" y2="${
    y2 * scale
  }" stroke="black" class="sw1" />`;
}

export function rect(
  [x, y]: Coord,
  [w, h]: Coord,
  scale: number,
  fill?: string
): string {
  return `<rect x="${x * scale}" y="${y * scale}" width="${
    w * scale
  }" height="${h * scale}" stroke="black" fill="${
    fill ?? "none"
  }" class="sw1" />`;
}

export function lerp([x1, y1]: Coord, [x2, y2]: Coord, percent: number): Coord {
  const absXDiff = Math.abs(x2 - x1);
  const absYDiff = Math.abs(y2 - y1);

  return [
    x1 + absXDiff * Math.sign(x2 - x1) * percent,
    y1 + absYDiff * Math.sign(y2 - y1) * percent,
  ];
}
