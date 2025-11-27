import { setIcon, MarkdownRenderer, App, Component } from 'obsidian';
import { ConnectionStatus } from './websocket';
import { Message, ContentBlock } from './types';

export function createButton(
	container: HTMLElement,
	icon: string,
	text: string,
	title: string,
	onClick: () => void
): HTMLElement {
	const button = container.createEl('button');
	button.style.display = 'flex';
	button.style.alignItems = 'center';
	button.style.gap = '6px';
	button.style.padding = '6px 12px';
	button.style.cursor = 'pointer';
	button.style.borderRadius = '5px';
	button.title = title;
	setIcon(button, icon);
	if (text) {
		button.createSpan({ text });
	}
	button.addEventListener('click', onClick);
	return button;
}

export function createIconButton(
	container: HTMLElement,
	icon: string,
	title: string,
	onClick: () => void
): HTMLElement {
	const button = container.createEl('button');
	button.style.display = 'flex';
	button.style.alignItems = 'center';
	button.style.gap = '6px';
	button.style.padding = '6px 10px';
	button.style.cursor = 'pointer';
	button.style.borderRadius = '5px';
	button.title = title;
	setIcon(button, icon);
	button.addEventListener('click', onClick);
	return button;
}

export function createMessageFrame(
	container: HTMLElement,
	label: string,
	isUser: boolean
): { frame: HTMLElement; content: HTMLElement } {
	const frame = container.createEl('div');
	frame.style.marginBottom = '12px';
	frame.style.padding = '10px';
	frame.style.borderRadius = '8px';
	frame.style.backgroundColor = isUser ? 'var(--background-secondary)' : 'var(--background-primary-alt)';
	frame.style.border = '1px solid var(--background-modifier-border)';
	frame.style.maxWidth = '85%';
	frame.style.userSelect = 'text';
	frame.style.cursor = 'text';
	
	if (isUser) {
		frame.style.marginLeft = 'auto';
	}
	
	const labelEl = frame.createEl('div', { text: label });
	labelEl.style.fontSize = '0.85em';
	labelEl.style.fontWeight = 'bold';
	labelEl.style.marginBottom = '4px';
	labelEl.style.color = isUser ? 'var(--text-muted)' : 'var(--text-accent)';
	
	const content = frame.createEl('div');
	content.style.color = 'var(--text-normal)';
	content.style.userSelect = 'text';
	
	// Only apply whitespace styling for user messages to preserve newlines
	if (isUser) {
		content.style.whiteSpace = 'pre-wrap';
		content.style.wordBreak = 'break-word';
	}
	
	return { frame, content };
}

export function createErrorMessage(
	container: HTMLElement,
	errorText: string
): void {
	const { frame, content } = createMessageFrame(container, 'Error', false);
	frame.style.border = '1px solid var(--color-red)';
	content.style.color = 'var(--text-error)';
	content.textContent = errorText;
}

export function extractTextFromContent(content: string | ContentBlock[]): string {
	if (typeof content === 'string') {
		return content;
	}
	
	if (Array.isArray(content)) {
		return content
			.filter(block => block.type === 'text' && block.text)
			.map(block => block.text)
			.join('');
	}
	
	return '';
}

export function renderMarkdownMessage(
	app: App,
	component: Component,
	container: HTMLElement,
	message: Message,
	isUser: boolean
): void {
	const label = isUser ? 'You' : 'Agent';
	const { content } = createMessageFrame(container, label, isUser);
	
	const text = extractTextFromContent(message.content);
	
	if (isUser) {
		content.textContent = text;
	} else {
		MarkdownRenderer.render(app, text, content, '', component);
	}
}

export function updateConnectionStatusUI(
	sendButton: HTMLElement,
	status: ConnectionStatus
): void {
	const statusConfig: Record<ConnectionStatus, { color: string; title: string }> = {
		connecting: { color: '#ff9800', title: 'Connecting to server...' },
		connected: { color: '#4caf50', title: 'Connected' },
		disconnected: { color: '#9e9e9e', title: 'Disconnected' },
		reconnecting: { color: '#ff9800', title: 'Reconnecting...' },
		error: { color: '#f44336', title: 'Connection error' },
		failed: { color: '#f44336', title: 'Connection failed' }
	};

	const config = statusConfig[status] || statusConfig.error;
	sendButton.style.color = config.color;
	sendButton.title = `${config.title} - Click to send message`;
}
