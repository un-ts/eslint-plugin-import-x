declare namespace foo {
  function topLevel(): void
}

declare namespace foo.bar.baz {
  function deep(): void
}

declare module foo.qux {
  function inModule(): void
}

export = foo
