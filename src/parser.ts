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

export type States = Record<string, string[]>;

export type Span = {
  originTick: number;
  destTick: number;
  lifeline: string;
  label: string;
};

export type DiagramConfig = {
  tickWidth: number;
  tickFreq: number;
  legendMode: "freq" | "significant";
};

export type Diagram = {
  title: string;
  config: DiagramConfig;
  lifelines: Record<
    string,
    {
      style: "simplified" | "normal";
      color: boolean;
    }
  >;
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

const META_CONFIG: Record<
  string,
  {
    key: keyof DiagramConfig;
    parseFn: (val: string) => number | string;
  }
> = {
  TICK_WIDTH: { key: "tickWidth", parseFn: (val) => Number(val) },
  LEGEND_FREQUENCY: { key: "tickFreq", parseFn: (val) => Number(val) },
  LEGEND_MODE: {
    key: "legendMode",
    parseFn: (val) => {
      if (val === "freq" || val === "significant") {
        return val;
      } else {
        throw new Error(`Invalid value for config LEGEND_MODE: ${val}`);
      }
    },
  },
};

const TEMPLATES: Record<string, Template> = {
  config: {
    regex: /^config\s+([A-Z_]+)\s+(.*?)(?:\s*#.*)?$/,
    fn: (d, key, val) => {
      if (Object.keys(META_CONFIG).includes(key)) {
        if (val !== "default") {
          const metaConfig = META_CONFIG[key];
          // @ts-ignore -- type is satisifed through META_CONFIG
          d.config[metaConfig.key] = metaConfig.parseFn(val);
        }
      } else {
        throw new Error(`Invalid config key "${key}" found`);
      }
    },
  },
  title: {
    regex: /^title\s+"((?:[^"\\]|\\.)*)"(?:\s*#.*)?$/,
    fn: (d, m) => {
      d.title = stringSanitize(m);
    },
  },
  lifeline: {
    regex: /^lifeline\s+"((?:[^"\\]|\\.)*)"(?:\s*#.*)?$/,
    fn: (d, m) => {
      d.lifelines[stringSanitize(m)] = {
        style: "normal",
        color: false,
      };
    },
  },
  style: {
    regex: /^style\s+"((?:[^"\\]|\\.)*)"\s+(Simplified|Normal)(?:\s*#.*)?$/,
    fn: (d, m1, m2) => {
      // @ts-ignore -- type is satisifed through the regex
      d.lifelines[stringSanitize(m1)].style = m2.toLowerCase();
    },
  },
  color: {
    regex: /^style\s+"((?:[^"\\]|\\.)*)"\s+(?:color)(?:\s*#.*)?$/,
    fn: (d, m1) => {
      d.lifelines[stringSanitize(m1)].color = true;
    },
  },
  state: {
    regex:
      /^state\s+"((?:[^"\\]|\\.)*)"\s+"((?:[^"\\]|\\.)*)"\s+(\d+)(?:\s*#.*)?$/,
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
    regex:
      /^T(\d+)\s+"((?:[^"\\]|\\.)*)"\s+(?:(\d+)|"((?:[^"\\]|\\.)*)")(?:\s*#.*)?$/,
    fn: (d, ...m) => {
      const [m1, m2, m3] = m.filter((match) => match !== undefined);
      const lifeline = stringSanitize(m2);
      const state_idx = /\d+/.test(m3)
        ? Number(m3)
        : d.states[lifeline].indexOf(m3);

      if (state_idx < 0) {
        throw new Error(`Invalid state index "${state_idx}" detected`);
      }

      d.ticks.push({ time: Number(m1), lifeline, state_idx });
    },
  },
  span: {
    regex:
      /^span\s+"((?:[^"\\]|\\.)*)"\s+T(\d+):T(\d+)\s+"((?:[^"\\]|\\.)*)"(?:\s*#.*)?$/,
    fn: (d, m1, m2, m3, m4) => {
      d.spans.push({
        originTick: Number(m2),
        destTick: Number(m3),
        lifeline: stringSanitize(m1),
        label: stringSanitize(m4),
      });
    },
  },
  arrow: {
    regex:
      /^T(\d+):"((?:[^"\\]|\\.)*)"(?::(\d))?\s+(->|=>)\s+T(\d+):"((?:[^"\\]|\\.)*)"(?::(\d))?(?:\s+"((?:[^"\\]|\\.)*)"(?::(-?\d+))?)?(?::(R|L))?(?:\s*#.*)?$/,
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
    config: {
      tickWidth: 50,
      tickFreq: 1,
      legendMode: "freq",
    },
    lifelines: {},
    states: {},
    ticks: [],
    spans: [],
    arrows: [],
  };

  input.split(/\r?\n/g).forEach((line, i) => {
    // Ignore commented lines
    if (line.startsWith("#")) return;

    try {
      Object.values(TEMPLATES).forEach((template) => {
        const matches = template.regex.exec(line);
        if (matches !== null) {
          template.fn(ret, ...matches.slice(1));
        }
      });
    } catch (e) {
      console.error(`Error detected on line ${i}:`);
      throw e;
    }
  });

  return ret;
}
