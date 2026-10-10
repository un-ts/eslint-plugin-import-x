// Regression fixture for allowUnsafeDynamicCyclicDependency aborting the whole module's traversal
// on the first dynamic import it sees, instead of only skipping that one edge: the dynamic import
// below points at an unrelated, non-cyclic leaf, while the static import below it is what actually
// closes the cycle back to depth-zero. The order matters - the dynamic declaration has to come
// first in source order for the bug to trigger, since it is whichever declaration Map iteration
// reaches first that used to make the whole module's remaining imports go unchecked.
export const loadUnrelated = () => import('./unrelated-leaf')
import { foo } from './depth-one'
export { foo }
