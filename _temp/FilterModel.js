import {isState, freeze} from './Runtime';
import uniqueId from 'lodash/uniqueId';
import values from 'lodash/values';
import isUndefined from 'lodash/isUndefined';
import isString from 'lodash/isString';
import flatten from 'lodash/flatten';
import compact from 'lodash/compact';
import escapeRegExp from 'lodash/escapeRegExp';
import invariant from 'invariant';
import {isScalar} from './helpers/SQL';

export const
  OPERATOR_UID = Symbol('uid'), // Key for unique runtime identifier of operator.
  FREE_TEXT = '$freetext',
  EQ = '$eq',
  NE = '$ne',
  LT = '$lt',
  GT = '$gt',
  LTE = '$lte',
  GTE = '$gte',
  LIKE = '$like',
  IN = '$in',
  BETWEEN = '$between',
  NOT = '$not',
  OR = '$or',
  AND = '$and';

const
  LOGICAL_OPERATORS = [OR, AND],
  BINARY_OPERATORS = [EQ, NE, LT, GT, LTE, GTE, LIKE, IN, BETWEEN],
  OPERATORS = [FREE_TEXT, NOT].concat(LOGICAL_OPERATORS, BINARY_OPERATORS);

export const OPERATOR_UPDATE = 'Operator.update';

export function operatorUpdate(operatorUid, operator) {
  return {type: OPERATOR_UPDATE, payload: {operatorUid, operator}};
}

export function isFreeTextOperator(key) {
  return key == FREE_TEXT;
}

export function isNegationOperator(key) {
  return key == NOT;
}

export function isBinaryOperator(key) {
  return BINARY_OPERATORS.includes(key);
}

export function isLogicalOperator(key) {
  return LOGICAL_OPERATORS.includes(key);
}

export function isOperator(key) {
  return OPERATORS.includes(key);
}

export function reduceOperator(state, action) {
  if (isState(state)) {
    state = {...state};

    if (isUndefined(state[OPERATOR_UID])) {
      state[OPERATOR_UID] = uniqueId('operator');
    }
    if (action.payload && action.payload.operatorUid == state[OPERATOR_UID]) {
      switch (action.type) {

        case OPERATOR_UPDATE:
          state = {
            ...action.payload.operator,
            [OPERATOR_UID]: state[OPERATOR_UID] // Preserve original operator UID
          };
          break;
      }
    }
    if (DEBUG) {
      invariant(Object.keys(state).length == 1, 'Expected operator object to have a single key at ' + JSON.stringify(state));
    }
    return state;
  }
}

export function reduceFreeTextOperatorValue(state, action) {
  if (DEBUG) {
    invariant(isString(state), `${FREE_TEXT} operator expects a string`);
  }
  return state;
}

export function reduceBinaryOperatorValue(key, state, action) {
  switch (key) {
    case EQ:
    case NE:
    case LT:
    case GT:
    case LTE:
    case GTE:
      if (DEBUG) {
        invariant(isScalar(state), `${key} operator expects a scalar`);
      }
      return state;

    case LIKE:
      if (DEBUG) {
        invariant(isString(state), `${LIKE} operator expects a string`);
      }
      return state;

    case IN:
      if (DEBUG) {
        invariant(Array.isArray(state) && state.every(isScalar), `${IN} operator expects an array of scalars`);
      }
      return freeze([...state]);

    case BETWEEN:
      if (DEBUG) {
        invariant(Array.isArray(state) && state.length == 2 && state.every(isScalar), `${BETWEEN} operator expects an array of exactly two scalars`);
      }
      return freeze([...state]);

    default:
      throw new Error(`Binary operator expected but "${key}" found`);
  }
}

export function reduceNegationOperatorValue(state, action) {
  if (isScalar(state)) {
    state = {[EQ]: state};
  }
  state = reduceOperator(state, action);
  if (state) {
    let [key] = Object.keys(state);

    if (isBinaryOperator(key)) {
      state[key] = reduceBinaryOperatorValue(key, state[key], action);
      return freeze(state);
    }
  }
  throw new Error(`${NOT} expects scalar or single binary operator`);
}

export function reduceFieldOperatorValue(state, action) {
  if (isScalar(state)) {
    state = {[EQ]: state};
  }
  state = reduceOperator(state, action);
  if (state) {
    let [key] = Object.keys(state);

    //console.log(key, isNegationOperator(key), isBinaryOperator(key));

    if (isNegationOperator(key)) {
      state[key] = reduceNegationOperatorValue(state[key], action);
      return freeze(state);
    }
    if (isBinaryOperator(key)) {
      state[key] = reduceBinaryOperatorValue(key, state[key], action);
      return freeze(state);
    }
  }
  throw new Error('Field expects scalar or single binary or negation operator at ' + JSON.stringify(state));
}

export function reduceLogicalOperatorValue(state, action) {
  if (isState(state)) {
    state = [state];
  }
  if (Array.isArray(state)) {
    state = state.map(operator => {
      let keys = Object.keys(operator);
      if (keys.length == 1) {
        return operator; // Object seems to be a normalized operator.
      }
      return keys.map(key => ({[key]: operator[key]}));
    });

    state = flatten(state).map(operator => {
      operator = reduceOperator(operator, action);
      if (DEBUG) {
        invariant(operator, 'Expected operators inside logical operator to be objects at ' + JSON.stringify(state));
      }
      let [key] = Object.keys(operator);

      if (isLogicalOperator(key)) {
        operator[key] = reduceLogicalOperatorValue(operator[key], action);
        return freeze(operator);
      }
      if (isFreeTextOperator(key)) {
        operator[key] = reduceFreeTextOperatorValue(operator[key], action);
        return freeze(operator);
      }
      if (isOperator(key)) {
        throw new Error(`Operator ${key} cannot be immediate descendant of logical operator at ${JSON.stringify(state)}`);
      }
      operator[key] = reduceFieldOperatorValue(operator[key], action);
      return freeze(operator);
    });
    return freeze(state);
  }
  throw new Error(`Logical operator expects an object or an array of logical, ${FREE_TEXT} and field operators`);
}

/**
 * @typedef {Object}
 * @name FilterModel
 */
export function reduceFilter(state, action) {
  if (state == null) {
    return;
  }
  try {
    state = reduceLogicalOperatorValue(state, action);
    if (state.length > 1) {
      state = reduceOperator({[AND]: state}, action);
      return freeze(state);
    }
    return state[0];
  } catch(e) {
    throw `Cannot reduce filter ${JSON.stringify(state)}\n` + e;
  }
}

/**
 * Creates matcher function from provided filter object.
 * @param {Object} operator Reduced operator.
 * @returns {?Function} Filtering function or `null` if provided operator does not contain
 *          at least one {@link FREE_TEXT} or field operator.
 */
export function toMatcher(operator) {
  let [key] = Object.keys(operator),
      value = operator[key];
  switch (key) {
    case EQ: return val => val == value;
    case NE: return val => val != value;
    case LT: return val => val < value;
    case GT: return val => val > value;
    case LTE: return val => val <= value;
    case GTE: return val => val >= value;

    case NOT: {
      let test = toMatcher(value);
      return val => test(val) == false;
    }
    case LIKE: {
      let pattern = new RegExp(`^${value.split('%').map(escapeRegExp).join('.*')}$`, 'i');
      return val => pattern.test(val);
    }

    case IN: return val => value.includes(val);

    case BETWEEN: return val => val >= value[0] && val <= value[1];

    case FREE_TEXT: return val => values(val).filter(isString).some(val => val.includes(value));

    // In case `AND` or `OR` operator have no nested matchers they are ignored.
    case AND: {
      let tests = compact(value.map(toMatcher));
      if (tests.length) {
        return val => tests.every(test => test(val));
      }
      return null;
    }
    case OR: {
      let tests = compact(value.map(toMatcher));
      if (tests.length) {
        return val => tests.some(test => test(val));
      }
      return null;
    }
    default: {
      // Seems `key` holds field id
      let test = toMatcher(value);
      return val => test(val[key]);
    }
  }
}
