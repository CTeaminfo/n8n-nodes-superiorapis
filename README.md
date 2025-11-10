# n8n-nodes-superiorapis

[![npm version](https://img.shields.io/npm/v/n8n-nodes-superiorapis)](https://www.npmjs.com/package/n8n-nodes-superiorapis)
[![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-superiorapis)](https://www.npmjs.com/package/n8n-nodes-superiorapis)

This is an n8n community node that provides integration with [SuperiorAPIs](https://superiorapis.cteam.com.tw/) - a comprehensive API marketplace platform. It allows you to access and utilize various APIs from the SuperiorAPIs store directly within your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Features

- **API Selection**: Browse and select from available APIs in the SuperiorAPIs marketplace
- **Dynamic Parameters**: Automatically loads API parameters based on OpenAPI specifications
- **Scenario Templates**: Use predefined request templates for common use cases
- **Flexible Input Methods**:
  - Resource Mapper for structured parameter input
  - JSON editor for advanced users
  - Key-value pairs for simple requests
- **Custom Headers & Query Parameters**: Full control over request configuration
- **Multiple HTTP Methods**: Support for GET, POST, PUT, PATCH, DELETE operations

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Community Installation (Recommended)

You can install this node directly from the n8n Community Nodes section:

1. Go to **Settings** > **Community Nodes** in your n8n instance
2. Select **Install**
3. Enter `n8n-nodes-superiorapis` in the text field
4. Click **Install**

### Manual Installation

To install manually, navigate to your n8n installation directory and run:

```bash
npm install n8n-nodes-superiorapis
```


## Usage

1. **Add the Node**: Drag the "SuperiorAPIs" node to your workflow canvas
2. **Enter Token**: Provide your SuperiorAPIs platform token
3. **Select API**: Choose from the available APIs (includes direct links to specification documents)
4. **Select HTTP Method**: Choose the appropriate method (GET, POST, etc.)
5. **Choose Scenario** (optional):
   - Select a predefined scenario template, or
   - Choose "Use Default Request Body" to configure parameters manually
6. **Configure Parameters**:
   - Use the Resource Mapper for structured input
   - Or edit the JSON body directly
   - Add custom query parameters or headers as needed
7. **Execute**: Run your workflow to call the API

## Example

### Calling a REST API with Scenario Template
```
1. Add SuperiorAPIs node
2. Enter your token
3. Select "Weather API" from the API list
4. Select "GET" method
5. Choose "Get Current Weather" scenario
6. Modify the JSON parameters if needed (e.g., city name)
7. Execute
```

## API Token

To use the SuperiorAPIs node, you need a token from the SuperiorAPIs platform:

1. Visit [SuperiorAPIs](https://superiorapis.cteam.com.tw/)
2. Sign up or log in to your account
3. Select the API you want to use
4. Click the "Try me" button
5. Expand the right panel
6. Click "sample" to retrieve your token from the sample data

## Documentation

- **SuperiorAPIs Platform**: [https://superiorapis.cteam.com.tw/en-us](https://superiorapis.cteam.com.tw/en-us)
- **Tutorials**: [https://superiorapis.cteam.com.tw/en-us/tutorials](https://superiorapis.cteam.com.tw/en-us/tutorials)
- **n8n Documentation**: [https://docs.n8n.io/](https://docs.n8n.io/)

## Compatibility

- **n8n version**: Compatible with n8n v1.0.0 and above
- **Node.js version**: Requires Node.js 20.15 or higher

## Development

### Build

```bash
npm run build
```

### Format

```bash
npm run format
```

### Lint

```bash
npm run lint
```

### Fix Linting Issues

```bash
npm run lintfix
```

## Support

For support, questions, or feature requests:

- **Email**: info@cteam.com.tw

## Contributing

Contributions are welcome! Please read the [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## License

[MIT](LICENSE.md)
