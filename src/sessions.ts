import { App, Notice, Component, MarkdownRenderer } from 'obsidian';
import { ApiClient } from './api';
import { SessionData } from './types';
import { renderMarkdownMessage } from './ui';

export class SessionManager {
	constructor(
		private app: App,
		private apiClient: ApiClient,
		private component: Component
	) {}

	async showSessionList(
		container: Element,
		onSessionLoad: (sessionId: string) => void
	): Promise<void> {
		try {
			const sessions = await this.apiClient.fetchSessions();
			
			if (!sessions || sessions.length === 0) {
				new Notice('No previous sessions found');
				return;
			}
			
			const overlay = this.createSessionListOverlay(container, sessions, onSessionLoad);
			
		} catch (error) {
			new Notice(`Failed to load sessions: ${error.message}`);
		}
	}

	private createSessionListOverlay(
		container: Element,
		sessions: SessionData[],
		onSessionLoad: (sessionId: string) => void
	): HTMLElement {
		const overlay = container.createEl('div');
		overlay.style.position = 'absolute';
		overlay.style.top = '0';
		overlay.style.left = '0';
		overlay.style.right = '0';
		overlay.style.bottom = '0';
		overlay.style.backgroundColor = 'var(--background-primary)';
		overlay.style.zIndex = '1000';
		overlay.style.padding = '20px';
		overlay.style.overflowY = 'auto';
		
		const header = overlay.createEl('div');
		header.style.display = 'flex';
		header.style.justifyContent = 'space-between';
		header.style.alignItems = 'center';
		header.style.marginBottom = '20px';
		
		header.createEl('h3', { text: 'Load Previous Session' });
		
		const closeButton = header.createEl('button', { text: '✕' });
		closeButton.style.padding = '5px 10px';
		closeButton.style.cursor = 'pointer';
		closeButton.style.borderRadius = '5px';
		closeButton.addEventListener('click', () => overlay.remove());
		
		const sessionList = overlay.createEl('div');
		sessionList.style.display = 'flex';
		sessionList.style.flexDirection = 'column';
		sessionList.style.gap = '10px';
		
		for (const session of sessions) {
			this.createSessionItem(sessionList, session, overlay, onSessionLoad);
		}
		
		return overlay;
	}

	private createSessionItem(
		container: HTMLElement,
		session: SessionData,
		overlay: HTMLElement,
		onSessionLoad: (sessionId: string) => void
	): void {
		const sessionItem = container.createEl('div');
		sessionItem.addClass('dnd-buddy-session-item');
		
		sessionItem.addEventListener('mouseenter', () => {
			sessionItem.style.backgroundColor = 'var(--background-modifier-hover)';
		});
		
		sessionItem.addEventListener('mouseleave', () => {
			sessionItem.style.backgroundColor = 'var(--background-secondary)';
		});
		
		sessionItem.addEventListener('click', () => {
			overlay.remove();
			onSessionLoad(session.sessionId);
		});
		
		const sessionInfo = sessionItem.createEl('div');
		
		const sessionDate = sessionInfo.createEl('div');
		sessionDate.addClass('dnd-buddy-session-date');
		sessionDate.textContent = session.lastUpdated 
			? new Date(session.lastUpdated).toLocaleString() 
			: 'Unknown date';
		
		const sessionPreview = sessionInfo.createEl('div');
		sessionPreview.addClass('dnd-buddy-session-preview');
		
		if (session.preview) {
			MarkdownRenderer.render(
				this.app,
				session.preview,
				sessionPreview,
				'',
				this.component
			);
		} else {
			sessionPreview.textContent = 'No preview';
		}
		
		const sessionMeta = sessionInfo.createEl('div');
		sessionMeta.addClass('dnd-buddy-session-meta');
		sessionMeta.textContent = `${session.messageCount} messages`;
	}

	async loadSessionHistory(
		sessionId: string,
		chatOutput: HTMLElement
	): Promise<void> {
		try {
			new Notice('Loading session...');
			
			const sessionData = await this.apiClient.fetchSessionHistory(sessionId);
			
			if (!sessionData || !sessionData.messages) {
				new Notice('Failed to load session');
				return;
			}
			
			chatOutput.empty();
			
			for (const message of sessionData.messages) {
				const isUser = message.type === 'human';
				renderMarkdownMessage(this.app, this.component, chatOutput, message, isUser);
			}
			
			chatOutput.scrollTop = chatOutput.scrollHeight;
			new Notice(`Loaded session with ${sessionData.messageCount} messages`);
			
		} catch (error) {
			new Notice(`Failed to load session: ${error.message}`);
		}
	}
}
