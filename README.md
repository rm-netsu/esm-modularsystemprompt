# ESM Modular System Prompt

A lightweight, ESM-only TypeScript library for managing modular system prompts with dynamic state tracking, dependency chains, and context-aware activation.

## Installation

Add to `.npmrc` to use the package from GitHub:
```
@rm-netsu:registry=https://npm.pkg.github.com
```

Install with npm:
```bash
npm install @rm-netsu/esm-modularsystemprompt
```

## Usage example

### 1. Define a module in XML

Create `knight.xml`. Note the use of `type="persistent"` for base content and `requires` for dependency logic.

```xml
<module name="Sir Cedric" version="1.0">
	<block key="base-identity" type="persistent">
		<content><![CDATA[
You are roleplaying as **Sir Cedric**, a noble knight.
Core traits: Brave, honorable, speaks in formal English.
		]]></content>
	</block>

	<block key="combat-mode">
		<activation>Is Sir Cedric currently in combat or facing a direct threat?</activation>
		<deactivation>Has the combat situation ended and is Sir Cedric safe?</deactivation>
		<content><![CDATA[
Sir Cedric draws his sword and speaks with grim determination.
		]]></content>
	</block>

	<block key="melee-combat" requires="combat-mode">
		<activation>Is Sir Cedric engaged in close-quarters sword fighting?</activation>
		<content><![CDATA[
In melee range, Sir Cedric's footwork becomes agile, sword flashing in wide arcs.
		]]></content>
	</block>

	<block key="wounded" requires="-combat-mode">
		<activation>Is Sir Cedric wounded or recovering from battle while out of danger?</activation>
		<content><![CDATA[
Sir Cedric clutches his side, blood seeping through his armor. "I shall endure."
		]]></content>
	</block>
</module>
```

### 2. Initialize the manager

```typescript
import { SystemPromptManager } from '@rm-netsu/esm-modularsystemprompt'
import { ChatCompletionsClient } from '@rm-netsu/esm-chatcompletions-client'

const client = new ChatCompletionsClient({ apiKey: '...' })

// Load from XML string
const xml = `...` 
const manager = await SystemPromptManager.fromXml(xml, client, {
	composerOptions: {
		model: 'gpt-4o',
		temperature: 0.2
	}
})

// Update state based on conversation
// maxDepth: 3 allows cascading activations (e.g., combat-mode -> melee-combat)
const conversation = [{ role: 'user', content: 'An orc attacks you with an axe!' }]
const report = await manager.updateState(conversation, 3)

console.log(report.activated) // ['combat-mode', 'melee-combat']

// Get the final concatenated prompt
const finalSystemPrompt = manager.getSystemPrompt()
```

### 3. Manual state control

```typescript
// Manually activate a block (returns a report with triggered dependencies)
manager.activate(['combat-mode'])

// Check status
if (manager.isBlockActive('combat-mode')) {
	console.log("To arms!")
}

// Deactivating a block automatically deactivates all blocks that depend on it
manager.deactivate(['combat-mode']) 

// Reset all non-persistent blocks
manager.reset()
```

### 4. Modular imports

You can split your prompts into multiple files and import them.

```xml
<module name="Advanced Character">
	<import url="./skills.xml">
		<block key="sword-mastery" as="blade-skill" />
	</import>
	
	<import url="./emotions.xml" />
</module>
```

```typescript
const manager = await SystemPromptManager.fromXml(xml, client, {
	loadOptions: {
		fileLoader: async (url) => {
			const response = await fetch(url)
			return await response.text()
		},
		baseUrl: 'https://my-cdn.com/prompts/'
	}
})
```

## XML schema reference

### `<module>` attributes
- `name`: Identifier for the character/system.
- `version`, `created-at`, `updated-at`: Metadata fields.

### `<block>` attributes
- `key` (required): Unique identifier.
- `type`: 
	- `transient` (default): Can be toggled.
	- `persistent`: Always active.
- `requires`: Space-separated keys. 
	- `key`: Block must be active.
	- `-key`: Block must be inactive.

### `<block>` elements
- `<content>` (required): The actual text added to the system prompt.
- `<activation>`: Guidance for the LLM on when to enable this block.
- `<deactivation>`: Guidance for the LLM on when to disable this block.

## How it works (cascading logic)

The library uses a dependency graph. 
1. If a block is **deactivated**, all blocks requiring it are also **deactivated** recursively.
2. If a block is **activated**, the manager ensures all its requirements are met; otherwise, it throws an error (or reports a failure).
3. The `updateState` method performs iterative passes. If the AI activates "Combat Mode" in Pass 1, Pass 2 will evaluate blocks that require "Combat Mode", allowing deep state transitions in a single update call.

## Requirements

- **ESM only** (Node.js 18+, Bun, or Browser)
- **Peer dependency**: `@rm-netsu/esm-chatcompletions-client` (or a compatible interface)
- **XML parser**: Uses `@xmldom/xmldom` internally.
