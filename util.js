import { useState, useEffect, useCallback, useMemo } from "react";

const REACT_PROPS = {
  className: "class",
};

export function useComponentProps(props, propMap, propDefaults, eventDefs) {
  let defaultedProps = useMemo(
    () => ({
      ...propDefaults,
      ...props,
    }),
    [props]
  );

  let baseEvents = useMemo(
    () => Object.fromEntries(Object.keys(eventDefs).map((k) => [k, null])),
    []
  );

  return useMemo(() => {
    let mappedProps = {};
    let children = null;
    let events = { ...baseEvents };

    for (let [name, value] of Object.entries(defaultedProps)) {
      if (value === false || value === undefined || value === null) {
        continue;
      }

      if (name == "children") {
        children = value;
      } else if (name in eventDefs) {
        events[name] = value;
      } else if (name in propMap) {
        mappedProps[propMap[name]] = value;
      } else if (name in REACT_PROPS) {
        mappedProps[REACT_PROPS[name]] = value;
      } else {
        mappedProps[name] = value;
      }
    }

    return [mappedProps, events, children];
  }, [defaultedProps, baseEvents]);
}

export function useComponentRef(outerRef, events, eventDefs) {
  let [component, setComponent] = useState(null);

  let updateComponent = useCallback(
    (component) => {
      setComponent(component);

      if (outerRef) {
        if (typeof outerRef == "function") {
          outerRef(component);
        } else {
          outerRef.current = component;
        }
      }
    },
    [outerRef]
  );

  // eventDefs is considered to be static so this is safe.
  for (let [prop, [eventType, capturing]] of Object.entries(eventDefs)) {
    useEffect(() => {
      if (component && events[prop]) {
        component.addEventListener(eventType, events[prop], capturing);

        return () => {
          component.removeEventListener(eventType, events[prop], capturing);
        };
      }
    }, [prop, component, events[prop]]);
  }

  return updateComponent;
}
