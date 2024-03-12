import type { Node } from 'estree'

declare function visit(
  node: Node,
  keys: { [k in Node['type']]?: (keyof Node)[] },
  // eslint-disable-next-line @typescript-eslint/ban-types
  visitorSpec: { [k in Node['type'] | `${Node['type']}:Exit`]?: Function },
): void

export default visit
