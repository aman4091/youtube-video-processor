'use client';

import { useState } from 'react';
import { X, Server, Play, StopCircle, Send, Music } from 'lucide-react';
import { rentGPUInstance, getInstanceStatus, executeCommands, stopInstance } from '@/lib/api/vastai';
import { sendReferenceAudio, sendAllScripts } from '@/lib/api/telegram';
import { getSharedSetting, getAllSharedSettings } from '@/lib/db/settings';
import { getUserChannels } from '@/lib/db/channels';
import { useAuth } from '@/lib/contexts/AuthContext';
import toast from 'react-hot-toast';
import type { DailySchedule } from '@/types';

interface VastAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: DailySchedule[];
}

export default function VastAIModal({
  isOpen,
  onClose,
  schedule,
}: VastAIModalProps) {
  const { user } = useAuth();
  const [instanceId, setInstanceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleSetupVastAI = async () => {
    setLoading(true);
    try {
      const vastaiKey = await getSharedSetting('vastai_api_key');
      const commandsStr = await getSharedSetting('vastai_commands');

      if (!vastaiKey) {
        toast.error('VastAI API key not set. Please add it in Settings.');
        return;
      }

      if (!commandsStr) {
        toast.error('VastAI commands not set. Please add them in Settings.');
        return;
      }

      addLog('Renting GPU instance...');
      const instance = await rentGPUInstance(vastaiKey);
      setInstanceId(instance.id);
      addLog(`Instance rented: ID ${instance.id}`);

      // Wait for instance to be ready
      addLog('Waiting for instance to start...');
      setStatus('Starting instance...');

      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
        const statusInfo = await getInstanceStatus(vastaiKey, instance.id);

        if (statusInfo.status === 'running') {
          addLog('Instance is running!');
          setStatus('Instance running');
          break;
        }

        attempts++;
        addLog(`Status: ${statusInfo.status} (attempt ${attempts}/${maxAttempts})`);
      }

      if (attempts >= maxAttempts) {
        toast.error('Instance took too long to start');
        return;
      }

      // Execute commands
      const commands = commandsStr.split('\n').filter((cmd) => cmd.trim());
      addLog(`Executing ${commands.length} commands...`);

      const results = await executeCommands(vastaiKey, instance.id, commands);

      results.forEach((result, index) => {
        if (result.success) {
          addLog(`✓ Command ${index + 1}: Success`);
        } else {
          addLog(`✗ Command ${index + 1}: Failed - ${result.output}`);
        }
      });

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
      const vastaiKey = await getSharedSetting('vastai_api_key');
      if (!vastaiKey) {
        toast.error('VastAI API key not found');
        return;
      }

      addLog(`Stopping instance ${instanceId}...`);
      await stopInstance(vastaiKey, instanceId);

      addLog('Instance stopped successfully');
      setStatus('Instance stopped');
      setInstanceId(null);

      toast.success('Instance stopped successfully!');
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
      toast.error('Failed to stop instance');
      console.error('Stop instance error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
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
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
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
              className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              <Play className="h-5 w-5" />
              Setup VastAI
            </button>

            <button
              onClick={handleSetReferenceAudio}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <Music className="h-5 w-5" />
              Set Reference Audio
            </button>

            <button
              onClick={handleSendScripts}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
              Send Scripts
            </button>

            <button
              onClick={handleStopInstance}
              disabled={loading || !instanceId}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
            >
              <StopCircle className="h-5 w-5" />
              Stop Instance
            </button>
          </div>

          {/* Instance Info */}
          {instanceId && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm font-medium text-purple-900">
                Active Instance ID: <span className="font-mono">{instanceId}</span>
              </p>
            </div>
          )}

          {/* Logs */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Activity Logs</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">No activity yet...</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
