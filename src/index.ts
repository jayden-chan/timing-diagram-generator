import { promisify } from "util";
import { readFile } from "fs";
import { parse } from "./parser";
import { infillTicks } from "./diagram";
import { render } from "./svg";

async function main(): Promise<number> {
  if (process.argv.length < 3) {
    console.error("You must specify an input file.");
    return 1;
  }

  let file;
  try {
    file = await promisify(readFile)(process.argv[2], { encoding: "utf8" });
  } catch (e) {
    console.error(`ERROR: Failed to read input file: ${e.message}`);
    return -1;
  }
  const d = parse(file);
  process.argv.includes("--debug") && console.error(d);

  const processed = infillTicks(d);
  process.argv.includes("--debug") && console.error(processed);

  const svg = render(processed);
  console.log(svg);

  return 0;
}

(async () => {
  const exitCode = await main();
  process.exit(exitCode);
})();
