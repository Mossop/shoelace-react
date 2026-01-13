import { useRef, useEffect, useCallback, useMemo } from "react";

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
      if (value === undefined || value === null) {
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
  let component = useRef(null);

  let updateComponent = useCallback(
    (newComponent) => {
      component.current = newComponent;

      if (outerRef) {
        if (typeof outerRef == "function") {
          outerRef(newComponent);
        } else {
          outerRef.current = newComponent;
        }
      }
    },
    [outerRef]
  );

  // eventDefs is considered to be static so this is safe.
  for (let [prop, [eventType, capturing]] of Object.entries(eventDefs)) {
    useEffect(() => {
      if (events[prop]) {
        component.current?.addEventListener(eventType, events[prop], capturing);

        return () => {
          component.current?.removeEventListener(
            eventType,
            events[prop],
            capturing
          );
        };
      }
    }, [prop, component, events[prop]]);
  }

  return updateComponent;
}
