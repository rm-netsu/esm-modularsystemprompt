import { resilientJsonParse } from '../utilities.js'
import type { ComposerResponse } from './interface.js'

export const parseResponse = (text: string): ComposerResponse => {
	try {
		const parsed = resilientJsonParse(text) as {
			activate: string[]
			deactivate: string[]
			reasoning: string
		}
		return {
			activate: Array.isArray(parsed.activate) ? parsed.activate : [],
			deactivate: Array.isArray(parsed.deactivate)
				? parsed.deactivate
				: [],
			reasoning: parsed.reasoning,
		}
	} catch {
		return { activate: [], deactivate: [] }
	}
}

export const sanitizeResponse = (
	response: ComposerResponse,
	validKeys: Set<string>,
): ComposerResponse => ({
	activate: response.activate.filter((k) => validKeys.has(k)),
	deactivate: response.deactivate.filter((k) => validKeys.has(k)),
	reasoning: response.reasoning,
})
