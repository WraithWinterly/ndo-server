# ndo-server

## Overview

This server is built using Node.js and Express and is entirely written in TypeScript. It serves as the backend for the application, providing various endpoints, with a focus on security, functionality, and maintainability.

## Features

- **Authorization Endpoints**: Managed via the index file.
- **Modular Setup**: The server setup is modular with individual files being initialized through a function called within the index file.
- **Secure Endpoints**: Implemented a robust authentication mechanism to ensure that our endpoints remain secure.
- **Nonce-based JWT Authentication**: The server uses a nonce-based JWT authentication mechanism which requires signing with your connected wallet. Any requests made without the JWT token will be denied access.
- **Database**: Google's Firestore is employed as the primary database.
- **Data Fetching**: The server includes a unique `include` function which allows fetching documents based on the provided IDs, and then assigns this data directly onto the original object. This is flexible for both single ID values and arrays.

## Getting Started

### Prerequisites

1. Ensure you have a `service-key.json` from the Google Cloud Platform for Firestore integration.
2. Copy your `.env.example` file to a `.env` file and fill in the keys.

### Setup and Development

1. Clone the repository.
2. Install the necessary dependencies:

- `yarn`

3. For starting the development server:

- `yarn run dev`

4. To compile the TypeScript files:

- `npx tsc`
