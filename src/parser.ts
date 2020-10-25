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
  label?: string;
  labelPos: number;
  labelSide: "R" | "L";
  style: "solid" | "dashed";
};

export type States = {
  [key: string]: string[];
};

export type Span = {
  originTick: number;
  destTick: number;
  lifeline: string;
  label: string;
};

export type Diagram = {
  title: string;
  lifelines: {
    [key: string]: {
      style: "simplified" | "normal";
    };
  };
  spans: Span[];
  states: States;
  ticks: Tick[];
  arrows: Arrow[];
};

export type Template = {
  regex: RegExp;
  fn: (d: Diagram, ...m: string[]) => void;
};

function stringSanitize(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/\\"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/>/g, "&gt;")
    .replace(/</g, "&lt;");
}

const TEMPLATES: { [key: string]: Template } = {
  title: {
    regex: /^title "((?:[^"\\]|\\.)*)"$/,
    fn: (d, m) => {
      d.title = stringSanitize(m);
    },
  },
  lifeline: {
    regex: /^lifeline "((?:[^"\\]|\\.)*)"$/,
    fn: (d, m) => {
      d.lifelines[stringSanitize(m)] = {
        style: "normal",
      };
    },
  },
  state: {
    regex: /^state "((?:[^"\\]|\\.)*)" "((?:[^"\\]|\\.)*)" (\d+)$/,
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
    regex: /^T(\d+) "((?:[^"\\]|\\.)*)" (\d+)$/,
    fn: (d, m1, m2, m3) => {
      d.ticks.push({
        time: Number(m1),
        lifeline: stringSanitize(m2),
        state_idx: Number(m3),
      });
    },
  },
  span: {
    regex: /^span "((?:[^"\\]|\\.)*)" T(\d+):T(\d+) "((?:[^"\\]|\\.)*)"$/,
    fn: (d, m1, m2, m3, m4) => {
      d.spans.push({
        originTick: Number(m2),
        destTick: Number(m3),
        lifeline: stringSanitize(m1),
        label: stringSanitize(m4),
      });
    },
  },
  style: {
    regex: /^style "((?:[^"\\]|\\.)*)" (Simplified|Normal)$/,
    fn: (d, m1, m2) => {
      // @ts-ignore -- type is satisifed through the regex
      d.lifelines[stringSanitize(m1)].style = m2.toLowerCase();
    },
  },
  arrow: {
    regex: /^T(\d+):"((?:[^"\\]|\\.)*)"(?::(\d))? (->|=>) T(\d+):"((?:[^"\\]|\\.)*)"(?::(\d))?(?: "((?:[^"\\]|\\.)*)"(?::(-?\d+))?)?(?::(R|L))?$/,
    fn: (d, ...m) => {
      const label = m[7] ? stringSanitize(m[7]) : undefined;
      const labelPos = m[8] ? Number(m[8]) : 0;
      const labelSide = (m[9] && m[9] === "R") || m[9] === "L" ? m[9] : "R";
      d.arrows.push({
        originLifeline: stringSanitize(m[1]),
        originTick: Number(m[0]),
        destLifeline: stringSanitize(m[5]),
        destTick: Number(m[4]),
        originIdx: Number(m[2] ?? 0),
        destIdx: Number(m[6] ?? 0),
        label,
        labelPos,
        labelSide,
        style: m[3] === "->" ? "solid" : "dashed",
      });
    },
  },
};

export function parse(input: string): Diagram {
  const ret: Diagram = {
    title: "Untitled Diagram",
    lifelines: {},
    states: {},
    ticks: [],
    spans: [],
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
