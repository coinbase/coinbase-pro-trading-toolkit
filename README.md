# GDAX Trading toolkit

[![CircleCI](https://circleci.com/gh/coinbase/gdax-tt.svg?style=svg)](https://circleci.com/gh/coinbase/gdax-tt)
<!-- ⛔️ AUTO-GENERATED-CONTENT:START (VERSIONBADGE) -->
[![npm](https://img.shields.io/badge/npm-v0.2.0-green.svg)](https://www.npmjs.com/package/gdax-trading-toolkit)
<!-- ⛔️ AUTO-GENERATED-CONTENT:END -->

Provide all the tools traders need, both professional and hobbyist alike, to create automated trading bots on the
GDAX and supported digital asset exchanges. Note: Node 7.6 or above is required.

## Getting Started
### Install prerequisites
Dependending on the OS of your machine, the specific method to install these application will vary.  With a little Google help you can figure out how to install these:

1. Node 7.6+
2. TypeScript  2.6+
3. Yarn 1.3+

### Install the the module
If you want to use the published version of the module in an existing TypeScript project:
```
yarn add gdax-trading-toolkit
```
Then go read the documentation referenced below.

## Working directly with the code
If you want to work directly with the source code on your own machine

### Download copy of the code
clone the repository to directory on your machine ($WORKSPACE_ROOT)

### Install depedency libraries
From $WORKSPACE_ROOT
```
yarn install
``` 
### Test
Run the test suite just to make sure...
```
yarn test
```

### VS Code Setup
If you use Visual Studio Code the following will be helpful.

1. Create a ".vscode" subdirectory in $WORKSPACE_ROOT
2. In the .vscode directory, create a "tasks.json" file that will tell VS Code how to build the software (this assumes the TypeScript compiler is in your $PATH)
```
{
    "version": "2.0.0",
    "tasks": [
        {
            "type": "typescript",
            "label": "tsc",
            "tsconfig": "tsconfig.json",
            "problemMatcher": [
                "$tsc"
            ],
            "group": {
                "kind": "build",
                "isDefault": true
            }
        }
    ]
}
``` 
3. Create "launch.json" file that will allow you to lauch applications for debugging or run the Mocha tests in debug mode
```
{
    "version": "0.2.0",
    "configurations": [
        
        {
            "type": "node",
            "request": "launch",
            "name": "Mocha Tests",
            "program": "${workspaceFolder}/node_modules/mocha/bin/_mocha",
            "args": [
                "-u",
                "tdd",
                "--timeout",
                "999999",
                "--colors",
                "${workspaceFolder}/test"
            ],
            "internalConsoleOptions": "openOnSessionStart",
            "preLaunchTask": "tsc"
        },
        {
            "type": "node",
            "request": "launch",
            "name": "Launch Program",
            "program": "${file}",
            "stopOnEntry": false,
            "sourceMaps": true,
            "cwd": "${workspaceRoot}",
            "outFiles": [
                "${workspaceFolder}/build/**/*.js"
            ],
            "runtimeExecutable": null,
            "outputCapture" : "std",
            "preLaunchTask": "tsc"
        }
    ]
}
```

## Run

The `src/samples` folder contains many working demo scripts showcasing different aspects of the toolkit, while the `tutorials` folder
contains running demo programs to accompany the [GTT documentation](https://coinbase.github.io/gdax-tt/).

## Documentation

The [GTT documentation](https://coinbase.github.io/gdax-tt/) contains blogs, reference material and step-by-step tutorials

# Disclaimer

This software is provided "as is", without warranty of any kind, express or
implied, including but not limited to the warranties of merchantability,
fitness for a particular purpose and non-infringement. In no event shall the
authors, copyright holders, or Coinbase Inc. be liable for any claim, damages or other
liability, whether in an action of contract, tort or otherwise, arising from,
out of or in connection with the software or the use or other dealings in the
software.

# Contributors

<!-- ⛔️ AUTO-GENERATED-CONTENT:START (CONTRIBUTORS) -->
| **Commits** | **Contributor** |  
| --- | --- |  
| 42 | [CjS77](https://github.com/CjS77) |  
| 4  | [mihar](https://github.com/mihar) |  
| 3  | [balupton](https://github.com/balupton) |  
| 2  | [kostola](https://github.com/kostola) |  
| 2  | [Ameobea](https://github.com/Ameobea) |  
| 2  | [fb55](https://github.com/fb55) |  
| 2  | [discosultan](https://github.com/discosultan) |  
| 1  | [abe238](https://github.com/abe238) |  
| 1  | [maxbeatty](https://github.com/maxbeatty) |  
| 1  | [pzagor2](https://github.com/pzagor2) |  
| 1  | [jcronq](https://github.com/jcronq) |  
| 1  | [kahmienah](https://github.com/kahmienah) |  

<!-- ⛔️ AUTO-GENERATED-CONTENT:END -->
