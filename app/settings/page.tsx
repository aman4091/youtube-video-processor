'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getUserSettings, updateUserSettings } from '@/lib/db/users';
import { getUserChannels, addSourceChannel, deleteSourceChannel } from '@/lib/db/channels';
import {
  getAllSharedSettings,
  updateSharedSetting,
  getActiveSupadataKeys,
  addSupadataApiKey,
  deleteSupadataApiKey,
} from '@/lib/db/settings';
import {
  Save,
  Plus,
  Trash2,
  Youtube,
  Key,
  MessageSquare,
  Server,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { SourceChannel, SupadataApiKey } from '@/types';

export default function SettingsPage() {
  const { user } = useAuth();

  // User-specific settings
  const [videosPerDay, setVideosPerDay] = useState(16);
  const [channels, setChannels] = useState<SourceChannel[]>([]);
  const [newChannel, setNewChannel] = useState({
    url: '',
    duration: '',
    referenceAudio: '',
  });

  // Shared settings
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [vastaiApiKey, setVastaiApiKey] = useState('');
  const [vastaiCommands, setVastaiCommands] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [promptTemplate, setPromptTemplate] = useState('');
  const [supadataKeys, setSupadataKeys] = useState<SupadataApiKey[]>([]);
  const [newSupadataKey, setNewSupadataKey] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const [userSettings, userChannels, sharedSettings, apiKeys] =
        await Promise.all([
          getUserSettings(user.id),
          getUserChannels(user.id),
          getAllSharedSettings(),
          getActiveSupadataKeys(),
        ]);

      setVideosPerDay(userSettings?.videos_per_day || 16);
      setChannels(userChannels);
      setYoutubeApiKey(sharedSettings.youtube_api_key || '');
      setVastaiApiKey(sharedSettings.vastai_api_key || '');
      setVastaiCommands(sharedSettings.vastai_commands || '');
      setTelegramBotToken(sharedSettings.telegram_bot_token || '');
      setTelegramChatId(sharedSettings.telegram_chat_id || '');
      setPromptTemplate(sharedSettings.prompt_template || '');
      setSupadataKeys(apiKeys);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUserSettings = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await updateUserSettings(user.id, { videos_per_day: videosPerDay });
      toast.success('User settings saved');
    } catch (error) {
      toast.error('Failed to save user settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddChannel = async () => {
    if (!user || !newChannel.url || !newChannel.duration || !newChannel.referenceAudio) {
      toast.error('Please fill all channel fields');
      return;
    }

    try {
      const durationSeconds = parseInt(newChannel.duration) * 60; // Convert minutes to seconds
      const channel = await addSourceChannel(
        user.id,
        newChannel.url,
        durationSeconds,
        newChannel.referenceAudio
      );

      if (channel) {
        setChannels([...channels, channel]);
        setNewChannel({ url: '', duration: '', referenceAudio: '' });
        toast.success('Channel added');
      }
    } catch (error) {
      toast.error('Failed to add channel');
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    const success = await deleteSourceChannel(channelId);
    if (success) {
      setChannels(channels.filter((c) => c.id !== channelId));
      toast.success('Channel deleted');
    } else {
      toast.error('Failed to delete channel');
    }
  };

  const handleSaveSharedSettings = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSharedSetting('youtube_api_key', youtubeApiKey),
        updateSharedSetting('vastai_api_key', vastaiApiKey),
        updateSharedSetting('vastai_commands', vastaiCommands),
        updateSharedSetting('telegram_bot_token', telegramBotToken),
        updateSharedSetting('telegram_chat_id', telegramChatId),
        updateSharedSetting('prompt_template', promptTemplate),
      ]);
      toast.success('Shared settings saved');
    } catch (error) {
      toast.error('Failed to save shared settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSupadataKey = async () => {
    if (!newSupadataKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    const success = await addSupadataApiKey(newSupadataKey);
    if (success) {
      await loadSettings();
      setNewSupadataKey('');
      toast.success('API key added');
    } else {
      toast.error('Failed to add API key');
    }
  };

  const handleDeleteSupadataKey = async (id: string) => {
    const success = await deleteSupadataApiKey(id);
    if (success) {
      setSupadataKeys(supadataKeys.filter((k) => k.id !== id));
      toast.success('API key deleted');
    } else {
      toast.error('Failed to delete API key');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600 mt-1">Configure your preferences and API keys</p>
      </div>

      {/* User-Specific Settings */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Youtube className="h-6 w-6 text-indigo-600" />
          User Settings
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Videos Per Day
            </label>
            <input
              type="number"
              value={videosPerDay}
              onChange={(e) => setVideosPerDay(parseInt(e.target.value) || 16)}
              min="1"
              max="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={handleSaveUserSettings}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save User Settings
          </button>
        </div>
      </div>

      {/* Source Channels */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Source Channels (User-Specific)
        </h2>

        {/* Existing Channels */}
        <div className="space-y-3 mb-4">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex-1 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Channel URL</p>
                  <p className="font-medium truncate">{channel.channel_url}</p>
                </div>
                <div>
                  <p className="text-gray-600">Min Duration</p>
                  <p className="font-medium">
                    {Math.floor(channel.min_duration_seconds / 60)} minutes
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Reference Audio</p>
                  <p className="font-medium truncate">{channel.reference_audio_url}</p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteChannel(channel.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add New Channel */}
        <div className="border-t pt-4">
          <h3 className="font-medium text-gray-800 mb-3">Add New Channel</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              placeholder="YouTube Channel URL"
              value={newChannel.url}
              onChange={(e) => setNewChannel({ ...newChannel, url: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="number"
              placeholder="Min Duration (minutes)"
              value={newChannel.duration}
              onChange={(e) =>
                setNewChannel({ ...newChannel, duration: e.target.value })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="Reference Audio URL"
              value={newChannel.referenceAudio}
              onChange={(e) =>
                setNewChannel({ ...newChannel, referenceAudio: e.target.value })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleAddChannel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Channel
          </button>
        </div>
      </div>

      {/* Supadata API Keys */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Key className="h-6 w-6 text-indigo-600" />
          Supadata API Keys (Shared)
        </h2>

        <div className="space-y-3 mb-4">
          {supadataKeys.map((key, index) => (
            <div
              key={key.id}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
            >
              <span className="text-sm font-medium text-gray-600">
                #{index + 1} (Priority: {key.priority})
              </span>
              <code className="flex-1 text-sm font-mono bg-gray-50 px-3 py-2 rounded">
                {key.api_key.substring(0, 20)}...
              </code>
              <button
                onClick={() => handleDeleteSupadataKey(key.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="New Supadata API Key"
            value={newSupadataKey}
            onChange={(e) => setNewSupadataKey(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleAddSupadataKey}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {/* Shared API Settings */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          API Configuration (Shared)
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              YouTube API Key
            </label>
            <input
              type="password"
              value={youtubeApiKey}
              onChange={(e) => setYoutubeApiKey(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              VastAI API Key
            </label>
            <input
              type="password"
              value={vastaiApiKey}
              onChange={(e) => setVastaiApiKey(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              VastAI Commands (one per line)
            </label>
            <textarea
              value={vastaiCommands}
              onChange={(e) => setVastaiCommands(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              placeholder="cd /workspace&#10;git clone ...&#10;pip install ..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telegram Bot Token
            </label>
            <input
              type="password"
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telegram Chat ID
            </label>
            <input
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt Template
            </label>
            <textarea
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Your processing prompt template..."
            />
          </div>

          <button
            onClick={handleSaveSharedSettings}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save Shared Settings
          </button>
        </div>
      </div>
    </div>
  );
}
