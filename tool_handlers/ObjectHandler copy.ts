import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { BaseHandler } from './BaseHandler.js';
import type { ToolDefinition } from '../types/tools.js';

export class ObjectHandler__ extends BaseHandler {
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

    async handleGetObjects(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const query = args.query.replace(/\.\*/g, '*');
            const results = await this.adtclient.searchObject(query);
            this.trackRequest(startTime, true);
    
            if (!results || results.length === 0) return "No objects found.";
    
            return results.map((item: any) => {
                const name = item['adtcore:name'] || item.name;
                const type = item['adtcore:type'] || item.type;
                const desc = item['adtcore:description'] || '';
                const uri = item['adtcore:uri'] || item.uri;
                return `- ${name} (${type}) ${desc}\n  URL: ${uri}`;
            }).join('\n');
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(ErrorCode.InternalError, `Search failed: ${error.message}`);
        }
    }
    
    async handleObjectStructure(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const structure = await this.adtclient.objectStructure(args.objectUrl);
            this.trackRequest(startTime, true);
            return structure;
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(ErrorCode.InternalError, `Failed to get structure: ${error.message}`);
        }
    }
    
    async handleGetObjectSourceCode(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const url = args.objectUrl.includes('/source/main') ? args.objectUrl : `${args.objectUrl}/source/main`;
            const source = await this.adtclient.getObjectSource(url);
            this.trackRequest(startTime, true);
            return source;
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(ErrorCode.InternalError, `Failed to get source: ${error.message}`);
        }
    }
    
    async handleGetObjectPath(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const path = await this.adtclient.findObjectPath(args.objectUrl);
            this.trackRequest(startTime, true);
    
            if (!path || path.length === 0) return "Path not found";
            
            return path
                .map((p: any) => `${p['adtcore:name']} (${p['adtcore:type']})`)
                .join(' > ');
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(ErrorCode.InternalError, `Failed to find path: ${error.message}`);
        }
    }
    
    async handleObjectVersionHistory(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const revisions = await this.adtclient.revisions(args.objectUrl);
            this.trackRequest(startTime, true);
    
            if (!revisions || revisions.length === 0) return "No version history found.";
    
            return revisions.map((rev: any) => {
                return `Version: ${rev.version} | Author: ${rev.author} | Date: ${rev.date}\n  URL: ${rev.uri}`;
            }).join('\n---\n');
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(ErrorCode.InternalError, `Failed to get versions: ${error.message}`);
        }
    }
    
    async handlePackageObjects(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const nodeContents = await this.adtclient.nodeContents('DEVC/K', args.package_name);
            this.trackRequest(startTime, true);
    
            if (!nodeContents || nodeContents.nodes.length === 0) return "Package is empty.";
    
            return nodeContents.nodes.map((node: any) => {
                const name = node.name || 'Unknown';
                const type = node.type || 'Unknown type';
                const desc = node.description || '';
                return `- ${name} (${type}) ${desc}`;
            }).join('\n');
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(ErrorCode.InternalError, `Failed to get package objects: ${error.message}`);
        }
    }

  
}