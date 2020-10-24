export type Tick = {
  time: number;
  lifeline: string;
  state_idx: number;
};

export type Arrow = {
  originLifeline: string;
  originTick: number;
  destLifeline: string;
  destTick: number;
  originIdx: number;
  destIdx: number;
};

export type Diagram = {
  title: string;
  lifelines: Set<string>;
  states: { [key: string]: string[] };
  ticks: Tick[];
  arrows: Arrow[];
};

export type Template = {
  regex: RegExp;
  fn: (d: Diagram, ...m: string[]) => void;
};

function stringSanitize(s: string): string {
  return s
    .replace("&", "&amp;")
    .replace('\\"', "&quot;")
    .replace("'", "&apos;")
    .replace(">", "&gt;")
    .replace("<", "&lt;");
}

const TEMPLATES: { [key: string]: Template } = {
  title: {
    regex: /^title "(.*)"$/,
    fn: (d, m) => {
      d.title = stringSanitize(m);
    },
  },
  lifeline: {
    regex: /^lifeline "(.*)"$/,
    fn: (d, m) => {
      d.lifelines.add(stringSanitize(m));
    },
  },
  state: {
    regex: /^state "(.*)" "(.*)" (\d+)$/,
    fn: (d, m1, m2, m3) => {
      const lifelineName = stringSanitize(m1);
      const stateName = stringSanitize(m2);
      if (d.states[lifelineName] === undefined) {
        d.states[lifelineName] = [];
      }
      d.states[lifelineName][Number(m3)] = stateName;
    },
  },
  tick: {
    regex: /^T(\d+) "(.*)" (\d+)$/,
    fn: (d, m1, m2, m3) => {
      d.ticks.push({
        time: Number(m1),
        lifeline: stringSanitize(m2),
        state_idx: Number(m3),
      });
    },
  },
  arrow: {
    regex: /^T(\d+):"(.*)" -> T(\d+):"(.*)"$/,
    fn: (d, m1, m2, m3, m4) => {
      d.arrows.push({
        originLifeline: stringSanitize(m2),
        originTick: Number(m1),
        destLifeline: stringSanitize(m4),
        destTick: Number(m3),
        originIdx: 0,
        destIdx: 0,
      });
    },
  },
  advancedArrow: {
    regex: /^T(\d+):"(.*)":(\d) -> T(\d+):"(.*)":(\d)$/,
    fn: (d, m1, m2, m3, m4, m5, m6) => {
      d.arrows.push({
        originLifeline: stringSanitize(m2),
        originTick: Number(m1),
        destLifeline: stringSanitize(m5),
        destTick: Number(m4),
        originIdx: Number(m3),
        destIdx: Number(m6),
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
    arrows: [],
  };

  input.split(/\r?\n/g).forEach((line) => {
    // Ignore commented lines
    if (line.startsWith("#")) return;

    Object.values(TEMPLATES).forEach((template) => {
      const matches = template.regex.exec(line);
      if (matches !== null) {
        template.fn(ret, ...matches.slice(1));
      }
    });
  });

  return ret;
}
