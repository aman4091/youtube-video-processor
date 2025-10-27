'use client';

import { useState, useEffect } from 'react';
import { X, Copy, CheckCircle2, ArrowRight, ChevronLeft, ChevronRight, Zap, Sparkles, RotateCcw } from 'lucide-react';
import { fetchTranscript } from '@/lib/api/supadata';
import { updateScheduleItem } from '@/lib/db/videos';
import { getUserSettings } from '@/lib/db/users';
import { getNextSupadataApiKey, markApiKeyExhausted, deleteSupadataApiKey, getSharedSetting } from '@/lib/db/settings';
import { processTranscriptInChunks } from '@/lib/api/deepseek';
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
  const [processing, setProcessing] = useState(false);
  const [processingAll, setProcessingAll] = useState(false);
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });

  // Version management for processed scripts
  const [scriptVersions, setScriptVersions] = useState<string[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);

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

      // Initialize versions
      const existingScript = currentItem.processed_script || '';
      setProcessedScript(existingScript);
      setScriptVersions(existingScript ? [existingScript] : []);
      setCurrentVersionIndex(0);
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

  const handleAutoThisOne = async () => {
    if (!transcript || !transcript.trim()) {
      toast.error('No transcript to process');
      return;
    }

    if (!promptTemplate || !promptTemplate.trim()) {
      toast.error('No prompt template found. Please add one in Settings.');
      return;
    }

    setProcessing(true);
    setChunkProgress({ current: 0, total: 0 });

    try {
      // Get DeepSeek API key
      const apiKey = await getSharedSetting('deepseek_api_key');

      if (!apiKey) {
        toast.error('DeepSeek API key not found. Please add it in Settings.');
        setProcessing(false);
        return;
      }

      toast.loading('Processing transcript with DeepSeek...', { id: 'processing' });

      // Process transcript
      const result = await processTranscriptInChunks(
        transcript,
        promptTemplate,
        apiKey,
        (current, total) => {
          setChunkProgress({ current, total });
        }
      );

      if (result.error) {
        toast.error(result.error, { id: 'processing' });
        setProcessing(false);
        return;
      }

      // Add as new version
      const newVersions = [...scriptVersions, result.processedText];
      setScriptVersions(newVersions);
      setCurrentVersionIndex(newVersions.length - 1);
      setProcessedScript(result.processedText);

      toast.success(`Transcript processed! Version ${newVersions.length} created.`, { id: 'processing' });
    } catch (error: any) {
      console.error('Auto process error:', error);
      toast.error('Failed to process transcript: ' + error.message, { id: 'processing' });
    } finally {
      setProcessing(false);
      setChunkProgress({ current: 0, total: 0 });
    }
  };

  const handleAutoAll = async () => {
    if (processingAll) return;

    const confirmed = confirm(
      `Process all ${schedule.length} transcripts automatically?\n\nThis will process each script one by one with DeepSeek AI.`
    );

    if (!confirmed) return;

    setProcessingAll(true);

    try {
      // Get API key and prompt once
      const apiKey = await getSharedSetting('deepseek_api_key');

      if (!apiKey) {
        toast.error('DeepSeek API key not found. Please add it in Settings.');
        setProcessingAll(false);
        return;
      }

      if (!promptTemplate || !promptTemplate.trim()) {
        toast.error('No prompt template found. Please add one in Settings.');
        setProcessingAll(false);
        return;
      }

      // Process each item sequentially
      for (let i = 0; i < schedule.length; i++) {
        setCurrentIndex(i);
        const item = schedule[i];

        toast.loading(`Processing video ${i + 1} of ${schedule.length}...`, { id: 'auto-all' });

        // Fetch transcript if not exists
        let transcriptText = item.transcript || '';
        if (!transcriptText) {
          const supadataApiKey = await getNextSupadataApiKey();
          if (supadataApiKey) {
            const result = await fetchTranscript(item.video!.video_id, supadataApiKey.api_key);
            if (!result.error) {
              transcriptText = result.transcript;
              await updateScheduleItem(item.id, {
                transcript: transcriptText,
                transcript_chars: countCharacters(transcriptText),
              });
            }
          }
        }

        if (!transcriptText) {
          toast.error(`Skipping video ${i + 1}: No transcript available`);
          continue;
        }

        // Process with DeepSeek
        const result = await processTranscriptInChunks(
          transcriptText,
          promptTemplate,
          apiKey,
          (current, total) => {
            setChunkProgress({ current, total });
          }
        );

        if (result.error) {
          toast.error(`Error processing video ${i + 1}: ${result.error}`);
          continue;
        }

        // Save result
        await updateScheduleItem(item.id, {
          processed_script: result.processedText,
          processed_chars: countCharacters(result.processedText),
          status: 'completed',
        });

        setProcessedScript(result.processedText);
        onUpdate();

        toast.success(`Video ${i + 1} of ${schedule.length} completed!`, { id: 'auto-all' });

        // Small delay between items
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      toast.success('All transcripts processed successfully!', { id: 'auto-all' });
      onClose();
    } catch (error: any) {
      console.error('Auto all error:', error);
      toast.error('Failed to process all transcripts: ' + error.message, { id: 'auto-all' });
    } finally {
      setProcessingAll(false);
      setChunkProgress({ current: 0, total: 0 });
    }
  };

  // Version switcher handlers
  const handlePreviousVersion = () => {
    if (currentVersionIndex > 0) {
      const newIndex = currentVersionIndex - 1;
      setCurrentVersionIndex(newIndex);
      setProcessedScript(scriptVersions[newIndex]);
    }
  };

  const handleNextVersion = () => {
    if (currentVersionIndex < scriptVersions.length - 1) {
      const newIndex = currentVersionIndex + 1;
      setCurrentVersionIndex(newIndex);
      setProcessedScript(scriptVersions[newIndex]);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < schedule.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
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
        setScriptVersions([]);
        setCurrentVersionIndex(0);
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
            <div className="flex gap-3 mt-3 flex-wrap">
              <button
                onClick={handleCopyPromptAndTranscript}
                disabled={!transcript}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                <Copy className="h-4 w-4" />
                Copy Prompt + Transcript
              </button>

              <button
                onClick={handleAutoThisOne}
                disabled={!transcript || processing || processingAll}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                <Zap className="h-4 w-4" />
                Auto This One
              </button>

              <button
                onClick={handleAutoAll}
                disabled={processing || processingAll}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                <Sparkles className="h-4 w-4" />
                Auto All
              </button>
            </div>

            {/* Chunk Progress */}
            {(processing || processingAll) && chunkProgress.total > 0 && (
              <div className="mt-4 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">
                    Processing chunks: {chunkProgress.current}/{chunkProgress.total}
                  </span>
                  <span className="text-sm font-semibold text-indigo-400">
                    {Math.round((chunkProgress.current / chunkProgress.total) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${(chunkProgress.current / chunkProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
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

            {/* Retry and Version Switcher */}
            {scriptVersions.length > 0 && (
              <div className="mt-3 flex items-center justify-between gap-3">
                {/* Version Switcher */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreviousVersion}
                    disabled={currentVersionIndex === 0 || processing || processingAll}
                    className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 text-gray-300 rounded-lg hover:bg-slate-700/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium"
                    title="Previous Version"
                  >
                    ← Previous
                  </button>
                  <span className="text-sm text-gray-400 font-medium">
                    Version {currentVersionIndex + 1} of {scriptVersions.length}
                  </span>
                  <button
                    onClick={handleNextVersion}
                    disabled={currentVersionIndex === scriptVersions.length - 1 || processing || processingAll}
                    className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 text-gray-300 rounded-lg hover:bg-slate-700/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium"
                    title="Next Version"
                  >
                    Next →
                  </button>
                </div>

                {/* Retry Button */}
                <button
                  onClick={handleAutoThisOne}
                  disabled={!transcript || processing || processingAll}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg font-medium shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-slate-700/50 text-gray-300 rounded-xl hover:bg-slate-800/50 transition-all font-semibold"
            >
              Close
            </button>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0 || processingAll}
                className="p-3 border border-slate-700/50 text-gray-300 rounded-xl hover:bg-slate-800/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === schedule.length - 1 || processingAll}
                className="p-3 border border-slate-700/50 text-gray-300 rounded-xl hover:bg-slate-800/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmitAndNext}
            disabled={!processedScript.trim() || processingAll}
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
