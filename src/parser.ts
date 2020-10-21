export type Tick = {
  time: number;
  lifeline: string;
  state_idx: number;
};

export type Diagram = {
  title: string;
  lifelines: Set<string>;
  states: { [key: string]: string[] };
  ticks: Tick[];
};

export type Template = {
  regex: RegExp;
  fn: (d: Diagram, ...m: string[]) => void;
};

const TEMPLATES: { [key: string]: Template } = {
  title: {
    regex: /title "(.*)"$/,
    fn: (d, m) => {
      d.title = m;
    },
  },
  lifeline: {
    regex: /lifeline "(.*)"$/,
    fn: (d, m) => {
      d.lifelines.add(m);
    },
  },
  state: {
    regex: /state "(.*)" "(.*)" (\d+)/,
    fn: (d, m1, m2, m3) => {
      if (d.states[m1] === undefined) {
        d.states[m1] = [];
      }
      d.states[m1][Number(m3)] = m2;
    },
  },
  tick: {
    regex: /T(\d+) "(.*)" (\d+)/,
    fn: (d, m1, m2, m3) => {
      d.ticks.push({
        time: Number(m1),
        lifeline: m2,
        state_idx: Number(m3),
      });
    },
  },
};

export function parse(input: string): Diagram {
  const ret: Diagram = {
    title: "Untitled Diagram",
    lifelines: new Set<string>(),
    states: {},
    ticks: [],
  };

  input.split(/\r?\n/g).forEach((line) => {
    Object.values(TEMPLATES).forEach((template) => {
      const matches = template.regex.exec(line);
      if (matches !== null) {
        template.fn(ret, ...matches.slice(1));
      }
    });
  });

  return ret;
}
