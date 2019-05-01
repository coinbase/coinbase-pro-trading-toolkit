---
title: Installation
keywords: CBPTT, introduction, installation
last_updated: July 14, 2017
tags: [getting_started]
summary: "Installing the CBPTT on your machine"
sidebar: cbptt_sidebar
permalink: cbptt_installation.html
folder: cbptt
---

# Installation - as an NPM module

The Coinbase Pro Trading Toolkit (CBPTT) is written in [Typescript](https://www.typescriptlang.org), a superset of the javascript
language. Typescript has all the flexibility of JS as well as the ability to use static typing, which eliminates or prevents
 whole classes of bugs from code.

So if you're developing your bots in Typescript, then this library should have a familiar look and feel. If you are using
node.js and don't want to, or can't switch to Typescript, then that's not a problem either.

In either case, you can install the CBPTT by executing

    yarn add coinbase-pro-trading-toolkit
    // or if you're using npm (Use yarn if you plan on running examples from /tutorials folder)
    npm i coinbase-pro-trading-toolkit

(we're using [Yarn](https://yarnpkg.com/) here, which is essentially a 1:1 drop-in replacement for npm with a whole host
benefits. If you don't use yarn, that's fine, the `npm` commands are typically identical)

Let's test that the installation went ok by getting a Coinbase Pro product ticker printed to the console

    ./node_modules/.bin/coinbaseProConsole  --product BTC-USD -t

You should get output similar to

    Ticker for BTC-USD on Coinbase Pro
    Price:    1027.35 | 24hr volume:   8644.4 | Bid:    1026.62 | Ask:    1027.35 | sequence: 16935316

## Using the library with Javascript

If you're writing Javascript projects, then using the CBPTT is as simple as

    const CBPTT = require('coinbase-pro-trading-toolkit');

This exports the library under the `CBPTT` variable. You can access sub-components by traversing the root object:

    CBPTT.Core       // core components
    CBPTT.Exchanges  // exchange interfaces
    CBPTT.Factories  // factory methods
    ...

Refer to the API reference docs or browse the index files to explore the full tree.

## Using the library with TypeScript

When writing Typescript projects with the CBPTT, we recommend the following settings for your `tsconfig.json` file. It should be placed in your root folder:

    {
      "compilerOptions": {
        "module": "commonjs",
        "target": "es6",
        "lib": ["es6", "es2016", "ES2016.Array.Include", "dom", "ES2017.object"],
        "noImplicitAny": true,
        "noImplicitReturns": true,
        "noImplicitThis": true,
        "noUnusedLocals": true,
        "strictNullChecks": false,
        "experimentalDecorators": true,
        "outDir": "build",
        "sourceMap": true,
        "allowJs": true
      },
      "exclude": [
        "node_modules"
      ]
    }

Importing the top-level `CBPTT` object is also a striaghtforward import:

     import * as CBPTT from 'coinbase-pro-trading-toolkit';

Type definitions are not included in the above import, so for example the declaration

    const feed: CoinbaseProFeed

requires an explicit import of the `CoinbaseProFeed` type. Most TypeScript-friendly IDEs will handle the importing for you automatically, so you typically don't need to worry about it, but the resulting import will look like

    import { CoinbaseProFeed } from "coinbase-pro-trading-toolkit/build/src/exchanges";

# Cloning the repo

If you have Git installed and would like to look at, or better yet, [contribute](/contributing.html), first
clone the source by running

    git clone git@github.com:coinbase/coinbase-pro-trading-toolkit.git

## Running tests

Our ultimate goal is to have more than 80% test coverage. You can run the existing test suite with the command

    yarn test

## Hello CBPTT

You should consider using [`ts-node`](https://www.npmjs.com/package/ts-node) to compile and run TS scripts on the fly:

    npm i -g ts-node typescript
    ts-node src/consoles/coinbaseProConsole.ts --product BTC-USD -t

