import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IHttpRequestOptions,
	NodeApiError,
	JsonObject,
} from 'n8n-workflow';

const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * SuperiorAPIMcp Node - MCP Protocol Dedicated Node
 *
 * Function: Interact with Model Context Protocol (MCP) servers
 * Supports: SSE and HTTP transport methods
 */
export class SuperiorApisMcp implements INodeType {
	// ==================== Node Basic Configuration ====================
	description: INodeTypeDescription = {
		// Node display name
		displayName: 'SuperiorAPIs (MCP)',

		// Node internal identifier
		name: 'superiorApisMcp',

		// Node icon
		icon: 'file:superiorapis.svg',

		// Node category
		group: ['transform'],

		// Node version number
		version: 1,

		// Subtitle (dynamically displays the currently selected operation)
		subtitle: '={{$parameter["connectionType"] + ": " + $parameter["operation"]}}',

		// Node description text
		description: 'Interact with Model Context Protocol (MCP) servers via SSE or HTTP',

		// Default configuration values
		defaults: {
			name: 'SuperiorAPIs (MCP)',
		},

		// Input endpoint
		inputs: ['main'],

		// Output endpoint
		outputs: ['main'],

		// ==================== Authentication Configuration ====================
		credentials: [
			{
				name: 'superiorAPISseApi',
				required: false,
				displayOptions: {
					show: {
						connectionType: ['sse'],
					},
				},
			},
			{
				name: 'superiorAPIHttpApi',
				required: false,
				displayOptions: {
					show: {
						connectionType: ['http'],
					},
				},
			},
		],

		// ==================== UI Parameter Configuration ====================
		properties: [
			// ==================== Connection Type Selector ====================
			{
				displayName: 'Connection Type',
				name: 'connectionType',
				type: 'options',
				options: [
					{
						name: 'Server-Sent Events (SSE)',
						value: 'sse',
						description: 'Use SSE transport for MCP connection',
					},
					{
						name: 'HTTP (JSON-RPC over POST)',
						value: 'http',
						description: 'Use HTTP POST for JSON-RPC communication',
					},
				],
				default: 'sse',
				description: 'Choose the transport type to connect to MCP server',
			},

			// ==================== Operation Selector ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Call Tool',
						value: 'tools/call',
						action: 'Execute a tool',
						description: 'Execute a tool',
					},
					{
						name: 'Get Prompt',
						value: 'prompts/get',
						action: 'Get a prompt',
						description: 'Get a prompt',
					},
					{
						name: 'Initialize',
						value: 'initialize',
						action: 'Initialize MCP connection',
						description: 'Initialize MCP connection',
					},
					{
						name: 'List Prompts',
						value: 'prompts/list',
						action: 'List available prompts',
						description: 'List available prompts',
					},
					{
						name: 'List Resources',
						value: 'resources/list',
						action: 'List available resources',
						description: 'List available resources',
					},
					{
						name: 'List Tools',
						value: 'tools/list',
						action: 'List available tools',
						description: 'List available tools',
					},
					{
						name: 'Read Resource',
						value: 'resources/read',
						action: 'Read a resource',
						description: 'Read a resource',
					},
				],
				default: 'tools/list',
			},

			// ==================== Tool Name Input Field ====================
			{
				displayName: 'Tool Name',
				name: 'toolName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['tools/call'],
					},
				},
				default: '',
				placeholder: 'tool_name',
				description: 'Name of the tool to execute',
			},

			// ==================== Resource URI Input Field ====================
			{
				displayName: 'Resource URI',
				name: 'resourceUri',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['resources/read'],
					},
				},
				default: '',
				placeholder: 'resource://uri',
				description: 'URI of the resource to read',
			},

			// ==================== Prompt Name Input Field ====================
			{
				displayName: 'Prompt Name',
				name: 'promptName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['prompts/get'],
					},
				},
				default: '',
				placeholder: 'prompt_name',
				description: 'Name of the prompt to get',
			},

			// ==================== Parameters JSON Editor ====================
			{
				displayName: 'Parameters',
				name: 'parameters',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['tools/call', 'prompts/get'],
					},
				},
				default: '{}',
				description: 'Tool/Prompt parameters as JSON object (supports expressions)',
			},
		],
	};

	/**
	 * ==================== Execute Function ====================
	 * Main logic executed when the Node is triggered
	 *
	 * Process:
	 * 1. Get input data
	 * 2. Iterate through each input item
	 * 3. Build MCP JSON-RPC request
	 * 4. Send request based on connection type (SSE or HTTP)
	 * 5. Return result data
	 */
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Get data passed from the previous node
		const items = this.getInputData();
		// Initialize return data array
		const returnData: INodeExecutionData[] = [];

		// Iterate through each input item
		for (let i = 0; i < items.length; i++) {
			try {
				// Get connection type and operation
				const connectionType = this.getNodeParameter('connectionType', i, 'sse') as string;
				const operation = this.getNodeParameter('operation', i) as string;

				// ==================== Build MCP JSON-RPC Request ====================
				const mcpRequest: IDataObject = {
					jsonrpc: '2.0',
					method: operation,
					id: Date.now(),
				};

				// Add parameters based on different operations
				if (operation === 'tools/call') {
					const toolName = this.getNodeParameter('toolName', i) as string;
					const paramsString = this.getNodeParameter('parameters', i, '{}') as string;
					const toolParams = JSON.parse(paramsString);

					mcpRequest.params = {
						name: toolName,
						arguments: toolParams,
					};
				} else if (operation === 'resources/read') {
					const resourceUri = this.getNodeParameter('resourceUri', i) as string;
					mcpRequest.params = { uri: resourceUri };
				} else if (operation === 'prompts/get') {
					const promptName = this.getNodeParameter('promptName', i) as string;
					const paramsString = this.getNodeParameter('parameters', i, '{}') as string;
					const promptParams = JSON.parse(paramsString);

					mcpRequest.params = {
						name: promptName,
						arguments: promptParams,
					};
				}

				let mcpUrl: string;
				let mcpHeaders: IDataObject = {};
				let timeout = 60000;

				// ==================== SSE Transport Mode ====================
				if (connectionType === 'sse') {
					// Get SSE connection parameters from credentials
					const credentials = await this.getCredentials('superiorAPISseApi');
					mcpUrl = credentials.sseUrl as string;
					timeout = (credentials.sseTimeout as number) || 60000;

					// Parse custom Headers (format: key=value, one per line)
					if (credentials.headers) {
						const headerLines = (credentials.headers as string).split('\n');
						for (const line of headerLines) {
							const equalsIndex = line.indexOf('=');
							if (equalsIndex > 0) {
								const name = line.substring(0, equalsIndex).trim();
								const value = line.substring(equalsIndex + 1).trim();
								if (name && value !== undefined) {
									mcpHeaders[name] = value;
								}
							}
						}
					}

					// Set required SSE Headers
					mcpHeaders['Accept'] = 'text/event-stream';
					mcpHeaders['Cache-Control'] = 'no-cache';
					mcpHeaders['Connection'] = 'keep-alive';
					mcpHeaders['Content-Type'] = 'application/json';

					// Use native HTTP(S) module to handle SSE stream
					const sseData = await handleSSERequest(mcpUrl, mcpRequest, mcpHeaders, timeout);

					returnData.push({
						json: sseData.length === 1
							? sseData[0]
							: {
									messages: sseData,
									messageCount: sseData.length,
								},
						pairedItem: { item: i },
					});
				}
				// ==================== HTTP Transport Mode ====================
				else if (connectionType === 'http') {
					// Get HTTP connection parameters from credentials
					const credentials = await this.getCredentials('superiorAPIHttpApi');
					mcpUrl = credentials.httpStreamUrl as string;
					timeout = (credentials.httpTimeout as number) || 60000;

					// Parse custom Headers
					if (credentials.headers) {
						const headerLines = (credentials.headers as string).split('\n');
						for (const line of headerLines) {
							const equalsIndex = line.indexOf('=');
							if (equalsIndex > 0) {
								const name = line.substring(0, equalsIndex).trim();
								const value = line.substring(equalsIndex + 1).trim();
								if (name && value !== undefined) {
									mcpHeaders[name] = value;
								}
							}
						}
					}

					// Set JSON-RPC Content-Type
					mcpHeaders['Content-Type'] = 'application/json';

					// Send HTTP POST request
					const options: IHttpRequestOptions = {
						method: 'POST',
						url: mcpUrl,
						headers: mcpHeaders,
						body: mcpRequest,
						json: true,
						timeout,
						returnFullResponse: false,
					};

					const response = await this.helpers.httpRequest(options);

					returnData.push({
						json: response as IDataObject,
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				// ==================== Error Handling ====================

				// If "Continue on Fail" is set, output the error message
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				// Otherwise throw error and interrupt execution
				throw new NodeApiError(this.getNode(), error as JsonObject);
			}
		}

		// Return all processing results
		return [returnData];
	}
}

/**
 * ==================== SSE Request Handler Function ====================
 *
 * Uses native HTTP(S) module to handle SSE long-connection requests
 *
 * @param url - SSE endpoint URL
 * @param jsonRpcRequest - MCP JSON-RPC request object
 * @param headers - Request Headers
 * @param timeout - Timeout duration (milliseconds)
 * @returns Parsed SSE data array
 */
function handleSSERequest(
	url: string,
	jsonRpcRequest: IDataObject,
	headers: IDataObject,
	timeout: number,
): Promise<any[]> {
	return new Promise((resolve, reject) => {
		const urlObj = new URL(url);
		const isHttps = urlObj.protocol === 'https:';
		const httpModule = isHttps ? https : http;

		const requestOptions = {
			hostname: urlObj.hostname,
			port: urlObj.port || (isHttps ? 443 : 80),
			path: urlObj.pathname + urlObj.search,
			method: 'GET',
			headers: headers as any,
		};

		const sseData: any[] = [];
		let buffer = '';
		let timeoutId: any;
		let isResolved = false;

		const req = httpModule.request(requestOptions, (res: any) => {
			// Set timeout
			timeoutId = (setTimeout as any)(() => {
				if (!isResolved) {
					isResolved = true;
					req.destroy();
					// Return collected data on timeout
					resolve(sseData.length > 0 ? sseData : [{ error: 'SSE timeout - no data received' }]);
				}
			}, timeout);

			res.on('data', (chunk: any) => {
				buffer += chunk.toString();

				// Process complete SSE events (separated by double newlines)
				const events = buffer.split('\n\n');
				// Retain the last potentially incomplete event
				buffer = events.pop() || '';

				for (const event of events) {
					if (!event.trim()) continue;

					const lines = event.split('\n');
					for (const line of lines) {
						if (line.startsWith('data: ')) {
							const dataContent = line.substring(6).trim();

							// Check for end marker
							if (dataContent === '[DONE]') {
								(clearTimeout as any)(timeoutId);
								if (!isResolved) {
									isResolved = true;
									req.destroy();
									resolve(sseData);
								}
								return;
							}

							// Parse JSON data
							try {
								const jsonData = JSON.parse(dataContent);
								sseData.push(jsonData);

								// If JSON-RPC response is received (contains result or error), consider request complete
								if (jsonData.result !== undefined || jsonData.error !== undefined) {
									(clearTimeout as any)(timeoutId);
									if (!isResolved) {
										isResolved = true;
										req.destroy();
										resolve(sseData);
									}
									return;
								}
							} catch (e) {
								// Ignore invalid JSON
							}
						}
					}
				}
			});

			res.on('end', () => {
				(clearTimeout as any)(timeoutId);
				if (!isResolved) {
					isResolved = true;
					// Process remaining data in buffer
					if (buffer.trim()) {
						const lines = buffer.split('\n');
						for (const line of lines) {
							if (line.startsWith('data: ')) {
								const dataContent = line.substring(6).trim();
								try {
									const jsonData = JSON.parse(dataContent);
									sseData.push(jsonData);
								} catch (e) {
									// Ignore invalid JSON
								}
							}
						}
					}
					resolve(sseData);
				}
			});

			res.on('error', (error: Error) => {
				(clearTimeout as any)(timeoutId);
				if (!isResolved) {
					isResolved = true;
					reject(new Error(`SSE response error: ${error.message}`));
				}
			});
		});

		req.on('error', (error: Error) => {
			(clearTimeout as any)(timeoutId);
			if (!isResolved) {
				isResolved = true;
				reject(new Error(`SSE request error: ${error.message}`));
			}
		});

		req.end();
	});
}
