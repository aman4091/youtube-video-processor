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
  getAllScripts,
  addScript,
  updateScript,
  deleteScript,
} from '@/lib/db/scripts';
import {
  Save,
  Plus,
  Trash2,
  Youtube,
  Key,
  MessageSquare,
  Server,
  FileText,
  User,
  Settings as SettingsIcon,
  Code,
  Upload,
  Play,
  Edit,
  Check,
  X as XIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { SourceChannel, SupadataApiKey, PythonScript } from '@/types';

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

  // Python scripts
  const [pythonScripts, setPythonScripts] = useState<PythonScript[]>([]);
  const [newScript, setNewScript] = useState({ name: '', content: '', isDefault: false });
  const [editingScript, setEditingScript] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const [userSettings, userChannels, sharedSettings, apiKeys, scripts] =
        await Promise.all([
          getUserSettings(user.id),
          getUserChannels(user.id),
          getAllSharedSettings(),
          getActiveSupadataKeys(),
          getAllScripts(),
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
      setPythonScripts(scripts);
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
      console.log('Saving user settings:', { userId: user.id, videosPerDay });
      const result = await updateUserSettings(user.id, { videos_per_day: videosPerDay });
      console.log('Save result:', result);
      if (result) {
        toast.success('User settings saved');
      } else {
        toast.error('Failed to save user settings');
      }
    } catch (error) {
      console.error('Error saving user settings:', error);
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
      const durationSeconds = parseInt(newChannel.duration) * 60;
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
      console.log('Saving shared settings...');
      const results = await Promise.all([
        updateSharedSetting('youtube_api_key', youtubeApiKey),
        updateSharedSetting('vastai_api_key', vastaiApiKey),
        updateSharedSetting('vastai_commands', vastaiCommands),
        updateSharedSetting('telegram_bot_token', telegramBotToken),
        updateSharedSetting('telegram_chat_id', telegramChatId),
        updateSharedSetting('prompt_template', promptTemplate),
      ]);
      console.log('Save results:', results);
      const allSuccess = results.every(r => r === true);
      if (allSuccess) {
        toast.success('Shared settings saved');
      } else {
        toast.error('Some settings failed to save');
      }
    } catch (error) {
      console.error('Error saving shared settings:', error);
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

  const handleAddScript = async () => {
    if (!newScript.name.trim() || !newScript.content.trim()) {
      toast.error('Please provide script name and content');
      return;
    }

    const success = await addScript(newScript.name, newScript.content, newScript.isDefault);
    if (success) {
      await loadSettings();
      setNewScript({ name: '', content: '', isDefault: false });
      toast.success('Script added successfully');
    } else {
      toast.error('Failed to add script');
    }
  };

  const handleUpdateScript = async (id: string, updates: Partial<PythonScript>) => {
    const success = await updateScript(id, updates);
    if (success) {
      await loadSettings();
      setEditingScript(null);
      toast.success('Script updated');
    } else {
      toast.error('Failed to update script');
    }
  };

  const handleDeleteScript = async (id: string) => {
    const success = await deleteScript(id);
    if (success) {
      setPythonScripts(pythonScripts.filter((s) => s.id !== id));
      toast.success('Script deleted');
    } else {
      toast.error('Failed to delete script');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.py')) {
      toast.error('Please upload a Python (.py) file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setNewScript({
        name: file.name.replace('.py', ''),
        content: content,
        isDefault: false,
      });
      toast.success('File loaded. You can edit and save it.');
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-indigo-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20 blur-xl"></div>
          </div>
          <p className="mt-6 text-gray-400 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent mb-2">
            Settings
          </h1>
          <p className="text-gray-400 flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Configure your preferences and API keys
          </p>
        </div>

        <div className="space-y-6">
          {/* User-Specific Settings */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-xl flex items-center justify-center">
                <User className="h-5 w-5 text-indigo-400" />
              </div>
              User Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Videos Per Day
                </label>
                <input
                  type="number"
                  value={videosPerDay}
                  onChange={(e) => setVideosPerDay(parseInt(e.target.value) || 16)}
                  min="1"
                  max="100"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                onClick={handleSaveUserSettings}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all disabled:opacity-50 transform hover:scale-105"
              >
                <Save className="h-4 w-4" />
                Save User Settings
              </button>
            </div>
          </div>

          {/* Source Channels */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500/20 to-pink-600/20 rounded-xl flex items-center justify-center">
                <Youtube className="h-5 w-5 text-red-400" />
              </div>
              Source Channels (User-Specific)
            </h2>

            {/* Existing Channels */}
            <div className="space-y-3 mb-6">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center gap-3 p-4 bg-slate-700/30 border border-slate-600/30 rounded-xl group hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Channel URL</p>
                      <p className="font-medium text-white truncate">{channel.channel_url}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Min Duration</p>
                      <p className="font-medium text-white">
                        {Math.floor(channel.min_duration_seconds / 60)} minutes
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Reference Audio</p>
                      <p className="font-medium text-white truncate">{channel.reference_audio_url}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteChannel(channel.id)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/20"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Channel */}
            <div className="border-t border-slate-700/50 pt-6">
              <h3 className="font-semibold text-white mb-4">Add New Channel</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="YouTube Channel URL"
                  value={newChannel.url}
                  onChange={(e) => setNewChannel({ ...newChannel, url: e.target.value })}
                  className="px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <input
                  type="number"
                  placeholder="Min Duration (minutes)"
                  value={newChannel.duration}
                  onChange={(e) =>
                    setNewChannel({ ...newChannel, duration: e.target.value })
                  }
                  className="px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <input
                  type="text"
                  placeholder="Reference Audio URL"
                  value={newChannel.referenceAudio}
                  onChange={(e) =>
                    setNewChannel({ ...newChannel, referenceAudio: e.target.value })
                  }
                  className="px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <button
                onClick={handleAddChannel}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all transform hover:scale-105"
              >
                <Plus className="h-4 w-4" />
                Add Channel
              </button>
            </div>
          </div>

          {/* Supadata API Keys */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-xl flex items-center justify-center">
                <Key className="h-5 w-5 text-blue-400" />
              </div>
              Supadata API Keys (Shared)
            </h2>

            <div className="space-y-3 mb-4">
              {supadataKeys.map((key, index) => (
                <div
                  key={key.id}
                  className="flex items-center gap-3 p-4 bg-slate-700/30 border border-slate-600/30 rounded-xl group hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                      <span className="text-xs font-bold text-indigo-400">
                        #{index + 1}
                      </span>
                    </div>
                    <code className="flex-1 text-sm font-mono text-gray-300 bg-slate-900/50 px-4 py-2 rounded-lg truncate">
                      {key.api_key.substring(0, 30)}...
                    </code>
                    <span className="text-xs text-gray-400">
                      Priority: {key.priority}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteSupadataKey(key.id)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/20"
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
                className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm"
              />
              <button
                onClick={handleAddSupadataKey}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>

          {/* Shared API Settings */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-xl flex items-center justify-center">
                <Server className="h-5 w-5 text-purple-400" />
              </div>
              API Configuration (Shared)
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  YouTube API Key
                </label>
                <input
                  type="password"
                  value={youtubeApiKey}
                  onChange={(e) => setYoutubeApiKey(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="••••••••••••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  VastAI API Key
                </label>
                <input
                  type="password"
                  value={vastaiApiKey}
                  onChange={(e) => setVastaiApiKey(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="••••••••••••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  VastAI Commands <span className="text-gray-500 text-xs">(Optional - one per line)</span>
                </label>
                <textarea
                  value={vastaiCommands}
                  onChange={(e) => setVastaiCommands(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Optional: Add setup commands if needed&#10;cd /workspace&#10;git clone ...&#10;pip install ..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Note: With Python scripts in database, setup commands are optional. Scripts will auto-upload and run.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Telegram Bot Token
                </label>
                <input
                  type="password"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="••••••••••••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Telegram Chat ID
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Prompt Template
                </label>
                <textarea
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Your processing prompt template..."
                />
              </div>

              <button
                onClick={handleSaveSharedSettings}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all disabled:opacity-50 transform hover:scale-105"
              >
                <Save className="h-4 w-4" />
                Save Shared Settings
              </button>
            </div>
          </div>

          {/* Python Scripts Section */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center">
                <Code className="h-5 w-5 text-green-400" />
              </div>
              Python Scripts for VastAI (Shared)
            </h2>

            {/* Existing Scripts */}
            <div className="space-y-3 mb-6">
              {pythonScripts.map((script) => (
                <div
                  key={script.id}
                  className="bg-slate-700/30 border border-slate-600/30 rounded-xl p-4 hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <Code className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{script.name}.py</h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {script.content.split('\n').length} lines •
                          {script.is_default && <span className="ml-2 px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-xs">Auto-run</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingScript(editingScript === script.id ? null : script.id)}
                        className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all border border-transparent hover:border-indigo-500/20"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteScript(script.id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {editingScript === script.id && (
                    <div className="mt-4 space-y-3 border-t border-slate-600/30 pt-4">
                      <textarea
                        value={script.content}
                        onChange={(e) => {
                          const updated = pythonScripts.map(s =>
                            s.id === script.id ? { ...s, content: e.target.value } : s
                          );
                          setPythonScripts(updated);
                        }}
                        rows={10}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-gray-300 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={script.is_default}
                            onChange={(e) => {
                              const updated = pythonScripts.map(s =>
                                s.id === script.id ? { ...s, is_default: e.target.checked } : s
                              );
                              setPythonScripts(updated);
                            }}
                            className="rounded bg-slate-700 border-slate-600 text-indigo-600 focus:ring-indigo-500"
                          />
                          <Play className="h-3 w-3" />
                          Auto-run this script on VastAI setup
                        </label>
                        <button
                          onClick={() => handleUpdateScript(script.id, {
                            content: script.content,
                            is_default: script.is_default,
                          })}
                          className="ml-auto flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-semibold transition-all"
                        >
                          <Check className="h-4 w-4" />
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Script */}
            <div className="border-t border-slate-700/50 pt-6">
              <h3 className="font-semibold text-white mb-4">Add New Script</h3>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Script name (without .py)"
                    value={newScript.name}
                    onChange={(e) => setNewScript({ ...newScript, name: e.target.value })}
                    className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <label className="flex items-center gap-2 px-6 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white cursor-pointer hover:bg-slate-700/70 transition-all">
                    <Upload className="h-4 w-4" />
                    Upload .py
                    <input
                      type="file"
                      accept=".py"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <textarea
                  placeholder="Paste or type your Python script here..."
                  value={newScript.content}
                  onChange={(e) => setNewScript({ ...newScript, content: e.target.value })}
                  rows={12}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white font-mono text-sm placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={newScript.isDefault}
                      onChange={(e) => setNewScript({ ...newScript, isDefault: e.target.checked })}
                      className="rounded bg-slate-700 border-slate-600 text-green-600 focus:ring-green-500"
                    />
                    <Play className="h-3 w-3" />
                    Auto-run this script on VastAI setup
                  </label>

                  <button
                    onClick={handleAddScript}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all transform hover:scale-105"
                  >
                    <Plus className="h-4 w-4" />
                    Add Script
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
