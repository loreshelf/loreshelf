[![Loreshelf](resources/logo.svg)](https://loreshelf.com/)

Loreshelf is a knowledge archive that enables you to organize concise notes.

<br>

## Code

First, clone the repo via git:

```bash
git clone https://github.com/loreshelf/loreshelf.git
```

And then install the dependencies with yarn.

```bash
$ cd loreshelf
$ yarn
```

## Starting Development

Start the app in the `dev` environment. This starts the renderer process in [**hot-module-replacement**](https://webpack.js.org/guides/hmr-react/) mode and starts a webpack dev server that sends hot updates to the renderer process:

```bash
$ yarn dev
```

## Packaging

To package apps for the local platform:

```bash
$ yarn package
```
