export type ShoelaceEvent<T, N extends string> = Omit<
  CustomEvent,
  "type" | "currentTarget" | "target"
> & {
  type: N;
  currentTarget: T;
  target: T;
};
