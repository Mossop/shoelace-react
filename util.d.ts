export type ShoelaceEvent<
  T = HTMLElement,
  N extends string = string,
  D = any,
> = CustomEvent<D> & {
  type: N;
  currentTarget: T;
  target: T;
};
