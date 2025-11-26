import { App, Notice } from 'obsidian';
import { ApiClient } from './api';

export class IndexingManager {
	constructor(
		private app: App,
		private apiClient: ApiClient,
		private campaign: string
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

			new Notice(`Starting to index ${markdownFiles.length} files...`);
			
			let successCount = 0;
			let errorCount = 0;
			
			for (const file of markdownFiles) {
				try {
					new Notice(`Indexing: ${file.name}`, 2000);
					
					const content = await this.app.vault.read(file);
					
					const requestBody = {
						campaign: this.campaign,
						filePath: file.path,
						content
					};
					
					const response = await this.apiClient.call('/index', requestBody);
					
					if (response) {
						successCount++;
						new Notice(`✓ ${file.name} (${response.chunksProcessed} chunks)`, 2000);
						console.log(`Indexed ${file.name}: ${response.chunksProcessed} chunks`);
					} else {
						errorCount++;
						new Notice(`✗ Failed: ${file.name}`, 3000);
					}
					
					await new Promise(resolve => setTimeout(resolve, 100));
					
				} catch (error) {
					console.error(`Failed to index ${file.name}:`, error);
					errorCount++;
					new Notice(`✗ Error: ${file.name}`, 3000);
				}
			}
			
			new Notice(`Indexing complete! Success: ${successCount}, Errors: ${errorCount}`);
			
		} catch (error) {
			new Notice(`Failed to reindex vault: ${error.message}`);
		}
	}
}
