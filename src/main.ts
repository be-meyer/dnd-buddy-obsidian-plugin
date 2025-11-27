import { Plugin, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_SIDEBAR, PluginSettings, DEFAULT_SETTINGS } from './types';
import { SimpleSidebarView } from './view';
import { SettingTab } from './settings';

export default class SimpleSidebarPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_SIDEBAR,
			(leaf) => new SimpleSidebarView(leaf, this)
		);

		this.addRibbonIcon('layout-sidebar-right', 'Open DnD Buddy', () => {
			this.activateView();
		});

		this.addCommand({
			id: 'open-simple-sidebar',
			name: 'Open DnD Buddy',
			callback: () => {
				this.activateView();
			}
		});

		this.addSettingTab(new SettingTab(this.app, this));
		
		// Wait for layout to be ready before activating view
		this.app.workspace.onLayoutReady(() => {
			this.activateView();
		});
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_SIDEBAR);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({ type: VIEW_TYPE_SIDEBAR, active: true });
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_SIDEBAR);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
