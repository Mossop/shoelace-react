# shoelace-react

React wrappers around the [shoelace](https://shoelace.style/) web components.

But wait, doesn't shoelace already [ship with "first class" React support](https://shoelace.style/frameworks/react)?

Yes. Except they don't work for server-side rendering. These wrappers do.

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

```JavaScript
import { SlAvatar } from 'shoelace-react';

const App = () => <SlAvatar label="User avatar" />;
```

You can also import components individually which may allow for a smaller bundle, though this
package is fairly small anyway.

```JavaScript
import SlButton from 'shoelace-react/components/button';

const App = () => (
  <>
    <SlButton variant="default">Default</SlButton>
  </>
);
```

All components also accept a `ref` prop which gives you access to the custom element.
