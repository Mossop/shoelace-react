import type { BaseSyntheticEvent } from "react";

export type ShoelaceEvent<T, N extends string> = Omit<
  BaseSyntheticEvent<CustomEvent, T, T>,
  "type"
> & {
  type: N;
};
