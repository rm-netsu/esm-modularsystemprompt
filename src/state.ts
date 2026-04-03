import type { BlockDefinition } from './block/index.js'
import { canActivate, getMissingDependencies } from './block/index.js'
import type { StateChangeReport } from './types.js'

export class BlockStateManager {
	#definitions: Map<string, BlockDefinition>
	#active: Set<string>
	#order: string[]
	#metadata: { name: string }

	constructor(context: {
		metadata: { name: string }
		blocks: Map<string, BlockDefinition>
		blockOrder: string[]
	}) {
		this.#definitions = context.blocks
		this.#order = context.blockOrder
		this.#metadata = context.metadata
		this.#active = new Set()

		for (const [key, def] of this.#definitions)
			if (def.type === 'persistent') this.#active.add(key)
	}

	getActiveKeys() {
		return new Set(this.#active)
	}

	isActive(key: string): boolean {
		return this.#active.has(key)
	}

	canActivate(key: string): boolean {
		return canActivate(this.#definitions.get(key), this.#active)
	}

	getMissingDependencies(key: string): string[] {
		return getMissingDependencies(this.#definitions.get(key), this.#active)
	}

	#report($: Partial<StateChangeReport> = {}) {
		return {
			activated: $.activated ?? [],
			deactivated: $.deactivated ?? [],
			errors: $.errors ?? [],
			timestamp: $.timestamp ?? Date.now(),
		}
	}

	setActive(key: string, active: boolean): StateChangeReport {
		const def = this.#definitions.get(key)
		if (!def) return this.#report({ errors: [`Block not found: ${key}`] })

		if (def.type === 'persistent' && !active)
			return this.#report({
				errors: [`Cannot deactivate persistent block: ${key}`],
			})

		if (active && !this.canActivate(key))
			return this.#report({
				errors: [
					`Cannot activate ${key}: missing dependencies: ${this.getMissingDependencies(key).join(', ')}`,
				],
			})

		const wasActive = this.#active.has(key)
		if (wasActive === active) return this.#report()
		if (active) {
			this.#active.add(key)
			return this.#report({ activated: [key] })
		}

		const report = this.#report()
		this.#active.delete(key)
		report.deactivated.push(key)

		for (const dep of this.#getDependentBlocks(key))
			if (this.#active.has(dep) && !this.canActivate(dep)) {
				const depReport = this.setActive(dep, false)
				report.deactivated.push(...depReport.deactivated)
				if (depReport.errors.length)
					report.errors.push(...depReport.errors)
			}

		return report
	}

	#getDependentBlocks(key: string) {
		return this.#definitions
			.values()
			.filter((def) => def.requires.includes(key))
			.map((def) => def.key)
	}

	getCandidateBlocks() {
		return this.#definitions
			.values()
			.filter(
				(def) =>
					def.type !== 'persistent' &&
					!this.#active.has(def.key) &&
					this.canActivate(def.key),
			)
			.map((def) => def.key)
	}

	assemblePrompt(separator = '\n\n'): string {
		return this.#order
			.filter((key) => this.#active.has(key))
			.map((key) => this.#definitions.get(key)?.content)
			.filter(Boolean)
			.join(separator)
	}

	getMetadata() {
		return this.#metadata
	}

	getBlockDefinition(key: string): BlockDefinition | undefined {
		return this.#definitions.get(key)
	}

	getAllBlockDefinitions(): Map<string, BlockDefinition> {
		return new Map(this.#definitions)
	}

	reset(): void {
		for (const [key, def] of this.#definitions)
			if (def.type !== 'persistent') this.#active.delete(key)
	}

	getDebugInfo() {
		return {
			metadata: this.#metadata,
			active: Array.from(this.#active),
			blocks: Array.from(this.#definitions.entries()).map(
				([key, def]) => ({
					key,
					type: def.type,
					requires: def.requires,
					isActive: this.#active.has(key),
				}),
			),
			assembledPrompt: this.assemblePrompt(),
		}
	}
}
