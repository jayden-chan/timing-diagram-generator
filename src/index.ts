import { promisify } from "util";
import { readFile } from "fs";
import { parse } from "./parser";
import { infillTicks } from "./diagram";
import { render } from "./svg";

const read = promisify(readFile);

async function main(): Promise<number> {
  if (process.argv.length < 3) {
    console.error("You must specify an input file.");
    return 1;
  }

  const file = await read(process.argv[2], { encoding: "utf8" });
  const d = parse(file);
  console.error(d);

  const processed = infillTicks(d);
  console.error(processed);

  const svg = render(processed);
  console.log(svg);

  return 0;
}

(async () => {
  const exitCode = await main();
  process.exit(exitCode);
})();
