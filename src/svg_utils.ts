export function generateSpan(
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

export function arrow(from: [number, number], to: [number, number]): string {
  return `<polyline points="${from[0]},${from[1]} ${to[0]},${to[1]}" fill="none" stroke="black" marker-end="url(#arrow)" />`;
}

export function dashedArrow(
  from: [number, number],
  to: [number, number]
): string {
  return `<polyline points="${from[0]},${from[1]} ${to[0]},${to[1]}" fill="none" stroke="black" stroke-dasharray="10" marker-end="url(#arrow)" />`;
}

export function text(
  [x, y]: [number, number],
  className: string,
  text: string,
  anchor?: "start" | "end" | "middle"
): string {
  return `<text ${
    anchor ? `text-anchor="${anchor}"` : ""
  } x="${x}" y="${y}" class="${className}">${text}</text>`;
}

export function polyline(
  points: [number, number][],
  strokeWidth?: number
): string {
  return `<polyline points="${points
    .map(([x, y]) => `${x},${y}`)
    .join(" ")}" fill="none" stroke="black" style="stroke-width:${
    strokeWidth ?? 1
  }px"/>`;
}

export function line(
  [x1, y1]: [number, number],
  [x2, y2]: [number, number]
): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" />`;
}

export function rect(
  [x, y]: [number, number],
  [w, h]: [number, number],
  fill?: string
): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" stroke="black" fill="${
    fill ?? "none"
  }" />`;
}

export function lerp(
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

function doubleSidedArrow(
  from: [number, number],
  to: [number, number]
): string {
  return `<polyline points="${from[0]},${from[1]} ${to[0]},${to[1]}" fill="none" stroke="black" marker-start="url(#arrow)" marker-end="url(#arrow)" />`;
}
