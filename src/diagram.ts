import { Diagram } from "./parser";

export type ProcessedTick = Record<
  string,
  {
    state_idx: number;
    significant: boolean;
  }
>;

export type ProcessedDiagram = Omit<Diagram, "ticks"> & {
  ticks: ProcessedTick[];
};

export function interpolateTicks(d: Diagram): ProcessedTick[] {
  const tMax = Math.max(...d.ticks.map((t) => t.time));

  const prevStates = Object.keys(d.states).reduce((acc, curr) => {
    acc[curr] = { state_idx: 0, significant: false };
    return acc;
  }, {} as ProcessedTick);

  const newTicks = [];
  for (let i = 0; i <= tMax; i++) {
    const ticksForCurrentT = d.ticks.filter((t) => t.time === i);
    const missingLifelines = Object.keys(prevStates).filter(
      (d) => !ticksForCurrentT.some((t) => t.lifeline === d)
    );

    const newTick: ProcessedTick = ticksForCurrentT.reduce((acc, curr) => {
      acc[curr.lifeline] = { state_idx: curr.state_idx, significant: true };
      return acc;
    }, {} as ProcessedTick);

    missingLifelines.forEach((l) => {
      newTick[l] = { ...prevStates[l], significant: false };
    });

    Object.entries(newTick).forEach(([l, v]) => {
      prevStates[l] = v;
    });

    newTicks.push(newTick);
  }

  return newTicks;
}
