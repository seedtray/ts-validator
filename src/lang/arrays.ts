import {isNil} from '../errors'

export class Arrays {
    static equal<T>(a1: T[], a2: T[], comparison: (e1: T, e2: T) => boolean): boolean {
        return a1.length === a2.length && a1.every((e1, i) => comparison(e1, a2[i]))
    }
}
