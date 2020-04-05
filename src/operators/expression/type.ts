/**
 * Type Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#type-expression-operators
 */

import { isString, getType, MIN_INT, MAX_INT, MAX_LONG, MIN_LONG, JsType, BsonType } from '../../util'
import { computeValue, Options } from '../../core'
import { $dateToString } from './date'

class TypeConvertError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export function $type(obj: object, expr: any, options: Options): string {
  let val = computeValue(obj, expr, null, options)
  let typename = getType(val)
  let nativeType = typename.toLowerCase()
  switch (nativeType) {
    case JsType.BOOLEAN:
      return BsonType.BOOL
    case JsType.NUMBER:
      if (val.toString().indexOf('.') >= 0) return BsonType.DOUBLE
      return val >= MIN_INT && val <= MAX_INT ? BsonType.INT : BsonType.LONG
    case JsType.REGEXP:
      return BsonType.REGEX
    case JsType.STRING:
    case JsType.DATE:
    case JsType.ARRAY:
    case JsType.OBJECT:
    case JsType.FUNCTION:
    case JsType.NULL:
    case JsType.UNDEFINED:
      return nativeType
    default:
      // unrecognized custom type
      return typename
  }
}

/**
 * Converts a value to a boolean.
 *
 * @param obj
 * @param expr
 */
export function $toBool(obj: object, expr: any, options: Options): boolean | null {
  let val = computeValue(obj, expr, null, options)
  if (val === null || val === undefined) return null
  return Boolean(val)
}

export function $toString(obj: object, expr: any, options: Options): string | null {
  let val = computeValue(obj, expr, null, options)
  if (val === null || val === undefined) return null
  if (val instanceof Date) {
    let dateExpr = {
      date: expr,
      format: "%Y-%m-%dT%H:%M:%S.%LZ"
    }
    return $dateToString(obj, dateExpr, options)
  } else {
    return val.toString()
  }
}

export function toInteger(obj: object, expr: any, options: Options, max: number, min: number, typename: string): number | null {
  let val = computeValue(obj, expr, null, options)

  if (val === null || val === undefined) return null
  if (val instanceof Date) return val.getTime()

  let n = Math.trunc(Number(val))
  if (!isNaN(n) && n >= min && n <= max && (!isString(val) || /^\d+$/.test(val))) return n

  throw new TypeConvertError(`cannot convert '${val}' to ${typename}`)
}

/**
 * Converts a value to an integer. If the value cannot be converted to an integer, $toInt errors. If the value is null or missing, $toInt returns null.
 * @param obj
 * @param expr
 */
export function $toInt(obj: object, expr: any, options: Options): number | null {
  return toInteger(obj, expr, options, MAX_INT, MIN_INT, 'int')
}

/**
 * Converts a value to a long. If the value cannot be converted to a long, $toLong errors. If the value is null or missing, $toLong returns null.
 */
export function $toLong(obj: object, expr: any, options: Options): number | null {
  return toInteger(obj, expr, options, MAX_LONG, MIN_LONG, 'long')
}

/**
 * Converts a value to a double. If the value cannot be converted to an double, $toDouble errors. If the value is null or missing, $toDouble returns null.
 *
 * @param obj
 * @param expr
 */
export function $toDouble(obj: object, expr: any, options: Options): number | null {
  let val = computeValue(obj, expr, null, options)

  if (val === null || val === undefined) return null
  if (val instanceof Date) return val.getTime()
  let n = Number(val)
  if (!isNaN(n) && n.toString() === val.toString()) return n
  throw new TypeConvertError(`cannot convert '${val}' to double/decimal`)
}

/**
 * Converts a value to a decimal. If the value cannot be converted to a decimal, $toDecimal errors. If the value is null or missing, $toDecimal returns null.
 * Alias for $toDouble in Mingo.
 */
export const $toDecimal = $toDouble

/**
 * Converts a value to a date. If the value cannot be converted to a date, $toDate errors. If the value is null or missing, $toDate returns null.
 *
 * @param obj
 * @param expr
 */
export function $toDate(obj: object, expr: any, options: Options): Date | null {
  let val = computeValue(obj, expr, null, options)

  if (val instanceof Date) return val
  if (val === null || val === undefined) return null

  let d = new Date(val)
  let n = d.getTime()
  if (!isNaN(n)) return d

  throw new TypeConvertError(`cannot convert '${val}' to date`)
}

const PARAMS__CONVERT = ['input', 'to', 'onError', 'onNull']

/**
 * Converts a value to a specified type.
 *
 * @param obj
 * @param expr
 */
export function $convert(obj: object, expr: any, options: Options): any {
  let args: {
    input: any
    to: string | number
    onError?: any
    onNull?: any
  } = Object.create({})

  PARAMS__CONVERT.forEach((k: string) => {
    args[k] = computeValue(obj, expr[k], null, options)
  })

  args.onNull = args.onNull === undefined ? null : args.onNull

  if (args.input === null || args.input === undefined) return args.onNull

  try {
    switch (args.to) {
      case 2:
      case JsType.STRING:
        return $toString(obj, args.input, options)

      case 8:
      case JsType.BOOLEAN:
      case BsonType.BOOL:
        return $toBool(obj, args.input, options)

      case 9:
      case JsType.DATE:
        return $toDate(obj, args.input, options)

      case 1:
      case 19:
      case BsonType.DOUBLE:
      case BsonType.DECIMAL:
      case JsType.NUMBER:
        return $toDouble(obj, args.input, options)

      case 16:
      case BsonType.INT:
        return $toInt(obj, args.input, options)

      case 18:
      case BsonType.LONG:
        return $toLong(obj, args.input, options)
    }
  } catch (e) {}

  if (args.onError !== undefined) return args.onError

  throw new TypeConvertError(`failed to convert ${args.input} to ${args.to}`)
}
