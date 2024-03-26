import fs from "fs";
import path from "path";
import prettier from "prettier";

const PRETTIER_CONFIG = {
  parser: "babel-ts",
};

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

export async function buildComponents(baseDir) {
  let reactDir = path.join(baseDir, "components");

  // Clear build directory
  fs.rmSync(reactDir, { recursive: true, force: true });
  fs.mkdirSync(reactDir, { recursive: true });

  // Fetch component metadata
  let metadata = JSON.parse(
    fs.readFileSync(
      new URL(
        import.meta.resolve(
          "@shoelace-style/shoelace/dist/custom-elements.json"
        )
      ),
      "utf8"
    )
  );

  let indexJs = [];
  let indexDts = [];

  for (let [module, component] of components(metadata)) {
    let componentName = component.name;

    let eventNames = new Map();
    let propsInterface = `${componentName}Props`;
    let tagName = component.tagName;
    let tagWithoutPrefix = component.tagName.replace(/^sl-/, "");
    let componentFile = path.join(reactDir, `${tagWithoutPrefix}.js`);
    let componentDef = path.join(reactDir, `${tagWithoutPrefix}.d.ts`);

    indexJs.push(
      `export { default as ${componentName} } from "./components/${tagWithoutPrefix}.js"`
    );
    indexDts.push(
      `export { default as ${componentName}, ${componentName}Element, ${propsInterface} } from "./components/${tagWithoutPrefix}.js"`
    );

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
      let eventTypes = eventNames.get(event.eventName);
      if (!eventTypes) {
        eventNames.set(event.eventName, [`"${event.name}"`]);
      } else {
        eventTypes.push(`"${event.name}"`);
      }

      eventDefs[event.reactName] = [event.name, false];
      eventDefs[`${event.reactName}Capture`] = [event.name, true];

      ifaceProps.push(
        `  /**
         * ${linewrapComment(event.description)}
         */
        ${event.reactName}?: (event: ${event.eventName}) => void;`
      );
      ifaceProps.push(
        `  /**
         * ${linewrapComment(event.description)}
         */
        ${event.reactName}Capture?: (event: ${event.eventName}) => void;`
      );
    }

    let source = await prettier.format(
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
 * @param {${propsInterface}} props
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

    fs.writeFileSync(componentFile, source, "utf8");

    let eventsDef = Array.from(
      eventNames.entries(),
      ([name, types]) =>
        `export type ${name} = ShoelaceEvent<${componentName}Element, ${types.join(" | ")}>;`
    );

    source = await prettier.format(
      `
import type { ReactNode, HTMLAttributes, Ref } from "react";
import type ${componentName}Element from "@shoelace-style/shoelace/dist/${module}";
import type { ShoelaceEvent } from "../util";

export type { ${componentName}Element };

${eventsDef.join("\n")}

export interface ${propsInterface} extends HTMLAttributes<${componentName}Element> {
  ref?: Ref<${componentName}Element>
${ifaceProps.join("\n")}
}

/**
 * ${linewrapComment(component.summary)}
 */
export default function ${componentName}(props: ${propsInterface}): ReactNode;
    `,
      PRETTIER_CONFIG
    );

    fs.writeFileSync(componentDef, source, "utf8");
  }

  let index = path.join(baseDir, "index.js");
  fs.rmSync(index, { force: true });
  fs.writeFileSync(index, indexJs.join("\n"), "utf8");

  index = path.join(baseDir, "index.d.ts");
  fs.rmSync(index, { force: true });
  fs.writeFileSync(index, indexDts.join("\n"), "utf8");
}
