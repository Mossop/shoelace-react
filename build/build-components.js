import fs from "fs";
import path from "path";
import prettier from "prettier";

function* components(metadata) {
  for (let module of metadata.modules) {
    for (let declaration of module.declarations) {
      if (declaration.customElement) {
        yield declaration;
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

  for (let component of components(metadata)) {
    let componentName = component.name;

    let propsInterface = `${componentName}Props`;
    let tagName = component.tagName;
    let tagWithoutPrefix = component.tagName.replace(/^sl-/, "");
    let componentFile = path.join(reactDir, `${tagWithoutPrefix}.js`);
    let componentDef = path.join(reactDir, `${tagWithoutPrefix}.d.ts`);

    indexJs.push(
      `export { default as ${componentName} } from "./components/${tagWithoutPrefix}.js"`
    );
    indexDts.push(
      `export { default as ${componentName}, ${propsInterface} } from "./components/${tagWithoutPrefix}.js"`
    );

    let ifaceProps = [];
    let attrExpand = [];
    let attrMap = [];
    let eventProps = [];
    let eventRegistrations = [];
    let eventUnregistrations = [];

    for (let attr of component.attributes ?? []) {
      ifaceProps.push(
        `/**
         * ${linewrapComment(attr.description)}
         */
        ${attr.fieldName}?: ${attr.type?.text ?? "any"};`
      );

      if (attr.name != attr.fieldName) {
        attrExpand.push(`${attr.fieldName}: ${attr.fieldName}Attr`);
        attrMap.push(`"${attr.name}": ${attr.fieldName}Attr,`);
      }
    }

    for (let event of component.events ?? []) {
      attrExpand.push(event.reactName, `${event.reactName}Capture`);
      eventProps.push(event.reactName, `${event.reactName}Capture`);
      eventRegistrations.push(
        `if (${event.reactName}) { el.addEventListener("${event.name}", ${event.reactName}); }`,
        `if (${event.reactName}Capture) { el.addEventListener("${event.name}", ${event.reactName}Capture, true); }`
      );
      eventUnregistrations.push(
        `if (${event.reactName}) { el.removeEventListener("${event.name}", ${event.reactName}); }`,
        `if (${event.reactName}Capture) { el.removeEventListener("${event.name}", ${event.reactName}, true); }`
      );
      ifaceProps.push(
        `  /**
         * ${linewrapComment(event.description)}
         */
        ${event.reactName}?: ReactEventHandler<HTMLElement>;`
      );
      ifaceProps.push(
        `  /**
         * ${linewrapComment(event.description)}
         */
        ${event.reactName}Capture?: ReactEventHandler<HTMLElement>;`
      );
    }

    let source = await prettier.format(
      `
/* eslint-disable react/prop-types */
import { useRef, useEffect, createElement } from "react";

/**
 * ${linewrapComment(component.summary)}
 *
 * @param {${propsInterface}} props
 * @returns {ReactNode}
 */
export default function ${componentName}({ ${attrExpand.join(",")}${
        attrExpand.length ? "," : ""
      } children, ...props }) {
  let elementRef = useRef();

  let attrs = {
    ${attrMap.join("\n")}
    ref: elementRef,
    ...props
  };

  useEffect(() => {
    if (!elementRef.current) {
      return;
    }

    let el = elementRef.current;
    ${eventRegistrations.join("\n")}

    return () => {
      ${eventUnregistrations.join("\n")}
    };
  }, [${eventProps.join(", ")}]);

  return createElement("${tagName}", attrs, children);
}
    `,
      {
        parser: "babel-ts",
      }
    );

    fs.writeFileSync(componentFile, source, "utf8");

    source = await prettier.format(
      `
import type { ReactNode, HTMLAttributes, ReactEventHandler } from "react";

export interface ${propsInterface} extends HTMLAttributes<HTMLElement> {
${ifaceProps.join("\n")}
}

/**
 * ${linewrapComment(component.summary)}
 */
export default function ${componentName}(props: ${propsInterface}): ReactNode;
    `,
      {
        parser: "babel-ts",
      }
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
