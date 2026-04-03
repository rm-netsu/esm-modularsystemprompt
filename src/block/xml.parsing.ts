import type { Element } from '@xmldom/xmldom'
import { getTextFromElement } from '../utilities.js'
import type { BlockDefinition } from './interface.js'

export interface BlockDefinitionXml {
	type?: string
	key?: string
	activation?: string | Element
	deactivation?: string | Element
	requires?: string
	content?: string | Element
}

export const parseBlockFromElement = (
	element: Element,
): BlockDefinition | undefined => {
	const type =
		element.getAttribute('type') === 'persistent'
			? 'persistent'
			: 'transient'

	const key = element.getAttribute('key')
	if (!key) return

	const content = getTextFromElement(
		element.getElementsByTagName('content')[0],
	)
	if (!content) return

	const activationPrompt =
		getTextFromElement(element.getElementsByTagName('activation')[0]) ??
		(type === 'persistent' ? '' : `Should block "${key}" be active?`)

	const deactivationPrompt =
		getTextFromElement(element.getElementsByTagName('deactivation')[0]) ??
		(type === 'persistent' ? '' : `Should block "${key}" be deactivated?`)

	const requiresAttr = element.getAttribute('requires') || ''
	const requires = requiresAttr.split(/\s+/).filter(Boolean)

	return {
		key,
		type,
		activationPrompt,
		deactivationPrompt,
		content,
		requires,
	}
}
