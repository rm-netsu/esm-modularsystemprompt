export interface ComposerOptions {
	model?: string
	maxTokens?: number
	temperature?: number
	systemPrompt?: string
}

export interface ComposerResponse {
	activate: string[]
	deactivate: string[]
	reasoning?: string
}

export type ComposerAnalyzePromptFn = ($: {
	blocks: string
	conversation: string
}) => string

export type ConversationSliceFormatFn = (conversation: ChatMessage[]) => string

export interface ComposerAnalyzeOptions {
	blocks: Map<string, BlockDefinition>
	activeKeys: Set<string>
	conversation: ChatMessage[]
	promptFn: ComposerAnalyzePromptFn
	conversationSliceFormatFn?: ConversationSliceFormatFn
}
