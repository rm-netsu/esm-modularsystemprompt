import type {
	ChatCompletionsClient,
	ChatMessage,
} from '@rm-netsu/esm-chatcompletions-client'
import { getManageableBlockList } from '../block/index.js'
import { getConversationFormatedSlice } from './conversation.js'
import DEFAULT_SYSTEM_PROMPT from './default-system-prompt.md' with {
	type: 'text',
}
import type {
	ComposerAnalyzeOptions,
	ComposerOptions,
	ComposerResponse,
} from './interface.js'
import { parseResponse } from './response.js'

export class ContextComposer {
	#client: ChatCompletionsClient
	#options: Required<ComposerOptions>

	constructor(client: ChatCompletionsClient, options?: ComposerOptions) {
		this.#client = client
		this.#options = {
			model: options?.model ?? 'gpt-4o',
			maxTokens: options?.maxTokens ?? 512,
			temperature: options?.temperature ?? 0.2,
			systemPrompt: options?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
		}
	}

	async analyze({
		blocks,
		activeKeys,
		conversation,
		promptFn,
		conversationSliceFormatFn,
	}: ComposerAnalyzeOptions): Promise<ComposerResponse> {
		const prompt = promptFn({
			blocks: getManageableBlockList(blocks.values(), activeKeys),
			conversation: (
				conversationSliceFormatFn ?? getConversationFormatedSlice
			)(conversation),
		})

		const responseText = await this.#callChat(prompt)
		return parseResponse(responseText)
	}

	async #callChat(prompt: string): Promise<string> {
		const messages: ChatMessage[] = [
			{ role: 'system', content: this.#options.systemPrompt },
			{ role: 'user', content: prompt },
		]
		const response = await this.#client.createChatCompletion({
			model: this.#options.model,
			messages,
			max_tokens: this.#options.maxTokens,
			temperature: this.#options.temperature,
		})
		const content = response.choices[0]?.message?.content
		return typeof content === 'string' ? content : ''
	}
}
