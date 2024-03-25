import { buildBundle } from "./build/build-bundle.js";
import { buildComponents } from "./build/build-components.js";

await buildComponents(import.meta.dirname);
// await buildBundle(import.meta.dirname);
