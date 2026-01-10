import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { BaseHandler } from './BaseHandler.js';
import type { ToolDefinition } from '../types/tools.js';

export class DdicHandler extends BaseHandler {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'getDdicElementDetails',
                description: 'Retrieves technical structure and metadata of ABAP Dictionary object (Table, Structure, or View). Returns the objects core properties, list of its fields (children) with details.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'Name of DDIC element'
                        },
                        getTargetForAssociation: {
                            type: 'boolean',
                            description: 'Whether to get the target for association.',
                            optional: true
                        },
                        getExtensionViews: {
                            type: 'boolean',
                            description: 'Whether to get extension views.',
                            optional: true
                        },
                        getSecondaryObjects: {
                            type: 'boolean',
                            description: 'Whether to get secondary objects.',
                            optional: true
                        }
                    },
                    required: ['path']
                }
            },
            {
                name: 'getPackagesByName',
                description: 'Performs a search for development packages with an optional name mask. Returns a list of package names and descriptions.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Package name query',
                            optional: true
                        }
                    },
                    required: ['type']
                }
            },
            {
                name: 'getTableContent',
                description: 'Retrieves the contents of an ABAP table/view',
                inputSchema: {
                    type: 'object',
                    properties: {
                        ddicEntityName: {
                            type: 'string',
                            description: 'The name of the DDIC entity (table or view)'
                        },
                        rowNumber: {
                            type: 'number',
                            description: 'The maximum number of rows to retrieve.',
                            optional: true
                        },
                        decode: {
                            type: 'boolean',
                            description: 'Whether to decode the data.',
                            optional: true
                        },
                        sqlQuery: {
                            type: 'string',
                            description: 'An optional SQL query to filter the data.',
                            optional: true
                        }
                    },
                    required: ['ddicEntityName']
                }
            },
            {
                name: 'runSqlQuery',
                description: 'Runs a SQL query on the target system.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sqlQuery: {
                            type: 'string',
                            description: 'The SQL query to execute.'
                        },
                        rowNumber: {
                            type: 'number',
                            description: 'The maximum number of rows to retrieve.',
                            optional: true
                        },
                        decode: {
                            type: 'boolean',
                            description: 'Whether to decode the data.',
                            optional: true
                        }
                    },
                    required: ['sqlQuery']
                }
            }
        ];
    }

    async handle(toolName: string, args: any): Promise<any> {
        switch (toolName) {
            case 'getDdicElementDetails':
                return this.handleDdicElement(args);
            case 'getPackagesByName':
                return this.handleGetPackages(args);
            case 'getTableContent':
                return this.handleTableContents(args);
            case 'runSqlQuery':
                return this.handleRunQuery(args);
            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown DDIC tool: ${toolName}`);
        }
    }

    async handleDdicElement(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const result = await this.adtclient.ddicElement(
                args.path,
                args.getTargetForAssociation,
                args.getExtensionViews,
                args.getSecondaryObjects
            );
            this.trackRequest(startTime, true);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            result
                        })
                    }
                ]
            };
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to get DDIC element: ${error.message || 'Unknown error'}`
            );
        }
    }

    async handleDdicRepositoryAccess(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const result = await this.adtclient.ddicRepositoryAccess(args.path);
            this.trackRequest(startTime, true);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            result
                        })
                    }
                ]
            };
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to access DDIC repository: ${error.message || 'Unknown error'}`
            );
        }
    }

    async handleGetPackages(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const result = await this.adtclient.packageSearchHelp('softwarecomponents', args.name);
            this.trackRequest(startTime, true);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            result
                        })
                    }
                ]
            };
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to get package search help: ${error.message || 'Unknown error'}`
            );
        }
    }

    async handleTableContents(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const result = await this.adtclient.tableContents(
                args.ddicEntityName,
                args.rowNumber,
                args.decode,
                args.sqlQuery
            );
            this.trackRequest(startTime, true);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            result
                        })
                    }
                ]
            };
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new Error(`Failed to retrieve table contents: ${error.message || 'Unknown error'}`);
        }
    }

    async handleRunQuery(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            await this.adtclient.login();
            const result = await this.adtclient.runQuery(
                args.sqlQuery,
                args.rowNumber,
                args.decode
            );
            this.trackRequest(startTime, true);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            result
                        })
                    }
                ]
            };
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new Error(`Failed to run query: ${error.message || 'Unknown error'}`);
        }
    }
}