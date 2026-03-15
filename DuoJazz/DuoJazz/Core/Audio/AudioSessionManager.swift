//
//  AudioSessionManager.swift
//  DuoJazz
//

import AVFoundation

enum AudioSessionManager {
    static func configureForPitchDetection() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(
            .playAndRecord,
            mode: .measurement,
            options: [.defaultToSpeaker, .allowBluetooth]
        )
        try session.setActive(true)
    }

    static func requestMicrophoneAccess() async -> Bool {
        await AVAudioApplication.requestRecordPermission()
    }
}
