import { ItemView, Notice, WorkspaceLeaf, MarkdownRenderer, Plugin } from 'obsidian';
import { VIEW_TYPE_SIDEBAR, AuthContext, WebSocketMessage, PluginSettings } from './types';
import { authenticateUser, completePasswordChange, checkExistingSession, generateSessionId, signOut } from './auth';
import { WebSocketManager, ConnectionStatus } from './websocket';
import { ApiClient } from './api';
import { IndexingManager } from './indexing';
import { SessionManager } from './sessions';
import { createButton, createIconButton, createMessageFrame, createErrorMessage, extractTextFromContent, updateConnectionStatusUI } from './ui';

export class SimpleSidebarView extends ItemView {
	plugin: Plugin & { settings: PluginSettings };
	authContext: AuthContext = {
		username: null,
		idToken: null
	};
	sessionId: string | null = null;
	wsManager: WebSocketManager | null = null;
	apiClient: ApiClient | null = null;
	indexingManager: IndexingManager | null = null;
	sessionManager: SessionManager | null = null;
	
	sendButtonEl: HTMLElement | null = null;
	chatOutputEl: HTMLElement | null = null;
	currentStreamingMessage: HTMLElement | null = null;
	currentStreamingContent: HTMLElement | null = null;
	currentLoadingMessage: HTMLElement | null = null;
	currentStreamingText: string = '';

	constructor(leaf: WorkspaceLeaf, plugin: Plugin & { settings: PluginSettings }) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE_SIDEBAR;
	}

	getDisplayText() {
		return 'DnD Buddy';
	}

	getIcon() {
		return 'bug';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('simple-sidebar-view');

		(container as HTMLElement).style.display = 'flex';
		(container as HTMLElement).style.flexDirection = 'column';
		(container as HTMLElement).style.height = '100%';
		(container as HTMLElement).style.padding = '10px';
		(container as HTMLElement).style.paddingBottom = '45px';

		if (!this.plugin.settings.userPoolId || !this.plugin.settings.clientId) {
			container.createEl('p', { text: 'Please configure Cognito settings in plugin settings.' });
			return;
		}

		await checkExistingSession(
			this.plugin.settings.clientId,
			this.plugin.settings.region,
			(idToken, username) => {
				this.authContext.idToken = idToken;
				this.authContext.username = username;
				if (!this.sessionId) {
					this.sessionId = generateSessionId(username);
				}
				this.showChatInterface(container);
			},
			() => this.showLoginForm(container)
		);
	}

	showLoginForm(container: Element) {
		container.empty();

		const loginContainer = container.createEl('div');
		loginContainer.style.padding = '20px';

		loginContainer.createEl('h3', { text: 'Login to Cognito' });

		const usernameInput = loginContainer.createEl('input');
		usernameInput.type = 'text';
		usernameInput.placeholder = 'Username';
		usernameInput.style.width = '100%';
		usernameInput.style.padding = '8px';
		usernameInput.style.marginBottom = '10px';
		usernameInput.style.borderRadius = '5px';

		const passwordInput = loginContainer.createEl('input');
		passwordInput.type = 'password';
		passwordInput.placeholder = 'Password';
		passwordInput.style.width = '100%';
		passwordInput.style.padding = '8px';
		passwordInput.style.marginBottom = '10px';
		passwordInput.style.borderRadius = '5px';

		const loginButton = loginContainer.createEl('button', { text: 'Login' });
		loginButton.style.width = '100%';
		loginButton.style.padding = '10px';
		loginButton.style.cursor = 'pointer';
		loginButton.style.borderRadius = '5px';

		const handleLogin = async () => {
			const username = usernameInput.value.trim();
			const password = passwordInput.value.trim();

			if (!username || !password) {
				new Notice('Please enter username and password');
				return;
			}

			await authenticateUser(
				username,
				password,
				this.plugin.settings.userPoolId,
				this.plugin.settings.clientId,
				this.plugin.settings.region,
				(idToken, sessionId) => {
					this.authContext.idToken = idToken;
					this.authContext.username = username;
					this.sessionId = sessionId;
					this.showChatInterface(container);
				},
				(session, username) => {
					this.showNewPasswordForm(container, session, username);
				}
			);
		};

		loginButton.addEventListener('click', handleLogin);
		passwordInput.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') handleLogin();
		});
	}

	showNewPasswordForm(container: Element, session: string, username: string) {
		container.empty();

		const formContainer = container.createEl('div');
		formContainer.style.padding = '20px';

		formContainer.createEl('h3', { text: 'Change Password Required' });
		formContainer.createEl('p', { text: 'You must change your password before continuing.' });

		const newPasswordInput = formContainer.createEl('input');
		newPasswordInput.type = 'password';
		newPasswordInput.placeholder = 'New Password';
		newPasswordInput.style.width = '100%';
		newPasswordInput.style.padding = '8px';
		newPasswordInput.style.marginBottom = '10px';
		newPasswordInput.style.borderRadius = '5px';

		const confirmPasswordInput = formContainer.createEl('input');
		confirmPasswordInput.type = 'password';
		confirmPasswordInput.placeholder = 'Confirm New Password';
		confirmPasswordInput.style.width = '100%';
		confirmPasswordInput.style.padding = '8px';
		confirmPasswordInput.style.marginBottom = '10px';
		confirmPasswordInput.style.borderRadius = '5px';

		const changeButton = formContainer.createEl('button', { text: 'Change Password' });
		changeButton.style.width = '100%';
		changeButton.style.padding = '10px';
		changeButton.style.cursor = 'pointer';
		changeButton.style.borderRadius = '5px';

		const handlePasswordChange = async () => {
			const newPassword = newPasswordInput.value.trim();
			const confirmPassword = confirmPasswordInput.value.trim();

			if (!newPassword || !confirmPassword) {
				new Notice('Please enter both password fields');
				return;
			}

			if (newPassword !== confirmPassword) {
				new Notice('Passwords do not match');
				return;
			}

			if (newPassword.length < 8) {
				new Notice('Password must be at least 8 characters');
				return;
			}

			await completePasswordChange(
				newPassword,
				session,
				username,
				this.plugin.settings.clientId,
				this.plugin.settings.region,
				(idToken, sessionId) => {
					this.authContext.idToken = idToken;
					this.authContext.username = username;
					this.sessionId = sessionId;
					this.showChatInterface(container);
				}
			);
		};

		changeButton.addEventListener('click', handlePasswordChange);
		confirmPasswordInput.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') handlePasswordChange();
		});
	}

	showChatInterface(container: Element) {
		container.empty();

		this.initializeManagers();

		const buttonContainer = container.createEl('div');
		buttonContainer.style.display = 'flex';
		buttonContainer.style.flexWrap = 'wrap';
		buttonContainer.style.marginBottom = '10px';
		buttonContainer.style.gap = '5px';

		this.createToolbarButtons(buttonContainer, container);

		this.chatOutputEl = container.createEl('div');
		this.chatOutputEl.style.flex = '1';
		this.chatOutputEl.style.overflowY = 'auto';
		this.chatOutputEl.style.border = '1px solid var(--background-modifier-border)';
		this.chatOutputEl.style.padding = '10px';
		this.chatOutputEl.style.marginBottom = '10px';
		this.chatOutputEl.style.borderRadius = '5px';
		this.chatOutputEl.style.userSelect = 'text';
		this.chatOutputEl.style.cursor = 'text';

		this.createInputArea(container);

		this.wsManager!.connect();
	}

	private initializeManagers() {
		this.apiClient = new ApiClient(
			this.plugin.settings.apiEndpoint,
			this.plugin.settings.clientId,
			this.plugin.settings.region
		);

		this.indexingManager = new IndexingManager(
			this.app,
			this.apiClient,
			this.app.vault.getName()
		);

		this.sessionManager = new SessionManager(
			this.app,
			this.apiClient,
			this
		);

		this.wsManager = new WebSocketManager(
			this.plugin.settings.websocketEndpoint,
			this.plugin.settings.clientId,
			this.plugin.settings.region
		);

		this.wsManager.onMessage((data) => this.handleWebSocketMessage(data));
		this.wsManager.onStatusChange((status) => this.updateConnectionStatus(status));
	}

	handleSettingsChanged() {
		// Disconnect existing WebSocket if connected
		if (this.wsManager) {
			this.wsManager.disconnect();
		}

		// Reinitialize managers with new settings
		if (this.authContext.idToken && this.chatOutputEl) {
			// Update API client
			this.apiClient = new ApiClient(
				this.plugin.settings.apiEndpoint,
				this.plugin.settings.clientId,
				this.plugin.settings.region
			);

			// Update indexing manager with new API client
			this.indexingManager = new IndexingManager(
				this.app,
				this.apiClient,
				this.app.vault.getName()
			);

			// Update session manager with new API client
			this.sessionManager = new SessionManager(
				this.app,
				this.apiClient,
				this
			);

			// Create new WebSocket manager with updated settings
			this.wsManager = new WebSocketManager(
				this.plugin.settings.websocketEndpoint,
				this.plugin.settings.clientId,
				this.plugin.settings.region
			);

			// Re-register callbacks (sendButtonEl is still valid)
			this.wsManager.onMessage((data) => this.handleWebSocketMessage(data));
			this.wsManager.onStatusChange((status) => this.updateConnectionStatus(status));

			// Update status to connecting before we start
			this.updateConnectionStatus('connecting');
			
			// Reconnect
			this.wsManager.connect();
			new Notice('Settings updated - reconnecting...');
		}
	}

	private createToolbarButtons(buttonContainer: HTMLElement, container: Element) {
		createButton(
			buttonContainer,
			'file-scan',
			'Index File',
			'Index current file',
			() => this.indexingManager!.indexCurrentFile()
		);

		createButton(
			buttonContainer,
			'vault',
			'Index Vault',
			'Index entire vault',
			async () => {
				const confirmed = confirm('Are you sure you want to reindex the entire vault? This may take some time.');
				if (confirmed) {
					await this.indexingManager!.indexVault();
				}
			}
		);

		// Spacer to push remaining buttons to the right
		const spacer = buttonContainer.createEl('div');
		spacer.style.flex = '1';
		spacer.style.minWidth = '10px';

		createIconButton(
			buttonContainer,
			'history',
			'Load previous session',
			() => this.sessionManager!.showSessionList(container, (sessionId) => this.loadSession(sessionId))
		);

		createIconButton(
			buttonContainer,
			'trash-2',
			'Clear chat and start new session',
			() => {
				this.sessionId = generateSessionId(this.authContext.username || 'unknown');
				new Notice('New session started');
				this.showChatInterface(container);
			}
		);

		createButton(
			buttonContainer,
			'log-out',
			'Logout',
			'Logout',
			() => {
				this.wsManager?.disconnect();
				signOut();
				this.authContext.idToken = null;
				this.authContext.username = null;
				this.sessionId = null;
				this.showLoginForm(container);
			}
		);
	}

	private createInputArea(container: Element) {
		const inputContainer = container.createEl('div');
		inputContainer.style.display = 'flex';
		inputContainer.style.gap = '5px';
		inputContainer.style.alignItems = 'flex-end';

		const textarea = inputContainer.createEl('textarea');
		textarea.placeholder = 'Type a message...';
		textarea.style.flex = '1';
		textarea.style.padding = '8px';
		textarea.style.borderRadius = '5px';
		textarea.style.resize = 'none';
		textarea.style.minHeight = '36px';
		textarea.style.maxHeight = '150px';
		textarea.style.overflowY = 'auto';
		textarea.style.lineHeight = '1.4';
		textarea.rows = 1;

		// Auto-grow textarea
		const autoGrow = () => {
			textarea.style.height = 'auto';
			textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
		};
		textarea.addEventListener('input', autoGrow);

		this.sendButtonEl = createButton(
			inputContainer,
			'send',
			'Send',
			'Send message',
			() => this.handleSendFromTextarea(textarea)
		);

		this.updateConnectionStatus('connecting');

		textarea.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.handleSendFromTextarea(textarea);
			}
		});
	}

	private async handleSendFromTextarea(textarea: HTMLTextAreaElement) {
		const message = textarea.value.trim();
		if (!message) return;

		if (!this.wsManager?.isConnected()) {
			new Notice('Not connected to server. Please wait or reconnect.');
			return;
		}

		const { content } = createMessageFrame(this.chatOutputEl!, 'You', true);
		content.textContent = message;
		textarea.value = '';
		textarea.style.height = '36px';
		this.chatOutputEl!.scrollTop = this.chatOutputEl!.scrollHeight;

		const { frame: loadingMsg, content: loadingText } = createMessageFrame(this.chatOutputEl!, 'Agent', false);
		loadingText.textContent = 'Thinking...';
		loadingText.style.fontStyle = 'italic';
		loadingText.style.color = 'var(--text-muted)';
		this.chatOutputEl!.scrollTop = this.chatOutputEl!.scrollHeight;

		const wsMessage = {
			action: 'chat',
			campaign: this.app.vault.getName(),
			message: message,
			sessionId: this.sessionId
		};

		try {
			this.wsManager.send(wsMessage);
			this.currentLoadingMessage = loadingMsg;
		} catch (error) {
			console.error('Failed to send WebSocket message:', error);
			loadingMsg.remove();
			createErrorMessage(this.chatOutputEl!, `Failed to send message: ${error.message}`);
			this.chatOutputEl!.scrollTop = this.chatOutputEl!.scrollHeight;
		}
	}

	private handleWebSocketMessage(data: string) {
		try {
			const message: WebSocketMessage = JSON.parse(data);

			if (!this.chatOutputEl) {
				console.error('Chat output element not available');
				console.error('Chat output element not available');
				return;
			}

			if (message.type === 'chunk') {
				this.handleChunkMessage(message);
			} else if (message.type === 'complete') {
				this.handleCompleteMessage();
			} else if (message.type === 'error') {
				this.handleErrorMessage(message);
			}
		} catch (error) {
			console.error('Failed to parse WebSocket message:', error);
		}
	}

	private handleChunkMessage(message: WebSocketMessage) {
		if (this.currentLoadingMessage) {
			this.currentLoadingMessage.remove();
			this.currentLoadingMessage = null;
		}

		if (!this.currentStreamingMessage) {
			const { frame, content } = createMessageFrame(this.chatOutputEl!, 'Agent', false);
			this.currentStreamingMessage = frame;
			this.currentStreamingContent = content;
			this.currentStreamingText = '';
		}

		const textToAppend = extractTextFromContent(message.content);

		if (this.currentStreamingContent && textToAppend) {
			this.currentStreamingText += textToAppend;
			this.currentStreamingContent.empty();
			MarkdownRenderer.render(
				this.app,
				this.currentStreamingText,
				this.currentStreamingContent,
				'',
				this
			);
			this.chatOutputEl!.scrollTop = this.chatOutputEl!.scrollHeight;
		}
	}

	private handleCompleteMessage() {
		if (this.chatOutputEl) {
			this.chatOutputEl.scrollTop = this.chatOutputEl.scrollHeight;
		}

		this.currentStreamingMessage = null;
		this.currentStreamingContent = null;
		this.currentLoadingMessage = null;
		this.currentStreamingText = '';
		
		// Clear pending message to prevent resending on reconnect
		this.wsManager?.clearPendingMessage();
	}

	private handleErrorMessage(message: WebSocketMessage) {
		if (this.currentLoadingMessage) {
			this.currentLoadingMessage.remove();
			this.currentLoadingMessage = null;
		}

		if (this.currentStreamingMessage) {
			this.currentStreamingMessage.remove();
			this.currentStreamingMessage = null;
			this.currentStreamingContent = null;
			this.currentStreamingText = '';
		}

		const errorText = extractTextFromContent(message.content);
		createErrorMessage(this.chatOutputEl!, errorText);
		this.chatOutputEl!.scrollTop = this.chatOutputEl!.scrollHeight;
		new Notice(`Error: ${errorText}`);
		
		// Clear pending message to prevent resending on reconnect
		this.wsManager?.clearPendingMessage();
	}

	private updateConnectionStatus(status: ConnectionStatus) {
		if (this.sendButtonEl) {
			updateConnectionStatusUI(this.sendButtonEl, status);
		}
	}

	private async loadSession(sessionId: string) {
		this.sessionId = sessionId;
		this.wsManager?.disconnect();
		
		const container = this.containerEl.children[1];
		this.showChatInterface(container);
		
		await this.sessionManager!.loadSessionHistory(sessionId, this.chatOutputEl!);
	}

	async onClose() {
		this.wsManager?.disconnect();
	}
}
