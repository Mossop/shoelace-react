import { promises as fs } from "fs";
import path from "path";
import prettier from "prettier";

const PRETTIER_CONFIG = {
  parser: "babel-ts",
};

function* events(metadata) {
  let seenEvents = new Set();

  for (let module of metadata.modules) {
    for (let declaration of module.declarations) {
      if (declaration.customElement) {
        for (let event of declaration.events ?? []) {
          if (seenEvents.has(event.eventName)) {
            continue;
          }

          seenEvents.add(event.eventName);

          yield event;
        }
      }
    }
  }
}

function* components(metadata) {
  for (let module of metadata.modules) {
    for (let declaration of module.declarations) {
      if (declaration.customElement) {
        yield [module.path, declaration];
      }
    }
  }
}

function linewrapComment(comment) {
  if (!comment) {
    return "";
  }

  let lines = comment.split("\n");
  for (let i = 1; i < lines.length; i++) {
    lines[i] = " * " + lines[i];
  }

  return lines.join("\n");
}

async function writeSource(fileName, source) {
  let prettified = await prettier.format(source, PRETTIER_CONFIG);
  await fs.writeFile(fileName, prettified, "utf8");
}

async function buildEvents(metadata, baseDir) {
  let eventDefs = [];

  for (let event of events(metadata)) {
    eventDefs.push(
      `export type ${event.eventName}<T = HTMLElement> = ShoelaceEvent<T, "${event.name}">;`
    );
  }

  await writeSource(
    path.join(baseDir, "events.d.ts"),
    `
import type { ShoelaceEvent } from "./util";

${eventDefs.join("\n")}
    `
  );
}

async function buildComponents(metadata, baseDir) {
  let reactDir = path.join(baseDir, "components");

  // Clear build directory
  await fs.rm(reactDir, { recursive: true, force: true });
  await fs.mkdir(reactDir, { recursive: true });

  for (let [module, component] of components(metadata)) {
    let componentName = component.name;

    let usedEvents = [];
    let tagName = component.tagName;
    let tagWithoutPrefix = component.tagName.replace(/^sl-/, "");
    let componentFile = path.join(reactDir, `${tagWithoutPrefix}.js`);
    let componentDef = path.join(reactDir, `${tagWithoutPrefix}.d.ts`);

    let ifaceProps = [];

    let eventDefs = {};
    let componentPropMap = {};
    let attrDefaults = [];

    for (let attr of component.attributes ?? []) {
      ifaceProps.push(
        `/**
         * ${linewrapComment(attr.description)}
         */
        ${attr.fieldName}?: ${attr.type?.text ?? "any"};`
      );

      if (attr.default && attr.default != "''" && attr.default != "false") {
        attrDefaults.push(`${attr.fieldName}: ${attr.default}`);
      }

      if (attr.name != attr.fieldName) {
        componentPropMap[attr.fieldName] = attr.name;
      }
    }

    for (let event of component.events ?? []) {
      usedEvents.push(event.eventName);

      eventDefs[event.reactName] = [event.name, false];
      eventDefs[`${event.reactName}Capture`] = [event.name, true];

      ifaceProps.push(
        `  /**
         * ${linewrapComment(event.description)}
         */
        ${event.reactName}?: (event: ${event.eventName}<${componentName}Element>) => void;`
      );
      ifaceProps.push(
        `  /**
         * ${linewrapComment(event.description)}
         */
        ${event.reactName}Capture?: (event: ${event.eventName}<${componentName}Element>) => void;`
      );
    }

    await writeSource(
      componentFile,
      `
/* eslint-disable react/prop-types */
import { memo, forwardRef, createElement } from "react";
import { useComponentProps, useComponentRef } from "../util.js";

const PROP_MAP = ${JSON.stringify(componentPropMap)};

const PROP_DEFAULTS = {
${attrDefaults.join(",\n")}
};

const EVENT_DEFINITIONS = ${JSON.stringify(eventDefs)};

/**
 * ${linewrapComment(component.summary)}
 *
 * @param {${componentName}Props} props
 * @returns {ReactNode}
 */
export default memo(forwardRef(function ${componentName}(props, outerRef) {
  let [componentProps, events, children] = useComponentProps(props, PROP_MAP, PROP_DEFAULTS, EVENT_DEFINITIONS);
  let componentRef = useComponentRef(outerRef, events, EVENT_DEFINITIONS);

  return createElement(
    "${tagName}",
    {
      ...componentProps,
      ref: componentRef,
      suppressHydrationWarning: true,
    },
    children
  );
}));
    `,
      PRETTIER_CONFIG
    );

    let eventImports = usedEvents.length
      ? `import { ${usedEvents.join(", ")} } from "../events";`
      : "";

    await writeSource(
      componentDef,
      `
import type { ReactNode, HTMLAttributes, Ref } from "react";
import type ${componentName}Element from "@shoelace-style/shoelace/dist/${module}";
${eventImports}

export type { ${componentName}Element };

export interface ${componentName}Props extends HTMLAttributes<${componentName}Element> {
  ref?: Ref<${componentName}Element>
${ifaceProps.join("\n")}
}

/**
 * ${linewrapComment(component.summary)}
 */
export default function ${componentName}(props: ${componentName}Props): ReactNode;
    `,
      PRETTIER_CONFIG
    );
  }
}

async function buildIndexes(metadata, baseDir) {
  let indexJs = [];
  let indexDts = [];

  let names = Array.from(events(metadata), (e) => e.eventName);
  indexDts.push(`export { ${names.join(", ")} } from "./events";\n`);

  for (let [, component] of components(metadata)) {
    let componentName = component.name;
    let tagWithoutPrefix = component.tagName.replace(/^sl-/, "");

    indexJs.push(
      `export { default as ${componentName} } from "./components/${tagWithoutPrefix}.js"`
    );
    indexDts.push(
      `export { default as ${componentName}, ${componentName}Element, ${componentName}Props } from "./components/${tagWithoutPrefix}.js"`
    );
  }

  await writeSource(
    path.join(baseDir, "index.js"),
    `
${indexJs.join("\n")}
    `
  );

  await writeSource(
    path.join(baseDir, "index.d.ts"),
    `
${indexDts.join("\n")}
    `
  );
}

// Fetch component metadata
let metadata = JSON.parse(
  await fs.readFile(
    new URL(
      import.meta.resolve("@shoelace-style/shoelace/dist/custom-elements.json")
    ),
    "utf8"
  )
);

let baseDir = path.dirname(import.meta.dirname);

await buildEvents(metadata, baseDir);
await buildComponents(metadata, baseDir);
await buildIndexes(metadata, baseDir);
