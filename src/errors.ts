/**
 * A small set of precondition checking functions for better expressing intent on an assertion.
 */
export function checkArgument(argument: string, expr: boolean): void {
    if (!expr) {
        throw new Error(`Invalid argument ${argument}`)
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

export function fail(msg?: string): never {
    throw new Error(msg ? msg : 'fail()')
}

export function isNil<T>(value: T | undefined | null): value is undefined | null {
    return (value === null) || (value === undefined)
}
