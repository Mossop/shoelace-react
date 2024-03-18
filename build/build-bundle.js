import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as esbuild from "esbuild";

export async function buildBundle(baseDir) {
  let cdnDir = path.join(baseDir, "cdn");

  // Clear build directory
  fs.rmSync(cdnDir, { recursive: true, force: true });
  fs.mkdirSync(cdnDir, { recursive: true });

  let shoelaceBase = path.dirname(
    path.dirname(fileURLToPath(import.meta.resolve("@shoelace-style/shoelace")))
  );

  await esbuild.build({
    entryPoints: [path.join(shoelaceBase, "dist", "shoelace.js")],
    bundle: true,
    minify: true,
    outfile: path.join(cdnDir, "shoelace.js"),
  });

  let shoelaceThemes = path.join(shoelaceBase, "cdn", "themes");
  let themes = path.join(cdnDir, "themes");

  for (let theme of ["light", "dark"]) {
    fs.cpSync(
      path.join(shoelaceThemes, `${theme}.css`),
      path.join(themes, `${theme}.css`)
    );
  }

  fs.mkdirSync(path.join(cdnDir, "assets"), { recursive: true });
  fs.cpSync(
    path.join(path.join(shoelaceBase, "cdn", "assets")),
    path.join(cdnDir, "assets"),
    {
      recursive: true,
    }
  );
}
