# Instalectron - an Instagram wrapper that removes distractions

This is an Instagram electron wrapper that disabled distracting features. This has no affiliation with Meta and is only a side project by me.

## Development

### Clone this repository
`git clone https://github.com/Hannes-Schuck/instalectron`

`cd instalectron`

### Install the dependencies
`npm i`

### Start the application
`npm start`

## Building the application (as an AppImage)

### Build the application using electron-builder:
`npm run build`

There should now be an AppImage available in the `dist/` folder.

I did not include the original Instagram icon to prevent legal trouble, so I made my own one. If you want to use the official one, you could use [this one](https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png). Replace [`assets/icons/icon.png`](assets/icons/icon.png) to use a custom icon.