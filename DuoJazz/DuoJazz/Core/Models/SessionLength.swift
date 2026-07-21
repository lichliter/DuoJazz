//
//  SessionLength.swift
//  DuoJazz
//

import Foundation

/// Which cards run in each mini-session.
enum SessionLength: Int, CaseIterable, Sendable, Codable {
    case full = 0
    case recallOnly = 1

    var displayName: String {
        switch self {
        case .full: "All cards"
        case .recallOnly: "Listen + Quiz"
        }
    }
}
