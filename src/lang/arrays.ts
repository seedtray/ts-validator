import {isNil} from '../errors'

export class Arrays {
    static equal<T>(a1: T[], a2: T[], comparison: (e1: T, e2: T) => boolean): boolean {
        return a1.length === a2.length && a1.every((e1, i) => comparison(e1, a2[i]))
    }

    static isPermutation<T>(a1: T[], a2: T[], comparison: (e1: T, e2: T) => boolean): boolean {
        if (Arrays.equal(a1, a2, comparison)) {
            return true
        }
        const a2copy = a2.slice()
        for (const searchingFor of a1) {
            const foundAt = Arrays.findIndex(searchingFor, a2copy, comparison)
            if (isNil(foundAt)) {
                return false
            }
            a2copy.splice(foundAt, 1)
        }
        return true
    }

    static findIndex<T>(element: T, a: T[], comparison: (e1: T, e2: T) => boolean): number | null {
        let index = 0
        for (const candidate of a) {
            if (comparison(element, candidate)) {
                return index
            }
            index += 1
        }
        return null
    }
}
