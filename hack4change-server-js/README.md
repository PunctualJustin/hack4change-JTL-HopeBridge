# Hack4Change Starter Typescript Repository
This is the sample Typescript server repository for the Hack4Change hackathon. Combined with one of the Hack4Change client applications, you can use this server as a basis to build your own full stack web application.

# Getting Started
To start working with this server project, do the following:

- Download Node.js with npm from https://nodejs.org/en/download and follow the instructions to install it. This project was created using Node version 22.22.0, but should work with any recent version of Node.
- From this directory, run the following command in a command line: `npm install`. This will install all of the project's dependencies.
- Use the scripts listed below to run and test the client.

# Scripts
You can run the following commands from a command line in this directory:

- `npm run dev` will run the Typescript compiler in watch mode, recompiling the server whenever changes are made and placing the compiled files into a `dist` folder.
- `npm run build` will run the Typescript compiler once, placing the compiled files into a `dist` folder
- `npm run start` will run the compiled server from the `dist` folder.
- `npm run test` will run all tests for the application.

# Layout
The base directory contains this readme, as well as the `tsconfig.json` file configuring the Typescript compile and the various package and lock files for managing dependencies.

The rest of the files are in the `src` directory. Specifically:
- The `index.ts` file contains a definition of the server's API.
- The `bootstrap.ts` file is used to initiate the web server.
- All project tests are in the `index.test.ts` file.

# Frameworks and Tools
This application is built using the Typescript programming language. Documentation for the language and its features is available at https://www.typescriptlang.org/docs/handbook/intro.html.

The build process and dev server use the Vite build tool. If you want to adjust the build process, you can find more information on how to use the tool at https://vite.dev/guide/.

Unit test support is provided by the Vitest testing framework. For more information on how to write and run tests using this framework, see https://vitest.dev/guide/.

Additional APIs for testing HTTP calls are provided by the supertest package, available at https://www.npmjs.com/package/supertest.
