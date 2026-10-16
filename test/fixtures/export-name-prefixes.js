export const Foo = 1

export {
  Foo as 'type:Foo',
  Foo as 'value:Foo',
  Foo as 'type:type:Foo',
  Foo as 'value:value:Foo',
  Foo as 'type:value:Foo',
  Foo as 'value:type:Foo',
  Foo as 'Foo:type:Bar',
  Foo as 'Foo:value:Bar',
  Foo as 'type:default',
  Foo as 'value:default',
}
