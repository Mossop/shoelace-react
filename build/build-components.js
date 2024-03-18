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

    let eventNames = new Set();
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
    let attrExpand = ["className", "children"];
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

      let attrDefault = attr.default ?? null;
      if (attrDefault == "''" || attrDefault == "false") {
        attrDefault = null;
      }

      if (attrDefault || attr.name != attr.fieldName) {
        let expansion = `${attr.fieldName}: ${attr.fieldName}Attr`;
        if (attrDefault) {
          expansion = `${expansion} = ${attrDefault}`;
        }

        attrExpand.push(expansion);
        attrMap.push(`"${attr.name}": ${attr.fieldName}Attr,`);
      }
    }

    for (let event of component.events ?? []) {
      eventNames.add(event.eventName);

      attrExpand.push(event.reactName, `${event.reactName}Capture`);
      eventProps.push(event.reactName, `${event.reactName}Capture`);
      eventRegistrations.push(
        `if (${event.reactName}) { component.addEventListener("${event.name}", ${event.reactName}); }`,
        `if (${event.reactName}Capture) { component.addEventListener("${event.name}", ${event.reactName}Capture, true); }`
      );
      eventUnregistrations.push(
        `if (${event.reactName}) { component.removeEventListener("${event.name}", ${event.reactName}); }`,
        `if (${event.reactName}Capture) { component.removeEventListener("${event.name}", ${event.reactName}, true); }`
      );
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
import { useEffect, useState, useCallback, forwardRef, createElement } from "react";

/**
 * ${linewrapComment(component.summary)}
 *
 * @param {${propsInterface}} props
 * @returns {ReactNode}
 */
export default forwardRef(function ${componentName}({ ${attrExpand.join(",")}, ...props }, outerRef) {
  let [component, setComponent] = useState();

  let attrs = {
    ${attrMap.join("\n")}
    "class": className,
    ...props,
  };

  for (let key of Object.keys(attrs)) {
    if (attrs[key] === false || attrs[key] === undefined || attrs[key] === null) {
      delete attrs[key];
    }
  }

  let updateComponent = useCallback((element) => {
    setComponent(element);

    if (outerRef) {
      if (typeof outerRef == "function") {
        outerRef(element);
      } else {
        outerRef.current = element;
      }
    }
  }, [outerRef]);

  useEffect(() => {
    if (!component) {
      return;
    }

    ${eventRegistrations.join("\n")}

    return () => {
      ${eventUnregistrations.join("\n")}
    };
  }, [component, ${eventProps.join(", ")}]);

  return createElement(
    "${tagName}",
    {
      ...attrs,
      ref: updateComponent,
      suppressHydrationWarning: true,
    },
    children
  );
});
    `,
      {
        parser: "babel-ts",
      }
    );

    fs.writeFileSync(componentFile, source, "utf8");

    let eventsImport =
      eventNames.size > 0
        ? `import type { ${[...eventNames].join(", ")} } from "@shoelace-style/shoelace";\n`
        : "";

    source = await prettier.format(
      `
import type { ReactNode, HTMLAttributes, ReactEventHandler } from "react";
${eventsImport}
export interface ${propsInterface} extends HTMLAttributes<HTMLElement> {
  ref?: Ref<T>
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
