import { Notice } from 'obsidian';
import { getValidIdToken } from './auth';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error' | 'failed';

export class WebSocketManager {
	private ws: WebSocket | null = null;
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;
	private reconnectDelay: number = 1000;
	private onMessageCallback: ((data: string) => void) | null = null;
	private onStatusChangeCallback: ((status: ConnectionStatus) => void) | null = null;
	private pendingMessage: any = null;
	private messageInFlight: boolean = false;

	constructor(
		private websocketEndpoint: string,
		private clientId: string,
		private region: string
	) {}

	async connect(): Promise<void> {
		if (!this.websocketEndpoint) {
			this.updateStatus('error');
			return;
		}

		// Get a fresh token (will refresh if needed)
		const token = await getValidIdToken(this.clientId, this.region);
		if (!token) {
			this.updateStatus('error');
			return;
		}

		if (this.ws) {
			this.ws.close();
		}

		const wsUrl = `${this.websocketEndpoint}?token=${encodeURIComponent(token)}`;

		try {
			this.ws = new WebSocket(wsUrl);

			this.ws.onopen = () => {
				this.reconnectAttempts = 0;
				this.reconnectDelay = 1000;
				this.updateStatus('connected');
				new Notice('Connected to D&D Buddy');
				
				// Resend pending message if we reconnected during processing
				if (this.pendingMessage && this.messageInFlight) {
					this.send(this.pendingMessage);
				}
			};

			this.ws.onmessage = (event) => {
				if (this.onMessageCallback) {
					this.onMessageCallback(event.data);
				}
			};

			this.ws.onerror = (error) => {
				console.error('WebSocket error:', error);
				this.updateStatus('error');
			};

			this.ws.onclose = (event) => {
				this.updateStatus('disconnected');
				
				if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
					this.attemptReconnect();
				} else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
					new Notice('Connection failed after multiple attempts');
					this.updateStatus('failed');
				}
			};
		} catch (error) {
			console.error('Failed to create WebSocket:', error);
			this.updateStatus('error');
		}
	}

	private attemptReconnect(): void {
		this.reconnectAttempts++;
		this.updateStatus('reconnecting');

		setTimeout(() => {
			this.connect();
		}, this.reconnectDelay);

		this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
	}

	private updateStatus(status: ConnectionStatus): void {
		if (this.onStatusChangeCallback) {
			this.onStatusChangeCallback(status);
		}
	}

	send(message: any): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			throw new Error('WebSocket not connected');
		}
		this.pendingMessage = message;
		this.messageInFlight = true;
		this.ws.send(JSON.stringify(message));
	}
	
	clearPendingMessage(): void {
		this.pendingMessage = null;
		this.messageInFlight = false;
	}

	disconnect(): void {
		if (this.ws) {
			// Remove event handlers to prevent status updates during intentional disconnect
			this.ws.onclose = null;
			this.ws.onerror = null;
			this.ws.close(1000, 'User disconnect');
			this.ws = null;
		}
		this.reconnectAttempts = 0;
		this.reconnectDelay = 1000;
	}

	isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
	}

	onMessage(callback: (data: string) => void): void {
		this.onMessageCallback = callback;
	}

	onStatusChange(callback: (status: ConnectionStatus) => void): void {
		this.onStatusChangeCallback = callback;
	}
}
