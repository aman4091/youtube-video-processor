'use client';

import { useState, useEffect } from 'react';
import {
  Server,
  Copy,
  Download,
  AlertTriangle,
  CheckCircle2,
  Play,
  Trash2,
  FileCode,
  Terminal,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { PythonScript } from '@/types';

export default function VastAIGuidePage() {
  const [pythonScripts, setPythonScripts] = useState<PythonScript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    try {
      const response = await fetch('/api/scripts');
      const data = await response.json();
      setPythonScripts(data.scripts || []);
    } catch (error) {
      console.error('Error loading scripts:', error);
      toast.error('Failed to load Python scripts');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleDownloadScript = (id: string, name: string) => {
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
          <p className="mt-6 text-gray-400 font-medium">Loading guide...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent mb-2">
            VastAI Guide
          </h1>
          <p className="text-gray-400 flex items-center gap-2">
            <Server className="h-4 w-4" />
            Step-by-step instructions for using VastAI instances
          </p>
        </div>

        {/* Login Credentials */}
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/30 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            VastAI Login Credentials
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-24">Email:</span>
              <code className="flex-1 px-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white font-mono text-sm">
                techwhizmo@gmail.com
              </code>
              <button
                onClick={() => copyToClipboard('techwhizmo@gmail.com', 'Email')}
                className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
              >
                <Copy className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-24">Password:</span>
              <code className="flex-1 px-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white font-mono text-sm">
                amanbsc@1996
              </code>
              <button
                onClick={() => copyToClipboard('amanbsc@1996', 'Password')}
                className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
              >
                <Copy className="h-5 w-5" />
              </button>
            </div>
            <a
              href="https://cloud.vast.ai/login"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-semibold shadow-lg transition-all"
            >
              <Server className="h-4 w-4" />
              Login to VastAI
            </a>
          </div>
        </div>

        {/* Python Files */}
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileCode className="h-5 w-5 text-green-400" />
            Python Files Download Karo
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Ye 3 files download karo, baad mein VastAI Jupyter workspace mein upload karni hongi:
          </p>
          <div className="space-y-3">
            {pythonScripts.length > 0 ? (
              pythonScripts.map((script) => (
                <div
                  key={script.id}
                  className="flex items-center gap-3 p-4 bg-slate-700/30 border border-slate-600/30 rounded-xl hover:border-green-500/30 transition-all"
                >
                  <FileCode className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-white">{script.name}</p>
                  </div>
                  <button
                    onClick={() => handleDownloadScript(script.id, script.name)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-all"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p>Koi Python files upload nahi hui hain.</p>
                <p className="text-sm mt-1">Settings page se files upload karo.</p>
              </div>
            )}
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-4">Step-by-Step Instructions</h2>

          {/* Step 1 */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-3">VastAI Login Karo</h3>
                <p className="text-gray-300 mb-3">
                  Upar diye gaye credentials use karke <strong>https://cloud.vast.ai/login</strong> pe login karo.
                </p>
                <img
                  src="/guides/vastai/step-1-login.png"
                  alt="VastAI Login Page"
                  className="rounded-lg border border-slate-700 w-full mt-4"
                />
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-3">Search/Create Instance Page Pe Jao</h3>
                <p className="text-gray-300 mb-3">
                  Login hone ke baad, left sidebar mein "Search" ya "Create Instance" option pe click karo.
                </p>
                <img
                  src="/guides/vastai/step-2-search.png"
                  alt="VastAI Search Instance"
                  className="rounded-lg border border-slate-700 w-full mt-4"
                />
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-3">Filter Apply Karo</h3>
                <p className="text-gray-300 mb-3">Instance search mein ye filters lagao:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li><strong>Location:</strong> US (United States)</li>
                  <li><strong>Internet Speed:</strong> 100+ Mbps</li>
                  <li>Sabse sasta instance select karo jo available hai</li>
                  <li><strong>"Rent"</strong> button pe click karo</li>
                </ul>
                <img
                  src="/guides/vastai/step-3-filters.png"
                  alt="VastAI Filters"
                  className="rounded-lg border border-slate-700 w-full mt-4"
                />
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-3">Instance Status Monitor Karo</h3>
                <p className="text-gray-300 mb-3">
                  Left sidebar mein "Instances" pe click karo. Tumhara rent kiya hua instance dikhega with status.
                </p>
                <img
                  src="/guides/vastai/step-4-instances.png"
                  alt="VastAI Instances List"
                  className="rounded-lg border border-slate-700 w-full mt-4"
                />
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                5
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-3">2-3 Minutes Wait Karo</h3>
                <p className="text-gray-300 mb-3">
                  Instance start hone mein 2-3 minutes lagte hain. Status "Running" dikhne par:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li><strong>"Open"</strong> button pe click karo</li>
                  <li>Agar Open button kaam nahi kar raha to instance <strong>Destroy</strong> karo aur naya rent karo</li>
                </ul>
                <img
                  src="/guides/vastai/step-5-open.png"
                  alt="VastAI Instance Open Button"
                  className="rounded-lg border border-slate-700 w-full mt-4"
                />
              </div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                6
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-3">Jupyter Workspace Open Karo</h3>
                <p className="text-gray-300 mb-3">
                  "Open" button click karne se Jupyter interface khulega. Left panel mein <strong>"workspace"</strong> folder pe navigate karo.
                </p>
                <img
                  src="/guides/vastai/step-6-jupyter.png"
                  alt="Jupyter Workspace Interface"
                  className="rounded-lg border border-slate-700 w-full mt-4"
                />
              </div>
            </div>
          </div>

          {/* Step 7 */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                7
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-3">Python Files Upload Karo</h3>
                <p className="text-gray-300 mb-3">
                  Jupyter interface mein <strong>Upload</strong> button hoga (top-right area). Usse click karke ye 3 files upload karo:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li>k.py</li>
                  <li>auto_setup_and_run_bot.py</li>
                  <li>final_working_bot.py</li>
                </ul>
                <img
                  src="/guides/vastai/step-7-upload.png"
                  alt="Jupyter Upload Files"
                  className="rounded-lg border border-slate-700 w-full mt-4"
                />
              </div>
            </div>
          </div>

          {/* Step 8 */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                8
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Jupyter Terminal Open Karo
                </h3>
                <p className="text-gray-300 mb-3">
                  Jupyter interface mein "New" button click karo aur <strong>"Terminal"</strong> select karo. Terminal khulne par ye command run karo:
                </p>
                <div className="flex items-center gap-3 mb-3">
                  <code className="flex-1 px-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-lg text-green-400 font-mono">
                    python k.py
                  </code>
                  <button
                    onClick={() => copyToClipboard('python k.py', 'Command')}
                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
                <img
                  src="/guides/vastai/step-8-terminal.png"
                  alt="Jupyter Terminal"
                  className="rounded-lg border border-slate-700 w-full mt-4"
                />
              </div>
            </div>
          </div>

          {/* Step 9 */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                9
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-3">Wait for Completion</h3>
                <p className="text-gray-300 mb-3">
                  Script run hone mein time lagega. Terminal mein ye messages dekhne ko milenge:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li>🔄 F5-TTS generation starting...</li>
                  <li>✅ [filename] completed!</li>
                  <li>🎉 ALL X FILES COMPLETED!</li>
                  <li>✅ Queue processing finished</li>
                </ul>
                <p className="text-gray-300 mt-3">
                  Jab <strong>"✅ Queue processing finished"</strong> dikhe, tab telegram bot polling start ho jayegi.
                </p>
                <img
                  src="/guides/vastai/step-9-completion.png"
                  alt="Terminal Completion Messages"
                  className="rounded-lg border border-slate-700 w-full mt-4"
                />
              </div>
            </div>
          </div>

          {/* Step 10 */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                10
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-3">Reference Audio + Send Scripts</h3>
                <p className="text-gray-300 mb-3">
                  Ab is app ke <strong>Schedule</strong> page pe jao aur:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li><strong>"Reference Audio"</strong> button click karo - Telegram pe reference audio send hogi</li>
                  <li><strong>"Send Scripts"</strong> button click karo - Telegram pe saari scripts send hongi</li>
                </ul>
                <img
                  src="/guides/vastai/step-10-telegram.png"
                  alt="Telegram Bot Interaction"
                  className="rounded-lg border border-slate-700 w-full mt-4"
                />
              </div>
            </div>
          </div>

          {/* Step 11 */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                11
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-3">Telegram Se Audio Download Karo</h3>
                <p className="text-gray-300 mb-3">
                  Bot processing complete hone ke baad Telegram pe generated audio files ayengi. Unhe download kar lo.
                </p>
              </div>
            </div>
          </div>

          {/* Step 12 - DESTROY INSTANCE */}
          <div className="bg-gradient-to-br from-red-500/20 to-orange-600/20 border-2 border-red-500/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 animate-pulse">
                12
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-400 mb-3 flex items-center gap-2">
                  <Trash2 className="h-6 w-6" />
                  IMPORTANT: INSTANCE DESTROY KARO!
                </h3>
                <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-3">
                  <p className="text-white font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    Ye step BAHUT ZAROORI hai!
                  </p>
                  <p className="text-gray-200">
                    Audio download hone ke baad <strong>TURANT</strong> VastAI instance ko <strong>DESTROY</strong> karo.
                    Destroy nahi kiya to charges lagte rahenge! ⚠️
                  </p>
                </div>
                <p className="text-gray-300 mb-4">
                  Instances page pe jao → Apna instance select karo → <strong>"Destroy"</strong> button click karo
                </p>
                <img
                  src="/guides/vastai/step-12-destroy.png"
                  alt="VastAI Destroy Instance"
                  className="rounded-lg border border-red-500 w-full"
                />
              </div>
            </div>
          </div>

          {/* Step 13 */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                13
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-3">Convert to MP4 and Edit</h3>
                <p className="text-gray-300 mb-3">
                  Download kiye hue audio files ko:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li>MP4 format mein convert karo</li>
                  <li>CapCut mein edit karo</li>
                  <li>Final video ready hai! ✨</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="mt-8 bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
            <h3 className="text-xl font-bold text-white">All Done! 🎉</h3>
          </div>
          <p className="text-gray-300">
            Process complete ho gayi! Agar koi problem aaye to in steps ko dobara follow karo ya Settings check karo.
          </p>
        </div>
      </div>
    </div>
  );
}
