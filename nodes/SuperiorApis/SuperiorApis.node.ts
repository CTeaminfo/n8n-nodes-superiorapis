import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	NodeApiError,
	JsonObject,
	NodeOperationError,
	ResourceMapperFields,
	ResourceMapperField,
} from 'n8n-workflow';

/**
 * SuperiorAPIs Node - SuperiorAPIs platform API calling node
 *
 * Function: Select and call APIs from SuperiorAPIs platform
 */
export class SuperiorApis implements INodeType {
	// Cache helper method - Get and cache plugin list
	private async getPluginListCached(context: ILoadOptionsFunctions, token: string): Promise<any> {
		const workflowStaticData = context.getWorkflowStaticData('node');
		const cacheKey = `plugins_list_${token.substring(0, 20)}`; // Use first 20 characters of token as cache key
		const cacheTimeKey = `${cacheKey}_timestamp`;
		const CACHE_DURATION = 5 * 60 * 1000; // 5 minute cache

		const now = Date.now();
		const cachedTime = workflowStaticData[cacheTimeKey] as number;

		// Check if cache is valid
		if (workflowStaticData[cacheKey] && cachedTime && now - cachedTime < CACHE_DURATION) {
			return workflowStaticData[cacheKey];
		}

		// Call API
		const response = await context.helpers.httpRequest({
			method: 'POST',
			url: 'https://superiorapis-creator.cteam.com.tw/manager/module/plugins/list_v3',
			headers: { token },
			json: true,
		});

		// Update cache
		workflowStaticData[cacheKey] = response;
		workflowStaticData[cacheTimeKey] = now;
		return response;
	}

	// ==================== Node Basic Configuration ====================
	description: INodeTypeDescription = {
		// Node display name (name shown in UI)
		displayName: 'SuperiorAPIs',

		// Node internal identification name (used in code)
		name: 'superiorApis',

		// Node icon (using local SVG file)
		icon: 'file:superiorapis.svg',

		// Node category (category position in n8n interface)
		group: ['transform'],

		// Node version number
		version: 1,

		// Subtitle (dynamically displays currently selected API and Method)
		subtitle:
			'={{$parameter["method"] ? $parameter["method"] + " - " + $parameter["apiSelection"] : $parameter["apiSelection"] || "Select an API"}}',

		// Node description text
		description: 'Select and call APIs from SuperiorAPIs platform',

		// docs URL
		documentationUrl: 'https://superiorapis.cteam.com.tw/en-us/tutorials',

		// Default values configuration
		defaults: {
			name: 'SuperiorAPIs',
		},

		// Input endpoints (receive data)
		inputs: ['main'],

		// Output endpoints (send data)
		outputs: ['main'],

		// ==================== Authentication Configuration ====================
		// SuperiorAPIs API authentication (optional - for additional Headers)
		credentials: [
			{
				name: 'superiorAPIsApi',
				required: false,
			},
		],

		hints: [
			{
				// The hint message. You can use HTML.
				message:
					"This node has many input items. Consider enabling <b>Execute Once</b> in the node\'s settings.",
				// Choose from: info, warning, danger. The default is 'info'.
				// Changes the color. info (grey), warning (yellow), danger (red)
				type: 'info',
				// Choose from: inputPane, outputPane, ndv. By default n8n displays the hint in both the input and output panels.
				location: 'outputPane',
				// Choose from: always, beforeExecution, afterExecution. The default is 'always'
				whenToDisplay: 'beforeExecution',
				// Optional. An expression. If it resolves to true, n8n displays the message. Defaults to true.
				displayCondition: '={{ $parameter["operation"] === "select" && $input.all().length > 1 }}',
			},
		],

		// ==================== UI Parameter Configuration ====================
		properties: [
			// ==================== Token Input Field (for loading API list) ====================
			{
				displayName: 'Token',
				name: 'token',
				type: 'string',
				typeOptions: { password: true },
				required: true,
				default: '',
				placeholder: 'Enter your token',
				description:
					'Token for accessing SuperiorAPIs platform. After entering the token, select: API → Method → Scenario (optional).',
			},

			// ==================== API Selector ====================
			{
				displayName: 'API List Name or ID',
				name: 'apiSelection',
				type: 'options',
				noDataExpression: true,
				displayOptions: {},
				typeOptions: {
					loadOptionsMethod: 'getApiList',
					loadOptionsDependsOn: ['token'],
				},
				default: '',
				description:
					'Step 1: Select an API from SuperiorAPIs platform. Click "View Specification Document" link in each option to see the API details. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			// ==================== HTTP Method Selector ====================
			{
				displayName: 'HTTP Method Name or ID',
				name: 'method',
				type: 'options',
				noDataExpression: true,
				displayOptions: {},
				typeOptions: {
					loadOptionsMethod: 'getMethods',
					loadOptionsDependsOn: ['apiSelection', 'token'],
				},
				default: '',
				description:
					'Step 2: Select HTTP method (available after selecting an API). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			// ==================== Base URI Field ====================
			{
				displayName: 'Base URI',
				name: 'baseUri',
				type: 'string',
				default: 'https://superiorapis-creator.cteam.com.tw',
				required: true,
				displayOptions: {
					hide: {
						method: [''],
					},
				},
				description:
					'Base URI for API requests. This will be used as the prefix for all API calls. You can modify this if you need to use a different server.',
			},

			// ==================== Scenario Selector ====================
			{
				displayName: 'Scenario List Name or ID',
				name: 'scenario',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				noDataExpression: true,
				displayOptions: {},
				typeOptions: {
					loadOptionsMethod: 'getScenarioList',
					loadOptionsDependsOn: ['apiSelection', 'method', 'token'],
				},
				default: '',
			},

			// ==================== Body JSON (displayed when using scenario or not using scenario) ====================
			{
				displayName: 'Body JSON',
				name: 'bodyJson',
				type: 'json',
				default: '={{ $parameter["scenario"] }}',
				typeOptions: {
					alwaysOpenEditWindow: false,
					rows: 10,
				},
				displayOptions: {
					hide: {
						scenario: ['', 'no_use_scenario', 'error'],
					},
				},
				description:
					'Request body in JSON format. When using a scenario template, this shows the predefined parameters. When not using a template, this shows the default structure based on the API specification.',
			},

			// ==================== Body JSON Switch Notice ====================
			{
				displayName:
					'⚠️ Due to n8n parameter system limitations, when you switch between scenarios, the Body JSON field may display outdated content. To refresh the display:<br/><br/>Step 1: In the scenario list, select "Use Default Request Body".<br/>Step 2: Switch to the scenario you want to use.<br/><br/>Note: No matter what is displayed, the correct scenario JSON will always be used during execution.',
				name: 'bodyJsonNotice',
				type: 'notice',
				default:
					'Due to n8n parameter system limitations, when you switch between scenarios, the Body JSON field may display outdated content. To refresh the display:<br/><br/><strong>Method 1:</strong> Toggle between Expression and Fixed modes<br/><strong>Method 2:</strong> Click the field to edit, then click outside<br/><strong>Method 3:</strong> Close and reopen the node panel<br/><br/>Note: The correct JSON will always be used during execution regardless of the display.',
				displayOptions: {
					hide: {
						scenario: ['', 'no_use_scenario', 'error'],
					},
				},
			},

			// ==================== Parameters Resource Mapper (Query/Header - displayed when not using scenario) ====================
			{
				displayName: 'API Parameters',
				name: 'parametersFields',
				type: 'resourceMapper',
				noDataExpression: true,
				default: {
					mappingMode: 'defineBelow',
					value: null,
				},
				typeOptions: {
					loadOptionsDependsOn: ['scenario', 'method', 'apiSelection'],
					resourceMapper: {
						resourceMapperMethod: 'getParametersFields',
						mode: 'add',
						fieldWords: {
							singular: 'parameter',
							plural: 'parameters',
						},
						addAllFields: true,
						multiKeyMatch: false,
						supportAutoMap: false,
						matchingFieldsLabels: {
							title: 'Parameters',
							description: 'Fill in the API parameters below',
						},
						valuesLabel: 'Parameter Values',
					},
				},
				displayOptions: {
					show: {
						scenario: ['no_use_scenario'],
					},
				},
				description:
					'&lt;strong&gt;📝 API Parameters:&lt;/strong&gt;• &lt;strong&gt;[Q]&lt;/strong&gt; = Query parameter (sent in URL)• &lt;strong&gt;[H]&lt;/strong&gt; = Header parameter (sent in request headers)• &lt;strong&gt;*&lt;/strong&gt; = Required parameter',
			},

			// ==================== Request Body Resource Mapper (POST/PUT/PATCH - displayed when not using scenario) ====================
			{
				displayName: 'Request Body',
				name: 'bodyFields',
				type: 'resourceMapper',
				noDataExpression: true,
				default: {
					mappingMode: 'defineBelow',
					value: null,
				},
				typeOptions: {
					loadOptionsDependsOn: ['scenario', 'method', 'apiSelection'],
					resourceMapper: {
						resourceMapperMethod: 'getBodyFields',
						mode: 'add',
						fieldWords: {
							singular: 'field',
							plural: 'fields',
						},
						addAllFields: true,
						multiKeyMatch: false,
						supportAutoMap: false,
						matchingFieldsLabels: {
							title: 'Body Fields',
							description: 'Fill in the request body fields below',
						},
						valuesLabel: 'Request Body',
					},
				},
				displayOptions: {
					show: {
						scenario: ['no_use_scenario'],
						method: ['POST', 'PUT', 'PATCH'],
					},
				},
				description:
					'&lt;strong&gt;📝 Request Body Fields:&lt;/strong&gt;• All fields will be sent in the request body• &lt;strong&gt;*&lt;/strong&gt; = Required field',
			},

			// ==================== Query Parameters Section ====================

			// UI: Toggle button - whether to send Query Parameters
			{
				displayName: 'Send Query Parameters',
				name: 'sendQuery',
				type: 'boolean',
				default: false,
				description: 'Whether to send query parameters with the request',
			},

			// UI: Dropdown menu - select Query Parameters input method
			{
				displayName: 'Specify Query Parameters',
				name: 'specifyQuery',
				type: 'options',
				displayOptions: {
					show: {
						sendQuery: [true],
					},
				},
				options: [
					{
						name: 'Using Fields Below', // Option 1: use key-value pairs
						value: 'keypair',
						description: 'Enter query parameters as key-value pairs',
					},
					{
						name: 'Using JSON', // Option 2: use JSON
						value: 'json',
						description: 'Enter query parameters as a JSON object',
					},
				],
				default: 'keypair',
			},

			// UI: Key-value pair collection - Query Parameters (method 1)
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						sendQuery: [true],
						specifyQuery: ['keypair'],
					},
				},
				default: {},
				options: [
					{
						name: 'parameter',
						displayName: 'Parameter',
						values: [
							{
								displayName: 'Name', // Parameter name input field
								name: 'name',
								type: 'string',
								default: '',
								description: 'Parameter name',
							},
							{
								displayName: 'Value', // Parameter value input field
								name: 'value',
								type: 'string',
								default: '',
								description: 'Parameter value (supports expressions)',
							},
						],
					},
				],
			},

			// UI: JSON editor - Query Parameters (method 2)
			{
				displayName: 'Query Parameters',
				name: 'queryParametersJson',
				type: 'json',
				displayOptions: {
					show: {
						sendQuery: [true],
						specifyQuery: ['json'],
					},
				},
				default: '{}',
				description: 'Query parameters as JSON object (supports expressions)',
			},

			// ==================== Headers Section ====================

			// UI: Toggle button - whether to send custom Headers
			{
				displayName: 'Send Headers',
				name: 'sendHeaders',
				type: 'boolean',
				default: false,
				description: 'Whether to send custom headers with the request',
			},

			// UI: Dropdown menu - select Headers input method
			{
				displayName: 'Specify Headers',
				name: 'specifyHeaders',
				type: 'options',
				displayOptions: {
					show: {
						sendHeaders: [true],
					},
				},
				options: [
					{
						name: 'Using Fields Below', // Option 1: use key-value pairs
						value: 'keypair',
						description: 'Enter headers as key-value pairs',
					},
					{
						name: 'Using JSON', // Option 2: use JSON
						value: 'json',
						description: 'Enter headers as a JSON object',
					},
				],
				default: 'keypair',
			},

			// UI: Key-value pair collection - Headers (method 1)
			{
				displayName: 'Headers',
				name: 'headers',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						sendHeaders: [true],
						specifyHeaders: ['keypair'],
					},
				},
				default: {},
				options: [
					{
						name: 'parameter',
						displayName: 'Header',
						values: [
							{
								displayName: 'Name', // Header name input field (e.g., Authorization)
								name: 'name',
								type: 'string',
								default: '',
								description: 'Header name',
							},
							{
								displayName: 'Value', // Header value input field (e.g., Bearer token123)
								name: 'value',
								type: 'string',
								default: '',
								description: 'Header value (supports expressions)',
							},
						],
					},
				],
			},

			// UI: JSON editor - Headers (method 2)
			{
				displayName: 'Headers',
				name: 'headersJson',
				type: 'json',
				displayOptions: {
					show: {
						sendHeaders: [true],
						specifyHeaders: ['json'],
					},
				},
				default: '{}',
				description: 'Headers as JSON object (supports expressions)',
			},
		],
	};

	// ==================== Load Options Methods ====================
	methods = {
		loadOptions: {
			// Load API list
			async getApiList(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const token = this.getNodeParameter('token') as string;

				if (!token) {
					return [];
				}

				try {
					// Use cache method
					const superiorAPIsNode = new SuperiorApis();
					const response = await superiorAPIsNode['getPluginListCached'](this, token);

					if (!response.plugins || !Array.isArray(response.plugins)) {
						return [];
					}

					return response.plugins.map((item: any) => {
						const plugin = item.plugin;

						// Extract specification document URL from description_for_human by finding doc=spec link
						let specUrl = '';
						let interfaceId = '';
						if (plugin.description_for_human) {
							const specMatch = plugin.description_for_human.match(/(https?:\/\/[^\s"'<>]*doc=spec[^\s"'<>]*)/i);
							if (specMatch) {
								specUrl = specMatch[1];
								// Extract interface_id from URL (e.g., 3b52426bfe33)
								const idMatch = specUrl.match(/\/interface\/([a-zA-Z0-9]+)/);
								if (idMatch) {
									interfaceId = idMatch[1];
								}
							}
						}

						// Extract version info (try multiple possible locations)
						const version =
							plugin.version || plugin.interface?.version || plugin.interface?.info?.version || '';

						// Build description with clickable specification document link
						const baseDescription = plugin.description_for_human
							? plugin.description_for_human.split('\n')[0]
							: '';
						const description = specUrl
							? `${baseDescription}<br/>📖 <a href="${specUrl}" target="_blank">View Specification Document</a>`
							: baseDescription;

						// Encode complete plugin data to base64 (containing all necessary information)
						const pluginData = {
							id: plugin.id,
							interfaceId,
							version,
							name: plugin.name_for_human,
							interface: plugin.interface,
						};
						const encodedData = Buffer.from(JSON.stringify(pluginData)).toString('base64');

						return {
							name: plugin.name_for_human,
							value: encodedData,
							description,
						};
					});
				} catch (error) {
					// Return empty list if loading fails
					return [];
				}
			},

			// Load available HTTP Methods based on selected API
			async getMethods(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const apiSelection = this.getNodeParameter('apiSelection') as string;

				if (!apiSelection) {
					return [];
				}

				try {
					// Decode plugin data from base64
					const pluginData = JSON.parse(Buffer.from(apiSelection, 'base64').toString());

					const paths = pluginData.interface.paths;
					const firstPath = Object.keys(paths)[0];
					const pathMethods = paths[firstPath];

					return Object.keys(pathMethods).map((method: string) => ({
						name: method.toUpperCase(),
						value: method.toUpperCase(),
						description: pathMethods[method].summary || `${method.toUpperCase()} request`,
					}));
				} catch (error) {
					return [];
				}
			},

			// Load scenario test list
			async getScenarioList(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const apiSelection = this.getNodeParameter('apiSelection') as string;
				const method = this.getNodeParameter('method', '') as string;

				if (!apiSelection || !method) {
					return [];
				}

				try {
					// Decode plugin data from base64
					const pluginData = JSON.parse(Buffer.from(apiSelection, 'base64').toString());
					const interfaceId = pluginData.interfaceId;
					const version = pluginData.version;

					// Generate default request body JSON
					const paths = pluginData.interface.paths;
					const firstPath = Object.keys(paths)[0];
					const pathMethods = paths[firstPath];
					const methodData = pathMethods[method.toLowerCase()];

					// let defaultBodyJson = '{}';
					if (methodData && methodData.requestBody) {
						const content = methodData.requestBody.content;
						const jsonContent = content['application/json'];

						if (jsonContent && jsonContent.schema && jsonContent.schema.properties) {
							const properties = jsonContent.schema.properties;
							const defaultBody: any = {};

							Object.keys(properties).forEach((key) => {
								const prop = properties[key];
								// Set default value based on type
								if (prop.type === 'string') {
									defaultBody[key] = prop.example || '';
								} else if (prop.type === 'number' || prop.type === 'integer') {
									defaultBody[key] = prop.example || 0;
								} else if (prop.type === 'boolean') {
									defaultBody[key] = prop.example !== undefined ? prop.example : false;
								} else if (prop.type === 'array') {
									defaultBody[key] = prop.example || [];
								} else if (prop.type === 'object') {
									defaultBody[key] = prop.example || {};
								} else {
									defaultBody[key] = prop.example !== undefined ? prop.example : null;
								}
							});

							// defaultBodyJson = JSON.stringify(defaultBody, null, 2);
						}
					}

					const response = await this.helpers.httpRequest({
						method: 'POST',
						url: 'https://superiorapis.cteam.com.tw/superiorapis_store/node/scenario_sample_list',
						headers: {
							token: this.getNodeParameter('token') as string,
							'Content-Type': 'application/json',
						},
						body: {
							method: method.toLowerCase(),
							interface_id: interfaceId,
							version: version,
							version_suffix: '',
						},
						json: true,
					});

					if (response.status === 1 && response.data?.list && response.data.list.length > 0) {
						// Batch load request_content for all scenarios
						const scenariosWithContent = await Promise.all(
							response.data.list.map(async (scenario: any) => {
								try {
									const scenarioDetailResponse = await this.helpers.httpRequest({
										method: 'GET',
										url: `https://superiorapis.cteam.com.tw/superiorapis_store/node/scenario?scenario_id=${scenario.scenario_id}`,
										headers: {
											token: this.getNodeParameter('token') as string,
										},
										json: true,
									});

									if (
										scenarioDetailResponse.status === 1 &&
										scenarioDetailResponse.data?.request_content
									) {
										const requestContent = scenarioDetailResponse.data.request_content;

										return {
											name: scenario.scenario_name,
											value: JSON.stringify(requestContent, null, 4),
										};
									}
								} catch (error) {
									// Return option without description if loading fails
								}

								return {
									name: scenario.scenario_name,
									value: scenario.scenario_id,
								};
							}),
						);

						// Add "Use Default Template" option at the beginning of the list
						return [
							{ name: 'Use Default Request Body', value: 'no_use_scenario' },
							...scenariosWithContent,
						];
					}

					// If API response is successful but no scenario data
					return [
						{ name: 'Use Default Request Body', value: 'no_use_scenario' },
						{
							name: `No scenario templates available for ${method.toUpperCase()} method`,
							value: 'no_scenario',
						},
					];
				} catch (error) {
					// If API call fails
					return [
						{ name: 'Use Default Request Body', value: 'no_use_scenario' },
						{
							name: `Failed to load scenario list. Please check network connection.`,
							value: 'error',
						},
					];
				}
			},
		},
		resourceMapping: {
			// Handle Parameters (Query/Header)
			async getParametersFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
				const scenario = this.getNodeParameter('scenario', '') as string;
				const method = this.getNodeParameter('method', '') as string;
				const apiSelection = this.getNodeParameter('apiSelection', '') as string;

				// Helper function: Map OpenAPI schema type to n8n field type
				const mapSchemaTypeToFieldType = (schemaType: string): ResourceMapperField['type'] => {
					const typeMap: Record<string, ResourceMapperField['type']> = {
						string: 'string',
						number: 'number',
						integer: 'number',
						boolean: 'boolean',
						array: 'array',
						object: 'object',
					};
					return typeMap[schemaType] || 'string';
				};

				// Only generate fields when using no_use_scenario
				if (scenario === 'no_use_scenario' && method && apiSelection) {
					try {
						const pluginData = JSON.parse(Buffer.from(apiSelection, 'base64').toString());
						const paths = pluginData.interface.paths;
						const firstPath = Object.keys(paths)[0];
						const pathMethods = paths[firstPath];
						const methodData = pathMethods[method.toLowerCase()];

						if (!methodData) {
							return { fields: [] };
						}

						const fields: ResourceMapperField[] = [];

						// Handle parameters (query/header)
						if (methodData.parameters) {
							methodData.parameters.forEach((param: any) => {
								const inType = param.in === 'query' ? '[Q]' : '[H]';
								const description = param.description ? ` - ${param.description}` : '';
								fields.push({
									id: `${param.in}_${param.name}`,
									displayName: `${param.name}${param.required ? ' *' : ''} ${inType}${description}`,
									required: param.required || false,
									defaultMatch: true,
									display: true,
									type: mapSchemaTypeToFieldType(param.schema?.type || 'string'),
									canBeUsedToMatch: true,
								});
							});
						}

						// Sort: required fields first
						fields.sort((a, b) => {
							if (a.required && !b.required) return -1;
							if (!a.required && b.required) return 1;
							return 0;
						});

						return { fields };
					} catch (error) {
						return { fields: [] };
					}
				}

				return { fields: [] };
			},

			// Handle Request Body (POST/PUT/PATCH)
			async getBodyFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
				const scenario = this.getNodeParameter('scenario', '') as string;
				const method = this.getNodeParameter('method', '') as string;
				const apiSelection = this.getNodeParameter('apiSelection', '') as string;

				// Helper function
				const mapSchemaTypeToFieldType = (schemaType: string): ResourceMapperField['type'] => {
					const typeMap: Record<string, ResourceMapperField['type']> = {
						string: 'string',
						number: 'number',
						integer: 'number',
						boolean: 'boolean',
						array: 'array',
						object: 'object',
					};
					return typeMap[schemaType] || 'string';
				};

				// Only generate body fields when using no_use_scenario and for POST/PUT/PATCH
				if (
					scenario === 'no_use_scenario' &&
					['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) &&
					apiSelection
				) {
					try {
						const pluginData = JSON.parse(Buffer.from(apiSelection, 'base64').toString());
						const paths = pluginData.interface.paths;
						const firstPath = Object.keys(paths)[0];
						const pathMethods = paths[firstPath];
						const methodData = pathMethods[method.toLowerCase()];

						if (!methodData || !methodData.requestBody) {
							return { fields: [] };
						}

						const fields: ResourceMapperField[] = [];
						const content = methodData.requestBody.content;
						const jsonContent = content['application/json'];

						if (jsonContent && jsonContent.schema && jsonContent.schema.properties) {
							const properties = jsonContent.schema.properties;
							const required = jsonContent.schema.required || [];

							Object.keys(properties).forEach((key) => {
								const prop = properties[key];
								const description = prop.description ? ` - ${prop.description}` : '';
								fields.push({
									id: `body_${key}`,
									displayName: `${key}${required.includes(key) ? ' *' : ''}${description}`,
									required: required.includes(key),
									defaultMatch: true,
									display: true,
									type: mapSchemaTypeToFieldType(prop.type || 'string'),
									canBeUsedToMatch: true,
								});
							});
						}

						// Sort: required fields first
						fields.sort((a, b) => {
							if (a.required && !b.required) return -1;
							if (!a.required && b.required) return 1;
							return 0;
						});

						return { fields };
					} catch (error) {
						return { fields: [] };
					}
				}

				return { fields: [] };
			},
		},
	};

	/**
	 * ==================== Execute Function ====================
	 * Main logic executed when Node is triggered
	 *
	 * Flow:
	 * 1. Get selected API information
	 * 2. Extract URL and HTTP method
	 * 3. Get Authorization from Credential
	 * 4. Handle user-defined Headers and Body
	 * 5. Send HTTP request
	 * 6. Return result data
	 */
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Get data passed from previous node
		const items = this.getInputData();
		// Initialize return data array
		const returnData: INodeExecutionData[] = [];

		// Iterate through each input item (supports batch processing)
		for (let i = 0; i < items.length; i++) {
			try {
				// ==================== Get API Information ====================
				const token = this.getNodeParameter('token', i) as string;
				const apiSelection = this.getNodeParameter('apiSelection', i, '') as string;

				// Validate required fields
				if (!token) {
					throw new NodeOperationError(this.getNode(), 'Token is required', { itemIndex: i });
				}
				if (!apiSelection) {
					throw new NodeOperationError(this.getNode(), 'Please select an API from the list', {
						itemIndex: i,
					});
				}

				// Decode plugin data from base64
				const pluginData = JSON.parse(Buffer.from(apiSelection, 'base64').toString());

				// Get user selected HTTP Method
				let method = this.getNodeParameter('method', i, '') as string;

				// Get Base URI
				const baseUri = this.getNodeParameter(
					'baseUri',
					i,
					'https://superiorapis-creator.cteam.com.tw',
				) as string;

				// Extract path
				const paths = pluginData.interface.paths;
				const firstPath = Object.keys(paths)[0];
				const pathMethods = paths[firstPath];

				// If user hasn't selected a method, use the first available one
				if (!method) {
					method = Object.keys(pathMethods)[0].toUpperCase();
				}

				// Compose complete URL (using custom Base URI)
				const url = `${baseUri}${firstPath}`;

				// ==================== Handle Headers ====================
				// Prioritize Token field as token header for API request
				let headers: IDataObject = {
					token: token,
				};

				// Get Credential (for additional headers, but don't override token)
				const credentials = await this.getCredentials('superiorAPIsApi');

				// Merge additional headers from Credential (but protect token field from override)
				if (credentials.headers) {
					const credHeaders = JSON.parse(credentials.headers as string);
					// Remove token field from credential headers to avoid override
					delete credHeaders.token;
					headers = { ...headers, ...credHeaders };
				}

				// Merge user-defined Headers (but protect token field from override)
				const sendHeaders = this.getNodeParameter('sendHeaders', i, false) as boolean;
				if (sendHeaders) {
					const specifyHeaders = this.getNodeParameter('specifyHeaders', i) as string;

					if (specifyHeaders === 'keypair') {
						const params = this.getNodeParameter('headers', i, {}) as IDataObject;
						if (params.parameter && Array.isArray(params.parameter)) {
							const userHeaders = params.parameter.reduce((acc: IDataObject, p: IDataObject) => {
								acc[p.name as string] = p.value;
								return acc;
							}, {});
							// Remove token field from user headers to avoid override
							delete userHeaders.token;
							headers = { ...headers, ...userHeaders };
						}
					} else {
						const jsonString = this.getNodeParameter('headersJson', i) as string;
						const userHeaders = JSON.parse(jsonString);
						// Remove token field from user headers to avoid override
						delete userHeaders.token;
						headers = { ...headers, ...userHeaders };
					}
				}

				// ==================== Handle Query Parameters ====================
				let queryParams: IDataObject = {};
				const sendQuery = this.getNodeParameter('sendQuery', i, false) as boolean;

				if (sendQuery) {
					const specifyQuery = this.getNodeParameter('specifyQuery', i) as string;

					if (specifyQuery === 'keypair') {
						const params = this.getNodeParameter('queryParameters', i, {}) as IDataObject;
						if (params.parameter && Array.isArray(params.parameter)) {
							queryParams = params.parameter.reduce((acc: IDataObject, p: IDataObject) => {
								acc[p.name as string] = p.value;
								return acc;
							}, {});
						}
					} else {
						const jsonString = this.getNodeParameter('queryParametersJson', i) as string;
						queryParams = JSON.parse(jsonString);
					}
				}

				// ==================== Handle Request Body and Dynamic Parameters ====================
				let body: IDataObject | string | undefined;
				const scenario = this.getNodeParameter('scenario', i, '') as string;

				// Read query/header parameters from parametersFields resourceMapper
				const parametersFields = this.getNodeParameter(
					'parametersFields',
					i,
					null,
				) as IDataObject | null;
				if (parametersFields && parametersFields.value) {
					const params = parametersFields.value as IDataObject;
					Object.keys(params).forEach((key) => {
						const value = params[key];
						// query_ prefix: add to query parameters
						if (key.startsWith('query_')) {
							const paramName = key.replace('query_', '');
							queryParams[paramName] = value;
						}
						// header_ prefix: add to headers (but don't override token)
						else if (key.startsWith('header_')) {
							const paramName = key.replace('header_', '');
							if (paramName !== 'token') {
								headers[paramName] = value;
							}
						}
					});
				}

				// Read request body from bodyJson (if scenario template is selected or not using scenario template)
				if (scenario && scenario !== '' && scenario !== 'no_scenario' && scenario !== 'error') {
					try {
						const bodyJsonString = this.getNodeParameter('bodyJson', i, '') as string;
						if (bodyJsonString && bodyJsonString.trim() !== '' && bodyJsonString.trim() !== '{}') {
							body = JSON.parse(bodyJsonString);
						}
					} catch (error) {
						throw new NodeOperationError(
							this.getNode(),
							`Failed to parse body JSON: ${(error as Error).message}`,
							{ itemIndex: i },
						);
					}
				}

				// Auto-detect API required Content-Type (only for POST/PUT/PATCH)
				if (['POST', 'PUT', 'PATCH'].includes(method)) {
					const methodData = pathMethods[method.toLowerCase()];
					if (methodData?.requestBody?.content) {
						const contentTypes = Object.keys(methodData.requestBody.content);
						const apiContentType = contentTypes[0]; // Use the first content type defined by API

						// Set correct Content-Type Header according to API requirements
						if (!headers['Content-Type']) {
							if (apiContentType.includes('multipart/form-data')) {
								headers['Content-Type'] = 'multipart/form-data';
							} else if (apiContentType.includes('application/json')) {
								headers['Content-Type'] = 'application/json';
							} else if (apiContentType.includes('application/x-www-form-urlencoded')) {
								headers['Content-Type'] = 'application/x-www-form-urlencoded';
							} else {
								// If it's another type, directly use the content type defined by API
								headers['Content-Type'] = apiContentType;
							}
						}
					}
				}

				// ==================== Send HTTP Request ====================
				const options: IHttpRequestOptions = {
					method: method as IHttpRequestOptions['method'],
					url,
					qs: queryParams,
					headers,
					body,
					json: true,
					returnFullResponse: false,
				};
				const response = await this.helpers.httpRequest(options);

				// Add response data to return array
				returnData.push({
					json: typeof response === 'object' ? response : { data: response },
					pairedItem: { item: i },
				});
			} catch (error) {
				// ==================== Error Handling ====================
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject);
			}
		}

		// Return all processing results
		return [returnData];
	}
}
