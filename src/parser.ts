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

export type LifelineStyle = "simplified" | "normal" | "slice";

export type Diagram = {
  title: string;
  config: DiagramConfig;
  lifelines: Record<
    string,
    {
      style: LifelineStyle;
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
      };
    },
  },
  style: {
    regex:
      /^style\s+"((?:[^"\\]|\\.)*)"\s+(Simplified|Normal|Slice)(?:\s*#.*)?$/,
    fn: (d, m1, m2) => {
      // @ts-ignore -- type is satisifed through the regex
      d.lifelines[stringSanitize(m1)].style = m2.toLowerCase();
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
      const state_idx = /^\d+$/.test(m3)
        ? Number(m3)
        : d.states[lifeline].indexOf(m3);

      if (state_idx < 0 || state_idx === null || Number.isNaN(state_idx)) {
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

  const lines = input
    .split(/\r?\n/g)
    .map((l, i) => [l.trim(), i + 1] as [string, number])
    .filter(([l]) => !l.startsWith("#"));

  const macros: Record<string, string> = {};
  const macroRegex = /^macro ([A-Za-z1-9_-]+) (.+?)(?:\s*#.*)?$/;

  lines.forEach(([line]) => {
    const matches = macroRegex.exec(line);
    if (matches !== null) {
      macros[matches[1]] = matches[2];
    }
  });

  const macroReplaceRegexes = Object.entries(macros).map(([key, val]) => [
    new RegExp("(\\s+|:|^)" + key + "(\\s+|:|$)", "g"),
    val,
  ]);

  const macroReplace = (line: string): string => {
    const matches = macroRegex.exec(line);
    if (matches !== null) {
      return "";
    }

    let ret = line;
    macroReplaceRegexes.forEach(
      ([regex, val]) => (ret = ret.replace(regex, `$1${val}$2`))
    );
    return ret;
  };

  const finalLines = lines
    .map(([l, i]) => [macroReplace(l), i] as [string, number])
    .filter(([l]) => l !== "");

  finalLines.forEach(([line, i]) => {
    try {
      let didMatch = false;
      Object.values(TEMPLATES).forEach((template) => {
        const matches = template.regex.exec(line);
        if (matches !== null) {
          template.fn(ret, ...matches.slice(1));
          didMatch = true;
        }
      });

      if (!didMatch) {
        console.error(`[WARN] [line ${i}]: failed to parse: ${line}`);
      }
    } catch (e) {
      console.error(`Error detected on line ${i}:`);
      throw e;
    }
  });

  return ret;
}
