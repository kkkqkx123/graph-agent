/**
 * MCP Commands
 * Manage MCP server connections and tools
 */

import { Command } from 'commander';
import { McpAdapter, createMcpAdapter } from '../../adapters/mcp-adapter.js';
import { getLogger } from '../../utils/logger.js';
import { formatToolList } from '../../utils/formatter.js';
import { handleError } from '../../utils/error-handler.js';
import { ValidationError } from '../../types/cli-types.js';

const logger = getLogger();

/**
 * Create MCP command group
 */
export function createMcpCommands(): Command {
  const mcpCmd = new Command('mcp')
    .description('Manage MCP servers and tools');

  // Connect command
  mcpCmd
    .command('connect <config-file>')
    .description('Connect to MCP servers from configuration file')
    .option('-v, --verbose', 'Verbose output')
    .action(async (configFile, options: { verbose?: boolean }) => {
      try {
        logger.info(`Connecting to MCP servers from: ${configFile}`);

        const adapter = createMcpAdapter();
        const tools = await adapter.loadFromConfig(configFile);

        console.log(`\n✓ Connected to MCP servers`);
        console.log(`  Loaded ${tools.length} tools`);

        if (options.verbose && tools.length > 0) {
          console.log('\nAvailable tools:');
          console.log(formatToolList(tools, { table: false }));
        }
      } catch (error) {
        handleError(error, {
          operation: 'connectMcpServers',
          additionalInfo: { configFile }
        });
      }
    });

  // List command
  mcpCmd
    .command('list')
    .description('List all MCP tools')
    .option('-t, --table', 'Output in table format')
    .option('-v, --verbose', 'Verbose output')
    .action(async (options: { table?: boolean; verbose?: boolean }) => {
      try {
        // Note: This would need access to a shared adapter instance
        // For now, this is a placeholder showing the command structure
        console.log('MCP tools listing command');
        console.log('(This command requires integration with ToolRegistry)');
      } catch (error) {
        handleError(error, {
          operation: 'listMcpTools'
        });
      }
    });

  // Status command
  mcpCmd
    .command('status')
    .description('Show MCP server connection status')
    .action(async () => {
      try {
        // Note: This would need access to a shared adapter instance
        console.log('MCP server status command');
        console.log('(This command requires integration with ToolRegistry)');
      } catch (error) {
        handleError(error, {
          operation: 'getMcpStatus'
        });
      }
    });

  // Disconnect command
  mcpCmd
    .command('disconnect <server-name>')
    .description('Disconnect from a specific MCP server')
    .action(async (serverName) => {
      try {
        // Note: This would need access to a shared adapter instance
        console.log(`Disconnecting from MCP server: ${serverName}`);
        console.log('(This command requires integration with ToolRegistry)');
      } catch (error) {
        handleError(error, {
          operation: 'disconnectMcpServer',
          additionalInfo: { serverName }
        });
      }
    });

  // Disconnect all command
  mcpCmd
    .command('disconnect-all')
    .description('Disconnect from all MCP servers')
    .action(async () => {
      try {
        // Note: This would need access to a shared adapter instance
        console.log('Disconnecting from all MCP servers');
        console.log('(This command requires integration with ToolRegistry)');
      } catch (error) {
        handleError(error, {
          operation: 'disconnectAllMcpServers'
        });
      }
    });

  // Validate config command
  mcpCmd
    .command('validate <config-file>')
    .description('Validate MCP configuration file')
    .action(async (configFile) => {
      try {
        logger.info(`Validating MCP config: ${configFile}`);

        const fs = await import('fs/promises');
        const configContent = await fs.readFile(configFile, 'utf-8');
        const config = JSON.parse(configContent);

        // Basic validation
        if (!config.mcpServers || typeof config.mcpServers !== 'object') {
          handleError(new ValidationError('Invalid config: missing or invalid mcpServers'), {
            operation: 'validateMcpConfig',
            additionalInfo: { configFile }
          });
          return;
        }

        const servers = Object.entries(config.mcpServers);
        console.log(`✓ Config validation passed`);
        console.log(`  Found ${servers.length} server(s)`);

        for (const [name, serverConfig] of servers) {
          const config = serverConfig as any;
          const status = config.disabled ? '(disabled)' : '(enabled)';
          console.log(`  - ${name} ${status}`);
        }
      } catch (error) {
        handleError(error, {
          operation: 'validateMcpConfig',
          additionalInfo: { configFile }
        });
      }
    });

  return mcpCmd;
}
