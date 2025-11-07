import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SuperiorAPIsApi implements ICredentialType {
	name = 'superiorAPIsApi';
	displayName = 'SuperiorAPIs API';
	documentationUrl = 'https://superiorapis.cteam.com.tw/tutorials';
	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: 'https://superiorapis.cteam.com.tw',
			required: true,
			description: 'Base URL of the SuperiorAPIs service',
		},
		{
			displayName: 'Additional Headers',
			name: 'headers',
			type: 'json',
			typeOptions: {
				alwaysOpenEditWindow: true,
			},
			default: '{}',
			placeholder: '{\n  "X-Custom-Header": "value"\n}',
			description: 'Additional custom headers (optional, as JSON object)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://apis.cteam.com.tw/n8n-node-test',
			url: '/credential-verify',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: {
				test: 'ping',
			},
		},
	};
}
