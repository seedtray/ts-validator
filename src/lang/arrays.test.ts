import {Arrays} from './arrays'

const noReachCmp = (a: any, b: any) => fail()
const cmp = (a: any, b: any) => a === b

test('empty arrays are equal', () => {
    expect(Arrays.equal([], [], noReachCmp)).toBe(true)
})

test('single element arrays are equal depending on that single element', () => {
    const e1 = 1
    const e2 = 2
    expect(Arrays.equal([e1], [e1], cmp)).toBe(true)
    expect(Arrays.equal([e1], [e2], cmp)).toBe(false)
    expect(Arrays.equal([e2], [e1], cmp)).toBe(false)
})

test('different length arrays are not equal', () => {
    expect(Arrays.equal([1], [], noReachCmp)).toBe(false)
    expect(Arrays.equal([], [1], noReachCmp)).toBe(false)
})

test('different permutation is not equal', () => {
    expect(Arrays.equal([1, 2], [2, 1], cmp)).toBe(false)
})

test('custom comparison determines equality', () => {
        interface AB {
            a: number,
            b: number
        }

        const projectionEq = (e1: AB, e2: AB) => e1.a === e2.a
        expect(Arrays.equal([{a: 10, b: 20}], [{a: 10, b: 30}], projectionEq)).toBe(true)
        expect(Arrays.equal([{a: 10, b: 20}], [{a: 20, b: 20}], projectionEq)).toBe(false)
    }
)
