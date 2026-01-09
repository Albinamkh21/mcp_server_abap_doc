import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { BaseHandler } from './BaseHandler.js';
import type { ToolDefinition } from '../types/tools.js';
import { ADTClient } from 'abap-adt-api';

export class ClassHandler extends BaseHandler {
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
                        binding: {
                            type: 'object',
                            description: 'The service binding.'
                        }
                    },
                    required: ['binding']
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
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const result = await this.adtclient.classComponents(args.objectUrl);
            this.trackRequest(startTime, true);
            return  result; /*{
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            result
                        })
                    }
                ]
            };*/
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to get class components: ${error.message || 'Unknown error'}`
            );
        }
    }

    async handleBindingDetails(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const details = await this.adtclient.bindingDetails(args.binding);
            this.trackRequest(startTime, true);
            return details; /*{
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            details
                        })
                    }
                ]
            };*/
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to get binding details: ${error.message || 'Unknown error'}`
            );
        }
    }
}