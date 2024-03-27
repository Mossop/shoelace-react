# shoelace-react

React wrappers around the [shoelace](https://shoelace.style/) web components.

But wait, doesn't shoelace already [ship with "first class" React support](https://shoelace.style/frameworks/react)?

Yes. Except it doesn't work for server-side rendering. These wrappers do.

# Installation

Add the package as a dependency to your project as normal:

```
npm install shoelace-react
```

You must also add Shoelace's theme and module just as if you were using Shoelace directly. Something
like this:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.14.0/cdn/themes/light.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.14.0/cdn/shoelace.js"></script>
```

You can also follow their docs for [cherry-picking](https://shoelace.style/getting-started/installation#cherry-picking)
or [bundling](https://shoelace.style/getting-started/installation#bundling) to reduce the download
required.

# Usage

Import the component you want and use it as a normal react element. The components should have the
same props as the official Shoelace react elements so follow their API docs. If there are
differences in behaviour then please file an issue.

```TypeScript
import { SlAvatar } from 'shoelace-react';

const App = () => (
  <SlAvatar label="User avatar" />
);
```

You can also import components individually which may allow for a smaller bundle, though this
package is fairly small anyway.

```TypeScript
import SlButton from 'shoelace-react/components/button';

const App = () => (
  <SlButton variant="default">Default</SlButton>
);
```

## Direct element access

All components also accept a `ref` prop which gives you access to the custom element. the element
class is also exported as a pure type so you can safely import without breaking SSR. Note that as
the element is exported as a type you can't use it to construct the element yourself.

```TypeScript
import { useRef, useEffect } from 'react';
import { SlButton, SlButtonElement } from 'shoelace-react';

const App = () => {
  let buttonRef = useRef<SlButtonElement>();

  useEffect(() => {
    buttonRef.current.focus();
  }, []);

  return <SlButton ref={buttonRef} variant="default">Default</SlButton>
};
```

## Events

Custom event types are exported for each component:

```TypeScript
import { useCallback } from 'react';
import { SlInput, SlInputElement, SlInputChangeEvent } from 'shoelace-react';

const App = () => {
  let changed = useCallback((event: SlInputChangeEvent) => {
    window.alert(event.target.value);
  }, []);

  return <SlInput label="Enter text" onSlChange={changed} />
};
```

There are a couple of different types you can use in TypeScript for the event:

  * Most specific (`SlInputChangeEvent`). Here `event.target` and `event.currentTarget` are
    correctly typed to the component type (`SlInputElement` here). If the event includes any custom
    detail then that is also correctly typed.
  * Shared across components (`SlChangeEvent`), `event.target` is `HTMLElement` however you can
    make this more specific by giving the element type as a generic (`SlChangeEvent<SlInputElement>`).
  * Generic `CustomEvent`.

If you want to register for the capturing phase of the event just append `Capture` to the event
prop.
