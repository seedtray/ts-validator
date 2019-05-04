import {checkNotNil, isNil} from '../errors'

export class Maps {
    static equal<K, T>(m1: Map<K, T>, m2: Map<K, T>, comparison: (e1: T, e2: T) => boolean): boolean {
        return Array.from(m1.keys()).every(key => {
            const e2 = m2.get(key)
            if (isNil(e2)) {
                return false
            }
            return comparison(checkNotNil(m1.get(key)), e2)
        })
    }
}
