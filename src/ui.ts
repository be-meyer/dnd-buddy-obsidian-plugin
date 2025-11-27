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
	button.addClass('dnd-buddy-button');
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
	button.addClass('dnd-buddy-icon-button');
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
	frame.addClass('dnd-buddy-message');
	frame.addClass(isUser ? 'dnd-buddy-message-user' : 'dnd-buddy-message-agent');
	
	const headerEl = frame.createEl('div');
	headerEl.addClass('dnd-buddy-message-header');
	
	const labelEl = headerEl.createEl('div', { text: label });
	labelEl.addClass('dnd-buddy-message-label');
	labelEl.addClass(isUser ? 'dnd-buddy-message-label-user' : 'dnd-buddy-message-label-agent');
	
	const timeEl = headerEl.createEl('div');
	timeEl.addClass('dnd-buddy-message-time');
	timeEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	
	const content = frame.createEl('div');
	content.addClass('dnd-buddy-message-content');
	
	return { frame, content };
}

export function createErrorMessage(
	container: HTMLElement,
	errorText: string
): void {
	const { frame, content } = createMessageFrame(container, 'Error', false);
	frame.addClass('dnd-buddy-message-error');
	content.addClass('dnd-buddy-message-content-error');
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
