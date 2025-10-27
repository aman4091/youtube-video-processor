'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getUserSettings, updateUserSettings, updateUserPin } from '@/lib/db/users';
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
  User,
  Settings as SettingsIcon,
  Lock,
  FileCode,
  Upload,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { SourceChannel, SupadataApiKey, PythonScript } from '@/types';

export default function SettingsPage() {
  const { user } = useAuth();

  // User-specific settings
  const [videosPerDay, setVideosPerDay] = useState(16);
  const [promptTemplate, setPromptTemplate] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [channels, setChannels] = useState<SourceChannel[]>([]);
  const [newChannel, setNewChannel] = useState({
    url: '',
    duration: '',
    referenceAudio: '',
  });

  // Shared settings
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [deepseekApiKey, setDeepseekApiKey] = useState('');
  const [supadataKeys, setSupadataKeys] = useState<SupadataApiKey[]>([]);
  const [newSupadataKey, setNewSupadataKey] = useState('');

  // Python scripts
  const [pythonScripts, setPythonScripts] = useState<PythonScript[]>([]);
  const [uploadingScript, setUploadingScript] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPin, setChangingPin] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      // Fetch Python scripts
      const scriptsResponse = await fetch('/api/scripts');
      const scriptsData = await scriptsResponse.json();

      const [userSettings, userChannels, sharedSettings, apiKeys] =
        await Promise.all([
          getUserSettings(user.id),
          getUserChannels(user.id),
          getAllSharedSettings(),
          getActiveSupadataKeys(),
        ]);

      setVideosPerDay(userSettings?.videos_per_day || 16);
      setPromptTemplate(userSettings?.prompt_template || '');
      setChannels(userChannels);
      setYoutubeApiKey(sharedSettings.youtube_api_key || '');
      setTelegramBotToken(sharedSettings.telegram_bot_token || '');
      setTelegramChatId(sharedSettings.telegram_chat_id || '');
      setDeepseekApiKey(sharedSettings.deepseek_api_key || '');
      setSupadataKeys(apiKeys);
      setPythonScripts(scriptsData.scripts || []);
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
      console.log('Saving user settings:', { userId: user.id, videosPerDay, promptTemplate });
      const result = await updateUserSettings(user.id, {
        videos_per_day: videosPerDay,
        prompt_template: promptTemplate
      });
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

  const handleChangePin = async () => {
    if (!user) return;

    if (!currentPin || !newPin || !confirmPin) {
      toast.error('Please fill all PIN fields');
      return;
    }

    if (currentPin !== user.pin) {
      toast.error('Current PIN is incorrect');
      return;
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error('New PIN must be exactly 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      toast.error('New PIN and Confirm PIN do not match');
      return;
    }

    setChangingPin(true);
    const loadingToast = toast.loading('Changing PIN...');

    try {
      const success = await updateUserPin(user.id, newPin);

      if (success) {
        toast.success('PIN changed successfully! Please login again.', { id: loadingToast });
        // Clear PIN fields
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        // Logout after 2 seconds
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        toast.error('Failed to change PIN', { id: loadingToast });
      }
    } catch (error) {
      console.error('Error changing PIN:', error);
      toast.error('Failed to change PIN', { id: loadingToast });
    } finally {
      setChangingPin(false);
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
        updateSharedSetting('telegram_bot_token', telegramBotToken),
        updateSharedSetting('telegram_chat_id', telegramChatId),
        updateSharedSetting('deepseek_api_key', deepseekApiKey),
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

  const handleUploadScript = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.py')) {
      toast.error('Only Python (.py) files are allowed');
      return;
    }

    setUploadingScript(true);
    const loadingToast = toast.loading('Uploading script...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/scripts', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Script "${file.name}" uploaded successfully!`, { id: loadingToast });
        await loadSettings(); // Reload scripts
      } else {
        toast.error(data.error || 'Failed to upload script', { id: loadingToast });
      }
    } catch (error) {
      console.error('Error uploading script:', error);
      toast.error('Failed to upload script', { id: loadingToast });
    } finally {
      setUploadingScript(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleDeleteScript = async (id: string, name: string) => {
    const confirmed = confirm(`Delete "${name}"?`);
    if (!confirmed) return;

    const loadingToast = toast.loading('Deleting script...');

    try {
      const response = await fetch(`/api/scripts/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Script deleted successfully!', { id: loadingToast });
        setPythonScripts(pythonScripts.filter((s) => s.id !== id));
      } else {
        toast.error(data.error || 'Failed to delete script', { id: loadingToast });
      }
    } catch (error) {
      console.error('Error deleting script:', error);
      toast.error('Failed to delete script', { id: loadingToast });
    }
  };

  const handleDownloadScript = (id: string, name: string) => {
    // Open download link in new tab
    window.open(`/api/scripts/${id}/download`, '_blank');
    toast.success(`Downloading ${name}`);
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

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  <FileText className="h-4 w-4 inline mr-2" />
                  Prompt Template (User-Specific)
                </label>
                <textarea
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                  placeholder="Your processing prompt template..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  This prompt will be used for processing video transcripts into scripts.
                </p>
              </div>

              <button
                onClick={handleSaveUserSettings}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all disabled:opacity-50 transform hover:scale-105"
              >
                <Save className="h-4 w-4" />
                Save User Settings
              </button>

              {/* Change PIN Section */}
              <div className="pt-6 mt-6 border-t border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-yellow-400" />
                  Change PIN
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Current PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white font-medium focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                      placeholder="****"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        New PIN (4 digits)
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white font-medium focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                        placeholder="****"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Confirm New PIN
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white font-medium focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                        placeholder="****"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleChangePin}
                    disabled={changingPin}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all disabled:opacity-50 transform hover:scale-105"
                  >
                    <Lock className="h-4 w-4" />
                    {changingPin ? 'Changing...' : 'Change PIN'}
                  </button>

                  <p className="text-xs text-gray-500">
                    After changing PIN, you will be logged out and need to login again with the new PIN.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Python Scripts (VastAI) */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center">
                <FileCode className="h-5 w-5 text-green-400" />
              </div>
              VastAI Python Scripts (Shared)
            </h2>

            <p className="text-sm text-gray-400 mb-6">
              Upload Python scripts that will be used on VastAI instances. These files will be available in the VastAI Guide page for download.
            </p>

            {/* Existing Scripts */}
            <div className="space-y-3 mb-6">
              {pythonScripts.map((script) => (
                <div
                  key={script.id}
                  className="flex items-center gap-3 p-4 bg-slate-700/30 border border-slate-600/30 rounded-xl group hover:border-green-500/30 transition-all"
                >
                  <FileCode className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-white">{script.name}</p>
                    <p className="text-xs text-gray-400">
                      Uploaded: {new Date(script.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadScript(script.id, script.name)}
                      className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all border border-transparent hover:border-blue-500/20"
                      title="Download"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteScript(script.id, script.name)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/20"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}

              {pythonScripts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileCode className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No Python scripts uploaded yet</p>
                  <p className="text-sm mt-1">Upload your first script below</p>
                </div>
              )}
            </div>

            {/* Upload New Script */}
            <div className="border-t border-slate-700/50 pt-6">
              <h3 className="font-semibold text-white mb-4">Upload Python Script</h3>
              <div className="flex items-center gap-3">
                <label className="flex-1 flex items-center gap-3 px-4 py-3 bg-slate-700/50 border-2 border-dashed border-slate-600/50 rounded-xl cursor-pointer hover:border-green-500/50 hover:bg-slate-700/70 transition-all">
                  <Upload className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-400">
                    {uploadingScript ? 'Uploading...' : 'Choose Python file (.py)'}
                  </span>
                  <input
                    type="file"
                    accept=".py"
                    onChange={handleUploadScript}
                    disabled={uploadingScript}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Recommended files: k.py, auto_setup_and_run_bot.py, final_working_bot.py
              </p>
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
                  DeepSeek API Key
                </label>
                <input
                  type="password"
                  value={deepseekApiKey}
                  onChange={(e) => setDeepseekApiKey(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="sk-••••••••••••••••••"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Used for auto-processing transcripts into scripts
                </p>
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
        </div>
      </div>
    </div>
  );
}
