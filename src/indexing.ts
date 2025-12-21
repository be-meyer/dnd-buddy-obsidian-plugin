import { App, Notice } from 'obsidian';
import { ApiClient } from './api';

export interface StatusBarUpdater {
	updateStatusBar(text: string): void;
	clearStatusBar(): void;
}

export class IndexingManager {
	constructor(
		private app: App,
		private apiClient: ApiClient,
		private campaign: string,
		private statusBarUpdater?: StatusBarUpdater
	) {}

	async indexCurrentFile(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		
		if (!activeFile) {
			new Notice('No active file');
			return;
		}

		if (!this.campaign) {
			new Notice('Please configure campaign in settings');
			return;
		}

		try {
			new Notice(`Indexing: ${activeFile.name}`);
			
			const content = await this.app.vault.read(activeFile);
			
			const requestBody = {
				campaign: this.campaign,
				filePath: activeFile.path,
				content
			};
			
			const response = await this.apiClient.call('/index', requestBody);
			
			if (response) {
				new Notice(`✓ ${activeFile.name} indexed (${response.chunksProcessed} chunks)`);
			} else {
				new Notice(`✗ Failed to index ${activeFile.name}`);
			}
		} catch (error) {
			new Notice(`✗ Failed to index ${activeFile.name}: ${error.message}`);
		}
	}

	async indexVault(): Promise<void> {
		if (!this.campaign) {
			new Notice('Please configure campaign in settings');
			return;
		}

		try {
			const markdownFiles = this.app.vault.getMarkdownFiles();
			
			if (markdownFiles.length === 0) {
				new Notice('No markdown files found in vault');
				return;
			}

			const totalFiles = markdownFiles.length;
			new Notice(`Starting to index ${totalFiles} files...`);
			
			let completedCount = 0;
			let successCount = 0;
			let errorCount = 0;
			const CONCURRENCY = 5;

			const indexFile = async (file: ReturnType<typeof this.app.vault.getMarkdownFiles>[0]): Promise<void> => {
				try {
					const content = await this.app.vault.read(file);
					
					const requestBody = {
						campaign: this.campaign,
						filePath: file.path,
						content
					};
					
					const response = await this.apiClient.call('/index', requestBody);
					
					if (response) {
						successCount++;
						console.log(`Indexed ${file.name}: ${response.chunksProcessed} chunks`);
					} else {
						errorCount++;
					}
				} catch (error) {
					console.error(`Failed to index ${file.name}:`, error);
					errorCount++;
					new Notice(`✗ Error indexing: ${file.name}`, 3000);
				} finally {
					completedCount++;
					this.statusBarUpdater?.updateStatusBar(`Indexing ${completedCount}/${totalFiles}`);
				}
			};

			// Process files in batches of CONCURRENCY
			for (let i = 0; i < markdownFiles.length; i += CONCURRENCY) {
				const batch = markdownFiles.slice(i, i + CONCURRENCY);
				await Promise.all(batch.map(indexFile));
			}
			
			// Clear status bar
			this.statusBarUpdater?.clearStatusBar();
			
			// Show completion summary
			if (errorCount === 0) {
				new Notice(`✓ Indexing complete! ${successCount} files indexed successfully.`);
			} else {
				new Notice(`Indexing complete. Success: ${successCount}, Errors: ${errorCount}`);
			}
			
		} catch (error) {
			this.statusBarUpdater?.clearStatusBar();
			new Notice(`Failed to reindex vault: ${error.message}`);
		}
	}
}
