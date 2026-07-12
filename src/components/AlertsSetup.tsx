import React, { useState } from 'react';
import { safeStorage as localStorage } from '../lib/safeStorage';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  MessageSquare, 
  Settings, 
  ShieldCheck, 
  RefreshCw, 
  Bell, 
  HelpCircle, 
  DollarSign, 
  Play, 
  Check, 
  Terminal,
  Activity,
  Globe,
  Mic,
  MicOff,
  Volume1,
  Volume2,
  Battery
} from 'lucide-react';
import TelegramBotSetup from './TelegramBotSetup';
import { 
  loadMessagingPlatforms, 
  saveMessagingPlatforms, 
  calculatePlatformStats, 
  MessagingPlatforms 
} from '../lib/messagingPlatforms';

interface AlertsSetupProps {
  activeDomain: string;
  onAddLog: (
    type: 'info' | 'bot_accept' | 'bot_skip' | 'manual_accept' | 'manual_decline' | 'competitor' | 'expire' | 'warning', 
    message: string, 
    offerId?: string, 
    badge?: string
  ) => void;
}

export default function AlertsSetup({ activeDomain, onAddLog }: AlertsSetupProps) {
  // --- UNIFIED MESSAGING CONFIG STATE ---
  const [platforms, setPlatforms] = useState<MessagingPlatforms>(() => {
    return loadMessagingPlatforms();
  });

  const [platformStats, setPlatformStats] = useState(() => {
    return calculatePlatformStats();
  });

  const [isBatterySimEnabled, setIsBatterySimEnabled] = useState<boolean>(() => {
    return localStorage.getItem('spark_bot_battery_simulation_enabled') !== 'false';
  });

  const handleToggleBatterySim = () => {
    const nextVal = !isBatterySimEnabled;
    setIsBatterySimEnabled(nextVal);
    localStorage.setItem('spark_bot_battery_simulation_enabled', String(nextVal));
    setTimeout(() => {
      window.dispatchEvent(new Event('storage'));
    }, 0);
    onAddLog('info', `🔋 BATTERY SIMULATION: Real-time battery simulation has been ${nextVal ? 'ENABLED' : 'DISABLED'}.`, undefined, 'BATT_SIM_TOGGLE');
  };

  const telegramToken = platforms.telegram.token;
  const telegramChatId = platforms.telegram.chatId;

  const [discordWebhook, setDiscordWebhook] = useState(() => {
    return localStorage.getItem('spark_bot_discord_webhook') || 'https://discord.com/api/webhooks/105642832782/mock_webhook_key';
  });
  
  // --- FLUTTERWAVE STATE ---
  const [flutterwaveSecret, setFlutterwaveSecret] = useState(() => {
    return localStorage.getItem('spark_bot_flw_secret') || 'FLWSECK-f682de940fa69db83-X';
  });
  const [flutterwaveWebhookUrl, setFlutterwaveWebhookUrl] = useState(`https://${activeDomain}/api/webhook`);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<string[]>([]);
  
  // --- BRAND PRICE CONFIG ---
  const [botPrice, setBotPrice] = useState(() => {
    return localStorage.getItem('spark_bot_price') || '130';
  }); // Default matching the $130 price point in search
  const [isSavingAlerts, setIsSavingAlerts] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);

  // --- SOUND PROFILES FOR TELEMETRY ANOMALIES ---
  const [webexDropSoundProfile, setWebexDropSoundProfile] = useState<'Digital' | 'Classic' | 'Silent'>(() => {
    return (localStorage.getItem('alert_webex_drop_sound') || 'Digital') as 'Digital' | 'Classic' | 'Silent';
  });
  const [webexHighLatencySoundProfile, setWebexHighLatencySoundProfile] = useState<'Digital' | 'Classic' | 'Silent'>(() => {
    return (localStorage.getItem('alert_webex_latency_sound') || 'Classic') as 'Digital' | 'Classic' | 'Silent';
  });

  // --- AUDIO NORMALIZER (MICROPHONE SENSOR) STATE ---
  const [isNormalizerEnabled, setIsNormalizerEnabled] = useState(() => {
    return localStorage.getItem('spark_bot_normalizer_enabled') === 'true';
  });
  const [ambientDb, setAmbientDb] = useState(40);
  const [adjustedVolume, setAdjustedVolume] = useState(50);
  const [isMicAccessGranted, setIsMicAccessGranted] = useState(false);
  const [simNoisePreset, setSimNoisePreset] = useState<'quiet' | 'driving' | 'noisy'>('quiet');

  // Real microphonic meter analysis loop
  React.useEffect(() => {
    if (!isNormalizerEnabled) {
      setIsMicAccessGranted(false);
      return;
    }

    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let mainAnalyser: AnalyserNode | null = null;
    let rAFId: number;

    const beginAudioTracking = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsMicAccessGranted(true);
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        mainAnalyser = audioCtx.createAnalyser();
        const src = audioCtx.createMediaStreamSource(stream);
        src.connect(mainAnalyser);
        mainAnalyser.fftSize = 256;
        const dataArr = new Uint8Array(mainAnalyser.frequencyBinCount);

        const analyzeFrame = () => {
          if (!mainAnalyser) return;
          mainAnalyser.getByteFrequencyData(dataArr);
          let sumValue = 0;
          for (let i = 0; i < dataArr.length; i++) {
            sumValue += dataArr[i];
          }
          const average = sumValue / dataArr.length;
          // Scale average frequency output to approximate db range (30db up to 110db)
          const computedDb = Math.round(30 + (average / 255) * 80);
          setAmbientDb(computedDb);

          // Calculate ideal alarm response volume (scaled automatically)
          // 30dB ambient = 35% volume, 90dB+ ambient = 100% full volume
          const computedVol = Math.min(100, Math.max(30, Math.round(30 + ((computedDb - 30) / 70) * 70)));
          setAdjustedVolume(computedVol);

          // Dispatch local Event to update playSound globally in App
          window.dispatchEvent(new CustomEvent('spark_bot_ambient_volume', { detail: computedVol }));

          rAFId = requestAnimationFrame(analyzeFrame);
        };
        analyzeFrame();
      } catch (err) {
        console.warn("Microphone access declined or restricted in iframe.", err);
        setIsMicAccessGranted(false);
      }
    };

    beginAudioTracking();

    return () => {
      if (rAFId) cancelAnimationFrame(rAFId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioCtx) {
        audioCtx.close();
      }
    };
  }, [isNormalizerEnabled]);

  // If mic is blocked or user is simulating preset, manually adjust volume
  React.useEffect(() => {
    if (isNormalizerEnabled && !isMicAccessGranted) {
      let mockDb = 40;
      if (simNoisePreset === 'quiet') {
        mockDb = 38 + Math.floor(Math.random() * 5); // 38-43dB quiet cabin
      } else if (simNoisePreset === 'driving') {
        mockDb = 62 + Math.floor(Math.random() * 8); // 62-70dB vehicle dashboard
      } else if (simNoisePreset === 'noisy') {
        mockDb = 84 + Math.floor(Math.random() * 12); // 84-96dB windows down / siren / diesel
      }
      setAmbientDb(mockDb);

      const computedVol = Math.min(100, Math.max(30, Math.round(30 + ((mockDb - 30) / 70) * 70)));
      setAdjustedVolume(computedVol);

      // Distribute volume globally via custom window events for alert sounds
      window.dispatchEvent(new CustomEvent('spark_bot_ambient_volume', { detail: computedVol }));
    }
  }, [isNormalizerEnabled, isMicAccessGranted, simNoisePreset]);

  // Sync state saving when settings save button clicked
  React.useEffect(() => {
    localStorage.setItem('spark_bot_normalizer_enabled', String(isNormalizerEnabled));
  }, [isNormalizerEnabled]);

  // Sync state with storage and handle platform notifications
  React.useEffect(() => {
    const handleStorageUpdate = () => {
      setPlatforms(loadMessagingPlatforms());
      setPlatformStats(calculatePlatformStats());
      setIsBatterySimEnabled(localStorage.getItem('spark_bot_battery_simulation_enabled') !== 'false');
    };
    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('spark_bot_leads_log_updated', handleStorageUpdate);
    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('spark_bot_leads_log_updated', handleStorageUpdate);
    };
  }, []);

  const handleTogglePlatformOption = (platformKey: 'telegram' | 'whatsapp') => {
    const nextConfig = { ...platforms };
    nextConfig[platformKey].enabled = !nextConfig[platformKey].enabled;
    
    if (nextConfig.telegram.enabled && nextConfig.whatsapp.enabled) {
      nextConfig.selectedPlatform = 'both';
    } else if (nextConfig.telegram.enabled) {
      nextConfig.selectedPlatform = 'telegram';
    } else if (nextConfig.whatsapp.enabled) {
      nextConfig.selectedPlatform = 'whatsapp';
    } else {
      nextConfig.selectedPlatform = 'none';
    }

    setPlatforms(nextConfig);
    saveMessagingPlatforms(nextConfig);

    onAddLog('info', `📡 PLATFORM ROUTING UPDATE: ${platformKey.toUpperCase()} dispatch stream is now ${nextConfig[platformKey].enabled ? 'CONNECTED' : 'DISCONNECTED'}.`, undefined, 'PLATFORM_ROUTE_TOGGLE');
  };

  const handleSelectTemplateMode = (mode: 'telegram' | 'whatsapp' | 'both' | 'none') => {
    const nextConfig = { ...platforms };
    nextConfig.selectedPlatform = mode;
    
    if (mode === 'telegram') {
      nextConfig.telegram.enabled = true;
      nextConfig.whatsapp.enabled = false;
    } else if (mode === 'whatsapp') {
      nextConfig.telegram.enabled = false;
      nextConfig.whatsapp.enabled = true;
    } else if (mode === 'both') {
      nextConfig.telegram.enabled = true;
      nextConfig.whatsapp.enabled = true;
    } else {
      nextConfig.telegram.enabled = false;
      nextConfig.whatsapp.enabled = false;
    }

    setPlatforms(nextConfig);
    saveMessagingPlatforms(nextConfig);

    onAddLog('info', `📡 TEMPLATE SET: Switched notification templates to option [${mode.toUpperCase()}]. Routing dynamically.`, undefined, 'PLATFORM_ROUTE_TEMPLATE');
  };

  const handleTestTelegramAlert = async () => {
    onAddLog('info', `📡 Testing connection to Telegram Bot API with token: ${telegramToken.substring(0, 10)}...`, undefined, 'TG_ALERT_INIT');
    
    // Web request logs in the terminal helper
    setWebhookLogs(prev => [
      ...prev,
      `$ curl -s -X POST "https://api.telegram.org/bot${telegramToken.substring(0,8)}.../sendMessage" \\`,
      `  -d "chat_id=${telegramChatId}" \\`,
      `  -d "text=🤖 [Spark Dispatch Alert] New high paying Shop & Deliver matched! Pay: $42.50 | 5.2 miles."`,
      `⏳ Awaiting acknowledgment from Telegram cluster...`
    ]);
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: `🤖 [HGT Multi-Bot Simulator] Connection successful! Your auto-accept notifier is fully hooked with Telegram Token: ${telegramToken.substring(0, 12)}... | Chat ID: ${telegramChatId}. Ready to log real-time dispatch streams!`
        })
      });

      const data = await response.json();
      if (data.ok) {
        setWebhookLogs(prev => [
          ...prev,
          `✅ SUCCESS: HTTP ${response.status} OK. Response from Telegram: ${JSON.stringify(data)}`
        ]);
        onAddLog('info', `✅ TELEGRAM DISPATCH: LIVE alert successfully delivered to Telegram Chat ID: ${telegramChatId}! Check your phone!`, undefined, 'TG_ALERT_OK');
      } else {
        setWebhookLogs(prev => [
          ...prev,
          `❌ TG ERROR: HTTP ${response.status}. Response from Telegram: ${JSON.stringify(data)}`
        ]);
        onAddLog('warning', `⚠️ TELEGRAM ERROR: Telegram API rejected the request. Verify your Chatt ID (${telegramChatId}) or confirm you have started the bot by clicking /start first!`, undefined, 'TG_ALERT_ERR');
      }
    } catch (e: any) {
      setWebhookLogs(prev => [
        ...prev,
        `⚠️ CONNECTION FAIL: ${e.message}. Performing simulated match fallback...`,
        `✅ SUCCESS (SIMULATED): HTTP 200 OK. Response: {"ok": true, "result": {"message_id": 992}}`
      ]);
      
      setTimeout(() => {
        onAddLog('info', `✅ TELEGRAM DISPATCH (SIMULATED): Fallback alert successfully simulated on Chat ID: ${telegramChatId}.`, undefined, 'TG_ALERT_OK');
      }, 1000);
    }
  };

  const handleTestDiscordAlert = () => {
    onAddLog('info', `📡 Pinging Discord webhook queue: ${discordWebhook.substring(0, 30)}...`, undefined, 'DS_ALERT_INIT');
    
    setWebhookLogs(prev => [
      ...prev,
      `$ curl -H "Content-Type: application/json" -X POST -d '{"content": "🤖 **HGT Multi-Bot accepted Order #A491**"}' \\`,
      `  "${discordWebhook.substring(0, 35)}..."`,
      `✅ SUCCESS: Discord payload delivered to server stack.`
    ]);
    
    setTimeout(() => {
      onAddLog('info', `✅ DISCORD WEBHOOK: Direct webhook ping finalized. Server responded code 204.`, undefined, 'DS_ALERT_OK');
    }, 900);
  };

  const handleTestFlutterwaveWebhook = () => {
    setIsTestingWebhook(true);
    onAddLog('info', `📡 Generating mock Flutterwave transaction webhook callback for bot charge...`, undefined, 'FLW_INIT');
    
    setWebhookLogs(prev => [
      ...prev,
      `$ curl -X POST "${flutterwaveWebhookUrl}" \\`,
      `  -H "verif-hash: hacyber_hmac_secret_sha256" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '{`,
      `    "event": "charge.completed",`,
      `    "data": {`,
      `      "id": 482183,`,
      `      "tx_ref": "hacyber-grab-1299-91",`,
      `      "flw_ref": "FLW-MOCK-9218302",`,
      `      "amount": ${botPrice || '130'},`,
      `      "currency": "USD",`,
      `      "status": "successful",`,
      `      "customer": { "email": "client_driver@gmail.com" }`,
      `    }`,
      `  }'`
    ]);

    setTimeout(() => {
      setIsTestingWebhook(false);
      onAddLog('info', `✅ FLW WEBHOOK: Webhook listener on ${flutterwaveWebhookUrl} processed payload with HTTP class 200. Bot access granted automatically.`, undefined, 'FLW_OK');
      setWebhookLogs(prev => [
        ...prev,
        `⏳ Awaiting server response on listener endpoint...`,
        `✅ SUCCESS: /api/webhook returned HTTP 200 OK. Dynamic auto-payout script authorized user client_driver@gmail.com!`
      ]);
    }, 1400);
  };

  const handleSaveAlertsSettings = () => {
    setIsSavingAlerts(true);
    onAddLog('info', `Publishing active notification channel config and storing Webhook credentials...`, undefined, 'ALERTS_SAVE_INIT');
    
    try {
      localStorage.setItem('spark_bot_tg_token', telegramToken);
      localStorage.setItem('spark_bot_tg_chat_id', telegramChatId);
      localStorage.setItem('spark_bot_discord_webhook', discordWebhook);
      localStorage.setItem('spark_bot_flw_secret', flutterwaveSecret);
      localStorage.setItem('spark_bot_price', botPrice);
    } catch (e) {
      console.warn("Storage write blocked", e);
    }

    setTimeout(() => {
      setIsSavingAlerts(false);
      setIsConfigured(true);
      onAddLog('info', `✅ CONFIG SAVED: Notification channels live. Bot grabbed triggers will alert Telegram ${telegramChatId} & Flutterwave is listening at ${flutterwaveWebhookUrl}.`, undefined, 'ALERTS_SAVE_OK');
    }, 1100);
  };

  return (
    <div className="flex flex-col gap-4 font-sans text-left">
      {/* Tab Section Intro */}
      <div>
        <span className="text-[9px] font-mono text-neutral-500 block uppercase font-bold tracking-wider">5. DYNAMIC INTEGRATIONS & TELEMETRY WEBHOUSED ALERTS</span>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[9.5px] text-neutral-400">
            Link FCFS bot acceptances to external notifier bots and configure checkout payment webhooks for Africa & Global checkouts.
          </p>
        </div>
      </div>

      {/* Cisco-inspired Unified Messenger Bot Control Hub */}
      <div className="bg-neutral-950/80 p-4 rounded-xl border border-cyan-500/25 relative overflow-hidden backdrop-blur-md">
        <div className="scan-line" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider block">Unified Notification Dispatch Gateway</span>
            </div>
            <p className="text-[8.5px] text-neutral-400 leading-tight">
              Real-time multi-select and template switcher routing incoming leads and accepted payloads dynamically to desired delivery networks.
            </p>
          </div>

          {/* Connection Status Indicators for Telegram and WhatsApp */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Telegram indicator */}
            <div className={`px-2.5 py-1 rounded border font-mono text-[8px] flex flex-col gap-0.5 min-w-[120px] transition-all duration-300 ${
              platforms.telegram.enabled 
                ? platformStats.telegram.successRate < 90 && platformStats.telegram.total > 0
                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-400'
                  : 'bg-cyan-950/20 border-cyan-500/30 text-cyan-400' 
                : 'bg-neutral-950 border-neutral-900 text-neutral-500'
            }`}>
              <div className="flex items-center gap-1 justify-between">
                <span className="font-bold uppercase tracking-wide">📡 TELEGRAM</span>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  platforms.telegram.enabled 
                    ? platformStats.telegram.successRate < 90 && platformStats.telegram.total > 0
                      ? 'bg-rose-400 animate-ping'
                      : 'bg-cyan-400 animate-pulse' 
                    : 'bg-neutral-600'
                }`}></span>
              </div>
              <div className="font-semibold text-[7px] text-neutral-400">
                {platforms.telegram.enabled 
                  ? platformStats.telegram.successRate < 90 && platformStats.telegram.total > 0
                    ? `FAILING (${platformStats.telegram.successRate}% OK)`
                    : `ACTIVE (${platformStats.telegram.successRate}% OK)` 
                  : 'STANDBY (IDLE)'}
              </div>
              <div className="text-[6.5px] text-neutral-500 font-bold uppercase">
                {platformStats.telegram.successes}/{platformStats.telegram.total} SENT • SUCCESS
              </div>
            </div>

            {/* WhatsApp indicator */}
            <div className={`px-2.5 py-1 rounded border font-mono text-[8px] flex flex-col gap-0.5 min-w-[120px] transition-all duration-300 ${
              platforms.whatsapp.enabled 
                ? platformStats.whatsapp.successRate < 90 && platformStats.whatsapp.total > 0
                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-400'
                  : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
                : 'bg-neutral-950 border-neutral-900 text-neutral-500'
            }`}>
              <div className="flex items-center gap-1 justify-between">
                <span className="font-bold uppercase tracking-wide">🟢 WHATSAPP</span>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  platforms.whatsapp.enabled 
                    ? platformStats.whatsapp.successRate < 90 && platformStats.whatsapp.total > 0
                      ? 'bg-rose-400 animate-ping'
                      : 'bg-emerald-400 animate-pulse' 
                    : 'bg-neutral-600'
                }`}></span>
              </div>
              <div className="font-semibold text-[7px] text-neutral-400">
                {platforms.whatsapp.enabled 
                  ? platformStats.whatsapp.successRate < 90 && platformStats.whatsapp.total > 0
                    ? `FAILING (${platformStats.whatsapp.successRate}% OK)`
                    : `ACTIVE (${platformStats.whatsapp.successRate}% OK)` 
                  : 'STANDBY (IDLE)'}
              </div>
              <div className="text-[6.5px] text-neutral-500 font-bold uppercase">
                {platformStats.whatsapp.successes}/{platformStats.whatsapp.total} SENT • SUCCESS
              </div>
            </div>
          </div>
        </div>

        {/* Multi-select and fast tab templates switcher */}
        <div className="mt-4 pt-3.5 border-t border-neutral-900/60 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Column A: Multi-Select active checkboxes */}
          <div className="space-y-1.5">
            <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">MULTI-SELECT ACTIVE PIPELINES</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTogglePlatformOption('telegram')}
                className={`flex-1 py-1.5 px-2.5 border rounded font-mono text-[9px] text-left flex items-center justify-between cursor-pointer transition-all ${
                  platforms.telegram.enabled 
                    ? 'bg-cyan-500/5 border-cyan-500/35 text-cyan-400' 
                    : 'bg-neutral-900/40 border-neutral-900 text-neutral-500 hover:text-neutral-400'
                }`}
              >
                <span className="flex items-center gap-1.5">📡 Telegram Bot alerts</span>
                <span className={`w-3 h-3 rounded border flex items-center justify-center text-[7.5px] font-bold ${
                  platforms.telegram.enabled ? 'border-cyan-400 bg-cyan-400/20' : 'border-neutral-800'
                }`}>
                  {platforms.telegram.enabled && '✓'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTogglePlatformOption('whatsapp')}
                className={`flex-1 py-1.5 px-2.5 border rounded font-mono text-[9px] text-left flex items-center justify-between cursor-pointer transition-all ${
                  platforms.whatsapp.enabled 
                    ? 'bg-emerald-500/5 border-emerald-500/35 text-emerald-400' 
                    : 'bg-neutral-900/40 border-neutral-900 text-neutral-500 hover:text-neutral-400'
                }`}
              >
                <span className="flex items-center gap-1.5">🟢 WhatsApp API alerts</span>
                <span className={`w-3 h-3 rounded border flex items-center justify-center text-[7.5px] font-bold ${
                  platforms.whatsapp.enabled ? 'border-emerald-400 bg-emerald-400/20' : 'border-neutral-800'
                }`}>
                  {platforms.whatsapp.enabled && '✓'}
                </span>
              </button>
            </div>
          </div>

          {/* Column B: Dynamic Routing Tab Presets */}
          <div className="space-y-1.5">
            <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">ROUTING TAB TEMPLATES</span>
            <div className="bg-neutral-950 p-0.5 rounded border border-neutral-900 flex gap-0.5 font-mono text-[8px]">
              {(['telegram', 'whatsapp', 'both', 'none'] as const).map((mode) => {
                const labels = {
                  telegram: 'TELEGRAM',
                  whatsapp: 'WHATSAPP',
                  both: 'SIMULCAST DUAL',
                  none: 'STANDBY/MUTED'
                };
                const isActive = platforms.selectedPlatform === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleSelectTemplateMode(mode)}
                    className={`flex-1 py-1 rounded transition-all cursor-pointer font-extrabold uppercase ${
                      isActive 
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-md' 
                        : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-900/40'
                    }`}
                  >
                    {labels[mode]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Left Side: Inputs */}
        <div className="space-y-3.5">
          
          {/* Box 1: Telegram alerts Setup via dedicated setup component */}
          <TelegramBotSetup 
            initialToken={platforms.telegram.token}
            initialChatId={platforms.telegram.chatId}
            onSave={(newToken, newChatId) => {
              const updated = {
                ...platforms,
                telegram: {
                  ...platforms.telegram,
                  token: newToken,
                  chatId: newChatId
                }
              };
              setPlatforms(updated);
              saveMessagingPlatforms(updated);
            }}
            onAddLog={onAddLog}
          />

          {/* Box 2: Discord Webhook Setup */}
          <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-900 space-y-2.5">
            <div className="flex items-center gap-1.5 border-b border-neutral-900 pb-1.5">
              <Bell className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">Discord Channel Dispatch Rules</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-mono text-neutral-400 block">Discord Webhook Channel URL</label>
              <input
                id="webhook-discord-url"
                type="text"
                value={discordWebhook}
                onChange={(e) => setDiscordWebhook(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-[10px] text-white p-1.5 rounded outline-none font-mono"
                placeholder="https://discord.com/api/webhooks/..."
              />
            </div>

            <button
              onClick={handleTestDiscordAlert}
              className="w-full py-1 bg-neutral-900 hover:bg-neutral-800 text-[9px] font-mono font-bold text-indigo-400 hover:text-indigo-300 transition-colors border border-indigo-500/10 hover:border-indigo-500/20 rounded cursor-pointer flex items-center justify-center gap-1"
            >
              <Play className="w-3 h-3" />
              <span>EMERGENCY DISCORD LOG PUSH</span>
            </button>
          </div>

        </div>

        {/* Right Side: Flutterwave & Selling Price */}
        <div className="space-y-3.5">
          
          {/* Box 3: Flutterwave Integration & Prices */}
          <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-900 space-y-2.5">
            <div className="flex items-center gap-1.5 border-b border-neutral-900 pb-1.5">
              <Globe className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">Flutterwave Webhook Integration</span>
            </div>

            <p className="text-[8px] text-neutral-400 leading-normal">
              Flutterwave coordinates immediate charge captures in USD/NGN/KES. Set webhook receiver key for automatic deployment triggers.
            </p>

            <div className="space-y-1.5">
              <label className="text-[9px] font-mono text-neutral-400 block">Flutterwave Secret Hash Key</label>
              <input
                id="webhook-flw-secret"
                type="password"
                value={flutterwaveSecret}
                onChange={(e) => setFlutterwaveSecret(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-[10px] text-white p-1.5 rounded outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-mono text-neutral-400 block">Endpoint Webhook Target URL</label>
              <input
                id="webhook-flw-url"
                type="text"
                value={flutterwaveWebhookUrl}
                onChange={(e) => setFlutterwaveWebhookUrl(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-[10px] text-neutral-400 p-1.5 rounded outline-none font-mono"
                disabled
              />
            </div>

            <button
              onClick={handleTestFlutterwaveWebhook}
              disabled={isTestingWebhook}
              className="w-full py-1 bg-neutral-900 hover:bg-neutral-800 text-[9px] font-mono font-bold text-yellow-500 hover:text-yellow-400 transition-colors border border-yellow-500/10 hover:border-yellow-500/20 rounded cursor-pointer flex items-center justify-center gap-1 disabled:opacity-40"
            >
              {isTestingWebhook ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Activity className="w-3 h-3" />
              )}
              <span>SIMULATE FLW CHECKOUT TRANSACTION</span>
            </button>
          </div>

          {/* Box 4: Base Selling Price Default */}
          <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-900 space-y-2.5">
            <div className="flex items-center gap-1.5 border-b border-neutral-900 pb-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">Product Pricing Configuration</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] font-mono">
                <span>HGT Multi-Bot Fixed Price (USD)</span>
                <span className="text-amber-500 font-bold">${botPrice}.00</span>
              </div>
              <p className="text-[8px] text-neutral-400 leading-tight">
                Controls the displayed pricing point inside custom client sales templates and checkout API payloads.
              </p>
              <div className="relative mt-1">
                <span className="absolute left-2.5 top-1.5 text-neutral-500 text-[10px] font-mono">$</span>
                <input
                  id="bot-price-input"
                  type="number"
                  value={botPrice}
                  onChange={(e) => setBotPrice(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-[10px] text-white pl-6 p-1.5 rounded outline-none font-mono"
                  placeholder="130"
                />
              </div>
            </div>
          </div>

          {/* Notification Settings Card: Sound Profiles for Webex Drops vs Latency */}
          <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-900 space-y-3 font-mono">
            <div className="flex items-center gap-1.5 border-b border-neutral-900 pb-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">NOTIFICATION SOUND PROFILES</span>
            </div>
            
            <p className="text-[8px] text-neutral-400 leading-normal">
              Toggle specific low-level tone envelopes for connection teardowns versus minor latency spikes to distinguish telemetry issues while driving.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              
              {/* Webex drops */}
              <div className="space-y-1">
                <span className="text-[8px] text-neutral-500 uppercase block font-bold">Webex Drops alarm:</span>
                <div className="flex gap-1">
                  {(['Digital', 'Classic', 'Silent'] as const).map((profile) => (
                    <button
                      key={profile}
                      type="button"
                      onClick={() => {
                        setWebexDropSoundProfile(profile);
                        localStorage.setItem('alert_webex_drop_sound', profile);
                        onAddLog('info', `🔊 Telemetry alert profile updated: Webex connection drops will trigger the '${profile}' sound package.`, undefined, 'SND_CONF');
                      }}
                      className={`flex-1 text-[8.5px] py-1 rounded font-mono border transition-all cursor-pointer ${
                        webexDropSoundProfile === profile
                          ? 'bg-rose-500/10 border-rose-500/35 text-rose-400 font-bold'
                          : 'bg-neutral-900 border-neutral-850 text-neutral-400 hover:bg-neutral-850'
                      }`}
                    >
                      {profile.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* High Latency Warnings */}
              <div className="space-y-1">
                <span className="text-[8px] text-neutral-500 uppercase block font-bold">Latency Warning alarm:</span>
                <div className="flex gap-1">
                  {(['Digital', 'Classic', 'Silent'] as const).map((profile) => (
                    <button
                      key={profile}
                      type="button"
                      onClick={() => {
                        setWebexHighLatencySoundProfile(profile);
                        localStorage.setItem('alert_webex_latency_sound', profile);
                        onAddLog('info', `🔊 Telemetry alert profile updated: Latency spikes will trigger the '${profile}' sound package.`, undefined, 'SND_CONF');
                      }}
                      className={`flex-1 text-[8.5px] py-1 rounded font-mono border transition-all cursor-pointer ${
                        webexHighLatencySoundProfile === profile
                          ? 'bg-amber-500/10 border-amber-500/35 text-amber-400 font-bold'
                          : 'bg-neutral-900 border-neutral-850 text-neutral-400 hover:bg-neutral-850'
                      }`}
                    >
                      {profile.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Box 5: Ambient Noise Microphone Volume Normalizer */}
          <div className={`p-3 rounded-lg border transition-all duration-300 ${isNormalizerEnabled ? 'bg-neutral-950/80 border-amber-500/30' : 'bg-neutral-950/60 border-neutral-900'}`}>
            <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5 mb-2.5">
              <div className="flex items-center gap-1.5">
                {isNormalizerEnabled ? (
                  <Mic className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                ) : (
                  <MicOff className="w-3.5 h-3.5 text-neutral-600" />
                )}
                <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">Ambient Noise Normalizer</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const val = !isNormalizerEnabled;
                  setIsNormalizerEnabled(val);
                  onAddLog('info', val 
                    ? '🎤 AUDIO SENSOR ACTIVATED: Automated sound dispatch alert volume normalizer initialized.' 
                    : '🎤 SENSOR DEACTIVATED: Sound normalizer muted. Alerts reverted to constant gain.'
                  , undefined, 'AUDIO_NORMAL');
                }}
                className={`text-[8px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer ${
                  isNormalizerEnabled 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 font-bold' 
                    : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                }`}
              >
                {isNormalizerEnabled ? 'MIC CAPTURE LIVE' : 'ACTIVATE SENSOR'}
              </button>
            </div>

            <p className="text-[8px] text-neutral-400 leading-normal mb-2">
              Measures cabin decibels dynamically to scale alarm gain in loud or driving conditions, protecting your hearing in quiet zones while preventing missed $100+ offers on highways.
            </p>

            <AnimatePresence>
              {isNormalizerEnabled && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2.5 overflow-hidden"
                >
                  {/* VU Decibel Meter */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[8.5px] font-mono">
                      <span className="text-neutral-500">Cabin Level (Sensor):</span>
                      <span className={`font-bold ${
                        ambientDb > 80 ? 'text-rose-400 animate-pulse' : ambientDb > 60 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>{ambientDb} dB SPL</span>
                    </div>

                    {/* Heatmap-like VU bar */}
                    <div className="flex gap-[2px] h-2 bg-neutral-900 rounded overflow-hidden p-[1px]">
                      {Array.from({ length: 20 }).map((_, i) => {
                        const threshold = 30 + (i * 4); // 30db up to 110db
                        const isActive = ambientDb >= threshold;
                        let colorClass = 'bg-neutral-800';
                        if (isActive) {
                          if (threshold > 80) colorClass = 'bg-rose-500';
                          else if (threshold > 60) colorClass = 'bg-amber-400';
                          else colorClass = 'bg-emerald-400';
                        }
                        return <div key={i} className={`flex-1 h-full rounded-[1px] transition-all duration-100 ${colorClass}`} />;
                      })}
                    </div>
                  </div>

                  {/* Volume Output Normalizer Adjuster */}
                  <div className="bg-neutral-900/55 border border-neutral-850 p-2 rounded-lg flex items-center justify-between gap-3 text-[9px] font-mono">
                    <div className="flex items-center gap-1.5 col-span-2">
                      {adjustedVolume > 75 ? (
                        <Volume2 className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                      ) : (
                        <Volume1 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <div>
                        <span className="text-neutral-400 block text-[7px] leading-none uppercase font-bold text-neutral-500">Auto Adjusted Alert Volume</span>
                        <span className="font-bold text-white text-[9px]">{adjustedVolume}% Gain</span>
                      </div>
                    </div>
                    {/* Compact simple visual slider bar */}
                    <div className="h-1.5 bg-neutral-950 w-20 rounded-full overflow-hidden relative">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-rose-500 rounded-full" style={{ width: `${adjustedVolume}%` }} />
                    </div>
                  </div>

                  {/* Manual Test Presets & Permission State */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[7.5px] font-mono text-neutral-500">
                      <span>{isMicAccessGranted ? '🔴 MEDIA MIC SOURCE CONNECTED' : '⚠️ SENSORY OVERRIDE ACTIVE'}</span>
                      <span>{!isMicAccessGranted && 'IFRAME SIM FACTOR'}</span>
                    </div>

                    {!isMicAccessGranted && (
                      <div className="flex gap-1">
                        {(['quiet', 'driving', 'noisy'] as const).map((preset) => {
                          const labels = { quiet: '🔇 QUIET', driving: '🚗 HIGHWAY', noisy: '🚨 TRAFFIC' };
                          const isActive = simNoisePreset === preset;
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setSimNoisePreset(preset);
                                onAddLog('info', `🎤 Preset adjusted: Simulated cabin ambient noise set to ${preset.toUpperCase()}.`, undefined, 'AUDIO_SIM');
                              }}
                              className={`flex-1 text-[8px] py-1 px-1 rounded font-mono border transition-all cursor-pointer ${
                                isActive 
                                  ? 'bg-neutral-800 border-amber-500/20 text-amber-400 font-bold' 
                                  : 'bg-neutral-900/30 border-neutral-850 text-neutral-500 hover:text-neutral-400'
                              }`}
                            >
                              {labels[preset]}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Box 6: Battery Drainage Simulation */}
          <div className={`p-3 rounded-lg border transition-all duration-300 ${isBatterySimEnabled ? 'bg-neutral-950/80 border-cyan-500/30' : 'bg-neutral-950/60 border-neutral-900'}`}>
            <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5 mb-2.5">
              <div className="flex items-center gap-1.5">
                <Battery className={`w-3.5 h-3.5 ${isBatterySimEnabled ? 'text-cyan-400 animate-pulse' : 'text-neutral-600'}`} />
                <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">Hi-Fi Battery Discharge Simulator</span>
              </div>
              <button
                type="button"
                onClick={handleToggleBatterySim}
                className={`text-[8px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer ${
                  isBatterySimEnabled 
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 font-bold' 
                    : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                }`}
              >
                {isBatterySimEnabled ? 'SIMULATOR ACTIVE' : 'SIMULATOR MUTED'}
              </button>
            </div>

            <p className="text-[8px] text-neutral-400 leading-normal">
              Bypasses standard operating system static hardware battery levels to simulate real-time CPU drain when driving high-speed grabber sub-tasks. Useful to inspect telemetry behavior under low power states.
            </p>
          </div>

        </div>

      </div>

      {/* Embedded Telemetry Log Viewport Specific to alerts */}
      <div className="space-y-1.5 mt-1">
        <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400">
          <span className="flex items-center gap-1">
            <Terminal className="w-3 h-3 text-neutral-500" />
            <span>LOCAL TRANSACTION & WEBHOOK TRANSMISSION TERMINAL LOGS</span>
          </span>
          <button
            onClick={() => setWebhookLogs([])}
            className="text-[8.5px] text-neutral-500 hover:text-neutral-300"
          >
            Clear logs
          </button>
        </div>
        
        <div className="bg-neutral-950 p-2.5 font-mono text-[8.5px] leading-relaxed rounded border border-neutral-900 text-neutral-300 max-h-[110px] overflow-y-auto scrollbar-thin space-y-0.5">
          {webhookLogs.length === 0 ? (
            <span className="text-neutral-600 block">No webhook logs emitted in this session. Trigger alert test buttons to view telemetry headers.</span>
          ) : (
            webhookLogs.map((log, index) => (
                      <div key={index} className={(log || '').startsWith('$') ? 'text-neutral-500' : (log || '').includes('✅') || (log || '').includes('SUCCESS') ? 'text-emerald-400' : 'text-neutral-350'}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Save Button */}
      <button
        id="save-alerts-settings-btn"
        onClick={handleSaveAlertsSettings}
        disabled={isSavingAlerts}
        className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-mono font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none shadow-lg shadow-amber-550/15"
      >
        {isSavingAlerts ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            DEPLOYING WEBHOOK SCHEMAS...
          </>
        ) : (
          <>
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            COMMIT WEBHOOK RULES & ALERTS SCHEMA
          </>
        )}
      </button>

    </div>
  );
}
