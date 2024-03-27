import { promises as fs } from "fs";
import path from "path";

let baseDir = path.dirname(import.meta.dirname);

await fs.rm(path.join(baseDir, "components"), { recursive: true, force: true });
await fs.rm(path.join(baseDir, "index.js"), { force: true });
await fs.rm(path.join(baseDir, "index.d.ts"), { force: true });
