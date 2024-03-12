import pkgUp from './pkgUp'

declare function readPkgUp(
  opts?: Parameters<typeof pkgUp>[0],
  // eslint-disable-next-line @typescript-eslint/ban-types
): {} | { pkg: string; path: string }

export default readPkgUp
