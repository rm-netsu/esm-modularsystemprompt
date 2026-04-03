import type { Element } from '@xmldom/xmldom'
import type { BlockDefinition } from '../block/interface.js'
import { parseBlockFromElement } from '../block/xml.parsing.js'
import type {
	ImportedBlock,
	ModuleDefinition,
	ModuleImport,
	ModuleMetadata,
} from './interface.js'

const parseBlocks = (root: Element) => {
	const blocks = new Map<string, BlockDefinition>()
	const blockOrder: string[] = []

	for (const blockElement of root.getElementsByTagName('block')) {
		if (blockElement.parentElement !== root) continue
		const block = parseBlockFromElement(blockElement)
		if (!block) continue

		blocks.set(block.key, block)
		blockOrder.push(block.key)
	}

	return { blocks, blockOrder }
}

const parseImportedBlocks = (importElement: Element): ImportedBlock[] => {
	const blocks: ImportedBlock[] = []

	for (const blockElement of importElement.getElementsByTagName('block')) {
		const originalKey = blockElement.getAttribute('key')
		if (!originalKey) continue

		const alias = blockElement.getAttribute('as') || originalKey
		blocks.push({ originalKey, alias })
	}

	return blocks
}

const parseImports = (root: Element): ModuleImport[] => {
	const imports: ModuleImport[] = []

	for (const importElement of root.getElementsByTagName('import')) {
		const url = importElement.getAttribute('url')
		if (!url) continue

		const blocks = parseImportedBlocks(importElement)

		imports.push({ url, blocks })
	}

	return imports
}

export const parseModuleFromDocument = (
	root: Element,
	sourceUrl?: string,
): ModuleDefinition | undefined => {
	const metadata: ModuleMetadata = {
		name: root.getAttribute('name') || 'Unnamed',
		version: root.getAttribute('version') || undefined,
		createdAt: root.getAttribute('created-at') || undefined,
		updatedAt: root.getAttribute('updated-at') || undefined,
	}

	const { blocks, blockOrder } = parseBlocks(root)
	const imports = parseImports(root)

	return {
		metadata,
		blocks,
		blockOrder,
		imports,
		sourceUrl,
	}
}
