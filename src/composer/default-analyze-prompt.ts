import type { ComposerAnalyzePromptFn } from './interface.js'

export const defaultAnalyzePromptFn =
	(preamble: string): ComposerAnalyzePromptFn =>
	({ blocks, conversation }) =>
		`${preamble}

Manageable blocks (with activation/deactivation conditions):
${blocks}

Recent conversation:
${conversation || 'No conversation yet'}

Based on the conversation, which blocks should be activated or deactivated?`
