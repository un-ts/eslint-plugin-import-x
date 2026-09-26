// Regression fixture for the same path being imported both dynamically and statically: the
// dynamic import must not license ignoring the static import to that very same module, which on
// its own still closes a real cycle back to depth-zero.
export const loadDynamic = () => import('./depth-one')
import { foo } from './depth-one'
export { foo }
