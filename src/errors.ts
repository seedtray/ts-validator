export function checkArgument(argument: string, expr: boolean) {
    if (!expr) {
        throw new Error(`Invalid argument ${argument}`)
    }
}

export function checkNotNil<T>(ref: T | undefined | null): T {
    if (ref === null || ref === undefined) {
        throw new Error('unexpected nil')
    }
    return ref as T
}

export function checkState(stateExpr: boolean) {
    if (!stateExpr) {
        throw new Error(`Invalid state`)
    }
}

export function fail(msg?: string): never {
    throw new Error(msg ? msg : 'fail()')
}
