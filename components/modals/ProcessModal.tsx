'use client';

import { useState, useEffect } from 'react';
import { X, Copy, CheckCircle2, ArrowRight } from 'lucide-react';
import { fetchTranscript } from '@/lib/api/supadata';
import { updateScheduleItem } from '@/lib/db/videos';
import { getNextSupadataApiKey, markApiKeyExhausted, deleteSupadataApiKey } from '@/lib/db/settings';
import { getSharedSetting } from '@/lib/db/settings';
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
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
      if (currentItem.transcript) {
        setTranscript(currentItem.transcript);
      } else {
        fetchCurrentTranscript();
      }
      setProcessedScript(currentItem.processed_script || '');
    }
  }, [currentIndex, isOpen]);

  const loadPromptTemplate = async () => {
    const template = await getSharedSetting('prompt_template');
    setPromptTemplate(template || '');
  };

  const fetchCurrentTranscript = async () => {
    if (!currentItem?.video) return;

    setLoading(true);
    try {
      const apiKey = await getNextSupadataApiKey();
      if (!apiKey) {
        toast.error('No active Supadata API key found. Add one in Settings.');
        return;
      }

      const result = await fetchTranscript(currentItem.video.video_id, apiKey.api_key);

      if (result.error) {
        if (result.error === 'API_KEY_EXHAUSTED') {
          toast.error('API key exhausted. Switching to next key...');
          await markApiKeyExhausted(apiKey.id);
          await deleteSupadataApiKey(apiKey.id);
          // Retry with next key
          fetchCurrentTranscript();
          return;
        }
        toast.error(result.error);
        return;
      }

      setTranscript(result.transcript);

      // Save transcript to database
      await updateScheduleItem(currentItem.id, {
        transcript: result.transcript,
        transcript_chars: countCharacters(result.transcript),
      });

      toast.success('Transcript fetched successfully');
    } catch (error: any) {
      toast.error('Failed to fetch transcript');
      console.error('Transcript error:', error);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Process Transcripts
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Video {currentIndex + 1} of {schedule.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-200">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / schedule.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Video Info */}
          {currentItem?.video && (
            <div className="flex items-start gap-4 bg-gray-50 p-4 rounded-lg">
              {currentItem.video.thumbnail_url && (
                <img
                  src={currentItem.video.thumbnail_url}
                  alt={currentItem.video.title}
                  className="w-32 h-20 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">
                  {currentItem.video.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {currentItem.video.video_id}
                </p>
              </div>
            </div>
          )}

          {/* Transcript Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-gray-700">
                Transcript
              </label>
              <span className="text-sm text-gray-600">
                {transcriptChars.toLocaleString()} characters
              </span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <textarea
                value={transcript}
                readOnly
                className="w-full h-48 p-4 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm resize-none"
                placeholder="Transcript will appear here..."
              />
            )}
            <button
              onClick={handleCopyPromptAndTranscript}
              disabled={!transcript}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy className="h-4 w-4" />
              Copy Prompt + Transcript
            </button>
          </div>

          {/* Processed Script Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-gray-700">
                Paste Processed Script
              </label>
              <span className="text-sm text-gray-600">
                {processedChars.toLocaleString()} characters
              </span>
            </div>
            <textarea
              value={processedScript}
              onChange={(e) => setProcessedScript(e.target.value)}
              className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm resize-none"
              placeholder="Paste your processed script here..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
          >
            Close
          </button>

          <button
            onClick={handleSubmitAndNext}
            disabled={!processedScript.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
