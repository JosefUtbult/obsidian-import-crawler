import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
	TFile,
	Vault,
	addIcon
} from 'obsidian';
import * as Path from "path";
import {text} from "stream/consumers";

const ICON = `
<path fill="currentColor" stroke="currentColor"
     d="M 87.5,65.625 V 9.375 C 87.5,4.1972656 83.300781,0 78.125,0 H 18.75 C 8.3945313,0 0,8.3945313 0,18.75 v 62.5 C 0,91.605469 8.3945313,100 18.75,100 h 62.5 c 3.451172,0 6.25,-2.798828 6.25,-6.074219 0,-2.289062 -1.29043,-4.203125 -3.125,-5.292969 V 72.742187 C 86.289062,70.859375 87.5,68.398437 87.5,65.625 Z M 27.949219,25 h 37.5 C 67.34375,25 68.75,26.40625 68.75,28.125 c 0,1.71875 -1.40625,3.125 -3.125,3.125 H 27.949219 C 26.40625,31.25 25,29.84375 25,28.125 25,26.40625 26.40625,25 27.949219,25 Z m 0,12.5 h 37.5 c 1.894531,0 3.300781,1.40625 3.300781,3.125 0,1.71875 -1.40625,3.125 -3.125,3.125 H 27.949219 C 26.40625,43.75 25,42.34375 25,40.625 25,38.90625 26.40625,37.5 27.949219,37.5 Z M 75,87.5 H 18.75 C 15.298828,87.5 12.5,84.701172 12.5,81.25 12.5,77.798828 15.298828,75 18.75,75 H 75 Z"
     id="path2"
     style="stroke-width:0.195312" />
`

interface ImportCrawlerSettings {
	linkedFiles: string[][];
	notice: boolean;
}

const DEFAULT_SETTINGS: ImportCrawlerSettings = {
	linkedFiles: [['Main.md', 'Result.md']],
	notice: true
}

// Recursively go through a file, extracts file imports and try to run this function
// again on that file. Push the other content and the function output to the results.
async function compileImports(vault: Vault, file: TFile) {
	const RE_IMPORT = /!\[[^\]]*]\([<]*([^>]*)[>]*\)/
	let res = "";
	return await vault.read(file).then(async data => {
		for (const instance of data.split('\n')) {
			const re_match = instance.match(RE_IMPORT);
			if (re_match !== null && re_match.length >= 2) {
				// TODO: Fix this for none unix style paths
				let subFilePath = "";

				if(subFilePath !== '/') {
					subFilePath = file.parent.path + '/' + re_match[1] + '.md';
				}
				else{
					subFilePath = re_match[1] + '.md';
				}

				if (subFilePath.length > 1 && subFilePath[0] === '/') {
					subFilePath = subFilePath.slice(1);
				}

				try {
					const subFile: TAbstractFile = vault.getAbstractFileByPath(subFilePath);
					if (subFile instanceof TFile) {
						res += await compileImports(vault, subFile);
					} else {
						res += instance + '\n';
					}
				} catch (e) {
					res += "<p style='color: red'>Unable to read file " + subFilePath + ": " + e + "</p>\n";
					console.log(e);
				}

			} else {
				res += instance + '\n';
			}
		}
		return res;
	}, function () {
		console.error("Unable to read " + file.path);
		return "";
	});
}

export default class ImportCrawler extends Plugin {
	settings: ImportCrawlerSettings;

	async onload() {
		await this.loadSettings();

		// Import the book icon from https://fontawesome.com
		addIcon('book', ICON);

		// Create a ribbon icon on the left sidebar that runs the Import Crawler
		const ribbonIconEl = this.addRibbonIcon('book', 'Import Crawler', async (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			await this.handleFileSourceToTarget();
		});

		// Add a command to run the Import Crawler
		this.addCommand({
			id: 'trigger-import-crawler',
			name: 'Run',
			callback: async () => {
				await this.handleFileSourceToTarget();
			}
		});

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {
	}

	// Go through all file links, recursively the data from the source files and
	// write the result to the target file
	async handleFileSourceToTarget() {
		let state = true;
		for (const instance of this.settings.linkedFiles) {
			const index = this.settings.linkedFiles.indexOf(instance);
			if(instance[0] !== '' && instance[1] !== ''){
				if(instance[0].substr(instance[0].length - 3) !== '.md') {
					instance[0] += '.md';
				}
				if(instance[1].substr(instance[1].length - 3) !== '.md') {
					instance[1] += '.md';
				}

				const file = this.app.vault.getAbstractFileByPath(instance[0]);

				try {
					const [res] = await Promise.all([compileImports(this.app.vault, file)]);

					this.app.vault.modify(<TFile>this.app.vault.getAbstractFileByPath(instance[1]), res).then(() => {

					}).catch(reason => {
						state = false;
						new Notice("Import Crawler Error: Unable to open target filepath " + instance[1]);
					});
				} catch (e) {
					state = false;
					new Notice("Import Crawler Error: Unable to open source filepath " + instance[0]);
				}
			}
		}
		if(state && this.settings.notice) {
			new Notice('Updated Result');
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
class SampleSettingTab extends PluginSettingTab {
	plugin: ImportCrawler;

	constructor(app: App, plugin: ImportCrawler) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		// Add toggle to switch on and off the crawl successful notification
		new Setting(containerEl)
			.setName('Notifications')
			.setDesc('Give me a notice when the file crawl has finished.')
			.addToggle( toogle => toogle
				.setValue(this.plugin.settings.notice)
				.onChange(async (value) => {
					console.log('Slider: ' + value);
					this.plugin.settings.notice = Boolean(value);
					await this.plugin.saveSettings();
				})
			);

		// Add button to create a new file link. It generates an empty instance of
		// source/target filepaths in settings
		new Setting(containerEl)
			.setName('Add a new file link')
			.setDesc('Exit Import Crawler settings and reenter in order to apply new file link slot.')
			.addButton( button => button
				.setButtonText('Add')
				.setCta()
				.onClick( async () => {
					this.plugin.settings.linkedFiles.push(["", ""]);
					await this.plugin.saveSettings();
				})
			);

		// For every link instance
		const plugin = this.plugin;
		this.plugin.settings.linkedFiles.forEach(function (instance, index) {
			containerEl.createEl('h2', {text: 'File link ' + (index + 1)});

			// Adds text fields for the source and target filepath. These are
			// read as absolute paths.
			new Setting(containerEl)
				.setName('Source filepath')
				.addText( text => text
					.setValue(instance[0])
					.onChange(async value => {
						plugin.settings.linkedFiles[index][0] = value;
						await plugin.saveSettings();
					})
				)
			new Setting(containerEl)
				.setName('Target filepath')
				.addText( text => text
					.setValue(instance[1])
					.onChange(async value => {
						plugin.settings.linkedFiles[index][1] = value;
						await plugin.saveSettings();

					})
				)
			// Adds button to remove a specific file link
			new Setting(containerEl)
				.setName('Remove file link')
				.addButton( button => button
					.setButtonText('Remove')
					.setWarning()
					.onClick(async () => {
						plugin.settings.linkedFiles.splice(index, 1);
						await plugin.saveSettings();
					})
				)
		});
	}
}
