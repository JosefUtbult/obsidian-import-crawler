# Obsidian Import Crawler

This plugin is used to recursivly pull all imported block references from a source file, and compile it to a single file. It is developed from the lovely [_sample plugin for Obsidian_](https://github.com/obsidianmd/obsidian-sample-plugin).

## Usage

When installed some new settings will be presented to you; the Import Crawler settings. There you have the option to _Add a new file link_. After adding this you can specify source filepath, the root file for all your imports, and a target filepath, where the crawler should output the resulting file. Both the source and target files needs to exist before their paths are linked, as the Import Crawler can't create them on its own.

After adding these paths, you will be able to press the new _Import Crawler_ button on the left side menu. It gives you a notification if it succeeds or fails.

Now all content from the source file should be added to the  target file, with all its block references.

## TODO

- [ ] Add more checks
- [ ] Make the filepaths update when files are moved
- [ ] Make path handling better (aka not only linux paths)
- [ ] Figure out a way to make changes in the target file cary over to the source files
- [ ] Add optionality for running the crawler on file changes
- [ ] Allow imports with the file ending .md in them

## Contributing

If you would want to contribute to this project I would be happy to help you. The easiest way to come in contact with me is by using the repositorys [discussion](https://github.com/JosefUtbult/obsidian-import-crawler/discussions) functionality.
