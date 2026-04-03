import type { BlockDefinition, BlockDefinitionFormatFn } from './interface.js'

const parseRequirement = ($: string) => {
	const isNegative = $.startsWith('-')
	const targetKey = isNegative ? $.slice(1) : $

	return { isNegative, targetKey }
}

const checkRequirement = ($: string, activeKeys: Set<string>) => {
	const { isNegative, targetKey } = parseRequirement($)

	return activeKeys.has(targetKey) !== isNegative
}

export const canActivate = (
	def: BlockDefinition | undefined,
	activeKeys: Set<string>,
): boolean => {
	if (!def) return false

	for (const req of def.requires)
		if (!checkRequirement(req, activeKeys)) return false

	return true
}

export const getMissingDependencies = (
	def: BlockDefinition | undefined,
	activeKeys: Set<string>,
): string[] => {
	if (!def) return []

	const missing: string[] = []
	for (const req of def.requires)
		if (!checkRequirement(req, activeKeys)) missing.push(req)

	return missing
}

const defaultDefFormatFn: BlockDefinitionFormatFn = (
	def: BlockDefinition,
	isActive: boolean,
) =>
	`- ${def.key} (${isActive ? 'active' : 'inactive'}):\n  ${
		isActive
			? `Deactivation: ${def.deactivationPrompt}`
			: `Activation: ${def.activationPrompt}`
	}`

export const getManageableBlockList = (
	blocks: Iterable<BlockDefinition>,
	activeKeys: Set<string>,
	defFormatFn = defaultDefFormatFn,
	separator = '\n',
) => {
	return Array.from(blocks)
		.filter((def) => def.type !== 'persistent')
		.map((def) => defFormatFn(def, activeKeys.has(def.key)))
		.join(separator)
}
