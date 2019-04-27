/**
 * Utilities for tests.
 */
import {checkArgument, checkNotNil, isNil} from './errors'

function isSpaces(s: string): boolean {
    return !isNil(s.match(/^ *$/))
}

function first<T>(arr: T[]): T {
    return arr[0]
}

function last<T>(arr: T[]): T {
    return arr[arr.length - 1]
}

/**
 * Given a multiline string, unindent all lines according to the first line indentation level.
 * Also, if either the first or last lines are spaces only, discard them and consider the other
 * lines for indentation.
 */
export function unindent(text: string): string {
    const lines = text.split('\n')
    const withoutLeadingEmptyLines = isSpaces(first(lines)) ? lines.slice(1) : lines.slice(0)
    const toUnindent = isSpaces(last(withoutLeadingEmptyLines)) ?
        withoutLeadingEmptyLines.slice(0, -1) : withoutLeadingEmptyLines
    const indentationLevel = checkNotNil(toUnindent[0].match(/^[ ]*/))[0].length
    const trimWhitespace = new RegExp(`^ {0,${indentationLevel}}`)

    return toUnindent.map(line => line.replace(trimWhitespace, '')).join('\n')
}
