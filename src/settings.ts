import { App, PluginSettingTab, Setting, Plugin } from 'obsidian';
import { PluginSettings } from './types';

export class SettingTab extends PluginSettingTab {
	plugin: Plugin & { settings: PluginSettings; saveSettings: () => Promise<void> };

	constructor(app: App, plugin: Plugin & { settings: PluginSettings; saveSettings: () => Promise<void> }) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Cognito Settings' });

		new Setting(containerEl)
			.setName('User Pool ID')
			.setDesc('Your Cognito User Pool ID')
			.addText(text => text
				.setPlaceholder('us-east-1_xxxxxxxxx')
				.setValue(this.plugin.settings.userPoolId)
				.onChange(async (value) => {
					this.plugin.settings.userPoolId = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Client ID')
			.setDesc('Your Cognito App Client ID')
			.addText(text => text
				.setPlaceholder('xxxxxxxxxxxxxxxxxxxxxxxxxx')
				.setValue(this.plugin.settings.clientId)
				.onChange(async (value) => {
					this.plugin.settings.clientId = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('AWS Region')
			.setDesc('AWS region for Cognito (e.g., eu-central-1)')
			.addText(text => text
				.setPlaceholder('eu-central-1')
				.setValue(this.plugin.settings.region)
				.onChange(async (value) => {
					this.plugin.settings.region = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('API Endpoint')
			.setDesc('Your REST API Gateway endpoint URL (for indexing and sessions)')
			.addText(text => text
				.setPlaceholder('https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod')
				.setValue(this.plugin.settings.apiEndpoint)
				.onChange(async (value) => {
					this.plugin.settings.apiEndpoint = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('WebSocket Endpoint')
			.setDesc('Your WebSocket API Gateway endpoint URL (for agent chat)')
			.addText(text => text
				.setPlaceholder('wss://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod')
				.setValue(this.plugin.settings.websocketEndpoint)
				.onChange(async (value) => {
					this.plugin.settings.websocketEndpoint = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h2', { text: 'Campaign Settings' });

		new Setting(containerEl)
			.setName('Campaign Name')
			.setDesc('Your campaign name (User ID is automatically retrieved from Cognito)')
			.addText(text => text
				.setPlaceholder('default')
				.setValue(this.plugin.settings.campaign)
				.onChange(async (value) => {
					this.plugin.settings.campaign = value;
					await this.plugin.saveSettings();
				}));
	}
}
