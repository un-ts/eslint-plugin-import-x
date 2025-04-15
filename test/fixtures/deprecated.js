// some line comment
/**
 * This function is terrible
 *
 * @deprecated Please use 'x' instead.
 * @returns Null
 */
// another line comment
// with two lines
export function fn() {
  return null
}

/**
 * So terrible
 *
 * @deprecated This is awful, use NotAsBadClass.
 */
export default class TerribleClass {}

/**
 * Some flux action type maybe
 *
 * @deprecated Please stop sending/handling this action type.
 * @type {String}
 */
export const MY_TERRIBLE_ACTION = 'ugh'

/**
 * @deprecated This chain is awful
 * @type {String}
 */
export const CHAIN_A = 'a',
  /**
   * @deprecated So awful
   * @type {String}
   */
  CHAIN_B = 'b',
  /**
   * @deprecated Still terrible
   * @type {String}
   */
  CHAIN_C = 'C'

/**
 * This one is fine
 *
 * @returns {String} - Great!
 */
export function fine() {
  return 'great!'
}

export function _undocumented() {
  return 'sneaky!'
}

/** @deprecated */
export function _deprecatedNoDescription() {
  return '_deprecatedNoDescription'
}
