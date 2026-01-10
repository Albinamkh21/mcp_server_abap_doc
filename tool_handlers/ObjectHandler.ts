import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { BaseHandler } from './BaseHandler.js';
import type { ToolDefinition } from '../types/tools.js';
import { 
    makeAdtRequest, 
    return_error, 
    return_response, 
    getBaseUrl, 
    transformSearchResults, 
    transformAbapSource,
    transformObjectMeta,
    xmlArray 
} from '../utils/utils.js';

export class ObjectHandler  {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'getObjects',
                description: 'Get objects by regex query. Returns objectURL',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query string'
                        }
                    },
                    required: ['query']
                }
            },
            {
                name: 'getObjectStructure',
                description: 'Retrieves technical metadata and structural components of an ABAP object.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        objectUrl: {
                            type: 'string',
                            description: 'URL of the object'
                        }
                    },
                    required: ['objectUrl']
                }
            },
            {
                name: 'getObjectSourceCode',
                description: 'Retrieves source code for a ABAP object.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        objectUrl: { type: 'string' }
                    },
                    required: ['objectUrl']
                }
            },
            {
                name: 'getObjectFullPath',
                description: 'Retrieves the full hierarchical path of an ABAP object.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        objectUrl: {
                            type: 'string',
                            description: 'URL of the object to find path for'
                        }
                    },
                    required: ['objectUrl']
                }
            },
            {
                name: 'getObjectVersionHistory',
                description: 'Retrieves version history for a specific object.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        objectUrl: {
                            type: 'string',
                            description: 'The URL of the object.'
                        }
                    },
                    required: ['objectUrl']
                }
            },
            {
                name: 'getPackageObjects',
                description: 'Retrieves list of objects inside of package',
                inputSchema: {
                    type: 'object',
                    properties: {
                        package_name: {
                            type: 'string',
                        }
                    },
                    required: ['package_name']
                }
            }
        ];
    }

    async handle(toolName: string, args: any): Promise<any> {
        switch (toolName) {
            case 'getObjects':
                return this.handleGetObjects(args);
            case 'getObjectStructure':
                return this.handleObjectStructure(args);
            case 'getObjectSourceCode':
                return this.handleGetObjectSourceCode(args);
            case 'getObjectFullPath':
                return this.handleGetObjectPath(args);
            case 'getObjectVersionHistory':
                return this.handleObjectVersionHistory(args);
            case 'getPackageObjects':
                return this.handlePackageObjects(args);
            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown object tool: ${toolName}`);
        }
    }

    async handleGetObjects(args: any): Promise<any> {
        try {
            if (!args?.query) {
                throw new McpError(ErrorCode.InvalidParams, 'Search query is required');
            }
            const query = args.query.replace(/\.\*/g, '*');
            const maxResults = args.maxResults || 100;
            const encodedQuery = encodeURIComponent(query);
            const url = `${await getBaseUrl()}/sap/bc/adt/repository/informationsystem/search?operation=quickSearch&query=${encodedQuery}&maxResults=${maxResults}`;
            const response = await makeAdtRequest(url, 'GET', 30000);
            return return_response(response, transformSearchResults);
        } catch (error) {
            return return_error(error);
        }
    }

    async handleObjectStructure(args: any): Promise<any> {
        try {
            if (!args?.objectUrl) {
                throw new McpError(ErrorCode.InvalidParams, 'Object URL is required');
            }
            const url = `${await getBaseUrl()}${args.objectUrl}`;
            const response = await makeAdtRequest(url, 'GET', 30000);
            return return_response(response, transformObjectMeta);
        } catch (error) {
            return return_error(error);
        }
    }

    async handleGetObjectSourceCode(args: any): Promise<any> {
        try {
            if (!args?.objectUrl) {
                throw new McpError(ErrorCode.InvalidParams, 'Object URL is required');
            }
            const sourceUrl = args.objectUrl.includes('/source/main') ? args.objectUrl : `${args.objectUrl}/source/main`;
            const url = `${await getBaseUrl()}${sourceUrl}`;
            const response = await makeAdtRequest(url, 'GET', 30000);
            return return_response(response, transformAbapSource);
        } catch (error) {
            return return_error(error);
        }
    }

   

    async handleGetObjectPath(args: any): Promise<any> {
        const { data } = await makeAdtRequest(`${await getBaseUrl()}${args.objectUrl}`, 'GET', 30000);
        
        // Берем любой корень (класс, программу или таблицу)
        const root = data['class:abapClass'] || data['adtcore:object'] || data['program:abapProgram'] || data['table:abapTable'];
        const attrs = root?._attributes || {};
    
        return {
            path: `${root?.['adtcore:packageRef']?._attributes?.['adtcore:name'] || 'TMP'} > ${attrs['adtcore:name']}`
        };
    }

    async handleObjectVersionHistory(args: any): Promise<any> {
        try {
            if (!args?.objectUrl) {
                throw new McpError(ErrorCode.InvalidParams, 'Object URL is required');
            }
    
            const baseUrl = await getBaseUrl();
         
            const url = `${baseUrl}/sap/bc/adt/repository/revisions?uri=${encodeURIComponent(args.objectUrl)}`;
    
            const response = await makeAdtRequest(url, 'GET', 30000);
            
          
            return return_response(response, (data) => data); 
        } catch (error) {
            return return_error(error);
        }
    }

    async handlePackageObjects(args: any): Promise<any> {
        try {
            if (!args?.package_name) {
                throw new McpError(ErrorCode.InvalidParams, 'Package name is required');
            }
            const url = `${await getBaseUrl()}/sap/bc/adt/repository/nodestructure?parent_name=${encodeURIComponent(args.package_name)}&parent_type=DEVC/K`;
            const response = await makeAdtRequest(url, 'GET', 30000);
            return return_response(response);
        } catch (error) {
            return return_error(error);
        }
    }
}