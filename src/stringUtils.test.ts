import {unindent} from './stringUtils'

test('unindented string unaffected', () => {
    const unindented = 'hello'
    expect(unindent(unindented)).toEqual('hello')
})
test('removes first line if empty', () => {
    expect(unindent('\nhello')).toEqual('hello')
})
test('removes last line if empty', () => {
    expect(unindent('hello\n')).toEqual('hello')
})
test('removes first and last line if empty', () => {
    expect(unindent('\nhello\n')).toEqual('hello')
})

test('on 4 space indentation, removes 4 spaces from all lines', () => {
    expect(unindent(`
    hello
    world
    `)).toEqual('hello\nworld')
})

test('if a line has less indentation than the first one, remove found spaces', () => {
    expect(unindent(`
    hello
   world
    `)).toEqual('hello\nworld')
})

test('if a line has more indentation than the first one, up to spaces found in 1st line', () => {
    expect(unindent(`
    hello
     world
    `)).toEqual('hello\n world')
})
