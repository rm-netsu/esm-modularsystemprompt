import type { Element } from '@xmldom/xmldom'
import { Node } from '@xmldom/xmldom'

export const getTextFromElement = (element?: Element): string | undefined => {
	if (!element) return

	let text = ''
	for (const node of element.childNodes) {
		if (
			node.nodeType !== Node.TEXT_NODE &&
			node.nodeType !== Node.CDATA_SECTION_NODE
		)
			continue

		text += node.nodeValue || ''
	}

	return text.trim() || undefined
}

export const resilientJsonParse = (input: string): unknown => {
	if (!input) throw new Error('Empty input')

	let clean = input
		.replace(/```json\n?/g, '')
		.replace(/```\n?/g, '')
		.trim()

	const firstBrace = clean.search(/[{[]/)
	const lastBrace = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'))
	if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace)
		clean = clean.slice(firstBrace, lastBrace + 1)

	// biome-ignore lint/suspicious/noControlCharactersInRegex: <its a regex for removing control characters>
	clean = clean.replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
		if (match === '\n' || match === '\r' || match === '\t') return match
		return ''
	})
	try {
		return JSON.parse(clean)
	} catch (error) {
		throw new Error(
			`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
		)
	}
}

export const capitalize = (input: string): string =>
	input[0].toUpperCase() + input.slice(1)
