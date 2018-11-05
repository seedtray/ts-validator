import {checkArgument, checkNotNil} from './errors'

export function unindent(s: string): string {
    const lines = s.split('\n').slice(1)
    checkArgument('s', lines.length > 1)
    const indentationLevel = checkNotNil(lines[0].match(/^[ ]+/))[0].length
    const unindented = lines.map(line => line.slice(indentationLevel)).join('\n')
    return unindented
}
