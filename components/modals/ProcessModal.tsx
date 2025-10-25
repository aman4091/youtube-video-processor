'use client';

import { useState, useEffect } from 'react';
import { X, Copy, CheckCircle2, ArrowRight } from 'lucide-react';
import { fetchTranscript } from '@/lib/api/supadata';
import { updateScheduleItem } from '@/lib/db/videos';
import { getUserSettings } from '@/lib/db/users';
import { getNextSupadataApiKey, markApiKeyExhausted, deleteSupadataApiKey } from '@/lib/db/settings';
import { useAuth } from '@/lib/contexts/AuthContext';
import { countCharacters } from '@/lib/utils/helpers';
import toast from 'react-hot-toast';
import type { DailySchedule } from '@/types';

interface ProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: DailySchedule[];
  onUpdate: () => void;
}

export default function ProcessModal({
  isOpen,
  onClose,
  schedule,
  onUpdate,
}: ProcessModalProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [transcript, setTranscript] = useState('');
  const [processedScript, setProcessedScript] = useState('');
  const [promptTemplate, setPromptTemplate] = useState('');

  const currentItem = schedule[currentIndex];
  const transcriptChars = countCharacters(transcript);
  const processedChars = countCharacters(processedScript);

  useEffect(() => {
    if (isOpen) {
      loadPromptTemplate();
      setCurrentIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentItem && isOpen) {
      console.log('[Modal] Current item changed:', currentItem.video?.title);
      setLoadingStatus('');

      if (currentItem.transcript) {
        console.log('[Modal] Using existing transcript');
        setTranscript(currentItem.transcript);
      } else {
        console.log('[Modal] No existing transcript, fetching...');
        setTranscript('');
        fetchCurrentTranscript();
      }
      setProcessedScript(currentItem.processed_script || '');
    }
  }, [currentIndex, isOpen]);

  const loadPromptTemplate = async () => {
    if (!user) return;
    const userSettings = await getUserSettings(user.id);
    setPromptTemplate(userSettings?.prompt_template || '');
  };

  const fetchCurrentTranscript = async () => {
    if (!currentItem?.video) {
      console.log('[Modal] No video found in current item');
      return;
    }

    console.log('[Modal] Starting transcript fetch for video:', currentItem.video.video_id);
    setLoading(true);
    setLoadingStatus('Fetching Supadata API key...');

    try {
      const apiKey = await getNextSupadataApiKey();
      console.log('[Modal] Got API key:', apiKey ? 'Yes' : 'No');

      if (!apiKey) {
        toast.error('No active Supadata API key found. Add one in Settings.');
        setLoadingStatus('No API key found');
        return;
      }

      setLoadingStatus('Requesting transcript from Supadata...');
      console.log('[Modal] Calling fetchTranscript with video ID:', currentItem.video.video_id);

      const result = await fetchTranscript(currentItem.video.video_id, apiKey.api_key);
      console.log('[Modal] Fetch result:', result.error ? `Error: ${result.error}` : `Success, ${result.transcript.length} chars`);

      if (result.error) {
        if (result.error === 'API_KEY_EXHAUSTED') {
          toast.error('API key exhausted. Switching to next key...');
          setLoadingStatus('Switching to next API key...');
          await markApiKeyExhausted(apiKey.id);
          await deleteSupadataApiKey(apiKey.id);
          // Retry with next key
          fetchCurrentTranscript();
          return;
        }
        toast.error(result.error);
        setLoadingStatus(`Error: ${result.error}`);
        return;
      }

      setLoadingStatus('Saving transcript to database...');
      setTranscript(result.transcript);

      // Save transcript to database
      await updateScheduleItem(currentItem.id, {
        transcript: result.transcript,
        transcript_chars: countCharacters(result.transcript),
      });

      console.log('[Modal] Transcript saved successfully');
      toast.success('Transcript fetched successfully');
      setLoadingStatus('');
    } catch (error: any) {
      console.error('[Modal] Transcript error:', error);
      toast.error('Failed to fetch transcript: ' + error.message);
      setLoadingStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPromptAndTranscript = () => {
    const textToCopy = `${promptTemplate}\n\n${transcript}`;
    navigator.clipboard.writeText(textToCopy);
    toast.success('Copied to clipboard');
  };

  const handleSubmitAndNext = async () => {
    if (!processedScript.trim()) {
      toast.error('Please paste the processed script');
      return;
    }

    try {
      await updateScheduleItem(currentItem.id, {
        processed_script: processedScript,
        processed_chars: processedChars,
        status: 'completed',
      });

      toast.success('Script saved successfully');
      onUpdate();

      if (currentIndex < schedule.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setTranscript('');
        setProcessedScript('');
      } else {
        toast.success('All scripts processed!');
        onClose();
      }
    } catch (error) {
      toast.error('Failed to save script');
      console.error('Save error:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Process Transcripts
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Video {currentIndex + 1} of {schedule.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800/50 rounded-lg transition-all"
          >
            <X className="h-6 w-6 text-gray-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-slate-800/50">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / schedule.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Video Info */}
          {currentItem?.video && (
            <div className="flex items-start gap-4 bg-slate-800/30 border border-slate-700/30 p-4 rounded-xl">
              {currentItem.video.thumbnail_url && (
                <img
                  src={currentItem.video.thumbnail_url}
                  alt={currentItem.video.title}
                  className="w-32 h-20 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-white">
                  {currentItem.video.title}
                </h3>
                <p className="text-sm text-gray-400 mt-1 font-mono">
                  {currentItem.video.video_id}
                </p>
              </div>
            </div>
          )}

          {/* Transcript Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="font-semibold text-gray-300">
                Transcript
              </label>
              <span className="text-sm text-gray-400">
                {transcriptChars.toLocaleString()} characters
              </span>
            </div>
            {loading ? (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-800/30 border border-slate-700/30 rounded-xl gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                {loadingStatus && (
                  <p className="text-sm text-gray-400 animate-pulse">{loadingStatus}</p>
                )}
              </div>
            ) : (
              <textarea
                value={transcript}
                readOnly
                className="w-full h-48 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-gray-300 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Transcript will appear here..."
              />
            )}
            <button
              onClick={handleCopyPromptAndTranscript}
              disabled={!transcript}
              className="mt-3 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
            >
              <Copy className="h-4 w-4" />
              Copy Prompt + Transcript
            </button>
          </div>

          {/* Processed Script Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="font-semibold text-gray-300">
                Paste Processed Script
              </label>
              <span className="text-sm text-gray-400">
                {processedChars.toLocaleString()} characters
              </span>
            </div>
            <textarea
              value={processedScript}
              onChange={(e) => setProcessedScript(e.target.value)}
              className="w-full h-48 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Paste your processed script here..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-slate-700/50 text-gray-300 rounded-xl hover:bg-slate-800/50 transition-all font-semibold"
          >
            Close
          </button>

          <button
            onClick={handleSubmitAndNext}
            disabled={!processedScript.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
          >
            {currentIndex < schedule.length - 1 ? (
              <>
                Submit & Next
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Finish
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
