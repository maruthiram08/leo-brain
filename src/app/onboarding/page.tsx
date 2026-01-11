
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function OnboardingPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-4xl w-full z-10">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-6">
                        Welcome to Leo
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Your ambient memory layer is ready. Let's get your devices connected.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* 1. Desktop App */}
                    <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-8 backdrop-blur-sm hover:border-blue-500/50 transition-colors group">
                        <div className="bg-blue-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-semibold mb-3">1. Install Desktop App</h2>
                        <p className="text-gray-400 mb-6 min-h-[50px]">
                            The brain of Leo. Runs in the background to capture copies and retrieve memories.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button className="w-full py-3 px-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download for macOS
                            </button>
                            <p className="text-xs text-center text-gray-500">
                                Supports Apple Silicon (M1/M2/M3)
                            </p>
                        </div>
                    </div>

                    {/* 2. Browser Extension */}
                    <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-8 backdrop-blur-sm hover:border-purple-500/50 transition-colors group">
                        <div className="bg-purple-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors">
                            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-semibold mb-3">2. Browser Extension</h2>
                        <p className="text-gray-400 mb-6 min-h-[50px]">
                            Captures full page context and handles web authentication. Note: Requires developer mode for now.
                        </p>
                        <div className="flex flex-col gap-3">
                            <div className="p-3 bg-white/5 rounded border border-white/10 text-sm text-gray-300">
                                <p className="mb-2"><span className="text-yellow-400">⚠️ Developer Install:</span></p>
                                <ol className="list-decimal list-inside space-y-1 text-gray-400">
                                    <li>Download source code</li>
                                    <li>Go to <code className="bg-black/30 px-1 rounded">chrome://extensions</code></li>
                                    <li>Enable "Developer mode"</li>
                                    <li>"Load unpacked" &gt; Select <code className="bg-black/30 px-1 rounded">extension</code> folder</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <h3 className="text-xl font-semibold mb-6">Are you set up?</h3>
                    <div className="flex justify-center gap-4">
                        <Link
                            href="/authorize"
                            className="py-3 px-8 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
                        >
                            Connect Desktop App
                        </Link>
                        <Link
                            href="/stream"
                            className="py-3 px-8 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors border border-white/5"
                        >
                            Go to Dashboard
                        </Link>
                    </div>
                    <p className="mt-4 text-sm text-gray-500">
                        Click "Connect Desktop App" to authorize the Leo app running on your Mac.
                    </p>
                </div>
            </div>
        </div>
    );
}
