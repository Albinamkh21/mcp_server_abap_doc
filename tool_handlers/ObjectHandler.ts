import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { BaseHandler } from './BaseHandler.js';
import type { ToolDefinition } from '../types/tools.js';

export class ObjectHandler extends BaseHandler {
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
                description: 'Retrieves technical metadata and structural components of an ABAP object. Returns core attributes, object links, URIs for individual source segments (definitions, implementations, and test classes)',
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
                description: 'Retrieves source code for a ABAP object. Use this tool when you need to read or analyze existing ABAP code.',
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
                description: 'Retrieves the full hierarchical path of an ABAP object within the systems package structure, starting from its root package down to the object itself',
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
                description: 'Retrieves version history for a specific object or one of its includes. Returns list of revision links with the date and author of each change',
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

    async handleObjectStructure(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const structure = await this.adtclient.objectStructure(args.objectUrl);
            this.trackRequest(startTime, true);
            return structure; /*{
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            structure,
                            message: 'Object structure retrieved successfully'
                        }, null, 2)
                    }
                ]
            };*/
        } catch (error: any) {
            this.trackRequest(startTime, false);
            const errorMessage = error.message || 'Unknown error';
            const detailedError = error.response?.data?.message || errorMessage;
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to get object structure: ${detailedError}`
            );
        }
    }

    async handleGetObjectPath(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const path = await this.adtclient.findObjectPath(args.objectUrl);
            this.trackRequest(startTime, true);
            return path; /*{
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            path,
                            message: 'Object path found successfully'
                        }, null, 2)
                    }
                ]
            };*/
        } catch (error: any) {
            this.trackRequest(startTime, false);
            const errorMessage = error.message || 'Unknown error';
            const detailedError = error.response?.data?.message || errorMessage;
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to find object path: ${detailedError}`
            );
        }
    }

    async handleGetObjects(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const results = await this.adtclient.searchObject(
                args.query
            );
            this.trackRequest(startTime, true);
            return results; /*{
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            results,
                            message: 'Object search completed successfully'
                        }, null, 2)
                    }
                ]
            };*/
        } catch (error: any) {
            this.trackRequest(startTime, false);
            const errorMessage = error.message || 'Unknown error';
            const detailedError = error.response?.data?.message || errorMessage;
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to search objects: ${detailedError}`
            );
        }
    }


    async handleGetObjectSourceCode(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const source = await this.adtclient.getObjectSource(`${args.objectUrl}/source/main`);
            this.trackRequest(startTime, true);
            return source; /*{
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            source
                        })
                    }
                ]
            };*/
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to get object source: ${error.message || 'Unknown error'}`
            );
        }
    }

    async handleObjectVersionHistory(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const revisions = await this.adtclient.revisions(args.objectUrl, args.clasInclude);
            this.trackRequest(startTime, true);
            return revisions; /*{
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            revisions
                        })
                    }
                ]
            };*/
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to get revisions: ${error.message || 'Unknown error'}`
            );
        }
    }

    async handlePackageObjects(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const nodeContents = await this.adtclient.nodeContents(
                'DEVC/K',
                args.package_name
            );
            this.trackRequest(startTime, true);
            return nodeContents; /*{
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            nodeContents
                        })
                    }
                ]
            };*/
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to get node contents: ${error.message || 'Unknown error'}`
            );
        }
    }
}