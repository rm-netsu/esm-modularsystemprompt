import type {
	ChatCompletionsClient,
	ChatMessage,
} from '@rm-netsu/esm-chatcompletions-client'
import type { BlockDefinition } from './block/interface.js'
import type {
	ComposerAnalyzePromptFn,
	ComposerOptions,
	ComposerResponse,
} from './composer/index.js'
import {
	ContextComposer,
	defaultAnalyzePromptFn,
	sanitizeResponse,
} from './composer/index.js'
import type { ModuleDefinition, ModuleLoadOptions } from './module/index.js'
import { loadModuleFromXml } from './module/index.js'
import { BlockStateManager } from './state.js'
import type { StateChangeReport } from './types.js'

export class SystemPromptManager {
	#state: BlockStateManager
	#chatClient?: ChatCompletionsClient
	#composerOptions?: ComposerOptions

	constructor(
		context: ModuleDefinition,
		chatClient?: ChatCompletionsClient,
		composerOptions?: ComposerOptions,
	) {
		this.#state = new BlockStateManager(context)
		this.#chatClient = chatClient
		this.#composerOptions = composerOptions
	}

	static async fromXml(
		xml: string,
		chatClient?: ChatCompletionsClient,
		options?: {
			composerOptions?: ComposerOptions
			loadOptions?: ModuleLoadOptions
		},
	): Promise<SystemPromptManager> {
		const context = await loadModuleFromXml(xml, options?.loadOptions)
		return new SystemPromptManager(
			context,
			chatClient,
			options?.composerOptions,
		)
	}

	/** Get or create a context composer instance */
	#getComposer(): ContextComposer | undefined {
		if (!this.#chatClient) return undefined
		return new ContextComposer(this.#chatClient, this.#composerOptions)
	}

	#report($: Partial<StateChangeReport> = {}) {
		return {
			activated: $.activated ?? [],
			deactivated: $.deactivated ?? [],
			errors: $.errors ?? [],
			timestamp: $.timestamp ?? Date.now(),
		}
	}

	#mergeReport(target: StateChangeReport, source: StateChangeReport) {
		target.activated.push(...source.activated)
		target.deactivated.push(...source.deactivated)
		target.errors.push(...source.errors)

		target.activated = [...new Set(target.activated)]
		target.deactivated = [...new Set(target.deactivated)]
		target.errors = [...new Set(target.errors)]

		return target
	}

	#applyComposerResponse(response: ComposerResponse, validKeys: Set<string>) {
		const sanitized = sanitizeResponse(response, validKeys)
		const report = this.#report()

		for (const key of sanitized.deactivate)
			this.#mergeReport(report, this.#state.setActive(key, false))

		for (const key of sanitized.activate)
			this.#mergeReport(report, this.#state.setActive(key, true))

		return report
	}

	#getCandidateBlocks(candidateKeys: Iterable<string>) {
		const allDefinitions = this.#state.getAllBlockDefinitions()

		const filteredBlocks = new Map<string, BlockDefinition>()
		for (const key of candidateKeys) {
			const def = allDefinitions.get(key)
			if (def && def.type !== 'persistent') filteredBlocks.set(key, def)
		}
		return filteredBlocks
	}

	/**
	 * Update block states based on conversation using the default context composer.
	 * Performs iterative evaluation up to maxDepth steps, allowing cascade activation.
	 */
	async updateState(
		conversation: ChatMessage[],
		maxDepth: number = 3,
		analyzePromptFn?: ComposerAnalyzePromptFn,
	): Promise<StateChangeReport> {
		const composer = this.#getComposer()
		if (!composer)
			return this.#report({
				errors: [
					'No context composer available (chat client not provided)',
				],
			})

		return this.updateStateWithComposer(
			(
				blocks: Map<string, BlockDefinition>,
				activeKeys: Set<string>,
				conversation: ChatMessage[],
			) =>
				composer.analyze({
					blocks,
					activeKeys,
					conversation,
					promptFn:
						analyzePromptFn ??
						defaultAnalyzePromptFn(
							`Current character: ${this.#state.getMetadata().name}`,
						),
				}),
			conversation,
			maxDepth,
		)
	}

	/**
	 * Update state using a custom composer function.
	 * This allows you to provide your own logic for determining block state changes.
	 *
	 * @param composerFn - Custom function that analyzes blocks and returns activation/deactivation decisions
	 * @param conversation - The conversation history to analyze
	 * @param maxDepth - Maximum number of cascade iterations (default: 3)
	 */
	async updateStateWithComposer(
		composerFn: (
			blocks: Map<string, BlockDefinition>,
			activeKeys: Set<string>,
			conversation: ChatMessage[],
			metadata: { name: string },
		) => Promise<ComposerResponse>,
		conversation: ChatMessage[],
		maxDepth: number = 3,
	): Promise<StateChangeReport> {
		const fullReport = this.#report()

		for (let i = 0; i < maxDepth; ++i) {
			const evaluableKeys = this.#state.getCandidateBlocks()
			const activeKeys = this.#state.getActiveKeys()

			const candidateKeys =
				i > 0
					? new Set(evaluableKeys) // Exclude already active to avoid flickering
					: new Set([...evaluableKeys, ...activeKeys])

			const filteredBlocks = this.#getCandidateBlocks(candidateKeys)
			if (filteredBlocks.size === 0) break

			const stepReport = this.#applyComposerResponse(
				await composerFn(
					filteredBlocks,
					activeKeys,
					conversation,
					this.#state.getMetadata(),
				),
				candidateKeys,
			)
			this.#mergeReport(fullReport, stepReport)

			if (stepReport.activated.length === 0) break
		}

		return fullReport
	}

	// Manual control methods
	setActive(key: string, active: boolean): StateChangeReport {
		return this.#state.setActive(key, active)
	}

	activate(keys: string[]): StateChangeReport {
		return keys.reduce(
			(report, key) =>
				this.#mergeReport(report, this.#state.setActive(key, true)),
			this.#report(),
		)
	}

	deactivate(keys: string[]): StateChangeReport {
		return keys.reduce(
			(report, key) =>
				this.#mergeReport(report, this.#state.setActive(key, false)),
			this.#report(),
		)
	}

	getSystemPrompt(): string {
		return this.#state.assemblePrompt()
	}

	getActiveBlocks() {
		return this.#state.getActiveKeys()
	}

	isBlockActive(key: string): boolean {
		return this.#state.isActive(key)
	}

	getBlockDefinition(key: string): BlockDefinition | undefined {
		return this.#state.getBlockDefinition(key)
	}

	getEvaluableBlocks(): string[] {
		return this.#state.getCandidateBlocks().toArray()
	}

	getMissingDependencies(key: string): string[] {
		return this.#state.getMissingDependencies(key)
	}

	reset(): void {
		this.#state.reset()
	}

	getDebugInfo() {
		return this.#state.getDebugInfo()
	}

	getMetadata() {
		return this.#state.getMetadata()
	}

	/** Update the chat client at runtime */
	setChatClient(
		chatClient: ChatCompletionsClient,
		composerOptions?: ComposerOptions,
	): void {
		this.#chatClient = chatClient
		if (composerOptions !== undefined)
			this.#composerOptions = composerOptions
	}

	/** Update composer options at runtime */
	setComposerOptions(composerOptions: ComposerOptions): void {
		this.#composerOptions = composerOptions
	}
}

export { ContextComposer } from './composer/index.js'
export * from './module/index.js'
export type * from './types.js'
