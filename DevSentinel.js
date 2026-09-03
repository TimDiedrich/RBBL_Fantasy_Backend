require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const HEALTH_URL = process.env.LOCAL_BACKEND_HEALTH_URL || 'http://localhost:3000/api/health/status';
const CHANNEL_BASE_NAME = 'server';

let statusChannel = null;
let statusMessage = null;
let isBackendOnline = null;

// Helper function to format seconds into a readable string (e.g., 2h 15m 10s)
function formatUptime(seconds) {
  if (!seconds || isNaN(seconds)) return 'N/A';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

async function updateStatusDashboard() {
  try {
    if (!statusChannel) {
      statusChannel = await client.channels.fetch(CHANNEL_ID);
    }

    let isOnline = false;
    let responseTime = 0;
    let healthData = null;
    const startTime = Date.now();

    try {
      const res = await axios.get(HEALTH_URL,  {
        timeout: 3000,
        validateStatus: (status) => status === 200 || status === 503
     });
      // Accept 200 (OK) or 503 (Degraded/Partial Outage)
      if (res.status === 200 || res.status === 503) {
        isOnline = true;
        responseTime = Date.now() - startTime;
        healthData = res.data;
      }
    } catch (err) {
      isOnline = false;
      console.log("TODO", err);
    }

    // --- Dynamic Channel Name Update ---
    // Only update the channel name when status changes (Online <-> Offline)
    if (isBackendOnline !== isOnline && isBackendOnline !== null) {
      const newChannelName = isOnline 
        ? `🟢 ${CHANNEL_BASE_NAME}` 
        : `🔴 ${CHANNEL_BASE_NAME}`;

      try {
        await statusChannel.setName(newChannelName);
        console.log(`[Bot] Updated channel name to: ${newChannelName}`);
      } catch (nameErr) {
        console.warn('[Bot] Rate limited or failed to update channel name:', nameErr.message);
      }
    }

    // Determine embed color based on overall status
    let embedColor = 0xED4245; // Default Red (Offline/Error)
    if (isOnline) {
      embedColor = healthData?.status === 'ok' ? 0x57F287 : 0xFEE75C; // Green if OK, Yellow if Degraded
    }

    // Parse values safely with fallbacks
    const statusText = isOnline 
      ? (healthData?.status ? `🟢 **${healthData.status.toUpperCase()}**` : '🟢 **ONLINE**')
      : '🔴 **OFFLINE**';

    const uptimeText = isOnline ? formatUptime(healthData?.uptime_seconds) : 'N/A';
    const memoryText = isOnline && healthData?.system?.memory?.heap_used_mb 
      ? `${healthData.system.memory.heap_used_mb} MB` 
      : 'N/A';

    const dbStatus = healthData?.services?.database;
    const dbText = isOnline && dbStatus
      ? (dbStatus.status === 'healthy' ? `🟢 Healthy (${dbStatus.latency_ms ?? 0}ms)` : `🔴 ${dbStatus.status.toUpperCase()}`)
      : 'N/A';

    const statusEmbed = new EmbedBuilder()
      .setTitle('⚡ Local Backend Monitor')
      .setColor(embedColor)
      .addFields(
        { name: 'System Status', value: statusText, inline: true },
        { name: 'Response Time', value: isOnline ? `${responseTime}ms` : 'N/A', inline: true },
        { name: 'Uptime', value: uptimeText, inline: true },
        { name: 'Heap Usage', value: memoryText, inline: true },
        { name: 'Database', value: dbText, inline: true },
        { name: 'Endpoint', value: `\`${HEALTH_URL}\``, inline: false }
      )
      .setFooter({ text: `Last checked: ${new Date().toLocaleTimeString()}` });

    // Send or edit the status dashboard message
    if (!statusMessage) {
      statusMessage = await statusChannel.send({
        embeds: [statusEmbed],
        flags: [MessageFlags.SuppressNotifications]
      });
    } else {
      try {
        await statusMessage.edit({ embeds: [statusEmbed] });
      } catch (editErr) {
        console.warn('[Bot] Failed to edit status message. Sending a new one...');
        statusMessage = await statusChannel.send({
          embeds: [statusEmbed],
          flags: [MessageFlags.SuppressNotifications]
        });
      }
    }

    // Send discrete alert only when status toggles (Online <-> Offline)
    //if (isBackendOnline !== isOnline && isBackendOnline !== null) {
    //  await statusChannel.send({
    //    content: isOnline ? '🟢 **Alert:** Server recovered!' : '🔴 **Alert:** Server went down!',
    //    flags: [MessageFlags.SuppressNotifications]
    //  });
    //}

    isBackendOnline = isOnline;
  } catch (err) {
    console.error('[Bot] Error in status dashboard loop:', err);
  }
}

async function handleShutdown(signal) {
  console.log(`\n[Bot] Received ${signal}. Updating Discord status before exit...`);
  try {
    const channel = statusChannel || (await client.channels.fetch(CHANNEL_ID));
    
    const newChannelName = `🔴 ${CHANNEL_BASE_NAME}`;

    try {
      await statusChannel.setName(newChannelName);
      console.log(`[Bot] Updated channel name to: ${newChannelName}`);
    } catch (nameErr) {
      console.warn('[Bot] Rate limited or failed to update channel name:', nameErr.message);
    }

    const offlineEmbed = new EmbedBuilder()
      .setTitle('⚡ Local Backend Monitor')
      .setColor(0xED4245)
      .addFields(
        { name: 'System Status', value: '🔴 **OFFLINE (Process Terminated)**', inline: true },
        { name: 'Reason', value: `Received \`${signal}\` signal`, inline: true },
        { name: 'Endpoint', value: `\`${HEALTH_URL}\``, inline: false }
      )
      .setFooter({ text: `Stopped at: ${new Date().toLocaleTimeString()}` });

    if (statusMessage) {
      await statusMessage.edit({ embeds: [offlineEmbed] });
    } else {
      await channel.send({
        embeds: [offlineEmbed],
        flags: [MessageFlags.SuppressNotifications]
      });
    }
  } catch (err) {
    console.error('[Bot] Failed to send shutdown message:', err);
  } finally {
    setTimeout(() => {
      client.destroy();
      process.exit(0);
    }, 500);
  }
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

// Function to find existing status message or create a new one on startup
async function initializeDashboardMessage() {
  try {
    if (!statusChannel) {
      statusChannel = await client.channels.fetch(CHANNEL_ID);
    }
    const newChannelName = `🟢 ${CHANNEL_BASE_NAME}`;

    try {
      await statusChannel.setName(newChannelName);
      console.log(`[Bot] Updated channel name to: ${newChannelName}`);
    } catch (nameErr) {
      console.warn('[Bot] Rate limited or failed to update channel name:', nameErr.message);
    }
    

    // Fetch the last 10 messages from the channel
    const messages = await statusChannel.messages.fetch({ limit: 10 });

    // Look for a message authored by this bot that contains the dashboard title
    const existingMsg = messages.find(
      (m) => m.author.id === client.user.id && m.embeds[0]?.title === '⚡ Local Backend Monitor'
    );

    if (existingMsg) {
      statusMessage = existingMsg;
      console.log(`[Bot] Found existing dashboard message (ID: ${statusMessage.id}). Resuming updates.`);
    } else {
      console.log('[Bot] No existing dashboard message found. A new one will be created.');
    }
  } catch (err) {
    console.error('[Bot] Failed to initialize dashboard message:', err);
  }
}

client.once('clientReady', async () => {
  console.log(`[Bot] Logged in as ${client.user.tag}`);
  // await to get last message, which then needs to be updated
  await initializeDashboardMessage();

  updateStatusDashboard();
  setInterval(updateStatusDashboard, 60000);
});

client.login(BOT_TOKEN);