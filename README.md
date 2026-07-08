# MaruMori Userscripts

A collection of userscripts for MaruMori.

Each userscript lives in its own directory so the repository can grow without mixing unrelated scripts, tooling, or documentation.

## Scripts

| Userscript | Description |
| --- | --- |
| [MaruMori Even More Gamified - Updated](./even-more-gamified/) | Arcade-style MaruMori review enhancements with scoring, combo tracking, difficulty modes, CRT visuals, and a draggable HUD. |

## Repository Layout

```text
marumori-userscripts/
├── LICENSE
├── even-more-gamified/
│   ├── marumori_even_more_gamified.user.js
│   ├── README.md
│   ├── package.json
│   └── eslint.config.js
└── README.md
```

## Development

Each userscript directory owns its own development tooling. For example:

```sh
cd even-more-gamified
npm install
npm test
```

## Sharing Back

This repository is intended to make it easy to share experimental changes, compare forks, and discuss improvements with the original userscript author.

## License

This repository uses the [WTFPL](./LICENSE), matching the original userscript's `@license` metadata and keeping the same very permissive spirit.
