#!/usr/bin/env node

import { config } from 'dotenv';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    McpError,
    ErrorCode
} from "@modelcontextprotocol/sdk/types.js";
import { ADTClient, session_types } from "abap-adt-api";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ObjectHandler } from './tool_handlers/ObjectHandler.js';
import { ClassHandler } from './tool_handlers/ClassHandler.js';
import { ReferenceHandler } from './tool_handlers/ReferenceHandler.js';
import { GeneralInfoHandler } from './tool_handlers/GeneralInfoHandler.js';
import { DdicHandler } from './tool_handlers/DdicHandler.js';
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: path.resolve(__dirname, '../.env') });

export class AbapAdtServer extends Server {
    private adtClient: ADTClient;
    private objectHandler: ObjectHandler;
    private classHandler: ClassHandler;
    private referenceHandler: ReferenceHandler;
    private generalInfoHandler: GeneralInfoHandler;
    private ddicHandler: DdicHandler;

    constructor() {
        super(
            {
                name: "mcp-atlas-server",
                version: "0.1.0",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        const missingVars = ['SAP_URL', 'SAP_USER', 'SAP_PASSWORD'].filter(v => !process.env[v]);
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        this.adtClient = new ADTClient(
            process.env.SAP_URL as string,
            process.env.SAP_USER as string,
            process.env.SAP_PASSWORD as string,
            process.env.SAP_CLIENT as string,
            process.env.SAP_LANGUAGE as string
        );
        this.adtClient.stateful = session_types.stateful

        this.objectHandler = new ObjectHandler(this.adtClient);
        this.classHandler = new ClassHandler(this.adtClient);
        this.referenceHandler = new ReferenceHandler(this.adtClient);
        this.generalInfoHandler = new GeneralInfoHandler(this.adtClient);
        this.ddicHandler = new DdicHandler(this.adtClient);
        this.setupToolHandlers();
    }

    private serializeResult(result: any) {
        try {
            if (!result) return { content: [{ type: 'text', text: 'No data returned from SAP' }] };
    
            // 1. ОБРАБОТКА КОДА (Mariofoo style)
            // Если это строка, проверяем, не XML ли это, и чистим его
            if (typeof result === 'string') {
                let text = result.trim();
                if (text.startsWith('<?xml') || text.includes('<adt:')) {
                    // Оставляем только текст между тегами или удаляем сами теги
                    text = text.replace(/<[^>]*>?/gm, '').trim(); 
                }
                return { content: [{ type: 'text', text: text }] };
            }
    
            // 2. ОЧИСТКА ОБЪЕКТОВ
            const blackList = ['links', 'etag', 'annex', 'changed_by', 'created_by', 'changed_at', 'parent_uri'];
            const clean = JSON.parse(JSON.stringify(result, (key, value) => {
                if (blackList.includes(key)) return undefined;
                if (typeof value === 'bigint') return value.toString();
                return value;
            }));
    
            // 3. ПРЕОБРАЗОВАНИЕ В ЧИТАЕМЫЙ СПИСОК (Вместо JSON.stringify массивов)
            let finalOutput: string;
            if (Array.isArray(clean)) {
                if (clean.length === 0) {
                    finalOutput = "Empty list";
                } else {
                    // ПРЕВРАЩАЕМ В ТЕКСТОВУЮ ТАБЛИЦУ/СПИСОК
                    // LLM понимает это в 10 раз лучше, чем JSON массив
                    finalOutput = clean.slice(0, 50).map(item => {
                        const name = item.name || item.ObjectName || '';
                        const type = item.type || item.ObjectType || '';
                        const desc = item.description || '';
                        return `- ${name} (${type}) ${desc}`;
                    }).join('\n');
    
                    if (clean.length > 50) {
                        finalOutput += `\n\n...and ${clean.length - 50} more objects.`;
                    }
                }
            } else {
                // Если это один объект (например, структура таблицы), оставляем JSON, но красивый
                finalOutput = JSON.stringify(clean, null, 2);
            }
    
            return { content: [{ type: 'text', text: finalOutput }] };
        } catch (error) {
            console.error('Serialization error:', error);
            return {
                content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
                isError: true
            };
        }
    }

    /*
    private serializeResult(result: any) {
        try {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(result, (key, value) =>
                        typeof value === 'bigint' ? value.toString() : value
                    )
                }]
            };
        } catch (error) {
            return this.handleError(new McpError(
                ErrorCode.InternalError,
                'Failed to serialize result'
            ));
        }
    }
    */

    private handleError(error: unknown) {
        if (!(error instanceof Error)) {
            error = new Error(String(error));
        }
        if (error instanceof McpError) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: error.message,
                        code: error.code
                    })
                }],
                isError: true
            };
        }
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: 'Internal server error',
                    code: ErrorCode.InternalError
                })
            }],
            isError: true
        };
    }

    private setupToolHandlers() {
        this.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    ...this.objectHandler.getTools(),
                    ...this.classHandler.getTools(),
                    ...this.referenceHandler.getTools(),
                    ...this.ddicHandler.getTools(),
                    ...this.generalInfoHandler.getTools(),
                    {
                        name: 'healthcheck',
                        description: 'Check server health and connectivity',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    }
                ]
            };
        });

        this.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                let result: any;

                switch (request.params.name) {
                    case 'getObjects':
                    case 'getObjectStructure':
                    case 'getObjectSourceCode':
                    case 'getObjectFullPath':
                    case 'getObjectVersionHistory':
                    case 'getPackageObjects':
                        result = await this.objectHandler.handle(request.params.name, request.params.arguments);
                        break;
                    case 'getClassComponents':
                    case 'getServiceBindingDetails':
                        result = await this.classHandler.handle(request.params.name, request.params.arguments);
                        break;
                    case 'getUsageReferences':
                    case 'getUsageReferenceSnippets':
                        result = await this.referenceHandler.handle(request.params.name, request.params.arguments);
                        break;
                    case 'getAllAnnotations':
                    case 'getAllObjectTypes':
                        result = await this.generalInfoHandler.handle(request.params.name, request.params.arguments);
                        break;
                    case 'getDdicElementDetails':
                    case 'getPackagesByName':
                    case 'getTableContent':
                    case 'runSqlQuery':
                        result = await this.ddicHandler.handle(request.params.name, request.params.arguments);
                        break;
                    case 'healthcheck':
                        result = { status: 'healthy', timestamp: new Date().toISOString() };
                        break;
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
                }

                return this.serializeResult(result);
            } catch (error) {
                return this.handleError(error);
            }
        });
    }
}

const server = new AbapAdtServer();


const app = express();
app.use(express.json());

app.post('/mcp', async (req: express.Request, res: express.Response) => {
    const allowedHostsString = process.env.MCP_ALLOWED_HOSTS;
    const allowedOriginsString = process.env.MCP_ALLOWED_ORIGINS;

    const parsedAllowedHosts = allowedHostsString ? allowedHostsString.split(',') : ['127.0.0.1'];
    const parsedAllowedOrigins = allowedOriginsString ? allowedOriginsString.split(',') : [];

    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
        allowedHosts: parsedAllowedHosts, 
        allowedOrigins: parsedAllowedOrigins, 
    });

    res.on('close', () => {
        transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env.PORT || '3000');
app.listen(port, () => {
    console.log(`Demo MCP Server running on http://localhost:${port}/mcp`);
}).on('error', (error: Error) => {
    console.error('Server error:', error);
    process.exit(1);
});