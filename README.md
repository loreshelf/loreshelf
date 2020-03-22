[![Jotspin](resources/fulllogo.png)](https://jotspin.com/)

Jotspin is the supervised information-spinning application for the highest productivity in working with information.

<br>

## Install

First, clone the repo via git:

```bash
git clone https://github.com/ibek/jotspin.git
```

And then install the dependencies with yarn.

```bash
$ cd jotspin
$ yarn
```

## Starting Development

Start the app in the `dev` environment. This starts the renderer process in [**hot-module-replacement**](https://webpack.js.org/guides/hmr-react/) mode and starts a webpack dev server that sends hot updates to the renderer process:

```bash
$ yarn dev
```

## Packaging for Production

To package apps for the local platform:

```bash
$ yarn package
```
