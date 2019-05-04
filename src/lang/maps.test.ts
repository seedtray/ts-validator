import {Arrays} from './arrays'
import {Maps} from './maps'

const noReachCmp = (e1: any, e2: any) => fail()

const cmp = (e1: any, e2: any) => e1 === e2

test('empty maps are equal', () => {
    expect(Maps.equal(new Map(), new Map(), noReachCmp)).toBe(true)
})

test('single element maps are equal depending on that single element', () => {
    const e1 = 1
    const e2 = 2
    expect(Maps.equal(new Map([['test', e1]]), new Map([['test', e1]]), cmp)).toBe(true)
    expect(Maps.equal(new Map([['test', e1]]), new Map([['test', e2]]), cmp)).toBe(false)
    expect(Maps.equal(new Map([['test', e2]]), new Map([['test', e1]]), cmp)).toBe(false)
})

test('maps with different keys are not equal', () => {
    expect(Maps.equal(new Map([['test', 1]]), new Map([['otherKey', 1]]), noReachCmp)).toBe(false)
    expect(Maps.equal(new Map([['otherKey', 1]]), new Map([['test', 1]]), noReachCmp)).toBe(false)
})

test('custom comparison determines equality', () => {
        interface AB {
            a: number,
            b: number
        }

        const e12 = {a: 1, b: 2}
        const e13 = {a: 1, b: 3}
        const e22 = {a: 2, b: 2}

        const projectionEq = (e1: AB, e2: AB) => e1.a === e2.a
        expect(
            Maps.equal(new Map([['test', e12]]), new Map([['test', e13]]), projectionEq)
        ).toBe(true)
        expect(
            Maps.equal(new Map([['test', e12]]), new Map([['test', e22]]), projectionEq)
        ).toBe(false)
    }
)
