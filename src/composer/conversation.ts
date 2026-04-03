import type { ChatMessage } from '@rm-netsu/esm-chatcompletions-client'
import { capitalize } from '../utilities.js'

export const getConversationFormatedSlice = (conversation: ChatMessage[]) =>
	conversation
		.slice(-10)
		.map((msg) => {
			const role = capitalize(msg.role)
			const content =
				typeof msg.content === 'string' ? msg.content : '[multimodal]'
			return `${role}: ${content}`
		})
		.join('\n')
