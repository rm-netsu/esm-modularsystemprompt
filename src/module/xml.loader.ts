import { DOMParser } from '@xmldom/xmldom'
import type { BlockDefinition } from '../block/interface.js'
import type {
	FileLoaderFn,
	ImportedBlock,
	ModuleDefinition,
	ModuleImport,
	ModuleLoadOptions,
} from './interface.js'
import { parseModuleFromDocument } from './xml.parsing.js'

const fetchBlocks = (module: ModuleDefinition, importDecl: ModuleImport) =>
	importDecl.blocks.length === 0
		? Array.from(module.blocks.entries())
		: importDecl.blocks.map((spec: ImportedBlock) => {
				const originalBlock = module.blocks.get(spec.originalKey)
				if (!originalBlock)
					throw new Error(
						`Block "${spec.originalKey}" not found in module "${importDecl.url}"`,
					)

				return [spec.alias, { ...originalBlock, key: spec.alias }] as [
					string,
					BlockDefinition,
				]
			})

const resolveImports = async (
	module: ModuleDefinition,
	fileLoader: FileLoaderFn,
	visited: Set<string> = new Set(),
	baseUrl?: string,
): Promise<Map<string, BlockDefinition>> => {
	const currentUrl = module.sourceUrl || baseUrl
	const allBlocks = new Map(module.blocks)

	for (const importDecl of module.imports) {
		const targetUrl = currentUrl
			? new URL(importDecl.url, currentUrl).href
			: importDecl.url

		if (visited.has(targetUrl)) {
			console.warn(`Circular import detected: ${targetUrl}`)
			continue
		}
		visited.add(targetUrl)

		const importedXml = await fileLoader(targetUrl)
		const importedModule = await loadModuleFromXml(importedXml, {
			fileLoader,
			baseUrl: targetUrl,
		})

		// const nestedBlocks = await resolveImports(
		// 	importedModule,
		// 	fileLoader,
		// 	visited,
		// 	targetUrl,
		// )

		// for (const [key, block] of nestedBlocks)
		// 	if (!allBlocks.has(key)) allBlocks.set(key, block)

		const blocksToImport = fetchBlocks(importedModule, importDecl)

		for (const [key, block] of blocksToImport) {
			if (allBlocks.has(key)) {
				console.log({ allBlocks, blocksToImport })
				throw new Error(
					`Block alias "${key}" already exists in current module (conflict with import from "${importDecl.url}")`,
				)
			}

			allBlocks.set(key, block)
		}
	}

	return allBlocks
}

export const loadModuleFromXml = async (
	xml: string,
	options?: ModuleLoadOptions,
): Promise<ModuleDefinition> => {
	const parser = new DOMParser()
	const doc = parser.parseFromString(xml, 'text/xml')

	const parserError = doc.getElementsByTagName('parsererror')
	if (parserError.length > 0) {
		const errorMsg = parserError[0].textContent || 'Unknown parsing error'
		throw new Error(`XML parsing failed: ${errorMsg}`)
	}

	const root = doc.documentElement
	if (!root) throw new Error('XML document has no root element')

	const module = parseModuleFromDocument(root, options?.baseUrl)
	if (!module) throw new Error('Failed to parse module from XML')

	if (!options?.fileLoader) return module

	const allBlocks = await resolveImports(
		module,
		options.fileLoader,
		new Set(),
		options.baseUrl,
	)

	const blockOrder = Array.from(allBlocks.keys())

	return {
		...module,
		blocks: allBlocks,
		blockOrder,
	}
}
