import Cocoa
import Carbon

// Simulate Cmd+C
let src = CGEventSource(stateID: .hidSystemState)
let cmdDown = CGEvent(keyboardEventSource: src, virtualKey: 0x37, keyDown: true) // kVK_Command
let cDown = CGEvent(keyboardEventSource: src, virtualKey: 0x08, keyDown: true)    // kVK_ANSI_C
let cUp = CGEvent(keyboardEventSource: src, virtualKey: 0x08, keyDown: false)
let cmdUp = CGEvent(keyboardEventSource: src, virtualKey: 0x37, keyDown: false)

// Set flags
cmdDown?.flags = .maskCommand
cDown?.flags = .maskCommand
cUp?.flags = .maskCommand
cmdUp?.flags = []

// Post events
let loc = CGEventTapLocation.cghidEventTap

// Check accessibility
let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true]
let accessEnabled = AXIsProcessTrustedWithOptions(options as CFDictionary)

if !accessEnabled {
    print("ACCESSIBILITY_REQUIRED")
    exit(1)
}

cmdDown?.post(tap: loc)
cDown?.post(tap: loc)
cUp?.post(tap: loc)
cmdUp?.post(tap: loc)

print("SUCCESS")
exit(0)
