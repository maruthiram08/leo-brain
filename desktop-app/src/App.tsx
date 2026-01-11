import React, { useState, useEffect } from 'react';

declare global {
    interface Window {
        leo: {
            capture: () => void;
            recall: () => void;
            logout: () => void;
            login: () => void;
            hide: () => void;
            quit: () => void;
            onConnectionStatus: (callback: (connected: boolean) => void) => void;
            checkPermissions: () => Promise<{ accessibility: boolean }>;
            checkAuth: () => Promise<boolean>;
            openSettings: (type: string) => void;
        };
    }
}

type WizardStep = 'loading' | 'welcome' | 'permissions' | 'auth' | 'ready';

const App = () => {
    const [step, setStep] = useState<WizardStep>('loading');
    const [permissions, setPermissions] = useState({ accessibility: false });
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        // Init Check
        checkStatus();

        // Listen for auth updates
        window.leo?.onConnectionStatus((status) => {
            setConnected(status);
            if (status && step === 'auth') {
                setStep('ready');
            }
        });

        // Polling for permissions if on permissions step
        const interval = setInterval(() => {
            if (step === 'permissions') checkPermissions();
        }, 2000);

        return () => clearInterval(interval);
    }, [step]);

    const checkStatus = async () => {
        const auth = await window.leo?.checkAuth();
        const perms = await window.leo?.checkPermissions();

        setConnected(auth);
        setPermissions(perms);

        if (!perms.accessibility) {
            setStep('permissions');
        } else if (!auth) {
            setStep('auth');
        } else {
            setStep('ready');
        }
    };

    const checkPermissions = async () => {
        const perms = await window.leo?.checkPermissions();
        setPermissions(perms);
        if (perms.accessibility) {
            // Auto-advance
            const auth = await window.leo?.checkAuth();
            if (auth) setStep('ready');
            else setStep('auth');
        }
    };

    // --- STEPS ---

    if (step === 'loading') {
        return <div className="flex items-center justify-center h-screen bg-[#1e1e1e] text-[#a1a1aa] text-xs">Loading Leo...</div>;
    }

    if (step === 'permissions') {
        return (
            <div className="flex flex-col h-screen bg-[#1e1e1e] text-white p-6 justify-center text-center">
                <div className="mb-4 text-4xl">🔐</div>
                <h1 className="text-lg font-semibold mb-2">Enable Permissions</h1>
                <p className="text-[#a1a1aa] text-xs mb-6 leading-relaxed">
                    Leo needs <b>Accessibility</b> access to capture selected text.
                </p>

                <div className="bg-[#2a2a2a] rounded-lg p-4 mb-6 border border-[#3f3f46] text-left">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-2 h-2 rounded-full ${permissions.accessibility ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-xs font-medium">Accessibility</span>
                        {!permissions.accessibility && (
                            <button
                                onClick={() => window.leo.openSettings('accessibility')}
                                className="ml-auto text-[10px] bg-blue-600 px-2 py-1 rounded hover:bg-blue-500"
                            >
                                Open Settings
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-auto text-[10px] text-[#52525b]">
                    Auto-detecting changes...
                </div>
            </div>
        );
    }

    if (step === 'auth') {
        return (
            <div className="flex flex-col h-screen bg-[#1e1e1e] text-white p-6 justify-center text-center">
                <div className="mb-4 text-4xl">👋</div>
                <h1 className="text-lg font-semibold mb-2">Connect Account</h1>
                <p className="text-[#a1a1aa] text-xs mb-6">
                    Sign in to sync your memories.
                </p>

                <button
                    onClick={() => window.leo.login()}
                    className="w-full py-2 bg-white text-black text-sm font-semibold rounded hover:bg-gray-200 transition-colors"
                >
                    Connect via Browser
                </button>
            </div>
        );
    }

    // --- MAIN APP (Ready) ---
    return (
        <div className="flex flex-col h-screen bg-[#1e1e1e] text-[#e0e0e0] font-sans selection:bg-[#3d3d3d] overflow-hidden">

            {/* HEADER */}
            <div className="px-5 pt-5 flex items-center mb-6">
                <div className={`w-2 h-2 rounded-full mr-3 ${connected ? 'bg-[#4ade80]' : 'bg-[#facc15]'}`}></div>
                <span className="text-[13px] font-medium text-[#a1a1aa] tracking-wide">
                    {connected ? 'Leo is ready' : 'Disconnected'}
                </span>
            </div>

            {/* PRIMARY ACTION */}
            <div className="px-5 mb-2">
                <button
                    onClick={() => window.leo?.capture()}
                    className="group w-full text-left focus:outline-none"
                >
                    <div className="text-[15px] font-medium text-white mb-0.5 group-hover:text-[#4ade80] transition-colors">
                        Capture selection
                    </div>
                    <div className="text-[12px] text-[#71717a] font-mono group-hover:text-[#a1a1aa] transition-colors">
                        ⌘⇧E
                    </div>
                </button>
            </div>

            {/* SECONDARY ACTION */}
            <div className="px-5 mb-auto">
                <button
                    onClick={() => window.leo?.recall()}
                    className="group w-full text-left focus:outline-none py-2"
                >
                    <div className="text-[14px] text-[#a1a1aa] font-normal group-hover:text-white transition-colors">
                        Recall something
                    </div>
                    <div className="text-[11px] text-[#52525b] font-mono group-hover:text-[#71717a] transition-colors">
                        ⌘⇧Y
                    </div>
                </button>
            </div>

            {/* FOOTER */}
            <div className="px-5 pb-5 mt-4 flex items-center text-[11px] text-[#52525b] gap-2 select-none">
                <button onClick={() => window.leo?.hide()} className="hover:text-[#a1a1aa] cursor-pointer">Hide</button>
                <span>•</span>
                <button onClick={() => window.leo?.logout()} className="hover:text-[#a1a1aa] cursor-pointer">Log out</button>
                <span>•</span>
                <button onClick={() => window.leo?.quit()} className="hover:text-[#a1a1aa] cursor-pointer">Quit</button>
            </div>
        </div>
    );
};

export default App;
