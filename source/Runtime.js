/**
 * Runtime operations provide set of methods that are required to ease development
 * but can be stripped or modified at application runtime to speed up page rendering
 * and model updates.
 */
import isPlainObject from 'lodash/isPlainObject';
import isObjectLike from 'lodash/isObjectLike';

export function freeze(obj) {
  if (DEBUG) {
    Object.freeze(obj);
  }
  return obj;
}

export function isState(obj) {
  return isObjectLike(obj) && !Array.isArray(obj);
}
