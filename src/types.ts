export const VIEW_TYPE_SIDEBAR = 'simple-sidebar-view';

export interface PluginSettings {
	userPoolId: string;
	clientId: string;
	region: string;
	apiEndpoint: string;
	websocketEndpoint: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	userPoolId: '',
	clientId: '',
	region: 'eu-central-1',
	apiEndpoint: '',
	websocketEndpoint: ''
}

export interface SessionData {
	sessionId: string;
	lastUpdated?: string;
	preview?: string;
	messageCount: number;
	messages?: Message[];
}

export interface Message {
	type: 'human' | 'ai';
	content: string | ContentBlock[];
}

export interface ContentBlock {
	type: string;
	text?: string;
	index?: number;
}

export interface WebSocketMessage {
	type: 'chunk' | 'complete' | 'error';
	content: string | ContentBlock[];
}

export interface AuthContext {
	username: string | null;
	idToken: string | null;
}
