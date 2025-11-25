import { Notice } from 'obsidian';
import {
	CognitoIdentityProviderClient,
	InitiateAuthCommand,
	RespondToAuthChallengeCommand,
	AuthFlowType,
	ChallengeNameType
} from '@aws-sdk/client-cognito-identity-provider';

interface AuthTokens {
	idToken: string;
	accessToken: string;
	refreshToken: string;
}

interface StoredSession {
	username: string;
	tokens: AuthTokens;
	expiresAt: number;
}

const SESSION_STORAGE_KEY = 'dnd-buddy-session';

export function generateSessionId(username: string): string {
	const timestamp = Date.now().toString();
	const random = Math.random().toString(36).substring(2);
	const sessionId = `${username}-${timestamp}-${random}`;
	return sessionId.padEnd(32, '0');
}

export async function authenticateUser(
	username: string,
	password: string,
	userPoolId: string,
	clientId: string,
	region: string,
	onSuccess: (idToken: string, sessionId: string) => void,
	onPasswordRequired: (session: string, username: string) => void
): Promise<void> {
	const client = new CognitoIdentityProviderClient({ region });

	try {
		const command = new InitiateAuthCommand({
			AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
			ClientId: clientId,
			AuthParameters: {
				USERNAME: username,
				PASSWORD: password
			}
		});

		const response = await client.send(command);

		if (response.ChallengeName === ChallengeNameType.NEW_PASSWORD_REQUIRED) {
			new Notice('Password change required');
			onPasswordRequired(response.Session!, username);
			return;
		}

		if (response.AuthenticationResult) {
			const tokens: AuthTokens = {
				idToken: response.AuthenticationResult.IdToken!,
				accessToken: response.AuthenticationResult.AccessToken!,
				refreshToken: response.AuthenticationResult.RefreshToken!
			};

			// Store session
			const expiresAt = Date.now() + (response.AuthenticationResult.ExpiresIn! * 1000);
			storeSession(username, tokens, expiresAt);

			const sessionId = generateSessionId(username);
			new Notice('Login successful!');
			onSuccess(tokens.idToken, sessionId);
		}
	} catch (error: any) {
		new Notice(`Login failed: ${error.message}`);
		console.error('Authentication error:', error);
	}
}

export async function completePasswordChange(
	newPassword: string,
	session: string,
	username: string,
	clientId: string,
	region: string,
	onSuccess: (idToken: string, sessionId: string) => void
): Promise<void> {
	const client = new CognitoIdentityProviderClient({ region });

	try {
		const command = new RespondToAuthChallengeCommand({
			ChallengeName: ChallengeNameType.NEW_PASSWORD_REQUIRED,
			ClientId: clientId,
			Session: session,
			ChallengeResponses: {
				USERNAME: username,
				NEW_PASSWORD: newPassword
			}
		});

		const response = await client.send(command);

		if (response.AuthenticationResult) {
			const tokens: AuthTokens = {
				idToken: response.AuthenticationResult.IdToken!,
				accessToken: response.AuthenticationResult.AccessToken!,
				refreshToken: response.AuthenticationResult.RefreshToken!
			};

			// Store session
			const expiresAt = Date.now() + (response.AuthenticationResult.ExpiresIn! * 1000);
			storeSession(username, tokens, expiresAt);

			const sessionId = generateSessionId(username);
			new Notice('Password changed successfully!');
			onSuccess(tokens.idToken, sessionId);
		}
	} catch (error: any) {
		new Notice(`Password change failed: ${error.message}`);
		console.error('Password change error:', error);
	}
}

export async function checkExistingSession(
	clientId: string,
	region: string,
	onValid: (idToken: string, username: string) => void,
	onInvalid: () => void
): Promise<void> {
	const stored = getStoredSession();
	
	if (!stored) {
		onInvalid();
		return;
	}
	
	// Check if token is still valid (with 5 minute buffer)
	const bufferTime = 5 * 60 * 1000; // 5 minutes
	if (stored.expiresAt > Date.now() + bufferTime) {
		onValid(stored.tokens.idToken, stored.username);
		return;
	}
	
	// Token expired or expiring soon - try to refresh
	try {
		const newTokens = await refreshTokens(stored.tokens.refreshToken, clientId, region);
		if (newTokens) {
			// Update stored session with new tokens
			const expiresAt = Date.now() + (3600 * 1000); // 1 hour default
			storeSession(stored.username, newTokens, expiresAt);
			onValid(newTokens.idToken, stored.username);
		} else {
			clearStoredSession();
			onInvalid();
		}
	} catch (error) {
		console.error('Token refresh failed:', error);
		clearStoredSession();
		onInvalid();
	}
}

export async function refreshTokens(
	refreshToken: string,
	clientId: string,
	region: string
): Promise<AuthTokens | null> {
	const client = new CognitoIdentityProviderClient({ region });
	
	try {
		const command = new InitiateAuthCommand({
			AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
			ClientId: clientId,
			AuthParameters: {
				REFRESH_TOKEN: refreshToken
			}
		});
		
		const response = await client.send(command);
		
		if (response.AuthenticationResult) {
			return {
				idToken: response.AuthenticationResult.IdToken!,
				accessToken: response.AuthenticationResult.AccessToken!,
				refreshToken: refreshToken // Refresh token stays the same
			};
		}
		
		return null;
	} catch (error) {
		console.error('Token refresh error:', error);
		return null;
	}
}

export async function getValidIdToken(
	clientId: string,
	region: string
): Promise<string | null> {
	const stored = getStoredSession();
	
	if (!stored) {
		return null;
	}
	
	// Check if token is still valid (with 5 minute buffer)
	const bufferTime = 5 * 60 * 1000;
	if (stored.expiresAt > Date.now() + bufferTime) {
		return stored.tokens.idToken;
	}
	
	// Try to refresh
	const newTokens = await refreshTokens(stored.tokens.refreshToken, clientId, region);
	if (newTokens) {
		const expiresAt = Date.now() + (3600 * 1000);
		storeSession(stored.username, newTokens, expiresAt);
		return newTokens.idToken;
	}
	
	return null;
}

export function signOut(): void {
	clearStoredSession();
	new Notice('Logged out');
}

export function getCurrentUsername(): string | null {
	const stored = getStoredSession();
	return stored?.username || null;
}

// Session storage helpers
function storeSession(username: string, tokens: AuthTokens, expiresAt: number): void {
	const session: StoredSession = { username, tokens, expiresAt };
	localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function getStoredSession(): StoredSession | null {
	const stored = localStorage.getItem(SESSION_STORAGE_KEY);
	if (!stored) return null;
	
	try {
		return JSON.parse(stored);
	} catch {
		return null;
	}
}

function clearStoredSession(): void {
	localStorage.removeItem(SESSION_STORAGE_KEY);
}
