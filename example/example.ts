enum Pepe {
    a,
    b,
    c = 'pepe',
}

interface Gen<T> {
    e: T
}

export interface Customer {
    name: string
    email?: string
    isActive: boolean
    lastPurchaseValues: number[]
}

interface Something {
    f: [boolean, 3]
}

export interface SimpleObject {
    test: [boolean, 3]
}

export interface CompoundObject {
    a: string,
    b: SimpleObject,
    c: SimpleObject,
}

export type SimpleArray = number[]

// tslint:disable-next-line:array-type
export type NestedArray = Array<Array<number>>

interface Recursive1 {
    a: number,
    b: Recursive1
}

interface Recursive2 {
    a: number,
    b: Recursive2,
    c: Recursive2
}

interface Recursive31 {
    a: Recursive32
}

interface Recursive32 {
    b: Recursive32
    c: Recursive33
}

interface Recursive33 {
    d: Recursive31
}

interface ComposeWithRecursive {
    t: Recursive33
}

interface WithAnonymous {
    t: {
        another: boolean;
        prop: number;
    }
}
