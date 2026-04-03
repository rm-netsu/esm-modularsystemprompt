export interface BlockDefinition {
	key: string
	type: 'persistent' | 'transient'
	activationPrompt: string
	deactivationPrompt: string
	content: string
	requires: string[]
}

export type BlockDefinitionFormatFn = (
	def: BlockDefinition,
	isActive: boolean,
) => string
