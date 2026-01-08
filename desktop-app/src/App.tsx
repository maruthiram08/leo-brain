import React, { useState, useEffect } from 'react';

declare global {
    interface Window {
        leo: {
            capture: () => void;
            recall: () => void;
            logout: () => void;
            login: () => void;
            hide: () => void;
            onConnectionStatus: (callback: (connected: boolean) => void) => void;
        };
    }
}

const App = () => {
    const [connected, setConnected] = useState(true); // Assume connected initially

    useEffect(() => {
        window.leo?.onConnectionStatus((status) => setConnected(status));
    }, []);

    return (
        <div className="flex flex-col h-screen bg-background text-white p-6 select-none font-sans">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
                    <h1 className="text-xl font-bold tracking-tight">Leo</h1>
                </div>
                <div className="text-xs text-gray-500 font-mono">v1.0.0</div>
            </div>

            {/* Main Status Area */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center shadow-2xl border border-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>

                <div className="text-center">
                    <h2 className="text-lg font-medium">
                        {connected ? 'Ambient Memory Active' : 'Not Connected'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Listening for <kbd className="bg-gray-800 px-2 py-0.5 rounded text-gray-300 font-mono">Cmd+Shift+E</kbd>
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-auto space-y-3">
                {connected ? (
                    <>
                        <button
                            className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-colors active:scale-95 duration-200"
                            onClick={() => window.leo?.capture()}
                        >
                            Capture Selection
                        </button>

                        <button
                            className="w-full py-2.5 bg-gray-800 text-gray-300 font-medium rounded-xl hover:bg-gray-700 transition-colors border border-gray-700 text-sm"
                            onClick={() => window.leo?.recall()}
                        >
                            Recall Memories (Cmd+Shift+Y)
                        </button>

                        <div className="flex space-x-3">
                            <button
                                className="flex-1 py-3 bg-gray-900 text-gray-300 font-medium rounded-xl hover:bg-gray-800 transition-colors border border-gray-800 text-xs"
                                onClick={() => window.leo?.logout()}
                            >
                                Log Out
                            </button>
                            <button
                                className="flex-1 py-3 bg-gray-900 text-gray-300 font-medium rounded-xl hover:bg-gray-800 transition-colors border border-gray-800 text-xs"
                                onClick={() => window.leo?.hide()}
                            >
                                Hide
                            </button>
                        </div>
                    </>
                ) : (
                    <button
                        className="w-full py-3 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors active:scale-95 duration-200"
                        onClick={() => window.leo?.login()}
                    >
                        Connect Account
                    </button>
                )}
            </div>
        </div>
    );
};

export default App;
