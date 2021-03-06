/**
 * A small set of precondition checking functions for better expressing intent on an assertion.
 */
export function checkArgument(expr: boolean, msg: string = 'Invalid argument'): void {
    if (!expr) {
        throw new Error(msg)
    }
}

export function checkNotNil<T>(ref: T | undefined | null, message: string = 'unexpected nil'): T {
    if (isNil(ref)) {
        throw new Error(message)
    }

    return ref as T
}

export function checkState(stateExpr: boolean): void {
    if (!stateExpr) {
        throw new Error(`Invalid state`)
    }
}

export function assert(expr: boolean): expr is true {
    if (!expr) {
        throw new Error(`Assertion failed`)
    }

    return true
}

export function fail(msg?: string): never {
    throw new Error(msg ? msg : 'fail()')
}

export function isNil<T>(value: T | undefined | null): value is undefined | null {
    return (value === null) || (value === undefined)
}
