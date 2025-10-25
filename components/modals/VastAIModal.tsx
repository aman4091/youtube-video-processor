'use client';

import { useState, useEffect } from 'react';
import { X, Server, Play, StopCircle, Send, Music, Code, Upload as UploadIcon, RefreshCw } from 'lucide-react';
import { rentGPUInstance, getInstanceStatus, executeCommands, stopInstance, uploadScriptToInstance, executeScriptOnInstance, getInstanceLogs } from '@/lib/api/vastai';
import { sendReferenceAudio, sendAllScripts } from '@/lib/api/telegram';
import { getSharedSetting, getAllSharedSettings } from '@/lib/db/settings';
import { getUserChannels } from '@/lib/db/channels';
import { getAllScripts, getDefaultScript } from '@/lib/db/scripts';
import { useAuth } from '@/lib/contexts/AuthContext';
import toast from 'react-hot-toast';
import type { DailySchedule } from '@/types';

interface VastAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: DailySchedule[];
}

const STORAGE_KEY = 'vastai_active_instance';

export default function VastAIModal({
  isOpen,
  onClose,
  schedule,
}: VastAIModalProps) {
  const { user } = useAuth();
  const [instanceId, setInstanceId] = useState<number | null>(null);
  const [sshHost, setSshHost] = useState<string>('');
  const [sshPort, setSshPort] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [alternativeOffers, setAlternativeOffers] = useState<any[]>([]);
  const [isPollingLogs, setIsPollingLogs] = useState(false);
  const [lastLogCount, setLastLogCount] = useState(0);
  const [currentScriptName, setCurrentScriptName] = useState<string>('k.py');

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Load instance state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setInstanceId(data.instanceId);
        setStatus(data.status || '');
        addLog('Restored active instance from previous session');
      } catch (e) {
        console.error('Failed to parse stored instance data:', e);
      }
    }
  }, []);

  // Save instance state to localStorage whenever it changes
  useEffect(() => {
    if (instanceId) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ instanceId, status }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [instanceId, status]);

  // Poll logs when script is running (real-time terminal output)
  useEffect(() => {
    if (!isPollingLogs || !instanceId) return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await getInstanceLogs(instanceId, 50, currentScriptName); // Last 50 lines

        if (result.success && result.logs) {
          const logLines = result.logs.split('\n').filter((line: string) => line.trim());

          // Only add new logs (compare count to avoid duplicates)
          if (logLines.length > lastLogCount) {
            const newLines = logLines.slice(lastLogCount);
            newLines.forEach((line: string) => {
              if (line.trim()) {
                addLog(`[LOG] ${line}`);
              }
            });
            setLastLogCount(logLines.length);
          }
        }
      } catch (error) {
        console.error('Log polling error:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [isPollingLogs, instanceId, lastLogCount]);

  const handleSetupVastAI = async () => {
    setLoading(true);
    try {
      const commandsStr = await getSharedSetting('vastai_commands');

      addLog('Searching for RTX 4090 (worldwide)...');
      const instance = await rentGPUInstance('RTX 4090', 20, 'US');
      setInstanceId(instance.id);
      setAlternativeOffers(instance.alternativeOffers || []);
      addLog(`Instance rented: ID ${instance.id}`);
      if (instance.alternativeOffers && instance.alternativeOffers.length > 0) {
        addLog(`Found ${instance.alternativeOffers.length} alternative instances available`);
      }

      // Wait for instance to be ready
      addLog('Waiting for instance to start...');
      setStatus('Starting instance...');

      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
        const statusInfo = await getInstanceStatus(instance.id);

        if (statusInfo.status === 'running') {
          addLog('Instance is running!');
          setStatus('Instance running');
          // Store SSH details
          if (statusInfo.ssh_host && statusInfo.ssh_port) {
            setSshHost(statusInfo.ssh_host);
            setSshPort(statusInfo.ssh_port);
            addLog(`SSH: ${statusInfo.ssh_host}:${statusInfo.ssh_port}`);
          }
          break;
        }

        attempts++;
        addLog(`Status: ${statusInfo.status} (attempt ${attempts}/${maxAttempts})`);
      }

      if (attempts >= maxAttempts) {
        toast.error('Instance took too long to start');
        return;
      }

      // Execute commands (optional - only if set)
      if (commandsStr && commandsStr.trim()) {
        const commands = commandsStr.split('\n').filter((cmd) => cmd.trim());
        addLog(`Executing ${commands.length} setup commands...`);

        const results = await executeCommands(instance.id, commands);

        results.forEach((result, index) => {
          if (result.success) {
            addLog(`✓ Command ${index + 1}: Success`);
          } else {
            addLog(`✗ Command ${index + 1}: Failed - ${result.output}`);
          }
        });
      } else {
        addLog('No setup commands configured (skipping)');
      }

      // Get instance status to get SSH details
      const finalStatus = await getInstanceStatus(instance.id);
      if (finalStatus.ssh_host && finalStatus.ssh_port) {
        setSshHost(finalStatus.ssh_host);
        setSshPort(finalStatus.ssh_port);

        // Upload Python scripts
        addLog('Fetching Python scripts from database...');
        const pythonScripts = await getAllScripts();

        if (pythonScripts.length > 0) {
          addLog(`Found ${pythonScripts.length} Python script(s) to upload`);

          for (const script of pythonScripts) {
            addLog(`Uploading ${script.name}.py...`);
            const uploadResult = await uploadScriptToInstance(
              instance.id,
              `${script.name}.py`,
              script.content
            );

            if (uploadResult.success) {
              addLog(`✓ ${script.name}.py uploaded successfully`);
            } else {
              addLog(`✗ ${script.name}.py upload failed: ${uploadResult.error}`);
            }
          }

          // Auto-run default script
          const defaultScript = await getDefaultScript();
          if (defaultScript) {
            addLog(`Auto-running default script: ${defaultScript.name}.py`);

            // Set current script name for log polling
            setCurrentScriptName(`${defaultScript.name}.py`);

            // Start real-time log polling for terminal-like output
            addLog('Starting real-time log monitoring...');
            setIsPollingLogs(true);
            setLastLogCount(0);

            const execResult = await executeScriptOnInstance(
              instance.id,
              `${defaultScript.name}.py`
            );

            if (execResult.success) {
              addLog(`✓ ${defaultScript.name}.py execution initiated`);
              addLog('📺 Check activity logs below for real-time output...');
            } else {
              addLog(`✗ ${defaultScript.name}.py execution failed: ${execResult.error}`);
              setIsPollingLogs(false); // Stop polling on error
            }
          } else {
            addLog('No default script set for auto-run');
          }
        } else {
          addLog('No Python scripts found in database');
        }
      }

      setStatus('Setup completed');
      toast.success('VastAI setup completed successfully!');
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
      toast.error('Failed to setup VastAI');
      console.error('VastAI setup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetReferenceAudio = async () => {
    setLoading(true);
    try {
      if (!user) return;

      const settings = await getAllSharedSettings();
      const botToken = settings.telegram_bot_token;
      const chatId = settings.telegram_chat_id;

      if (!botToken || !chatId) {
        toast.error('Telegram credentials not set. Please add them in Settings.');
        return;
      }

      // Get user's channels to find reference audio
      const channels = await getUserChannels(user.id);
      if (channels.length === 0) {
        toast.error('No source channels found. Add a channel in Settings.');
        return;
      }

      // Send reference audio for the first channel (you can make this selectable)
      const audioUrl = channels[0].reference_audio_url;

      addLog('Sending reference audio to Telegram...');
      await sendReferenceAudio(botToken, chatId, audioUrl);
      addLog('Reference audio sent successfully');

      toast.success('Reference audio sent to Telegram!');
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
      toast.error('Failed to send reference audio');
      console.error('Telegram error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendScripts = async () => {
    setLoading(true);
    try {
      const settings = await getAllSharedSettings();
      const botToken = settings.telegram_bot_token;
      const chatId = settings.telegram_chat_id;

      if (!botToken || !chatId) {
        toast.error('Telegram credentials not set. Please add them in Settings.');
        return;
      }

      // Get completed scripts
      const completedSchedule = schedule.filter(
        (item) => item.status === 'completed' && item.processed_script
      );

      if (completedSchedule.length === 0) {
        toast.error('No completed scripts to send');
        return;
      }

      const scripts = completedSchedule.map((item) => item.processed_script!);

      addLog(`Sending ${scripts.length} scripts to Telegram...`);
      const result = await sendAllScripts(botToken, chatId, scripts);

      addLog(`Sent: ${result.sent}, Failed: ${result.failed}`);

      if (result.sent > 0) {
        toast.success(`${result.sent} scripts sent successfully!`);
      }

      if (result.failed > 0) {
        toast.error(`${result.failed} scripts failed to send`);
      }
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
      toast.error('Failed to send scripts');
      console.error('Send scripts error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStopInstance = async () => {
    if (!instanceId) {
      toast.error('No active instance to stop');
      return;
    }

    setLoading(true);
    try {
      addLog(`Stopping instance ${instanceId}...`);
      await stopInstance(instanceId);

      addLog('Instance stopped successfully');
      setStatus('Instance stopped');
      setInstanceId(null);
      setIsPollingLogs(false); // Stop log polling when instance is stopped

      toast.success('Instance stopped successfully!');
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
      toast.error('Failed to stop instance');
      console.error('Stop instance error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTryNextInstance = async () => {
    if (alternativeOffers.length === 0) {
      toast.error('No alternative instances available');
      return;
    }

    setLoading(true);
    try {
      // Stop current instance if exists
      if (instanceId) {
        addLog(`Stopping current instance ${instanceId}...`);
        await stopInstance(instanceId);
        addLog('Current instance stopped');
      }

      // Try next instance
      const nextOffer = alternativeOffers[0];
      addLog(`Trying next instance: ${nextOffer.gpu} (${nextOffer.vram}GB) - $${nextOffer.price}/hr`);

      // Remove this offer from alternatives
      setAlternativeOffers(prev => prev.slice(1));

      // Retry setup
      await handleSetupVastAI();

    } catch (error: any) {
      addLog(`Error: ${error.message}`);
      toast.error('Failed to try next instance');
      console.error('Try next instance error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white">
          <div className="flex items-center gap-3">
            <Server className="h-7 w-7" />
            <div>
              <h2 className="text-2xl font-bold">VastAI Control Panel</h2>
              {status && (
                <p className="text-sm opacity-90 mt-1">{status}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleSetupVastAI}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 transform hover:scale-105"
            >
              <Play className="h-5 w-5" />
              Setup VastAI
            </button>

            <button
              onClick={handleSetReferenceAudio}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 transform hover:scale-105"
            >
              <Music className="h-5 w-5" />
              Set Reference Audio
            </button>

            <button
              onClick={handleSendScripts}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30 transition-all disabled:opacity-50 transform hover:scale-105"
            >
              <Send className="h-5 w-5" />
              Send Scripts
            </button>

            <button
              onClick={handleStopInstance}
              disabled={loading || !instanceId}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-xl font-semibold shadow-lg shadow-red-500/30 transition-all disabled:opacity-50 transform hover:scale-105"
            >
              <StopCircle className="h-5 w-5" />
              Stop Instance
            </button>
          </div>

          {/* Try Next Instance Button - Only show if alternatives exist */}
          {alternativeOffers.length > 0 && (
            <button
              onClick={handleTryNextInstance}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50 transform hover:scale-105"
            >
              <RefreshCw className="h-5 w-5" />
              Try Next Instance ({alternativeOffers.length} available)
            </button>
          )}

          {/* Instance Info */}
          {instanceId && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <p className="text-sm font-medium text-purple-300">
                Active Instance ID: <span className="font-mono text-white">{instanceId}</span>
              </p>
              {sshHost && sshPort > 0 && (
                <p className="text-sm font-medium text-purple-300 mt-2">
                  SSH: <span className="font-mono text-white">{sshHost}:{sshPort}</span>
                </p>
              )}
            </div>
          )}

          {/* Logs */}
          <div>
            <h3 className="font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Code className="h-5 w-5" />
              Activity Logs
            </h3>
            <div className="bg-slate-950 border border-slate-800 text-green-400 p-4 rounded-xl font-mono text-sm h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-600">No activity yet...</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1 hover:bg-slate-900/50 px-2 py-0.5 rounded transition-colors">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-slate-700/50 text-gray-300 rounded-xl hover:bg-slate-800/50 transition-all font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
