export type Coord = [number, number];

export function genSVGHeader(
  [width, height]: Coord,
  [labelWidth, labelHeight]: Coord
): string {
  const borderWidth = 2;
  const labelBoxEdgeSize = 20;
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<style>
  .title { font: bold 20px sans-serif }
  .lifeline-label { font: bold 17px sans-serif }
  .simple { font-family: sans-serif }
  text { white-space: pre }
</style>
<defs>
  <marker id="arrow" viewBox="0 0 20 20" refX="20" refY="10"
      markerWidth="12" markerHeight="12"
      orient="auto-start-reverse">
    <path d="M 0 0 L 20 10 L 0 20 z" />
  </marker>
</defs>
<rect width="${width}" height="${height}" fill="white" />
${polyline(
  // @ts-ignore
  [
    [width, 0],
    [width, height],
    [0, height],
    [0, 0],
    [width, 0],
  ].map((ee) =>
    ee.map((e) => (e === 0 ? borderWidth / 2 : e - borderWidth / 2))
  ),
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
  label: string
): string {
  const ret = [];
  const sideHeight = 7;
  ret.push(doubleSidedArrow([x, y], [x + length, y]));
  ret.push(line([x, y - sideHeight], [x, y + sideHeight]));
  ret.push(line([x + length, y - sideHeight], [x + length, y + sideHeight]));
  ret.push(text([x + length / 2, y - 10], "simple", label, "middle"));
  return ret.join("");
}

export function arrow(from: Coord, to: Coord): string {
  return `<polyline points="${from[0]},${from[1]} ${to[0]},${to[1]}" fill="none" stroke="black" marker-end="url(#arrow)" />`;
}

export function dashedArrow(from: Coord, to: Coord): string {
  return `<polyline points="${from[0]},${from[1]} ${to[0]},${to[1]}" fill="none" stroke="black" stroke-dasharray="10" marker-end="url(#arrow)" />`;
}

function doubleSidedArrow(from: Coord, to: Coord): string {
  return `<polyline points="${from[0]},${from[1]} ${to[0]},${to[1]}" fill="none" stroke="black" marker-start="url(#arrow)" marker-end="url(#arrow)" />`;
}

export function text(
  [x, y]: Coord,
  className: string,
  text: string,
  anchor?: "start" | "end" | "middle"
): string {
  return `<text ${
    anchor ? `text-anchor="${anchor}"` : ""
  } x="${x}" y="${y}" class="${className}">${text}</text>`;
}

export function polyline(points: Coord[], strokeWidth?: number): string {
  return `<polyline points="${points
    .map(([x, y]) => `${x},${y}`)
    .join(" ")}" fill="none" stroke="black" style="stroke-width:${
    strokeWidth ?? 1
  }px"/>`;
}

export function polygon(points: Coord[], fill: string): string {
  return `<polygon points="${points
    .map((p) => `${p[0]},${p[1]}`)
    .join(" ")}" fill="${fill}" stroke="none" />`;
}

export function line([x1, y1]: Coord, [x2, y2]: Coord): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" />`;
}

export function rect([x, y]: Coord, [w, h]: Coord, fill?: string): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" stroke="black" fill="${
    fill ?? "none"
  }" />`;
}

export function lerp([x1, y1]: Coord, [x2, y2]: Coord, percent: number): Coord {
  const absXDiff = Math.abs(x2 - x1);
  const absYDiff = Math.abs(y2 - y1);

  return [
    x1 + absXDiff * Math.sign(x2 - x1) * percent,
    y1 + absYDiff * Math.sign(y2 - y1) * percent,
  ];
}
