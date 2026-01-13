import { 
    McpError, 
    ErrorCode, 
    makeAdtRequest, 
    return_error, 
    return_response, 
    getBaseUrl, 
    transformClassStructure,
    transformClassStructureClean 
} from '../utils/utils.js'; 
import { BaseHandler } from './BaseHandler.js';
import type { ToolDefinition } from '../types/tools.js';

export class ClassHandler  {
    
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'getClassComponents',
                description: 'List methods and attributes of class',
                inputSchema: {
                    type: 'object',
                    properties: {
                        objectUrl: {
                            type: 'string',
                            description: 'The URL of the class'
                        }
                    },
                    required: ['objectUrl']
                }
            },
            {
                name: 'getServiceBindingDetails',
                description: 'Retrieves details of a service binding',
                inputSchema: {
                    type: 'object',
                    properties: {
                        objectUrl: {
                            type: 'string',
                            description: 'The URL of the class'
                        }
                    },
                    required: ['objectUrl']
                }
            }
        ];
    }

    async handle(toolName: string, args: any): Promise<any> {
        switch (toolName) {
            case 'getClassComponents':
                return this.handleClassComponents(args);
            case 'getServiceBindingDetails':
                return this.handleBindingDetails(args);
            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown class tool: ${toolName}`);
        }
    }
    async handleClassComponents(args: any): Promise<any> {
        try {
            if (!args?.objectUrl) {
                throw new McpError(ErrorCode.InvalidParams, 'Object URL is required');
            }
    
            const baseUrl = await getBaseUrl();
            const url = `${baseUrl}${args.objectUrl}/objectstructure`;
    
            const response = await makeAdtRequest(url, 'GET', 30000);
            
         
            return return_response(response, transformClassStructureClean);
        } catch (error) {
            return return_error(error);
        }
    }

    async handleBindingDetails(args: any): Promise<any> {
        try {
            if (!args?.objectUrl) {
                throw new McpError(ErrorCode.InvalidParams, 'Object URL is required');
            }
    
            const baseUrl = await getBaseUrl();
            
        
            const url = `${baseUrl}${args.objectUrl}`; 
    
            const response = await makeAdtRequest(url, 'GET', 30000);
    
        
            return return_response(response); 
        } catch (error) {
            return return_error(error);
        }
    }
}