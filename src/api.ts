import { Notice } from 'obsidian';
import { SessionData } from './types';
import { getValidIdToken } from './auth';

export class ApiClient {
	constructor(
		private apiEndpoint: string,
		private clientId: string,
		private region: string
	) {}

	async call(endpoint: string, body: any): Promise<any> {
		if (!this.apiEndpoint) {
			new Notice('API endpoint not configured');
			return null;
		}

		try {
			const token = await getValidIdToken(this.clientId, this.region);
			if (!token) {
				new Notice('Authentication required');
				return null;
			}
			
			const response = await fetch(`${this.apiEndpoint}${endpoint}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': token
				},
				body: JSON.stringify(body)
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			if (!endpoint.includes('/index')) {
				new Notice(`API call failed: ${error.message}`);
			}
			return null;
		}
	}

	async fetchSessions(): Promise<SessionData[]> {
		if (!this.apiEndpoint) {
			new Notice('API endpoint not configured');
			return [];
		}

		try {
			const token = await getValidIdToken(this.clientId, this.region);
			if (!token) {
				new Notice('Authentication required');
				return [];
			}
			
			const response = await fetch(`${this.apiEndpoint}/sessions`, {
				method: 'GET',
				headers: {
					'Authorization': token
				}
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.statusText}`);
			}

			const data = await response.json();
			return data.sessions || [];
		} catch (error) {
			console.error('Failed to fetch sessions:', error);
			throw error;
		}
	}

	async fetchSessionHistory(sessionId: string): Promise<any> {
		if (!this.apiEndpoint) {
			new Notice('API endpoint not configured');
			return null;
		}

		try {
			const token = await getValidIdToken(this.clientId, this.region);
			if (!token) {
				new Notice('Authentication required');
				return null;
			}
			
			const response = await fetch(`${this.apiEndpoint}/sessions/${encodeURIComponent(sessionId)}`, {
				method: 'GET',
				headers: {
					'Authorization': token
				}
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			console.error('Failed to fetch session history:', error);
			throw error;
		}
	}
}
