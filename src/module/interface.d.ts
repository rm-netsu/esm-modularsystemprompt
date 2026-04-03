import type { BlockDefinition } from '../block/interface.js'

export interface ModuleMetadata {
	name: string
	version?: string
	createdAt?: string
	updatedAt?: string
}

export interface ImportedBlock {
	originalKey: string
	alias: string
}

export interface ModuleImport {
	url: string
	blocks: ImportedBlock[]
}

export interface ModuleDefinition {
	metadata: ModuleMetadata
	blocks: Map<string, BlockDefinition>
	blockOrder: string[]
	imports: ModuleImport[]
	sourceUrl?: string
}

export type FileLoaderFn = (url: string) => Promise<string>

export interface ModuleLoadOptions {
	fileLoader?: FileLoaderFn
	baseUrl?: string
}
